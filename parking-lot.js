(function () {
  'use strict';

  const _ls = (function () {
    const m = {};
    const s = window['local' + 'Storage'];
    return {
      getItem(k) { try { return s.getItem(k); } catch { return m[k] ?? null; } },
      setItem(k, v) { try { s.setItem(k, v); } catch { m[k] = v; } }
    };
  })();

  const STORAGE_KEY = 'starmilkParkingLotEntered';
  const overlay = document.getElementById('parking-lot-overlay');
  if (!overlay) return;

  const canvas = document.getElementById('parking-lot-rain');
  const line1 = document.getElementById('parking-lot-line-1');
  const line2 = document.getElementById('parking-lot-line-2');
  const readyBtn = document.getElementById('parking-lot-ready');
  const skipLink = document.getElementById('parking-lot-skip');
  const wizardImg = document.getElementById('parking-lot-wizard');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  document.body.classList.add('parking-lot-active');

  const state = {
    isEntering: false,
    hasEnteredBefore: _ls.getItem(STORAGE_KEY) === 'true',
    phase: 'skating'
  };

  let ctx = null;
  let rafId = 0;
  let startTime = 0;
  let paused = false;

  let droplets = [];
  let ripples = [];
  let trail = [];

  const GOLD_LIGHT = '#dbb87a';
  const CREAM = '#e8dfc0';
  const MILK_COLORS = ['#e8dfc0', '#d5cfc2', '#f0e8d8', '#ddd5c4', '#c9c0ae', '#dbb87a'];

  function setupCanvas() {
    if (!canvas) return;
    ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }
  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function createSplatter(cx, cy) {
    const count = isMobile ? 30 : 55;
    droplets = [];
    ripples = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 12;
      const size = 2 + Math.random() * 14;
      droplets.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed * (0.6 + Math.random() * 0.8),
        vy: Math.sin(angle) * speed * (0.6 + Math.random() * 0.8) - Math.random() * 3,
        r: size, origR: size,
        color: MILK_COLORS[Math.floor(Math.random() * MILK_COLORS.length)],
        alpha: 0.7 + Math.random() * 0.3,
        gravity: 0.08 + Math.random() * 0.12,
        drag: 0.96 + Math.random() * 0.03,
        stretch: 1 + Math.random() * 0.5
      });
    }

    for (let i = 0; i < 3; i++) {
      ripples.push({
        x: cx, y: cy,
        r: 10,
        maxR: 120 + i * 80,
        alpha: 0.5 - i * 0.12,
        speed: 3.5 - i * 0.6
      });
    }
  }

  const FONT_SIZE = isMobile ? 42 : 72;
  const FONT = `900 ${FONT_SIZE}px 'Segoe UI', system-ui, -apple-system, sans-serif`;
  const TRAIL_LENGTH = isMobile ? 6 : 10;

  function draw(timestamp) {
    if (!ctx || paused) return;
    if (!startTime) startTime = timestamp;

    const elapsed = (timestamp - startTime) / 1000;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    if (elapsed < 4.8) {
      drawSkatingPhase(elapsed, cx, cy, w, h);
    }

    if (elapsed >= 4.8 && elapsed < 7.5) {
      if (state.phase === 'skating') {
        state.phase = 'splatter';
        createSplatter(cx, cy);
      }
      drawSplatterPhase(elapsed - 4.8, cx, cy, w, h);
    }

    if (elapsed >= 6.5 && wizardImg) {
      const fadeT = Math.min((elapsed - 6.5) / 1.5, 1);
      const wizAlpha = easeOutQuart(fadeT) * 0.65;
      wizardImg.style.opacity = wizAlpha;
      wizardImg.style.transform = `translate(-50%, -50%) scale(${0.85 + fadeT * 0.15})`;
      wizardImg.style.filter = `blur(${(1 - fadeT) * 8}px) saturate(${0.6 + fadeT * 0.4})`;
    }

    if (elapsed >= 7.5 && !line1.classList.contains('visible')) {
      line1.classList.add('visible');
    }
    if (elapsed >= 9.0 && !line2.classList.contains('visible')) {
      line2.classList.add('visible');
    }
    if (elapsed >= 9.8 && !readyBtn.classList.contains('visible')) {
      readyBtn.classList.add('visible');
    }

    rafId = requestAnimationFrame(draw);
  }

  function drawSkatingPhase(elapsed, cx, cy, w, h) {
    const orbitDuration = 3.5;
    const landStart = 3.5;
    const landDuration = 1.0;
    const stillStart = 4.5;

    const loops = 3.5;
    const maxRadiusX = Math.min(w * 0.38, 380);
    const maxRadiusY = Math.min(h * 0.28, 220);

    let textX, textY, textAngle, textAlpha;

    if (elapsed < orbitDuration) {
      const t = elapsed / orbitDuration;
      const easedT = easeInOutCubic(t);
      const radiusFactor = 1 - easedT * 0.85;
      const rx = maxRadiusX * radiusFactor;
      const ry = maxRadiusY * radiusFactor;
      const angle = t * loops * Math.PI * 2 - Math.PI / 2;

      textX = cx + Math.cos(angle) * rx;
      textY = cy + Math.sin(angle) * ry;

      const tangent = Math.atan2(
        Math.cos(angle) * ry,
        -Math.sin(angle) * rx
      );
      textAngle = tangent * 0.15;
      textAlpha = Math.min(elapsed / 0.8, 1);

      trail.push({ x: textX, y: textY, angle: textAngle, alpha: textAlpha, time: elapsed });
      if (trail.length > TRAIL_LENGTH) trail.shift();

    } else if (elapsed < stillStart) {
      const t = (elapsed - landStart) / landDuration;
      const easedT = easeOutExpo(t);

      const lastAngle = loops * Math.PI * 2 - Math.PI / 2;
      const lastRx = maxRadiusX * 0.15;
      const lastRy = maxRadiusY * 0.15;
      const lastX = cx + Math.cos(lastAngle) * lastRx;
      const lastY = cy + Math.sin(lastAngle) * lastRy;

      textX = lastX + (cx - lastX) * easedT;
      textY = lastY + (cy - lastY) * easedT;
      textAngle = (1 - easedT) * 0.05;
      textAlpha = 1;

      if (trail.length > 0 && t > 0.3) trail.shift();

    } else {
      textX = cx;
      textY = cy;
      textAngle = 0;
      textAlpha = 1;
      trail = [];
    }

    for (let i = 0; i < trail.length; i++) {
      const tp = trail[i];
      const trailAlpha = (i / trail.length) * 0.18 * tp.alpha;
      drawText(tp.x, tp.y, tp.angle, trailAlpha);
    }

    if (textAlpha > 0) {
      drawText(textX, textY, textAngle, textAlpha);
    }
  }

  function drawText(x, y, angle, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.font = FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = GOLD_LIGHT;
    ctx.fillText('STARMILK', 0, 0);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawSplatterPhase(elapsed, cx, cy) {
    const fadeStart = 1.5;
    const fadeDuration = 1.2;
    let globalFade = 1;
    if (elapsed > fadeStart) {
      globalFade = 1 - Math.min((elapsed - fadeStart) / fadeDuration, 1);
    }

    if (elapsed < 0.6) {
      drawFragmentedText(cx, cy, elapsed, globalFade);
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const rip = ripples[i];
      rip.r += rip.speed;
      const ripProgress = rip.r / rip.maxR;
      if (ripProgress > 1) { ripples.splice(i, 1); continue; }

      const ripAlpha = rip.alpha * (1 - ripProgress) * globalFade;
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
      ctx.strokeStyle = CREAM;
      ctx.globalAlpha = ripAlpha;
      ctx.lineWidth = 2 - ripProgress * 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (let i = 0; i < droplets.length; i++) {
      const d = droplets[i];
      d.vx *= d.drag;
      d.vy *= d.drag;
      d.vy += d.gravity;
      d.x += d.vx;
      d.y += d.vy;

      d.r = d.origR * Math.max(0, 1 - elapsed * 0.08);
      if (d.r < 0.5) continue;

      const speed = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
      const stretchFactor = 1 + speed * 0.04 * d.stretch;

      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(Math.atan2(d.vy, d.vx));
      ctx.scale(stretchFactor, 1 / Math.sqrt(stretchFactor));
      ctx.globalAlpha = d.alpha * globalFade;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.5, d.r), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (elapsed < 0.8) {
      const glowAlpha = (1 - elapsed / 0.8) * 0.25 * globalFade;
      const glowR = 60 + elapsed * 200;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      grad.addColorStop(0, `rgba(219,184,122,${glowAlpha})`);
      grad.addColorStop(1, 'rgba(219,184,122,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawFragmentedText(cx, cy, elapsed, globalFade) {
    const chars = 'STARMILK'.split('');
    const charW = FONT_SIZE * 0.62;
    const startX = cx - (chars.length * charW) / 2 + charW / 2;

    ctx.font = FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < chars.length; i++) {
      const angle = (i / chars.length) * Math.PI * 2 + elapsed * 2;
      const dist = elapsed * (80 + i * 20);
      const x = startX + i * charW + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;
      const rot = elapsed * (i - 3.5) * 0.8;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = (1 - elapsed / 0.6) * globalFade;
      ctx.fillStyle = GOLD_LIGHT;
      ctx.fillText(chars[i], 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  let audioCtx = null;
  let padGain = null;

  async function startAudio() {
    if (reducedMotion || audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      padGain = audioCtx.createGain();
      padGain.gain.value = 0.0001;
      padGain.connect(audioCtx.destination);

      const freqs = [110, 165, 220, 277.2];
      freqs.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = (idx - 1.5) * 4;
        oscGain.gain.value = 0.12 / freqs.length;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        filter.Q.value = 0.7;

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(padGain);
        osc.start();
      });

      const now = audioCtx.currentTime;
      padGain.gain.setValueAtTime(0.0001, now);
      padGain.gain.linearRampToValueAtTime(0.018, now + 3);
    } catch { /* audio not available */ }
  }

  function completeEntry() {
    if (state.isEntering) return;
    state.isEntering = true;
    _ls.setItem(STORAGE_KEY, 'true');

    overlay.classList.add('entering');

    if (padGain && audioCtx) {
      const now = audioCtx.currentTime;
      padGain.gain.cancelScheduledValues(now);
      padGain.gain.setValueAtTime(Math.max(0.0001, padGain.gain.value), now);
      padGain.gain.linearRampToValueAtTime(0.0001, now + 1.5);
    }

    const exitStart = performance.now();
    const exitDur = 2000;

    function exitAnim(ts) {
      const p = Math.min((ts - exitStart) / exitDur, 1);
      if (p > 0.3) {
        overlay.style.opacity = 1 - easeInOutCubic((p - 0.3) / 0.7);
      }
      if (p < 1) {
        requestAnimationFrame(exitAnim);
      } else {
        overlay.classList.add('exited');
        setTimeout(() => {
          overlay.remove();
          document.body.classList.remove('parking-lot-active');
          window.dispatchEvent(new CustomEvent('starmilk:parkingLotDismissed'));
          if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
          if (audioCtx) { audioCtx.close().catch(() => {}); }
        }, 200);
      }
    }
    requestAnimationFrame(exitAnim);
  }

  function setupReturningVisitorFlow() {
    if (!ctx) setupCanvas();
    if (ctx) {
      ctx.font = FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = GOLD_LIGHT;
      ctx.fillText('STARMILK', window.innerWidth / 2, window.innerHeight / 2);
      ctx.globalAlpha = 1;
    }
    line1.textContent = 'Welcome back.';
    line1.classList.add('visible');
    setTimeout(completeEntry, reducedMotion ? 400 : 1800);
  }

  function setupFirstTimeFlow() {
    if (reducedMotion) {
      if (ctx) {
        ctx.font = FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = GOLD_LIGHT;
        ctx.fillText('STARMILK', window.innerWidth / 2, window.innerHeight / 2);
        ctx.globalAlpha = 1;
      }
      setTimeout(() => line1.classList.add('visible'), 800);
      setTimeout(() => line2.classList.add('visible'), 1600);
      setTimeout(() => readyBtn.classList.add('visible'), 2200);
      return;
    }

    rafId = requestAnimationFrame(draw);
  }

  function bootstrapAudio() {
    const resume = async () => {
      await startAudio();
      if (audioCtx && audioCtx.state === 'suspended') {
        try { await audioCtx.resume(); } catch {}
      }
    };
    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });
    startAudio();
  }

  readyBtn.addEventListener('click', completeEntry);
  skipLink.addEventListener('click', function (e) { e.preventDefault(); completeEntry(); });

  window.addEventListener('resize', setupCanvas);

  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    if (paused && rafId) { cancelAnimationFrame(rafId); rafId = 0; return; }
    if (!paused && !state.isEntering && !rafId && !state.hasEnteredBefore) {
      rafId = requestAnimationFrame(draw);
    }
  });

  setupCanvas();
  bootstrapAudio();

  if (state.hasEnteredBefore) {
    setupReturningVisitorFlow();
  } else {
    setupFirstTimeFlow();
  }
})();
