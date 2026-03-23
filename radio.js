/**
 * STARMILK Radio — Corner Player with URL Deep-Linking
 *
 * Supports:
 *   ?radio=1               — opens the player on page load
 *   ?radio=1&track=<slug>  — opens AND seeks to the named track
 *
 * Share button copies the deep-link URL for the current track.
 *
 * Uses the SoundCloud Widget API (loaded lazily on first open).
 * The embed points to the full STARMILK SC catalog so all 302+
 * tracks are available in infinite shuffle.
 */
(function () {
  'use strict';

  // ── Known tracks (for slug pre-matching before SC API resolves)
  // Extend this list as new releases are added; slugs are auto-derived.
  var KNOWN = [
    'TRIBE STAR MILK',
    'Kaleidoscopic Truth',
    'Honey in the Wound',
    'Signal from the Void',
    'Quantum Drift',
    'Starfield Lullaby',
    'Nebula Heart',
    'Cosmic Bleed',
    'River Memory',
    'The Trembling',
  ];

  // ── SoundCloud catalog — single embed loads full user library
  var SC_USER_URL  = 'https://soundcloud.com/star-milk-645735333';
  var SC_EMBED_URL =
    'https://w.soundcloud.com/player/?url=' +
    encodeURIComponent(SC_USER_URL) +
    '&color=%239333ea&hide_related=true&show_comments=false' +
    '&show_user=true&show_reposts=false&show_teaser=false';

  // ── Slugify: lowercase, spaces→hyphens, strip non-alphanumeric
  function slugify(s) {
    return String(s)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  // ── URL params (read once at parse time)
  var params     = new URLSearchParams(window.location.search);
  var autoOpen   = params.get('radio') === '1';
  var trackSlug  = params.get('track') || '';

  // ── Runtime state
  var isOpen       = false;
  var widget       = null;        // SC.Widget instance
  var widgetReady  = false;
  var currentTitle = KNOWN[0];    // updated by widget events
  var pendingSlug  = '';          // slug to seek once widget is ready
  var allSounds    = [];          // populated from getSounds()

  // ── DOM refs (set in buildDOM)
  var panelEl, toggleBtn, trackNameEl, toastEl, iframeEl, trackListEl;

  // ═══════════════════════════════════════════════════════════════════════
  // DOM CONSTRUCTION
  // ═══════════════════════════════════════════════════════════════════════

  function buildDOM() {
    // ── Styles
    var style = document.createElement('style');
    style.textContent = [
      /* ---------- toggle button ---------- */
      '#smr-toggle {',
      '  position:fixed; bottom:2rem; right:2rem; z-index:251;',
      '  width:52px; height:52px; border-radius:50%;',
      '  background:linear-gradient(135deg,#7c3aed,#0d9488);',
      '  border:2px solid rgba(147,51,234,.6);',
      '  box-shadow:0 0 22px rgba(147,51,234,.55),0 4px 18px rgba(0,0,0,.45);',
      '  cursor:pointer; color:#fff; font-size:1.35rem;',
      '  display:flex; align-items:center; justify-content:center;',
      '  transition:transform .25s,box-shadow .25s,background .25s;',
      '  animation:smrGlow 3.2s ease-in-out infinite alternate;',
      '}',
      '#smr-toggle:hover {',
      '  transform:scale(1.14);',
      '  box-shadow:0 0 38px rgba(147,51,234,.8),0 6px 26px rgba(0,0,0,.5);',
      '}',
      '#smr-toggle.smr-open {',
      '  background:linear-gradient(135deg,#f59e0b,#d97706);',
      '  border-color:rgba(245,158,11,.7);',
      '  animation:none;',
      '}',
      '@keyframes smrGlow {',
      '  from{box-shadow:0 0 14px rgba(147,51,234,.42),0 4px 14px rgba(0,0,0,.4);}',
      '  to  {box-shadow:0 0 32px rgba(147,51,234,.78),0 4px 24px rgba(13,148,136,.35);}',
      '}',

      /* ---------- panel ---------- */
      '#smr-panel {',
      '  position:fixed; bottom:6.2rem; right:2rem; z-index:250;',
      '  width:316px;',
      '  border-radius:16px;',
      '  background:linear-gradient(160deg,rgba(9,0,20,.97) 0%,rgba(17,8,30,.97) 100%);',
      '  border:1px solid rgba(147,51,234,.38);',
      '  box-shadow:0 0 44px rgba(109,40,217,.32),0 10px 44px rgba(0,0,0,.65);',
      '  display:flex; flex-direction:column; overflow:hidden;',
      '  transform:translateY(14px) scale(.96); opacity:0; pointer-events:none;',
      '  transition:transform .3s cubic-bezier(.34,1.56,.64,1),opacity .22s ease;',
      '  font-family:"Segoe UI",system-ui,sans-serif;',
      '}',
      '#smr-panel.smr-open {',
      '  transform:translateY(0) scale(1); opacity:1; pointer-events:auto;',
      '}',

      /* header */
      '.smr-hdr {',
      '  padding:.9rem 1.05rem .65rem;',
      '  border-bottom:1px solid rgba(147,51,234,.18);',
      '  display:flex; align-items:center; justify-content:space-between;',
      '}',
      '.smr-logo {',
      '  font-size:.62rem; font-weight:800; letter-spacing:.26em; text-transform:uppercase;',
      '  background:linear-gradient(120deg,#fcd34d,#c084fc,#818cf8);',
      '  -webkit-background-clip:text; -webkit-text-fill-color:transparent;',
      '  background-clip:text;',
      '}',
      '.smr-close {',
      '  width:26px; height:26px; border-radius:50%;',
      '  background:rgba(147,51,234,.13); border:1px solid rgba(147,51,234,.28);',
      '  color:#9d8ec4; cursor:pointer; font-size:.85rem;',
      '  display:flex; align-items:center; justify-content:center;',
      '  transition:background .2s,color .2s; flex-shrink:0;',
      '}',
      '.smr-close:hover{background:rgba(147,51,234,.3);color:#fff;}',

      /* now-playing row */
      '.smr-np {',
      '  padding:.75rem 1.05rem .55rem;',
      '  border-bottom:1px solid rgba(147,51,234,.1);',
      '}',
      '.smr-np-lbl {',
      '  display:block; font-size:.56rem; letter-spacing:.22em;',
      '  text-transform:uppercase; color:#9333ea; margin-bottom:.22rem;',
      '}',
      '.smr-np-row {display:flex;align-items:center;gap:.5rem;}',
      '.smr-np-title {',
      '  font-size:.88rem; font-weight:700; color:#e2d9f3;',
      '  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;',
      '}',
      '#smr-share {',
      '  width:28px; height:28px; border-radius:50%;',
      '  background:rgba(13,148,136,.14); border:1px solid rgba(13,148,136,.32);',
      '  color:#2dd4bf; cursor:pointer; display:flex; align-items:center; justify-content:center;',
      '  transition:background .2s,transform .2s; flex-shrink:0;',
      '}',
      '#smr-share:hover{background:rgba(13,148,136,.28);transform:scale(1.13);}',

      /* embed */
      '.smr-embed {padding:.7rem 1.05rem; border-bottom:1px solid rgba(147,51,234,.1);}',
      '.smr-embed iframe{width:100%;height:112px;border:0;border-radius:10px;display:block;}',

      /* track list */
      '#smr-tracklist {',
      '  overflow-y:auto; max-height:230px; padding:.4rem 0;',
      '  scrollbar-width:thin; scrollbar-color:rgba(147,51,234,.3) transparent;',
      '}',
      '#smr-tracklist::-webkit-scrollbar{width:4px;}',
      '#smr-tracklist::-webkit-scrollbar-thumb{background:rgba(147,51,234,.32);border-radius:2px;}',
      '.smr-ti {',
      '  display:flex; align-items:center; gap:.55rem;',
      '  padding:.5rem 1.05rem; cursor:pointer;',
      '  border-left:2px solid transparent;',
      '  transition:background .14s;',
      '}',
      '.smr-ti:hover{background:rgba(147,51,234,.07);}',
      '.smr-ti.smr-active{background:rgba(147,51,234,.11);border-left-color:#9333ea;}',
      '.smr-ti-num{font-size:.62rem;color:#9d8ec4;width:20px;text-align:right;flex-shrink:0;font-family:monospace;}',
      '.smr-ti-title{font-size:.76rem;color:#e2d9f3;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.3;}',
      '.smr-ti-dur{font-size:.62rem;color:#9d8ec4;font-family:monospace;flex-shrink:0;}',
      '.smr-ti.smr-active .smr-ti-title{color:#c084fc;}',

      /* footer hint */
      '.smr-foot {',
      '  padding:.55rem 1.05rem; border-top:1px solid rgba(147,51,234,.1);',
      '  font-size:.58rem; color:#9d8ec4; text-align:center;',
      '}',

      /* toast */
      '#smr-toast {',
      '  position:fixed; bottom:7.2rem; right:2rem; z-index:260;',
      '  padding:.55rem 1.1rem; border-radius:22px;',
      '  background:rgba(13,148,136,.93); color:#fff; font-size:.8rem; font-weight:600;',
      '  pointer-events:none; opacity:0; transform:translateY(6px);',
      '  transition:opacity .24s,transform .24s;',
      '  border:1px solid rgba(45,212,191,.45);',
      '  box-shadow:0 4px 20px rgba(13,148,136,.38);',
      '}',
      '#smr-toast.smr-show{opacity:1;transform:translateY(0);}',

      /* mobile */
      '@media(max-width:480px){',
      '  #smr-panel{width:calc(100vw - 2rem);right:1rem;bottom:5.4rem;}',
      '  #smr-toggle{bottom:1.5rem;right:1rem;}',
      '  #smr-toast{right:1rem;bottom:6.5rem;}',
      '}',
    ].join('\n');
    document.head.appendChild(style);

    // ── Toggle button
    toggleBtn = document.createElement('button');
    toggleBtn.id = 'smr-toggle';
    toggleBtn.setAttribute('aria-label', 'Open STARMILK Radio');
    toggleBtn.innerHTML = '<span aria-hidden="true">&#9835;</span>';
    document.body.appendChild(toggleBtn);
    toggleBtn.addEventListener('click', togglePlayer);

    // ── Panel
    panelEl = document.createElement('div');
    panelEl.id = 'smr-panel';
    panelEl.setAttribute('role', 'dialog');
    panelEl.setAttribute('aria-label', 'STARMILK Radio');
    panelEl.innerHTML =
      '<div class="smr-hdr">' +
        '<span class="smr-logo">&#9733; STARMILK RADIO &#9733;</span>' +
        '<button class="smr-close" id="smr-close-btn" aria-label="Close radio">&#10005;</button>' +
      '</div>' +
      '<div class="smr-np">' +
        '<span class="smr-np-lbl">&#9679; NOW PLAYING</span>' +
        '<div class="smr-np-row">' +
          '<div class="smr-np-title" id="smr-track-name">' + KNOWN[0] + '</div>' +
          '<button id="smr-share" title="Copy link to this track" aria-label="Share track link">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>' +
              '<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>' +
              '<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="smr-embed">' +
        '<iframe id="smr-iframe" src="about:blank" allow="autoplay" allowfullscreen title="STARMILK Radio"></iframe>' +
      '</div>' +
      '<div id="smr-tracklist"></div>' +
      '<div class="smr-foot">Tap a track &bull; Share link &bull; Infinite cosmic shuffle</div>';
    document.body.appendChild(panelEl);

    // ── Toast
    toastEl = document.createElement('div');
    toastEl.id = 'smr-toast';
    toastEl.textContent = '\uD83D\uDD17 Link copied!';
    document.body.appendChild(toastEl);

    // Cache refs
    iframeEl    = document.getElementById('smr-iframe');
    trackNameEl = document.getElementById('smr-track-name');
    trackListEl = document.getElementById('smr-tracklist');

    // Events
    document.getElementById('smr-close-btn').addEventListener('click', closePlayer);
    document.getElementById('smr-share').addEventListener('click', shareTrack);

    // Render known track list immediately (will be replaced by SC data later)
    renderTrackList(KNOWN.map(function (t) { return { title: t }; }));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SOUNDCLOUD WIDGET API
  // ═══════════════════════════════════════════════════════════════════════

  function loadSCApi(callback) {
    if (window.SC) { callback(); return; }
    var s = document.createElement('script');
    s.src = 'https://w.soundcloud.com/player/api.js';
    s.onload = callback;
    document.head.appendChild(s);
  }

  function initWidget() {
    if (widget) return;
    widget = window.SC.Widget(iframeEl);

    widget.bind(window.SC.Widget.Events.READY, onWidgetReady);
    widget.bind(window.SC.Widget.Events.PLAY,  onWidgetPlay);
  }

  function onWidgetReady() {
    widgetReady = true;

    // Populate track list from SC catalog
    widget.getSounds(function (sounds) {
      if (sounds && sounds.length) {
        allSounds = sounds;
        renderTrackList(sounds);
      }

      // Handle pending deep-link slug
      if (pendingSlug) {
        seekToSlug(pendingSlug, true);
        pendingSlug = '';
      }
    });
  }

  function onWidgetPlay() {
    widget.getCurrentSound(function (sound) {
      if (sound && sound.title) {
        currentTitle = sound.title;
        if (trackNameEl) trackNameEl.textContent = sound.title;
        highlightActiveTrack(sound.title);
      }
    });
  }

  // ── Seek to a track by slug; autoplay optional
  function seekToSlug(slug, autoplay) {
    if (!widgetReady) { pendingSlug = slug; return; }

    var idx = -1;

    // 1. Search SC sounds (most accurate — real titles)
    if (allSounds.length) {
      idx = findIdxInList(allSounds, slug);
    }

    // 2. Fall back to KNOWN list index
    if (idx < 0) {
      var ki = KNOWN.findIndex(function (t) { return slugify(t) === slug; });
      if (ki >= 0) idx = ki;
    }

    if (idx >= 0) {
      widget.skip(idx);
      if (autoplay) widget.play();
    }
  }

  function findIdxInList(list, slug) {
    for (var i = 0; i < list.length; i++) {
      if (slugify(list[i].title) === slug) return i;
    }
    return -1;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TRACK LIST RENDERING
  // ═══════════════════════════════════════════════════════════════════════

  function renderTrackList(list) {
    if (!trackListEl || !list) return;
    var html = '';
    for (var i = 0; i < list.length; i++) {
      var t   = list[i];
      var dur = t.duration ? fmtMs(t.duration) : '';
      html +=
        '<div class="smr-ti" data-idx="' + i + '" tabindex="0">' +
          '<span class="smr-ti-num">' + (i + 1) + '</span>' +
          '<span class="smr-ti-title">' + escHtml(t.title) + '</span>' +
          (dur ? '<span class="smr-ti-dur">' + dur + '</span>' : '') +
        '</div>';
    }
    trackListEl.innerHTML = html;

    // Click / keyboard handlers
    var items = trackListEl.querySelectorAll('.smr-ti');
    for (var j = 0; j < items.length; j++) {
      (function (el) {
        el.addEventListener('click', function () { playByIdx(parseInt(el.dataset.idx, 10)); });
        el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playByIdx(parseInt(el.dataset.idx, 10)); }
        });
      })(items[j]);
    }
  }

  function highlightActiveTrack(title) {
    if (!trackListEl) return;
    var items = trackListEl.querySelectorAll('.smr-ti');
    for (var i = 0; i < items.length; i++) {
      var t = items[i].querySelector('.smr-ti-title');
      var match = t && t.textContent === title;
      items[i].classList.toggle('smr-active', match);
      if (match) items[i].querySelector('.smr-ti-num').textContent = '\u25B6';
      else items[i].querySelector('.smr-ti-num').textContent = (i + 1).toString();
    }
  }

  function playByIdx(idx) {
    if (!widgetReady) return;
    widget.skip(idx);
    widget.play();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PLAYER OPEN / CLOSE
  // ═══════════════════════════════════════════════════════════════════════

  function openPlayer(autoplay) {
    isOpen = true;
    panelEl.classList.add('smr-open');
    toggleBtn.classList.add('smr-open');
    toggleBtn.setAttribute('aria-label', 'Close STARMILK Radio');
    toggleBtn.innerHTML = '<span aria-hidden="true">&#10005;</span>';

    // Load the SC embed into iframe (only once)
    if (!iframeEl.src || iframeEl.src === 'about:blank') {
      var src = SC_EMBED_URL + '&auto_play=' + (autoplay ? 'true' : 'false');
      iframeEl.src = src;
    }

    // Lazily load SC Widget API
    loadSCApi(initWidget);
  }

  function closePlayer() {
    isOpen = false;
    panelEl.classList.remove('smr-open');
    toggleBtn.classList.remove('smr-open');
    toggleBtn.setAttribute('aria-label', 'Open STARMILK Radio');
    toggleBtn.innerHTML = '<span aria-hidden="true">&#9835;</span>';
  }

  function togglePlayer() {
    isOpen ? closePlayer() : openPlayer(false);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SHARE BUTTON
  // ═══════════════════════════════════════════════════════════════════════

  function shareTrack() {
    var slug = slugify(currentTitle);
    var url  = location.origin + location.pathname + '?radio=1&track=' + slug;

    var p = (navigator.clipboard && navigator.clipboard.writeText)
      ? navigator.clipboard.writeText(url)
      : Promise.reject(new Error('no clipboard'));

    p.then(showToast).catch(function () { fallbackCopy(url); });
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;width:1px;height:1px;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast(); } catch (e) {}
    document.body.removeChild(ta);
  }

  function showToast() {
    toastEl.classList.add('smr-show');
    setTimeout(function () { toastEl.classList.remove('smr-show'); }, 2000);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // URL DEEP-LINK HANDLING
  // ═══════════════════════════════════════════════════════════════════════

  function handleDeepLink() {
    if (!autoOpen) return;

    // If a specific track is requested, mark it as pending before widget loads
    if (trackSlug) pendingSlug = trackSlug;

    // Slight delay so the page renders visibly before player animates in
    setTimeout(function () {
      openPlayer(!!trackSlug); // autoplay only when a specific track was requested
    }, 180);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TINY HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  function fmtMs(ms) {
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    return m + ':' + ('0' + (s % 60)).slice(-2);
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BOOTSTRAP
  // ═══════════════════════════════════════════════════════════════════════

  function init() {
    buildDOM();
    handleDeepLink();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose openRadio() globally so other scripts (e.g. cosmic-game.js) can
  // programmatically open the player if needed.
  window.starmilkRadio = {
    open:  function (slug) {
      if (slug) pendingSlug = slug;
      openPlayer(!!slug);
    },
    close: closePlayer,
    share: shareTrack,
  };

})();
