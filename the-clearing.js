(function () {
  'use strict';
  const _ls = (function() { const m = {}; const s = window['local'+'Storage']; return { getItem(k) { try { return s.getItem(k); } catch { return m[k] ?? null; } }, setItem(k, v) { try { s.setItem(k, v); } catch { m[k] = v; } } }; })();


  const FADE_MS = 5000;
  const overlay = document.getElementById('the-clearing');
  const returnLink = document.getElementById('clearing-return');
  const triggers = Array.from(document.querySelectorAll('[data-clearing-trigger]'));
  if (!overlay || !returnLink || !triggers.length) return;

  let fadeTimer = null;
  let isShowing = false;
  let priorFocus = null;

  function clearTimers() {
    if (fadeTimer) clearTimeout(fadeTimer);
  }

  function isOverlayVisible(node) {
    if (!node || !node.isConnected || node.hidden) return false;
    if (node.classList.contains('exited') || node.classList.contains('hidden')) return false;
    const styles = window.getComputedStyle(node);
    return styles.display !== 'none' && styles.visibility !== 'hidden' && styles.pointerEvents !== 'none' && styles.opacity !== '0';
  }

  function isBlockedByOverlay() {
    const parkingLotOverlay = document.getElementById('parking-lot-overlay');
    const moodRingOverlay = document.getElementById('mood-ring-overlay');
    const radio = document.getElementById('radio-floating');
    const isListening = radio?.classList.contains('open') || document.getElementById('radio-play')?.getAttribute('aria-pressed') === 'true';
    return document.hidden || isListening || isOverlayVisible(parkingLotOverlay) || isOverlayVisible(moodRingOverlay);
  }

  function hideClearing({ restoreFocus = true } = {}) {
    isShowing = false;
    clearTimers();
    overlay.classList.remove('revealed', 'visible');
    overlay.style.transition = '';
    overlay.style.opacity = '0';
    overlay.setAttribute('aria-hidden', 'true');
    if (restoreFocus && priorFocus instanceof HTMLElement) priorFocus.focus();
    priorFocus = null;
  }

  function revealClearing() {
    if (isShowing) return;
    window.dispatchEvent(new CustomEvent('starmilk:surfaceOpen', { detail: { target: 'clearing' } }));
    if (isBlockedByOverlay()) return;
    priorFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    isShowing = true;
    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden', 'false');
    // Inked Relic overlays stay cinematic, but keyboard users enter a usable surface immediately.
    returnLink.focus({ preventScroll: true });
    overlay.style.transition = `opacity ${FADE_MS}ms ease`;
    overlay.style.opacity = '0';

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });

    fadeTimer = setTimeout(() => {
      overlay.classList.add('revealed');
      _ls.setItem('starmilkClearingFound', 'true');
    }, FADE_MS);
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', revealClearing);
  });

  returnLink.addEventListener('click', () => {
    hideClearing();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isShowing) hideClearing();
  });

  window.addEventListener('starmilk:openClearing', revealClearing);
  window.addEventListener('starmilk:requestClose', (event) => {
    if (event.detail?.target === 'clearing' && isShowing) hideClearing({ restoreFocus: false });
  });
})();
