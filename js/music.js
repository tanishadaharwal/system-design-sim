// Generative soundtrack: a tiny step sequencer. Every chapter has its own key, tempo and groove;
// incidents cut to a tense track; the finale and endings have their own themes. No audio files.
(function () {
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
  // chords are MIDI notes; patterns are 16 steps per bar. arp digits index into the chord (wrapping up an octave).
  const T = {
    title: { name: 'Night Shift', bpm: 72, chords: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]], pad: 0.05, arp: '0...2...1...3.2.', arpVol: 0.04, bass: 'x...............', kick: '', hat: '' },
    ch0: { name: 'Garage Days', bpm: 84, chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], pad: 0.035, arp: '0..1..2.1..0..2.', arpVol: 0.045, bass: 'x..x..x...x.x...', kick: 'x.......x..x....', hat: '..x...x...x...x.' },
    ch1: { name: 'Term Sheet Shuffle', bpm: 96, chords: [[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]], pad: 0.03, arp: '0.1.2.1.3.2.1.2.', arpVol: 0.045, bass: 'x...x..x..x.x...', kick: 'x.....x.x.......', hat: '..x...x...x..xx.' },
    ch2: { name: 'Up and to the Right', bpm: 112, chords: [[64, 67, 71], [60, 64, 67], [55, 59, 62], [62, 66, 69]], pad: 0.028, arp: '0121021301210213', arpVol: 0.036, bass: 'x.x.x.x.x.x.x.xx', kick: 'x...x...x...x...', hat: '..x...x...x...xx' },
    ch3: { name: 'Five Nines', bpm: 100, chords: [[57, 60, 64, 67], [53, 57, 60, 64], [60, 64, 67, 71], [55, 59, 62, 65]], pad: 0.04, arp: '0.2.1.3.4.2.1.3.', arpVol: 0.04, bass: 'x.....x.x.....x.', kick: 'x.........x.....', hat: '....x.......x...' },
    ch4: { name: 'The Night Before', bpm: 120, chords: [[53, 57, 60], [55, 59, 62], [57, 60, 64], [60, 64, 67]], pad: 0.03, arp: '0.1.2.3.4.3.2.1.', arpVol: 0.04, bass: 'x.x...x.x.x...x.', kick: 'x...x...x...x.x.', hat: '..x...x...x...x.' },
    incident: { name: 'Pager Duty', bpm: 140, chords: [[62, 65, 69], [62, 65, 69], [58, 62, 65], [57, 61, 64]], pad: 0.02, arp: '0.0.1.0.2.0.1.0.', arpVol: 0.04, arpType: 'square', bass: 'xxxxxxxxxxxxxxxx', kick: 'x...x...x...x...', hat: 'x.x.x.x.x.x.x.xx' },
    finale: { name: 'Showtime', bpm: 128, chords: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]], pad: 0.03, arp: '0213021302130214', arpVol: 0.038, bass: 'x.xx.xx.x.xx.xx.', kick: 'x...x...x...x...', hat: 'x.x.x.x.x.x.x.x.' },
    win: { name: 'Nothing Happened', bpm: 88, chords: [[60, 64, 67, 72], [53, 57, 60, 65], [55, 59, 62, 67], [60, 64, 67, 72]], pad: 0.05, arp: '0.1.2.3.4.3.2.1.', arpVol: 0.05, bass: 'x.......x...x...', kick: 'x.......x.......', hat: '....x.......x...' },
    lose: { name: 'Postmortem', bpm: 60, chords: [[57, 60, 64], [52, 55, 59], [53, 57, 60], [52, 56, 59]], pad: 0.055, arp: '0.......2.......', arpVol: 0.04, bass: 'x...............', kick: '', hat: '' }
  };

  const Mu = G.music = { on: true, vol: 0.6, mood: null, next: 'title', step: 0, t: 0, timer: null, out: null, noise: null, tracks: T };

  function boot() {
    if (Mu.out) return true;
    try {
      G.sound.ctx = G.sound.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const c = G.sound.ctx;
      Mu.out = c.createGain(); Mu.out.gain.value = Mu.on ? Mu.vol : 0;
      Mu.lp = c.createBiquadFilter(); Mu.lp.type = 'lowpass'; Mu.lp.frequency.value = 2600;
      const d = c.createDelay(1); d.delayTime.value = 0.31; const fb = c.createGain(); fb.gain.value = 0.3; const wet = c.createGain(); wet.gain.value = 0.35;
      Mu.lp.connect(Mu.out); Mu.lp.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(Mu.out); Mu.out.connect(c.destination);
      const buf = c.createBuffer(1, c.sampleRate * 0.2, c.sampleRate), ch = buf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      Mu.noise = buf; return true;
    } catch (e) { return false; }
  }

  function note(freq, t, dur, vol, type = 'triangle', attack = 0.01) {
    const c = G.sound.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(Mu.lp); o.start(t); o.stop(t + dur + 0.05);
  }
  function kick(t) {
    const c = G.sound.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(Mu.out); o.start(t); o.stop(t + 0.2);
  }
  function hat(t) {
    const c = G.sound.ctx, s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    s.buffer = Mu.noise; f.type = 'highpass'; f.frequency.value = 7000;
    g.gain.setValueAtTime(0.035, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f).connect(g).connect(Mu.out); s.start(t); s.stop(t + 0.06);
  }

  function schedule() {
    const c = G.sound.ctx; if (!c || c.state !== 'running') return;
    if (Mu.t < c.currentTime) Mu.t = c.currentTime + 0.05;
    while (Mu.t < c.currentTime + 0.25) {
      // switch tracks on a bar line — except into/out of an incident, which cuts in immediately
      if (Mu.next !== Mu.mood && (Mu.step % 16 === 0 || Mu.next === 'incident' || Mu.mood === 'incident' || !Mu.mood)) { Mu.mood = Mu.next; Mu.step = 0; }
      const tr = T[Mu.mood], sp = 60 / tr.bpm / 4, s = Mu.step % 16, bar = Math.floor(Mu.step / 16) % tr.chords.length, ch = tr.chords[bar], t = Mu.t;
      if (s === 0) ch.forEach((n) => note(hz(n), t, sp * 17, tr.pad, 'sawtooth', sp * 3));
      if (tr.bass[s] === 'x') note(hz(ch[0] - 24), t, sp * 1.8, 0.11, 'sine');
      const a = tr.arp[s];
      if (a && a !== '.') { const k = +a; note(hz(ch[k % ch.length] + 12 * Math.floor(k / ch.length) + 12), t, sp * 2.4, tr.arpVol, tr.arpType || 'triangle'); }
      if (tr.kick[s] === 'x') kick(t);
      if (tr.hat[s] === 'x') hat(t);
      Mu.step++; Mu.t += sp;
    }
  }

  Mu.start = () => { if (!boot()) return; if (G.sound.ctx.state === 'suspended') G.sound.ctx.resume(); if (!Mu.timer) Mu.timer = setInterval(schedule, 60); };
  Mu.set = (mood) => { if (T[mood]) Mu.next = mood; };
  Mu.setVol = (v) => { Mu.vol = v; if (Mu.out) Mu.out.gain.setTargetAtTime(Mu.on ? v : 0, G.sound.ctx.currentTime, 0.1); };
  Mu.toggle = (on) => { Mu.on = on; Mu.setVol(Mu.vol); };
  Mu.now = () => (T[Mu.mood] || T.title).name;
})();
