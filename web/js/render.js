/* Renderer: draws one PowerPoint slide (from web/data/deck.js) as positioned HTML/SVG, 1 pt = 2 px.
   Every top-level shape becomes one element carrying its PowerPoint name, so Morph can pair them. */
(function () {
  const SVG = 'http://www.w3.org/2000/svg';
  const mk = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; };
  const sv = (tag, attrs, parent) => { const e = document.createElementNS(SVG, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  let markerN = 0;

  function geomSVG(s, svg) {
    const g = s.geom || { prst: 'rect', adj: {} }, w = s.w, h = s.h, L = s.line, out = [];
    const style = (el, fillOK = true) => {
      el.setAttribute('fill', fillOK && s.fill ? s.fill : 'none');
      if (s.fillA != null) el.setAttribute('fill-opacity', s.fillA);
      if (L) {
        el.setAttribute('stroke', L.c); el.setAttribute('stroke-width', L.w);
        if (L.a < 1) el.setAttribute('stroke-opacity', L.a);
        if (L.dash) el.setAttribute('stroke-dasharray', `${4 * L.w} ${3 * L.w}`);
        el.setAttribute('stroke-linejoin', 'round');
        for (const end of ['headEnd', 'tailEnd']) if (L[end]) {
          const id = 'mk' + (++markerN);
          const m = sv('marker', { id, viewBox: '0 0 10 10', refX: 5, refY: 5, markerWidth: 4, markerHeight: 4, orient: 'auto-start-reverse' }, svg);
          sv('path', { d: 'M0,0 L10,5 L0,10 z', fill: L.c }, m);
          el.setAttribute(end === 'tailEnd' ? 'marker-end' : 'marker-start', `url(#${id})`);
        }
      } else el.setAttribute('stroke', 'none');
      return el;
    };
    if (g.cust) {
      for (const p of g.cust) {
        const sx = p.w ? w / p.w : 1, sy = p.h ? h / p.h : 1;
        const d = p.d.map(c => c[0] + ' ' + c.slice(1).map(([x, y]) => `${(x * sx).toFixed(2)},${(y * sy).toFixed(2)}`).join(' ')).join(' ');
        const el = style(sv('path', { d }, svg), p.fill);
        if (!p.stroke) el.setAttribute('stroke', 'none');
      }
      return;
    }
    const ss = Math.min(w, h), a = g.adj || {};
    switch (g.prst) {
      case 'ellipse': style(sv('ellipse', { cx: w / 2, cy: h / 2, rx: w / 2, ry: h / 2 }, svg)); break;
      case 'roundRect': { const r = ss * (a.adj != null ? a.adj : 16667) / 100000; style(sv('rect', { x: 0, y: 0, width: w, height: h, rx: r, ry: r }, svg)); break; }
      case 'hexagon': { const x1 = ss * (a.adj != null ? a.adj : 25000) / 100000; style(sv('polygon', { points: `0,${h / 2} ${x1},0 ${w - x1},0 ${w},${h / 2} ${w - x1},${h} ${x1},${h}` }, svg)); break; }
      case 'diamond': style(sv('polygon', { points: `${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}` }, svg)); break;
      default: style(sv('rect', { x: 0, y: 0, width: w, height: h }, svg));
    }
  }

  function textDiv(s, box) {
    const T = s.text, d = mk('div', 'tx', box);
    Object.assign(d.style, { paddingLeft: T.ins.lIns + 'px', paddingRight: T.ins.rIns + 'px', paddingTop: T.ins.tIns + 'px', paddingBottom: T.ins.bIns + 'px',
      justifyContent: T.anchor === 'ctr' ? 'center' : T.anchor === 'b' ? 'flex-end' : 'flex-start', whiteSpace: T.wrap ? 'normal' : 'nowrap' });
    for (const p of T.paras) {
      const pe = mk('p', null, d);
      pe.style.textAlign = { l: 'left', ctr: 'center', r: 'right', just: 'justify' }[p.align] || 'left';
      if (p.spaceAfter) pe.style.marginBottom = p.spaceAfter + 'px';
      const lh = 1.17 * (p.lineSpacing || 1);
      if (!p.runs.length) { pe.style.fontSize = (p.empty || 36) + 'px'; pe.style.lineHeight = lh; pe.innerHTML = '&nbsp;'; continue; }
      let maxSz = 0;
      for (const r of p.runs) {
        if (r.br) { mk('br', null, pe); continue; }
        const sp = mk('span', null, pe);
        sp.textContent = r.t;
        maxSz = Math.max(maxSz, r.sz);
        Object.assign(sp.style, { fontSize: r.sz + 'px', fontWeight: r.b ? 700 : 400, fontStyle: r.i ? 'italic' : 'normal', color: r.c });
        if (/Leelawadee/.test(r.font)) sp.className = 'thai';
      }
      pe.style.fontSize = maxSz + 'px'; pe.style.lineHeight = lh;
    }
    return d;
  }

  function picEl(s, box) {
    const im = mk('img', null, box);
    im.src = s.src; im.alt = s.name.replace(/^!!/, ''); im.draggable = false;
    placeImg(s, im, s.w, s.h);
    if (s.alpha != null) box.style.opacity = s.alpha;
    return im;
  }
  // image rect inside its (cropped) frame
  function imgRect(s, w, h) {
    const c = s.crop || { l: 0, t: 0, r: 0, b: 0 };
    const iw = w / (1 - c.l - c.r), ih = h / (1 - c.t - c.b);
    return { x: -c.l * iw, y: -c.t * ih, w: iw, h: ih };
  }
  function placeImg(s, im, w, h) { const r = imgRect(s, w, h); Object.assign(im.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }); }

  function shapeEl(s, parent, map, ox = 0, oy = 0, k = 1) {
    const box = mk('div', 'shp k-' + s.kind, parent);
    const x = (s.x - ox) * k, y = (s.y - oy) * k, w = s.w * k, h = s.h * k;
    Object.assign(box.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    const tf = [];
    if (s.rot) tf.push(`rotate(${s.rot}deg)`);
    if (s.flipH || s.flipV) tf.push(`scale(${s.flipH ? -1 : 1},${s.flipV ? -1 : 1})`);
    box.dataset.base = tf.join(' ');
    if (tf.length) box.style.transform = box.dataset.base;
    box.dataset.name = s.name; box.dataset.id = s.id;
    map.byId.set(s.id, box);
    if (s.kind === 'grp') {
      const kk = s.ch && s.ch.w ? (s.w / s.ch.w) : 1;
      for (const c of s.kids) shapeEl(c, box, map, s.ch ? s.ch.x : s.x, s.ch ? s.ch.y : s.y, k * kk);
    } else if (s.kind === 'pic') picEl(s, box);
    else {
      if (s.fill || s.line) {
        // zero-width/height shapes (straight lines) cannot use a viewBox: draw them unscaled
        const flat = !(s.w > 0.01 && s.h > 0.01);
        const svg = flat ? sv('svg', { width: Math.max(w, 1), height: Math.max(h, 1), overflow: 'visible' }, box)
          : sv('svg', { width: w, height: h, viewBox: `0 0 ${s.w} ${s.h}`, overflow: 'visible', preserveAspectRatio: 'none' }, box);
        geomSVG(s, svg);
      }
      if (s.text) textDiv(s, box);
    }
    return box;
  }

  function renderSlide(data, label) {
    const sec = mk('section', 'slide');
    sec.dataset.label = label;
    const map = { byId: new Map(), top: [], model: new Map() };
    for (const s of data.shapes) {
      const el = shapeEl(s, sec, map);
      map.top.push({ s, el });
    }
    // shapes that enter on a click start hidden
    data.steps.forEach((st, k) => st.forEach(e => { const el = map.byId.get(e.id); if (el) { el.classList.add('bld'); el.dataset.step = k + 1; } }));
    return { el: sec, map };
  }

  const textOf = (s) => (s.text ? s.text.paras.map(p => p.runs.map(r => r.t || '').join('')).join('\n') : '');
  window.RENDER = { renderSlide, imgRect, placeImg, textOf };
})();
