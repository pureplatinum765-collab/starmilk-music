(() => {
  'use strict';

  // ─── Safe storage wrapper (fallback when sandboxed) ───────────
  const _ls = (function() { const m = {}; const s = window['local'+'Storage']; return { getItem(k) { try { return s.getItem(k); } catch { return m[k] ?? null; } }, setItem(k, v) { try { s.setItem(k, v); } catch { m[k] = v; } } }; })();


  /* ═══════════════════════════════════════════════════════════════
   * THE ORCHARD — STARMILK Living Catalog
   * Larger tap targets, hover feedback, procedural sound effects,
   * better info panel with fade-in and boundary clamping,
   * varied fruit colors/shapes, reactive wind particles,
   * mobile optimization with pulsing hint.
   * ═══════════════════════════════════════════════════════════════ */

  const canvas = document.getElementById('orchard-canvas');
  const section = document.getElementById('orchard');
  const info = document.getElementById('orchard-fruit-info');
  if (!canvas || !section || !info) return;

  const ctx = canvas.getContext('2d');

  // ─── Song data (unchanged) ────────────────────────────────────
  const SONGS = [
    { name: 'TRIBE STAR MILK', url: 'https://soundcloud.com/star-milk-645735333/tribe-star-milk' },
    { name: 'HONEY IN THE WOUND', url: 'https://soundcloud.com/star-milk-645735333/honey-in-the-wound' },
    { name: 'Shifting', url: 'https://soundcloud.com/star-milk-645735333/shifting' },
    { name: 'Rivers Pull', url: 'https://soundcloud.com/star-milk-645735333/rivers-pull-new-version' },
    { name: 'The Trembling Becomes the Truth', url: 'https://soundcloud.com/star-milk-645735333/the-trembling-becomes-the-truth' },
    { name: 'VELVET HONEY THUNDER', url: 'https://soundcloud.com/star-milk-645735333/velvet-honey-thunder' },
    { name: 'COSMIC FLOWS', url: 'https://soundcloud.com/star-milk-645735333/cosmic-flows' },
    { name: 'Beautifully Human', url: 'https://soundcloud.com/star-milk-645735333/beautifully-human' }
  ];

  // ─── Fruit variety: different colors/shapes per song ──────────
  const FRUIT_STYLES = [
    { color: '#f59e0b', glow: '#ffcc44', shape: 'apple', label: 'Golden Apple' },       // TRIBE STAR MILK
    { color: '#d97706', glow: '#fbbf24', shape: 'apple', label: 'Honey Apple' },         // HONEY IN THE WOUND
    { color: '#8b5cf6', glow: '#a78bfa', shape: 'berry', label: 'Purple Berry' },        // Shifting
    { color: '#0d9488', glow: '#2dd4bf', shape: 'pear', label: 'Teal Pear' },            // Rivers Pull
    { color: '#ec4899', glow: '#f472b6', shape: 'berry', label: 'Rose Berry' },          // The Trembling
    { color: '#f59e0b', glow: '#fcd34d', shape: 'pear', label: 'Golden Pear' },          // VELVET HONEY THUNDER
    { color: '#6366f1', glow: '#818cf8', shape: 'apple', label: 'Cosmic Apple' },        // COSMIC FLOWS
    { color: '#10b981', glow: '#34d399', shape: 'berry', label: 'Emerald Berry' },       // Beautifully Human
  ];

  // ─── Mobile detection ─────────────────────────────────────────
  const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 800;
  const FRUIT_SCALE = isMobile ? 1.5 : 1.0;
  const HIT_EXPAND = isMobile ? 16 : 9;

  // ─── Time & palette ───────────────────────────────────────────
  const hour = new Date().getHours();
  const isDay = hour >= 7 && hour <= 18;
  const palette = isDay
    ? { skyTop: '#2c1f22', skyBottom: '#8f6332', haze: 'rgba(246, 186, 100, 0.32)', soil: '#231912' }
    : { skyTop: '#0a0a0f', skyBottom: '#181328', haze: 'rgba(116, 85, 160, 0.2)', soil: '#120d17' };

  // ─── Visitor tracking ──────────────────────────────────────────
  const visitorKey = 'starmilk_orchard_visits';
  const visits = Number(_ls.getItem(visitorKey) || 0);
  _ls.setItem(visitorKey, String(visits + 1));
  const returnVisitor = visits > 0;

  // ─── Audio engine ─────────────────────────────────────────────
  let audioCtx = null;
  let hasUserGesture = false;

  function ensureAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) { /* silent */ }
  }

  function sfxPluck(pitch) {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'triangle';
      o.frequency.value = pitch || 520;
      o.frequency.exponentialRampToValueAtTime(pitch * 0.4, audioCtx.currentTime + 0.3);
      g.gain.value = 0.06;
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
      o.connect(g).connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + 0.35);
    } catch (_) { /* silent */ }
  }

  function sfxLand() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = 90;
      g.gain.value = 0.04;
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
      o.connect(g).connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + 0.2);
    } catch (_) { /* silent */ }
  }

  function sfxAmbientChime() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      const notes = [523, 659, 784, 880, 1046];
      o.frequency.value = notes[Math.floor(Math.random() * notes.length)];
      g.gain.value = 0.012;
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.5);
      o.connect(g).connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + 1.5);
    } catch (_) { /* silent */ }
  }

  // ─── State ────────────────────────────────────────────────────
  const state = {
    width: 0,
    height: 0,
    time: 0,
    progress: returnVisitor ? 0.52 : 0.15,
    targetProgress: returnVisitor ? 0.68 : 0.24,
    trees: [],
    fruits: [],
    particles: [],
    activeInfo: null,
    hoverFruit: null,
    mouseX: -999,
    mouseY: -999,
    showHint: !returnVisitor,
    hintAlpha: 1,
    lastChimeTime: 0,
    infoFadeAlpha: 0,
    infoFadeTarget: 0,
  };

  let rafId = 0;
  let isInView = true;

  // ═══════════════════════════════════════════════════════════════
  //  ORCHARD BUILDING
  // ═══════════════════════════════════════════════════════════════

  function createTree(index, total) {
    const lane = (index + 0.5) / total;
    const spread = (Math.random() - 0.5) * 0.08;
    const x = lane + spread;
    const height = 0.26 + Math.random() * 0.27;
    const branchCount = 2 + Math.floor(Math.random() * 3);
    const branches = Array.from({ length: branchCount }, (_, i) => ({
      y: 0.28 + i * (0.58 / branchCount),
      length: 0.12 + Math.random() * 0.11,
      dir: i % 2 === 0 ? -1 : 1,
      bend: 0.8 + Math.random() * 1.3
    }));
    return { x, height, branches, swaySeed: Math.random() * Math.PI * 2 };
  }

  function buildOrchard() {
    const treeCount = returnVisitor ? 6 : 4;
    state.trees = Array.from({ length: treeCount }, (_, i) => createTree(i, treeCount));
    state.fruits = SONGS.map((song, i) => {
      const tree = state.trees[i % state.trees.length];
      const b = tree.branches[i % tree.branches.length];
      const style = FRUIT_STYLES[i % FRUIT_STYLES.length];
      const baseR = 6 + (i % 3);
      return {
        song,
        tree,
        style,
        localX: b.dir * (0.08 + (i % 3) * 0.022),
        localY: b.y + 0.05 + ((i % 2) * 0.025),
        r: baseR * FRUIT_SCALE,
        glow: 0.6 + Math.random() * 0.4,
        visibleAt: returnVisitor ? 0.2 + i * 0.05 : 0.34 + i * 0.07,
        phase: 'hanging',
        dropVy: 0,
        split: 0,
        x: 0,
        y: 0,
        hoverScale: 0, // 0 to 1 for hover animation
        pitch: 440 + i * 60, // unique pitch per fruit
      };
    });

    // More visible particles
    state.particles = Array.from({ length: 80 }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.0004 + Math.random() * 0.001,
      drift: (Math.random() - 0.5) * 0.0006,
      size: 1 + Math.random() * 2.5,
      pulse: Math.random() * Math.PI * 2,
      brightness: 0.5 + Math.random() * 0.5,
    }));
  }

  // ═══════════════════════════════════════════════════════════════
  //  RESIZE
  // ═══════════════════════════════════════════════════════════════

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = rect.width;
    state.height = rect.height;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function orchardFloorY() {
    return state.height * 0.84;
  }

  // ═══════════════════════════════════════════════════════════════
  //  DRAWING
  // ═══════════════════════════════════════════════════════════════

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, state.height);
    g.addColorStop(0, palette.skyTop);
    g.addColorStop(0.65, palette.skyBottom);
    g.addColorStop(1, '#0b0814');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.fillStyle = palette.haze;
    ctx.beginPath();
    ctx.ellipse(state.width * 0.5, state.height * 0.28, state.width * 0.45, state.height * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    const floorY = orchardFloorY();
    ctx.fillStyle = palette.soil;
    ctx.fillRect(0, floorY, state.width, state.height - floorY);
    ctx.fillStyle = 'rgba(92, 62, 40, 0.25)';
    ctx.fillRect(0, floorY + 8, state.width, state.height - floorY);
  }

  function drawTree(tree, growth, wind) {
    const floorY = orchardFloorY();
    const baseX = tree.x * state.width;
    const trunkH = tree.height * state.height * growth;
    ctx.strokeStyle = 'rgba(104, 74, 52, 0.95)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX, floorY);
    ctx.lineTo(baseX + wind * 4, floorY - trunkH);
    ctx.stroke();

    for (const b of tree.branches) {
      const by = floorY - trunkH * b.y;
      const length = b.length * state.width * growth;
      const sway = Math.sin(state.time * 0.002 + tree.swaySeed + b.y * 9) * b.bend * wind;
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = 'rgba(128, 101, 76, 0.85)';
      ctx.beginPath();
      ctx.moveTo(baseX + wind * 2, by);
      ctx.quadraticCurveTo(baseX + b.dir * length * 0.45 + sway * 4, by - 8, baseX + b.dir * length + sway * 9, by - length * 0.16);
      ctx.stroke();
    }
  }

  function drawFruit(fruit, growth, wind) {
    if (state.progress < fruit.visibleAt) return;
    const floorY = orchardFloorY();
    const trunkH = fruit.tree.height * state.height * growth;
    const anchorY = floorY - trunkH * fruit.localY;
    const anchorX = fruit.tree.x * state.width + fruit.localX * state.width + wind * 12;

    if (fruit.phase === 'dropping') {
      fruit.dropVy += 0.22;
      fruit.y += fruit.dropVy;
      if (fruit.y >= floorY - fruit.r * 0.5) {
        fruit.y = floorY - fruit.r * 0.5;
        fruit.phase = 'split';
        sfxLand();
      }
    } else if (fruit.phase === 'split') {
      fruit.split = Math.min(1, fruit.split + 0.05);
    } else {
      fruit.x = anchorX;
      fruit.y = anchorY;
    }

    // Hover scale animation
    const isHovered = state.hoverFruit === fruit;
    fruit.hoverScale += ((isHovered ? 1 : 0) - fruit.hoverScale) * 0.12;

    const pulse = 0.55 + Math.sin(state.time * 0.004 + fruit.glow * 4) * 0.25;
    const style = fruit.style;
    const scale = 1 + fruit.hoverScale * 0.25;
    const drawR = fruit.r * scale;

    // Glow
    ctx.shadowBlur = 18 + fruit.hoverScale * 12;
    ctx.shadowColor = hexToRgba(style.glow, 0.55 + pulse * 0.4);

    if (fruit.phase === 'split') {
      ctx.fillStyle = hexToRgba(style.color, 0.72 + pulse * 0.25);
      const spread = 8 * fruit.split;
      ctx.beginPath();
      ctx.arc(fruit.x - spread, fruit.y, drawR, Math.PI * 0.45, Math.PI * 1.65);
      ctx.arc(fruit.x + spread, fruit.y, drawR, Math.PI * 1.35, Math.PI * 0.55, true);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 228, 172, 0.95)';
      ctx.font = `${11 * FRUIT_SCALE}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText('✦', fruit.x, fruit.y - 1);
    } else {
      ctx.fillStyle = hexToRgba(style.color, 0.72 + pulse * 0.25);

      if (style.shape === 'apple') {
        // Apple: circle with slight dip at top
        ctx.beginPath();
        ctx.arc(fruit.x, fruit.y, drawR + (fruit.phase === 'dropping' ? 1.8 : 0), 0, Math.PI * 2);
        ctx.fill();
        // Stem
        ctx.strokeStyle = 'rgba(104,74,52,.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(fruit.x, fruit.y - drawR);
        ctx.lineTo(fruit.x + 2, fruit.y - drawR - 4 * FRUIT_SCALE);
        ctx.stroke();
      } else if (style.shape === 'berry') {
        // Berry: smaller clustered circles
        const br = drawR * 0.65;
        ctx.beginPath();
        ctx.arc(fruit.x - br * 0.3, fruit.y - br * 0.2, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(fruit.x + br * 0.3, fruit.y - br * 0.2, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(fruit.x, fruit.y + br * 0.3, br, 0, Math.PI * 2);
        ctx.fill();
      } else if (style.shape === 'pear') {
        // Pear: egg/teardrop shape
        ctx.beginPath();
        ctx.ellipse(fruit.x, fruit.y + drawR * 0.15, drawR * 0.85, drawR * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Stem
        ctx.strokeStyle = 'rgba(104,74,52,.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(fruit.x, fruit.y - drawR * 1.1);
        ctx.lineTo(fruit.x + 2, fruit.y - drawR * 1.1 - 5 * FRUIT_SCALE);
        ctx.stroke();
      }

      // Highlight on fruit
      ctx.fillStyle = `rgba(255,255,255,${0.2 + fruit.hoverScale * 0.15})`;
      ctx.beginPath();
      ctx.arc(fruit.x - drawR * 0.25, fruit.y - drawR * 0.3, drawR * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  function drawParticles() {
    const wind = Math.sin(state.time * 0.0012) * 0.65;
    for (const p of state.particles) {
      p.y -= p.speed;
      p.x += p.drift + Math.sin(state.time * 0.0015 + p.pulse) * 0.0008;
      // Wind reaction: particles drift in the wind direction
      p.x += wind * 0.0004;
      if (p.y < -0.02) {
        p.y = 1.03;
        p.x = Math.random();
      }
      if (p.x < -0.04) p.x = 1.02;
      if (p.x > 1.04) p.x = -0.02;

      const alpha = (0.2 + (Math.sin(state.time * 0.003 + p.pulse) + 1) * 0.22) * p.brightness;
      // Firefly glow effect
      const grd = ctx.createRadialGradient(
        p.x * state.width, p.y * state.height, 0,
        p.x * state.width, p.y * state.height, p.size * 2.5
      );
      grd.addColorStop(0, `rgba(255, 233, 165, ${alpha})`);
      grd.addColorStop(1, `rgba(255, 233, 165, 0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.x * state.width, p.y * state.height, p.size * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ─── Mobile "tap me" hint ─────────────────────────────────────

  function drawHint() {
    if (!state.showHint || !isMobile) return;
    if (state.hintAlpha <= 0) return;

    // Pulse the hint
    const pulse = 0.5 + Math.sin(state.time * 0.004) * 0.5;
    const alpha = state.hintAlpha * (0.4 + pulse * 0.4);

    ctx.fillStyle = `rgba(252,211,77,${alpha})`;
    ctx.font = `${14 * FRUIT_SCALE}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Show near the first visible fruit
    const firstFruit = state.fruits.find(f => state.progress >= f.visibleAt && f.phase === 'hanging');
    if (firstFruit) {
      ctx.fillText('↑ Tap the fruit! ↑', firstFruit.x, firstFruit.y + firstFruit.r * 2.5 + 14);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  PROGRESS & RENDER LOOP
  // ═══════════════════════════════════════════════════════════════

  function inViewBoost() {
    const rect = section.getBoundingClientRect();
    const visible = rect.top < window.innerHeight * 0.8 && rect.bottom > window.innerHeight * 0.2;
    if (visible) {
      state.targetProgress = Math.min(1, state.targetProgress + 0.0009);
    } else {
      state.targetProgress = Math.min(1, state.targetProgress + 0.00022);
    }
    state.progress += (state.targetProgress - state.progress) * 0.015;
  }

  function render() {
    state.time += 16;
    inViewBoost();
    drawBackground();

    const wind = Math.sin(state.time * 0.0012) * 0.65;
    const growth = Math.min(1, 0.15 + state.progress);
    for (const tree of state.trees) drawTree(tree, growth, wind);
    for (const fruit of state.fruits) drawFruit(fruit, growth, wind);
    drawParticles();
    drawHint();

    // Update hover state
    updateHover();

    // Info panel fade animation
    if (state.infoFadeTarget > 0) {
      state.infoFadeAlpha = Math.min(1, state.infoFadeAlpha + 0.08);
    } else {
      state.infoFadeAlpha = Math.max(0, state.infoFadeAlpha - 0.08);
    }
    if (info && !info.hidden) {
      info.style.opacity = String(state.infoFadeAlpha);
    }

    // Ambient chime (every ~8 seconds)
    if (state.time - state.lastChimeTime > 8000 && hasUserGesture) {
      state.lastChimeTime = state.time;
      sfxAmbientChime();
    }

    rafId = requestAnimationFrame(render);
  }

  // ─── Hover detection (desktop) ────────────────────────────────

  function updateHover() {
    if (isMobile) return;
    let found = null;
    for (const fruit of state.fruits) {
      if (state.progress < fruit.visibleAt || fruit.phase === 'split') continue;
      const dx = state.mouseX - fruit.x;
      const dy = state.mouseY - fruit.y;
      const hitR = fruit.r + HIT_EXPAND + 8;
      if (dx * dx + dy * dy <= hitR * hitR) {
        found = fruit;
        break;
      }
    }
    state.hoverFruit = found;
    canvas.style.cursor = found ? 'pointer' : 'default';
  }

  // ═══════════════════════════════════════════════════════════════
  //  ANIMATION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  function canAnimate() {
    return !document.hidden && isInView;
  }

  function stopAnimation() {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function ensureAnimation() {
    if (!canAnimate() || rafId) return;
    rafId = requestAnimationFrame(render);
  }

  // ═══════════════════════════════════════════════════════════════
  //  INTERACTION
  // ═══════════════════════════════════════════════════════════════

  function eventPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const e = evt.touches ? evt.touches[0] : evt;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, rect };
  }

  function openFruitInfo(fruit, rect) {
    info.hidden = false;
    state.infoFadeTarget = 1;
    state.infoFadeAlpha = 0;
    info.style.opacity = '0';

    // Position below the fruit with a pointer
    let left = fruit.x;
    let top = fruit.y + fruit.r + 12;

    info.innerHTML = `<h3>${fruit.song.name}</h3><p style="font-size:.72rem;color:#ab96d4;margin-bottom:.3rem">${fruit.style.label}</p><a href="${fruit.song.url}" target="_blank" rel="noopener noreferrer">Listen on SoundCloud ↗</a>`;
    state.activeInfo = fruit;

    // Use transform to center
    info.style.transform = 'translate(-50%, 0)';
    info.style.left = `${left}px`;
    info.style.top = `${top}px`;

    // After render, clamp to boundaries
    requestAnimationFrame(() => {
      const panelRect = info.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();

      // Clamp left
      if (panelRect.left < canvasRect.left + 8) {
        info.style.left = `${panelRect.width / 2 + 12}px`;
      }
      // Clamp right
      if (panelRect.right > canvasRect.right - 8) {
        info.style.left = `${state.width - panelRect.width / 2 - 12}px`;
      }
      // Clamp bottom: show above fruit if too low
      if (panelRect.bottom > canvasRect.bottom - 8) {
        info.style.top = `${fruit.y - fruit.r - panelRect.height - 12}px`;
      }
    });
  }

  function handleTap(evt) {
    // Ensure audio on first interaction
    if (!hasUserGesture) {
      hasUserGesture = true;
      ensureAudio();
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    }

    // Hide hint after first tap
    state.showHint = false;

    const { x, y, rect } = eventPos(evt);
    let hit = null;
    for (const fruit of state.fruits) {
      if (state.progress < fruit.visibleAt || fruit.phase === 'split') continue;
      const dx = x - fruit.x;
      const dy = y - fruit.y;
      const hitR = fruit.r + HIT_EXPAND;
      if ((dx * dx) + (dy * dy) <= hitR * hitR) {
        hit = fruit;
        break;
      }
    }
    if (hit) {
      evt.preventDefault();
      if (hit.phase === 'hanging') {
        hit.phase = 'dropping';
        hit.dropVy = 1.2;
      }
      sfxPluck(hit.pitch);
      openFruitInfo(hit, rect);
    } else {
      // Tap on empty space: close info panel
      if (state.activeInfo) {
        state.infoFadeTarget = 0;
        setTimeout(() => {
          if (state.infoFadeAlpha <= 0.05) {
            info.hidden = true;
            state.activeInfo = null;
          }
        }, 300);
      }
    }
  }

  // ─── Mouse move for hover (desktop) ───────────────────────────

  function handleMouseMove(evt) {
    const { x, y } = eventPos(evt);
    state.mouseX = x;
    state.mouseY = y;
  }

  // ═══════════════════════════════════════════════════════════════
  //  SETUP
  // ═══════════════════════════════════════════════════════════════

  buildOrchard();
  resize();

  const observer = new IntersectionObserver((entries) => {
    const entry = entries[0];
    isInView = Boolean(entry && entry.isIntersecting);
    if (isInView) ensureAnimation();
    else stopAnimation();
  }, { threshold: 0.05 });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAnimation();
    else ensureAnimation();
  });

  window.addEventListener('resize', () => {
    resize();
    ensureAnimation();
  }, { passive: true });

  canvas.addEventListener('click', handleTap);
  canvas.addEventListener('touchstart', handleTap, { passive: false });
  canvas.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('scroll', () => { state.targetProgress = Math.min(1, state.targetProgress + 0.005); }, { passive: true });

  observer.observe(section);
  ensureAnimation();

  // ─── Utility ──────────────────────────────────────────────────

  function hexToRgba(hex, a) {
    const n = hex.replace('#', '');
    const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
})();
