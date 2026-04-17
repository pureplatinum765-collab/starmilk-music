(() => {
  'use strict';

  const SC_PROFILE  = 'https://soundcloud.com/star-milk-645735333';
  const EMBED_COLOR = '%23f59e0b';
  const SC_API_URL  = 'https://w.soundcloud.com/player/api.js';
  const FAVS_KEY    = 'sm_radio_favorites_v2';

  const POEMS = [
    'The river knows your name',
    'What they called breaking was the universe teaching you how to shine',
    'Born from the trembling, raised by rivers',
    'Honey in the wound becomes the medicine',
    'The orchard remembers what you planted in the dark',
    'You are not behind. You are right on time.',
    'The cosmos became music so it could feel itself.'
  ];

  /* ─── DOM refs ──────────────────────────────────────────────── */
  const floating     = document.getElementById('radio-floating');
  const badge        = document.getElementById('radio-badge');
  const closeBtn     = document.getElementById('radio-close');
  const prevBtn      = document.getElementById('radio-prev');
  const playBtn      = document.getElementById('radio-play');
  const nextBtn      = document.getElementById('radio-next');
  const shuffleBtn   = document.getElementById('radio-shuffle');
  const likeBtn      = document.getElementById('radio-like');
  const trackNameEl  = document.getElementById('radio-track-name');
  const poemEl       = document.getElementById('radio-poem');
  const queueEl      = document.getElementById('radio-queue');
  const favQueueEl   = document.getElementById('radio-fav-queue');
  const favEmptyEl   = document.getElementById('radio-fav-empty');
  const shell        = document.getElementById('radio-embed-shell');
  const searchInput  = document.getElementById('radio-search');
  const countEl      = document.getElementById('radio-count');
  const favCountEl   = document.getElementById('fav-count');
  const tabs         = document.querySelectorAll('[data-radio-tab]');
  const tabPanels    = document.querySelectorAll('[data-radio-panel]');

  if (!floating || !badge || !trackNameEl || !shell) return;

  /* ─── State ─────────────────────────────────────────────────── */
  let allTracks          = [];
  let filteredTracks     = [];
  let currentIndex       = 0;
  let hasOpened          = false;
  let poemCooldown       = false;
  let scWidget           = null;
  let scAPILoaded        = false;
  let userHasInteracted  = false;
  let deepLinkedTrack    = null;
  let activeTab          = 'radio';
  let isShuffleActive    = false;

  /* ─── Favorites (localStorage) ─────────────────────────────── */
  let favorites = (() => {
    try { return JSON.parse(localStorage.getItem(FAVS_KEY)) || []; }
    catch (_) { return []; }
  })();

  const saveFavs = () => {
    try { localStorage.setItem(FAVS_KEY, JSON.stringify(favorites)); } catch (_) {}
  };

  const isFaved = (track) => favorites.some(f => f.url === track?.url);

  const toggleFav = (track) => {
    if (!track) return;
    if (isFaved(track)) {
      favorites = favorites.filter(f => f.url !== track.url);
    } else {
      favorites.unshift({ name: track.name, url: track.url });
    }
    saveFavs();
    refreshLikeBtn();
    refreshFavCount();
    buildFavQueue();
    buildQueue(); // keep heart icons fresh in radio queue
  };

  const refreshLikeBtn = () => {
    if (!likeBtn) return;
    const on = isFaved(allTracks[currentIndex]);
    likeBtn.setAttribute('aria-pressed', String(on));
    likeBtn.classList.toggle('liked', on);
    likeBtn.title = on ? 'Remove from favorites' : 'Add to favorites';
  };

  const refreshFavCount = () => {
    if (!favCountEl) return;
    const n = favorites.length;
    favCountEl.textContent = n > 0 ? n : '';
    favCountEl.hidden = n === 0;
  };

  /* ─── Tab switching ─────────────────────────────────────────── */
  const switchTab = (tab) => {
    activeTab = tab;
    tabs.forEach(t => {
      const on = t.dataset.radioTab === tab;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    tabPanels.forEach(p => {
      p.classList.toggle('active', p.dataset.radioPanel === tab);
      p.hidden = p.dataset.radioPanel !== tab;
    });
  };

  tabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.radioTab)));

  /* ─── SC API ─────────────────────────────────────────────────── */
  const loadSCAPI = () => new Promise((resolve) => {
    if (scAPILoaded && typeof SC !== 'undefined') { resolve(true); return; }
    const existing = document.querySelector(`script[src="${SC_API_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => { scAPILoaded = true; resolve(true); });
      if (scAPILoaded) resolve(true);
      return;
    }
    const s = document.createElement('script');
    s.src = SC_API_URL;
    s.onload  = () => { scAPILoaded = true; resolve(true); };
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });

  const embedUrl = (track, autoplay = false) =>
    `https://w.soundcloud.com/player/?url=${encodeURIComponent(track.url)}&color=${EMBED_COLOR}&auto_play=${autoplay}&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false`;

  const ensureIframe = () => {
    let f = shell.querySelector('iframe');
    if (!f) {
      f = document.createElement('iframe');
      f.id = 'starmilk-radio-iframe';
      f.title = 'STARMILK Radio Player';
      f.allow = 'autoplay';
      f.setAttribute('scrolling', 'no');
      f.setAttribute('frameborder', 'no');
      shell.appendChild(f);
    }
    return f;
  };

  let pendingAutoplay = false;

  const bindWidget = async (iframe, autoplay = false) => {
    try {
      await loadSCAPI();
      if (typeof SC === 'undefined' || !SC.Widget) return;
      scWidget = SC.Widget(iframe);
      scWidget.bind(SC.Widget.Events.FINISH, () => { isPlaying = false; refreshPlayBtn(); nextTrack(true); });
      scWidget.bind(SC.Widget.Events.ERROR,  () => setTimeout(() => nextTrack(true), 1500));
      scWidget.bind(SC.Widget.Events.PLAY,   () => { isPlaying = true;  refreshPlayBtn(); });
      scWidget.bind(SC.Widget.Events.PAUSE,  () => { isPlaying = false; refreshPlayBtn(); });
      if (autoplay && userHasInteracted) {
        pendingAutoplay = true;
        scWidget.bind(SC.Widget.Events.READY, () => {
          if (pendingAutoplay) {
            pendingAutoplay = false;
            scWidget.play();
          }
        });
      }
    } catch (_) {}
  };

  /* ─── Track loading ──────────────────────────────────────────── */
  const loadTracks = async () => {
    try {
      const res = await fetch('starmilk-tracks.json');
      if (res.ok) allTracks = await res.json();
    } catch (_) {}
    if (!allTracks.length) {
      allTracks = [
        { name: 'HONEY IN THE WOUND', url: 'https://soundcloud.com/star-milk-645735333/honey-in-the-wound' },
        { name: 'WALK LIKE FRUIT',    url: 'https://soundcloud.com/star-milk-645735333/walk-like-fruit'    },
        { name: 'Basic Space',        url: 'https://soundcloud.com/star-milk-645735333/basic-space'        },
      ];
    }
    filteredTracks = [...allTracks];
    buildQueue();
    updateCount();
    if (allTracks.length) trackNameEl.textContent = allTracks[0].name;
    refreshFavCount();
    tryDiscover();
  };

  const tryDiscover = async () => {
    try {
      const loaded = await loadSCAPI();
      if (!loaded || typeof SC === 'undefined') return;
      const tmp = document.createElement('iframe');
      tmp.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(SC_PROFILE)}&auto_play=false`;
      tmp.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none;';
      document.body.appendChild(tmp);
      const w = SC.Widget(tmp);
      w.bind(SC.Widget.Events.READY, () => {
        w.getSounds((sounds) => {
          if (!sounds?.length) { tmp.remove(); return; }
          const existing = new Set(allTracks.map(t => t.url));
          const newTracks = sounds
            .filter(s => s.permalink_url && !existing.has(s.permalink_url))
            .map(s => ({ name: s.title, url: s.permalink_url }));
          if (newTracks.length) {
            const anchor = deepLinkedTrack || allTracks[currentIndex]?.name;
            allTracks = [...newTracks, ...allTracks];
            if (anchor) {
              const idx = allTracks.findIndex(t => t.name === anchor);
              if (idx !== -1) {
                currentIndex = idx;
                if (deepLinkedTrack) swapTrack(false);
              }
            }
            filteredTracks = [...allTracks];
            buildQueue();
            updateCount();
          }
          tmp.remove();
        });
      });
    } catch (_) {}
  };

  /* ─── Queue building ─────────────────────────────────────────── */
  let searchTimer = null;
  const handleSearch = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const q = (searchInput?.value || '').toLowerCase().trim();
      filteredTracks = q ? allTracks.filter(t => t.name.toLowerCase().includes(q)) : [...allTracks];
      buildQueue();
      updateCount();
    }, 180);
  };

  const updateCount = () => {
    if (!countEl) return;
    countEl.textContent = filteredTracks.length === allTracks.length
      ? `${allTracks.length} tracks`
      : `${filteredTracks.length} / ${allTracks.length}`;
  };

  // Generate a unique gradient for a track based on its name
  const trackGradient = (name) => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
    const hue1 = ((h & 0xFF) / 255 * 60) + 240;       // 240-300 (purple-blue range)
    const hue2 = (((h >> 8) & 0xFF) / 255 * 40) + 20;  // 20-60 (gold-amber range)
    const angle = ((h >> 16) & 0xFF) / 255 * 360;
    return `linear-gradient(${angle}deg, hsla(${hue1},40%,20%,.7), hsla(${hue2},50%,30%,.5))`;
  };

  // Update the track art square
  const updateTrackArt = () => {
    const art = document.getElementById('radio-track-art');
    if (!art || !allTracks[currentIndex]) return;
    art.style.background = trackGradient(allTracks[currentIndex].name);
  };

  const buildQueue = () => {
    if (!queueEl) return;
    queueEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    filteredTracks.forEach((track, i) => {
      const row   = document.createElement('div');
      const globalIdx = allTracks.indexOf(track);
      row.className = 'radio-queue-item' + (globalIdx === currentIndex ? ' active' : '');
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', globalIdx === currentIndex ? 'true' : 'false');

      // Track number
      const numEl = document.createElement('span');
      numEl.className = 'radio-queue-num';
      numEl.textContent = String(globalIdx + 1);

      const nameEl = document.createElement('button');
      nameEl.type = 'button';
      nameEl.className = 'radio-queue-name';
      nameEl.textContent = track.name;
      nameEl.setAttribute('aria-label', `Play ${track.name}`);
      nameEl.addEventListener('click', () => { currentIndex = globalIdx; swapTrack(true); });

      const heartBtn = document.createElement('button');
      heartBtn.type = 'button';
      heartBtn.className = 'radio-queue-heart' + (isFaved(track) ? ' liked' : '');
      heartBtn.setAttribute('aria-label', isFaved(track) ? 'Remove from favorites' : 'Add to favorites');
      heartBtn.setAttribute('aria-pressed', isFaved(track) ? 'true' : 'false');
      heartBtn.innerHTML = SVG.heart;
      heartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFav(track);
      });

      row.appendChild(numEl);
      row.appendChild(nameEl);
      row.appendChild(heartBtn);
      frag.appendChild(row);
    });
    queueEl.appendChild(frag);
  };

  const buildFavQueue = () => {
    if (!favQueueEl) return;
    favQueueEl.innerHTML = '';
    if (favEmptyEl) favEmptyEl.hidden = favorites.length > 0;
    if (!favorites.length) return;
    const frag = document.createDocumentFragment();
    favorites.forEach(track => {
      const row = document.createElement('div');
      const globalIdx = allTracks.findIndex(t => t.url === track.url);
      row.className = 'radio-queue-item' + (globalIdx === currentIndex ? ' active' : '');
      row.setAttribute('role', 'option');

      const nameEl = document.createElement('button');
      nameEl.type = 'button';
      nameEl.className = 'radio-queue-name';
      nameEl.textContent = track.name;
      nameEl.setAttribute('aria-label', `Play ${track.name}`);
      nameEl.addEventListener('click', () => {
        if (globalIdx !== -1) { currentIndex = globalIdx; swapTrack(true); }
      });

      const heartBtn = document.createElement('button');
      heartBtn.type = 'button';
      heartBtn.className = 'radio-queue-heart liked';
      heartBtn.setAttribute('aria-label', 'Remove from favorites');
      heartBtn.setAttribute('aria-pressed', 'true');
      heartBtn.innerHTML = SVG.heart;
      heartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFav(track);
      });

      row.appendChild(nameEl);
      row.appendChild(heartBtn);
      frag.appendChild(row);
    });
    favQueueEl.appendChild(frag);
  };

  const updateQueueActive = () => {
    document.querySelectorAll('.radio-queue-item').forEach(row => {
      const nameBtn = row.querySelector('.radio-queue-name');
      const track   = allTracks.find(t => t.name === nameBtn?.textContent);
      const active  = allTracks.indexOf(track) === currentIndex;
      row.classList.toggle('active', active);
      row.setAttribute('aria-selected', String(active));
    });
    const activeEl = queueEl?.querySelector('.radio-queue-item.active');
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  /* ─── Playback ───────────────────────────────────────────────── */
  const swapTrack = (autoplay = false) => {
    if (!allTracks.length) return;
    const track = allTracks[currentIndex];
    trackNameEl.textContent = track.name;
    const shouldPlay = autoplay && userHasInteracted;
    const iframe = ensureIframe();
    iframe.src = embedUrl(track, shouldPlay);
    bindWidget(iframe, shouldPlay);
    updateQueueActive();
    refreshLikeBtn();
    updateTrackArt();
    maybePoem();
  };

  const nextTrack = (autoplay = false) => {
    if (!allTracks.length) return;
    if (isShuffleActive) {
      let idx;
      do { idx = Math.floor(Math.random() * allTracks.length); }
      while (idx === currentIndex && allTracks.length > 1);
      currentIndex = idx;
    } else {
      currentIndex = (currentIndex + 1) % allTracks.length;
    }
    swapTrack(autoplay);
  };

  const prevTrack = () => {
    if (!allTracks.length) return;
    currentIndex = (currentIndex - 1 + allTracks.length) % allTracks.length;
    swapTrack(true);
  };

  const toggleShuffle = () => {
    isShuffleActive = !isShuffleActive;
    shuffleBtn?.classList.toggle('active', isShuffleActive);
    shuffleBtn?.setAttribute('aria-pressed', String(isShuffleActive));
    showToast(isShuffleActive ? 'Shuffle on' : 'Shuffle off');
  };

  let isPlaying = false;

  const refreshPlayBtn = () => {
    if (!playBtn) return;
    playBtn.innerHTML = isPlaying ? SVG.pause : SVG.play;
    playBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
    playBtn.setAttribute('aria-pressed', String(isPlaying));
    playBtn.classList.toggle('active', isPlaying);
  };

  const togglePlay = () => {
    if (!scWidget) {
      // No widget yet — load the current track and play
      if (allTracks.length) swapTrack(true);
      return;
    }
    scWidget.isPaused((paused) => {
      if (paused) {
        scWidget.play();
        isPlaying = true;
      } else {
        scWidget.pause();
        isPlaying = false;
      }
      refreshPlayBtn();
    });
  };

  /* ─── Poem ───────────────────────────────────────────────────── */
  const maybePoem = () => {
    if (!poemEl || poemCooldown || Math.random() < 0.6) return;
    poemCooldown = true;
    poemEl.textContent = POEMS[Math.floor(Math.random() * POEMS.length)];
    poemEl.classList.add('visible');
    setTimeout(() => poemEl.classList.remove('visible'), 6000);
    setTimeout(() => { poemCooldown = false; }, 10000);
  };

  /* ─── Toast ──────────────────────────────────────────────────── */
  const showToast = (msg) => {
    floating.querySelectorAll('.radio-toast').forEach(t => t.remove());
    const toast = document.createElement('div');
    toast.className = 'radio-toast';
    toast.textContent = msg;
    floating.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2200);
  };

  /* ─── SVG icons ──────────────────────────────────────────────── */
  const SVG = {
    heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    prev:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>`,
    play:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="4" x2="6" y2="20"/><line x1="18" y1="4" x2="18" y2="20"/></svg>`,
    next:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="4" x2="19" y2="20"/></svg>`,
    shuffle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>`,
    share:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
  };

  /* ─── Open / close ───────────────────────────────────────────── */
  const markInteracted = () => { userHasInteracted = true; };
  document.addEventListener('click',      markInteracted, { once: true });
  document.addEventListener('touchstart', markInteracted, { once: true });
  document.addEventListener('keydown',    markInteracted, { once: true });

  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    userHasInteracted = true; // badge click IS user interaction
    const nowOpen = floating.classList.toggle('open');
    floating.classList.toggle('collapsed', !nowOpen);
    badge.setAttribute('aria-expanded', String(nowOpen));
    if (nowOpen && !hasOpened) {
      hasOpened = true;
      // Inject SVG icons into controls
      if (prevBtn)    prevBtn.innerHTML    = SVG.prev;
      if (playBtn)    playBtn.innerHTML    = SVG.play;
      if (nextBtn)    nextBtn.innerHTML    = SVG.next;
      if (shuffleBtn) shuffleBtn.innerHTML = SVG.shuffle;
      if (likeBtn)    likeBtn.innerHTML    = SVG.heart;
      const shareBtn = document.getElementById('radio-share');
      if (shareBtn)   shareBtn.innerHTML   = SVG.share;
      buildFavQueue();
      refreshFavCount();
      if (allTracks.length) swapTrack(true);
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      floating.classList.remove('open');
      floating.classList.add('collapsed');
      badge.setAttribute('aria-expanded', 'false');
    });
  }

  floating.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && floating.classList.contains('open')) {
      floating.classList.remove('open');
      floating.classList.add('collapsed');
      badge.setAttribute('aria-expanded', 'false');
      badge.focus();
    }
  });

  if (prevBtn)    prevBtn.addEventListener('click',    prevTrack);
  if (playBtn)    playBtn.addEventListener('click',    togglePlay);
  if (nextBtn)    nextBtn.addEventListener('click',    () => nextTrack(true));
  if (shuffleBtn) shuffleBtn.addEventListener('click', toggleShuffle);
  if (likeBtn)    likeBtn.addEventListener('click',    () => toggleFav(allTracks[currentIndex]));
  if (searchInput) searchInput.addEventListener('input', handleSearch);

  /* ─── Share ──────────────────────────────────────────────────── */
  const slugify = (s) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const shareBtn = document.getElementById('radio-share');
  if (shareBtn) {
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const track = allTracks[currentIndex];
      if (!track) return;
      const sections = document.querySelectorAll('section[id]');
      let vis = '';
      sections.forEach(sec => {
        const r = sec.getBoundingClientRect();
        if (r.top <= window.innerHeight / 2 && r.bottom > 0) vis = sec.id;
      });
      const secParam = vis && vis !== 'hero' ? `&section=${vis}` : '';
      const url = `${location.origin}${location.pathname}?radio=1&track=${slugify(track.name)}${secParam}`;
      const copied = () => {
        shareBtn.classList.add('copied');
        showToast('Link copied!');
        setTimeout(() => shareBtn.classList.remove('copied'), 2000);
      };
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(url).then(copied).catch(() => {
          const ta = Object.assign(document.createElement('textarea'), { value: url, style: 'position:fixed;opacity:0' });
          document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); ta.remove(); copied();
        });
      }
    });
  }

  /* ─── Deep link ──────────────────────────────────────────────── */
  const handleDeepLink = () => {
    try {
      const p = new URLSearchParams(location.search);
      const sec = p.get('section');
      if (sec) {
        const el = document.getElementById(sec);
        if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 600);
      }
      if (p.get('radio') !== '1') return;
      floating.classList.add('open');
      floating.classList.remove('collapsed');
      badge.setAttribute('aria-expanded', 'true');
      hasOpened = true;
      const slug = p.get('track');
      if (slug && allTracks.length) {
        const idx = allTracks.findIndex(t => slugify(t.name) === slug);
        if (idx !== -1) { currentIndex = idx; deepLinkedTrack = allTracks[idx].name; }
      }
      if (prevBtn)    prevBtn.innerHTML    = SVG.prev;
      if (playBtn)    playBtn.innerHTML    = SVG.play;
      if (nextBtn)    nextBtn.innerHTML    = SVG.next;
      if (shuffleBtn) shuffleBtn.innerHTML = SVG.shuffle;
      if (likeBtn)    likeBtn.innerHTML    = SVG.heart;
      const sb = document.getElementById('radio-share');
      if (sb) sb.innerHTML = SVG.share;
      buildFavQueue();
      refreshFavCount();
      if (allTracks.length) swapTrack(false);
    } catch (_) {}
  };

  /* ─── Init ───────────────────────────────────────────────────── */
  loadTracks().then(handleDeepLink).catch(handleDeepLink);

})();
