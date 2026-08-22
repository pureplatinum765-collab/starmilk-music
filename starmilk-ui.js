/* STARMILK Inked Relic Synapse coordinator.
   Owns navigation, transient-surface safety, and a subtle shared handoff cue. */
(function () {
  'use strict';

  const html = document.documentElement;
  const nav = document.getElementById('nav');
  const menu = document.querySelector('.nav-links');
  const menuButton = document.getElementById('nav-hamburger');
  const radio = document.getElementById('radio-floating');
  const chat = document.getElementById('starmilk-chat-panel');
  const mood = document.getElementById('mood-ring-overlay');
  const clearing = document.getElementById('the-clearing');

  const compactReadingSections = [document.getElementById('river'), document.getElementById('lyrics')].filter(Boolean);
  const compactViewport = window.matchMedia('(max-width: 680px)');
  if (compactReadingSections.length && 'IntersectionObserver' in window) {
    const activeReadingSections = new Set();
    const syncReadingState = () => {
      document.body.classList.toggle('starmilk-mobile-reading', compactViewport.matches && activeReadingSections.size > 0);
    };
    const readingObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) activeReadingSections.add(entry.target);
        else activeReadingSections.delete(entry.target);
      });
      syncReadingState();
    }, { rootMargin: '-20% 0px -20% 0px', threshold: 0 });
    compactReadingSections.forEach((section) => readingObserver.observe(section));
    compactViewport.addEventListener?.('change', syncReadingState);
  }

  const closeKnownSurfaces = (except) => {
    if (except !== 'chat' && chat?.classList.contains('open')) {
      window.dispatchEvent(new CustomEvent('starmilk:requestClose', { detail: { target: 'chat' } }));
    }
    if (except !== 'radio' && radio?.classList.contains('open')) {
      window.dispatchEvent(new CustomEvent('starmilk:requestClose', { detail: { target: 'radio' } }));
    }
    if (except !== 'mood' && mood?.classList.contains('open')) {
      window.dispatchEvent(new CustomEvent('starmilk:requestClose', { detail: { target: 'mood' } }));
    }
    if (except !== 'clearing' && clearing?.classList.contains('visible')) {
      window.dispatchEvent(new CustomEvent('starmilk:requestClose', { detail: { target: 'clearing' } }));
    }
    // A non-game surface clears any active game. Game launchers close existing games
    // immediately before they announce their own opening, so the new overlay is not
    // accidentally closed by this coordinator during the same synchronous event.
    if (except !== 'game') {
      window.dispatchEvent(new CustomEvent('starmilk:requestClose', { detail: { target: 'game' } }));
    }
  };

  let surfaceShiftTimer = 0;
  window.addEventListener('starmilk:surfaceOpen', (event) => {
    const target = event.detail?.target || 'surface';
    closeKnownSurfaces(target);
    document.body.dataset.starmilkSurface = target;
    document.body.classList.remove('starmilk-surface-shift');
    void document.body.offsetWidth;
    document.body.classList.add('starmilk-surface-shift');
    if (surfaceShiftTimer) window.clearTimeout(surfaceShiftTimer);
    surfaceShiftTimer = window.setTimeout(() => {
      document.body.classList.remove('starmilk-surface-shift');
      surfaceShiftTimer = 0;
    }, 460);
  });

  if (menuButton && menu) {
    menuButton.addEventListener('click', () => {
      const open = menu.classList.toggle('mobile-open');
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    menu.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener('click', () => {
      menu.classList.remove('mobile-open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Open menu');
    }));
  }

  const sections = [...document.querySelectorAll('section[id]')];
  const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const map = new Map(links.map((link) => [link.getAttribute('href')?.slice(1), link]));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio).slice(0, 1).forEach((entry) => {
        links.forEach((link) => link.removeAttribute('data-active'));
        map.get(entry.target.id)?.setAttribute('data-active', 'true');
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: [0.05, .2, .5] });
    sections.forEach((section) => observer.observe(section));
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      nav?.classList.toggle('scrolled', window.scrollY > 20);
      ticking = false;
    });
  }, { passive: true });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu?.classList.contains('mobile-open')) {
      menu.classList.remove('mobile-open');
      menuButton?.setAttribute('aria-expanded', 'false');
      menuButton?.focus();
    }
  });

  html.dataset.starmilkRebuild = 'true';
})();
