// Interface: title screen, HUD, story dialogs, decisions, incidents, codex, finale.
(function () {
  const $ = G.$, tx = G.tx;
  const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  let speed = 1, busy = false, nudgeDay = 0, feedAcc = 0, shopSig = '', picked = 'shop', checkpoint = null, lastPassed = 0, lastTweet = '', override = null, popDay = 6, popEl = null, popTimer = null, popCount = 0;
  G.paused = true;

  // ───────── Title ─────────
  function initTitle() {
    const soon = [{ icon: '🎬', name: 'Video streaming', pitch: 'Transcoding, adaptive bitrate, a CDN bill with its own postcode.' }, { icon: '💬', name: 'Chat app', pitch: 'Billions of tiny messages, presence, fan-out, end-to-end encryption.' }];
    $('#paths').innerHTML = Object.entries(G.SCENARIOS).map(([k, sc]) => `
      <button class="path ${k === picked ? 'sel' : ''}" data-k="${k}">
        <div class="path-icon">${sc.icon}</div><h3>${sc.name}</h3><p>${sc.pitch}</p>
        <ul>${sc.covers.map((c) => `<li>${c}</li>`).join('')}</ul><div class="path-why">${sc.why}</div>
      </button>`).join('') + soon.map((sc) => `
      <div class="path locked"><div class="path-icon">${sc.icon}</div><h3>${sc.name}</h3><p>${sc.pitch}</p><div class="path-why">Coming soon</div></div>`).join('');
    $('#coName').value = G.SCENARIOS[picked].co;
    $('#paths').onclick = (e) => {
      const b = e.target.closest('.path[data-k]'); if (!b) return;
      const prev = G.SCENARIOS[picked].co; picked = b.dataset.k; G.sound.click();
      document.querySelectorAll('.path').forEach((p) => p.classList.toggle('sel', p === b));
      if ($('#coName').value === prev || !$('#coName').value) $('#coName').value = G.SCENARIOS[picked].co;
    };
    $('#startBtn').onclick = () => { G.clearSave(); start(G.newState(picked, ($('#coName').value || G.SCENARIOS[picked].co).trim())); };
    const sv = G.loadSave();
    if (sv) { const b = $('#continueBtn'); b.hidden = false; b.textContent = `Continue ${sv.co} — day ${Math.floor(sv.day)}`; b.onclick = () => start(sv); }
    G.render.title();
  }

  function start(state) {
    G.state = state; checkpoint = JSON.stringify(state);
    $('#title').hidden = true; $('#game').hidden = false;
    $('#coBadge').textContent = state.co[0].toUpperCase(); $('#coLabel').textContent = state.co;
    $('#ordersLabel').textContent = G.SCENARIOS[state.scenario].unit + ' / day';
    G.render.resize(); G.paused = false; shopSig = ''; updateHUD(); renderShop(); setChapter();
    G.sound.good(); G.music.start(); override = null;
  }

  // ───────── Main loop ─────────
  function loop() {
    const s = G.state; G.music.set(track());
    if (!s || s.over === 'done') return;
    if (!G.paused && speed > 0) {
      const dt = (0.1 / 3) * speed;
      const l = G.tick(s, dt);
      if (Math.floor(s.day) !== Math.floor(s.day - dt)) { s.history.push(Math.round(s.users)); if (s.history.length > 150) s.history.shift(); }
      feedAcc += dt; if (feedAcc > 0.8) { feedAcc = 0; tweet(); }
      if (!busy) {
        if (s.justBailed) { s.justBailed = false; bailout(); }
        else if (s.over) gameOver();
        else { nudge(l); checkBeat(); if (!busy) maybePop(); }
      }
    }
    updateHUD(); renderShop();
  }

  function updateHUD() {
    const s = G.state; if (!s) return;
    $('#dayLabel').textContent = 'Day ' + Math.floor(s.day);
    const h = Math.round(s.health), ring = $('#healthRing');
    $('#healthNum').textContent = h; ring.style.strokeDashoffset = 100.5 * (1 - h / 100);
    ring.style.stroke = h > 70 ? 'var(--green)' : h > 40 ? 'var(--yellow)' : 'var(--red)';
    $('#vHealth').classList.toggle('danger', h < 40);
    $('#vUsers').textContent = G.fmt(s.users); $('#vSignups').textContent = '+' + G.fmt(s.signups); $('#vOrders').textContent = G.fmt(s.orders);
    $('#vLatency').textContent = s.latency > 999 ? (s.latency / 1000).toFixed(1) + ' s' : Math.round(s.latency) + ' ms';
    $('#vLatency').className = 'v-num ' + (s.latency > 800 ? 'bad' : s.latency > 300 ? 'warn' : '');
    $('#vErr').textContent = (s.err * 100).toFixed(s.err > 0.1 ? 0 : 1) + '%'; $('#vErr').className = 'v-num ' + (s.err > 0.05 ? 'bad' : '');
    const st = Math.round(s.rep / 20); $('#vRep').innerHTML = '★'.repeat(st) + '<i>' + '★'.repeat(5 - st) + '</i>';
    $('#vCash').textContent = G.money(s.cash); $('#vCash').className = 'v-num ' + (s.cash < 0 ? 'bad' : '');
    const net = s.revenue - s.cost; $('#vBurn').textContent = (net >= 0 ? '+' : '−') + '$' + G.fmt(Math.abs(net)) + '/day';
    const r = G.rank(s.xp); $('#rankName').textContent = r.name; $('#xpFill').style.width = r.pct * 100 + '%';
    $('#codexCount').textContent = s.concepts.length + '/' + G.CONCEPT_ORDER.length;
    const ch = G.CHAPTERS[s.chapter], pct = G.clamp(s.users / ch.goal, 0, 1);
    $('#milestoneFill').style.width = pct * 100 + '%'; $('#milestoneLabel').textContent = `${G.fmt(s.users)} / ${G.fmt(ch.goal)} users`;
    spark(s);
  }

  function spark(s) {
    const c = $('#spark'), x = c.getContext('2d'), d = s.history; x.clearRect(0, 0, c.width, c.height); if (d.length < 2) return;
    const mx = Math.max(...d), mn = Math.min(...d);
    x.beginPath(); d.forEach((v, i) => { const px = (i / (d.length - 1)) * c.width, py = c.height - 4 - ((v - mn) / (mx - mn || 1)) * (c.height - 10); i ? x.lineTo(px, py) : x.moveTo(px, py); });
    x.strokeStyle = '#5ce1e6'; x.lineWidth = 2; x.stroke(); x.lineTo(c.width, c.height); x.lineTo(0, c.height); x.closePath(); x.fillStyle = 'rgba(92,225,230,.12)'; x.fill();
  }

  function setChapter() {
    const s = G.state, ch = G.CHAPTERS[s.chapter];
    $('#chapterChip').textContent = 'Chapter ' + (s.chapter + 1); $('#chapterTitle').textContent = ch.title; $('#objective').textContent = tx(ch.objective);
  }

  // ───────── Build panel ─────────
  function renderShop() {
    const s = G.state, items = G.SHOP.filter((i) => i.ch <= s.chapter);
    const sig = items.map((i) => i.id + i.level(s) + i.cost(s) + (s.cash >= i.cost(s)) + i.can(s)).join('|');
    if (sig === shopSig) return; shopSig = sig;
    $('#shop').innerHTML = items.map((i) => {
      const can = i.can(s), cost = i.cost(s), owned = can === false, lvl = i.level(s);
      const why = typeof can === 'string' ? can : (s.cash < cost ? 'Not enough cash' : '');
      return `<div class="item ${owned ? 'owned' : ''}"><div class="item-icon">${i.icon}</div>
        <div class="item-body"><div class="item-name">${i.name}${lvl ? ` <span class="lvl">${lvl}</span>` : ''}</div><div class="item-desc">${i.desc}</div>
        ${owned ? '<div class="item-built">Built</div>' : `<button class="buy" data-id="${i.id}" ${why ? 'disabled' : ''}>${why && typeof can === 'string' ? why : G.money(cost)}<small>${why && typeof can === 'string' ? '' : i.upkeep}</small></button>`}</div></div>`;
    }).join('');
  }
  function buy(id) {
    const s = G.state, it = G.SHOP.find((i) => i.id === id); if (!it || it.can(s) !== true || s.cash < it.cost(s)) return;
    s.cash -= it.cost(s); it.buy(s); G.sound.buy(); toast(`${it.icon} ${it.name} built`, 'good');
    learn(it.learn).forEach((c) => toast(`📖 New codex card: ${G.CONCEPTS[c].t}`, 'info'));
    shopSig = ''; renderShop(); G.save();
  }

  // ───────── Feed, toasts, nudges ─────────
  const TW = {
    good: [['just got my order from {co} in 2 days. obsessed', '{co} picked me up in 3 minutes. in the RAIN'], ['ok {co} is actually good??', 'deleted the other app. {co} only now'], ['told my whole family about {co}', 'my driver had snacks. five stars {co}'], ['{co} checkout is so smooth', '{co} is how i get everywhere now'], ['third {co} order this week. send help', 'the {co} map is weirdly satisfying to watch'],
      ['my mum just discovered {co}. pray for her savings', 'my mum just took her first {co}. she rated the driver 6 stars somehow'], ['{co} refunded me before i finished complaining', '{co} got me to the airport with 4 minutes to spare'], ['who built {co}? it never breaks', 'who built {co}? it never breaks'], ['searching on {co} > searching anywhere else', 'the fare was exactly what {co} said it would be. rare.'], ['{co} at 2am hits different', '{co} at 2am is a public service']],
    meh: [['{co} is a bit slow today?', '{co} taking a while to find a car…'], ['is it just me or is {co} laggy', 'the {co} app keeps spinning'], ['{co} pls. the spinner.', 'come on {co} i’m late'], ['refreshing {co} like it owes me money', 'still “finding your driver”. still.'], ['{co} loading… loading… loading…', '{co} map is frozen again']],
    bad: [['IS {co} DOWN??', 'IS {co} DOWN?? i’m stranded'], ['{co} ate my cart. again.', '{co} booked me a ride that doesn’t exist'], ['error 503 is my new favourite {co} product', 'walking home. thanks {co}'], ['switching away from {co}, this is ridiculous 😡', 'uninstalling {co} 😡'], ['paid on {co}, got an error page. cool cool cool', 'charged by {co}, no car. cool cool cool'], ['{co} status page says “all good”. it is not all good', '{co} status page says “all good”. i am in a car park']]
  };
  const HANDLES = ['@priya_k', '@dev.null', '@sneakerhead', '@maria_g', '@tanvir', '@ohnojo', '@late4work', '@mumbaimeri', '@kenji', '@notabot42', '@anaïs', '@big_dave'];
  function tweet() {
    const s = G.state, pool = s.health > 75 ? TW.good : s.health > 45 ? TW.meh : TW.bad, mood = s.health > 75 ? 'good' : s.health > 45 ? 'meh' : 'bad';
    const el = document.createElement('div'); el.className = 'tweet ' + mood;
    let line; do { line = tx(pool[Math.floor(Math.random() * pool.length)]); } while (line === lastTweet); lastTweet = line;
    el.innerHTML = `<b>${HANDLES[Math.floor(Math.random() * HANDLES.length)]}</b> ${esc(line)}`;
    const f = $('#feed'); f.prepend(el); while (f.children.length > 7) f.lastChild.remove();
  }
  function toast(msg, kind = 'info') {
    const el = document.createElement('div'); el.className = 'toast ' + kind; el.textContent = msg; $('#toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 3800); setTimeout(() => el.remove(), 4300);
  }
  function nudge(l) {
    const s = G.state; if (s.day - nudgeDay < 7) return;
    const names = { app: 'App servers', dbRead: 'Database reads', dbWrite: 'Database writes' };
    if (l.util > 0.82 && s.arch.monitoring) { nudgeDay = s.day; toast(`📡 ${names[l.bottleneck]} at ${Math.round(l.util * 100)}%. Build something before it tips over.`, l.util > 1 ? 'bad' : 'warn'); if (l.util > 1) G.sound.bad(); }
    else if (s.health < 70 && !s.arch.monitoring) { nudgeDay = s.day; toast('🦆 Something is slow. Without monitoring, I can’t tell you what.', 'warn'); }
    else if (s.cash < 0) { nudgeDay = s.day; toast('💸 You’re in the red. Costs are outrunning revenue.', 'warn'); }
  }

  // ───────── Concepts ─────────
  function learn(ids) {
    const s = G.state, fresh = [];
    (ids || []).forEach((id) => { if (typeof id === 'function') id = id(s); if (G.CONCEPTS[id] && !s.concepts.includes(id)) { s.concepts.push(id); fresh.push(id); } });
    return fresh;
  }
  const conceptCard = (id) => { const c = G.CONCEPTS[id]; return `<button class="ccard" data-c="${id}"><span class="ccard-i">${c.i}</span><span><b>${c.t}</b><small>${c.one}</small></span></button>`; };
  function conceptDetail(id) {
    const c = G.CONCEPTS[id];
    return `<div class="cdetail"><div class="cdetail-head"><span class="big-i">${c.i}</span><div><div class="chip">${c.cat}</div><h2>${c.t}</h2><p class="lead">${c.one}</p></div></div>
      <div class="duck-says"><div class="mini-portrait">${G.portrait('quack')}</div><p>${c.story}</p></div>
      <div class="real"><b>In the wild</b> ${c.real}</div></div>`;
  }
  function openCodex(focus) {
    const s = G.state, was = G.paused; G.paused = true;
    const cats = {}; G.CONCEPT_ORDER.forEach((id) => { (cats[G.CONCEPTS[id].cat] = cats[G.CONCEPTS[id].cat] || []).push(id); });
    const draw = (sel) => {
      modal(`<div class="codex"><div class="codex-list"><h2>📖 Codex <span class="muted">${s.concepts.length} of ${G.CONCEPT_ORDER.length} discovered</span></h2>
        ${Object.entries(cats).map(([cat, ids]) => `<h5>${cat}</h5><div class="codex-grid">${ids.map((id) => s.concepts.includes(id) ? `<button class="tile ${id === sel ? 'sel' : ''}" data-c="${id}"><span>${G.CONCEPTS[id].i}</span>${G.CONCEPTS[id].t}</button>` : '<div class="tile locked"><span>?</span>Undiscovered</div>').join('')}</div>`).join('')}</div>
        <div class="codex-detail">${sel ? conceptDetail(sel) : '<div class="empty">Pick a card. You earn them by living through the thing they describe.</div>'}<button class="btn" id="closeCodex">Back to work</button></div></div>`, 'wide');
      $('#modalCard').onclick = (e) => { const t = e.target.closest('[data-c]'); if (t) { G.sound.click(); draw(t.dataset.c); } if (e.target.id === 'closeCodex') { closeModal(); G.paused = was; if (s.over === 'done') ending(lastPassed); } };
    };
    draw(focus || s.concepts[s.concepts.length - 1]);
  }

  // ───────── Overlays ─────────
  function modal(html, cls = '') { const m = $('#modal'); $('#modalCard').className = 'modal-card ' + cls; $('#modalCard').innerHTML = html; $('#modalCard').onclick = null; m.hidden = false; $('#modalCard').scrollTop = 0; }
  function closeModal() { $('#modal').hidden = true; }

  function say(lines) {
    return new Promise((res) => {
      let i = 0, typing = null, full = '';
      const d = $('#dialog'); d.hidden = false;
      const show = () => {
        const [who, text, md] = lines[i], ch = G.CHARS[who]; full = tx(text);
        $('#vnPortrait').innerHTML = G.portrait(who, md || G.art.mood(who, full)); $('#vnPortrait').style.borderColor = ch.color;
        $('#vnName').innerHTML = `${ch.name} <small>${ch.role}</small>`; $('#vnName').style.color = ch.color;
        d.className = 'vn ' + (who === 'pager' || who === 'nb' ? 'alert' : '');
        if (who === 'pager') G.sound.alarm(); else G.sound.click();
        let k = 0; const el = $('#vnText'); el.textContent = ''; clearInterval(typing);
        typing = setInterval(() => { k += 2; el.textContent = full.slice(0, k); if (k >= full.length) { clearInterval(typing); typing = null; } }, 14);
      };
      const next = () => {
        if (typing) { clearInterval(typing); typing = null; $('#vnText').textContent = full; return; }
        if (++i >= lines.length) { d.hidden = true; d.onclick = null; document.removeEventListener('keydown', key); res(); } else show();
      };
      const key = (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); next(); } };
      d.onclick = next; document.addEventListener('keydown', key); show();
    });
  }

  function chapterCard(n) {
    return new Promise((res) => {
      const ch = G.CHAPTERS[n], el = $('#chapterCard'); G.sound.unlock();
      const unlocked = G.SHOP.filter((i) => i.ch === n && n > 0).map((i) => i.icon + ' ' + i.name);
      el.innerHTML = `<div class="cc-inner"><div class="cc-art">${G.art.scene(n, G.state.co)}</div><div class="cc-num">Chapter ${n + 1}</div><h1>${ch.title}</h1><p>${ch.sub}</p>${unlocked.length ? `<div class="cc-unlock">New in Build: ${unlocked.join(' · ')}</div>` : ''}<button class="btn big">Continue</button></div>`;
      el.hidden = false; el.querySelector('button').onclick = () => { el.hidden = true; res(); };
    });
  }

  function choose(step, beat) {
    return new Promise((res) => {
      const s = G.state, c = step.choose, who = G.CHARS[c.who || 'quack'];
      if (c.before) c.before(s);
      let left = c.urgent || 0, timer = null, hinted = false, done = false, gun = null;
      if (c.urgent) { s.incident = s.incident || { pen: 28, err: 0.2 }; G.paused = false; G.sound.alarm(); $('#alertBanner').hidden = false; $('#alertBanner').textContent = '🚨 INCIDENT — ' + tx(beat.title); }
      else G.paused = true;
      const opts = c.options.map((o, i) => `<button class="opt" data-i="${i}"><div class="opt-key">${i + 1}</div><h4>${esc(tx(o.label))}</h4><p>${esc(tx(o.desc))}</p><div class="tags">${(o.tags || []).map((t) => `<span>${esc(t)}</span>`).join('')}</div></button>`).join('');
      modal(`<div class="decision ${c.urgent ? 'urgent' : ''}">
        ${c.urgent ? `<div class="banner">${G.art.banner(/hack|null/.test(beat.id) ? 'hack' : beat.id === 'region' ? 'region' : 'fire')}</div>` : ''}
        <div class="d-head"><div class="mini-portrait" style="border-color:${who.color}">${G.portrait(c.who || 'quack')}</div>
          <div><div class="chip ${c.urgent ? 'red' : ''}">${c.urgent ? '🚨 Incident — the clock is running' : 'Decision'}</div><h2>${esc(tx(c.prompt))}</h2></div></div>
        ${c.urgent ? '<div class="timer"><i id="timerFill"></i><span id="timerNum"></span></div>' : ''}
        ${c.symptoms ? `<div class="term ${c.gun != null ? 'hunt' : ''}">${c.gun != null ? '<div class="hunt-tip">🔍 One line gives the game away. Click it for bonus XP.</div>' : ''}${c.symptoms.map((l, i) => `<div class="ln" data-l="${i}">${esc(tx(l))}</div>`).join('')}</div>` : ''}
        <div class="opts n${c.options.length}">${opts}</div>
        <div class="d-foot"><button class="btn ghost small" id="hintBtn">🦆 Ask Quack for a hint</button><div id="hintText" class="hint" hidden></div></div></div>`, 'wide');
      const pick = (i) => {
        if (done) return; done = true; clearInterval(timer); document.removeEventListener('keydown', key);
        $('#alertBanner').hidden = true; s.incident = null; G.paused = true;
        res({ i, hinted, gun, timedOut: left <= 0 && !!c.urgent });
      };
      const key = (e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= c.options.length) pick(n - 1); };
      document.addEventListener('keydown', key);
      $('#modalCard').onclick = (e) => {
        const o = e.target.closest('.opt'); if (o) return pick(+o.dataset.i);
        const ln = e.target.closest('.ln');
        if (ln && c.gun != null && gun === null) {
          gun = +ln.dataset.l === c.gun; ln.classList.add(gun ? 'hit' : 'miss'); gun ? G.sound.good() : G.sound.bad();
          document.querySelectorAll('.term .ln')[c.gun].classList.add('hit'); $('.hunt-tip').textContent = gun ? '🔍 That’s the one. +30 XP' : '🔍 Not quite — the highlighted line was the giveaway.'; return;
        }
        if (e.target.id === 'hintBtn') { hinted = true; s.stats.hints++; $('#hintText').hidden = false; $('#hintText').textContent = tx(c.hint); e.target.disabled = true; G.sound.click(); }
      };
      if (c.urgent) {
        const tick = () => { $('#timerFill').style.width = (left / c.urgent) * 100 + '%'; $('#timerNum').textContent = Math.ceil(left) + 's'; };
        tick(); timer = setInterval(() => { left -= 0.1; if (left <= 10 && Math.abs(left % 1) < 0.1) G.sound.tone(900, 0.05, 'square', 0.03); tick(); if (left <= 0) pick(c.timeout || 0); }, 100);
      }
    });
  }

  function outcome(step, r) {
    return new Promise((res) => {
      const s = G.state, c = step.choose, o = c.options[r.i];
      const before = { cash: s.cash, rep: s.rep, users: s.users };
      o.fx(s, s.arch);
      const xp = ({ great: 100, ok: 50, bad: 15 }[o.verdict]) + (r.hinted ? 0 : 25) + (r.gun ? 30 : 0); s.xp += xp; s.stats[o.verdict]++;
      const fresh = learn(o.learn);
      const d = [];
      if (Math.abs(s.cash - before.cash) >= 1) d.push([G.money(s.cash - before.cash), s.cash > before.cash]);
      if (Math.abs(s.rep - before.rep) >= 0.5) d.push([(s.rep > before.rep ? '+' : '') + Math.round(s.rep - before.rep) + ' reputation', s.rep > before.rep]);
      if (Math.abs(s.users - before.users) >= 1) d.push([(s.users > before.users ? '+' : '−') + G.fmt(Math.abs(s.users - before.users)) + ' users', s.users > before.users]);
      d.push(['+' + xp + ' XP' + (r.hinted ? '' : ' (no-hint bonus)'), true]); if (r.gun) d.push(['🔍 Spotted the clue', true]);
      const stamp = { great: 'Great call', ok: 'It’ll do', bad: 'Ouch' }[o.verdict];
      o.verdict === 'bad' ? G.sound.bad() : o.verdict === 'great' ? G.sound.good() : G.sound.click();
      const others = c.options.filter((x, i) => i !== r.i && x.note);
      modal(`<div class="outcome ${o.verdict}">
        <div class="stamp">${stamp}</div>${r.timedOut ? '<div class="froze">You froze. Time ran out and this happened by default.</div>' : ''}
        <h3>${esc(tx(o.label))}</h3><p class="out-text">${esc(tx(o.out))}</p>
        <div class="deltas">${d.map(([t, up]) => `<span class="${up ? 'up' : 'down'}">${t}</span>`).join('')}</div>
        ${fresh.length ? `<div class="unlocked"><div class="chip">📖 You just discovered</div>${fresh.map(conceptCard).join('')}</div>` : ''}
        ${others.length ? `<div class="roads"><b>Roads not taken</b>${others.map((x) => `<div><i class="dot ${x.verdict}"></i><span>${esc(tx(x.label))}</span><em>${esc(tx(x.note))}</em></div>`).join('')}</div>` : ''}
        <button class="btn big" id="okBtn">Continue</button></div>`);
      if (fresh.length) setTimeout(() => G.sound.unlock(), 350);
      $('#modalCard').onclick = (e) => {
        const t = e.target.closest('[data-c]');
        if (t) { const box = document.createElement('div'); box.className = 'inline-detail'; box.innerHTML = conceptDetail(t.dataset.c); t.replaceWith(box); return; }
        if (e.target.id === 'okBtn') { closeModal(); res(); }
      };
    });
  }

  function dodge(beat) {
    return new Promise((res) => {
      const s = G.state; s.xp += 120; s.stats.dodged++; const fresh = learn(beat.dodge.learn); G.sound.good();
      modal(`<div class="outcome great"><div class="stamp">Dodged it</div><h3>${esc(tx(beat.title))}</h3><p class="out-text">${esc(tx(beat.dodge.say))}</p>
        <div class="deltas"><span class="up">+120 XP — foresight bonus</span></div>
        ${fresh.length ? `<div class="unlocked"><div class="chip">📖 You just discovered</div>${fresh.map(conceptCard).join('')}</div>` : ''}
        <button class="btn big" id="okBtn">Continue</button></div>`);
      $('#modalCard').onclick = (e) => { const t = e.target.closest('[data-c]'); if (t) { const b = document.createElement('div'); b.className = 'inline-detail'; b.innerHTML = conceptDetail(t.dataset.c); t.replaceWith(b); return; } if (e.target.id === 'okBtn') { closeModal(); res(); } };
    });
  }

  // ───────── Story engine ─────────
  function checkBeat() {
    const s = G.state;
    while (G.BEATS[s.beat] && G.BEATS[s.beat].cond && !G.BEATS[s.beat].cond(s)) s.beat++;
    const b = G.BEATS[s.beat]; if (!b || popEl) return;   // let an open message be answered first
    const gap = s.day - s.lastBeatDay;
    if ((s.users >= b.users && gap >= 3.5) || gap >= 14) runBeat(b);
  }

  async function runBeat(b) {
    const s = G.state; busy = true; G.paused = true; closePop();
    if (b.ch > s.chapter || (s.beat === 0 && !s.flags.seenIntro)) {
      s.chapter = b.ch; s.flags.seenIntro = true; setChapter(); await chapterCard(b.ch); shopSig = ''; renderShop();
      checkpoint = JSON.stringify(s);
    }
    if (b.special === 'finale') { const went = await finale(b); if (!went) { s.lastBeatDay = s.day; busy = false; G.paused = false; return; } return; }
    if (b.dodge && b.dodge.if(s)) await dodge(b);
    else for (const st of b.steps) {
      if (st.if && !st.if(s)) continue;
      if (st.say) await say(st.say);
      if (st.choose) { const r = await choose(st, b); await outcome(st, r); }
      if (st.tune) await tune(st.tune);
      if (st.ramp) await ramp();
      if (st.after) st.after(s);
    }
    s.beat++; s.lastBeatDay = s.day; shopSig = ''; G.save(); busy = false; G.paused = false;
    if (s.concepts.length && !s.flags.codexTip) { s.flags.codexTip = true; toast('📖 Concepts you live through are saved in your Codex (top right).', 'info'); }
  }

  async function bailout() {
    busy = true; G.paused = true;
    await say([['maya', 'We ran out of money. I just spent four hours in Viktor’s lobby. He’s wired a bridge loan.'], ['viktor', 'This is the last one. Spend less than you earn. It is not a complicated architecture.']]);
    busy = false; G.paused = false;
  }

  function gameOver() {
    const s = G.state; busy = true; G.paused = true; G.sound.bad();
    const why = s.over === 'bankrupt' ? ['The money ran out', 'The bridge loan is gone and the cloud provider has switched off your account. Costs outran revenue for too long.'] : ['The users left', 'Too many outages for too long. People stopped trusting ' + s.co + ', and then they stopped opening it.'];
    modal(`<div class="outcome bad"><div class="stamp">Game over</div><h3>${why[0]}</h3><p class="out-text">${why[1]}</p>
      <div class="duck-says"><div class="mini-portrait">${G.portrait('quack')}</div><p>Every architect has one of these. Rewind to the start of the chapter — you know things now that you didn’t then.</p></div>
      <button class="btn big" id="rewind">Rewind to chapter start</button> <button class="btn ghost" id="fresh">New game</button></div>`);
    $('#modalCard').onclick = (e) => {
      if (e.target.id === 'rewind') { closeModal(); busy = false; start(JSON.parse(checkpoint)); }
      if (e.target.id === 'fresh') { G.clearSave(); location.reload(); }
    };
  }

  // ───────── The Big Day ─────────
  async function finale(b) {
    const s = G.state;
    await say([
      ['maya', ['It’s tomorrow. MEGA SALE DAY. The pop star is rehearsing our name. Tell me we’re ready.', 'It’s tomorrow. NEW YEAR’S EVE. Twelve cities. Tell me we’re ready.']],
      ['quack', 'Expect about two and a half times your normal peak, plus everything that has ever gone wrong, all in one evening. If there’s anything left to build, now is the moment.']
    ]);
    const go = await new Promise((res) => {
      const f = G.load(s, 2.5), pc = (u) => `<span class="${u > 1 ? 'down' : 'up'}">${Math.round(u * 100)}%</span>`;
      const forecast = s.flags.chaos || s.flags.loadtest
        ? `<div class="unlocked"><div class="chip">🧪 Your rehearsal’s forecast at 2.5× load</div><div class="deltas" style="margin:0">App servers ${pc(f.appUtil)} DB reads ${pc(f.readUtil)} DB writes ${pc(f.writeUtil)}</div><small class="muted">Anything over 100% will fall over tomorrow. Capacity is only part of the night.</small></div>`
        : '<div class="froze" style="margin-bottom:14px">You never rehearsed for this, so there is no forecast. You’re guessing.</div>';
      modal(`<div class="outcome"><div class="chip">The night before</div><h3>${esc(tx(b.title))} is tomorrow</h3><p class="out-text">Once it starts, you can’t build anything. Everything you’ve decided since the garage gets tested in one evening.</p>${forecast}
        <button class="btn big" id="go">We’re ready. Start the day.</button> <button class="btn ghost" id="wait">Give me a few more days to build</button></div>`);
      $('#modalCard').onclick = (e) => { if (e.target.id === 'go') { closeModal(); res(true); } if (e.target.id === 'wait') { closeModal(); res(false); } };
    });
    if (!go) return false;
    const l = G.load(s, 2.5); let passed = 0; override = 'finale';
    modal(`<div class="finale"><div class="chip red">LIVE</div><h2>${esc(tx(b.title))}</h2><div id="fin"></div><div id="finEnd"></div></div>`, 'wide');
    for (const f of G.FINALE) {
      await new Promise((r) => setTimeout(r, 1500));
      const ok = !!f.test(s, l); if (ok) passed++; ok ? G.sound.good() : G.sound.bad();
      const row = document.createElement('div'); row.className = 'fin-row ' + (ok ? 'pass' : 'fail');
      row.innerHTML = `<time>${tx(f.time)}</time><div><b>${esc(tx(f.name))}</b><p>${esc(tx(ok ? f.pass : f.fail))}</p></div><span>${ok ? '✓' : '✗'}</span>`;
      $('#fin').appendChild(row); $('#modalCard').scrollTop = 1e6;
      s.health = G.clamp(s.health + (ok ? 2 : -12), 5, 100); updateHUD();
    }
    await new Promise((r) => setTimeout(r, 1200));
    $('#finEnd').innerHTML = `<div class="fin-score">${passed} of ${G.FINALE.length} held</div><button class="btn big" id="toEnd">See how the story ends</button>`; $('#modalCard').scrollTop = 1e6;
    await new Promise((r) => { $('#toEnd').onclick = r; });
    ending(passed); return true;
  }

  function ending(passed) {
    const s = G.state, e = G.ENDINGS.find((x) => passed >= x.min); s.over = 'done'; lastPassed = passed; override = passed >= 8 ? 'win' : 'lose'; G.clearSave(); G.sound.unlock();
    const total = s.stats.great + s.stats.ok + s.stats.bad;
    modal(`<div class="ending"><div class="end-art">${G.art.ending(passed >= 8)}</div><div class="chip">${esc(s.co)} · day ${Math.floor(s.day)}</div><div class="end-rank">${e.rank}</div><h1>${esc(e.title)}</h1>
      <p class="end-text">${esc(tx(e.text)).replace(/\n\n/g, '</p><p class="end-text">')}</p>
      <div class="end-stats">
        <div><b>${G.fmt(s.stats.peak)}</b>peak users</div><div><b>${passed}/${G.FINALE.length}</b>big-day checks</div>
        <div><b>${s.stats.great}/${total}</b>great calls</div><div><b>${s.stats.dodged}</b>incidents dodged</div>
        <div><b>${s.concepts.length}/${G.CONCEPT_ORDER.length}</b>concepts discovered</div><div><b>${G.rank(s.xp).name}</b>final rank</div></div>
      <button class="btn big" id="again">Play another path</button> <button class="btn ghost" id="seeCodex">Read my Codex</button></div>`, 'wide');
    $('#modalCard').onclick = (ev) => { if (ev.target.id === 'again') location.reload(); if (ev.target.id === 'seeCodex') openCodex(); };
  }

  // ───────── Soundtrack selection ─────────
  function track() {
    const s = G.state;
    if (!s || !$('#title').hidden) return 'title';
    if (override) return override;
    if (s.incident || s.health < 40) return 'incident';
    return 'ch' + s.chapter;
  }

  // ───────── Hands-on: tune a dial and watch two things trade off ─────────
  function tune(t) {
    return new Promise((res) => {
      const s = G.state, vals = t.values; G.paused = true; let locked = false;
      modal(`<div class="tune"><div class="d-head"><div class="mini-portrait">${G.portrait(t.who || 'quack', 'excited')}</div><div><div class="chip">🎛 Hands-on</div><h2>${esc(tx(t.prompt))}</h2></div></div>
        <div class="dial"><div class="dial-val" id="tv"></div><input type="range" id="ts" min="0" max="${vals.length - 1}" value="${t.start}" step="1"><div class="dial-ends"><span>◀ ${esc(t.lo)}</span><span>${esc(t.hi)} ▶</span></div></div>
        <div class="meters">${t.meters.map((m, i) => `<div class="meter"><label>${esc(tx(m.name))}</label><div class="mbar"><i id="tm${i}"></i></div><small id="tl${i}"></small></div>`).join('')}</div>
        <p class="tune-say" id="tsay">Drag the slider. Watch what each direction costs you.</p><button class="btn big" id="lock">Lock it in</button></div>`);
      const upd = () => {
        const v = vals[+$('#ts').value]; $('#tv').textContent = t.fmt(v);
        t.meters.forEach((m, k) => { const x = G.clamp(m.fn(v), 0, 1), el = $('#tm' + k); el.style.width = 4 + x * 96 + '%'; el.style.background = x > 0.6 ? 'var(--red)' : x > 0.3 ? 'var(--yellow)' : 'var(--green)'; $('#tl' + k).textContent = x > 0.6 ? 'High' : x > 0.3 ? 'Some' : 'Low'; });
      };
      $('#ts').oninput = () => { if (!locked) { upd(); G.sound.tone(300 + +$('#ts').value * 40, 0.04, 'triangle', 0.03); } }; upd();
      $('#lock').onclick = () => {
        if (locked) { closeModal(); return res(); }
        locked = true; $('#ts').disabled = true; const v = vals[+$('#ts').value], ok = v >= t.sweet[0] && v <= t.sweet[1];
        s.xp += ok ? 50 : 10; ok ? G.sound.good() : G.sound.click();
        $('#tsay').innerHTML = `<b class="${ok ? 'up' : 'down'}">${ok ? 'Dialled in. +50 XP' : (v < t.sweet[0] ? 'Too far that way. +10 XP' : 'Too far that way. +10 XP')}</b> ${esc(tx(v < t.sweet[0] ? t.low : v > t.sweet[1] ? t.high : t.mid))}`;
        $('#lock').textContent = 'Continue';
      };
    });
  }

  // ───────── Hands-on: roll out a release and catch the bug before your users do ─────────
  function ramp() {
    return new Promise((res) => {
      const s = G.state, canary = s.flags.safeDeploy === 'canary'; G.paused = true;
      modal(`<div class="tune"><div class="d-head"><div class="mini-portrait">${G.portrait('quack', 'worried')}</div><div><div class="chip">🎛 Hands-on · ${canary ? 'canary release' : 'blue/green deploy'}</div>
        <h2>${canary ? 'Hold the button to send more traffic to the new version. If errors spike, roll back fast.' : 'Flip all traffic to the new version. If errors spike, flip back fast.'}</h2></div></div>
        <canvas id="rg" width="820" height="200"></canvas>
        <div class="ramp-stats"><div><b id="rp">0%</b>traffic on new version</div><div><b id="re">0.1%</b>error rate</div></div>
        <p class="tune-say" id="rsay">${canary ? 'Nothing is ever wrong at 1%. Keep going… carefully.' : 'Green is warmed up and waiting.'}</p>
        <div class="ramp-btns"><button class="btn big" id="rgo">${canary ? 'Hold to ramp up ▲' : 'Flip to green'}</button><button class="btn big danger" id="rback">⏪ Roll back</button></div></div>`, 'wide');
      const cv = $('#rg'), x = cv.getContext('2d'), hist = []; let pct = canary ? 1 : 0, err = 0.1, hold = false, leak = canary ? 22 + Math.random() * 45 : null, flipAt = null, spikeAt = null, t = 0, done = false, warned = false;
      const go = $('#rgo');
      if (canary) { go.onpointerdown = () => { hold = true; }; window.addEventListener('pointerup', () => { hold = false; }); }
      else go.onclick = () => { if (flipAt === null) { pct = 100; flipAt = t; leak = t + 2.5 + Math.random() * 3.5; go.disabled = true; $('#rsay').textContent = 'Everyone is on the new version. Eyes on the graph.'; G.sound.click(); } };
      const finish = (auto) => {
        if (done) return; done = true; clearInterval(iv);
        const react = spikeAt === null ? 0 : t - spikeAt, fast = !auto && react < 1.8, hurt = canary ? Math.round(pct) : 100;
        s.xp += fast ? 60 : 15; if (!fast) s.rep = G.clamp(s.rep - (auto ? 5 : 2), 0, 100); fast ? G.sound.good() : G.sound.bad();
        $('#rsay').innerHTML = `<b class="${fast ? 'up' : 'down'}">${auto ? 'The robots rolled it back for you.' : fast ? 'Caught it in ' + react.toFixed(1) + ' s. +60 XP' : 'Rolled back after ' + react.toFixed(1) + ' s. +15 XP'}</b> ` +
          (canary ? (hurt <= 50 ? `A memory leak nobody caught in testing. Only ${hurt}% of users ever touched the bad version — that is the whole point of a canary.` : `A memory leak nobody caught in testing. You had already pushed ${hurt}% of users onto it — a canary only protects you if you ramp slowly and watch.`) : 'A memory leak nobody caught in testing. Everyone was on it, but the old version was one switch away — that is what the second copy buys you.') + ' You fix the leak and ship again tomorrow.';
        go.hidden = true; const b = $('#rback'); b.textContent = 'Continue'; b.classList.remove('danger'); b.onclick = () => { closeModal(); res(); };
      };
      $('#rback').onclick = () => {
        if (done) return;
        if (spikeAt === null) { $('#rsay').textContent = pct > 1 ? 'Nothing was wrong yet — you rolled back a healthy release. Try again.' : 'Nothing to roll back yet.'; pct = canary ? 1 : 0; if (!canary) { flipAt = null; go.disabled = false; leak = null; } return; }
        finish(false);
      };
      const iv = setInterval(() => {
        t += 0.05; if (canary && hold && pct < 100) pct = Math.min(100, pct + 0.42);
        const leaking = canary ? pct >= leak : (flipAt !== null && t >= leak);
        err = leaking ? Math.min(40, err + 0.05 * 9 * (canary ? 0.5 + pct / 60 : 1.4)) : 0.1 + Math.random() * 0.15;
        if (err > 2 && spikeAt === null) { spikeAt = t; }
        if (err > 2 && !warned) { warned = true; G.sound.alarm(); $('#rsay').innerHTML = '<b class="down">ERRORS CLIMBING — ROLL BACK!</b>'; }
        if (err >= 30) finish(true);
        hist.push([pct, err]); if (hist.length > 164) hist.shift();
        $('#rp').textContent = Math.round(pct) + '%'; $('#re').textContent = err.toFixed(1) + '%'; $('#re').className = err > 2 ? 'down' : '';
        x.clearRect(0, 0, 820, 200); x.fillStyle = '#070b16'; x.fillRect(0, 0, 820, 200);
        x.strokeStyle = 'rgba(255,84,112,.5)'; x.setLineDash([5, 5]); x.beginPath(); x.moveTo(0, 180 - 2 * 5.5); x.lineTo(820, 180 - 2 * 5.5); x.stroke(); x.setLineDash([]);
        x.fillStyle = 'rgba(92,225,230,.16)'; hist.forEach((h, i) => x.fillRect(i * 5, 180 - h[0] * 1.6, 5, h[0] * 1.6));
        x.strokeStyle = '#ff5470'; x.lineWidth = 3; x.beginPath(); hist.forEach((h, i) => { const y = 180 - Math.min(30, h[1]) * 5.5; i ? x.lineTo(i * 5, y) : x.moveTo(0, y); }); x.stroke();
        x.fillStyle = '#8a95bd'; x.font = '11px monospace'; x.fillText('errors (red) · traffic on new version (blue) · dashed = 2% alarm line', 10, 196);
      }, 50);
    });
  }

  // ───────── Phone pop-ups: quick messages and Quack's pop quizzes between story beats ─────────
  function closePop() { clearInterval(popTimer); if (popEl) { popEl.remove(); popEl = null; } }
  function maybePop() {
    const s = G.state; if (popEl || s.day < popDay || s.day - s.lastBeatDay < 1.2) return;
    popDay = s.day + 7 + Math.random() * 4; popCount++;
    s.flags.pops = s.flags.pops || [];
    const pool = G.POPUPS.map((p, i) => i).filter((i) => !s.flags.pops.includes(i) && (!G.POPUPS[i].cond || G.POPUPS[i].cond(s)));
    if ((popCount % 3 === 0 && s.concepts.length >= 4) || !pool.length) { if (s.concepts.length >= 4) quizPop(); return; }
    const idx = pool[Math.floor(Math.random() * pool.length)], p = G.POPUPS[idx]; s.flags.pops.push(idx);
    showPop(p.who, tx(p.text), [p.a, p.b].map((o) => ({ label: o.label, run: () => { o.fx(s); return tx(o.say); } })));
  }
  function quizPop() {
    const s = G.state, id = s.concepts[Math.floor(Math.random() * s.concepts.length)], c = G.CONCEPTS[id];
    const others = G.CONCEPT_ORDER.filter((x) => x !== id && G.CONCEPTS[x].cat !== 'x').sort(() => Math.random() - 0.5).slice(0, 2);
    const opts = [id, ...others].sort(() => Math.random() - 0.5);
    showPop('quack', `Pop quiz! Which idea is this? “${c.one}”`, opts.map((o) => ({ label: G.CONCEPTS[o].t, run: () => { if (o === id) { s.xp += 40; G.sound.good(); return `Correct — ${c.t}. +40 XP`; } G.sound.bad(); return `That was ${c.t}. It’s in your Codex.`; } })), 'quiz');
  }
  function showPop(who, text, replies, cls = '') {
    closePop(); const ch = G.CHARS[who], el = document.createElement('div'); popEl = el; el.className = 'pop ' + cls; G.sound.tone(880, 0.08, 'sine', 0.05); G.sound.tone(1175, 0.12, 'sine', 0.05, 0.09);
    el.innerHTML = `<div class="pop-head"><div class="mini-portrait" style="border-color:${ch.color}">${G.portrait(who, G.art.mood(who, text))}</div><div><b style="color:${ch.color}">${ch.name}</b><small>${cls === 'quiz' ? 'pop quiz' : 'new message'}</small></div><button class="pop-x" title="Dismiss">×</button></div>
      <p>${esc(text)}</p><div class="pop-btns">${replies.map((r, i) => `<button data-r="${i}">${esc(r.label)}</button>`).join('')}</div><div class="pop-timer"><i></i></div>`;
    $('#world').appendChild(el); let left = 16;
    popTimer = setInterval(() => { if (G.paused) return; left -= 0.1; el.querySelector('.pop-timer i').style.width = (left / 16) * 100 + '%'; if (left <= 0) closePop(); }, 100);
    el.onclick = (e) => {
      if (e.target.closest('.pop-x')) return closePop();
      const b = e.target.closest('[data-r]'); if (!b) return;
      const msg = replies[+b.dataset.r].run(); clearInterval(popTimer);
      el.querySelector('.pop-btns').remove(); el.querySelector('.pop-timer').remove(); el.querySelector('p').textContent = msg; el.classList.add('answered');
      setTimeout(() => { if (popEl === el) closePop(); }, 4200);
    };
  }

  // ───────── Settings: fonts, music, sound ─────────
  const FONTS = { studio: 'Studio', editorial: 'Editorial', playful: 'Playful', arcade: 'Arcade', classic: 'Classic' };
  function setFont(k) {
    document.documentElement.dataset.font = k; try { localStorage.setItem('uptime-font', k); } catch (e) { /* ignore */ }
    G.fontDisplay = getComputedStyle(document.documentElement).getPropertyValue('--display').trim();
    document.querySelectorAll('#fontChips button').forEach((b) => b.classList.toggle('on', b.dataset.f === k));
  }
  function initSettings() {
    const box = $('#settings');
    box.innerHTML = `<h4>Typeface</h4><div id="fontChips">${Object.entries(FONTS).map(([k, n]) => `<button data-f="${k}" data-font="${k}">${n}<small>Aa 123</small></button>`).join('')}</div>
      <h4>Soundtrack <span class="muted" id="nowPlaying"></span></h4><div class="set-row"><button id="musicBtn" class="btn small ghost">🎵 On</button><input type="range" id="musicVol" min="0" max="100" value="60"></div>
      <h4>Sound effects</h4><div class="set-row"><button id="sfxBtn" class="btn small ghost">🔊 On</button></div>`;
    let saved = 'studio'; try { saved = localStorage.getItem('uptime-font') || 'studio'; } catch (e) { /* ignore */ }
    setFont(FONTS[saved] ? saved : 'studio');
    document.querySelectorAll('.gearBtn').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); box.hidden = !box.hidden; $('#nowPlaying').textContent = '♪ ' + G.music.now(); G.music.start(); }));
    document.addEventListener('pointerdown', (e) => { G.music.start(); if (!box.hidden && !e.target.closest('#settings') && !e.target.closest('.gearBtn')) box.hidden = true; });
    box.onclick = (e) => {
      const f = e.target.closest('[data-f]'); if (f) { setFont(f.dataset.f); G.sound.click(); }
      if (e.target.id === 'musicBtn') { G.music.toggle(!G.music.on); e.target.textContent = G.music.on ? '🎵 On' : '🎵 Off'; }
      if (e.target.id === 'sfxBtn') { G.sound.on = !G.sound.on; e.target.textContent = G.sound.on ? '🔊 On' : '🔇 Off'; }
    };
    $('#musicVol').oninput = (e) => G.music.setVol(e.target.value / 100);
    $('#cast').innerHTML = ['maya', 'quack', 'viktor', 'zoe', 'nb'].map((k, i) => `<div class="cast-card"><div class="cast-face" style="border-color:${G.CHARS[k].color}">${G.portrait(k, ['excited', 'smug', 'neutral', 'happy', 'neutral'][i])}</div><b>${G.CHARS[k].name}</b><small>${G.CHARS[k].role}</small></div>`).join('');
  }

  // ───────── Wiring ─────────
  function init() {
    initTitle();
    setInterval(loop, 100);
    requestAnimationFrame(G.render.frame);
    window.addEventListener('resize', G.render.resize);
    $('#shop').onclick = (e) => { const b = e.target.closest('.buy'); if (b && !b.disabled) buy(b.dataset.id); };
    $('#codexBtn').onclick = () => { if (!busy || $('#modal').hidden) openCodex(); };
    initSettings();
    document.querySelectorAll('.speed button').forEach((b) => (b.onclick = () => { speed = +b.dataset.speed; document.querySelectorAll('.speed button').forEach((x) => x.classList.toggle('on', x === b)); }));
    const map = $('#map'), tip = $('#tooltip');
    map.onmousemove = (e) => {
      const r = map.getBoundingClientRect(), n = G.render.pick(e.clientX - r.left, e.clientY - r.top);
      if (!n) { tip.hidden = true; map.style.cursor = 'default'; return; }
      const s = G.state, known = n.concept && s.concepts.includes(n.concept);
      tip.hidden = false; tip.style.left = e.clientX - r.left + 14 + 'px'; tip.style.top = e.clientY - r.top + 14 + 'px'; map.style.cursor = known ? 'pointer' : 'default';
      tip.innerHTML = `<b>${n.name}</b><span>${n.blurb}</span>${n.util != null ? (s.arch.monitoring ? `<em>Load ${Math.round(n.util * 100)}%</em>` : '<em>Load: unknown (no monitoring)</em>') : ''}${known ? '<small>Click to open in Codex</small>' : ''}`;
    };
    map.onmouseleave = () => { tip.hidden = true; };
    map.onclick = (e) => { const r = map.getBoundingClientRect(), n = G.render.pick(e.clientX - r.left, e.clientY - r.top); if (n && n.concept && G.state.concepts.includes(n.concept) && !busy) openCodex(n.concept); };
  }
  G.ui = { toast, openCodex };
  init();
})();
