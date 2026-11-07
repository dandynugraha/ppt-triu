/* Tri-U scroll deck engine. No dependencies, no network, works from file://. */
(function () {
  'use strict';
  const D = window.DECK, ART = window.ART;
  const SL = D.slides;                          // index 0 = intro, 1..13 = slides
  const qs = new URLSearchParams(location.search);
  const STATIC = qs.has('static');
  const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('frames');
  const host = document.getElementById('slides');
  const intro = document.getElementById('intro');
  const counter = document.getElementById('counter');
  const black = document.getElementById('black');
  if (STATIC) document.documentElement.classList.add('static');
  window.__ready = false;

  /* ---------- fit 1920x1080 stage to the viewport ---------- */
  let DPR = 1, DPR_CAP = 1.25;
  function fit() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.setProperty('--s', s);
    DPR = Math.min(window.devicePixelRatio || 1, DPR_CAP);       // v6: capped for laptop GPUs
    const w = Math.round(Math.min(1920 * s * DPR, 2400)), h = Math.round(w * 1080 / 1920);
    if (canvas.width !== w) { canvas.width = w; canvas.height = h; if (typeof draw === 'function') draw(); }
  }

  /* ---------- logos: hide missing files, show the institution name instead ---------- */
  document.querySelectorAll('.logo-slot img').forEach(img => {
    const fail = () => { const s = document.createElement('span'); s.className = 'fallback'; s.textContent = img.dataset.fallback; img.replaceWith(s); measureIntro(); };
    if (img.complete && img.naturalWidth === 0) fail(); else img.addEventListener('error', fail, { once: true });
    img.addEventListener('load', measureIntro, { once: true });
  });
  document.getElementById('hdr-event').textContent = D.event;
  document.getElementById('intro-event').textContent = D.event + ' · ' + D.venue;

  /* ---------- v6 art: real-time WebGL (deck/js/art.js) — background scroll + particle forms ---------- */
  const line = document.getElementById('loadline'); if (line) line.classList.add('done');
  let cur = 0;                                         // deck position in stop units (0..10), fractional while travelling
  let clock0 = performance.now(), frozen = STATIC || REDUCED;
  const artOk = ART && ART.init(canvas);
  if (!artOk) stage.classList.add('no-webgl');
  function draw() {
    const t = frozen ? 0 : (performance.now() - clock0) / 1000;
    if (artOk) ART.render(cur, t, DPR);
    if (window.VIZ && typeof idx === 'number' && idx > 0 && els[idx]) VIZ.render(els[idx], t);   // v9 canvas visuals of the current slide
  }
  const stopOf = n => Math.min(n, (ART ? ART.stops : 11) - 1);
  const frameOf = n => stopOf(n);
  const allLoaded = Promise.resolve();
  // one light loop: 60 fps while travelling, 30 fps while a slide only sways
  let lastDraw = 0;
  // automatic laptop fallback: if the GPU cannot hold ~35 fps, step down particles and resolution (twice at most)
  let ema = 16, lastTick = 0, slowFor = 0, quality = 0;
  function loop(now) {
    if (lastTick) { const dt = now - lastTick; ema = ema * .92 + Math.min(dt, 200) * .08;
      if (document.visibilityState === 'visible' && ema > 28 && quality < 2) { if (++slowFor > 90) { quality++; slowFor = 0; ema = 16; ART && ART.setQuality(quality); DPR_CAP = quality === 1 ? 1 : .8; fit(); } }
      else slowFor = 0; }
    lastTick = now;
    if (tween || now - lastDraw > 32) { draw(); lastDraw = now; }
    requestAnimationFrame(loop);
  }

  /* ---------- grain (generated locally, no files) ---------- */
  (function grain() {
    const g = document.createElement('canvas'); g.width = g.height = 192;
    const gx = g.getContext('2d'), d = gx.createImageData(192, 192);
    let s = 1234567;
    for (let i = 0; i < d.data.length; i += 4) { s = (s * 1103515245 + 12345) >>> 0; const v = 96 + (s >>> 24) % 160; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    gx.putImageData(d, 0, 0);
    document.querySelector('.grain').style.backgroundImage = 'url(' + g.toDataURL('image/png') + ')';
  })();

  /* ---------- build slide DOM ---------- */
  const els = SL.map((s, i) => {
    if (i === 0) return null;
    const el = document.createElement('section');
    el.className = 'slide s' + s.n + ' k-' + s.kind + ' fx-' + (s.fx || 'fade') + ' side-' + (s.side || 'l');
    el.setAttribute('aria-label', s.label);
    el.innerHTML = s.html;
    host.appendChild(el);
    return el;
  });

  /* ---------- intro sequence (flow.PNG) ---------- */
  function measureIntro() {
    const ipb = intro.querySelector('.ipb'), box = intro.querySelector('.intro-logos');
    if (!ipb || !box) return;
    const x = (box.offsetWidth - ipb.offsetWidth) / 2 - ipb.offsetLeft;
    intro.style.setProperty('--ipb-x', x + 'px');
  }
  let introTimers = [];
  function playIntro() {
    introTimers.forEach(clearTimeout); introTimers = [];
    intro.classList.remove('gone', 'p1', 'p2');
    measureIntro();
    if (STATIC || REDUCED) { intro.classList.add('p1', 'p2'); return; }
    introTimers.push(setTimeout(() => intro.classList.add('p1'), 250));
    introTimers.push(setTimeout(() => intro.classList.add('p2'), 1700));
  }

  /* ---------- navigation ---------- */
  let idx = -1, tween = null, settleTimer = null;
  const ease = t => 1 - Math.pow(1 - t, 5);                                   // count-ups
  const glide = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // travel: gentle in/out
  function stopSway() {}
  function startSway() {}
  function setCounter(n) {
    const s = SL[n];
    if (n === 0) counter.textContent = '';
    else if (s.kind === 'backup') counter.innerHTML = 'Backup <b>' + String.fromCharCode(64 + n - D.main_count) + '</b>';
    else counter.innerHTML = '<b>' + String(n).padStart(2, '0') + '</b> / ' + String(D.main_count).padStart(2, '0');
  }
  function showContent(n) {
    els.forEach((el, i) => { if (el && i !== n) el.classList.remove('is-on', 'is-in', 'is-out'); });
    if (n === 0) return;
    const el = els[n];
    el.classList.remove('is-out'); el.classList.add('is-on');
    if (STATIC) { el.classList.add('is-in'); return; }
    void el.offsetWidth; el.classList.add('is-in');
    if (!REDUCED) countUp(el);
  }
  /* v4: numerals count to their real value after the slide settles (static/PDF show the real value only) */
  function countUp(el) {
    el.querySelectorAll('[data-count]').forEach((node, j) => {
      const to = node.dataset.count, toN = parseFloat(to);
      const fromN = node.dataset.from !== undefined ? parseFloat(node.dataset.from) : 0;
      if (!isFinite(toN) || toN === fromN) { node.textContent = to; return; }
      const dec = (to.split('.')[1] || '').length, t0 = performance.now() + 250 + j * 110, dur = 1100;
      node.textContent = fromN.toFixed(dec);
      const tick = now => {
        if (!el.classList.contains('is-in')) { node.textContent = to; return; }
        const p = Math.max(0, Math.min(1, (now - t0) / dur));
        node.textContent = p >= 1 ? to : (fromN + (toN - fromN) * ease(p)).toFixed(dec);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
  function hideContent(n) {
    const el = els[n]; if (!el) return;
    el.classList.add('is-out');
    setTimeout(() => { if (idx !== n) el.classList.remove('is-on', 'is-in', 'is-out'); }, 120);
  }
  function go(n, opts) {
    n = Math.max(0, Math.min(SL.length - 1, n | 0));
    if (n === idx && !(opts && opts.force)) return;
    const prev = idx; idx = n;
    if (prev > 0) hideContent(prev);
    clearTimeout(settleTimer);
    if (tween) { cancelAnimationFrame(tween.raf); tween = null; }
    stopSway();
    // intro cover + header
    stage.classList.toggle('is-intro', n === 0);
    if (n === 0) playIntro(); else { intro.classList.add('gone'); introTimers.forEach(clearTimeout); }
    setCounter(n);
    if (location.hash !== '#' + n) history.replaceState(null, '', '#' + n);
    stage.classList.toggle('side-r', !!(ART && ART.sides[stopOf(n)] === 1));
    stage.classList.toggle('side-c', !!(ART && ART.sides[stopOf(n)] === 2));
    const target = frameOf(n), from = cur, delta = Math.abs(target - from);
    if (STATIC || REDUCED || delta < 0.001 || prev === -1) {
      cur = target; draw();
      showContent(n); presenterUpdate();
      return;
    }
    // travel: ~2.1 s per slide, capped for long jumps; background scrolls with it (next = up, back = down)
    const dur = Math.max(1700, Math.min(3600, 1200 + 900 * delta));
    const t0 = performance.now();
    let shown = false;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      cur = from + (target - from) * glide(p);
      if (!shown && p >= .82) { shown = true; showContent(n); }
      if (p < 1) tween.raf = requestAnimationFrame(step);
      else { tween = null; cur = target; if (!shown) showContent(n); }
    };
    tween = { raf: requestAnimationFrame(step) };
    presenterUpdate();
  }
  const next = () => go(idx + 1), prev = () => go(idx - 1);

  /* ---------- input ---------- */
  let digits = '', digitTimer = null;
  function commitDigits() { if (digits) { go(parseInt(digits, 10)); digits = ''; } }
  function onKey(e) {
    const a = document.activeElement;
    if (a && a !== document.body && /^(A|BUTTON|INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
    const k = e.key;
    if (/^[0-9]$/.test(k)) { digits += k; clearTimeout(digitTimer); digitTimer = setTimeout(commitDigits, 900); e.preventDefault(); return; }
    if (black.classList.contains('on') && !['b', 'B', '.'].includes(k)) { black.classList.remove('on'); presenterUpdate(); }
    switch (k) {
      case 'Enter': if (digits) { clearTimeout(digitTimer); commitDigits(); } else next(); break;
      case ' ': case 'ArrowRight': case 'ArrowDown': case 'PageDown': next(); break;
      case 'Backspace': case 'ArrowLeft': case 'ArrowUp': case 'PageUp': prev(); break;
      case 'Home': go(0); break;
      case 'End': go(D.main_count); break;
      case 'f': case 'F': case 'F5': toggleFs(); break;
      case 'b': case 'B': case '.': black.classList.toggle('on'); presenterUpdate(); break;
      case 'n': case 'N': openPresenter(); break;
      default: return;
    }
    e.preventDefault();
  }
  addEventListener('keydown', onKey);
  function toggleFs() {
    const d = document;
    if (!d.fullscreenElement) (d.documentElement.requestFullscreen || function () {}).call(d.documentElement);
    else d.exitFullscreen();
  }
  // wheel / trackpad: one slide per gesture
  let wheelAcc = 0, wheelLock = 0;
  addEventListener('wheel', e => {
    e.preventDefault();
    const now = performance.now();
    if (now < wheelLock) return;
    wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) > 40) { (wheelAcc > 0 ? next : prev)(); wheelAcc = 0; wheelLock = now + 750; }
  }, { passive: false });
  // touch / click: right 2/3 next, left 1/3 previous
  stage.addEventListener('pointerup', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (black.classList.contains('on')) { black.classList.remove('on'); return; }
    (e.clientX > innerWidth / 3 ? next : prev)();
  });
  addEventListener('hashchange', () => { const n = parseInt(location.hash.slice(1), 10); if (!isNaN(n)) go(n); });
  addEventListener('resize', fit);

  /* ---------- presenter window (N) ---------- */
  let pw = null, tStart = null, tSlide = performance.now(), lastIdx = -1;
  const fmt = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function openPresenter() {
    if (pw && !pw.closed) { pw.focus(); return; }
    pw = window.open('', 'triu-presenter', 'width=1100,height=760');
    if (!pw) return;
    const d = pw.document;
    d.open();
    d.write('<!doctype html><html><head><meta charset="utf-8"><title>Presenter · Tri-U</title></head><body></body></html>');
    d.close();
    const css = d.createElement('style');
    css.textContent = `
      *{box-sizing:border-box;margin:0;padding:0} body{font-family:'Schibsted Grotesk',system-ui,sans-serif;background:#1C202B;color:#F8F9FB;padding:28px 32px;display:grid;grid-template-rows:auto auto 1fr auto;gap:18px;height:100vh}
      .top{display:flex;gap:28px;align-items:baseline;flex-wrap:wrap} .now{font-size:30px;font-weight:600;letter-spacing:-.01em;flex:1;min-width:300px}
      .k{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#9AA0BC;display:block;margin-bottom:4px}
      .clock{font-variant-numeric:tabular-nums;font-size:34px;font-weight:600} .clock.over{color:#F099C2} .clock small{font-size:18px;color:#9AA0BC;font-weight:500}
      .dir{font-size:17px;color:#C5CCE0;line-height:1.45;border-left:3px solid #3D3CD3;padding-left:14px}
      .notes{overflow:auto;font-size:22px;line-height:1.55;color:#F8F9FB;padding-right:12px} .notes p{margin-bottom:12px} .notes .id{color:#9AA0BC;font-size:17px;margin-top:-6px}
      .bridge{background:#D9FA3F;color:#1C202B;border-radius:10px;padding:12px 16px;font-size:20px;font-weight:600}
      .next{font-size:18px;color:#C5CCE0} .next b{color:#F8F9FB} .row{display:flex;gap:24px;align-items:center;justify-content:space-between}
      .state{font-size:14px;color:#F099C2;font-weight:600} button{font:inherit;background:#2E2DB8;color:#fff;border:0;border-radius:999px;padding:8px 16px;cursor:pointer}`;
    d.head.appendChild(css);
    d.body.innerHTML = `<div class="top"><div class="now" id="p-now"></div>
        <div><span class="k">Slide</span><span class="clock" id="p-slide"></span></div>
        <div><span class="k">Total</span><span class="clock" id="p-total"></span></div>
        <div><button id="p-reset">Reset timer</button></div></div>
      <div class="dir" id="p-dir"></div>
      <div class="notes" id="p-notes"></div>
      <div><div class="bridge" id="p-bridge"></div><div class="row" style="margin-top:12px"><div class="next" id="p-next"></div><div class="state" id="p-state"></div></div></div>`;
    d.getElementById('p-reset').onclick = () => { tStart = performance.now(); tSlide = performance.now(); };
    pw.addEventListener('keydown', onKey);
    presenterUpdate();
  }
  function presenterUpdate() {
    if (idx !== lastIdx) { tSlide = performance.now(); lastIdx = idx; if (idx >= 1 && tStart === null) tStart = performance.now(); }
    if (!pw || pw.closed) return;
    const d = pw.document, s = SL[idx], nx = SL[idx + 1];
    const $ = id => d.getElementById(id);
    if (!$('p-now')) return;
    $('p-now').innerHTML = '<span class="k">' + (idx === 0 ? 'Intro' : (s.kind === 'backup' ? 'Backup' : 'Slide ' + idx + ' / ' + D.main_count) + (s.time ? ' · ' + esc(s.time) : '')) + '</span>' + esc(s.label + (idx ? ' — ' + s.title : ''));
    $('p-dir').textContent = s.direction || '';
    $('p-dir').style.display = s.direction ? '' : 'none';
    $('p-notes').innerHTML = s.notes ? '<p>' + esc(s.notes).replace(/(\[[^\]]+\])/g, '<em style="color:#D9FA3F;font-style:normal">$1</em>') + '</p>' + (s.notes_id ? '<p class="id">' + esc(s.notes_id) + '</p>' : '') : '<p>' + esc(s.notes || '') + '</p>';
    $('p-bridge').textContent = s.bridge ? '→ ' + s.bridge : '';
    $('p-bridge').style.display = s.bridge ? '' : 'none';
    $('p-next').innerHTML = nx ? 'Next: <b>' + esc(nx.label) + '</b> — ' + esc(nx.title) : 'End of deck';
    $('p-state').textContent = black.classList.contains('on') ? 'SCREEN BLACK' : '';
  }
  setInterval(() => {
    if (!pw || pw.closed) return;
    const d = pw.document, s = SL[idx]; if (!d.getElementById('p-slide')) return;
    const now = performance.now(), el = (now - tSlide) / 1000;
    const budget = s.budget || (idx > 0 && idx <= D.main_count ? D.slot_s / D.main_count : 0);
    const sc = d.getElementById('p-slide');
    sc.innerHTML = fmt(el) + (budget ? ' <small>/ ' + fmt(budget) + '</small>' : '');
    sc.classList.toggle('over', budget > 0 && el > budget);
    const tc = d.getElementById('p-total'), tot = tStart ? (now - tStart) / 1000 : 0;
    tc.innerHTML = fmt(tot) + ' <small>/ ' + fmt(D.slot_s) + '</small>';
    tc.classList.toggle('over', tot > D.slot_s);
  }, 250);
  addEventListener('beforeunload', () => { if (pw && !pw.closed) pw.close(); });

  /* ---------- automation hooks ---------- */
  window.__go = async function (n) {
    window.__ready = false;
    go(n, { force: true });
    await document.fonts.ready;
    if (tween) { cancelAnimationFrame(tween.raf); tween = null; }
    cur = frameOf(n); draw();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    window.__ready = true;
    return idx;
  };
  window.__state = () => ({ idx, pos: cur, frame: cur, target: frameOf(idx), tweening: !!tween, inHold: !tween && Math.abs(cur - frameOf(idx)) < 1e-6, webgl: !!artOk, viz: !!window.VIZ, quality });

  /* ---------- start ---------- */
  fit();
  if (!STATIC) requestAnimationFrame(loop);
  const h = parseInt(location.hash.slice(1), 10);
  go(isNaN(h) ? 0 : h);
  document.fonts.ready.then(() => { draw(); if (!STATIC) window.__ready = true; });
})();
