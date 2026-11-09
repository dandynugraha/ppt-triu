/* Scroll mode (?mode=scroll): the talk as one long page. Each slide shows its final build state;
   the living motion runs for the slide that is at least 60 % visible. Opening slides are skipped. */
(function () {
  if (new URLSearchParams(location.search).get('mode') !== 'scroll') return;
  const D = window.DECK, stage = document.getElementById('stage');
  document.documentElement.classList.add('scroll');
  D.S.forEach(s => { if (s.opening) s.el.style.display = 'none'; s.el.classList.add('on'); });
  const fit = () => { stage.style.transform = `scale(${innerWidth / 1920})`; stage.style.height = (D.S.filter(s => !s.opening).length * 1080) + 'px'; document.body.style.height = (stage.getBoundingClientRect().height) + 'px'; };
  removeEventListener('resize', D.fit); addEventListener('resize', fit); fit();
  let cur = null;
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting && e.intersectionRatio >= 0.6) {
      const s = D.S.find(x => x.el === e.target);
      if (s && s !== cur) { if (cur) LIVE.leave(cur); cur = s; LIVE.enter(s, s.steps, true); history.replaceState(null, '', `?mode=scroll#s=${s.id}`); }
    }
  }, { threshold: [0.6] });
  D.S.forEach(s => { if (!s.opening) io.observe(s.el); });
})();
