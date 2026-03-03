(function () {
  'use strict';

  const STORAGE_KEY = 'starmilkParkingLotEntered';
  const overlay = document.getElementById('parking-lot-overlay');
  if (!overlay) return;

  const rainCanvas = document.getElementById('parking-lot-rain');
  const line1 = document.getElementById('parking-lot-line-1');
  const line2 = document.getElementById('parking-lot-line-2');
  const readyBtn = document.getElementById('parking-lot-ready');
  const skipLink = document.getElementById('parking-lot-skip');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  document.body.classList.add('parking-lot-active');

  const state = {
    rainVelocityScale: 1,
    isEntering: false,
    hasEnteredBefore: localStorage.getItem(STORAGE_KEY) === 'true'
  };

  let ctx = null;
  let rainDrops = [];
  let rafId = 0;
  let audioCtx = null;
  let rainSource = null;
  let rainGain = null;
  let tickTimer = null;
  let tickCount = 0;
  let rainPaused = false;

  function buildRain() {
    if (!rainCanvas) return;
    ctx = rainCanvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    rainCanvas.width = Math.floor(width * dpr);
    rainCanvas.height = Math.floor(height * dpr);
    rainCanvas.style.width = width + 'px';
    rainCanvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const density = isMobile ? 0.2 : 0.5;
    const count = Math.floor(width * density);

    rainDrops = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      len: 10 + Math.random() * 24,
      speed: 2.2 + Math.random() * 3.4,
      alpha: 0.05 + Math.random() * 0.25,
      thickness: 0.6 + Math.random() * 1.15
    }));
  }

  function drawRain() {
    if (!ctx || rainPaused) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width * 0.08, 0);
    ctx.rotate(-0.2);

    for (let i = 0; i < rainDrops.length; i += 1) {
      const drop = rainDrops[i];
      drop.y += drop.speed * state.rainVelocityScale;
      drop.x += 0.15 * state.rainVelocityScale;

      if (drop.y > height + 40) {
        drop.y = -40;
        drop.x = Math.random() * width;
      }

      ctx.strokeStyle = `rgba(192, 214, 255, ${drop.alpha})`;
      ctx.lineWidth = drop.thickness;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x, drop.y + drop.len);
      ctx.stroke();
    }

    ctx.restore();
    rafId = requestAnimationFrame(drawRain);
  }

  async function startAudio() {
    if (reducedMotion || audioCtx) return;

    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      rainGain = audioCtx.createGain();
      rainGain.gain.value = 0.0001;
      rainGain.connect(audioCtx.destination);

      const bufferSize = audioCtx.sampleRate * 2;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }

      rainSource = audioCtx.createBufferSource();
      rainSource.buffer = noiseBuffer;
      rainSource.loop = true;

      const rainBand = audioCtx.createBiquadFilter();
      rainBand.type = 'bandpass';
      rainBand.frequency.value = 1900;
      rainBand.Q.value = 0.5;

      const rainShaper = audioCtx.createBiquadFilter();
      rainShaper.type = 'lowpass';
      rainShaper.frequency.value = 2500;

      rainSource.connect(rainBand);
      rainBand.connect(rainShaper);
      rainShaper.connect(rainGain);
      rainSource.start();

      const now = audioCtx.currentTime;
      rainGain.gain.cancelScheduledValues(now);
      rainGain.gain.setValueAtTime(0.0001, now);
      rainGain.gain.linearRampToValueAtTime(0.028, now + 2.2);

      scheduleTick();
    } catch (error) {
      // Ignore audio setup failures in restrictive browsers.
    }
  }

  function playTick() {
    if (!audioCtx || audioCtx.state !== 'running' || state.isEntering) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.value = 1200 - tickCount * 80;

    filter.type = 'bandpass';
    filter.frequency.value = 1700;
    filter.Q.value = 8;

    gain.gain.value = 0;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    const t = audioCtx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.015, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

    osc.start(t);
    osc.stop(t + 0.25);

    tickCount += 1;
  }

  function scheduleTick() {
    if (state.isEntering) return;

    const delay = 2600 + Math.random() * 2300;
    tickTimer = window.setTimeout(() => {
      playTick();
      scheduleTick();
    }, delay);
  }

  function show(el) {
    if (el) el.classList.add('visible');
  }

  function completeEntry() {
    if (state.isEntering) return;
    state.isEntering = true;
    localStorage.setItem(STORAGE_KEY, 'true');

    overlay.classList.add('entering');

    const rampStart = performance.now();
    const duration = 1800;

    function slowRain(ts) {
      const elapsed = ts - rampStart;
      const progress = Math.min(elapsed / duration, 1);
      state.rainVelocityScale = 1 - progress * 0.78;

      if (rainGain && audioCtx) {
        const now = audioCtx.currentTime;
        rainGain.gain.cancelScheduledValues(now);
        rainGain.gain.setValueAtTime(Math.max(0.0001, rainGain.gain.value), now);
        rainGain.gain.linearRampToValueAtTime(0.0001, now + 1.4);
      }

      if (progress < 1) {
        requestAnimationFrame(slowRain);
      } else {
        overlay.classList.add('exited');
        window.setTimeout(() => {
          overlay.remove();
          document.body.classList.remove('parking-lot-active');
          window.dispatchEvent(new CustomEvent('starmilk:parkingLotDismissed'));

          if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
          }
          if (tickTimer) clearTimeout(tickTimer);

          if (rainSource) {
            try { rainSource.stop(); } catch (e) { /* no-op */ }
          }

          if (audioCtx) {
            audioCtx.close().catch(function () {});
          }
        }, 1450);
      }
    }

    requestAnimationFrame(slowRain);
  }

  function setupReturningVisitorFlow() {
    line1.textContent = 'Welcome back.';
    show(line1);
    window.setTimeout(completeEntry, reducedMotion ? 500 : 2000);
  }

  function setupFirstTimeFlow() {
    const firstDelay = reducedMotion ? 500 : 3000;
    const secondDelay = reducedMotion ? 1000 : 6000;
    const buttonDelay = reducedMotion ? 1200 : 6600;

    window.setTimeout(() => show(line1), firstDelay);
    window.setTimeout(() => show(line2), secondDelay);
    window.setTimeout(() => show(readyBtn), buttonDelay);
  }

  function bootstrapAudioOnInteraction() {
    const resume = async () => {
      await startAudio();
      if (audioCtx && audioCtx.state === 'suspended') {
        try {
          await audioCtx.resume();
        } catch (error) {
          // Ignore resume failures.
        }
      }
    };

    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });

    startAudio();
  }

  readyBtn.addEventListener('click', completeEntry);
  skipLink.addEventListener('click', function (event) {
    event.preventDefault();
    completeEntry();
  });

  window.addEventListener('resize', buildRain);

  document.addEventListener('visibilitychange', () => {
    rainPaused = document.hidden;
    if (rainPaused && rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
      return;
    }
    if (!rainPaused && !state.isEntering && !rafId) {
      drawRain();
    }
  });

  buildRain();
  drawRain();
  bootstrapAudioOnInteraction();

  if (state.hasEnteredBefore) {
    setupReturningVisitorFlow();
  } else {
    setupFirstTimeFlow();
  }
})();
