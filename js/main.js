/* ============================================================
   OPAL LAND — main scripts
   ============================================================ */

/* ---------- copy IP ---------- */
document.querySelectorAll('[data-ip]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const ip = btn.dataset.ip;
    try {
      await navigator.clipboard.writeText(ip);
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = ip;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }

    const textEl = btn.querySelector('.copy-text');
    const original = textEl ? textEl.textContent : btn.textContent;

    btn.classList.add('ok');
    if (textEl) textEl.textContent = 'Скопировано! ';
    else btn.textContent = 'Скопировано! ';

    setTimeout(() => {
      btn.classList.remove('ok');
      if (textEl) textEl.textContent = original;
      else btn.textContent = original;
    }, 1800);
  });
});

/* ---------- scroll reveal ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ---------- gentle parallax for background on mouse move ---------- */
const sky = document.querySelector('.sky-layer');
const hills = document.querySelectorAll('.hill');
let targetX = 0, targetY = 0, currentX = 0, currentY = 0;

window.addEventListener('mousemove', (e) => {
  targetX = (e.clientX / window.innerWidth - 0.5) * 2;
  targetY = (e.clientY / window.innerHeight - 0.5) * 2;
}, { passive: true });

function animateParallax() {
  currentX += (targetX - currentX) * 0.04;
  currentY += (targetY - currentY) * 0.04;

  if (sky) {
    sky.style.transform = `translate(${currentX * 8}px, ${currentY * 4}px)`;
  }
  hills.forEach((hill, i) => {
    const factor = (i + 1) * 3;
    hill.style.transform = `translateX(${currentX * factor}px)`;
  });

  requestAnimationFrame(animateParallax);
}
animateParallax();

/* ---------- nav background on scroll ---------- */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    nav.style.background = 'rgba(24, 18, 27, .88)';
    nav.style.boxShadow = '0 16px 40px -16px rgba(0,0,0,.6)';
  } else {
    nav.style.background = 'rgba(24, 18, 27, .72)';
    nav.style.boxShadow = '0 16px 40px -20px rgba(0,0,0,.5)';
  }
}, { passive: true });

/* ---------- falling petal / heart particles ---------- */
(function initParticles() {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const symbols = ['🌸', '✨', '🍃', '💖', '🌷'];
  let particles = [];
  let width, height;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  class Particle {
    constructor() {
      this.reset(true);
    }
    reset(randomY = false) {
      this.x = Math.random() * width;
      this.y = randomY ? Math.random() * height : -20;
      this.size = Math.random() * 14 + 10;
      this.speed = Math.random() * 0.6 + 0.3;
      this.sway = Math.random() * 1.5 + 0.5;
      this.swaySpeed = Math.random() * 0.02 + 0.01;
      this.angle = Math.random() * Math.PI * 2;
      this.opacity = Math.random() * 0.35 + 0.15;
      this.symbol = symbols[Math.floor(Math.random() * symbols.length)];
    }
    update() {
      this.y += this.speed;
      this.angle += this.swaySpeed;
      this.x += Math.sin(this.angle) * this.sway * 0.3;
      if (this.y > height + 30) this.reset();
    }
    draw() {
      ctx.globalAlpha = this.opacity;
      ctx.font = `${this.size}px Nunito, sans-serif`;
      ctx.fillText(this.symbol, this.x, this.y);
    }
  }

  const count = window.matchMedia('(pointer: coarse)').matches ? 18 : 30;
  for (let i = 0; i < count; i++) particles.push(new Particle());

  function loop() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  }
  loop();
})();
