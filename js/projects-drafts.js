/*
  The projects section (the screen right after the intro).
  Chosen: D (sideways strip) with "peek" (the cards show at the bottom of the first screen).
  HIDDEN FOR NOW until there are real projects: add ?projects=d to the address to see it, or change "off" to "d" below to bring it back.
  The other drafts are still here to compare: ?projects=a, b or c · ?gap=none, soft or catch · ?projects=off hides the section.
  Later: the words move into content.js.
*/
(() => {
  const pick = (new URLSearchParams(location.search).get("projects") || "off").toLowerCase();
  const host = document.getElementById("next");
  if (!host) return;
  if (!["a", "b", "c", "d"].includes(pick)) {
    // hidden: the empty screen collapses, and "view my work ↓" / "scroll for more" go too (nothing below to go to)
    host.style.display = "none";
    for (const id of ["email-line", "scroll-cue"]) { const el = document.getElementById(id); if (el) el.style.display = "none"; }
    return;
  }

  // placeholder projects (3–5 fit). media: path to a .gif / .png, or leave out for an empty frame
  const items = [
    { title: "Project one", problem: "the problem, in a few words", solution: "what you built to fix it",
      stack: ["skill #1", "skill #2", "skill #3"], links: [{ label: "github", url: "#" }, { label: "live demo", url: "#" }] },
    { title: "Project two", problem: "a slightly longer problem statement", solution: "the thing that solves it",
      stack: ["skill #1", "skill #2", "skill #3"], links: [{ label: "github", url: "#" }, { label: "live demo", url: "#" }] },
    { title: "Project three", problem: "something that bugged you", solution: "a small tool for it",
      stack: ["skill #1", "skill #2"], links: [{ label: "github", url: "#" }] },
    { title: "Project four", problem: "what you're working on now", solution: "coming soon",
      stack: ["skill #1"], links: [{ label: "github", url: "#" }], soon: true },
  ].slice(0, 3);   // for now: at most 3 projects show (raise the 3 to show more)

  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const media = (p) => p.media
    ? `<div class="pj-media"><img src="${esc(p.media)}" alt="${esc(p.title)} screenshot" loading="lazy"></div>`
    : `<div class="pj-media empty"><span class="mono">gif or screenshot · 16:10</span></div>`;
  const links = (p) => `<p class="pj-links mono">${p.links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join("")}</p>`;
  const stack = (p) => `<ul class="pj-stack mono">${p.stack.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`;
  const line = (p) => `<p class="pj-line">${esc(p.problem)} <span class="arr">→</span> ${esc(p.solution)}</p>`;
  const num = (i) => String(i + 1).padStart(2, "0");
  const letters = (t) => [...t].map((c, i) => `<span class="pj-ch" style="--i:${i}">${c === " " ? "&nbsp;" : esc(c)}</span>`).join("");

  const css = `
  #next.pj { height: auto; min-height: 100svh; }
  .pj { --ease: cubic-bezier(.2,.7,.2,1); font-family: "IBM Plex Mono", monospace; }
  .pj .mono { color: var(--muted); }
  .pj h2 { font-weight: 400; line-height: 1.2; color: var(--ink); }
  .pj h2 i { color: var(--rose); }
  .pj h3 { font-weight: 400; font-size: 15px; line-height: 1.3; margin-top: 6px; color: var(--ink); }
  .pj-line { color: var(--soft); font-size: 12.5px; line-height: 1.5; margin-top: 6px; }
  .pj-line .arr { color: var(--rose); padding: 0 .15em; }
  .pj-stack { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
  .pj-stack li { border: 1px solid var(--line); border-radius: 99px; padding: 4px 10px; color: var(--soft); font-size: 10px; }
  .pj-links { display: flex; gap: 18px; margin-top: 16px; }
  .pj-links a { text-decoration: none; color: var(--ink); border-bottom: 1px solid var(--line); padding-bottom: 2px; }
  .pj-links a:hover { color: var(--rose); border-color: var(--rose); }
  .pj-media { aspect-ratio: 16 / 10; overflow: hidden; background: var(--paper); border: 1px solid var(--line); }
  .pj-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pj-media.empty { display: grid; place-items: center;
    background: repeating-linear-gradient(135deg, transparent 0 9px, rgba(176,112,124,.07) 9px 10px), var(--paper); }
  .pj-soon { color: var(--rose) !important; }
  .pj-head .mono { margin-bottom: 14px; }

  /* shared "comes in" motion: anything with .rv starts lowered + faded, .in brings it up */
  .pj .rv { opacity: 0; transform: translateY(36px); transition: opacity .9s var(--ease), transform 1s var(--ease); transition-delay: calc(var(--d, 0) * 1ms); }
  .pj .rv.in { opacity: 1; transform: none; }
  .pj .pj-ch { display: inline-block; opacity: 0; transform: translateY(-.5em) rotate(calc((var(--i) * 37 % 11 - 5) * 1deg));
               transition: opacity .6s var(--ease), transform .8s var(--ease); transition-delay: calc(var(--i) * 45ms); }
  .pj .in .pj-ch, .pj .pj-ch.in { opacity: 1; transform: none; }

  /* ---------- A · rows ---------- */
  .pj-a { max-width: 1120px; margin: 0 auto; padding: 22vh 6vw 18vh; }
  .pj-a h2 { font-size: 24px; }
  .pj-a .row { display: grid; grid-template-columns: 1.15fr 1fr; gap: 48px; align-items: center; border-top: 1px solid var(--line); padding: 48px 0; }
  .pj-a .row:first-of-type { margin-top: 56px; }
  .pj-a .row:nth-of-type(even) .pj-media { order: 2; }
  .pj-a .pj-media { clip-path: inset(100% 0 0 0); transition: clip-path 1.1s var(--ease) .1s; }
  .pj-a .row.in .pj-media { clip-path: inset(0 0 0 0); }

  /* ---------- B · sticky index ---------- */
  .pj-b { display: grid; grid-template-columns: minmax(240px, .8fr) 1.4fr; gap: 6vw; max-width: 1200px; margin: 0 auto; padding: 22vh 6vw 20vh; }
  .pj-b .side { position: sticky; top: 20vh; align-self: start; }
  .pj-b h2 { font-size: 24px; }
  .pj-b .idx { list-style: none; margin-top: 34px; }
  .pj-b .idx li { font-size: 13px; color: var(--muted); padding: 6px 0; transition: color .4s, transform .4s var(--ease); cursor: pointer; }
  .pj-b .idx li span { font-family: "IBM Plex Mono", monospace; font-size: 10px; margin-right: 10px; }
  .pj-b .idx li.on { color: var(--ink); transform: translateX(8px); }
  .pj-b .idx li.on span { color: var(--rose); }
  .pj-b .card { margin-bottom: 18vh; }
  .pj-b .card:last-child { margin-bottom: 0; }
  .pj-b .card .pj-media { margin-bottom: 22px; }

  /* ---------- C · prints on paper ---------- */
  .pj-c { max-width: 1060px; margin: 0 auto; padding: 22vh 6vw 20vh; }
  .pj-c .pj-head { text-align: center; }
  .pj-c h2 { font-size: 24px; }
  .pj-c .note { text-align: center; font-family: Caveat, cursive; font-size: 24px; color: var(--rose); margin-top: 10px; }
  .pj-c .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 70px 56px; margin-top: 70px; }
  .pj-c .print { background: var(--paper); padding: 14px 14px 24px; box-shadow: 0 1px 2px rgba(60,40,40,.06), 0 14px 34px rgba(60,40,40,.08);
                 --r: -1.6deg; transform: rotate(var(--r)); }
  .pj-c .print:nth-child(even) { --r: 1.4deg; margin-top: 90px; }
  .pj-c .print:nth-child(3) { --r: .8deg; }
  .pj-c .print.rv { transform: translateY(70px) rotate(calc(var(--r) * 5)) scale(.96); }
  .pj-c .print.rv.in { transform: rotate(var(--r)); }
  .pj-c .print:hover { transform: rotate(0) translateY(-4px); transition-delay: 0ms; }
  .pj-c .print .pj-media { border: none; }
  .pj-c .print .txt { padding: 16px 6px 0; }
  .pj-c .print .pj-line { font-family: Caveat, cursive; font-size: 18px; line-height: 1.2; }

  /* ---------- D · sideways strip ----------
     the strip scrolls up from below the intro like a normal section, locks in place once it fills the screen,
     then further scrolling slides the cards sideways. No heading: the cards start right away. */
  .pj-d { position: relative; }
  .pj-d .pj-pin { position: sticky; top: 0; height: 100svh; overflow: hidden; display: flex; align-items: center; padding-bottom: 8vh; }   /* cards sit a little above the middle */
  .pj-d .track { display: flex; gap: 4vw; padding: 0 6vw; will-change: transform; align-items: center; }
  .pj-d .card { flex: 0 0 min(44vw, calc((100svh - 340px) * 1.6)); }
  .pj-d .card .pj-media { margin-bottom: 18px; }
  .pj-d .card .pj-stack, .pj-d .card .pj-links { margin-top: 12px; }

  @media (max-width: 700px) {
    .pj-a .row, .pj-b, .pj-c .grid { grid-template-columns: 1fr; gap: 26px; }
    .pj-a .row:nth-of-type(even) .pj-media { order: 0; }
    .pj-b .side { position: static; } .pj-b .idx { display: none; } .pj-b .card { margin-bottom: 12vh; }
    .pj-c .print:nth-child(even) { margin-top: 0; }
    .pj-d { height: auto !important; } .pj-d .pj-pin { position: static; height: auto; display: block; padding: 0; }
    .pj-d .track { flex-direction: column; align-items: stretch; gap: 64px; transform: none !important; padding: 10vh 6vw 12vh; }
    .pj-d .card { flex: none; }
    .pj h3 { font-size: 14px; } .pj-line { font-size: 12px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .pj .rv, .pj .pj-ch, .pj-a .pj-media { transition: none !important; opacity: 1 !important; transform: none !important; clip-path: none !important; }
  }`;
  document.head.insertAdjacentHTML("beforeend", `<style id="pj-css">${css}</style>`);

  const head = (cls = "") => `<div class="pj-head ${cls}">
      <p class="mono rv">selected projects · ${num(0)}–${num(items.length - 1)}</p>
      <h2 class="rv">${letters("Things I’ve")}<br><i>${letters("built")}</i></h2></div>`;
  const text = (p, i) => `<p class="mono${p.soon ? " pj-soon" : ""}">${num(i)}${p.soon ? " · in progress" : ""}</p>
      <h3>${esc(p.title)}</h3>${line(p)}${stack(p)}${links(p)}`;

  let html = "";
  if (pick === "a") {
    html = `<div class="pj-a">${head()}${items.map((p, i) => `<article class="row rv">${media(p)}<div>${text(p, i)}</div></article>`).join("")}</div>`;
  } else if (pick === "b") {
    html = `<div class="pj-b"><aside class="side">${head()}
        <ol class="idx">${items.map((p, i) => `<li data-i="${i}"><span>${num(i)}</span>${esc(p.title)}</li>`).join("")}</ol></aside>
      <div class="cards">${items.map((p, i) => `<article class="card rv" data-i="${i}">${media(p)}${text(p, i)}</article>`).join("")}</div></div>`;
  } else if (pick === "c") {
    html = `<div class="pj-c">${head()}<p class="note rv" style="--d:500">(more on the way)</p>
      <div class="grid">${items.map((p, i) => `<article class="print rv" style="--d:${(i % 2) * 140}">${media(p)}<div class="txt">${text(p, i)}</div></article>`).join("")}</div></div>`;
  } else {
    html = `<div class="pj-d"><div class="pj-pin"><div class="track">
        ${items.map((p, i) => `<article class="card">${media(p)}${text(p, i)}</article>`).join("")}</div></div></div>`;
  }
  host.classList.add("pj");
  host.innerHTML = html;

  // reveal things as they scroll into view
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
  host.querySelectorAll(".rv").forEach((el) => io.observe(el));

  // B: highlight the project you're looking at in the index; click to jump
  if (pick === "b") {
    const lis = [...host.querySelectorAll(".idx li")];
    const spy = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) lis.forEach((li) => li.classList.toggle("on", li.dataset.i === e.target.dataset.i));
    }), { rootMargin: "-45% 0px -45% 0px" });
    host.querySelectorAll(".card").forEach((c) => spy.observe(c));
    lis.forEach((li) => li.addEventListener("click", () =>
      host.querySelector(`.card[data-i="${li.dataset.i}"]`).scrollIntoView({ behavior: "smooth", block: "center" })));
  }

  // D: once the strip has scrolled up and locked in place, scrolling down slides it sideways.
  // Trying out ways to close the gap under the intro (?gap=...):
  //   peek  = the top of the cards already shows at the bottom of the first screen, then they rise a bit faster than you scroll
  //   soft  = same, but only a sliver, faded, getting clearer as you scroll
  //   catch = hidden at first, then the cards rise faster than you scroll and catch up to the text
  //   (none) = as before
  if (pick === "d") {
    const gap = ((g) => g === "none" ? "" : g)(new URLSearchParams(location.search).get("gap") || "peek");
    const wrap = host.querySelector(".pj-d"), pin = host.querySelector(".pj-pin"), track = host.querySelector(".track");
    const speed = 1.2;   // sideways pixels per pixel scrolled
    const wide = () => matchMedia("(min-width: 701px)").matches;
    // until the last card rests at the right, with the same margin as on the left
    const travel = () => { const last = track.lastElementChild; return Math.max(0, last.offsetLeft + last.offsetWidth + innerWidth * 0.06 - innerWidth); };
    if (gap === "peek" || gap === "soft") { const c = document.getElementById("scroll-cue"); if (c) c.style.display = "none"; }   // the cards are the hint now
    // pull: how far the strip is moved up · drop: extra push down at the top (catch) · rest: strip's top at scroll 0
    // firstScreen: in peek, the height of the space above the cards (the gems are laid out in it)
    let pull = 0, drop = 0, rest = 1, cardTop0 = Infinity, firstScreen = 0;
    window.pjFirstScreen = () => firstScreen;
    const size = () => {
      wrap.style.marginTop = ""; track.style.transform = ""; pull = drop = 0;
      if (!wide()) { wrap.style.height = ""; track.style.opacity = ""; firstScreen = 0; document.getElementById("hello").style.top = ""; return; }
      const H = innerHeight;
      const O = track.querySelector(".card").getBoundingClientRect().top - pin.getBoundingClientRect().top;   // card's distance from the strip's top
      if (gap === "peek") {   // shows 17% of the screen's height of cards at first, then rises faster than you scroll (1.6×)
        const v = 1.6, show = H * 0.17, extra = (H - show - O) * (1 - 1 / v);
        pull = O + show + extra; drop = extra;
      }
      if (gap === "soft") pull = O + H * 0.09;
      if (gap === "catch") { const v = 1.8; pull = O + (H - O) * (1 - 1 / v); drop = pull - O; }
      wrap.style.marginTop = pull ? `${-pull}px` : "";
      wrap.style.height = `${H + travel() / speed}px`;
      rest = Math.max(1, H - pull);
      cardTop0 = rest + O + drop;
      // peek: the intro text sits in the middle of the space above the cards (the gems spread over that space too)
      firstScreen = gap === "peek" ? cardTop0 - 24 : 0;
      document.getElementById("hello").style.top = firstScreen ? `${firstScreen / 2}px` : "";
      move();
    };
    const move = () => {
      if (!wide()) return;
      const top = wrap.getBoundingClientRect().top;
      const span = travel() / speed;
      const p = Math.max(0, Math.min(1, -top / Math.max(1, span)));
      const y = drop * Math.max(0, Math.min(1, top / rest));   // catch: starts pushed down, the push shrinks to 0 as the strip locks
      track.style.transform = `translate(${(-p * travel()).toFixed(1)}px, ${y.toFixed(1)}px)`;
      if (gap === "soft") track.style.opacity = (0.35 + 0.65 * Math.max(0, Math.min(1, 1 - (top - rest * 0.45) / (rest * 0.55)))).toFixed(3);
    };
    addEventListener("scroll", () => requestAnimationFrame(move), { passive: true });
    addEventListener("resize", size); document.fonts.ready.then(size); size();
    // the gems read this every frame so they stay off the cards (t0 = where the cards' top is at the very top of the page)
    const first = track.querySelector(".card"), pad = () => innerWidth * 0.06;
    window.pjAvoid = () => {
      if (!gap || !wide()) return null;
      const r = track.getBoundingClientRect(), c = first.getBoundingClientRect();
      return { l: Math.max(0, r.left + pad()), r: Math.min(innerWidth, r.right - pad()), t: c.top, t0: cardTop0 };
    };
  }
})();
