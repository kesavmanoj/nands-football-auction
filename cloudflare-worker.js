// Nand's Football Auction — AI pundit proxy (Cloudflare Worker).
// Keeps the DeepSeek key secret: the key is stored in Cloudflare as the secret DEEPSEEK_KEY,
// never in the website's code. Only requests from the game's site, shaped like a game verdict, are passed on.

const ALLOWED_ORIGIN = 'https://kesavmanoj.github.io';
const MAX_CHARS = 20000; // an 8-player game prompt is about 10,000 characters

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    const reply = (obj, status) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method === 'GET') return reply({ ok: true, message: "Nand's Football Auction pundit is running." }, 200);
    if (request.method !== 'POST' || request.headers.get('Origin') !== ALLOWED_ORIGIN) return reply({ error: 'Not allowed' }, 403);
    if (!env.DEEPSEEK_KEY) return reply({ error: 'DEEPSEEK_KEY secret is not set' }, 500);

    let body;
    try { body = await request.json(); } catch (e) { return reply({ error: 'Bad request' }, 400); }
    const system = String(body.system || ''), user = String(body.user || '');
    const looksLikeGame = system.startsWith('You are the judge of "Nand\'s Football Auction"') && user.startsWith('Team A');
    if (!looksLikeGame || system.length + user.length > MAX_CHARS) return reply({ error: 'Not a game request' }, 400);

    const upstream = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.DEEPSEEK_KEY },
      body: JSON.stringify({
        model: 'deepseek-chat', temperature: 0.3, max_tokens: 3000, response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
      })
    });
    return new Response(await upstream.text(), { status: upstream.status, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
};
