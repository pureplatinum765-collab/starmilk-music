(function () {
  const root = document.getElementById('guidebot');
  if (!root) return;

  const sections = {
    stream: '#stream',
    radio: '#radio',
    vision: '#the-vision',
    film: '#inside-out',
    orchard: '#orchard',
    river: '#river',
    lyrics: '#lyrics',
    games: '#games',
    support: '#support',
    vip: '#vip',
    connect: '#connect'
  };

  const links = {
    soundcloud: 'https://soundcloud.com/star-milk-645735333',
    spotify: 'https://open.spotify.com/artist/6ZJBd6IllHctGDa3GhbQnK',
    youtube: 'https://www.youtube.com/@STARMILK-s5u',
    patreon: 'https://patreon.com/STARMILKLABZ'
  };

  const faq = [
    {
      keys: ['listen', 'stream', 'music', 'songs', 'where'],
      text: `Start at <a class="guidebot-link" href="#stream">Stream My Music</a> for major platforms, or open <a class="guidebot-link" target="_blank" rel="noopener" href="${links.soundcloud}">SoundCloud</a> for direct signal.`
    },
    {
      keys: ['radio', 'live', 'track', 'queue'],
      text: 'The radio panel sits on the lower-right edge. Open it for queue, search, and shuffle — or jump to <a class="guidebot-link" href="#radio">STARMILK Radio</a>.'
    },
    {
      keys: ['support', 'donate', 'patreon', 'buy'],
      text: `You can support in two ways: <a class="guidebot-link" href="#support">Support section</a> for one-time support, or <a class="guidebot-link" target="_blank" rel="noopener" href="${links.patreon}">Patreon</a> for ongoing backing.`
    },
    {
      keys: ['visual', 'video', 'film', 'inside out'],
      text: 'Explore <a class="guidebot-link" href="#inside-out">Inside Out</a> for video and cinematic energy, then visit <a class="guidebot-link" href="visualizer.html">Visualizer</a> for the immersive player.'
    },
    {
      keys: ['game', 'play', 'maze', 'worm', 'brick'],
      text: 'Head to <a class="guidebot-link" href="#games">Cosmic Games Terminal</a> for Cosmic Maze, Brick Breaker, and Cosmic Worm.'
    },
    {
      keys: ['contact', 'connect', 'instagram', 'tiktok'],
      text: 'The <a class="guidebot-link" href="#connect">Connect</a> section has socials and direct paths to STARMILK channels.'
    }
  ];

  const ideas = [
    'Add a short “Start Here” ritual path for first-time visitors.',
    'Capture emails with a “moonletter” offering unreleased demos.',
    'Add lightweight listening analytics (privacy-first, no trackers).',
    'Publish a release roadmap/timeline so fans follow the journey.',
    'Create texture-rich section dividers (paint-stroke SVGs) for flow.'
  ];

  const toggle = document.getElementById('guidebot-toggle');
  const log = document.getElementById('guidebot-log');
  const form = document.getElementById('guidebot-form');
  const input = document.getElementById('guidebot-input');
  const actions = document.getElementById('guidebot-actions');

  function addMessage(text, type) {
    const line = document.createElement('p');
    line.className = `guidebot-msg ${type}`;
    line.innerHTML = text;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  function renderChips() {
    const prompts = ['Where do I start?', 'How can I support?', 'Take me to games', 'What should we improve?'];
    actions.innerHTML = '';
    prompts.forEach((prompt) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'guidebot-chip';
      chip.textContent = prompt;
      chip.addEventListener('click', () => respond(prompt));
      actions.appendChild(chip);
    });
  }

  function jumpTo(section) {
    const target = document.querySelector(section);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function respond(rawText) {
    const text = rawText.trim();
    if (!text) return;

    addMessage(text, 'user');
    const lower = text.toLowerCase();

    if (lower.includes('start')) {
      addMessage('Start with <a class="guidebot-link" href="#hero">Hero</a> → <a class="guidebot-link" href="#stream">Stream</a> → <a class="guidebot-link" href="#radio">Radio</a> → <a class="guidebot-link" href="#support">Support</a>. A gentle ritual path.', 'bot');
      jumpTo(sections.stream);
      return;
    }

    if (lower.includes('improve') || lower.includes('better') || lower.includes('spice')) {
      addMessage('Here are free upgrades that keep the earthy painterly mood:<br>• ' + ideas.join('<br>• '), 'bot');
      return;
    }

    if (lower.includes('take me to') || lower.includes('go to')) {
      const found = Object.keys(sections).find((key) => lower.includes(key));
      if (found) {
        addMessage(`Opening <a class="guidebot-link" href="${sections[found]}">${found}</a>.`, 'bot');
        jumpTo(sections[found]);
        return;
      }
    }

    for (const item of faq) {
      if (item.keys.some((key) => lower.includes(key))) {
        addMessage(item.text, 'bot');
        return;
      }
    }

    addMessage('I can guide you to Stream, Radio, Vision, Film, Orchard, River, Games, Support, VIP, and Connect. Ask naturally, and I will route you.', 'bot');
  }

  toggle?.addEventListener('click', () => {
    root.classList.toggle('collapsed');
    const open = !root.classList.contains('collapsed');
    toggle.setAttribute('aria-expanded', String(open));
    if (open) input?.focus();
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    respond(input.value);
    input.value = '';
  });

  renderChips();
  addMessage('I\'m Star Guide. Ask for links, sections, support options, or ways to evolve this site while keeping its natural cosmic feel.', 'bot');
})();
