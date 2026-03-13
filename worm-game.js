(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════════
   * COSMIC WORM — STARMILK  (slither.io-style rebuild)
   *
   * Smooth mouse-following movement in a large arena. Eat glowing orbs
   * to grow. CPU worms roam the map with AI. If your HEAD hits any other
   * worm's BODY, you die and restart. Song orbs appear as you grow —
   * eat one to unlock and play a STARMILK track.
   *
   * Features:
   *  - Continuous sub-pixel movement (mouse direction, not grid)
   *  - Large scrolling arena with camera follow
   *  - Minimap showing full arena context
   *  - CPU AI worms that wander, chase food, and avoid collisions
   *  - Head-on-body collision → reset your worm length
   *  - Song orb system integrated with SoundCloud
   *  - Procedural SFX via Web Audio API
   *  - Mobile touch support (touch to steer, tap-hold to boost)
   * ═══════════════════════════════════════════════════════════════════════ */

  // ─── Arena ──────────────────────────────────────────────────────────
  const ARENA_W = 6000;
  const ARENA_H = 6000;

  // ─── Worm physics ───────────────────────────────────────────────────
  const BASE_SPEED = 160;         // px/sec
  const BOOST_SPEED = 280;
  const TURN_RATE = 4.5;          // radians/sec max turn
  const SEG_SPACING = 10;         // px between body segments
  const INITIAL_LENGTH = 12;
  const HEAD_RADIUS = 9;
  const BODY_RADIUS = 7;
  const BODY_RADIUS_GROW = 0.06;  // radius grows slightly with length

  // ─── Food ───────────────────────────────────────────────────────────
  const FOOD_COUNT = 800;
  const FOOD_RADIUS = 6;
  const FOOD_VALUE = 1;           // segments gained per food
  const GOLD_CHANCE = 0.08;
  const GOLD_VALUE = 3;

  // ─── Song orbs ──────────────────────────────────────────────────────
  const SONG_ORB_FIRST = 30;
  const SONG_ORB_INTERVAL = 15;
  const SONG_ORB_CHANCE = 0.35;
  const MAX_SONG_ORBS = 2;
  const SONG_ORB_RADIUS = 14;

  // ─── CPU worms ──────────────────────────────────────────────────────
  const CPU_COUNT = 8;
  const CPU_MIN_LEN = 8;
  const CPU_MAX_LEN = 50;
  const CPU_RESPAWN_DELAY = 3000; // ms

  // ─── Visual ─────────────────────────────────────────────────────────
  const MINIMAP_SIZE = 160;
  const MINIMAP_MARGIN = 12;
  const STAR_COUNT = 200;

  // Palette (STARMILK cosmic palette)
  const C = {
    bg:          '#04010a',
    grid:        'rgba(99,102,241,.04)',
    gridLine:    'rgba(99,102,241,.08)',
    wormHead:    '#fcd34d',
    wormBody:    '#9333ea',
    wormTail:    '#6366f1',
    orbEnergy:   '#2dd4bf',
    orbGold:     '#f59e0b',
    orbSong:     '#c084fc',
    orbSongGlow: '#a855f7',
    orbSongRing: '#e879f9',
    text:        '#e2d9f3',
    muted:       '#9d8ec4',
    border:      'rgba(147,51,234,.45)',
    panelBg:     'rgba(12,3,24,.98)',
    edgeGlow:    'rgba(99,102,241,.4)',
    deathOrb:    '#ff6b6b',
  };

  // CPU worm color sets [head, body, tail]
  const CPU_COLORS = [
    ['#ff6b6b','#e74c3c','#c0392b'],
    ['#4ecdc4','#1abc9c','#16a085'],
    ['#f39c12','#e67e22','#d35400'],
    ['#3498db','#2980b9','#2471a3'],
    ['#e056a0','#c0392b','#96281b'],
    ['#2ecc71','#27ae60','#1e8449'],
    ['#9b59b6','#8e44ad','#7d3c98'],
    ['#1abc9c','#16a085','#0e6655'],
  ];

  // ─── Track pool ─────────────────────────────────────────────────────
  let allTracks = [];
  let trackPool = [];
  let trackIdx = 0;

  // ─── State ──────────────────────────────────────────────────────────
  let overlay, canvas, ctx;
  let nowPlayingBar, nowPlayingTitle, nowPlayingClose, scFrame;
  let gameRunning = false;
  let gameOver = false;
  let animFrame = null;
  let lastTime = 0;

  // Player worm
  let player = null;
  // CPU worms
  let cpuWorms = [];
  // Food orbs
  let food = [];
  // Song orbs
  let songOrbs = [];
  // Particles
  let particles = [];
  // Stars (parallax)
  let stars = [];
  // Death food (dropped when a worm dies)
  let deathFood = [];

  // Camera
  let camera = { x: 0, y: 0 };
  let viewW = 0, viewH = 0;

  // Mouse / touch target (in world coords)
  let mouseWorld = { x: ARENA_W / 2 + 100, y: ARENA_H / 2 };
  let boosting = false;

  // Score
  let score = 0;
  let highScore = 0;
  let orbsEaten = 0;
  let songsUnlocked = [];
  let songNotification = null;

  // Audio
  let audioCtx = null;

  // ─── Helpers ────────────────────────────────────────────────────────
  function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function randF(a, b) { return Math.random() * (b - a) + a; }
  function dist(x1, y1, x2, y2) { return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function angleDiff(a, b) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ─── SFX ────────────────────────────────────────────────────────────
  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playSFX(freq, dur, type, vol) {
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (dur || 0.12));
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + (dur || 0.12));
    } catch (_) {}
  }

  function sfxEat() { playSFX(660, 0.08, 'sine', 0.12); }
  function sfxGold() { playSFX(880, 0.15, 'triangle', 0.15); setTimeout(() => playSFX(1100, 0.1, 'triangle', 0.12), 80); }
  function sfxSong() { playSFX(523, 0.2, 'sine', 0.18); setTimeout(() => playSFX(659, 0.2, 'sine', 0.15), 120); setTimeout(() => playSFX(784, 0.3, 'sine', 0.12), 240); }
  function sfxDeath() { playSFX(200, 0.3, 'sawtooth', 0.15); setTimeout(() => playSFX(120, 0.4, 'sawtooth', 0.1), 150); }

  // ─── Worm class ─────────────────────────────────────────────────────
  class Worm {
    constructor(x, y, angle, length, isPlayer, colorIdx) {
      this.segments = [];
      this.angle = angle;
      this.targetAngle = angle;
      this.speed = BASE_SPEED;
      this.isPlayer = isPlayer;
      this.alive = true;
      this.boosting = false;
      this.totalEaten = 0;
      this.targetLength = length;

      // Colors
      if (isPlayer) {
        this.headColor = C.wormHead;
        this.bodyColor = C.wormBody;
        this.tailColor = C.wormTail;
      } else {
        const c = CPU_COLORS[colorIdx % CPU_COLORS.length];
        this.headColor = c[0];
        this.bodyColor = c[1];
        this.tailColor = c[2];
      }

      // Initialize segments
      for (let i = 0; i < length; i++) {
        this.segments.push({
          x: x - Math.cos(angle) * i * SEG_SPACING,
          y: y - Math.sin(angle) * i * SEG_SPACING,
        });
      }

      // CPU AI state
      if (!isPlayer) {
        this.aiTarget = null;
        this.aiTimer = 0;
        this.aiWanderAngle = angle;
        this.aiState = 'wander'; // wander, chase, flee
        this.aiStateTimer = 0;
      }
    }

    get head() { return this.segments[0]; }
    get length() { return this.segments.length; }

    getRadius(i) {
      if (i === 0) return HEAD_RADIUS + Math.min(this.length * 0.03, 4);
      const t = i / this.length;
      const base = BODY_RADIUS + Math.min(this.length * BODY_RADIUS_GROW, 5);
      // Taper near tail
      if (t > 0.8) {
        return base * (1 - (t - 0.8) / 0.2 * 0.6);
      }
      // Slight bulge near head
      if (t < 0.15) {
        return base * (0.85 + t / 0.15 * 0.15);
      }
      return base;
    }

    update(dt) {
      if (!this.alive) return;

      const speed = this.boosting ? BOOST_SPEED : BASE_SPEED;

      // Steer toward target angle
      const diff = angleDiff(this.angle, this.targetAngle);
      const maxTurn = TURN_RATE * dt;
      if (Math.abs(diff) < maxTurn) {
        this.angle = this.targetAngle;
      } else {
        this.angle += Math.sign(diff) * maxTurn;
      }

      // Move head
      const head = this.segments[0];
      head.x += Math.cos(this.angle) * speed * dt;
      head.y += Math.sin(this.angle) * speed * dt;

      // Clamp to arena (with margin)
      const margin = 30;
      head.x = clamp(head.x, margin, ARENA_W - margin);
      head.y = clamp(head.y, margin, ARENA_H - margin);

      // Follow chain: each segment follows the one before it
      for (let i = 1; i < this.segments.length; i++) {
        const prev = this.segments[i - 1];
        const seg = this.segments[i];
        const dx = seg.x - prev.x;
        const dy = seg.y - prev.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > SEG_SPACING) {
          const ratio = SEG_SPACING / d;
          seg.x = prev.x + dx * ratio;
          seg.y = prev.y + dy * ratio;
        }
      }

      // Grow toward target length
      while (this.segments.length < this.targetLength) {
        const last = this.segments[this.segments.length - 1];
        this.segments.push({ x: last.x, y: last.y });
      }

      // Boost shrinks (if boosting and long enough)
      if (this.boosting && this.segments.length > INITIAL_LENGTH + 3) {
        this.targetLength = Math.max(INITIAL_LENGTH, this.targetLength - dt * 3);
        while (this.segments.length > Math.ceil(this.targetLength) + 1) {
          const removed = this.segments.pop();
          // Drop food pellet behind
          deathFood.push({
            x: removed.x + randF(-5, 5),
            y: removed.y + randF(-5, 5),
            radius: 3,
            color: this.tailColor,
            pulse: randF(0, Math.PI * 2),
            value: 0.3,
          });
        }
      }
    }

    die() {
      if (!this.alive) return;
      this.alive = false;
      // Drop all segments as food
      for (let i = 0; i < this.segments.length; i += 2) {
        const s = this.segments[i];
        deathFood.push({
          x: s.x + randF(-8, 8),
          y: s.y + randF(-8, 8),
          radius: randF(4, 7),
          color: (i < this.segments.length * 0.3) ? this.headColor : this.bodyColor,
          pulse: randF(0, Math.PI * 2),
          value: 1,
        });
      }
      // Particles
      spawnParticles(this.head.x, this.head.y, this.headColor, 20);
    }

    draw(ctx, camX, camY) {
      if (!this.alive) return;
      const len = this.segments.length;

      // Draw body segments (back to front)
      for (let i = len - 1; i >= 1; i--) {
        const s = this.segments[i];
        const sx = s.x - camX;
        const sy = s.y - camY;
        if (sx < -40 || sx > viewW + 40 || sy < -40 || sy > viewH + 40) continue;

        const t = i / len;
        const r = this.getRadius(i);
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = lerpColor(this.bodyColor, this.tailColor, t);
        ctx.fill();

        // Subtle inner glow
        if (i % 3 === 0) {
          ctx.beginPath();
          ctx.arc(sx, sy, r * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fill();
        }
      }

      // Draw head
      const h = this.segments[0];
      const hx = h.x - camX;
      const hy = h.y - camY;
      const hr = this.getRadius(0);

      // Head glow
      const glow = ctx.createRadialGradient(hx, hy, hr * 0.3, hx, hy, hr * 2.5);
      glow.addColorStop(0, this.headColor + '40');
      glow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(hx, hy, hr * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Head body
      ctx.beginPath();
      ctx.arc(hx, hy, hr, 0, Math.PI * 2);
      ctx.fillStyle = this.headColor;
      ctx.fill();

      // Eyes
      const eyeOff = hr * 0.45;
      const eyeR = hr * 0.28;
      const perpAngle = this.angle + Math.PI / 2;
      for (const side of [-1, 1]) {
        const ex = hx + Math.cos(perpAngle) * eyeOff * side + Math.cos(this.angle) * hr * 0.3;
        const ey = hy + Math.sin(perpAngle) * eyeOff * side + Math.sin(this.angle) * hr * 0.3;
        ctx.beginPath();
        ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        // Pupil
        ctx.beginPath();
        ctx.arc(ex + Math.cos(this.angle) * eyeR * 0.3, ey + Math.sin(this.angle) * eyeR * 0.3, eyeR * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#111';
        ctx.fill();
      }
    }
  }

  // ─── Color helpers ──────────────────────────────────────────────────
  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  }

  function lerpColor(c1, c2, t) {
    const [r1, g1, b1] = hexToRgb(c1);
    const [r2, g2, b2] = hexToRgb(c2);
    const r = Math.round(lerp(r1, r2, t));
    const g = Math.round(lerp(g1, g2, t));
    const b = Math.round(lerp(b1, b2, t));
    return `rgb(${r},${g},${b})`;
  }

  // ─── Particles ──────────────────────────────────────────────────────
  function spawnParticles(px, py, color, count) {
    for (let i = 0; i < (count || 12); i++) {
      const a = randF(0, Math.PI * 2);
      const spd = randF(40, 160);
      particles.push({
        x: px, y: py,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: 1, color,
        size: randF(2, 5),
      });
    }
  }

  // ─── Stars ──────────────────────────────────────────────────────────
  function generateStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * ARENA_W,
        y: Math.random() * ARENA_H,
        size: randF(0.5, 2),
        alpha: randF(0.1, 0.5),
        twinkle: randF(0.005, 0.02),
        phase: randF(0, Math.PI * 2),
      });
    }
  }

  // ─── Food spawning ──────────────────────────────────────────────────
  function spawnFood() {
    const margin = 80;
    const x = randF(margin, ARENA_W - margin);
    const y = randF(margin, ARENA_H - margin);
    const isGold = Math.random() < GOLD_CHANCE;
    food.push({
      x, y,
      radius: isGold ? 7 : FOOD_RADIUS,
      color: isGold ? C.orbGold : C.orbEnergy,
      value: isGold ? GOLD_VALUE : FOOD_VALUE,
      pulse: randF(0, Math.PI * 2),
      isGold,
    });
  }

  // ─── Song orb spawning ──────────────────────────────────────────────
  function shouldSpawnSongOrb() {
    if (trackPool.length === 0) return false;
    if (songOrbs.length >= MAX_SONG_ORBS) return false;
    if (!player || player.length < SONG_ORB_FIRST) return false;
    const surplus = orbsEaten - (SONG_ORB_FIRST - INITIAL_LENGTH);
    if (surplus < 0) return false;
    if (surplus % SONG_ORB_INTERVAL !== 0 && songOrbs.length > 0) return false;
    return Math.random() < SONG_ORB_CHANCE;
  }

  function nextTrack() {
    if (trackPool.length === 0) return null;
    const t = trackPool[trackIdx % trackPool.length];
    trackIdx++;
    return t;
  }

  function spawnSongOrb() {
    const track = nextTrack();
    if (!track) return;
    const margin = 200;
    songOrbs.push({
      x: randF(margin, ARENA_W - margin),
      y: randF(margin, ARENA_H - margin),
      radius: SONG_ORB_RADIUS,
      pulse: randF(0, Math.PI * 2),
      ringPhase: randF(0, Math.PI * 2),
      track,
    });
  }

  function scEmbedUrl(trackUrl) {
    return 'https://w.soundcloud.com/player/?url=' +
      encodeURIComponent(trackUrl) +
      '&color=%239333ea&auto_play=true&hide_related=true&show_comments=false' +
      '&show_reposts=false&show_teaser=false';
  }

  // ─── CPU AI ─────────────────────────────────────────────────────────
  function updateCPU(worm, dt) {
    if (!worm.alive) return;

    worm.aiTimer -= dt;
    worm.aiStateTimer -= dt;

    // State transitions
    if (worm.aiStateTimer <= 0) {
      // Check for nearby threats (other worm heads close to our body)
      let threatened = false;
      const allWorms = [player, ...cpuWorms].filter(w => w && w.alive && w !== worm);
      for (const other of allWorms) {
        const d = dist(worm.head.x, worm.head.y, other.head.x, other.head.y);
        if (d < 150 && other.length > worm.length * 0.7) {
          threatened = true;
          worm.aiTarget = { x: worm.head.x * 2 - other.head.x, y: worm.head.y * 2 - other.head.y };
          break;
        }
      }

      if (threatened) {
        worm.aiState = 'flee';
        worm.aiStateTimer = randF(1, 2.5);
      } else {
        // Find nearest food
        let nearest = null;
        let nearDist = 400; // search radius
        const allFood = [...food, ...deathFood];
        for (const f of allFood) {
          const d = dist(worm.head.x, worm.head.y, f.x, f.y);
          if (d < nearDist) {
            nearDist = d;
            nearest = f;
          }
        }

        if (nearest) {
          worm.aiState = 'chase';
          worm.aiTarget = nearest;
          worm.aiStateTimer = randF(1.5, 4);
        } else {
          worm.aiState = 'wander';
          worm.aiStateTimer = randF(2, 5);
          worm.aiWanderAngle = worm.angle + randF(-1.2, 1.2);
        }
      }
    }

    // Execute state
    let targetAngle = worm.angle;
    switch (worm.aiState) {
      case 'chase':
        if (worm.aiTarget) {
          targetAngle = Math.atan2(worm.aiTarget.y - worm.head.y, worm.aiTarget.x - worm.head.x);
        }
        worm.boosting = false;
        break;

      case 'flee':
        if (worm.aiTarget) {
          targetAngle = Math.atan2(worm.aiTarget.y - worm.head.y, worm.aiTarget.x - worm.head.x);
        }
        worm.boosting = worm.length > INITIAL_LENGTH + 5;
        break;

      case 'wander':
      default:
        // Wobble the wander angle slowly
        worm.aiWanderAngle += randF(-0.8, 0.8) * dt;
        targetAngle = worm.aiWanderAngle;
        worm.boosting = false;
        break;
    }

    // Edge avoidance — steer away from arena borders
    const edgeMargin = 200;
    const hx = worm.head.x, hy = worm.head.y;
    if (hx < edgeMargin) targetAngle = Math.atan2(Math.sin(targetAngle), Math.abs(Math.cos(targetAngle)));
    if (hx > ARENA_W - edgeMargin) targetAngle = Math.atan2(Math.sin(targetAngle), -Math.abs(Math.cos(targetAngle)));
    if (hy < edgeMargin) targetAngle = Math.atan2(Math.abs(Math.sin(targetAngle)), Math.cos(targetAngle));
    if (hy > ARENA_H - edgeMargin) targetAngle = Math.atan2(-Math.abs(Math.sin(targetAngle)), Math.cos(targetAngle));

    worm.targetAngle = targetAngle;
  }

  function spawnCPUWorm(colorIdx) {
    const margin = 300;
    const x = randF(margin, ARENA_W - margin);
    const y = randF(margin, ARENA_H - margin);
    const angle = randF(0, Math.PI * 2);
    const length = rand(CPU_MIN_LEN, CPU_MAX_LEN);
    return new Worm(x, y, angle, length, false, colorIdx);
  }

  // ─── Collision detection ────────────────────────────────────────────
  function checkCollisions() {
    if (!player || !player.alive) return;

    const allWorms = [player, ...cpuWorms.filter(w => w.alive)];

    // Check each worm's head against every other worm's body
    for (const worm of allWorms) {
      if (!worm.alive) continue;
      const hx = worm.head.x;
      const hy = worm.head.y;
      const hr = worm.getRadius(0);

      for (const other of allWorms) {
        if (other === worm || !other.alive) continue;

        // Skip first few segments of the other worm (head area)
        for (let i = 3; i < other.segments.length; i++) {
          const s = other.segments[i];
          const sr = other.getRadius(i);
          const d = dist(hx, hy, s.x, s.y);

          if (d < hr + sr - 2) {
            // Collision! This worm dies
            worm.die();
            if (worm.isPlayer) {
              sfxDeath();
              gameOver = true;
            }
            break;
          }
        }
        if (!worm.alive) break;
      }
    }

    // Arena edge collision for player
    const hx = player.head.x;
    const hy = player.head.y;
    if (hx <= 5 || hx >= ARENA_W - 5 || hy <= 5 || hy >= ARENA_H - 5) {
      player.die();
      sfxDeath();
      gameOver = true;
    }
  }

  // ─── Food collection ────────────────────────────────────────────────
  function checkFoodCollection() {
    const allWorms = [player, ...cpuWorms].filter(w => w && w.alive);

    for (const worm of allWorms) {
      const hx = worm.head.x;
      const hy = worm.head.y;
      const hr = worm.getRadius(0);

      // Regular food
      for (let i = food.length - 1; i >= 0; i--) {
        const f = food[i];
        if (dist(hx, hy, f.x, f.y) < hr + f.radius) {
          worm.targetLength += f.value;
          worm.totalEaten++;
          spawnParticles(f.x, f.y, f.color, 6);
          food.splice(i, 1);

          if (worm.isPlayer) {
            score += f.isGold ? 30 : 10;
            orbsEaten++;
            f.isGold ? sfxGold() : sfxEat();
            updateHUD();

            // Maybe spawn song orb
            if (shouldSpawnSongOrb()) {
              spawnSongOrb();
            }
          }
        }
      }

      // Death food
      for (let i = deathFood.length - 1; i >= 0; i--) {
        const f = deathFood[i];
        if (dist(hx, hy, f.x, f.y) < hr + f.radius) {
          worm.targetLength += f.value;
          spawnParticles(f.x, f.y, f.color, 4);
          deathFood.splice(i, 1);

          if (worm.isPlayer) {
            score += 5;
            orbsEaten++;
            sfxEat();
            updateHUD();
          }
        }
      }

      // Song orbs (player only)
      if (worm.isPlayer) {
        for (let i = songOrbs.length - 1; i >= 0; i--) {
          const o = songOrbs[i];
          if (dist(hx, hy, o.x, o.y) < hr + o.radius) {
            worm.targetLength += 5;
            score += 100;
            orbsEaten++;
            sfxSong();
            spawnParticles(o.x, o.y, C.orbSong, 16);
            songsUnlocked.push(o.track.name);
            showNowPlaying(o.track);
            songOrbs.splice(i, 1);
            updateHUD();

            songNotification = {
              text: '♫ ' + o.track.name,
              alpha: 2,
              y: 0,
            };
          }
        }
      }
    }

    // Maintain food count
    while (food.length < FOOD_COUNT) spawnFood();
  }

  // ─── Camera ─────────────────────────────────────────────────────────
  function updateCamera() {
    if (!player || !player.alive) return;
    const targetX = player.head.x - viewW / 2;
    const targetY = player.head.y - viewH / 2;
    camera.x += (targetX - camera.x) * 0.08;
    camera.y += (targetY - camera.y) * 0.08;
    camera.x = clamp(camera.x, 0, ARENA_W - viewW);
    camera.y = clamp(camera.y, 0, ARENA_H - viewH);
  }

  // ─── Drawing ────────────────────────────────────────────────────────
  function drawBackground() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, viewW, viewH);

    // Grid
    const gridSize = 80;
    ctx.strokeStyle = C.gridLine;
    ctx.lineWidth = 0.5;
    const offX = -(camera.x % gridSize);
    const offY = -(camera.y % gridSize);
    ctx.beginPath();
    for (let x = offX; x < viewW; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, viewH);
    }
    for (let y = offY; y < viewH; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(viewW, y);
    }
    ctx.stroke();

    // Stars with parallax
    const time = performance.now() * 0.001;
    for (const s of stars) {
      const sx = s.x - camera.x * 0.6; // parallax
      const sy = s.y - camera.y * 0.6;
      // Wrap stars
      const wx = ((sx % viewW) + viewW) % viewW;
      const wy = ((sy % viewH) + viewH) % viewH;
      const a = s.alpha + Math.sin(time * s.twinkle + s.phase) * 0.15;
      ctx.beginPath();
      ctx.arc(wx, wy, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,200,255,${clamp(a, 0, 1)})`;
      ctx.fill();
    }
  }

  function drawArenaEdge() {
    // Draw red/purple glow near arena edges visible in viewport
    const glowW = 60;
    const edgeColor = 'rgba(255,60,60,0.25)';

    // Left edge
    if (camera.x < glowW) {
      const grad = ctx.createLinearGradient(0 - camera.x, 0, glowW - camera.x, 0);
      grad.addColorStop(0, edgeColor);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, glowW - camera.x, viewH);
    }
    // Right edge
    if (camera.x + viewW > ARENA_W - glowW) {
      const startX = ARENA_W - glowW - camera.x;
      const grad = ctx.createLinearGradient(startX, 0, ARENA_W - camera.x, 0);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, edgeColor);
      ctx.fillStyle = grad;
      ctx.fillRect(startX, 0, glowW, viewH);
    }
    // Top edge
    if (camera.y < glowW) {
      const grad = ctx.createLinearGradient(0, 0 - camera.y, 0, glowW - camera.y);
      grad.addColorStop(0, edgeColor);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, viewW, glowW - camera.y);
    }
    // Bottom edge
    if (camera.y + viewH > ARENA_H - glowW) {
      const startY = ARENA_H - glowW - camera.y;
      const grad = ctx.createLinearGradient(0, startY, 0, ARENA_H - camera.y);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, edgeColor);
      ctx.fillStyle = grad;
      ctx.fillRect(0, startY, viewW, glowW);
    }
  }

  function drawFood() {
    const time = performance.now() * 0.001;
    const allFood = [...food, ...deathFood];

    for (const f of allFood) {
      const sx = f.x - camera.x;
      const sy = f.y - camera.y;
      if (sx < -20 || sx > viewW + 20 || sy < -20 || sy > viewH + 20) continue;

      const pulseFactor = 1 + Math.sin(time * 3 + f.pulse) * 0.2;
      const r = f.radius * pulseFactor;

      // Glow
      ctx.beginPath();
      ctx.arc(sx, sy, r * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = f.color + '18';
      ctx.fill();

      // Body
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = f.color;
      ctx.fill();

      // Highlight
      ctx.beginPath();
      ctx.arc(sx - r * 0.2, sy - r * 0.2, r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fill();
    }
  }

  function drawSongOrbs() {
    const time = performance.now() * 0.001;

    for (const o of songOrbs) {
      const sx = o.x - camera.x;
      const sy = o.y - camera.y;
      if (sx < -50 || sx > viewW + 50 || sy < -50 || sy > viewH + 50) continue;

      const pulse = 1 + Math.sin(time * 2 + o.pulse) * 0.15;
      const r = o.radius * pulse;

      // Outer ring
      ctx.beginPath();
      ctx.arc(sx, sy, r * 2.2, 0, Math.PI * 2);
      const ringGrad = ctx.createRadialGradient(sx, sy, r, sx, sy, r * 2.2);
      ringGrad.addColorStop(0, C.orbSongGlow + '40');
      ringGrad.addColorStop(0.6, C.orbSongRing + '20');
      ringGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = ringGrad;
      ctx.fill();

      // Rotating ring
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(time * 1.5 + o.ringPhase);
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.6, 0, Math.PI * 0.8);
      ctx.strokeStyle = C.orbSongRing + '60';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.6, Math.PI, Math.PI * 1.8);
      ctx.stroke();
      ctx.restore();

      // Core orb
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      const coreGrad = ctx.createRadialGradient(sx - r * 0.2, sy - r * 0.2, r * 0.1, sx, sy, r);
      coreGrad.addColorStop(0, '#fff');
      coreGrad.addColorStop(0.4, C.orbSong);
      coreGrad.addColorStop(1, C.orbSongGlow);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // Music note
      ctx.font = `bold ${Math.round(r * 0.9)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText('♫', sx, sy);
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const sx = p.x - camera.x;
      const sy = p.y - camera.y;
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.beginPath();
      ctx.arc(sx, sy, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMinimap() {
    const mm = MINIMAP_SIZE;
    const mx = viewW - mm - MINIMAP_MARGIN;
    const my = viewH - mm - MINIMAP_MARGIN;
    const scale = mm / ARENA_W;

    // Background
    ctx.fillStyle = 'rgba(4,1,10,0.85)';
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(mx, my, mm, mm * (ARENA_H / ARENA_W), 6);
    ctx.fill();
    ctx.stroke();

    const mmH = mm * (ARENA_H / ARENA_W);

    // Food dots
    ctx.fillStyle = C.orbEnergy + '60';
    for (const f of food) {
      const fx = mx + f.x * scale;
      const fy = my + f.y * scale;
      ctx.fillRect(fx, fy, 1, 1);
    }

    // Song orbs
    ctx.fillStyle = C.orbSong;
    for (const o of songOrbs) {
      ctx.beginPath();
      ctx.arc(mx + o.x * scale, my + o.y * scale, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // CPU worms
    for (const w of cpuWorms) {
      if (!w.alive) continue;
      ctx.fillStyle = w.headColor;
      ctx.beginPath();
      ctx.arc(mx + w.head.x * scale, my + w.head.y * scale, 2, 0, Math.PI * 2);
      ctx.fill();

      // Body trail
      ctx.strokeStyle = w.bodyColor + '80';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < w.segments.length; i += 4) {
        const s = w.segments[i];
        if (i === 0) ctx.moveTo(mx + s.x * scale, my + s.y * scale);
        else ctx.lineTo(mx + s.x * scale, my + s.y * scale);
      }
      ctx.stroke();
    }

    // Player
    if (player && player.alive) {
      // Body trail
      ctx.strokeStyle = C.wormBody + '80';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < player.segments.length; i += 3) {
        const s = player.segments[i];
        if (i === 0) ctx.moveTo(mx + s.x * scale, my + s.y * scale);
        else ctx.lineTo(mx + s.x * scale, my + s.y * scale);
      }
      ctx.stroke();

      // Head (bright)
      ctx.fillStyle = C.wormHead;
      ctx.beginPath();
      ctx.arc(mx + player.head.x * scale, my + player.head.y * scale, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Viewport indicator
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      mx + camera.x * scale,
      my + camera.y * scale,
      viewW * scale,
      viewH * scale
    );
  }

  function drawHUDCanvas() {
    // Score + length display on canvas
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const pad = 14;
    const lines = [
      `Score: ${score}`,
      `Length: ${player ? player.length : 0}`,
      `Worms: ${cpuWorms.filter(w => w.alive).length}`,
    ];
    if (songsUnlocked.length > 0) {
      lines.push(`Songs: ${songsUnlocked.length}`);
    }

    // Background for HUD
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(pad - 4, pad - 4, 130, lines.length * 20 + 8, 6);
    ctx.fill();

    ctx.fillStyle = C.text;
    lines.forEach((line, i) => {
      ctx.fillText(line, pad, pad + i * 20);
    });

    // Song notification
    if (songNotification) {
      const sn = songNotification;
      const alpha = clamp(sn.alpha, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = C.orbSong;
      ctx.fillText(sn.text, viewW / 2, viewH * 0.2 - sn.y);
      ctx.globalAlpha = 1;
    }
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(4,1,10,0.75)';
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.fillStyle = C.wormHead;
    ctx.fillText('GAME OVER', viewW / 2, viewH / 2 - 40);

    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillStyle = C.text;
    ctx.fillText(`Score: ${score}  •  Length: ${player ? player.length : 0}`, viewW / 2, viewH / 2 + 10);

    if (songsUnlocked.length > 0) {
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillStyle = C.orbSong;
      ctx.fillText(`Songs unlocked: ${songsUnlocked.length}`, viewW / 2, viewH / 2 + 40);
    }

    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = C.muted;
    ctx.fillText('Click or tap to restart', viewW / 2, viewH / 2 + 75);
  }

  function drawStartScreen() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, viewW, viewH);

    // Draw some stars
    const time = performance.now() * 0.001;
    for (let i = 0; i < 80; i++) {
      const x = (Math.sin(i * 137.5) * 0.5 + 0.5) * viewW;
      const y = (Math.cos(i * 247.3) * 0.5 + 0.5) * viewH;
      const a = 0.2 + Math.sin(time * 0.5 + i) * 0.15;
      ctx.beginPath();
      ctx.arc(x, y, randF(0.5, 1.5), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,200,255,${a})`;
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillStyle = C.wormHead;
    ctx.fillText('COSMIC WORM', viewW / 2, viewH / 2 - 40);

    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = C.text;
    ctx.fillText('Guide your worm with the mouse. Eat orbs to grow.', viewW / 2, viewH / 2 + 5);
    ctx.fillText('Avoid hitting other worms with your head.', viewW / 2, viewH / 2 + 25);
    ctx.fillText('Grow long enough and song orbs will appear.', viewW / 2, viewH / 2 + 45);

    ctx.font = '600 16px system-ui, sans-serif';
    ctx.fillStyle = C.orbEnergy;
    ctx.fillText('Click or Tap to Start', viewW / 2, viewH / 2 + 85);

    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = C.muted;
    ctx.fillText('Hold mouse button to boost (costs length)', viewW / 2, viewH / 2 + 115);
  }

  // ─── Update ─────────────────────────────────────────────────────────
  function update(dt) {
    if (!gameRunning || gameOver) return;

    // Update player direction (toward mouse)
    if (player && player.alive) {
      player.targetAngle = Math.atan2(
        mouseWorld.y - player.head.y,
        mouseWorld.x - player.head.x
      );
      player.boosting = boosting;
      player.update(dt);
    }

    // Update CPU worms
    for (const w of cpuWorms) {
      if (w.alive) {
        updateCPU(w, dt);
        w.update(dt);
      }
    }

    // Respawn dead CPU worms
    for (let i = 0; i < cpuWorms.length; i++) {
      if (!cpuWorms[i].alive) {
        cpuWorms[i]._deathTimer = (cpuWorms[i]._deathTimer || 0) + dt * 1000;
        if (cpuWorms[i]._deathTimer > CPU_RESPAWN_DELAY) {
          cpuWorms[i] = spawnCPUWorm(i);
        }
      }
    }

    // Collisions
    checkCollisions();
    checkFoodCollection();

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt * 2;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Song notification
    if (songNotification) {
      songNotification.alpha -= dt * 0.5;
      songNotification.y += dt * 30;
      if (songNotification.alpha <= 0) songNotification = null;
    }

    // Death food fade
    for (let i = deathFood.length - 1; i >= 0; i--) {
      deathFood[i]._age = (deathFood[i]._age || 0) + dt;
      if (deathFood[i]._age > 30) { // fade after 30s
        deathFood.splice(i, 1);
      }
    }

    // Camera
    updateCamera();
    updateHUD();
  }

  // ─── Render ─────────────────────────────────────────────────────────
  function render() {
    drawBackground();
    drawArenaEdge();
    drawFood();
    drawSongOrbs();

    // Draw CPU worms
    for (const w of cpuWorms) {
      w.draw(ctx, camera.x, camera.y);
    }

    // Draw player on top
    if (player) {
      player.draw(ctx, camera.x, camera.y);
    }

    drawParticles();
    drawMinimap();
    drawHUDCanvas();

    if (gameOver) {
      drawGameOver();
    }
  }

  // ─── Game loop ──────────────────────────────────────────────────────
  function gameLoop(timestamp) {
    animFrame = requestAnimationFrame(gameLoop);

    const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
    lastTime = timestamp;

    if (!gameRunning) {
      drawStartScreen();
      return;
    }

    update(dt);
    render();
  }

  // ─── HUD ────────────────────────────────────────────────────────────
  function updateHUD() {
    const scoreEl = document.getElementById('worm-score');
    const songEl = document.getElementById('worm-songs');
    const highEl = document.getElementById('worm-high');
    const lenEl = document.getElementById('worm-length');
    if (scoreEl) scoreEl.textContent = `Score: ${score}`;
    if (songEl) songEl.textContent = `Songs: ${songsUnlocked.length}`;
    if (highEl) highEl.textContent = `Best: ${highScore}`;
    if (lenEl) lenEl.textContent = `Length: ${player ? player.length : 0}`;
  }

  // ─── Now Playing ────────────────────────────────────────────────────
  function showNowPlaying(track) {
    if (!scFrame || !nowPlayingBar) return;
    scFrame.src = scEmbedUrl(track.url);
    nowPlayingTitle.textContent = track.name;
    nowPlayingBar.style.display = 'flex';
  }

  function hideNowPlaying() {
    if (!nowPlayingBar) return;
    nowPlayingBar.style.display = 'none';
    if (scFrame) scFrame.src = 'about:blank';
  }

  // ─── Init / Reset ──────────────────────────────────────────────────
  function initGame() {
    score = 0;
    orbsEaten = 0;
    songsUnlocked = [];
    particles = [];
    food = [];
    deathFood = [];
    songOrbs = [];
    songNotification = null;
    gameOver = false;

    // Spawn player in center
    player = new Worm(ARENA_W / 2, ARENA_H / 2, 0, INITIAL_LENGTH, true, 0);
    mouseWorld = { x: ARENA_W / 2 + 200, y: ARENA_H / 2 };

    // Spawn CPU worms
    cpuWorms = [];
    for (let i = 0; i < CPU_COUNT; i++) {
      cpuWorms.push(spawnCPUWorm(i));
    }

    // Spawn food
    for (let i = 0; i < FOOD_COUNT; i++) spawnFood();

    // Generate stars
    generateStars();

    // Camera
    camera.x = player.head.x - viewW / 2;
    camera.y = player.head.y - viewH / 2;

    gameRunning = true;
    updateHUD();
    hideNowPlaying();
  }

  // ─── Input ──────────────────────────────────────────────────────────
  function setupInput() {
    // Mouse move — track position on canvas, convert to world coords
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;
      mouseWorld.x = cx + camera.x;
      mouseWorld.y = cy + camera.y;
    });

    // Boost on mouse down
    canvas.addEventListener('mousedown', (e) => {
      initAudio();
      if (!gameRunning) {
        initGame();
        return;
      }
      if (gameOver) {
        highScore = Math.max(highScore, score);
        initGame();
        return;
      }
      boosting = true;
    });

    canvas.addEventListener('mouseup', () => { boosting = false; });
    canvas.addEventListener('mouseleave', () => { boosting = false; });

    // Touch support
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      initAudio();
      if (!gameRunning) {
        initGame();
        return;
      }
      if (gameOver) {
        highScore = Math.max(highScore, score);
        initGame();
        return;
      }
      const touch = e.touches[0];
      updateTouchTarget(touch);
      boosting = true;
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        updateTouchTarget(e.touches[0]);
      }
    }, { passive: false });

    canvas.addEventListener('touchend', () => { boosting = false; });

    // Keyboard boost
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        boosting = true;
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space') boosting = false;
    });
  }

  function updateTouchTarget(touch) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (touch.clientX - rect.left) * scaleX;
    const cy = (touch.clientY - rect.top) * scaleY;
    mouseWorld.x = cx + camera.x;
    mouseWorld.y = cy + camera.y;
  }

  // ─── Resize ─────────────────────────────────────────────────────────
  function resize() {
    if (!canvas || !overlay) return;
    const container = canvas.parentElement;
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    viewW = w;
    viewH = h;
  }

  // ─── Build UI ───────────────────────────────────────────────────────
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

    const panel = document.createElement('div');
    panel.style.cssText = `
      width:min(960px,calc(100% - 1rem));max-height:calc(100vh - 1rem);
      background:${C.panelBg};border:1px solid ${C.border};
      border-radius:18px;box-shadow:0 0 40px rgba(147,51,234,.22);
      padding:0.75rem;display:flex;flex-direction:column;overflow:hidden;
    `;

    /* ── Header ── */
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem;flex-wrap:wrap;gap:.5rem;';

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
    wrap.style.cssText = `
      border-radius:14px;border:1px solid rgba(99,102,241,.45);
      overflow:hidden;background:${C.bg};flex:1;min-height:0;
      position:relative;aspect-ratio:16/10;max-height:calc(100vh - 10rem);
    `;
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;cursor:none;';
    wrap.appendChild(canvas);
    panel.appendChild(wrap);

    /* ── HUD bar ── */
    const hud = document.createElement('div');
    hud.id = 'worm-hud';
    hud.style.cssText = `display:flex;justify-content:space-between;align-items:center;margin-top:.4rem;font-size:.78rem;color:${C.muted};flex-wrap:wrap;gap:.3rem;`;
    hud.innerHTML = `
      <span id="worm-score">Score: 0</span>
      <span id="worm-songs">Songs: 0</span>
      <span id="worm-high">Best: 0</span>
      <span id="worm-length">Length: ${INITIAL_LENGTH}</span>
    `;
    panel.appendChild(hud);

    /* ── Now Playing bar ── */
    nowPlayingBar = document.createElement('div');
    nowPlayingBar.style.cssText = `
      display:none;align-items:center;gap:.6rem;margin-top:.4rem;
      padding:.5rem .7rem;border-radius:12px;
      background:linear-gradient(135deg,rgba(168,85,247,.15),rgba(147,51,234,.08));
      border:1px solid rgba(168,85,247,.3);
    `;

    const npIcon = document.createElement('span');
    npIcon.textContent = '♫';
    npIcon.style.cssText = 'font-size:1.1rem;color:#c084fc;flex-shrink:0;';

    nowPlayingTitle = document.createElement('span');
    nowPlayingTitle.style.cssText = 'flex:1;font-size:.78rem;color:#e2d9f3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

    nowPlayingClose = document.createElement('button');
    nowPlayingClose.textContent = '✕';
    nowPlayingClose.style.cssText = 'background:none;border:none;color:#9d8ec4;cursor:pointer;font-size:.9rem;padding:0 .2rem;flex-shrink:0;';
    nowPlayingClose.addEventListener('click', hideNowPlaying);

    nowPlayingBar.appendChild(npIcon);
    nowPlayingBar.appendChild(nowPlayingTitle);
    nowPlayingBar.appendChild(nowPlayingClose);
    panel.appendChild(nowPlayingBar);

    /* ── Hidden SC iframe ── */
    scFrame = document.createElement('iframe');
    scFrame.style.cssText = 'width:0;height:0;border:0;position:absolute;left:-9999px;';
    scFrame.allow = 'autoplay';
    scFrame.src = 'about:blank';
    panel.appendChild(scFrame);

    /* ── Controls hint ── */
    const hint = document.createElement('p');
    hint.style.cssText = `font-size:.7rem;color:${C.muted};margin-top:.3rem;text-align:center;opacity:.6;`;
    hint.textContent = 'Mouse to steer • Hold click/space to boost • Eat orbs to grow • Avoid other worms';
    panel.appendChild(hint);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  }

  // ─── Open / Close ───────────────────────────────────────────────────
  function openGame() {
    if (!overlay) buildUI();
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    resize();
    setupInput();

    ctx = canvas.getContext('2d');
    lastTime = performance.now();
    gameRunning = false;
    gameOver = false;

    // Load tracks
    if (allTracks.length === 0) {
      fetch('starmilk-tracks.json')
        .then(r => r.json())
        .then(data => {
          allTracks = data;
          trackPool = shuffle(allTracks);
          trackIdx = 0;
        })
        .catch(() => {});
    }

    // Start render loop
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = requestAnimationFrame(gameLoop);

    // Listen for resize
    window.addEventListener('resize', resize);
  }

  function closeGame() {
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
    gameRunning = false;
    window.removeEventListener('resize', resize);
    hideNowPlaying();
    highScore = Math.max(highScore, score);
  }

  // ─── Launch button ──────────────────────────────────────────────────
  const launchBtn = document.getElementById('worm-game-launch');
  if (launchBtn) {
    launchBtn.addEventListener('click', openGame);
  }

  // ─── Testing hooks ──────────────────────────────────────────────────
  window.render_game_to_text = function() {
    return JSON.stringify({
      mode: gameOver ? 'gameover' : (gameRunning ? 'playing' : 'menu'),
      player: player ? { x: Math.round(player.head.x), y: Math.round(player.head.y), length: player.length, alive: player.alive } : null,
      cpuWorms: cpuWorms.map(w => ({ alive: w.alive, x: Math.round(w.head.x), y: Math.round(w.head.y), length: w.length })),
      score, foodCount: food.length, songOrbs: songOrbs.length,
    });
  };

  window.advanceTime = function(ms) {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i++) update(1 / 60);
    render();
  };

})();
