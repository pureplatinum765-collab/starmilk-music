(() => {
  const tracks = [
    { name: 'TRIBE STAR MILK', url: 'https://soundcloud.com/star-milk-645735333/tribe-star-milk' },
    { name: 'HONEY IN THE WOUND', url: 'https://soundcloud.com/star-milk-645735333/honey-in-the-wound' },
    { name: 'Shifting', url: 'https://soundcloud.com/star-milk-645735333/shifting' },
    { name: 'Rivers Pull', url: 'https://soundcloud.com/star-milk-645735333/rivers-pull-new-version' },
    { name: 'VELVET HONEY THUNDER', url: 'https://soundcloud.com/star-milk-645735333/velvet-honey-thunder' },
    { name: 'COSMIC FLOWS', url: 'https://soundcloud.com/star-milk-645735333/cosmic-flows' }
  ];

  const poems = [
    'The river knows your name',
    'What they called breaking was the universe teaching you how to shine',
    'Born from the trembling, raised by rivers'
  ];

  const floating   = document.getElementById('radio-floating');
  const badge      = document.getElementById('radio-badge');
  const prevBtn    = document.getElementById('radio-prev');
  const nextBtn    = document.getElementById('radio-next');
  const trackNameEl = document.getElementById('radio-track-name');
  const poemEl     = document.getElementById('radio-poem');
  const canvas     = document.getElementById('radio-visualizer');
  const queueEl    = document.getElementById('radio-queue');
  const shell      = document.getElementById('radio-embed-shell');
  const ctx        = canvas?.getContext('2d');

  if (!floating || !badge || !trackNameEl || !canvas || !ctx || !shell) return;

  let currentTrackIndex = 0;
  let poemCooldown = false;
  let visualizerRaf = 0;

  // ── Embed URL builder ──────────────────────────────────────────────
  const embedUrl = (track) =>
    `https://w.soundcloud.com/player/?url=${encodeURIComponent(track.url)}&color=%239333ea&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false`;

  // ── Create or update the visible iframe ───────────────────────────
  const ensureIframe = () => {
    let iframe = shell.querySelector('iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'starmilk-radio-iframe';
      iframe.title = 'STARMILK Radio Player';
      iframe.allow = 'autoplay';
      iframe.setAttribute('scrolling', 'no');
      iframe.setAttribute('frameborder', 'no');
      shell.appendChild(iframe);
    }
    return iframe;
  };

  // ── Swap track ────────────────────────────────────────────────────
  const swapTrack = (index) => {
    currentTrackIndex = index;
    const track = tracks[currentTrackIndex];
    trackNameEl.textContent = track.name;
    const iframe = ensureIframe();
    iframe.src = embedUrl(track);
    updateQueueActive();
    maybeShowPoem();
  };

  // ── Queue ─────────────────────────────────────────────────────────
  const buildQueue = () => {
    if (!queueEl) return;
    queueEl.innerHTML = '';
    tracks.forEach((track, idx) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'radio-queue-item' + (idx === currentTrackIndex ? ' active' : '');
      item.textContent = track.name;
      item.setAttribute('aria-label', `Play ${track.name}`);
      item.addEventListener('click', () => swapTrack(idx));
      queueEl.appendChild(item);
    });
  };

  const updateQueueActive = () => {
    if (!queueEl) return;
    queueEl.querySelectorAll('.radio-queue-item').forEach((item, idx) => {
      item.classList.toggle('active', idx === currentTrackIndex);
    });
    const activeItem = queueEl.querySelector('.radio-queue-item.active');
    if (activeItem) activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  // ── Prev / Next ───────────────────────────────────────────────────
  const nextTrack = () => swapTrack((currentTrackIndex + 1) % tracks.length);
  const prevTrack = () => swapTrack((currentTrackIndex - 1 + tracks.length) % tracks.length);

  // ── Poem display ─────────────────────────────────────────────────
  const maybeShowPoem = () => {
    if (poemCooldown || Math.random() < 0.5) return;
    poemCooldown = true;
    poemEl.textContent = poems[Math.floor(Math.random() * poems.length)];
    poemEl.classList.add('visible');
    setTimeout(() => poemEl.classList.remove('visible'), 6000);
    setTimeout(() => { poemCooldown = false; }, 9000);
  };

  // ── Visualizer (ambient sine-wave animation) ──────────────────────
  const drawVisualizer = () => {
    const width  = canvas.width;
    const height = canvas.height;
    const bars   = 32;

    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0,   'rgba(147,51,234,.92)');
    gradient.addColorStop(0.5, 'rgba(34,211,238,.85)');
    gradient.addColorStop(1,   'rgba(245,158,11,.95)');

    const spacing = width / bars;
    for (let i = 0; i < bars; i++) {
      const value     = (Math.sin((Date.now() / 280) + i) + 1) * 24;
      const barHeight = Math.max(4, (value / 255) * height * 0.96);
      const x = i * spacing + 1;
      const y = (height - barHeight) / 2;
      ctx.fillStyle   = gradient;
      ctx.shadowBlur  = 9;
      ctx.shadowColor = 'rgba(147,51,234,.7)';
      ctx.fillRect(x, y, Math.max(2, spacing - 3), barHeight);
    }
  };

  const canAnimate = () => !document.hidden && !floating.classList.contains('collapsed');

  const stopVisualizerLoop = () => {
    if (visualizerRaf) { cancelAnimationFrame(visualizerRaf); visualizerRaf = 0; }
  };

  const ensureVisualizerLoop = () => {
    if (!canAnimate() || visualizerRaf) return;
    const tick = () => {
      if (!canAnimate()) { visualizerRaf = 0; return; }
      drawVisualizer();
      visualizerRaf = requestAnimationFrame(tick);
    };
    visualizerRaf = requestAnimationFrame(tick);
  };

  // ── Badge toggle ──────────────────────────────────────────────────
  badge.addEventListener('click', () => {
    const collapsed = floating.classList.toggle('collapsed');
    badge.setAttribute('aria-expanded', String(!collapsed));
    badge.textContent = collapsed ? 'STARMILK RADIO ✦ tap to tune' : 'STARMILK RADIO ✦ collapse';
    if (collapsed) stopVisualizerLoop();
    else ensureVisualizerLoop();
  });

  if (prevBtn) prevBtn.addEventListener('click', prevTrack);
  if (nextBtn) nextBtn.addEventListener('click', nextTrack);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopVisualizerLoop();
    else ensureVisualizerLoop();
  });

  // ── Init ──────────────────────────────────────────────────────────
  buildQueue();
  trackNameEl.textContent = tracks[0].name;
  // Initialise iframe with first track on load
  ensureIframe().src = embedUrl(tracks[0]);

  drawVisualizer();
  ensureVisualizerLoop();
})();
