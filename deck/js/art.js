/* Tri-U deck art v6 — real-time WebGL (no video frames, no network, works on file://).
   1) Background: one tall "page" of coloured gradients; the deck position scrolls it (next = up, back = down).
   2) Particles: 7 000 glowing points that reassemble into one subject per slide; the morph runs in the
      vertex shader, so the CPU only sets a few uniforms per frame (light on laptops).
   Deterministic: seeded RNG; with time = 0 (static/PDF) the same position always gives the same picture.
   Stylised illustration only, credited on slide 1. */
(function () {
  'use strict';
  const NP = 10000, DUST = 250;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const R = rng(5150);

  /* palette (DESIGN.md v6) */
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const P = { violet: hex('#8B5CFF'), magenta: hex('#FF4FD8'), pink: hex('#FF6FA8'), coral: hex('#FF7A59'), amber: hex('#FFC24B'),
    lime: hex('#D9FA3F'), cyan: hex('#3FE0FF'), teal: hex('#2EE6B6'), blue: hex('#4F7BFF'), white: hex('#F2F4FF'), slate: hex('#59608F'), gold: hex('#FFD36B') };
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  /* ---------- shapes ---------- */
  function sdEll(x, y, z, rx, ry, rz) { const k0 = Math.hypot(x / rx, y / ry, z / rz), k1 = Math.hypot(x / (rx * rx), y / (ry * ry), z / (rz * rz)); return k0 * (k0 - 1) / k1; }
  function smin(a, b, k) { const h = clamp(.5 + .5 * (b - a) / k); return lerp(b, a, h) - k * h * (1 - h); }
  function cap(x, y, z, ax, ay, az, bx, by, bz, r) { const pax = x - ax, pay = y - ay, paz = z - az, bax = bx - ax, bay = by - ay, baz = bz - az; const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)); return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r; }
  function brainD(x, y, z) {
    let d = sdEll(x, y - .12, z, 1, .70, .74);
    d = smin(d, sdEll(x + .12, y + .28, z, .66, .36, .62), .18);
    const ce = sdEll(x - .58, y + .46, z, .40, .25, .44);
    d = smin(d, ce, .07);
    d = smin(d, cap(x, y, z, .28, -.40, 0, .36, -1.0, 0, .14), .12);
    return [d, ce];
  }
  const TUMOUR = [-.42, .30, .40];
  /* scheme(x,y,z,ridge,tumour) -> colour */
  function brainPoints(n, scheme, tumour = true) {
    const pts = []; let guard = 0;
    while (pts.length < n && guard++ < 6e6) {
      const x = R() * 2.3 - 1.15, y = R() * 2.15 - 1.12, z = R() * 1.7 - .85;
      const [d, ce] = brainD(x, y, z);
      if (d > .004 || d < -.05) continue;
      if (Math.abs(z) < .045 && y > -.05 && ce > .05) continue;
      const g = ce < .04 ? Math.sin(y * 58 + x * 9) : Math.sin(y * 20 + x * 7 + 3.5 * Math.sin(z * 4 + x * 2.5) + 2 * Math.sin(x * 5 - y * 3));
      if (g < .35 && R() > .22) continue;
      const tum = tumour && Math.hypot(x - TUMOUR[0], y - TUMOUR[1], z - TUMOUR[2]) < .30;
      pts.push({ x, y, z, c: scheme(x, y, z, g > .8, tum), s: tum ? 1.1 : 1 });
    }
    if (tumour) for (let i = 0; i < Math.floor(n * .05) && pts.length; i++) {
      const k = Math.floor(R() * pts.length), u = R() * 6.283, v = Math.acos(2 * R() - 1), r = .17 * Math.cbrt(R());
      pts[k] = { x: TUMOUR[0] + r * Math.sin(v) * Math.cos(u), y: TUMOUR[1] + r * Math.cos(v), z: TUMOUR[2] + r * Math.sin(v) * Math.sin(u), c: R() < .5 ? P.amber : P.coral, s: 1.25 };
    }
    return pts;
  }
  const brainCool = (x, y, z, ridge, tum) => tum ? (R() < .5 ? P.coral : P.amber) : (ridge ? mix(P.white, P.cyan, .3) : mix(mix(P.cyan, P.violet, clamp((x + 1) / 1.6)), P.magenta, clamp(-y * .9)));
  const brainWarm = (x, y, z, ridge, tum) => tum ? P.lime : (ridge ? mix(P.white, P.gold, .35) : mix(mix(P.amber, P.pink, clamp((x + 1) / 1.7)), P.violet, clamp(-y * .9 + .1)));
  function dust(n, cols = [P.slate, P.blue]) {
    const pts = [];
    for (let i = 0; i < n; i++) { const u = R() * 6.283, v = Math.acos(2 * R() - 1), r = lerp(1.7, 2.7, R());
      pts.push({ x: r * Math.sin(v) * Math.cos(u), y: r * Math.cos(v) * .7, z: r * Math.sin(v) * Math.sin(u), c: cols[i % cols.length], s: .55, a: .4 }); }
    return pts;
  }
  const tf = (p, sc, ox = 0, oy = 0, oz = 0) => ({ ...p, x: p.x * sc + ox, y: p.y * sc + oy, z: p.z * sc + oz });
  function rotY(p, a) { const c = Math.cos(a), s = Math.sin(a); return { ...p, x: c * p.x + s * p.z, z: -s * p.x + c * p.z }; }
  function rotX(p, a) { const c = Math.cos(a), s = Math.sin(a); return { ...p, y: c * p.y - s * p.z, z: s * p.y + c * p.z }; }
  const fill = (pts, cols) => {
    const shape = pts.slice(0, NP - DUST), base = shape.length;
    for (let i = 0; shape.length < NP - DUST && base; i++) { const q = shape[Math.floor(R() * base)];   // denser: jittered copies on the subject
      shape.push({ ...q, x: q.x + (R() - .5) * .022, y: q.y + (R() - .5) * .022, z: q.z + (R() - .5) * .022, s: q.s * .85 }); }
    return shape.concat(dust(NP - shape.length, cols));
  };

  /* ---------- forms ---------- */
  const F_brain = warm => fill(brainPoints(6300, warm ? brainWarm : brainCool), warm ? [P.slate, P.pink] : [P.slate, P.violet]);
  function F_mri() {
    const out = [];
    for (let i = 0; i < 3100; i++) { const a = R() * 6.283, t = R() * 6.283, rr = 1.0 + .26 * Math.cos(t), zz = .40 * Math.sin(t);
      out.push(rotY({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, z: zz, c: Math.cos(t) > .6 ? P.white : mix(P.teal, P.cyan, R()), s: .9 }, -.6)); }
    for (let i = 0; i < 380; i++) out.push(rotY({ x: R() * .64 - .32, y: -.55, z: R() * 2.2 - 1.0, c: P.slate, s: .8 }, -.6));
    brainPoints(2300, brainCool).forEach(p => out.push(rotY(tf(p, .44), -.6)));
    for (let i = 0; i < 700; i++) { const a = R() * 6.283, r = .62 * Math.sqrt(R());
      out.push(rotY({ x: .06, y: Math.sin(a) * r, z: Math.cos(a) * r, c: mix(P.white, P.lime, .25), s: .75, a: .85 }, -.6)); }
    return fill(out, [P.slate, P.teal]);
  }
  function F_vessels() {
    const segs = [];
    function grow(x, y, z, dx, dy, dz, len, w, depth) {
      if (depth > 5 || w < .008) return;
      let px = x, py = y, pz = z;
      for (let i = 0; i < 5; i++) {
        const dl = Math.hypot(px, py, pz) || 1;
        dx = dx * .8 - px / dl * .2 + (R() - .5) * .35; dy = dy * .8 - py / dl * .2 + (R() - .5) * .35; dz = dz * .8 - pz / dl * .2 + (R() - .5) * .35;
        const m = Math.hypot(dx, dy, dz); dx /= m; dy /= m; dz /= m;
        const l = len / 5, nx = px + dx * l, ny = py + dy * l, nz = pz + dz * l;
        segs.push([px, py, pz, nx, ny, nz, w]); px = nx; py = ny; pz = nz;
        if (Math.hypot(px, py, pz) < .34) return;
        if (i >= 1 && R() < .5) { const s = R() < .5 ? -1 : 1; grow(px, py, pz, dx + s * (R() - .2), dy + (R() - .5), dz + s * (R() - .5), len * .6, w * .62, depth + 1); }
      }
      grow(px, py, pz, dx, dy, dz, len * .78, w * .8, depth + 1);
    }
    for (let k = 0; k < 12; k++) { const u = k / 12 * 6.283 + R() * .4, v = .6 + R() * 1.9, r = 2.1;
      const x = r * Math.sin(v) * Math.cos(u) + .25, y = r * Math.cos(v) * .8, z = r * Math.sin(v) * Math.sin(u) * .7;
      grow(x, y, z, -x, -y, -z, 1.05, .05, 0); }
    const wt = g => Math.hypot(g[3] - g[0], g[4] - g[1], g[5] - g[2]) * (g[6] * 8 + .5);
    const total = segs.reduce((s, g) => s + wt(g), 0), out = [];
    for (const g of segs) { const k = Math.round(5300 * wt(g) / total);
      for (let i = 0; i < k; i++) { const f = R(), j = g[6] * .5, rad = Math.hypot(lerp(g[0], g[3], f), lerp(g[1], g[4], f), lerp(g[2], g[5], f));
        out.push({ x: lerp(g[0], g[3], f) + (R() - .5) * j, y: lerp(g[1], g[4], f) + (R() - .5) * j, z: lerp(g[2], g[5], f) + (R() - .5) * j,
          c: mix(P.pink, P.coral, clamp(rad / 2)), s: g[6] > .03 ? 1 : .8 }); } }
    for (let i = 0; i < 1200; i++) { const u = R() * 6.283, v = Math.acos(2 * R() - 1), r = .30 * Math.cbrt(R());
      out.push({ x: r * Math.sin(v) * Math.cos(u), y: r * Math.cos(v), z: r * Math.sin(v) * Math.sin(u), c: R() < .6 ? P.amber : P.magenta, s: 1.1 }); }
    return fill(out, [P.slate, P.magenta]);
  }
  function beadChain(n, sc, ox, colorFn) {
    const beads = []; for (let k = 0; k < 34; k++) { const s = k * .30; beads.push([Math.sin(s) * .62 + .18 * Math.sin(s * 3.1), Math.cos(s * 1.27) * .58, Math.sin(s * 2.03 + 1) * .42]); }
    const out = []; let guard = 0;
    while (out.length < n && guard++ < 2e6) {
      const k = Math.floor(R() * 34), b = beads[k], u = R() * 6.283, v = Math.acos(2 * R() - 1), r = .17;
      const x = b[0] + r * Math.sin(v) * Math.cos(u), y = b[1] + r * Math.cos(v), z = b[2] + r * Math.sin(v) * Math.sin(u);
      if (beads.some((q, j) => j !== k && Math.hypot(x - q[0], y - q[1], z - q[2]) < .16)) continue;
      out.push({ x: x * sc + ox, y: y * sc, z: z * sc, c: colorFn(k), s: 1 });
    }
    return out;
  }
  const rainbow = k => k >= 13 && k <= 17 ? P.lime : (k < 9 ? mix(P.blue, P.violet, k / 9) : k < 20 ? mix(P.violet, P.magenta, (k - 9) / 11) : mix(P.coral, P.amber, (k - 20) / 14));
  function F_pipeline() {
    const out = [];
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const b = .5 + .5 * Math.sin(i * .7) * Math.cos(j * .55);
      for (let k = 0; k < 6; k++) out.push(rotY({ x: -1.35 + (i - 7.5) * .045 + (R() - .5) * .012, y: (j - 7.5) * .045 + (R() - .5) * .012, z: 0, c: b > .72 ? P.white : (b > .4 ? P.cyan : P.slate), s: .85 }, .5)); }
    for (let i = 0; i < 2300; i++) { const y = R() * 1.5 - .75, s = R() < .5 ? 0 : Math.PI, a = y * 5.2 + s;
      if (R() < .22) { const yy = Math.round(y / .1) * .1, aa = yy * 5.2, f = R() * 2 - 1; out.push({ x: Math.cos(aa) * .26 * f, y: yy, z: Math.sin(aa) * .26 * f, c: P.white, s: .7 }); }
      else out.push({ x: Math.cos(a) * .26, y, z: Math.sin(a) * .26, c: s ? P.magenta : P.teal, s: .95 }); }
    beadChain(2300, .55, 1.32, k => k >= 13 && k <= 17 ? P.lime : (k % 2 ? P.amber : P.coral)).forEach(p => out.push(p));
    for (let i = 0; i < 260; i++) { const f = R(), seg = R() < .5; out.push({ x: seg ? lerp(-.95, -.45, f) : lerp(.38, .82, f), y: 0, z: 0, c: P.white, s: .5, a: .6 }); }
    return fill(out, [P.slate, P.blue]);
  }
  const GRID = []; for (let j = 0; j < 22; j++) for (let i = 0; i < 32; i++) GRID.push([(i - 15.5) * .068, (j - 10.5) * .068]); // 704 tests
  const SIG = new Set(); { const r2 = rng(61); while (SIG.size < 61) SIG.add(Math.floor(r2() * 704)); }
  function F_grid(tilt, mode) {
    const out = [];
    GRID.forEach(([x, y], k) => {
      const sig = SIG.has(k), dead = mode === 'dead' && sig;
      const base = mode === 'dead' ? mix(P.blue, P.slate, .35) : mix(P.teal, P.cyan, ((k * 7) % 11) / 11);
      for (let r = 0; r < 5; r++) out.push(rotX({ x: x + (R() - .5) * .008, y: y + (R() - .5) * .008, z: (R() - .5) * .01, c: dead ? P.magenta : base, s: r ? .7 : 1.3, a: dead ? .5 : 1, flare: dead ? 1 : 0 }, tilt));
    });
    if (mode === 'lenses') [[-.45, P.amber], [.5, P.lime]].forEach(([cx, col]) => { for (let i = 0; i < 520; i++) { const a = i / 520 * 6.283, rr = .32 + (R() - .5) * .015;
      out.push(rotX({ x: cx + Math.cos(a) * rr, y: Math.sin(a) * rr + .05, z: .28, c: col, s: .9 }, tilt)); } });
    return fill(out, [P.slate, P.violet]);
  }
  /* megaminx: regular dodecahedron, star cuts on every face, 12 face colours (like the real puzzle) */
  function F_megaminx() {
    const phi = (1 + Math.sqrt(5)) / 2, V = [];
    for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) V.push([a, b, c]);
    for (const a of [-1, 1]) for (const b of [-1, 1]) { V.push([0, a / phi, b * phi]); V.push([a / phi, b * phi, 0]); V.push([a * phi, 0, b / phi]); }
    const cand = []; for (const a of [-1, 1]) for (const b of [-1, 1]) for (const [x, y] of [[1, phi], [phi, 1]]) { cand.push([0, a * x, b * y]); cand.push([a * x, b * y, 0]); cand.push([b * y, 0, a * x]); }
    const N12 = cand.filter(n => { const m = Math.hypot(...n); const d = V.map(v => (v[0] * n[0] + v[1] * n[1] + v[2] * n[2]) / m).sort((p, q) => q - p); return Math.abs(d[0] - d[4]) < 1e-6 && d[4] - d[5] > 1e-3; })
      .filter((n, i, arr) => arr.findIndex(q => Math.abs(q[0] - n[0]) + Math.abs(q[1] - n[1]) + Math.abs(q[2] - n[2]) < 1e-9) === i);
    const FACE = [P.violet, P.cyan, P.magenta, P.teal, P.amber, P.blue, P.coral, P.pink, P.gold, mix(P.teal, P.blue, .5), mix(P.violet, P.pink, .5), P.white];
    const pinkFace = N12.reduce((best, n, i) => { const m = Math.hypot(...n); const d = (n[0] * .25 + n[1] * .55 + n[2] * .8) / m; return d > best[0] ? [d, i] : best; }, [-9, 0])[1];
    const sc = .62, out = [];
    N12.forEach((n, fi) => {
      const m = Math.hypot(...n), nn = n.map(v => v / m);
      const fv = V.map(v => [v, v[0] * nn[0] + v[1] * nn[1] + v[2] * nn[2]]).sort((p, q) => q[1] - p[1]).slice(0, 5).map(p => p[0]);
      const c = [0, 1, 2].map(k => fv.reduce((s, v) => s + v[k], 0) / 5);
      const u = [0, 1, 2].map(k => fv[0][k] - c[k]); const ul = Math.hypot(...u); u.forEach((v, k) => u[k] = v / ul);
      const w = [nn[1] * u[2] - nn[2] * u[1], nn[2] * u[0] - nn[0] * u[2], nn[0] * u[1] - nn[1] * u[0]];
      const P2 = fv.map(v => { const d = [0, 1, 2].map(k => v[k] - c[k]); return [d[0] * u[0] + d[1] * u[1] + d[2] * u[2], d[0] * w[0] + d[1] * w[1] + d[2] * w[2]]; })
        .sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
      const inner = P2.map(p => [p[0] * .42, p[1] * .42]);
      const inside = (x, y, poly) => { for (let i = 0; i < 5; i++) { const a = poly[i], b = poly[(i + 1) % 5]; if ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) < 0) return false; } return true; };
      const lineD = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; return Math.abs(dy * x - dx * y + b[0] * a[1] - b[1] * a[0]) / Math.hypot(dx, dy); };
      const R0 = Math.hypot(...P2[0]);
      // face colour from a hue wheel over the face direction: neighbouring faces always differ (like the real puzzle)
      const hue = ((Math.atan2(nn[2], nn[0]) / 6.283 + .5) + nn[1] * .23 + 1) % 1;
      const hsv = (h, sat, val) => { const f = (k) => { const kk = (k + h * 6) % 6; return val - val * sat * Math.max(0, Math.min(kk, 4 - kk, 1)); }; return [f(5), f(3), f(1)]; };
      const special = fi === pinkFace, fc = special ? P.lime : hsv(hue, .78, 1);
      const put = (x, y, col, sz, al) => { const Q = [0, 1, 2].map(j => (c[j] + u[j] * x + w[j] * y) * sc); out.push({ x: Q[0], y: Q[1], z: Q[2], c: col, s: sz, a: al }); };
      for (let i = 0; i < 5; i++) { const A = P2[i], B = P2[(i + 1) % 5]; for (let t = 0; t < 24; t++) { const f = t / 24; put(lerp(A[0], B[0], f), lerp(A[1], B[1], f), mix(P.white, fc, .4), .8, .85); } }
      for (let i = 0; i < 5; i++) { const A = inner[i], B = inner[(i + 1) % 5], dx = B[0] - A[0], dy = B[1] - A[1];
        for (let t = -1.15; t <= 2.15; t += .075) { const x = A[0] + dx * t, y = A[1] + dy * t; if (inside(x, y, P2)) put(x, y, fc, .75, .6); } }
      let k = 0, guard = 0;
      while (k < 270 && guard++ < 30000) {
        const x = (R() * 2 - 1) * R0, y = (R() * 2 - 1) * R0;
        if (!inside(x, y, P2)) continue;
        let near = false; for (let i = 0; i < 5; i++) if (lineD(x, y, inner[i], inner[(i + 1) % 5]) < .06) near = true;
        if (near) continue;
        put(x, y, fc, 1.1, 1); k++;
      }
    });
    return fill(out, [P.slate, P.violet]);
  }
  function F_twins() {
    const L = brainPoints(3100, () => mix(P.slate, P.blue, .25), false).map(p => ({ ...tf(p, .56, -.8), s: .9, a: .75 }));
    const Rr = brainPoints(3100, (x, y) => [P.amber, P.gold, P.coral, P.pink][Math.floor(R() * 4)], false).map(p => ({ ...tf(p, .56, .8), s: 1 }));
    return fill(L.concat(Rr), [P.slate, P.amber]);
  }
  const F_protein = () => fill(beadChain(6300, 1.0, 0, rainbow), [P.slate, P.magenta]);

  /* stops: form, screen centre, scale, yaw, pitch, side (0 = text left / art right, 1 = text right / art left) */
  const STOPS = [
    { f: () => F_brain(false), cx: 1460, cy: 560, s: 170, yaw: -.3, pitch: .05, side: 0 },
    { f: () => F_brain(false), cx: 1425, cy: 570, s: 405, yaw: -.35, pitch: .08, side: 0 },
    { f: F_mri, cx: 480, cy: 545, s: 375, yaw: -.15, pitch: .1, side: 1 },
    { f: F_vessels, cx: 1450, cy: 545, s: 400, yaw: .4, pitch: .15, side: 0 },
    { f: F_pipeline, cx: 485, cy: 550, s: 290, yaw: .0, pitch: .12, side: 1 },
    { f: () => F_grid(-1.05, 'lenses'), cx: 1440, cy: 590, s: 450, yaw: .25, pitch: 0, side: 0 },
    { f: () => F_grid(-.25, 'dead'), cx: 480, cy: 545, s: 385, yaw: -.15, pitch: 0, side: 1 },
    { f: F_megaminx, cx: 1395, cy: 575, s: 380, yaw: .5, pitch: .4, side: 0 },
    { f: F_twins, cx: 500, cy: 560, s: 325, yaw: -.25, pitch: .08, side: 1 },
    { f: F_protein, cx: 1450, cy: 545, s: 450, yaw: .3, pitch: .25, side: 0 },
    { f: () => F_brain(true), cx: 500, cy: 575, s: 400, yaw: -.45, pitch: .1, side: 1 },
  ];
  const NSTOP = STOPS.length;

  /* background page: per section a coloured (never black) base + off-centre light blobs, mostly on the art side */
  const SECTIONS = [
    ['#10154A', [[.80, .32, .45, '#3D5BFF', .55], [.97, .86, .35, '#7B4DFF', .35], [.60, .93, .30, '#2FB8FF', .20]]],
    ['#150E3C', [[.84, .24, .42, '#7B4DFF', .55], [.99, .78, .38, '#E040C8', .40], [.58, .96, .30, '#3D5BFF', .22]]],
    ['#06293A', [[.20, .30, .45, '#16C8C0', .45], [.03, .84, .36, '#2E6BFF', .38], [.44, .08, .26, '#3FE0FF', .18]]],
    ['#260A33', [[.80, .30, .42, '#D0285E', .45], [.97, .86, .35, '#7B4DFF', .32], [.60, .97, .30, '#FF7A59', .16]]],
    ['#0D1848', [[.22, .28, .45, '#3D5BFF', .50], [.42, .86, .30, '#2EE6B6', .28], [.03, .92, .32, '#E89A2B', .22]]],
    ['#1B0F4C', [[.84, .22, .45, '#3A3AFF', .55], [.70, .82, .32, '#E040C8', .26], [.99, .62, .28, '#2FB8FF', .18]]],
    ['#0C1236', [[.20, .34, .42, '#C8389F', .42], [.04, .82, .36, '#7B4DFF', .32], [.46, .96, .24, '#3D5BFF', .16]]],
    ['#140A38', [[.86, .24, .44, '#5B3DFF', .34], [.98, .86, .36, '#C8389F', .26], [.62, .08, .25, '#2EE6B6', .14]]],
    ['#28122E', [[.20, .30, .42, '#F0A030', .36], [.04, .84, .35, '#FF7A59', .30], [.42, .97, .25, '#E040C8', .20]]],
    ['#082C3E', [[.84, .30, .45, '#2EE6B6', .40], [.98, .86, .35, '#E040C8', .30], [.62, .06, .26, '#3D5BFF', .18]]],
    ['#1B0E40', [[.20, .32, .45, '#FF5F9E', .40], [.04, .86, .35, '#F0A030', .30], [.44, .97, .30, '#7B4DFF', .28]]],
  ];

  /* ---------- WebGL ---------- */
  let SECT = [], lastSec = -9, drawCount = NP, gl = null, canvas = null, progBg, progPt, bufQuad, formBufs = [], swirlBuf, ok = false, U = {}, A = {};
  const VS_BG = 'attribute vec2 p; varying vec2 v; void main(){ v = p*.5+.5; gl_Position = vec4(p,0.,1.); }';
  const FS_BG = `precision highp float;
  varying vec2 v; uniform vec2 uRes; uniform float uScroll; uniform float uSide; uniform float uFree; uniform vec3 uObj;
  uniform vec4 uB[9]; uniform vec3 uBC[9]; uniform vec3 uBase[3]; uniform float uSec0;
  void main(){
    vec2 f = vec2(v.x, 1.-v.y);
    float asp = uRes.x/uRes.y, wy = f.y + uScroll, wd = wy + (f.x - .5)*.62;   // wd: page coordinate on a diagonal
    vec3 base = vec3(0.); float ws = 0.;
    for (int i=0;i<3;i++){ float d = wd-(uSec0+float(i)+.5); float w = exp(-d*d*3.); base += uBase[i]*w; ws += w; }
    base /= max(ws, 1e-4);
    float dg = clamp(f.x*.62 + (1.-f.y)*.38, 0., 1.);                       // diagonal shading, bottom-left -> top-right
    vec3 col = base * (.72 + .5*mix(dg, 1.-dg, uSide));                       // brighter towards the art side, never black
    for (int i=0;i<9;i++){
      vec4 b = uB[i]; float dy = wy - b.y;
      if (abs(dy) < 1.4){ vec2 d = vec2((f.x-b.x)*asp, dy*1.15); col += uBC[i]*exp(-dot(d,d)/(b.z*b.z))*b.w*.75; }
    }
    // calm, tinted (not black) zone under the text column
    vec2 od = (f*uRes - uObj.xy)/uObj.z; col *= 1. - .5*exp(-dot(od,od)*.9);   // dim stage behind the subject
    float xs = f.x + (f.y - .5)*.16*(1.-2.*uSide);                            // slanted edge (diagonal, not a vertical seam)
    float txt = mix(1.-smoothstep(.50,.66,xs), smoothstep(.34,.50,xs), uSide);   // covers the text column (x 112–936 / 984–1808)
    col = mix(col, base*.32 + vec3(.022,.022,.065), txt*.80*(1.-uFree));
    gl_FragColor = vec4(col, 1.);
  }`;
  const VS_PT = `precision highp float;
  attribute vec3 aPA; attribute vec3 aCA; attribute vec2 aSA;   // pos, colour, (size, alpha) of form A
  attribute vec3 aPB; attribute vec3 aCB; attribute vec3 aSB;   // ... of form B (+ flare)
  attribute vec4 aSw;                                           // swirl dir + seed
  uniform float uM, uYaw, uPitch, uTime, uSide, uDpr, uFree; uniform vec3 uCam; uniform vec2 uRes;
  varying vec3 vC; varying float vA;
  float inOut(float t){ return t < .5 ? 4.*t*t*t : 1. - pow(-2.*t+2., 3.)/2.; }
  void main(){
    float d = .26*(aSw.w*.4 + .6*clamp((aPA.x+1.4)/2.8, 0., 1.));
    float e = inOut(clamp((uM-d)/(1.-.26), 0., 1.));
    float bulge = sin(3.14159*e)*(.16+.2*aSw.w);
    vec3 p = mix(aPA, aPB, e) + aSw.xyz*bulge*vec3(1.,.7,1.);
    float cy = cos(uYaw), sy = sin(uYaw), cp = cos(uPitch), sp = sin(uPitch);
    float x1 = cy*p.x + sy*p.z, z1 = -sy*p.x + cy*p.z;
    float y2 = cp*p.y - sp*z1, z2 = sp*p.y + cp*z1;
    float per = 4.2/(4.2 - z2);
    vec2 px = vec2(uCam.x + x1*uCam.z*per, uCam.y - y2*uCam.z*per);
    gl_Position = vec4(px.x/uRes.x*2.-1., 1.-px.y/uRes.y*2., 0., 1.);
    float zone = mix(mix(smoothstep(960., 1110., px.x), 1.-smoothstep(810., 960., px.x), uSide), 1., uFree);   // nothing glows over text (free while travelling)
    float depth = clamp((z2+1.6)/3.2, 0., 1.);
    float tw = .82 + .18*sin(uTime*1.7 + aSw.w*40.);
    float flare = aSB.z*sin(3.14159*e)*2.2;
    vA = zone*(.5+.5*depth)*tw*mix(aSA.y, aSB.y + flare, e)*1.25;
    vC = mix(aCA, aCB, e);
    gl_PointSize = max((1.5 + 1.6*mix(aSA.x, aSB.x, e))*per*(uCam.z/330.)*2.7*uDpr, 2.6);
  }`;
  const FS_PT = `precision mediump float; varying vec3 vC; varying float vA;
  void main(){ vec2 q = gl_PointCoord*2.-1.; float r2 = dot(q,q); if (r2 > 1.) discard;
    float core = exp(-r2*9.), halo = exp(-r2*2.6)*.28;
    vec3 c = mix(vC, vec3(1.), core*.32);
    gl_FragColor = vec4(c*(core*1.15+halo)*vA, 1.); }`;

  function compile(vs, fs) {
    const mk = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p;
  }
  function buildForms() {
    const SW = new Float32Array(NP * 4);
    for (let i = 0; i < NP; i++) { const u = R() * 6.283, v = Math.acos(2 * R() - 1); SW.set([Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u), R()], i * 4); }
    swirlBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, swirlBuf); gl.bufferData(gl.ARRAY_BUFFER, SW, gl.STATIC_DRAW);
    // one shared random permutation keeps particle k paired across forms, and makes any prefix a uniform subset
    const PERM = Array.from({ length: NP }, (_, i) => i); for (let i = NP - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [PERM[i], PERM[j]] = [PERM[j], PERM[i]]; }
    formBufs = STOPS.map(st => {
      const pts = st.f().slice(0, NP);
      const sorted0 = pts.map(p => [p, Math.atan2(p.z, p.x) * .25 + p.y]).sort((a, b) => a[1] - b[1]).map(a => a[0]);
      const sorted = PERM.map(i => sorted0[i]);
      const arr = new Float32Array(NP * 9);
      sorted.forEach((p, i) => arr.set([p.x, p.y, p.z, p.c[0], p.c[1], p.c[2], p.s, p.a ?? 1, p.flare || 0], i * 9));
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); return b;
    });
  }
  function init(cv) {
    canvas = cv;
    gl = cv.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    if (!gl) return false;
    progBg = compile(VS_BG, FS_BG); progPt = compile(VS_PT, FS_PT);
    bufQuad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bufQuad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    for (const n of ['uRes', 'uScroll', 'uSide', 'uB', 'uBC', 'uBase', 'uSec0', 'uFree', 'uObj']) U['bg' + n] = gl.getUniformLocation(progBg, n);
    for (const n of ['uM', 'uYaw', 'uPitch', 'uTime', 'uSide', 'uDpr', 'uCam', 'uRes', 'uFree']) U['pt' + n] = gl.getUniformLocation(progPt, n);
    for (const n of ['aPA', 'aCA', 'aSA', 'aPB', 'aCB', 'aSB', 'aSw']) A[n] = gl.getAttribLocation(progPt, n);
    A.p = gl.getAttribLocation(progBg, 'p');
    // background constants
    gl.useProgram(progBg);
    SECT = SECTIONS.map(([base, blobs], k) => ({ base: hex(base), blobs: blobs.map(([x, y, r, c, w]) => [x, k + y, r, w, hex(c)]) }));
    buildForms();
    ok = true; return true;
  }
  const inOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  /* pos: 0..10 (fractional while travelling). time: seconds (0 in static captures) */
  function render(pos, time, dpr) {
    if (!ok) return;
    pos = clamp(pos, 0, NSTOP - 1);
    const k = Math.min(Math.floor(pos), NSTOP - 2), m = pos - k, a = STOPS[k], b = STOPS[k + 1], cm = inOut(clamp(m));
    const W = canvas.width, H = canvas.height, sc = W / 1920;
    gl.viewport(0, 0, W, H);
    const side = lerp(a.side, b.side, cm);
    // background
    gl.disable(gl.BLEND); gl.useProgram(progBg);
    const free = Math.sin(Math.PI * clamp(m)) * (a.side !== b.side ? 1 : .6);   // 0 at every stop
    gl.uniform2f(U.bguRes, W, H); gl.uniform1f(U.bguScroll, pos); gl.uniform1f(U.bguSide, side); gl.uniform1f(U.bguFree, free);
    gl.uniform3f(U.bguObj, lerp(a.cx, b.cx, cm) * sc, lerp(a.cy, b.cy, cm) * sc, lerp(a.s, b.s, cm) * sc * 1.25);
    // only the three page sections that can be on screen are sent (keeps the shader light)
    const s0 = Math.max(0, Math.min(SECT.length - 3, Math.floor(pos) - 1 + (pos - Math.floor(pos) > .5 ? 1 : 0)));
    if (s0 !== lastSec) { lastSec = s0;
      const B = new Float32Array(36), BC = new Float32Array(27), BASE = new Float32Array(9);
      for (let i = 0; i < 3; i++) { const S = SECT[s0 + i]; BASE.set(S.base, i * 3);
        S.blobs.forEach((b, j) => { B.set([b[0], b[1], b[2], b[3]], (i * 3 + j) * 4); BC.set(b[4], (i * 3 + j) * 3); }); }
      gl.uniform4fv(U.bguB, B); gl.uniform3fv(U.bguBC, BC); gl.uniform3fv(U.bguBase, BASE); gl.uniform1f(U.bguSec0, s0); }
    gl.bindBuffer(gl.ARRAY_BUFFER, bufQuad); gl.enableVertexAttribArray(A.p); gl.vertexAttribPointer(A.p, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.disableVertexAttribArray(A.p);
    // particles
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.useProgram(progPt);
    const sway = Math.sin(time * Math.PI * 2 / 9) * .16, drift = time * .02;
    gl.uniform1f(U.ptuM, m); gl.uniform1f(U.ptuYaw, lerp(a.yaw, b.yaw, cm) + sway + drift + pos * .12);
    gl.uniform1f(U.ptuPitch, lerp(a.pitch, b.pitch, cm) + Math.sin(time * .37) * .03);
    gl.uniform1f(U.ptuTime, time); gl.uniform1f(U.ptuSide, side); gl.uniform1f(U.ptuDpr, sc);
    gl.uniform3f(U.ptuCam, lerp(a.cx, b.cx, cm) * sc, lerp(a.cy, b.cy, cm) * sc, lerp(a.s, b.s, cm) * sc);
    gl.uniform2f(U.ptuRes, W, H); gl.uniform1f(U.ptuFree, free);
    const bindForm = (buf, P_, C_, S_, flare) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(P_); gl.vertexAttribPointer(P_, 3, gl.FLOAT, false, 36, 0);
      gl.enableVertexAttribArray(C_); gl.vertexAttribPointer(C_, 3, gl.FLOAT, false, 36, 12);
      gl.enableVertexAttribArray(S_); gl.vertexAttribPointer(S_, flare ? 3 : 2, gl.FLOAT, false, 36, 24);
    };
    bindForm(formBufs[k], A.aPA, A.aCA, A.aSA, false);
    bindForm(formBufs[k + 1], A.aPB, A.aCB, A.aSB, true);
    gl.bindBuffer(gl.ARRAY_BUFFER, swirlBuf); gl.enableVertexAttribArray(A.aSw); gl.vertexAttribPointer(A.aSw, 4, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, drawCount);
  }
  /* quality 0 = full (7 000), 1 = 4 800, 2 = 3 200 particles: used by the engine's automatic laptop fallback */
  function setQuality(q) { drawCount = [NP, 6500, 4000][Math.max(0, Math.min(2, q))]; }
  window.ART = { init, render, setQuality, stops: NSTOP, sides: STOPS.map(s => s.side), get ok() { return ok; }, get particles() { return drawCount; } };
})();
