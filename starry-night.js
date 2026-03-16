/**
 * STARRY NIGHT CANVAS — The Surprise Element
 * A Van Gogh–inspired swirling sky painted onto the starfield canvas.
 * Animated swirls, matte-finish star clusters, and cosmic brushstroke nebulae.
 * Replaces the basic particle starfield with something you can feel.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W, H, time = 0;
  const stars = [];
  const swirls = [];
  const brushStrokes = [];

  // Starry Night palette — matte, earthy, cosmic
  const PALETTE = {
    skyDeep: '#0b0e1a',
    skyMid: '#141e3a',
    skyHighlight: '#1b3058',
    swirlBlue: 'rgba(30, 58, 110, 0.3)',
    swirlTeal: 'rgba(50, 120, 130, 0.15)',
    swirlGold: 'rgba(180, 140, 60, 0.08)',
    starBright: '#e8dfc0',
    starDim: '#8a9ab0',
    starGold: '#c9944a',
    nebula1: 'rgba(74, 85, 120, 0.06)',
    nebula2: 'rgba(107, 91, 138, 0.04)',
  };

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    init();
  }

  function init() {
    stars.length = 0;
    swirls.length = 0;
    brushStrokes.length = 0;

    // Stars — varied sizes, like Van Gogh's bold star points
    const starCount = Math.floor((W * H) / 4500);
    for (let i = 0; i < starCount; i++) {
      const isBig = Math.random() < 0.06;
      const isGold = Math.random() < 0.12;
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: isBig ? 1.5 + Math.random() * 2.5 : 0.4 + Math.random() * 1.2,
        baseAlpha: isBig ? 0.6 + Math.random() * 0.4 : 0.15 + Math.random() * 0.45,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2,
        color: isGold ? PALETTE.starGold : (isBig ? PALETTE.starBright : PALETTE.starDim),
        hasBurst: isBig,
        burstR: isBig ? 6 + Math.random() * 10 : 0,
      });
    }

    // Swirling currents — the signature Van Gogh element
    const swirlCount = Math.floor(W / 140);
    for (let i = 0; i < swirlCount; i++) {
      swirls.push({
        cx: Math.random() * W,
        cy: Math.random() * H * 0.7,
        radiusX: 80 + Math.random() * 200,
        radiusY: 30 + Math.random() * 80,
        speed: (0.08 + Math.random() * 0.15) * (Math.random() > 0.5 ? 1 : -1),
        segments: 40 + Math.floor(Math.random() * 30),
        thickness: 1 + Math.random() * 2.5,
        color: Math.random() > 0.7 ? PALETTE.swirlTeal :
               Math.random() > 0.8 ? PALETTE.swirlGold : PALETTE.swirlBlue,
        phase: Math.random() * Math.PI * 2,
        drift: Math.random() * 0.002,
      });
    }

    // Brushstroke nebulae — soft painted patches
    for (let i = 0; i < 5; i++) {
      brushStrokes.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.6 + H * 0.1,
        w: 200 + Math.random() * 400,
        h: 60 + Math.random() * 150,
        angle: (Math.random() - 0.5) * 0.6,
        color: i % 2 === 0 ? PALETTE.nebula1 : PALETTE.nebula2,
        pulseSpeed: 0.3 + Math.random() * 0.5,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawSwirls() {
    swirls.forEach(s => {
      ctx.save();
      ctx.translate(s.cx, s.cy);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.thickness;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= s.segments; i++) {
        const t = (i / s.segments) * Math.PI * 2;
        const angle = t + time * s.speed + s.phase;
        const wobble = Math.sin(t * 3 + time * s.drift * 10) * 12;
        const x = Math.cos(angle) * (s.radiusX + wobble);
        const y = Math.sin(angle) * (s.radiusY + wobble * 0.5);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawBrushStrokes() {
    brushStrokes.forEach(b => {
      const pulseAlpha = 0.7 + Math.sin(time * b.pulseSpeed + b.pulseOffset) * 0.3;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      ctx.globalAlpha = pulseAlpha;
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(b.w, b.h) * 0.5);
      grad.addColorStop(0, b.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.globalAlpha = 1;
      ctx.restore();
    });
  }

  function drawStars() {
    stars.forEach(s => {
      const twinkle = Math.sin(time * s.twinkleSpeed + s.twinkleOffset);
      const alpha = s.baseAlpha + twinkle * 0.2;
      if (alpha <= 0.02) return;

      // Star halo for big stars — Van Gogh's luminous halos
      if (s.hasBurst) {
        const burstAlpha = alpha * 0.12;
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.burstR);
        grad.addColorStop(0, `rgba(200, 180, 130, ${burstAlpha})`);
        grad.addColorStop(0.4, `rgba(140, 120, 90, ${burstAlpha * 0.5})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.burstR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Star point
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function render() {
    ctx.clearRect(0, 0, W, H);

    // Sky gradient — deep matte navy
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, PALETTE.skyHighlight);
    skyGrad.addColorStop(0.35, PALETTE.skyMid);
    skyGrad.addColorStop(1, PALETTE.skyDeep);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    drawBrushStrokes();

    if (!REDUCED) {
      drawSwirls();
    }

    drawStars();

    time += 0.008;

    requestAnimationFrame(render);
  }

  window.addEventListener('resize', resize);
  resize();
  render();
})();
