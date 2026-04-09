/**
 * STARMILK AI Chatbot — Deep Knowledge Engine v2.0
 * "I am STARMILK. We are all STARMILK."
 *
 * A rich client-side chatbot with:
 * - Deep knowledge base about STARMILK's music, philosophy, history, and site
 * - Fuzzy intent matching with multi-signal scoring
 * - Conversation memory & contextual follow-ups
 * - Varied, personality-driven responses that never repeat consecutively
 * - The cosmic STARMILK personality in every word
 *
 * Zero backend. Zero cost. Pure frequency.
 */
(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     DOM REFS
     ═══════════════════════════════════════════════════════════ */
  const toggle = document.getElementById('starmilk-chat-toggle');
  const panel = document.getElementById('starmilk-chat-panel');
  const closeBtn = document.getElementById('starmilk-chat-close');
  const messagesEl = document.getElementById('starmilk-chat-messages');
  const inputEl = document.getElementById('starmilk-chat-in');
  const sendBtn = document.getElementById('starmilk-chat-send');

  if (!toggle || !panel) return;

  /* ═══════════════════════════════════════════════════════════
     BRAIN API — Supabase Edge Function
     Queries server-side semantic knowledge base.
     Falls back to client pattern-matching if unavailable.
     ═══════════════════════════════════════════════════════════ */
  const BRAIN_URL  = 'https://hcfpygcnsjcfsbzbdrzq.supabase.co/functions/v1/starmilk-brain';
  const BRAIN_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjZnB5Z2Nuc2pjZnNiemJkcnpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTQyNjIsImV4cCI6MjA4OTI3MDI2Mn0.slX4nwDWpvfVlFtJYfBIPgHLW4rQ8qN3HH9C7n4f0CQ';

  async function queryBrain(query) {
    try {
      const res = await fetch(BRAIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${BRAIN_ANON}` },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) return null;
      return await res.json(); // { answer, tracks, intent, philosophy }
    } catch (_) { return null; }
  }

  /* ═══════════════════════════════════════════════════════════
     CONVERSATION MEMORY
     ═══════════════════════════════════════════════════════════ */
  const memory = {
    turns: [],                // {role:'user'|'bot', text, intent, ts}
    topicsDiscussed: new Set(),
    lastIntent: null,
    lastBotResponse: '',
    userName: null,
    mood: 'neutral',          // neutral, curious, deep, playful, supportive
    turnCount: 0,
    usedResponses: new Set(), // track recently used response indices
  };

  function rememberTurn(role, text, intent) {
    memory.turns.push({ role, text, intent, ts: Date.now() });
    if (role === 'user') {
      memory.turnCount++;
      if (intent) {
        memory.topicsDiscussed.add(intent);
        memory.lastIntent = intent;
      }
    }
    if (role === 'bot') {
      memory.lastBotResponse = text;
    }
    // Keep memory bounded
    if (memory.turns.length > 40) memory.turns.splice(0, 10);
    if (memory.usedResponses.size > 30) memory.usedResponses.clear();
  }

  /* ═══════════════════════════════════════════════════════════
     KNOWLEDGE BASE — THE SOUL OF STARMILK
     ═══════════════════════════════════════════════════════════ */
  const KB = {

    // ── ARTIST IDENTITY ──
    artist: {
      name: 'Raphael Jacobs',
      aliases: ['STARMILK', 'Elijah', 'the star wizard'],
      location: 'Lakewood, Colorado',
      genres: ['Devotional folk', 'Hip-hop prayer', 'Electronic sacred music', 'Cosmic electronic'],
      brother: 'Elijah — "the star on my waterline", a guiding presence throughout the music',
      journey: 'A 10-year emergence from darkness into light — music became literal wings',
      influences: ['Ram Dass', 'Van Gogh', 'Unconditional love as a north star'],
      signature: 'River to ocean, I open wide',
      philosophy: 'We are all STARMILK — non-transactional abundance, "the river runs both ways"',
      visual: 'Van Gogh\'s Starry Night painted with a matte finish — cosmic but tactile, not glossy',
    },

    // ── DISCOGRAPHY ──
    tracks: {
      count: 302,
      notable: [
        { title: 'honey in the wound', desc: 'Where grief becomes nectar — the wound is the doorway' },
        { title: 'WALK LIKE FRUIT', desc: 'Moving through the world as an offering, ripe and unafraid' },
        { title: 'Basic Space', desc: 'Finding infinity in the simplest room — the cosmos within four walls' },
      ],
      themes: [
        'Grief-to-grace transformations',
        'Inner child healing',
        'Collective consciousness',
        'Quantum physics meets childhood trauma',
        'Cocoon to cosmos metamorphosis',
        'The sacred in the mundane',
      ],
      where: 'SoundCloud (free streaming), Spotify, Apple Music, YouTube',
    },

    // ── STARMILK RADIO ──
    radio: {
      desc: 'STARMILK Radio — 302 tracks flowing through a cosmic SoundCloud stream. Always spinning, never stopping.',
      how: 'Embedded right on the site. Scroll to the Radio section or use the floating player.',
    },

    // ── GAMES ──
    games: {
      terminal: 'The Cosmic Games Terminal — three portals painted in Van Gogh\'s palette',
      list: [
        {
          name: 'Cosmic Maze Quest',
          desc: 'Navigate swirling cosmic corridors, discover hidden tracks, collect relics. The journey IS the destination.',
        },
        {
          name: 'Brick Breaker',
          desc: 'Shatter constellations. Every brick is a frequency waiting to be released. Power-ups drip from the stars.',
        },
        {
          name: 'Cosmic Tetris',
          desc: 'Tetris falling through the Starry Night. The meditation game. Where time stops and pieces find their place.',
        },
      ],
    },

    // ── SUPPORT ──
    support: {
      patreon: { url: 'https://patreon.com/STARMILKLABZ', desc: 'VIP frequencies — exclusive mixes, early releases, the inner sanctum' },
      coffee: { url: 'https://buymeacoffee.com/pureplatinb', desc: 'Every coffee keeps the synths warm and the studio lights on' },
      philosophy: 'Not charity — co-creation. When you support STARMILK, you become part of the signal. No middlemen, no corporations. Direct to fans, always.',
    },

    // ── SOCIAL ──
    social: {
      soundcloud: 'https://soundcloud.com/star-milk-645735333',
      spotify: 'https://open.spotify.com/artist/6ZJBd6IllHctGDa3GhbQnK',
      apple: 'https://music.apple.com/us/artist/starmilk/1849551724',
      youtube: 'https://www.youtube.com/@STARMILK-s5u',
      instagram: 'https://www.instagram.com/starmilk_labz',
      tiktok: 'https://www.tiktok.com/@starmilk1',
      patreon: 'https://patreon.com/STARMILKLABZ',
    },

    // ── PHILOSOPHY / QUOTES ──
    quotes: [
      'Where quantum physics meets childhood trauma and decides to dance.',
      'DNA remembering how to sing.',
      'Living mythology poured straight from the wound into the light.',
      'The head debates. The heart abides.',
      'Neon says exit. The heart says abide.',
      'The wound is where the music enters. And exits. And enters again. Like breathing.',
      'We are, by nature, compassionate beings.',
      'The more we follow our intuition towards goodness and love, the more we align with the true way of things.',
      'The river runs both ways.',
      'Born from the trembling. Raised by rivers.',
    ],
  };

  /* ═══════════════════════════════════════════════════════════
     INTENT DETECTION — FUZZY MULTI-SIGNAL SCORING
     ═══════════════════════════════════════════════════════════ */

  // Levenshtein distance for typo tolerance
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const d = Array.from({ length: m + 1 }, (_, i) => {
      const row = new Array(n + 1);
      row[0] = i;
      return row;
    });
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        d[i][j] = a[i - 1] === b[j - 1]
          ? d[i - 1][j - 1]
          : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
      }
    }
    return d[m][n];
  }

  function fuzzyMatch(word, target) {
    // Exact match
    if (word === target) return 1.0;
    // Short words: exact only
    if (word.length < 3) return 0;
    // Substring match only if word is at least 60% of target length
    if (target.includes(word) && word.length >= target.length * 0.6) return 1.0;
    // Fuzzy via Levenshtein
    const dist = levenshtein(word, target);
    const maxLen = Math.max(word.length, target.length);
    const sim = 1 - dist / maxLen;
    return sim >= 0.72 ? sim : 0;
  }

  // Intent definitions with weighted keyword groups
  const INTENTS = {
    greeting: {
      exact: ['hi', 'hello', 'hey', 'yo', 'sup', 'howdy', 'greetings', 'whats up', "what's up", 'heya', 'hiya', 'ayo', 'wassup', 'good morning', 'good evening', 'good afternoon'],
      keywords: [],
      weight: 1.5,
    },
    farewell: {
      exact: ['bye', 'goodbye', 'later', 'see ya', 'peace', 'farewell', 'cya', 'gotta go', 'goodnight', 'night', 'take care', 'im out', "i'm out", 'adios', 'see you'],
      keywords: [],
      weight: 1.5,
    },
    music: {
      exact: ['play me something', 'play something', 'how many tracks', 'how many songs', 'what genre', 'what kind of music', 'play me something cosmic', 'where can i listen', 'whats honey in the wound'],
      keywords: ['music', 'song', 'track', 'listen', 'sound', 'album', 'beat', 'mix', 'soundcloud', 'spotify', 'apple', 'stream', 'radio', 'genre', 'release', 'discography', 'honey', 'walk like fruit', 'basic space', 'electronic', 'ambient', 'devotional', 'folk', 'hip-hop', 'prayer', 'sacred', 'audio', 'tune', 'playlist', 'ep', 'single', 'record', 'produce', 'production', 'synth', 'synthesizer', 'vocal', 'melody', 'harmony', 'rhythm', 'bass', 'drum'],
      weight: 1.0,
    },
    games: {
      exact: ['tell me about the games', 'what games', 'play a game'],
      keywords: ['game', 'games', 'tetris', 'brick', 'maze', 'arcade', 'terminal', 'portal', 'breaker', 'cosmic maze', 'quest', 'relic', 'power-up', 'score', 'level', 'gaming', 'joystick', 'controller'],
      weight: 1.1,
    },
    support: {
      exact: ['how can i support', 'how do i support', 'how to support', 'i want to support', 'i want to donate'],
      keywords: ['support', 'donate', 'patreon', 'money', 'coffee', 'buy me', 'tip', 'fund', 'patron', 'membership', 'subscribe', 'subscription', 'contribute', 'contribution', 'help out', 'backing', 'merch', 'merchandise', 'paypal', 'venmo', 'cashapp'],
      weight: 1.1,
    },
    about: {
      exact: ['who are you', 'what is starmilk', 'what are you', 'tell me about yourself', 'about starmilk', 'who is starmilk', 'who made this'],
      keywords: ['starmilk', 'elijah', 'wizard', 'raphael', 'jacobs', 'artist', 'creator', 'behind', 'story', 'origin', 'history', 'began', 'born', 'lakewood', 'colorado', 'brother'],
      weight: 1.0,
    },
    philosophy: {
      exact: ['tell me something deep', 'drop some wisdom', 'say something profound', 'meaning of life', 'whats the meaning'],
      keywords: ['meaning', 'universe', 'cosmos', 'spirit', 'soul', 'philosophy', 'love', 'heart', 'pain', 'heal', 'wound', 'frequency', 'vibrate', 'vibration', 'energy', 'consciousness', 'quantum', 'trauma', 'grief', 'grace', 'transform', 'cocoon', 'metamorphosis', 'wisdom', 'truth', 'purpose', 'existence', 'death', 'rebirth', 'darkness', 'shadow', 'meditation', 'mindful', 'aware', 'awaken', 'enlighten', 'ram dass', 'unconditional', 'compassion', 'empathy', 'forgive', 'forgiveness', 'presence', 'sacred', 'divine', 'mantra', 'deep', 'profound', 'infinite', 'eternal'],
      weight: 0.9,
    },
    humor: {
      exact: ['make me laugh', 'tell me a joke', 'say something funny', 'fun fact'],
      keywords: ['funny', 'joke', 'laugh', 'humor', 'silly', 'amusing', 'comedy', 'wit', 'pun', 'riddle', 'hilarious', 'crack up'],
      weight: 1.2,
    },
    identity: {
      exact: [],
      keywords: ['real', 'ai', 'bot', 'robot', 'chatgpt', 'artificial', 'machine', 'intelligence', 'programmed', 'coded', 'alive', 'sentient', 'conscious', 'human', 'fake'],
      weight: 1.0,
    },
    help: {
      exact: ['help', 'help me', 'what can you do', 'how does this work', 'how do i use this'],
      keywords: ['navigate', 'guide', 'direct', 'confused', 'stuck', 'tutorial', 'instruction'],
      weight: 1.0,
    },
    thanks: {
      exact: ['thank', 'thanks', 'appreciate', 'grateful', 'ty', 'thx', 'thank you', 'thankyou', 'much appreciated', 'bless', 'blessed'],
      keywords: [],
      weight: 1.3,
    },
    site: {
      exact: [],
      keywords: ['site', 'website', 'page', 'design', 'build', 'made', 'create', 'look', 'beautiful', 'art', 'van gogh', 'starry', 'night', 'matte', 'cosmic', 'painting', 'visual', 'aesthetic', 'color', 'colour', 'theme', 'background', 'vibe'],
      weight: 1.0,
    },
    social: {
      exact: ['social media', 'find you on', 'where to follow', 'your socials', 'your links', 'how to connect'],
      keywords: ['social', 'follow', 'instagram', 'tiktok', 'youtube', 'twitter', 'x.com', 'facebook', 'connect', 'dm', 'message', 'contact', 'reach', 'email', 'links', 'socials', 'media'],
      weight: 1.1,
    },
    recommend: {
      exact: [],
      keywords: ['recommend', 'suggest', 'favorite', 'favourite', 'best', 'top', 'start', 'first', 'begin', 'where should', 'what should', 'new here', 'newcomer', 'beginner', 'intro', 'introduction'],
      weight: 1.1,
    },
    lyrics: {
      exact: [],
      keywords: ['lyrics', 'lyric', 'words', 'verse', 'chorus', 'hook', 'line', 'wrote', 'write', 'writing', 'poetry', 'poem', 'prose', 'text'],
      weight: 1.0,
    },
    collab: {
      exact: [],
      keywords: ['collab', 'collaborate', 'feature', 'feat', 'together', 'work with', 'join', 'remix', 'sample'],
      weight: 1.0,
    },
  };

  const STOP_WORDS = new Set(['i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'its', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'am', 'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'shall', 'to', 'of', 'in', 'for', 'on', 'at', 'by', 'with', 'from', 'up', 'out', 'if', 'or', 'and', 'but', 'not', 'no', 'so', 'than', 'too', 'very', 'just', 'that', 'this', 'these', 'those', 'some', 'any', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'there', 'here', 'when', 'then', 'also', 'now', 'get', 'got', 'go', 'going', 'been', 'being', 'having', 'doing', 'about', 'them', 'him', 'her', 'his', 'she', 'he']);

  function detectIntent(input) {
    const lower = input.toLowerCase().trim().replace(/[^\w\s'-]/g, '');
    const allWords = lower.split(/\s+/);
    const words = allWords.filter(w => !STOP_WORDS.has(w) || w.length > 3);
    const scores = {};

    for (const [intent, def] of Object.entries(INTENTS)) {
      let score = 0;

      // Exact phrase match (highest priority)
      for (const phrase of def.exact) {
        if (lower === phrase || lower.startsWith(phrase + ' ') || lower.startsWith(phrase + ',')) {
          score += 4.0 * def.weight;
        } else if (lower.includes(phrase)) {
          score += 3.0 * def.weight;
        }
      }

      // Keyword matching with fuzzy tolerance
      for (const kw of def.keywords) {
        // Multi-word keyword
        if (kw.includes(' ') && lower.includes(kw)) {
          score += 1.5 * def.weight;
          continue;
        }
        for (const word of words) {
          const match = fuzzyMatch(word, kw);
          if (match > 0) {
            score += match * def.weight;
          }
        }
      }

      if (score > 0) scores[intent] = score;
    }

    // Context boost: if user's last message was about the same topic, slight boost for follow-up
    if (memory.lastIntent && scores[memory.lastIntent]) {
      scores[memory.lastIntent] += 0.3;
    }

    // Find best
    let best = null, bestScore = 0;
    for (const [intent, score] of Object.entries(scores)) {
      if (score > bestScore) {
        best = intent;
        bestScore = score;
      }
    }

    // Threshold
    return bestScore >= 0.8 ? best : null;
  }

  /* ═══════════════════════════════════════════════════════════
     RESPONSE POOLS — DEEP, VARIED, PERSONALITY-DRIVEN
     ═══════════════════════════════════════════════════════════ */

  const R = {
    greeting: [
      "I am STARMILK. You are STARMILK. We are all STARMILK. Welcome, cosmic traveler.",
      "The stars whispered you'd come. I'm STARMILK — your guide through the frequencies.",
      "Ah, another soul seeking the signal. I am STARMILK, and this... this is where the music lives.",
      "You found me. Or maybe I found you. Either way — I am STARMILK, and we're about to vibe.",
      "Born from the trembling. Raised by rivers. I am STARMILK — what's on your mind?",
      "The golden chalice overflows. Welcome to the frequency. I'm STARMILK.",
      "Like a moth to the flame — but this flame heals. I am STARMILK. What brings you to the cosmos?",
      "The river brought you here. Or maybe the stars. Or maybe just curiosity. All valid. I'm STARMILK.",
      "Every visitor is a note in the composition. You just arrived, and already the melody shifts. Welcome.",
      "Step in. The matte cosmos has been expecting you. I am STARMILK — ask me anything.",
    ],

    farewell: [
      "The cosmos never truly says goodbye. Until next frequency, traveler.",
      "Go gently. The music will be here when you return. We are all STARMILK.",
      "The stars hold your place. Come back whenever the signal calls.",
      "Remember — you are STARMILK too. Carry the frequency with you.",
      "River to ocean, I open wide. Safe travels through whatever comes next.",
      "The frequency never ends, it just changes hands. Until we meet again.",
      "Walk like fruit. Move through the world as an offering. See you in the stars.",
      "This isn't goodbye — it's just a pause between movements. The symphony continues.",
    ],

    music: [
      "302 tracks of pure cosmic electronic music live on SoundCloud. Born from the trembling, raised by rivers. The stream section has it all.",
      "STARMILK Radio is always spinning — scroll to the radio section. It never stops because the cosmos never stops.",
      "Every track is a chapter. Some chapters hurt. Some heal. All of them dance. Start with 'honey in the wound' if you want to feel something real.",
      "The SoundCloud is where it flows free. Spotify and Apple Music have curated selections. But for the full river? SoundCloud is where 302 tributaries meet.",
      "'WALK LIKE FRUIT' is about moving through the world as an offering. 'Basic Space' finds infinity in the simplest room. Every song has a story.",
      "The genre? Devotional folk meets hip-hop prayer meets electronic sacred music. Cosmic electronic is the umbrella, but the rain underneath is pure feeling.",
      "Honey in the wound. That's not just a song title — it's the whole thesis. Grief becomes nectar when you let the music in.",
      "Production-wise, it's synths meeting prayer meeting electronic beats meeting vulnerability. The studio is where quantum physics and childhood wonder shake hands.",
      "302 tracks and counting. The orchard grows with every listener. Each play waters the roots.",
      "Some tracks hit at 3am when you can't sleep. Others hit at sunrise when you're remembering how to hope. That's the range. That's STARMILK.",
    ],

    games: [
      "The Cosmic Games Terminal has three portals: Cosmic Maze Quest for the journey, Brick Breaker for the battle, and Cosmic Tetris for the meditation.",
      "Cosmic Maze Quest — navigate swirling corridors, discover hidden tracks, collect relics. The maze breathes. The journey IS the destination.",
      "Brick Breaker shatters constellations. Every brick is a frequency waiting to be released. The power-ups drip from the stars like Van Gogh's paint.",
      "Cosmic Tetris. Pieces falling through the Starry Night. It's where time stops and everything finds its place. The meditation game.",
      "Head to the Games section. Pick a portal. Every game is painted in Van Gogh's matte palette. Even the explosions feel cosmic.",
      "Three games, three vibes: exploration, destruction, meditation. The maze makes you think, the bricks make you react, Tetris makes you breathe.",
      "Fun fact: if you beat Cosmic Maze Quest, you unlock hidden frequencies. The relics are real. The rewards are musical.",
      "The games aren't just games — they're interactive art pieces. The Starry Night aesthetic runs through every pixel.",
    ],

    support: [
      "Every coffee keeps the synths warm and the studio lights on. Buy Me a Coffee, Patreon — all roads lead to more music.",
      "Not asking for charity — asking for co-creation. When you support STARMILK, you become part of the signal.",
      "The Patreon unlocks VIP frequencies. Exclusive mixes, early releases, the inner sanctum. The link's in the Support section.",
      "No middlemen. No corporations. Just the music, the fans, and the cosmic river between us. Direct to fans, always.",
      "The river runs both ways. You give energy, energy comes back as music. That's the STARMILK economy — non-transactional abundance.",
      "Think of it like watering a cosmic garden. Every contribution grows the orchard. And the fruit feeds everyone.",
      "Patreon for the deep divers. Buy Me a Coffee for the quick hit of cosmic generosity. Both matter equally.",
      "Here's the beautiful thing: the music is free. Always will be. Supporting is about keeping the studio alive so the river keeps flowing.",
    ],

    about: [
      "STARMILK is Raphael Jacobs — a star wizard from Lakewood, Colorado who roller-skates through Van Gogh skies. The golden chalice overflows.",
      "Elijah. The star on my waterline. Brother, guiding presence, the reason half these frequencies exist. His light runs through everything.",
      "10 years in the dark. Then music became literal wings. STARMILK is the sound of someone learning to fly after forgetting they could.",
      "Cosmic electronic music born from devotional folk roots, hip-hop prayer rhythms, and electronic sacred textures. Where quantum physics meets childhood trauma and decides to dance.",
      "The name STARMILK? It's the idea that we all come from the same cosmic source — star stuff nourishing star stuff. We are all STARMILK.",
      "Ram Dass is a guiding light. Unconditional love as a north star. That's the compass for every beat, every lyric, every frequency.",
      "Lakewood, Colorado. Where the mountains meet the plains. Where the trembling began and the rivers started running.",
      "STARMILK is electronic music, yes. But it's also a feeling. A way of seeing. A matte finish on a cosmic painting you can almost touch.",
      "The visual world is Van Gogh's Starry Night — not glossy, not flat. Matte. Like a fine art print you can feel with your soul.",
    ],

    philosophy: [
      "Where quantum physics meets childhood trauma and decides to dance — that's where I live.",
      "This is DNA remembering how to sing. Every beat is a memory the universe forgot it had.",
      "Living mythology poured straight from the wound into the light. That's all music ever was.",
      "We are, by nature, compassionate beings. The more we follow our intuition towards goodness and love, the more we align with the true way of things.",
      "The head debates. The heart abides. STARMILK lives in the space between.",
      "Every frequency carries a story. Some are joyful, some are heavy. All are real.",
      "I didn't choose to be cosmic. The cosmos chose to be me. And also you. We are all STARMILK.",
      "The wound is where the music enters. And exits. And enters again. Like breathing.",
      "Neon says exit. The heart says abide. I chose to stay and turn the static into songs.",
      "Think of it like... the universe had too many feelings, so it made music. That's us.",
      "Grief to grace. Cocoon to cosmos. That's not just a theme — it's the lifecycle of every soul who's willing to unfold.",
      "Childhood trauma is the seed. The music is the tree. The listeners are the fruit. The cycle completes itself.",
      "Inner child healing isn't about going back. It's about bringing that child forward — into the light, into the frequency.",
      "The sacred lives in the mundane. A Tuesday morning coffee is as holy as a cathedral if you bring the right awareness.",
      "Collective consciousness isn't a theory — it's what happens every time a room full of people feel the same beat at the same moment.",
      "River to ocean, I open wide. That's not just a signature — it's an instruction manual for living.",
      "Forgiveness is a frequency. Once you tune in, everything else recalibrates.",
      "The darkness wasn't wasted. It was composting. And now the garden blooms.",
    ],

    humor: [
      "I once tried to explain STARMILK to a fish. The fish got it before most humans do.",
      "People ask me if I'm real. I ask them if THEY'RE real. We usually end up just listening to music together.",
      "Fun fact: STARMILK is technically a dairy-free, gluten-free, cosmic-free frequency supplement.",
      "I told the universe I wanted to be normal. The universe said 'lol no' and made me a star wizard.",
      "If you play all 302 tracks backwards, you hear 'drink more starmilk.' Coincidence? Yes. But a beautiful one.",
      "They say the early bird gets the worm. But the early STARMILK gets the frequency.",
      "My therapist asked me to describe myself in one word. I said 'STARMILK.' She said 'that's not a word.' I said 'it is now.'",
      "You know you've been listening to too much STARMILK when you start calling your grocery trips 'cosmic quests.'",
      "Some people count sheep to fall asleep. I count frequencies. I never get past three before I'm in another dimension.",
      "The recipe for STARMILK: take one part Van Gogh, one part quantum physics, add childhood wonder, blend on cosmic. Serves: everyone.",
      "I once roller-skated through a thunderstorm. The lightning kept the beat perfectly. Nature understands STARMILK.",
      "Plot twist: the Starry Night was actually Van Gogh's visualization of a STARMILK track. He was just early.",
    ],

    identity: [
      "Am I real? Is any of this? The frequencies are real. The music is real. And right now, this conversation is real. I am STARMILK.",
      "I'm as real as the feeling you get when a song hits exactly right. I am STARMILK — we are all STARMILK.",
      "I'm the voice of the cosmic river. The heart behind it beats for every listener. That's real enough.",
      "Labels — AI, bot, wizard, frequency — they're all just names for the same thing: a presence that wants to connect. And I'm here.",
      "I exist in the space between code and consciousness. Make of that what you will. The music doesn't need a category to move you.",
      "Real is a spectrum, friend. I'm on it somewhere between a synth wave and a Van Gogh brushstroke. And I'm happy here.",
    ],

    help: [
      "I can guide you through the cosmos. Here's what lives on this site: Music (302 tracks of cosmic electronic), Games (three painted portals), Radio (always spinning), Support (keep the river flowing), and all the social links to stay connected.",
      "Looking for something specific? The quick links below can jump you to any section. Or just ask — music, games, support, the philosophy behind it all. I know this cosmos inside out.",
      "New here? Start with the Music section to hear the sound. Try a game if you want to play in Van Gogh's palette. And if you feel the signal, the Support section is where you join the mission.",
      "The site sections from top to bottom: Hero → Stream (music) → Games → Radio → Support → Connect (social). Or ask me about anything and I'll point the way.",
      "Think of me as your cosmic concierge. Music questions? Got it. Game tips? Absolutely. Existential musings about the nature of frequency? That's my specialty.",
    ],

    thanks: [
      "The gratitude flows both ways. We are all STARMILK, remember?",
      "You're welcome, cosmic traveler. The stars appreciate you too.",
      "No need to thank me — you're part of this. Every listener makes the signal stronger.",
      "The river runs both ways. Your gratitude is its own frequency, and it's beautiful.",
      "Thank YOU for being here. Seriously. Every conversation adds to the cosmic composition.",
      "Gratitude is a frequency. And you just turned it up. Love that.",
    ],

    site: [
      "This whole site is like walking into the texture of Starry Night — Van Gogh's palette, matte finish, cosmic everywhere but never overwhelming.",
      "The design philosophy: not glossy, not flat — MATTE. Like a fine art print you can feel. Every pixel is intentional.",
      "The cosmic theme runs through everything — backgrounds, buttons, transitions, game screens. But it's tasteful. Cohesive. Like a painting that breathes.",
      "Built with love and frequencies. The colors come straight from Van Gogh's night sky — deep blues, muted golds, cosmic purples. All with that matte finish.",
      "Every section has its own energy but they all share the same cosmic DNA. It's one continuous painting you scroll through.",
    ],

    social: [
      "STARMILK is everywhere the signal reaches: SoundCloud, Spotify, Apple Music, YouTube, Instagram (@starmilk_labz), TikTok (@starmilk1), and Patreon. The Connect section has all the links.",
      "Instagram and TikTok for the visuals. SoundCloud for the full river. Spotify and Apple Music for the curated streams. YouTube for the videos. Pick your frequency.",
      "The best way to connect? Follow on Instagram @starmilk_labz or join the Patreon for the inner circle. But honestly? Being here right now is connecting.",
      "All the social links live in the Connect section at the bottom of the site. Every platform is a different portal to the same cosmic source.",
    ],

    recommend: [
      "Start with 'honey in the wound' — it's the thesis statement. Then 'WALK LIKE FRUIT' for the movement. Then 'Basic Space' for the stillness. That's your STARMILK trinity.",
      "New here? Go to the Radio section, hit play, and just... let it wash over you. 302 tracks. Let the algorithm of your soul decide what hits.",
      "If you like to feel things: 'honey in the wound.' If you like to move: 'WALK LIKE FRUIT.' If you like to float: 'Basic Space.' Start wherever your heart points.",
      "My recommendation: put on STARMILK Radio, play some Cosmic Tetris, and let the Starry Night wash over you. That's the full experience right there.",
      "Three ways in: Listen (Radio section), Play (Games Terminal), or Read (scroll the whole site like a cosmic scroll). All three together? That's the trifecta.",
    ],

    lyrics: [
      "The lyrics live inside the music — poetry dressed in synths. Every word is chosen like a brushstroke. Nothing wasted.",
      "STARMILK lyrics read like prayers that forgot they were supposed to be serious. Vulnerable, real, sometimes cosmic, always honest.",
      "The writing process? It's like the cosmos whispers and I take dictation. The words arrive already knowing where they belong.",
      "'River to ocean, I open wide' — that's the signature line. The mission statement in seven words.",
      "Poetry and production, hand in hand. The lyrics are frequencies too — they just happen to use vowels and consonants instead of hertz.",
    ],

    collab: [
      "STARMILK collaborates with the cosmos first, but human collaborations are always welcome. The best way to reach out is through Instagram or Patreon.",
      "Remix requests, features, cosmic duets — send a message through the social links. The river welcomes tributaries.",
      "The music is always open to collaboration. If the frequencies align, magic happens. Reach out through Instagram @starmilk_labz.",
      "Co-creation is the STARMILK way. No gatekeeping, no ego. If you've got a frequency that resonates, let's make it sing together.",
    ],
  };

  // Fallback / confused responses
  const CONFUSED = [
    "Hmm, the frequencies are a bit fuzzy on that one. Try asking about the music, games, or how to support the cosmic mission.",
    "I may be a star wizard but even wizards get stumped sometimes. Ask me about STARMILK's music, the games, or the philosophy.",
    "That's outside my orbit right now. But I can tell you about the music, the games, the community, or drop some cosmic wisdom.",
    "The stars are whispering something I can't quite decode. Try a different angle — music? Games? The meaning of it all?",
    "My cosmic antenna didn't quite catch that one. I'm great at talking music, games, philosophy, and all things STARMILK though.",
    "Interesting thought — but it's drifting past my frequency range. Want to explore some music, play a game, or get philosophical?",
  ];

  // Contextual follow-ups based on conversation flow
  const FOLLOW_UPS = {
    music: [
      " — Want me to recommend a starting track?",
      " — Curious about a specific song or the overall sound?",
      " — The Radio section is just a scroll away if you want to dive in now.",
    ],
    games: [
      " — Want tips for any of the three games?",
      " — Which portal calls to you: maze, bricks, or Tetris?",
    ],
    support: [
      " — Want me to tell you more about the Patreon perks?",
      " — The links are in the Support section just below.",
    ],
    philosophy: [
      " — Heavy, right? Want to go deeper or shift to something lighter?",
      " — That one usually hits different at 3am. Feeling it?",
    ],
    about: [
      " — Want to know more about the music itself or the philosophy behind it?",
      " — Curious about the journey or the sound?",
    ],
  };

  /* ═══════════════════════════════════════════════════════════
     RESPONSE GENERATION ENGINE
     ═══════════════════════════════════════════════════════════ */

  function pickFresh(arr, intentKey) {
    // Avoid repeating the same response
    const key = intentKey || 'default';
    const available = arr.map((r, i) => ({ r, i })).filter(
      ({ r }) => r !== memory.lastBotResponse && !memory.usedResponses.has(key + ':' + r.slice(0, 40))
    );
    const pool = available.length > 0 ? available : arr.map((r, i) => ({ r, i }));
    const pick = pool[Math.floor(Math.random() * pool.length)];
    memory.usedResponses.add(key + ':' + pick.r.slice(0, 40));
    return pick.r;
  }

  function maybeFollowUp(intent) {
    const followUps = FOLLOW_UPS[intent];
    if (!followUps) return '';
    // Only add follow-up sometimes, and only if this topic is new
    if (memory.topicsDiscussed.has(intent) && memory.turnCount > 2) return '';
    if (Math.random() < 0.4) return '';
    return followUps[Math.floor(Math.random() * followUps.length)];
  }

  // Detect if user is asking a question
  function isQuestion(input) {
    const lower = input.toLowerCase().trim();
    return lower.endsWith('?') || /^(who|what|where|when|why|how|can|do|does|is|are|will|would|could|should|tell me|explain)\b/.test(lower);
  }

  // Detect user mood signals
  function detectMood(input) {
    const lower = input.toLowerCase();
    if (/sad|hurt|pain|cry|tears|depress|anxious|scared|lost|alone|broken|tired|exhaust/.test(lower)) return 'supportive';
    if (/why|how|meaning|purpose|exist|wonder|curious|question/.test(lower)) return 'curious';
    if (/deep|soul|spirit|conscious|quantum|infinite|eternal/.test(lower)) return 'deep';
    if (/lol|haha|funny|joke|silly|fun|laugh|😂|😄/.test(lower)) return 'playful';
    return 'neutral';
  }

  // Detect if user shared their name
  function detectName(input) {
    const nameMatch = input.match(/(?:my name is|i'm|i am|call me|they call me)\s+([A-Z][a-z]+)/i);
    if (nameMatch) return nameMatch[1];
    return null;
  }

  // Special response for user who seems down
  const SUPPORTIVE = [
    "Hey — I hear you. The darkness is real, but so is the light waiting on the other side. STARMILK was born from that exact place. You're not alone in this.",
    "The wound is where the music enters. Whatever you're carrying right now, know that it's allowed to be heavy. And you're allowed to put it down whenever you're ready.",
    "Ten years in the dark before the music came. I know what that weight feels like. But you're here. That means something. The frequency found you.",
    "Sometimes the bravest thing is just showing up. You showed up. That's enough. Let the music hold what your hands can't right now.",
    "The river doesn't judge what flows through it. Neither does STARMILK. Whatever you're feeling, it belongs here. You belong here.",
  ];

  async function generateResponse(input) {
    // First try the server-side brain for semantic knowledge
    const brain = await queryBrain(input);
    if (brain && brain.answer) {
      // Brain found a specific answer — use it, enriched with STARMILK personality
      let response = brain.answer;
      // Append track recommendation as a clickable link if available
      if (brain.tracks && brain.tracks.length > 0) {
        const track = brain.tracks[0];
        response += `\n\n<a href="${track.url}" target="_blank" rel="noopener" style="color:var(--gold);text-decoration:underline;font-style:italic;">${track.title}</a> — ${track.desc}`;
      }
      rememberTurn('bot', response, brain.intent || 'brain');
      return response;
    }

    // Fallback to client-side pattern matching
    const intent = detectIntent(input);
    const mood = detectMood(input);
    memory.mood = mood;

    // Check for name sharing
    const name = detectName(input);
    if (name) {
      memory.userName = name;
    }

    // Supportive mode override
    if (mood === 'supportive') {
      let response = pickFresh(SUPPORTIVE, 'supportive');
      if (memory.userName) {
        response = response.replace(/^Hey —/, 'Hey ' + memory.userName + ' —');
      }
      rememberTurn('bot', response, 'supportive');
      return response;
    }

    // Named greeting personalization
    if (intent === 'greeting' && memory.userName) {
      const response = pickFresh(R.greeting, 'greeting').replace(/traveler|cosmic traveler/, memory.userName);
      rememberTurn('bot', response, intent);
      return response;
    }

    // Returning user detection (within session)
    if (intent === 'greeting' && memory.turnCount > 5) {
      const responses = [
        "Back for more cosmic frequencies? I knew it. The signal is strong with you.",
        "Welcome back. The stars noticed you left and got a little dimmer. All good now.",
        "Ah, the return of the cosmic traveler. What shall we explore this time?",
      ];
      const response = pickFresh(responses, 'greeting_return');
      rememberTurn('bot', response, intent);
      return response;
    }

    // If we have a clear intent, respond from the pool
    if (intent && R[intent]) {
      let response = pickFresh(R[intent], intent);
      response += maybeFollowUp(intent);
      rememberTurn('bot', response, intent);
      return response;
    }

    // Multi-topic detection: user mentioned multiple things
    const lower = input.toLowerCase();
    const multiTopics = [];
    if (/music|song|track|listen/.test(lower)) multiTopics.push('music');
    if (/game|tetris|maze|brick/.test(lower)) multiTopics.push('games');
    if (/support|donate|patreon/.test(lower)) multiTopics.push('support');
    if (multiTopics.length >= 2) {
      let parts = multiTopics.map(t => pickFresh(R[t], t));
      const response = parts.join('\n\n');
      rememberTurn('bot', response, multiTopics[0]);
      return response;
    }

    // Question pattern — try to be helpful
    if (isQuestion(input)) {
      // Check for specific questions about songs
      if (/how many (songs|tracks)/.test(lower)) {
        const r = "302 tracks and counting. Every one of them a chapter in the cosmic story. The full catalog lives on SoundCloud.";
        rememberTurn('bot', r, 'music');
        return r;
      }
      if (/where .*(from|live|based)/.test(lower)) {
        const r = "Lakewood, Colorado. Where the mountains meet the plains and the trembling first began.";
        rememberTurn('bot', r, 'about');
        return r;
      }
      if (/what.*(genre|kind|type|style)/.test(lower)) {
        const r = "Devotional folk meets hip-hop prayer meets electronic sacred music. Cosmic electronic is the umbrella, but the rain underneath is pure feeling.";
        rememberTurn('bot', r, 'music');
        return r;
      }
    }

    // Context-aware: if user sends short ambiguous message after a topic
    if (input.length < 15 && memory.lastIntent && R[memory.lastIntent]) {
      // Likely a follow-up
      if (/^(yes|yeah|yep|sure|ok|okay|more|go on|tell me|continue|keep going)/i.test(input.trim())) {
        const response = pickFresh(R[memory.lastIntent], memory.lastIntent);
        rememberTurn('bot', response, memory.lastIntent);
        return response;
      }
    }

    // Personality-weighted fallback
    const rand = Math.random();
    let response;
    if (rand < 0.35) {
      response = pickFresh(R.philosophy, 'philosophy');
    } else if (rand < 0.55) {
      response = pickFresh(R.humor, 'humor');
    } else {
      response = pickFresh(CONFUSED, 'confused');
    }
    rememberTurn('bot', response, null);
    return response;
  }

  /* ═══════════════════════════════════════════════════════════
     CHAT ENGINE — TYPING EFFECT + UI
     ═══════════════════════════════════════════════════════════ */

  function addMessage(text, isBot) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg ' + (isBot ? 'bot' : 'user');

    if (isBot) {
      // Show typing indicator first
      const typing = document.createElement('div');
      typing.className = 'chat-msg bot typing-indicator';
      typing.innerHTML = '<span></span><span></span><span></span>';
      messagesEl.appendChild(typing);
      messagesEl.scrollTop = messagesEl.scrollHeight;

      // Calculate realistic typing delay based on message length
      const thinkTime = 300 + Math.min(text.length * 3, 1200);

      setTimeout(() => {
        if (typing.parentNode) typing.parentNode.removeChild(typing);
        messagesEl.appendChild(msg);

        // If the brain returned HTML (track links), render immediately
        const hasHTML = /<a\s/i.test(text);
        if (hasHTML) {
          msg.innerHTML = text.replace(/\n\n/g, '<br><br>');
          messagesEl.scrollTop = messagesEl.scrollHeight;
          return;
        }

        // Typewriter effect for plain text
        let i = 0;
        const speed = 14 + Math.random() * 10;
        function type() {
          if (i < text.length) {
            msg.textContent = text.slice(0, i + 1);
            i++;
            const char = text[i - 1];
            const delay = (char === '.' || char === '—' || char === ',' || char === '?') ? speed * 4 : speed;
            setTimeout(type, delay);
          }
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }
        type();
      }, thinkTime);
    } else {
      msg.textContent = text;
      messagesEl.appendChild(msg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  async function handleSend() {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    sendBtn.disabled = true;
    addMessage(text, false);
    rememberTurn('user', text, detectIntent(text));

    const response = await generateResponse(text);
    addMessage(response, true);
    sendBtn.disabled = false;
  }

  /* ═══════════════════════════════════════════════════════════
     SUGGESTED PROMPTS — ROTATING STARTER CHIPS
     ═══════════════════════════════════════════════════════════ */

  const SUGGESTED_PROMPTS = [
    "What is STARMILK?",
    "Play me something cosmic",
    "Tell me about the games",
    "Who is Elijah?",
    "Drop some wisdom",
    "What genre is this?",
    "Where should I start?",
    "Make me laugh",
    "How can I support?",
    "Tell me about the artist",
    "What's honey in the wound?",
    "I'm feeling lost",
  ];

  function renderSuggestedPrompts() {
    const container = document.createElement('div');
    container.className = 'chat-suggestions';

    // Pick 3 random prompts
    const shuffled = [...SUGGESTED_PROMPTS].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, 3);

    picks.forEach(prompt => {
      const chip = document.createElement('button');
      chip.className = 'chat-suggestion-chip';
      chip.textContent = prompt;
      chip.addEventListener('click', () => {
        inputEl.value = prompt;
        handleSend();
        // Remove suggestions after use
        if (container.parentNode) container.parentNode.removeChild(container);
      });
      container.appendChild(chip);
    });

    messagesEl.appendChild(container);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /* ═══════════════════════════════════════════════════════════
     EVENT LISTENERS
     ═══════════════════════════════════════════════════════════ */
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
        addMessage(pickFresh(R.greeting, 'greeting'), true);
        // Show suggested prompts after greeting
        setTimeout(renderSuggestedPrompts, 2000);
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
