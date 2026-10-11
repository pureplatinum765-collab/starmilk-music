(function () {
  'use strict';

  const section = document.getElementById('river');
  const canvas = document.getElementById('river-canvas');
  if (!section || !canvas) return;

  const ctx = canvas.getContext('2d');
  const leaves = Array.from(section.querySelectorAll('.river-leaf'));
  const tributaries = Array.from(section.querySelectorAll('.tributary'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compactMobile = window.matchMedia('(max-width: 680px)');
  let w = 0;
  let h = 0;
  let progress = 0;
  let time = 0;
  let rafId = 0;
  let isInView = true;

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
      { p: 0, c: [24, 38, 33] },     // deep pine night water
      { p: 0.35, c: [36, 68, 60] },   // mountain stream mineral teal
      { p: 0.68, c: [53, 95, 85] },   // estuarine river teal
      { p: 1, c: [137, 175, 166] }    // luminous open-water horizon (#89afa6)
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

    // Smooth monotonic expansion from mountain river to full-width boundless ocean.
    // At late progress, the top perspective immerses and the bottom banks exit the viewport.
    const topFactor = progress < 0.38 ? 0 : Math.pow((progress - 0.38) / 0.62, 1.35);
    const topWidth = w * (0.14 + 0.94 * topFactor);
    const bottomExpansion = 0.22 + 1.16 * Math.pow(progress, 1.12);
    const bottomWidth = w * bottomExpansion;

    const left = (w - bottomWidth) / 2;
    const right = w - left;
    const topL = (w - topWidth) / 2;
    const topR = w - topL;

    const topColor = sampleColor(Math.max(0, progress - 0.2));
    const bottomColor = sampleColor(Math.min(1, progress + 0.25));
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `rgb(${topColor.join(',')})`);
    grad.addColorStop(1, `rgb(${bottomColor.join(',')})`);

    const wave = reduceMotion ? 0 : Math.sin(time * 0.0015) * (16 * (1 - 0.6 * progress));
    const bankDissolve = Math.max(0, (progress - 0.72) / 0.28);

    ctx.beginPath();
    ctx.moveTo(topL, 0);
    ctx.bezierCurveTo(
      left + (30 + wave) * (1 - bankDissolve),
      h * 0.3,
      left - 12 * (1 - bankDissolve),
      h * 0.65,
      left,
      h
    );
    ctx.lineTo(right, h);
    ctx.bezierCurveTo(
      right + 12 * (1 - bankDissolve),
      h * 0.65,
      right - (30 + wave) * (1 - bankDissolve),
      h * 0.3,
      topR,
      0
    );
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    const rippleAlpha = 0.14 + progress * 0.16;
    const rippleLeft = Math.max(0, left + 10);
    const rippleRight = Math.min(w, right - 10);
    for (let i = 0; i < 8; i++) {
      const y = (i / 7) * h;
      const sway = reduceMotion ? 0 : Math.sin(time * 0.002 + i) * 18;
      ctx.beginPath();
      ctx.moveTo(rippleLeft, y);
      ctx.quadraticCurveTo(w / 2 + sway, y + 10, rippleRight, y);
      ctx.strokeStyle = `rgba(215, 238, 230, ${rippleAlpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    if (progress > 0.72) {
      const mistAlpha = (progress - 0.72) / 0.28;
      for (let i = 0; i < 35; i++) {
        const x = ((i * 71) % 1000) / 1000 * w;
        const y = (((i * 97) % 1000) / 1000) * h;
        const drift = reduceMotion ? 0 : (Math.sin(time * 0.003 + i) + 1) * 4;
        const alpha = mistAlpha * 0.45;
        ctx.fillStyle = i % 2 === 0
          ? `rgba(237, 205, 138, ${alpha})`
          : `rgba(210, 240, 232, ${alpha})`;
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
      const visible = compactMobile.matches
        ? Math.abs(progress - at) <= 0.12
        : progress >= at - 0.08 && progress <= at + 0.25;
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
    rafId = requestAnimationFrame(frame);
  }

  function canAnimate() {
    return !document.hidden && isInView;
  }

  function stopAnimation() {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function ensureAnimation() {
    if (!canAnimate() || rafId) return;
    rafId = requestAnimationFrame(frame);
  }

  const observer = new IntersectionObserver((entries) => {
    const entry = entries[0];
    isInView = Boolean(entry && entry.isIntersecting);
    if (isInView) {
      update();
      ensureAnimation();
    } else {
      stopAnimation();
    }
  }, { threshold: 0.05 });

  resize();
  update();
  observer.observe(section);
  ensureAnimation();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAnimation();
    else ensureAnimation();
  });

  window.addEventListener('resize', () => {
    resize();
    update();
    ensureAnimation();
  }, { passive: true });
  window.addEventListener('scroll', update, { passive: true });
})();
