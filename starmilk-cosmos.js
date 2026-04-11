/**
 * STARMILK COSMOS — Lightweight visual engine
 * ─────────────────────────────────────────────────
 * 1. Animated mesh gradient: 4 soft color blobs drifting with heavy CSS blur.
 *    Same technique as Stripe/Linear/Vercel. Runs on any device.
 *    Mouse gently influences blob positions.
 *
 * 2. Custom cursor: gold glow orb with spring physics.
 *    Scales on interactive elements. Hidden on touch devices.
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


  // ═══════════════════════════════════════════════════════════
  // 2. CUSTOM CURSOR
  //    Gold glow orb. Spring physics. Scales on interactive elements.
  //    Hidden on touch/mobile.
  // ═══════════════════════════════════════════════════════════

  if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768) return;

  const cursor = document.createElement('div');
  cursor.className = 'sm-cursor';
  cursor.innerHTML = '<div class="sm-cursor-dot"></div><div class="sm-cursor-ring"></div>';
  document.body.appendChild(cursor);

  const style = document.createElement('style');
  style.textContent = `
    *, *::before, *::after { cursor: none !important; }
    .sm-cursor {
      position: fixed; top: 0; left: 0; z-index: 99999;
      pointer-events: none; mix-blend-mode: screen;
    }
    .sm-cursor-dot {
      position: absolute; width: 6px; height: 6px;
      border-radius: 50%; background: rgba(201,148,74,0.85);
      transform: translate(-50%,-50%);
      transition: width .2s ease, height .2s ease;
    }
    .sm-cursor-ring {
      position: absolute; width: 36px; height: 36px;
      border-radius: 50%;
      border: 1px solid rgba(201,148,74,0.12);
      background: radial-gradient(circle, rgba(201,148,74,0.03) 0%, transparent 70%);
      transform: translate(-50%,-50%);
      transition: width .3s cubic-bezier(.34,1.56,.64,1), height .3s cubic-bezier(.34,1.56,.64,1),
                  border-color .2s ease;
    }
    .sm-cursor.hover .sm-cursor-dot { width: 10px; height: 10px; }
    .sm-cursor.hover .sm-cursor-ring {
      width: 48px; height: 48px;
      border-color: rgba(201,148,74,0.2);
    }
    .sm-cursor.hidden { opacity: 0; }
    @media (pointer: coarse) { .sm-cursor { display: none !important; } *, *::before, *::after { cursor: auto !important; } }
    @media (max-width: 768px) { .sm-cursor { display: none !important; } *, *::before, *::after { cursor: auto !important; } }
  `;
  document.head.appendChild(style);

  let cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  let rx = cx, ry = cy;
  let hidden = false;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX / window.innerWidth;
    mouseY = e.clientY / window.innerHeight;
    if (hidden) { hidden = false; cursor.classList.remove('hidden'); }
  }, { passive: true });

  document.addEventListener('mouseleave', () => { hidden = true; cursor.classList.add('hidden'); });

  const INTERACTIVE = 'a, button, [role="button"], input, select, textarea, .btn, .card, .soc-btn, .game-card, .radio-badge, .radio-ctrl, .radio-queue-name, .radio-like-btn, .chat-suggestion-chip, #starmilk-chat-toggle, .nav-hamburger, .radio-queue-heart, .radio-tab, .nav-visualizer-link, label';

  document.addEventListener('mouseover', (e) => {
    cursor.classList.toggle('hover', !!e.target.closest(INTERACTIVE));
  }, { passive: true });

  const dot = cursor.children[0];
  const ring = cursor.children[1];

  function cursorFrame() {
    // Tight spring for dot
    cx += (mouseX * window.innerWidth - cx) * 0.18;
    cy += (mouseY * window.innerHeight - cy) * 0.18;
    // Loose spring for ring
    rx += (mouseX * window.innerWidth - rx) * 0.07;
    ry += (mouseY * window.innerHeight - ry) * 0.07;

    dot.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(cursorFrame);
  }
  requestAnimationFrame(cursorFrame);

})();
