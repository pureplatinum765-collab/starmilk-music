(function () {
  'use strict';

  const IDLE_MS = 30000;
  const FADE_MS = 5000;
  const overlay = document.getElementById('the-clearing');
  const returnLink = document.getElementById('clearing-return');
  if (!overlay || !returnLink) return;

  let idleTimer = null;
  let fadeTimer = null;
  let isShowing = false;

  const events = ['mousemove', 'mousedown', 'click', 'scroll', 'keydown', 'touchstart', 'touchmove', 'pointerdown', 'wheel'];

  function clearTimers() {
    if (idleTimer) clearTimeout(idleTimer);
    if (fadeTimer) clearTimeout(fadeTimer);
  }

  function hideClearing() {
    isShowing = false;
    overlay.classList.remove('revealed', 'visible');
    overlay.style.transition = '';
    overlay.style.opacity = '0';
    overlay.setAttribute('aria-hidden', 'true');
  }

  function revealClearing() {
    isShowing = true;
    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.style.transition = `opacity ${FADE_MS}ms ease`;
    overlay.style.opacity = '0';

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });

    fadeTimer = setTimeout(() => {
      overlay.classList.add('revealed');
      localStorage.setItem('starmilkClearingFound', 'true');
    }, FADE_MS);
  }

  function scheduleIdle() {
    clearTimers();
    if (isShowing) return;
    idleTimer = setTimeout(revealClearing, IDLE_MS);
  }

  function onActivity() {
    if (isShowing) return;
    scheduleIdle();
  }

  events.forEach((eventName) => window.addEventListener(eventName, onActivity, { passive: true }));

  returnLink.addEventListener('click', (event) => {
    event.preventDefault();
    hideClearing();
    scheduleIdle();
  });

  scheduleIdle();
})();
