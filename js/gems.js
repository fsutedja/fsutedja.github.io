/*
  Gems on the page.

  1. CUT-OUTS: each gem is taken from the gem sheet (sheet.png). Around every gem we measure the
     paper colour and divide it out, so paper becomes pure white and only the gem and its own
     soft shadow remain. Drawn with "multiply", pure white disappears into the page, so the gem
     looks like it's lying on the website itself.
  2. LAYOUT: gems are spread over the whole page like on the lily: a few big, many medium,
     some small, uneven gaps, and little clusters. A calm space is kept around the words.
  3. MOTION + LIGHT: gems drift and sway gently; near the mouse they slide softly out of the way.
     The mouse is also a light: gems near it brighten and glint. Section gems lift on hover.
*/

// Each gem on the sheet: [centre x, centre y, radius] in sheet pixels (sheet is 1086 × 1448).
const SHEET = window.GEM_SHEET || "sheet.png"; // other pages can point to this sheet
const GEMS = {
  oval: [420, 794, 88], aqua2: [925, 895, 58], abStar1: [758, 188, 62], pearlBig1: [1000, 188, 40], flower: [797, 688, 88],
  pinkBig: [190, 182, 62], clearTop: [635, 62, 30], clearA: [485, 240, 33], aqua1: [113, 360, 52], sequin1: [512, 412, 46],
  pinkS: [1030, 333, 32], pearlL: [72, 555, 34], lilac1: [246, 525, 37], abStar4: [391, 528, 54], lilacStar: [633, 537, 55],
  clearR: [1013, 595, 32], clearL: [65, 773, 32], abStar2: [130, 968, 65], pink2: [755, 1045, 52], clearR2: [1003, 1112, 32],
  pearlM: [550, 1105, 32], clearL2: [258, 1123, 33], pearlBig2: [83, 1200, 40], lilac2: [420, 1255, 47], sequin2: [875, 1215, 50],
  goldA: [380, 92, 16], goldC: [938, 485, 20], goldE: [1007, 768, 20], goldG: [628, 1235, 20],
  pearlS1: [655, 393, 20], pearlS2: [530, 702, 18], pearlS3: [230, 842, 22], pearlS4: [757, 1325, 22],
  clearS1: [853, 370, 23], clearS2: [617, 880, 22], peach: [826, 503, 20],
};
// which gems can be big / medium / small, and how often each size appears
const BIG = ["pinkBig", "aqua1", "abStar2", "pink2", "lilacStar", "abStar4", "sequin2"];
const MEDIUM = ["clearTop", "clearA", "sequin1", "pinkS", "pearlL", "lilac1", "clearR", "clearL", "clearR2", "pearlM", "clearL2", "pearlBig2", "lilac2", "pinkBig", "aqua1", "pink2"];
const SMALL = ["goldA", "goldC", "pearlS1", "pearlS2", "pearlS3", "pearlS4", "clearS1", "clearS2", "peach", "pearlS1", "clearS1", "goldE"];
const ROTATES = new Set(["abStar1", "abStar2", "abStar4", "lilacStar", "oval", "flower"]); // shapes that look natural turned a little

// ---------- 1. cut-outs ----------
async function makeSprites() {
  const img = new Image(); img.src = SHEET; await img.decode();
  const src = document.createElement("canvas"); src.width = img.width; src.height = img.height;
  const sctx = src.getContext("2d", { willReadFrequently: true }); sctx.drawImage(img, 0, 0);
  const sprites = {};
  for (const [name, [cx, cy, r]] of Object.entries(GEMS)) {
    const half = Math.ceil(r * 1.6), size = half * 2;
    const data = sctx.getImageData(cx - half, cy - half, size, size);
    const px = data.data;
    // paper colour = median of a ring just inside the crop edge
    const ring = [[], [], []];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - half, y - half) / half;
      if (d > 0.88 && d < 1) { const i = (y * size + x) * 4; ring[0].push(px[i]); ring[1].push(px[i + 1]); ring[2].push(px[i + 2]); }
    }
    const paper = ring.map((c) => c.sort((a, b) => a - b)[c.length >> 1]);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4, d = Math.hypot(x - half, y - half) / half;
      const fade = d < 0.8 ? 0 : Math.min(1, (d - 0.8) / 0.18); // fade to white near the edge, just in case
      for (let c = 0; c < 3; c++) {
        // anything within ~5% of the paper colour becomes pure white (removes paper texture and faint shading)
        const v = Math.min(255, (px[i + c] / paper[c] / 0.95) * 255);
        px[i + c] = v + (255 - v) * fade * fade;
      }
      px[i + 3] = 255;
    }
    const out = document.createElement("canvas"); out.width = size; out.height = size;
    out.getContext("2d").putImageData(data, 0, 0);

    // a mask in the exact shape of the gem (everything that isn't white), used for the moving light
    const m = new ImageData(size, size);
    for (let i = 0; i < px.length; i += 4) {
      const ink = 255 - Math.min(px[i], px[i + 1], px[i + 2]);   // how far from white
      m.data[i] = m.data[i + 1] = m.data[i + 2] = 255;
      m.data[i + 3] = Math.min(255, ink * 7);
    }
    const raw = document.createElement("canvas"); raw.width = size; raw.height = size; raw.getContext("2d").putImageData(m, 0, 0);
    const soft = document.createElement("canvas"); soft.width = size; soft.height = size;
    const sc = soft.getContext("2d"); sc.filter = `blur(${Math.max(1, size / 70)}px)`; // fill tiny holes left by white sparkles
    sc.drawImage(raw, 0, 0); sc.drawImage(raw, 0, 0); sc.filter = "none"; sc.drawImage(raw, 0, 0);
    sprites[name] = { url: out.toDataURL(), mask: soft.toDataURL(), half, r };
  }
  return sprites;
}

// ---------- 2. layout ----------
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// sizes on screen (radius in px) for a 1440-wide window; scaled for smaller screens
const SIZES = { big: [26, 34], medium: [15, 22], small: [7, 10], section: 30 };

function layoutGems(W, H, fit, sectionGems, quiet) {
  // a fresh, random arrangement on every visit (it stays the same while the page is open, e.g. when resizing).
  // ?seed=N in the address shows one specific arrangement instead (11 was the original).
  layoutGems.seed ??= +new URLSearchParams(location.search).get("seed") || Math.floor(Math.random() * 1e6);
  const seed = layoutGems.seed;
  const rand = rng(seed), placed = [];
  const cx = W / 2, cy = H / 2;
  // calm space around the words (a rounded rectangle, so it covers the whole text block)
  // the calm space around the words: measured from the page if given, otherwise the desktop size
  const quietX = quiet ? quiet.x : 380 * fit, quietY = quiet ? quiet.y : 150 * fit;
  const inQuiet = (x, y, r) => ((x - cx) / (quietX + r)) ** 4 + ((y - cy) / (quietY + r)) ** 4 < 1;
  const fits = (x, y, r, gap) =>
    x - r > 10 && x + r < W - 10 && y - r > 54 && y + r < H - 12 && !inQuiet(x, y, r) &&
    placed.every((o) => Math.hypot(o.x - x, o.y - y) > o.r + r + gap);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const between = ([a, b]) => (a + rand() * (b - a)) * fit;

  // the section gems sit just outside the quiet space
  sectionGems.forEach((s, i) => {
    const a = (s.angle * Math.PI) / 180;
    const r = SIZES.section * fit * (s.gem === "pearlBig1" ? 0.72 : 1);
    let x = cx + Math.cos(a) * (quietX + 46 * fit), y = cy + Math.sin(a) * (quietY + 40 * fit);
    // narrow screens: keep it on screen, and if it had to move in, move it above/below the words instead
    const minX = r + 14, maxX = W - r - 14;
    if (x < minX || x > maxX) {
      x = Math.min(maxX, Math.max(minX, x));
      y = cy + Math.sign(Math.sin(a) || 1) * (quietY + r + 30 + rand() * 60 * fit);
    }
    placed.push({ name: s.gem, x, y, r, section: i, rot: ROTATES.has(s.gem) ? (rand() - 0.5) * 0.6 : 0 });
  });

  // then everything else: a mix of sizes, uneven gaps, sometimes a little cluster
  const target = Math.round((W * H) / (W <= 700 ? 15000 : 26000)); // phones: a bit denser, so they don't look empty
  for (let tries = 0; placed.length < target && tries < 9000; tries++) {
    const roll = rand();
    const kind = roll < 0.1 ? "big" : roll < 0.58 ? "medium" : "small";
    const name = pick(kind === "big" ? BIG : kind === "medium" ? MEDIUM : SMALL);
    const r = between(SIZES[kind]);
    const x = rand() * W, y = rand() * H;
    const gap = (10 + rand() * 46) * fit; // uneven spacing
    if (!fits(x, y, r, gap)) continue;
    placed.push({ name, x, y, r, rot: ROTATES.has(name) ? (rand() - 0.5) * 0.9 : 0 });
    // a little cluster of 1–2 small gems right beside it, like on the petals
    if (rand() < 0.16) {
      for (let k = 0, n = 1 + Math.floor(rand() * 2); k < n; k++) {
        const sr = between(SIZES.small), a = rand() * Math.PI * 2, d = r + sr + (2 + rand() * 6) * fit;
        const sx = x + Math.cos(a) * d, sy = y + Math.sin(a) * d;
        if (fits(sx, sy, sr, 2)) placed.push({ name: pick(SMALL), x: sx, y: sy, r: sr, rot: 0 });
      }
    }
  }
  return placed;
}
