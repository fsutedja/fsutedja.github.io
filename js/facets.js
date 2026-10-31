/*
  Living facets.

  A photo of a gem has its light frozen in. Real gems sparkle because every facet is a tiny
  mirror at its own angle: as the light moves, some flash and others go dark.

  So for every gem cut from the sheet we:
    1. find its facets: the sharp lines between facets are edges in the picture, and the
       patches between those edges are the facets themselves;
    2. give every facet its own tilt (outer facets lean outward, like a real cut stone),
       stored as a "normal map" image next to the gem picture;
    3. light it live on the graphics card: each facet brightens, darkens or flashes depending
       on where the light (your cursor) is. Rainbow (AB) stones shift colour per facet.
  Pearls and gold beads are smooth, so they get a rounded normal instead, and their
  highlight rolls across them.

  Needs gems.js first (it has the gem list GEMS and the sheet location SHEET).
*/

const SMOOTH = /pearl|gold/;                  // round, polished: no facets
const RAINBOW = /clear|abStar|sequin/;        // AB-coated: colour shifts per facet

// ---------- 1 + 2. cut out each gem and build its facet map ----------
async function makeFacetSprites() {
  const img = new Image(); img.src = SHEET; await img.decode();
  const src = document.createElement("canvas"); src.width = img.width; src.height = img.height;
  const sctx = src.getContext("2d", { willReadFrequently: true }); sctx.drawImage(img, 0, 0);
  const out = {};
  let seed = 7; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  for (const [name, [cx, cy, r]] of Object.entries(GEMS)) {
    const half = Math.ceil(r * 1.6), size = half * 2, N = size * size;
    const px = sctx.getImageData(cx - half, cy - half, size, size).data;

    // remove the paper (same as gems.js): paper becomes pure white
    const ring = [[], [], []];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - half, y - half) / half;
      if (d > 0.88 && d < 1) { const i = (y * size + x) * 4; ring[0].push(px[i]); ring[1].push(px[i + 1]); ring[2].push(px[i + 2]); }
    }
    const paper = ring.map((c) => c.sort((a, b) => a - b)[c.length >> 1]);
    const col = new Uint8ClampedArray(N * 4), lum = new Float32Array(N), mask = new Uint8Array(N);
    for (let p = 0; p < N; p++) {
      const x = p % size, y = (p / size) | 0, d = Math.hypot(x - half, y - half) / half;
      const fade = d < 0.8 ? 0 : Math.min(1, (d - 0.8) / 0.18);
      let mn = 255;
      for (let c = 0; c < 3; c++) {
        // outside the gem, tones within ~5% of the paper become pure white; inside, keep every faint facet
        const inside = Math.hypot(x - half, y - half) < r * 0.92;
        let v = Math.min(255, (px[p * 4 + c] / paper[c] / (inside ? 1.0 : 0.95)) * 255);
        v = v + (255 - v) * fade * fade;
        col[p * 4 + c] = v; mn = Math.min(mn, v);
      }
      col[p * 4 + 3] = 255;
    }

    // the AB sequin on the sheet has a hole in the middle; fill it so it's a solid round stone:
    // each pixel in the hole takes the colour from just outside the hole at the same angle (a mirror),
    // so the stone's own facets simply continue inward.
    if (/sequin/.test(name)) {
      let sum = 0, n = 0;
      for (let k = 0; k < 24; k++) {                       // measure the hole along 24 directions
        const a = (k / 24) * Math.PI * 2;
        for (let rr = 1; rr < r * 0.6; rr++) {
          const x = Math.round(half + Math.cos(a) * rr), y = Math.round(half + Math.sin(a) * rr), q = (y * size + x) * 4;
          if (255 - Math.min(col[q], col[q + 1], col[q + 2]) > 28) { sum += rr; n++; break; }
        }
      }
      const hole = (n ? sum / n : r * 0.2);
      // fill everything up to well past the hole's edge (the pale rim around the hole goes too),
      // taking colour from further out on the stone at the same angle, and blending in smoothly
      const inner = Math.max(hole * 1.9, r * 0.34), blend = hole * 0.6;
      const copy = col.slice();
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const dx = x - half, dy = y - half, d = Math.hypot(dx, dy);
        if (d >= inner + blend) continue;
        const a = Math.atan2(dy, dx), from = inner + blend + (inner - Math.min(d, inner)) * 0.6 + 2;
        const sx = Math.round(half + Math.cos(a) * from), sy = Math.round(half + Math.sin(a) * from);
        const w = d <= inner ? 1 : 1 - (d - inner) / blend;
        const p = (y * size + x) * 4, q = (sy * size + sx) * 4;
        for (let c = 0; c < 3; c++) col[p + c] = copy[p + c] * (1 - w) + copy[q + c] * w;
      }
    }

    // fade out the faint cast shadows around the gem (they make it look pasted on):
    //  - anything beyond the gem's own radius fades to white
    //  - flat, grey, light patches (shadow on paper, not glass) are lightened too
    const lumAt = (q) => 0.3 * col[q * 4] + 0.59 * col[q * 4 + 1] + 0.11 * col[q * 4 + 2];
    const flat = new Uint8Array(N), edgeStrength = new Float32Array(N);
    for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
      const q = y * size + x, here = lumAt(q);
      const g = Math.abs(lumAt(q + 1) - here) + Math.abs(lumAt(q - 1) - here) + Math.abs(lumAt(q + size) - here) + Math.abs(lumAt(q - size) - here);
      flat[q] = g < 14 ? 1 : 0;
      edgeStrength[q] = g;
    }
    const smoothGem = SMOOTH.test(name);

    // find the gem's true outline: walking outward from the centre in every direction, the outline is the
    // last crisp edge (a cast shadow on paper only has soft edges). Whatever lies beyond it is shadow.
    const DIRS = 180, outline = new Float32Array(DIRS);
    for (let k = 0; k < DIRS; k++) {
      const a = (k / DIRS) * Math.PI * 2; let last = r;
      for (let rr = r * 0.4; rr < Math.min(half - 2, r * 1.5); rr += 0.5) {
        const x = Math.round(half + Math.cos(a) * rr), y = Math.round(half + Math.sin(a) * rr);
        if (edgeStrength[y * size + x] > 22) last = rr;
      }
      outline[k] = last;
    }
    const outlineAt = (k) => { // smooth out single odd directions (median of 5 neighbours)
      const v = []; for (let j = -2; j <= 2; j++) v.push(outline[(k + j + DIRS) % DIRS]);
      return v.sort((m, n) => m - n)[2];
    };
    const smoothOutline = Float32Array.from({ length: DIRS }, (_, k) => outlineAt(k));
    // pearls and beads are round: measure their real radius from the picture (ignoring the shadow side)
    let roundR = 0.97 * r;
    if (smoothGem) {
      const radii = [];
      for (let j = 0; j < 72; j++) {
        const a = (j / 72) * Math.PI * 2; let last = 0;
        for (let rr = r * 0.3; rr < Math.min(half - 1, r * 1.3); rr += 0.5) {
          const q = (Math.round(half + Math.sin(a) * rr) * size + Math.round(half + Math.cos(a) * rr)) * 4;
          if (255 - Math.min(col[q], col[q + 1], col[q + 2]) > 18) last = rr;
        }
        radii.push(last);
      }
      radii.sort((m, n) => m - n);
      roundR = Math.min(0.97 * r, radii[Math.floor(radii.length * 0.12)] - 1 || roundR);   // the shadow side reads too big, so use a low-ish value
    }
    const cov = new Float32Array(N);   // how much of each pixel is gem (0–1): gives smooth, non-jagged edges
    const core = new Float32Array(N);  // the inner part of the gem, where even white highlights stay solid
    for (let p = 0; p < N; p++) {
      const x = p % size, y = (p / size) | 0, d = Math.hypot(x - half, y - half) / r;
      const R = col[p * 4], G = col[p * 4 + 1], B = col[p * 4 + 2];
      const chroma = Math.max(R, G, B) - Math.min(R, G, B), l = (0.3 * R + 0.59 * G + 0.11 * B) / 255;
      const edge = smoothGem ? 1.12 : 1.02;                                           // pearls/beads: be generous, their bright rim is part of them
      let lift = Math.min(1, Math.max(0, (d - edge) / 0.18));                       // outside the gem
      if (!smoothGem && d > 0.9 && flat[p] && chroma < 22 && l > 0.68) lift = Math.max(lift, 0.9); // grey shadow patch at the rim (never inside the stone)
      // the baked-in shadow beyond the outline: lightened by about two-thirds (not removed, so nothing of the gem is lost)
      const k = Math.round(((Math.atan2(y - half, x - half) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * DIRS) % DIRS;
      const beyond = Math.hypot(x - half, y - half) - smoothOutline[k] - 1.5;
      if (beyond > 0) lift = Math.max(lift, Math.min(1, beyond / 3) * 0.65);
      if (lift > 0) for (let c = 0; c < 3; c++) col[p * 4 + c] += (255 - col[p * 4 + c]) * lift;
      let mn = Math.min(col[p * 4], col[p * 4 + 1], col[p * 4 + 2]);
      lum[p] = 0.3 * col[p * 4] + 0.59 * col[p * 4 + 1] + 0.11 * col[p * 4 + 2];
      // part of the gem if it's coloured, OR inside the gem's shape (so white highlights and bright pearl sides count too)
      const insideShape = smoothGem ? Math.hypot(x - half, y - half) <= roundR : Math.hypot(x - half, y - half) <= smoothOutline[k];
      // the gem is its outline, minus any blank (paper-white) band right at the edge, so no flat ring covers the paper texture.
      // Deeper inside, white highlights still count as gem.
      const rimZone = smoothGem ? d > 0.8 : Math.hypot(x - half, y - half) > smoothOutline[k] - 3;
      // flat, grey, colourless patches near the edge are the photo's shadow, not gem
      const distC = Math.hypot(x - half, y - half);
      const shadowy = !smoothGem && flat[p] && chroma < 20 && distC > smoothOutline[k] - r * 0.14;
      mask[p] = insideShape && (!rimZone || 255 - mn > 14) && !shadowy ? 1 : 0;
      // partial coverage across the last pixel of the outline (anti-aliasing)
      const edgeCov = smoothGem ? (roundR - distC) + 0.5 : (smoothOutline[k] - distC) + 0.5;
      cov[p] = mask[p] ? Math.min(1, Math.max(0, edgeCov)) : 0;
      const band = smoothGem ? -1 : 2.5;   // pearls: the whole circle is solid; others: only the last couple of pixels can turn see-through
      core[p] = mask[p] ? Math.min(1, Math.max(0, (edgeCov - band) / 2)) : 0;
    }

    // stars: measuring "inside" outward from the centre wrongly fills the gaps between the points,
    // so for stars the shape is the stone's own coloured pixels, with small holes inside filled in
    // (grow the shape by a few pixels, then shrink it back: holes close, the points stay sharp)
    if (/Star/.test(name)) {
      const ink = (q) => 255 - Math.min(col[q * 4], col[q * 4 + 1], col[q * 4 + 2]);
      const m0 = new Uint8Array(N);
      for (let q = 0; q < N; q++) {
        const R = col[q * 4], G = col[q * 4 + 1], B = col[q * 4 + 2];
        m0[q] = ink(q) > 22 ? 1 : 0;   // (clear crystal is colourless too, so colour can't tell shadow apart: keep it all)
      }
      const R = Math.max(2, Math.round(size / 70));
      const morph = (src, grow) => {
        const out = new Uint8Array(N);
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
          let hit = grow ? 0 : 1;
          for (let dy = -R; dy <= R && (grow ? !hit : hit); dy++) for (let dx = -R; dx <= R; dx++) {
            const xx = x + dx, yy = y + dy;
            const v = xx < 0 || yy < 0 || xx >= size || yy >= size ? 0 : src[yy * size + xx];
            if (grow && v) { hit = 1; break; }
            if (!grow && !v) { hit = 0; break; }
          }
          out[y * size + x] = hit;
        }
        return out;
      };
      const closed = morph(morph(m0, true), false);
      for (let q = 0; q < N; q++) {
        mask[q] = closed[q]; cov[q] = closed[q]; core[q] = 0;
        // whatever isn't part of the star becomes pure white (so it disappears completely)
        if (!closed[q]) { col[q * 4] = col[q * 4 + 1] = col[q * 4 + 2] = 255; }
      }
    }

    const nrm = new Uint8ClampedArray(N * 4);
    const setN = (p, nx, ny, s) => { nrm[p * 4] = (nx * 0.5 + 0.5) * 255; nrm[p * 4 + 1] = (ny * 0.5 + 0.5) * 255; nrm[p * 4 + 2] = s * 255; nrm[p * 4 + 3] = 255; };

    if (SMOOTH.test(name)) {
      // a dome: the normal points straight out of a sphere
      for (let p = 0; p < N; p++) {
        if (!mask[p]) { setN(p, 0, 0, 0); continue; }
        const x = ((p % size) - half) / r, y = (((p / size) | 0) - half) / r, rr = Math.min(0.98, Math.hypot(x, y));
        const k = rr > 0 ? rr / Math.hypot(x, y) : 0;
        setN(p, x * k, y * k, 0.5);
      }
    } else {
      // edges between facets: where brightness changes sharply (Sobel filter)
      const grad = new Float32Array(N), vals = [];
      for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
        const p = y * size + x; if (!mask[p]) continue;
        const L = (dx, dy) => lum[p + dy * size + dx];
        const gx = -L(-1, -1) - 2 * L(-1, 0) - L(-1, 1) + L(1, -1) + 2 * L(1, 0) + L(1, 1);
        const gy = -L(-1, -1) - 2 * L(0, -1) - L(1, -1) + L(-1, 1) + 2 * L(0, 1) + L(1, 1);
        grad[p] = Math.hypot(gx, gy); vals.push(grad[p]);
      }
      vals.sort((a, b) => a - b);
      const edge = Math.max(30, vals[Math.floor(vals.length * 0.62)] || 30);

      // facets = connected patches between edges
      const label = new Int32Array(N).fill(-1), regions = [];
      for (let p = 0; p < N; p++) {
        if (!mask[p] || grad[p] > edge || label[p] >= 0) continue;
        const id = regions.length, stack = [p]; let n = 0, sx = 0, sy = 0; label[p] = id;
        while (stack.length) {
          const q = stack.pop(), x = q % size, y = (q / size) | 0; n++; sx += x; sy += y;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
            const o = ny * size + nx;
            if (mask[o] && label[o] < 0 && grad[o] <= edge) { label[o] = id; stack.push(o); }
          }
        }
        regions.push({ n, x: sx / n, y: sy / n });
      }
      // tiny specks aren't facets: un-label them, then let the edges and specks join their neighbours
      for (let p = 0; p < N; p++) if (label[p] >= 0 && regions[label[p]].n < 10) label[p] = -1;
      for (let pass = 0; pass < 8; pass++) {
        for (let p = 0; p < N; p++) {
          if (!mask[p] || label[p] >= 0) continue;
          const x = p % size, y = (p / size) | 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
            const l = label[ny * size + nx]; if (l >= 0 && regions[l].n >= 10) { label[p] = l; break; }
          }
        }
      }
      // each facet's tilt: leaning away from the gem's centre, more toward the rim, plus a little randomness
      const tilt = regions.map((g) => {
        const dx = g.x - half, dy = g.y - half, dist = Math.min(1, Math.hypot(dx, dy) / r);
        const dir = Math.atan2(dy, dx) + (rand() - 0.5) * 1.1;
        const lean = 0.12 + dist * 0.62 + rand() * 0.18;
        return { nx: Math.cos(dir) * Math.sin(lean), ny: Math.sin(dir) * Math.sin(lean), s: rand() };
      });
      for (let p = 0; p < N; p++) {
        const l = label[p];
        if (l < 0) { setN(p, 0, 0, 0); if (mask[p]) nrm[p * 4 + 3] = 255; continue; }
        setN(p, tilt[l].nx, tilt[l].ny, tilt[l].s);
      }
    }
    for (let p = 0; p < N; p++) if (!mask[p]) nrm[p * 4 + 3] = 0;

    const toCanvas = (data) => { const c = document.createElement("canvas"); c.width = size; c.height = size; c.getContext("2d").putImageData(new ImageData(data, size, size), 0, 0); return c; };
    if (/Star/.test(name)) {
      const E = 2;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        let all = 1;
        for (let dy = -E; dy <= E && all; dy += E) for (let dx = -E; dx <= E; dx += E) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= size || yy >= size || !mask[yy * size + xx]) { all = 0; break; }
        }
        core[y * size + x] = all;   // (stars: E is a few px)
      }
    }
    // soften the coverage by one pixel so even the stars' and petals' edges are smooth
    const cv = new Uint8ClampedArray(N * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let sum = 0, sumC = 0, w = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
        const wt = dx || dy ? (dx && dy ? 0.5 : 1) : 2; sum += cov[yy * size + xx] * wt; sumC += core[yy * size + xx] * wt; w += wt;
      }
      const q = (y * size + x) * 4;
      cv[q] = Math.min(cov[y * size + x] > 0 ? 1 : 0.999, sum / w) * 255;   // red = outline coverage
      cv[q + 1] = (sumC / w) * 255;                                          // green = solid core
      cv[q + 2] = 0; cv[q + 3] = 255;
    }
    out[name] = { color: toCanvas(col), normals: toCanvas(nrm), cover: toCanvas(cv), half, r, smooth: SMOOTH.test(name), rainbow: RAINBOW.test(name) };
  }
  return out;
}

// ---------- the look, as adjustable knobs (the tuning panel changes these live) ----------
const TUNING = {
  bright:  { label: "overall brightness",  uniform: "uBright",  value: 0.97, min: 0.8, max: 1.2, step: 0.01 },
  sat:     { label: "saturation",          uniform: "uSat",     value: 1.15, min: 0.6, max: 1.6, step: 0.01 },
  lift:    { label: "lighter shadows",     uniform: "uLift",    value: 0.08, min: 0,   max: 0.6, step: 0.01 },
  pastel:  { label: "pastel wash",         uniform: "uPastel",  value: 0.04, min: 0,   max: 0.3, step: 0.01 },
  gain:    { label: "facets brighten",     uniform: "uGain",    value: 0.07, min: 0,   max: 0.4, step: 0.01 },
  flash:   { label: "sparkle flashes",     uniform: "uFlash",   value: 0.15, min: 0,   max: 1.2, step: 0.01 },
  rainbow: { label: "rainbow (AB) shift",  uniform: "uRainbow", value: 0.0,  min: 0,   max: 1.2, step: 0.01 },
  lamp:    { label: "sparkle near cursor", uniform: "uLamp",    value: 0.4,  min: 0,   max: 1.2, step: 0.01 },
  view:    { label: "viewpoint strength",  uniform: "uView",    value: 0.74, min: 0,   max: 1.6, step: 0.01 },
};
const TUNING_DEFAULTS = Object.fromEntries(Object.entries(TUNING).map(([k, t]) => [k, t.value]));
try { const saved = JSON.parse(localStorage.getItem("freya-gem-tuning") || "{}"); for (const k in saved) if (TUNING[k]) TUNING[k].value = saved[k]; } catch (e) {}

// ---------- 3. light the facets live (WebGL) ----------
function makeFacetRenderer(canvas) {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true });   // premultiplied: every browser composites it the same way
  const VS = `
    attribute vec2 corner; uniform vec2 res, center; uniform float size, rot;
    varying vec2 uv;
    void main() {
      uv = corner * .5 + .5;
      vec2 p = corner * size * .5;
      p = vec2(p.x * cos(rot) - p.y * sin(rot), p.x * sin(rot) + p.y * cos(rot)) + center;
      gl_Position = vec4(p.x / res.x * 2. - 1., 1. - p.y / res.y * 2., 0., 1.);
    }`;
  const FS = `
    precision highp float;   // must match the vertex shader, since they share uniforms
    varying vec2 uv;
    uniform sampler2D colorTex, normalTex, coverTex;
    uniform vec2 center, lightPos, view; uniform float rot, near, smoothGem, rainbow, time;
    // the knobs from the tuning panel (see TUNING below)
    uniform float uLift, uFlash, uGain, uPastel, uSat, uRainbow, uLamp, uView, uBright, uContrast, uShadow, uShadowSoft, uShadowDist;
    uniform float shadowPass, pad, uAlpha;   // shadowPass: drawing the backdrop shadow; pad: the shadow's quad is bigger than the gem
    // Gems are drawn as solid things lying on the page (so a textured paper doesn't show through them).
    // On a plain page this gives exactly the same result as the old "multiply" look:
    //   coverage a = how far the pixel is from white; colour chosen so  a*colour + (1-a)*paper = paper*gem.
    const vec3 PAPER = vec3(.945, .933, .918);
    vec4 onPaper(vec3 c, vec3 base, float inside) {
      // inside the gem's outline it's solid; outside, only as solid as it is non-white (soft edges)
      float a = inside;
      vec3 col = PAPER * (c - (1. - a)) / max(a, .001);
      return vec4(clamp(col, 0., 1.), a);
    }
    vec3 hueShift(vec3 c, float a) {           // rotate colour around the grey axis
      const vec3 k = vec3(0.57735);
      float ca = cos(a);
      return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1. - ca);
    }
    void main() {
      float cr = cos(-rot), sr = sin(-rot);
      #define TURN(v) vec2((v).x * cr - (v).y * sr, (v).x * sr + (v).y * cr)
      vec2 guv = (uv - .5) * pad + .5;                  // position on the gem picture

      // the soft shadow on the backdrop: the gem's own shape, blurred, pushed away from the main light
      if (shadowPass > .5) {
        vec2 away = normalize(vec2(.55, .75)) + view * uView * .25;      // falls bottom-right, shifts with your viewpoint
        vec2 off = TURN(away) * uShadowDist;
        float a = texture2D(normalTex, guv - off, uShadowSoft).a;        // mipmap bias = blur
        a *= step(0., guv.x - off.x) * step(guv.x - off.x, 1.) * step(0., guv.y - off.y) * step(guv.y - off.y, 1.);
        gl_FragColor = vec4(mix(vec3(1.), vec3(.6, .55, .57), a * uShadow), 1.);
        return;
      }

      vec4 base = texture2D(colorTex, guv);
      vec4 nm = texture2D(normalTex, guv);
      // how much of this pixel is gem: the smooth, tight outline. Inside it, white facets are drawn bright white.
      float cover = texture2D(coverTex, guv).r * uAlpha;   // uAlpha: fading out (scroll animation)
      if (cover < .004) { gl_FragColor = vec4(0.); return; }   // outside the gem: fully transparent
      vec2 nxy = nm.rg * 2. - 1.;
      vec3 n = vec3(nxy, sqrt(max(0., 1. - dot(nxy, nxy))));
      // everything below is turned into the gem's own (rotated) frame, because that's how its facets were measured
      // 1. where you're looking from (your cursor's position on the page = the angle you view the page at)
      vec3 V = normalize(vec3(TURN(-view * uView), 1.));
      // 2. fixed room lights: a main window light top-left, a softer one top-right, a faint one from below
      vec3 L1 = normalize(vec3(TURN(vec2(-.55, -.75)), .55));
      vec3 L2 = normalize(vec3(TURN(vec2(.80, -.35)), .70));
      vec3 L3 = normalize(vec3(TURN(vec2(.15, .90)), .80));
      vec3 H1 = normalize(L1 + V), H2 = normalize(L2 + V), H3 = normalize(L3 + V);
      float shine = mix(70., 24., smoothGem);
      // facets that line up with a light from where you're looking flash
      float flash = pow(max(0., dot(n, H1)), shine) + .6 * pow(max(0., dot(n, H2)), shine) + .35 * pow(max(0., dot(n, H3)), shine);
      // how much each facet catches the room light from this viewpoint: bright or dark
      float face = .6 * dot(n, H1) + .4 * dot(n, H2);
      // facets never get darker than the original gem: they stay as they are, or brighten when they catch the light
      float gain = mix(1., 1. + uGain, smoothstep(.8, .99, face));

      // 3. your cursor as a small lamp up close (only matters near it)
      vec2 toL = TURN(lightPos - center);
      vec3 Lc = normalize(vec3(toL, 160.));
      float dc = dot(n, Lc);
      float lamp = pow(max(0., dot(reflect(-Lc, n), V)), shine) * near * 1.3;
      gain *= mix(1., mix(1., 1.12, smoothstep(.2, .95, dc)), near);

      // only light the gem itself, not the faint near-white fringe around it
      float solid = smoothstep(.97, .82, max(base.r, max(base.g, base.b)) * .5 + dot(base.rgb, vec3(.3, .59, .11)) * .5);
      // soften the darkest facets (keep the stone luminous, no near-black patches)
      // (pearls and gold keep their own soft shading, which is what makes them look solid)
      vec3 lifted = base.rgb + (1. - base.rgb) * uLift * (1. - smoothGem * .75) * (1. - dot(base.rgb, vec3(.3, .59, .11)));
      vec3 c = mix(base.rgb, lifted, solid) * mix(1., gain, solid);
      // keep the colours rich (brightening alone makes them look milky / grey)
      float lum = dot(c, vec3(.3, .59, .11));
      c = mix(vec3(lum), c, mix(1., uSat, solid));
      // rainbow coating: each facet's tint changes with the viewing angle
      c = mix(c, hueShift(c, (face * 3.5 + dot(nxy, view) * 2. + nm.b * 6.28) * .5), rainbow * uRainbow * solid);
      // flashes take on the gem's own colour instead of plain white
      vec3 tint = mix(vec3(1.), base.rgb / max(.001, max(base.r, max(base.g, base.b))), .5);
      c += tint * (flash * uFlash + lamp * uLamp) * mix(1., .6, smoothGem) * solid;
      // a soft pastel lift, so the gems stay light and airy on the page
      c = mix(c, vec3(1.), uPastel * solid * (1. - smoothGem * .8));
      c = mix(c, c * uBright, solid);
      // coverage comes from the gem's (smoothly filtered) outline, so the edge is a soft, even fade, not a dotted line
      gl_FragColor = vec4(min(c, vec3(1.)) * cover, cover);   // premultiplied colour
    }`;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o)); return o; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "corner"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ["res", "center", "size", "rot", "colorTex", "normalTex", "coverTex", "lightPos", "near", "smoothGem", "rainbow", "time", "view", "uLift", "uFlash", "uGain", "uPastel", "uSat", "uRainbow", "uLamp", "uView", "uBright", "uContrast", "uShadow", "uShadowSoft", "uShadowDist", "shadowPass", "pad", "uAlpha"].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
  gl.uniform1i(U.colorTex, 0); gl.uniform1i(U.normalTex, 1); gl.uniform1i(U.coverTex, 2);
  // gems are drawn as solid objects with soft edges, layered normally over the page
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  // Gem pictures are big (up to ~280 px) but drawn small (~20–60 px). To shrink them smoothly,
  // like the browser does for normal images, we copy each into a power-of-two square and build
  // "mipmaps" (pre-shrunk copies). Without this the dark facet lines dominate and gems look grey.
  const textures = new Map();
  const pot = (c, smooth) => {
    const n = Math.min(512, 2 ** Math.ceil(Math.log2(Math.max(c.width, c.height))));
    const out = document.createElement("canvas"); out.width = out.height = n;
    const x = out.getContext("2d"); x.imageSmoothingEnabled = smooth; x.imageSmoothingQuality = "high";
    x.drawImage(c, 0, 0, n, n); return out;
  };
  const tex = (c, isNormal) => {
    if (textures.has(c)) return textures.get(c);
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pot(c, !isNormal));
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    textures.set(c, t); return t;
  };
  const ntex = (c) => tex(c, true);

  return {
    resize(w, h) {
      const dpr = Math.min(devicePixelRatio || 1, 2);   // 2x is sharp enough on phones and far lighter than 3x
      canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + "px"; canvas.style.height = h + "px";
      gl.viewport(0, 0, canvas.width, canvas.height); this.dpr = dpr;
    },
    // items: [{ sprite, x, y, size, rot, light: {x, y}, near }]
    // view = where you're looking from: x and y from -1 to 1 (your cursor across the page)
    draw(items, time, view = { x: 0, y: 0 }) {
      const dpr = this.dpr || 1;
      gl.disable(gl.BLEND); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.enable(gl.BLEND);
      gl.uniform2f(U.res, canvas.width, canvas.height); gl.uniform1f(U.time, time); gl.uniform2f(U.view, view.x, view.y);
      for (const k in TUNING) gl.uniform1f(U[TUNING[k].uniform], TUNING[k].value);
      // first every gem's soft shadow on the backdrop, then the gems on top
      const PAD = 1.4;
      for (const pass of [0]) {   // (a backdrop-shadow pass exists in the shader but is switched off)
        gl.uniform1f(U.shadowPass, pass); gl.uniform1f(U.pad, pass ? PAD : 1);
        for (const it of items) {
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex(it.sprite.color));
          gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, ntex(it.sprite.normals));
          gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tex(it.sprite.cover));
          gl.uniform2f(U.center, it.x * dpr, it.y * dpr); gl.uniform1f(U.size, it.size * dpr * (pass ? PAD : 1)); gl.uniform1f(U.rot, it.rot);
          gl.uniform2f(U.lightPos, it.light.x * dpr, it.light.y * dpr); gl.uniform1f(U.near, it.near);
          gl.uniform1f(U.uAlpha, it.alpha ?? 1);
          gl.uniform1f(U.smoothGem, it.sprite.smooth ? 1 : 0); gl.uniform1f(U.rainbow, it.sprite.rainbow ? 1 : 0);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
      }
    },
  };
}
