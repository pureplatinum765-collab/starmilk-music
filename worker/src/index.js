// STARMILK Guide Worker — deploy behind a Cloudflare Worker route before setting
// data-starmilk-guide-endpoint in index.html. No provider credential reaches the browser.

const ORIGINS = new Set(['https://starmilk.org', 'https://www.starmilk.org', 'https://pureplatinum765-collab.github.io']);
const MODEL = '@cf/meta/llama-3.1-8b-instruct';
const CONTEXT = `You are the STARMILK guide. Help visitors navigate this artist website. Valid destinations: stream (music platforms), radio (track player), the-vision (artist world), river (interactive journey), lyrics (Honey Drip), orchard (song catalog), games (Maze, Brick Breaker, Tetris), support (donations), vip (Patreon), connect (socials). Do not invent releases, prices, biographical facts, medical advice, or personal claims. Be concise, warm, specific, and propose at most one matching destination.`;

function cors(request) {
  const origin = request.headers.get('Origin') || '';
  return { 'Access-Control-Allow-Origin': ORIGINS.has(origin) ? origin : 'https://starmilk.org', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' };
}

export default {
  async fetch(request, env) {
    const headers = cors(request);
    if (request.method === 'OPTIONS') return new Response(null, { headers });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers });
    const origin = request.headers.get('Origin');
    if (origin && !ORIGINS.has(origin)) return new Response('Origin not allowed', { status: 403, headers });
    let body;
    try { body = await request.json(); } catch (_) { return Response.json({ error: 'Invalid request' }, { status: 400, headers }); }
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 600) : '';
    if (!message) return Response.json({ error: 'A message is required' }, { status: 400, headers });
    try {
      const reply = await env.AI.run(MODEL, { messages: [{ role: 'system', content: CONTEXT }, { role: 'user', content: message }], max_tokens: 220, temperature: 0.65 });
      return Response.json({ answer: reply.response || 'The guide is quiet for a moment. Try the music or the river.', source: 'worker-ai' }, { headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    } catch (_) {
      return Response.json({ error: 'Guide temporarily unavailable' }, { status: 503, headers });
    }
  },
};
