(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
   * HONEY DRIP LYRICS — STARMILK
   * Smooth crossfade transitions, honey droplet particles,
   * progress visualization, background mood particles,
   * procedural sound cues, auto-advance with easing by line length.
   * ═══════════════════════════════════════════════════════════════ */

  const section = document.getElementById('lyrics');
  if (!section) return;

  const lineEl = section.querySelector('[data-lyric-line]');
  const counterEl = section.querySelector('[data-lyric-count]');
  const playBtn = section.querySelector('[data-lyrics-play]');
  const nextBtn = section.querySelector('[data-lyrics-next]');

  // ─── Lyric data (unchanged) ───────────────────────────────────
  const lines = [
    { text: "There's honey in the wound", mood: 'tender' },
    { text: 'sweetness where the sting used to live', mood: 'heavy' },
    { text: "I didn't know that healing", mood: 'hopeful' },
    { text: 'could taste like this', mood: 'tender' },
    { text: 'dripping gold from broken places', mood: 'heavy' },
    { text: 'every scar a hive', mood: 'hopeful' }
  ];

  // ─── Mood-based sound pitches ─────────────────────────────────
  const MOOD_PITCHES = {
    tender: 440,
    heavy: 330,
    hopeful: 523,
  };

  // ─── Auto-advance timing: base + per-character bonus ──────────
  const BASE_INTERVAL = 3200;
  const PER_CHAR_MS = 45;

  function getLineInterval(line) {
    return BASE_INTERVAL + line.text.length * PER_CHAR_MS;
  }

  // ─── Audio ────────────────────────────────────────────────────
  let audioCtx = null;
  let hasUserGesture = false;

  function ensureAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) { /* silent */ }
  }

  function sfxTone(pitch) {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = pitch;
      o.frequency.exponentialRampToValueAtTime(pitch * 0.75, audioCtx.currentTime + 0.5);
      g.gain.value = 0.03;
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
      o.connect(g).connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + 0.5);
    } catch (_) { /* silent */ }
  }

  // ─── State ────────────────────────────────────────────────────
  let index = 0;
  let playing = true;
  let timer = null;
  let inView = true;
  let particles = [];
  let bgParticles = [];
  let progressDots = [];
  let canvasEl = null;
  let canvasCtx = null;
  let animRaf = 0;
  let animTime = 0;
  let transitionPhase = 'idle'; // 'idle' | 'fading-out' | 'fading-in'
  let transitionAlpha = 1;
  let pendingIndex = -1;

  // ═══════════════════════════════════════════════════════════════
  //  CANVAS OVERLAY (for particles and progress)
  // ═══════════════════════════════════════════════════════════════

  function buildCanvas() {
    canvasEl = document.createElement('canvas');
    canvasEl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    canvasEl.setAttribute('aria-hidden', 'true');
    section.style.position = 'relative';
    section.insertBefore(canvasEl, section.firstChild);
    canvasCtx = canvasEl.getContext('2d');
    resizeCanvas();

    // Initialize background particles
    bgParticles = Array.from({ length: 35 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0003,
      vy: -Math.random() * 0.0004 - 0.0001,
      size: 1 + Math.random() * 2,
      alpha: 0.15 + Math.random() * 0.25,
      pulse: Math.random() * Math.PI * 2,
    }));

    // Build progress dot positions
    updateProgressDots();
  }

  function resizeCanvas() {
    if (!canvasEl) return;
    const rect = section.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasEl.width = Math.floor(rect.width * dpr);
    canvasEl.height = Math.floor(rect.height * dpr);
    canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function updateProgressDots() {
    const rect = section.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const totalDots = lines.length;
    const dotSpacing = 14;
    const startX = w / 2 - ((totalDots - 1) * dotSpacing) / 2;
    progressDots = lines.map((_, i) => ({
      x: startX + i * dotSpacing,
      y: h * 0.88,
    }));
  }

  // ─── Drip particles ───────────────────────────────────────────

  function spawnDripParticles() {
    const rect = section.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height * 0.4;
    for (let i = 0; i < 12; i++) {
      particles.push({
        x: cx + (Math.random() - 0.5) * 200,
        y: cy + (Math.random() - 0.5) * 20,
        vy: 0.5 + Math.random() * 1.5,
        vx: (Math.random() - 0.5) * 0.4,
        size: 2 + Math.random() * 3,
        alpha: 0.7 + Math.random() * 0.3,
        life: 80 + Math.random() * 60,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  ANIMATION LOOP
  // ═══════════════════════════════════════════════════════════════

  function animLoop() {
    animTime += 16;
    if (!canvasCtx || !canvasEl) { animRaf = requestAnimationFrame(animLoop); return; }

    const rect = section.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    canvasCtx.clearRect(0, 0, w, h);

    // Background mood particles
    const currentMood = lines[index].mood;
    const moodColors = {
      tender: [255, 200, 100],
      heavy: [180, 130, 255],
      hopeful: [100, 200, 255],
    };
    const col = moodColors[currentMood] || [255, 200, 100];

    bgParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
      if (p.x < -0.02) p.x = 1.02;
      if (p.x > 1.02) p.x = -0.02;

      const flicker = 0.5 + Math.sin(animTime * 0.002 + p.pulse) * 0.5;
      const a = p.alpha * flicker;

      const grd = canvasCtx.createRadialGradient(
        p.x * w, p.y * h, 0,
        p.x * w, p.y * h, p.size * 3
      );
      grd.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a})`);
      grd.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
      canvasCtx.fillStyle = grd;
      canvasCtx.beginPath();
      canvasCtx.arc(p.x * w, p.y * h, p.size * 3, 0, Math.PI * 2);
      canvasCtx.fill();
    });

    // Drip particles (honey droplets)
    particles = particles.filter(p => {
      p.y += p.vy;
      p.x += p.vx;
      p.vy += 0.04; // gravity
      p.alpha -= 0.006;
      p.life -= 1;

      if (p.life <= 0 || p.alpha <= 0) return false;

      // Draw honey droplet
      canvasCtx.fillStyle = `rgba(212,160,23,${p.alpha})`;
      canvasCtx.beginPath();
      // Teardrop shape
      canvasCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      canvasCtx.fill();

      // Small trail
      canvasCtx.fillStyle = `rgba(212,160,23,${p.alpha * 0.3})`;
      canvasCtx.beginPath();
      canvasCtx.arc(p.x, p.y - p.size * 1.5, p.size * 0.5, 0, Math.PI * 2);
      canvasCtx.fill();

      return true;
    });

    // Progress dots
    if (progressDots.length) {
      progressDots.forEach((dot, i) => {
        const isActive = i === index;
        const isPast = i < index;
        const radius = isActive ? 4 : 2.5;
        const alpha = isActive ? 1 : isPast ? 0.6 : 0.25;

        if (isActive) {
          // Glow for current dot
          const pulse = 0.6 + Math.sin(animTime * 0.005) * 0.4;
          const grd = canvasCtx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, 12);
          grd.addColorStop(0, `rgba(212,160,23,${0.3 * pulse})`);
          grd.addColorStop(1, `rgba(212,160,23,0)`);
          canvasCtx.fillStyle = grd;
          canvasCtx.beginPath();
          canvasCtx.arc(dot.x, dot.y, 12, 0, Math.PI * 2);
          canvasCtx.fill();
        }

        canvasCtx.fillStyle = `rgba(212,160,23,${alpha})`;
        canvasCtx.beginPath();
        canvasCtx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        canvasCtx.fill();
      });
    }

    // Crossfade transition
    if (transitionPhase === 'fading-out') {
      transitionAlpha -= 0.06;
      if (transitionAlpha <= 0) {
        transitionAlpha = 0;
        transitionPhase = 'fading-in';
        // Swap content
        index = pendingIndex;
        const item = lines[index];
        lineEl.textContent = item.text;
        section.dataset.temperature = item.mood;
        counterEl.textContent = `${index + 1} / ${lines.length}`;
        // Spawn drip particles
        spawnDripParticles();
      }
      lineEl.style.opacity = String(transitionAlpha);
      lineEl.style.transform = `translateY(${(1 - transitionAlpha) * -20}px)`;
    } else if (transitionPhase === 'fading-in') {
      transitionAlpha += 0.04;
      if (transitionAlpha >= 1) {
        transitionAlpha = 1;
        transitionPhase = 'idle';
      }
      lineEl.style.opacity = String(transitionAlpha);
      lineEl.style.transform = `translateY(${(1 - transitionAlpha) * 20}px)`;
    }

    animRaf = requestAnimationFrame(animLoop);
  }

  // ═══════════════════════════════════════════════════════════════
  //  LYRIC LOGIC
  // ═══════════════════════════════════════════════════════════════

  function render() {
    const item = lines[index];
    // Remove is-dripping and re-trigger for CSS animation
    lineEl.classList.remove('is-dripping');
    void lineEl.offsetWidth;
    lineEl.textContent = item.text;
    lineEl.classList.add('is-dripping');
    lineEl.style.opacity = '1';
    lineEl.style.transform = 'none';

    section.dataset.temperature = item.mood;
    counterEl.textContent = `${index + 1} / ${lines.length}`;
    updateProgressDots();
  }

  function transitionToNext() {
    const nextIndex = (index + 1) % lines.length;
    pendingIndex = nextIndex;
    transitionPhase = 'fading-out';
    transitionAlpha = 1;

    // Sound cue
    if (hasUserGesture) {
      const nextMood = lines[nextIndex].mood;
      sfxTone(MOOD_PITCHES[nextMood] || 440);
    }
  }

  function step() {
    transitionToNext();
  }

  function start() {
    if (timer || !inView || document.hidden) return;
    const interval = getLineInterval(lines[index]);
    timer = setTimeout(function tick() {
      step();
      const nextInterval = getLineInterval(lines[(index + 1) % lines.length]);
      timer = setTimeout(tick, nextInterval);
    }, interval);
    playBtn.textContent = 'Pause Flow';
    playBtn.setAttribute('aria-pressed', 'true');
  }

  function stop() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    playBtn.textContent = 'Play Flow';
    playBtn.setAttribute('aria-pressed', 'false');
  }

  // ═══════════════════════════════════════════════════════════════
  //  EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════

  playBtn.addEventListener('click', () => {
    if (!hasUserGesture) {
      hasUserGesture = true;
      ensureAudio();
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    }
    playing = !playing;
    if (playing) start();
    else stop();
  });

  nextBtn.addEventListener('click', () => {
    if (!hasUserGesture) {
      hasUserGesture = true;
      ensureAudio();
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    }
    // Reset auto-advance timer
    stop();
    step();
    if (playing) {
      // Restart timer after transition
      setTimeout(() => { if (playing) start(); }, 600);
    }
  });

  const observer = new IntersectionObserver((entries) => {
    const entry = entries[0];
    inView = Boolean(entry && entry.isIntersecting);
    if (!inView) stop();
    else if (playing) start();
  }, { threshold: 0.15 });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (playing && inView) start();
  });

  window.addEventListener('resize', () => {
    resizeCanvas();
    updateProgressDots();
  }, { passive: true });

  // ═══════════════════════════════════════════════════════════════
  //  BOOTSTRAP
  // ═══════════════════════════════════════════════════════════════

  buildCanvas();
  observer.observe(section);
  render();
  start();
  animRaf = requestAnimationFrame(animLoop);
})();
