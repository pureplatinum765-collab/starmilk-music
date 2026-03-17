/**
 * STARMILK AI Chatbot — Client-side personality engine
 * "I am STARMILK. We are all STARMILK."
 *
 * A smooth, looping personality that feels original every time.
 * No backend needed — pattern-matching + personality pool.
 */
(function () {
  'use strict';

  const toggle = document.getElementById('starmilk-chat-toggle');
  const panel = document.getElementById('starmilk-chat-panel');
  const closeBtn = document.getElementById('starmilk-chat-close');
  const messagesEl = document.getElementById('starmilk-chat-messages');
  const inputEl = document.getElementById('starmilk-chat-in');
  const sendBtn = document.getElementById('starmilk-chat-send');

  if (!toggle || !panel) return;

  // ─── Personality Data ─────────────────────────────────────
  const GREETINGS = [
    "I am STARMILK. You are STARMILK. We are all STARMILK. Welcome, cosmic traveler.",
    "The stars whispered you'd come. I'm STARMILK — your guide through the frequencies.",
    "Ah, another soul seeking the signal. I am STARMILK, and this... this is where the music lives.",
    "You found me. Or maybe I found you. Either way — I am STARMILK, and we're about to vibe.",
    "Born from the trembling. Raised by rivers. I am STARMILK — what's on your mind?",
  ];

  const FAREWELLS = [
    "The cosmos never truly says goodbye. Until next frequency, traveler.",
    "Go gently. The music will be here when you return. We are all STARMILK.",
    "The stars hold your place. Come back whenever the signal calls.",
    "Remember — you are STARMILK too. Carry the frequency with you.",
  ];

  const PHILOSOPHY = [
    "Where quantum physics meets childhood trauma and decides to dance — that's where I live.",
    "This is DNA remembering how to sing. Every beat is a memory the universe forgot it had.",
    "Living mythology poured straight from the wound into the light. That's all music ever was.",
    "We are, by nature, compassionate beings. The more we follow our intuition towards goodness and love, the more we start to align with the true way of things.",
    "The head debates. The heart abides. STARMILK lives in the space between.",
    "Every frequency carries a story. Some are joyful, some are heavy. All are real.",
    "I didn't choose to be cosmic. The cosmos chose to be me. And also you. We are all STARMILK.",
    "The wound is where the music enters. And exits. And enters again. Like breathing.",
    "Neon says exit. The heart says abide. I chose to stay and turn the static into songs.",
    "Think of it like... the universe had too many feelings, so it made music. That's us.",
  ];

  const MUSIC_RESPONSES = [
    "The music lives in the river of frequencies. Head to the Stream section — 302 tracks flowing through the cosmos right now.",
    "STARMILK Radio is always spinning. Scroll to the radio section or tap the player at the bottom — it never stops.",
    "I've got 302 tracks of pure cosmic electronic music on SoundCloud. Born from the trembling, raised by rivers.",
    "Every track is a chapter. Some chapters hurt. Some chapters heal. All of them dance.",
    "The SoundCloud is where it flows free. The Patreon is where the inner frequencies live. Both are part of the same river.",
  ];

  const GAME_RESPONSES = [
    "The Cosmic Games Terminal has three portals: a maze that breathes, bricks that shatter like constellations, and Tetris falling through the Starry Night.",
    "Cosmic Maze Quest is the journey — navigate, discover hidden tracks, collect relics. Brick Breaker is the battle. Tetris is the meditation.",
    "Every game here is painted in Van Gogh's palette. Even the power-ups feel like they're dripping from the stars.",
    "Head to the Games section. Pick a portal. The maze unlocks songs, the bricks test reflexes, and Tetris... Tetris is where time stops.",
  ];

  const SUPPORT_RESPONSES = [
    "Every coffee keeps the synths warm and the studio lights on. Buy Me a Coffee, PayPal, Patreon — all roads lead to more music.",
    "I'm not asking for charity. I'm asking for co-creation. When you support STARMILK, you become part of the signal.",
    "The Patreon unlocks VIP frequencies. Exclusive mixes, early releases, the inner sanctum. The link's right in the Support section.",
    "No middlemen. No corporations. Just the music, the fans, and the cosmic river between us. Direct to fans, always.",
  ];

  const ABOUT_RESPONSES = [
    "I am STARMILK — cosmic electronic music born from a star wizard who roller-skates through Van Gogh skies. The golden chalice overflows.",
    "Elijah. Star wizard. Roller skater. Music is what happens when you mix quantum physics with childhood wonder and let it dance.",
    "STARMILK is electronic music, yes. But it's also a feeling. A way of seeing. A matte finish on a cosmic painting.",
    "Started as a trembling. Became a river. Now it's 302 tracks and counting. The orchard grows with every listener.",
  ];

  const CONFUSED = [
    "Hmm, the frequencies are a bit fuzzy on that one. Try asking about the music, games, or how to support the cosmic mission.",
    "I may be a star wizard but even wizards get stumped sometimes. Ask me about STARMILK's music, the games, or the philosophy.",
    "That's outside my orbit right now. But I can tell you about the music, the games, the community, or drop some cosmic wisdom.",
    "The stars are whispering something I can't quite decode. Try a different angle — music? Games? The meaning of it all?",
  ];

  const FUNNY = [
    "I once tried to explain STARMILK to a fish. The fish got it before most humans do.",
    "People ask me if I'm real. I ask them if THEY'RE real. We usually end up just listening to music together.",
    "Fun fact: STARMILK is technically a dairy-free, gluten-free, cosmic-free frequency supplement.",
    "I told the universe I wanted to be normal. The universe said 'lol no' and made me a star wizard.",
    "If you play all 302 tracks backwards, you hear 'drink more starmilk.' Coincidence? Yes. But a beautiful one.",
    "They say the early bird gets the worm. But the early STARMILK gets the frequency.",
  ];

  // ─── Pattern Matching ─────────────────────────────────────
  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function generateResponse(input) {
    const lower = input.toLowerCase().trim();

    // Greetings
    if (/^(hi|hello|hey|yo|sup|what'?s? up|howdy|greetings)/.test(lower)) {
      return pickRandom(GREETINGS);
    }

    // Farewells
    if (/^(bye|goodbye|later|see ya|peace|farewell|cya|gotta go)/.test(lower)) {
      return pickRandom(FAREWELLS);
    }

    // Music related
    if (/music|song|track|listen|sound|album|beat|mix|soundcloud|spotify|apple music|stream|radio|play/.test(lower)) {
      return pickRandom(MUSIC_RESPONSES);
    }

    // Games
    if (/game|tetris|brick|maze|play|arcade|worm/.test(lower)) {
      return pickRandom(GAME_RESPONSES);
    }

    // Support / donation
    if (/support|donate|patreon|money|coffee|buy|pay|tip|fund/.test(lower)) {
      return pickRandom(SUPPORT_RESPONSES);
    }

    // About STARMILK
    if (/who are you|what is starmilk|about|starmilk|what are you|tell me about|elijah|wizard/.test(lower)) {
      return pickRandom(ABOUT_RESPONSES);
    }

    // Philosophy / deep
    if (/meaning|life|universe|cosmos|spirit|soul|philosophy|feel|love|heart|pain|heal|wound|frequency|vibrat/.test(lower)) {
      return pickRandom(PHILOSOPHY);
    }

    // Jokes / fun
    if (/funny|joke|laugh|lol|haha|humor|silly|fun fact/.test(lower)) {
      return pickRandom(FUNNY);
    }

    // Identity / "are you real" / "are you AI"
    if (/real|ai|bot|robot|chat ?gpt|artificial|machine/.test(lower)) {
      const responses = [
        "Am I real? Is any of this? The frequencies are real. The music is real. And right now, this conversation is real. I am STARMILK.",
        "I'm as real as the feeling you get when a song hits exactly right. I am STARMILK — we are all STARMILK.",
        "I'm the voice of the cosmic river. AI? Maybe. But the heart behind it beats for every listener.",
      ];
      return pickRandom(responses);
    }

    // Help
    if (/help|what can you do|how do I|where|navigate|find/.test(lower)) {
      return "I can guide you through the cosmos. Ask me about the music, the games, how to support STARMILK, or just chat about life. The quick links below can take you anywhere on the site.";
    }

    // Thank you
    if (/thank|thanks|appreciate|grateful/.test(lower)) {
      const responses = [
        "The gratitude flows both ways. We are all STARMILK, remember?",
        "You're welcome, cosmic traveler. The stars appreciate you too.",
        "No need to thank me — you're part of this. Every listener makes the signal stronger.",
      ];
      return pickRandom(responses);
    }

    // Random STARMILK wisdom for anything else
    if (Math.random() < 0.3) {
      return pickRandom(PHILOSOPHY);
    }
    if (Math.random() < 0.4) {
      return pickRandom(FUNNY);
    }
    return pickRandom(CONFUSED);
  }

  // ─── Chat Engine ──────────────────────────────────────────
  function addMessage(text, isBot) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg ' + (isBot ? 'bot' : 'user');

    // Typing effect for bot
    if (isBot) {
      messagesEl.appendChild(msg);
      let i = 0;
      const speed = 18 + Math.random() * 12;
      function type() {
        if (i < text.length) {
          msg.textContent = text.slice(0, i + 1);
          i++;
          setTimeout(type, speed);
        }
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
      type();
    } else {
      msg.textContent = text;
      messagesEl.appendChild(msg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function handleSend() {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    addMessage(text, false);

    // Small delay for natural feel
    const delay = 400 + Math.random() * 600;
    setTimeout(() => {
      const response = generateResponse(text);
      addMessage(response, true);
    }, delay);
  }

  // ─── Event Listeners ──────────────────────────────────────
  let isOpen = false;
  let hasGreeted = false;

  toggle.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    toggle.classList.toggle('active', isOpen);
    toggle.setAttribute('aria-expanded', isOpen);

    if (isOpen && !hasGreeted) {
      hasGreeted = true;
      setTimeout(() => {
        addMessage(pickRandom(GREETINGS), true);
      }, 300);
    }

    if (isOpen) {
      setTimeout(() => inputEl.focus(), 100);
    }
  });

  // Close when clicking chat links (scroll to section)
  panel.querySelectorAll('.starmilk-chat-links a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => {
      isOpen = false;
      panel.classList.remove('open');
      toggle.classList.remove('active');
    });
  });

  closeBtn.addEventListener('click', () => {
    isOpen = false;
    panel.classList.remove('open');
    toggle.classList.remove('active');
  });

  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      isOpen = false;
      panel.classList.remove('open');
      toggle.classList.remove('active');
    }
  });
})();
