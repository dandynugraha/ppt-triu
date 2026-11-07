/* Tri-U deck — canvas visuals (v9). No dependencies.
   brain / brain-warm : axial contour slices of a stylised brain (an MRI is a stack of slices), slowly rotating,
                        one bright "scan plane" sweeping, tumour region in amber. Illustration, not data.
   protein            : the real VEGFR-2 kinase domain, PDB 2OH4 (deck/js/pdb2oh4.js): smoothed C-alpha tube coloured
                        by secondary structure, bound inhibitor (ball-and-stick), Val914 / Asp1044 / Phe1045 labelled. */
(function () {
  'use strict';
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const COL = { cyan: hex('#3FE0FF'), violet: hex('#8B5CFF'), magenta: hex('#FF8AE6'), amber: hex('#FFC24B'), coral: hex('#FF7A59'),
    lime: hex('#D9FA3F'), white: hex('#F2F4FF'), slate: hex('#B3BAE4'), pink: hex('#FF6FA8'), gold: hex('#FFD36B') };

  /* ---------------- brain contours ---------------- */
  function sdEll(x, y, z, rx, ry, rz) { const k0 = Math.hypot(x / rx, y / ry, z / rz), k1 = Math.hypot(x / (rx * rx), y / (ry * ry), z / (rz * rz)); return k0 * (k0 - 1) / k1; }
  function smin(a, b, k) { const h = clamp(.5 + .5 * (b - a) / k); return lerp(b, a, h) - k * h * (1 - h); }
  function cap(x, y, z, ax, ay, az, bx, by, bz, r) { const pax = x - ax, pay = y - ay, paz = z - az, bax = bx - ax, bay = by - ay, baz = bz - az; const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)); return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r; }
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  /* anatomical-ish brain: two hemispheres with a midline fissure, frontal / occipital / temporal lobes,
     lateral (Sylvian) fissure, gyri and sulci, folded cerebellum, brainstem. x = front(-)..back(+), y = up, z = left/right */
  function brainD(x, y, z) {
    const az = Math.abs(z);
    let h = sdEll(x + .02, y - .16, az - .28, .98, .60, .46);                       // cerebrum
    h = smin(h, sdEll(x + .58, y - .10, az - .26, .46, .44, .40), .2);             // frontal lobe (rounded pole)
    h = smin(h, sdEll(x - .66, y - .08, az - .25, .38, .40, .34), .18);            // occipital lobe
    const tl = sdEll(x + .12, y + .26, az - .38, .56, .22, .26);                    // temporal lobe, hangs below
    h = smin(h, tl, .09);
    const syl = (y + .06) - (x + .62) * .24;                                         // lateral (Sylvian) fissure
    if (x > -.72 && x < .30) h += .085 * Math.exp(-syl * syl * 300) * smooth(.15, .38, az);
    const g = Math.sin(y * 24 + x * 9 + 3.2 * Math.sin(az * 7 + x * 4) + 2.4 * Math.sin(x * 7 - y * 5));
    h += .03 * g * clamp(y + .5);                                                    // gyri / sulci
    if (y > -.2) h = Math.max(h, .028 - az);                                         // midline fissure
    const ce = sdEll(x - .55, y + .50, z, .36, .21, .46) + .012 * Math.sin(y * 80 + x * 14);   // cerebellum + folia
    let d = Math.min(h, ce);                                                         // keep the notch between them
    d = smin(d, cap(x, y, z, .20, -.38, 0, .28, -1.02, 0, .12), .08);              // brainstem
    return d;
  }
  const TUM = [-.42, .24, .34];
  let BRAIN = null;
  function buildBrain() {                                    // marching squares on SAGITTAL (z) slices: each contour is a side profile
    const slices = [], NX = 120, NY = 96, X0 = -1.3, X1 = 1.25, Y0 = -1.12, Y1 = .9, NS = 34;
    for (let s = 0; s < NS; s++) {
      const z = -.60 + s * (1.20 / (NS - 1)), segs = [], g = [];
      if (Math.abs(z) < .07) continue;                         // skip the midline (fissure artefacts)
      for (let j = 0; j <= NY; j++) { g.push([]); for (let i = 0; i <= NX; i++) g[j].push(brainD(lerp(X0, X1, i / NX), lerp(Y0, Y1, j / NY), z)); }
      const P = (i, j, i2, j2) => { const a = g[j][i], b = g[j2][i2], t = a / (a - b); return [lerp(X0, X1, lerp(i, i2, t) / NX), lerp(Y0, Y1, lerp(j, j2, t) / NY)]; };
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
        const c = (g[j][i] < 0 ? 1 : 0) | (g[j][i + 1] < 0 ? 2 : 0) | (g[j + 1][i + 1] < 0 ? 4 : 0) | (g[j + 1][i] < 0 ? 8 : 0);
        if (c === 0 || c === 15) continue;
        const e = { t: () => P(i, j, i + 1, j), r: () => P(i + 1, j, i + 1, j + 1), b: () => P(i, j + 1, i + 1, j + 1), l: () => P(i, j, i, j + 1) };
        const L = { 1: ['l', 't'], 2: ['t', 'r'], 3: ['l', 'r'], 4: ['r', 'b'], 5: ['l', 't', 'r', 'b'], 6: ['t', 'b'], 7: ['l', 'b'], 8: ['b', 'l'], 9: ['b', 't'], 10: ['t', 'r', 'b', 'l'], 11: ['b', 'r'], 12: ['r', 'l'], 13: ['r', 't'], 14: ['t', 'l'] }[c];
        for (let k = 0; k < L.length; k += 2) { const A = e[L[k]](), B = e[L[k + 1]](); segs.push([A[0], A[1], z, B[0], B[1], z]); }
      }
      if (segs.length) slices.push({ z, f: s / (NS - 1), segs });
    }
    BRAIN = slices;
  }
  function drawBrain(ctx, W, H, t, warm) {
    if (!BRAIN) buildBrain();
    const yaw = .22 + Math.sin(t * .22) * .34, pitch = .12 + Math.sin(t * .13) * .05, S = Math.min(W, H) * .44, cx = W * .5, cy = H * .47;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const proj = (x, y, z) => { const x1 = cyw * x + syw * z, z1 = -syw * x + cyw * z; const y2 = cp * y - sp * z1, z2 = sp * y + cp * z1; const per = 3.6 / (3.6 - z2); return [cx + x1 * S * per, cy - y2 * S * per, z2]; };
    const scanZ = -.60 + (Math.sin(t * .45) * .5 + .5) * 1.20;
    const lo = warm ? COL.amber : COL.cyan, mid = warm ? COL.pink : COL.violet, hi = warm ? COL.violet : COL.magenta;
    const k = W / 808;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const order = BRAIN.map((sl, i) => [i, -syw * 0 + cyw * sl.z]).sort((a, b) => a[1] - b[1]);   // far slices first
    for (const [si] of order) {
      const sl = BRAIN[si], base = sl.f < .5 ? mixc(lo, mid, sl.f * 2) : mixc(mid, hi, (sl.f - .5) * 2);
      const scan = Math.exp(-Math.pow((sl.z - scanZ) / .06, 2));
      const zc = proj(0, 0, sl.z)[2], depth = clamp(.5 + zc * .55);
      ctx.beginPath();
      for (const s of sl.segs) { const a = proj(s[0], s[1], s[2]), b = proj(s[3], s[4], s[5]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      ctx.lineWidth = (1.5 + depth * .9 + scan * 2.4) * k;
      ctx.strokeStyle = rgba(mixc(base, COL.white, .1 + scan * .75), clamp((.32 + .6 * depth) + scan * .4));
      ctx.stroke();
      const dz = sl.z - TUM[2], tr = .12;
      if (Math.abs(dz) < tr) {                                  // tumour: a small ellipsoid of rings inside the brain
        const rr = Math.sqrt(tr * tr - dz * dz); ctx.beginPath();
        for (let q = 0; q <= 40; q++) { const a = q / 40 * 6.283, p = proj(TUM[0] + Math.cos(a) * rr * 1.15, TUM[1] + Math.sin(a) * rr, sl.z); q ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        ctx.strokeStyle = rgba(warm ? COL.lime : COL.amber, .8); ctx.lineWidth = 1.8 * k; ctx.stroke();
      }
    }
  }

  /* ---------------- protein 2OH4 ---------------- */
  let PROT = null;
  function buildProtein() {
    const D = window.PDB2OH4; if (!D) return null;
    const res = D.res, pts = [];
    // Catmull-Rom through C-alpha, broken at chain gaps (> 4.3 Å)
    const chains = []; let cur = [res[0]];
    for (let i = 1; i < res.length; i++) { const a = res[i - 1], b = res[i];
      if (Math.hypot(b[1] - a[1], b[2] - a[2], b[3] - a[3]) > 4.3) { chains.push(cur); cur = []; } cur.push(b); }
    chains.push(cur);
    const segs = [];
    chains.forEach(ch => {
      for (let i = 0; i < ch.length - 1; i++) {
        const p0 = ch[Math.max(0, i - 1)], p1 = ch[i], p2 = ch[i + 1], p3 = ch[Math.min(ch.length - 1, i + 2)];
        let prev = null;
        for (let k = 0; k <= 6; k++) { const t = k / 6, t2 = t * t, t3 = t2 * t;
          const q = [1, 2, 3].map(j => .5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3));
          if (prev) segs.push({ a: prev, b: q, ss: t < .5 ? p1[4] : p2[4], idx: lerp(p1[0], p2[0], t) });
          prev = q; }
      }
    });
    const lig = D.lig.map(g => ({ el: g[0], p: [g[1], g[2], g[3]] }));
    const bonds = []; for (let i = 0; i < lig.length; i++) for (let j = i + 1; j < lig.length; j++) if (Math.hypot(...[0, 1, 2].map(k => lig[i].p[k] - lig[j].p[k])) < 1.9) bonds.push([i, j]);
    const marks = res.filter(r => D.mark[String(r[0])]).map(r => ({ name: D.mark[String(r[0])], p: [r[1], r[2], r[3]] }));
    const r0 = res[0][0], r1 = res[res.length - 1][0];
    return { segs, lig, bonds, marks, r0, r1 };
  }
  function drawProtein(ctx, W, H, t, labels) {
    if (!PROT) PROT = buildProtein(); if (!PROT) return;
    const yaw = .6 + t * .18, pitch = -.25, S = Math.min(W, H) / 62, cx = W / 2, cy = H * .5;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const proj = p => { const x1 = cyw * p[0] + syw * p[2], z1 = -syw * p[0] + cyw * p[2]; const y2 = cp * p[1] - sp * z1, z2 = sp * p[1] + cp * z1; const per = 90 / (90 - z2); return [cx + x1 * S * per, cy - y2 * S * per, z2, per]; };
    const items = [];
    for (const s of PROT.segs) { const a = proj(s.a), b = proj(s.b); items.push({ z: (a[2] + b[2]) / 2, k: 0, a, b, s }); }
    PROT.bonds.forEach(([i, j]) => { const a = proj(PROT.lig[i].p), b = proj(PROT.lig[j].p); items.push({ z: 1e3 + (a[2] + b[2]) / 2, k: 1, a, b }); });
    PROT.lig.forEach(l => { const a = proj(l.p); items.push({ z: 1e3 + a[2] + .3, k: 2, a, el: l.el }); });
    PROT.marks.forEach((m, i) => { const a = proj(m.p); items.push({ z: 2e3 + i, k: 3, a, name: m.name, i }); });
    items.sort((p, q) => p.z - q.z);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const span = PROT.r1 - PROT.r0;
    for (const it of items) {
      const shade = clamp(.45 + it.z / 40);
      if (it.k === 0) {
        const s = it.s, f = (s.idx - PROT.r0) / span;
        let col, w;
        if (s.ss === 'H') { col = mixc(COL.magenta, COL.violet, f); w = 10; }
        else if (s.ss === 'E') { col = mixc(COL.cyan, COL.amber, f); w = 8; }
        else { col = mixc(COL.slate, COL.white, .3); w = 3.2; }
        const lw = w * it.a[3] * W / 808;
        ctx.strokeStyle = rgba(mixc([10, 12, 40], col, .35 + .65 * shade), 1); ctx.lineWidth = lw + 2.4 * W / 808;
        ctx.beginPath(); ctx.moveTo(it.a[0], it.a[1]); ctx.lineTo(it.b[0], it.b[1]); ctx.stroke();
        ctx.strokeStyle = rgba(mixc(col, COL.white, .25 * shade), .35 + .65 * shade); ctx.lineWidth = lw;
        ctx.stroke();
      } else if (it.k === 1) {
        ctx.beginPath(); ctx.moveTo(it.a[0], it.a[1]); ctx.lineTo(it.b[0], it.b[1]);
        ctx.strokeStyle = 'rgba(6,8,24,.9)'; ctx.lineWidth = 7 * W / 808; ctx.stroke();
        ctx.strokeStyle = rgba(COL.lime, 1); ctx.lineWidth = 3.4 * W / 808; ctx.stroke();
      } else if (it.k === 2) {
        const c = it.el === 'N' ? COL.cyan : it.el === 'O' ? COL.coral : it.el === 'C' ? COL.lime : COL.white, r = 6.2 * it.a[3] * W / 808;
        ctx.fillStyle = 'rgba(6,8,24,.9)'; ctx.beginPath(); ctx.arc(it.a[0], it.a[1], r + 2 * W / 808, 0, 6.283); ctx.fill();
        ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.arc(it.a[0], it.a[1], r, 0, 6.283); ctx.fill();
      } else if (it.k === 3 && labels) {
        const r = 7 * W / 808;
        ctx.fillStyle = rgba(COL.white, 1); ctx.beginPath(); ctx.arc(it.a[0], it.a[1], r, 0, 6.283); ctx.fill();
        ctx.font = `600 ${Math.round(20 * W / 808)}px Inter, system-ui, sans-serif`;
        const k = W / 808, tw = ctx.measureText(it.name).width, tx = W * .06, ty = H * (.12 + it.i * .075);
        ctx.strokeStyle = 'rgba(244,246,255,.55)'; ctx.lineWidth = 1.5 * k; ctx.beginPath(); ctx.moveTo(tx + tw + 14 * k, ty - 7 * k); ctx.lineTo(it.a[0], it.a[1]); ctx.stroke();
        ctx.fillStyle = 'rgba(8,8,26,.85)'; ctx.fillRect(tx - 8 * k, ty - 24 * k, tw + 18 * k, 34 * k);
        ctx.fillStyle = rgba(COL.white, 1); ctx.fillText(it.name, tx, ty);
      }
    }
  }

  /* ---------------- registry ---------------- */
  const canvases = new Map();
  function sizeCanvas(cv) {
    const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(200, Math.round(r.width * dpr)), h = Math.max(200, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }
  function render(root, t) {
    root.querySelectorAll('canvas.viz-canvas').forEach(cv => {
      sizeCanvas(cv);
      const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, kind = cv.dataset.viz;
      ctx.clearRect(0, 0, W, H);
      if (kind === 'brain') drawBrain(ctx, W, H, t, false);
      else if (kind === 'brain-warm') drawBrain(ctx, W, H, t, true);
      else if (kind === 'protein') drawProtein(ctx, W, H, t, true);
      else if (kind === 'protein-plain') drawProtein(ctx, W, H, t, false);
    });
  }
  window.VIZ = { render, prewarm() { if (!BRAIN) buildBrain(); if (!PROT) PROT = buildProtein(); } };
})();
