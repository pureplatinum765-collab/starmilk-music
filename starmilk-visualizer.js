/* ═══════════════════════════════════════════════════════════
   STARMILK AUDIO VISUALIZER ENGINE
   Pure canvas / Web Audio API — no libraries.
   Reads from microphone or dummy oscillator.
   Mouse/touch interactivity: ripple on click.
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────
  const CFG = {
    fftSize: 512,
    smoothing: 0.82,
    barGap: 2,
    minBarH: 2,
    bloomPasses: 2,
    rippleLife: 60,       // frames
    idleAmplitude: 0.18,  // fraction of canvas height when no audio
    idleSpeed: 0.012,
    particleCount: 32,
  };

  // ── Colour palettes ─────────────────────────────────────────
  const PALETTES = {
    gold: [
      [201, 148, 74],
      [219, 184, 122],
      [160, 110, 50],
    ],
    cosmic: [
      [107, 91, 138],
      [122, 154, 184],
      [74, 112, 104],
    ],
    fire: [
      [220, 80,  40],
      [240, 160, 30],
      [200, 50,  80],
    ],
    void: [
      [60,  80, 160],
      [100, 60, 180],
      [40, 120, 180],
    ],
  };

  let currentPalette = 'gold';
  let currentMode    = 'bars'; // bars | wave | circle

  // ── State ───────────────────────────────────────────────────
  let canvas, ctx, analyser, dataArray, bufferLength;
  let audioCtx = null;
  let sourceNode = null;
  let micStream  = null;
  let isMicActive = false;
  let frameId = null;
  let idleT   = 0;
  let ripples = [];   // [{x, y, t, maxT}]
  let particles = []; // background sparkles
  let mouseX = -1, mouseY = -1;
  let dpr = 1;

  // ── Init ────────────────────────────────────────────────────
  function init () {
    canvas = document.getElementById('viz-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    // Touch / mouse for ripples
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      mouseX = (e.clientX - r.left) * dpr;
      mouseY = (e.clientY - r.top)  * dpr;
    });
    canvas.addEventListener('mouseleave', () => { mouseX = -1; mouseY = -1; });
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const r  = canvas.getBoundingClientRect();
      const t  = e.touches[0];
      addRipple((t.clientX - r.left) * dpr, (t.clientY - r.top) * dpr);
    }, { passive: false });

    // Build idle analyser (silent oscillator at 0 gain)
    buildIdleAnalyser();
    spawnParticles();
    startLoop();

    // Wire up UI buttons
    wireUI();
  }

  // ── Canvas resize ───────────────────────────────────────────
  function resize () {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    if (ctx) ctx.scale(dpr, dpr);
  }

  // ── Build a silent fallback analyser ────────────────────────
  function buildIdleAnalyser () {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      // Silent oscillator
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize     = CFG.fftSize;
      analyser.smoothingTimeConstant = CFG.smoothing;
      gain.connect(analyser);
      // Do NOT connect to destination — completely silent
      osc.start();
      bufferLength = analyser.frequencyBinCount;
      dataArray    = new Uint8Array(bufferLength);
    } catch (e) {
      console.warn('[VIZ] AudioContext failed:', e);
    }
  }

  // ── Microphone capture ──────────────────────────────────────
  async function startMic () {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (sourceNode) sourceNode.disconnect();
      sourceNode = audioCtx.createMediaStreamSource(micStream);
      if (!analyser) {
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = CFG.fftSize;
        analyser.smoothingTimeConstant = CFG.smoothing;
        bufferLength = analyser.frequencyBinCount;
        dataArray    = new Uint8Array(bufferLength);
      }
      sourceNode.connect(analyser);
      isMicActive = true;
      setMicStatus(true);
    } catch (err) {
      console.warn('[VIZ] Mic denied:', err);
      setMicStatus(false);
      isMicActive = false;
    }
  }

  function stopMic () {
    if (micStream) {
      micStream.getTracks().forEach(t => t.stop());
      micStream = null;
    }
    if (sourceNode) {
      sourceNode.disconnect();
      sourceNode = null;
    }
    isMicActive = false;
    setMicStatus(false);
  }

  function setMicStatus (on) {
    const el = document.querySelector('.viz-mic-status');
    if (!el) return;
    el.classList.toggle('active', on);
    el.querySelector('.viz-mic-dot');
    const txt = el.querySelector('.viz-mic-text');
    if (txt) txt.textContent = on ? 'Mic live' : 'Mic off';
  }

  // ── Particles (background ambient sparkles) ─────────────────
  function spawnParticles () {
    particles = [];
    const w = canvas ? canvas.clientWidth  : 800;
    const h = canvas ? canvas.clientHeight : 300;
    for (let i = 0; i < CFG.particleCount; i++) {
      particles.push({
        x:   Math.random() * w,
        y:   Math.random() * h,
        r:   Math.random() * 1.5 + 0.4,
        vx:  (Math.random() - .5) * .25,
        vy:  (Math.random() - .5) * .25,
        a:   Math.random() * .35 + .05,
        da:  (Math.random() - .5) * .003,
      });
    }
  }

  function tickParticles () {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.a += p.da;
      if (p.a > .45 || p.a < .04) p.da *= -1;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;
    });
  }

  function drawParticles () {
    const pal = PALETTES[currentPalette];
    const col = pal[0];
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${p.a})`;
      ctx.fill();
    });
  }

  // ── Ripples ─────────────────────────────────────────────────
  function onCanvasClick (e) {
    const r = canvas.getBoundingClientRect();
    addRipple((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr);
    // Resume audio context on user gesture
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  function addRipple (x, y) {
    ripples.push({ x, y, t: 0, maxT: CFG.rippleLife });
    if (ripples.length > 8) ripples.shift();
  }

  function drawRipples () {
    const pal = PALETTES[currentPalette];
    const col = pal[1];
    ripples.forEach(rip => {
      const progress = rip.t / rip.maxT;
      const radius   = progress * (canvas.clientWidth * 0.4);
      const alpha    = (1 - progress) * 0.45;
      ctx.beginPath();
      ctx.arc(rip.x / dpr, rip.y / dpr, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha})`;
      ctx.lineWidth   = 1.5 * (1 - progress);
      ctx.stroke();
    });
    // Tick
    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i].t++;
      if (ripples[i].t > ripples[i].maxT) ripples.splice(i, 1);
    }
  }

  // ── Draw helpers ────────────────────────────────────────────
  function getFrequencyColor (normIndex, amplitude, alpha) {
    const pal  = PALETTES[currentPalette];
    const i0   = Math.floor(normIndex * (pal.length - 1));
    const i1   = Math.min(i0 + 1, pal.length - 1);
    const t    = (normIndex * (pal.length - 1)) - i0;
    const r    = pal[i0][0] + (pal[i1][0] - pal[i0][0]) * t;
    const g    = pal[i0][1] + (pal[i1][1] - pal[i0][1]) * t;
    const b    = pal[i0][2] + (pal[i1][2] - pal[i0][2]) * t;
    const aFin = alpha * (0.4 + amplitude * 0.6);
    return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${aFin})`;
  }

  // ── Idle waveform (pretty even without audio) ───────────────
  function getIdleValue (i, n) {
    const x = i / n;
    return (
      Math.sin(idleT * 1.1 + x * Math.PI * 4) * 0.55 +
      Math.sin(idleT * 0.7 + x * Math.PI * 7) * 0.28 +
      Math.sin(idleT * 1.9 + x * Math.PI * 2) * 0.17
    ) * 0.5 + 0.5; // 0–1
  }

  // ── Render: BARS mode ───────────────────────────────────────
  function drawBars (w, h, freqData) {
    const count = Math.floor(bufferLength * 0.6);
    const bw    = (w - CFG.barGap * (count - 1)) / count;

    for (let i = 0; i < count; i++) {
      const raw  = freqData[i] / 255;
      const norm = i / count;
      const barH = Math.max(CFG.minBarH, raw * h * 0.85);
      const x    = i * (bw + CFG.barGap);
      const y    = h - barH;

      // Bloom: soft shadow behind bar
      ctx.shadowColor = getFrequencyColor(norm, raw, 0.35);
      ctx.shadowBlur  = raw * 14 + 2;

      const grad = ctx.createLinearGradient(0, y, 0, h);
      grad.addColorStop(0, getFrequencyColor(norm, raw, 0.95));
      grad.addColorStop(1, getFrequencyColor(1 - norm, raw * 0.4, 0.3));
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(x, y, Math.max(1, bw - 1), barH, [2, 2, 0, 0])
        : ctx.rect(x, y, Math.max(1, bw - 1), barH);
      ctx.fill();
    }
    ctx.shadowBlur  = 0;
    ctx.shadowColor = 'transparent';
  }

  // ── Render: WAVE mode ───────────────────────────────────────
  function drawWave (w, h, waveData) {
    const pal  = PALETTES[currentPalette];
    const col  = pal[0];
    const col2 = pal[1];

    ctx.beginPath();
    for (let i = 0; i < bufferLength; i++) {
      const x  = (i / bufferLength) * w;
      const v  = waveData[i] / 128 - 1;
      const y  = h / 2 + v * (h * 0.38);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},0.85)`;
    ctx.lineWidth   = 2;
    ctx.shadowColor = `rgba(${col2[0]},${col2[1]},${col2[2]},0.4)`;
    ctx.shadowBlur  = 8;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Mirror ghost
    ctx.beginPath();
    for (let i = 0; i < bufferLength; i++) {
      const x  = (i / bufferLength) * w;
      const v  = waveData[i] / 128 - 1;
      const y  = h / 2 - v * (h * 0.38) * 0.4;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(${col2[0]},${col2[1]},${col2[2]},0.2)`;
    ctx.lineWidth   = 1;
    ctx.stroke();
  }

  // ── Render: CIRCLE mode ─────────────────────────────────────
  function drawCircle (w, h, freqData) {
    const cx   = w / 2;
    const cy   = h / 2;
    const rMin = Math.min(w, h) * 0.2;
    const rMax = Math.min(w, h) * 0.42;
    const pal  = PALETTES[currentPalette];
    const col  = pal[0];

    // Inner glow ring
    const grd = ctx.createRadialGradient(cx, cy, rMin * 0.5, cx, cy, rMin);
    grd.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},0.12)`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, rMin, 0, Math.PI * 2);
    ctx.fill();

    const count = Math.floor(bufferLength * 0.55);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const raw   = freqData[i] / 255;
      const r1    = rMin;
      const r2    = rMin + raw * (rMax - rMin);
      const norm  = i / count;

      ctx.shadowColor = getFrequencyColor(norm, raw, 0.5);
      ctx.shadowBlur  = raw * 12;
      ctx.strokeStyle = getFrequencyColor(norm, raw, 0.9);
      ctx.lineWidth   = 1.5;

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
      ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
      ctx.stroke();
    }
    ctx.shadowBlur  = 0;
    ctx.shadowColor = 'transparent';
  }

  // ── Main draw loop ──────────────────────────────────────────
  function draw () {
    frameId = requestAnimationFrame(draw);
    idleT  += CFG.idleSpeed;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // Get frequency / time data
    let freqData = new Uint8Array(bufferLength || 256).fill(0);
    let waveData = new Uint8Array(bufferLength || 256).fill(128);

    if (analyser) {
      freqData = new Uint8Array(analyser.frequencyBinCount);
      waveData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(waveData);
    }

    // If not mic-active, inject idle sine wave to keep it pretty
    if (!isMicActive) {
      const n = freqData.length;
      for (let i = 0; i < n; i++) {
        const idle = getIdleValue(i, n);
        freqData[i] = Math.round(idle * 255 * CFG.idleAmplitude);
        waveData[i] = Math.round(128 + (idle - 0.5) * 2 * 80 * CFG.idleAmplitude);
      }
    }

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#04060d');
    bgGrad.addColorStop(1, '#060810');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Ambient grid lines
    drawGrid(w, h);

    // Particles
    tickParticles();
    drawParticles();

    // Main visualization
    if (currentMode === 'bars')   drawBars(w, h, freqData);
    if (currentMode === 'wave')   drawWave(w, h, waveData);
    if (currentMode === 'circle') drawCircle(w, h, freqData);

    // Ripples
    drawRipples();

    // Mouse glow
    if (mouseX > 0) {
      const pal = PALETTES[currentPalette];
      const col = pal[0];
      const grd = ctx.createRadialGradient(mouseX / dpr, mouseY / dpr, 0, mouseX / dpr, mouseY / dpr, 80);
      grd.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},0.07)`);
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // ── Subtle grid lines ───────────────────────────────────────
  function drawGrid (w, h) {
    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    ctx.lineWidth   = 1;
    const rows = 4;
    for (let i = 1; i < rows; i++) {
      const y = (i / rows) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  function startLoop () {
    if (frameId) cancelAnimationFrame(frameId);
    draw();
  }

  // ── Wire UI buttons ─────────────────────────────────────────
  function wireUI () {
    // Mode buttons
    document.querySelectorAll('[data-viz-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentMode = btn.dataset.vizMode;
        document.querySelectorAll('[data-viz-mode]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Palette swatches
    document.querySelectorAll('[data-viz-palette]').forEach(swatch => {
      swatch.addEventListener('click', () => {
        currentPalette = swatch.dataset.vizPalette;
        document.querySelectorAll('[data-viz-palette]').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
      });
    });

    // Mic toggle
    const micBtn = document.getElementById('viz-mic-btn');
    if (micBtn) {
      micBtn.addEventListener('click', async () => {
        if (isMicActive) {
          stopMic();
          micBtn.classList.remove('active');
        } else {
          await startMic();
          micBtn.classList.toggle('active', isMicActive);
        }
      });
    }

    // Fullscreen
    const fsBtn = document.getElementById('viz-fs-btn');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        const shell = document.querySelector('.viz-shell');
        if (!shell) return;
        if (!document.fullscreenElement) {
          shell.requestFullscreen && shell.requestFullscreen();
        } else {
          document.exitFullscreen && document.exitFullscreen();
        }
      });
    }

    // Set initial active states
    const firstMode = document.querySelector('[data-viz-mode="bars"]');
    if (firstMode) firstMode.classList.add('active');
    const firstPal  = document.querySelector('[data-viz-palette="gold"]');
    if (firstPal)  firstPal.classList.add('active');
  }

  // ── YouTube facade click handler ────────────────────────────
  function wireYouTube () {
    document.querySelectorAll('.yt-card-facade').forEach(btn => {
      btn.addEventListener('click', function () {
        const ytId  = this.dataset.ytId;
        if (!ytId) return;
        this.classList.add('loading');
        const iframe       = document.createElement('iframe');
        iframe.className   = 'yt-card-iframe';
        iframe.allow       = 'autoplay; encrypted-media; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.src         = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&origin=${encodeURIComponent(location.origin)}`;
        // Replace facade with iframe
        this.parentNode.replaceChild(iframe, this);
      });
    });
  }

  // ── Boot ────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { init(); wireYouTube(); });
  } else {
    init();
    wireYouTube();
  }

})();
