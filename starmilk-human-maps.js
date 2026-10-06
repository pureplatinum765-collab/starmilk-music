(() => {
  'use strict';

  const root = document.getElementById('human-maps');
  if (!root) return;

  const tabs = Array.from(root.querySelectorAll('[data-human-map-tab]'));
  const panels = Array.from(root.querySelectorAll('[data-human-map-panel]'));
  if (!tabs.length || !panels.length) return;

  const activate = (tab, moveFocus = false) => {
    const target = tab.dataset.humanMapTab;

    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', active ? 'true' : 'false');
      item.tabIndex = active ? 0 : -1;
    });

    panels.forEach((panel) => {
      const active = panel.dataset.humanMapPanel === target;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });

    if (moveFocus) tab.focus({ preventScroll: true });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));

    tab.addEventListener('keydown', (event) => {
      let nextIndex = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      activate(tabs[nextIndex], true);
    });
  });

  activate(tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0]);
})();
