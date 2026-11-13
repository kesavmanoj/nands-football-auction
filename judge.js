// AI pundit: an AI rates each squad's quality and balance; the game then plays a home-and-away league
// with those ratings, and the league champion wins. Groq is called from the host's browser with the
// host's own key. If that isn't available, the host can copy the same prompt into ChatGPT and paste
// the reply back. Chemistry is never scored by the AI.
window.Judge = (function () {
  var MODEL = 'openai/gpt-oss-120b';
  var LETTERS = 'ABCDEFGH';
  var SYSTEM = [
    'You are the judge of "Nand\'s Football Auction", a game where friends bid with equal budgets to build a starting XI plus a manager in the {FORMATION} formation. Each round only offered players of that position, so every player is in his natural position.',
    'You will receive teams labelled Team A, Team B, etc. Each lists 11 players by slot ({SLOTS}) and a manager. Each entry includes prime club, nation, league, prime years, a reference rating out of 100 from the game\'s database, and the price paid in millions of dollars. Each team also shows its chemistry score out of 33, calculated by the game; do not score chemistry yourself.',
    'Your scores set each team\'s strength (quality x 7 + balance x 2 + chemistry / 33 x 10). The game then plays a full home-and-away league between the teams using those strengths, and the league champion wins.',
    'Score every team from 0 to 10, to one decimal place, on:',
    '1. Squad quality: the ability of the 11 players and the manager at their prime, whatever their era. Compare players across eras fairly. Use the reference rating as a guide; adjust only where your football knowledge strongly disagrees.',
    '2. Balance: strength across the whole team. Penalise obvious weak links and lopsided teams.',
    'Rules:',
    '- Ignore team names and the order teams are listed in.',
    '- Prices paid must NOT affect quality or balance scores.',
    '- Be decisive. Avoid giving teams identical scores.',
    '- Separately, choose the Smart Business winner: the team that got the most quality for the money it spent.',
    '- Write like a sharp TV pundit.',
    '- Never refer to teams by their letter in any text you write. Say "this side", or name a player.',
    '- For each team, write a headline to use if that team wins the league.',
    'Return ONLY this JSON, with no other text:',
    '{"teams": [{"team": "A", "quality": 0.0, "balance": 0.0, "best_signing": "", "weak_link": "", "verdict": "one punchy sentence on the strongest point, one on the weakest", "headline_if_winner": ""}], "smart_business": {"team": "A", "reason": ""}}'
  ].join('\n');

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // teams: [{ index, chem, cards: [{pos, name, club, nation, league, prime, rating, price}] }]
  // Returns { order: [team index per letter], system, user, text } — `text` is the copy-and-paste version.
  function buildPrompt(teams, form) {
    form = form || { name: '4-4-2', slots: 'GK, RB, CB, CB, LB, RM, CM, CM, LM, ST, ST' };
    var system = SYSTEM.replace('{FORMATION}', form.name).replace('{SLOTS}', form.slots);
    var order = shuffle(teams);
    var user = order.map(function (t, i) {
      return 'Team ' + LETTERS[i] + ' (chemistry ' + t.chem + '/33):\n' + t.cards.map(function (c) {
        return (c.label || c.pos) + ': ' + c.name + ' (' + c.club + ', ' + c.nation + ', ' + c.league + ', prime ' + c.prime + ', rating ' + c.rating + ', paid $' + c.price + 'M)';
      }).join('\n');
    }).join('\n\n');
    var copyNote = '\n\nPut the JSON in a single ```json code block and write nothing else, so it can be copied with one click.';
    return { order: order.map(function (t) { return t.index; }), system: system, user: user, text: system + '\n\n' + user + copyNote };
  }

  function letterOf(x) { return LETTERS.indexOf(String(x || '').replace(/team\s*/i, '').trim().charAt(0).toUpperCase()); }
  function scrub(txt) { return String(txt || '').replace(/\bTeam [A-H]\b/g, 'This side').replace(/(^|[.!?]\s+)[A-H][’']s\b/g, '$1This side\'s'); }

  // Reads the AI's reply (from Groq, or pasted from ChatGPT, even with extra text or ``` fences around it).
  function parse(prompt, content) {
    var raw = String(content || '');
    var start = raw.indexOf('{'), end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('No JSON found in the reply');
    var out = JSON.parse(raw.slice(start, end + 1));
    var byIndex = {};
    (out.teams || []).forEach(function (t) {
      var pos = letterOf(t.team);
      if (pos >= 0 && pos < prompt.order.length) {
        t.quality = Math.max(0, Math.min(10, Math.round(Number(t.quality) * 10) / 10));
        t.balance = Math.max(0, Math.min(10, Math.round(Number(t.balance) * 10) / 10));
        if (isNaN(t.quality) || isNaN(t.balance)) return;
        t.verdict = scrub(t.verdict); t.headline_if_winner = scrub(t.headline_if_winner);
        t.best_signing = scrub(t.best_signing); t.weak_link = scrub(t.weak_link);
        byIndex[prompt.order[pos]] = t;
      }
    });
    if (Object.keys(byIndex).length !== prompt.order.length) throw new Error('The reply is missing a team');
    var sb = out.smart_business || {}, sbPos = letterOf(sb.team);
    return { byIndex: byIndex, smart: sbPos >= 0 && sbPos < prompt.order.length ? { index: prompt.order[sbPos], reason: scrub(sb.reason) } : null };
  }

  // Groq keys start "gsk_"; DeepSeek keys start "sk-". Both use the same OpenAI-style API.
  function provider(key) {
    if (/^gsk_/.test(key)) return { name: 'Groq', url: 'https://api.groq.com/openai/v1/chat/completions', model: MODEL };
    return { name: 'DeepSeek', url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat' };
  }

  function run(key, prompt) {
    var pv = provider(key);
    return fetch(pv.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model: pv.model, temperature: 0.3, response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }] })
    }).then(function (r) {
      if (!r.ok) throw new Error(pv.name + ' said ' + r.status);
      return r.json();
    }).then(function (data) { return parse(prompt, data.choices[0].message.content); });
  }

  // The site's built-in pundit: a Cloudflare Worker that adds the secret DeepSeek key and passes the request on.
  function runProxy(url, prompt) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system: prompt.system, user: prompt.user }) })
      .then(function (r) {
        if (r.status === 402) throw new Error('the built-in pundit has run out of credit');
        if (!r.ok) throw new Error('the built-in pundit said ' + r.status);
        return r.json();
      }).then(function (data) { return parse(prompt, data.choices[0].message.content); });
  }

  return { buildPrompt: buildPrompt, parse: parse, run: run, runProxy: runProxy, provider: function (key) { return provider(key).name; } };
})();
