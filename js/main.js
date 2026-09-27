/* ============================================================
   OPAL LAND — main scripts (v3 — pixel particles, robust status)
   ============================================================ */
(function () {
  'use strict';

  const reduceMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduceMotion = reduceMotionMQ.matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  /* ----------------------------------------------------------
     Shared rAF-throttled scroll dispatcher
     ---------------------------------------------------------- */
  const scrollHandlers = [];
  const onScrollTick = () => {
    for (let i = 0; i < scrollHandlers.length; i++) scrollHandlers[i]();
  };
  window.addEventListener('scroll', onScrollTick, { passive: true });
  const onScroll = (fn) => { scrollHandlers.push(fn); fn(); };

  /* ---------- copy IP ---------- */
  document.querySelectorAll('[data-ip]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ip = btn.dataset.ip;
      try {
        await navigator.clipboard.writeText(ip);
      } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = ip;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) { /* ignore */ }
        ta.remove();
      }

      const textEl = btn.querySelector('.copy-text');
      const original = textEl ? textEl.textContent : btn.textContent;

      btn.classList.add('ok');
      if (textEl) textEl.textContent = 'Скопировано! ';
      else btn.textContent = 'Скопировано! ';

      clearTimeout(btn._copyTimer);
      btn._copyTimer = setTimeout(() => {
        btn.classList.remove('ok');
        if (textEl) textEl.textContent = original;
        else btn.textContent = original;
      }, 1800);
    });
  });

  /* ---------- live server status (mcsrvstat.us API) ----------
     Retries up to 3 times with 15s timeout each, because the API
     has bot protection that can return false "offline" on first hit. */
  function plural(n, one, few, many) {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }

  async function fetchStatus() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch('https://api.mcsrvstat.us/3/opalland.20tps.ru', {
        signal: controller.signal
      });
      if (!res.ok) throw new Error('status api error');
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  (async function initServerStatus() {
    const el = document.getElementById('serverStatus');
    if (!el) return;
    const dot = el.querySelector('.status-dot');
    const text = el.querySelector('.status-text');
    if (!dot || !text) return;

    const fail = () => {
      dot.classList.remove('status-dot-loading');
      text.textContent = 'opalland.20tps.ru · Java 1.21+';
    };

    let data = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        data = await fetchStatus();
        break;
      } catch (err) {
        if (attempt < 2) {
          // wait before retry: 1.5s, 3s
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
        }
      }
    }

    if (!data) { fail(); el.setAttribute('data-ready', 'true'); return; }

    if (data.online) {
      el.classList.add('is-online');
      dot.classList.remove('status-dot-loading');
      dot.classList.add('status-dot-online');
      const players = data.players ? data.players.online : 0;
      text.textContent = '';
      if (players > 0) {
        text.append('Сервер онлайн — ');
        const span = document.createElement('span');
        span.className = 'status-players';
        span.textContent = String(players);
        text.append(span, ' ' + plural(players, 'игрок', 'игрока', 'игроков'));
      } else {
        text.textContent = 'Сервер онлайн';
      }
    } else {
      dot.classList.remove('status-dot-loading');
      dot.classList.add('status-dot-offline');
      text.textContent = 'Сервер сейчас offline';
    }
    el.setAttribute('data-ready', 'true');
  })();

  /* ---------- scroll progress bar (GPU: scaleX, no layout) ---------- */
  const progressBar = document.getElementById('scrollProgress');
  if (progressBar) {
    let maxScroll = 1;
    const measure = () => {
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    };
    onScroll(() => {
      const pct = Math.min(1, window.scrollY / maxScroll);
      progressBar.style.transform = `scaleX(${pct})`;
    });
    window.addEventListener('resize', () => { measure(); onScrollTick(); }, { passive: true });
    if (document.fonts) document.fonts.ready.then(() => { measure(); onScrollTick(); });
    measure();
  }

  /* ---------- active nav link on scroll ---------- */
  (function initActiveNav() {
    const links = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
    if (!links.length) return;
    const sections = links
      .map(l => document.querySelector(l.getAttribute('href')))
      .filter(Boolean);
    if (!sections.length) return;

    let currentId = null;
    onScroll(() => {
      const probe = window.scrollY + window.innerHeight * 0.35;
      let active = sections[0];
      for (let i = 0; i < sections.length; i++) {
        if (sections[i].offsetTop <= probe) active = sections[i];
      }
      if (active.id === currentId) return;
      currentId = active.id;
      for (let i = 0; i < links.length; i++) {
        links[i].classList.toggle('active', links[i].getAttribute('href') === '#' + currentId);
      }
    });
  })();

  /* ---------- scroll reveal ----------
     Uses CSS animation, not transition, so reveal never
     overrides the hover transitions declared on cards. */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* ---------- staggered reveal for grids ---------- */
  ['.features', '.rules-grid', '.steps', '.services-grid', '.contacts', '.faq-list']
    .forEach(sel => {
      document.querySelectorAll(sel).forEach(grid => {
        Array.from(grid.children).forEach((child, i) => {
          child.style.setProperty('--reveal-delay', Math.min(i * 70, 420) + 'ms');
        });
      });
    });

  /* ---------- nav background on scroll ---------- */
  const nav = document.getElementById('nav');
  if (nav) {
    onScroll(() => {
      nav.classList.toggle('nav-scrolled', window.scrollY > 50);
    });
  }

  /* ---------- nav hide-on-scroll-down / show-on-up ---------- */
  if (nav && !reduceMotion) {
    let lastY = window.scrollY;
    onScroll(() => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 6) return;
      const goingDown = y > lastY;
      nav.classList.toggle('nav-hidden', goingDown && y > 420);
      lastY = y;
    });
  }

  /* ---------- mobile nav ---------- */
  const burger = document.getElementById('navBurger');
  const menu = document.getElementById('navMenu');
  if (burger && menu) {
    const closeMenu = () => {
      menu.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    };
    burger.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
    });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
    document.addEventListener('click', (e) => {
      if (!menu.classList.contains('open')) return;
      if (!menu.contains(e.target) && !burger.contains(e.target)) closeMenu();
    });
  }

  /* ---------- smooth anchor scroll ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  /* ---------- scroll to top ---------- */
  const scrollTopBtn = document.getElementById('scrollTop');
  if (scrollTopBtn) {
    onScroll(() => {
      scrollTopBtn.classList.toggle('visible', window.scrollY > 600);
    });
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- gentle parallax for background ---------- */
  (function initParallax() {
    const sky = document.querySelector('.sky-layer');
    if (!sky || reduceMotion) return;

    let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
    let rafId = null, active = true;

    function tick() {
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;
      sky.style.transform = `translate3d(${currentX * 10}px, ${currentY * 5}px, 0)`;
      if (Math.abs(targetX - currentX) < 0.001 && Math.abs(targetY - currentY) < 0.001) {
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(tick);
    }

    window.addEventListener('mousemove', (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
      if (active && rafId === null) rafId = requestAnimationFrame(tick);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      active = !document.hidden;
      if (active && rafId === null) rafId = requestAnimationFrame(tick);
      if (!active && rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    });
  })();

  /* ----------------------------------------------------------
     Pixel-art Minecraft particles — cherry petals, hearts, XP orbs
     No external images. Canvas with image-rendering:pixelated.
     ---------------------------------------------------------- */
  (function initParticles() {
    const canvas = document.getElementById('particles');
    if (!canvas || reduceMotion) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = 0, height = 0, dpr = 1;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Snap to pixel grid for crisp pixel art
      ctx.imageSmoothingEnabled = false;
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const rand = (a, b) => a + Math.random() * (b - a);
    const snap = (v, s) => Math.round(v / s) * s;

    /* Pixel shape definitions (each is a small grid) */
    // Cherry blossom petal — 5×5 diamond-ish
    const PETAL = [
      '..1..',
      '.121.',
      '12321',
      '.121.',
      '..1..',
    ];
    const PETAL_COLORS = { '1': '#ffb7c5', '2': '#ffd1dc', '3': '#fff0f5' };

    // MC heart — 7×6
    const HEART = [
      '.11.11.',
      '1221221',
      '1222221',
      '.12221.',
      '..121..',
      '...1...',
    ];
    const HEART_COLORS = { '1': '#ff6b8a', '2': '#ff9eb5' };

    // XP orb — 5×5 glowing green
    const ORB = [
      '..1..',
      '.121.',
      '12321',
      '.121.',
      '..1..',
    ];
    const ORB_COLORS = { '1': '#4ade80', '2': '#86efac', '3': '#d1fae5' };

    // Small pink block (like a dropped item)
    const BLOCK = [
      '111',
      '121',
      '111',
    ];
    const BLOCK_COLORS = { '1': '#ff9eb5', '2': '#ffd1dc' };

    const SHAPES = [
      { grid: PETAL, colors: PETAL_COLORS, weight: 40 },
      { grid: HEART, colors: HEART_COLORS, weight: 15 },
      { grid: ORB, colors: ORB_COLORS, weight: 25 },
      { grid: BLOCK, colors: BLOCK_COLORS, weight: 20 },
    ];

    function pickShape() {
      const total = SHAPES.reduce((s, sh) => s + sh.weight, 0);
      let r = Math.random() * total;
      for (const sh of SHAPES) {
        r -= sh.weight;
        if (r <= 0) return sh;
      }
      return SHAPES[0];
    }

    function drawPixelGrid(grid, colors, px) {
      const rows = grid.length;
      const cols = grid[0].length;
      const ox = -(cols * px) / 2;
      const oy = -(rows * px) / 2;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const ch = grid[y][x];
          if (ch === '.') continue;
          ctx.fillStyle = colors[ch];
          ctx.fillRect(ox + x * px, oy + y * px, px, px);
        }
      }
    }

    class Particle {
      constructor() { this.reset(true); }
      reset(randomY) {
        this.x = Math.random() * width;
        this.y = randomY ? Math.random() * height : rand(-40, -10);
        this.shape = pickShape();
        this.px = rand(2, 4); // pixel size
        this.speed = rand(0.3, 0.9);
        this.sway = rand(0.3, 1.2);
        this.swaySpeed = rand(0.005, 0.015);
        this.angle = Math.random() * Math.PI * 2;
        this.rotation = 0;
        this.rotationSpeed = rand(-0.008, 0.008);
        this.opacity = rand(0.35, 0.85);
        this.twinkle = Math.random() * Math.PI * 2;
        this.twinkleSpeed = rand(0.02, 0.05);
      }
      update() {
        this.y += this.speed;
        this.angle += this.swaySpeed;
        this.x += Math.sin(this.angle) * this.sway;
        this.rotation += this.rotationSpeed;
        this.twinkle += this.twinkleSpeed;
        // Recycle once off-screen, and keep everything inside the
        // current viewport after a resize
        if (this.y > height + 30) this.reset(false);
        if (this.x < -40) this.x = width + 20;
        else if (this.x > width + 40) this.x = -20;
      }
      draw() {
        const flicker = 0.85 + 0.15 * Math.sin(this.twinkle);
        ctx.save();
        ctx.globalAlpha = this.opacity * flicker;
        ctx.translate(snap(this.x, this.px), snap(this.y, this.px));
        // Snap rotation to 45° steps for pixel feel
        const snappedRot = Math.round(this.rotation / (Math.PI / 4)) * (Math.PI / 4);
        ctx.rotate(snappedRot);
        drawPixelGrid(this.shape.grid, this.shape.colors, this.px);
        ctx.restore();
      }
    }

    // Scale particle count with viewport area so small screens
    // don't get crowded and idle phones stay cool
    const area = window.innerWidth * window.innerHeight;
    const count = Math.min(coarsePointer ? 12 : 22, Math.max(7, Math.round(area / 48000)));
    const particles = Array.from({ length: count }, () => new Particle());

    let rafId = null;
    function loop() {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }
      rafId = requestAnimationFrame(loop);
    }
    function start() { if (rafId === null) loop(); }
    function stop() { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }

    start();

    // Only pause when tab is hidden (canvas is fixed, always visible)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });
  })();

  /* ----------------------------------------------------------
     Lightweight tilt-glow on cards (pointer devices only)
     ---------------------------------------------------------- */
  if (!coarsePointer && !reduceMotion) {
    const cards = document.querySelectorAll('.feature-card, .rule-card, .contact-card, .service-card, .donate-card');
    cards.forEach(card => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const mx = ((e.clientX - r.left) / r.width) * 100;
        const my = ((e.clientY - r.top) / r.height) * 100;
        card.style.setProperty('--mx', mx + '%');
        card.style.setProperty('--my', my + '%');
      }, { passive: true });
    });
  }

})();