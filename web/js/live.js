/* Living layer — gentle motion that carries meaning, on top of the PPTX layout. Only the current slide runs.
   Uses the CSS `translate`/`scale` properties so it composes with Morph (which animates `transform`).
   1   title: the four real MRI sequences (T1, T1-Gd, T2, FLAIR of the same patient) scrub through slices together.
   2   the 15 counts up on entry.
   3a  red blood cells flow along the vessel; on click 1 VEGF leaves the tumour and drifts toward the vessel.
   3b  VEGF and the red blood cell drift; the blocked arrow's X pulses once per click.
   6a/6b  the crystal-structure render breathes very slowly (2 %).
   P pauses; ?static and reduced motion show still frames. */
(function () {
  const PX = 144;
  let cur = null, t0 = 0, raf = 0, paused = false, last = 0, tAcc = 0;
  const q = (s, name) => s.el.querySelector(`[data-name="!!${name}"]`);
  const qa = (s, re) => Array.from(s.el.children).filter(e => re.test(e.dataset.name || ''));
  const model = (s, name) => s.d.shapes.find(x => x.name === '!!' + name);

  const FX = {
    '1': {
      enter(s) {
        const M0 = window.MRI_SCRUB; if (!M0) return;
        this.tiles = ['t1', 't1Gd', 't2', 'flair'].map(k => ({ k, img: q(s, 'title_mri_' + k)?.querySelector('img') })).filter(t => t.img);
        this.tiles.forEach(t => { t.orig = t.orig || t.img.src; });
      },
      frame(s, t) {
        const M0 = window.MRI_SCRUB; if (!M0 || !this.tiles) return;
        // 9 s loop: hold real figure 3 s → scrub down 12 slices and back (≤ 3 changes/s) → hold
        const P = 9, u = t % P, n = M0.z.length;               // z[0] = figure slice
        let k = 0;
        if (u > 3 && u < 7.4) { const v = (u - 3) / 4.4; k = Math.round((v < 0.5 ? v * 2 : (1 - v) * 2) * (n - 1)); }
        if (k === this.k) return; this.k = k;
        for (const tl of this.tiles) tl.img.src = k === 0 ? tl.orig : `img/mri/scrub/${tl.k}_z${String(M0.z[k]).padStart(3, '0')}.png`;
      },
      leave() { if (this.tiles) this.tiles.forEach(t => { t.img.src = t.orig; }); this.k = 0; }
    },
    '2': {
      enter(s, step, animate) {
        const e = q(s, 'stat_num')?.querySelector('span'); if (!e || !animate) return;
        const T = performance.now();
        const f = (now) => { const u = Math.min(1, (now - T) / 700); e.textContent = String(Math.round(15 * (1 - Math.pow(1 - u, 3)))); if (u < 1 && cur === s) requestAnimationFrame(f); else e.textContent = '15'; };
        e.textContent = '0'; requestAnimationFrame(f);
      }
    },
    '3a': {
      enter(s) {
        const lum = model(s, 'ves_lumen');
        this.L = lum.x; this.R = lum.x + lum.w;
        this.rbc = qa(s, /^!!rbc\d$/).map(el => { const id = el.dataset.name.slice(2); return { el, c: q(s, id + '_c'), x: model(s, id).x }; });
        this.vegf = [];
        for (let k = 0; k < 25; k++) {
          const a = q(s, `vegf${String(k).padStart(2, '0')}a`), b = q(s, `vegf${String(k).padStart(2, '0')}b`);
          if (a && b) { const m = model(s, `vegf${String(k).padStart(2, '0')}a`); this.vegf.push({ a, b, x: m.x, y: m.y, ph: k * 1.37 }); }
        }
        const tum = model(s, 'mech_tumour'); this.tum = { x: tum.x + tum.w * 0.75, y: tum.y + tum.h * 0.45 };
        this.emit = -1;
      },
      step(s, step, forward) { if (step === 1 && forward) this.emit = tAcc; if (step < 1) this.emit = -1; },
      frame(s, t) {
        const span = this.R - this.L;
        for (const r of this.rbc) {
          const dx = ((r.x - this.L + 46 * t) % span + span) % span + this.L - r.x;
          const x = r.x + dx, edge = Math.min(x - this.L, this.R - x - 70);
          const op = Math.max(0, Math.min(1, edge / 60));
          for (const e of [r.el, r.c]) if (e) { e.style.translate = `${dx}px 0`; e.style.opacity = op; }
        }
        // VEGF: emitted from the tumour on click 1 (≤ 110 px/s), then a slow drift
        const te = this.emit >= 0 ? t - this.emit : 99;
        this.vegf.forEach((v, k) => {
          const delay = k * 0.045, u = Math.max(0, Math.min(1, (te - delay) / 1.6));
          const e = 1 - Math.pow(1 - u, 3);
          const ox = (this.tum.x - v.x) * (1 - e), oy = (this.tum.y - v.y) * (1 - e);
          const dx = 7 * Math.sin(t * 0.7 + v.ph), dy = 6 * Math.sin(t * 0.53 + v.ph * 1.7);
          const tr = `${ox + dx}px ${oy + dy}px`;
          v.a.style.translate = tr; v.b.style.translate = tr;
        });
      },
      leave(s) { for (const e of s.el.querySelectorAll('.shp')) { e.style.translate = ''; } if (this.rbc) this.rbc.forEach(r => { r.el.style.opacity = ''; if (r.c) r.c.style.opacity = ''; }); }
    },
    '3b': {
      enter(s) {
        this.v = [q(s, 'vegf21a'), q(s, 'vegf21b')].filter(Boolean);
        this.r = [q(s, 'rbc4'), q(s, 'rbc4_c')].filter(Boolean);
        this.blk = q(s, 'blk');
      },
      step(s, step, forward) { if (step === 1 && forward && this.blk) M.anim(this.blk, [{ scale: '1' }, { scale: '1.25' }, { scale: '1' }], { duration: 600, delay: 350, fill: 'none' }); },
      frame(s, t) {
        const tr = `${8 * Math.sin(t * 0.8)}px ${7 * Math.sin(t * 0.6 + 1)}px`;
        this.v.forEach(e => { e.style.translate = tr; });
        const rx = 30 * Math.sin(t * 0.35);
        this.r.forEach(e => { e.style.translate = `${rx}px 0`; });
      },
      leave(s) { for (const e of s.el.querySelectorAll('.shp')) e.style.translate = ''; }
    },
    '6a': {
      enter(s) { this.img = q(s, 'protein')?.querySelector('img'); },
      frame(s, t) { if (this.img) this.img.style.scale = String(1 + 0.012 * (1 - Math.cos(t * 2 * Math.PI / 14))); },
      leave() { if (this.img) this.img.style.scale = ''; }
    }
  };
  FX['6b'] = Object.assign({}, FX['6a']);

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    if (!cur || paused || M.STATIC) return;
    tAcc += dt;
    const f = FX[cur.id]; if (f && f.frame) f.frame(cur, tAcc);
  }
  raf = requestAnimationFrame(loop);

  window.LIVE = {
    enter(s, step, animate) { cur = s; tAcc = 0; const f = FX[s.id]; if (f && f.enter) f.enter(s, step, animate); if (f && f.step) f.step(s, step, false); if (f && f.frame) f.frame(s, M.STATIC ? 0 : 0); },
    leave(s) { const f = FX[s.id]; if (f && f.leave) f.leave(s); if (cur === s) cur = null; },
    step(s, step, forward) { const f = FX[s.id]; if (cur === s && f && f.step) f.step(s, step, forward); },
    pause(p) { paused = p == null ? !paused : p; return paused; },
    FX, now: () => tAcc,
    get paused() { return paused; }
  };
})();
