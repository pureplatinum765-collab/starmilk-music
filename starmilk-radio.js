(() => {
  const SC_PROFILE = 'https://soundcloud.com/star-milk-645735333';
  const EMBED_COLOR = '%23f59e0b';

  const poems = [
    'The river knows your name',
    'What they called breaking was the universe teaching you how to shine',
    'Born from the trembling, raised by rivers',
    'Honey in the wound becomes the medicine',
    'The orchard remembers what you planted in the dark'
  ];

  // DOM refs
  const floating = document.getElementById('radio-floating');
  const badge = document.getElementById('radio-badge');
  const prevBtn = document.getElementById('radio-prev');
  const nextBtn = document.getElementById('radio-next');
  const shuffleBtn = document.getElementById('radio-shuffle');
  const trackNameEl = document.getElementById('radio-track-name');
  const poemEl = document.getElementById('radio-poem');
  const queueEl = document.getElementById('radio-queue');
  const shell = document.getElementById('radio-embed-shell');
  const searchInput = document.getElementById('radio-search');
  const countEl = document.getElementById('radio-count');

  if (!floating || !badge || !trackNameEl || !shell) return;

  let allTracks = [];
  let filteredTracks = [];
  let currentTrackIndex = 0;
  let hasOpened = false;
  let poemCooldown = false;

  // ── Embed URL builder
  const embedUrl = (track) =>
    `https://w.soundcloud.com/player/?url=${encodeURIComponent(track.url)}&color=${EMBED_COLOR}&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false`;

  // ── Iframe management
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

  // ── Track loading
  const loadTracks = async () => {
    try {
      const res = await fetch('starmilk-tracks.json');
      if (res.ok) {
        allTracks = await res.json();
      }
    } catch (e) {
      // fetch failed, use fallback
    }
    if (allTracks.length === 0) {
      allTracks = [
        { name: 'TRIBE STAR MILK', url: 'https://soundcloud.com/star-milk-645735333/tribe-star-milk' },
        { name: 'HONEY IN THE WOUND', url: 'https://soundcloud.com/star-milk-645735333/honey-in-the-wound' },
        { name: 'COSMIC FLOWS', url: 'https://soundcloud.com/star-milk-645735333/cosmic-flows' }
      ];
    }
    filteredTracks = [...allTracks];
    buildQueue();
    updateCount();
    if (allTracks.length > 0) {
      trackNameEl.textContent = allTracks[0].name;
    }

    // Try SoundCloud profile embed for new tracks
    tryDiscoverNewTracks();
  };

  // ── Discover new tracks via SC profile embed
  const tryDiscoverNewTracks = () => {
    try {
      const scScript = document.createElement('script');
      scScript.src = 'https://w.soundcloud.com/player/api.js';
      scScript.onload = () => {
        const profileIframe = document.createElement('iframe');
        profileIframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(SC_PROFILE)}&auto_play=false&show_playcount=false`;
        profileIframe.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none;';
        document.body.appendChild(profileIframe);

        if (typeof SC === 'undefined' || !SC.Widget) return;
        const widget = SC.Widget(profileIframe);
        widget.bind(SC.Widget.Events.READY, () => {
          widget.getSounds((sounds) => {
            if (!sounds || sounds.length === 0) return;
            const existingUrls = new Set(allTracks.map(t => t.url));
            const newTracks = sounds
              .filter(s => s.permalink_url && !existingUrls.has(s.permalink_url))
              .map(s => ({ name: s.title, url: s.permalink_url }));
            if (newTracks.length > 0) {
              allTracks = [...newTracks, ...allTracks];
              filteredTracks = [...allTracks];
              buildQueue();
              updateCount();
            }
            // Clean up
            profileIframe.remove();
          });
        });
      };
      document.head.appendChild(scScript);
    } catch (e) {
      // SC discovery failed silently, we have the JSON tracks
    }
  };

  // ── Search/filter
  const handleSearch = () => {
    const q = (searchInput?.value || '').toLowerCase().trim();
    if (!q) {
      filteredTracks = [...allTracks];
    } else {
      filteredTracks = allTracks.filter(t => t.name.toLowerCase().includes(q));
    }
    buildQueue();
    updateCount();
  };

  const updateCount = () => {
    if (!countEl) return;
    if (filteredTracks.length === allTracks.length) {
      countEl.textContent = `${allTracks.length} tracks`;
    } else {
      countEl.textContent = `${filteredTracks.length} of ${allTracks.length} tracks`;
    }
  };

  // ── Queue building
  const buildQueue = () => {
    if (!queueEl) return;
    queueEl.innerHTML = '';
    filteredTracks.forEach((track) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'radio-queue-item';
      const globalIdx = allTracks.indexOf(track);
      if (globalIdx === currentTrackIndex) item.classList.add('active');
      item.textContent = track.name;
      item.setAttribute('aria-label', `Play ${track.name}`);
      item.addEventListener('click', () => {
        currentTrackIndex = allTracks.indexOf(track);
        swapTrack();
      });
      queueEl.appendChild(item);
    });
  };

  const updateQueueActive = () => {
    if (!queueEl) return;
    const currentTrack = allTracks[currentTrackIndex];
    queueEl.querySelectorAll('.radio-queue-item').forEach((item) => {
      const isActive = item.textContent === currentTrack?.name;
      item.classList.toggle('active', isActive);
    });
    const activeItem = queueEl.querySelector('.radio-queue-item.active');
    if (activeItem) activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  // ── Track swapping
  const swapTrack = () => {
    if (allTracks.length === 0) return;
    const track = allTracks[currentTrackIndex];
    trackNameEl.textContent = track.name;
    const iframe = ensureIframe();
    iframe.src = embedUrl(track);
    updateQueueActive();
    maybeShowPoem();
  };

  // ── Navigation
  const nextTrack = () => {
    if (allTracks.length === 0) return;
    currentTrackIndex = (currentTrackIndex + 1) % allTracks.length;
    swapTrack();
  };

  const prevTrack = () => {
    if (allTracks.length === 0) return;
    currentTrackIndex = (currentTrackIndex - 1 + allTracks.length) % allTracks.length;
    swapTrack();
  };

  const shufflePlay = () => {
    if (allTracks.length === 0) return;
    currentTrackIndex = Math.floor(Math.random() * allTracks.length);
    swapTrack();
  };

  // ── Poems
  const maybeShowPoem = () => {
    if (!poemEl || poemCooldown || Math.random() < 0.6) return;
    poemCooldown = true;
    poemEl.textContent = poems[Math.floor(Math.random() * poems.length)];
    poemEl.classList.add('visible');
    setTimeout(() => poemEl.classList.remove('visible'), 6000);
    setTimeout(() => { poemCooldown = false; }, 10000);
  };

  // ── Badge toggle
  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    const collapsed = floating.classList.toggle('collapsed');
    badge.setAttribute('aria-expanded', String(!collapsed));
    badge.textContent = collapsed ? 'STARMILK RADIO ✦' : '✕ close';
    if (!collapsed && !hasOpened) {
      hasOpened = true;
      if (allTracks.length > 0) {
        ensureIframe().src = embedUrl(allTracks[0]);
      }
    }
  });

  // ── Event listeners
  if (prevBtn) prevBtn.addEventListener('click', prevTrack);
  if (nextBtn) nextBtn.addEventListener('click', nextTrack);
  if (shuffleBtn) shuffleBtn.addEventListener('click', shufflePlay);
  if (searchInput) searchInput.addEventListener('input', handleSearch);

  // ── Init
  loadTracks();
})();
