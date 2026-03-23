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
  let deepLinkedTrackName = null;

  const markInteracted = () => { userHasInteracted = true; };
  document.addEventListener('click', markInteracted, { once: true });
  document.addEventListener('touchstart', markInteracted, { once: true });
  document.addEventListener('keydown', markInteracted, { once: true });

  const loadSCAPI = () => new Promise((resolve) => {
    if (scAPILoaded && typeof SC !== 'undefined' && SC.Widget) { resolve(true); return; }
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

  const embedUrl = (track, autoplay = false) =>
    `https://w.soundcloud.com/player/?url=${encodeURIComponent(track.url)}&color=${EMBED_COLOR}&auto_play=${autoplay}&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false`;

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

  const bindWidgetEvents = async (iframe) => {
    try {
      await loadSCAPI();
      if (typeof SC === 'undefined' || !SC.Widget) return;
      scWidget = SC.Widget(iframe);
      scWidget.bind(SC.Widget.Events.FINISH, () => { nextTrack(true); });
      scWidget.bind(SC.Widget.Events.ERROR, () => { setTimeout(() => nextTrack(true), 1500); });
    } catch (_) {}
  };

  const loadTracks = async () => {
    try {
      const res = await fetch('starmilk-tracks.json');
      if (res.ok) { allTracks = await res.json(); }
    } catch (_) {}
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
    if (allTracks.length > 0) { trackNameEl.textContent = allTracks[0].name; }
    tryDiscoverNewTracks();
  };

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
            // Prefer deep-linked track name for re-anchoring, fall back to current
            const anchorName = deepLinkedTrackName || allTracks[currentTrackIndex]?.name;
            allTracks = [...newTracks, ...allTracks];
            if (anchorName) {
              const newIdx = allTracks.findIndex(t => t.name === anchorName);
              if (newIdx !== -1) {
                currentTrackIndex = newIdx;
                // Re-swap to the correct track if deep link was active
                if (deepLinkedTrackName) { swapTrack(false); }
              }
            }
            filteredTracks = [...allTracks];
            buildQueue();
            updateCount();
          }
          profileIframe.remove();
        });
      });
    } catch (_) {}
  };

  let searchTimeout = null;
  const handleSearch = () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const q = (searchInput?.value || '').toLowerCase().trim();
      filteredTracks = !q ? [...allTracks] : allTracks.filter(t => t.name.toLowerCase().includes(q));
      buildQueue();
      updateCount();
    }, 180);
  };

  const updateCount = () => {
    if (!countEl) return;
    countEl.textContent = filteredTracks.length === allTracks.length
      ? `${allTracks.length} tracks`
      : `${filteredTracks.length} of ${allTracks.length} tracks`;
  };

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
      item.classList.toggle('active', item.textContent === currentTrack?.name);
    });
    const activeItem = queueEl.querySelector('.radio-queue-item.active');
    if (activeItem) activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const swapTrack = (shouldAutoplay = false) => {
    if (allTracks.length === 0) return;
    const track = allTracks[currentTrackIndex];
    trackNameEl.textContent = track.name;
    const iframe = ensureIframe();
    const autoplay = shouldAutoplay && userHasInteracted;
    iframe.src = embedUrl(track, autoplay);
    bindWidgetEvents(iframe);
    updateQueueActive();
    maybeShowPoem();
  };

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

  const maybeShowPoem = () => {
    if (!poemEl || poemCooldown || Math.random() < 0.6) return;
    poemCooldown = true;
    poemEl.textContent = poems[Math.floor(Math.random() * poems.length)];
    poemEl.classList.add('visible');
    setTimeout(() => poemEl.classList.remove('visible'), 6000);
    setTimeout(() => { poemCooldown = false; }, 10000);
  };

  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    const collapsed = floating.classList.toggle('collapsed');
    badge.setAttribute('aria-expanded', String(!collapsed));
    badge.textContent = collapsed ? 'STARMILK RADIO ✦' : '✕ close';
    if (!collapsed && !hasOpened) {
      hasOpened = true;
      if (allTracks.length > 0) { swapTrack(userHasInteracted); }
    }
  });

  floating.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !floating.classList.contains('collapsed')) {
      floating.classList.add('collapsed');
      badge.setAttribute('aria-expanded', 'false');
      badge.textContent = 'STARMILK RADIO ✦';
      badge.focus();
    }
  });

  if (prevBtn) prevBtn.addEventListener('click', prevTrack);
  if (nextBtn) nextBtn.addEventListener('click', () => nextTrack(true));
  if (shuffleBtn) shuffleBtn.addEventListener('click', shufflePlay);
  if (searchInput) searchInput.addEventListener('input', handleSearch);

  // Slugify helper
  const slugify = (str) =>
    str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  // Show a brief toast inside the radio panel
  const showToast = (msg) => {
    const existing = floating.querySelector('.radio-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'radio-toast';
    toast.textContent = msg;
    toast.style.cssText = 'position:absolute;bottom:4rem;left:50%;transform:translateX(-50%);background:rgba(201,148,74,.92);color:#0b0e1a;padding:.35rem .9rem;border-radius:999px;font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;z-index:9999;pointer-events:none;';
    floating.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
  };

  // Deep-link: handle ?radio=1&track=<slug> and ?section=<id>
  const handleDeepLink = () => {
    try {
      const params = new URLSearchParams(window.location.search);

      // Section deep-link: scroll to any section (e.g., ?section=games)
      const sectionId = params.get('section');
      if (sectionId) {
        const sectionEl = document.getElementById(sectionId);
        if (sectionEl) {
          // Small delay to allow mood/page init to settle
          setTimeout(() => {
            sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 600);
        }
      }

      // Radio deep-link: open panel and optionally seek to a specific track
      if (params.get('radio') !== '1') return;
      floating.classList.remove('collapsed');
      badge.setAttribute('aria-expanded', 'true');
      badge.textContent = '✕ close';
      hasOpened = true;
      // Find matching track by slug
      const trackSlug = params.get('track');
      if (trackSlug && allTracks.length > 0) {
        const idx = allTracks.findIndex(t => slugify(t.name) === trackSlug);
        if (idx !== -1) {
          currentTrackIndex = idx;
          deepLinkedTrackName = allTracks[idx].name;
        }
      }
      if (allTracks.length > 0) { swapTrack(false); }
    } catch (err) {
      console.error('[STARMILK Radio] deep-link error:', err);
    }
  };

  // Share button: copy deep-link URL to clipboard
  const createShareButton = () => {
    const shareBtn = document.getElementById('radio-share');
    if (!shareBtn) return;
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const track = allTracks[currentTrackIndex];
      if (!track) return;
      const slug = slugify(track.name);
      // Include current section in the share link if user scrolled to one
      const sections = document.querySelectorAll('section[id]');
      let visibleSection = '';
      sections.forEach((sec) => {
        const rect = sec.getBoundingClientRect();
        if (rect.top <= window.innerHeight / 2 && rect.bottom > 0) {
          visibleSection = sec.id;
        }
      });
      const sectionParam = visibleSection && visibleSection !== 'hero' ? `&section=${visibleSection}` : '';
      const url = `${window.location.origin}${window.location.pathname}?radio=1&track=${slug}${sectionParam}`;
      const onCopied = () => {
        shareBtn.classList.add('copied');
        shareBtn.textContent = '✓';
        showToast('Link copied!');
        setTimeout(() => {
          shareBtn.classList.remove('copied');
          shareBtn.textContent = '🔗';
        }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(onCopied).catch(() => {
          const ta = document.createElement('textarea');
          ta.value = url; ta.style.cssText = 'position:fixed;opacity:0';
          document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); ta.remove();
          onCopied();
        });
      } else {
        const ta = document.createElement('textarea');
        ta.value = url; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
        onCopied();
      }
    });
  };

  createShareButton();

  // Init: load tracks then handle deep-link
  loadTracks().then(handleDeepLink).catch((err) => {
    console.error('[STARMILK Radio] init error:', err);
    handleDeepLink();
  });

})();
