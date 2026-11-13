// Nand's Football Auction — multiplayer app.
// The host's browser runs the game; everyone else connects to it directly (WebRTC via PeerJS).
// Nothing is stored on any server: when the host closes the tab, the game is gone.
(function () {
  var E = window.Engine, DB = window.PLAYER_DB;
  var app = document.getElementById('app');
  var PREFIX = 'nands-fa-';
  var ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'turn:0.peerjs.com:3478', username: 'peerjs', credential: 'peerjsp' }] };

  // ---------- Shared client state ----------
  var S = { screen: 'home', role: null, myName: '', code: '', view: null, me: -1, endsAt: 0, error: '', lost: false, connecting: false, lastKey: '' };
  // ---------- Host-only state ----------
  var H = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(x) { return '$' + x + 'M'; }
  function clock(secs) { return secs >= 60 ? Math.floor(secs / 60) + ':' + ('0' + (secs % 60)).slice(-2) : String(secs); }
  function diamonds(n) { return '◆◆◆'.slice(0, n) + '◇◇◇'.slice(0, 3 - n); }
  function newCode() { var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
  function siteKey() { return (window.NFA_CONFIG && window.NFA_CONFIG.punditProxy) || ''; }
  // Judging: the host's own key if entered, otherwise the site's built-in pundit (proxy), otherwise ChatGPT copy-paste.
  function judgeKey() { return (H && H.key) || siteKey(); }
  function judgeName() { return H && H.key ? Judge.provider(H.key) : 'built-in DeepSeek'; }
  function judgeRun(prompt) { return H && H.key ? Judge.run(H.key, prompt) : Judge.runProxy(siteKey(), prompt); }
  function getKey() { try { return localStorage.getItem('nfa-groq-key') || ''; } catch (e) { return ''; } }
  function setKey(k, remember) { try { if (remember && k) localStorage.setItem('nfa-groq-key', k); else localStorage.removeItem('nfa-groq-key'); } catch (e) {} }

  // =====================================================================
  // HOST
  // =====================================================================
  function hostCreate(name) {
    S.connecting = true; S.error = ''; render();
    var code = newCode();
    var peer = new Peer(PREFIX + code, { config: ICE });
    peer.on('open', function () {
      H = { peer: peer, conns: {}, lobby: [{ name: name, peerId: null, online: true }], settings: { budget: 700, timer: 180 }, key: getKey(), remember: !!getKey(),
        g: null, screen: 'lobby', reveal: 0, result: null, judging: false, judgeNote: '' };
      S.role = 'host'; S.code = code; S.myName = name; S.me = 0; S.connecting = false; S.screen = 'game';
      hostBroadcast();
    });
    peer.on('connection', function (conn) {
      conn.on('data', function (msg) { hostHandle(conn, msg); });
      conn.on('close', function () { hostDrop(conn.peer); });
      conn.on('error', function () { hostDrop(conn.peer); });
    });
    peer.on('error', function (err) {
      if (err.type === 'unavailable-id') { peer.destroy(); hostCreate(name); return; }
      if (!H) { S.connecting = false; S.error = 'Could not create a room (' + err.type + '). Check your internet and try again.'; render(); }
    });
    peer.on('disconnected', function () { try { peer.reconnect(); } catch (e) {} });
  }

  function hostDrop(peerId) {
    if (!H) return;
    delete H.conns[peerId];
    H.lobby.forEach(function (p) { if (p.peerId === peerId) p.online = false; });
    if (!H.g) H.lobby = H.lobby.filter(function (p) { return p.online; });
    hostBroadcast();
  }

  function hostHandle(conn, msg) {
    if (!msg || typeof msg !== 'object') return;
    var now = Date.now();
    if (msg.t === 'join') {
      var name = String(msg.name || '').trim().slice(0, 16) || 'Manager';
      var existing = H.lobby.filter(function (p) { return p.name.toLowerCase() === name.toLowerCase(); })[0];
      if (H.g || H.screen !== 'lobby') {
        if (existing && !existing.online && existing.peerId !== null) { existing.peerId = conn.peer; existing.online = true; H.conns[conn.peer] = conn; hostBroadcast(); return; }
        conn.send({ t: 'error', msg: 'This game has already started. To rejoin, use exactly the same name you joined with.' }); return;
      }
      if (existing) { conn.send({ t: 'error', msg: 'That name is taken in this room. Pick another.' }); return; }
      if (H.lobby.length >= 8) { conn.send({ t: 'error', msg: 'This room is full (8 managers).' }); return; }
      H.lobby.push({ name: name, peerId: conn.peer, online: true });
      H.conns[conn.peer] = conn;
      hostBroadcast(); return;
    }
    var idx = -1;
    H.lobby.forEach(function (p, i) { if (p.peerId === conn.peer) idx = i; });
    if (idx < 0) return;
    hostAction(idx, msg, now);
  }

  function hostAction(idx, msg, now) {
    if (msg.t === 'vote') {
      if (H.screen === 'lobby' && H.lobby[idx] && E.FORMATIONS[msg.f]) { H.lobby[idx].vote = msg.f; hostBroadcast(); }
      return;
    }
    if (!H.g || H.screen !== 'auction') return;
    if (msg.t === 'bid') E.bid(H.g, idx, Number(msg.inc) || 1, now);
    else if (msg.t === 'pass') E.pass(H.g, idx, now);
    afterEngine();
  }

  // Formation vote: most votes wins; a tie goes to the host's pick if it's among the tied ones, otherwise random.
  function voteResult(lobby) {
    var counts = {}; lobby.forEach(function (p) { if (p.vote) counts[p.vote] = (counts[p.vote] || 0) + 1; });
    var best = 0; for (var f in counts) best = Math.max(best, counts[f]);
    var tied = Object.keys(counts).filter(function (f) { return counts[f] === best; });
    return { counts: counts, tied: tied, leader: tied.length === 1 ? tied[0] : (tied.indexOf(lobby[0].vote) >= 0 ? lobby[0].vote : null) };
  }

  function hostStart() {
    if (H.lobby.length < 2) return;
    var names = H.lobby.map(function (p) { return p.name; });
    var vr = voteResult(H.lobby);
    var f = vr.leader || (vr.tied.length ? vr.tied[Math.floor(Math.random() * vr.tied.length)] : '442');
    H.g = E.createGame({ names: names, budget: H.settings.budget, timerSec: H.settings.timer, db: DB, formation: f, easter: H.lobby[0].name.trim().toLowerCase() === 'goonpan' });
    E.start(H.g, Date.now());
    H.screen = 'auction'; H.reveal = 0; H.result = null; H.judging = false; H.judgeNote = '';
    hostBroadcast();
  }

  function afterEngine() {
    if (H.g && H.g.phase === 'done' && H.screen === 'auction') { H.screen = 'reveal'; H.reveal = 0; }
    hostBroadcast();
  }

  function cardsOf(m, chemPer) {
    var out = [];
    H.g.slots.forEach(function (s) {
      m.squad[s.pos].forEach(function (e, k) {
        var p = e.player;
        out.push({ pos: s.pos, k: k, label: E.posLabel(H.g.formation, s.pos, k), name: p.name, club: p.club, nation: p.nation, league: p.league, prime: p.prime, rating: p.rating, tier: e.tier, last: e.tier === H.g.managers.length && H.g.managers.length > 1, price: e.price, mv: p.mv, mvEst: p.mvEst, wiki: p.wiki,
          chem: s.pos === 'MGR' ? null : (chemPer[p.id] || 0) });
      });
    });
    return out;
  }

  // Ratings -> strengths -> a full league season. The league champion is the overall winner.
  function playLeague() {
    var r = H.result;
    r.rows.forEach(function (x) { x.total = Math.round((x.quality * 7 + x.balance * 2 + x.chem / 33 * 10) * 10) / 10; });
    r.league = E.league(r.rows.map(function (x) { return { index: x.index, name: x.name, strength: x.total }; }), H.leagueSeed);
    var pos = {}; r.league.table.forEach(function (t, i) { pos[t.index] = i; });
    r.rows.sort(function (a, b) { return pos[a.index] - pos[b.index]; });
    var champ = r.ai && r.ai.byIndex[r.rows[0].index];
    r.headline = (champ && champ.headline_if_winner) || '';
  }

  function applyAI(ai, by) {
    var r = H.result;
    r.rows.forEach(function (x) {
      var t = ai.byIndex[x.index]; if (!t) return;
      x.quality = t.quality; x.balance = t.balance;
      x.verdict = t.verdict || ''; x.best = t.best_signing || ''; x.weak = t.weak_link || '';
    });
    if (ai.smart) r.smart = ai.smart;
    r.ai = { byIndex: ai.byIndex }; r.by = by;
    H.judgeNote = ''; H.manual = false;
    playLeague();
  }

  function hostFinish() {
    var sc = E.score(H.g);
    var squads = {};
    H.g.managers.forEach(function (m, i) { squads[i] = cardsOf(m, E.chemistry(m).per); });
    H.result = { rows: sc.rows.map(function (r) { return { index: r.index, name: r.name, quality: r.quality, balance: r.balance, chem: r.chem, total: r.total, spent: r.spent, verdict: '', best: '', weak: '' }; }),
      smart: { index: sc.smartBusiness.index, reason: 'Most quality per dollar spent.' }, headline: '', by: 'formula', squads: squads };
    H.leagueSeed = Math.floor(Math.random() * 1e9);
    H.prompt = Judge.buildPrompt(H.g.managers.map(function (m, i) { return { index: i, chem: E.chemistry(m).total, cards: squads[i] }; }),
      { name: E.formation(H.g.formation).name, slots: squads[0].filter(function (c) { return c.pos !== 'MGR'; }).map(function (c) { return c.label; }).join(', ') });
    H.manualError = '';
    playLeague();
    H.screen = 'results';
    if (judgeKey()) {
      H.judging = true; H.manual = false; hostBroadcast();
      judgeRun(H.prompt).then(function (ai) { applyAI(ai, judgeName()); }).catch(function (e) {
        H.judgeNote = 'The AI pundit (' + judgeName() + ') could not be reached (' + e.message + '). The league below uses the built-in formula for now; use ChatGPT below for a proper verdict.';
        H.manual = true;
      }).then(function () { H.judging = false; hostBroadcast(); });
    } else {
      H.manual = true;
    }
    hostBroadcast();
  }

  function hostPasteReply(text) {
    try { applyAI(Judge.parse(H.prompt, text), 'chatgpt'); hostBroadcast(); }
    catch (e) { H.manualError = 'Could not read that reply: ' + e.message + '. Paste ChatGPT\'s whole answer, including the { } part.'; render(); }
  }

  // What everyone is allowed to see. Ratings and tiers are never included until the reveal.
  function buildView() {
    var v = { screen: H.screen, code: S.code, settings: H.settings, lobby: H.lobby.map(function (p) { return { name: p.name, online: p.online, vote: p.vote || null }; }), formation: H.g ? H.g.formation : null, hasKey: !!judgeKey() };
    var g = H.g;
    if (H.screen === 'auction' && g && g.phase === 'bidding') {
      var l = E.lot(g), c = g.current, st = E.slotType(l.pos, g);
      v.auction = {
        lotNo: g.lotIndex + 1, lotsTotal: g.lots.length, slotLabel: st.label, pos: l.pos, minBid: l.open,
        easter: !!l.easter, formation: g.formation, slots: g.slots.map(function (s) { return { pos: s.pos, count: s.count }; }),
        player: { name: l.player.name, tier: l.tier, photo: l.player.photo || null, club: l.player.club, league: l.player.league, nation: l.player.nation, prime: l.player.prime, wiki: l.player.wiki },
        tiers: g.managers.length,
        round: g.lots.map(function (x, i) {
          var sold = g.log.filter(function (e) { return e.lot === i; })[0];
          return { name: x.player.name, tier: x.tier, pos: x.pos, open: x.open, easter: !!x.easter, st: i < g.lotIndex ? 'past' : i === g.lotIndex ? 'now' : 'next', buyer: sold ? sold.manager : '', price: sold ? sold.price : null };
        }).filter(function (x) { return x.pos === l.pos; }),
        bid: c.bid, leader: c.leader, remainingMs: Math.max(0, c.endsAt - Date.now()), passed: Object.keys(c.passed).map(Number),
        managers: g.managers.map(function (m, i) {
          var done = {}; g.slots.forEach(function (s) { done[s.pos] = m.squad[s.pos].length; });
          return { name: m.name, online: H.lobby[i] ? H.lobby[i].online : false, money: m.money, filled: E.filled(m), maxBid: E.maxBid(g, m), needs: E.needs(m, l.pos), done: done };
        }),
        log: g.log[0] || null
      };
    }
    if (H.screen === 'reveal' && g) {
      var m = g.managers[H.reveal], chem = E.chemistry(m);
      v.reveal = { formation: g.formation, index: H.reveal, of: g.managers.length, name: m.name, chem: chem.total, cards: cardsOf(m, chem.per) };
    }
    if (H.screen === 'results' && H.result) {
      v.results = { formation: H.g.formation, rows: H.result.rows, smart: H.result.smart, headline: H.result.headline, by: H.result.by, squads: H.result.squads, league: H.result.league };
      v.judging = H.judging; v.judgeNote = H.judgeNote; v.manual = !!H.manual;
    }
    return v;
  }

  function hostBroadcast() {
    if (!H) return;
    var v = buildView();
    H.lobby.forEach(function (p, i) {
      if (p.peerId && H.conns[p.peerId]) { try { H.conns[p.peerId].send({ t: 'view', view: v, you: i }); } catch (e) {} }
    });
    receiveView(v, 0);
  }

  // =====================================================================
  // GUEST
  // =====================================================================
  var G = null;
  function guestJoin(code, name) {
    S.connecting = true; S.error = ''; S.lost = false; render();
    if (G && G.peer) { try { G.peer.destroy(); } catch (e) {} }
    var peer = new Peer({ config: ICE });
    G = { peer: peer, conn: null };
    var timeout = setTimeout(function () {
      if (S.connecting) { S.connecting = false; S.error = 'Could not reach that room. Check the code, and that the host still has the game open.'; render(); }
    }, 15000);
    peer.on('open', function () {
      var conn = peer.connect(PREFIX + code, { reliable: true });
      G.conn = conn;
      conn.on('open', function () { conn.send({ t: 'join', name: name }); });
      conn.on('data', function (msg) {
        if (msg.t === 'view') { clearTimeout(timeout); S.role = 'guest'; S.code = code; S.myName = name; S.connecting = false; S.lost = false; S.screen = 'game'; receiveView(msg.view, msg.you); }
        else if (msg.t === 'error') { clearTimeout(timeout); S.connecting = false; S.error = msg.msg; render(); try { peer.destroy(); } catch (e) {} }
      });
      conn.on('close', function () { if (S.screen === 'game') { S.lost = true; render(); } });
    });
    peer.on('error', function (err) {
      clearTimeout(timeout);
      S.connecting = false;
      S.error = err.type === 'peer-unavailable' ? 'No room with code ' + code + '. Check the code with your host.' : 'Connection problem (' + err.type + '). Try again.';
      if (S.screen === 'game') S.lost = true;
      render();
    });
  }

  function send(msg) {
    if (S.role === 'host') hostAction(0, msg, Date.now());
    else if (G && G.conn && G.conn.open) G.conn.send(msg);
  }

  // =====================================================================
  // RENDERING (same for host and guests)
  // =====================================================================
  function receiveView(v, me) {
    S.view = v; S.me = me;
    if (v.auction) S.endsAt = Date.now() + v.auction.remainingMs;
    var copy = JSON.parse(JSON.stringify(v));
    if (copy.auction) delete copy.auction.remainingMs;
    var key = JSON.stringify(copy) + '|' + me + '|' + S.lost;
    if (key === S.lastKey) return;
    S.lastKey = key;
    render();
  }

  function render() {
    if (S.screen === 'home' || !S.view) renderHome();
    else if (S.lost) renderLost();
    else {
      var v = S.view;
      if (v.screen === 'lobby') renderLobby(v);
      else if (v.screen === 'auction' && v.auction) renderAuction(v);
      else if (v.screen === 'reveal') renderReveal(v);
      else if (v.screen === 'results') renderResults(v);
    }
    Photos.hydrate(app);
  }

  function header() {
    return '<div style="text-align:center;padding:14px 0 4px"><div class="display muted" style="font-size:16px;letter-spacing:4px">NAND\'S</div><h1 class="display" style="font-size:40px;color:var(--gold)">FOOTBALL AUCTION</h1></div>';
  }

  function renderHome() {
    var busy = S.connecting;
    app.innerHTML = '<div class="stack">' + header() +
      '<div class="small muted" style="text-align:center">Bid with friends to build the best XI. Ratings stay hidden until every squad is complete.</div>' +
      '<div class="panel stack"><div><label for="name">YOUR NAME</label><input id="name" maxlength="16" placeholder="e.g. Dev" value="' + esc(S.myName) + '"></div></div>' +
      '<div class="panel stack"><div><label for="code">ROOM CODE</label><input id="code" class="code" maxlength="5" placeholder="KX7QP" value="' + esc(S.code) + '"></div>' +
      '<button class="btn-gold" data-act="join"' + (busy ? ' disabled' : '') + '>' + (busy ? 'CONNECTING…' : 'JOIN ROOM') + '</button></div>' +
      '<div class="row muted small"><div style="flex:1;height:1px;background:var(--line)"></div>or<div style="flex:1;height:1px;background:var(--line)"></div></div>' +
      '<button class="btn-outline" data-act="create"' + (busy ? ' disabled' : '') + '>CREATE A ROOM</button>' +
      (S.error ? '<div class="warn">' + esc(S.error) + '</div>' : '') +
      '<details class="panel small"><summary>How to play</summary><div class="muted" style="line-height:1.55">One person creates a room and shares the code (keep that tab open; the game lives in the host\'s browser). Everyone else joins on their own phone. Players come up one position at a time: GK, RB, two CBs, LB, RM, two CMs, LM, two STs, then a manager. Each position has as many tiers as managers and is auctioned from tier 1 (best) down. The last tier is a lucky dip: usually a player nobody wants, but sometimes a decent one. Everyone sees each player\'s tier, but nobody sees ratings until the end. Tier 1 players open at the highest price and lower tiers open lower; each player gets up to 3 minutes (the host can change this), and the lot ends early once everyone else has passed. A bid in the last 5 seconds resets the clock to 5. If nobody bids, the player goes at his opening price to whoever has the most money left and still needs that position. When all squads are done, ratings are revealed and the pundit picks a winner.</div></details>' +
      '<div class="small muted" style="text-align:center">No accounts, nothing stored. Player photos: Wikimedia Commons.</div>' +
      '</div>';
  }

  function renderLost() {
    app.innerHTML = '<div class="stack">' + header() + '<div class="warn">Lost connection to the host. If the host still has the game open, tap Rejoin; you\'ll get your squad back.</div>' +
      '<button class="btn-gold" data-act="rejoin">REJOIN ' + esc(S.code) + '</button>' + (S.error ? '<div class="small muted">' + esc(S.error) + '</div>' : '') + '</div>';
  }

  function renderLobby(v) {
    var host = S.role === 'host';
    var opt = function (vals, cur, fmt) { return vals.map(function (x) { return '<option value="' + x + '"' + (x === cur ? ' selected' : '') + '>' + fmt(x) + '</option>'; }).join(''); };
    var people = v.lobby.map(function (p, i) {
      return '<div class="mgr row between"><div><strong>' + esc(p.name) + '</strong>' + (i === S.me ? ' <span class="small muted">(you)</span>' : '') + '</div><span class="chip" style="' + (i === 0 ? 'background:rgba(232,199,102,.15);color:var(--gold)' : 'background:rgba(61,220,151,.15);color:var(--green)') + '">' + (i === 0 ? 'HOST' : 'READY') + '</span></div>';
    }).join('');
    var settings = host
      ? '<div class="row"><div style="flex:1"><label for="budget">BUDGET</label><select id="budget">' + opt([300, 400, 500, 600, 700, 800, 900], v.settings.budget, money) + '</select></div>' +
        '<div style="flex:1"><label for="timerSel">TIME PER PLAYER</label><select id="timerSel">' + opt([60, 120, 180, 300], v.settings.timer, function (x) { return (x / 60) + ' min'; }) + '</select></div></div>' +
        '<details' + (H.key || siteKey() ? '' : ' open') + '><summary class="small">AI pundit' + (siteKey() && !H.key ? ': built in, ready to go' : ' (optional)') + '</summary><div class="stack" style="gap:8px;margin-top:6px">' +
        (siteKey() ? '<div class="small" style="color:var(--green)">This site has a built-in AI pundit, so you don\'t need a key. If it runs out, paste your own key below or use ChatGPT at the end.</div>' : '') +
        '<div class="small muted">Paste a Groq key (free, starts gsk_) or a DeepSeek key (starts sk-) to have the AI judge the squads. It stays on this device and only goes to that AI. Without one, you can use ChatGPT copy-and-paste at the end, or the built-in formula.</div>' +
        '<input id="groq" type="password" autocomplete="off" placeholder="gsk_… or sk-…" value="' + esc(H.key) + '">' +
        '<label class="row small" style="gap:8px"><input id="remember" type="checkbox" style="width:20px;height:20px"' + (H.remember ? ' checked' : '') + '> Remember on this device</label></div></details>'
      : '<div class="row between small"><span class="muted">Budget</span><strong>' + money(v.settings.budget) + '</strong></div><div class="row between small"><span class="muted">Time per player</span><strong>' + (v.settings.timer / 60) + ' min</strong></div><div class="row between small"><span class="muted">Judge</span><strong>' + (v.hasKey ? 'AI pundit' : 'Built-in formula') + '</strong></div>';
    app.innerHTML = '<div class="stack">' +
      '<div class="t1" style="border-radius:18px;padding:16px 18px"><div class="small" style="font-weight:700;letter-spacing:1px">ROOM CODE</div><div class="display" style="font-size:48px;letter-spacing:8px;line-height:1">' + esc(v.code) + '</div>' +
      '<div class="small" style="margin-top:4px">Friends open this site and type the code.</div></div>' +
      (host ? '<button data-act="copy">Copy invite message</button>' : '') +
      '<div class="row between"><div class="display" style="font-size:20px">MANAGERS</div><div class="small muted">' + v.lobby.length + ' of 8</div></div>' +
      '<div class="stack" style="gap:8px">' + people + '</div>' +
      formationVote(v) +
      '<div class="panel stack" style="gap:10px">' + settings + '</div>' +
      (host
        ? '<div class="small muted">Keep this tab open and your screen on: the game runs on your device.</div><button class="btn-gold" data-act="start"' + (v.lobby.length < 2 ? ' disabled' : '') + '>' + (v.lobby.length < 2 ? 'WAITING FOR FRIENDS…' : 'START AUCTION') + '</button>'
        : '<div class="panel small muted" style="text-align:center">Waiting for the host to start…</div>') +
      '</div>';
  }

  function formationVote(v) {
    var counts = {}, mine = v.lobby[S.me] && v.lobby[S.me].vote;
    v.lobby.forEach(function (p) { if (p.vote) counts[p.vote] = (counts[p.vote] || 0) + 1; });
    var best = 0; for (var f in counts) best = Math.max(best, counts[f]);
    var btns = ['442', '433', '451', '343'].map(function (f) {
      var n = counts[f] || 0, lead = n > 0 && n === best;
      var who = v.lobby.filter(function (p) { return p.vote === f; }).map(function (p) { return esc(p.name); }).join(', ');
      return '<button data-act="vote" data-f="' + f + '" class="fvote' + (mine === f ? ' mine' : '') + (lead ? ' lead' : '') + '"><span class="display" style="font-size:22px">' + E.FORMATIONS[f].name + '</span>' +
        '<span class="small">' + n + ' vote' + (n === 1 ? '' : 's') + '</span><span class="small muted fwho">' + (who || '&nbsp;') + '</span></button>';
    }).join('');
    return '<div class="panel stack" style="gap:8px"><div class="row between"><div class="display" style="font-size:20px">FORMATION VOTE</div><div class="small muted">tap to vote</div></div>' +
      '<div class="fgrid">' + btns + '</div><div class="small muted">Most votes wins when the host starts. A tie goes to the host\'s pick; no votes means 4-4-2.</div></div>';
  }

  function slotStrip(done, nowPos, slots, f) {
    var out = '';
    slots.forEach(function (s) {
      for (var k = 0; k < s.count; k++) out += '<div class="' + (k < done[s.pos] ? 'done' : s.pos === nowPos ? 'now' : '') + '">' + E.posLabel(f, s.pos, k) + '</div>';
    });
    return '<div class="slots">' + out + '</div>';
  }

  function logLine(e) {
    if (!e) return '';
    var who = '<strong>' + esc(e.manager) + '</strong>';
    if (e.how === 'easter') return 'Nobody could afford <strong>' + esc(e.player) + '</strong>. Some legends can\'t be bought.';
    if (e.how === 'sold') return 'SOLD: ' + esc(e.player) + ' → ' + who + ' for ' + money(e.price);
    if (e.how === 'unsold') return 'No bids: ' + esc(e.player) + ' → ' + who + ' (most money left) at base value ' + money(e.price);
    return 'Only ' + who + ' still needed a ' + esc(e.pos) + ': ' + esc(e.player) + ' for ' + money(e.price);
  }

  function tierClass(tier, tiers) { return tier === tiers && tiers > 1 ? 'tlast' : 't' + Math.min(4, tier); }
  function tierLabel(tier, tiers) { return 'TIER ' + tier + (tier === tiers && tiers > 1 ? ' · LUCKY DIP' : ''); }

  function statusChip(a, m, i) {
    if (!m.needs) return '<span class="chip" style="background:#26304A;color:var(--muted)">Has one</span>';
    if (a.leader === i) return '<span class="chip" style="background:rgba(61,220,151,.15);color:var(--green)">Leading</span>';
    if (a.passed.indexOf(i) >= 0) return '<span class="chip" style="background:rgba(242,139,130,.15);color:var(--red)">PASSED</span>';
    return '<span class="chip" style="background:rgba(232,199,102,.12);color:var(--gold)">Deciding…</span>';
  }

  function renderAuction(v) {
    var a = v.auction, p = a.player, me = a.managers[S.me];
    var secs = Math.max(0, Math.ceil((S.endsAt - Date.now()) / 1000));
    var lead = a.leader === S.me, passed = a.passed.indexOf(S.me) >= 0;
    var next = function (inc) { return a.bid === null ? a.minBid : a.bid + inc; };
    var can = function (inc) { return me && me.needs && !lead && !passed && next(inc) <= me.maxBid; };
    var plural = a.pos === 'CB' || a.pos === 'CM' || a.pos === 'ST' ? 's' : '';
    var controls;
    if (!me || !me.needs) controls = '<div class="panel small muted" style="text-align:center">You already have your ' + esc(a.slotLabel.toLowerCase()) + plural + '. Sit back and watch.</div>';
    else if (lead) controls = '<div class="panel" style="text-align:center;border-color:var(--green);color:var(--green);font-weight:700">You\'re the top bidder</div>';
    else if (passed) controls = '<div class="panel small muted" style="text-align:center">You passed on this one.</div>';
    else if (a.bid === null) controls = '<div class="row"><button class="btn-green" style="flex:1" data-act="bid" data-inc="1"' + (can(1) ? '' : ' disabled') + '>OPEN AT ' + money(a.minBid) + '</button><button class="btn-pass" data-act="pass">PASS</button></div>';
    else controls = '<div class="bids">' + [1, 5, 10].map(function (inc) { return '<button data-act="bid" data-inc="' + inc + '"' + (can(inc) ? '' : ' disabled') + '><span class="small muted">+' + inc + '</span><br>' + money(next(inc)) + '</button>'; }).join('') + '</div><button class="btn-pass" data-act="pass" style="width:100%">PASS</button>';

    // Tier ladder: every player in this position, best tier first.
    var ladder = a.round.map(function (x) {
      var sub = x.st === 'past' ? (x.easter ? 'unbuyable' : x.buyer ? esc(x.buyer) + ' · ' + money(x.price) : 'sold')
        : x.st === 'now' ? 'NOW · opens ' + money(x.open) : 'opens ' + money(x.open);
      return '<div class="rung ' + tierClass(x.tier, a.tiers) + ' ' + x.st + '"><div class="rt">T' + x.tier + '</div><div class="rn">' + esc(x.name) + '</div><div class="rs">' + sub + '</div></div>';
    }).join('');

    var people = a.managers.map(function (m, i) {
      return '<div class="prow"><div class="pname"><strong>' + esc(m.name) + '</strong>' + (i === S.me ? ' <span class="muted small">you</span>' : '') + (m.online ? '' : ' <span class="small" style="color:var(--red)">offline</span>') +
        '<div class="small muted">' + m.filled + '/12 signed</div></div><div class="pmoney">' + money(m.money) + '</div>' + statusChip(a, m, i) + '</div>';
    }).join('');

    app.innerHTML = '<div class="stack" style="gap:10px">' +
      '<div class="abar"><div><div class="small muted">' + E.formation(a.formation).name + ' · LOT ' + a.lotNo + ' OF ' + a.lotsTotal + '</div><div class="display" style="font-size:24px;line-height:1">' + esc(a.slotLabel.toUpperCase()) + '</div></div>' +
      (me ? '<div style="text-align:right"><div class="display" style="font-size:22px;line-height:1;color:var(--gold)">' + money(me.money) + '</div><div class="small muted">max bid ' + money(Math.max(0, me.maxBid)) + '</div></div>' : '') + '</div>' +
      (me ? slotStrip(me.done, a.pos, a.slots, a.formation) : '') +
      '<div class="ladder">' + ladder + '</div>' +
      '<div style="text-align:center"><div class="tierflag ' + tierClass(p.tier, a.tiers) + '">' + tierLabel(p.tier, a.tiers) + '</div></div>' +
      '<div class="shield ' + tierClass(p.tier, a.tiers) + ' bigcard"><div class="ovr"><div class="display" style="font-size:42px;line-height:1">??</div><div class="display" style="font-size:18px">' + esc(a.pos) + '</div><span class="tag">' + esc(p.nation) + '</span></div>' +
      (p.photo ? '<img class="photo" alt="' + esc(p.name) + '" src="' + esc(p.photo) + '">' : '<img class="photo" alt="' + esc(p.name) + '" data-photo="' + esc(p.wiki) + '" style="visibility:hidden">') +
      '<div class="info"><div class="display" style="font-size:' + (p.name.length > 12 ? 22 : 28) + 'px;line-height:1">' + esc(p.name.toUpperCase()) + '</div>' +
      '<div style="font-size:12px;font-weight:600">' + esc(p.club) + '</div><div style="font-size:11px;font-weight:700">' + esc(p.league) + ' · PRIME ' + esc(p.prime) + '</div></div></div>' +
      '<div class="bidrow"><div class="box"><div id="timer" class="display" style="font-size:34px;line-height:1">' + clock(secs) + '</div><div class="small muted">time left</div></div>' +
      '<div class="box"><div class="small muted">CURRENT BID</div><div class="display" style="font-size:30px;line-height:1.05">' + (a.bid === null ? 'No bids' : money(a.bid)) + '</div>' +
      '<div class="small" style="font-weight:700;color:' + (a.leader === null ? 'var(--muted)' : 'var(--green)') + '">' + (a.leader === null ? 'opens at ' + money(a.minBid) : esc(a.managers[a.leader].name) + (lead ? ' (you)' : '') + ' leads') + '</div></div></div>' +
      controls +
      (a.log ? '<div class="toast">' + logLine(a.log) + '</div>' : '') +
      '<div class="panel plist">' + people + '</div>' +
      (S.role === 'host' ? '<div class="small muted" style="text-align:center">You\'re hosting: keep this tab open and your screen on.</div>' : '') +
      '</div>';
    tickTimer();
  }

  function cardHtml(c) {
    return '<div style="text-align:center"><div class="shield mini ' + (c.last ? 'tlast' : 't' + Math.min(4, c.tier)) + '"><div class="display" style="font-size:28px;line-height:1">' + c.rating + '</div><div class="display" style="font-size:14px">' + (c.label || c.pos) + '</div></div>' +
      '<img class="avatar" alt="" data-photo="' + esc(c.wiki) + '" style="visibility:hidden">' +
      '<div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(c.name) + '</div>' +
      '<div class="paid">paid ' + money(c.price) + '</div>' + (c.mv ? '<div class="worth">worth €' + c.mv + 'M' + (c.mvEst ? '*' : '') + '</div>' : '') +
      (c.chem === null ? '' : '<div class="small" style="color:var(--gold);letter-spacing:1px">' + diamonds(c.chem) + '</div>') + '</div>';
  }

  function teamMoney(cards) {
    var paid = 0, worth = 0;
    cards.forEach(function (c) { paid += c.price; if (c.mv) worth += c.mv; });
    return { paid: paid, worth: worth };
  }
  function moneyLine(cards) {
    var t = teamMoney(cards);
    return '<div class="row between" style="margin-top:8px"><div><div class="small muted">PAID</div><div class="display" style="font-size:22px">' + money(t.paid) + '</div></div>' +
      '<div style="text-align:right"><div class="small muted">REAL PEAK VALUE</div><div class="display" style="font-size:22px;color:var(--green)">€' + t.worth + 'M</div></div></div>' +
      '<div class="small muted">Peak market values are approximate; * = estimated (prime before Transfermarkt\'s data). Managers have no value.</div>';
  }

  // Squad drawn as a 4-4-2 on a pitch, manager underneath.
  function pitch(cards, f) {
    var by = {}; cards.forEach(function (c) { (by[c.pos] = by[c.pos] || []).push(c); });
    var get = function (pos, k) { return (by[pos] || [])[k || 0]; };
    var line = function (list) {
      list = list.filter(Boolean);
      var w = Math.floor(100 / Math.max(4, list.length));
      return '<div class="pline">' + list.map(function (c) { return '<div class="pcell" style="width:' + w + '%">' + cardHtml(c) + '</div>'; }).join('') + '</div>';
    };
    var mgr = get('MGR');
    return '<div class="small muted" style="text-align:center;font-weight:700;margin-bottom:6px">' + E.formation(f).name + '</div><div class="pitch">' +
      E.formation(f).layout.map(function (row) { return line(row.map(function (x) { return get(x[0], x[1]); })); }).join('') + '</div>' +
      (mgr ? '<div class="row" style="gap:12px;justify-content:center;margin-top:8px"><div style="width:80px">' + cardHtml(mgr) + '</div><div class="small muted">Manager</div></div>' : '');
  }

  function renderReveal(v) {
    var r = v.reveal, host = S.role === 'host', last = r.index === r.of - 1;
    app.innerHTML = '<div class="stack">' +
      '<div style="text-align:center"><div class="small" style="color:var(--gold);font-weight:700;letter-spacing:1.5px">THE REVEAL · TEAM ' + (r.index + 1) + ' OF ' + r.of + '</div><h1 class="display" style="font-size:36px">' + esc(r.name.toUpperCase()) + '</h1></div>' +
      pitch(r.cards, r.formation) +
      '<div class="panel"><div class="row between"><span class="small muted" style="font-weight:700">TEAM CHEMISTRY</span><span class="display" style="font-size:22px;color:var(--gold)">' + r.chem + ' / 33</span></div>' +
      '<div style="height:10px;border-radius:999px;background:var(--line);overflow:hidden;margin-top:8px"><div style="height:100%;width:' + Math.round(r.chem / 33 * 100) + '%;background:var(--gold)"></div></div>' +
      '<div class="small muted" style="margin-top:8px">Card colour = tier: gold, silver, bronze, slate; dark red = lucky dip. ◆ = chemistry points.</div></div>' +
      '<div class="panel">' + moneyLine(r.cards) + '</div>' +
      (host ? '<button class="btn-gold" data-act="nextReveal">' + (last ? 'SEE THE VERDICT' : 'NEXT TEAM') + '</button>' : '<div class="panel small muted" style="text-align:center">The host controls the reveal.</div>') +
      '</div>';
  }

  function renderResults(v) {
    var r = v.results, host = S.role === 'host', lg = r.league;
    var names = {}; r.rows.forEach(function (x) { names[x.index] = x.name; });
    var champ = lg.table[0];
    var medal = ['var(--gold)', '#C9CED9', '#D9A070'];
    var table = lg.table.map(function (t, i) {
      var gd = t.gf - t.ga;
      return '<tr' + (i === 0 ? ' style="background:rgba(232,199,102,.08)"' : '') + '><td class="display" style="font-size:18px;color:' + (medal[i] || 'var(--muted)') + '">' + (i + 1) + '</td><td><strong>' + esc(t.name) + '</strong></td><td>' + t.p + '</td><td>' + t.w + '</td><td>' + t.d + '</td><td>' + t.l + '</td><td>' + (gd > 0 ? '+' : '') + gd + '</td><td class="display" style="font-size:18px;text-align:right">' + t.pts + '</td></tr>';
    }).join('');
    var rounds = '';
    for (var rd = 1; rd <= lg.legs; rd++) {
      rounds += '<div class="small muted" style="font-weight:700;margin-top:8px">ROUND ' + rd + '</div>' + lg.results.filter(function (m) { return m.round === rd; }).map(function (m) {
        return '<div class="row between small" style="padding:3px 0"><span style="flex:1;text-align:right">' + esc(names[m.home]) + '</span><strong class="display" style="font-size:16px;min-width:48px;text-align:center">' + m.hg + ' – ' + m.ag + '</strong><span style="flex:1">' + esc(names[m.away]) + '</span></div>';
      }).join('');
    }
    var ratings = r.rows.map(function (x) {
      return '<tr><td><strong>' + esc(x.name) + '</strong></td><td>' + x.quality + '</td><td>' + x.balance + '</td><td>' + x.chem + '</td><td style="text-align:right"><strong>' + x.total + '</strong></td></tr>';
    }).join('');
    var by = r.by === 'chatgpt' ? 'ChatGPT' : r.by === 'formula' ? 'the built-in formula' : 'the AI pundit (' + r.by + ')';
    var verdicts = r.rows.filter(function (x) { return x.verdict; }).map(function (x) {
      return '<div class="panel"><div class="small" style="color:var(--gold);font-weight:700">PUNDIT ON ' + esc(x.name.toUpperCase()) + '</div><div style="margin:4px 0;line-height:1.4">' + esc(x.verdict) + '</div>' +
        (x.best ? '<div class="small muted">Best signing: <strong style="color:var(--ink)">' + esc(x.best) + '</strong></div>' : '') + (x.weak ? '<div class="small muted">Weak link: <strong style="color:var(--ink)">' + esc(x.weak) + '</strong></div>' : '') + '</div>';
    }).join('');
    var smartName = r.rows.filter(function (x) { return x.index === r.smart.index; })[0];
    var squads = r.rows.map(function (x) {
      var tm = teamMoney(r.squads[x.index]);
      return '<details class="panel"><summary>' + esc(x.name) + ' · paid ' + money(tm.paid) + ' · worth €' + tm.worth + 'M</summary><div style="margin-top:8px">' + pitch(r.squads[x.index], r.formation) + moneyLine(r.squads[x.index]) + '</div></details>';
    }).join('');
    var manual = '';
    if (v.manual && host && H && H.prompt) {
      manual = '<div class="panel stack" style="gap:8px;border-color:var(--gold)"><div class="small" style="color:var(--gold);font-weight:700;letter-spacing:.5px">GET THE PUNDIT\'S VERDICT FROM CHATGPT</div>' +
        '<div class="small muted">1. Copy this and paste it into ChatGPT (or any AI chat).</div>' +
        '<textarea id="promptText" readonly rows="5">' + esc(H.prompt.text) + '</textarea><button data-act="copyPrompt">Copy prompt</button>' +
        '<div class="small muted">2. In ChatGPT, tap <strong>Copy</strong> on the code box it replies with, then tap <strong>Paste &amp; use</strong> below. The league is then replayed with its ratings.</div>' +
        '<button class="btn-green" data-act="pasteReply" style="width:100%">PASTE &amp; USE CHATGPT\'S REPLY</button>' +
        '<div class="small muted">If pasting is blocked, paste into this box yourself and tap Use this verdict.</div>' +
        '<textarea id="reply" rows="5" placeholder="{ &quot;teams&quot;: [ … ] }">' + esc(H.replyDraft || '') + '</textarea>' +
        (H.manualError ? '<div class="warn">' + esc(H.manualError) + '</div>' : '') +
        '<button data-act="useReply" style="width:100%">Use this verdict</button></div>';
    } else if (v.manual && !host) {
      manual = '<div class="panel small muted">The host can get the pundit\'s verdict from ChatGPT. When they do, the league is replayed and this page updates.</div>';
    }
    app.innerHTML = '<div class="stack">' +
      '<div style="text-align:center"><div class="small" style="color:var(--gold);font-weight:700;letter-spacing:1.5px">LEAGUE CHAMPIONS</div><h1 class="display" style="font-size:36px;color:var(--gold)">' + esc(champ.name.toUpperCase()) + '</h1>' +
      (r.headline ? '<div style="margin-top:6px;font-weight:600">' + esc(r.headline) + '</div>' : '') + '</div>' +
      (v.judging ? '<div class="toast">The pundit is rating the squads… the league will be replayed with their ratings.</div>' : '') +
      (v.judgeNote ? '<div class="warn">' + esc(v.judgeNote) + '</div>' : '') +
      manual +
      '<div class="panel"><div class="small muted" style="font-weight:700;margin-bottom:4px">FINAL TABLE · every team plays every other ' + (lg.legs === 4 ? 'four times' : 'home and away') + '</div>' +
      '<table><thead><tr><th>#</th><th>Manager</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th style="text-align:right">Pts</th></tr></thead><tbody>' + table + '</tbody></table>' +
      '<details><summary class="small">All results</summary>' + rounds + '</details></div>' +
      '<div class="panel"><div class="small muted" style="font-weight:700;margin-bottom:4px">TEAM RATINGS · rated by ' + by + '</div>' +
      '<table><thead><tr><th>Manager</th><th>Qual</th><th>Bal</th><th>Chem</th><th style="text-align:right">Strength</th></tr></thead><tbody>' + ratings + '</tbody></table>' +
      '<div class="small muted" style="margin-top:6px">Strength = quality × 7 + balance × 2 + chemistry ÷ 33 × 10. Stronger teams score more often, but upsets happen.</div></div>' +
      '<div class="panel" style="border-color:var(--green);background:rgba(61,220,151,.07)"><div class="small" style="color:var(--green);font-weight:700">SMART BUSINESS AWARD</div><div style="margin-top:4px"><strong>' + esc(smartName ? smartName.name : '') + '</strong> · ' + esc(r.smart.reason) + '</div></div>' +
      verdicts + squads +
      '<details class="panel small" id="credits"><summary>Photo credits</summary><div id="creditList" class="muted">Loading…</div></details>' +
      (host ? '<button class="btn-gold" data-act="again">NEW GAME, SAME ROOM</button>' : '<div class="panel small muted" style="text-align:center">The host can start a new game in this room.</div>') +
      '</div>';
    var det = document.getElementById('credits');
    det.addEventListener('toggle', function () {
      if (!det.open || det.getAttribute('data-loaded')) return;
      det.setAttribute('data-loaded', '1');
      var titles = []; for (var k in r.squads) r.squads[k].forEach(function (c) { titles.push(c.wiki); });
      Photos.credits(titles).then(function (list) {
        document.getElementById('creditList').innerHTML = list.length ? list.map(function (c) { return '<div style="padding:3px 0"><a href="' + esc(c.url) + '" target="_blank" rel="noopener">' + esc(c.file.replace(/^File:/, '')) + '</a> · ' + esc(c.artist) + ' · ' + esc(c.license) + '</div>'; }).join('') : 'No photos were loaded.';
      });
    });
  }

  function tickTimer() {
    var el = document.getElementById('timer'); if (!el) return;
    var secs = Math.max(0, Math.ceil((S.endsAt - Date.now()) / 1000));
    el.textContent = clock(secs); el.style.color = secs <= 10 ? 'var(--gold)' : 'var(--ink)';
  }

  // =====================================================================
  // EVENTS
  // =====================================================================
  app.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b || b.disabled) return;
    var act = b.getAttribute('data-act');
    if (act === 'create' || act === 'join') {
      var name = (document.getElementById('name').value || '').trim();
      var code = (document.getElementById('code').value || '').trim().toUpperCase();
      S.myName = name; S.code = code;
      if (!name) { S.error = 'Enter your name first.'; render(); return; }
      if (act === 'create') hostCreate(name.slice(0, 16));
      else { if (code.length !== 5) { S.error = 'Room codes are 5 characters.'; render(); return; } guestJoin(code, name.slice(0, 16)); }
    } else if (act === 'rejoin') { guestJoin(S.code, S.myName); }
    else if (act === 'start') { hostStart(); }
    else if (act === 'vote') { send({ t: 'vote', f: b.getAttribute('data-f') }); }
    else if (act === 'bid') { send({ t: 'bid', inc: Number(b.getAttribute('data-inc')) }); }
    else if (act === 'pass') { send({ t: 'pass' }); }
    else if (act === 'nextReveal') {
      if (H.reveal < H.g.managers.length - 1) { H.reveal++; hostBroadcast(); } else hostFinish();
      window.scrollTo(0, 0);
    } else if (act === 'again') { H.g = null; H.screen = 'lobby'; H.result = null; H.manual = false; H.replyDraft = ''; H.judgeNote = ''; H.lobby = H.lobby.filter(function (p) { return p.online; }); hostBroadcast(); }
    else if (act === 'copyPrompt') {
      var ta = document.getElementById('promptText');
      var done = function () { b.textContent = 'Copied! Now paste it into ChatGPT'; };
      if (navigator.clipboard) navigator.clipboard.writeText(H.prompt.text).then(done, function () { ta.focus(); ta.select(); b.textContent = 'Select all and copy'; });
      else { ta.focus(); ta.select(); b.textContent = 'Select all and copy'; }
      return;
    }
    else if (act === 'useReply') { hostPasteReply(document.getElementById('reply').value); return; }
    else if (act === 'pasteReply') {
      var fail = function () { H.manualError = 'Your browser blocked reading the clipboard. Long-press the box below, tap Paste, then tap Use this verdict.'; render(); };
      if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(function (txt) { H.replyDraft = txt; hostPasteReply(txt); }, fail);
      else fail();
      return;
    }
    else if (act === 'copy') {
      var msg = "Join my Nand's Football Auction game: " + location.href.split('#')[0] + ' (room code ' + S.code + ')';
      if (navigator.clipboard) navigator.clipboard.writeText(msg).then(function () { b.textContent = 'Copied!'; }, function () { b.textContent = msg; });
      else b.textContent = msg;
    }
  });
  app.addEventListener('input', function (ev) { if (ev.target.id === 'reply' && H) H.replyDraft = ev.target.value; });
  app.addEventListener('change', function (ev) {
    var t = ev.target; if (!H) return;
    if (t.id === 'budget') { H.settings.budget = Number(t.value); hostBroadcast(); }
    else if (t.id === 'timerSel') { H.settings.timer = Number(t.value); hostBroadcast(); }
    else if (t.id === 'remember') { H.remember = t.checked; setKey(H.key, H.remember); }
    else if (t.id === 'groq') { H.key = t.value.trim(); setKey(H.key, H.remember); hostBroadcast(); }
  });

  // Host game loop: runs the clock and keeps everyone in sync.
  var lastSync = 0;
  setInterval(function () {
    if (H && H.g && H.screen === 'auction') {
      if (E.tick(H.g, Date.now())) { afterEngine(); lastSync = Date.now(); }
      else if (Date.now() - lastSync > 1000) { hostBroadcast(); lastSync = Date.now(); }
    }
    tickTimer();
  }, 200);

  window.addEventListener('beforeunload', function (e) { if (S.role === 'host' && H && H.g) { e.preventDefault(); e.returnValue = ''; } });

  render();
})();
