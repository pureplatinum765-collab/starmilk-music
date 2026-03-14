(function () {
  'use strict';

  /* ── Safe localStorage wrapper ── */
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
    funnelProgress: 0,    // 0→1 as orbs spiral inward
    wizardReveal: 0       // 0→1 as wizard image fades in
  };

  let ctx = null;
  let rafId = 0;
  let orbs = [];
  let startTime = 0;
  let rainPaused = false;

  /* ── Mood orb definitions (earthy matte) ── */
  const MOODS = [
    { label: 'Heavy',      emoji: '🪨', color: '#3d4a6b', glow: 'rgba(61,74,107,.4)' },
    { label: 'Thawing',    emoji: '🧊', color: '#7a9ab5', glow: 'rgba(122,154,181,.35)' },
    { label: 'Tender',     emoji: '🌷', color: '#b08a8a', glow: 'rgba(176,138,138,.35)' },
    { label: 'Alive',      emoji: '🌿', color: '#a8945a', glow: 'rgba(168,148,90,.4)' },
    { label: 'Going Round',emoji: '🌀', color: '#5a4a72', glow: 'rgba(90,74,114,.35)' }
  ];

  /* ── Build canvas ── */
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

  /* ── Create orbs — they start scattered, then funnel in ── */
  function buildOrbs() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;
    orbs = [];

    // Create multiple orbs per mood (scattered across screen)
    const orbsPerMood = isMobile ? 7 : 12;
    for (let mi = 0; mi < MOODS.length; mi++) {
      const mood = MOODS[mi];
      for (let j = 0; j < orbsPerMood; j++) {
        const angle = ((mi * orbsPerMood + j) / (MOODS.length * orbsPerMood)) * Math.PI * 2;
        // Start from edges — scattered wide
        const startRadius = Math.max(w, h) * 0.55 + Math.random() * 120;
        const startX = cx + Math.cos(angle) * startRadius;
        const startY = cy + Math.sin(angle) * startRadius;

        // Funnel target — tighter spiral near center
        const targetRadius = 25 + Math.random() * 45;
        const spiralOffset = (j / orbsPerMood) * Math.PI * 2;

        orbs.push({
          mood: mi,
          // Starting position (scattered)
          sx: startX,
          sy: startY,
          // Current position
          x: startX,
          y: startY,
          // Size & visual
          size: isMobile ? (12 + Math.random() * 14) : (16 + Math.random() * 18),
          color: mood.color,
          glow: mood.glow,
          label: j === 0 ? mood.label : null, // Only first orb of each mood gets label
          emoji: j === 0 ? mood.emoji : null,
          // Spiral parameters
          angle: angle,
          spiralOffset: spiralOffset,
          targetRadius: targetRadius,
          // Drift (idle wobble)
          driftPhase: Math.random() * Math.PI * 2,
          driftSpeed: 0.3 + Math.random() * 0.5,
          driftAmp: 3 + Math.random() * 6,
          // Opacity
          alpha: 0,
          targetAlpha: 0.7 + Math.random() * 0.3,
          // Trail
          trail: []
        });
      }
    }
  }

  /* ── Easing ── */
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  /* ── Phases:
       0.0 – 0.15  : Orbs appear from edges, floating
       0.15 – 0.7  : Orbs spiral inward (coin funnel)
       0.7 – 1.0   : Orbs settle into tight orbit, wizard image reveals
  ── */

  function draw(timestamp) {
    if (!ctx || rainPaused) return;
    if (!startTime) startTime = timestamp;

    const elapsed = (timestamp - startTime) / 1000; // seconds
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Phase timing
    const appearDuration = 2.5;    // orbs fade in over 2.5s
    const spiralStart = 1.8;       // spiral begins at 1.8s
    const spiralDuration = 7.0;    // spiral takes 7s to fully converge
    const wizardStart = 5.8;       // wizard starts fading in earlier for layered reveal

    // Compute progress values
    const appearProgress = Math.min(elapsed / appearDuration, 1);
    const spiralT = elapsed < spiralStart ? 0 :
      Math.min((elapsed - spiralStart) / spiralDuration, 1);
    const spiralEased = easeInOutCubic(spiralT);

    // Wizard reveal
    if (elapsed > wizardStart && wizardImg) {
      const wizT = Math.min((elapsed - wizardStart) / 3.5, 1);
      state.wizardReveal = easeOutQuart(wizT);
      wizardImg.style.opacity = state.wizardReveal * 0.65;
      wizardImg.style.transform = `translate(-50%, -50%) scale(${0.85 + state.wizardReveal * 0.15})`;
      wizardImg.style.filter = `blur(${(1 - state.wizardReveal) * 8}px) saturate(${0.6 + state.wizardReveal * 0.4})`;
    }

    // Draw each orb
    for (let i = 0; i < orbs.length; i++) {
      const orb = orbs[i];

      // Fade in
      orb.alpha = Math.min(appearProgress * orb.targetAlpha * 1.3, orb.targetAlpha);

      // Spiral movement (coin funnel)
      const spiralAngle = orb.angle + spiralEased * Math.PI * 6 + orb.spiralOffset;
      const maxRadius = Math.max(w, h) * 0.55;
      const currentRadius = maxRadius * (1 - spiralEased) + orb.targetRadius * spiralEased;

      // Compute position
      const baseX = cx + Math.cos(spiralAngle) * currentRadius;
      const baseY = cy + Math.sin(spiralAngle) * currentRadius;

      // Add gentle drift wobble
      const drift = Math.sin(elapsed * orb.driftSpeed + orb.driftPhase) * orb.driftAmp * (1 - spiralEased * 0.7);
      const driftY = Math.cos(elapsed * orb.driftSpeed * 0.7 + orb.driftPhase) * orb.driftAmp * 0.6 * (1 - spiralEased * 0.7);

      orb.x = baseX + drift;
      orb.y = baseY + driftY;

      // Trail (short fading trail during spiral)
      if (spiralT > 0.05 && spiralT < 0.95) {
        orb.trail.push({ x: orb.x, y: orb.y, a: orb.alpha * 0.3 });
        if (orb.trail.length > 12) orb.trail.shift();
      } else {
        if (orb.trail.length > 0) orb.trail.shift();
      }

      // Draw trail
      for (let t = 0; t < orb.trail.length; t++) {
        const tp = orb.trail[t];
        const ta = tp.a * (t / orb.trail.length) * 0.5;
        const ts = orb.size * 0.4 * (t / orb.trail.length);
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, ts, 0, Math.PI * 2);
        ctx.fillStyle = orb.color;
        ctx.globalAlpha = ta;
        ctx.fill();
      }

      // Draw glow
      ctx.globalAlpha = orb.alpha * 0.35;
      const glowSize = orb.size * 2.5;
      const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, glowSize);
      gradient.addColorStop(0, orb.glow);
      gradient.addColorStop(1, 'rgba(11,14,26,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, glowSize, 0, Math.PI * 2);
      ctx.fill();

      // Draw orb body (matte circle)
      ctx.globalAlpha = orb.alpha;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = orb.color;
      ctx.fill();

      // Inner highlight (subtle matte sheen)
      ctx.globalAlpha = orb.alpha * 0.3;
      const innerGrad = ctx.createRadialGradient(
        orb.x - orb.size * 0.15, orb.y - orb.size * 0.15, 0,
        orb.x, orb.y, orb.size / 2
      );
      innerGrad.addColorStop(0, 'rgba(213,207,194,.4)');
      innerGrad.addColorStop(1, 'rgba(213,207,194,0)');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.size / 2, 0, Math.PI * 2);
      ctx.fill();

      // Label text (only on primary orbs, only early in animation)
      if (orb.label && spiralT < 0.5) {
        const labelAlpha = orb.alpha * (1 - spiralT * 2);
        if (labelAlpha > 0.05) {
          ctx.globalAlpha = labelAlpha;
          ctx.font = `600 ${isMobile ? 11 : 13}px system-ui, -apple-system, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = '#d5cfc2';
          // Emoji above
          if (orb.emoji) {
            ctx.font = `${isMobile ? 18 : 22}px system-ui`;
            ctx.fillText(orb.emoji, orb.x, orb.y - orb.size / 2 - 12);
          }
          ctx.font = `600 ${isMobile ? 11 : 13}px system-ui, -apple-system, sans-serif`;
          ctx.fillText(orb.label, orb.x, orb.y + orb.size / 2 + 18);
        }
      }

      ctx.globalAlpha = 1;
    }

    // Soft vignette overlay as spiral converges
    if (spiralT > 0.5) {
      const vigAlpha = (spiralT - 0.5) * 0.15;
      const vigGrad = ctx.createRadialGradient(cx, cy, w * 0.15, cx, cy, w * 0.6);
      vigGrad.addColorStop(0, 'rgba(11,14,26,0)');
      vigGrad.addColorStop(1, `rgba(11,14,26,${vigAlpha})`);
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // Convergence halo + release pulse for a fuller reveal moment
    if (spiralT > 0.72) {
      const haloT = (spiralT - 0.72) / 0.28;
      const pulse = 0.45 + Math.sin(elapsed * 3.6) * 0.2;
      const radius = 48 + haloT * 120;
      const ringGrad = ctx.createRadialGradient(cx, cy, Math.max(10, radius * 0.4), cx, cy, radius);
      ringGrad.addColorStop(0, `rgba(201,148,74,${0.18 * pulse})`);
      ringGrad.addColorStop(0.7, `rgba(126,184,164,${0.11 * pulse})`);
      ringGrad.addColorStop(1, 'rgba(11,14,26,0)');
      ctx.globalAlpha = Math.min(1, haloT * 1.15);
      ctx.fillStyle = ringGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (haloT > 0.55) {
        const rays = isMobile ? 8 : 14;
        const rayAlpha = (haloT - 0.55) * 0.35;
        ctx.strokeStyle = `rgba(219,184,122,${rayAlpha})`;
        ctx.lineWidth = 1.2;
        for (let i = 0; i < rays; i++) {
          const a = (Math.PI * 2 / rays) * i + elapsed * 0.35;
          const r1 = 32 + Math.sin(elapsed * 1.2 + i) * 5;
          const r2 = 68 + haloT * 140;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
          ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
          ctx.stroke();
        }
      }
    }

    rafId = requestAnimationFrame(draw);
  }

  /* ── Audio: Soft ambient pad instead of rain ── */
  let audioCtx = null;
  let padGain = null;

  async function startAudio() {
    if (reducedMotion || audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      padGain = audioCtx.createGain();
      padGain.gain.value = 0.0001;
      padGain.connect(audioCtx.destination);

      // Soft pad: layered sine waves
      const freqs = [110, 165, 220, 277.2];
      freqs.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        // Gentle detune for warmth
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

  /* ── Entry / Exit ── */
  function completeEntry() {
    if (state.isEntering) return;
    state.isEntering = true;
    _ls.setItem(STORAGE_KEY, 'true');

    overlay.classList.add('entering');

    // Fade out audio
    if (padGain && audioCtx) {
      const now = audioCtx.currentTime;
      padGain.gain.cancelScheduledValues(now);
      padGain.gain.setValueAtTime(Math.max(0.0001, padGain.gain.value), now);
      padGain.gain.linearRampToValueAtTime(0.0001, now + 1.5);
    }

    // Accelerate spiral and fade out
    const exitStart = performance.now();
    const exitDur = 2000;

    function exitAnim(ts) {
      const p = Math.min((ts - exitStart) / exitDur, 1);
      // Speed up orbs outward (reverse funnel)
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
    line1.textContent = 'Welcome back.';
    line1.classList.add('visible');
    setTimeout(completeEntry, reducedMotion ? 400 : 1800);
  }

  function setupFirstTimeFlow() {
    const t1 = reducedMotion ? 300 : 2500;
    const t2 = reducedMotion ? 600 : 5000;
    const t3 = reducedMotion ? 800 : 5800;

    setTimeout(() => line1.classList.add('visible'), t1);
    setTimeout(() => line2.classList.add('visible'), t2);
    setTimeout(() => readyBtn.classList.add('visible'), t3);
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

  /* ── Wire events ── */
  readyBtn.addEventListener('click', completeEntry);
  skipLink.addEventListener('click', function (e) { e.preventDefault(); completeEntry(); });

  window.addEventListener('resize', () => { setupCanvas(); buildOrbs(); });

  document.addEventListener('visibilitychange', () => {
    rainPaused = document.hidden;
    if (rainPaused && rafId) { cancelAnimationFrame(rafId); rafId = 0; return; }
    if (!rainPaused && !state.isEntering && !rafId) { rafId = requestAnimationFrame(draw); }
  });

  /* ── Init ── */
  setupCanvas();
  buildOrbs();
  rafId = requestAnimationFrame(draw);
  bootstrapAudio();

  if (state.hasEnteredBefore) {
    setupReturningVisitorFlow();
  } else {
    setupFirstTimeFlow();
  }
})();
