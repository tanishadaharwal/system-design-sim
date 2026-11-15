// Illustrations, all vector: character portraits with expressions, a scene per chapter, incident banners.
(function () {
  const INK = '#1c1630', Y = '#ffd93b', CY = '#5ce1e6', RD = '#ff5470', GR = '#3ddc97', VI = '#9b8cff';
  const rnd = (n) => { const x = Math.sin(n * 91.7) * 43758.5; return x - Math.floor(x); };
  const r = (x, y, w, h, f, e = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${e}/>`;
  const c = (x, y, rad, f, e = '') => `<circle cx="${x}" cy="${y}" r="${rad}" fill="${f}" ${e}/>`;
  const p = (d, f, e = '') => `<path d="${d}" fill="${f}" ${e}/>`;
  const ln = (d, s, w = 2.4, e = '') => `<path d="${d}" stroke="${s}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round" ${e}/>`;

  // Eyes, brows and mouth for a mood. lx/rx = eye x positions, ey = eye y, my = mouth y.
  function face(mood, lx, rx, ey, my, o = {}) {
    const col = o.col || INK, mx = (lx + rx) / 2, by = ey - 9, bc = o.brow || col;
    let eyes = c(lx, ey, 3, col) + c(rx, ey, 3, col) + c(lx + 1, ey - 1, 1, '#fff') + c(rx + 1, ey - 1, 1, '#fff');
    if (mood === 'happy' && !o.glasses) eyes = ln(`M${lx - 4} ${ey + 1}q4 -5 8 0M${rx - 4} ${ey + 1}q4 -5 8 0`, col, 2.6);
    if (mood === 'excited') eyes = c(lx, ey, 4, col) + c(rx, ey, 4, col) + c(lx + 1.4, ey - 1.4, 1.5, '#fff') + c(rx + 1.4, ey - 1.4, 1.5, '#fff');
    const brows = {
      neutral: `M${lx - 5} ${by}h10M${rx - 5} ${by}h10`, smug: `M${lx - 5} ${by}h10M${rx - 5} ${by - 3}l10 1`,
      happy: `M${lx - 5} ${by - 1}q5 -3 10 0M${rx - 5} ${by - 1}q5 -3 10 0`, excited: `M${lx - 6} ${by - 3}q6 -4 11 0M${rx - 5} ${by - 3}q5 -4 11 0`,
      worried: `M${lx - 5} ${by + 2}l10 -4M${rx - 5} ${by - 2}l10 4`, angry: `M${lx - 5} ${by - 3}l10 4M${rx - 5} ${by + 1}l10 -4`
    }[mood] || `M${lx - 5} ${by}h10M${rx - 5} ${by}h10`;
    const mouth = {
      neutral: ln(`M${mx - 6} ${my + 2}h12`, col), smug: ln(`M${mx - 7} ${my + 2}q9 5 15 -4`, col),
      happy: ln(`M${mx - 8} ${my}q8 9 16 0`, col),
      excited: p(`M${mx - 9} ${my - 1}q9 15 18 0z`, col) + p(`M${mx - 5} ${my + 5}q5 4 10 0q-5 -3 -10 0z`, RD),
      worried: ln(`M${mx - 6} ${my + 5}q6 -6 12 0`, col), angry: ln(`M${mx - 7} ${my + 4}q7 -4 14 0`, col, 2.8)
    }[mood] || ln(`M${mx - 6} ${my + 2}h12`, col);
    const extra = mood === 'worried' ? p(`M${rx + 14} ${ey - 14}q5 8 0 11q-5 -3 0 -11z`, CY) : mood === 'angry' ? ln(`M${rx + 12} ${ey - 20}l5 5m0 -5l-5 5`, RD, 2.4) : '';
    return eyes + ln(brows, bc, 2.6) + mouth + extra;
  }
  const frame = (bg, halo) => r(0, 0, 120, 120, bg, 'rx="18"') + c(60, 52, 44, halo) + c(96, 20, 5, halo, 'opacity=".7"') + c(18, 96, 8, halo, 'opacity=".5"');

  const PORTRAITS = {
    maya: (m) => frame('#2a2350', '#3b3178') +
      p('M16 120c0-27 18-40 44-40s44 13 44 40z', Y) + p('M48 82l12 22 12-22z', '#fff5d6') + p('M40 84l10 30h-14zM80 84l-10 30h14z', '#e0b820') +
      r(52, 66, 16, 20, '#a9683f') + '<ellipse cx="60" cy="50" rx="23" ry="26" fill="#c68658"/>' + c(37, 54, 4, '#c68658') + c(83, 54, 4, '#c68658') +
      c(37, 60, 2.2, CY) + c(83, 60, 2.2, CY) + c(46, 60, 5, RD, 'opacity=".22"') + c(74, 60, 5, RD, 'opacity=".22"') +
      p('M35 52c-5-31 13-40 27-40 17 0 29 12 23 40-4-14-11-22-24-25-11 2-21 9-26 25z', INK) + c(60, 13, 10, INK) + ln('M50 22q8 -6 18 -2', '#4a3f7a', 2) +
      face(m, 51, 69, 52, 63),
    viktor: (m) => frame('#1d2440', '#2a3560') +
      p('M14 120c0-26 20-38 46-38s46 12 46 38z', '#2f3a66') + p('M50 82l10 18 10-18z', '#e8ecf8') + p('M57 92h6l3 20-6 6-6-6z', VI) + p('M42 84l10 26-16 2zM78 84l-10 26 16 2z', '#232c52') +
      r(52, 68, 16, 18, '#d9a886') + '<ellipse cx="60" cy="50" rx="22" ry="26" fill="#eec0a0"/>' + c(38, 53, 4, '#eec0a0') + c(82, 53, 4, '#eec0a0') +
      p('M38 46c-2-20 9-27 22-27s24 7 22 27c-5-10-10-13-22-13s-17 3-22 13z', '#b9bdd0') + p('M38 46q-3 8 0 14l3-12zM82 46q3 8 0 14l-3-12z', '#b9bdd0') +
      face(m, 50, 70, 52, 65, { glasses: true, brow: '#8a8fa8' }) +
      r(41, 45, 17, 13, 'none', `rx="4" stroke="${INK}" stroke-width="2.4"`) + r(62, 45, 17, 13, 'none', `rx="4" stroke="${INK}" stroke-width="2.4"`) + ln('M58 51h4', INK),
    zoe: (m) => frame('#10343a', '#17505a') +
      p('M16 120c0-26 20-38 44-38s44 12 44 38z', GR) + p('M48 84q12 12 24 0l-4 14h-16z', '#2bb37a') + ln('M54 96v14M66 96v14', '#eafff5', 2) +
      r(52, 68, 16, 18, '#e2ae88') + '<ellipse cx="60" cy="50" rx="22" ry="25" fill="#f3c8a5"/>' +
      c(47, 60, 5, RD, 'opacity=".25"') + c(73, 60, 5, RD, 'opacity=".25"') + c(47, 58, 0.9, '#b9805a') + c(51, 60, 0.9, '#b9805a') + c(70, 59, 0.9, '#b9805a') + c(74, 58, 0.9, '#b9805a') +
      p('M35 60c-7-36 12-46 25-46s32 10 25 46c-2-15-6-24-10-28-9 6-23 8-33 6-4 5-6 13-7 22z', CY) + ln('M46 24q10 -6 22 -2', '#b4f6f8', 2) +
      ln('M35 50a25 25 0 0 1 50 0', INK, 4) + r(29, 46, 10, 17, INK, 'rx="5"') + r(81, 46, 10, 17, INK, 'rx="5"') + ln('M34 63q2 13 17 13', INK, 2.5) + c(52, 76, 3, INK) +
      face(m, 51, 69, 51, 63),
    nb: (m) => r(0, 0, 120, 120, '#16060c', 'rx="18"') +
      [0, 1, 2, 3, 4, 5, 6].map((i) => r(8 + rnd(i) * 80, 10 + i * 15, 12 + rnd(i + 3) * 30, 2.5, RD, `opacity="${0.12 + rnd(i + 7) * 0.3}"`)).join('') +
      p('M8 120c0-42 20-98 52-98s52 56 52 98z', '#2a0f18') + p('M24 120c2-40 16-84 36-84s34 44 36 84z', '#3a1422') +
      '<ellipse cx="60" cy="62" rx="24" ry="28" fill="#0a0306"/>' +
      (m === 'happy' ? ln('M42 58q6 -7 12 0M66 58q6 -7 12 0', RD, 3) + ln('M48 74q12 9 24 0', RD, 2.4) : r(42, 54, 12, 4, RD) + r(66, 54, 12, 4, RD) + ln('M48 76h6v-3h6v3h6v-3h6', RD, 2)) +
      ln('M46 100l-8 20M74 100l8 20', '#1a0810', 3),
    quack: (m) => frame('#0f2f4a', '#16466b') + r(0, 104, 120, 16, '#0b2237', 'rx="0"') +
      '<ellipse cx="58" cy="88" rx="38" ry="23" fill="#ffd93b"/>' + '<ellipse cx="58" cy="96" rx="30" ry="12" fill="#f0c520"/>' + p('M22 78q-8 -10 4 -12q4 8 10 10z', Y) +
      c(62, 48, 26, Y) + p('M56 23q4 -10 10 -2q4 -6 6 2z', '#f0c520') + c(46, 56, 5, RD, 'opacity=".2"') +
      (m === 'excited' ? p('M82 46q20 -4 22 2l-22 4zM82 54l22 -2q-2 9 -22 6z', RD) : p('M82 48c14-3 22 1 22 5s-10 8-22 4z', RD) + ln('M84 53h16', '#c93550', 1.6)) +
      c(56, 42, 9, 'rgba(255,255,255,.15)', `stroke="${INK}" stroke-width="2.6"`) + c(77, 42, 9, 'rgba(255,255,255,.15)', `stroke="${INK}" stroke-width="2.6"`) + ln('M65 42h3', INK, 2.6) +
      (m === 'worried' ? c(57, 44, 2.6, INK) + c(76, 44, 2.6, INK) + ln('M50 30l10 -3M72 27l10 3', INK) + p('M92 22q5 8 0 11q-5 -3 0 -11z', CY)
        : m === 'excited' ? c(57, 42, 3.4, INK) + c(77, 42, 3.4, INK) + c(58, 41, 1.2, '#fff') + c(78, 41, 1.2, '#fff')
        : p('M51 42h10q-5 5 -10 0zM72 42h10q-5 5 -10 0z', INK) + ln('M50 30h11M72 28l10 2', INK)) +
      ln('M30 88q10 11 26 5', '#e0b820', 3),
    pager: () => r(0, 0, 120, 120, '#2a0b14', 'rx="18"') + c(60, 60, 50, '#3a0f1c') +
      r(22, 34, 76, 54, INK, `rx="10" stroke="${RD}" stroke-width="3"`) + r(32, 44, 56, 22, RD, 'rx="3"') +
      `<text x="60" y="61" font-family="monospace" font-size="15" font-weight="700" text-anchor="middle" fill="#16060c">ALERT</text>` +
      c(38, 77, 4, RD) + c(52, 77, 4, '#5a2030') + r(66, 74, 22, 6, '#5a2030', 'rx="3"') + ln('M12 28q-7 9 0 20M108 28q7 9 0 20M4 22q-10 14 0 32M116 22q10 14 0 32', RD, 3)
  };

  // Guess a mood from who is speaking and what they say, so the script doesn't need tagging.
  const mood = (who, t) => {
    if (who === 'maya') return /!!|[A-Z]{5,}/.test(t) ? 'excited' : /\?\?|freez|loading|ran out|Is it us/.test(t) ? 'worried' : 'happy';
    if (who === 'zoe') return /lovely|compliment|Hi!/.test(t) ? 'happy' : 'worried';
    if (who === 'viktor') return /outage|NEWS|charged twice|invoice|last one/.test(t) ? 'angry' : /wiring|go public|Interesting/.test(t) ? 'smug' : 'neutral';
    if (who === 'quack') return /dreading|Disk died|Hmm|Ooh/.test(t) ? 'worried' : /insane|Fun fact|First decision/.test(t) ? 'excited' : 'smug';
    if (who === 'nb') return /don’t panic|found a real one|less fun/.test(t) ? 'happy' : 'neutral';
    return 'neutral';
  };
  G.portrait = (id, m) => `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">${(PORTRAITS[id] || PORTRAITS.pager)(m || (id === 'quack' ? 'smug' : id === 'maya' ? 'happy' : 'neutral'))}</svg>`;

  // ───── Scenes (800 × 340) ─────
  const stars = (n, seed, h = 150) => Array.from({ length: n }, (_, i) => c((rnd(i + seed) * 800).toFixed(0), (rnd(i * 3 + seed) * h).toFixed(0), (rnd(i * 7 + seed) * 1.4 + 0.4).toFixed(1), '#cfd8ff', `opacity="${(0.3 + rnd(i + 5) * 0.6).toFixed(2)}"`)).join('');
  const skyline = (y, seed, col, lit) => Array.from({ length: 26 }, (_, i) => { const w = 22 + rnd(i + seed) * 30, h = 30 + rnd(i * 2 + seed) * 110, x = i * 32 - 10; return r(x.toFixed(0), (y - h).toFixed(0), w.toFixed(0), h.toFixed(0), col) + Array.from({ length: Math.floor(h / 16) }, (_, k) => (rnd(i * 9 + k + seed) > 0.5 ? r((x + 5 + (k % 2) * 9).toFixed(0), (y - h + 7 + k * 14).toFixed(0), 4, 6, lit, 'opacity=".7"') : '')).join(''); }).join('');
  const duck = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="8" rx="14" ry="9" fill="${Y}"/><circle cx="6" cy="-4" r="9" fill="${Y}"/><path d="M13 -4q9 -1 9 2t-9 2z" fill="${RD}"/><circle cx="8" cy="-6" r="1.6" fill="${INK}"/></g>`;
  const monitor = (x, y, w, glow, lines = 4) => r(x, y, w, w * 0.62, '#0a0f1f', 'rx="4"') + r(x + 3, y + 3, w - 6, w * 0.62 - 6, glow, 'rx="2" opacity=".9"') + Array.from({ length: lines }, (_, i) => r(x + 7, y + 8 + i * (w * 0.1), (w - 14) * (0.4 + rnd(i + x) * 0.6), 2.5, '#0a0f1f', 'opacity=".55"')).join('') + r(x + w / 2 - 3, y + w * 0.62, 6, 8, '#0a0f1f') + r(x + w / 2 - 12, y + w * 0.62 + 8, 24, 3, '#0a0f1f');
  const person = (x, y, hoodie, hair) => p(`M${x - 24} ${y + 60}c0-30 8-44 24-44s24 14 24 44z`, hoodie) + c(x, y, 15, hair) + r(x - 30, y + 54, 60, 8, '#0a0f1f', 'rx="4"');

  const SCENES = [
    // 1 — The Garage
    (co) => r(0, 0, 800, 340, '#141b38') + r(0, 250, 800, 90, '#0e1430') +
      Array.from({ length: 9 }, (_, i) => r(30, 36 + i * 22, 220, 18, i % 2 ? '#1d2750' : '#212c5a', 'rx="2"')).join('') + r(24, 30, 232, 210, 'none', 'stroke="#2e3a70" stroke-width="6" rx="4"') + r(130, 228, 20, 8, '#3a4780', 'rx="2"') +
      p('M560 0l-70 250h220l-70-250z', Y, 'opacity=".08"') + ln('M600 0v48', '#3a4780', 2) + c(600, 58, 12, Y) + c(600, 58, 26, Y, 'opacity=".18"') +
      r(660, 60, 110, 130, '#1d2750', 'rx="4"') + Array.from({ length: 12 }, (_, i) => c(676 + (i % 4) * 26, 78 + Math.floor(i / 4) * 34, 2, '#3a4780')).join('') + ln('M678 100l18 22M704 96v30M736 100q10 14 0 28', '#7f8bb3', 4) +
      r(300, 70, 120, 78, '#f4ecd8', 'rx="3" transform="rotate(-3 360 110)"') + `<text x="360" y="104" font-family="monospace" font-weight="700" font-size="20" text-anchor="middle" fill="${INK}" transform="rotate(-3 360 110)">SHIP IT</text><text x="360" y="128" font-family="monospace" font-size="11" text-anchor="middle" fill="#7f8bb3" transform="rotate(-3 360 110)">${co} · est. today</text>` +
      r(380, 212, 330, 14, '#8a6842', 'rx="3"') + r(396, 226, 12, 70, '#6b4f30') + r(682, 226, 12, 70, '#6b4f30') +
      monitor(500, 130, 120, CY, 5) + duck(660, 196, 1.1) + r(430, 192, 22, 20, '#e8ecf8', 'rx="3"') + ln('M452 197q10 4 0 10', '#e8ecf8', 3) + ln('M436 186q3 -6 0 -10M444 186q3 -6 0 -10', '#7f8bb3', 2) +
      person(560, 196, '#3a4a86', INK) +
      r(730, 180, 50, 116, '#d9d2bd', 'rx="4"') + r(738, 190, 34, 6, '#a9a38f') + r(738, 202, 34, 6, '#a9a38f') + c(744, 280, 4, GR) + c(744, 280, 9, GR, 'opacity=".25"') + ln('M730 260q-30 20 -60 -30', '#0a0f1f', 3) +
      r(60, 262, 70, 54, '#a9825a') + r(60, 262, 70, 10, '#8a6842') + r(118, 286, 60, 44, '#b9926a') + r(118, 286, 60, 8, '#8a6842') + `<text x="95" y="298" font-family="monospace" font-size="10" text-anchor="middle" fill="#6b4f30">STUFF</text>`,
    // 2 — Product–Market Fit
    (co) => r(0, 0, 800, 340, '#18203f') + r(0, 262, 800, 78, '#10172f') +
      r(40, 30, 470, 190, '#0b1228', 'rx="6"') + `<svg x="40" y="30" width="470" height="190" viewBox="0 0 800 300" preserveAspectRatio="xMidYMax slice">${skyline(300, 4, '#141d40', Y)}</svg>` +
      `<g transform="translate(250 78)"><ellipse cx="0" cy="0" rx="74" ry="26" fill="#e8ecf8"/><ellipse cx="0" cy="-6" rx="60" ry="14" fill="#fff" opacity=".5"/><path d="M-74 0l-22 -14v28z" fill="${RD}"/><rect x="-18" y="24" width="36" height="10" rx="4" fill="#7f8bb3"/><text x="0" y="6" font-family="sans-serif" font-weight="800" font-size="17" text-anchor="middle" fill="${INK}">${co}</text></g>` +
      ln('M40 125h470M275 30v190', '#2e3a70', 5) + r(36, 26, 478, 198, 'none', 'stroke="#2e3a70" stroke-width="8" rx="6"') +
      r(560, 50, 200, 130, '#f4f6ff', 'rx="5"') + ln('M580 160l40 -20 34 8 40 -44 46 -36', GR, 5) + p('M740 68l-22 2 16 16z', GR) + ln('M580 70v94h166', '#7f8bb3', 2) + `<text x="660" y="64" font-family="monospace" font-size="11" text-anchor="middle" fill="#7f8bb3">USERS ↗</text>` +
      r(90, 240, 280, 12, '#8a6842', 'rx="3"') + r(104, 252, 10, 60, '#6b4f30') + r(346, 252, 10, 60, '#6b4f30') + monitor(130, 176, 96, CY) + monitor(240, 176, 96, VI) + duck(220, 232, 0.8) +
      r(450, 240, 280, 12, '#8a6842', 'rx="3"') + r(464, 252, 10, 60, '#6b4f30') + r(706, 252, 10, 60, '#6b4f30') + monitor(490, 176, 96, GR) + monitor(600, 176, 96, Y) +
      r(752, 236, 30, 40, '#a9683f', 'rx="4"') + p('M767 236q-26 -40 -6 -70q8 30 6 70zM767 236q24 -30 12 -62q-12 24 -12 62zM767 236q-6 -50 14 -80q2 40 -14 80z', GR),
    // 3 — Hypergrowth
    (co) => r(0, 0, 800, 340, '#161d3c') + r(0, 250, 800, 90, '#0e1430') +
      r(200, 24, 400, 150, '#0a0f1f', 'rx="8"') + r(208, 32, 384, 134, '#101a3a', 'rx="4"') + ln('M228 150q120 -4 200 -50t140 -62', Y, 5) + p('M560 22l34 12-28 18z', Y) +
      `<g transform="translate(540 54) rotate(38)"><path d="M0 -22q12 10 12 30h-24q0-20 12-30z" fill="#e8ecf8"/><circle cx="0" cy="-2" r="4" fill="${CY}"/><path d="M-12 8l-8 10h8zM12 8l8 10h-8z" fill="${RD}"/><path d="M-6 10q6 22 12 0z" fill="${Y}"/></g>` +
      `<text x="232" y="64" font-family="monospace" font-weight="700" font-size="26" fill="#e8ecf8">100,000</text><text x="232" y="84" font-family="monospace" font-size="12" fill="${GR}">▲ users · ${co}</text>` +
      Array.from({ length: 26 }, (_, i) => r((rnd(i) * 780).toFixed(0), (rnd(i + 9) * 230).toFixed(0), 6, 10, [Y, CY, RD, GR, VI][i % 5], `transform="rotate(${(rnd(i + 2) * 180).toFixed(0)} ${(rnd(i) * 780).toFixed(0)} ${(rnd(i + 9) * 230).toFixed(0)})" opacity=".8"`)).join('') +
      [0, 1, 2, 3, 4, 5].map((i) => { const x = 30 + i * 130, y = 210 + (i % 2) * 26; return r(x - 10, y + 62, 120, 10, '#8a6842', 'rx="3"') + monitor(x + 6, y, 84, [CY, VI, GR, Y, CY, RD][i]) + person(x + 48, y + 66, ['#3a4a86', '#8a2b45', '#2f9c79', '#5a4aa8', '#8f7a16', '#3a4a86'][i], [INK, '#6b4f30', INK, '#b9805a', INK, '#6b4f30'][i]); }).join('') +
      r(690, 150, 70, 10, '#b9926a') + r(694, 140, 62, 10, '#a9825a') + r(698, 130, 54, 10, '#b9926a') + `<text x="725" y="158" font-family="monospace" font-size="7" text-anchor="middle" fill="#6b4f30">PIZZA</text>` + duck(60, 180, 0.9),
    // 4 — The Big Leagues
    (co) => r(0, 0, 800, 340, '#0b1024') + p('M0 340l300 -150h200l300 150z', '#111936') + ln('M400 190v150M330 190l-180 150M470 190l180 150', '#1c2750', 2) +
      [0, 1, 2, 3].map((i) => { const x = i * 74, w = 70 - i * 8, top = 20 + i * 34, h = 300 - i * 52; const rack = (X) => r(X, top, w, h, '#161f42', 'rx="3"') + Array.from({ length: 8 }, (_, k) => r(X + 5, top + 8 + k * (h / 9), w - 10, h / 14, '#0d1430', 'rx="1"') + c(X + 10, top + 8 + k * (h / 9) + h / 28, 1.8, [GR, GR, Y, GR, CY, GR, RD, GR][(k + i) % 8]) + c(X + 17, top + 8 + k * (h / 9) + h / 28, 1.8, GR, 'opacity=".5"')).join(''); return rack(x + i * 6) + rack(800 - x - i * 6 - w); }).join('') +
      c(400, 132, 78, CY, 'opacity=".07"') + c(400, 132, 60, '#0f2b4a', `stroke="${CY}" stroke-width="2"`) + ln('M340 132h120M400 72v120', CY, 1.2, 'opacity=".5"') + `<ellipse cx="400" cy="132" rx="26" ry="60" fill="none" stroke="${CY}" stroke-width="1.2" opacity=".5"/><ellipse cx="400" cy="132" rx="60" ry="24" fill="none" stroke="${CY}" stroke-width="1.2" opacity=".5"/>` +
      ln('M368 112q30 -34 62 6', Y, 2.5, 'stroke-dasharray="4 5"') + c(368, 112, 5, Y) + c(430, 118, 5, Y) + c(368, 112, 11, Y, 'opacity=".25"') + c(430, 118, 11, Y, 'opacity=".25"') + c(390, 160, 4, RD) +
      `<text x="400" y="226" font-family="monospace" font-size="12" text-anchor="middle" fill="${CY}">${co} · 2 regions · 99.99%</text>` + duck(400, 290, 1.3),
    // 5 — Legend
    (co) => r(0, 0, 800, 340, '#090d1f') + stars(50, 11, 120) +
      [[140, -18], [400, 0], [660, 18]].map(([x, a]) => p(`M${x} 0l-70 260h140z`, [VI, Y, CY][(x / 260) | 0], `opacity=".13" transform="rotate(${a} ${x} 0)"`)).join('') +
      r(230, 40, 340, 170, '#0a0f1f', 'rx="10"') + r(240, 50, 320, 150, '#16204a', 'rx="6"') + c(400, 112, 40, Y) + `<text x="400" y="128" font-family="sans-serif" font-weight="800" font-size="46" text-anchor="middle" fill="${INK}">${(co[0] || 'U').toUpperCase()}</text><text x="400" y="182" font-family="monospace" font-weight="700" font-size="16" text-anchor="middle" fill="#e8ecf8">TONIGHT · LIVE</text>` +
      r(90, 226, 620, 22, '#1c2750', 'rx="4"') + r(110, 248, 580, 14, '#111936') +
      [[70, 40], [730, 60], [120, 90], [690, 24]].map(([x, y], i) => Array.from({ length: 8 }, (_, k) => ln(`M${x} ${y}l${Math.cos(k * 0.785) * 16} ${Math.sin(k * 0.785) * 16}`, [RD, Y, CY, GR][i], 2.5)).join('')).join('') +
      Array.from({ length: 34 }, (_, i) => { const x = i * 24 + rnd(i) * 10, h = 40 + rnd(i + 4) * 34, y = 340 - h; return c(x, y, 11, '#05070f') + r(x - 13, y + 8, 26, h, '#05070f', 'rx="10"') + (rnd(i + 20) > 0.55 ? r(x + 8, y - 22, 7, 12, '#e8ecf8', 'rx="2"') + r(x + 9, y - 21, 5, 8, CY) + ln(`M${x + 8} ${y + 14}l3 -24`, '#05070f', 5) : ''); }).join('') + duck(620, 212, 1)
  ];
  const BANNERS = {
    fire: () => r(0, 0, 800, 120, '#2a0b14') + Array.from({ length: 7 }, (_, i) => r(60 + i * 100, 18, 80, 102, '#1a0810', 'rx="4"') + Array.from({ length: 5 }, (_, k) => r(68 + i * 100, 28 + k * 18, 64, 10, '#2a0f18') + c(74 + i * 100, 33 + k * 18, 2.2, (i + k) % 3 ? RD : Y)).join('')).join('') +
      [260, 360, 460].map((x, i) => p(`M${x} 30q-22 -30 0 -52q4 18 16 22q-6 -22 10 -34q14 30 4 64z`, i === 1 ? Y : RD, 'opacity=".9"') + c(x + 6, -6, 22, '#7f8bb3', 'opacity=".25"')).join('') + c(40, 26, 12, RD) + c(40, 26, 26, RD, 'opacity=".25"') + c(760, 26, 12, RD) + c(760, 26, 26, RD, 'opacity=".25"'),
    hack: () => r(0, 0, 800, 120, '#0a0306') + Array.from({ length: 40 }, (_, i) => `<text x="${i * 20 + 4}" y="${20 + rnd(i) * 90}" font-family="monospace" font-size="11" fill="${RD}" opacity="${0.15 + rnd(i + 3) * 0.5}">${['0x3F', '\' OR 1=1', 'sudo', '401', 'root', '::', 'nb', '░░'][i % 8]}</text>`).join('') +
      p('M330 120c0-60 30-104 70-104s70 44 70 104z', '#2a0f18') + '<ellipse cx="400" cy="70" rx="30" ry="34" fill="#0a0306"/>' + r(380, 62, 14, 5, RD) + r(406, 62, 14, 5, RD) + r(352, 100, 96, 20, '#1c1630', 'rx="3"') + c(400, 110, 4, RD),
    region: () => r(0, 0, 800, 120, '#0b1024') + stars(30, 5, 110) + c(400, 150, 130, '#0f2b4a', `stroke="${CY}" stroke-width="2"`) + `<ellipse cx="400" cy="150" rx="60" ry="130" fill="none" stroke="${CY}" opacity=".4"/>` + ln('M280 100h240M290 60h220', CY, 1, 'opacity=".4"') +
      c(350, 70, 26, RD, 'opacity=".25"') + c(350, 70, 8, RD) + ln('M338 58l24 24M362 58l-24 24', '#fff', 3) + c(460, 84, 6, '#3a4780') + ln('M350 70q60 -50 110 14', '#3a4780', 2, 'stroke-dasharray="3 6"')
  };
  const svg = (w, h, body) => `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
  G.art = {
    mood,
    scene: (n, co) => svg(800, 340, SCENES[n](String(co || 'UPTIME').replace(/[<&>]/g, ''))),
    banner: (k) => svg(800, 120, (BANNERS[k] || BANNERS.fire)()),
    ending: (good) => svg(800, 260, r(0, 0, 800, 260, good ? '#2a2350' : '#0b1024') + (good ? c(400, 250, 150, Y, 'opacity=".25"') + c(400, 250, 90, Y, 'opacity=".5"') + c(400, 250, 50, '#fff5d6') : stars(40, 9, 140) + Array.from({ length: 40 }, (_, i) => ln(`M${rnd(i) * 800} ${rnd(i + 2) * 200}l-6 18`, '#5c6a9c', 1.5, 'opacity=".5"')).join('')) + skyline(260, 6, good ? '#1c1630' : '#141d40', good ? Y : '#3a4780') + r(330, 196, 140, 10, '#8a6842', 'rx="3"') + duck(400, 180, 1.4) + (good ? ln('M388 150q12 -14 24 0', RD, 3) : ''))
  };
})();
