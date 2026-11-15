// The simulation: users generate load, your architecture has capacity, the gap decides health.
(function () {
  G.SIZE = [{ n: 'S', cap: 40, cost: 5 }, { n: 'M', cap: 120, cost: 15 }, { n: 'L', cap: 350, cost: 40 }];
  G.DBSIZE = [{ n: 'S', cap: 60, cost: 6 }, { n: 'M', cap: 200, cost: 20 }, { n: 'L', cap: 600, cost: 60 }];
  G.RANKS = [[0, 'Intern'], [250, 'Junior Engineer'], [700, 'Engineer'], [1300, 'Senior Engineer'], [2000, 'Staff Engineer'], [2800, 'Principal Architect'], [3600, 'Distinguished Duck-Whisperer']];

  G.newState = (scenario, co) => ({
    v: 2, scenario, co, day: 1, cash: 2000, users: 40, rep: 80, health: 100, latency: 80, err: 0,
    xp: 0, beat: 0, lastBeatDay: -2, chapter: 0, conv: 1,
    spike: { mult: 1, days: 0 }, boost: { mult: 1, days: 0 }, incident: null,
    arch: { size: 0, count: 1, lb: false, dbSize: 0, index: false, cache: false, replicas: 0, shards: 1, queue: false, cdn: false,
      monitoring: false, waf: false, ratelimit: false, autoscale: false, multiRegion: false, cicd: false, search: false, micro: false, breaker: false },
    flags: {}, concepts: [], history: [], stats: { great: 0, ok: 0, bad: 0, dodged: 0, hints: 0, peak: 40, downDays: 0 },
    bailed: false, over: null, signups: 0, orders: 0, revenue: 0, cost: 0
  });

  // Where is the load going, and how full is each tier?
  G.load = (s, multOverride) => {
    const a = s.arch, f = s.flags;
    const mult = multOverride || (s.spike.days > 0 ? s.spike.mult : 1);
    let rps = s.users / 100 * mult;
    if (f.pollTax) rps *= 1.15; else if (f.ws && !f.slowPoll) rps *= 0.92;
    const stat = rps * 0.35, dyn = rps - stat;
    const appLoad = dyn + (a.cdn ? 0 : stat * 0.5);
    let appCap = G.SIZE[a.size].cap * (a.lb ? a.count : 1) * (a.micro ? 1.2 : 1);
    if (a.autoscale) appCap = Math.max(appCap, appLoad * 1.35);
    const reads = dyn * 0.9 * (a.search ? 0.85 : 1) * (f.bloom ? 0.93 : 1), writes = dyn * 0.1;
    const cacheHit = a.cache ? (f.weakCache ? 0.5 : 0.8) : 0;
    const dbReads = reads * (1 - cacheHit);
    const base = G.DBSIZE[a.dbSize].cap * (f.sheet && a.dbSize === 0 ? 0.5 : 1);
    const shardEff = a.shards * (f.hotShard && a.shards > 1 ? 0.7 : 1);
    const readCap = base * (a.index ? 2 : 1) * (1 + a.replicas) * shardEff;
    const writeCap = base * 0.4 * (a.queue ? 3 : 1) * shardEff;
    const appUtil = appLoad / appCap, readUtil = dbReads / readCap, writeUtil = writes / writeCap;
    const dbUtil = Math.max(readUtil, writeUtil);
    const util = Math.max(appUtil, dbUtil);
    return { rps, appLoad, appCap, appUtil, readUtil, writeUtil, dbUtil, util, cacheHit, dbReads, writes,
      bottleneck: appUtil >= dbUtil ? 'app' : (readUtil >= writeUtil ? 'dbRead' : 'dbWrite') };
  };

  G.costs = (s, l) => {
    const a = s.arch;
    let app = (a.lb ? a.count : 1) * G.SIZE[a.size].cost;
    if (a.autoscale) app = Math.max(G.SIZE[a.size].cost * 2, l.appLoad * 0.05);
    let c = app + G.DBSIZE[a.dbSize].cost * (1 + a.replicas) * a.shards;
    if (a.lb) c += 6; if (a.cache) c += 12 + l.rps * 0.004; if (a.cdn) c += 8 + l.rps * 0.006;
    if (a.monitoring) c += 4; if (a.ratelimit) c += 2; if (a.cicd) c += 5; if (a.queue) c += 15 + l.rps * 0.003;
    if (a.waf) c += 20; if (a.search) c += 25; if (a.micro) c += 40;
    if (a.multiRegion) c *= s.flags.passive ? 1.4 : 1.8;
    // Everything that isn't servers: salaries, support, Maya's blimp. Grows with the company.
    return c + Math.max(0, s.users - 1500) * 0.03;
  };

  G.tick = (s, dt) => {
    const l = G.load(s);
    let lat = 60 + (s.arch.cdn ? 0 : 50) + (s.arch.micro ? 10 : 0) + (s.flags.twopc ? 40 : 0) - (s.arch.multiRegion && !s.flags.passive ? 15 : 0);
    lat += l.util <= 1 ? 140 * Math.pow(l.util, 4) : 400 + (l.util - 1) * 3500;
    let err = l.util > 1 ? 1 - 1 / l.util : 0;
    if (s.incident) { err = Math.max(err, s.incident.err || 0); lat += 2000; }
    lat = Math.min(9900, lat);
    const target = G.clamp(100 - err * 160 - G.clamp((lat - 250) / 15, 0, 35) - (s.incident ? s.incident.pen : 0), 0, 100);
    s.health += (target - s.health) * Math.min(1, 1.6 * dt);
    s.latency += (lat - s.latency) * Math.min(1, 2 * dt);
    s.err = err;
    s.rep = G.clamp(s.rep + (s.health - s.rep) * 0.11 * dt, 0, 100);

    const boost = s.boost.days > 0 ? s.boost.mult : 1;
    const rate = 0.062 * Math.pow(s.rep / 100, 1.6) * boost;
    const churn = s.health < 55 ? (55 - s.health) / 55 * 0.06 : 0.004;
    s.signups = s.users * rate + 5 * s.rep / 100;
    s.users = Math.max(20, s.users + (s.signups - s.users * churn) * dt);
    s.orders = s.users * 0.03 * s.conv * (1 - err);
    s.revenue = s.orders * 1.4;
    s.cost = G.costs(s, l);
    s.cash += (s.revenue - s.cost) * dt;

    s.day += dt;
    if (s.spike.days > 0) s.spike.days -= dt;
    if (s.boost.days > 0) s.boost.days -= dt;
    if (s.health < 50) s.stats.downDays += dt;
    s.stats.peak = Math.max(s.stats.peak, s.users);

    if (s.cash < -4000) {
      if (!s.bailed) { s.bailed = true; s.cash = 6000; s.rep = Math.max(20, s.rep - 10); s.justBailed = true; }
      else s.over = 'bankrupt';
    }
    if (s.rep < 6 && s.day > 20) s.over = 'reputation';
    return l;
  };

  G.rank = (xp) => {
    let i = 0;
    G.RANKS.forEach((r, k) => { if (xp >= r[0]) i = k; });
    const next = G.RANKS[i + 1];
    return { name: G.RANKS[i][1], pct: next ? (xp - G.RANKS[i][0]) / (next[0] - G.RANKS[i][0]) : 1 };
  };

  // ---------- The Build panel ----------
  const A = (s) => s.arch;
  G.SHOP = [
    { id: 'monitoring', ch: 0, icon: '📡', name: 'Monitoring', desc: 'See load on every component. Get paged before customers notice.', cost: () => 150, upkeep: '$4/day',
      level: (s) => A(s).monitoring ? '✓' : '', can: (s) => !A(s).monitoring, buy: (s) => { A(s).monitoring = true; }, learn: ['observability'] },
    { id: 'size', ch: 0, icon: '🏋️', name: 'Bigger app servers', desc: 'Upgrade every app server to the next size. Simple. Has a ceiling.', cost: (s) => [300, 900][A(s).size] * (A(s).lb ? A(s).count : 1), upkeep: 'more per server',
      level: (s) => G.SIZE[A(s).size].n, can: (s) => A(s).size < 2 || 'Largest size reached', buy: (s) => { A(s).size++; }, learn: ['vertical'] },
    { id: 'lb', ch: 0, icon: '🚦', name: 'Load balancer', desc: 'Spreads traffic across servers and routes around dead ones. Comes with a 2nd server.', cost: () => 350, upkeep: '$6/day',
      level: (s) => A(s).lb ? '✓' : '', can: (s) => !A(s).lb, buy: (s) => { A(s).lb = true; A(s).count = Math.max(2, A(s).count); }, learn: ['lb', 'horizontal'] },
    { id: 'server', ch: 0, icon: '🖥️', name: 'Add app server', desc: 'One more machine behind the load balancer.', cost: (s) => 150 + A(s).size * 150, upkeep: 'per server',
      level: (s) => '×' + (A(s).lb ? A(s).count : 1), can: (s) => !A(s).lb ? 'Needs a load balancer' : (A(s).count < 60 || 'Fleet limit'), buy: (s) => { A(s).count += A(s).count >= 8 ? 4 : 1; }, learn: ['horizontal'] },
    { id: 'index', ch: 0, icon: '📇', name: 'Database indexes', desc: 'Sorted lookups so queries stop reading every row. Doubles read capacity.', cost: () => 100, upkeep: 'free',
      level: (s) => A(s).index ? '✓' : '', can: (s) => !A(s).index, buy: (s) => { A(s).index = true; }, learn: ['indexing'] },
    { id: 'dbsize', ch: 0, icon: '🗄️', name: 'Bigger database', desc: 'Next machine size for every database node.', cost: (s) => [400, 1500][A(s).dbSize] * A(s).shards, upkeep: 'more per node',
      level: (s) => G.DBSIZE[A(s).dbSize].n, can: (s) => A(s).dbSize < 2 || 'Largest size reached', buy: (s) => { A(s).dbSize++; }, learn: ['vertical'] },
    { id: 'cache', ch: 1, icon: '⚡', name: 'Cache', desc: 'In-memory store for popular answers. Absorbs most read traffic.', cost: () => 400, upkeep: '$12+/day',
      level: (s) => A(s).cache ? '✓' : '', can: (s) => !A(s).cache, buy: (s) => { A(s).cache = true; }, learn: ['caching'] },
    { id: 'replica', ch: 1, icon: '🪞', name: 'Read replica', desc: 'A copy of the database that answers reads. Does nothing for writes.', cost: (s) => 300 * (A(s).dbSize + 1) * A(s).shards, upkeep: '1 more DB node',
      level: (s) => '×' + A(s).replicas, can: (s) => A(s).replicas < 5 || 'Max 5 replicas', buy: (s) => { A(s).replicas++; }, learn: ['replication'] },
    { id: 'cdn', ch: 1, icon: '🌍', name: 'CDN', desc: 'Serve images and files from edge servers near users. Offloads a third of traffic.', cost: () => 250, upkeep: '$8+/day',
      level: (s) => A(s).cdn ? '✓' : '', can: (s) => !A(s).cdn, buy: (s) => { A(s).cdn = true; }, learn: ['cdn'] },
    { id: 'ratelimit', ch: 1, icon: '🚧', name: 'Rate limiter', desc: 'Cap requests per client. Humans never notice.', cost: () => 150, upkeep: '$2/day',
      level: (s) => A(s).ratelimit ? '✓' : '', can: (s) => !A(s).ratelimit, buy: (s) => { A(s).ratelimit = true; }, learn: ['ratelimit'] },
    { id: 'cicd', ch: 1, icon: '🏭', name: 'CI/CD pipeline', desc: 'Automated tests and deploys with one-click rollback.', cost: () => 300, upkeep: '$5/day',
      level: (s) => A(s).cicd ? '✓' : '', can: (s) => !A(s).cicd, buy: (s) => { A(s).cicd = true; }, learn: ['cicd', 'rollback'] },
    { id: 'queue', ch: 2, icon: '📬', name: 'Message queue', desc: 'Accept work instantly, process it in the background. Triples write headroom.', cost: () => 500, upkeep: '$15+/day',
      level: (s) => A(s).queue ? '✓' : '', can: (s) => !A(s).queue, buy: (s) => { A(s).queue = true; }, learn: ['queue'] },
    { id: 'shard', ch: 2, icon: '🍕', name: 'Double the shards', desc: 'Split data across twice as many databases. The only cure for write overload.', cost: (s) => Math.round(1000 * A(s).shards * (s.flags.chash ? 0.5 : 1)), upkeep: '2× DB cost',
      level: (s) => '×' + A(s).shards, can: (s) => A(s).shards < 64 || 'Max shards', buy: (s) => { A(s).shards *= 2; }, learn: ['sharding'] },
    { id: 'autoscale', ch: 3, icon: '🎈', name: 'Autoscaling', desc: 'App servers appear and vanish with demand.', cost: () => 1500, upkeep: 'pay per use',
      level: (s) => A(s).autoscale ? '✓' : '', can: (s) => A(s).autoscale ? false : (A(s).lb || 'Needs a load balancer'), buy: (s) => { A(s).autoscale = true; }, learn: ['autoscale'] },
    { id: 'breaker', ch: 3, icon: '🧯', name: 'Circuit breakers', desc: 'Timeouts and fallbacks so one slow dependency cannot freeze everything.', cost: () => 500, upkeep: 'free',
      level: (s) => A(s).breaker ? '✓' : '', can: (s) => !A(s).breaker, buy: (s) => { A(s).breaker = true; }, learn: ['breaker'] },
    { id: 'waf', ch: 3, icon: '🛡️', name: 'DDoS shield + WAF', desc: 'Absorb floods and filter malicious requests at the edge.', cost: () => 800, upkeep: '$20/day',
      level: (s) => A(s).waf ? '✓' : '', can: (s) => !A(s).waf, buy: (s) => { A(s).waf = true; }, learn: ['waf'] },
    { id: 'multiRegion', ch: 3, icon: '🌐', name: 'Second region', desc: 'Run live in two regions. Survive losing one entirely.', cost: () => 20000, upkeep: '+80% of bill',
      level: (s) => A(s).multiRegion ? '✓' : '', can: (s) => !A(s).multiRegion, buy: (s) => { A(s).multiRegion = true; }, learn: ['multiregion', 'failover'] }
  ];

  // ---------- Save / load ----------
  const KEY = 'uptime-save-v2';
  G.save = () => { try { localStorage.setItem(KEY, JSON.stringify(G.state)); } catch (e) { /* storage unavailable */ } };
  G.loadSave = () => { try { const s = JSON.parse(localStorage.getItem(KEY)); return s && s.v === 2 && !s.over ? s : null; } catch (e) { return null; } };
  G.clearSave = () => { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } };
})();
