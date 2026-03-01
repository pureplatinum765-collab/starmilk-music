/**
 * STARMILK Cosmic Quest
 * Interactive space exploration game — discover hidden songs in the cosmos.
 *
 * Track URLs:
 *  - TRIBE STAR MILK: soundcloud.com/star-milk-645735333/tribe-star-milk
 *  - Kaleidoscopic Truth: soundcloud.com/star-milk-645735333/kaleidoscopic-truth
 *    (update slug if the second track has a different SoundCloud URL)
 */
(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────────
  const WORLD_W = 5200;
  const WORLD_H = 4200;
  const PLAYER_MAX_SPD = 4.2;
  const PLAYER_ACCEL = 0.30;
  const PLAYER_FRICTION = 0.87;
  const COLLECT_R = 58;
  const ORB_R = 42;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SONGS = [
    {
      id: 'tribe',
      title: 'TRIBE STAR MILK',
      embedUrl: 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/star-milk-645735333/tribe-star-milk&color=%239333ea&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false',
      wx: 950,
      wy: 750,
      color: '#9333ea',
      glow: 'rgba(147,51,234,',
      fragCount: 3,
      // Constellation star positions (normalized 0-1 within the map canvas)
      constellation: [
        { px: 0.16, py: 0.28 },
        { px: 0.24, py: 0.17 },
        { px: 0.32, py: 0.30 },
        { px: 0.22, py: 0.42 },
        { px: 0.13, py: 0.40 },
      ],
      lines: [[0,1],[1,2],[2,3],[3,4],[4,0],[0,2]],
    },
    {
      id: 'kaleidoscopic',
      title: 'Kaleidoscopic Truth',
      embedUrl: 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/star-milk-645735333/kaleidoscopic-truth&color=%23f59e0b&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false',
      wx: 4250,
      wy: 3350,
      color: '#f59e0b',
      glow: 'rgba(245,158,11,',
      fragCount: 3,
      constellation: [
        { px: 0.64, py: 0.60 },
        { px: 0.73, py: 0.49 },
        { px: 0.82, py: 0.62 },
        { px: 0.78, py: 0.74 },
        { px: 0.65, py: 0.72 },
        { px: 0.74, py: 0.64 },
      ],
      lines: [[0,1],[1,2],[2,3],[3,4],[4,0],[1,5],[5,2],[5,3]],
    },
  ];

  // ── State ───────────────────────────────────────────────────────────────────
  let active = false;
  let animId = null;
  let lastTs = 0;
  let musicPlaying = false;

  const player = {
    x: WORLD_W / 2,
    y: WORLD_H / 2,
    vx: 0,
    vy: 0,
    trail: [],
  };

  // Camera = top-left corner of viewport in world space
  const cam = { x: 0, y: 0 };

  const songState = {};
  SONGS.forEach(s => { songState[s.id] = { discovered: false, frags: 0 }; });

  const keys = new Set();
  let joystick = { on: false, dx: 0, dy: 0 };

  // World layers
  let farObjs = [];
  let midObjs = [];
  let nearObjs = [];
  let fragments = [];

  // Flash effects (temporary screen-space pops on collect)
  let flashes = [];

  // DOM
  let overlay, canvas, ctx, hud, popup, conScreen;
  let W = window.innerWidth;
  let H = window.innerHeight;

  // ── DOM Creation ────────────────────────────────────────────────────────────
  function buildDOM() {
    overlay = mk('div');
    css(overlay, 'position:fixed;inset:0;z-index:9000;display:none;overflow:hidden;background:#040008;');

    canvas = mk('canvas');
    css(canvas, 'position:absolute;inset:0;');
    ctx = canvas.getContext('2d');
    overlay.appendChild(canvas);

    // Exit button
    const exitBtn = iconBtn('&#10005; Exit Cosmos', 'top:1rem;right:1rem;');
    exitBtn.addEventListener('click', exitGame);
    overlay.appendChild(exitBtn);

    // Star map button
    const mapBtn = iconBtn('&#9733; Star Map', 'top:1rem;left:1rem;border-color:rgba(245,158,11,.3);');
    mapBtn.addEventListener('click', toggleConstellation);
    overlay.appendChild(mapBtn);

    // HUD (fragment progress)
    hud = mk('div');
    css(hud, 'position:absolute;bottom:1.6rem;left:50%;transform:translateX(-50%);z-index:10;display:flex;flex-direction:column;align-items:center;gap:.42rem;pointer-events:none;');
    overlay.appendChild(hud);

    // Song discovery popup
    popup = mk('div');
    css(popup, 'display:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(.88);z-index:20;background:rgba(7,0,16,.97);border:1px solid rgba(147,51,234,.5);border-radius:22px;padding:1.8rem 2rem;width:min(520px,92vw);box-shadow:0 0 90px rgba(147,51,234,.4),0 0 180px rgba(99,102,241,.12);text-align:center;transition:transform .38s cubic-bezier(.2,0,.1,1.45);');
    overlay.appendChild(popup);

    // Constellation / progress screen
    conScreen = mk('div');
    css(conScreen, 'display:none;position:absolute;inset:0;z-index:15;background:rgba(4,0,10,.96);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);flex-direction:column;align-items:center;justify-content:center;padding:2rem;overflow-y:auto;');
    overlay.appendChild(conScreen);

    // Touch joystick for mobile
    const mobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (mobile) buildJoystick();

    // Intro hint
    if (!REDUCED) {
      const hint = mk('div');
      css(hint, 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#9d8ec4;font-family:\'Segoe UI\',system-ui,sans-serif;font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;pointer-events:none;z-index:5;transition:opacity 2.5s ease;line-height:2.1;');
      hint.innerHTML =
        '<div style="color:#fcd34d;font-size:1.25rem;font-weight:900;letter-spacing:.24em;margin-bottom:1.1rem;filter:drop-shadow(0 0 18px rgba(245,158,11,.85))">COSMIC QUEST</div>' +
        '<div>WASD / Arrow Keys &mdash; Fly</div>' +
        '<div>Collect glowing fragments &diams;</div>' +
        '<div>Find hidden song orbs &there4;</div>' +
        '<div style="margin-top:.9rem;color:rgba(147,51,234,.9);font-size:.68rem">&#9733; Open Star Map to track progress &#9733;</div>';
      overlay.appendChild(hint);
      setTimeout(() => { hint.style.opacity = '0'; }, 4200);
      setTimeout(() => { hint.remove(); }, 6800);
    }

    document.body.appendChild(overlay);
  }

  function mk(tag) { return document.createElement(tag); }
  function css(el, s) { el.style.cssText = s; }

  function iconBtn(html, extra) {
    const b = mk('button');
    b.innerHTML = html;
    css(b, 'position:absolute;z-index:10;background:rgba(7,0,16,.92);border:1px solid rgba(147,51,234,.32);color:#9d8ec4;padding:.48rem 1.1rem;border-radius:22px;cursor:pointer;font-size:.7rem;letter-spacing:.13em;text-transform:uppercase;font-family:\'Segoe UI\',system-ui,sans-serif;transition:border-color .28s,color .28s,box-shadow .28s;' + extra);
    b.addEventListener('mouseenter', () => {
      b.style.borderColor = 'rgba(245,158,11,.72)';
      b.style.color = '#fcd34d';
      b.style.boxShadow = '0 0 14px rgba(245,158,11,.22)';
    });
    b.addEventListener('mouseleave', () => {
      b.style.borderColor = 'rgba(147,51,234,.32)';
      b.style.color = '#9d8ec4';
      b.style.boxShadow = '';
    });
    return b;
  }

  function buildJoystick() {
    const base = mk('div');
    css(base, 'position:absolute;bottom:88px;left:34px;width:112px;height:112px;border-radius:50%;border:2px solid rgba(147,51,234,.28);background:rgba(7,0,16,.42);z-index:10;touch-action:none;');
    const knob = mk('div');
    css(knob, 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:44px;height:44px;border-radius:50%;background:rgba(124,58,237,.55);border:2px solid rgba(147,51,234,.9);box-shadow:0 0 14px rgba(147,51,234,.48);');
    base.appendChild(knob);
    overlay.appendChild(base);

    const maxR = 30;
    let tid = null;

    base.addEventListener('touchstart', e => {
      e.preventDefault();
      tid = e.changedTouches[0].identifier;
      joystick.on = true;
      const r = base.getBoundingClientRect();
      base._cx = r.left + r.width / 2;
      base._cy = r.top + r.height / 2;
    }, { passive: false });

    document.addEventListener('touchmove', e => {
      if (!joystick.on) return;
      e.preventDefault();
      const t = Array.from(e.touches).find(t => t.identifier === tid);
      if (!t) return;
      const dx = t.clientX - base._cx;
      const dy = t.clientY - base._cy;
      const len = Math.hypot(dx, dy) || 1;
      const cl = Math.min(len, maxR);
      joystick.dx = dx / len;
      joystick.dy = dy / len;
      knob.style.transform = `translate(calc(-50% + ${joystick.dx * cl}px),calc(-50% + ${joystick.dy * cl}px))`;
    }, { passive: false });

    document.addEventListener('touchend', e => {
      if (!Array.from(e.changedTouches).some(t => t.identifier === tid)) return;
      joystick.on = false;
      joystick.dx = joystick.dy = 0;
      knob.style.transform = 'translate(-50%,-50%)';
    });
  }

  // ── World Generation ────────────────────────────────────────────────────────
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function buildWorld() {
    // Far layer — galaxies at screen-space normalized positions (tiled parallax)
    farObjs = Array.from({ length: 72 }, () => ({
      nx: Math.random(),       // [0,1] within screen tile
      ny: Math.random(),
      type: Math.floor(Math.random() * 3),
      size: rnd(5, 26),
      hue: rnd(215, 315),
      op: rnd(0.045, 0.17),
      rot: rnd(0, Math.PI * 2),
    }));

    // Mid layer — nebula clouds (1.5x screen tile)
    midObjs = Array.from({ length: 30 }, () => ({
      nx: Math.random() * 1.5,
      ny: Math.random() * 1.5,
      rx: rnd(95, 310),
      ry: rnd(55, 170),
      hue: rnd(228, 292),
      sat: rnd(52, 85),
      op: rnd(0.03, 0.095),
      rot: rnd(0, Math.PI * 2),
      dA: rnd(0, Math.PI * 2),
      dS: rnd(0.0003, 0.0007),
    }));

    // Near layer — asteroids in world space (0.72x parallax)
    nearObjs = Array.from({ length: 95 }, () => {
      const sides = 5 + Math.floor(Math.random() * 5);
      return {
        wx: rnd(0, WORLD_W),
        wy: rnd(0, WORLD_H),
        size: rnd(4, 20),
        rot: rnd(0, Math.PI * 2),
        rotSpd: rnd(-0.0045, 0.0045),
        op: rnd(0.22, 0.72),
        hue: rnd(195, 270),
        verts: Array.from({ length: sides }, (_, i) => {
          const a = (i / sides) * Math.PI * 2;
          const r = rnd(0.68, 1.05);
          return [Math.cos(a) * r, Math.sin(a) * r];
        }),
      };
    });

    // Cosmic dust (near layer, tiny particles)
    nearObjs._dust = Array.from({ length: 220 }, () => ({
      wx: rnd(0, WORLD_W),
      wy: rnd(0, WORLD_H),
      r: rnd(0.4, 2.2),
      op: rnd(0.08, 0.4),
    }));

    // Fragments — 3 per song, scattered near their orb
    fragments = [];
    SONGS.forEach(song => {
      for (let i = 0; i < song.fragCount; i++) {
        const ang = (i / song.fragCount) * Math.PI * 2 + rnd(-0.5, 0.5);
        const dist = rnd(260, 720);
        fragments.push({
          songId: song.id,
          wx: song.wx + Math.cos(ang) * dist,
          wy: song.wy + Math.sin(ang) * dist,
          collected: false,
          ph: rnd(0, Math.PI * 2),
          phSpd: rnd(0.024, 0.048),
          color: song.color,
          glow: song.glow,
        });
      }
    });
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  function setupInput() {
    document.addEventListener('keydown', e => {
      if (!active) return;
      keys.add(e.code);
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    document.addEventListener('keyup', e => keys.delete(e.code));
  }

  // ── Launch / Exit ───────────────────────────────────────────────────────────
  function launchGame() {
    active = true;
    overlay.style.display = 'block';
    resize();
    window.addEventListener('resize', resize);
    // Center camera on player
    cam.x = player.x - W / 2;
    cam.y = player.y - H / 2;
    lastTs = performance.now();
    animId = requestAnimationFrame(loop);
  }

  function exitGame() {
    active = false;
    cancelAnimationFrame(animId);
    overlay.style.display = 'none';
    popup.style.display = 'none';
    conScreen.style.display = 'none';
    musicPlaying = false;
    window.removeEventListener('resize', resize);
  }

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  // ── Game Loop ────────────────────────────────────────────────────────────────
  function loop(ts) {
    if (!active) return;
    const dt = Math.min(ts - lastTs, 50);
    lastTs = ts;
    update(ts, dt);
    render(ts);
    animId = requestAnimationFrame(loop);
  }

  // ── Update ───────────────────────────────────────────────────────────────────
  function update(ts) {
    // Input axes
    let ax = 0, ay = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) ax -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) ax += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) ay -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) ay += 1;
    if (joystick.on) { ax += joystick.dx; ay += joystick.dy; }

    // Normalize diagonal
    const alen = Math.hypot(ax, ay);
    if (alen > 1) { ax /= alen; ay /= alen; }

    // Velocity
    player.vx = player.vx * PLAYER_FRICTION + ax * PLAYER_ACCEL;
    player.vy = player.vy * PLAYER_FRICTION + ay * PLAYER_ACCEL;

    // Speed cap
    const spd = Math.hypot(player.vx, player.vy);
    if (spd > PLAYER_MAX_SPD) {
      player.vx = (player.vx / spd) * PLAYER_MAX_SPD;
      player.vy = (player.vy / spd) * PLAYER_MAX_SPD;
    }

    player.x += player.vx;
    player.y += player.vy;

    // Soft world boundary push
    const M = 110;
    if (player.x < M) player.vx += 0.45;
    if (player.x > WORLD_W - M) player.vx -= 0.45;
    if (player.y < M) player.vy += 0.45;
    if (player.y > WORLD_H - M) player.vy -= 0.45;

    // Smooth camera follow
    cam.x += (player.x - W / 2 - cam.x) * 0.072;
    cam.y += (player.y - H / 2 - cam.y) * 0.072;

    // Trail
    player.trail.unshift({ x: player.x, y: player.y });
    if (player.trail.length > 24) player.trail.pop();

    // Asteroid rotation
    nearObjs.forEach(a => { a.rot += a.rotSpd; });

    // Fragment pulse
    fragments.forEach(f => {
      if (!f.collected) f.ph += f.phSpd;
    });

    // Flash decay
    flashes = flashes.filter(f => f.life > 0);
    flashes.forEach(f => { f.life -= 0.04; f.r += 1.5; });

    // Collisions (only when constellation screen isn't open)
    if (conScreen.style.display !== 'flex') {
      checkCollisions();
    }
  }

  function checkCollisions() {
    const px = player.x, py = player.y;

    // Fragments
    fragments.forEach(f => {
      if (f.collected) return;
      if (Math.hypot(f.wx - px, f.wy - py) < COLLECT_R) collectFrag(f);
    });

    // Song orbs
    SONGS.forEach(s => {
      if (songState[s.id].discovered) return;
      if (Math.hypot(s.wx - px, s.wy - py) < ORB_R + 18) discoverSong(s);
    });
  }

  function collectFrag(f) {
    f.collected = true;
    songState[f.songId].frags++;
    updateHUD();

    // Tiny chime
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.frequency.value = 350 + songState[f.songId].frags * 175;
      osc.type = 'sine';
      g.gain.setValueAtTime(0.1, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.55);
      osc.start(); osc.stop(ac.currentTime + 0.55);
    } catch (_) {}

    // Flash effect at screen position
    flashes.push({ x: f.wx - cam.x, y: f.wy - cam.y, color: f.color, life: 1, r: 10 });
  }

  function discoverSong(song) {
    songState[song.id].discovered = true;
    musicPlaying = true;
    updateHUD();
    showSongPopup(song);

    // Discovery chime — ascending arpeggio
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.connect(g); g.connect(ac.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        const t = ac.currentTime + i * 0.12;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.12, t + 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
        osc.start(t); osc.stop(t + 0.7);
      });
    } catch (_) {}
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  function render(ts) {
    ctx.clearRect(0, 0, W, H);

    // Beat pulse for music reactivity
    const beat = musicPlaying ? Math.max(0, Math.sin(ts * 0.0055) * 0.5 + 0.5) : 0;

    // Deep space background
    const bg = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H / 2, Math.max(W, H) * 0.88);
    bg.addColorStop(0, `hsl(265,55%,${7 + beat * 3}%)`);
    bg.addColorStop(0.55, 'hsl(255,60%,4%)');
    bg.addColorStop(1, '#040008');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    renderFar(ts, beat);
    renderMid(ts, beat);
    renderNear();
    renderFragments(ts);
    renderOrbs(ts, beat);
    renderTrail();
    renderMascot(ts, beat);
    renderFlashes();
    renderArrows(ts);

    // Subtle beat flash overlay
    if (beat > 0.82) {
      ctx.fillStyle = `rgba(124,58,237,${(beat - 0.82) * 0.035})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ── Parallax Layer: Far (galaxies, tiled with period=W×H) ──────────────────
  function renderFar(ts, beat) {
    // Offset is cam movement × parallax factor, wrapped into [0, tileSize)
    const tOX = ((cam.x * 0.1) % W + W) % W;
    const tOY = ((cam.y * 0.1) % H + H) % H;

    // Twinkling starfield (pseudo-random but stable per index)
    for (let i = 0; i < 290; i++) {
      const s = i * 6271;
      const bx = (s * 1234) % W;
      const by = (s * 8765) % H;
      const sx = ((bx - tOX + W) % W);
      const sy = ((by - tOY + H) % H);
      const r = 0.28 + (s % 130) / 130 * 1.45;
      const baseA = 0.18 + (s % 65) / 65 * 0.62;
      const twinkle = REDUCED ? 0 : Math.sin(ts * 0.001 * (0.38 + (s % 90) / 90) + s * 0.012) * 0.2;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,210,255,${Math.max(0, baseA + twinkle)})`;
      ctx.fill();
    }

    // Galaxy objects (tiled, with edge wrap)
    farObjs.forEach(g => {
      const bx = g.nx * W;
      const by = g.ny * H;
      let sx = ((bx - tOX + W) % W);
      let sy = ((by - tOY + H) % H);
      drawGalaxy(sx, sy, g, beat, ts);
      // Draw wrapped copies for edge seam
      if (sx < g.size * 3.5) drawGalaxy(sx + W, sy, g, beat, ts);
      if (sx > W - g.size * 3.5) drawGalaxy(sx - W, sy, g, beat, ts);
      if (sy < g.size * 3.5) drawGalaxy(sx, sy + H, g, beat, ts);
      if (sy > H - g.size * 3.5) drawGalaxy(sx, sy - H, g, beat, ts);
    });
  }

  // ── Parallax Layer: Mid (nebulae, tiled with period=1.5W×1.5H) ─────────────
  function renderMid(ts, beat) {
    const TW = W * 1.5;
    const TH = H * 1.5;
    const tOX = ((cam.x * 0.28) % TW + TW) % TW;
    const tOY = ((cam.y * 0.28) % TH + TH) % TH;

    midObjs.forEach(n => {
      const drift = REDUCED ? 0 : Math.sin(ts * n.dS + n.dA) * 22;
      const driftY = REDUCED ? 0 : Math.cos(ts * n.dS + n.dA) * 11;
      const bx = n.nx * TW + drift;
      const by = n.ny * TH + driftY;
      const sx = ((bx - tOX + TW * 2) % TW) - TW * 0.25 + W * 0.125;
      const sy = ((by - tOY + TH * 2) % TH) - TH * 0.25 + H * 0.125;
      if (sx < -n.rx * 2.2 || sx > W + n.rx * 2.2) return;
      if (sy < -n.ry * 2.2 || sy > H + n.ry * 2.2) return;
      drawNebula(sx, sy, n, beat, ts);
    });
  }

  // ── Parallax Layer: Near (asteroids + dust in world space at 0.72×) ─────────
  function renderNear() {
    const P = 0.72;

    // Cosmic dust
    nearObjs._dust.forEach(d => {
      const sx = d.wx - cam.x * P;
      const sy = d.wy - cam.y * P;
      if (sx < -3 || sx > W + 3 || sy < -3 || sy > H + 3) return;
      ctx.beginPath();
      ctx.arc(sx, sy, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(190,180,255,${d.op})`;
      ctx.fill();
    });

    // Asteroids
    nearObjs.forEach(a => {
      const sx = a.wx - cam.x * P;
      const sy = a.wy - cam.y * P;
      if (sx < -a.size * 5 || sx > W + a.size * 5) return;
      if (sy < -a.size * 5 || sy > H + a.size * 5) return;
      drawAsteroid(sx, sy, a);
    });
  }

  function renderFragments(ts) {
    fragments.forEach(f => {
      if (f.collected) return;
      const sx = f.wx - cam.x;
      const sy = f.wy - cam.y;
      if (sx < -110 || sx > W + 110 || sy < -110 || sy > H + 110) return;
      drawFragment(sx, sy, f, ts);
    });
  }

  function renderOrbs(ts, beat) {
    SONGS.forEach(song => {
      const sx = song.wx - cam.x;
      const sy = song.wy - cam.y;
      if (sx < -350 || sx > W + 350 || sy < -350 || sy > H + 350) return;
      if (songState[song.id].discovered) {
        drawDiscoveredOrb(sx, sy, song, ts);
      } else {
        drawSongOrb(sx, sy, song, ts, beat);
      }
    });
  }

  function renderTrail() {
    player.trail.forEach((p, i) => {
      const sx = p.x - cam.x;
      const sy = p.y - cam.y;
      const a = (1 - i / player.trail.length) * 0.26;
      const r = (1 - i / player.trail.length) * 5.5;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.1, r), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(124,58,237,${a})`;
      ctx.fill();
    });
  }

  function renderMascot(ts, beat) {
    drawMascot(player.x - cam.x, player.y - cam.y, ts, beat);
  }

  function renderFlashes() {
    flashes.forEach(f => {
      if (f.life <= 0) return;
      const grd = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      grd.addColorStop(0, f.color.replace('rgb', 'rgba').replace(')', `,${f.life * 0.6})`));
      grd.addColorStop(1, f.color.replace('rgb', 'rgba').replace(')', ',0)'));
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    });
  }

  function renderArrows(ts) {
    SONGS.forEach(song => {
      if (songState[song.id].discovered) return;
      const sx = song.wx - cam.x;
      const sy = song.wy - cam.y;
      // Only show arrow if orb is off-screen
      if (sx >= -20 && sx <= W + 20 && sy >= -20 && sy <= H + 20) return;

      const cx2 = W / 2, cy2 = H / 2;
      const ang = Math.atan2(sy - cy2, sx - cx2);
      const margin = Math.min(W, H) * 0.41;
      const ax = cx2 + Math.cos(ang) * margin;
      const ay = cy2 + Math.sin(ang) * margin;
      const pulse = 0.42 + (REDUCED ? 0 : Math.sin(ts * 0.003) * 0.26);
      const [r, g, b] = hexRgb(song.color);

      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(ang);
      ctx.fillStyle = `rgba(${r},${g},${b},${pulse})`;
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(-7, -7.5);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-7, 7.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Distance label
      const dist = Math.round(Math.hypot(song.wx - player.x, song.wy - player.y));
      ctx.fillStyle = 'rgba(157,142,196,0.55)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${dist} ly`, ax, ay + 22);
    });
  }

  // ── Draw: Galaxy ────────────────────────────────────────────────────────────
  function drawGalaxy(sx, sy, g, beat, ts) {
    ctx.save();
    ctx.translate(sx, sy);
    if (!REDUCED) ctx.rotate(g.rot + ts * 0.00007);
    const op = g.op + beat * 0.038;

    if (g.type === 0) {
      // Circular galaxy
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, g.size);
      grd.addColorStop(0, `hsla(${g.hue},72%,78%,${op})`);
      grd.addColorStop(0.42, `hsla(${g.hue + 22},56%,50%,${op * 0.42})`);
      grd.addColorStop(1, `hsla(${g.hue + 42},50%,32%,0)`);
      ctx.beginPath();
      ctx.arc(0, 0, g.size, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    } else if (g.type === 1) {
      // Elongated elliptical
      ctx.scale(1, 0.35);
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, g.size * 1.25);
      grd.addColorStop(0, `hsla(${g.hue},80%,84%,${op})`);
      grd.addColorStop(0.5, `hsla(${g.hue},60%,55%,${op * 0.38})`);
      grd.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(0, 0, g.size * 1.25, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    } else {
      // Star cluster
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const r = g.size * 0.42;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r, Math.sin(a) * r, g.size * 0.24, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${g.hue},65%,74%,${op * 0.7})`;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, g.size * 0.36, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${g.hue},80%,86%,${op})`;
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Draw: Nebula ────────────────────────────────────────────────────────────
  function drawNebula(sx, sy, n, beat, ts) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(n.rot);
    ctx.scale(1, n.ry / n.rx);
    const op = n.op + beat * 0.068;
    const hue = n.hue + beat * 20;
    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, n.rx);
    grd.addColorStop(0, `hsla(${hue},${n.sat}%,56%,${op})`);
    grd.addColorStop(0.42, `hsla(${hue + 18},${n.sat - 14}%,42%,${op * 0.48})`);
    grd.addColorStop(0.72, `hsla(${hue + 34},54%,30%,${op * 0.18})`);
    grd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(0, 0, n.rx, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.restore();
  }

  // ── Draw: Asteroid ──────────────────────────────────────────────────────────
  function drawAsteroid(sx, sy, a) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a.rot);
    ctx.beginPath();
    a.verts.forEach(([vx, vy], i) => {
      const x = vx * a.size, y = vy * a.size;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = `hsla(${a.hue},28%,30%,${a.op})`;
    ctx.strokeStyle = `hsla(${a.hue},38%,52%,${a.op * 0.32})`;
    ctx.lineWidth = 0.5;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ── Draw: Fragment Collectible ──────────────────────────────────────────────
  function drawFragment(sx, sy, f, ts) {
    const p = Math.sin(f.ph) * 0.5 + 0.5;
    const size = 7 + p * 5;
    const op = 0.52 + p * 0.48;

    // Outer glow
    const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 3.8);
    grd.addColorStop(0, `${f.glow}${op * 0.52})`);
    grd.addColorStop(0.55, `${f.glow}${op * 0.14})`);
    grd.addColorStop(1, `${f.glow}0)`);
    ctx.beginPath();
    ctx.arc(sx, sy, size * 3.8, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Spinning diamond
    ctx.save();
    ctx.translate(sx, sy);
    if (!REDUCED) ctx.rotate(ts * 0.00085 + f.ph);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.62, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.62, 0);
    ctx.closePath();
    ctx.fillStyle = f.color;
    ctx.fill();
    // Inner sparkle
    ctx.fillStyle = `rgba(255,255,255,${op * 0.78})`;
    ctx.beginPath();
    ctx.arc(0, -size * 0.2, size * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Draw: Song Orb ──────────────────────────────────────────────────────────
  function drawSongOrb(sx, sy, song, ts, beat) {
    const p = REDUCED ? 0.5 : (Math.sin(ts * 0.0017 + song.wx * 0.001) * 0.5 + 0.5);
    const fragsRatio = songState[song.id].frags / song.fragCount;
    const baseSize = 23 + fragsRatio * 14;
    const size = baseSize + p * 7 + beat * 12;
    const op = 0.32 + fragsRatio * 0.44 + p * 0.12;

    // Wide nebula aura
    const nebGrd = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 6.5);
    nebGrd.addColorStop(0, `${song.glow}${op * 0.52})`);
    nebGrd.addColorStop(0.38, `${song.glow}${op * 0.18})`);
    nebGrd.addColorStop(0.7, `${song.glow}${op * 0.04})`);
    nebGrd.addColorStop(1, `${song.glow}0)`);
    ctx.beginPath();
    ctx.arc(sx, sy, size * 6.5, 0, Math.PI * 2);
    ctx.fillStyle = nebGrd;
    ctx.fill();

    // Orbiting rings
    if (!REDUCED) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ts * 0.00075);
      ctx.scale(1, 0.3);
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.85, 0, Math.PI * 2);
      ctx.strokeStyle = `${song.glow}${op * 0.52})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(-ts * 0.00048);
      ctx.scale(0.3, 1);
      ctx.beginPath();
      ctx.arc(0, 0, size * 2.15, 0, Math.PI * 2);
      ctx.strokeStyle = `${song.glow}${op * 0.28})`;
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.restore();
    }

    // Core orb glow
    const coreGrd = ctx.createRadialGradient(
      sx - size * 0.28, sy - size * 0.28, size * 0.04,
      sx, sy, size
    );
    coreGrd.addColorStop(0, `rgba(255,255,255,${op * 0.97})`);
    coreGrd.addColorStop(0.25, `${song.glow}${op * 0.94})`);
    coreGrd.addColorStop(0.7, `${song.glow}${op * 0.55})`);
    coreGrd.addColorStop(1, `${song.glow}0)`);
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fillStyle = coreGrd;
    ctx.fill();

    // Music note icon
    ctx.fillStyle = `rgba(255,255,255,${op * 0.9})`;
    ctx.font = `${Math.round(size * 0.82)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u266B', sx, sy);

    // Song name label
    ctx.fillStyle = `rgba(255,255,255,${0.48 + p * 0.34})`;
    ctx.font = 'bold 10px \'Segoe UI\',system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(song.title.toUpperCase(), sx, sy + size + 10);

    // Fragment slot dots
    const total = song.fragCount;
    const collected = songState[song.id].frags;
    for (let i = 0; i < total; i++) {
      const ang = (i / total) * Math.PI * 2 - Math.PI / 2;
      const r = size + 17;
      const fx = sx + Math.cos(ang) * r;
      const fy = sy + Math.sin(ang) * r;
      ctx.beginPath();
      ctx.arc(fx, fy, 4.5, 0, Math.PI * 2);
      if (i < collected) {
        ctx.fillStyle = song.color;
        ctx.shadowColor = song.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = 'rgba(157,142,196,0.28)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
  }

  // ── Draw: Discovered Orb ────────────────────────────────────────────────────
  function drawDiscoveredOrb(sx, sy, song, ts) {
    const p = REDUCED ? 0.5 : (Math.sin(ts * 0.001) * 0.5 + 0.5);
    const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, 26);
    grd.addColorStop(0, `${song.glow}${0.2 + p * 0.1})`);
    grd.addColorStop(1, `${song.glow}0)`);
    ctx.beginPath();
    ctx.arc(sx, sy, 26, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,0.6)`;
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2713', sx, sy);
  }

  // ── Draw: Mascot ─────────────────────────────────────────────────────────────
  function drawMascot(sx, sy, ts, beat) {
    ctx.save();
    ctx.translate(sx, sy);

    const bob = REDUCED ? 0 : Math.sin(ts * 0.0025) * 2.8;
    ctx.translate(0, bob);

    const spd = Math.hypot(player.vx, player.vy);
    const tilt = (player.vx / PLAYER_MAX_SPD) * 0.2;
    if (!REDUCED) ctx.rotate(tilt);

    // Aura glow (music-reactive)
    const auraR = 32 + beat * 20;
    const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, auraR);
    aura.addColorStop(0, `rgba(124,58,237,${0.14 + beat * 0.28})`);
    aura.addColorStop(0.58, `rgba(99,102,241,${0.05 + beat * 0.08})`);
    aura.addColorStop(1, 'rgba(124,58,237,0)');
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fillStyle = aura;
    ctx.fill();

    // Speed streaks when flying fast
    if (!REDUCED && spd > 1.6) {
      const trA = Math.min(spd / PLAYER_MAX_SPD, 1) * 0.32;
      ctx.save();
      ctx.rotate(Math.atan2(player.vy, player.vx) + Math.PI);
      for (let i = 0; i < 3; i++) {
        const ox = (i - 1) * 7;
        const len = spd * 9;
        const sg = ctx.createLinearGradient(ox, 0, ox, len);
        sg.addColorStop(0, `rgba(124,58,237,${trA})`);
        sg.addColorStop(1, 'rgba(124,58,237,0)');
        ctx.beginPath();
        ctx.moveTo(ox, 0);
        ctx.lineTo(ox, len);
        ctx.strokeStyle = sg;
        ctx.lineWidth = 2 - Math.abs(i - 1) * 0.5;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Star chain (below body, gold links)
    [28, 37, 46, 54].forEach((cy2, i) => {
      const cp = REDUCED ? 0.7 : (Math.sin(ts * 0.004 + i * 0.9) * 0.42 + 0.58);
      ctx.beginPath();
      ctx.arc(0, cy2, 3.4 - i * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245,158,11,${cp * (1 - i * 0.18)})`;
      ctx.shadowColor = 'rgba(245,158,11,0.75)';
      ctx.shadowBlur = 5;
      ctx.fill();
      ctx.shadowBlur = 0;
      if (i < 3) {
        ctx.beginPath();
        ctx.moveTo(0, cy2 + 3.4 - i * 0.45);
        ctx.lineTo(0, cy2 + 5.5);
        ctx.strokeStyle = `rgba(245,158,11,${cp * 0.32})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // Body (rounded rect)
    const bW = 28, bH = 34;
    const bodyGrd = ctx.createLinearGradient(0, -bH / 2 - 4, 0, bH / 2 - 4);
    bodyGrd.addColorStop(0, 'rgba(238,228,255,0.97)');
    bodyGrd.addColorStop(1, 'rgba(185,165,244,0.93)');
    roundRect(-bW / 2, -bH / 2 - 4, bW, bH, 9);
    ctx.fillStyle = bodyGrd;
    ctx.fill();
    ctx.strokeStyle = 'rgba(124,58,237,0.52)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // SM label on body
    ctx.fillStyle = 'rgba(109,40,217,0.88)';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SM', 0, -4);

    // Head circle
    const headY = -bH / 2 - 20;
    const headGrd = ctx.createRadialGradient(-4, headY - 4, 2, 0, headY, 15);
    headGrd.addColorStop(0, 'rgba(248,244,255,0.98)');
    headGrd.addColorStop(1, 'rgba(205,188,248,0.94)');
    ctx.beginPath();
    ctx.arc(0, headY, 15, 0, Math.PI * 2);
    ctx.fillStyle = headGrd;
    ctx.fill();
    ctx.strokeStyle = 'rgba(124,58,237,0.42)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Eyes
    ctx.fillStyle = 'rgba(15,5,35,0.9)';
    [[-5.5, -1.5], [5.5, -1.5]].forEach(([ex, ey]) => {
      ctx.beginPath();
      ctx.arc(ex, headY + ey, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });
    // Eye sparkles
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    [[-4.2, -2.8], [6.6, -2.8]].forEach(([ex, ey]) => {
      ctx.beginPath();
      ctx.arc(ex, headY + ey, 1.1, 0, Math.PI * 2);
      ctx.fill();
    });

    // Smile
    ctx.beginPath();
    ctx.arc(0, headY + 4.5, 4.5, 0.15, Math.PI - 0.15);
    ctx.strokeStyle = 'rgba(109,40,217,0.62)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Cap brim
    ctx.beginPath();
    ctx.ellipse(1.5, headY - 13, 18.5, 4.5, 0.08, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(88,28,175,0.9)';
    ctx.fill();

    // Cap dome
    ctx.beginPath();
    ctx.moveTo(-13.5, headY - 14);
    ctx.bezierCurveTo(-13.5, headY - 30, 13.5, headY - 30, 13.5, headY - 14);
    ctx.closePath();
    ctx.fillStyle = 'rgba(124,58,237,0.93)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(167,139,250,0.38)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // "SM" text on cap
    ctx.fillStyle = 'rgba(252,211,77,0.96)';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SM', 0, headY - 22);

    // Gold star on cap brim
    ctx.font = '9px serif';
    ctx.fillStyle = 'rgba(252,211,77,0.92)';
    ctx.shadowColor = 'rgba(245,158,11,0.9)';
    ctx.shadowBlur = 7;
    ctx.fillText('\u2605', 0, headY - 13.5);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── UI: HUD ──────────────────────────────────────────────────────────────────
  function updateHUD() {
    hud.innerHTML = '';
    SONGS.forEach(song => {
      const { frags, discovered } = songState[song.id];
      const dots = Array.from({ length: song.fragCount }, (_, i) => {
        const filled = i < frags;
        return `<span style="width:9px;height:9px;border-radius:50%;background:${filled ? song.color : 'rgba(157,142,196,.16)'};display:inline-block;flex-shrink:0;${filled ? `box-shadow:0 0 6px ${song.color}` : ''}"></span>`;
      }).join('');

      const row = document.createElement('div');
      css(row, `display:flex;align-items:center;gap:.5rem;background:rgba(4,0,10,.75);border:1px solid ${discovered ? song.color + '70' : 'rgba(157,142,196,.1)'};border-radius:22px;padding:.32rem .9rem;font-size:.67rem;letter-spacing:.09em;color:${discovered ? '#fff' : '#9d8ec4'};font-family:'Segoe UI',system-ui,sans-serif;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);`);
      row.innerHTML = `${dots}<span>${discovered ? '\u266B ' : ''}<span style="text-transform:uppercase">${song.title}</span></span>`;
      hud.appendChild(row);
    });
  }

  // ── UI: Song Popup ───────────────────────────────────────────────────────────
  function showSongPopup(song) {
    popup.style.display = 'block';
    popup.style.borderColor = song.color + '80';
    popup.style.boxShadow = `0 0 90px ${song.color}50, 0 0 180px rgba(99,102,241,.12)`;
    popup.innerHTML = `
      <div style="font-family:'Segoe UI',system-ui,sans-serif;">
        <div style="color:${song.color};font-size:.6rem;letter-spacing:.38em;text-transform:uppercase;margin-bottom:.85rem;filter:drop-shadow(0 0 10px ${song.color})">&#9670; Song Discovered &#9670;</div>
        <div style="color:#fff;font-size:1.22rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;margin-bottom:1.25rem;line-height:1.25;">${song.title}</div>
        <iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
          src="${song.embedUrl}"
          style="border-radius:11px;margin-bottom:1.3rem;display:block;"></iframe>
        <button id="cq-close-popup"
          style="background:transparent;border:1px solid rgba(157,142,196,.26);color:#9d8ec4;padding:.55rem 1.8rem;border-radius:22px;cursor:pointer;font-size:.7rem;letter-spacing:.13em;text-transform:uppercase;font-family:'Segoe UI',system-ui,sans-serif;transition:all .28s;"
          onmouseenter="this.style.borderColor='rgba(245,158,11,.65)';this.style.color='#fcd34d'"
          onmouseleave="this.style.borderColor='rgba(157,142,196,.26)';this.style.color='#9d8ec4'">
          Continue Exploring
        </button>
      </div>`;
    // Animate in
    requestAnimationFrame(() => {
      popup.style.transform = 'translate(-50%,-50%) scale(1)';
    });
    document.getElementById('cq-close-popup').addEventListener('click', closePopup);
  }

  function closePopup() {
    popup.style.transform = 'translate(-50%,-50%) scale(.88)';
    setTimeout(() => { popup.style.display = 'none'; }, 320);
    musicPlaying = false;
  }

  // ── UI: Constellation Map ────────────────────────────────────────────────────
  function toggleConstellation() {
    if (conScreen.style.display === 'flex') {
      conScreen.style.display = 'none';
    } else {
      buildConstellationScreen();
      conScreen.style.display = 'flex';
    }
  }

  function buildConstellationScreen() {
    const cW = Math.min(window.innerWidth - 48, 800);
    const cH = Math.min(window.innerHeight * 0.48, 390);

    const totalFrags = SONGS.reduce((s, song) => s + songState[song.id].frags, 0);
    const maxFrags = SONGS.reduce((s, song) => s + song.fragCount, 0);
    const discCount = SONGS.filter(s => songState[s.id].discovered).length;

    conScreen.innerHTML = `
      <div style="font-family:'Segoe UI',system-ui,sans-serif;text-align:center;max-width:${cW}px;width:100%;">
        <div style="color:#f59e0b;font-size:.62rem;letter-spacing:.4em;text-transform:uppercase;margin-bottom:.5rem;filter:drop-shadow(0 0 10px rgba(245,158,11,.72))">Navigation Chart</div>
        <div style="color:#fff;font-size:1.65rem;font-weight:900;letter-spacing:.15em;text-transform:uppercase;margin-bottom:.4rem;">Star Map</div>
        <div style="color:#9d8ec4;font-size:.76rem;letter-spacing:.1em;margin-bottom:.6rem;">
          ${discCount}/${SONGS.length} songs found &nbsp;&bull;&nbsp; ${totalFrags}/${maxFrags} fragments collected
        </div>
        <canvas id="cq-con-canvas" width="${cW}" height="${cH}"
          style="border:1px solid rgba(147,51,234,.18);border-radius:14px;background:#040008;max-width:100%;display:block;margin:0 auto 1.4rem;"></canvas>
        <div style="display:flex;gap:2.2rem;justify-content:center;flex-wrap:wrap;margin-bottom:1.5rem;">
          ${SONGS.map(s => {
            const disc = songState[s.id].discovered;
            return `<div style="text-align:center;">
              <div style="width:13px;height:13px;border-radius:50%;background:${s.color};margin:0 auto .45rem;box-shadow:0 0 10px ${s.color};${!disc ? 'opacity:.16;filter:grayscale(1)' : ''}"></div>
              <div style="color:${disc ? '#fff' : '#9d8ec4'};font-size:.7rem;letter-spacing:.09em;text-transform:uppercase;">${s.title}</div>
              <div style="color:${disc ? s.color : 'rgba(157,142,196,.35)'};font-size:.6rem;margin-top:.22rem;">${disc ? '&#9670; Discovered' : '? Unknown'}</div>
            </div>`;
          }).join('')}
        </div>
        <button onclick="window._cqToggle()"
          style="background:transparent;border:1px solid rgba(147,51,234,.35);color:#9d8ec4;padding:.6rem 1.8rem;border-radius:22px;cursor:pointer;font-size:.7rem;letter-spacing:.13em;text-transform:uppercase;font-family:'Segoe UI',system-ui,sans-serif;transition:all .28s;"
          onmouseenter="this.style.borderColor='rgba(245,158,11,.62)';this.style.color='#fcd34d'"
          onmouseleave="this.style.borderColor='rgba(147,51,234,.35)';this.style.color='#9d8ec4'">
          Resume Exploration
        </button>
      </div>`;

    window._cqToggle = toggleConstellation;

    // Draw the constellation canvas
    setTimeout(() => {
      const cc = document.getElementById('cq-con-canvas');
      if (!cc) return;
      const cctx = cc.getContext('2d');
      const ccW = cc.width, ccH = cc.height;

      // Deep space background
      cctx.fillStyle = '#040008';
      cctx.fillRect(0, 0, ccW, ccH);

      // Subtle nebula background
      [
        { x: ccW * 0.25, y: ccH * 0.35, r: ccW * 0.25, hue: 260, op: 0.04 },
        { x: ccW * 0.75, y: ccH * 0.65, r: ccW * 0.22, hue: 38, op: 0.04 },
      ].forEach(n => {
        const grd = cctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        grd.addColorStop(0, `hsla(${n.hue},70%,55%,${n.op})`);
        grd.addColorStop(1, 'transparent');
        cctx.beginPath();
        cctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        cctx.fillStyle = grd;
        cctx.fill();
      });

      // Background starfield
      for (let i = 0; i < 200; i++) {
        const seed = i * 5381;
        const x = (seed * 1234) % ccW;
        const y = (seed * 4567) % ccH;
        const r = 0.28 + (seed % 110) / 110 * 1.35;
        const a = 0.12 + (seed % 75) / 75 * 0.6;
        cctx.beginPath();
        cctx.arc(x, y, r, 0, Math.PI * 2);
        cctx.fillStyle = `rgba(220,210,255,${a})`;
        cctx.fill();
      }

      // Minimap: show world as grid overlay
      const padX = 18, padY = 18;
      const mapW = ccW - padX * 2;
      const mapH = ccH - padY * 2;

      // Uncollected fragments as faint dots
      fragments.forEach(f => {
        if (f.collected) return;
        const fx = padX + (f.wx / WORLD_W) * mapW;
        const fy = padY + (f.wy / WORLD_H) * mapH;
        const song = SONGS.find(s => s.id === f.songId);
        cctx.beginPath();
        cctx.arc(fx, fy, 2, 0, Math.PI * 2);
        cctx.fillStyle = `${song.glow}0.35)`;
        cctx.fill();
      });

      // Constellation patterns for each song
      SONGS.forEach(song => {
        const disc = songState[song.id].discovered;
        const alpha = disc ? 1 : 0.1;

        const pts = song.constellation.map(p => ({
          x: p.px * ccW,
          y: p.py * ccH,
        }));

        // Constellation lines
        cctx.strokeStyle = `${song.glow}${alpha * 0.42})`;
        cctx.lineWidth = disc ? 1.4 : 0.6;
        song.lines.forEach(([a, b]) => {
          cctx.beginPath();
          cctx.moveTo(pts[a].x, pts[a].y);
          cctx.lineTo(pts[b].x, pts[b].y);
          cctx.stroke();
        });

        // Constellation star nodes
        pts.forEach((p, i) => {
          const sr = (i === 0 ? 5.5 : 3.8) * (disc ? 1 : 0.4);
          if (disc) {
            const gg = cctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sr * 3.2);
            gg.addColorStop(0, `${song.glow}0.58)`);
            gg.addColorStop(1, `${song.glow}0)`);
            cctx.beginPath();
            cctx.arc(p.x, p.y, sr * 3.2, 0, Math.PI * 2);
            cctx.fillStyle = gg;
            cctx.fill();
          }
          cctx.beginPath();
          cctx.arc(p.x, p.y, disc ? sr : sr * 0.4, 0, Math.PI * 2);
          cctx.fillStyle = disc ? song.color : 'rgba(157,142,196,0.15)';
          cctx.fill();
        });

        // Song label
        if (disc && pts.length > 0) {
          cctx.fillStyle = song.color;
          cctx.font = 'bold 10px monospace';
          cctx.textAlign = 'left';
          cctx.fillText(song.title.toUpperCase(), pts[0].x + 9, pts[0].y - 9);
        }

        // Orb dot on minimap
        const ox = padX + (song.wx / WORLD_W) * mapW;
        const oy = padY + (song.wy / WORLD_H) * mapH;
        cctx.beginPath();
        cctx.arc(ox, oy, disc ? 7 : 3.5, 0, Math.PI * 2);
        cctx.fillStyle = disc ? song.color : `rgba(157,142,196,0.2)`;
        if (disc) { cctx.shadowColor = song.color; cctx.shadowBlur = 8; }
        cctx.fill();
        cctx.shadowBlur = 0;
      });

      // Player dot on minimap
      const px2 = padX + (player.x / WORLD_W) * mapW;
      const py2 = padY + (player.y / WORLD_H) * mapH;
      cctx.beginPath();
      cctx.arc(px2, py2, 5, 0, Math.PI * 2);
      cctx.fillStyle = '#fff';
      cctx.shadowColor = 'rgba(255,255,255,0.8)';
      cctx.shadowBlur = 6;
      cctx.fill();
      cctx.shadowBlur = 0;
      cctx.fillStyle = 'rgba(255,255,255,0.65)';
      cctx.font = '9px monospace';
      cctx.textAlign = 'left';
      cctx.fillText('YOU', px2 + 7, py2 + 3);
    }, 55);
  }

  // ── Utilities ────────────────────────────────────────────────────────────────
  function hexRgb(hex) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────────
  function init() {
    buildDOM();
    buildWorld();
    setupInput();
    updateHUD();

    // Add "Enter the Cosmos" button to hero section
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
      const launchBtn = document.createElement('button');
      launchBtn.id = 'cq-launch-btn';
      launchBtn.className = 'btn';
      launchBtn.innerHTML = '&#9733; Enter the Cosmos &#9733;';
      launchBtn.addEventListener('click', launchGame);
      heroContent.appendChild(launchBtn);

      // Inject button-specific styles
      const style = document.createElement('style');
      style.textContent = `
        #cq-launch-btn {
          margin-top: 1.1rem;
          background: linear-gradient(135deg, #0d9488 0%, #6d28d9 50%, #0d9488 100%) !important;
          background-size: 200% auto !important;
          box-shadow: 0 0 24px rgba(13,148,136,.55), 0 4px 32px rgba(109,40,217,.42) !important;
          animation: fadeUp .8s .55s ease both, cqCosmicPulse 4.2s 1.2s ease-in-out infinite alternate !important;
          border: none !important;
          cursor: pointer !important;
          color: #fff !important;
          font-size: .92rem !important;
          letter-spacing: .1em !important;
        }
        #cq-launch-btn:hover {
          background: linear-gradient(135deg, #f59e0b, #7c3aed) !important;
          box-shadow: 0 0 32px rgba(245,158,11,.72), 0 8px 48px rgba(124,58,237,.55) !important;
          transform: translateY(-5px) scale(1.07) !important;
          animation: none !important;
        }
        @keyframes cqCosmicPulse {
          from { box-shadow: 0 0 18px rgba(13,148,136,.48), 0 4px 28px rgba(109,40,217,.38); }
          to   { box-shadow: 0 0 38px rgba(13,148,136,.82), 0 6px 55px rgba(109,40,217,.68), 0 0 65px rgba(45,212,191,.2); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
