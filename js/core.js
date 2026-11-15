// Shared namespace, helpers, characters, sound.
window.G = {};

G.$ = (s) => document.querySelector(s);
G.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
G.fmt = (n) => {
  n = Math.round(n);
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
  if (a >= 1e4) return (n / 1e3).toFixed(0) + 'k';
  if (a >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return '' + n;
};
G.money = (n) => (n < 0 ? '-$' : '$') + G.fmt(Math.abs(n));

G.SCENARIOS = {
  shop: {
    name: 'Online marketplace', co: 'Bazaaro', icon: '🛍️', unit: 'Orders', verb: 'orders',
    pitch: 'Sell everything to everyone. Carts, payments, inventory, search, flash sales.',
    covers: ['Transactions & inventory locks', 'Search index', 'Flash-sale queues', 'Recommendations + A/B tests'],
    why: 'The classic. Touches nearly every concept in the book — best first run.'
  },
  ride: {
    name: 'Ride-hailing app', co: 'Hopp', icon: '🚕', unit: 'Rides', verb: 'rides',
    pitch: 'Match riders and drivers in real time. Live maps, surge nights, double-dispatch.',
    covers: ['Geospatial indexes', 'Live location over WebSockets', 'Dispatch races', 'New-Year’s-Eve surges'],
    why: 'Real-time and location-heavy. Same backbone, sharper edges.'
  }
};

// Text can be a string or [shopText, rideText]. {co} is the company name.
G.tx = (x) => {
  if (Array.isArray(x)) x = x[G.state && G.state.scenario === 'ride' ? 1 : 0];
  if (typeof x === 'function') x = x(G.state);
  return String(x).replace(/\{co\}/g, G.state ? G.state.co : 'us');
};

// ---------- Characters ----------
G.CHARS = {
  maya:   { name: 'Maya', role: 'CEO & co-founder', color: '#ffd93b' },
  quack:  { name: 'Quack', role: 'Rubber duck. Senior.', color: '#5ce1e6' },
  viktor: { name: 'Viktor', role: 'Investor', color: '#9b8cff' },
  zoe:    { name: 'Zoe', role: 'Customer support', color: '#3ddc97' },
  nb:     { name: 'nullbyte', role: 'Unknown sender', color: '#ff5470' },
  pager:  { name: 'PAGER', role: 'It never sleeps', color: '#ff5470' }
};

G.portrait = (id) => {
  const bg = (c) => `<rect width="120" height="120" rx="18" fill="${c}"/>`;
  const P = {
    maya: `${bg('#2a2350')}<path d="M22 120c0-26 16-40 38-40s38 14 38 40z" fill="#ffd93b"/><rect x="52" y="66" width="16" height="20" fill="#b5754d"/><ellipse cx="60" cy="50" rx="23" ry="26" fill="#c68658"/><path d="M36 50c-4-30 14-38 26-38 16 0 28 12 23 40-4-14-12-22-24-24-10 2-20 8-25 22z" fill="#1c1630"/><circle cx="60" cy="14" r="10" fill="#1c1630"/><circle cx="51" cy="52" r="2.6" fill="#1c1630"/><circle cx="69" cy="52" r="2.6" fill="#1c1630"/><path d="M51 63q9 8 18 0" stroke="#1c1630" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    viktor: `${bg('#1d2440')}<path d="M18 120c0-26 18-38 42-38s42 12 42 38z" fill="#2f3a66"/><path d="M52 82l8 14 8-14z" fill="#e8ecf8"/><path d="M58 90h4l2 20-4 5-4-5z" fill="#9b8cff"/><rect x="52" y="68" width="16" height="18" fill="#e0b08f"/><ellipse cx="60" cy="50" rx="22" ry="26" fill="#eec0a0"/><path d="M38 44c0-18 10-24 22-24s22 6 22 24c-6-8-12-10-22-10s-16 2-22 10z" fill="#b9bdd0"/><rect x="42" y="46" width="15" height="11" rx="3" fill="none" stroke="#1c1630" stroke-width="2.4"/><rect x="63" y="46" width="15" height="11" rx="3" fill="none" stroke="#1c1630" stroke-width="2.4"/><path d="M57 51h6" stroke="#1c1630" stroke-width="2.4"/><path d="M52 66h16" stroke="#1c1630" stroke-width="2.4" stroke-linecap="round"/>`,
    zoe: `${bg('#10343a')}<path d="M20 120c0-26 18-38 40-38s40 12 40 38z" fill="#3ddc97"/><rect x="52" y="68" width="16" height="18" fill="#e9b792"/><ellipse cx="60" cy="50" rx="22" ry="25" fill="#f3c8a5"/><path d="M36 56c-6-34 12-42 24-42s30 8 24 42c-2-14-6-22-10-26-8 6-22 8-32 6-3 5-5 12-6 20z" fill="#5ce1e6"/><path d="M36 50a24 24 0 0 1 48 0" stroke="#1c1630" stroke-width="4" fill="none"/><rect x="30" y="46" width="9" height="16" rx="4" fill="#1c1630"/><path d="M34 62q2 12 18 12" stroke="#1c1630" stroke-width="2.5" fill="none"/><circle cx="52" cy="52" r="2.6" fill="#1c1630"/><circle cx="69" cy="52" r="2.6" fill="#1c1630"/><path d="M54 63q6 5 13 0" stroke="#1c1630" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    nb: `${bg('#16060c')}<path d="M10 120c0-40 20-96 50-96s50 56 50 96z" fill="#2a0f18"/><ellipse cx="60" cy="62" rx="24" ry="28" fill="#0a0306"/><rect x="42" y="54" width="12" height="4" fill="#ff5470"/><rect x="66" y="54" width="12" height="4" fill="#ff5470"/><path d="M48 76h6v-3h6v3h6v-3h6" stroke="#ff5470" stroke-width="2" fill="none"/><rect x="14" y="30" width="22" height="3" fill="#ff5470" opacity=".5"/><rect x="88" y="92" width="18" height="3" fill="#ff5470" opacity=".5"/>`,
    quack: `${bg('#0f2f4a')}<ellipse cx="60" cy="86" rx="38" ry="24" fill="#ffd93b"/><circle cx="62" cy="48" r="26" fill="#ffd93b"/><path d="M82 50c14-2 22 2 22 6s-10 8-22 4z" fill="#ff5470"/><circle cx="56" cy="42" r="8" fill="none" stroke="#1c1630" stroke-width="2.6"/><circle cx="76" cy="42" r="8" fill="none" stroke="#1c1630" stroke-width="2.6"/><path d="M64 42h4" stroke="#1c1630" stroke-width="2.6"/><circle cx="57" cy="43" r="2.6" fill="#1c1630"/><circle cx="75" cy="43" r="2.6" fill="#1c1630"/><path d="M28 84q10 12 26 6" stroke="#e0b820" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    pager: `${bg('#2a0b14')}<rect x="22" y="34" width="76" height="54" rx="10" fill="#1c1630" stroke="#ff5470" stroke-width="3"/><rect x="32" y="44" width="56" height="22" rx="3" fill="#ff5470"/><text x="60" y="61" font-family="monospace" font-size="15" font-weight="700" text-anchor="middle" fill="#16060c">ALERT</text><circle cx="38" cy="77" r="4" fill="#ff5470"/><circle cx="52" cy="77" r="4" fill="#5a2030"/><path d="M12 28q-6 8 0 18M108 28q6 8 0 18" stroke="#ff5470" stroke-width="3" fill="none" stroke-linecap="round"/>`
  };
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">${P[id] || P.pager}</svg>`;
};

// ---------- Sound (tiny WebAudio synth) ----------
G.sound = {
  on: true, ctx: null,
  tone(freq, dur, type = 'sine', vol = 0.06, when = 0) {
    if (!this.on) return;
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + dur);
    } catch (e) { /* audio unavailable */ }
  },
  click() { this.tone(520, 0.05, 'triangle', 0.04); },
  alarm() { for (let i = 0; i < 4; i++) { this.tone(880, 0.14, 'square', 0.05, i * 0.3); this.tone(660, 0.14, 'square', 0.05, i * 0.3 + 0.15); } },
  good() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.06, i * 0.09)); },
  bad() { [300, 220, 160].forEach((f, i) => this.tone(f, 0.25, 'sawtooth', 0.05, i * 0.14)); },
  buy() { this.tone(660, 0.08, 'triangle', 0.05); this.tone(990, 0.12, 'triangle', 0.05, 0.08); },
  unlock() { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.06, i * 0.1)); }
};
