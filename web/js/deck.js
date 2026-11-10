/* Deck engine for the PowerPoint-faithful web deck.
   - Slides are rendered from web/data/deck.js (exact PPTX layout).
   - Morph: shapes with the same name on consecutive slides move/resize/rotate/fade from old to new (FLIP),
     unmatched shapes fade out/in — like PowerPoint's Morph (by object). Never blocks: a new input finishes it.
   - Builds: the PPTX click steps (fade / wipe), going back hides instantly.
   - Opening (3 slides) auto-advances like the PPTX; then waits for Enter.
   Hooks: window.__go(label, step), window.__ready, ?static. Hash: #s=3a&b=2 */
(function () {
  const PP = window.PPTX, NOTES = window.NOTES || {};
  const LABELS = ['o1', 'o2', 'o3', '1', '2', '3a', '3b', '4', '5', '6a', '6b', '7', '8', '9', '10', 'A', 'B', 'C', 'D'];
  const FIRST_MAIN = 3, LAST_MAIN = 14;
  const stage = document.getElementById('stage'), page = document.getElementById('page');
  const st = { i: 0, step: 0 };
  let advTimer = null;
  const EASE = 'cubic-bezier(0.45, 0, 0.2, 1)';

  // ---------- build ----------
  const S = PP.slides.map((d, i) => {
    const r = RENDER.renderSlide(d, LABELS[i]);
    page.appendChild(r.el);
    const titleShape = d.shapes.find(s => /^!!(title|title_main|thanks)$/.test(s.name));
    const id = LABELS[i];
    const n = NOTES[id];
    return {
      i, id, d, el: r.el, map: r.map, steps: d.steps.length, backup: i > LAST_MAIN, opening: i < FIRST_MAIN,
      title: titleShape ? RENDER.textOf(titleShape) : (i < FIRST_MAIN ? 'Opening' : id),
      notes: n ? n.text : d.notes, time: n ? n.time : '',
      fx: new Map(d.steps.flatMap(stp => stp.map(e => [e.id, e])))
    };
  });

  // ---------- web-only additions on top of the PPTX layout ----------
  // Slide 4 (91 patients, 46 high / 45 low): BraTS logo next to the data source, linked to the TCIA collection page.
  // Appears with the caption (click 2); clicking it opens the page in a new tab and does not advance the slide.
  (function addBrats() {
    const s = S.find(x => x.id === '4'); if (!s) return;
    const m = { id: 900001, name: '!!web_brats_logo', kind: 'pic', x: 1659, y: 818, w: 184, h: 48, rot: 0, alpha: 1 };
    const a = document.createElement('a');
    a.className = 'shp k-pic web-link bld hid';
    a.href = 'https://www.cancerimagingarchive.net/analysis-result/brats-tcga-gbm/';
    a.target = '_blank'; a.rel = 'noopener';
    a.title = 'BraTS-TCGA-GBM on The Cancer Imaging Archive (opens in a new tab)';
    Object.assign(a.style, { left: m.x + 'px', top: m.y + 'px', width: m.w + 'px', height: m.h + 'px' });
    a.dataset.name = m.name; a.dataset.id = m.id; a.dataset.step = 2;
    const im = document.createElement('img');
    im.src = 'img/pptx/BRATS.png'; im.alt = 'BraTS'; im.draggable = false;
    Object.assign(im.style, { left: 0, top: 0, width: m.w + 'px', height: m.h + 'px' });
    a.appendChild(im); s.el.appendChild(a);
    s.map.top.push({ s: m, el: a }); s.map.byId.set(m.id, a);
  })();

  // ---------- fit ----------
  function fit() {
    const sc = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(${(innerWidth - 1920 * sc) / 2}px, ${(innerHeight - 1080 * sc) / 2}px) scale(${sc})`;
  }
  addEventListener('resize', fit); fit();

  // ---------- builds ----------
  function buildAnim(el, e, i, n) {
    const delay = n > 6 ? Math.min(i * 14, 500) : i * 40;
    const dur = Math.max(260, Math.min(e.dur || 350, 600));
    if (/wipe/.test(e.fx)) {
      const from = e.fx === 'wipe(left)' ? 'inset(0 100% 0 0)' : e.fx === 'wipe(down)' ? 'inset(100% 0 0 0)' : e.fx === 'wipe(up)' ? 'inset(0 0 100% 0)' : 'inset(0 0 0 100%)';
      return M.anim(el, [{ clipPath: from }, { clipPath: 'inset(0 0 0 0)' }], { duration: Math.max(dur, 500), delay, easing: 'cubic-bezier(0.3,0,0.2,1)', fill: 'backwards' });
    }
    return M.anim(el, [{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }], { duration: dur, delay, easing: 'cubic-bezier(0.2,0,0,1)', fill: 'backwards' });
  }
  function setStep(s, step, animate, prev) {
    const els = s.el.querySelectorAll('.bld');
    const entering = [];
    for (const el of els) {
      const k = +el.dataset.step;
      const on = step >= k, was = !el.classList.contains('hid');
      if (on && !was) { el.classList.remove('hid'); if (animate && k === step && prev === step - 1) entering.push(el); }
      else if (!on && was) { for (const a of el.getAnimations()) a.cancel(); el.classList.add('hid'); }
      else if (!on) el.classList.add('hid');
    }
    entering.forEach((el, i) => buildAnim(el, s.fx.get(+el.dataset.id) || { fx: 'fade', dur: 350 }, i, entering.length));
    LIVE.step(s, step, animate && prev === step - 1);
  }

  // ---------- morph ----------
  const vis = (el) => !el.classList.contains('hid');
  const rect = (s) => ({ cx: s.x + s.w / 2, cy: s.y + s.h / 2, w: s.w, h: s.h, rot: s.rot || 0 });
  function morph(a, b, dur) {
    const A = S[a], B = S[b];
    A.el.classList.add('on'); B.el.classList.add('on');
    A.el.style.zIndex = 1; B.el.style.zIndex = 2;
    const used = new Set();
    const pool = new Map();
    for (const t of A.map.top) { if (!vis(t.el)) continue; if (!pool.has(t.s.name)) pool.set(t.s.name, []); pool.get(t.s.name).push(t); }
    const o = { duration: dur, easing: EASE, fill: 'none' };
    for (const t of B.map.top) {
      if (!vis(t.el)) continue;
      const cand = (pool.get(t.s.name) || []).find(x => !used.has(x));
      const bs = t.s, bel = t.el, base = bel.dataset.base || '';
      const bA = bs.alpha != null ? bs.alpha : 1;
      if (!cand) { M.anim(bel, [{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: bA }], o); continue; }
      used.add(cand);
      const as = cand.s, ra = rect(as), rb = rect(bs);
      const sx = ra.w && rb.w ? ra.w / rb.w : 1, sy = ra.h && rb.h ? ra.h / rb.h : 1;
      const from = `translate(${ra.cx - rb.cx}px, ${ra.cy - rb.cy}px) scale(${sx}, ${sy}) rotate(${ra.rot}deg)`;
      const aA = as.alpha != null ? as.alpha : 1;
      const textChanged = !!(as.text || bs.text) && RENDER.textOf(as) !== RENDER.textOf(bs);
      const same = !textChanged && ra.cx === rb.cx && ra.cy === rb.cy && ra.w === rb.w && ra.h === rb.h && ra.rot === rb.rot && aA === bA && JSON.stringify(as.crop) === JSON.stringify(bs.crop);
      if (same) { M.anim(cand.el, [{ opacity: 0 }, { opacity: 0 }], o); continue; }   // identical: new copy simply stays
      if (textChanged) {
        const back = `translate(${rb.cx - ra.cx}px, ${rb.cy - ra.cy}px) scale(${1 / sx}, ${1 / sy}) rotate(${rb.rot}deg)`;
        M.anim(cand.el, [{ transform: cand.el.dataset.base || 'none', opacity: aA }, { opacity: 0, offset: 0.5 }, { transform: back, opacity: 0 }], o);
        M.anim(bel, [{ transform: from, opacity: 0 }, { opacity: 0, offset: 0.4 }, { transform: base || 'none', opacity: bA }], o);
        continue;
      }
      M.anim(cand.el, [{ opacity: 0 }, { opacity: 0 }], o);
      M.anim(bel, [{ transform: from, opacity: aA }, { transform: base || 'none', opacity: bA }], o);
      if (bs.kind === 'pic' && JSON.stringify(as.crop) !== JSON.stringify(bs.crop)) {
        const im = bel.querySelector('img');
        const ia = RENDER.imgRect(as, as.w, as.h), ib = RENDER.imgRect(bs, bs.w, bs.h);
        M.anim(im, [{ left: ia.x / sx + 'px', top: ia.y / sy + 'px', width: ia.w / sx + 'px', height: ia.h / sy + 'px' },
          { left: ib.x + 'px', top: ib.y + 'px', width: ib.w + 'px', height: ib.h + 'px' }], o);
      }
    }
    for (const t of A.map.top) if (vis(t.el) && !used.has(t)) M.anim(t.el, [{ opacity: t.s.alpha != null ? t.s.alpha : 1 }, { opacity: 0, offset: 0.55 }, { opacity: 0 }], o);
    const end = M.anim(A.el, [{ opacity: 1 }, { opacity: 1 }], o);
    const done = () => { if (st.i !== a) A.el.classList.remove('on'); A.el.style.zIndex = ''; B.el.style.zIndex = ''; };
    if (end) { end.onfinish = done; end.oncancel = done; } else done();
  }

  // ---------- navigation ----------
  function go(i, step = 0, opts = {}) {
    i = Math.max(0, Math.min(S.length - 1, i));
    step = Math.max(0, Math.min(S[i].steps, step));
    M.finishAll();
    clearTimeout(advTimer);
    const a = st.i, s = S[i];
    const animate = !M.STATIC && opts.animate !== false;
    if (a === i) {
      const prev = st.step; st.step = step;
      setStep(s, step, animate, prev);
      after(); return;
    }
    st.i = i; st.step = step;
    LIVE.leave(S[a]);
    setStep(s, step, false, step);
    const adjacent = Math.abs(i - a) === 1;
    const tr = (i > a ? s : S[a]).d.tr || {};
    if (animate && adjacent && tr.morph) morph(a, i, tr.dur || 700);
    else { S.forEach(x => x.el.classList.toggle('on', x === s)); }
    LIVE.enter(s, step, animate);
    if (animate && s.d.tr && s.d.tr.adv != null && i > a) advTimer = setTimeout(() => { if (st.i === i) go(i + 1, 0); }, s.d.tr.adv + (tr.dur || 0));
    after();
  }
  function after() {
    const s = S[st.i];
    const h = `#s=${s.id}&b=${st.step}`;
    if (location.hash !== h) history.replaceState(null, '', h);
    if (window.PRESENTER) PRESENTER.sync();
  }
  function next() {
    const s = S[st.i];
    if (st.step < s.steps) go(st.i, st.step + 1);
    else if (st.i < LAST_MAIN || (s.backup && st.i < S.length - 1)) go(st.i + 1, 0);
  }
  function prev() {
    const s = S[st.i];
    if (st.step > 0) go(st.i, st.step - 1);
    else if (st.i > 0) go(st.i - 1, S[st.i - 1].steps);
  }
  const idx = (id) => S.findIndex(s => s.id === String(id));
  function fromHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    const i = h.get('s') != null ? idx(h.get('s')) : 0;
    return [i < 0 ? 0 : i, +(h.get('b') || 0)];
  }

  // ---------- start ----------
  const [i0, b0] = fromHash();
  st.i = i0; st.step = Math.min(b0, S[i0].steps);
  S.forEach(x => setStep(x, 0, false, 0));
  setStep(S[i0], st.step, false, st.step);
  S[i0].el.classList.add('on');
  addEventListener('hashchange', () => { const [i, b] = fromHash(); if (i !== st.i || b !== st.step) go(i, b, { animate: false }); });

  // digits jump to main slide n (1–12); Home = opening; End = close
  window.DECK = {
    go, next, prev, idx, st, S, fit,
    mainCount: LAST_MAIN + 1,
    mainIndex: (n) => FIRST_MAIN + n - 1, firstMain: FIRST_MAIN, lastMain: LAST_MAIN
  };
  window.__go = (label, step) => { const i = typeof label === 'number' ? label : idx(label); go(i, step || 0, { animate: false }); return { i: st.i, step: st.step }; };
  const imgs = Array.from(document.images);
  Promise.all([document.fonts.ready, ...imgs.map(im => im.decode ? im.decode().catch(() => 0) : 0)]).then(() => {
    window.__ready = true; document.documentElement.dataset.ready = '1';
    LIVE.enter(S[st.i], st.step, !M.STATIC);
    if (!M.STATIC && S[st.i].d.tr && S[st.i].d.tr.adv != null) advTimer = setTimeout(() => { if (st.i === i0) go(i0 + 1, 0); }, S[st.i].d.tr.adv + 400);
  });
})();
