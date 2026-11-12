(() => {
  "use strict";

  /* ---- Event details: edit here ---- */
  const EVENT = {
    startMs: Date.UTC(2026, 11, 6, 10, 30),   // 4:00 pm IST, used for the countdown
    // CONFIRM WITH TANYA: exact venue / map pin
    mapsQuery: "Namami Ganges Beach Resort, Shivpuri, Rishikesh, Uttarakhand",
  };

  const root = document.documentElement;
  root.classList.remove("no-js");
  root.classList.add("js");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const app = $("#app");
  const intro = $("#intro");
  const envelope = $("#openBtn");
  const stage = $("#stage");
  const pages = $$(".page", stage);
  const ids = pages.map((p) => p.dataset.page);
  const tabs = $$(".tab");
  const prevBtn = $(".side-nav--prev");
  const nextBtn = $(".side-nav--next");
  let current = 0;

  /* ---------- Links ---------- */
  const enc = encodeURIComponent;
  $("#dirLink").href = "https://www.google.com/maps/dir/?api=1&destination=" + enc(EVENT.mapsQuery);

  /* ---------- Background music ---------- */
  // Phones only allow sound after a tap, so it starts with the envelope tap; the corner button turns it on or off.
  const bgm = $("#bgm");
  const musicBtn = $("#musicBtn");
  let musicOn = false;
  bgm.volume = 0.6;
  function setMusic(on) {
    musicOn = on;
    musicBtn.setAttribute("aria-pressed", String(on));
    musicBtn.setAttribute("aria-label", on ? "Pause music" : "Play music");
    if (!on) { bgm.pause(); return; }
    const playing = bgm.play();
    if (playing && playing.catch) playing.catch(() => {
      musicOn = false;
      musicBtn.setAttribute("aria-pressed", "false");
      musicBtn.setAttribute("aria-label", "Play music");
    });
  }
  musicBtn.addEventListener("click", () => setMusic(!musicOn));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) bgm.pause();
    else if (musicOn) bgm.play().catch(() => {});
  });

  /* ---------- Countdown ---------- */
  const countdown = $("#countdown");
  // Whole calendar days, counted in Indian time
  const ist = new Date(Date.now() + 5.5 * 3600000);
  const todayIST = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  const eventDay = new Date(EVENT.startMs);
  const days = Math.round((Date.UTC(eventDay.getUTCFullYear(), eventDay.getUTCMonth(), eventDay.getUTCDate()) - todayIST) / 86400000);
  if (days > 1) countdown.textContent = days + " days to go";
  else if (days === 1) countdown.textContent = "Tomorrow!";
  else if (days === 0) countdown.textContent = "Today!";
  if (days >= 0) countdown.hidden = false;

  /* ---------- Pager ---------- */
  // Pages never scroll: if a page's content is taller than the card (very small screens),
  // shrink that page just enough to fit. Offsets ignore animation transforms, so this is stable.
  function fit(page) {
    const inner = page.firstElementChild;
    let bottom = 0;
    for (const el of inner.children) {
      if (el.offsetParent === null && getComputedStyle(el).display === "none") continue;
      bottom = Math.max(bottom, el.offsetTop + el.offsetHeight + parseFloat(getComputedStyle(el).marginBottom || 0));
    }
    bottom += parseFloat(getComputedStyle(inner).paddingBottom || 0);
    const scale = bottom > page.clientHeight + 1 ? page.clientHeight / bottom : 1;
    inner.style.setProperty("--fit", scale.toFixed(4));
  }
  const fitAll = () => pages.forEach(fit);

  function go(index, { focus = true } = {}) {
    if (index < 0 || index >= pages.length) return;
    current = index;
    pages.forEach((p, k) => {
      const active = k === index;
      p.classList.toggle("is-active", active);
      p.classList.toggle("is-before", k < index);
      p.toggleAttribute("inert", !active);
      p.setAttribute("aria-hidden", String(!active));
    });
    tabs.forEach((t) => {
      if (t.dataset.go === ids[index]) t.setAttribute("aria-current", "page");
      else t.removeAttribute("aria-current");
    });
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === pages.length - 1;
    const hash = index === 0 ? location.pathname + location.search : "#" + ids[index];
    try { history.replaceState(null, "", hash); } catch (err) { /* some embedded viewers refuse this */ }
    if (focus) {
      const h = $("[tabindex='-1']", pages[index]);
      if (h) h.focus({ preventScroll: true });
    }
  }

  const goTo = (id) => go(ids.indexOf(id));

  // Re-fit whenever anything on a page changes size (fonts arriving, rotation, resizing).
  // Changing --fit only transforms the page, so it doesn't trigger this again.
  let fitQueued = false;
  const queueFit = () => {
    if (fitQueued) return;
    fitQueued = true;
    requestAnimationFrame(() => { fitQueued = false; fitAll(); });
  };
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(queueFit);
    pages.forEach((p) => { ro.observe(p); [...p.firstElementChild.children].forEach((el) => ro.observe(el)); });
  }
  fitAll();
  if (document.fonts) {
    document.fonts.ready.then(fitAll);
    document.fonts.addEventListener("loadingdone", queueFit);
  }
  window.addEventListener("load", fitAll);
  window.addEventListener("resize", queueFit);

  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-go]");
    if (target) {
      e.preventDefault();
      goTo(target.dataset.go);
      return;
    }
    const step = e.target.closest("[data-step]");
    if (step) go(current + Number(step.dataset.step));
  });


  // Swipe left / right between pages
  let sx = null, sy = 0;
  stage.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) { sx = null; return; }
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });
  stage.addEventListener("touchend", (e) => {
    if (sx === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) go(current + (dx < 0 ? 1 : -1));
  }, { passive: true });

  // Arrow keys
  document.addEventListener("keydown", (e) => {
    if (!intro.hidden || e.altKey || e.metaKey || e.ctrlKey) return;
    if (e.key === "ArrowRight") go(current + 1);
    if (e.key === "ArrowLeft") go(current - 1);
  });

  /* ---------- Petals ---------- */
  const front = $("#petalsFront");
  const back = $("#petalsBack");
  const rand = (a, b) => a + Math.random() * (b - a);

  function petals(layer, count, { loop = false, min = 6, max = 10, spread = 1.4, cls = "" } = {}) {
    if (reduceMotion.matches) return;
    const frag = document.createDocumentFragment();
    for (let k = 0; k < count; k++) {
      const el = document.createElement("i");
      el.className = "petal" + (loop ? " is-loop" : "") + (cls ? " " + cls : "");
      const d = rand(min, max);
      el.style.cssText =
        `--x:${rand(-2, 100).toFixed(1)}vw;--s:${rand(.65, 1.35).toFixed(2)};` +
        `--d:${d.toFixed(2)}s;--delay:${(loop ? -rand(0, d) : rand(0, spread)).toFixed(2)}s;` +
        `--drift:${rand(-70, 70).toFixed(0)}px;--rot:${rand(0, 360).toFixed(0)}deg`;
      el.appendChild(document.createElement("b"));
      if (!loop) el.addEventListener("animationend", (ev) => { if (ev.target === el) el.remove(); });
      frag.appendChild(el);
    }
    layer.appendChild(frag);
  }

  /* ---------- Opening ---------- */
  let opened = false;

  function reveal({ instant = false } = {}) {
    intro.classList.add("is-gone");
    app.classList.add("is-revealed");
    $$(".intro-petal", front).forEach((p) => p.remove());
    if (!instant) petals(front, 26, { min: 5.5, max: 9, spread: 1.6 });
    setTimeout(() => {
      intro.hidden = true;
      petals(back, window.innerWidth > 860 ? 12 : 6, { loop: true, min: 13, max: 20 });
      fitAll();
    }, instant ? 0 : 850);
  }

  // Seal cracks → flap lifts → letter slides out → envelope sinks away → the invite appears
  function openInvite() {
    if (opened) return;
    opened = true;
    setMusic(true);
    const finish = () => {
      reveal();
      const h = $("#h-invite");
      if (current === 0 && h) h.focus({ preventScroll: true });
    };
    if (reduceMotion.matches) { finish(); return; }
    intro.classList.add("is-opening");
    envelope.classList.add("is-open");
    // the card fades in underneath while the letter lifts away
    setTimeout(() => {
      intro.classList.add("is-leaving");
      envelope.classList.add("is-leaving");
      finish();
    }, 1850);
  }
  envelope.addEventListener("click", openInvite);

  // Links like …/#venue pasted into an open tab
  window.addEventListener("hashchange", () => {
    const i = ids.indexOf(location.hash.slice(1));
    if (i < 0) return;
    if (!opened) { opened = true; reveal({ instant: true }); }
    go(i);
  });

  /* ---------- Start ---------- */
  const startId = location.hash.slice(1);
  const startIndex = ids.indexOf(startId);
  go(startIndex > 0 ? startIndex : 0, { focus: false });

  if (startIndex >= 0) {
    // Deep link to a page (…/#invite, …/#venue): skip the envelope
    opened = true;
    reveal({ instant: true });
  } else {
    petals(front, 5, { loop: true, min: 11, max: 16, cls: "intro-petal" });
  }
})();
