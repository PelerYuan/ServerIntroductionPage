(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* reading progress */
  const bar = $('#progress');
  const onScroll = () => {
    const h = document.documentElement;
    bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100 || 0) + '%';
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* cursor glow (same as the overview page) */
  const glow = $('#glow');
  if (!reduce && matchMedia('(pointer:fine)').matches) {
    let raf;
    addEventListener('pointermove', e => {
      raf ||= requestAnimationFrame(() => { glow.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; raf = 0; });
    });
  }

  /* reveal */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .08 });
  $$('.reveal').forEach(el => io.observe(el));
  $$('.prose > *').forEach(el => { el.classList.add('reveal'); io.observe(el); });

  /* contents scroll-spy */
  const links = $$('.toc a');
  const heads = $$('.prose h2');
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.hash === '#' + e.target.id));
  }), { rootMargin: '-10% 0px -62% 0px' });
  heads.forEach(h => spy.observe(h));

  /* lightbox */
  const lb = $('#lightbox'), lbImg = $('img', lb);
  let last;
  const close = () => { lb.hidden = true; lbImg.removeAttribute('src'); last && last.focus && last.focus(); };
  $$('.post-cover img, .prose .photo img, .prose .diagram img').forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => { last = img; lbImg.src = img.currentSrc || img.src; lbImg.alt = img.alt; lb.hidden = false; });
  });
  lb.addEventListener('click', close);
  addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) close(); });

  $('#year').textContent = new Date().getFullYear();
})();
