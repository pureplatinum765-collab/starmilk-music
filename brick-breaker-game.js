(function () {
  'use strict';

  const overlay = document.getElementById('brick-breaker-overlay');
  const launchBtn = document.getElementById('brick-breaker-launch');
  const closeBtn = document.getElementById('brick-breaker-close');
  const canvas = document.getElementById('brick-breaker-canvas');
  const stats = document.getElementById('brick-breaker-stats');
  const powerWrap = document.getElementById('brick-breaker-powerups');
  const mobileControls = document.getElementById('brick-breaker-mobile-controls');

  if (!overlay || !launchBtn || !canvas) return;

  const ctx = canvas.getContext('2d');
  const DPR = () => Math.min(window.devicePixelRatio || 1, 2);

  const LEVELS = [
    { rows: 4, cols: 8, speed: 4.4, hp: 1 },
    { rows: 5, cols: 9, speed: 5.2, hp: 2 },
    { rows: 6, cols: 10, speed: 6.1, hp: 2 },
  ];

  const POWERUPS = [
    { id: 'wide', label: 'Wider Paddle (Free)', type: 'wider' },
    { id: 'multi', label: 'Multi-Ball (Free)', type: 'multiball' },
    { id: 'laser', label: 'Laser (Free)', type: 'laser' },
    { id: 'slow', label: 'Slow Motion (Free)', type: 'slow' },
  ];

  const state = {
    running: false,
    left: false,
    right: false,
    touchX: null,
    score: 0,
    lives: 3,
    levelIndex: 0,
    levelCleared: false,
    paddle: { x: 0, y: 0, w: 130, h: 14, speed: 8 },
    balls: [],
    bricks: [],
    particles: [],
    lasers: [],
    stars: [],
    effects: { widerUntil: 0, slowUntil: 0, laserUntil: 0 },
    audioReady: false,
  };

  let audioCtx;

  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    state.audioReady = true;
  }

  function beep(freq, len, type, vol) {
    if (!state.audioReady || !audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.value = vol || 0.04;
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + len);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + len);
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * DPR());
    canvas.height = Math.floor(rect.width * 0.56 * DPR());
    if (canvas.height > window.innerHeight * DPR() * 0.65) {
      canvas.height = Math.floor(window.innerHeight * DPR() * 0.65);
    }
    state.paddle.y = canvas.height - 30 * DPR();
    state.paddle.x = canvas.width / 2 - state.paddle.w / 2;
    buildStars();
    if (!state.running) draw();
  }

  function buildStars() {
    state.stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2.2 + 0.4,
      a: Math.random() * 0.7 + 0.15,
      v: Math.random() * 0.18 + 0.04,
    }));
  }

  function resetBall(attached) {
    return {
      x: state.paddle.x + state.paddle.w / 2,
      y: state.paddle.y - 10 * DPR(),
      vx: 0,
      vy: 0,
      r: 8 * DPR(),
      attached,
    };
  }

  function launchBall(ball) {
    const speed = LEVELS[state.levelIndex].speed * DPR() * (active('slow') ? 0.65 : 1);
    ball.vx = (Math.random() > 0.5 ? 1 : -1) * speed * 0.7;
    ball.vy = -speed;
    ball.attached = false;
  }

  function buildLevel() {
    const lv = LEVELS[state.levelIndex];
    state.bricks = [];
    const pad = 12 * DPR();
    const top = 60 * DPR();
    const area = canvas.width - pad * 2;
    const gap = 8 * DPR();
    const bw = (area - gap * (lv.cols - 1)) / lv.cols;
    const bh = 20 * DPR();

    for (let r = 0; r < lv.rows; r++) {
      for (let c = 0; c < lv.cols; c++) {
        state.bricks.push({
          x: pad + c * (bw + gap),
          y: top + r * (bh + gap),
          w: bw,
          h: bh,
          hp: lv.hp + (r % 2),
          maxHp: lv.hp + (r % 2),
          hue: 260 + ((c * 20 + r * 35) % 90),
        });
      }
    }
  }

  function active(kind) {
    const now = performance.now();
    if (kind === 'wider') return state.effects.widerUntil > now;
    if (kind === 'slow') return state.effects.slowUntil > now;
    if (kind === 'laser') return state.effects.laserUntil > now;
    return false;
  }

  function activatePower(kind) {
    const now = performance.now();
    if (kind === 'wider') {
      state.effects.widerUntil = now + 14000;
      state.paddle.w = 190 * DPR();
    }
    if (kind === 'slow') state.effects.slowUntil = now + 9000;
    if (kind === 'laser') state.effects.laserUntil = now + 12000;
    if (kind === 'multiball' && state.balls.length) {
      const base = state.balls[0];
      for (let i = -1; i <= 1; i += 2) {
        state.balls.push({ ...base, vx: (base.vx || 3) + i * 2 * DPR(), vy: (base.vy || -4), attached: false });
      }
    }
    beep(660, 0.16, 'triangle', 0.07);
  }

  function buildPowerButtons() {
    powerWrap.innerHTML = '';
    POWERUPS.forEach((p) => {
      const b = document.createElement('button');
      b.textContent = p.label;
      b.addEventListener('click', () => activatePower(p.type));
      powerWrap.appendChild(b);
    });

    const donate = document.createElement('a');
    donate.href = 'https://buymeacoffee.com/pureplatinb';
    donate.target = '_blank';
    donate.rel = 'noopener noreferrer';
    donate.textContent = 'Optional Tip Jar ✦';
    powerWrap.appendChild(donate);
  }

  function startGame() {
    state.running = true;
    state.score = 0;
    state.lives = 3;
    state.levelIndex = 0;
    state.paddle.w = 130 * DPR();
    state.effects = { widerUntil: 0, slowUntil: 0, laserUntil: 0 };
    state.balls = [resetBall(true)];
    state.particles = [];
    state.lasers = [];
    buildLevel();
    updateStats('Press Space or tap to launch.');
    requestAnimationFrame(loop);
  }

  function updateStats(extra) {
    const note = extra ? ` • ${extra}` : '';
    stats.textContent = `Score: ${state.score} • Lives: ${state.lives} • Level: ${state.levelIndex + 1}${note}`;
  }

  function destroyBrick(brick, idx) {
    state.score += 100;
    beep(280 + brick.hue, 0.08, 'square', 0.05);
    for (let i = 0; i < 12; i++) {
      state.particles.push({
        x: brick.x + brick.w / 2,
        y: brick.y + brick.h / 2,
        vx: (Math.random() - 0.5) * 4 * DPR(),
        vy: (Math.random() - 0.5) * 4 * DPR(),
        life: 30 + Math.random() * 20,
        hue: brick.hue,
      });
    }
    state.bricks.splice(idx, 1);
  }

  function spawnLaser() {
    if (!active('laser')) return;
    state.lasers.push({ x: state.paddle.x + 14 * DPR(), y: state.paddle.y, vy: -9 * DPR() });
    state.lasers.push({ x: state.paddle.x + state.paddle.w - 14 * DPR(), y: state.paddle.y, vy: -9 * DPR() });
    beep(900, 0.08, 'sawtooth', 0.03);
  }

  function update() {
    const now = performance.now();
    if (!active('wider')) state.paddle.w = 130 * DPR();

    if (state.left) state.paddle.x -= state.paddle.speed * DPR();
    if (state.right) state.paddle.x += state.paddle.speed * DPR();
    if (state.touchX !== null) {
      state.paddle.x += (state.touchX - (state.paddle.x + state.paddle.w / 2)) * 0.18;
    }
    state.paddle.x = Math.max(0, Math.min(canvas.width - state.paddle.w, state.paddle.x));

    state.stars.forEach((s) => {
      s.y += s.v;
      if (s.y > canvas.height) { s.y = -3; s.x = Math.random() * canvas.width; }
    });

    state.balls.forEach((ball) => {
      if (ball.attached) {
        ball.x = state.paddle.x + state.paddle.w / 2;
        ball.y = state.paddle.y - ball.r - 1;
        return;
      }
      const slowFactor = active('slow') ? 0.7 : 1;
      ball.x += ball.vx * slowFactor;
      ball.y += ball.vy * slowFactor;

      if (ball.x < ball.r || ball.x > canvas.width - ball.r) {
        ball.vx *= -1;
        beep(220, 0.05, 'sine', 0.03);
      }
      if (ball.y < ball.r) {
        ball.vy *= -1;
        beep(220, 0.05, 'sine', 0.03);
      }

      if (
        ball.y + ball.r >= state.paddle.y &&
        ball.x >= state.paddle.x &&
        ball.x <= state.paddle.x + state.paddle.w &&
        ball.vy > 0
      ) {
        const hit = (ball.x - (state.paddle.x + state.paddle.w / 2)) / (state.paddle.w / 2);
        ball.vx = hit * 6 * DPR();
        ball.vy = -Math.abs(ball.vy) - 0.12 * DPR();
        beep(330, 0.06, 'triangle', 0.04);
      }

      for (let i = state.bricks.length - 1; i >= 0; i--) {
        const b = state.bricks[i];
        if (ball.x + ball.r < b.x || ball.x - ball.r > b.x + b.w || ball.y + ball.r < b.y || ball.y - ball.r > b.y + b.h) continue;
        b.hp -= 1;
        ball.vy *= -1;
        if (b.hp <= 0) destroyBrick(b, i);
        break;
      }
    });

    state.lasers.forEach((l) => {
      l.y += l.vy;
      for (let i = state.bricks.length - 1; i >= 0; i--) {
        const b = state.bricks[i];
        if (l.x >= b.x && l.x <= b.x + b.w && l.y >= b.y && l.y <= b.y + b.h) {
          b.hp -= 2;
          if (b.hp <= 0) destroyBrick(b, i);
          l.y = -20;
          break;
        }
      }
    });

    state.lasers = state.lasers.filter((l) => l.y > -20);

    state.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02 * DPR();
      p.life -= 1;
    });
    state.particles = state.particles.filter((p) => p.life > 0);

    state.balls = state.balls.filter((b) => b.y < canvas.height + 30 * DPR());
    if (!state.balls.length) {
      state.lives -= 1;
      beep(120, 0.22, 'sawtooth', 0.06);
      if (state.lives < 0) {
        state.running = false;
        updateStats('Game Over — Tap Launch to retry.');
        return;
      }
      state.balls = [resetBall(true)];
    }

    if (!state.bricks.length) {
      state.levelIndex += 1;
      if (state.levelIndex >= LEVELS.length) {
        state.running = false;
        updateStats('You cleared the galaxy!');
        beep(880, 0.24, 'triangle', 0.07);
        return;
      }
      state.balls = [resetBall(true)];
      buildLevel();
      updateStats('Level up!');
      beep(760, 0.2, 'triangle', 0.06);
    } else {
      updateStats();
    }

    if (active('laser') && now % 15 < 1) spawnLaser();
  }

  function draw() {
    const g = ctx;
    g.clearRect(0, 0, canvas.width, canvas.height);

    const grad = g.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#04010a');
    grad.addColorStop(1, '#120220');
    g.fillStyle = grad;
    g.fillRect(0, 0, canvas.width, canvas.height);

    state.stars.forEach((s) => {
      g.fillStyle = `rgba(185, 158, 255, ${s.a})`;
      g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.fill();
    });

    state.bricks.forEach((b) => {
      const intensity = b.hp / b.maxHp;
      g.fillStyle = `hsla(${b.hue}, 90%, ${52 - (1 - intensity) * 18}%, 0.95)`;
      g.shadowBlur = 20 * DPR();
      g.shadowColor = `hsla(${b.hue}, 90%, 60%, .95)`;
      g.fillRect(b.x, b.y, b.w, b.h);
      g.shadowBlur = 0;
      g.strokeStyle = 'rgba(255,255,255,.2)';
      g.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    });

    g.fillStyle = '#f59e0b';
    g.shadowBlur = 18 * DPR();
    g.shadowColor = 'rgba(245,158,11,.9)';
    g.fillRect(state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h);
    g.shadowBlur = 0;

    state.balls.forEach((ball) => {
      g.beginPath();
      g.fillStyle = '#67e8f9';
      g.shadowBlur = 22 * DPR();
      g.shadowColor = 'rgba(34,211,238,.95)';
      g.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      g.fill();
      g.shadowBlur = 0;
    });

    g.strokeStyle = 'rgba(251,191,36,.9)';
    g.lineWidth = 2 * DPR();
    state.lasers.forEach((l) => {
      g.beginPath();
      g.moveTo(l.x, l.y);
      g.lineTo(l.x, l.y + 12 * DPR());
      g.stroke();
    });

    state.particles.forEach((p) => {
      g.fillStyle = `hsla(${p.hue}, 95%, 62%, ${p.life / 50})`;
      g.fillRect(p.x, p.y, 2.2 * DPR(), 2.2 * DPR());
    });
  }

  function loop() {
    if (!state.running) {
      draw();
      return;
    }
    update();
    draw();
    requestAnimationFrame(loop);
  }

  function openGame() {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    resizeCanvas();
    buildPowerButtons();
    startGame();
  }

  function closeGame() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    state.running = false;
  }

  launchBtn.addEventListener('click', openGame);
  closeBtn.addEventListener('click', closeGame);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeGame(); });

  window.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('open')) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') state.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') state.right = true;
    if (e.code === 'Space') {
      state.balls.filter((b) => b.attached).forEach(launchBall);
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') state.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') state.right = false;
  });

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    state.touchX = (e.clientX - rect.left) * DPR();
  });

  canvas.addEventListener('pointerleave', () => { state.touchX = null; });

  canvas.addEventListener('pointerdown', () => {
    state.balls.filter((b) => b.attached).forEach(launchBall);
  });

  mobileControls?.querySelectorAll('button').forEach((btn) => {
    const left = btn.dataset.dir === 'left';
    const down = () => { if (left) state.left = true; else state.right = true; };
    const up = () => { if (left) state.left = false; else state.right = false; };
    btn.addEventListener('touchstart', down, { passive: true });
    btn.addEventListener('touchend', up, { passive: true });
    btn.addEventListener('mousedown', down);
    btn.addEventListener('mouseup', up);
    btn.addEventListener('mouseleave', up);
  });

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
})();
