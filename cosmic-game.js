(function () {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  const TRACKS = [
    {
      id: 'tribe',
      title: 'TRIBE STAR MILK',
      embedBase: 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/star-milk-645735333/tribe-star-milk&color=%239333ea&hide_related=true&show_comments=false&show_reposts=false&show_teaser=false',
      color: '#9333ea',
      fragsNeed: 4,
    },
    {
      id: 'kaleidoscopic',
      title: 'Kaleidoscopic Truth',
      embedBase: 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/star-milk-645735333/kaleidoscopic-truth&color=%23f59e0b&hide_related=true&show_comments=false&show_reposts=false&show_teaser=false',
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
      title: 'Kaleidoscopic Truth (Hidden Portal Edit)',
      embed: 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/star-milk-645735333/kaleidoscopic-truth&color=%23fbbf24&auto_play=true&hide_related=true&show_comments=false&show_reposts=false&show_teaser=false',
    },
  ];

  const FACTS = [
    'STARMILK was born from quantum physics meeting childhood trauma.',
    'The name comes from cosmic milk flowing between stars.',
    'Each beat is written like a mythic map back to the body.',
    'The project treats basslines as emotional archaeology.',
  ];

  const state = {
    active: false,
    maze: null,
    tracks: Object.fromEntries(TRACKS.map(t => [t.id, { discovered: false, frags: 0, wx: 0, wy: 0 }])),
    bonusFound: 0,
    boxesOpened: 0,
    player: { x: CELL / 2, y: CELL / 2, vx: 0, vy: 0, trail: [] },
    cam: { x: 0, y: 0 },
    keys: new Set(),
    joystick: { on: false, dx: 0, dy: 0 },
    particles: [],
    mysteryBoxes: [],
    bonusOrbs: [],
    energyPulses: [],
    lastTs: 0,
    raf: null,
  };

  let overlay, playArea, canvas, ctx, hud, popup, mapScreen, musicPanel, musicFrame, playlist;
  let W = 0;
  let H = 0;

  function init() {
    buildDOM();
    setupInput();
    generateRun();
    injectLaunch();
  }

  function buildDOM() {
    overlay = document.createElement('div');
    overlay.style.cssText = 'display:none;position:fixed;inset:0;z-index:9000;background:#040008;color:#e9ddff;font-family:Segoe UI,system-ui,sans-serif;';

    playArea = document.createElement('div');
    playArea.style.cssText = 'position:absolute;inset:0 320px 0 0;overflow:hidden;';
    overlay.appendChild(playArea);

    canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;';
    ctx = canvas.getContext('2d');
    playArea.appendChild(canvas);

    const exit = floatingBtn('✕ Exit Cosmos', 'right:1rem;top:1rem;');
    exit.onclick = exitGame;
    playArea.appendChild(exit);

    const mapBtn = floatingBtn('★ Star Map', 'left:1rem;top:1rem;border-color:rgba(245,158,11,.5);');
    mapBtn.onclick = toggleMap;
    playArea.appendChild(mapBtn);

    hud = document.createElement('div');
    hud.style.cssText = 'position:absolute;bottom:1rem;left:50%;transform:translateX(-50%);padding:.7rem 1rem;background:rgba(8,0,16,.72);border:1px solid rgba(147,51,234,.45);border-radius:12px;letter-spacing:.08em;font-size:.72rem;text-transform:uppercase;';
    playArea.appendChild(hud);

    popup = document.createElement('div');
    popup.style.cssText = 'display:none;position:absolute;z-index:40;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,92vw);background:rgba(6,0,15,.98);border:1px solid rgba(245,158,11,.5);border-radius:18px;padding:1rem;';
    overlay.appendChild(popup);

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
    musicPanel.style.cssText = 'position:absolute;top:0;right:0;bottom:0;width:320px;background:linear-gradient(180deg,rgba(12,0,26,.98),rgba(6,0,16,.98));border-left:1px solid rgba(147,51,234,.4);padding:1rem;overflow:auto;';
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
  }

  function buildJoystick() {
    if (!(/Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 900)) return;
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

  function setupInput() {
    document.addEventListener('keydown', e => {
      if (!state.active) return;
      state.keys.add(e.code);
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    document.addEventListener('keyup', e => state.keys.delete(e.code));
    window.addEventListener('resize', resize);
  }

  function injectLaunch() {
    const hero = document.querySelector('.hero-content');
    if (!hero) return;
    const btn = document.createElement('button');
    btn.id = 'cq-launch-btn';
    btn.className = 'btn';
    btn.innerHTML = '★ Enter the Cosmos ★';
    btn.onclick = launchGame;
    hero.appendChild(btn);
  }

  function generateRun() {
    state.maze = createMaze(COLS, ROWS);
    const deadEnds = getDeadEnds();
    shuffle(deadEnds);

    TRACKS.forEach((t, i) => {
      const c = deadEnds[i + 1] || { x: COLS - 1, y: ROWS - 1 };
      state.tracks[t.id].wx = c.x * CELL + CELL / 2;
      state.tracks[t.id].wy = c.y * CELL + CELL / 2;
    });

    state.bonusOrbs = deadEnds.slice(TRACKS.length + 1, TRACKS.length + 3).map((c, i) => ({
      wx: c.x * CELL + CELL / 2,
      wy: c.y * CELL + CELL / 2,
      found: false,
      track: BONUS_TRACKS[i % BONUS_TRACKS.length],
    }));

    state.mysteryBoxes = deadEnds.slice(0, 10).map(c => ({ wx: c.x * CELL + CELL / 2, wy: c.y * CELL + CELL / 2, open: false }));
    state.particles = Array.from({ length: 240 }, () => ({ x: Math.random() * WORLD_W, y: Math.random() * WORLD_H, r: Math.random() * 2 + 0.5, a: Math.random() * 0.6 }));
    state.energyPulses = Array.from({ length: 120 }, () => ({ t: Math.random() * Math.PI * 2, s: Math.random() * 0.004 + 0.002 }));

    state.player.x = CELL / 2;
    state.player.y = CELL / 2;
    state.player.vx = state.player.vy = 0;
  }

  function launchGame() {
    generateRun();
    state.active = true;
    overlay.style.display = 'block';
    resize();
    setTrack(TRACKS[0], true);
    state.lastTs = performance.now();
    state.raf = requestAnimationFrame(loop);
    updateHud();
  }

  function exitGame() {
    state.active = false;
    cancelAnimationFrame(state.raf);
    overlay.style.display = 'none';
    popup.style.display = 'none';
    mapScreen.style.display = 'none';
  }

  function resize() {
    if (!overlay) return;
    W = playArea.clientWidth;
    H = playArea.clientHeight;
    canvas.width = W;
    canvas.height = H;
  }

  function loop(ts) {
    if (!state.active) return;
    update(ts);
    render(ts);
    state.raf = requestAnimationFrame(loop);
  }

  function update(ts) {
    const p = state.player;
    let ax = 0, ay = 0;
    if (state.keys.has('KeyA') || state.keys.has('ArrowLeft')) ax -= 1;
    if (state.keys.has('KeyD') || state.keys.has('ArrowRight')) ax += 1;
    if (state.keys.has('KeyW') || state.keys.has('ArrowUp')) ay -= 1;
    if (state.keys.has('KeyS') || state.keys.has('ArrowDown')) ay += 1;
    if (state.joystick.on) { ax += state.joystick.dx; ay += state.joystick.dy; }
    const l = Math.hypot(ax, ay);
    if (l > 1) { ax /= l; ay /= l; }

    p.vx = p.vx * PLAYER_FRICTION + ax * PLAYER_ACCEL;
    p.vy = p.vy * PLAYER_FRICTION + ay * PLAYER_ACCEL;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > PLAYER_MAX) { p.vx = (p.vx / sp) * PLAYER_MAX; p.vy = (p.vy / sp) * PLAYER_MAX; }

    const nx = p.x + p.vx;
    if (canMove(nx, p.y)) p.x = nx; else p.vx *= -0.15;
    const ny = p.y + p.vy;
    if (canMove(p.x, ny)) p.y = ny; else p.vy *= -0.15;

    state.cam.x += (p.x - W / 2 - state.cam.x) * 0.1;
    state.cam.y += (p.y - H / 2 - state.cam.y) * 0.1;

    p.trail.unshift({ x: p.x, y: p.y });
    if (p.trail.length > 26) p.trail.pop();

    checkCollectibles();
    updateHud();

    const dt = ts - state.lastTs;
    state.lastTs = ts;
    state.energyPulses.forEach(e => { e.t += dt * e.s; });
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

  function checkCollectibles() {
    const p = state.player;
    TRACKS.forEach(track => {
      const s = state.tracks[track.id];
      if (!s.discovered && dist(p.x, p.y, s.wx, s.wy) < 40) {
        s.discovered = true;
        showPopup(`<h3 style="margin-bottom:.5rem">${track.title} discovered</h3><iframe allow="autoplay" width="100%" height="166" scrolling="no" frameborder="no" src="${track.embedBase}&auto_play=true"></iframe>`);
      }
    });

    state.bonusOrbs.forEach(o => {
      if (!o.found && dist(p.x, p.y, o.wx, o.wy) < 34) {
        o.found = true;
        state.bonusFound++;
        showPopup(`<h3 style="margin-bottom:.5rem;color:#fcd34d">Golden Orb: ${o.track.title}</h3><iframe allow="autoplay" width="100%" height="166" scrolling="no" frameborder="no" src="${o.track.embed}"></iframe>`);
      }
    });

    state.mysteryBoxes.forEach(b => {
      if (b.open || dist(p.x, p.y, b.wx, b.wy) > 45) return;
      b.open = true;
      state.boxesOpened++;
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
        showPopup(`<h3>Song fragment collectible</h3><p>+1 fragment for <strong>${target.title}</strong></p>`);
      }
    });
  }

  function render(ts) {
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#120026');
    bg.addColorStop(1, '#040008');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    renderParticles(ts);
    renderMaze(ts);
    renderCollectibles(ts);
    renderTrail();
    renderMascot(ts);
  }

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

  function renderTrail() {
    state.player.trail.forEach((t, i) => {
      const sx = t.x - state.cam.x, sy = t.y - state.cam.y;
      ctx.fillStyle = `rgba(124,58,237,${(1 - i / state.player.trail.length) * 0.25})`;
      ctx.beginPath(); ctx.arc(sx, sy, 7 - i * 0.2, 0, Math.PI * 2); ctx.fill();
    });
  }

  function renderMascot(ts) {
    const p = state.player;
    const sx = p.x - state.cam.x, sy = p.y - state.cam.y;
    const bob = REDUCED ? 0 : Math.sin(ts * 0.004) * 3;
    ctx.save();
    ctx.translate(sx, sy + bob);
    ctx.rotate((p.vx / PLAYER_MAX) * 0.2);
    ctx.fillStyle = '#f7f1ff';
    ctx.beginPath(); ctx.roundRect(-16, -18, 32, 36, 8); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(-6, -4, 2, 0, Math.PI * 2); ctx.arc(6, -4, 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-7, 7); ctx.quadraticCurveTo(0, 12, 7, 7); ctx.stroke();
    ctx.restore();
  }

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

  function updateHud() {
    const t = TRACKS.map(track => {
      const s = state.tracks[track.id];
      const done = s.discovered ? '✓' : '○';
      return `${done} ${track.title}: ${s.frags}/${track.fragsNeed}`;
    }).join(' | ');
    hud.textContent = `${t} | Golden Orbs: ${state.bonusFound}/${state.bonusOrbs.length} | Mystery Boxes: ${state.boxesOpened}/${state.mysteryBoxes.length}`;
  }

  function toggleMap() {
    if (mapScreen.style.display === 'flex') {
      mapScreen.style.display = 'none';
      return;
    }
    const discovered = TRACKS.filter(t => state.tracks[t.id].discovered).length;
    const rows = TRACKS.map(t => `<li>${t.title}: ${state.tracks[t.id].discovered ? 'Discovered' : 'Hidden'} (${state.tracks[t.id].frags}/${t.fragsNeed} fragments)</li>`).join('');
    mapScreen.innerHTML = `<div style="width:min(760px,95vw);background:rgba(10,0,22,.95);border:1px solid rgba(147,51,234,.5);border-radius:18px;padding:1rem;"><h2 style="margin-bottom:.5rem;letter-spacing:.12em;text-transform:uppercase">Star Map</h2><p style="color:#aa96d3;margin-bottom:.5rem">Constellation progress: ${discovered}/${TRACKS.length} songs found</p><canvas id="cq-map" width="700" height="360" style="width:100%;height:auto;border:1px solid rgba(147,51,234,.3);border-radius:12px"></canvas><ul style="margin:.8rem 0 0 1rem;line-height:1.6">${rows}</ul><button id="cq-close-map" style="margin-top:.8rem;border:1px solid rgba(245,158,11,.5);background:rgba(10,0,20,.7);color:#fcd34d;padding:.45rem .8rem;border-radius:10px;cursor:pointer">Close</button></div>`;
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

  function showPopup(inner) {
    popup.innerHTML = `${inner}<div style="margin-top:.7rem;text-align:right"><button id="cq-close-pop" style="border:1px solid rgba(147,51,234,.5);background:#130428;color:#e8dfff;padding:.35rem .7rem;border-radius:8px;cursor:pointer">Continue</button></div>`;
    popup.style.display = 'block';
    popup.querySelector('#cq-close-pop').onclick = () => { popup.style.display = 'none'; };
  }

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

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
  function hexToRgba(hex, a) {
    const n = hex.replace('#', '');
    const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
