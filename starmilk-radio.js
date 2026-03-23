(() => {
  'use strict';

  const SC_PROFILE = 'https://soundcloud.com/star-milk-645735333';
  const EMBED_COLOR = '%23f59e0b';
  const SC_API_URL = 'https://w.soundcloud.com/player/api.js';

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
  let scWidget = null;
  let scAPILoaded = false;
  let userHasInteracted = false;

  // Track user interaction for autoplay policy compliance
  const markInteracted = () => { userHasInteracted = true; };
  document.addEventListener('click', markInteracted, { once: true });
  document.addEventListener('touchstart', markInteracted, { once: true });
  document.addEventListener('keydown', markInteracted, { once: true });

  // ── Load SC Widget API once
  const loadSCAPI = () => new Promise((resolve) => {
    if (scAPILoaded && typeof SC !== 'undefined' && SC.Widget) {
      resolve(true);
      return;
    }
    const existing = document.querySelector(`script[src="${SC_API_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => { scAPILoaded = true; resolve(true); });
      if (scAPILoaded) resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = SC_API_URL;
    script.onload = () => { scAPILoaded = true; resolve(true); };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  // ── Embed URL builder
  const embedUrl = (track, autoplay = false) =>
    `https://w.soundcloud.com/player/?url=${encodeURIComponent(track.url)}&color=${EMBED_COLOR}&auto_play=${autoplay}&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false`;

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

  // ── SC Widget API integration for auto-advance
  const bindWidgetEvents = async (iframe) => {
    try {
      await loadSCAPI();
      if (typeof SC === 'undefined' || !SC.Widget) return;

      scWidget = SC.Widget(iframe);

      scWidget.bind(SC.Widget.Events.FINISH, () => {
        // Auto-advance to next track when current one finishes
        nextTrack(true);
      });

      scWidget.bind(SC.Widget.Events.ERROR, () => {
        // Skip to next on error (e.g. region-blocked track)
        setTimeout(() => nextTrack(true), 1500);
      });
    } catch (_) {
      // SC API unavailable — graceful degradation, user can still click next
    }
  };

  // ── Track loading
  const loadTracks = async () => {
    try {
      const res = await fetch('starmilk-tracks.json');
      if (res.ok) {
        allTracks = await res.json();
      }
    } catch (_) {
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

    // Try to discover any new tracks from SC profile
    tryDiscoverNewTracks();
  };

  // ── Discover new tracks via SC profile embed
  const tryDiscoverNewTracks = async () => {
    try {
      const loaded = await loadSCAPI();
      if (!loaded || typeof SC === 'undefined' || !SC.Widget) return;

      const profileIframe = document.createElement('iframe');
      profileIframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(SC_PROFILE)}&auto_play=false&show_playcount=false`;
      profileIframe.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none;';
      document.body.appendChild(profileIframe);

      const widget = SC.Widget(profileIframe);
      widget.bind(SC.Widget.Events.READY, () => {
        widget.getSounds((sounds) => {
          if (!sounds || sounds.length === 0) { profileIframe.remove(); return; }
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
          profileIframe.remove();
        });
      });
    } catch (_) {
      // SC discovery failed silently, we have the JSON tracks
    }
  };

  // ── Search/filter with debounce
  let searchTimeout = null;
  const handleSearch = () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const q = (searchInput?.value || '').toLowerCase().trim();
      if (!q) {
        filteredTracks = [...allTracks];
      } else {
        filteredTracks = allTracks.filter(t => t.name.toLowerCase().includes(q));
      }
      buildQueue();
      updateCount();
    }, 180);
  };

  const updateCount = () => {
    if (!countEl) return;
    if (filteredTracks.length === allTracks.length) {
      countEl.textContent = `${allTracks.length} tracks`;
    } else {
      countEl.textContent = `${filteredTracks.length} of ${allTracks.length} tracks`;
    }
  };

  // ── Queue building (virtualized for large lists)
  const buildQueue = () => {
    if (!queueEl) return;
    queueEl.innerHTML = '';
    const fragment = document.createDocumentFragment();
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
        swapTrack(true);
      });
      fragment.appendChild(item);
    });
    queueEl.appendChild(fragment);
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

  // ── Track swapping (core logic)
  const swapTrack = (shouldAutoplay = false) => {
    if (allTracks.length === 0) return;
    const track = allTracks[currentTrackIndex];
    trackNameEl.textContent = track.name;

    const iframe = ensureIframe();
    // Only autoplay if user has interacted (browser policy compliance)
    const autoplay = shouldAutoplay && userHasInteracted;
    iframe.src = embedUrl(track, autoplay);

    // Re-bind widget events after src change
    bindWidgetEvents(iframe);

    updateQueueActive();
    maybeShowPoem();
  };

  // ── Navigation
  const nextTrack = (autoplay = false) => {
    if (allTracks.length === 0) return;
    currentTrackIndex = (currentTrackIndex + 1) % allTracks.length;
    swapTrack(autoplay);
  };

  const prevTrack = () => {
    if (allTracks.length === 0) return;
    currentTrackIndex = (currentTrackIndex - 1 + allTracks.length) % allTracks.length;
    swapTrack(true);
  };

  const shufflePlay = () => {
    if (allTracks.length === 0) return;
    let newIdx;
    do { newIdx = Math.floor(Math.random() * allTracks.length); }
    while (newIdx === currentTrackIndex && allTracks.length > 1);
    currentTrackIndex = newIdx;
    swapTrack(true);
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
        swapTrack(userHasInteracted);
      }
    }
  });

  // ── Keyboard navigation for radio controls
  floating.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !floating.classList.contains('collapsed')) {
      floating.classList.add('collapsed');
      badge.setAttribute('aria-expanded', 'false');
      badge.textContent = 'STARMILK RADIO ✦';
      badge.focus();
    }
  });

  // ── Event listeners
  if (prevBtn) prevBtn.addEventListener('click', prevTrack);
  if (nextBtn) nextBtn.addEventListener('click', () => nextTrack(true));
  if (shuffleBtn) shuffleBtn.addEventListener('click', shufflePlay);
  if (searchInput) searchInput.addEventListener('input', handleSearch);

  // ── Slugify helper
  const slugify = (str) =>
    str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  // ── Deep-link: open radio and optionally play a specific track
  const handleDeepLink = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('radio') !== '1') return;

    // Open the radio panel
    floating.classList.remove('collapsed');
    badge.setAttribute('aria-expanded', 'true');
    badge.textContent = '\u2715 close';
    hasOpened = true;

    // Find matching track by slug
    const trackSlug = params.get('track');
    if (trackSlug && allTracks.length > 0) {
      const idx = allTracks.findIndex(t => slugify(t.name) === trackSlug);
      if (idx !== -1) {
        currentTrackIndex = idx;
      }
    }

    swapTrack(userHasInteracted);
  };

  // ── Share button: copy deep-link URL to clipboard
  const createShareButton = () => {
    const shareBtn = document.getElementById('radio-share');
    if (!shareBtn) return;

    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const track = allTracks[currentTrackIndex];
      if (!track) return;

      const slug = slugify(track.name);
      const url = `${window.location.origin}${window.location.pathname}?radio=1&track=${slug}`;

      navigator.clipboard.writeText(url).then(() => {
        shareBtn.classList.add('copied');
        setTimeout(() => shareBtn.classList.remove('copied'), 2000);
      }).catch(() => {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        shareBtn.classList.add('copied');
        setTimeout(() => shareBtn.classList.remove('copied'), 2000);
      });
    });
  };

  createShareButton();

  // ── Init
  loadTracks().then(handleDeepLink);
})();
