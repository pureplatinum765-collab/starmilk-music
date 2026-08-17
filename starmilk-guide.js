/* STARMILK Guide — page-aware assistant client.
   Uses a secure server endpoint when configured; retains a local navigation fallback. */
(function () {
  'use strict';

  const toggle = document.getElementById('starmilk-chat-toggle');
  const panel = document.getElementById('starmilk-chat-panel');
  const closeButton = document.getElementById('starmilk-chat-close');
  const messages = document.getElementById('starmilk-chat-messages');
  const input = document.getElementById('starmilk-chat-in');
  const send = document.getElementById('starmilk-chat-send');
  if (!toggle || !panel || !messages || !input || !send) return;

  const endpoint = document.documentElement.dataset.starmilkGuideEndpoint || '';
  const facts = [
    { keys: ['music', 'listen', 'song', 'track', 'radio'], answer: 'Start with STARMILK Radio for a moving stream, or visit the catalog for SoundCloud, Spotify, Apple Music, and video.', action: { label: 'Open radio', id: 'radio' } },
    { keys: ['game', 'play', 'tetris', 'maze', 'brick'], answer: 'The game terminal has Cosmic Maze Quest, Brick Breaker, and Cosmic Tetris. Each opens in its own focused play surface.', action: { label: 'Go to games', id: 'games' } },
    { keys: ['support', 'donate', 'coffee', 'patreon', 'help'], answer: 'Support options live in the offering room: Buy Me a Coffee, PayPal, Venmo, SoundCloud support, and the Patreon inner circle.', action: { label: 'Go to support', id: 'support' } },
    { keys: ['river', 'lyric', 'lyrics', 'poem'], answer: 'The river is a scroll-led visual journey; the Honey Drip room lets you move through lyric fragments at your own pace.', action: { label: 'Visit the river', id: 'river' } },
    { keys: ['orchard', 'catalog', 'fruit'], answer: 'The orchard is an interactive catalog. Tap a fruit to reveal a song and let the grove grow as you linger.', action: { label: 'Visit orchard', id: 'orchard' } },
    { keys: ['who', 'about', 'starmilk', 'raphael'], answer: 'STARMILK is a music world built around electronic sound, devotion, grief-to-grace motion, and the river-to-ocean metaphor.', action: { label: 'Read the vision', id: 'the-vision' } },
  ];

  const addMessage = (text, who = 'bot', action) => {
    const bubble = document.createElement('div');
    bubble.className = `chat-msg ${who}`;
    bubble.textContent = text;
    messages.appendChild(bubble);
    if (action) {
      const button = document.createElement('button');
      button.className = 'chat-suggestion-chip';
      button.type = 'button';
      button.textContent = action.label;
      button.addEventListener('click', () => {
        document.getElementById(action.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        closeGuide();
      });
      messages.appendChild(button);
    }
    messages.scrollTop = messages.scrollHeight;
  };

  const localAnswer = (query) => {
    const lower = query.toLowerCase();
    return facts.find((fact) => fact.keys.some((key) => lower.includes(key))) || {
      answer: 'I can point you toward listening, the river, lyrics, the orchard, games, support, or the vision. What are you looking for?',
      action: { label: 'Explore music', id: 'stream' },
    };
  };

  const closeGuide = () => {
    panel.classList.remove('open');
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
  };
  const openGuide = () => {
    window.dispatchEvent(new CustomEvent('starmilk:surfaceOpen', { detail: { target: 'chat' } }));
    panel.classList.add('open');
    toggle.classList.add('active');
    toggle.setAttribute('aria-expanded', 'true');
    if (!messages.children.length) {
      addMessage('I’m your STARMILK guide. Ask for music, games, the river, lyrics, the orchard, or ways to support the work.');
    }
    setTimeout(() => input.focus(), 80);
  };

  const requestAnswer = async (query) => {
    const fallback = localAnswer(query);
    if (!endpoint) return fallback;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: query }), signal: controller.signal });
      if (!response.ok) return fallback;
      const data = await response.json();
      return { answer: String(data.answer || fallback.answer).slice(0, 1200), action: data.action?.id ? data.action : fallback.action };
    } catch (_) {
      return fallback;
    } finally {
      clearTimeout(timeout);
    }
  };

  const handleSend = async () => {
    const query = input.value.trim().slice(0, 600);
    if (!query) return;
    input.value = '';
    addMessage(query, 'user');
    send.disabled = true;
    const answer = await requestAnswer(query);
    send.disabled = false;
    addMessage(answer.answer, 'bot', answer.action);
  };

  toggle.addEventListener('click', () => panel.classList.contains('open') ? closeGuide() : openGuide());
  closeButton?.addEventListener('click', closeGuide);
  send.addEventListener('click', handleSend);
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSend(); } });
  window.addEventListener('starmilk:requestClose', (event) => { if (event.detail?.target === 'chat') closeGuide(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && panel.classList.contains('open')) { closeGuide(); toggle.focus(); } });
})();
