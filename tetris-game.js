(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
   * STARMILK COSMIC TETRIS
   * Van Gogh Starry Night palette, SRS rotation, wall kicks,
   * ghost piece, hold, next preview, procedural audio,
   * smooth lock delay, level progression.
   * ═══════════════════════════════════════════════════════════════ */

  const overlay = document.getElementById('tetris-overlay');
  const launchBtn = document.getElementById('tetris-game-launch');
  const closeBtn = document.getElementById('tetris-close');
  const canvas = document.getElementById('tetris-canvas');
  const statsEl = document.getElementById('tetris-stats');

  if (!overlay || !launchBtn || !canvas) return;

  const ctx = canvas.getContext('2d');

  // ─── Constants ────────────────────────────────────────────────
  const COLS = 10;
  const ROWS = 20;
  const SIDE_PANEL_W = 5; // in cells, for next/hold display

  // ─── Starry Night palette ────────────────────────────────────
  const BG_DARK   = '#080b16';
  const BG_MID    = '#0e1325';
  const GOLD      = '#c9944a';
  const GOLD_LT   = '#dbb87a';
  const PURPLE    = '#6b5b8a';
  const INDIGO    = '#3d5080';
  const INDIGO_DK = '#1b3058';
  const TEAL      = '#3a7068';
  const TEAL_LT   = '#6aad96';
  const TEXT_CLR   = '#d5cfc2';
  const MUTED     = '#8c8578';
  const GRID_CLR  = 'rgba(60,55,80,.18)';

  // Piece colors (Starry Night theme)
  const PIECE_COLORS = {
    I: '#3d87b0', // muted sky blue
    O: '#c9944a', // earthy gold
    T: '#7b6998', // soft purple
    S: '#6aad96', // sage teal
    Z: '#a05050', // muted brick red
    J: '#3d5080', // indigo
    L: '#b8874a', // warm amber
  };

  // ─── SRS Piece definitions (spawn at row 0-1, centered) ─────
  const SHAPES = {
    I: [
      [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
      [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
    ],
    O: [
      [[1,1],[1,1]],
      [[1,1],[1,1]],
      [[1,1],[1,1]],
      [[1,1],[1,1]],
    ],
    T: [
      [[0,1,0],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,1],[0,1,0]],
      [[0,1,0],[1,1,0],[0,1,0]],
    ],
    S: [
      [[0,1,1],[1,1,0],[0,0,0]],
      [[0,1,0],[0,1,1],[0,0,1]],
      [[0,0,0],[0,1,1],[1,1,0]],
      [[1,0,0],[1,1,0],[0,1,0]],
    ],
    Z: [
      [[1,1,0],[0,1,1],[0,0,0]],
      [[0,0,1],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,0],[0,1,1]],
      [[0,1,0],[1,1,0],[1,0,0]],
    ],
    J: [
      [[1,0,0],[1,1,1],[0,0,0]],
      [[0,1,1],[0,1,0],[0,1,0]],
      [[0,0,0],[1,1,1],[0,0,1]],
      [[0,1,0],[0,1,0],[1,1,0]],
    ],
    L: [
      [[0,0,1],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,0],[0,1,1]],
      [[0,0,0],[1,1,1],[1,0,0]],
      [[1,1,0],[0,1,0],[0,1,0]],
    ],
  };

  // ─── SRS Wall Kick data ──────────────────────────────────────
  const KICKS_JLSTZ = {
    '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  };

  const KICKS_I = {
    '0>1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    '1>0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    '1>2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
    '2>1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    '2>3': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    '3>2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    '3>0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    '0>3': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  };

  // ─── Scoring ─────────────────────────────────────────────────
  const LINE_SCORES = [0, 100, 300, 500, 800];

  // ─── Game state ──────────────────────────────────────────────
  let grid = [];
  let current = null;  // { type, rot, x, y }
  let nextPiece = null;
  let holdPiece = null;
  let holdUsed = false;
  let score = 0;
  let level = 1;
  let lines = 0;
  let gameOver = false;
  let paused = false;
  let running = false;
  let animFrameId = null;
  let dropTimer = 0;
  let lastTime = 0;
  let lockTimer = 0;
  let lockMoves = 0;
  let softDropping = false;
  let stars = [];
  let particles = [];
  let lineClearAnim = null; // { rows, alpha, time }

  // Cell size computed on resize
  let cellSize = 0;
  let gridOffX = 0;
  let gridOffY = 0;

  // Audio
  let audioCtx = null;

  // 7-bag randomizer
  let bag = [];

  // ─── DAS (Delayed Auto Shift) ───────────────────────────────
  const DAS_DELAY = 170; // ms before auto-repeat starts
  const DAS_RATE = 50;   // ms between auto-repeat moves
  let dasDir = 0;        // -1 left, 1 right, 0 none
  let dasTimer = 0;
  let dasActive = false;
  let keysDown = { left: false, right: false };

  // ═══════════════════════════════════════════════════════════════
  //  AUDIO
  // ═══════════════════════════════════════════════════════════════

  function initAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) { /* silent */ }
  }

  function beep(freq, len, type, vol) {
    if (!audioCtx) return;
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

  function sfxPlace()     { beep(200, 0.08, 'triangle', 0.05); }
  function sfxRotate()    { beep(440, 0.05, 'sine', 0.03); }
  function sfxMove()      { beep(330, 0.03, 'sine', 0.02); }
  function sfxHardDrop()  { beep(150, 0.12, 'square', 0.04); }
  function sfxHold()      { beep(520, 0.06, 'triangle', 0.03); }

  function sfxLineClear(count) {
    const base = 440 + count * 110;
    beep(base, 0.15, 'triangle', 0.06);
    setTimeout(() => beep(base * 1.5, 0.1, 'sine', 0.04), 60);
    if (count >= 4) setTimeout(() => beep(base * 2, 0.2, 'triangle', 0.05), 120);
  }

  function sfxGameOver() {
    beep(200, 0.3, 'sawtooth', 0.05);
    setTimeout(() => beep(150, 0.3, 'sawtooth', 0.04), 150);
    setTimeout(() => beep(100, 0.5, 'sawtooth', 0.03), 300);
  }

  function sfxLevelUp() {
    beep(660, 0.1, 'triangle', 0.05);
    setTimeout(() => beep(880, 0.15, 'triangle', 0.06), 80);
  }

  // ═══════════════════════════════════════════════════════════════
  //  CANVAS SIZING
  // ═══════════════════════════════════════════════════════════════

  function resizeCanvas() {
    const wrap = canvas.parentElement;
    const wrapRect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Use the wrapper's actual dimensions
    const maxW = Math.floor(wrapRect.width * dpr);
    const maxH = Math.floor(Math.max(wrapRect.height, window.innerHeight * 0.65) * dpr);

    // Cell size: determined by fitting ROWS+2 rows into height, or COLS+SIDE_PANEL_W*2 into width
    const totalGridCols = COLS + SIDE_PANEL_W * 2;
    const cellByW = Math.floor(maxW / totalGridCols);
    const cellByH = Math.floor(maxH / (ROWS + 2));
    cellSize = Math.min(cellByW, cellByH);
    cellSize = Math.max(cellSize, 14); // minimum cell size

    const totalW = totalGridCols * cellSize;
    const totalH = (ROWS + 2) * cellSize;

    canvas.width = totalW;
    canvas.height = totalH;
    canvas.style.width = (totalW / dpr) + 'px';
    canvas.style.height = (totalH / dpr) + 'px';

    gridOffX = SIDE_PANEL_W * cellSize;
    gridOffY = cellSize; // 1 cell top margin

    buildStars();
    if (!running) draw();
  }

  function buildStars() {
    stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.3,
      a: Math.random() * 0.5 + 0.1,
      twinkle: Math.random() * Math.PI * 2,
    }));
  }

  // ═══════════════════════════════════════════════════════════════
  //  GRID HELPERS
  // ═══════════════════════════════════════════════════════════════

  function createGrid() {
    grid = [];
    for (let r = 0; r < ROWS; r++) {
      grid.push(new Array(COLS).fill(null));
    }
  }

  function getShape(type, rot) {
    return SHAPES[type][rot % 4];
  }

  function collides(type, rot, px, py) {
    const shape = getShape(type, rot);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const gx = px + c;
        const gy = py + r;
        if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
        if (gy >= 0 && grid[gy][gx]) return true;
      }
    }
    return false;
  }

  function lockPiece() {
    const shape = getShape(current.type, current.rot);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const gy = current.y + r;
        const gx = current.x + c;
        if (gy < 0) {
          // Locked above visible area = game over
          triggerGameOver();
          return;
        }
        if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
          grid[gy][gx] = current.type;
        }
      }
    }
    sfxPlace();
    holdUsed = false;
    clearLines();
    spawnPiece();
  }

  // ─── 7-bag randomizer ────────────────────────────────────────
  function refillBag() {
    const types = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    // Fisher-Yates shuffle
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = types[i];
      types[i] = types[j];
      types[j] = tmp;
    }
    bag.push(...types);
  }

  function nextFromBag() {
    if (bag.length < 2) refillBag();
    return bag.shift();
  }

  // ─── Spawn ───────────────────────────────────────────────────
  function spawnPiece() {
    const type = nextPiece || nextFromBag();
    nextPiece = nextFromBag();

    const shape = getShape(type, 0);
    const spawnX = Math.floor((COLS - shape[0].length) / 2);
    const spawnY = -1;

    current = { type, rot: 0, x: spawnX, y: spawnY };
    lockTimer = 0;
    lockMoves = 0;

    if (collides(type, 0, spawnX, spawnY) && collides(type, 0, spawnX, spawnY + 1)) {
      triggerGameOver();
    }
  }

  // ─── Ghost piece (drop preview) ─────────────────────────────
  function ghostY() {
    if (!current) return 0;
    let gy = current.y;
    while (!collides(current.type, current.rot, current.x, gy + 1)) {
      gy++;
    }
    return gy;
  }

  // ─── Rotation with SRS wall kicks ───────────────────────────
  function tryRotate(dir) {
    if (!current) return false;
    const oldRot = current.rot;
    const newRot = (oldRot + dir + 4) % 4;
    const kickKey = `${oldRot}>${newRot}`;
    const kicks = current.type === 'I' ? KICKS_I[kickKey] : KICKS_JLSTZ[kickKey];

    if (!kicks) {
      // O-piece has no kicks
      if (!collides(current.type, newRot, current.x, current.y)) {
        current.rot = newRot;
        resetLock();
        sfxRotate();
        return true;
      }
      return false;
    }

    for (const [dx, dy] of kicks) {
      if (!collides(current.type, newRot, current.x + dx, current.y - dy)) {
        current.x += dx;
        current.y -= dy;
        current.rot = newRot;
        resetLock();
        sfxRotate();
        return true;
      }
    }
    return false;
  }

  // ─── Lock delay management ──────────────────────────────────
  const LOCK_DELAY = 500; // ms
  const MAX_LOCK_MOVES = 15;

  function resetLock() {
    if (lockMoves < MAX_LOCK_MOVES) {
      lockTimer = 0;
      lockMoves++;
    }
  }

  // ─── Line clear ─────────────────────────────────────────────
  function clearLines() {
    const fullRows = [];
    for (let r = 0; r < ROWS; r++) {
      if (grid[r].every(c => c !== null)) {
        fullRows.push(r);
      }
    }
    if (fullRows.length === 0) return;

    // Start animation
    lineClearAnim = { rows: fullRows, alpha: 1, time: 0 };

    // Score
    const pts = LINE_SCORES[Math.min(fullRows.length, 4)] * level;
    score += pts;
    lines += fullRows.length;
    sfxLineClear(fullRows.length);

    // Spawn particles for cleared rows
    fullRows.forEach(r => {
      for (let c = 0; c < COLS; c++) {
        const cellType = grid[r][c];
        const color = cellType ? PIECE_COLORS[cellType] : GOLD;
        for (let i = 0; i < 3; i++) {
          particles.push({
            x: gridOffX + c * cellSize + cellSize / 2,
            y: gridOffY + r * cellSize + cellSize / 2,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 1) * 3,
            life: 30 + Math.random() * 20,
            color: color,
            size: 2 + Math.random() * 2,
          });
        }
      }
    });

    // Remove rows (from bottom up)
    for (let i = fullRows.length - 1; i >= 0; i--) {
      grid.splice(fullRows[i], 1);
      grid.unshift(new Array(COLS).fill(null));
    }

    // Level up every 10 lines
    const newLevel = Math.floor(lines / 10) + 1;
    if (newLevel > level) {
      level = newLevel;
      sfxLevelUp();
    }

    updateStats();
  }

  // ─── Drop speed (frames at 60fps equivalent) ────────────────
  function getDropInterval() {
    // Classic NES-style: faster each level
    const speeds = [800, 720, 630, 550, 470, 380, 300, 220, 150, 100, 80, 70, 60, 50, 40];
    const idx = Math.min(level - 1, speeds.length - 1);
    return speeds[idx];
  }

  // ─── Hold piece ─────────────────────────────────────────────
  function doHold() {
    if (!current || holdUsed) return;
    holdUsed = true;
    sfxHold();

    const curType = current.type;
    if (holdPiece) {
      const shape = getShape(holdPiece, 0);
      const spawnX = Math.floor((COLS - shape[0].length) / 2);
      current = { type: holdPiece, rot: 0, x: spawnX, y: -1 };
      lockTimer = 0;
      lockMoves = 0;
    } else {
      spawnPiece();
    }
    holdPiece = curType;
  }

  // ─── Hard drop ──────────────────────────────────────────────
  function hardDrop() {
    if (!current) return;
    let dropDist = 0;
    while (!collides(current.type, current.rot, current.x, current.y + 1)) {
      current.y++;
      dropDist++;
    }
    score += dropDist * 2;
    sfxHardDrop();

    // Flash particles along drop path
    const shape = getShape(current.type, current.rot);
    for (let c = 0; c < shape[0].length; c++) {
      for (let r = shape.length - 1; r >= 0; r--) {
        if (shape[r][c]) {
          particles.push({
            x: gridOffX + (current.x + c) * cellSize + cellSize / 2,
            y: gridOffY + (current.y + r) * cellSize + cellSize / 2,
            vx: 0,
            vy: -2,
            life: 15,
            color: '#fff',
            size: cellSize * 0.3,
            glow: true,
          });
          break;
        }
      }
    }

    lockPiece();
  }

  // ─── Game over ──────────────────────────────────────────────
  function triggerGameOver() {
    gameOver = true;
    running = false;
    sfxGameOver();
    updateStats('GAME OVER');
  }

  function updateStats(extra) {
    if (!statsEl) return;
    const parts = [`Score: ${score}`, `Level: ${level}`, `Lines: ${lines}`];
    if (extra) parts.push(extra);
    statsEl.textContent = parts.join(' \u2022 ');
  }

  // ═══════════════════════════════════════════════════════════════
  //  GAME LOOP
  // ═══════════════════════════════════════════════════════════════

  function startGame() {
    createGrid();
    bag = [];
    refillBag();
    nextPiece = null;
    holdPiece = null;
    holdUsed = false;
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    paused = false;
    running = true;
    dropTimer = 0;
    lockTimer = 0;
    lockMoves = 0;
    softDropping = false;
    particles = [];
    lineClearAnim = null;
    dasDir = 0;
    dasTimer = 0;
    dasActive = false;
    keysDown = { left: false, right: false };
    current = null;

    spawnPiece();
    updateStats();
    lastTime = performance.now();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(loop);
  }

  function loop(ts) {
    const dt = Math.min(ts - lastTime, 100);
    lastTime = ts;

    if (running && !paused && !gameOver) {
      updateGame(dt);
    }

    draw();

    if (running || gameOver) {
      animFrameId = requestAnimationFrame(loop);
    }
  }

  function updateGame(dt) {
    if (!current) return;

    // DAS (Delayed Auto Shift)
    if (dasDir !== 0) {
      dasTimer += dt;
      if (!dasActive && dasTimer >= DAS_DELAY) {
        dasActive = true;
        dasTimer = 0;
        movePiece(dasDir, 0);
      } else if (dasActive && dasTimer >= DAS_RATE) {
        dasTimer = 0;
        movePiece(dasDir, 0);
      }
    }

    // Drop
    const dropInterval = softDropping ? Math.min(getDropInterval(), 50) : getDropInterval();
    dropTimer += dt;

    if (dropTimer >= dropInterval) {
      dropTimer = 0;
      if (!collides(current.type, current.rot, current.x, current.y + 1)) {
        current.y++;
        if (softDropping) score += 1;
      }
    }

    // Lock delay: if piece is resting on something
    if (collides(current.type, current.rot, current.x, current.y + 1)) {
      lockTimer += dt;
      if (lockTimer >= LOCK_DELAY) {
        lockPiece();
      }
    } else {
      lockTimer = 0;
    }

    // Update particles
    particles = particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= 1;
      return p.life > 0;
    });

    // Update line clear animation
    if (lineClearAnim) {
      lineClearAnim.time += dt;
      lineClearAnim.alpha = Math.max(0, 1 - lineClearAnim.time / 300);
      if (lineClearAnim.alpha <= 0) lineClearAnim = null;
    }

    // Star twinkle
    stars.forEach(s => { s.twinkle += 0.02; });
  }

  function movePiece(dx, dy) {
    if (!current) return false;
    if (!collides(current.type, current.rot, current.x + dx, current.y + dy)) {
      current.x += dx;
      current.y += dy;
      if (dx !== 0) resetLock();
      return true;
    }
    return false;
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDERING
  // ═══════════════════════════════════════════════════════════════

  function draw() {
    const g = ctx;
    const w = canvas.width;
    const h = canvas.height;

    // Background
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, BG_DARK);
    grad.addColorStop(0.5, BG_MID);
    grad.addColorStop(1, BG_DARK);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    // Stars
    stars.forEach(s => {
      const a = s.a * (0.6 + 0.4 * Math.sin(s.twinkle));
      g.fillStyle = `rgba(210,200,180,${a})`;
      g.beginPath();
      g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      g.fill();
    });

    // Grid background
    g.fillStyle = 'rgba(6,4,14,.6)';
    g.fillRect(gridOffX, gridOffY, COLS * cellSize, ROWS * cellSize);

    // Grid lines
    g.strokeStyle = GRID_CLR;
    g.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) {
      const x = gridOffX + c * cellSize;
      g.beginPath(); g.moveTo(x, gridOffY); g.lineTo(x, gridOffY + ROWS * cellSize); g.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      const y = gridOffY + r * cellSize;
      g.beginPath(); g.moveTo(gridOffX, y); g.lineTo(gridOffX + COLS * cellSize, y); g.stroke();
    }

    // Grid border
    g.strokeStyle = 'rgba(100,90,130,.3)';
    g.lineWidth = 2;
    g.strokeRect(gridOffX, gridOffY, COLS * cellSize, ROWS * cellSize);

    // Locked blocks
    for (let r = 0; r < ROWS; r++) {
      if (!grid[r]) continue;
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c]) {
          drawBlock(g, gridOffX + c * cellSize, gridOffY + r * cellSize, cellSize, PIECE_COLORS[grid[r][c]]);
        }
      }
    }

    // Ghost piece
    if (current && !gameOver && !paused) {
      const gy = ghostY();
      const shape = getShape(current.type, current.rot);
      const color = PIECE_COLORS[current.type];
      g.globalAlpha = 0.2;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const px = gridOffX + (current.x + c) * cellSize;
          const py = gridOffY + (gy + r) * cellSize;
          if (gy + r >= 0) {
            drawBlock(g, px, py, cellSize, color);
          }
        }
      }
      g.globalAlpha = 1;
    }

    // Current piece
    if (current && !gameOver) {
      const shape = getShape(current.type, current.rot);
      const color = PIECE_COLORS[current.type];
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const py = current.y + r;
          if (py < 0) continue; // above visible area
          const px = gridOffX + (current.x + c) * cellSize;
          const ppy = gridOffY + py * cellSize;
          drawBlock(g, px, ppy, cellSize, color);
        }
      }
    }

    // Line clear flash
    if (lineClearAnim) {
      g.fillStyle = `rgba(255,255,230,${lineClearAnim.alpha * 0.4})`;
      lineClearAnim.rows.forEach(r => {
        g.fillRect(gridOffX, gridOffY + r * cellSize, COLS * cellSize, cellSize);
      });
    }

    // Particles
    particles.forEach(p => {
      if (p.glow) {
        const a = p.life / 15;
        g.fillStyle = `rgba(255,255,255,${a * 0.5})`;
        g.beginPath();
        g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        g.fill();
      } else {
        const a = Math.min(1, p.life / 25);
        g.fillStyle = p.color;
        g.globalAlpha = a;
        g.beginPath();
        g.arc(p.x, p.y, p.size * (p.life / 40), 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
      }
    });

    // Side panels
    drawSidePanel(g, 'NEXT', nextPiece, gridOffX + COLS * cellSize + cellSize * 0.5, gridOffY);
    drawSidePanel(g, 'HOLD', holdPiece, 0, gridOffY);

    // Pause overlay
    if (paused && !gameOver) {
      g.fillStyle = 'rgba(8,11,22,.8)';
      g.fillRect(0, 0, w, h);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `bold ${Math.floor(cellSize * 1.8)}px "Segoe UI", system-ui, sans-serif`;
      g.fillStyle = GOLD_LT;
      g.fillText('PAUSED', w / 2, h / 2);
      g.font = `${Math.floor(cellSize * 0.7)}px "Segoe UI", system-ui, sans-serif`;
      g.fillStyle = MUTED;
      g.fillText('Press P to resume', w / 2, h / 2 + cellSize * 2);
    }

    // Game over overlay
    if (gameOver) {
      g.fillStyle = 'rgba(8,11,22,.85)';
      g.fillRect(0, 0, w, h);
      g.textAlign = 'center';
      g.textBaseline = 'middle';

      g.font = `900 ${Math.floor(cellSize * 2)}px "Segoe UI", system-ui, sans-serif`;
      g.fillStyle = '#a05050';
      g.fillText('GAME OVER', w / 2, h * 0.33);

      g.font = `600 ${Math.floor(cellSize * 0.9)}px "Segoe UI", system-ui, sans-serif`;
      g.fillStyle = TEXT_CLR;
      g.fillText(`Score: ${score}`, w / 2, h * 0.45);
      g.fillText(`Level: ${level}  \u2022  Lines: ${lines}`, w / 2, h * 0.52);

      // Restart button
      const btnW = cellSize * 7;
      const btnH = cellSize * 2;
      const btnX = w / 2 - btnW / 2;
      const btnY = h * 0.62;
      g.fillStyle = 'rgba(61,80,128,.6)';
      g.strokeStyle = 'rgba(201,148,74,.5)';
      g.lineWidth = 2;
      g.beginPath();
      g.roundRect(btnX, btnY, btnW, btnH, 8);
      g.fill();
      g.stroke();

      g.fillStyle = GOLD_LT;
      g.font = `700 ${Math.floor(cellSize * 0.8)}px "Segoe UI", system-ui, sans-serif`;
      g.fillText('PLAY AGAIN', w / 2, btnY + btnH / 2);

      // Store for click detection
      _restartBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
    }
  }

  let _restartBtn = null;

  function drawBlock(g, x, y, size, color) {
    const pad = 1;
    const s = size - pad * 2;

    // Main fill
    g.fillStyle = color;
    g.fillRect(x + pad, y + pad, s, s);

    // Lighter top-left edges (painted/matte look)
    g.fillStyle = 'rgba(255,255,255,.15)';
    g.fillRect(x + pad, y + pad, s, 2);
    g.fillRect(x + pad, y + pad, 2, s);

    // Darker bottom-right edges
    g.fillStyle = 'rgba(0,0,0,.2)';
    g.fillRect(x + pad, y + pad + s - 2, s, 2);
    g.fillRect(x + pad + s - 2, y + pad, 2, s);
  }

  function drawSidePanel(g, label, pieceType, px, py) {
    const panelW = SIDE_PANEL_W * cellSize;
    const panelH = cellSize * 5;

    // Panel background
    g.fillStyle = 'rgba(10,8,20,.5)';
    g.fillRect(px, py, panelW, panelH);
    g.strokeStyle = 'rgba(100,90,130,.2)';
    g.lineWidth = 1;
    g.strokeRect(px, py, panelW, panelH);

    // Label
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `600 ${Math.floor(cellSize * 0.55)}px "Segoe UI", system-ui, sans-serif`;
    g.fillStyle = MUTED;
    g.fillText(label, px + panelW / 2, py + cellSize * 0.3);

    // Draw piece preview
    if (pieceType) {
      const shape = getShape(pieceType, 0);
      const color = PIECE_COLORS[pieceType];
      const previewCellSize = cellSize * 0.7;
      const shapeW = shape[0].length * previewCellSize;
      const shapeH = shape.length * previewCellSize;
      const offX = px + (panelW - shapeW) / 2;
      const offY = py + cellSize * 1.5 + (cellSize * 3 - shapeH) / 2;

      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            drawBlock(g, offX + c * previewCellSize, offY + r * previewCellSize, previewCellSize, color);
          }
        }
      }
    }
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
    startGame();
  }

  function closeGame() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    running = false;
    gameOver = false;
    paused = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  launchBtn.addEventListener('click', openGame);
  if (closeBtn) closeBtn.addEventListener('click', closeGame);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeGame(); });

  window.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('open')) return;
    if (gameOver) {
      if (e.code === 'Space' || e.code === 'Enter') {
        startGame();
        e.preventDefault();
      }
      return;
    }

    if (e.code === 'KeyP') {
      paused = !paused;
      e.preventDefault();
      return;
    }

    if (paused) return;

    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        if (!keysDown.left) {
          keysDown.left = true;
          dasDir = -1;
          dasTimer = 0;
          dasActive = false;
          movePiece(-1, 0);
          sfxMove();
        }
        e.preventDefault();
        break;

      case 'ArrowRight':
      case 'KeyD':
        if (!keysDown.right) {
          keysDown.right = true;
          dasDir = 1;
          dasTimer = 0;
          dasActive = false;
          movePiece(1, 0);
          sfxMove();
        }
        e.preventDefault();
        break;

      case 'ArrowUp':
      case 'KeyW':
        tryRotate(1);
        e.preventDefault();
        break;

      case 'KeyZ':
        tryRotate(-1);
        e.preventDefault();
        break;

      case 'ArrowDown':
      case 'KeyS':
        softDropping = true;
        e.preventDefault();
        break;

      case 'Space':
        hardDrop();
        e.preventDefault();
        break;

      case 'KeyC':
      case 'ShiftLeft':
      case 'ShiftRight':
        doHold();
        e.preventDefault();
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
    if (!overlay.classList.contains('open')) return;

    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        keysDown.left = false;
        if (keysDown.right) {
          dasDir = 1;
          dasTimer = 0;
          dasActive = false;
        } else {
          dasDir = 0;
        }
        break;

      case 'ArrowRight':
      case 'KeyD':
        keysDown.right = false;
        if (keysDown.left) {
          dasDir = -1;
          dasTimer = 0;
          dasActive = false;
        } else {
          dasDir = 0;
        }
        break;

      case 'ArrowDown':
      case 'KeyS':
        softDropping = false;
        break;
    }
  });

  // ─── Touch controls ─────────────────────────────────────────
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let touchMoved = false;

  canvas.addEventListener('touchstart', (e) => {
    if (gameOver) {
      handleRestartClick(e.touches[0]);
      e.preventDefault();
      return;
    }
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartTime = performance.now();
    touchMoved = false;
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (gameOver || paused || !current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const threshold = cellSize / (Math.min(window.devicePixelRatio || 1, 2)) * 0.6;

    if (Math.abs(dx) > threshold) {
      movePiece(dx > 0 ? 1 : -1, 0);
      touchStartX = t.clientX;
      touchMoved = true;
    }

    if (dy > threshold * 1.5) {
      softDropping = true;
      touchStartY = t.clientY;
      touchMoved = true;
    }
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    softDropping = false;
    const elapsed = performance.now() - touchStartTime;

    if (!touchMoved && elapsed < 250) {
      // Tap = rotate
      tryRotate(1);
    }
    e.preventDefault();
  }, { passive: false });

  // Double-tap for hard drop
  let lastTapTime = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (gameOver) {
      handleRestartClick(e);
      return;
    }
    const now = performance.now();
    if (now - lastTapTime < 300 && !touchMoved) {
      hardDrop();
    }
    lastTapTime = now;
  });

  function handleRestartClick(e) {
    if (!gameOver || !_restartBtn) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.width / rect.width;
    const ch = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * cw;
    const y = (e.clientY - rect.top) * ch;
    const btn = _restartBtn;
    if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
      startGame();
    }
  }

  window.addEventListener('resize', () => {
    if (overlay.classList.contains('open')) resizeCanvas();
  });

  // Initial sizing (hidden, but ready)
  resizeCanvas();
})();
