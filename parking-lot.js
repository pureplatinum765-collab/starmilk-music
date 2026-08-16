(() => {
  'use strict';

  const safeStorage = (() => {
    const fallback = {};
    return {
      get(key) { try { return localStorage.getItem(key); } catch { return fallback[key] ?? null; } },
      set(key, value) { try { localStorage.setItem(key, value); } catch { fallback[key] = value; } },
    };
  })();

  const STORAGE_KEY = 'starmilkParkingLotEntered';
  const overlay = document.getElementById('parking-lot-overlay');
  const canvas = document.getElementById('parking-lot-rain');
  const line1 = document.getElementById('parking-lot-line-1');
  const line2 = document.getElementById('parking-lot-line-2');
  const readyBtn = document.getElementById('parking-lot-ready');
  const skipBtn = document.getElementById('parking-lot-skip');
  if (!overlay || !readyBtn) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const state = {
    entering: false,
    portalReady: false,
    returning: safeStorage.get(STORAGE_KEY) === 'true',
  };

  let context = null;
  let rafId = 0;
  let startedAt = 0;
  let exitStartedAt = 0;
  let hiddenAt = 0;
  let flecks = [];

  const PALETTE = ['#c68552', '#91c6cf', '#d6c0a8', '#7c6571', '#e8c77f'];
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);

  function setCanvasSize() {
    if (!canvas) return;
    context = canvas.getContext('2d', { alpha: true });
    if (!context) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildFlecks();
  }

  function buildFlecks() {
    const count = isMobile ? 26 : 46;
    flecks = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: 0.7 + Math.random() * 2.1,
      alpha: 0.08 + Math.random() * 0.2,
      speed: 0.06 + Math.random() * 0.16,
      phase: index * 0.71 + Math.random() * Math.PI,
      color: PALETTE[index % PALETTE.length],
    }));
  }

  function draw(timestamp) {
    if (!context) return;
    if (!startedAt) startedAt = timestamp;
    const elapsed = (timestamp - startedAt) / 1000;
    const width = window.innerWidth;
    const height = window.innerHeight;
    context.clearRect(0, 0, width, height);

    flecks.forEach((fleck) => {
      const drift = Math.sin(elapsed * fleck.speed + fleck.phase) * 14;
      context.globalAlpha = fleck.alpha;
      context.fillStyle = fleck.color;
      context.beginPath();
      context.arc(fleck.x + drift, fleck.y + Math.cos(elapsed * fleck.speed + fleck.phase) * 8, fleck.size, 0, Math.PI * 2);
      context.fill();
    });
    context.globalAlpha = 1;

    if (!state.portalReady && elapsed >= (reducedMotion ? 0 : 1.55)) {
      state.portalReady = true;
      overlay.classList.add('portal-ready');
      readyBtn.classList.add('visible');
      skipBtn?.classList.add('visible');
      readyBtn.focus({ preventScroll: true });
    }

    if (state.entering) {
      const exitProgress = Math.min((timestamp - exitStartedAt) / (reducedMotion ? 180 : 1100), 1);
      const pulse = easeOut(exitProgress);
      const radius = Math.max(width, height) * (0.48 - pulse * 0.45);
      context.fillStyle = `rgba(232,199,127,${0.12 * (1 - pulse)})`;
      context.beginPath();
      context.arc(width / 2, height / 2, Math.max(0, radius), 0, Math.PI * 2);
      context.fill();

      if (exitProgress >= 1) {
        finishEntry();
        return;
      }
    }

    rafId = requestAnimationFrame(draw);
  }

  function revealSequence() {
    const firstDelay = reducedMotion ? 0 : 300;
    const secondDelay = reducedMotion ? 0 : 820;
    window.setTimeout(() => line1?.classList.add('visible'), firstDelay);
    window.setTimeout(() => line2?.classList.add('visible'), secondDelay);
    // Returning listeners receive a shorter invitation, never an automatic dismissal.
    if (state.returning && line2) line2.textContent = 'The signal is still here.';
  }

  function completeEntry() {
    if (state.entering) return;
    state.entering = true;
    safeStorage.set(STORAGE_KEY, 'true');
    overlay.classList.add('entering');
    exitStartedAt = performance.now();
  }

  function finishEntry() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    overlay.classList.add('exited');
    window.setTimeout(() => {
      overlay.remove();
      document.body.classList.remove('parking-lot-active');
      window.dispatchEvent(new CustomEvent('starmilk:parkingLotDismissed'));
    }, reducedMotion ? 20 : 240);
  }

  readyBtn.addEventListener('click', completeEntry);
  skipBtn?.addEventListener('click', completeEntry);
  window.addEventListener('resize', setCanvasSize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = performance.now();
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      return;
    }
    if (hiddenAt) {
      const pauseDuration = performance.now() - hiddenAt;
      if (startedAt) startedAt += pauseDuration;
      if (exitStartedAt) exitStartedAt += pauseDuration;
      hiddenAt = 0;
    }
    if (!rafId) rafId = requestAnimationFrame(draw);
  });

  document.body.classList.add('parking-lot-active');
  setCanvasSize();
  revealSequence();
  rafId = requestAnimationFrame(draw);
})();
