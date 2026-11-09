/* Explanatory animation for slides 3 / 12 (3a, mechanism) and 4 / 12 (3b, drugs), web only.
   Each click of the speaking script gets one scene a non-specialist can read without the speaker:

   3a  step 0  "A tumour grows faster than its own blood supply" — the tumour slowly grows; blood flows past it.
       step 1  "It releases a signal, VEGF" — VEGF streams out of the tumour toward the vessel.
       step 2  "…lands on a receiver, VEGFR-2" — each VEGF docks in a Y-shaped receptor, the receptor's engine
               lights up and a pulse runs into the vessel wall.
       step 3  "New vessels grow into the tumour" — the new branch carries red blood cells up to the tumour.
   3b  step 0  normal: VEGF docks → engine lights up → "Signal ON".
       step 1  bevacizumab lunges, catches VEGF before it reaches the receptor → "Signal OFF".
       step 2  kinase inhibitor sits in the engine: VEGF docks but nothing lights → "Signal OFF";
               then the two drugs alternate ("Either way…").
   Same colours and shapes as the PPTX (Okabe–Ito, ink outlines), no glow. ?static shows the PPTX still frames. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const sv = (tag, a, p) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const q = (s, n) => s.el.querySelector(`[data-name="!!${n}"]`);
  const model = (s, n) => s.d.shapes.find(x => x.name === '!!' + n);
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  const lerp = (a, b, u) => a + (b - a) * u;
  const C = { vegf: '#E69F00', ink: '#111827', high: '#0072B2', light: '#56B4E9', grey: '#6B7280', rbc: '#D9483B', rbcLn: '#A93226', rbcC: '#E8A39A' };

  function overlay(s, beforeName) {
    const svg = sv('svg', { width: 1920, height: 1080, class: 'story' });
    Object.assign(svg.style, { position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' });
    const ref = beforeName && q(s, beforeName);
    ref ? s.el.insertBefore(svg, ref) : s.el.appendChild(svg);
    return svg;
  }
  function dimer(p, r) {
    const g = sv('g', {}, p);
    for (const dx of [-0.85 * r, 0.85 * r]) sv('circle', { cx: dx, cy: 0, r, fill: C.vegf, stroke: C.ink, 'stroke-width': r > 15 ? 1.5 : 1 }, g);
    return g;
  }
  function march(el) {
    const p = el && el.querySelector('path'); if (!p) return;
    const d = (p.getAttribute('stroke-dasharray') || '8 6').split(/[ ,]+/).map(Number);
    p.style.setProperty('--dl', -(d[0] + d[1]) * 2 + 'px'); p.classList.add('march');
  }
  function clearOverlay(o) { if (!o) return; o.style.transition = 'opacity 300ms'; o.style.opacity = 0; setTimeout(() => o.remove(), 350); }

  // ------------------------------------------------------------------ 3a
  const A3 = {
    enter(s, step) {
      this.k = step; this.t0 = LIVE.now();
      if (M.STATIC) return;
      // the stream replaces the PPTX's scattered (static) VEGF dots
      s.el.querySelectorAll('[data-name^="!!vegf"]').forEach(e => { if (!/vegf_flow/.test(e.dataset.name)) e.classList.add('live-off'); });
      march(q(s, 'vegf_flow'));
      this.ov = overlay(s, 'vegf_flow');
      const lum = model(s, 'ves_lumen'); this.L = lum.x; this.R = model(s, 'mech_lbl_vessel').x - 10;
      this.rbc = [0, 1, 2, 3, 4, 5, 6].map(i => ({ el: q(s, 'rbc' + i), c: q(s, `rbc${i}_c`), x: model(s, 'rbc' + i).x }));
      this.tum = q(s, 'mech_tumour');
      this.sprRbc = [0, 1, 2].map(i => q(s, 'spr_rbc' + i)).filter(Boolean);
      // receptors (x of the stalk, top of the Y, engine box)
      this.rec = [0, 1, 2, 3, 4].map(i => {
        const k = model(s, `rec${i}_kin`), st = model(s, `rec${i}_stalk`);
        const g = sv('g', {}, this.ov);
        const lit = sv('rect', { x: k.x - 2, y: k.y - 2, width: k.w + 4, height: k.h + 4, rx: 8, fill: C.light, stroke: C.ink, 'stroke-width': 1, opacity: 0 }, g);
        const ring = sv('rect', { x: k.x, y: k.y, width: k.w, height: k.h, rx: 7, fill: 'none', stroke: C.high, 'stroke-width': 3, opacity: 0 }, g);
        const dot = sv('circle', { cx: st.x, cy: k.y + k.h, r: 5, fill: C.high, opacity: 0 }, g);
        const wave = sv('ellipse', { cx: st.x, cy: k.y + k.h / 2, rx: 10, ry: 6, fill: 'none', stroke: C.high, 'stroke-width': 3, opacity: 0 }, g);
        return { x: st.x, top: st.y - 28, k, lit, ring, dot, wave };
      });
      // VEGF stream: 16 dimers, each with its own path from the tumour edge to one receptor
      const tm = model(s, 'mech_tumour');
      this.parts = Array.from({ length: 16 }, (_, n) => {
        const g = dimer(this.ov, 9.35); g.setAttribute('opacity', 0);
        const sx = tm.x + tm.w - 18 - (n % 3) * 14, sy = tm.y + 40 + ((n * 53) % (tm.h - 70));
        const ri = n % 3, tx = this.rec[ri].x, ty = this.rec[ri].top - 6;
        const cx = lerp(sx, tx, 0.45), cy = Math.min(sy, ty) - 40 - (n % 4) * 25;
        const len = Math.hypot(tx - sx, ty - sy) * 1.12;
        const travel = len / 260, dock = 0.9, P = travel + dock + 0.5 + (n % 3) * 0.35;
        return { g, sx, sy, tx, ty, cx, cy, ri, travel, dock, P, ph: (n * 0.61) % P };
      });
    },
    step(s, step) { this.k = step; this.t0 = LIVE.now(); },
    frame(s, t) {
      if (!this.ov) return;
      const step = this.k, ts = t - this.t0;
      // blood flow in the vessel (always)
      const span = this.R - this.L;
      for (const r of this.rbc) {
        const dx = ((r.x - this.L + 46 * t) % span + span) % span + this.L - r.x, x = r.x + dx;
        const op = clamp(Math.min(x - this.L, this.R - x - 70) / 60);
        for (const e of [r.el, r.c]) if (e) { e.style.translate = `${dx}px 0`; e.style.opacity = op; }
      }
      // tumour keeps growing (gentle)
      if (this.tum) this.tum.style.scale = String(1 + 0.025 * (0.5 - 0.5 * Math.cos(t * 2 * Math.PI / 3.2)));
      // receptor activity
      const act = [0, 0, 0, 0, 0], phase = [0, 0, 0, 0, 0];
      // VEGF stream from step 1; docking + activation from step 2
      const fadeIn = clamp(ts / 0.6);
      for (const p of this.parts) {
        if (step < 1) { p.g.setAttribute('opacity', 0); continue; }
        const u = ((t + p.ph) % p.P);
        let x, y, op = 1;
        if (u < p.travel) {
          const v = ease(u / p.travel), w = 1 - v;
          x = w * w * p.sx + 2 * w * v * p.cx + v * v * p.tx; y = w * w * p.sy + 2 * w * v * p.cy + v * v * p.ty;
          op = clamp(u / 0.25);
          if (step < 2) op *= clamp((p.travel - u) / 0.5);              // step 1: fades as it reaches the vessel
        } else if (step >= 2 && u < p.travel + p.dock) {                  // docked in the Y
          x = p.tx; y = p.ty;
          const d = (u - p.travel) / p.dock;
          act[p.ri] = Math.max(act[p.ri], Math.sin(Math.PI * Math.min(1, d * 1.2)));
          phase[p.ri] = Math.max(phase[p.ri], d);
        } else { x = p.tx; y = p.ty; op = step >= 2 ? clamp(1 - (u - p.travel - p.dock) / 0.3) : 0; }
        p.g.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
        p.g.setAttribute('opacity', (op * fadeIn).toFixed(3));
      }
      this.rec.forEach((r, i) => {
        const a = step >= 2 ? act[i] : 0, ph = phase[i];
        r.lit.setAttribute('opacity', (0.9 * a).toFixed(3));
        r.ring.setAttribute('opacity', (a * (1 - ph)).toFixed(3));
        const sc = 1 + 1.2 * ph;
        r.ring.setAttribute('transform', `translate(${r.k.x + r.k.w / 2},${r.k.y + r.k.h / 2}) scale(${sc}) translate(${-r.k.x - r.k.w / 2},${-r.k.y - r.k.h / 2})`);
        r.dot.setAttribute('opacity', (a > 0.05 ? 1 - ph : 0).toFixed(3));
        r.dot.setAttribute('cy', (r.k.y + r.k.h + 4 + 55 * ph).toFixed(1));
        r.wave.setAttribute('opacity', (a > 0.05 ? 0.9 * (1 - ph) : 0).toFixed(3));
        r.wave.setAttribute('rx', (12 + 95 * ph).toFixed(1)); r.wave.setAttribute('ry', (8 + 16 * ph).toFixed(1));
      });
      // new vessel carries blood up to the tumour
      this.sprRbc.forEach((e, i) => {
        if (step < 3) { e.style.translate = ''; e.style.opacity = ''; return; }
        const y0 = [664, 599, 541][i], span2 = 190, off = ((t * 55 + i * span2 / 3) % span2);
        const y = 700 - off;
        e.style.translate = `0 ${(y - y0).toFixed(1)}px`;
        e.style.opacity = clamp(Math.min(off / 30, (span2 - off) / 30));
      });
    },
    leave(s) {
      clearOverlay(this.ov); this.ov = null;
      for (const e of s.el.querySelectorAll('.shp')) { e.style.translate = ''; e.style.scale = ''; }
      (this.rbc || []).forEach(r => { r.el.style.opacity = ''; if (r.c) r.c.style.opacity = ''; });
      this.sprRbc && this.sprRbc.forEach(e => { e.style.opacity = ''; });
    }
  };

  // ------------------------------------------------------------------ 3b
  const B3 = {
    enter(s, step) {
      this.k = step; this.t0 = LIVE.now();
      if (M.STATIC) return;
      this.ov = overlay(s, 'mech_lbl_vegfr');
      this.V = [q(s, 'vegf21a'), q(s, 'vegf21b')].filter(Boolean);
      const va = model(s, 'vegf21a');
      const vb = model(s, 'vegf21b') || va;
      this.vc = { x: (va.x + vb.x + va.w) / 2, y: va.y + va.h / 2 };
      this.vr = va.w / 2;
      this.ab = q(s, 'ab'); this.X = [q(s, 'blk_x1'), q(s, 'blk_x2')].filter(Boolean);
      this.inh = q(s, 'inh_marker'); this.rbc = [q(s, 'rbc4'), q(s, 'rbc4_c')].filter(Boolean);
      march(q(s, 'blk_arrow'));
      const mkRec = (i) => {
        const k = model(s, `rec${i}_kin`), st = model(s, `rec${i}_stalk`), arm = model(s, `rec${i}_armL`);
        const lit = sv('rect', { x: k.x, y: k.y, width: k.w, height: k.h, rx: 17, fill: C.light, opacity: 0 }, this.ov);
        const rings = [0, 1].map(() => sv('ellipse', { cx: k.x + k.w / 2, cy: k.y + k.h / 2, rx: 40, ry: 30, fill: 'none', stroke: C.high, 'stroke-width': 3, opacity: 0 }, this.ov));
        const lbl = sv('g', { opacity: 0 }, this.ov);
        const pill = sv('rect', { x: k.x - 196, y: k.y + k.h / 2 - 21, width: 176, height: 42, rx: 21, 'stroke-width': 2 }, lbl);
        const txt = sv('text', { x: k.x - 108, y: k.y + k.h / 2 + 9, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 700, 'font-family': 'Arial, sans-serif' }, lbl);
        return { k, x: st.x, dockY: arm.y - this.vr * 0.4, lit, rings, lbl, pill, txt };
      };
      this.r0 = mkRec(0); this.r1 = mkRec(1);
      // a second VEGF for the antibody scene
      this.W = dimer(this.ov, this.vr); this.W.setAttribute('opacity', 0);
      // the antibody's free right arm (where the caught VEGF sticks), relative to the antibody's rest position
      this.grab = { x: 500, y: 322 };
    },
    step(s, step) { this.k = step; this.t0 = LIVE.now(); },
    mode(ts) { if (this.k === 0) return ['N', ts % 6]; if (this.k === 1) return ['A', ts % 6]; const k = Math.floor(ts / 6); return [k % 2 === 0 ? 'B' : 'A', ts % 6]; },
    status(r, on, a) {
      r.txt.textContent = on ? 'Signal ON' : 'Signal OFF';
      r.txt.setAttribute('fill', on ? '#FFFFFF' : C.grey);
      r.pill.setAttribute('fill', on ? C.high : '#FFFFFF'); r.pill.setAttribute('stroke', on ? C.high : C.grey);
      r.lbl.setAttribute('opacity', a.toFixed(3));
    },
    frame(s, t) {
      if (!this.ov) return;
      const [m, u] = this.mode(t - this.t0);
      // red blood cell drifts in the blood
      const rx = 30 * Math.sin(t * 0.35); this.rbc.forEach(e => { e.style.translate = `${rx}px 0`; });
      // reset
      for (const r of [this.r0, this.r1]) { r.lit.setAttribute('opacity', 0); r.rings.forEach(e => e.setAttribute('opacity', 0)); r.lbl.setAttribute('opacity', 0); }
      this.W.setAttribute('opacity', 0);
      if (this.ab) this.ab.style.translate = '';
      this.X.forEach(e => { e.style.scale = ''; });
      if (this.inh) this.inh.style.scale = '';
      const fadeOut = 1 - seg(u, 4.6, 5.4);
      if (m === 'N' || m === 'B') {
        // VEGF (the PPTX dimer) travels to receptor 1 and docks
        const v = ease(seg(u, 0.3, 2.1));
        const dx = (this.r1.x - this.vc.x) * v, dy = (this.r1.dockY - this.vc.y) * v;
        const op = seg(u, 0, 0.3) * fadeOut;
        this.V.forEach(e => { e.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`; e.style.opacity = op; });
        if (m === 'N') {
          const on = seg(u, 2.1, 2.4) * fadeOut;
          this.r1.lit.setAttribute('opacity', (0.9 * on).toFixed(3));
          this.r1.rings.forEach((e, i) => { const ok = u > 2.3 + i * 0.6 && u < 4.8; const p = ok ? ((u - 2.3 - i * 0.6) % 1.2) / 1.2 : 0; e.setAttribute('opacity', ok ? (1 - p).toFixed(3) : 0); e.setAttribute('rx', 40 + 70 * p); e.setAttribute('ry', 30 + 50 * p); });
          this.status(this.r1, true, on);
        } else {
          const j = seg(u, 2.1, 2.4);
          if (this.inh) this.inh.style.scale = String(1 + 0.3 * Math.sin(Math.PI * seg(u, 2.2, 2.9)));
          this.status(this.r1, false, j * fadeOut);
        }
      } else { // A: the antibody catches a VEGF before it reaches receptor 0
        this.V.forEach(e => { e.style.opacity = 0; e.style.translate = ''; });
        const lunge = ease(seg(u, 0.9, 1.5)) * (1 - ease(seg(u, 2.0, 3.4)));
        const ax = 165 * lunge, ay = 22 * lunge;
        if (this.ab) this.ab.style.translate = `${ax.toFixed(1)}px ${ay.toFixed(1)}px`;
        const start = { x: 1000, y: 360 }, catchP = { x: this.grab.x + 165, y: this.grab.y + 22 };
        let wx, wy;
        if (u < 1.5) { const v = ease(seg(u, 0.2, 1.5)); wx = lerp(start.x, catchP.x, v); wy = lerp(start.y, catchP.y, v); }
        else { wx = this.grab.x + ax; wy = this.grab.y + ay; }
        this.W.setAttribute('transform', `translate(${wx.toFixed(1)},${wy.toFixed(1)})`);
        this.W.setAttribute('opacity', (seg(u, 0.1, 0.4) * (1 - seg(u, 3.6, 4.3))).toFixed(3));
        const xp = Math.sin(Math.PI * seg(u, 1.4, 2.0));
        this.X.forEach(e => { e.style.scale = String(1 + 0.35 * xp); });
        this.status(this.r0, false, seg(u, 1.5, 1.8) * fadeOut);
      }
    },
    leave(s) {
      clearOverlay(this.ov); this.ov = null;
      for (const e of s.el.querySelectorAll('.shp')) { e.style.translate = ''; e.style.scale = ''; e.style.opacity = e.classList.contains('k-pic') ? e.style.opacity : ''; }
    }
  };

  LIVE.FX['3a'] = A3;
  LIVE.FX['3b'] = B3;
})();
