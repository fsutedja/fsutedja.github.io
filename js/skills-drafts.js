/*
  DRAFTS for the skills section (right after the projects).
  Only runs when the address has ?skills=a, b, c or d — the normal page is untouched.
  The words come from `skills` in content.js.
*/
(() => {
  const pick = (new URLSearchParams(location.search).get("skills") || "").toLowerCase();
  if (!["a", "b", "c", "d"].includes(pick)) return;
  const after = document.getElementById("next");
  if (!after || typeof skills === "undefined") return;

  const groups = [
    { key: "canDo", label: "can do", items: skills.canDo || [] },
    { key: "learning", label: "learning now", items: skills.learning || [] },
    { key: "taughtMyself", label: "taught myself", items: skills.taughtMyself || [] },
  ];
  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const list = (a) => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];

  const css = `
  #skills { position: relative; --ease: cubic-bezier(.2,.7,.2,1); font-family: "IBM Plex Mono", monospace; }
  #skills .mono { color: var(--muted); }
  #skills .sk-rv { opacity: 0; transform: translateY(30px); transition: opacity .9s var(--ease), transform 1s var(--ease); transition-delay: calc(var(--d, 0) * 1ms); }
  #skills .sk-rv.in { opacity: 1; transform: none; }

  /* A · three columns */
  .sk-a { max-width: 1120px; margin: 0 auto; padding: 22vh 6vw 24vh; display: grid; grid-template-columns: repeat(3, 1fr); gap: 5vw; }
  .sk-a .sk-label { color: var(--rose); border-bottom: 1px solid var(--line); padding-bottom: 12px; }
  .sk-a ul { list-style: none; margin-top: 18px; }
  .sk-a li { font-size: 14px; line-height: 1.4; padding: 6px 0; color: var(--ink); }
  .sk-a .learning li { font-style: italic; color: var(--soft); }

  /* B · one paragraph that inks in as you scroll */
  .sk-b { max-width: 720px; margin: 0 auto; padding: 26vh 6vw 30vh; }
  .sk-b p { font-size: 17px; line-height: 1.75; }
  .sk-b .w { color: var(--line); transition: color .35s; }
  .sk-b .w.on { color: var(--soft); }
  .sk-b .w.k.on { color: var(--ink); border-bottom: 1.5px solid var(--line); }
  .sk-b .w.k.learn.on { color: var(--rose); font-style: italic; }

  /* C · scattered tags */
  .sk-c { max-width: 1000px; margin: 0 auto; padding: 22vh 6vw 26vh; text-align: center; }
  .sk-c .sk-cloud { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px 10px; max-width: 640px; margin: 0 auto; }
  .sk-c .tag { font-size: 13px; padding: 7px 16px; border-radius: 99px; background: var(--paper);
               box-shadow: 0 1px 2px rgba(60,40,40,.06), 0 8px 22px rgba(60,40,40,.07); --r: 0deg; transform: rotate(var(--r)); transition: transform .5s var(--ease); }
  .sk-c .tag.learning { background: none; box-shadow: none; border: 1.5px dashed var(--rose); color: var(--rose); font-style: italic; }
  .sk-c .tag.taughtMyself { background: none; box-shadow: none; border: 1px solid var(--line); color: var(--soft); }
  .sk-c .tag.sk-rv { transform: translateY(50px) rotate(calc(var(--r) * 6)); }
  .sk-c .tag.sk-rv.in { transform: rotate(var(--r)); }
  .sk-c .tag:hover { transform: rotate(0) translateY(-3px); transition-delay: 0ms; }
  .sk-c .legend { display: flex; justify-content: center; gap: 28px; margin-top: 46px; font-family: Caveat, cursive; font-size: 18px; color: var(--soft); }
  .sk-c .legend i { display: inline-block; width: 26px; height: 14px; border-radius: 99px; margin-right: 8px; vertical-align: -1px; }
  .sk-c .legend .l1 i { background: var(--paper); box-shadow: 0 2px 6px rgba(60,40,40,.15); }
  .sk-c .legend .l2 i { border: 1.5px dashed var(--rose); }
  .sk-c .legend .l3 i { border: 1px solid var(--line); }

  /* D · rows that slide sideways as you scroll (like the projects) */
  .sk-d { padding: 20vh 0 24vh; overflow: hidden; }
  .sk-d .row { display: flex; align-items: baseline; gap: 26px; white-space: nowrap; padding: 14px 0; will-change: transform; }
  .sk-d .row + .row { border-top: 1px solid var(--line); }
  .sk-d .row .mono { color: var(--rose); flex: none; }
  .sk-d .row span.it { font-size: clamp(18px, 2vw, 26px); line-height: 1.3; color: var(--ink); flex: none; }
  .sk-d .row.learning span.it { font-style: italic; color: var(--rose); }
  .sk-d .row.taughtMyself span.it { color: var(--soft); }
  .sk-d .row .dot { color: var(--line); font-size: 16px; flex: none; }

  @media (max-width: 700px) {
    .sk-a { grid-template-columns: 1fr; gap: 44px; padding: 14vh 6vw 18vh; }
    .sk-b { padding: 16vh 6vw 20vh; }
    .sk-c { padding: 14vh 6vw 18vh; } .sk-c .legend { flex-direction: column; gap: 8px; align-items: center; }
    .sk-d { padding: 14vh 0 18vh; }
  }
  @media (prefers-reduced-motion: reduce) {
    #skills .sk-rv { transition: none !important; opacity: 1 !important; transform: none !important; }
  }`;
  document.head.insertAdjacentHTML("beforeend", `<style id="sk-css">${css}</style>`);

  const sec = document.createElement("section");
  sec.id = "skills";
  after.after(sec);

  if (pick === "a") {
    sec.innerHTML = `<div class="sk-a">${groups.map((g, gi) => `<div class="${g.key}">
        <p class="mono sk-label sk-rv" style="--d:${gi * 120}">${g.label}</p>
        <ul>${g.items.map((it, i) => `<li class="sk-rv" style="--d:${gi * 120 + 80 + i * 70}">${esc(it)}</li>`).join("")}</ul></div>`).join("")}</div>`;
  } else if (pick === "b") {
    // the paragraph, split into words; skill names are marked so they ink in darker
    const parts = [
      ["I can do "], [skills.canDo, "k"], [". Right now I'm learning "], [skills.learning, "k learn"],
      [". Along the way I taught myself "], [skills.taughtMyself, "k"], ["."],
    ];
    const words = (text, cls = "") => text.split(/(\s+)/).map((w) => /^\s+$/.test(w) || !w ? w : `<span class="w ${cls}">${esc(w)}</span>`).join("");
    const html = parts.map(([v, cls]) => Array.isArray(v)
      ? (v.length < 2 ? v : [...v.slice(0, -1).flatMap((x, i) => i ? [", ", x] : [x]), " and ", v[v.length - 1]])
          .map((x, i, arr) => (x === ", " || x === " and ") ? words(x) : words(x, cls)).join("")
      : words(v)).join("");
    sec.innerHTML = `<div class="sk-b"><p>${html}</p></div>`;
  } else if (pick === "c") {
    const rot = (i) => ((i * 37) % 9 - 4) * 0.6;
    let n = 0;
    sec.innerHTML = `<div class="sk-c"><div class="sk-cloud">${groups.flatMap((g) => g.items.map((it) => {
        const i = n++; return `<span class="tag ${g.key} sk-rv" style="--r:${rot(i)}deg; --d:${i * 60}">${esc(it)}</span>`; })).join("")}</div>
      <p class="legend sk-rv" style="--d:400"><span class="l1"><i></i>can do</span><span class="l2"><i></i>learning now</span><span class="l3"><i></i>taught myself</span></p></div>`;
  } else {
    // each row repeats its items so it's long enough to slide
    const row = (g) => { const items = []; while (items.length < 12) items.push(...(g.items.length ? g.items : ["…"])); return items; };
    sec.innerHTML = `<div class="sk-d">${groups.map((g, gi) => `<div class="row ${g.key}" data-dir="${gi % 2 ? 1 : -1}">
        <span class="mono">${g.label}</span>${row(g).map((it) => `<span class="it">${esc(it)}</span><span class="dot">·</span>`).join("")}</div>`).join("")}</div>`;
  }

  // reveal as things scroll into view
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -12% 0px", threshold: 0.1 });
  sec.querySelectorAll(".sk-rv").forEach((el) => io.observe(el));

  // B: words ink in one by one as the paragraph moves up the screen
  if (pick === "b") {
    const ws = [...sec.querySelectorAll(".w")], p = sec.querySelector("p");
    const ink = () => {
      const r = p.getBoundingClientRect(), H = innerHeight;
      const prog = Math.max(0, Math.min(1, (H * 0.85 - r.top) / (r.height + H * 0.35)));
      const k = Math.round(prog * ws.length);
      ws.forEach((w, i) => w.classList.toggle("on", i < k));
    };
    addEventListener("scroll", () => requestAnimationFrame(ink), { passive: true }); ink();
  }

  // D: rows slide in opposite directions while the section crosses the screen
  if (pick === "d") {
    const rows = [...sec.querySelectorAll(".row")];
    const slide = () => {
      const r = sec.getBoundingClientRect(), H = innerHeight;
      const prog = (H - r.top) / (H + r.height);   // 0 as it enters at the bottom → 1 as it leaves at the top
      rows.forEach((row) => {
        const dir = +row.dataset.dir, extra = Math.max(0, row.scrollWidth - innerWidth);
        const x = dir < 0 ? -prog * extra * 0.5 : -(1 - prog) * extra * 0.5;
        row.style.transform = `translateX(${(x + innerWidth * 0.06).toFixed(1)}px)`;
      });
    };
    addEventListener("scroll", () => requestAnimationFrame(slide), { passive: true });
    addEventListener("resize", slide); slide();
  }
})();
