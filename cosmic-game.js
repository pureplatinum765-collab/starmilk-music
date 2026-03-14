(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
   * COSMIC MAZE QUEST — STARMILK
   * Fixed-timestep game loop, procedural SFX, expressive mascot,
   * persistent minimap, mobile-responsive layout, score/timer,
   * gradient trail, wall collision feedback, fog of war.
   * ═══════════════════════════════════════════════════════════════ */

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── World constants ────────────────────────────────────────────
  const CELL = 360;
  const COLS = 14;
  const ROWS = 10;
  const WORLD_W = COLS * CELL;
  const WORLD_H = ROWS * CELL;
  const PLAYER_R = 22;
  const PLAYER_ACCEL = 0.46;
  const PLAYER_FRICTION = 0.84;
  const PLAYER_MAX = 7;
  const WALL_MARGIN = 26;

  // ─── Fixed timestep ─────────────────────────────────────────────
  const TICK_RATE = 1000 / 60; // 60 Hz physics

  // ─── Track data (unchanged) ───────────────────────────────────────
  const TRACKS = [
    {
      id: 'tribe',
      title: 'TRIBE STAR MILK',
      embedBase: 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/star-milk-645735333/tribe-star-milk&color=%239333ea&hide_related=true&show_comments=false&show_reposts=false&show_teaser=false',
      color: '#9333ea',
      fragsNeed: 4,
    },
    {
      id: 'honey-wound',
      title: 'HONEY IN THE WOUND',
      embedBase: 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/star-milk-645735333/honey-in-the-wound&color=%23f59e0b&hide_related=true&show_comments=false&show_reposts=false&show_teaser=false',
      color: '#f59e0b',
      fragsNeed: 4,
    },
  ];

  const BONUS_TRACKS = [
    {
      title: 'TRIBE STAR MILK (Hidden Cosmic Mix)',
      embed: 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/star-milk-645735333/tribe-star-milk&color=%23fbbf24&auto_play=true&hide_related=true&show_comments=false&show_reposts=false&show_teaser=false',
    },
    {
      title: 'HONEY IN THE WOUND (Hidden Portal Edit)',
      embed: 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/star-milk-645735333/honey-in-the-wound&color=%23fbbf24&auto_play=true&hide_related=true&show_comments=false&show_reposts=false&show_teaser=false',
    },
  ];

  const FACTS = [
    'STARMILK was born from quantum physics meeting childhood trauma.',
    'The name comes from cosmic milk flowing between stars.',
    'Each beat is written like a mythic map back to the body.',
    'The project treats basslines as emotional archaeology.',
  ];

  const POWER_UPS = [
    { id: 'star-vision', title: 'Star Vision', color: '#fbbf24', duration: 10000, icon: '✦' },
    { id: 'cosmic-speed', title: 'Cosmic Speed', color: '#38bdf8', duration: 15000, icon: '➤' },
    { id: 'milk-shield', title: 'Milk Shield', color: '#a78bfa', duration: 0, icon: '◍' },
  ];

  // ─── Score constants ────────────────────────────────────────────
  const SCORE_FRAGMENT = 250;
  const SCORE_TRACK = 1000;
  const SCORE_BOX = 150;
  const SCORE_BONUS = 500;
  const SCORE_POWERUP = 100;

  // ─── Game state ──────────────────────────────────────────────────
  const state = {
    active: false,
    maze: null,
    tracks: Object.fromEntries(TRACKS.map(t => [t.id, { discovered: false, frags: 0, wx: 0, wy: 0 }])),
    bonusFound: 0,
    boxesOpened: 0,
    score: 0,
    startTime: 0,
    elapsedMs: 0,
    player: { x: CELL / 2, y: CELL / 2, vx: 0, vy: 0, trail: [], facing: 0, idleTime: 0 },
    cam: { x: 0, y: 0 },
    keys: new Set(),
    joystick: { on: false, dx: 0, dy: 0 },
    particles: [],
    mysteryBoxes: [],
    powerUps: [],
    activePowerUps: { starVisionUntil: 0, cosmicSpeedUntil: 0, milkShieldCharges: 0 },
    effects: [],
    bonusOrbs: [],
    energyPulses: [],
    lastTs: 0,
    accumulator: 0,
    raf: null,
    screenShake: { x: 0, y: 0, intensity: 0, decay: 0.88 },
    minimapVisible: true,
    isMobile: false,
    musicPanelOpen: true,
  };

  // ─── Audio engine ──────────────────────────────────────────────────
  let audioCtx = null;

  function ensureAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) { /* silent */ }
  }

  function sfx(freq, dur, type, vol, ramp) {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      if (ramp) o.frequency.exponentialRampToValueAtTime(ramp, audioCtx.currentTime + dur);
      g.gain.value = vol || 0.04;
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + dur);
    } catch (_) { /* silent */ }
  }

  function sfxWallBump() { sfx(120, 0.15, 'sawtooth', 0.06, 60); }
  function sfxCollectFragment() { sfx(660, 0.2, 'triangle', 0.07, 880); }
  function sfxOpenBox() { sfx(440, 0.25, 'square', 0.05, 220); sfx(550, 0.2, 'sine', 0.04); }
  function sfxDiscoverSong() { sfx(523, 0.35, 'sine', 0.08, 1046); setTimeout(() => sfx(659, 0.3, 'sine', 0.07), 120); }
  function sfxPowerUp() { sfx(880, 0.3, 'triangle', 0.06, 440); }
  function sfxAmbientHum() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = 55;
      g.gain.value = 0.008;
      o.connect(g).connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + 2);
    } catch (_) { /* silent */ }
  }

  // ─── DOM references ───────────────────────────────────────────────
  let overlay, playArea, canvas, ctx, hud, popup, mapScreen, musicPanel, musicFrame, playlist;
  let powerPrompt, minimapCanvas, minimapCtx, musicToggleBtn, controlsTray;
  let W = 0, H = 0;

  // ═══════════════════════════════════════════════════════════════
  //  INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  function init() {
    state.isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 900;
    buildDOM();
    setupInput();
    generateRun();
    injectLaunch();
  }

  // ─── DOM construction ───────────────────────────────────────────────

  function buildDOM() {
    overlay = document.createElement('div');
    overlay.style.cssText = 'display:none;position:fixed;inset:0;z-index:9000;background:#040008;color:#e9ddff;font-family:Segoe UI,system-ui,sans-serif;';

    playArea = document.createElement('div');
    // On mobile, the play area takes full width
    playArea.style.cssText = state.isMobile
      ? 'position:absolute;inset:0;overflow:hidden;'
      : 'position:absolute;inset:0 320px 0 0;overflow:hidden;';
    overlay.appendChild(playArea);

    canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;';
    ctx = canvas.getContext('2d');
    playArea.appendChild(canvas);

    // Minimap canvas (persistent, top-right corner of play area)
    minimapCanvas = document.createElement('canvas');
    minimapCanvas.width = 180;
    minimapCanvas.height = 130;
    minimapCanvas.style.cssText = 'position:absolute;right:4.5rem;top:3.2rem;z-index:10;border-radius:10px;border:1px solid rgba(147,51,234,.45);background:rgba(4,0,12,.78);pointer-events:none;';
    minimapCtx = minimapCanvas.getContext('2d');
    playArea.appendChild(minimapCanvas);

    const exit = floatingBtn('✕ Exit Cosmos', 'right:1rem;top:1rem;');
    exit.onclick = exitGame;
    playArea.appendChild(exit);

    const controlsBtn = floatingBtn('☰ Controls', 'left:1rem;top:1rem;border-color:rgba(124,58,237,.5);');
    controlsTray = document.createElement('div');
    controlsTray.style.cssText = 'display:none;position:absolute;left:1rem;top:3.35rem;z-index:11;background:rgba(8,0,18,.9);border:1px solid rgba(124,58,237,.45);border-radius:12px;padding:.4rem;gap:.35rem;flex-direction:column;';

    const mapBtn = floatingBtn('★ Star Map', 'position:static;border-color:rgba(245,158,11,.5);font-size:.62rem;padding:.34rem .72rem;');
    mapBtn.onclick = toggleMap;

    const mmBtn = floatingBtn('◎ Mini Map', 'position:static;border-color:rgba(124,58,237,.5);font-size:.62rem;padding:.34rem .72rem;');
    mmBtn.onclick = () => {
      state.minimapVisible = !state.minimapVisible;
      minimapCanvas.style.display = state.minimapVisible ? 'block' : 'none';
      mmBtn.style.opacity = state.minimapVisible ? '1' : '.62';
    };

    controlsBtn.onclick = () => {
      const open = controlsTray.style.display !== 'flex';
      controlsTray.style.display = open ? 'flex' : 'none';
    };

    controlsTray.appendChild(mapBtn);
    controlsTray.appendChild(mmBtn);
    playArea.appendChild(controlsBtn);
    playArea.appendChild(controlsTray);

    hud = document.createElement('div');
    hud.style.cssText = 'position:absolute;bottom:1rem;left:50%;transform:translateX(-50%);padding:.7rem 1rem;background:rgba(8,0,16,.72);border:1px solid rgba(147,51,234,.45);border-radius:12px;letter-spacing:.08em;font-size:.72rem;text-transform:uppercase;max-width:96vw;text-align:center;';
    playArea.appendChild(hud);

    popup = document.createElement('div');
    popup.style.cssText = 'display:none;position:absolute;z-index:40;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,92vw);background:rgba(6,0,15,.98);border:1px solid rgba(245,158,11,.5);border-radius:18px;padding:1rem;';
    overlay.appendChild(popup);

    powerPrompt = document.createElement('div');
    powerPrompt.style.cssText = 'display:none;position:absolute;right:1rem;bottom:4.6rem;z-index:25;max-width:min(360px,88vw);background:rgba(8,0,18,.92);border:1px solid rgba(147,51,234,.45);border-radius:14px;padding:.75rem;box-shadow:0 8px 24px rgba(0,0,0,.45);';
    overlay.appendChild(powerPrompt);

    mapScreen = document.createElement('div');
    mapScreen.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(2,0,9,.94);z-index:30;align-items:center;justify-content:center;';
    overlay.appendChild(mapScreen);

    buildMusicPanel();
    buildJoystick();
    document.body.appendChild(overlay);
  }

  function floatingBtn(text, extra) {
    const b = document.createElement('button');
    b.textContent = text;
    b.style.cssText = `position:absolute;z-index:8;padding:.45rem .9rem;border-radius:999px;border:1px solid rgba(147,51,234,.4);background:rgba(8,0,16,.9);color:#d8c8ff;cursor:pointer;font-size:.69rem;letter-spacing:.12em;text-transform:uppercase;${extra}`;
    return b;
  }

  function buildMusicPanel() {
    musicPanel = document.createElement('aside');
    musicPanel.style.cssText = state.isMobile
      ? 'display:none;position:absolute;top:0;right:0;bottom:0;width:320px;background:linear-gradient(180deg,rgba(12,0,26,.98),rgba(6,0,16,.98));border-left:1px solid rgba(147,51,234,.4);padding:1rem;overflow:auto;z-index:20;'
      : 'position:absolute;top:0;right:0;bottom:0;width:320px;background:linear-gradient(180deg,rgba(12,0,26,.98),rgba(6,0,16,.98));border-left:1px solid rgba(147,51,234,.4);padding:1rem;overflow:auto;';
    musicPanel.innerHTML = '<div style="font-weight:800;letter-spacing:.16em;font-size:.72rem;text-transform:uppercase;color:#fcd34d">Cosmic Player</div><h3 style="margin:.4rem 0 1rem;font-size:1rem">TRIBE STAR MILK — STARMILK</h3>';

    musicFrame = document.createElement('iframe');
    musicFrame.setAttribute('allow', 'autoplay');
    musicFrame.width = '100%';
    musicFrame.height = '166';
    musicFrame.style.border = '0';
    musicPanel.appendChild(musicFrame);

    const mini = document.createElement('div');
    mini.style.cssText = 'margin-top:1rem;font-size:.72rem;color:#ab96d4;letter-spacing:.1em;text-transform:uppercase;';
    mini.textContent = 'Mini Playlist';
    musicPanel.appendChild(mini);

    playlist = document.createElement('div');
    playlist.style.cssText = 'display:flex;flex-direction:column;gap:.5rem;margin-top:.5rem;';
    TRACKS.forEach((track, i) => {
      const item = document.createElement('button');
      item.textContent = track.title;
      item.style.cssText = 'text-align:left;border:1px solid rgba(147,51,234,.35);background:rgba(21,5,35,.8);color:#e8dbff;padding:.5rem;border-radius:10px;cursor:pointer;';
      item.onclick = () => setTrack(track, true);
      if (i === 0) item.dataset.active = '1';
      playlist.appendChild(item);
    });
    musicPanel.appendChild(playlist);
    overlay.appendChild(musicPanel);

    // Mobile music toggle button
    if (state.isMobile) {
      musicToggleBtn = document.createElement('button');
      musicToggleBtn.textContent = '♪ Music';
      musicToggleBtn.style.cssText = 'position:absolute;right:1rem;top:5.8rem;z-index:8;padding:.45rem .9rem;border-radius:999px;border:1px solid rgba(245,158,11,.5);background:rgba(8,0,16,.9);color:#fcd34d;cursor:pointer;font-size:.65rem;letter-spacing:.12em;text-transform:uppercase;';
      musicToggleBtn.onclick = () => {
        state.musicPanelOpen = !state.musicPanelOpen;
        musicPanel.style.display = state.musicPanelOpen ? 'block' : 'none';
      };
      controlsTray.appendChild(musicToggleBtn);
    }
  }

  function buildJoystick() {
    if (!state.isMobile) return;
    const base = document.createElement('div');
    base.style.cssText = 'position:absolute;left:20px;bottom:22px;width:110px;height:110px;border-radius:50%;background:rgba(7,0,18,.5);border:1px solid rgba(147,51,234,.4);z-index:9;touch-action:none;';
    const knob = document.createElement('div');
    knob.style.cssText = 'position:absolute;left:50%;top:50%;width:46px;height:46px;border-radius:50%;transform:translate(-50%,-50%);background:rgba(147,51,234,.7);';
    base.appendChild(knob);
    playArea.appendChild(base);
    const max = 30;
    let tid = null;
    let cx = 0, cy = 0;

    base.addEventListener('touchstart', e => {
      ensureAudio();
      tid = e.changedTouches[0].identifier;
      const r = base.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      state.joystick.on = true;
    }, { passive: true });

    document.addEventListener('touchmove', e => {
      if (!state.joystick.on) return;
      const t = Array.from(e.touches).find(t => t.identifier === tid);
      if (!t) return;
      let dx = t.clientX - cx, dy = t.clientY - cy;
      const len = Math.hypot(dx, dy) || 1;
      const cl = Math.min(max, len);
      state.joystick.dx = dx / len;
      state.joystick.dy = dy / len;
      knob.style.transform = `translate(calc(-50% + ${state.joystick.dx * cl}px),calc(-50% + ${state.joystick.dy * cl}px))`;
    }, { passive: true });

    document.addEventListener('touchend', e => {
      if (!Array.from(e.changedTouches).some(t => t.identifier === tid)) return;
      state.joystick.on = false; state.joystick.dx = 0; state.joystick.dy = 0;
      knob.style.transform = 'translate(-50%,-50%)';
    }, { passive: true });
  }

  // ─── Input ─────────────────────────────────────────────────────────────

  function setupInput() {
    document.addEventListener('keydown', e => {
      if (!state.active) return;
      ensureAudio();
      state.keys.add(e.code);
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    document.addEventListener('keyup', e => state.keys.delete(e.code));
    window.addEventListener('resize', resize);
  }

  // ─── Launch injection ───────────────────────────────────────────────

  function injectLaunch() {
    attachLaunchTriggers();
    const hero = document.querySelector('.hero-content');
    if (!hero) return;
    const btn = document.createElement('button');
    btn.id = 'cq-launch-btn';
    btn.className = 'btn';
    btn.innerHTML = '★ Enter the Cosmos ★';
    btn.setAttribute('data-cosmic-launch', '');
    hero.appendChild(btn);
    attachLaunchTriggers();
  }

  function attachLaunchTriggers() {
    document.querySelectorAll('[data-cosmic-launch]').forEach(btn => {
      if (btn.dataset.boundCosmicLaunch === '1') return;
      btn.addEventListener('click', launchGame);
      btn.dataset.boundCosmicLaunch = '1';
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  MAZE GENERATION
  // ═══════════════════════════════════════════════════════════════

  function createMaze(cols, rows) {
    const maze = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ n: false, e: false, s: false, w: false, v: false })));
    const stack = [{ x: 0, y: 0 }];
    maze[0][0].v = true;
    while (stack.length) {
      const cur = stack[stack.length - 1];
      const neighbors = [
        { x: cur.x, y: cur.y - 1, a: 'n', b: 's' },
        { x: cur.x + 1, y: cur.y, a: 'e', b: 'w' },
        { x: cur.x, y: cur.y + 1, a: 's', b: 'n' },
        { x: cur.x - 1, y: cur.y, a: 'w', b: 'e' },
      ].filter(n => n.x >= 0 && n.y >= 0 && n.x < cols && n.y < rows && !maze[n.y][n.x].v);

      if (!neighbors.length) { stack.pop(); continue; }
      const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
      maze[cur.y][cur.x][pick.a] = true;
      maze[pick.y][pick.x][pick.b] = true;
      maze[pick.y][pick.x].v = true;
      stack.push({ x: pick.x, y: pick.y });
    }
    maze.flat().forEach(c => delete c.v);
    return maze;
  }

  function getDeadEnds() {
    const ends = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = state.maze[y][x];
        const n = (c.n ? 1 : 0) + (c.e ? 1 : 0) + (c.s ? 1 : 0) + (c.w ? 1 : 0);
        if (n === 1) ends.push({ x, y });
      }
    }
    return ends;
  }

  // ─── Run generation ───────────────────────────────────────────────

  function generateRun() {
    state.maze = createMaze(COLS, ROWS);
    const deadEnds = getDeadEnds();
    shuffle(deadEnds);

    TRACKS.forEach((t, i) => {
      const c = deadEnds[i + 1] || { x: COLS - 1, y: ROWS - 1 };
      state.tracks[t.id].wx = c.x * CELL + CELL / 2;
      state.tracks[t.id].wy = c.y * CELL + CELL / 2;
      state.tracks[t.id].discovered = false;
      state.tracks[t.id].frags = 0;
    });

    state.bonusOrbs = deadEnds.slice(TRACKS.length + 1, TRACKS.length + 3).map((c, i) => ({
      wx: c.x * CELL + CELL / 2,
      wy: c.y * CELL + CELL / 2,
      found: false,
      track: BONUS_TRACKS[i % BONUS_TRACKS.length],
    }));

    state.mysteryBoxes = deadEnds.slice(0, 10).map(c => ({ wx: c.x * CELL + CELL / 2, wy: c.y * CELL + CELL / 2, open: false }));
    state.powerUps = POWER_UPS.map((powerUp, i) => {
      const c = deadEnds[TRACKS.length + 3 + i] || { x: 1 + i, y: ROWS - 1 - i };
      return { ...powerUp, wx: c.x * CELL + CELL / 2, wy: c.y * CELL + CELL / 2, collected: false };
    });
    state.activePowerUps.starVisionUntil = 0;
    state.activePowerUps.cosmicSpeedUntil = 0;
    state.activePowerUps.milkShieldCharges = 0;
    state.effects = [];
    state.particles = Array.from({ length: 240 }, () => ({ x: Math.random() * WORLD_W, y: Math.random() * WORLD_H, r: Math.random() * 2 + 0.5, a: Math.random() * 0.6 }));
    state.energyPulses = Array.from({ length: 120 }, () => ({ t: Math.random() * Math.PI * 2, s: Math.random() * 0.004 + 0.002 }));

    state.player.x = CELL / 2;
    state.player.y = CELL / 2;
    state.player.vx = state.player.vy = 0;
    state.player.trail = [];
    state.player.facing = 0;
    state.player.idleTime = 0;
    state.score = 0;
    state.startTime = 0;
    state.elapsedMs = 0;
    state.bonusFound = 0;
    state.boxesOpened = 0;
  }

  // ═══════════════════════════════════════════════════════════════
  //  GAME LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  function launchGame() {
    ensureAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    generateRun();
    state.active = true;
    overlay.style.display = 'block';
    resize();
    setTrack(TRACKS[0], true);
    state.lastTs = performance.now();
    state.startTime = performance.now();
    state.accumulator = 0;
    state.raf = requestAnimationFrame(loop);
    updateHud();
    sfxAmbientHum();
  }

  function exitGame() {
    state.active = false;
    cancelAnimationFrame(state.raf);
    overlay.style.display = 'none';
    popup.style.display = 'none';
    powerPrompt.style.display = 'none';
    mapScreen.style.display = 'none';
  }

  function resize() {
    if (!overlay) return;
    state.isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 900;
    if (state.isMobile) {
      playArea.style.cssText = 'position:absolute;inset:0;overflow:hidden;';
      if (musicPanel) musicPanel.style.display = state.musicPanelOpen ? 'none' : 'none'; // hidden by default on mobile
    } else {
      playArea.style.cssText = 'position:absolute;inset:0 320px 0 0;overflow:hidden;';
      if (musicPanel) musicPanel.style.display = 'block';
    }
    W = playArea.clientWidth;
    H = playArea.clientHeight;
    canvas.width = W;
    canvas.height = H;
  }

  // ═══════════════════════════════════════════════════════════════
  //  GAME LOOP — Fixed timestep physics, variable render
  // ═══════════════════════════════════════════════════════════════

  function loop(ts) {
    if (!state.active) return;

    const delta = Math.min(ts - state.lastTs, 100); // Cap at 100ms to avoid spiral of death
    state.lastTs = ts;
    state.accumulator += delta;

    // Fixed timestep physics updates
    while (state.accumulator >= TICK_RATE) {
      fixedUpdate(TICK_RATE);
      state.accumulator -= TICK_RATE;
    }

    // Variable timestep visual updates
    state.elapsedMs = ts - state.startTime;
    updateVisualEffects(ts, delta);
    render(ts);

    state.raf = requestAnimationFrame(loop);
  }

  // ─── Fixed-step physics (60 Hz) ──────────────────────────────────────

  function fixedUpdate(dt) {
    const p = state.player;
    let ax = 0, ay = 0;
    if (state.keys.has('KeyA') || state.keys.has('ArrowLeft')) ax -= 1;
    if (state.keys.has('KeyD') || state.keys.has('ArrowRight')) ax += 1;
    if (state.keys.has('KeyW') || state.keys.has('ArrowUp')) ay -= 1;
    if (state.keys.has('KeyS') || state.keys.has('ArrowDown')) ay += 1;
    if (state.joystick.on) { ax += state.joystick.dx; ay += state.joystick.dy; }
    const l = Math.hypot(ax, ay);
    if (l > 1) { ax /= l; ay /= l; }

    const now = performance.now();
    const speedBoost = now < state.activePowerUps.cosmicSpeedUntil ? 2 : 1;
    p.vx = p.vx * PLAYER_FRICTION + ax * PLAYER_ACCEL * speedBoost;
    p.vy = p.vy * PLAYER_FRICTION + ay * PLAYER_ACCEL * speedBoost;
    const sp = Math.hypot(p.vx, p.vy);
    const maxSpeed = PLAYER_MAX * speedBoost;
    if (sp > maxSpeed) { p.vx = (p.vx / sp) * maxSpeed; p.vy = (p.vy / sp) * maxSpeed; }

    // Update facing direction
    if (sp > 0.5) {
      p.facing = Math.atan2(p.vy, p.vx);
      p.idleTime = 0;
    } else {
      p.idleTime += dt;
    }

    // X movement + wall collision
    const nx = p.x + p.vx;
    if (canMove(nx, p.y)) {
      p.x = nx;
    } else if (consumeShieldCharge()) {
      p.x = clamp(nx, PLAYER_R, WORLD_W - PLAYER_R);
    } else {
      p.vx *= -0.15;
      triggerWallFeedback();
    }

    // Y movement + wall collision
    const ny = p.y + p.vy;
    if (canMove(p.x, ny)) {
      p.y = ny;
    } else if (consumeShieldCharge()) {
      p.y = clamp(ny, PLAYER_R, WORLD_H - PLAYER_R);
    } else {
      p.vy *= -0.15;
      triggerWallFeedback();
    }

    // Camera smoothing
    state.cam.x += (p.x - W / 2 - state.cam.x) * 0.1;
    state.cam.y += (p.y - H / 2 - state.cam.y) * 0.1;

    // Trail
    p.trail.unshift({ x: p.x, y: p.y, age: 0 });
    if (p.trail.length > 36) p.trail.pop();

    checkCollectibles();
  }

  function triggerWallFeedback() {
    state.screenShake.intensity = Math.min(state.screenShake.intensity + 5, 10);
    sfxWallBump();
  }

  // ─── Variable visual updates ─────────────────────────────────────────

  function updateVisualEffects(ts, dt) {
    // Screen shake decay
    const shake = state.screenShake;
    if (shake.intensity > 0.3) {
      shake.x = (Math.random() - 0.5) * shake.intensity;
      shake.y = (Math.random() - 0.5) * shake.intensity;
      shake.intensity *= shake.decay;
    } else {
      shake.x = 0; shake.y = 0; shake.intensity = 0;
    }

    // Energy pulses
    state.energyPulses.forEach(e => { e.t += dt * e.s; });

    // Expire effects
    state.effects = state.effects.filter(e => ts < e.until);

    // Update trail age
    state.player.trail.forEach(t => { t.age += dt; });

    updateHud();
  }

  // ─── Collision ───────────────────────────────────────────────────────────

  function consumeShieldCharge() {
    if (state.activePowerUps.milkShieldCharges <= 0) return false;
    state.activePowerUps.milkShieldCharges -= 1;
    return true;
  }

  function canMove(x, y) {
    if (x < PLAYER_R || y < PLAYER_R || x > WORLD_W - PLAYER_R || y > WORLD_H - PLAYER_R) return false;
    const points = [[x, y], [x - PLAYER_R, y], [x + PLAYER_R, y], [x, y - PLAYER_R], [x, y + PLAYER_R]];
    for (const [px, py] of points) {
      const cx = Math.floor(px / CELL), cy = Math.floor(py / CELL);
      const cell = state.maze[cy]?.[cx];
      if (!cell) return false;
      const lx = px - cx * CELL, ly = py - cy * CELL;
      if (lx < WALL_MARGIN && !cell.w) return false;
      if (lx > CELL - WALL_MARGIN && !cell.e) return false;
      if (ly < WALL_MARGIN && !cell.n) return false;
      if (ly > CELL - WALL_MARGIN && !cell.s) return false;
    }
    return true;
  }

  // ─── Collectibles ───────────────────────────────────────────────────────

  function checkCollectibles() {
    const p = state.player;
    TRACKS.forEach(track => {
      const s = state.tracks[track.id];
      if (!s.discovered && dist(p.x, p.y, s.wx, s.wy) < 40) {
        s.discovered = true;
        state.score += SCORE_TRACK;
        sfxDiscoverSong();
        showPopup(`<h3 style="margin-bottom:.5rem">${track.title} discovered</h3><iframe allow="autoplay" width="100%" height="166" scrolling="no" frameborder="no" src="${track.embedBase}&auto_play=true"></iframe>`);
      }
    });

    state.bonusOrbs.forEach(o => {
      if (!o.found && dist(p.x, p.y, o.wx, o.wy) < 34) {
        o.found = true;
        state.bonusFound++;
        state.score += SCORE_BONUS;
        sfxDiscoverSong();
        showPopup(`<h3 style="margin-bottom:.5rem;color:#fcd34d">Golden Orb: ${o.track.title}</h3><iframe allow="autoplay" width="100%" height="166" scrolling="no" frameborder="no" src="${o.track.embed}"></iframe>`);
      }
    });

    state.mysteryBoxes.forEach(b => {
      if (b.open || dist(p.x, p.y, b.wx, b.wy) > 45) return;
      b.open = true;
      state.boxesOpened++;
      state.score += SCORE_BOX;
      sfxOpenBox();
      const roll = Math.floor(Math.random() * 3);
      if (roll === 0) {
        const pick = BONUS_TRACKS[Math.floor(Math.random() * BONUS_TRACKS.length)];
        showPopup(`<h3>Hidden bonus song unlocked</h3><iframe allow="autoplay" width="100%" height="166" scrolling="no" frameborder="no" src="${pick.embed}"></iframe>`);
      } else if (roll === 1) {
        const fact = FACTS[Math.floor(Math.random() * FACTS.length)];
        showPopup(`<h3>Mystery Transmission</h3><p style="line-height:1.5;color:#e8dfff">${fact}</p>`);
      } else {
        const target = TRACKS[Math.floor(Math.random() * TRACKS.length)];
        state.tracks[target.id].frags = Math.min(target.fragsNeed, state.tracks[target.id].frags + 1);
        state.score += SCORE_FRAGMENT;
        sfxCollectFragment();
        showPopup(`<h3>Song fragment collectible</h3><p>+1 fragment for <strong>${target.title}</strong></p>`);
      }
    });

    state.powerUps.forEach(powerUp => {
      if (powerUp.collected || dist(p.x, p.y, powerUp.wx, powerUp.wy) > 42) return;
      powerUp.collected = true;
      state.score += SCORE_POWERUP;
      sfxPowerUp();
      offerPowerUpActivation(powerUp);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDERING
  // ═══════════════════════════════════════════════════════════════

  function render(ts) {
    ctx.save();
    ctx.translate(state.screenShake.x, state.screenShake.y);

    ctx.clearRect(-10, -10, W + 20, H + 20);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#120026');
    bg.addColorStop(1, '#040008');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    renderParticles(ts);
    renderMaze(ts);
    renderFogOfWar();
    renderCollectibles(ts);
    renderTrail();
    renderMascot(ts);
    renderActiveEffects(ts);

    ctx.restore();

    // Minimap (unaffected by screen shake)
    if (state.minimapVisible) renderMinimap(ts);
  }

  // ─── Background particles ───────────────────────────────────────────

  function renderParticles(ts) {
    state.particles.forEach((p, i) => {
      const sx = p.x - state.cam.x;
      const sy = p.y - state.cam.y;
      if (sx < -5 || sy < -5 || sx > W + 5 || sy > H + 5) return;
      const tw = REDUCED ? 0 : Math.sin(ts * 0.001 + i) * 0.25;
      ctx.fillStyle = `rgba(180,150,255,${p.a + tw})`;
      ctx.beginPath(); ctx.arc(sx, sy, p.r, 0, Math.PI * 2); ctx.fill();
    });
  }

  // ─── Maze walls ─────────────────────────────────────────────────────────

  function renderMaze(ts) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = state.maze[y][x];
        const ox = x * CELL - state.cam.x;
        const oy = y * CELL - state.cam.y;
        if (ox > W || oy > H || ox + CELL < 0 || oy + CELL < 0) continue;

        const grd = ctx.createRadialGradient(ox + CELL / 2, oy + CELL / 2, 20, ox + CELL / 2, oy + CELL / 2, CELL / 1.2);
        grd.addColorStop(0, 'rgba(60,20,120,0.22)');
        grd.addColorStop(1, 'rgba(8,2,24,0.05)');
        ctx.fillStyle = grd;
        ctx.fillRect(ox, oy, CELL, CELL);

        const pulse = 0.55 + Math.sin(ts * 0.002 + (x + y)) * 0.3;
        ctx.strokeStyle = `rgba(80,180,255,${pulse})`;
        ctx.lineWidth = 7;
        ctx.shadowBlur = 16;
        ctx.shadowColor = 'rgba(80,180,255,.65)';

        if (!cell.n) drawWall(ox, oy, ox + CELL, oy);
        if (!cell.s) drawWall(ox, oy + CELL, ox + CELL, oy + CELL);
        if (!cell.w) drawWall(ox, oy, ox, oy + CELL);
        if (!cell.e) drawWall(ox + CELL, oy, ox + CELL, oy + CELL);
      }
    }
    ctx.shadowBlur = 0;
  }

  function drawWall(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // ─── Fog of war ─────────────────────────────────────────────────────────

  function renderFogOfWar() {
    if (REDUCED) return;
    const p = state.player;
    const px = p.x - state.cam.x;
    const py = p.y - state.cam.y;
    const lightRadius = 320;
    const now = performance.now();
    const hasStarVision = now < state.activePowerUps.starVisionUntil;
    if (hasStarVision) return; // No fog when star vision is active

    const fog = ctx.createRadialGradient(px, py, lightRadius * 0.4, px, py, lightRadius);
    fog.addColorStop(0, 'rgba(4,0,8,0)');
    fog.addColorStop(0.6, 'rgba(4,0,8,0.15)');
    fog.addColorStop(1, 'rgba(4,0,8,0.55)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);
  }

  // ─── Collectibles ───────────────────────────────────────────────────────

  function renderCollectibles(ts) {
    TRACKS.forEach(track => {
      const s = state.tracks[track.id];
      if (s.discovered) return;
      drawOrb(s.wx, s.wy, track.color, ts, 18);
    });

    state.bonusOrbs.forEach(o => {
      if (o.found) return;
      drawOrb(o.wx, o.wy, '#fbbf24', ts, 14);
    });

    state.mysteryBoxes.forEach(b => {
      if (b.open) return;
      const sx = b.wx - state.cam.x, sy = b.wy - state.cam.y;
      const p = 0.5 + Math.sin(ts * 0.004 + b.wx) * 0.25;
      ctx.fillStyle = `rgba(147,51,234,${0.5 + p})`;
      ctx.strokeStyle = '#fcd34d';
      ctx.lineWidth = 2;
      ctx.fillRect(sx - 12, sy - 12, 24, 24);
      ctx.strokeRect(sx - 12, sy - 12, 24, 24);
    });

    state.powerUps.forEach(powerUp => {
      if (powerUp.collected) return;
      drawPowerUp(powerUp, ts);
    });

    if (ts < state.activePowerUps.starVisionUntil) {
      TRACKS.forEach(track => {
        const s = state.tracks[track.id];
        if (!s.discovered) drawRevealPulse(s.wx, s.wy, ts, 34);
      });
      state.mysteryBoxes.forEach(b => {
        if (!b.open) drawRevealPulse(b.wx, b.wy, ts, 28);
      });
    }
  }

  function drawPowerUp(powerUp, ts) {
    const sx = powerUp.wx - state.cam.x, sy = powerUp.wy - state.cam.y;
    const pulse = 0.65 + Math.sin(ts * 0.005 + powerUp.wx * 0.01) * 0.3;
    const aura = ctx.createRadialGradient(sx, sy, 0, sx, sy, 40);
    aura.addColorStop(0, 'rgba(255,255,255,.95)');
    aura.addColorStop(0.35, hexToRgba(powerUp.color, 0.7 + pulse * 0.2));
    aura.addColorStop(1, hexToRgba(powerUp.color, 0));
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(sx, sy, 30, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = hexToRgba(powerUp.color, 0.9);
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(sx, sy, 14 + pulse * 4, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff7d6';
    ctx.font = '700 18px Segoe UI';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(powerUp.icon, sx, sy + 1);
  }

  function drawRevealPulse(wx, wy, ts, r) {
    const sx = wx - state.cam.x, sy = wy - state.cam.y;
    const pulse = 0.4 + Math.sin(ts * 0.008 + wx * 0.005) * 0.2;
    ctx.strokeStyle = `rgba(251,191,36,${0.6 + pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(sx, sy, r + pulse * 10, 0, Math.PI * 2); ctx.stroke();
  }

  function drawOrb(wx, wy, color, ts, r) {
    const sx = wx - state.cam.x, sy = wy - state.cam.y;
    const p = 0.7 + Math.sin(ts * 0.003 + wx) * 0.2;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.6);
    g.addColorStop(0, `rgba(255,255,255,${p})`);
    g.addColorStop(0.4, hexToRgba(color, 0.8));
    g.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─── Trail (smooth gradient) ──────────────────────────────────────────

  function renderTrail() {
    const trail = state.player.trail;
    if (trail.length < 2) return;

    for (let i = trail.length - 1; i >= 0; i--) {
      const t = trail[i];
      const sx = t.x - state.cam.x, sy = t.y - state.cam.y;
      const progress = 1 - i / trail.length;
      const alpha = progress * 0.3;
      const radius = 8 * progress + 2;

      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
      grad.addColorStop(0, `rgba(124,58,237,${alpha})`);
      grad.addColorStop(0.5, `rgba(167,139,250,${alpha * 0.6})`);
      grad.addColorStop(1, `rgba(124,58,237,0)`);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(sx, sy, radius, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ─── Mascot (expressive) ─────────────────────────────────────────────

  function renderMascot(ts) {
    const p = state.player;
    const sx = p.x - state.cam.x, sy = p.y - state.cam.y;
    const bob = REDUCED ? 0 : Math.sin(ts * 0.004) * 3;
    const speed = Math.hypot(p.vx, p.vy);

    ctx.save();
    ctx.translate(sx, sy + bob);
    ctx.rotate((p.vx / PLAYER_MAX) * 0.2);

    // Pulsing aura
    const auraPulse = 0.3 + Math.sin(ts * 0.003) * 0.15;
    const auraRadius = PLAYER_R + 14 + Math.sin(ts * 0.004) * 4;
    const aura = ctx.createRadialGradient(0, 0, PLAYER_R * 0.5, 0, 0, auraRadius);
    aura.addColorStop(0, `rgba(124,58,237,${auraPulse})`);
    aura.addColorStop(0.5, `rgba(167,139,250,${auraPulse * 0.4})`);
    aura.addColorStop(1, 'rgba(124,58,237,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, auraRadius, 0, Math.PI * 2); ctx.fill();

    // Body
    ctx.fillStyle = '#f7f1ff';
    ctx.beginPath(); ctx.roundRect(-16, -18, 32, 36, 8); ctx.fill();

    // Subtle body border
    ctx.strokeStyle = 'rgba(124,58,237,.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-16, -18, 32, 36, 8); ctx.stroke();

    // Eyes that look in movement direction
    const eyeOffsetX = Math.cos(p.facing) * 2.5;
    const eyeOffsetY = Math.sin(p.facing) * 1.5;

    // Eye whites
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(-6 + eyeOffsetX * 0.3, -5, 3.5, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(6 + eyeOffsetX * 0.3, -5, 3.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils (follow direction more)
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    ctx.arc(-6 + eyeOffsetX, -5 + eyeOffsetY, 1.8, 0, Math.PI * 2);
    ctx.arc(6 + eyeOffsetX, -5 + eyeOffsetY, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Eye highlights
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-6 + eyeOffsetX - 0.8, -6 + eyeOffsetY, 0.7, 0, Math.PI * 2);
    ctx.arc(6 + eyeOffsetX - 0.8, -6 + eyeOffsetY, 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Mouth — changes based on state
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (speed > 3) {
      // Excited open mouth when moving fast
      ctx.beginPath();
      ctx.ellipse(0, 8, 5, 3, 0, 0, Math.PI);
      ctx.stroke();
    } else if (p.idleTime > 2000) {
      // Sleepy when idle
      const breathe = Math.sin(ts * 0.002) * 0.5;
      ctx.beginPath();
      ctx.moveTo(-5, 7 + breathe);
      ctx.lineTo(5, 7 + breathe);
      ctx.stroke();
    } else {
      // Normal smile
      ctx.beginPath();
      ctx.moveTo(-7, 7);
      ctx.quadraticCurveTo(0, 12, 7, 7);
      ctx.stroke();
    }

    // Blush when near collectibles
    const nearCollectible = state.mysteryBoxes.some(b => !b.open && dist(p.x, p.y, b.wx, b.wy) < 120) ||
      TRACKS.some(t => { const s = state.tracks[t.id]; return !s.discovered && dist(p.x, p.y, s.wx, s.wy) < 120; });
    if (nearCollectible) {
      ctx.fillStyle = 'rgba(245,158,11,.15)';
      ctx.beginPath(); ctx.arc(-9, 3, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(9, 3, 4, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  }

  // ─── Active effects overlay ─────────────────────────────────────────

  function renderActiveEffects(ts) {
    state.effects.forEach(effect => {
      const age = 1 - (effect.until - ts) / effect.duration;
      if (effect.type === 'star-vision') {
        ctx.fillStyle = `rgba(251,191,36,${0.18 * (1 - age)})`;
        ctx.fillRect(0, 0, W, H);
      } else if (effect.type === 'cosmic-speed') {
        ctx.strokeStyle = `rgba(56,189,248,${0.22 * (1 - age)})`;
        for (let i = 0; i < 9; i++) {
          const y = ((i + age * 15) % 9) * (H / 9);
          ctx.beginPath();
          ctx.moveTo(W * 0.25, y);
          ctx.lineTo(W * 0.75, y + 14);
          ctx.stroke();
        }
      } else if (effect.type === 'milk-shield') {
        const msx = state.player.x - state.cam.x;
        const msy = state.player.y - state.cam.y;
        ctx.strokeStyle = `rgba(167,139,250,${0.6 * (1 - age)})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(msx, msy, PLAYER_R + 16 + age * 20, 0, Math.PI * 2);
        ctx.stroke();
      } else if (effect.type === 'wall-flash') {
        ctx.fillStyle = `rgba(255,100,100,${0.12 * (1 - age)})`;
        ctx.fillRect(0, 0, W, H);
      }
    });
  }

  // ─── Persistent minimap ─────────────────────────────────────────────

  function renderMinimap(ts) {
    const mc = minimapCtx;
    const mw = minimapCanvas.width;
    const mh = minimapCanvas.height;
    mc.clearRect(0, 0, mw, mh);

    // Background
    mc.fillStyle = 'rgba(4,0,12,.85)';
    mc.fillRect(0, 0, mw, mh);

    const sx = mw / WORLD_W;
    const sy = mh / WORLD_H;

    // Maze walls
    mc.strokeStyle = 'rgba(80,180,255,.35)';
    mc.lineWidth = 0.8;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = state.maze[y][x];
        const ox = x * CELL * sx;
        const oy = y * CELL * sy;
        if (!cell.n) { mc.beginPath(); mc.moveTo(ox, oy); mc.lineTo(ox + CELL * sx, oy); mc.stroke(); }
        if (!cell.s) { mc.beginPath(); mc.moveTo(ox, oy + CELL * sy); mc.lineTo(ox + CELL * sx, oy + CELL * sy); mc.stroke(); }
        if (!cell.w) { mc.beginPath(); mc.moveTo(ox, oy); mc.lineTo(ox, oy + CELL * sy); mc.stroke(); }
        if (!cell.e) { mc.beginPath(); mc.moveTo(ox + CELL * sx, oy); mc.lineTo(ox + CELL * sx, oy + CELL * sy); mc.stroke(); }
      }
    }

    // Collectibles
    TRACKS.forEach(t => {
      const s = state.tracks[t.id];
      mc.fillStyle = s.discovered ? t.color : 'rgba(170,150,200,.45)';
      mc.beginPath(); mc.arc(s.wx * sx, s.wy * sy, 3, 0, Math.PI * 2); mc.fill();
    });

    state.bonusOrbs.forEach(o => {
      if (o.found) return;
      mc.fillStyle = 'rgba(251,191,36,.6)';
      mc.beginPath(); mc.arc(o.wx * sx, o.wy * sy, 2.5, 0, Math.PI * 2); mc.fill();
    });

    state.mysteryBoxes.forEach(b => {
      if (b.open) return;
      mc.fillStyle = 'rgba(147,51,234,.5)';
      mc.fillRect(b.wx * sx - 2, b.wy * sy - 2, 4, 4);
    });

    // Player
    const pulse = 0.8 + Math.sin(ts * 0.006) * 0.2;
    mc.fillStyle = `rgba(255,255,255,${pulse})`;
    mc.beginPath(); mc.arc(state.player.x * sx, state.player.y * sy, 3.5, 0, Math.PI * 2); mc.fill();

    // Player light radius indicator
    mc.strokeStyle = 'rgba(124,58,237,.3)';
    mc.lineWidth = 1;
    mc.beginPath(); mc.arc(state.player.x * sx, state.player.y * sy, 12, 0, Math.PI * 2); mc.stroke();
  }

  // ═══════════════════════════════════════════════════════════════
  //  MUSIC & UI
  // ═══════════════════════════════════════════════════════════════

  function setTrack(track, autoplay) {
    musicFrame.src = `${track.embedBase}&auto_play=${autoplay ? 'true' : 'false'}`;
    Array.from(playlist.children).forEach(btn => {
      const on = btn.textContent === track.title;
      btn.style.borderColor = on ? 'rgba(245,158,11,.8)' : 'rgba(147,51,234,.35)';
      btn.style.color = on ? '#fcd34d' : '#e8dbff';
    });
    const title = musicPanel.querySelector('h3');
    title.textContent = `${track.title} — STARMILK`;
  }

  function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  }

  function updateHud() {
    const t = TRACKS.map(track => {
      const s = state.tracks[track.id];
      const done = s.discovered ? '✓' : '○';
      return `${done} ${track.title}: ${s.frags}/${track.fragsNeed}`;
    }).join(' | ');
    const now = performance.now();
    const starVisionLeft = Math.max(0, Math.ceil((state.activePowerUps.starVisionUntil - now) / 1000));
    const speedLeft = Math.max(0, Math.ceil((state.activePowerUps.cosmicSpeedUntil - now) / 1000));
    const timeStr = formatTime(state.elapsedMs);
    hud.textContent = `Score: ${state.score} | ⏱ ${timeStr} | ${t} | Orbs: ${state.bonusFound}/${state.bonusOrbs.length} | Boxes: ${state.boxesOpened}/${state.mysteryBoxes.length} | ✦${starVisionLeft}s ➤${speedLeft}s ◍${state.activePowerUps.milkShieldCharges}`;
  }

  // ─── Power-up UI ────────────────────────────────────────────────────────

  function offerPowerUpActivation(powerUp) {
    const activateNow = () => {
      activatePowerUp(powerUp.id);
      powerPrompt.style.display = 'none';
    };
    powerPrompt.innerHTML = `<div style="font-size:.82rem;letter-spacing:.08em;text-transform:uppercase;color:#fcd34d">${powerUp.title} collected</div><p style="margin:.35rem 0 .6rem;color:#ddccff;font-size:.86rem">Enjoying STARMILK? Support the music!</p><div style="display:flex;gap:.45rem;flex-wrap:wrap"><button id="cq-power-free" style="border:1px solid rgba(147,51,234,.55);background:rgba(16,2,30,.88);color:#f5ecff;padding:.4rem .6rem;border-radius:9px;cursor:pointer">Use Power-Up (Free)</button><button id="cq-power-donate" style="border:1px solid rgba(245,158,11,.65);background:rgba(42,15,4,.78);color:#ffd36b;padding:.4rem .6rem;border-radius:9px;cursor:pointer">Support STARMILK</button></div>`;
    powerPrompt.style.display = 'block';
    powerPrompt.querySelector('#cq-power-free').onclick = activateNow;
    powerPrompt.querySelector('#cq-power-donate').onclick = () => {
      window.open('https://www.buymeacoffee.com/starmilk', '_blank', 'noopener');
      activateNow();
    };
  }

  function activatePowerUp(id) {
    const now = performance.now();
    if (id === 'star-vision') {
      state.activePowerUps.starVisionUntil = Math.max(state.activePowerUps.starVisionUntil, now) + 10000;
      state.effects.push({ type: 'star-vision', until: now + 800, duration: 800 });
    } else if (id === 'cosmic-speed') {
      state.activePowerUps.cosmicSpeedUntil = Math.max(state.activePowerUps.cosmicSpeedUntil, now) + 15000;
      state.effects.push({ type: 'cosmic-speed', until: now + 900, duration: 900 });
    } else if (id === 'milk-shield') {
      state.activePowerUps.milkShieldCharges += 1;
      state.effects.push({ type: 'milk-shield', until: now + 900, duration: 900 });
    }
  }

  // ─── Star Map overlay ─────────────────────────────────────────────

  function toggleMap() {
    if (mapScreen.style.display === 'flex') {
      mapScreen.style.display = 'none';
      return;
    }
    const discovered = TRACKS.filter(t => state.tracks[t.id].discovered).length;
    const rows = TRACKS.map(t => `<li>${t.title}: ${state.tracks[t.id].discovered ? 'Discovered' : 'Hidden'} (${state.tracks[t.id].frags}/${t.fragsNeed} fragments)</li>`).join('');
    mapScreen.innerHTML = `<div style="width:min(760px,95vw);background:rgba(10,0,22,.95);border:1px solid rgba(147,51,234,.5);border-radius:18px;padding:1rem;"><h2 style="margin-bottom:.5rem;letter-spacing:.12em;text-transform:uppercase">Star Map</h2><p style="color:#aa96d3;margin-bottom:.5rem">Constellation progress: ${discovered}/${TRACKS.length} songs found | Score: ${state.score} | Time: ${formatTime(state.elapsedMs)}</p><canvas id="cq-map" width="700" height="360" style="width:100%;height:auto;border:1px solid rgba(147,51,234,.3);border-radius:12px"></canvas><ul style="margin:.8rem 0 0 1rem;line-height:1.6">${rows}</ul><button id="cq-close-map" style="margin-top:.8rem;border:1px solid rgba(245,158,11,.5);background:rgba(10,0,20,.7);color:#fcd34d;padding:.45rem .8rem;border-radius:10px;cursor:pointer">Close</button></div>`;
    mapScreen.style.display = 'flex';
    mapScreen.querySelector('#cq-close-map').onclick = toggleMap;
    drawMap();
  }

  function drawMap() {
    const c = mapScreen.querySelector('#cq-map');
    if (!c) return;
    const g = c.getContext('2d');
    g.fillStyle = '#05000d';
    g.fillRect(0, 0, c.width, c.height);
    const sx = c.width / WORLD_W;
    const sy = c.height / WORLD_H;

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = state.maze[y][x];
        const ox = x * CELL * sx;
        const oy = y * CELL * sy;
        g.strokeStyle = 'rgba(80,180,255,.5)';
        if (!cell.n) line(g, ox, oy, ox + CELL * sx, oy);
        if (!cell.s) line(g, ox, oy + CELL * sy, ox + CELL * sx, oy + CELL * sy);
        if (!cell.w) line(g, ox, oy, ox, oy + CELL * sy);
        if (!cell.e) line(g, ox + CELL * sx, oy, ox + CELL * sx, oy + CELL * sy);
      }
    }

    TRACKS.forEach(t => {
      const s = state.tracks[t.id];
      g.fillStyle = s.discovered ? t.color : 'rgba(170,150,200,.55)';
      g.beginPath(); g.arc(s.wx * sx, s.wy * sy, 6, 0, Math.PI * 2); g.fill();
    });

    g.fillStyle = '#fff';
    g.beginPath(); g.arc(state.player.x * sx, state.player.y * sy, 5, 0, Math.PI * 2); g.fill();
  }

  function line(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }

  // ─── Popup ─────────────────────────────────────────────────────────────

  function showPopup(inner) {
    popup.innerHTML = `${inner}<div style="margin-top:.7rem;text-align:right"><button id="cq-close-pop" style="border:1px solid rgba(147,51,234,.5);background:#130428;color:#e8dfff;padding:.35rem .7rem;border-radius:8px;cursor:pointer">Continue</button></div>`;
    popup.style.display = 'block';
    popup.querySelector('#cq-close-pop').onclick = () => { popup.style.display = 'none'; };
  }

  // ═══════════════════════════════════════════════════════════════
  //  UTILITIES
  // ═══════════════════════════════════════════════════════════════

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function hexToRgba(hex, a) {
    const n = hex.replace('#', '');
    const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // ─── Bootstrap ─────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
