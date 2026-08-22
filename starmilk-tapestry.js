/* STARMILK Inked Relic Tapestry.
   Approved rink images drift as a low-opacity, non-interactive visual score.
   Rule: atmosphere follows the listening journey without obscuring it. */
(function () {
  'use strict';

  const field = document.querySelector('.starmilk-tapestry');
  if (!field) return;

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sceneForSection = {
    hero: 'indigo', radio: 'indigo', 'the-vision': 'moon', 'inside-out': 'moon',
    stream: 'indigo', river: 'constellation', lyrics: 'rose', orchard: 'moon',
    games: 'constellation', support: 'ochre', vip: 'rose', connect: 'ochre'
  };
  const sections = Object.keys(sceneForSection)
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  let frame = 0;

  const windowConfig = {
    radio: ['rink-cosmic.webp', ''],
    stream: ['rink-twilight.webp', ''],
    lyrics: ['rink-rose.webp', 'tapestry-window--rose'],
    orchard: ['rink-moonlit.webp', 'tapestry-window--moon'],
    games: ['rink-constellation.webp', 'tapestry-window--constellation'],
    support: ['rink-ochre.webp', 'tapestry-window--ochre'],
    vip: ['rink-rose.webp', 'tapestry-window--rose'],
    connect: ['rink-twilight.webp', '']
  };
  Object.entries(windowConfig).forEach(([sectionId, [filename, modifier]]) => {
    const section = document.getElementById(sectionId);
    if (!section || section.querySelector('.tapestry-window')) return;
    const windowPlate = document.createElement('span');
    windowPlate.className = `tapestry-window ${modifier}`.trim();
    windowPlate.setAttribute('aria-hidden', 'true');
    windowPlate.style.setProperty('--tapestry-image', `url('assets/tapestry/${filename}')`);
    section.prepend(windowPlate);
  });

  const renderScroll = () => {
    frame = 0;
    if (reducedMotion.matches) return;
    const extent = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    root.style.setProperty('--tapestry-progress', Math.min(1, Math.max(0, window.scrollY / extent)).toFixed(4));
  };
  const requestRender = () => {
    if (!frame) frame = window.requestAnimationFrame(renderScroll);
  };
  const setScene = (section) => {
    const scene = sceneForSection[section.id];
    if (scene) document.body.dataset.tapestryScene = scene;
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        .slice(0, 1)
        .forEach((entry) => setScene(entry.target));
    }, { rootMargin: '-35% 0px -45% 0px', threshold: [0.05, .2, .5] });
    sections.forEach((section) => observer.observe(section));
  }

  reducedMotion.addEventListener?.('change', () => {
    if (reducedMotion.matches) root.style.setProperty('--tapestry-progress', '0');
    else requestRender();
  });
  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestRender, { passive: true });
  requestRender();
})();
