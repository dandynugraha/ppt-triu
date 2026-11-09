/* Input — PRD §7. Keyboard, presentation clickers (PageDown/PageUp, F5, Esc, '.', 'B'), mouse (left = next,
   right = previous, wheel one step per gesture, middle = pause), air-mouse laser, touch, presenter window.
   Every navigation first finishes running animations (deck.go → M.finishAll), so input is never blocked.
   Note: 'B' is black screen (clicker convention) and 'C' toggles captions, so backups use Shift+A … Shift+D. */
(function () {
  const stage = document.getElementById('stage');
  const blank = document.getElementById('blank'), laser = document.getElementById('laser'), spot = document.getElementById('spot');
  const D = window.DECK;
  let last = { t: 0, kind: '' };
  const DEBOUNCE = 80;
  function nav(kind, fn) {
    const now = performance.now();
    if (now - last.t < DEBOUNCE && last.kind !== kind) return;   // click + key from the same clicker action
    last = { t: now, kind };
    if (blank.className) { blank.className = ''; return; }        // first input after blanking just unblanks
    fn();
  }
  const formFocus = () => { const a = document.activeElement; return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName); };

  // ---------- digits jump ----------
  let digits = '', digitTimer = null;
  function digit(d) {
    digits += d; clearTimeout(digitTimer);
    digitTimer = setTimeout(() => { const n = +digits; digits = ''; if (n >= 1 && n <= 12) D.go(D.mainIndex(n), 0); }, 600);
  }

  function toggleFS() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {});
  }
  function setBlank(c) { blank.className = blank.className === c ? '' : c; }
  function pause() { const p = LIVE.pause(); stage.dataset.paused = p ? '1' : ''; if (window.PRESENTER) PRESENTER.sync(); }
  function captions() { /* no captions in the PPTX design */ }
  let laserOn = false;
  function toggleLaser(v) { laserOn = v == null ? !laserOn : v; stage.classList.toggle('laser-on', laserOn); laser.style.opacity = 0; }

  function key(e) {
    if (formFocus()) return;
    const k = e.key;
    const handled = () => { e.preventDefault(); e.stopPropagation(); };
    if (['Enter', ' ', 'ArrowRight', 'ArrowDown', 'PageDown'].includes(k)) { handled(); return nav('key', D.next); }
    if (['Backspace', 'ArrowLeft', 'ArrowUp', 'PageUp'].includes(k)) { handled(); return nav('key', D.prev); }
    if (k === 'Home') { handled(); return D.go(e.shiftKey ? 0 : D.firstMain, 0); }
    if (k === 'End') { handled(); return D.go(D.lastMain, 0); }
    if (/^[0-9]$/.test(k)) { handled(); return digit(k); }
    if (k === 'F5' || ((k === 'f' || k === 'F') && !e.ctrlKey && !e.metaKey && !e.shiftKey)) { handled(); return toggleFS(); }
    if (e.shiftKey && /^[ABCD]$/.test(k)) { handled(); return D.go(D.idx(k), 0); }
    if (k === 'Escape') { if (blank.className) blank.className = ''; if (laserOn) toggleLaser(false); return; }
    const lk = k.toLowerCase();
    if (k === '.' || lk === 'b') { handled(); return setBlank('black'); }
    if (lk === 'w') { handled(); return setBlank('white'); }
    if (lk === 'p') { handled(); return pause(); }
    if (lk === 'c') { handled(); return captions(); }
    if (lk === 'n') { handled(); return PRESENTER.open(); }
    if (lk === 'l') { handled(); return toggleLaser(); }
    if (lk === 's') { handled(); const u = new URL(location.href); if (u.searchParams.get('mode') === 'scroll') u.searchParams.delete('mode'); else u.searchParams.set('mode', 'scroll'); location.href = u.toString(); }
  }
  addEventListener('keydown', key, true);

  // ---------- mouse / laser ----------
  const toStage = (e) => { const r = stage.getBoundingClientRect(), k = r.width / 1920; return [(e.clientX - r.left) / k, (e.clientY - r.top) / k]; };
  let down = null, idleTimer = null, spotOn = false;
  function moveLaser(e) {
    if (!laserOn) return;
    const [x, y] = toStage(e);
    laser.style.left = x + 'px'; laser.style.top = y + 'px'; laser.style.opacity = 1;
    clearTimeout(idleTimer); idleTimer = setTimeout(() => { laser.style.opacity = 0; }, 1500);
    if (spotOn) drawSpot(x, y);
  }
  function drawSpot(x, y) {
    const R = 120;
    spot.innerHTML = `<svg width="1920" height="1080"><path fill="#FFFFFF" fill-opacity="0.65" fill-rule="evenodd" d="M0 0H1920V1080H0Z M${x - R} ${y}a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0 ${-2 * R} 0Z"/><circle cx="${x}" cy="${y}" r="${R}" fill="none" stroke="#D55E00" stroke-width="2"/></svg>`;
    spot.style.opacity = 1;
  }
  addEventListener('pointermove', moveLaser);
  addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    if (e.button === 1) { e.preventDefault(); pause(); return; }
    if (e.button !== 0) return;
    down = { t: performance.now(), timer: setTimeout(() => { if (down) { spotOn = true; const [x, y] = toStage(e); drawSpot(x, y); } }, 300) };
  });
  addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch' || e.button !== 0 || !down) return;
    clearTimeout(down.timer);
    const held = performance.now() - down.t; down = null;
    if (spotOn) { spotOn = false; spot.style.opacity = 0; return; }   // long-press = spotlight, no advance
    if (held < 300) nav('click', D.next);
  });
  addEventListener('contextmenu', (e) => { e.preventDefault(); nav('click', D.prev); });
  addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault(); });
  // wheel: one step per gesture (|Δ| > 50, 350 ms lock)
  let wheelLock = 0, acc = 0;
  addEventListener('wheel', (e) => {
    if (document.documentElement.classList.contains('scroll')) return;
    e.preventDefault();
    const now = performance.now();
    if (now < wheelLock) { wheelLock = now + 350; return; }
    acc += e.deltaY;
    if (Math.abs(acc) > 50) { const d = acc; acc = 0; wheelLock = now + 350; nav('wheel', d > 0 ? D.next : D.prev); }
  }, { passive: false });

  // ---------- touch ----------
  let touch = null;
  addEventListener('touchstart', (e) => { touch = { n: e.touches.length, t: performance.now(), x: e.touches[0].clientX }; }, { passive: true });
  addEventListener('touchend', (e) => {
    if (!touch || document.documentElement.classList.contains('scroll')) return;
    const dt = performance.now() - touch.t;
    if (touch.n >= 2 && dt < 400) { pause(); touch = null; return; }
    if (touch.n === 1 && dt < 400) { e.preventDefault(); nav('touch', touch.x > innerWidth / 3 ? D.next : D.prev); }
    touch = null;
  });

  // ---------- presenter window ----------
  const P = {
    w: null, t0: null, ts: performance.now(), lastId: null,
    open() {
      if (this.w && !this.w.closed) { this.w.focus(); return; }
      const w = window.open('', 'triu-presenter', 'width=1280,height=820');
      if (!w) return;
      this.w = w; this.t0 = this.t0 || performance.now();
      w.document.open();
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Presenter · Tri-U 2026</title>

<style>body{margin:0;font-family:Arial,sans-serif;color:#111827;background:#fff;font-size:22px}
.g{display:grid;grid-template-columns:1fr 360px;gap:0;height:100vh}.l{padding:24px 32px;overflow:auto;border-right:1px solid #D1D5DB}
.r{padding:24px;display:flex;flex-direction:column;gap:14px}h1{font-size:30px;margin:0 0 6px;font-weight:600}.m{color:#6B7280;font-size:22px}
.n{white-space:pre-wrap;line-height:1.45;margin-top:18px;font-size:22px}.n b{color:#D55E00;font-weight:700}.n i{color:#6B7280}
.t{font-size:44px;font-weight:600;font-variant-numeric:tabular-nums}.btns{display:grid;grid-template-columns:1fr 1fr;gap:10px}
button{font:inherit;font-size:24px;padding:18px 0;border:2px solid #111827;background:#fff;color:#111827;border-radius:2px;cursor:pointer}
button.big{background:#111827;color:#fff}.nx{border-top:1px solid #D1D5DB;padding-top:12px;color:#6B7280}</style></head>
<body><div class="g"><div class="l"><div class="m" id="pos"></div><h1 id="ti"></h1><div class="n" id="no"></div></div>
<div class="r"><div class="m">Slide</div><div class="t" id="ts"></div><div class="m">Total <span id="plan"></span></div><div class="t" id="tt"></div>
<div class="nx"><div class="m">Next</div><div id="nx"></div></div>
<div class="btns"><button id="bp">Prev</button><button class="big" id="bn">Next</button><button id="bz">Pause motion</button><button id="bb">Black</button></div></div></div></body></html>`);
      w.document.close();
      const $ = (id) => w.document.getElementById(id);
      $('bn').onclick = () => D.next(); $('bp').onclick = () => D.prev(); $('bz').onclick = () => pause(); $('bb').onclick = () => setBlank('black');
      w.addEventListener('keydown', key, true);
      w.addEventListener('contextmenu', (e) => { e.preventDefault(); D.prev(); });
      this.sync();
      clearInterval(this.iv); this.iv = setInterval(() => this.tick(), 500);
    },
    plain(h) { const d = document.createElement('div'); d.innerHTML = h || ''; return d.textContent; },
    sync() {
      const s = D.S[D.st.i];
      if (s.id !== this.lastId) { this.ts = performance.now(); this.lastId = s.id; }
      if (!this.w || this.w.closed) return;
      const $ = (id) => this.w.document.getElementById(id);
      const nxt = D.st.step < s.steps ? `Build ${D.st.step + 1} of ${s.steps} on this slide` : (D.S[D.st.i + 1] ? this.plain(D.S[D.st.i + 1].title) : '—');
      $('pos').textContent = `${s.backup ? 'Backup ' + s.id : s.opening ? 'Opening' : 'Slide ' + s.id} · step ${D.st.step} / ${s.steps}${stage.dataset.paused ? ' · scenes paused' : ''}`;
      $('ti').textContent = this.plain(s.title);
      const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      let k = 0;
      $('no').innerHTML = esc(s.notes || '').replace(/\[(click[^\]]*)\]/g, (m, c) => `<br><b>[${c}${c === 'click' ? ' ' + (++k) : ''}]</b>`).replace(/\[(pause|optional[^\]]*)\]/g, '<i>[$1]</i>');
      $('nx').textContent = nxt;
      $('plan').textContent = s.time ? `(script ${s.time})` : '';
      this.tick();
    },
    tick() {
      if (!this.w || this.w.closed) { clearInterval(this.iv); return; }
      const f = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
      this.w.document.getElementById('ts').textContent = f(performance.now() - this.ts);
      this.w.document.getElementById('tt').textContent = f(performance.now() - (this.t0 || performance.now()));
    }
  };
  window.PRESENTER = P;
  window.INPUT = { toggleLaser, pause, setBlank, captions };
})();
