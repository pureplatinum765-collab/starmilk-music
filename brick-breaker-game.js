(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
   * STARMILK COSMIC BRICK BREAKER
   * Fixed-timestep game loop, 6 levels with varied patterns,
   * combo system, screen shake, improved ball physics,
   * restart flow, better particles, high score, paddle trail,
   * level transition animations.
   * ═══════════════════════════════════════════════════════════════ */

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

  // ─── Fixed timestep ───────────────────────────────────────────
  const TICK_RATE = 1000 / 60;
  let lastLoopTime = 0;
  let accumulator = 0;

  // ─── Level definitions (6 levels) ─────────────────────────────
  const LEVELS = [
    { rows: 4, cols: 8, speed: 4.4, hp: 1, pattern: 'full', label: 'STARFIELD' },
    { rows: 5, cols: 9, speed: 5.0, hp: 2, pattern: 'checkerboard', label: 'NEBULA GRID' },
    { rows: 5, cols: 10, speed: 5.4, hp: 2, pattern: 'diamond', label: 'DIAMOND CLUSTER' },
    { rows: 6, cols: 10, speed: 5.8, hp: 2, pattern: 'vshape', label: 'CONSTELLATION V' },
    { rows: 6, cols: 11, speed: 6.2, hp: 3, pattern: 'border', label: 'COSMIC RING' },
    { rows: 7, cols: 12, speed: 6.6, hp: 3, pattern: 'zigzag', label: 'FINAL FRONTIER' },
  ];

  const POWERUPS = [
    { id: 'wide', label: 'Wider Paddle (Free)', type: 'wider' },
    { id: 'multi', label: 'Multi-Ball (Free)', type: 'multiball' },
    { id: 'laser', label: 'Laser (Free)', type: 'laser' },
    { id: 'slow', label: 'Slow Motion (Free)', type: 'slow' },
  ];

  // ─── Min vertical velocity to prevent horizontal trapping ─────
  const MIN_VY_RATIO = 0.35;

  // ─── Game state ───────────────────────────────────────────────
  const state = {
    running: false,
    gameOver: false,
    gameWon: false,
    left: false,
    right: false,
    touchX: null,
    score: 0,
    highScore: 0,
    lives: 3,
    levelIndex: 0,
    levelCleared: false,
    combo: 0,
    maxCombo: 0,
    comboDisplay: { value: 0, alpha: 0, scale: 1 },
    paddle: { x: 0, y: 0, w: 130, h: 14, speed: 8, prevX: 0 },
    balls: [],
    bricks: [],
    particles: [],
    lasers: [],
    stars: [],
    effects: { widerUntil: 0, slowUntil: 0, laserUntil: 0 },
    audioReady: false,
    screenShake: { x: 0, y: 0, intensity: 0, decay: 0.85 },
    transition: { active: false, text: '', alpha: 0, ringRadius: 0, startTime: 0 },
    paddleTrail: [],
  };

  let audioCtx;

  // ═══════════════════════════════════════════════════════════════
  //  AUDIO
  // ═══════════════════════════════════════════════════════════════

  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    state.audioReady = true;
  }

  function beep(freq, len, type, vol) {
    if (!state.audioReady || !audioCtx) return;
    try {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.value = vol || 0.04;
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + len);
      o.connect(g).connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + len);
    } catch (_) { /* silent */ }
  }

  function beepCombo(combo) {
    const freq = 440 + combo * 80;
    beep(freq, 0.12, 'triangle', Math.min(0.08, 0.04 + combo * 0.01));
  }

  // ═══════════════════════════════════════════════════════════════
  //  CANVAS & STARS
  // ═══════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════
  //  BALL & LEVEL
  // ═══════════════════════════════════════════════════════════════

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

  function enforceMinVerticalVelocity(ball) {
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed < 1) return;
    const minVy = speed * MIN_VY_RATIO;
    if (Math.abs(ball.vy) < minVy) {
      ball.vy = ball.vy >= 0 ? minVy : -minVy;
      // Recalculate vx to maintain speed
      const remainingSpeed = Math.sqrt(speed * speed - ball.vy * ball.vy);
      ball.vx = ball.vx >= 0 ? remainingSpeed : -remainingSpeed;
    }
  }

  // ─── Level builder with varied patterns ───────────────────────

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
        // Apply pattern filter
        if (!shouldPlaceBrick(lv.pattern, r, c, lv.rows, lv.cols)) continue;

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

  function shouldPlaceBrick(pattern, r, c, rows, cols) {
    switch (pattern) {
      case 'full':
        return true;
      case 'checkerboard':
        return (r + c) % 2 === 0;
      case 'diamond': {
        const midR = (rows - 1) / 2;
        const midC = (cols - 1) / 2;
        return Math.abs(r - midR) / midR + Math.abs(c - midC) / midC <= 1.1;
      }
      case 'vshape': {
        const midC = Math.floor(cols / 2);
        const dist = Math.abs(c - midC);
        return r >= dist * 0.7;
      }
      case 'border':
        return r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
      case 'zigzag':
        return (r % 2 === 0) ? (c % 3 !== 2) : (c % 3 !== 0);
      default:
        return true;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  POWER-UPS
  // ═══════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════
  //  GAME LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  function startGame() {
    state.running = true;
    state.gameOver = false;
    state.gameWon = false;
    state.score = 0;
    state.lives = 3;
    state.levelIndex = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.paddle.w = 130 * DPR();
    state.effects = { widerUntil: 0, slowUntil: 0, laserUntil: 0 };
    state.balls = [resetBall(true)];
    state.particles = [];
    state.lasers = [];
    state.paddleTrail = [];
    state.screenShake = { x: 0, y: 0, intensity: 0, decay: 0.85 };
    state.transition = { active: false, text: '', alpha: 0, ringRadius: 0, startTime: 0 };
    buildLevel();
    updateStats('Press Space or tap to launch.');
    lastLoopTime = performance.now();
    accumulator = 0;
    requestAnimationFrame(loop);
  }

  function updateStats(extra) {
    const note = extra ? ` • ${extra}` : '';
    const highStr = state.highScore > 0 ? ` • High: ${state.highScore}` : '';
    const comboStr = state.combo > 1 ? ` • Combo: ${state.combo}x` : '';
    stats.textContent = `Score: ${state.score}${highStr} • Lives: ${state.lives} • Level: ${state.levelIndex + 1}/${LEVELS.length}${comboStr}${note}`;
  }

  // ═══════════════════════════════════════════════════════════════
  //  PHYSICS UPDATE (fixed timestep)
  // ═══════════════════════════════════════════════════════════════

  function update() {
    const now = performance.now();

    // Level transition
    if (state.transition.active) {
      const elapsed = now - state.transition.startTime;
      if (elapsed < 1800) {
        state.transition.alpha = elapsed < 600 ? elapsed / 600 : elapsed > 1200 ? 1 - (elapsed - 1200) / 600 : 1;
        state.transition.ringRadius = elapsed * 0.5;
        return; // Pause gameplay during transition
      } else {
        state.transition.active = false;
      }
    }

    if (!active('wider')) state.paddle.w = 130 * DPR();

    // Store previous paddle X for trail
    state.paddle.prevX = state.paddle.x;

    if (state.left) state.paddle.x -= state.paddle.speed * DPR();
    if (state.right) state.paddle.x += state.paddle.speed * DPR();
    if (state.touchX !== null) {
      state.paddle.x += (state.touchX - (state.paddle.x + state.paddle.w / 2)) * 0.18;
    }
    state.paddle.x = Math.max(0, Math.min(canvas.width - state.paddle.w, state.paddle.x));

    // Paddle trail
    const paddleSpeed = Math.abs(state.paddle.x - state.paddle.prevX);
    if (paddleSpeed > 2 * DPR()) {
      state.paddleTrail.push({
        x: state.paddle.x + state.paddle.w / 2,
        y: state.paddle.y + state.paddle.h / 2,
        w: state.paddle.w,
        alpha: 0.3,
      });
    }
    state.paddleTrail = state.paddleTrail.filter(t => {
      t.alpha -= 0.025;
      return t.alpha > 0;
    });

    // Stars drift
    state.stars.forEach((s) => {
      s.y += s.v;
      if (s.y > canvas.height) { s.y = -3; s.x = Math.random() * canvas.width; }
    });

    // Balls
    state.balls.forEach((ball) => {
      if (ball.attached) {
        ball.x = state.paddle.x + state.paddle.w / 2;
        ball.y = state.paddle.y - ball.r - 1;
        return;
      }
      const slowFactor = active('slow') ? 0.7 : 1;
      ball.x += ball.vx * slowFactor;
      ball.y += ball.vy * slowFactor;

      // Wall collisions
      if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); beep(220, 0.05, 'sine', 0.03); }
      if (ball.x > canvas.width - ball.r) { ball.x = canvas.width - ball.r; ball.vx = -Math.abs(ball.vx); beep(220, 0.05, 'sine', 0.03); }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); beep(220, 0.05, 'sine', 0.03); }

      // Paddle collision
      if (
        ball.y + ball.r >= state.paddle.y &&
        ball.y + ball.r <= state.paddle.y + state.paddle.h + 6 * DPR() &&
        ball.x >= state.paddle.x &&
        ball.x <= state.paddle.x + state.paddle.w &&
        ball.vy > 0
      ) {
        const hit = (ball.x - (state.paddle.x + state.paddle.w / 2)) / (state.paddle.w / 2);
        const speed = Math.hypot(ball.vx, ball.vy);
        // Spin effect based on paddle position
        ball.vx = hit * speed * 0.85;
        ball.vy = -Math.sqrt(Math.max(speed * speed - ball.vx * ball.vx, speed * 0.5));

        enforceMinVerticalVelocity(ball);

        // Reset combo on paddle hit
        state.combo = 0;
        beep(330, 0.06, 'triangle', 0.04);
      }

      // Brick collision
      for (let i = state.bricks.length - 1; i >= 0; i--) {
        const b = state.bricks[i];
        if (ball.x + ball.r < b.x || ball.x - ball.r > b.x + b.w || ball.y + ball.r < b.y || ball.y - ball.r > b.y + b.h) continue;

        b.hp -= 1;

        // Determine collision side for proper reflection
        const overlapLeft = (ball.x + ball.r) - b.x;
        const overlapRight = (b.x + b.w) - (ball.x - ball.r);
        const overlapTop = (ball.y + ball.r) - b.y;
        const overlapBottom = (b.y + b.h) - (ball.y - ball.r);
        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapX < minOverlapY) {
          ball.vx *= -1;
        } else {
          ball.vy *= -1;
        }

        enforceMinVerticalVelocity(ball);

        if (b.hp <= 0) {
          state.combo++;
          if (state.combo > state.maxCombo) state.maxCombo = state.combo;
          const multiplier = Math.min(state.combo, 8);
          destroyBrick(b, i, multiplier);

          // Screen shake for combos
          if (state.combo >= 3) {
            state.screenShake.intensity = Math.min(state.screenShake.intensity + state.combo * 1.5, 12);
          }
        } else {
          // Hit feedback
          beep(280 + b.hue, 0.06, 'square', 0.04);
          // Small flash particles
          for (let j = 0; j < 4; j++) {
            state.particles.push({
              x: ball.x, y: ball.y,
              vx: (Math.random() - 0.5) * 3 * DPR(),
              vy: (Math.random() - 0.5) * 3 * DPR(),
              life: 15 + Math.random() * 10,
              hue: b.hue,
              size: 1.5,
            });
          }
        }
        break;
      }
    });

    // Lasers
    state.lasers.forEach((l) => {
      l.y += l.vy;
      for (let i = state.bricks.length - 1; i >= 0; i--) {
        const b = state.bricks[i];
        if (l.x >= b.x && l.x <= b.x + b.w && l.y >= b.y && l.y <= b.y + b.h) {
          b.hp -= 2;
          if (b.hp <= 0) destroyBrick(b, i, 1);
          l.y = -20;
          break;
        }
      }
    });
    state.lasers = state.lasers.filter((l) => l.y > -20);

    // Particles physics
    state.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02 * DPR();
      p.life -= 1;
    });
    state.particles = state.particles.filter((p) => p.life > 0);

    // Combo display decay
    if (state.comboDisplay.alpha > 0) {
      state.comboDisplay.alpha -= 0.015;
      state.comboDisplay.scale += 0.01;
    }

    // Screen shake decay
    const shake = state.screenShake;
    if (shake.intensity > 0.3) {
      shake.x = (Math.random() - 0.5) * shake.intensity;
      shake.y = (Math.random() - 0.5) * shake.intensity;
      shake.intensity *= shake.decay;
    } else {
      shake.x = 0; shake.y = 0; shake.intensity = 0;
    }

    // Check if ball fell off
    state.balls = state.balls.filter((b) => b.y < canvas.height + 30 * DPR());
    if (!state.balls.length) {
      state.lives -= 1;
      state.combo = 0;
      beep(120, 0.22, 'sawtooth', 0.06);
      state.screenShake.intensity = 8;
      if (state.lives < 0) {
        state.running = false;
        state.gameOver = true;
        state.highScore = Math.max(state.highScore, state.score);
        updateStats('Game Over!');
        return;
      }
      state.balls = [resetBall(true)];
    }

    // Check level cleared
    if (!state.bricks.length) {
      state.levelIndex += 1;
      if (state.levelIndex >= LEVELS.length) {
        state.running = false;
        state.gameWon = true;
        state.highScore = Math.max(state.highScore, state.score);
        updateStats('You cleared the galaxy!');
        beep(880, 0.24, 'triangle', 0.07);
        return;
      }
      // Start level transition
      state.transition.active = true;
      state.transition.text = LEVELS[state.levelIndex].label;
      state.transition.alpha = 0;
      state.transition.ringRadius = 0;
      state.transition.startTime = now;
      state.balls = [resetBall(true)];
      buildLevel();
      updateStats('Level up!');
      beep(760, 0.2, 'triangle', 0.06);
    } else {
      updateStats();
    }

    // Periodic laser fire
    if (active('laser') && now % 15 < 1) spawnLaser();
  }

  function destroyBrick(brick, idx, multiplier) {
    const baseScore = 100 * Math.max(1, multiplier);
    state.score += baseScore;
    beepCombo(state.combo);

    // Show combo display
    if (multiplier >= 2) {
      state.comboDisplay.value = multiplier;
      state.comboDisplay.alpha = 1;
      state.comboDisplay.scale = 1;
    }

    // Varied particles — more for higher combos
    const particleCount = 12 + Math.min(multiplier, 6) * 4;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (1.5 + Math.random() * 4) * DPR();
      const size = 1.5 + Math.random() * 2.5;
      state.particles.push({
        x: brick.x + brick.w / 2 + (Math.random() - 0.5) * brick.w,
        y: brick.y + brick.h / 2 + (Math.random() - 0.5) * brick.h,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 30,
        hue: brick.hue + (Math.random() - 0.5) * 30,
        size: size,
      });
    }

    // Brief flash glow particle
    state.particles.push({
      x: brick.x + brick.w / 2,
      y: brick.y + brick.h / 2,
      vx: 0, vy: 0,
      life: 12,
      hue: brick.hue,
      size: brick.w * 0.3,
      glow: true,
    });

    state.bricks.splice(idx, 1);
  }

  function spawnLaser() {
    if (!active('laser')) return;
    state.lasers.push({ x: state.paddle.x + 14 * DPR(), y: state.paddle.y, vy: -9 * DPR() });
    state.lasers.push({ x: state.paddle.x + state.paddle.w - 14 * DPR(), y: state.paddle.y, vy: -9 * DPR() });
    beep(900, 0.08, 'sawtooth', 0.03);
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDERING
  // ═══════════════════════════════════════════════════════════════

  function draw() {
    const g = ctx;
    g.save();
    g.translate(state.screenShake.x, state.screenShake.y);

    g.clearRect(-10, -10, canvas.width + 20, canvas.height + 20);

    // Background gradient
    const grad = g.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#04010a');
    grad.addColorStop(1, '#120220');
    g.fillStyle = grad;
    g.fillRect(0, 0, canvas.width, canvas.height);

    // Stars
    state.stars.forEach((s) => {
      g.fillStyle = `rgba(185, 158, 255, ${s.a})`;
      g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.fill();
    });

    // Bricks
    state.bricks.forEach((b) => {
      const intensity = b.hp / b.maxHp;
      g.fillStyle = `hsla(${b.hue}, 90%, ${52 - (1 - intensity) * 18}%, 0.95)`;
      g.shadowBlur = 20 * DPR();
      g.shadowColor = `hsla(${b.hue}, 90%, 60%, .95)`;
      g.fillRect(b.x, b.y, b.w, b.h);
      g.shadowBlur = 0;
      g.strokeStyle = 'rgba(255,255,255,.2)';
      g.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);

      // HP indicator for multi-hit bricks
      if (b.maxHp > 1 && b.hp > 1) {
        g.fillStyle = `rgba(255,255,255,${0.15 * b.hp})`;
        g.fillRect(b.x + 2, b.y + 2, b.w - 4, 3 * DPR());
      }
    });

    // Paddle trail
    state.paddleTrail.forEach(t => {
      g.fillStyle = `rgba(245,158,11,${t.alpha * 0.3})`;
      g.fillRect(t.x - t.w / 2, t.y - state.paddle.h / 2, t.w, state.paddle.h);
    });

    // Paddle
    g.fillStyle = '#f59e0b';
    g.shadowBlur = 18 * DPR();
    g.shadowColor = 'rgba(245,158,11,.9)';
    g.fillRect(state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h);
    g.shadowBlur = 0;

    // Balls
    state.balls.forEach((ball) => {
      g.beginPath();
      g.fillStyle = '#67e8f9';
      g.shadowBlur = 22 * DPR();
      g.shadowColor = 'rgba(34,211,238,.95)';
      g.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      g.fill();
      g.shadowBlur = 0;
    });

    // Lasers
    g.strokeStyle = 'rgba(251,191,36,.9)';
    g.lineWidth = 2 * DPR();
    state.lasers.forEach((l) => {
      g.beginPath();
      g.moveTo(l.x, l.y);
      g.lineTo(l.x, l.y + 12 * DPR());
      g.stroke();
    });

    // Particles
    state.particles.forEach((p) => {
      if (p.glow) {
        // Glow flash
        const alpha = p.life / 12;
        const grd = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        grd.addColorStop(0, `hsla(${p.hue}, 95%, 80%, ${alpha * 0.6})`);
        grd.addColorStop(1, `hsla(${p.hue}, 95%, 60%, 0)`);
        g.fillStyle = grd;
        g.beginPath(); g.arc(p.x, p.y, p.size, 0, Math.PI * 2); g.fill();
      } else {
        const alpha = Math.min(1, p.life / 25);
        g.fillStyle = `hsla(${p.hue}, 95%, 62%, ${alpha})`;
        g.beginPath();
        g.arc(p.x, p.y, p.size * DPR() * (p.life / 40), 0, Math.PI * 2);
        g.fill();
      }
    });

    // Combo display
    if (state.comboDisplay.alpha > 0) {
      const cd = state.comboDisplay;
      g.save();
      g.font = `900 ${Math.floor(48 * DPR() * cd.scale)}px Segoe UI, system-ui, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = `rgba(251,191,36,${cd.alpha})`;
      g.shadowBlur = 30 * DPR();
      g.shadowColor = `rgba(251,191,36,${cd.alpha * 0.8})`;
      g.fillText(`${cd.value}x COMBO`, canvas.width / 2, canvas.height * 0.4);
      g.shadowBlur = 0;
      g.restore();
    }

    // Level transition
    if (state.transition.active) {
      const t = state.transition;
      g.fillStyle = `rgba(4,1,10,${t.alpha * 0.85})`;
      g.fillRect(0, 0, canvas.width, canvas.height);

      // Expanding ring
      g.strokeStyle = `rgba(147,51,234,${t.alpha * 0.6})`;
      g.lineWidth = 3 * DPR();
      g.beginPath();
      g.arc(canvas.width / 2, canvas.height / 2, t.ringRadius, 0, Math.PI * 2);
      g.stroke();

      g.strokeStyle = `rgba(245,158,11,${t.alpha * 0.4})`;
      g.lineWidth = 2 * DPR();
      g.beginPath();
      g.arc(canvas.width / 2, canvas.height / 2, t.ringRadius * 0.6, 0, Math.PI * 2);
      g.stroke();

      // Level text
      g.font = `900 ${Math.floor(36 * DPR())}px Segoe UI, system-ui, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = `rgba(252,211,77,${t.alpha})`;
      g.shadowBlur = 24 * DPR();
      g.shadowColor = `rgba(245,158,11,${t.alpha * 0.8})`;
      g.fillText(`LEVEL ${state.levelIndex + 1}`, canvas.width / 2, canvas.height / 2 - 18 * DPR());
      g.font = `700 ${Math.floor(18 * DPR())}px Segoe UI, system-ui, sans-serif`;
      g.fillStyle = `rgba(200,180,255,${t.alpha * 0.8})`;
      g.fillText(t.text, canvas.width / 2, canvas.height / 2 + 18 * DPR());
      g.shadowBlur = 0;
    }

    // Game over / victory overlay with play again button
    if ((state.gameOver || state.gameWon) && !state.running) {
      g.fillStyle = 'rgba(4,1,10,.82)';
      g.fillRect(0, 0, canvas.width, canvas.height);

      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.shadowBlur = 24 * DPR();
      g.shadowColor = state.gameWon ? 'rgba(245,158,11,.8)' : 'rgba(255,80,80,.6)';

      g.font = `900 ${Math.floor(40 * DPR())}px Segoe UI, system-ui, sans-serif`;
      g.fillStyle = state.gameWon ? '#fcd34d' : '#ff6b6b';
      g.fillText(state.gameWon ? 'GALAXY CLEARED!' : 'GAME OVER', canvas.width / 2, canvas.height * 0.35);

      g.shadowBlur = 0;
      g.font = `700 ${Math.floor(18 * DPR())}px Segoe UI, system-ui, sans-serif`;
      g.fillStyle = '#d8c8ff';
      g.fillText(`Score: ${state.score}  •  High Score: ${state.highScore}  •  Max Combo: ${state.maxCombo}x`, canvas.width / 2, canvas.height * 0.48);

      // Play Again button (rendered as a rect)
      const btnW = 200 * DPR();
      const btnH = 48 * DPR();
      const btnX = canvas.width / 2 - btnW / 2;
      const btnY = canvas.height * 0.6;
      g.fillStyle = 'rgba(124,58,237,.65)';
      g.strokeStyle = 'rgba(245,158,11,.6)';
      g.lineWidth = 2 * DPR();
      g.beginPath();
      g.roundRect(btnX, btnY, btnW, btnH, 12 * DPR());
      g.fill();
      g.stroke();

      g.fillStyle = '#fcd34d';
      g.font = `700 ${Math.floor(16 * DPR())}px Segoe UI, system-ui, sans-serif`;
      g.fillText('PLAY AGAIN', canvas.width / 2, btnY + btnH / 2);

      // Store btn bounds for click detection
      state._restartBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
    }

    g.restore();
  }

  // ═══════════════════════════════════════════════════════════════
  //  GAME LOOP
  // ═══════════════════════════════════════════════════════════════

  function loop(ts) {
    if (!state.running && !state.gameOver && !state.gameWon) {
      draw();
      return;
    }

    if (state.running) {
      const delta = Math.min(ts - lastLoopTime, 100);
      lastLoopTime = ts;
      accumulator += delta;

      while (accumulator >= TICK_RATE) {
        update();
        accumulator -= TICK_RATE;
        if (!state.running) break;
      }
    }

    draw();
    if (state.running) requestAnimationFrame(loop);
    else draw(); // Final render of game over/victory screen
  }

  // ═══════════════════════════════════════════════════════════════
  //  EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════

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
    state.gameOver = false;
    state.gameWon = false;
  }

  launchBtn.addEventListener('click', openGame);
  closeBtn.addEventListener('click', closeGame);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeGame(); });

  window.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('open')) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') state.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') state.right = true;
    if (e.code === 'Space') {
      if (state.gameOver || state.gameWon) {
        startGame();
      } else {
        state.balls.filter((b) => b.attached).forEach(launchBall);
      }
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

  canvas.addEventListener('pointerdown', (e) => {
    // Check for restart button click
    if ((state.gameOver || state.gameWon) && state._restartBtn) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * DPR();
      const y = (e.clientY - rect.top) * DPR();
      const btn = state._restartBtn;
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        startGame();
        return;
      }
    }

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
