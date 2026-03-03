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
  const volumeSlider = document.getElementById('radio-volume');
  const trackNameEl = document.getElementById('radio-track-name');
  const poemEl = document.getElementById('radio-poem');
  const canvas = document.getElementById('radio-visualizer');
  const ctx = canvas?.getContext('2d');

  if (!shell || !floating || !badge || !panel || !playBtn || !volumeSlider || !trackNameEl || !canvas || !ctx) {
    return;
  }

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const visualizerGain = audioCtx.createGain();
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 128;
  visualizerGain.gain.value = 0;
  visualizerGain.connect(analyser);
  analyser.connect(audioCtx.destination);

  let scReady = false;
  let widget = null;
  let isPlaying = false;
  let currentTrackIndex = 0;
  let order = [];
  let poemCooldown = false;
  let activeNodes = [];
  let interludeTimeout = 0;
  let visualizerRaf = 0;

  const shuffle = (list) => {
    const clone = [...list];
    for (let i = clone.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [clone[i], clone[j]] = [clone[j], clone[i]];
    }
    return clone;
  };

  const prepareOrder = () => {
    order = shuffle(tracks.map((_, i) => i));
    currentTrackIndex = 0;
  };

  const currentTrack = () => tracks[order[currentTrackIndex]];

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
    visualizerGain.gain.cancelScheduledValues(audioCtx.currentTime);
    visualizerGain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    visualizerGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.45);
  };

  const randomBetween = (min, max) => min + Math.random() * (max - min);

  const connectNode = (node, gainAmount = 0.4) => {
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
    clearInterlude();
    updateTrackLabel('Interlude in the signal');
    showPoem();

    const now = audioCtx.currentTime;
    const duration = randomBetween(8, 15);

    visualizerGain.gain.setValueAtTime(0.0001, now);
    visualizerGain.gain.exponentialRampToValueAtTime(0.8, now + 1.2);
    visualizerGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * duration, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    const rain = audioCtx.createBufferSource();
    rain.buffer = noiseBuffer;
    const rainFilter = audioCtx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1300;
    rain.connect(rainFilter);
    const rainGain = connectNode(rainFilter, 0.22);

    const crackle = audioCtx.createBufferSource();
    crackle.buffer = noiseBuffer;
    const crackleFilter = audioCtx.createBiquadFilter();
    crackleFilter.type = 'highpass';
    crackleFilter.frequency.value = 3200;
    crackle.connect(crackleFilter);
    const crackleGain = connectNode(crackleFilter, 0.08);

    const rumble = audioCtx.createOscillator();
    rumble.type = 'sine';
    rumble.frequency.value = 45;
    const rumbleGain = connectNode(rumble, 0.13);

    const cricketLfo = audioCtx.createOscillator();
    cricketLfo.type = 'square';
    cricketLfo.frequency.value = 3.3;
    const cricket = audioCtx.createOscillator();
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
      playCurrentTrack();
    }, duration * 1000);
  };

  const nextTrack = () => {
    currentTrackIndex += 1;
    if (currentTrackIndex >= order.length) {
      prepareOrder();
    }
  };

  const playCurrentTrack = () => {
    clearInterlude();
    if (!widget) return;
    widget.load(currentTrack().url, {
      auto_play: true,
      hide_related: true,
      show_comments: false,
      show_user: false,
      show_reposts: false,
      visual: false
    });
    widget.bind(window.SC.Widget.Events.READY, () => {
      setWidgetVolume(Number(volumeSlider.value));
      updateTrackLabel();
      isPlaying = true;
      playBtn.textContent = '❚❚';
    });
  };

  const initWidget = () => {
    const iframe = createIframe();
    widget = window.SC.Widget(iframe);

    widget.bind(window.SC.Widget.Events.FINISH, () => {
      if (!isPlaying) return;
      nextTrack();
      startInterlude();
    });
  };

  const togglePlayback = async () => {
    await audioCtx.resume();
    if (!scReady) return;

    if (!isPlaying) {
      if (!widget) initWidget();
      playCurrentTrack();
      return;
    }

    widget.pause();
    clearInterlude();
    isPlaying = false;
    playBtn.textContent = '▶';
    updateTrackLabel('Paused transmission');
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
    const data = new Uint8Array(analyser.frequencyBinCount);

    analyser.getByteFrequencyData(data);
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
