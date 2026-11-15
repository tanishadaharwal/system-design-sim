// Isometric world: your architecture as a little city, with live traffic flowing through it.
(function () {
  const R = G.render = { nodes: [], packets: [], smoke: [], t: 0, hover: null, shake: 0 };
  let cv, ctx, W = 0, H = 0, tw = 64, th = 32, cx = 0, cy = 0;
  const stars = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random() * 0.75, r: Math.random() * 1.3 + 0.3, p: Math.random() * 6 }));

  const C = { ink: '#0b1020', floor: '#17203b', floor2: '#1b2646', edgeL: '#0e1530', edgeR: '#0a1026', line: '#2a3763',
    yellow: '#ffd93b', cyan: '#5ce1e6', red: '#ff5470', green: '#3ddc97', violet: '#9b8cff', white: '#e8ecf8', mute: '#7f8bb3' };

  const P = (gx, gy, z = 0) => [cx + (gx - gy) * tw / 2, cy + (gx + gy) * th / 2 - z * th];
  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(G.clamp(v * f, 0, 255)));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  };
  const poly = (pts, fill, stroke) => {
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  };
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

  // An isometric box with lit windows. Returns the screen point above its roof.
  function box(gx, gy, w, d, h, col, opts = {}) {
    const x0 = gx - w / 2, x1 = gx + w / 2, y0 = gy - d / 2, y1 = gy + d / 2;
    const L = [P(x0, y1), P(x1, y1), P(x1, y1, h), P(x0, y1, h)];
    const Rf = [P(x1, y1), P(x1, y0), P(x1, y0, h), P(x1, y1, h)];
    const T = [P(x0, y0, h), P(x1, y0, h), P(x1, y1, h), P(x0, y1, h)];
    poly(L, shade(col, 0.62)); poly(Rf, shade(col, 0.42)); poly(T, col);
    if (opts.windows) {
      const rows = Math.max(1, Math.round(h * 2.4)), cols = Math.max(2, Math.round(w * 4));
      [[L, 0], [Rf, 1]].forEach(([f, side]) => {
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const seed = hash(gx * 13 + gy * 7 + r * 3.1 + c * 5.7 + side * 9);
          const lit = seed > 0.35 && Math.sin(R.t * (0.4 + seed) + seed * 40) > -0.6;
          const u0 = (c + 0.25) / cols, u1 = (c + 0.75) / cols, v0 = (r + 0.3) / rows, v1 = (r + 0.7) / rows;
          const b0 = lerp(f[0], f[1], u0), b1 = lerp(f[0], f[1], u1), t0 = lerp(f[3], f[2], u0), t1 = lerp(f[3], f[2], u1);
          poly([lerp(b0, t0, v0), lerp(b1, t1, v0), lerp(b1, t1, v1), lerp(b0, t0, v1)], lit ? (opts.glow || C.yellow) : 'rgba(0,0,0,.28)');
        }
      });
    }
    return P(gx, gy, h);
  }

  function cylinder(gx, gy, r, h, col) {
    const [bx, by] = P(gx, gy), rx = r * tw / 2, ry = rx / 2, top = by - h * th;
    const g = ctx.createLinearGradient(bx - rx, 0, bx + rx, 0);
    g.addColorStop(0, shade(col, 0.7)); g.addColorStop(1, shade(col, 0.38));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI); ctx.lineTo(bx - rx, top); ctx.lineTo(bx + rx, top); ctx.closePath(); ctx.fill();
    ctx.fillRect(bx - rx, top, rx * 2, by - top);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.14)';
    for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.ellipse(bx, by - (h * th * i) / 3, rx, ry, 0, 0, Math.PI); ctx.stroke(); }
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(bx, top, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    return [bx, top];
  }

  const utilColor = (u) => (u > 1 ? C.red : u > 0.8 ? C.yellow : C.green);

  function label(pt, text, util, sub) {
    const [x, y] = pt, s = G.state;
    ctx.font = `700 ${Math.max(10, tw * 0.17)}px ${G.fontDisplay || "sans-serif"}`; ctx.textAlign = 'center';
    const wdt = Math.max(ctx.measureText(text).width + 14, 46), hgt = tw * 0.27;
    ctx.fillStyle = 'rgba(11,16,32,.82)'; ctx.beginPath(); ctx.roundRect(x - wdt / 2, y - hgt - 14, wdt, hgt, 5); ctx.fill();
    ctx.fillStyle = C.white; ctx.fillText(text, x, y - 14 - hgt * 0.3);
    if (util != null) {
      const bw = wdt - 8, by = y - 11;
      ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(x - bw / 2, by, bw, 4);
      if (s.arch.monitoring) { ctx.fillStyle = utilColor(util); ctx.fillRect(x - bw / 2, by, bw * G.clamp(util, 0.03, 1), 4); }
    }
    if (sub) { ctx.font = `500 ${Math.max(9, tw * 0.14)}px "JetBrains Mono", monospace`; ctx.fillStyle = C.mute; ctx.fillText(sub, x, y - hgt - 21); }
  }

  // Build the list of things on the island from the current architecture.
  function layout(s, l) {
    const a = s.arch, n = [];
    const add = (id, gx, gy, o) => n.push(Object.assign({ id, gx, gy }, o));
    add('users', 1, 4.2, { name: 'Users', concept: null, blurb: 'Everyone using ' + s.co + ' right now.' });
    if (a.cdn) add('cdn', 3.6, 1.2, { name: 'CDN', concept: 'cdn', blurb: 'Serves images and files from the edge.' });
    if (a.waf || a.ratelimit) add('waf', 3.6, 4.2, { name: a.waf ? 'Shield' : 'Rate limiter', concept: a.waf ? 'waf' : 'ratelimit', blurb: 'Filters floods and abusive clients.' });
    if (a.lb) add('lb', 5.6, 4.2, { name: 'Load balancer', concept: 'lb', blurb: 'Spreads requests across servers.' });
    const shown = a.lb ? Math.min(a.count, 8) : 1;
    for (let i = 0; i < shown; i++) add('app' + i, 8 + (i % 2) * 1.35, (shown === 1 ? 4.2 : 2.5 + Math.floor(i / 2) * 1.15), { kind: 'app', name: 'App servers', concept: 'horizontal', util: l.appUtil, blurb: 'Run your application code.' });
    if (a.cache) add('cache', 11.4, 0.6, { name: 'Cache', concept: 'caching', blurb: 'Popular answers kept in memory.' });
    if (a.search) add('search', 9.2, -0.4, { name: s.scenario === 'ride' ? 'Geo index' : 'Search', concept: s.scenario === 'ride' ? 'geo' : 'search', blurb: 'A purpose-built index.' });
    if (a.queue) add('queue', 11.4, 6.8, { name: 'Queue', concept: 'queue', blurb: 'Work waits here and is processed steadily.' });
    add('db', 14, 5, { name: 'Database', concept: a.shards > 1 ? 'sharding' : 'sqlnosql', util: l.dbUtil, blurb: 'The source of truth.' });
    for (let i = 0; i < Math.min(a.replicas, 3); i++) add('rep' + i, 15.6, 3.4 - i * 1.25, { kind: 'rep', name: 'Replica', concept: 'replication', blurb: 'A read-only copy of the database.' });
    if (a.monitoring) add('mon', 5.6, 7.6, { name: 'Monitoring', concept: 'observability', blurb: 'Watches everything.' });
    if (a.cicd) add('cicd', 8.4, 8.2, { name: 'CI/CD', concept: 'cicd', blurb: 'Tests and ships code automatically.' });
    return n;
  }

  function drawNode(nd, s, l) {
    const a = s.arch, jig = (nd.util > 1 && a.monitoring) ? Math.sin(R.t * 40 + nd.gx) * 0.02 : 0, gx = nd.gx + jig, gy = nd.gy;
    let top;
    if (nd.id === 'users') {
      const n = Math.min(9, 3 + Math.floor(Math.log10(s.users + 1) * 1.2));
      for (let i = 0; i < n; i++) { const ox = (i % 3) * 0.62 - 0.6, oy = Math.floor(i / 3) * 0.62 - 0.6; box(gx + ox, gy + oy, 0.4, 0.4, 0.35 + hash(i) * 0.5, '#33406e', { windows: true, glow: C.cyan }); }
      top = P(gx, gy, 1.3); label(top, 'Users', null, G.fmt(s.users));
    } else if (nd.id === 'cdn') {
      top = box(gx, gy, 0.9, 0.9, 0.5, '#2b6f7a'); const [x, y] = top;
      ctx.strokeStyle = C.cyan; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - tw * 0.2, tw * 0.18, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, y - tw * 0.2, tw * 0.08, tw * 0.18, 0, 0, 7); ctx.moveTo(x - tw * 0.18, y - tw * 0.2); ctx.lineTo(x + tw * 0.18, y - tw * 0.2); ctx.stroke();
      label([x, y - tw * 0.36], 'CDN');
    } else if (nd.id === 'waf') {
      top = box(gx, gy, 0.35, 1.8, 0.9, a.waf ? '#8a2b45' : '#6b5a1c', { windows: false });
      label(top, nd.name);
    } else if (nd.id === 'lb') {
      top = box(gx, gy, 0.8, 1.3, 0.45, '#8f7a16'); const [x, y] = top;
      ctx.fillStyle = C.yellow; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(x + i * tw * 0.12, y + i * tw * 0.06, 2.5 + Math.sin(R.t * 6 + i) * 1, 0, 7); ctx.fill(); }
      label(top, 'Load balancer');
    } else if (nd.kind === 'app') {
      const hgt = 1.0 + a.size * 0.55;
      const col = nd.util > 1 && a.monitoring ? '#6e2a3c' : '#3a4a86';
      top = box(gx, gy, 0.8, 0.8, hgt, col, { windows: true, glow: nd.util > 1 && a.monitoring ? C.red : C.yellow });
      if (nd.id === 'app0') {
        const cnt = a.lb ? a.count : 1;
        const lp = P(a.lb && cnt > 1 ? 8.7 : 8, a.lb && cnt > 1 ? 2.3 : 4.2, hgt + 0.2);
        nd.labelAt = { p: lp, text: `App ×${cnt} ${G.SIZE[a.size].n}${a.autoscale ? ' ⟳' : ''}`, util: nd.util };
      }
    } else if (nd.id === 'cache') {
      top = box(gx, gy, 0.9, 0.9, 0.7, '#1f6f86', { windows: true, glow: C.cyan }); label(top, 'Cache', null, Math.round(l.cacheHit * 100) + '% hits');
    } else if (nd.id === 'search') {
      top = box(gx, gy, 0.8, 0.8, 1.1, '#5a4aa8', { windows: true, glow: C.violet }); label(top, nd.name);
    } else if (nd.id === 'queue') {
      top = box(gx, gy, 2.0, 0.6, 0.3, '#3d2f73');
      for (let i = 0; i < 4; i++) { const u = ((R.t * 0.5 + i / 4) % 1) * 1.8 - 0.9; box(gx + u, gy, 0.22, 0.3, 0.22 + 0.3, C.violet); }
      label(P(gx, gy, 0.8), 'Queue');
    } else if (nd.id === 'db') {
      const k = Math.min(a.shards, 4), hgt = 0.9 + a.dbSize * 0.35;
      const col = nd.util > 1 && a.monitoring ? '#b8405a' : '#2f9c79';
      const pos = k === 1 ? [[0, 0]] : k === 2 ? [[-0.5, -0.4], [0.5, 0.4]] : [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]];
      pos.forEach((p) => { top = cylinder(gx + p[0], gy + p[1], k === 1 ? 1.1 : 0.8, hgt, col); });
      label(P(gx, gy, hgt + 0.5), a.shards > 1 ? `DB ×${a.shards} shards` : `Database ${G.DBSIZE[a.dbSize].n}`, nd.util, a.monitoring ? `R ${Math.round(l.readUtil * 100)}% · W ${Math.round(l.writeUtil * 100)}%` : null);
    } else if (nd.kind === 'rep') {
      top = cylinder(gx, gy, 0.7, 0.7, '#267a66');
      if (nd.id === 'rep0') label([top[0], top[1] - 4], `Replicas ×${a.replicas}`);
    } else if (nd.id === 'mon') {
      top = box(gx, gy, 0.5, 0.5, 1.6, '#3b4470'); const [x, y] = top; const ang = R.t * 2;
      ctx.strokeStyle = C.green; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - 4, tw * 0.28, tw * 0.14, 0, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + Math.cos(ang) * tw * 0.28, y - 4 + Math.sin(ang) * tw * 0.14); ctx.stroke();
      label([x, y - tw * 0.2], 'Monitoring');
    } else if (nd.id === 'cicd') {
      top = box(gx, gy, 1.4, 0.9, 0.6, '#4b3b8a', { windows: true, glow: C.violet }); box(gx + 0.45, gy - 0.2, 0.22, 0.22, 1.2, '#2d2358');
      const sp = P(gx + 0.45, gy - 0.2, 1.3 + ((R.t * 0.4) % 0.6)); ctx.fillStyle = 'rgba(200,200,255,.25)'; ctx.beginPath(); ctx.arc(sp[0], sp[1], 5, 0, 7); ctx.fill();
      label(top, 'CI/CD');
    }
    nd.sx = top[0]; nd.sy = top[1] + th * 0.6;
    if (nd.util > 1 && a.monitoring && Math.random() < 0.12) R.smoke.push({ x: top[0] + (Math.random() - 0.5) * 16, y: top[1], life: 1 });
  }

  // ---------- Traffic packets ----------
  function spawn(s, l, nodes) {
    const a = s.arch, by = (id) => nodes.find((n) => n.id === id), apps = nodes.filter((n) => n.kind === 'app');
    const path = [by('users')]; let col = C.white, bad = Math.random() < s.err, dieAt = null;
    if (Math.random() < 0.35 && a.cdn) { path.push(by('cdn')); col = C.white; bad = false; }
    else {
      if (by('waf')) path.push(by('waf'));
      if (by('lb')) path.push(by('lb'));
      const app = apps[Math.floor(Math.random() * apps.length)]; path.push(app);
      if (bad && l.bottleneck === 'app') dieAt = path.length - 1;
      else if (Math.random() < 0.12) { col = C.yellow; if (by('queue')) path.push(by('queue')); path.push(by('db')); if (bad) dieAt = path.length - 1; }
      else { col = C.cyan; if (a.cache && Math.random() < l.cacheHit) path.push(by('cache')); else { const reps = nodes.filter((n) => n.kind === 'rep'); path.push(reps.length && Math.random() < 0.6 ? reps[Math.floor(Math.random() * reps.length)] : by('db')); if (bad) dieAt = path.length - 1; } }
    }
    R.packets.push({ path: path.map((n) => [n.gx, n.gy]), seg: 0, t: 0, col, bad: bad && dieAt != null, dieAt, speed: 2.2 + Math.random() });
  }

  function drawPackets(dt) {
    R.packets = R.packets.filter((p) => {
      const A = p.path[p.seg], B = p.path[p.seg + 1];
      if (!B) return false;
      const dist = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
      p.t += (p.speed * dt) / dist;
      const g = lerp(A, B, Math.min(1, p.t)), pt = P(g[0], g[1], 0.12), col = p.bad && p.seg + 1 >= p.dieAt ? C.red : p.col;
      ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(pt[0], pt[1], 2.6, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      if (p.t >= 1) { p.seg++; p.t = 0; if (p.bad && p.seg >= p.dieAt) { R.smoke.push({ x: pt[0], y: pt[1], life: 0.6, red: true }); return false; } }
      return true;
    });
  }

  function island(x0, y0, x1, y1, depth) {
    const a = P(x0, y0), b = P(x1, y0), c = P(x1, y1), d = P(x0, y1);
    poly([d, c, [c[0], c[1] + depth], [d[0], d[1] + depth]], C.edgeL); poly([c, b, [b[0], b[1] + depth], [c[0], c[1] + depth]], C.edgeR);
    poly([a, b, c, d], C.floor);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
    for (let x = Math.ceil(x0); x < x1; x++) { ctx.beginPath(); ctx.moveTo(...P(x, y0)); ctx.lineTo(...P(x, y1)); ctx.stroke(); }
    for (let y = Math.ceil(y0); y < y1; y++) { ctx.beginPath(); ctx.moveTo(...P(x0, y)); ctx.lineTo(...P(x1, y)); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  function links(nodes, s) {
    const by = (id) => nodes.find((n) => n.id === id); const segs = [];
    const chain = ['users', 'waf', 'lb'].map(by).filter(Boolean);
    for (let i = 0; i < chain.length - 1; i++) segs.push([chain[i], chain[i + 1]]);
    const last = chain[chain.length - 1];
    nodes.filter((n) => n.kind === 'app').forEach((ap) => { segs.push([last, ap]); segs.push([ap, by('db')]); if (by('cache')) segs.push([ap, by('cache')]); if (by('queue')) segs.push([ap, by('queue')]); });
    if (by('cdn')) segs.push([by('users'), by('cdn')]);
    if (by('queue')) segs.push([by('queue'), by('db')]);
    nodes.filter((n) => n.kind === 'rep').forEach((r) => segs.push([by('db'), r]));
    ctx.strokeStyle = 'rgba(92,225,230,.16)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -R.t * 20;
    segs.forEach(([A, B]) => { ctx.beginPath(); ctx.moveTo(...P(A.gx, A.gy)); ctx.lineTo(...P(B.gx, B.gy)); ctx.stroke(); });
    ctx.setLineDash([]);
  }

  function sky(danger) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#070b18'); g.addColorStop(0.6, '#0e1530'); g.addColorStop(1, danger > 0.3 ? '#2a0f24' : '#141b3a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    stars.forEach((st) => { ctx.globalAlpha = 0.35 + 0.4 * Math.sin(R.t * 1.5 + st.p); ctx.fillStyle = '#cfd8ff'; ctx.beginPath(); ctx.arc(st.x * W, st.y * H, st.r, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    const glow = ctx.createRadialGradient(cx + tw * 4, cy + th * 12, 10, cx + tw * 4, cy + th * 12, tw * 9);
    glow.addColorStop(0, danger > 0.3 ? 'rgba(255,84,112,.16)' : 'rgba(92,225,230,.10)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  }

  R.resize = () => {
    cv = G.$('#map'); if (!cv) return; ctx = cv.getContext('2d');
    const r = cv.parentElement.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    snap = true;
  };

  // The camera frames whatever you've built: close-up in the garage, pulling back as the city grows.
  let snap = true;
  function camera(nodes, s, dt) {
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    const pts = nodes.map((n) => [n.gx, n.gy]); if (s.arch.multiRegion) pts.push([7.5, -6]);
    pts.forEach(([x, y]) => { u0 = Math.min(u0, x - y); u1 = Math.max(u1, x - y); v0 = Math.min(v0, x + y); v1 = Math.max(v1, x + y); });
    const tTw = G.clamp(Math.min(W / ((u1 - u0) / 2 + 3.2), H / ((v1 - v0) / 4 + 4.2)), 30, 118);
    const tCx = W / 2 - ((u0 + u1) / 2) * tTw / 2, tCy = H / 2 - ((v0 + v1) / 2) * tTw / 4 + tTw * 0.55;
    const k = snap ? 1 : Math.min(1, dt * 1.8); snap = false;
    tw += (tTw - tw) * k; th = tw / 2; cx += (tCx - cx) * k; cy += (tCy - cy) * k;
  }

  let lastT = 0, spawnAcc = 0;
  R.frame = (now) => {
    requestAnimationFrame(R.frame);
    const s = G.state; if (!s || !ctx || G.$('#game').hidden) return;
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0); lastT = now; R.t += dt;
    const l = G.load(s), danger = 1 - s.health / 100;
    const nodes = layout(s, l); R.nodes = nodes; camera(nodes, s, dt);
    ctx.save();
    if (s.incident || s.health < 35) ctx.translate(Math.sin(R.t * 50) * 1.5, 0);
    sky(danger);
    island(-3, -2, 18, 11, th * 0.9);
    if (s.arch.multiRegion) {
      island(5.4, -6.8, 9.8, -3.3, th * 0.6);
      box(6.4, -5.2, 0.7, 0.7, 1.1, '#3a4a86', { windows: true }); box(7.5, -5.2, 0.7, 0.7, 1.1, '#3a4a86', { windows: true }); const t2 = cylinder(8.7, -4.6, 0.8, 0.8, '#2f9c79');
      label([t2[0] - tw * 0.55, t2[1] - th * 1.3], s.flags.passive ? 'Region 2 · standby' : 'Region 2 · live');
      ctx.strokeStyle = 'rgba(155,140,255,.6)'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.lineDashOffset = -R.t * 16; ctx.beginPath(); ctx.moveTo(...P(8, -2)); ctx.lineTo(...P(7.8, -3.3)); ctx.stroke(); ctx.setLineDash([]);
    }
    links(nodes, s);
    if (!G.paused || s.incident) {
      spawnAcc += dt * G.clamp(3 + Math.log10(l.rps + 1) * 9, 3, 45);
      while (spawnAcc > 1 && R.packets.length < 160) { spawnAcc--; spawn(s, l, nodes); }
    }
    drawPackets(dt);
    nodes.slice().sort((a, b) => a.gx + a.gy - (b.gx + b.gy)).forEach((nd) => drawNode(nd, s, l));
    nodes.forEach((nd) => { if (nd.labelAt) label(nd.labelAt.p, nd.labelAt.text, nd.labelAt.util); });
    R.smoke = R.smoke.filter((m) => { m.life -= dt * 0.9; m.y -= dt * 22; ctx.fillStyle = m.red ? `rgba(255,84,112,${m.life * 0.7})` : `rgba(160,165,190,${m.life * 0.35})`; ctx.beginPath(); ctx.arc(m.x, m.y, (1.2 - m.life) * (m.red ? 7 : 12), 0, 7); ctx.fill(); return m.life > 0; });
    if (danger > 0.45) { const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8); v.addColorStop(0, 'rgba(255,84,112,0)'); v.addColorStop(1, `rgba(255,84,112,${(danger - 0.45) * 0.5 * (0.7 + 0.3 * Math.sin(R.t * 5))})`); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  };

  R.pick = (mx, my) => {
    let best = null, bd = tw * 0.9;
    R.nodes.forEach((n) => { const d = Math.hypot(mx - n.sx, my - n.sy); if (d < bd) { bd = d; best = n; } });
    return best;
  };

  // Title-screen backdrop
  R.title = () => {
    const c = G.$('#titleSky'); if (!c) return; const x = c.getContext('2d');
    const draw = (now) => {
      if (G.$('#title').hidden) return; requestAnimationFrame(draw);
      const w = c.width = c.clientWidth, h = c.height = c.clientHeight, t = now / 1000;
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#070b18'); g.addColorStop(1, '#1a2350'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      stars.forEach((st) => { x.globalAlpha = 0.3 + 0.5 * Math.sin(t * 1.4 + st.p); x.fillStyle = '#cfd8ff'; x.beginPath(); x.arc(st.x * w, st.y * h, st.r, 0, 7); x.fill(); });
      x.globalAlpha = 1;
      for (let i = 0; i < 46; i++) { const bw = 26 + hash(i) * 40, bh = 40 + hash(i + 9) * 190, bx = (i / 46) * w * 1.05 - 20; x.fillStyle = i % 2 ? '#0d1430' : '#111a3c'; x.fillRect(bx, h - bh, bw, bh);
        for (let r = 0; r < bh / 14; r++) for (let q = 0; q < bw / 10; q++) if (hash(i * 31 + r * 7 + q) > 0.55 && Math.sin(t * (0.3 + hash(r + q + i)) + i + r) > -0.5) { x.fillStyle = hash(i + r + q) > 0.85 ? '#5ce1e6' : '#ffd93b'; x.globalAlpha = 0.55; x.fillRect(bx + 4 + q * 10, h - bh + 6 + r * 14, 4, 6); x.globalAlpha = 1; } }
    };
    requestAnimationFrame(draw);
  };
})();
