/* STARMILK Inked Relic Synapse conductor.
   Design rule: playback is a ritual state. SoundCloud transport timing drives
   cadence; real BPM is used only when the widget exposes it. */
(function () {
  'use strict';

  const hero = document.getElementById('hero');
  const status = document.getElementById('hero-synapse-status');
  const statusState = document.getElementById('synapse-state');
  const statusTrack = document.getElementById('synapse-track');
  if (!hero || !status || !statusState || !statusTrack) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'synapse-conductor';
  canvas.setAttribute('aria-hidden', 'true');
  hero.prepend(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const state = {
    phase: 'rest',
    energy: 0,
    targetEnergy: 0,
    pulse: 0,
    seed: 28,
    trackKey: '',
    cadenceBpm: 88,
    tempo: 0,
    positionMs: 0,
    relativePosition: 0,
    progressAt: 0,
    nodes: [],
    width: 0,
    height: 0,
    raf: 0,
    last: 0,
    afterglowUntil: 0,
    afterglowTimer: 0,
    track: 'The field is listening',
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const finite = (value) => Number.isFinite(Number(value));
  const hash = (value) => {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  };
  const random = (seed) => {
    let value = seed + 0x6D2B79F5;
    return () => {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const buildNodes = () => {
    const r = random(state.seed);
    const compact = state.width < 720;
    const count = compact ? 16 : 23;
    state.nodes = Array.from({ length: count }, (_, index) => ({
      x: compact ? .08 + r() * .84 : .39 + r() * .55,
      y: .10 + r() * .78,
      size: .8 + r() * 2.4,
      phase: r() * Math.PI * 2,
      drift: .28 + r() * .72,
      lane: index % 4,
    }));
  };

  const resize = () => {
    const rect = hero.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    state.width = Math.max(1, Math.round(rect.width));
    state.height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(state.width * ratio);
    canvas.height = Math.round(state.height * ratio);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    buildNodes();
  };

  const ease = (current, target, amount) => current + (target - current) * amount;
  const positionNow = (now) => state.phase === 'playing'
    ? state.positionMs + Math.max(0, now - state.progressAt)
    : state.positionMs;

  const cadence = (now, intensity) => {
    const bpm = state.tempo || state.cadenceBpm;
    const beatMs = 60000 / bpm;
    const beat = positionNow(now) / beatMs;
    const beatIndex = Math.floor(beat);
    const phase = beat - beatIndex;
    const downbeat = beatIndex % 4 === 0 ? 1 : .64;
    const hit = Math.exp(-Math.pow(phase / .16, 2)) * downbeat;
    const lift = Math.exp(-Math.pow((phase - .5) / .22, 2)) * .18;
    const phrase = .55 + .45 * Math.sin((state.relativePosition || beat / 128) * Math.PI * 8 + state.seed * .0001);
    const target = state.phase === 'playing' ? clamp(.15 + hit * .85 + lift + phrase * .14, 0, 1) : 0;
    state.pulse = ease(state.pulse, target, .22);
    return { beat, beatIndex, beatMs, pulse: state.pulse * intensity };
  };

  const draw = (now) => {
    state.raf = 0;
    const delta = Math.min(42, Math.max(0, now - state.last || 16));
    state.last = now;
    const isAfterglow = now < state.afterglowUntil;
    state.energy = ease(state.energy, state.targetEnergy, Math.min(.18, delta / 180));
    const active = state.energy > .012 || isAfterglow;
    const baseIntensity = Math.max(state.energy, isAfterglow ? .12 : 0);
    const rhythm = cadence(now, baseIntensity);
    const intensity = baseIntensity * (.46 + rhythm.pulse * .72);
    hero.style.setProperty('--synapse-energy', intensity.toFixed(3));
    hero.style.setProperty('--synapse-pulse', rhythm.pulse.toFixed(3));
    hero.style.setProperty('--synapse-beat', `${Math.round(rhythm.beatMs)}ms`);
    ctx.clearRect(0, 0, state.width, state.height);

    if (!reduceMotion.matches && active) {
      const t = now * .001;
      const nodes = state.nodes;
      const waveHead = Math.floor(rhythm.beat * 1.5) % Math.max(nodes.length, 1);
      const point = (node) => ({
        x: node.x * state.width + Math.sin(t * node.drift + node.phase) * (5 + intensity * 12 + rhythm.pulse * 9),
        y: node.y * state.height + Math.cos(t * node.drift * .8 + node.phase) * (4 + intensity * 8 + rhythm.pulse * 6),
      });
      const activation = (index) => {
        const forward = (index - waveHead + nodes.length) % nodes.length;
        const distance = Math.min(forward, nodes.length - forward);
        return Math.exp(-Math.pow(distance / 1.6, 2)) * rhythm.pulse;
      };

      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i += 1) {
        const a = point(nodes[i]);
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = point(nodes[j]);
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          const threshold = Math.min(state.width, state.height) * .24;
          if (distance > threshold) continue;
          const accent = Math.max(activation(i), activation(j));
          const alpha = (1 - distance / threshold) * (.025 + intensity * .16 + accent * .18);
          ctx.strokeStyle = `rgba(226, 180, 126, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      nodes.forEach((node, index) => {
        const p = point(node);
        const passing = activation(index);
        const pulse = .45 + Math.sin(t * (1.8 + node.drift) + node.phase) * .22 + passing * .72;
        const radius = node.size + intensity * (1.8 + pulse * 2) + passing * 4;
        const glow = (.06 + intensity * .35 + passing * .34) * (.66 + pulse * .34);
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * (5 + passing * 2));
        gradient.addColorStop(0, `rgba(245, 222, 175, ${glow.toFixed(3)})`);
        gradient.addColorStop(.25, `rgba(198, 138, 79, ${(glow * .58).toFixed(3)})`);
        gradient.addColorStop(1, 'rgba(198, 138, 79, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * (5 + passing * 2), 0, Math.PI * 2);
        ctx.fill();
        if (index % 3 === 0 || passing > .38) {
          ctx.fillStyle = `rgba(232, 223, 207, ${Math.min(.9, glow * 1.2).toFixed(3)})`;
          ctx.fillRect(p.x - .5, p.y - .5, 1, 1);
        }
      });
    }

    if (active) state.raf = requestAnimationFrame(draw);
  };

  const schedule = () => {
    if (!state.raf && !document.hidden) state.raf = requestAnimationFrame(draw);
  };

  const setStatus = (detail = {}) => {
    const incomingPhase = detail.phase || 'rest';
    const phase = incomingPhase === 'progress'
      ? (state.phase === 'playing' ? 'playing' : 'loading')
      : incomingPhase;
    const track = detail.trackName || state.track;
    const trackKey = `${detail.trackUrl || track}:${detail.trackIndex || 0}`;
    if (trackKey !== state.trackKey) {
      state.trackKey = trackKey;
      state.track = track;
      state.seed = hash(trackKey);
      state.cadenceBpm = 72 + (state.seed % 7) * 8;
      state.tempo = 0;
      state.positionMs = 0;
      state.relativePosition = 0;
      buildNodes();
    }
    if (finite(detail.tempo) && Number(detail.tempo) >= 48 && Number(detail.tempo) <= 220) state.tempo = Number(detail.tempo);
    if (finite(detail.currentPosition)) {
      state.positionMs = Math.max(0, Number(detail.currentPosition));
      state.progressAt = performance.now();
    }
    if (finite(detail.relativePosition)) state.relativePosition = clamp(Number(detail.relativePosition), 0, 1);
    state.phase = phase;
    const playing = phase === 'playing';
    const loading = phase === 'loading';
    const afterglow = phase === 'paused' || phase === 'finished';
    if (incomingPhase !== 'progress' && state.afterglowTimer) {
      window.clearTimeout(state.afterglowTimer);
      state.afterglowTimer = 0;
    }
    state.targetEnergy = playing ? .92 : 0;
    state.afterglowUntil = afterglow ? performance.now() + 1300 : 0;
    document.body.classList.toggle('starmilk-playing', playing);
    document.body.classList.toggle('starmilk-tuning', loading);
    document.body.classList.toggle('starmilk-afterglow', afterglow);
    hero.dataset.conduction = playing ? 'listening' : loading ? 'tuning' : 'rest';

    if (afterglow) {
      state.afterglowTimer = window.setTimeout(() => {
        if (state.phase === phase) document.body.classList.remove('starmilk-afterglow');
        state.afterglowTimer = 0;
      }, 1400);
    }

    if (playing) {
      statusState.textContent = state.tempo ? 'The field moves in time' : 'The field is awake';
      statusTrack.textContent = track;
    } else if (loading) {
      statusState.textContent = 'Tuning the river';
      statusTrack.textContent = track;
    } else if (phase === 'error') {
      statusState.textContent = 'The field is at rest';
      statusTrack.textContent = 'Choose another current';
    } else {
      statusState.textContent = 'The field is at rest';
      statusTrack.textContent = 'Press play to awaken it';
    }
    status.dataset.state = playing ? 'playing' : loading ? 'tuning' : 'rest';
    schedule();
  };

  window.addEventListener('starmilk:audioState', (event) => setStatus(event.detail));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    } else {
      schedule();
    }
  });
  reduceMotion.addEventListener?.('change', () => schedule());
  window.addEventListener('resize', resize, { passive: true });
  resize();
  setStatus();
})();
