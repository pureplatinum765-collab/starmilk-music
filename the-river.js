(function () {
  'use strict';

  const section = document.getElementById('river');
  const canvas = document.getElementById('river-canvas');
  if (!section || !canvas) return;

  const ctx = canvas.getContext('2d');
  const leaves = Array.from(section.querySelectorAll('.river-leaf'));
  const tributaries = Array.from(section.querySelectorAll('.tributary'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0;
  let h = 0;
  let progress = 0;
  let time = 0;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(w * ratio));
    canvas.height = Math.max(1, Math.floor(h * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function sampleColor(p) {
    const stops = [
      { p: 0, c: [26, 22, 70] },
      { p: 0.35, c: [18, 61, 145] },
      { p: 0.68, c: [16, 128, 145] },
      { p: 1, c: [114, 245, 255] }
    ];
    let i = 0;
    while (i < stops.length - 1 && p > stops[i + 1].p) i++;
    const a = stops[i];
    const b = stops[Math.min(stops.length - 1, i + 1)];
    const local = (p - a.p) / Math.max(0.0001, b.p - a.p);
    return a.c.map((v, idx) => Math.round(v + (b.c[idx] - v) * local));
  }

  function drawRiver() {
    ctx.clearRect(0, 0, w, h);

    const topWidth = w * 0.14;
    const bottomWidth = w * 0.92;
    const riverWidth = topWidth + (bottomWidth - topWidth) * (0.2 + 0.8 * progress);
    const left = (w - riverWidth) / 2;
    const right = w - left;

    const topColor = sampleColor(Math.max(0, progress - 0.2));
    const bottomColor = sampleColor(Math.min(1, progress + 0.25));
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `rgb(${topColor.join(',')})`);
    grad.addColorStop(1, `rgb(${bottomColor.join(',')})`);

    const wave = reduceMotion ? 0 : Math.sin(time * 0.0015) * 16;

    ctx.beginPath();
    ctx.moveTo(w / 2 - topWidth / 2, 0);
    ctx.bezierCurveTo(left + 30 + wave, h * 0.3, left - 12, h * 0.65, left, h);
    ctx.lineTo(right, h);
    ctx.bezierCurveTo(right + 12, h * 0.65, right - 30 - wave, h * 0.3, w / 2 + topWidth / 2, 0);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    const rippleAlpha = 0.15 + progress * 0.15;
    for (let i = 0; i < 8; i++) {
      const y = (i / 7) * h;
      const sway = reduceMotion ? 0 : Math.sin(time * 0.002 + i) * 18;
      ctx.beginPath();
      ctx.moveTo(left + 10, y);
      ctx.quadraticCurveTo(w / 2 + sway, y + 10, right - 10, y);
      ctx.strokeStyle = `rgba(210,245,255,${rippleAlpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    if (progress > 0.78) {
      for (let i = 0; i < 35; i++) {
        const x = ((i * 71) % 1000) / 1000 * w;
        const y = (((i * 97) % 1000) / 1000) * h;
        const drift = reduceMotion ? 0 : (Math.sin(time * 0.003 + i) + 1) * 4;
        const alpha = (progress - 0.75) * 0.7;
        ctx.fillStyle = `rgba(201,251,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(x + drift, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function update() {
    const rect = section.getBoundingClientRect();
    const total = Math.max(1, rect.height - window.innerHeight);
    progress = clamp(-rect.top / total, 0, 1);

    section.style.setProperty('--river-progress', progress.toFixed(3));
    tributaries.forEach((node) => {
      const at = Number(node.dataset.progress || 0);
      const visible = progress >= at - 0.08 && progress <= at + 0.25;
      node.classList.toggle('visible', visible);
    });

    leaves.forEach((leaf, idx) => {
      const speed = Number(leaf.dataset.speed || 0.2);
      const baseX = Number(leaf.dataset.x || 50);
      const y = (progress * 120 + idx * 16 * speed) % 120;
      const xDrift = reduceMotion ? 0 : Math.sin((progress + idx) * 5) * 8;
      leaf.style.transform = `translate(${baseX + xDrift}vw, ${y}vh)`;
    });
  }

  function frame(ts) {
    time = ts;
    update();
    drawRiver();
    requestAnimationFrame(frame);
  }

  resize();
  update();
  requestAnimationFrame(frame);

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('scroll', update, { passive: true });
})();
