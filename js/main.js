/* ============================================================
   OPAL LAND — main scripts (optimized)
   ============================================================ */
(function () {
  'use strict';

  const reduceMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduceMotion = reduceMotionMQ.matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  /* ----------------------------------------------------------
     Shared rAF-throttled scroll dispatcher
     (one listener instead of four; work runs at most once/frame)
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

  /* ---------- live server status (mcsrvstat.us API) ---------- */
  function plural(n, one, few, many) {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }

  (async function initServerStatus() {
    const el = document.getElementById('serverStatus');
    if (!el) return;
    const dot = el.querySelector('.status-dot');
    const text = el.querySelector('.status-text');
    if (!dot || !text) return;

    const fail = () => {
      dot.classList.remove('status-dot-loading');
      text.textContent = 'opal.cubzx.xyz · Java 1.21+';
    };

    // Abort if the API does not answer in time
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch('https://api.mcsrvstat.us/3/opal.cubzx.xyz', {
        signal: controller.signal
      });
      if (!res.ok) throw new Error('status api error');
      const data = await res.json();

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
    } catch (err) {
      fail();
    } finally {
      clearTimeout(timer);
      el.setAttribute('data-ready', 'true');
    }
  })();

  /* ---------- scroll progress bar ---------- */
  const progressBar = document.getElementById('scrollProgress');
  if (progressBar) {
    let maxScroll = 1;
    const measure = () => {
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    };
    onScroll(() => {
      const pct = Math.min(100, (window.scrollY / maxScroll) * 100);
      progressBar.style.width = pct + '%';
    });
    window.addEventListener('resize', () => { measure(); onScrollTick(); }, { passive: true });
    document.fonts && document.fonts.ready.then(() => { measure(); onScrollTick(); });
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

  /* ---------- scroll reveal ---------- */
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
          child.style.transitionDelay = Math.min(i * 70, 420) + 'ms';
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

    window.addEventListener('mousemove', (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

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

    window.addEventListener('mousemove', () => {
      if (active && rafId === null) rafId = requestAnimationFrame(tick);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      active = !document.hidden;
      if (active && rafId === null) rafId = requestAnimationFrame(tick);
      if (!active && rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    });
  })();

  /* ----------------------------------------------------------
     Falling petals — drawn on canvas (no external images)
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
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const TYPES = ['petal', 'petal', 'heart', 'spark', 'leaf'];
    const PALETTE = [
      ['#ffd1dc', '#ffb7c5'],
      ['#ffe3ec', '#ff9eb5'],
      ['#ffffff', '#ffc8d8'],
      ['#e3d4ff', '#c9a8ff'],
      ['#d6f7e6', '#b7f0d4'],
    ];

    const rand = (a, b) => a + Math.random() * (b - a);

    class Particle {
      constructor() { this.reset(true); }
      reset(randomY) {
        this.x = Math.random() * width;
        this.y = randomY ? Math.random() * height : rand(-60, -10);
        this.size = rand(8, 18);
        this.speed = rand(0.35, 1.05);
        this.sway = rand(0.4, 1.6);
        this.swaySpeed = rand(0.006, 0.02);
        this.angle = Math.random() * Math.PI * 2;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = rand(-0.012, 0.012);
        this.opacity = rand(0.25, 0.7);
        this.type = TYPES[(Math.random() * TYPES.length) | 0];
        const pal = PALETTE[(Math.random() * PALETTE.length) | 0];
        this.fill = pal[1];
        this.hi = pal[0];
      }
      update() {
        this.y += this.speed;
        this.angle += this.swaySpeed;
        this.rotation += this.rotationSpeed;
        this.x += Math.sin(this.angle) * this.sway;
        if (this.y > height + 40) this.reset(false);
      }
      draw() {
        const s = this.size;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        if (this.type === 'heart') {
          const k = s / 16;
          ctx.beginPath();
          ctx.moveTo(0, 4 * k);
          ctx.bezierCurveTo(-9 * k, -3 * k, -4 * k, -11 * k, 0, -6 * k);
          ctx.bezierCurveTo(4 * k, -11 * k, 9 * k, -3 * k, 0, 4 * k);
          ctx.fillStyle = this.fill;
          ctx.fill();
        } else if (this.type === 'spark') {
          const k = s / 2;
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, k);
          g.addColorStop(0, this.hi);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, k, 0, Math.PI * 2);
          ctx.fill();
        } else if (this.type === 'leaf') {
          ctx.beginPath();
          ctx.ellipse(0, 0, s * 0.75, s * 0.42, 0, 0, Math.PI * 2);
          ctx.fillStyle = this.fill;
          ctx.fill();
          ctx.strokeStyle = this.hi;
          ctx.lineWidth = Math.max(1, s * 0.08);
          ctx.beginPath();
          ctx.moveTo(-s * 0.6, 0);
          ctx.lineTo(s * 0.6, 0);
          ctx.stroke();
        } else {
          // petal
          ctx.beginPath();
          ctx.ellipse(0, 0, s * 0.62, s * 0.36, 0, 0, Math.PI * 2);
          ctx.fillStyle = this.fill;
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(-s * 0.1, -s * 0.08, s * 0.3, s * 0.14, 0, 0, Math.PI * 2);
          ctx.fillStyle = this.hi;
          ctx.fill();
        }
        ctx.restore();
      }
    }

    const count = coarsePointer ? 16 : 26;
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

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });

    // Pause when scrolled far down — offscreen anyway, saves battery
    onScroll(() => {
      const far = window.scrollY > window.innerHeight * 2.5;
      if (far) stop(); else start();
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