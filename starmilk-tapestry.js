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
    hero: 'indigo', radio: 'indigo', 'our-story': 'rose', 'human-maps': 'moon', 'open-air': 'indigo', 'the-vision': 'moon', 'inside-out': 'moon', 'the-poem': 'rose',
    stream: 'indigo', river: 'constellation', lyrics: 'rose', orchard: 'moon',
    games: 'constellation', support: 'ochre', vip: 'rose', connect: 'ochre'
  };
  const sections = Object.keys(sceneForSection)
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  let frame = 0;

  const windowConfig = {
    radio: ['rink-cosmic.avif', ''],
    stream: ['rink-twilight.avif', ''],
    lyrics: ['rink-rose.avif', 'tapestry-window--rose'],
    orchard: ['rink-moonlit.avif', 'tapestry-window--moon'],
    games: ['rink-constellation.avif', 'tapestry-window--constellation'],
    support: ['rink-ochre.avif', 'tapestry-window--ochre'],
    vip: ['rink-rose.avif', 'tapestry-window--rose'],
    connect: ['rink-twilight.avif', '']
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

  const setScene = (section) => {
    const scene = sceneForSection[section.id];
    if (scene) document.body.dataset.tapestryScene = scene;
  };
  const setSceneForViewport = () => {
    const focalLine = window.innerHeight * 0.5;
    const measurements = sections.map((section) => ({ section, rect: section.getBoundingClientRect() }));
    const containing = measurements
      .filter(({ rect }) => rect.top <= focalLine && rect.bottom >= focalLine)
      .sort((a, b) => b.rect.top - a.rect.top);
    const nearest = containing[0] || measurements.reduce((closest, measurement) => {
      const distance = Math.min(
        Math.abs(measurement.rect.top - focalLine),
        Math.abs(measurement.rect.bottom - focalLine),
      );
      return !closest || distance < closest.distance ? { ...measurement, distance } : closest;
    }, null);
    if (nearest) setScene(nearest.section);
  };
  const renderScroll = () => {
    frame = 0;
    setSceneForViewport();
    if (reducedMotion.matches) return;
    const extent = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    root.style.setProperty('--tapestry-progress', Math.min(1, Math.max(0, window.scrollY / extent)).toFixed(4));
  };
  const requestRender = () => {
    if (!frame) frame = window.requestAnimationFrame(renderScroll);
  };

  reducedMotion.addEventListener?.('change', () => {
    if (reducedMotion.matches) root.style.setProperty('--tapestry-progress', '0');
    else requestRender();
  });
  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestRender, { passive: true });
  requestRender();
})();
