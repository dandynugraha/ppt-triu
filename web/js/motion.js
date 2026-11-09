/* Builds (WAAPI) and finish-on-input. Every animation started through M.anim() is tracked so a new input
   can call M.finishAll() and continue immediately (PRD §5.1 "never blocking"). */
(function () {
  const q = new URLSearchParams(location.search);
  const STATIC = q.has('static') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const running = new Set();
  const EASE = 'cubic-bezier(0.2, 0, 0, 1)';

  function anim(el, frames, opts) {
    if (!el) return null;
    if (STATIC) { // jump to the end state
      const last = frames[frames.length - 1];
      for (const k in last) if (k !== 'offset' && k !== 'easing') el.style[k] = last[k];
      return null;
    }
    const a = el.animate(frames, Object.assign({ easing: EASE, fill: 'both' }, opts));
    running.add(a);
    const done = () => { running.delete(a); };
    a.onfinish = done; a.oncancel = done;
    return a;
  }

  function finishAll() {
    for (const a of Array.from(running)) { try { a.finish(); } catch (e) { /* ignore */ } }
    running.clear();
  }

  // commit end state and drop the fill so later style changes win
  function settle(el) {
    if (!el || !el.getAnimations) return;
    for (const a of el.getAnimations()) { try { a.commitStyles(); } catch (e) {} a.cancel(); }
  }

  function show(el, i, kind) {
    el.classList.remove('hid');
    if (kind === 'draw' && el.getTotalLength) {
      const L = el.getTotalLength();
      el.style.strokeDasharray = L; el.style.strokeDashoffset = 0;
      return anim(el, [{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 350, delay: i * 30 });
    }
    return anim(el, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 200, delay: i * 30 });
  }
  function hideNow(el) {
    for (const a of el.getAnimations ? el.getAnimations() : []) a.cancel();
    el.classList.add('hid'); el.style.opacity = ''; el.style.transform = '';
  }

  window.M = { STATIC, EASE, anim, finishAll, settle, show, hideNow, running };
})();
