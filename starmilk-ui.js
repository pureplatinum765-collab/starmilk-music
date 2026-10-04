/* STARMILK Inked Relic Synapse coordinator.
   Owns navigation, transient-surface safety, and a subtle shared handoff cue. */
(function () {
  'use strict';

  const html = document.documentElement;
  const nav = document.getElementById('nav');
  const menu = document.querySelector('.nav-links');
  const menuButton = document.getElementById('nav-hamburger');
  const menuBackdrop = document.getElementById('nav-backdrop');
  const radio = document.getElementById('radio-floating');
  const guide = document.getElementById('starmilk-chat-panel');
  const guideToggle = document.getElementById('starmilk-chat-toggle');
  const mood = document.getElementById('mood-ring-overlay');
  const clearing = document.getElementById('the-clearing');
  const mobileMenuViewport = window.matchMedia('(max-width: 760px)');
  const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  let menuScrollY = 0;

  const menuBackgroundRoots = [
    ...document.querySelectorAll('.wrap > :not(#nav)'),
    radio,
    guide,
    guideToggle,
    mood,
    clearing,
  ].filter(Boolean);

  const setMenuBackgroundInert = (shouldBeInert) => {
    menuBackgroundRoots.forEach((element) => {
      if (shouldBeInert) {
        if (element.hasAttribute('inert')) return;
        element.dataset.starmilkMenuInert = 'true';
        element.setAttribute('inert', '');
        return;
      }
      if (element.dataset.starmilkMenuInert !== 'true') return;
      element.removeAttribute('inert');
      delete element.dataset.starmilkMenuInert;
    });
  };

  const syncMenuDisclosure = (open) => {
    if (!menu || !menuButton) return;
    menu.classList.toggle('mobile-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (mobileMenuViewport.matches) {
      menu.setAttribute('aria-hidden', String(!open));
      if (open) menu.removeAttribute('inert');
      else menu.setAttribute('inert', '');
    } else {
      menu.removeAttribute('aria-hidden');
      menu.removeAttribute('inert');
    }
  };

  const closeMenu = ({ restoreFocus = true } = {}) => {
    if (!menu?.classList.contains('mobile-open')) {
      syncMenuDisclosure(false);
      return;
    }
    syncMenuDisclosure(false);
    menuBackdrop?.setAttribute('hidden', '');
    setMenuBackgroundInert(false);
    document.body.classList.remove('starmilk-menu-open');
    document.body.style.removeProperty('--starmilk-menu-scroll-offset');
    window.scrollTo(0, menuScrollY);
    window.dispatchEvent(new CustomEvent('starmilk:surfaceClosed', { detail: { target: 'menu' } }));
    if (restoreFocus) menuButton?.focus();
  };

  const openMenu = () => {
    if (!menu || !menuButton || !mobileMenuViewport.matches || document.body.classList.contains('parking-lot-active')) return;
    window.dispatchEvent(new CustomEvent('starmilk:surfaceOpen', { detail: { target: 'menu' } }));
    menuScrollY = window.scrollY;
    document.body.style.setProperty('--starmilk-menu-scroll-offset', `-${menuScrollY}px`);
    document.body.classList.add('starmilk-menu-open');
    setMenuBackgroundInert(true);
    syncMenuDisclosure(true);
    menuBackdrop?.removeAttribute('hidden');
    requestAnimationFrame(() => menu.querySelector(focusableSelector)?.focus());
  };

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
    if (except !== 'menu' && menu?.classList.contains('mobile-open')) {
      window.dispatchEvent(new CustomEvent('starmilk:requestClose', { detail: { target: 'menu' } }));
    }
    if (except !== 'guide' && guide?.classList.contains('open')) {
      window.dispatchEvent(new CustomEvent('starmilk:requestClose', { detail: { target: 'guide' } }));
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

  window.addEventListener('starmilk:surfaceClosed', (event) => {
    if (document.body.dataset.starmilkSurface === event.detail?.target) {
      delete document.body.dataset.starmilkSurface;
    }
  });

  window.addEventListener('starmilk:requestClose', (event) => {
    if (event.detail?.target === 'menu') closeMenu({ restoreFocus: false });
  });

  if (menuButton && menu) {
    menuButton.addEventListener('click', () => {
      if (menu.classList.contains('mobile-open')) closeMenu();
      else openMenu();
    });
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu({ restoreFocus: false })));
    menuBackdrop?.addEventListener('click', () => closeMenu());
    mobileMenuViewport.addEventListener?.('change', (event) => {
      if (!event.matches) closeMenu({ restoreFocus: false });
      else syncMenuDisclosure(false);
    });
    syncMenuDisclosure(false);
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
    if (!menu?.classList.contains('mobile-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeMenu();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [menuButton, ...menu.querySelectorAll(focusableSelector)].filter((element) => element && element.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (!focusable.includes(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  });

  html.dataset.starmilkRebuild = 'true';
})();
