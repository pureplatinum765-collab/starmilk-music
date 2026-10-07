/* STARMILK Human Maps — three ways of looking at being a person.
   Tab semantics per WAI-ARIA: arrow keys move between tabs, panels follow. */
(function () {
  'use strict';
  const tablist = document.querySelector('.maps-tabs');
  if (!tablist) return;
  const tabs = [...tablist.querySelectorAll('.maps-tab')];
  const panels = [...document.querySelectorAll('[data-maps-panel]')];
  const select = (name, focus = false) => {
    tabs.forEach((tab) => {
      const selected = tab.dataset.mapsTab === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach((panel) => {
      const active = panel.dataset.mapsPanel === name;
      panel.hidden = !active;
      panel.classList.toggle('maps-panel--hidden', !active);
    });
    if (focus) tabs.find((tab) => tab.dataset.mapsTab === name)?.focus();
  };
  tablist.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-maps-tab]');
    if (tab) select(tab.dataset.mapsTab);
  });
  tablist.addEventListener('keydown', (event) => {
    const currentIndex = tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
    let nextIndex = -1;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex >= 0) {
      event.preventDefault();
      select(tabs[nextIndex].dataset.mapsTab, true);
    }
  });
})();
