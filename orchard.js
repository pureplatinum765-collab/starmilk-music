(() => {
  'use strict';

  const canvas = document.getElementById('orchard-canvas');
  const section = document.getElementById('orchard');
  const info = document.getElementById('orchard-fruit-info');
  if (!canvas || !section || !info) return;

  const ctx = canvas.getContext('2d');
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

  const hour = new Date().getHours();
  const isDay = hour >= 7 && hour <= 18;
  const palette = isDay
    ? { skyTop: '#2c1f22', skyBottom: '#8f6332', haze: 'rgba(246, 186, 100, 0.32)', soil: '#231912' }
    : { skyTop: '#0a0a0f', skyBottom: '#181328', haze: 'rgba(116, 85, 160, 0.2)', soil: '#120d17' };

  const visitorKey = 'starmilk_orchard_visits';
  const visits = Number(localStorage.getItem(visitorKey) || 0);
  localStorage.setItem(visitorKey, String(visits + 1));
  const returnVisitor = visits > 0;

  const state = {
    width: 0,
    height: 0,
    time: 0,
    progress: returnVisitor ? 0.52 : 0.15,
    targetProgress: returnVisitor ? 0.68 : 0.24,
    trees: [],
    fruits: [],
    particles: [],
    activeInfo: null
  };

  let rafId = 0;
  let isInView = true;

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
      return {
        song,
        tree,
        localX: b.dir * (0.08 + (i % 3) * 0.022),
        localY: b.y + 0.05 + ((i % 2) * 0.025),
        r: 6 + (i % 3),
        glow: 0.6 + Math.random() * 0.4,
        visibleAt: returnVisitor ? 0.2 + i * 0.05 : 0.34 + i * 0.07,
        phase: 'hanging',
        dropVy: 0,
        split: 0,
        x: 0,
        y: 0
      };
    });

    state.particles = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.0004 + Math.random() * 0.001,
      drift: (Math.random() - 0.5) * 0.0006,
      size: 1 + Math.random() * 2,
      pulse: Math.random() * Math.PI * 2
    }));
  }

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
      }
    } else if (fruit.phase === 'split') {
      fruit.split = Math.min(1, fruit.split + 0.05);
    } else {
      fruit.x = anchorX;
      fruit.y = anchorY;
    }

    const pulse = 0.55 + Math.sin(state.time * 0.004 + fruit.glow * 4) * 0.25;
    ctx.shadowBlur = 18;
    ctx.shadowColor = `rgba(255, 193, 96, ${0.55 + pulse * 0.4})`;
    ctx.fillStyle = `rgba(255, 173, 94, ${0.72 + pulse * 0.25})`;

    if (fruit.phase === 'split') {
      const spread = 8 * fruit.split;
      ctx.beginPath();
      ctx.arc(fruit.x - spread, fruit.y, fruit.r, Math.PI * 0.45, Math.PI * 1.65);
      ctx.arc(fruit.x + spread, fruit.y, fruit.r, Math.PI * 1.35, Math.PI * 0.55, true);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 228, 172, 0.95)';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('✦', fruit.x, fruit.y - 1);
    } else {
      ctx.beginPath();
      ctx.arc(fruit.x, fruit.y, fruit.r + (fruit.phase === 'dropping' ? 1.8 : 0), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  function drawParticles() {
    for (const p of state.particles) {
      p.y -= p.speed;
      p.x += p.drift + Math.sin(state.time * 0.0015 + p.pulse) * 0.0008;
      if (p.y < -0.02) {
        p.y = 1.03;
        p.x = Math.random();
      }
      if (p.x < -0.04) p.x = 1.02;
      if (p.x > 1.04) p.x = -0.02;

      const alpha = 0.2 + (Math.sin(state.time * 0.003 + p.pulse) + 1) * 0.18;
      ctx.fillStyle = `rgba(255, 233, 165, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x * state.width, p.y * state.height, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

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

    rafId = requestAnimationFrame(render);
  }

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

  function eventPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const e = evt.touches ? evt.touches[0] : evt;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, rect };
  }

  function openFruitInfo(fruit, rect) {
    info.hidden = false;
    info.style.left = `${fruit.x}px`;
    info.style.top = `${fruit.y}px`;
    info.innerHTML = `<h3>${fruit.song.name}</h3><a href="${fruit.song.url}" target="_blank" rel="noopener noreferrer">Listen on SoundCloud ↗</a>`;
    state.activeInfo = fruit;

    const panelRect = info.getBoundingClientRect();
    if (panelRect.left < rect.left) info.style.left = `${panelRect.width / 2 + 10}px`;
    if (panelRect.right > rect.right) info.style.left = `${rect.width - panelRect.width / 2 - 10}px`;
  }

  function handleTap(evt) {
    const { x, y, rect } = eventPos(evt);
    let hit = null;
    for (const fruit of state.fruits) {
      if (state.progress < fruit.visibleAt || fruit.phase === 'split') continue;
      const dx = x - fruit.x;
      const dy = y - fruit.y;
      if ((dx * dx) + (dy * dy) <= (fruit.r + 9) * (fruit.r + 9)) {
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
      openFruitInfo(hit, rect);
    }
  }

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
  document.addEventListener('scroll', () => { state.targetProgress = Math.min(1, state.targetProgress + 0.005); }, { passive: true });

  observer.observe(section);
  ensureAnimation();
})();
