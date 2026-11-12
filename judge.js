// AI pundit: asks Groq's free API to score squad quality and balance.
// Runs only in the host's browser with the host's own key. Chemistry is never scored by the AI.
window.Judge = (function () {
  var MODEL = 'openai/gpt-oss-120b';
  var SYSTEM = [
    'You are the judge of "Nand\'s Football Auction", a game where friends bid with equal budgets to build a 4-4-2 starting XI plus a manager. Each round only offered players of that position, so every player is in his natural position.',
    'You will receive teams labelled Team A, Team B, etc. Each lists 11 players by slot (GK, RB, CB, CB, LB, RM, CM, CM, LM, ST, ST) and a manager. Each entry includes prime club, nation, league, prime years, a reference rating out of 100 from the game\'s database, and the price paid in millions of dollars. Each team also shows its chemistry score out of 33, calculated by the game; do not score chemistry yourself. The final total is quality x 7 + balance x 2 + chemistry / 33 x 10.',
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
    '- For each team, write a match-report headline to use if that team wins on the final total.',
    'Return ONLY this JSON:',
    '{"teams": [{"team": "A", "quality": 0.0, "balance": 0.0, "best_signing": "", "weak_link": "", "verdict": "one punchy sentence on the strongest point, one on the weakest", "headline_if_winner": ""}], "smart_business": {"team": "A", "reason": ""}}'
  ].join('\n');

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // teams: [{ index, cards: [{pos, name, club, nation, league, prime, rating, price}] }]
  function run(key, teams) {
    var order = shuffle(teams);
    var letters = 'ABCDEFGH';
    var text = order.map(function (t, i) {
      return 'Team ' + letters[i] + ' (chemistry ' + t.chem + '/33):\n' + t.cards.map(function (c) {
        return c.pos + ': ' + c.name + ' (' + c.club + ', ' + c.nation + ', ' + c.league + ', prime ' + c.prime + ', rating ' + c.rating + ', paid $' + c.price + 'M)';
      }).join('\n');
    }).join('\n\n');
    return fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model: MODEL, temperature: 0.3, response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: text }] })
    }).then(function (r) {
      if (!r.ok) throw new Error('Groq said ' + r.status);
      return r.json();
    }).then(function (data) {
      var out = JSON.parse(data.choices[0].message.content);
      var scrub = function (txt) { return String(txt || '').replace(/\bTeam [A-H]\b/g, 'This side').replace(/(^|[.!?]\s+)[A-H][’']s\b/g, '$1This side\'s'); };
      var byIndex = {};
      (out.teams || []).forEach(function (t) {
        var pos = letters.indexOf(String(t.team).replace(/team\s*/i, '').trim().charAt(0).toUpperCase());
        if (pos >= 0 && order[pos]) byIndex[order[pos].index] = t;
      });
      if (Object.keys(byIndex).length !== teams.length) throw new Error('The pundit skipped a team');
      var sb = out.smart_business || {};
      var sbPos = letters.indexOf(String(sb.team || '').replace(/team\s*/i, '').trim().charAt(0).toUpperCase());
      for (var k in byIndex) { var t = byIndex[k]; t.verdict = scrub(t.verdict); t.headline_if_winner = scrub(t.headline_if_winner); }
      return { byIndex: byIndex, smart: sbPos >= 0 && order[sbPos] ? { index: order[sbPos].index, reason: scrub(sb.reason) } : null };
    });
  }
  return { run: run };
})();
