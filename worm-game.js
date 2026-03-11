(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
   * COSMIC WORM — STARMILK
   * Snake-style game: guide a cosmic worm through the void, eating
   * energy orbs to grow. As you get longer, special SONG ORBS
   * appear with radiant auras — eat one to unlock and play the
   * STARMILK track trapped inside. Cosmic purple/teal/gold palette.
   * Touch + keyboard + swipe controls, mobile responsive.
   * Loads tracks from starmilk-tracks.json for the song orb pool.
   * ═══════════════════════════════════════════════════════════════ */

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── Constants ───────────────────────────────────────────────
  const CELL = 18;
  const TICK_MS = 115;
  const MIN_TICK = 55;
  const SPEED_INC = 1.5;
  const INITIAL_LENGTH = 4;
  const BASE_ORB_COUNT = 3;
  const PARTICLE_COUNT = 12;
  const STAR_COUNT = 90;

  // Song orb thresholds — at these worm lengths a song orb can spawn
  const SONG_ORB_FIRST = 10;       // first song orb eligible at length 10
  const SONG_ORB_INTERVAL = 6;     // another eligible every 6 orbs eaten after that
  const SONG_ORB_CHANCE = 0.35;    // 35 % chance when eligible
  const MAX_SONG_ORBS = 2;         // max simultaneous song orbs on field

  // Colors (STARMILK palette — matte base, vivid accents)
  const C = {
    bg:          '#04010a',
    grid:        'rgba(99,102,241,.05)',
    wormHead:    '#fcd34d',
    wormBody:    '#9333ea',
    wormTail:    '#6366f1',
    orbEnergy:   '#2dd4bf',
    orbEnergyDk: '#065f46',
    orbGold:     '#f59e0b',
    orbGoldDk:   '#b45309',
    orbSong:     '#c084fc',    // violet song orb
    orbSongGlow: '#a855f7',
    orbSongRing: '#e879f9',    // fuchsia outer ring
    text:        '#e2d9f3',
    muted:       '#9d8ec4',
    border:      'rgba(147,51,234,.45)',
    panelBg:     'rgba(12,3,24,.98)',
  };

  // ─── Track pool (loaded from JSON) ──────────────────────────
  let allTracks = [];
  let trackPool = [];   // shuffled subset for this session
  let trackIdx = 0;     // next track to assign to a song orb

  // ─── State ───────────────────────────────────────────────────
  let overlay, canvas, ctx, panel;
  let nowPlayingBar, nowPlayingTitle, nowPlayingClose, scFrame;
  let gridW, gridH;
  let worm = [];
  let direction = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };
  let orbs = [];          // {x, y, type, pulse, track?, ringPhase?}
  let particles = [];
  let stars = [];
  let score = 0;
  let highScore = 0;
  let orbsEaten = 0;
  let songsUnlocked = [];  // track names unlocked this session
  let gameRunning = false;
  let gameOver = false;
  let tickInterval = null;
  let currentTick = TICK_MS;
  let animFrame = null;
  let touchStartX = 0, touchStartY = 0;
  let songNotification = null; // {text, alpha, y}

  // ─── Helpers ─────────────────────────────────────────────────
  function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function randF(a, b) { return Math.random() * (b - a) + a; }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function randomFreeCell() {
    for (let n = 0; n < 500; n++) {
      const x = rand(0, gridW - 1), y = rand(0, gridH - 1);
      if (!worm.some(s => s.x === x && s.y === y) &&
          !orbs.some(o => o.x === x && o.y === y)) return { x, y };
    }
    return { x: rand(0, gridW - 1), y: rand(0, gridH - 1) };
  }

  function scEmbedUrl(trackUrl) {
    return 'https://w.soundcloud.com/player/?url=' +
      encodeURIComponent(trackUrl) +
      '&color=%239333ea&auto_play=true&hide_related=true&show_comments=false' +
      '&show_reposts=false&show_teaser=false';
  }

  // ─── Orb spawning ──────────────────────────────────────────
  function shouldSpawnSongOrb() {
    if (trackPool.length === 0) return false;
    const songOrbsOnField = orbs.filter(o => o.type === 'song').length;
    if (songOrbsOnField >= MAX_SONG_ORBS) return false;
    if (worm.length < SONG_ORB_FIRST) return false;
    // Eligible every SONG_ORB_INTERVAL orbs eaten after first threshold
    const surplus = orbsEaten - (SONG_ORB_FIRST - INITIAL_LENGTH);
    if (surplus < 0) return false;
    if (surplus % SONG_ORB_INTERVAL !== 0 && songOrbsOnField > 0) return false;
    return Math.random() < SONG_ORB_CHANCE;
  }

  function nextTrack() {
    if (trackPool.length === 0) return null;
    const t = trackPool[trackIdx % trackPool.length];
    trackIdx++;
    return t;
  }

  function spawnOrb() {
    const pos = randomFreeCell();

    if (shouldSpawnSongOrb()) {
      const track = nextTrack();
      if (track) {
        orbs.push({
          x: pos.x, y: pos.y,
          type: 'song',
          pulse: randF(0, Math.PI * 2),
          ringPhase: randF(0, Math.PI * 2),
          track: track,
        });
        return;
      }
    }

    const isGold = Math.random() < 0.12;
    orbs.push({
      x: pos.x, y: pos.y,
      type: isGold ? 'gold' : 'energy',
      pulse: randF(0, Math.PI * 2),
    });
  }

  function spawnParticles(px, py, color, count) {
    const n = count || PARTICLE_COUNT;
    for (let i = 0; i < n; i++) {
      const a = randF(0, Math.PI * 2);
      const spd = randF(1.5, 5);
      particles.push({
        x: px, y: py,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 1, color, size: randF(2, 5),
      });
    }
  }

  function generateStars(w, h) {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * w, y: Math.random() * h,
        size: randF(0.4, 1.8),
        alpha: randF(0.15, 0.6),
        twinkleSpeed: randF(0.004, 0.018),
        twinklePhase: randF(0, Math.PI * 2),
      });
    }
  }

  // ─── Now Playing ────────────────────────────────────────────
  function showNowPlaying(track) {
    if (!scFrame || !nowPlayingBar) return;
    scFrame.src = scEmbedUrl(track.url);
    nowPlayingTitle.textContent = track.name;
    nowPlayingBar.style.display = 'flex';

    // Flash notification on canvas
    songNotification = {
      text: '♫ ' + track.name,
      alpha: 1.5,  // >1 so it holds bright briefly
      y: 0,
    };
  }

  function hideNowPlaying() {
    if (!nowPlayingBar) return;
    nowPlayingBar.style.display = 'none';
    if (scFrame) scFrame.src = 'about:blank';
  }

  // ─── Build UI ────────────────────────────────────────────────
  function buildUI() {
    overlay = document.createElement('div');
    overlay.id = 'worm-game-overlay';
    overlay.style.cssText = `
      display:none;position:fixed;inset:0;z-index:10001;
      background:rgba(3,0,9,.96);backdrop-filter:blur(8px);
      -webkit-backdrop-filter:blur(8px);
      font-family:'Segoe UI',system-ui,sans-serif;color:${C.text};
      flex-direction:column;align-items:center;justify-content:center;
    `;

    panel = document.createElement('div');
    panel.style.cssText = `
      width:min(760px,calc(100% - 1.2rem));max-height:calc(100vh - 1.5rem);
      background:${C.panelBg};border:1px solid ${C.border};
      border-radius:18px;box-shadow:0 0 40px rgba(147,51,234,.22);
      padding:1rem;display:flex;flex-direction:column;overflow:hidden;
    `;

    /* ── Header ── */
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;flex-wrap:wrap;gap:.5rem;';

    const title = document.createElement('h3');
    title.textContent = 'COSMIC WORM';
    title.style.cssText = 'text-transform:uppercase;letter-spacing:.14em;font-size:.95rem;color:#fcd34d;margin:0;';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      border:1px solid rgba(245,158,11,.35);background:rgba(245,158,11,.1);
      color:#fcd34d;border-radius:999px;padding:.35rem .85rem;cursor:pointer;
      font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:.68rem;
    `;
    closeBtn.addEventListener('click', closeGame);
    head.appendChild(title);
    head.appendChild(closeBtn);
    panel.appendChild(head);

    /* ── Canvas wrapper ── */
    const wrap = document.createElement('div');
    wrap.style.cssText = `border-radius:14px;border:1px solid rgba(99,102,241,.45);overflow:hidden;background:${C.bg};flex:1;min-height:0;position:relative;`;
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;display:block;touch-action:none;';
    wrap.appendChild(canvas);
    panel.appendChild(wrap);

    /* ── HUD ── */
    const hud = document.createElement('div');
    hud.id = 'worm-hud';
    hud.style.cssText = `display:flex;justify-content:space-between;align-items:center;margin-top:.5rem;font-size:.8rem;color:${C.muted};flex-wrap:wrap;gap:.35rem;`;
    hud.innerHTML = `
      <span id="worm-score">Score: 0</span>
      <span id="worm-songs">Songs: 0</span>
      <span id="worm-high">Best: 0</span>
      <span id="worm-length">Length: ${INITIAL_LENGTH}</span>
    `;
    panel.appendChild(hud);

    /* ── Now Playing bar (hidden initially) ── */
    nowPlayingBar = document.createElement('div');
    nowPlayingBar.style.cssText = `
      display:none;align-items:center;gap:.6rem;margin-top:.5rem;
      padding:.5rem .7rem;border-radius:12px;
      background:linear-gradient(135deg,rgba(168,85,247,.15),rgba(147,51,234,.08));
      border:1px solid rgba(168,85,247,.3);
    `;

    const npIcon = document.createElement('span');
    npIcon.textContent = '♫';
    npIcon.style.cssText = 'font-size:1.1rem;color:#c084fc;flex-shrink:0;';

    nowPlayingTitle = document.createElement('span');
    nowPlayingTitle.style.cssText = 'flex:1;font-size:.78rem;color:#e2d9f3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    nowPlayingTitle.textContent = '';

    nowPlayingClose = document.createElement('button');
    nowPlayingClose.textContent = '✕';
    nowPlayingClose.style.cssText = 'background:none;border:none;color:#9d8ec4;cursor:pointer;font-size:.9rem;padding:0 .2rem;flex-shrink:0;';
    nowPlayingClose.addEventListener('click', hideNowPlaying);

    nowPlayingBar.appendChild(npIcon);
    nowPlayingBar.appendChild(nowPlayingTitle);
    nowPlayingBar.appendChild(nowPlayingClose);
    panel.appendChild(nowPlayingBar);

    /* ── Hidden SC iframe (audio only, no visual) ── */
    scFrame = document.createElement('iframe');
    scFrame.style.cssText = 'width:0;height:0;border:0;position:absolute;left:-9999px;';
    scFrame.allow = 'autoplay';
    scFrame.src = 'about:blank';
    panel.appendChild(scFrame);

    /* ── Controls hint ── */
    const hint = document.createElement('p');
    hint.style.cssText = `font-size:.72rem;color:${C.muted};margin-top:.35rem;text-align:center;opacity:.65;`;
    hint.textContent = 'Arrow keys / WASD • Swipe on mobile • Grow to unlock song orbs';
    panel.appendChild(hint);

    /* ── Mobile D-pad ── */
    const mobile = document.createElement('div');
    mobile.id = 'worm-mobile-controls';
    mobile.style.cssText = 'display:none;margin-top:.4rem;';

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:.35rem;width:min(180px,55%);margin:0 auto;';

    const dirs = [
      { label: '▲', dx: 0, dy: -1 },
      { label: '◀', dx: -1, dy: 0 },
      { label: '▼', dx: 0, dy: 1 },
      { label: '▶', dx: 1, dy: 0 },
    ];
    [null, dirs[0], null, dirs[1], null, dirs[3], null, dirs[2], null].forEach(d => {
      const b = document.createElement('button');
      if (d) {
        b.textContent = d.label;
        b.style.cssText = `
          border:1px solid rgba(147,51,234,.45);background:rgba(11,2,22,.95);
          color:#fff;border-radius:10px;padding:.55rem;font-weight:700;
          font-size:.95rem;touch-action:manipulation;cursor:pointer;
        `;
        b.addEventListener('touchstart', e => { e.preventDefault(); setDirection(d.dx, d.dy); });
        b.addEventListener('click', () => setDirection(d.dx, d.dy));
      } else {
        b.style.cssText = 'visibility:hidden;';
      }
      grid.appendChild(b);
    });
    mobile.appendChild(grid);
    panel.appendChild(mobile);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    if (window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent)) {
      mobile.style.display = 'block';
    }

    ctx = canvas.getContext('2d');
  }

  // ─── Resize ─────────────────────────────────────────────────
  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(rect.width);
    const h = Math.floor(Math.min(rect.width * 0.62, window.innerHeight * 0.50));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gridW = Math.floor(w / CELL);
    gridH = Math.floor(h / CELL);
    generateStars(w, h);
  }

  // ─── Direction ──────────────────────────────────────────────
  function setDirection(dx, dy) {
    if (direction.x === -dx && direction.y === -dy) return;
    if (dx === 0 && dy === 0) return;
    nextDirection = { x: dx, y: dy };
  }

  // ─── Init game ──────────────────────────────────────────────
  function initGame() {
    const sx = Math.floor(gridW / 2), sy = Math.floor(gridH / 2);
    worm = [];
    for (let i = 0; i < INITIAL_LENGTH; i++) worm.push({ x: sx - i, y: sy });

    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    orbs = [];
    particles = [];
    score = 0;
    orbsEaten = 0;
    songsUnlocked = [];
    gameOver = false;
    currentTick = TICK_MS;
    songNotification = null;

    // Shuffle track pool for this run
    trackPool = shuffle(allTracks);
    trackIdx = 0;

    for (let i = 0; i < BASE_ORB_COUNT; i++) spawnOrb();
    hideNowPlaying();
    updateHUD();
  }

  // ─── Tick ───────────────────────────────────────────────────
  function gameTick() {
    if (!gameRunning || gameOver) return;

    direction = { ...nextDirection };
    const head = worm[0];
    const nh = { x: head.x + direction.x, y: head.y + direction.y };

    // Wrap edges
    if (nh.x < 0) nh.x = gridW - 1;
    if (nh.x >= gridW) nh.x = 0;
    if (nh.y < 0) nh.y = gridH - 1;
    if (nh.y >= gridH) nh.y = 0;

    // Self collision
    if (worm.some(s => s.x === nh.x && s.y === nh.y)) {
      gameOver = true;
      if (score > highScore) {
        highScore = score;
        try { localStorage.setItem('starmilk-worm-high', highScore); } catch (e) { /* noop */ }
      }
      updateHUD();
      return;
    }

    worm.unshift(nh);

    // Orb collision
    const oi = orbs.findIndex(o => o.x === nh.x && o.y === nh.y);
    if (oi !== -1) {
      const orb = orbs[oi];
      const px = nh.x * CELL + CELL / 2;
      const py = nh.y * CELL + CELL / 2;

      if (orb.type === 'song') {
        score += 10;
        songsUnlocked.push(orb.track.name);
        showNowPlaying(orb.track);
        spawnParticles(px, py, C.orbSong, 20);
        spawnParticles(px, py, C.orbSongRing, 12);
        // Extra growth for song orbs
        for (let g = 0; g < 3; g++) worm.push({ ...worm[worm.length - 1] });
      } else if (orb.type === 'gold') {
        score += 5;
        spawnParticles(px, py, C.orbGold, 14);
        for (let g = 0; g < 2; g++) worm.push({ ...worm[worm.length - 1] });
      } else {
        score += 1;
        spawnParticles(px, py, C.orbEnergy, PARTICLE_COUNT);
      }

      orbsEaten++;
      orbs.splice(oi, 1);
      spawnOrb();

      // Speed up
      currentTick = Math.max(MIN_TICK, currentTick - SPEED_INC);
      clearInterval(tickInterval);
      tickInterval = setInterval(gameTick, currentTick);
    } else {
      worm.pop();
    }

    updateHUD();
  }

  // ─── HUD ────────────────────────────────────────────────────
  function updateHUD() {
    const $ = id => document.getElementById(id);
    const s = $('worm-score'), h = $('worm-high'), l = $('worm-length'), sg = $('worm-songs');
    if (s) s.textContent = 'Score: ' + score;
    if (h) h.textContent = 'Best: ' + highScore;
    if (l) l.textContent = 'Length: ' + worm.length;
    if (sg) sg.textContent = 'Songs: ' + songsUnlocked.length;
  }

  // ─── Render ─────────────────────────────────────────────────
  let ft = 0;
  function render(ts) {
    if (!gameRunning) return;
    ft = ts || 0;
    animFrame = requestAnimationFrame(render);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    // Background
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, w, h);

    // Stars
    if (!REDUCED) {
      for (const s of stars) {
        const tw = Math.sin(ft * s.twinkleSpeed + s.twinklePhase);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,190,255,${Math.max(0.04, s.alpha + tw * 0.15)})`;
        ctx.fill();
      }
    }

    // Grid
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx <= gridW; gx++) {
      ctx.beginPath(); ctx.moveTo(gx * CELL, 0); ctx.lineTo(gx * CELL, gridH * CELL); ctx.stroke();
    }
    for (let gy = 0; gy <= gridH; gy++) {
      ctx.beginPath(); ctx.moveTo(0, gy * CELL); ctx.lineTo(gridW * CELL, gy * CELL); ctx.stroke();
    }

    // ── Draw orbs ──
    for (const o of orbs) {
      const cx = o.x * CELL + CELL / 2;
      const cy = o.y * CELL + CELL / 2;
      o.pulse += 0.04;
      const pf = 1 + Math.sin(o.pulse) * 0.18;
      const r = (CELL / 2 - 2) * pf;

      if (o.type === 'song') {
        // ── Song orb: spectacular multi-ring glow ──
        if (!REDUCED) {
          // Outer rotating ring
          const rp = (o.ringPhase || 0) + 0.02;
          o.ringPhase = rp;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(rp);

          // Fuchsia halo ring
          ctx.strokeStyle = C.orbSongRing;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.35 + Math.sin(ft * 0.003 + o.pulse) * 0.15;
          ctx.beginPath();
          ctx.arc(0, 0, r * 2.2, 0, Math.PI * 1.3);
          ctx.stroke();

          // Second ring offset
          ctx.strokeStyle = C.orbSong;
          ctx.globalAlpha = 0.25 + Math.sin(ft * 0.004 + o.pulse + 1) * 0.12;
          ctx.beginPath();
          ctx.arc(0, 0, r * 2.8, Math.PI * 0.5, Math.PI * 1.8);
          ctx.stroke();

          ctx.restore();
          ctx.globalAlpha = 1;

          // Radial glow
          const sg = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 3.5);
          sg.addColorStop(0, 'rgba(192,132,252,.3)');
          sg.addColorStop(0.5, 'rgba(168,85,247,.12)');
          sg.addColorStop(1, 'rgba(168,85,247,0)');
          ctx.fillStyle = sg;
          ctx.fillRect(cx - r * 3.5, cy - r * 3.5, r * 7, r * 7);

          // Tiny orbiting sparkles
          for (let si = 0; si < 3; si++) {
            const sa = rp * 2 + si * (Math.PI * 2 / 3);
            const sd = r * 1.7;
            const sx = cx + Math.cos(sa) * sd;
            const sy = cy + Math.sin(sa) * sd;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(232,121,249,.6)';
            ctx.fill();
          }
        }

        // Core with music note symbol
        const sg2 = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, 0, cx, cy, r);
        sg2.addColorStop(0, '#f0e4ff');
        sg2.addColorStop(0.4, C.orbSong);
        sg2.addColorStop(1, '#6b21a8');
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = sg2;
        ctx.fill();

        // Music note icon
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.font = `bold ${Math.max(8, r * 0.9)}px "Segoe UI",system-ui,sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♫', cx, cy + 0.5);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';

      } else {
        // ── Energy / Gold orbs ──
        if (!REDUCED) {
          const gl = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 2.2);
          if (o.type === 'gold') {
            gl.addColorStop(0, 'rgba(245,158,11,.3)');
            gl.addColorStop(1, 'rgba(245,158,11,0)');
          } else {
            gl.addColorStop(0, 'rgba(45,212,191,.25)');
            gl.addColorStop(1, 'rgba(13,148,136,0)');
          }
          ctx.fillStyle = gl;
          ctx.fillRect(cx - r * 2.2, cy - r * 2.2, r * 4.4, r * 4.4);
        }

        const cg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
        if (o.type === 'gold') {
          cg.addColorStop(0, '#fef3c7');
          cg.addColorStop(0.5, C.orbGold);
          cg.addColorStop(1, C.orbGoldDk);
        } else {
          cg.addColorStop(0, '#ccfbf1');
          cg.addColorStop(0.5, C.orbEnergy);
          cg.addColorStop(1, C.orbEnergyDk);
        }
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = cg;
        ctx.fill();
      }
    }

    // ── Draw worm ──
    for (let i = worm.length - 1; i >= 0; i--) {
      const seg = worm[i];
      const cx = seg.x * CELL + CELL / 2;
      const cy = seg.y * CELL + CELL / 2;
      const t = i / Math.max(1, worm.length - 1);
      const r = CELL / 2 - 1.5 - t * 3;

      let color;
      if (i === 0) {
        color = C.wormHead;
      } else if (t < 0.5) {
        color = lerpColor(C.wormHead, C.wormBody, t * 2);
      } else {
        color = lerpColor(C.wormBody, C.wormTail, (t - 0.5) * 2);
      }

      // Head glow
      if (i === 0 && !REDUCED) {
        const hg = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 2.8);
        hg.addColorStop(0, 'rgba(252,211,77,.22)');
        hg.addColorStop(1, 'rgba(252,211,77,0)');
        ctx.fillStyle = hg;
        ctx.fillRect(cx - r * 2.8, cy - r * 2.8, r * 5.6, r * 5.6);
      }

      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2, r), 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Eyes
      if (i === 0) {
        const eo = r * 0.35;
        const er = r * 0.22;
        const ex1 = cx + direction.x * eo * 0.5 - direction.y * eo;
        const ey1 = cy + direction.y * eo * 0.5 + direction.x * eo;
        const ex2 = cx + direction.x * eo * 0.5 + direction.y * eo;
        const ey2 = cy + direction.y * eo * 0.5 - direction.x * eo;

        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ex1, ey1, er, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex2, ey2, er, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#0a0010';
        const pr = er * 0.55;
        ctx.beginPath(); ctx.arc(ex1 + direction.x * pr * 0.3, ey1 + direction.y * pr * 0.3, pr, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex2 + direction.x * pr * 0.3, ey2 + direction.y * pr * 0.3, pr, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ── Particles ──
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.94; p.vy *= 0.94;
      p.life -= 0.022;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Song notification ──
    if (songNotification) {
      songNotification.alpha -= 0.012;
      songNotification.y -= 0.3;
      if (songNotification.alpha > 0) {
        ctx.globalAlpha = Math.min(1, songNotification.alpha);
        ctx.textAlign = 'center';
        ctx.font = 'bold .95rem "Segoe UI",system-ui,sans-serif';
        ctx.fillStyle = C.orbSong;
        ctx.fillText(songNotification.text, w / 2, h * 0.18 + songNotification.y);

        // Subtle subtitle
        ctx.font = '.7rem "Segoe UI",system-ui,sans-serif';
        ctx.fillStyle = C.muted;
        ctx.fillText('song unlocked', w / 2, h * 0.18 + songNotification.y + 18);

        ctx.textAlign = 'start';
        ctx.globalAlpha = 1;
      } else {
        songNotification = null;
      }
    }

    // ── Game over ──
    if (gameOver) {
      ctx.fillStyle = 'rgba(4,1,10,.78)';
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center';

      ctx.fillStyle = C.wormHead;
      ctx.font = 'bold 1.6rem "Segoe UI",system-ui,sans-serif';
      ctx.fillText('GAME OVER', w / 2, h / 2 - 28);

      ctx.fillStyle = C.text;
      ctx.font = '.9rem "Segoe UI",system-ui,sans-serif';
      ctx.fillText(`Score: ${score}  ·  Length: ${worm.length}`, w / 2, h / 2 + 2);

      if (songsUnlocked.length > 0) {
        ctx.fillStyle = C.orbSong;
        ctx.font = '.78rem "Segoe UI",system-ui,sans-serif';
        const songText = songsUnlocked.length === 1
          ? '♫ 1 song unlocked'
          : `♫ ${songsUnlocked.length} songs unlocked`;
        ctx.fillText(songText, w / 2, h / 2 + 26);
      }

      ctx.fillStyle = C.muted;
      ctx.font = '.75rem "Segoe UI",system-ui,sans-serif';
      ctx.fillText('Space / tap to play again', w / 2, h / 2 + 52);
      ctx.textAlign = 'start';
    }
  }

  // ─── Color helpers ──────────────────────────────────────────
  function hexToRgb(hex) {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  }
  function lerpColor(a, b, t) {
    const [r1, g1, b1] = hexToRgb(a), [r2, g2, b2] = hexToRgb(b);
    return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
  }

  // ─── Input ──────────────────────────────────────────────────
  function handleKeydown(e) {
    if (!gameRunning) return;
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W':
        e.preventDefault(); setDirection(0, -1); break;
      case 'ArrowDown': case 's': case 'S':
        e.preventDefault(); setDirection(0, 1); break;
      case 'ArrowLeft': case 'a': case 'A':
        e.preventDefault(); setDirection(-1, 0); break;
      case 'ArrowRight': case 'd': case 'D':
        e.preventDefault(); setDirection(1, 0); break;
      case ' ':
        e.preventDefault();
        if (gameOver) restartGame();
        break;
      case 'Escape':
        closeGame(); break;
    }
  }

  function handleTouchStart(e) {
    if (!gameRunning) return;
    if (gameOver) { restartGame(); return; }
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }

  function handleTouchEnd(e) {
    if (!gameRunning || gameOver) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX, dy = t.clientY - touchStartY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 1 : -1, 0);
    else setDirection(0, dy > 0 ? 1 : -1);
  }

  // ─── Lifecycle ──────────────────────────────────────────────
  function startGame() {
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    gameRunning = true;
    try { highScore = parseInt(localStorage.getItem('starmilk-worm-high')) || 0; } catch (e) { /* noop */ }
    resizeCanvas();
    initGame();
    tickInterval = setInterval(gameTick, currentTick);
    animFrame = requestAnimationFrame(render);
    document.addEventListener('keydown', handleKeydown);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
  }

  function closeGame() {
    gameRunning = false;
    gameOver = false;
    clearInterval(tickInterval);
    cancelAnimationFrame(animFrame);
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    hideNowPlaying();
    document.removeEventListener('keydown', handleKeydown);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchend', handleTouchEnd);
  }

  function restartGame() {
    clearInterval(tickInterval);
    cancelAnimationFrame(animFrame);
    resizeCanvas();
    initGame();
    currentTick = TICK_MS;
    tickInterval = setInterval(gameTick, currentTick);
    animFrame = requestAnimationFrame(render);
  }

  // ─── Bootstrap ──────────────────────────────────────────────
  async function init() {
    // Load track catalog
    try {
      const res = await fetch('starmilk-tracks.json');
      if (res.ok) allTracks = await res.json();
    } catch (e) {
      // Fallback: empty pool means no song orbs, game still playable
      allTracks = [];
    }

    buildUI();

    const btn = document.getElementById('worm-game-launch');
    if (btn) btn.addEventListener('click', startGame);

    let rTimer;
    window.addEventListener('resize', () => {
      if (!gameRunning) return;
      clearTimeout(rTimer);
      rTimer = setTimeout(resizeCanvas, 200);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
