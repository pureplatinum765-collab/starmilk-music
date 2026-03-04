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

  const shell = document.getElementById('radio-embed-shell');
  const floating = document.getElementById('radio-floating');
  const badge = document.getElementById('radio-badge');
  const panel = document.getElementById('radio-panel');
  const playBtn = document.getElementById('radio-play');
  const prevBtn = document.getElementById('radio-prev');
  const nextBtn = document.getElementById('radio-next');
  const volumeSlider = document.getElementById('radio-volume');
  const trackNameEl = document.getElementById('radio-track-name');
  const poemEl = document.getElementById('radio-poem');
  const canvas = document.getElementById('radio-visualizer');
  const queueEl = document.getElementById('radio-queue');
  const ctx = canvas?.getContext('2d');

  if (!shell || !floating || !badge || !panel || !playBtn || !volumeSlider || !trackNameEl || !canvas || !ctx) {
    return;
  }

  let audioCtx = null;
  let visualizerGain = null;
  let analyser = null;

  let scReady = false;
  let widget = null;
  let isPlaying = false;
  let currentTrackIndex = 0;
  let order = [];
  let poemCooldown = false;
  let activeNodes = [];
  let interludeTimeout = 0;
  let visualizerRaf = 0;
  let playStartTimeout = 0;
  let awaitingPlaybackStart = false;
  let pendingReadyPlay = false;

  const ensureAudioGraph = () => {
    if (audioCtx) return audioCtx;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    audioCtx = new AudioContextClass();
    visualizerGain = audioCtx.createGain();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    visualizerGain.gain.value = 0;
    visualizerGain.connect(analyser);
    analyser.connect(audioCtx.destination);
    return audioCtx;
  };

  const resumeAudioGraph = async () => {
    const ctxRef = ensureAudioGraph();
    if (!ctxRef) return false;
    if (ctxRef.state === 'suspended') {
      await ctxRef.resume();
    }
    return true;
  };

  // ── Order helpers ──────────────────────────────────────────────────
  // We use a sequential order (no shuffle) so prev/next make sense to users.
  // Order is just 0..n-1.
  const prepareOrder = () => {
    order = tracks.map((_, i) => i);
    currentTrackIndex = 0;
  };

  const currentTrack = () => tracks[order[currentTrackIndex]];

  // ── Queue rendering ────────────────────────────────────────────────
  const buildQueue = () => {
    if (!queueEl) return;
    queueEl.innerHTML = '';
    order.forEach((trackIdx, posIdx) => {
      const track = tracks[trackIdx];
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'radio-queue-item' + (posIdx === currentTrackIndex ? ' active' : '');
      item.textContent = track.name;
      item.setAttribute('aria-label', `Play ${track.name}`);
      item.addEventListener('click', () => {
        jumpToQueuePosition(posIdx);
      });
      queueEl.appendChild(item);
    });
  };

  const updateQueueActive = () => {
    if (!queueEl) return;
    queueEl.querySelectorAll('.radio-queue-item').forEach((item, idx) => {
      item.classList.toggle('active', idx === currentTrackIndex);
    });
    // Scroll active item into view
    const activeItem = queueEl.querySelector('.radio-queue-item.active');
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  // ── Navigation ────────────────────────────────────────────────────
  const jumpToQueuePosition = (posIdx) => {
    currentTrackIndex = posIdx;
    updateQueueActive();
    if (isPlaying) {
      clearInterlude();
      playCurrentTrack({ userInitiated: true });
    } else {
      updateTrackLabel();
    }
  };

  const nextTrack = () => {
    currentTrackIndex = (currentTrackIndex + 1) % order.length;
  };

  const prevTrack = () => {
    currentTrackIndex = (currentTrackIndex - 1 + order.length) % order.length;
  };

  // ── Track label ───────────────────────────────────────────────────
  const updateTrackLabel = (prefix = 'Now transmitting') => {
    const item = currentTrack();
    trackNameEl.textContent = `${prefix}: ${item.name}`;
  };

  const setWidgetVolume = (value) => {
    if (widget && typeof widget.setVolume === 'function') {
      widget.setVolume(value);
    }
  };

  const createIframe = () => {
    const iframe = document.createElement('iframe');
    iframe.id = 'starmilk-radio-iframe';
    iframe.width = '100%';
    iframe.height = '120';
    iframe.allow = 'autoplay';
    iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(currentTrack().url)}&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&visual=false`;
    shell.innerHTML = '';
    shell.appendChild(iframe);
    return iframe;
  };

  const clearInterlude = () => {
    clearTimeout(interludeTimeout);
    activeNodes.forEach((node) => {
      try {
        node.stop?.();
      } catch (_err) {
        // noop
      }
      try {
        node.disconnect?.();
      } catch (_err) {
        // noop
      }
    });
    activeNodes = [];
    if (!audioCtx || !visualizerGain) return;
    visualizerGain.gain.cancelScheduledValues(audioCtx.currentTime);
    visualizerGain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    visualizerGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.45);
  };

  const randomBetween = (min, max) => min + Math.random() * (max - min);

  const connectNode = (node, gainAmount = 0.4) => {
    if (!audioCtx || !visualizerGain) return null;
    const gain = audioCtx.createGain();
    gain.gain.value = gainAmount;
    node.connect(gain);
    gain.connect(visualizerGain);
    return gain;
  };

  const showPoem = () => {
    if (poemCooldown || Math.random() < 0.5) return;
    poemCooldown = true;
    poemEl.textContent = poems[Math.floor(Math.random() * poems.length)];
    poemEl.classList.add('visible');
    setTimeout(() => poemEl.classList.remove('visible'), 6000);
    setTimeout(() => { poemCooldown = false; }, 9000);
  };

  const startInterlude = () => {
    const ctxRef = ensureAudioGraph();
    if (!ctxRef || !visualizerGain) return;
    clearInterlude();
    updateTrackLabel('Interlude in the signal');
    showPoem();

    const now = ctxRef.currentTime;
    const duration = randomBetween(8, 15);

    visualizerGain.gain.setValueAtTime(0.0001, now);
    visualizerGain.gain.exponentialRampToValueAtTime(0.8, now + 1.2);
    visualizerGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const noiseBuffer = ctxRef.createBuffer(1, ctxRef.sampleRate * duration, ctxRef.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    const rain = ctxRef.createBufferSource();
    rain.buffer = noiseBuffer;
    const rainFilter = ctxRef.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1300;
    rain.connect(rainFilter);
    const rainGain = connectNode(rainFilter, 0.22);

    const crackle = ctxRef.createBufferSource();
    crackle.buffer = noiseBuffer;
    const crackleFilter = ctxRef.createBiquadFilter();
    crackleFilter.type = 'highpass';
    crackleFilter.frequency.value = 3200;
    crackle.connect(crackleFilter);
    const crackleGain = connectNode(crackleFilter, 0.08);

    const rumble = ctxRef.createOscillator();
    rumble.type = 'sine';
    rumble.frequency.value = 45;
    const rumbleGain = connectNode(rumble, 0.13);

    const cricketLfo = ctxRef.createOscillator();
    cricketLfo.type = 'square';
    cricketLfo.frequency.value = 3.3;
    const cricket = ctxRef.createOscillator();
    cricket.type = 'triangle';
    cricket.frequency.value = 2100;
    const cricketGain = connectNode(cricket, 0.05);
    cricketLfo.connect(cricketGain.gain);

    [rainGain, crackleGain, rumbleGain, cricketGain].forEach((gainNode) => {
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(gainNode.gain.value + 0.0001, now + 1.5);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    });

    rain.start(now);
    crackle.start(now);
    rumble.start(now);
    cricket.start(now);
    cricketLfo.start(now);

    [rain, crackle, rumble, cricket, cricketLfo, rainGain, crackleGain, rumbleGain, cricketGain].forEach((node) => activeNodes.push(node));

    interludeTimeout = window.setTimeout(() => {
      nextTrack();
      updateQueueActive();
      playCurrentTrack();
    }, duration * 1000);
  };

  const clearPlayStartWatchdog = () => {
    clearTimeout(playStartTimeout);
    playStartTimeout = 0;
    awaitingPlaybackStart = false;
  };

  const markPlaybackStarted = () => {
    if (!isPlaying) {
      isPlaying = true;
      playBtn.textContent = '❚❚';
      updateTrackLabel();
    }
    if (awaitingPlaybackStart) {
      clearPlayStartWatchdog();
    }
  };

  const startPlayStartWatchdog = () => {
    clearPlayStartWatchdog();
    awaitingPlaybackStart = true;
    playStartTimeout = window.setTimeout(() => {
      awaitingPlaybackStart = false;
      isPlaying = false;
      playBtn.textContent = '▶';
      updateTrackLabel('Tap play again');
      clearInterlude();
      if (widget && typeof widget.pause === 'function') {
        widget.pause();
      }
    }, 5000);
  };

  const playCurrentTrack = ({ userInitiated = false } = {}) => {
    clearInterlude();
    if (!widget) return;
    pendingReadyPlay = true;
    if (userInitiated) startPlayStartWatchdog();
    widget.load(currentTrack().url, {
      auto_play: true,
      hide_related: true,
      show_comments: false,
      show_user: false,
      show_reposts: false,
      visual: false
    });
    updateTrackLabel();
    updateQueueActive();
  };

  const initWidget = () => {
    const iframe = createIframe();
    widget = window.SC.Widget(iframe);

    widget.bind(window.SC.Widget.Events.FINISH, () => {
      if (!isPlaying) return;
      nextTrack();
      updateQueueActive();
      startInterlude();
    });

    widget.bind(window.SC.Widget.Events.READY, () => {
      setWidgetVolume(Number(volumeSlider.value));
      updateTrackLabel();
      if (pendingReadyPlay) {
        pendingReadyPlay = false;
        widget.play();
      }
    });

    widget.bind(window.SC.Widget.Events.PLAY, () => {
      markPlaybackStarted();
    });

    widget.bind(window.SC.Widget.Events.PLAY_PROGRESS, () => {
      markPlaybackStarted();
    });
  };

  const togglePlayback = async () => {
    await resumeAudioGraph();
    if (!scReady) return;

    if (!isPlaying) {
      if (!widget) initWidget();
      playCurrentTrack({ userInitiated: true });
      return;
    }

    clearPlayStartWatchdog();
    pendingReadyPlay = false;
    widget.pause();
    clearInterlude();
    isPlaying = false;
    playBtn.textContent = '▶';
    updateTrackLabel('Paused transmission');
  };

  const handlePrev = async () => {
    await resumeAudioGraph();
    prevTrack();
    updateQueueActive();
    if (isPlaying) {
      if (!widget) initWidget();
      playCurrentTrack({ userInitiated: true });
    } else {
      updateTrackLabel();
    }
  };

  const handleNext = async () => {
    await resumeAudioGraph();
    nextTrack();
    updateQueueActive();
    if (isPlaying) {
      if (!widget) initWidget();
      playCurrentTrack({ userInitiated: true });
    } else {
      updateTrackLabel();
    }
  };

  const loadSoundCloudApi = () => new Promise((resolve) => {
    if (window.SC?.Widget) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://w.soundcloud.com/player/api.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  const drawVisualizer = () => {
    const width = canvas.width;
    const height = canvas.height;
    const bars = 32;
    const data = new Uint8Array(analyser ? analyser.frequencyBinCount : bars);

    if (analyser) {
      analyser.getByteFrequencyData(data);
    }
    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(147,51,234,.92)');
    gradient.addColorStop(0.5, 'rgba(34,211,238,.85)');
    gradient.addColorStop(1, 'rgba(245,158,11,.95)');

    const spacing = width / bars;
    for (let i = 0; i < bars; i += 1) {
      const value = data[i] || (Math.sin((Date.now() / 280) + i) + 1) * 24;
      const barHeight = Math.max(4, (value / 255) * height * 0.96);
      const x = i * spacing + 1;
      const y = (height - barHeight) / 2;
      ctx.fillStyle = gradient;
      ctx.shadowBlur = 9;
      ctx.shadowColor = 'rgba(147,51,234,.7)';
      ctx.fillRect(x, y, Math.max(2, spacing - 3), barHeight);
    }
  };

  const canAnimateVisualizer = () => !document.hidden && !floating.classList.contains('collapsed');

  const stopVisualizerLoop = () => {
    if (visualizerRaf) {
      cancelAnimationFrame(visualizerRaf);
      visualizerRaf = 0;
    }
  };

  const ensureVisualizerLoop = () => {
    if (!canAnimateVisualizer() || visualizerRaf) return;

    const tick = () => {
      if (!canAnimateVisualizer()) {
        visualizerRaf = 0;
        return;
      }
      drawVisualizer();
      visualizerRaf = requestAnimationFrame(tick);
    };

    visualizerRaf = requestAnimationFrame(tick);
  };

  badge.addEventListener('click', () => {
    const collapsed = floating.classList.toggle('collapsed');
    badge.setAttribute('aria-expanded', String(!collapsed));
    badge.textContent = collapsed ? 'STARMILK RADIO ✦ tap to tune' : 'STARMILK RADIO ✦ collapse';
    if (collapsed) stopVisualizerLoop();
    else ensureVisualizerLoop();
  });

  playBtn.addEventListener('click', togglePlayback);

  if (prevBtn) prevBtn.addEventListener('click', handlePrev);
  if (nextBtn) nextBtn.addEventListener('click', handleNext);

  document.addEventListener('touchstart', () => {
    resumeAudioGraph();
  }, { once: true, passive: true });

  volumeSlider.addEventListener('input', () => {
    const value = Number(volumeSlider.value);
    setWidgetVolume(value);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopVisualizerLoop();
      if (isPlaying && widget) setWidgetVolume(Number(volumeSlider.value) * 0.85);
      return;
    }
    ensureVisualizerLoop();
  });

  prepareOrder();
  buildQueue();
  updateTrackLabel('Ready to tune');
  loadSoundCloudApi().then((ready) => {
    if (!ready) {
      updateTrackLabel('Signal offline');
      return;
    }
    scReady = true;
    initWidget();
  });
  drawVisualizer();
  ensureVisualizerLoop();
})();
