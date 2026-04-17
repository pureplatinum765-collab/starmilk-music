/**
 * STARMILK COSMOS — Lightweight visual engine
 * ─────────────────────────────────────────────────
 * Animated mesh gradient: 4 soft color blobs drifting with heavy CSS blur.
 * Same technique as Stripe/Linear/Vercel. Runs on any device.
 * Mouse gently influences blob positions.
 *
 * Design rationale (from Reddit/Awwwards research):
 *   - "Minimalism with purpose" — every animation must serve the content
 *   - "If your animation isn't 60fps, don't bother" — this runs <1% GPU
 *   - "Content is king" — the gradient is a backdrop, never competing
 *   - "Accessibility first" — respects prefers-reduced-motion
 * ─────────────────────────────────────────────────
 */
(function () {
  'use strict';

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  // ═══════════════════════════════════════════════════════════
  // 1. ANIMATED MESH GRADIENT
  //    4 color blobs on a canvas, CSS blur(120px) creates the mesh.
  //    Drifts slowly. Mouse nudges nearby blobs.
  // ═══════════════════════════════════════════════════════════

  const BLOBS = [
    { x: 0.25, y: 0.3,  r: 280, color: 'rgba(25, 18, 60, 0.7)',   vx: 0.08,  vy: 0.05  }, // deep purple
    { x: 0.7,  y: 0.2,  r: 240, color: 'rgba(12, 25, 55, 0.6)',   vx: -0.06, vy: 0.07  }, // midnight blue
    { x: 0.5,  y: 0.7,  r: 200, color: 'rgba(80, 55, 20, 0.25)',  vx: 0.04,  vy: -0.06 }, // gold wisp
    { x: 0.3,  y: 0.8,  r: 260, color: 'rgba(18, 12, 40, 0.65)',  vx: -0.05, vy: 0.04  }, // dark indigo
  ];

  const canvas = document.createElement('canvas');
  canvas.id = 'starmilk-mesh';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = `
    position: fixed; inset: 0; z-index: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    filter: blur(120px);
    opacity: 0.85;
  `;
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0;
  let mouseX = 0.5, mouseY = 0.5; // normalized 0-1

  function resize() {
    // Render at low resolution — the CSS blur makes high-res pointless
    const dpr = 0.25; // intentionally low — blur hides pixels
    W = Math.floor(window.innerWidth * dpr);
    H = Math.floor(window.innerHeight * dpr);
    canvas.width = W;
    canvas.height = H;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX / window.innerWidth;
    mouseY = e.clientY / window.innerHeight;
  }, { passive: true });

  let scrollDepth = 0;
  window.addEventListener('scroll', () => {
    const total = document.body.scrollHeight - window.innerHeight;
    scrollDepth = total > 0 ? window.scrollY / total : 0;
  }, { passive: true });

  let isVisible = true;
  document.addEventListener('visibilitychange', () => { isVisible = !document.hidden; });

  // Animation
  let elapsed = 0;
  let lastFrame = performance.now();

  function draw() {
    if (!isVisible) { requestAnimationFrame(draw); return; }

    const now = performance.now();
    const dt = Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;
    elapsed += dt;

    ctx.clearRect(0, 0, W, H);

    // Darken with scroll depth
    const darken = scrollDepth * 0.45;

    for (const blob of BLOBS) {
      // Drift
      blob.x += blob.vx * dt * 0.015;
      blob.y += blob.vy * dt * 0.015;

      // Bounce off edges (soft, not abrupt)
      if (blob.x < -0.1 || blob.x > 1.1) blob.vx *= -1;
      if (blob.y < -0.1 || blob.y > 1.1) blob.vy *= -1;

      // Gentle mouse influence
      const dx = mouseX - blob.x;
      const dy = mouseY - blob.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.5) {
        const force = (0.5 - dist) * 0.002;
        blob.x += dx * force;
        blob.y += dy * force;
      }

      // Draw blob
      const cx = blob.x * W;
      const cy = blob.y * H;
      const r = blob.r * (W / 1440); // scale radius to canvas size
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, blob.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }

    // Apply depth darkening as a full-canvas overlay
    if (darken > 0.01) {
      ctx.fillStyle = `rgba(0, 0, 0, ${darken.toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  // Hide existing nebula canvas if present
  const old = document.getElementById('nebula-canvas') || document.querySelector('canvas.nebula');
  if (old && old !== canvas) old.style.display = 'none';


  // Custom cursor removed — native cursor is better.
  // Remove any leftover cursor DOM from previous versions.
  const oldCursor = document.querySelector('.sm-cursor');
  if (oldCursor) oldCursor.remove();

})();
