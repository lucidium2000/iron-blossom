/* Iron Blossom — procedural audio.
   Everything here is synthesised at runtime: no sample files ship with the game.
   A lookahead scheduler walks 16th-note grids and fires voices built from
   oscillators, noise buffers and a waveshaper for the dirty guitar tone. */
window.IB = window.IB || {};
(function (IB) {
  'use strict';

  const A = {
    ctx: null,
    ready: false,
    musicOn: true,
    sfxOn: true,
    musicVol: 0.275,   // music sits under the fight, not over it
    sfxVol: 0.7,
    track: null,
    _nextNote: 0,
    _step: 0,
    _timer: null,
    _noise: null,
    _shaper: null,
    _bus: {},
  };

  const LOOKAHEAD = 0.12;   // seconds of notes scheduled ahead of the clock
  const TICK = 25;          // scheduler interval, ms

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  A.mtof = mtof;

  /* ---------------------------------------------------------------- setup */

  A.init = function () {
    if (A.ctx) {
      if (A.ctx.state === 'suspended') A.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = (A.ctx = new Ctx());

    // master chain: bus -> compressor -> master -> out
    const master = ctx.createGain();
    master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 24;
    comp.ratio.value = 6;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    comp.connect(master);
    master.connect(ctx.destination);

    const music = ctx.createGain();
    music.gain.value = A.musicVol;
    music.connect(comp);

    const sfx = ctx.createGain();
    sfx.gain.value = A.sfxVol;
    sfx.connect(comp);

    // Cheap stereo ambience: a pair of cross-fed delays with damping.
    const verbIn = ctx.createGain();
    verbIn.gain.value = 1;
    const d1 = ctx.createDelay(1), d2 = ctx.createDelay(1);
    d1.delayTime.value = 0.093;
    d2.delayTime.value = 0.137;
    const fb1 = ctx.createGain(), fb2 = ctx.createGain();
    fb1.gain.value = 0.42; fb2.gain.value = 0.4;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 3200;
    const pL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const pR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    verbIn.connect(d1); verbIn.connect(d2);
    d1.connect(fb1); fb1.connect(damp); damp.connect(d2);
    d2.connect(fb2); fb2.connect(d1);
    if (pL) { pL.pan.value = -0.6; pR.pan.value = 0.6; d1.connect(pL); d2.connect(pR); pL.connect(music); pR.connect(music); }
    else { d1.connect(music); d2.connect(music); }

    // A shared echo for guitar/lead sends.
    const echo = ctx.createDelay(1);
    echo.delayTime.value = 0.26;
    const echoFb = ctx.createGain();
    echoFb.gain.value = 0.32;
    const echoTone = ctx.createBiquadFilter();
    echoTone.type = 'lowpass';
    echoTone.frequency.value = 2600;
    echo.connect(echoTone); echoTone.connect(echoFb); echoFb.connect(echo);
    echoTone.connect(music);

    // Sidechain bus: every musical part except the kick runs through this and
    // dips on each kick. It is the difference between a loop and a groove.
    const duck = ctx.createGain();
    duck.gain.value = 1;
    duck.connect(music);

    A._bus = { master, comp, music, sfx, verb: verbIn, echo, duck };

    // white-noise buffer reused by drums, wind and crowd texture
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A._noise = buf;

    // asymmetric soft-clip curve for the guitar voice
    const n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 3.2) * 0.86 + Math.tanh(x * 11) * 0.14;
    }
    A._shaper = curve;

    A.ready = true;
    A.startCrowdBed();
  };

  A.resume = function () {
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
  };

  function noiseSource() {
    const s = A.ctx.createBufferSource();
    s.buffer = A._noise;
    s.loop = true;
    return s;
  }

  function env(param, t, peak, attack, decay, sustain, hold, release) {
    param.cancelScheduledValues(t);
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    const s = Math.max(peak * sustain, 0.0002);
    param.exponentialRampToValueAtTime(s, t + attack + decay);
    param.setValueAtTime(s, t + attack + decay + hold);
    param.exponentialRampToValueAtTime(0.0001, t + attack + decay + hold + release);
  }

  /* --------------------------------------------------------------- voices */

  const V = {};

  V.kick = function (t, g, dest) {
    const ctx = A.ctx;
    // punch layer: fast pitch drop for the attack
    const o = ctx.createOscillator(), a = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(190, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.055);
    a.gain.setValueAtTime(g, t);
    a.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(a); a.connect(dest);
    o.start(t); o.stop(t + 0.24);
    // sub layer: the weight underneath it
    const sb = ctx.createOscillator(), sg = ctx.createGain();
    sb.type = 'sine';
    sb.frequency.setValueAtTime(64, t);
    sb.frequency.exponentialRampToValueAtTime(40, t + 0.16);
    sg.gain.setValueAtTime(g * 0.85, t);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.40);
    sb.connect(sg); sg.connect(dest);
    sb.start(t); sb.stop(t + 0.42);
    // beater click
    const c = noiseSource(), cf = ctx.createBiquadFilter(), cg = ctx.createGain();
    cf.type = 'bandpass'; cf.frequency.value = 2900; cf.Q.value = 0.7;
    cg.gain.setValueAtTime(g * 0.36, t);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.022);
    c.connect(cf); cf.connect(cg); cg.connect(dest);
    c.start(t); c.stop(t + 0.03);
  };

  V.snare = function (t, g, dest, tone, room) {
    const ctx = A.ctx;
    // crack: bright, very short
    const n1 = noiseSource(), f1 = ctx.createBiquadFilter(), a1 = ctx.createGain();
    f1.type = 'highpass'; f1.frequency.value = 3200;
    a1.gain.setValueAtTime(g * 0.9, t);
    a1.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    n1.connect(f1); f1.connect(a1); a1.connect(dest);
    n1.start(t); n1.stop(t + 0.06);
    // body: the wires rattling
    const n = noiseSource(), f = ctx.createBiquadFilter(), a = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = tone || 1750; f.Q.value = 0.6;
    a.gain.setValueAtTime(g, t);
    a.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);
    n.connect(f); f.connect(a); a.connect(dest);
    const sn = ctx.createGain(); sn.gain.value = room === undefined ? 0.5 : room;
    a.connect(sn); sn.connect(A._bus.verb);
    n.start(t); n.stop(t + 0.22);
    // drum tone
    [196, 262].forEach((hz, i) => {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(hz, t);
      o.frequency.exponentialRampToValueAtTime(hz * 0.68, t + 0.09);
      og.gain.setValueAtTime(g * (i ? 0.22 : 0.45), t);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      o.connect(og); og.connect(dest);
      o.start(t); o.stop(t + 0.13);
    });
  };

  V.hat = function (t, g, dest, open) {
    const ctx = A.ctx;
    const n = noiseSource(), f = ctx.createBiquadFilter(), a = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = 7600;
    const dur = open ? 0.26 : 0.045;
    a.gain.setValueAtTime(g, t);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(a); a.connect(dest);
    n.start(t); n.stop(t + dur + 0.02);
  };

  V.clap = function (t, g, dest) {
    for (let i = 0; i < 3; i++) V.snare(t + i * 0.011, g * (i === 2 ? 1 : 0.5), dest, 1200);
  };

  // 808-style cowbell. LCD Soundsystem stage would be wrong without it.
  V.cowbell = function (t, g, dest) {
    const ctx = A.ctx;
    const a = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 2640; f.Q.value = 2.2;
    a.gain.setValueAtTime(g, t);
    a.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    [540, 800].forEach((hz) => {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = hz;
      o.connect(f);
      o.start(t); o.stop(t + 0.3);
    });
    f.connect(a); a.connect(dest);
  };

  V.tom = function (t, g, dest, hz) {
    const ctx = A.ctx;
    const o = ctx.createOscillator(), a = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(hz, t);
    o.frequency.exponentialRampToValueAtTime(hz * 0.55, t + 0.25);
    a.gain.setValueAtTime(g, t);
    a.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(a); a.connect(dest); a.connect(A._bus.verb);
    o.start(t); o.stop(t + 0.32);
  };

  V.bass = function (t, freq, dur, g, dest, bright) {
    const ctx = A.ctx;
    const a = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 7;
    f.frequency.setValueAtTime(freq * (bright ? 9 : 5), t);
    f.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.6, 90), t + dur * 0.8);
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(g, t + 0.012);
    a.gain.setValueAtTime(g, t + dur * 0.7);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [0, -5, 5].forEach((cents, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'sawtooth' : 'square';
      o.frequency.value = freq;
      o.detune.value = cents;
      const og = ctx.createGain();
      og.gain.value = i === 0 ? 1 : 0.28;
      o.connect(og); og.connect(f);
      o.start(t); o.stop(t + dur + 0.05);
    });
    // sub
    const sub = ctx.createOscillator(), sg = ctx.createGain();
    sub.type = 'sine'; sub.frequency.value = freq / 2;
    sg.gain.value = 0.5; sub.connect(sg); sg.connect(a);
    sub.start(t); sub.stop(t + dur + 0.05);
    f.connect(a); a.connect(dest);
  };

  V.guitar = function (t, freq, dur, g, dest, sendEcho, trem) {
    const ctx = A.ctx;
    const shaper = ctx.createWaveShaper();
    shaper.curve = A._shaper;
    shaper.oversample = '2x';
    const pre = ctx.createGain();
    pre.gain.value = 2.6;
    const body = ctx.createBiquadFilter();
    body.type = 'bandpass'; body.frequency.value = 1500; body.Q.value = 0.65;
    const cab = ctx.createBiquadFilter();
    cab.type = 'lowpass'; cab.frequency.value = 3600;
    const a = ctx.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(g, t + 0.006);
    a.gain.setValueAtTime(g * 0.85, t + dur * 0.6);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [-7, 7].forEach((c) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = c;
      o.connect(pre);
      o.start(t); o.stop(t + dur + 0.05);
    });
    pre.connect(shaper); shaper.connect(body); body.connect(cab); cab.connect(a);
    if (trem) {
      // amplitude tremolo — the surf-guitar signature
      const tg = ctx.createGain();
      tg.gain.value = 1;
      const lfo = ctx.createOscillator(), la = ctx.createGain();
      lfo.type = 'sine'; lfo.frequency.value = trem;
      la.gain.value = 0.45;
      lfo.connect(la); la.connect(tg.gain);
      lfo.start(t); lfo.stop(t + dur + 0.1);
      a.connect(tg); tg.connect(dest);
    } else {
      a.connect(dest);
    }
    if (sendEcho !== false) {
      const s = ctx.createGain(); s.gain.value = 0.2; a.connect(s); s.connect(A._bus.echo);
    }
  };

  V.lead = function (t, freq, dur, g, dest, wave, verb) {
    const ctx = A.ctx;
    const o = ctx.createOscillator(), a = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = wave || 'square';
    o.frequency.value = freq;
    f.type = 'lowpass'; f.Q.value = 4;
    f.frequency.setValueAtTime(freq * 8, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(freq * 2.2, 200), t + dur);
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(g, t + 0.01);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(a); a.connect(dest);
    if (verb) { const s = ctx.createGain(); s.gain.value = verb; a.connect(s); s.connect(A._bus.verb); }
    o.start(t); o.stop(t + dur + 0.05);
  };

  V.pad = function (t, freqs, dur, g, dest) {
    const ctx = A.ctx;
    const a = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 1500; f.Q.value = 0.6;
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(g, t + dur * 0.3);
    a.gain.setValueAtTime(g, t + dur * 0.6);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    freqs.forEach((fr) => {
      [-8, 8].forEach((c) => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = c;
        const og = ctx.createGain(); og.gain.value = 0.3;
        o.connect(og); og.connect(f);
        o.start(t); o.stop(t + dur + 0.1);
      });
    });
    f.connect(a); a.connect(dest);
    const s = ctx.createGain(); s.gain.value = 0.5; a.connect(s); s.connect(A._bus.verb);
  };

  V.organ = function (t, freqs, dur, g, dest) {
    const ctx = A.ctx;
    const a = ctx.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(g, t + 0.02);
    a.gain.setValueAtTime(g, t + dur * 0.7);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    freqs.forEach((fr) => {
      [1, 2, 3].forEach((h, i) => {
        const o = ctx.createOscillator();
        o.type = 'sine'; o.frequency.value = fr * h;
        const og = ctx.createGain(); og.gain.value = [0.5, 0.25, 0.14][i];
        o.connect(og); og.connect(a);
        o.start(t); o.stop(t + dur + 0.05);
      });
    });
    a.connect(dest);
    const s = ctx.createGain(); s.gain.value = 0.3; a.connect(s); s.connect(A._bus.verb);
  };

  V.tamb = function (t, g, dest) {
    const ctx = A.ctx;
    const n = noiseSource(), f = ctx.createBiquadFilter(), a = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = 5200;
    a.gain.setValueAtTime(g, t);
    a.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    n.connect(f); f.connect(a); a.connect(dest);
    n.start(t); n.stop(t + 0.11);
    // jingle ring on top of the shake
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = 7400;
    og.gain.setValueAtTime(g * 0.3, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(og); og.connect(dest);
    o.start(t); o.stop(t + 0.09);
  };

  // Electric piano: a sine fundamental with a fast-decaying bell partial.
  V.rhodes = function (t, freqs, dur, g, dest) {
    const ctx = A.ctx;
    freqs.forEach((fr) => {
      const a = ctx.createGain();
      a.gain.setValueAtTime(0.0001, t);
      a.gain.linearRampToValueAtTime(g, t + 0.008);
      a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = fr;
      o.connect(a);
      const b = ctx.createOscillator(), bg = ctx.createGain();
      b.type = 'sine'; b.frequency.value = fr * 4.02;
      bg.gain.setValueAtTime(g * 0.5, t);
      bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      b.connect(bg); bg.connect(a);
      a.connect(dest);
      o.start(t); o.stop(t + dur + 0.05);
      b.start(t); b.stop(t + 0.12);
    });
    const sn = ctx.createGain(); sn.gain.value = 0.18; sn.connect(A._bus.verb);
  };

  // Brass stab: saw through a formant-ish bandpass with a hard attack.
  V.horn = function (t, freqs, dur, g, dest) {
    const ctx = A.ctx;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1150; f.Q.value = 1.1;
    const a = ctx.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(g, t + 0.02);
    a.gain.setValueAtTime(g * 0.8, t + dur * 0.6);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    freqs.forEach((fr) => {
      [-6, 6].forEach((c) => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = c;
        const og = ctx.createGain(); og.gain.value = 0.5;
        o.connect(og); og.connect(f);
        o.start(t); o.stop(t + dur + 0.05);
      });
    });
    f.connect(a); a.connect(dest);
    const sn = ctx.createGain(); sn.gain.value = 0.22; a.connect(sn); sn.connect(A._bus.verb);
  };

  // Plucked acoustic string: bright transient collapsing to a thin body tone.
  V.pluck = function (t, freq, dur, g, dest) {
    const ctx = A.ctx;
    const a = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(freq * 12, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(freq * 2, 220), t + dur * 0.5);
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(g, t + 0.004);
    a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    ['triangle', 'sawtooth'].forEach((w, i) => {
      const o = ctx.createOscillator();
      o.type = w; o.frequency.value = freq; o.detune.value = i ? 5 : -5;
      const og = ctx.createGain(); og.gain.value = i ? 0.35 : 1;
      o.connect(og); og.connect(f);
      o.start(t); o.stop(t + dur + 0.05);
    });
    // pick noise
    const n = noiseSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
    nf.type = 'highpass'; nf.frequency.value = 2400;
    ng.gain.setValueAtTime(g * 0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    n.connect(nf); nf.connect(ng); ng.connect(a);
    n.start(t); n.stop(t + 0.04);
    f.connect(a); a.connect(dest);
    const sn = ctx.createGain(); sn.gain.value = 0.3; a.connect(sn); sn.connect(A._bus.verb);
  };

  // Root + fifth through the dirty guitar voice.
  V.power = function (t, freq, dur, g, dest) {
    V.guitar(t, freq, dur, g, dest, false);
    V.guitar(t, freq * 1.4983, dur, g * 0.8, dest, false);
  };

  A.V = V;

  /* ------------------------------------------------------------ the songs */
  // Drum grids read left-to-right as 16th notes. Melodic parts are scale
  // degrees (0 = root); null is a rest, a negative drops an octave.

  const SCALES = {
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    minPent: [0, 3, 5, 7, 10],
    majPent: [0, 2, 4, 7, 9],
    major: [0, 2, 4, 5, 7, 9, 11],
    mixo: [0, 2, 4, 5, 7, 9, 10],
  };

  function deg(root, scaleName, d) {
    const sc = SCALES[scaleName];
    const oct = Math.floor(d / sc.length);
    const idx = ((d % sc.length) + sc.length) % sc.length;
    return root + oct * 12 + sc[idx];
  }
  A.deg = deg;

  // One theme per act. These are original compositions written in each act's
  // own idiom — their tempo range, key centre, instrumentation and rhythmic
  // feel — not transcriptions of their records.
  const TRACKS = {
    title: {
      bpm: 132, root: 45, scale: 'minor', bars: 4,
      kick: 'x..x..x...x..x..', snare: '....x.......x...',
      hat: '..x...x...x...x.', clap: '....x.......x..x',
      bass: [0, null, 0, null, 7, null, 0, null, -5, null, 3, null, 2, null, null, null],
      gtr: [0, null, null, 3, null, 0, null, 7, null, null, 5, null, 3, null, 2, null],
      pads: [[0, 3, 7], [0, 3, 7], [-2, 2, 5], [-4, 0, 3]],
      lead: [null, null, null, null, 7, 9, 10, null, null, 9, 7, null, 5, null, null, null],
      gtrGain: 0.2, leadGain: 0.13,
    },
    select: {
      bpm: 108, root: 43, scale: 'dorian', bars: 4, swing: 0.16,
      kick: 'x.....x...x.....', snare: '....x.......x...',
      hat: 'x.xxx.xxx.xxx.xx', cowbell: '..............x.',
      bass: [0, null, 7, 0, null, 3, null, 5, null, 0, null, null, 10, null, 7, null],
      lead: [null, null, 7, null, 10, null, 9, 7, null, null, 5, null, 3, null, null, null],
      organ: [[0, 3, 7], [0, 3, 7], [-3, 0, 4], [-1, 2, 5]],
      leadGain: 0.1,
    },

    /* Garage blues stomp. Riff carries everything; famously no bass player,
       so the low end is the guitar an octave down plus the kick. */
    jackwhite: {
      sidechain: false, room: 0.85, snareTone: 1950,
      bpm: 124, root: 40, scale: 'minPent', bars: 4, swing: 0.07,
      kick: 'x..x..x.x..x..x.', snare: '....x.......x...',
      tamb: '..x...x...x...x.',
      gtr: [0, null, 0, null, 1, 0, null, 2, 0, null, 0, null, 3, 2, 1, 0],
      gtrChord: true, gtrOct: 0, gtrGain: 0.26,
      lead: [null, null, null, null, null, null, null, null, 4, 3, 2, null, 1, 0, null, null],
      leadGain: 0.11, leadWave: 'sawtooth',
    },

    /* Dance-punk: four on the floor, cowbell, arpeggiated bass, claps. */
    lcd: {
      sidechain: 0.50, room: 0.28, snareTone: 1800,
      bpm: 98, root: 47, scale: 'mixo', bars: 4,
      kick: 'x...x...x...x...', snare: '....x.......x...',
      clap: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx',
      openhat: '......x.......x.', cowbell: '..x..x..x..x..x.',
      bass: [0, 0, 7, 0, 3, 0, 7, 0, -5, -5, 2, -5, 0, -5, 3, 5],
      lead: [7, null, 9, null, 10, null, 9, null, 7, null, 5, null, 3, null, 2, null],
      pads: [[0, 3, 7], [0, 3, 7], [-5, -2, 2], [-3, 0, 4]],
      leadGain: 0.09, bassBright: true,
    },

    /* Psych-pop: syncopated, tambourine throughout, bright mixolydian keys. */
    portugal: {
      sidechain: 0.32, room: 0.52, snareTone: 1700,
      bpm: 158, root: 49, scale: 'minor', bars: 4, swing: 0.10,
      kick: 'x..x..x...x.x...', snare: '....x.......x...',
      tamb: 'x.x.x.x.x.x.x.x.', hat: '..x...x...x...x.',
      bass: [0, null, null, 0, 4, null, 2, null, 5, null, null, 5, 0, null, -3, null],
      keys: [[0, 2, 4], [0, 2, 4], [3, 5, 0], [1, 3, 5]],
      keysGrid: '..x..x....x..x..',
      lead: [null, null, 6, null, 4, null, 2, null, null, 4, null, 6, 7, null, null, null],
      leadGain: 0.1, leadWave: 'triangle', leadVerb: 0.5,
    },

    /* Electro trip-hop: slow, heavy, sub-driven, drenched in reverb. */
    phantogram: {
      sidechain: 0.46, room: 0.92, snareTone: 1350,
      bpm: 92, root: 43, scale: 'minor', bars: 4,
      kick: 'x.......x.x.....', snare: '....x.......x...',
      hat: '..x..x..x..x..x.',
      bass: [0, null, null, null, 0, null, 3, null, -2, null, null, null, -2, null, 0, null],
      pads: [[0, 3, 7, 10], [0, 3, 7, 10], [-4, 0, 3, 7], [-2, 2, 5, 9]],
      lead: [null, null, 10, null, null, 9, null, null, 7, null, null, null, 5, null, null, null],
      leadGain: 0.09, leadWave: 'triangle', leadVerb: 0.8, reverbHeavy: true,
    },

    /* Loose live soul: swung, warm organ, acoustic strum, handclaps. */
    dijon: {
      sidechain: 0.18, room: 0.62, snareTone: 1650,
      bpm: 86, root: 41, scale: 'dorian', bars: 4, swing: 0.22,
      kick: 'x.....x...x.....', snare: '....x.......x...',
      clap: '....x.......x..x', hat: 'x.xx.xx.x.xx.xx.',
      bass: [0, null, null, 3, null, 5, null, null, 7, null, 5, null, 3, null, 0, null],
      pluck: [0, null, 4, 2, null, 0, null, 4, null, 2, 0, null, 4, null, null, null],
      pluckGain: 0.12,
      organ: [[0, 2, 4, 6], [0, 2, 4, 6], [3, 5, 0, 2], [-2, 0, 2, 4]],
    },

    /* Art rock: fast, angular, accents falling where you don't expect. */
    geese: {
      sidechain: 0.24, room: 0.22, snareTone: 1900,
      bpm: 144, root: 42, scale: 'dorian', bars: 4,
      kick: 'x..x.x..x..x.x..', snare: '....x..x....x..x',
      hat: 'xxxxxxxxxxxxxxxx', tom: '..............xx',
      bass: [0, null, 4, 0, null, 6, null, 1, 0, null, 4, null, 6, 5, 1, 0],
      gtr: [0, 4, null, 6, null, 5, 1, null, 0, null, 6, 4, null, 1, null, 0],
      gtrGain: 0.17,
      lead: [null, null, null, 11, 10, null, 8, null, null, null, 6, null, 4, null, null, null],
      leadGain: 0.09,
    },

    /* Punk: 170+, straight eighths, power chords, nothing clever. */
    diespitz: {
      sidechain: 0.20, room: 0.26, snareTone: 2150,
      bpm: 172, root: 40, scale: 'minor', bars: 4,
      kick: 'x.x.x.x.x.x.x.x.', snare: '....x.......x...',
      hat: 'xxxxxxxxxxxxxxxx',
      gtr: [0, null, 0, null, 0, null, 3, null, 5, null, 5, null, 3, null, 1, null],
      gtrChord: true, gtrGain: 0.24,
      bass: [0, 0, 0, 0, 0, 0, 3, 3, 5, 5, 5, 5, 3, 3, 1, 1],
    },

    /* Folk rock: strummed acoustic, tambourine, harmonica over the top. */
    morby: {
      sidechain: 0.15, room: 0.58, snareTone: 1700,
      bpm: 116, root: 45, scale: 'mixo', bars: 4, swing: 0.08,
      kick: 'x.......x.......', snare: '....x.......x...',
      tamb: '..x...x...x...x.',
      pluck: [0, 2, 4, 2, 0, 2, 4, 2, 5, 4, 2, 4, 3, 2, 0, null],
      pluckGain: 0.13,
      bass: [0, null, null, null, 4, null, null, null, 5, null, null, null, 0, null, null, null],
      horn: [[0, 2, 4], [0, 2, 4], [3, 5, 0], [4, 6, 1]],
      hornGrid: '........x.......',
      hornGain: 0.07,
    },

    /* Surf noir: shuffled, walking bass, tremolo guitar soaked in spring
       reverb, organ underneath. */
    laluz: {
      sidechain: 0.14, room: 0.95, snareTone: 1750, trem: 5.5,
      bpm: 132, root: 45, scale: 'minor', bars: 4, swing: 0.16,
      kick: 'x.....x.x.....x.', snare: '....x.......x...',
      hat: 'x.x.x.x.x.x.x.x.',
      bass: [0, null, 2, null, 3, null, 4, null, 5, null, 4, null, 3, null, 2, null],
      gtr: [0, 1, 2, null, 3, null, 2, 1, 0, null, null, 4, 3, 2, null, null],
      gtrGain: 0.14, reverbHeavy: true,
      organ: [[0, 2, 4], [0, 2, 4], [3, 5, 0], [1, 3, 5]],
    },

    /* Jazz-rap: heavy swing, walking upright, rhodes sevenths, horn stabs. */
    mckinley: {
      sidechain: 0.22, room: 0.55, snareTone: 1600,
      bpm: 94, root: 43, scale: 'dorian', bars: 4, swing: 0.24,
      kick: 'x..x....x.x.....', snare: '....x.......x...',
      hat: 'x.xxx.xxx.xxx.xx',
      bass: [0, null, 2, null, 3, null, 4, null, 5, null, 4, null, 2, null, 6, null],
      keys: [[0, 2, 4, 6], [0, 2, 4, 6], [3, 5, 0, 2], [4, 6, 1, 3]],
      keysGrid: '..x...x.....x...',
      horn: [[0, 4, 6], [0, 4, 6], [3, 0, 2], [4, 1, 3]],
      hornGrid: '............x...',
      hornGain: 0.08,
    },
  };

  A.TRACKS = TRACKS;

  /* --------------------------------------------------------- the sequencer */

  // Ducks the sidechain bus on a kick so the low end gets out of its way.
  function pump(t, depth, len) {
    const g = A._bus.duck.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(1 - depth, t);
    g.linearRampToValueAtTime(1, t + len);
  }

  function scheduleStep(step, t) {
    const T = A.track;
    if (!T) return;
    const dry = A._bus.music;          // kick bypasses the duck
    const m = A._bus.duck;             // everything else pumps under it
    const s16 = step % 16;
    const bar = Math.floor(step / 16);
    const pat = bar % 4;               // which bar of the written pattern
    const form = bar % 8;              // where we are in the 8-bar form
    const hit = (grid, i) => grid && grid[i] && grid[i] !== '.';

    // Song form: an intro, a couple of full bars, a breakdown and a build,
    // so a loop behaves like an arrangement instead of a bar on repeat.
    const intro = form === 0;
    const breakdown = form === 6;
    const build = form === 7;
    const full = !intro && !breakdown;

    // Backbeat accents plus quieter ghost notes in between: this is most of
    // what makes programmed drums feel played.
    const accent = (s16 % 4 === 0) ? 1 : (s16 % 2 === 0) ? 0.82 : 0.62;
    const vel = accent * (0.9 + Math.random() * 0.12);

    if (hit(T.kick, s16) && !breakdown) {
      V.kick(t, 0.92 * vel, dry);
      if (T.sidechain !== false) pump(t, T.sidechain || 0.35, (60 / T.bpm) * 0.5);
    }
    if (hit(T.snare, s16) && !intro) V.snare(t, 0.44 * vel, m, T.snareTone, T.room);
    // ghost snare before the backbeat, at a whisper
    if (!intro && !breakdown && (s16 === 3 || s16 === 10) && Math.random() < 0.5) {
      V.snare(t, 0.09, m, T.snareTone, 0.2);
    }
    if (hit(T.clap, s16) && full) V.clap(t, 0.2 * vel, m);
    if (hit(T.hat, s16)) V.hat(t, (breakdown ? 0.08 : 0.16) * vel, m, false);
    if (hit(T.openhat, s16) && full) V.hat(t, 0.13, m, true);
    if (hit(T.tamb, s16) && !intro) V.tamb(t, 0.11 * vel, m);
    if (A.encore) {
      if (s16 % 4 === 2) V.tamb(t, 0.09, m);
      if (s16 === 4 || s16 === 12) V.clap(t, 0.16, m);
    }
    if (hit(T.cowbell, s16) && full) V.cowbell(t, 0.1, m);
    if (hit(T.tom, s16)) V.tom(t, 0.3, m, 150 - s16 * 3);
    // fill across the last bar of the form
    if (build && s16 >= 12) {
      V.tom(t, 0.30, m, 190 - (s16 - 12) * 26);
      V.snare(t, 0.18, m, T.snareTone, 0.4);
    }

    const beat = 60 / T.bpm;
    const st = beat / 4;
    const chordOf = (list) => list[pat % list.length];

    if (T.bass && !intro) {
      const d = T.bass[s16];
      if (d !== null && d !== undefined) {
        const shift = pat === 2 ? -2 : pat === 3 ? 1 : 0;
        V.bass(t, mtof(deg(T.root, T.scale, d + shift) - 12), st * 1.9,
          breakdown ? 0.24 : 0.3, m, T.bassBright);
      }
    }
    if (T.gtr && full) {
      const d = T.gtr[s16];
      if (d !== null && d !== undefined) {
        const shift = pat === 3 ? 2 : 0;
        const f = mtof(deg(T.root, T.scale, d + shift) + (T.gtrOct === undefined ? 12 : T.gtrOct));
        if (T.gtrChord) V.power(t, f, st * 2.0, (T.gtrGain || 0.18) * vel, m);
        else V.guitar(t, f, st * 2.2, (T.gtrGain || 0.18) * vel, m, true, T.trem);
      }
    }
    if (T.pluck && !intro) {
      const d = T.pluck[s16];
      if (d !== null && d !== undefined) {
        const shift = pat === 2 ? 3 : pat === 3 ? -2 : 0;
        V.pluck(t, mtof(deg(T.root, T.scale, d + shift) + 12), st * 3,
          (T.pluckGain || 0.12) * vel, m);
      }
    }
    if (T.keys && hit(T.keysGrid, s16) && !intro) {
      V.rhodes(t, chordOf(T.keys).map((d) => mtof(deg(T.root, T.scale, d) + 12)),
        st * 3.2, T.keysGain || 0.09, m);
    }
    if (T.horn && hit(T.hornGrid, s16) && full) {
      V.horn(t, chordOf(T.horn).map((d) => mtof(deg(T.root, T.scale, d) + 12)),
        st * 2.4, T.hornGain || 0.08, m);
    }
    if (T.lead && (form === 3 || form === 5 || build || T.leadAlways || A.encore) && !breakdown) {
      const d = T.lead[s16];
      if (d !== null && d !== undefined) {
        V.lead(t, mtof(deg(T.root, T.scale, d) + 12), st * 2.4,
          (T.leadGain || 0.1) * (A.encore ? 1.5 : 1), m,
          T.leadWave || 'square',
          T.leadVerb !== undefined ? T.leadVerb : (T.reverbHeavy ? 0.5 : 0.22));
      }
    }
    if (s16 === 0) {
      if (T.pads) V.pad(t, chordOf(T.pads).map((d) => mtof(deg(T.root, T.scale, d))),
        beat * 4, breakdown ? 0.11 : 0.075, m);
      if (T.organ) V.organ(t, chordOf(T.organ).map((d) => mtof(deg(T.root, T.scale, d))),
        beat * 3.4, 0.07, m);
    }
  }

  function scheduler() {
    if (!A.ctx || !A.track) return;
    const T = A.track;
    const st = 60 / T.bpm / 4;
    const sw = (T.swing || 0) * st;
    while (A._nextNote < A.ctx.currentTime + LOOKAHEAD) {
      // delay the off-16ths to shuffle the grid
      // a couple of milliseconds of drift stops the grid sounding stamped out
      const human = (Math.random() - 0.5) * 0.006;
      if (A.musicOn) scheduleStep(A._step, A._nextNote + (A._step % 2 ? sw : 0) + human);
      A._step++;
      A._nextNote += st;
    }
  }

  // Encore: same theme, fuller arrangement and pushed up in the mix. Used for
  // the winner's 20-second set after the match.
  A.setEncore = function (on) {
    A.encore = !!on;
    if (!A._bus.music) return;
    const t = A.ctx.currentTime, g = A._bus.music.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(A.musicOn ? A.musicVol * (on ? 1.75 : 1) : 0, t + 0.6);
  };

  A.playTrack = function (name, restart) {
    A.init();
    if (!A.ctx) return;
    if (A.trackName === name && !restart) return;
    A.trackName = name;
    A.track = TRACKS[name] || null;
    A._step = 0;
    A._nextNote = A.ctx.currentTime + 0.06;
    if (A._timer) clearInterval(A._timer);
    if (A.track) A._timer = setInterval(scheduler, TICK);
  };

  A.stopMusic = function () {
    if (A._timer) clearInterval(A._timer);
    A._timer = null;
    A.track = null;
    A.trackName = null;
  };

  A.setMusic = function (on) {
    A.musicOn = on;
    if (A._bus.music) A._bus.music.gain.value = on ? A.musicVol : 0;
  };
  A.setSfx = function (on) {
    A.sfxOn = on;
    if (A._bus.sfx) A._bus.sfx.gain.value = on ? A.sfxVol : 0;
  };
  A.duck = function (amount, dur) {
    if (!A._bus.music) return;
    const g = A._bus.music.gain, t = A.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(A.musicVol * amount, t + 0.04);
    g.linearRampToValueAtTime(A.musicOn ? A.musicVol : 0, t + dur);
  };

  /* ------------------------------------------------- crowd bed + one-shots */

  // A permanently running filtered-noise wash sitting under everything; its
  // level is driven by how excited the crowd is.
  A.startCrowdBed = function () {
    if (!A.ctx || A._crowd) return;
    const ctx = A.ctx;
    const n = noiseSource();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 760; f.Q.value = 0.55;
    const f2 = ctx.createBiquadFilter();
    f2.type = 'lowpass'; f2.frequency.value = 2400;
    const g = ctx.createGain();
    g.gain.value = 0.02;
    n.connect(f); f.connect(f2); f2.connect(g); g.connect(A._bus.comp);
    n.start();
    A._crowd = g;
  };

  A.crowdLevel = function (v) {
    if (!A._crowd) return;
    const t = A.ctx.currentTime;
    A._crowd.gain.cancelScheduledValues(t);
    A._crowd.gain.setValueAtTime(A._crowd.gain.value, t);
    A._crowd.gain.linearRampToValueAtTime(0.014 + v * 0.07, t + 0.25);
  };

  A.crowdRoar = function (power) {
    if (!A.ctx || !A.sfxOn) return;
    const ctx = A.ctx, t = ctx.currentTime;
    const n = noiseSource();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 0.5;
    f.frequency.setValueAtTime(420, t);
    f.frequency.linearRampToValueAtTime(1300, t + 0.3);
    f.frequency.linearRampToValueAtTime(700, t + 1.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.11 * power, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    n.connect(f); f.connect(g); g.connect(A._bus.sfx);
    n.start(t); n.stop(t + 1.7);
  };

  const SFX = {};

  SFX.hit = function (power) {
    const ctx = A.ctx, t = ctx.currentTime, d = A._bus.sfx;
    const n = noiseSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(1400 - power * 500, t);
    f.frequency.exponentialRampToValueAtTime(220, t + 0.12);
    g.gain.setValueAtTime(0.42 * (0.6 + power), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13 + power * 0.1);
    n.connect(f); f.connect(g); g.connect(d);
    n.start(t); n.stop(t + 0.3);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220 - power * 80, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.14);
    og.gain.setValueAtTime(0.3 * (0.5 + power), t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(og); og.connect(d);
    o.start(t); o.stop(t + 0.2);
  };

  SFX.block = function () {
    const ctx = A.ctx, t = ctx.currentTime, d = A._bus.sfx;
    const n = noiseSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = 2600;
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    n.connect(f); f.connect(g); g.connect(d);
    n.start(t); n.stop(t + 0.12);
  };

  SFX.whoosh = function () {
    const ctx = A.ctx, t = ctx.currentTime, d = A._bus.sfx;
    const n = noiseSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(500, t);
    f.frequency.exponentialRampToValueAtTime(2800, t + 0.13);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.14, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    n.connect(f); f.connect(g); g.connect(d);
    n.start(t); n.stop(t + 0.2);
  };

  SFX.jump = function () {
    const ctx = A.ctx, t = ctx.currentTime, d = A._bus.sfx;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(440, t + 0.1);
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g); g.connect(d);
    o.start(t); o.stop(t + 0.14);
  };

  SFX.land = function () {
    const ctx = A.ctx, t = ctx.currentTime, d = A._bus.sfx;
    const n = noiseSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = 700;
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    n.connect(f); f.connect(g); g.connect(d);
    n.start(t); n.stop(t + 0.15);
  };

  SFX.wood = function () {
    const ctx = A.ctx, t = ctx.currentTime, d = A._bus.sfx;
    for (let i = 0; i < 5; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = 180 + Math.random() * 700;
      g.gain.setValueAtTime(0.07, t + i * 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.012 + 0.1);
      o.connect(g); g.connect(d);
      o.start(t + i * 0.012); o.stop(t + i * 0.012 + 0.12);
    }
  };

  SFX.metal = function () {
    const ctx = A.ctx, t = ctx.currentTime, d = A._bus.sfx;
    [1400, 2100, 3300, 4700].forEach((hz, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = hz * (0.95 + Math.random() * 0.1);
      g.gain.setValueAtTime(0.09 / (i + 1), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7 - i * 0.1);
      o.connect(g); g.connect(d);
      const s = ctx.createGain(); s.gain.value = 0.4; g.connect(s); s.connect(A._bus.verb);
      o.start(t); o.stop(t + 0.8);
    });
  };

  SFX.glass = function () {
    const ctx = A.ctx, t = ctx.currentTime, d = A._bus.sfx;
    for (let i = 0; i < 9; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      const s = t + Math.random() * 0.13;
      o.type = 'sine'; o.frequency.value = 2200 + Math.random() * 4200;
      g.gain.setValueAtTime(0.05, s);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.15);
      o.connect(g); g.connect(d);
      o.start(s); o.stop(s + 0.17);
    }
  };

  SFX.explode = function () {
    const ctx = A.ctx, t = ctx.currentTime, d = A._bus.sfx;
    const n = noiseSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(3000, t);
    f.frequency.exponentialRampToValueAtTime(180, t + 0.6);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    n.connect(f); f.connect(g); g.connect(d);
    const s = ctx.createGain(); s.gain.value = 0.5; g.connect(s); s.connect(A._bus.verb);
    n.start(t); n.stop(t + 0.8);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 0.5);
    og.gain.setValueAtTime(0.5, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(og); og.connect(d);
    o.start(t); o.stop(t + 0.65);
  };

  SFX.ui = function (up) {
    const ctx = A.ctx, t = ctx.currentTime, d = A._bus.sfx;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(up ? 600 : 460, t);
    o.frequency.setValueAtTime(up ? 900 : 340, t + 0.045);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g); g.connect(d);
    o.start(t); o.stop(t + 0.12);
  };

  SFX.confirm = function () {
    const ctx = A.ctx, t = ctx.currentTime, d = A._bus.sfx;
    [0, 4, 7, 12].forEach((s, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = mtof(64 + s);
      g.gain.setValueAtTime(0.07, t + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.05 + 0.22);
      o.connect(g); g.connect(d);
      o.start(t + i * 0.05); o.stop(t + i * 0.05 + 0.24);
    });
  };

  // Stinger played under the round announcements.
  SFX.stinger = function (kind) {
    const ctx = A.ctx, t = ctx.currentTime, d = A._bus.sfx;
    const sets = {
      ready: [[0, 0.0], [7, 0.12]],
      fight: [[0, 0], [7, 0.07], [12, 0.14], [19, 0.21]],
      ko: [[12, 0], [11, 0.09], [7, 0.18], [0, 0.3]],
      win: [[0, 0], [4, 0.1], [7, 0.2], [12, 0.3], [16, 0.42]],
    };
    (sets[kind] || sets.ready).forEach(([s, off]) => {
      const dur = kind === 'win' ? 0.5 : 0.3;
      V.guitar(t + off, mtof(45 + s), dur, 0.22, d);
    });
    if (kind === 'ko' || kind === 'fight') V.kick(t, 0.9, d);
  };

  // Each fighter's special gets its own flourish.
  SFX.special = function (kind) {
    const ctx = A.ctx, t = ctx.currentTime, d = A._bus.sfx;
    switch (kind) {
      case 'riff': // marching seven-note guitar figure
        [0, 0, 3, 0, -2, -4, -5].forEach((s, i) =>
          V.guitar(t + i * 0.1, mtof(45 + s), 0.22, 0.3, d));
        break;
      case 'drop': { // long filter build then a bass drop
        const n = noiseSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'bandpass'; f.Q.value = 6;
        f.frequency.setValueAtTime(300, t);
        f.frequency.exponentialRampToValueAtTime(7000, t + 0.5);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.22, t + 0.48);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
        n.connect(f); f.connect(g); g.connect(d);
        n.start(t); n.stop(t + 0.7);
        V.kick(t + 0.52, 1, d);
        V.bass(t + 0.52, mtof(33), 0.7, 0.5, d, true);
        for (let i = 0; i < 6; i++) V.cowbell(t + 0.52 + i * 0.09, 0.14, d);
        break;
      }
      case 'phase': { // shimmering detuned ghost
        [0, 3, 7, 10, 14].forEach((s, i) =>
          V.lead(t + i * 0.05, mtof(62 + s), 0.9, 0.1, d, 'triangle', 0.8));
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(900, t);
        o.frequency.exponentialRampToValueAtTime(180, t + 0.8);
        g.gain.setValueAtTime(0.1, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
        o.connect(g); g.connect(d);
        o.start(t); o.stop(t + 0.9);
        break;
      }
      case 'kaleido': // rising psychedelic sweep
        for (let i = 0; i < 12; i++)
          V.lead(t + i * 0.045, mtof(50 + i * 2), 0.35, 0.07, d, 'sawtooth', 0.6);
        break;
      case 'soul': { // gospel-ish stacked vocal chord
        V.organ(t, [0, 3, 7, 10, 14].map((s) => mtof(50 + s)), 1.1, 0.16, d);
        V.snare(t, 0.3, d);
        break;
      }
      case 'flock': // chaotic scattered squawks
        for (let i = 0; i < 14; i++) {
          const o = ctx.createOscillator(), g = ctx.createGain();
          const s = t + i * 0.04;
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(700 + Math.random() * 900, s);
          o.frequency.exponentialRampToValueAtTime(240, s + 0.13);
          g.gain.setValueAtTime(0.07, s);
          g.gain.exponentialRampToValueAtTime(0.0001, s + 0.15);
          o.connect(g); g.connect(d);
          o.start(s); o.stop(s + 0.17);
        }
        break;
      case 'saw': { // two-stroke motor, then a bite
        const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(70, t);
        o.frequency.linearRampToValueAtTime(190, t + 0.3);
        o.frequency.linearRampToValueAtTime(150, t + 0.9);
        f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 3;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.2, t + 0.1);
        g.gain.setValueAtTime(0.2, t + 0.7);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
        o.connect(f); f.connect(g); g.connect(d);
        o.start(t); o.stop(t + 1.05);
        break;
      }
      case 'harmonica': { // breathy reed chord with a bend
        [0, 4, 7].forEach((s) => {
          const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(mtof(57 + s) * 0.97, t);
          o.frequency.linearRampToValueAtTime(mtof(57 + s), t + 0.25);
          f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 2;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.1, t + 0.12);
          g.gain.setValueAtTime(0.1, t + 0.6);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
          o.connect(f); f.connect(g); g.connect(d);
          const sn = ctx.createGain(); sn.gain.value = 0.5; g.connect(sn); sn.connect(A._bus.verb);
          o.start(t); o.stop(t + 1.05);
        });
        break;
      }
      case 'surf': { // whammy-dive reverb wave
        const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(880, t);
        o.frequency.exponentialRampToValueAtTime(110, t + 0.7);
        f.type = 'lowpass'; f.frequency.value = 2200; f.Q.value = 6;
        g.gain.setValueAtTime(0.16, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
        o.connect(f); f.connect(g); g.connect(d);
        const sn = ctx.createGain(); sn.gain.value = 0.9; g.connect(sn); sn.connect(A._bus.verb);
        o.start(t); o.stop(t + 0.9);
        break;
      }
      case 'bars': { // horn stabs over a fast hat roll
        [0, 3, 7, 5, 3, 0].forEach((s, i) => {
          const st = t + i * 0.085;
          V.lead(st, mtof(58 + s), 0.16, 0.12, d, 'sawtooth', 0.3);
          V.hat(st, 0.09, d, false);
        });
        V.snare(t + 0.51, 0.35, d);
        break;
      }
      default:
        V.guitar(t, mtof(50), 0.4, 0.25, d);
    }
  };

  A.sfx = function (name, arg) {
    if (!A.ctx || !A.sfxOn) return;
    const fn = SFX[name];
    if (fn) { try { fn(arg); } catch (e) { /* audio node budget; drop the sound */ } }
  };

  IB.Audio = A;
})(window.IB);
