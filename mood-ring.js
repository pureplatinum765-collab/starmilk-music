(function () {
  'use strict';
  const _ss = (function() { const m = {}; const s = window['session'+'Storage']; return { getItem(k) { try { return s.getItem(k); } catch { return m[k] ?? null; } }, setItem(k, v) { try { s.setItem(k, v); } catch { m[k] = v; } } }; })();


  const MOODS = {
    heavy: { label: 'heavy', section: 'support' },
    thawing: { label: 'thawing', section: 'games' },
    tender: { label: 'tender', section: 'connect' },
    alive: { label: 'alive', section: 'orchard' },
    'going-round': { label: "going 'round", section: 'hero' }
  };

  const moodOrder = ['heavy', 'thawing', 'tender', 'alive', 'going-round'];
  const trigger = document.getElementById('mood-ring-trigger');
  const overlay = document.getElementById('mood-ring-overlay');
  if (!overlay || !trigger) return;

  let hasShownInitialPrompt = false;

  function buildMoodModal() {
    overlay.innerHTML = `
      <div class="mood-ring-card" role="dialog" aria-modal="true" aria-label="How are you feeling?">
        <p class="mood-ring-title">How are you feeling?</p>
        <div class="mood-ring-options">
          ${moodOrder.map((mood) => `<button class="mood-orb" data-mood="${mood}">${MOODS[mood].label}</button>`).join('')}
        </div>
      </div>`;

    overlay.querySelectorAll('.mood-orb').forEach((orb) => {
      orb.addEventListener('click', () => {
        setMood(orb.dataset.mood, true);
        closeMoodSelector();
      });
    });

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeMoodSelector();
    });
  }

  function closeMoodSelector() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    window.dispatchEvent(new CustomEvent('starmilk:moodRingVisibility', { detail: { open: false } }));
  }

  function openMoodSelector() {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    window.dispatchEvent(new CustomEvent('starmilk:moodRingVisibility', { detail: { open: true } }));
  }

  function setMood(mood, shouldScroll) {
    if (!MOODS[mood]) return;

    document.body.dataset.mood = mood;
    _ss.setItem('starmilkMood', mood);

    if (!shouldScroll) return;
    const target = document.getElementById(MOODS[mood].section);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function maybeShowPromptAfterParkingLot() {
    const parkingLot = document.getElementById('parking-lot-overlay');
    if (!parkingLot || hasShownInitialPrompt) return;

    const showPrompt = () => {
      if (hasShownInitialPrompt) return;
      hasShownInitialPrompt = true;
      setTimeout(openMoodSelector, 350);
    };

    const observer = new MutationObserver(() => {
      if (parkingLot.classList.contains('exited') || parkingLot.classList.contains('hidden')) {
        observer.disconnect();
        showPrompt();
      }
    });

    observer.observe(parkingLot, { attributes: true, attributeFilter: ['class'] });

    setTimeout(() => {
      if (!document.body.classList.contains('parking-lot-active')) showPrompt();
    }, 1600);
  }

  buildMoodModal();

  const savedMood = _ss.getItem('starmilkMood');
  if (savedMood && MOODS[savedMood]) {
    setMood(savedMood, false);
  } else {
    document.body.dataset.mood = 'going-round';
  }

  trigger.addEventListener('click', openMoodSelector);
  maybeShowPromptAfterParkingLot();
})();
