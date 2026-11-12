// Nand's Football Auction — game engine (rules only, no UI).
// Pure logic so the same file can later run on the server as the bid referee.
(function (root) {
  var SLOT_TYPES = [
    { pos: 'GK', count: 1, label: 'Goalkeeper' },
    { pos: 'RB', count: 1, label: 'Right back' },
    { pos: 'CB', count: 2, label: 'Centre back' },
    { pos: 'LB', count: 1, label: 'Left back' },
    { pos: 'RM', count: 1, label: 'Right midfield' },
    { pos: 'CM', count: 2, label: 'Central midfield' },
    { pos: 'LM', count: 1, label: 'Left midfield' },
    { pos: 'ST', count: 2, label: 'Striker' },
    { pos: 'MGR', count: 1, label: 'Manager' }
  ];
  var TOTAL_SLOTS = 12;
  var RESET_MS = 5000;

  function shuffle(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function slotType(pos) { for (var i = 0; i < SLOT_TYPES.length; i++) if (SLOT_TYPES[i].pos === pos) return SLOT_TYPES[i]; }

  // For each slot: rank candidates, split into n bands (tier 1 = best), draw `count` from each band.
  function buildLots(db, n, rng) {
    var lots = [];
    SLOT_TYPES.forEach(function (st) {
      var cands = db.filter(function (p) { return p.pos === st.pos; }).sort(function (a, b) { return b.rating - a.rating; });
      var band = Math.floor(cands.length / n);
      if (band < st.count) throw new Error('Not enough ' + st.label + ' players for ' + n + ' managers');
      var slotLots = [];
      for (var t = 0; t < n; t++) {
        var picks = shuffle(cands.slice(t * band, (t + 1) * band), rng).slice(0, st.count);
        picks.forEach(function (p) { slotLots.push({ player: p, pos: st.pos, tier: t + 1 }); });
      }
      shuffle(slotLots, rng).forEach(function (l) { lots.push(l); });
    });
    return lots;
  }

  function createGame(opts) {
    var rng = opts.rng || Math.random;
    var budget = opts.budget || 700;
    var g = {
      budget: budget,
      minBid: Math.max(1, Math.round(budget / 140)),
      timerMs: (opts.timerSec || 15) * 1000,
      managers: opts.names.map(function (name) {
        var squad = {}; SLOT_TYPES.forEach(function (s) { squad[s.pos] = []; });
        return { name: name, money: budget, squad: squad };
      }),
      lots: buildLots(opts.db, opts.names.length, rng),
      lotIndex: -1,
      phase: 'ready',
      current: null,
      log: [],
      rng: rng
    };
    return g;
  }

  function filled(m) { var c = 0; for (var k in m.squad) c += m.squad[k].length; return c; }
  function needs(m, pos) { return m.squad[pos].length < slotType(pos).count; }
  function maxBid(g, m) { return m.money - g.minBid * (TOTAL_SLOTS - filled(m) - 1); }
  function lot(g) { return g.lots[g.lotIndex]; }
  function needers(g) { var l = lot(g); return g.managers.map(function (m, i) { return i; }).filter(function (i) { return needs(g.managers[i], l.pos); }); }

  function assign(g, mi, price, how) {
    var l = lot(g), m = g.managers[mi];
    m.money -= price;
    m.squad[l.pos].push({ player: l.player, tier: l.tier, price: price });
    g.log.unshift({ lot: g.lotIndex, player: l.player.name, pos: l.pos, manager: m.name, price: price, how: how });
  }

  // Moves to the next lot. Lots with only one manager still needing the slot are auto-assigned at the minimum.
  function nextLot(g, now) {
    while (true) {
      g.lotIndex++;
      if (g.lotIndex >= g.lots.length) { g.phase = 'done'; g.current = null; return; }
      var who = needers(g);
      if (who.length === 1) { assign(g, who[0], g.minBid, 'last'); continue; }
      g.phase = 'bidding';
      g.current = { bid: null, leader: null, endsAt: now + g.timerMs, passed: {} };
      return;
    }
  }

  function start(g, now) { nextLot(g, now); }

  // Amount the manager would bid by pressing +inc.
  function nextAmount(g, inc) { return g.current.bid === null ? g.minBid : g.current.bid + inc; }

  function canBid(g, mi, inc) {
    if (g.phase !== 'bidding') return false;
    var m = g.managers[mi], c = g.current;
    if (!needs(m, lot(g).pos) || c.leader === mi || c.passed[mi]) return false;
    return nextAmount(g, inc) <= maxBid(g, m);
  }

  function bid(g, mi, inc, now) {
    if (!canBid(g, mi, inc)) return false;
    var c = g.current;
    c.bid = nextAmount(g, inc);
    c.leader = mi;
    if (c.endsAt - now < RESET_MS) c.endsAt = now + RESET_MS;
    checkAllPassed(g, now);
    return true;
  }

  function pass(g, mi, now) {
    if (g.phase !== 'bidding' || g.current.leader === mi) return false;
    g.current.passed[mi] = true;
    checkAllPassed(g, now);
    return true;
  }

  // Ends the lot early once nobody else can or wants to bid.
  function checkAllPassed(g, now) {
    var c = g.current;
    var still = needers(g).filter(function (i) {
      return i !== c.leader && !c.passed[i] && nextAmount(g, 1) <= maxBid(g, g.managers[i]);
    });
    if (still.length === 0) resolve(g, now);
  }

  function resolve(g, now) {
    var c = g.current;
    if (c.leader !== null) {
      assign(g, c.leader, c.bid, 'sold');
    } else {
      // Unsold: richest manager still needing the slot gets him at base value; ties broken at random.
      var who = needers(g), top = -1;
      who.forEach(function (i) { if (g.managers[i].money > top) top = g.managers[i].money; });
      var richest = who.filter(function (i) { return g.managers[i].money === top; });
      assign(g, richest[Math.floor(g.rng() * richest.length)], g.minBid, 'unsold');
    }
    nextLot(g, now);
  }

  function tick(g, now) {
    if (g.phase === 'bidding' && now >= g.current.endsAt) { resolve(g, now); return true; }
    return false;
  }

  // ---------- Scoring (no-AI fallback judge + EA FC chemistry) ----------
  function pts(count, t1, t2, t3) { return count >= t3 ? 3 : count >= t2 ? 2 : count >= t1 ? 1 : 0; }

  function chemistry(m) {
    var players = [];
    SLOT_TYPES.forEach(function (s) { if (s.pos !== 'MGR') m.squad[s.pos].forEach(function (e) { players.push(e.player); }); });
    var mgr = m.squad.MGR[0] && m.squad.MGR[0].player;
    var club = {}, nation = {}, league = {};
    players.forEach(function (p) { club[p.club] = (club[p.club] || 0) + 1; nation[p.nation] = (nation[p.nation] || 0) + 1; league[p.league] = (league[p.league] || 0) + 1; });
    var per = {};
    var total = 0;
    players.forEach(function (p) {
      var c = pts(club[p.club], 2, 4, 7) + pts(nation[p.nation], 2, 5, 8) + pts(league[p.league], 3, 5, 8);
      if (mgr && (mgr.nation === p.nation || mgr.league === p.league)) c += 1;
      c = Math.min(3, c);
      per[p.id] = c; total += c;
    });
    return { total: total, per: per };
  }

  function round1(x) { return Math.round(x * 10) / 10; }
  function clamp(x) { return Math.max(0, Math.min(10, x)); }

  function score(g) {
    var rows = g.managers.map(function (m, i) {
      var all = [];
      for (var k in m.squad) m.squad[k].forEach(function (e) { all.push(e); });
      var ratings = all.map(function (e) { return e.player.rating; });
      var avg = ratings.reduce(function (a, b) { return a + b; }, 0) / ratings.length;
      var min = Math.min.apply(null, ratings);
      var spent = all.reduce(function (a, e) { return a + e.price; }, 0);
      var quality = round1(clamp((avg - 60) / 3.5));
      var balance = round1(clamp(10 - (avg - min) * 0.4));
      var chem = chemistry(m);
      var total = round1(quality * 7 + balance * 2 + chem.total / 33 * 10);
      return { index: i, name: m.name, quality: quality, balance: balance, chem: chem.total, chemPer: chem.per, total: total, spent: spent, left: m.money, avg: round1(avg) };
    });
    rows.sort(function (a, b) { return b.total - a.total || b.quality - a.quality; });
    var best = null;
    rows.forEach(function (r) { var v = (r.quality * 7 + r.balance * 2) / Math.max(1, r.spent); if (!best || v > best.v) best = { v: v, index: r.index, name: r.name }; });
    return { rows: rows, smartBusiness: best };
  }

  var api = { SLOT_TYPES: SLOT_TYPES, TOTAL_SLOTS: TOTAL_SLOTS, createGame: createGame, start: start, bid: bid, pass: pass, tick: tick,
    canBid: canBid, nextAmount: nextAmount, maxBid: maxBid, needs: needs, filled: filled, lot: lot, chemistry: chemistry, score: score, slotType: slotType };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Engine = api;
})(this);
