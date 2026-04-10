/**
 * STARMILK DEPTH SYSTEM
 * The scroll engine. Tracks descent through the STARMILK universe.
 * — Depth markers reveal as you cross section boundaries
 * — Scroll rail shows how deep you've gone
 * — Fixed label shows your current cosmic position
 */
(function () {
  'use strict';

  /* ─── CONFIG — the layers of the universe ───────────────────── */
  const DEPTHS = [
    { section: 'hero',       name: 'THE SURFACE',        desc: '0 light-years' },
    { section: 'stream',     name: 'THE SIGNAL',          desc: '302 tracks deep' },
    { section: 'radio',      name: 'THE TRANSMISSION',    desc: 'Always spinning' },
    { section: 'the-vision', name: 'THE VISION LAYER',    desc: '∞ light-years' },
    { section: 'inside-out', name: 'THE FILM',            desc: 'The butterfly stage' },
    { section: 'orchard',    name: 'THE ORCHARD',         desc: 'Every fruit is a song' },
    { section: 'river',      name: 'THE RIVER',           desc: 'The river runs both ways' },
    { section: 'lyrics',     name: 'THE HONEY',           desc: 'Where grief becomes nectar' },
    { section: 'games',      name: 'THE COSMOS TERMINAL', desc: 'Three portals' },
    { section: 'support',    name: 'THE OFFERING',        desc: 'Co-creation, not charity' },
    { section: 'vip',        name: 'THE INNER CIRCLE',    desc: 'VIP frequencies' },
    { section: 'connect',    name: 'THE FINAL FREQUENCY', desc: 'River to ocean' },
  ];

  /* ─── DEPTH MARKERS ─────────────────────────────────────────── */
  // These are the zone-crossing lines — like "960 METERS DEEP" in neal.fun
  const markers = document.querySelectorAll('.depth-marker');

  if (markers.length) {
    const markerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            // Don't unreveal — once seen, stays revealed
            markerObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3, rootMargin: '0px 0px -10% 0px' }
    );

    markers.forEach(m => markerObserver.observe(m));
  }

  /* ─── SCROLL RAIL ────────────────────────────────────────────── */
  // 2px line on right edge — shows how far you've descended
  const railFill = document.querySelector('.scroll-rail-fill');
  if (railFill) {
    const updateRail = () => {
      const scrolled = window.scrollY;
      const total    = document.body.scrollHeight - window.innerHeight;
      const pct      = total > 0 ? (scrolled / total) * 100 : 0;
      railFill.style.height = pct.toFixed(2) + '%';
    };
    window.addEventListener('scroll', updateRail, { passive: true });
    updateRail();
  }

  /* ─── FIXED DEPTH LABEL ──────────────────────────────────────── */
  // Bottom-left corner — shows current section name
  const label      = document.querySelector('.depth-current');
  const labelName  = document.querySelector('.depth-current-name');
  const labelDesc  = document.querySelector('.depth-current-desc');

  if (label && labelName && labelDesc) {
    let currentSection = '';

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id    = entry.target.id;
            const depth = DEPTHS.find(d => d.section === id);
            if (depth && id !== currentSection) {
              currentSection   = id;
              label.classList.add('visible');
              // Brief fade for transition
              label.style.opacity = '0';
              requestAnimationFrame(() => {
                setTimeout(() => {
                  labelName.textContent = depth.name;
                  labelDesc.textContent = depth.desc;
                  label.style.opacity = '';
                  label.classList.add('visible');
                }, 200);
              });
            }
          }
        });
      },
      { threshold: 0.4 }
    );

    document.querySelectorAll('section[id]').forEach(s => {
      sectionObserver.observe(s);
    });
  }

  /* ─── PARTICLE DIMMING ───────────────────────────────────────── */
  // As you descend, the canvas nebula particles get dimmer
  // (Matches the neal.fun aesthetic of darkness increasing with depth)
  const canvas = document.getElementById('nebula-canvas') ||
                 document.querySelector('canvas.nebula');
  if (canvas) {
    let ticking = false;
    const updateCanvas = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrolled = window.scrollY;
        const total    = document.body.scrollHeight - window.innerHeight;
        const progress = Math.min(scrolled / (total * 0.6), 1);
        // Canvas opacity: 1 at surface → 0.3 at depth
        canvas.style.opacity = (1 - progress * 0.7).toFixed(3);
        ticking = false;
      });
    };
    window.addEventListener('scroll', updateCanvas, { passive: true });
    updateCanvas();
  }

  /* ─── SECTION ACTIVE NAV ─────────────────────────────────────── */
  // Already handled by the existing genius-mode nav script,
  // but we ensure it fires for the depth sections too.

  /* ─── DEPTH DARKENING ─────────────────────────────────────────── */
  // As you descend, a subtle dark overlay thickens — like water pressure
  // Body ::before has rgba(0,0,0,0) → we update the background-color via JS
  const overlay = document.createElement('style');
  document.head.appendChild(overlay);

  const updateDarkness = () => {
    const scrolled = window.scrollY;
    const total    = document.body.scrollHeight - window.innerHeight;
    const progress = total > 0 ? Math.min(scrolled / total, 1) : 0;
    // 0 at surface → 0.45 at deepest point
    const alpha    = (progress * 0.45).toFixed(3);
    overlay.textContent = `body::before { background: rgba(0,0,0,${alpha}) !important; }`;
  };

  window.addEventListener('scroll', updateDarkness, { passive: true });
  updateDarkness();

  /* ─── INIT — add chrome elements ─────────────────────────────── */
  function addChrome() {
    // Scroll rail
    if (!document.querySelector('.scroll-rail')) {
      const rail = document.createElement('div');
      rail.className = 'scroll-rail';
      rail.innerHTML = '<div class="scroll-rail-fill"></div>';
      document.body.appendChild(rail);
      // Re-query fill
      const fill = rail.querySelector('.scroll-rail-fill');
      const update = () => {
        const s = window.scrollY;
        const t = document.body.scrollHeight - window.innerHeight;
        fill.style.height = (t > 0 ? (s / t) * 100 : 0).toFixed(2) + '%';
      };
      window.addEventListener('scroll', update, { passive: true });
      update();
    }

    // Depth label
    if (!document.querySelector('.depth-current')) {
      const lbl = document.createElement('div');
      lbl.className = 'depth-current';
      lbl.innerHTML = `
        <span class="depth-current-name">THE SURFACE</span>
        <span class="depth-current-desc">0 light-years</span>
      `;
      document.body.appendChild(lbl);

      let cur = '';
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const id = e.target.id;
            const d  = DEPTHS.find(x => x.section === id);
            if (d && id !== cur) {
              cur = id;
              lbl.classList.add('visible');
              setTimeout(() => {
                lbl.querySelector('.depth-current-name').textContent = d.name;
                lbl.querySelector('.depth-current-desc').textContent = d.desc;
              }, 120);
            }
          }
        });
      }, { threshold: 0.4 });

      document.querySelectorAll('section[id]').forEach(s => obs.observe(s));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addChrome);
  } else {
    addChrome();
  }

})();
