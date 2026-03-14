(function () {
  'use strict';

  const section = document.getElementById('lyrics');
  if (!section) return;

  const lineEl = section.querySelector('[data-lyric-line]');
  const sublineEl = section.querySelector('[data-lyric-subline]');
  const counterEl = section.querySelector('[data-lyric-count]');
  const playBtn = section.querySelector('[data-lyrics-play]');
  const nextBtn = section.querySelector('[data-lyrics-next]');
  const songsEl = section.querySelector('[data-lyrics-songs]');

  const songs = [
    {
      id: 'honey',
      title: 'HONEY IN THE WOUND',
      tag: 'wound → sweetness',
      lines: [
        { text: "There's honey in the wound", sub: 'Sweetness where the sting used to live.', mood: 'tender' },
        { text: "I didn't know that healing", sub: 'could taste like this.', mood: 'hopeful' },
        { text: 'Dripping gold from broken places', sub: 'every scar a small hive of light.', mood: 'heavy' },
        { text: 'The ache turns amber on my tongue', sub: 'and asks me to stay with myself.', mood: 'tender' },
        { text: 'Where I cracked, the river entered', sub: 'and carried me back to breath.', mood: 'hopeful' },
        { text: 'I call it mercy now', sub: 'this wound that finally speaks soft.', mood: 'tender' },
      ]
    },
    {
      id: 'river',
      title: 'RIVERS PULL',
      tag: 'source → ocean',
      lines: [
        { text: 'River to ocean, I open wide', sub: 'current under ribs, moon under skin.', mood: 'hopeful' },
        { text: 'Stones in my pockets turn to stars', sub: 'when water keeps its promise.', mood: 'tender' },
        { text: 'Every bend remembers me', sub: 'before I learned to brace for impact.', mood: 'heavy' },
        { text: 'I float what I cannot carry', sub: 'name by name, breath by breath.', mood: 'hopeful' },
        { text: 'At the mouth, salt and sky agree', sub: 'I was never meant to stay small.', mood: 'tender' },
      ]
    },
    {
      id: 'tribe',
      title: 'TRIBE STAR MILK',
      tag: 'inner child anthem',
      lines: [
        { text: 'We were children with cosmic pockets', sub: 'keeping marbles of thunder and milk.', mood: 'tender' },
        { text: 'We built constellations from bruises', sub: 'and called them maps home.', mood: 'heavy' },
        { text: 'Hands up, heart open, tribe alive', sub: 'no one left outside the fire.', mood: 'hopeful' },
        { text: 'We dance the dark back into rhythm', sub: 'heel, breath, pulse, laugh.', mood: 'hopeful' },
        { text: 'Round and round, we become each other', sub: 'starlight through orchard branches.', mood: 'tender' },
      ]
    }
  ];

  const MOOD_PITCHES = { tender: 440, heavy: 320, hopeful: 523 };
  const BASE_INTERVAL = 2800;
  const PER_CHAR_MS = 26;

  let songIndex = 0;
  let lineIndex = 0;
  let playing = true;
  let timer = null;
  let inView = true;
  let audioCtx = null;
  let hasUserGesture = false;

  let particles = [];
  let bgParticles = [];
  let progressDots = [];
  let canvasEl = null;
  let canvasCtx = null;
  let animRaf = 0;
  let animTime = 0;
  let transitionPhase = 'idle';
  let transitionAlpha = 1;
  let pendingLineIndex = -1;

  function activeSong() {
    return songs[songIndex];
  }

  function getLineInterval(line) {
    return BASE_INTERVAL + line.text.length * PER_CHAR_MS;
  }

  function ensureAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) {}
  }

  function sfxTone(pitch) {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = pitch;
      o.frequency.exponentialRampToValueAtTime(pitch * 0.78, audioCtx.currentTime + 0.45);
      g.gain.value = 0.03;
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.45);
      o.connect(g).connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + 0.45);
    } catch (_) {}
  }

  function buildSongButtons() {
    songsEl.innerHTML = songs.map((song, i) => `
      <button class="lyrics-song ${i === songIndex ? 'active' : ''}" data-song-idx="${i}" type="button">
        <strong>${song.title}</strong>
        <span>${song.tag}</span>
      </button>
    `).join('');

    songsEl.querySelectorAll('[data-song-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.songIdx);
        if (!Number.isFinite(idx) || idx === songIndex) return;
        songIndex = idx;
        lineIndex = 0;
        syncActiveSongButton();
        render();
        stop();
        if (playing) setTimeout(start, 220);
      });
    });
  }

  function syncActiveSongButton() {
    songsEl.querySelectorAll('[data-song-idx]').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.songIdx) === songIndex);
    });
  }

  function buildCanvas() {
    canvasEl = document.createElement('canvas');
    canvasEl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    canvasEl.setAttribute('aria-hidden', 'true');
    section.style.position = 'relative';
    section.insertBefore(canvasEl, section.firstChild);
    canvasCtx = canvasEl.getContext('2d');
    resizeCanvas();

    bgParticles = Array.from({ length: 40 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00028,
      vy: -Math.random() * 0.00036 - 0.0001,
      size: 1 + Math.random() * 2,
      alpha: 0.12 + Math.random() * 0.24,
      pulse: Math.random() * Math.PI * 2,
    }));

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
    const song = activeSong();
    const totalDots = song.lines.length;
    const dotSpacing = 16;
    const startX = rect.width / 2 - ((totalDots - 1) * dotSpacing) / 2;
    progressDots = song.lines.map((_, i) => ({ x: startX + i * dotSpacing, y: rect.height * 0.9 }));
  }

  function spawnDripParticles() {
    const rect = section.getBoundingClientRect();
    const cx = rect.width * 0.62;
    const cy = rect.height * 0.46;
    for (let i = 0; i < 14; i++) {
      particles.push({
        x: cx + (Math.random() - 0.5) * 180,
        y: cy + (Math.random() - 0.5) * 25,
        vy: 0.45 + Math.random() * 1.35,
        vx: (Math.random() - 0.5) * 0.4,
        size: 1.8 + Math.random() * 2.8,
        alpha: 0.65 + Math.random() * 0.35,
        life: 70 + Math.random() * 60,
      });
    }
  }

  function animLoop() {
    animTime += 16;
    if (!canvasCtx || !canvasEl) { animRaf = requestAnimationFrame(animLoop); return; }

    const rect = section.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    canvasCtx.clearRect(0, 0, w, h);

    const currentMood = activeSong().lines[lineIndex].mood;
    const moodColors = {
      tender: [255, 202, 126],
      heavy: [176, 126, 245],
      hopeful: [88, 191, 255],
    };
    const col = moodColors[currentMood] || [255, 202, 126];

    bgParticles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
      if (p.x < -0.02) p.x = 1.02;
      if (p.x > 1.02) p.x = -0.02;

      const flicker = 0.5 + Math.sin(animTime * 0.002 + p.pulse) * 0.5;
      const a = p.alpha * flicker;

      const grd = canvasCtx.createRadialGradient(p.x * w, p.y * h, 0, p.x * w, p.y * h, p.size * 3.1);
      grd.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a})`);
      grd.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
      canvasCtx.fillStyle = grd;
      canvasCtx.beginPath();
      canvasCtx.arc(p.x * w, p.y * h, p.size * 3.1, 0, Math.PI * 2);
      canvasCtx.fill();
    });

    particles = particles.filter((p) => {
      p.y += p.vy;
      p.x += p.vx;
      p.vy += 0.034;
      p.alpha -= 0.006;
      p.life -= 1;
      if (p.life <= 0 || p.alpha <= 0) return false;
      canvasCtx.fillStyle = `rgba(212,160,23,${p.alpha})`;
      canvasCtx.beginPath();
      canvasCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      canvasCtx.fill();
      return true;
    });

    progressDots.forEach((dot, i) => {
      const isActive = i === lineIndex;
      const isPast = i < lineIndex;
      const radius = isActive ? 4 : 2.5;
      const alpha = isActive ? 1 : isPast ? 0.56 : 0.22;
      if (isActive) {
        const pulse = 0.6 + Math.sin(animTime * 0.005) * 0.4;
        const grd = canvasCtx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, 12);
        grd.addColorStop(0, `rgba(212,160,23,${0.3 * pulse})`);
        grd.addColorStop(1, 'rgba(212,160,23,0)');
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

    if (transitionPhase === 'fading-out') {
      transitionAlpha -= 0.064;
      if (transitionAlpha <= 0) {
        transitionAlpha = 0;
        transitionPhase = 'fading-in';
        lineIndex = pendingLineIndex;
        const item = activeSong().lines[lineIndex];
        lineEl.textContent = item.text;
        sublineEl.textContent = item.sub;
        section.dataset.temperature = item.mood;
        counterEl.textContent = `${lineIndex + 1} / ${activeSong().lines.length}`;
        spawnDripParticles();
      }
      lineEl.style.opacity = String(transitionAlpha);
      sublineEl.style.opacity = String(Math.max(0, transitionAlpha - 0.18));
      lineEl.style.transform = `translateY(${(1 - transitionAlpha) * -20}px)`;
    } else if (transitionPhase === 'fading-in') {
      transitionAlpha += 0.045;
      if (transitionAlpha >= 1) {
        transitionAlpha = 1;
        transitionPhase = 'idle';
      }
      lineEl.style.opacity = String(transitionAlpha);
      sublineEl.style.opacity = String(Math.min(1, transitionAlpha * 0.85));
      lineEl.style.transform = `translateY(${(1 - transitionAlpha) * 18}px)`;
    }

    animRaf = requestAnimationFrame(animLoop);
  }

  function render() {
    const item = activeSong().lines[lineIndex];
    lineEl.classList.remove('is-dripping');
    void lineEl.offsetWidth;
    lineEl.textContent = item.text;
    sublineEl.textContent = item.sub;
    lineEl.classList.add('is-dripping');
    lineEl.style.opacity = '1';
    sublineEl.style.opacity = '.9';
    lineEl.style.transform = 'none';
    section.dataset.temperature = item.mood;
    counterEl.textContent = `${lineIndex + 1} / ${activeSong().lines.length}`;
    updateProgressDots();
  }

  function transitionToNext() {
    const nextIndex = (lineIndex + 1) % activeSong().lines.length;
    pendingLineIndex = nextIndex;
    transitionPhase = 'fading-out';
    transitionAlpha = 1;

    if (hasUserGesture) {
      sfxTone(MOOD_PITCHES[activeSong().lines[nextIndex].mood] || 440);
    }
  }

  function start() {
    if (timer || !inView || document.hidden) return;
    timer = setTimeout(function tick() {
      transitionToNext();
      timer = setTimeout(tick, getLineInterval(activeSong().lines[(lineIndex + 1) % activeSong().lines.length]));
    }, getLineInterval(activeSong().lines[lineIndex]));
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
    stop();
    transitionToNext();
    if (playing) setTimeout(() => { if (playing) start(); }, 560);
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

  buildCanvas();
  buildSongButtons();
  observer.observe(section);
  render();
  start();
  animRaf = requestAnimationFrame(animLoop);
})();
