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

  var LAST_TIER_BELOW = 86;   // players rated under this are only ever used for the last tier
  var DECENT_FROM = 80;       // last-tier players rated 80-85 are "decent"; under 80 are flops
  var WILDCARD_CHANCE = 0.35; // chance each last-tier pick is a decent player instead of a flop

  // For each slot: the good players (86+) are ranked and split into tiers 1 to n - 1 (tier 1 = best).
  // The last tier is a lucky dip: usually a flop, sometimes a decent player. `count` players per tier.
  function buildLots(db, n, rng) {
    var lots = [];
    SLOT_TYPES.forEach(function (st) {
      var all = db.filter(function (p) { return p.pos === st.pos; }).sort(function (a, b) { return b.rating - a.rating; });
      var good = all.filter(function (p) { return p.rating >= LAST_TIER_BELOW; });
      var low = all.filter(function (p) { return p.rating < LAST_TIER_BELOW; });
      if (low.length < st.count) throw new Error('Not enough last-tier ' + st.label + ' players');
      var bands = n - 1, band = Math.floor(good.length / bands);
      if (band < st.count) throw new Error('Not enough ' + st.label + ' players for ' + n + ' managers');
      var slotLots = [];
      for (var t = 0; t < bands; t++) {
        var picks = shuffle(good.slice(t * band, (t + 1) * band), rng).slice(0, st.count);
        picks.forEach(function (p) { slotLots.push({ player: p, pos: st.pos, tier: t + 1 }); });
      }
      var decent = shuffle(low.filter(function (p) { return p.rating >= DECENT_FROM; }), rng);
      var flops = shuffle(low.filter(function (p) { return p.rating < DECENT_FROM; }), rng);
      for (var k = 0; k < st.count; k++) {
        var pickDecent = decent.length && (rng() < WILDCARD_CHANCE || !flops.length);
        var p = pickDecent ? decent.shift() : flops.shift();
        slotLots.push({ player: p, pos: st.pos, tier: n });
      }
      // Auctioned from tier 1 (best) down; within a tier the order is random.
      slotLots.forEach(function (l) { lots.push(l); });
    });
    return lots;
  }

  function createGame(opts) {
    var rng = opts.rng || Math.random;
    var budget = opts.budget || 700;
    var g = {
      budget: budget,
      minBid: Math.max(1, Math.round(budget / 140)),
      timerMs: (opts.timerSec || 180) * 1000,
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
    // Opening price by tier: tier 1 opens at 5% of the budget, the lowest tier at the minimum bid, evenly spaced between.
    var n = opts.names.length, top = Math.max(g.minBid, Math.round(budget * 0.05));
    g.lots.forEach(function (l) { l.open = n === 1 ? top : Math.round(g.minBid + (top - g.minBid) * (n - l.tier) / (n - 1)); });
    // Easter egg: an unbuyable legend opens the goalkeeper round. Priced at 10x the budget, so nobody can bid;
    // once everyone passes (or time runs out) he goes unsold to nobody and the game carries on unchanged.
    if (opts.easter) {
      g.lots.unshift({ pos: 'GK', tier: 1, easter: true, open: budget * 10,
        player: { id: -1, name: 'Nandagopan Biju', pos: 'GK', club: 'Goonpan FC', league: 'The Shadow League', nation: 'IND', prime: 'Forever', rating: 99, wiki: null, photo: 'nandagopan.jpg', mv: null } });
    }
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
      if (who.length === 1 && !lot(g).easter) { assign(g, who[0], basePrice(g, who[0]), 'last'); continue; }
      g.phase = 'bidding';
      g.current = { bid: null, leader: null, endsAt: now + g.timerMs, passed: {} };
      return;
    }
  }

  function start(g, now) { nextLot(g, now); }

  // Amount the manager would bid by pressing +inc.
  function nextAmount(g, inc) { return g.current.bid === null ? lot(g).open : g.current.bid + inc; }
  // Base value for an automatic assignment: the tier's opening price, capped so the manager can still finish his squad.
  function basePrice(g, mi) { return Math.max(g.minBid, Math.min(lot(g).open, maxBid(g, g.managers[mi]))); }

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
      if (lot(g).easter) return !c.passed[i]; // nobody can afford him, but everyone gets to pass on him
      return i !== c.leader && !c.passed[i] && nextAmount(g, 1) <= maxBid(g, g.managers[i]);
    });
    if (still.length === 0) resolve(g, now);
  }

  function resolve(g, now) {
    var c = g.current;
    if (lot(g).easter) {
      g.log.unshift({ lot: g.lotIndex, player: lot(g).player.name, pos: 'GK', manager: '', price: 0, how: 'easter' });
    } else if (c.leader !== null) {
      assign(g, c.leader, c.bid, 'sold');
    } else {
      // Unsold: richest manager still needing the slot gets him at base value; ties broken at random.
      var who = needers(g), top = -1;
      who.forEach(function (i) { if (g.managers[i].money > top) top = g.managers[i].money; });
      var richest = who.filter(function (i) { return g.managers[i].money === top; });
      var winner = richest[Math.floor(g.rng() * richest.length)];
      assign(g, winner, basePrice(g, winner), 'unsold');
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
      var sd = Math.sqrt(ratings.reduce(function (a, r) { return a + (r - avg) * (r - avg); }, 0) / ratings.length);
      var spent = all.reduce(function (a, e) { return a + e.price; }, 0);
      var quality = round1(clamp((avg - 60) / 3.5));
      // Balance: how evenly strong the 12 are. One weak link costs a little; a team of stars and flops costs a lot.
      var balance = round1(clamp(10 - sd * 0.55));
      var chem = chemistry(m);
      var total = round1(quality * 7 + balance * 2 + chem.total / 33 * 10);
      return { index: i, name: m.name, quality: quality, balance: balance, chem: chem.total, chemPer: chem.per, total: total, spent: spent, left: m.money, avg: round1(avg) };
    });
    rows.sort(function (a, b) { return b.total - a.total || b.quality - a.quality; });
    var best = null;
    rows.forEach(function (r) { var v = (r.quality * 7 + r.balance * 2) / Math.max(1, r.spent); if (!best || v > best.v) best = { v: v, index: r.index, name: r.name }; });
    return { rows: rows, smartBusiness: best };
  }

  // ---------- League: every team plays every other team home and away ----------
  // teams: [{ index, name, strength (0-100) }]. Goals per match are drawn from a Poisson distribution
  // whose average depends on the strength gap, with a small home advantage. Same seed = same season.
  function seeded(seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function poisson(lambda, rng) { var L = Math.exp(-lambda), k = 0, p = 1; do { k++; p *= rng(); } while (p > L); return k - 1; }
  function league(teams, seed) {
    var rng = seeded(seed), legs = teams.length === 2 ? 4 : 2;
    var rows = {};
    teams.forEach(function (t) { rows[t.index] = { index: t.index, name: t.name, strength: t.strength, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
    var results = [];
    for (var leg = 0; leg < legs; leg++) {
      teams.forEach(function (h, i) {
        teams.forEach(function (aw, j) {
          if (i >= j) return;
          var home = leg % 2 === 0 ? h : aw, away = leg % 2 === 0 ? aw : h;
          var diff = (home.strength - away.strength) / 12;
          var hg = poisson(1.4 * Math.exp(diff + 0.12), rng), ag = poisson(1.4 * Math.exp(-diff - 0.12), rng);
          results.push({ round: leg + 1, home: home.index, away: away.index, hg: hg, ag: ag });
          var H = rows[home.index], A = rows[away.index];
          H.p++; A.p++; H.gf += hg; H.ga += ag; A.gf += ag; A.ga += hg;
          if (hg > ag) { H.w++; H.pts += 3; A.l++; } else if (hg < ag) { A.w++; A.pts += 3; H.l++; } else { H.d++; A.d++; H.pts++; A.pts++; }
        });
      });
    }
    var table = Object.keys(rows).map(function (k) { return rows[k]; });
    table.sort(function (x, y) { return y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || y.strength - x.strength; });
    return { table: table, results: results, legs: legs };
  }

  var api = { league: league, SLOT_TYPES: SLOT_TYPES, TOTAL_SLOTS: TOTAL_SLOTS, createGame: createGame, start: start, bid: bid, pass: pass, tick: tick,
    canBid: canBid, nextAmount: nextAmount, maxBid: maxBid, needs: needs, filled: filled, lot: lot, chemistry: chemistry, score: score, slotType: slotType };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Engine = api;
})(this);
