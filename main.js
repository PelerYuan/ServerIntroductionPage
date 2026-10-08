(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- config ---------- */
  // TODO: set to the real moment the server last came online.
  const ONLINE_SINCE = new Date('2025-12-01T00:00:00+11:00');

  const NODES = {
    cf: ['EDGE', 'Home public IPv4', 'The way in from outside: my home has its own public IPv4 address.'],
    frp: ['VM · NAT TRAVERSAL', 'PelerFRP — frpc', 'FRP client giving LAN devices and VMs NAT traversal, so they can be reached from outside.'],
    server: ['VM · APPLICATIONS', 'PelerServer — Docker host', 'Ubuntu host running Docker services: media, ebooks and manga.'],
    computing: ['VM · COMPUTE', 'PelerComputing — Windows with GPU', 'Windows with GPU passthrough: remote Autodesk Fusion from a MacBook Air, and game streaming when idle.'],
    storage: ['VM · STORAGE', 'PelerStorage — OpenMediaVault', 'OMV-based NAS, providing NFS storage for VM expansion.'],
    agent: ['VM · WORKSPACE', 'PelerAgent — free space for agents', 'Free workspace for agents like Claude Code and Codex, for remote and background development.']
  };

  /* ---------- progress, nav, glow ---------- */
  const bar = $('#progress'), nav = $('#nav'), glow = $('#glow');
  const onScroll = () => {
    const h = document.documentElement;
    bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100 || 0) + '%';
    nav.classList.toggle('scrolled', h.scrollTop > 10);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  if (!reduce && matchMedia('(pointer:fine)').matches) {
    let x = innerWidth / 2, y = innerHeight / 3, raf;
    addEventListener('pointermove', e => {
      x = e.clientX; y = e.clientY;
      raf ||= requestAnimationFrame(() => { glow.style.transform = `translate(${x}px,${y}px)`; raf = 0; });
    });
    $$('.vm').forEach(c => c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', e.clientX - r.left + 'px');
      c.style.setProperty('--my', e.clientY - r.top + 'px');
    }));
  }

  const links = $$('.nav__links a');
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.hash === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => spy.observe(s));

  /* ---------- reveal ---------- */
  $$('.reveal').forEach((el, i) => {
    const sib = [...el.parentElement.children].filter(c => c.classList.contains('reveal')).indexOf(el);
    el.style.setProperty('--d', Math.min(sib, 5) * 0.07 + 's');
  });
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    $$('.bar', e.target).forEach(b => b.classList.add('in'));
    $$('[data-count]', e.target).forEach(countUp);
    if (e.target.classList.contains('bar')) e.target.classList.add('in');
    io.unobserve(e.target);
  }), { threshold: .12 });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- count up ---------- */
  function countUp(el) {
    if (el.dataset.done) return; el.dataset.done = 1;
    const to = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0, suf = el.dataset.suffix || '';
    if (reduce) { el.textContent = to.toFixed(dec) + suf; return; }
    const t0 = performance.now(), dur = 1400;
    const tick = t => {
      const p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = (to * e).toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- uptime ---------- */
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const ud = $('#u-d'), uh = $('#u-h'), um = $('#u-m'), us = $('#u-s');
  const upd = () => {
    let s = Math.max(0, Math.floor((Date.now() - ONLINE_SINCE) / 1000));
    ud.textContent = pad(Math.floor(s / 86400), 3); s %= 86400;
    uh.textContent = pad(Math.floor(s / 3600)); s %= 3600;
    um.textContent = pad(Math.floor(s / 60));
    us.textContent = pad(s % 60);
  };
  upd(); setInterval(upd, 1000);

  /* ---------- boot log ---------- */
  const boot = $('#boot');
  const lines = [
    '$ systemctl status homelab',
    '[  <span class="ok">OK</span>  ] Proxmox VE host online',
    '[  <span class="ok">OK</span>  ] Started PelerFRP       (frpc)',
    '[  <span class="ok">OK</span>  ] Started PelerStorage   (OMV · NFS)',
    '[  <span class="ok">OK</span>  ] Started PelerServer    (Docker)',
    '[  <span class="ok">OK</span>  ] Started PelerComputing (Windows)',
    '[  <span class="ok">OK</span>  ] Started PelerAgent     (agents)'
  ];
  if (reduce) boot.innerHTML = lines.join('\n');
  else {
    let i = 0;
    (function next() {
      boot.innerHTML = lines.slice(0, ++i).join('\n') + (i < lines.length ? '<span class="caret"></span>' : '');
      if (i < lines.length) setTimeout(next, i === 1 ? 500 : 340);
    })();
  }

  /* ---------- topology linkage ---------- */
  const tp = { k: $('#tp-kicker'), t: $('#tp-title'), b: $('#tp-body') };
  const targets = id => $$(`[data-node="${id}"]`);
  const show = id => {
    const d = NODES[id]; if (!d) return;
    [tp.k.textContent, tp.t.textContent, tp.b.textContent] = d;
    $$('.hl').forEach(n => n.classList.remove('hl'));
    targets(id).forEach(n => n.classList.add('hl'));
  };
  const clear = () => $$('.hl').forEach(n => n.classList.remove('hl'));
  $$('[data-node]').forEach(n => {
    const id = n.dataset.node;
    n.addEventListener('mouseenter', () => show(id));
    n.addEventListener('focus', () => show(id));
    if (n.closest('.vm')) n.addEventListener('mouseleave', clear);
  });
  show('frp');

  /* ---------- lightbox ---------- */
  const lb = $('#lightbox'), lbImg = $('img', lb);
  let lastFocus;
  const closeLb = () => { lb.hidden = true; lbImg.removeAttribute('src'); lastFocus && lastFocus.focus(); };
  $$('.shot').forEach(b => b.addEventListener('click', () => {
    lastFocus = b; lbImg.src = b.dataset.full; lbImg.alt = $('img', b).alt; lb.hidden = false; $('.lightbox__close', lb).focus();
  }));
  lb.addEventListener('click', closeLb);
  addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeLb(); });

  $('#year').textContent = new Date().getFullYear();
})();
