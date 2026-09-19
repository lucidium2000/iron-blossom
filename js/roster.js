/* Iron Blossom — the roster.
   An unofficial fan tribute. Fighters are stylised caricatures of acts on the
   real Iron Blossom 2026 bill (Midtown Green, Richmond VA, Sept 19-20), and
   every special move is built from something that act is actually known for. */
window.IB = window.IB || {};
(function (IB) {
  'use strict';

  // Shared normal-attack frame data. Characters scale these with `tune`.
  const NORMALS = {
    light: {
      name: 'Jab', startup: 4, active: 3, recovery: 8, dmg: 30, chip: 0,
      hitstun: 14, blockstun: 9, push: 2.2, meter: 7, lvl: 'mid',
      box: { x: 38, y: -124, w: 64, h: 36 }, poses: ['jabS', 'jabH'], sfxPow: 0.25,
    },
    heavy: {
      name: 'Heavy', startup: 10, active: 4, recovery: 17, dmg: 78, chip: 6,
      hitstun: 22, blockstun: 13, push: 6, meter: 13, lvl: 'mid',
      box: { x: 42, y: -120, w: 92, h: 48 }, poses: ['hookS', 'hookH'], sfxPow: 0.8,
    },
    kick: {
      name: 'Kick', startup: 7, active: 4, recovery: 13, dmg: 54, chip: 4,
      hitstun: 18, blockstun: 11, push: 4.5, meter: 10, lvl: 'mid',
      box: { x: 44, y: -98, w: 100, h: 42 }, poses: ['kickS', 'kickH'], sfxPow: 0.55,
    },
    lowKick: {
      name: 'Low Sweep', startup: 6, active: 3, recovery: 15, dmg: 42, chip: 3,
      hitstun: 16, blockstun: 10, push: 3, meter: 9, lvl: 'low', trip: true,
      box: { x: 36, y: -40, w: 92, h: 36 }, poses: ['kickS', 'lowKickH'], sfxPow: 0.45,
    },
    upper: {
      name: 'Launcher', startup: 9, active: 4, recovery: 22, dmg: 72, chip: 5,
      hitstun: 26, blockstun: 14, push: 3, meter: 14, lvl: 'mid', launch: 13,
      box: { x: 22, y: -168, w: 66, h: 86 }, poses: ['upperS', 'upperH'], sfxPow: 0.75,
    },
    crouchJab: {
      name: 'Low Jab', startup: 4, active: 3, recovery: 9, dmg: 24, chip: 0,
      hitstun: 13, blockstun: 8, push: 2, meter: 6, lvl: 'low',
      box: { x: 34, y: -62, w: 66, h: 32 }, poses: ['jabS', 'jabH'], crouching: true, sfxPow: 0.2,
    },
    airAttack: {
      name: 'Air Kick', startup: 5, active: 8, recovery: 6, dmg: 58, chip: 5,
      hitstun: 20, blockstun: 12, push: 3, meter: 11, lvl: 'overhead', air: true,
      box: { x: 30, y: -76, w: 90, h: 52 }, poses: ['kickS', 'airKickH'], sfxPow: 0.6,
    },
    grab: {
      name: 'Grab', startup: 5, active: 3, recovery: 18, dmg: 0, meter: 5,
      box: { x: 30, y: -120, w: 56, h: 74 }, poses: ['grabS', 'grabH'], isGrab: true,
    },
  };

  // Instrument-swingers replace the heavy with a big overhead arc.
  const SWING_HEAVY = {
    name: 'Swing', startup: 13, active: 5, recovery: 21, dmg: 96, chip: 9,
    hitstun: 26, blockstun: 16, push: 8, meter: 16, lvl: 'mid',
    box: { x: 34, y: -160, w: 106, h: 96 }, poses: ['swingS', 'swingH'], sfxPow: 1,
  };

  function moveset(over) {
    const m = {};
    for (const k in NORMALS) m[k] = Object.assign({}, NORMALS[k], { box: Object.assign({}, NORMALS[k].box) });
    if (over) for (const k in over) m[k] = Object.assign(m[k] || {}, over[k]);
    return m;
  }

  function tune(m, mult) {
    for (const k in m) {
      if (typeof m[k].dmg === 'number') m[k].dmg = Math.round(m[k].dmg * (mult.dmg || 1));
      if (mult.reach) { m[k].box.w = Math.round(m[k].box.w * mult.reach); }
      if (mult.speed) {
        m[k].startup = Math.max(3, Math.round(m[k].startup * mult.speed));
        m[k].recovery = Math.max(4, Math.round(m[k].recovery * mult.speed));
      }
    }
    return m;
  }

  const R = [
    {
      id: 'jackwhite',
      name: 'JACK WHITE',
      tag: 'The Third Man',
      slot: 'Sun · Iron Stage · 9:30 PM',
      blurb: 'Closes the whole festival. Plays a guitar like it owes him money.',
      archetype: 'All-rounder · high damage',
      ui: ['#D7263D', '#F4F1F2'],
      look: {
        skin: '#F0DDD2', hair: '#141018', hairStyle: 'longWavy',
        face2: { jaw: 0.94, chin: 1.06, nose: 'straight', beard: 'stubble',
          beardColor: '#2A2430', browWeight: 0.18, browAngle: 0.18, mouth: 'set' },
        top: '#262030', sleeve: '#201A28', sleeveLong: false, pants: '#33303E',
        shoe: '#9E1228', height: 172, bulk: 1.02,
      },
      prop: { kind: 'guitar', body: '#D7263D', neck: '#E8D7B4', accent: '#F4F1F2' },
      stats: { hp: 1200, walk: 3.1, dash: 7.4, jump: 17.2, weight: 1.0, defense: 1.0 },
      moves: tune(moveset({ heavy: Object.assign({}, SWING_HEAVY, { box: { x: 34, y: -160, w: 106, h: 96 } }) }), { dmg: 1.05 }),
      special: {
        name: 'SEVEN NATION ARMY', kind: 'riff', cost: 50,
        desc: 'Stomps out the riff. Seven notes march down the stage, one per beat, each one hitting harder than the last.',
        hits: 7, dmg: 26, windup: 16, sfx: 'riff',
      },
      special2: {
        name: 'THIRD MAN', kind: 'third', cost: 50,
        desc: 'Red, white and black step out of him and all three swing at once.',
        sfx: 'riff',
      },
      superMove: {
        name: 'BLUE ORCHID', kind: 'riffSuper', cost: 100,
        desc: 'The amp stack feeds back until the whole riverfront is one distorted chord.',
        dmg: 300,
      },
      winQuote: 'Every note I played, I meant.',
      pick: 'Let\'s get loud.',
    },
    {
      id: 'lcd',
      name: 'LCD SOUNDSYSTEM',
      tag: 'Saturday Headliner',
      slot: 'Sat · Iron Stage · 9:30 PM',
      blurb: 'Dance-punk with a doctorate. Brought the cowbell and the whole rig.',
      archetype: 'Zoner · builds meter fast',
      ui: ['#F2F2EF', '#2B2F3A'],
      look: {
        skin: '#EFD4C2', hair: '#9A948E', hairStyle: 'messyGrey',
        face2: { jaw: 1.06, chin: 0.94, nose: 'roman', beard: 'full',
          beardColor: '#A29C94', ruddy: true, browWeight: 0.15, mouth: 'smirk' },
        top: '#F0F0EA', sleeve: '#24262E', sleeveLong: true, pants: '#333644',
        shoe: '#2A2A34', vest: '#24262E', height: 174, bulk: 1.06,
      },
      prop: { kind: 'cowbell', body: '#C9A227', neck: '#8A6E1E', accent: '#F2F2EF' },
      stats: { hp: 1220, walk: 2.8, dash: 6.6, jump: 16.2, weight: 1.08, defense: 1.02 },
      moves: tune(moveset(), { reach: 1.05 }),
      special: {
        name: 'DANCE YRSELF CLEAN', kind: 'drop', cost: 50,
        desc: 'Four bars of almost nothing — then the drop lands and the low end knocks everyone off the barricade.',
        windup: 46, dmg: 150, radius: 300, sfx: 'drop',
      },
      special2: {
        name: 'MORE COWBELL', kind: 'cowbells', cost: 50,
        desc: 'Nine cowbells, from directly overhead, onto whoever asked for it.',
        sfx: 'drop',
      },
      superMove: {
        name: 'ALL MY FRIENDS', kind: 'dropSuper', cost: 100,
        desc: 'That one piano figure, repeating, getting louder, for far longer than is reasonable.',
        dmg: 320,
      },
      winQuote: 'You wanted a hit. That was the hit.',
      pick: 'Sound check\'s over.',
    },
    {
      id: 'portugal',
      name: 'PORTUGAL. THE MAN',
      tag: 'Alaska via Portland',
      slot: 'Sun · Iron Stage · 5:30 PM',
      blurb: 'Psych-rock lifers. The light show is doing half the work and that is the point.',
      archetype: 'Tricky · scrambles the opponent',
      ui: ['#7B4BC4', '#F2B441'],
      look: {
        skin: '#E3C4A8', hair: '#2E2418', hairStyle: 'capLong',
        hatColor: '#2B2233', hatBand: '#F2B441',
        face2: { jaw: 1.0, nose: 'straight', beard: 'moustache',
          beardColor: '#3A2E1E', browWeight: 0.15 },
        top: '#7B4BC4', sleeve: '#6A3FB0', sleeveLong: true, pants: '#3A3250',
        shoe: '#F2B441', stripe: '#9B6FE0', height: 170, bulk: 0.98,
      },
      prop: { kind: 'guitar', body: '#F2B441', neck: '#D9B98C', accent: '#7B4BC4' },
      stats: { hp: 1150, walk: 3.3, dash: 7.6, jump: 17.8, weight: 0.95, defense: 0.98 },
      moves: tune(moveset(), { speed: 0.94 }),
      special: {
        name: 'FEEL IT STILL', kind: 'kaleido', cost: 50,
        desc: 'Rolls a wall of kaleidoscope light down the field. Anyone caught in it has their left and right swapped for a few seconds.',
        dmg: 70, confuse: 200, sfx: 'kaleido',
      },
      special2: {
        name: 'LIVE IN THE MOMENT', kind: 'eye', cost: 50,
        desc: 'An enormous eye opens over the stage, blinks once, and fires.',
        sfx: 'kaleido',
      },
      superMove: {
        name: 'EVIL FRIENDS', kind: 'kaleidoSuper', cost: 100,
        desc: 'The whole stage strobes into negative and the floor stops agreeing with you.',
        dmg: 280, confuse: 320,
      },
      winQuote: 'Ooh-woo. That\'s all I\'ve got.',
      pick: 'Watch the lights.',
    },
    {
      id: 'phantogram',
      name: 'PHANTOGRAM',
      tag: 'Saratoga Springs',
      slot: 'Sat · Iron Stage · 5:30 PM',
      blurb: 'Electro-noir. Sarah out front, the low end doing something structural to the field.',
      archetype: 'Rushdown · leaves an echo',
      ui: ['#2ED8C3', '#1B1430'],
      look: {
        skin: '#F2DCCA', hair: '#D9C08C', hairStyle: 'bluntBob',
        face2: { jaw: 0.88, chin: 1.0, nose: 'small', eyeColor: '#1C2630',
          browWeight: 0.11, makeup: '#241C30', mouth: 'set' },
        top: '#2B2148', sleeve: '#231A3C', sleeveLong: true, pants: '#3A2C5E',
        shoe: '#2ED8C3', vest: '#2ED8C3', height: 164, bulk: 0.92,
      },
      prop: { kind: 'mic', body: '#2ED8C3', neck: '#1B1430', accent: '#F0D7C4' },
      stats: { hp: 1140, walk: 3.6, dash: 8.2, jump: 18.4, weight: 0.9, defense: 0.96 },
      moves: tune(moveset(), { speed: 0.88, dmg: 0.92 }),
      special: {
        name: 'GHOST SIGNAL', kind: 'phase', cost: 50,
        desc: 'Splits off a phantom that replays everything she does one beat behind her. Every hit lands twice.',
        dmg: 60, echoTime: 360, sfx: 'phase',
      },
      special2: {
        name: 'BLACK OUT DAYS', kind: 'blackout', cost: 50,
        desc: 'She drops out of the signal and comes back in behind you.',
        sfx: 'phase',
      },
      superMove: {
        name: 'MOUTHFUL OF DIAMONDS', kind: 'phaseSuper', cost: 100,
        desc: 'Three phantoms, one beat apart, all arriving at once.',
        dmg: 290,
      },
      winQuote: 'You were never fighting me.',
      pick: 'Two of us now.',
    },
    {
      id: 'dijon',
      name: 'DIJON',
      tag: 'Sub-headliner, Saturday',
      slot: 'Sat · Iron Stage · 7:20 PM',
      blurb: 'Plays like the band is in his kitchen. Everything is loose and nothing is casual.',
      archetype: 'Grappler · heals through the crowd',
      ui: ['#E2703A', '#3B2417'],
      look: {
        skin: '#B0784E', hair: '#1E1610', hairStyle: 'beanieCurls',
        hatColor: '#22242C', chain: '#D8B45A',
        face2: { jaw: 1.10, chin: 0.90, brow: 1.02, nose: 'wide',
          beard: 'light', beardColor: '#241A12', browWeight: 0.185,
          browAngle: 0.06, eyeOpen: 0.94, mouth: 'smirk' },
        top: '#E2703A', sleeve: '#D0632F', pants: '#4E3120',
        shoe: '#F2E3D0', height: 170, bulk: 1.05,
      },
      prop: { kind: 'mic', body: '#F2E3D0', neck: '#3B2417', accent: '#E2703A' },
      stats: { hp: 1300, walk: 2.9, dash: 6.8, jump: 16.0, weight: 1.12, defense: 1.08 },
      moves: tune(moveset(), { dmg: 1.08, speed: 1.06 }),
      special: {
        name: 'ABSOLUTELY', kind: 'soul', cost: 50,
        desc: 'Calls the whole band in around one mic. Takes a chunk of health back and eats the next hit without flinching.',
        heal: 140, armor: 150, dmg: 60, sfx: 'soul',
      },
      special2: {
        name: 'STAGE DIVE', kind: 'stagedive', cost: 50,
        desc: 'Off the front of the stage, over the barricade, straight back down on you.',
        sfx: 'soul',
      },
      superMove: {
        name: 'THE DRESS', kind: 'soulSuper', cost: 100,
        desc: 'One take, no click track, everybody singing. The barricade gives out.',
        dmg: 300, heal: 90,
      },
      winQuote: 'We were just messing around.',
      pick: 'Y\'all ready?',
    },
    {
      id: 'geese',
      name: 'GEESE',
      tag: 'Brooklyn',
      slot: 'Sun · Iron Stage · 7:20 PM',
      blurb: 'Art-rock played at a dangerous angle. Cameron is going to do something with that mic stand.',
      archetype: 'Erratic · fast and weird',
      ui: ['#C8B560', '#2C3A2E'],
      look: {
        skin: '#F0DCC8', hair: '#2E2018', hairStyle: 'wavyMane',
        face2: { jaw: 0.84, chin: 1.10, nose: 'straight', browWeight: 0.13,
          eyeOpen: 0.9, mouth: 'open' },
        top: '#F0E8D8', sleeve: '#E2D9C6', sleeveLong: true, pants: '#394A3B',
        shoe: '#8B6A3A', vest: '#C8B560', height: 168, bulk: 0.94,
      },
      prop: { kind: 'mic', body: '#C8B560', neck: '#2C3A2E', accent: '#F0E8D8' },
      stats: { hp: 1130, walk: 3.5, dash: 8.6, jump: 18.8, weight: 0.88, defense: 0.94 },
      moves: tune(moveset(), { speed: 0.86, dmg: 0.9, reach: 1.06 }),
      special: {
        name: 'HONK FORMATION', kind: 'flock', cost: 50,
        desc: 'A V of extremely committed geese comes in low across the field. Multi-hit. Unpleasant.',
        hits: 6, dmg: 22, sfx: 'flock',
      },
      special2: {
        name: 'MIC STAND', kind: 'micstand', cost: 50,
        desc: 'Swings the stand out on the cable, then lets it come all the way back.',
        sfx: 'flock',
      },
      superMove: {
        name: '3D COUNTRY', kind: 'flockSuper', cost: 100,
        desc: 'The whole flock. From both sides. There is no safe part of the stage.',
        dmg: 285,
      },
      winQuote: 'They do that on their own, actually.',
      pick: 'Let them out.',
    },
    {
      id: 'diespitz',
      name: 'DIE SPITZ',
      tag: 'Austin punk',
      slot: 'Sat · Blossom Stage · 8:45 PM',
      blurb: 'Four of them, and they all swap instruments mid-set. Also: the chainsaw is real.',
      archetype: 'Stance-swap · brutal up close',
      ui: ['#E0245E', '#141014'],
      look: {
        skin: '#F2D3C4', hair: '#D8452A', hairStyle: 'punkShag',
        face2: { jaw: 0.90, nose: 'small', browWeight: 0.19, browAngle: 0.22,
          makeup: '#1A1220', eyeColor: '#140F18', mouth: 'set' },
        top: '#2A2430', sleeve: '#221D28', pants: '#343040', shorts: false,
        shoe: '#5E1730', vest: '#E0245E', height: 166, bulk: 0.96,
      },
      prop: { kind: 'guitar', body: '#141014', neck: '#C9B28E', accent: '#E0245E' },
      stats: { hp: 1160, walk: 3.4, dash: 8.0, jump: 17.6, weight: 0.94, defense: 0.95 },
      moves: tune(moveset({ heavy: Object.assign({}, SWING_HEAVY) }), { speed: 0.92 }),
      special: {
        name: 'CHAINSAW SWAP', kind: 'saw', cost: 50,
        desc: 'Pulls the cord, cuts straight through the guitar, and comes out the other side on a different instrument. Multi-hit, and it changes her normals.',
        hits: 5, dmg: 24, sfx: 'saw',
      },
      special2: {
        name: 'FOUR-PIECE', kind: 'fourpiece', cost: 50,
        desc: 'All four of them at once, walking a wall of sound into you.',
        sfx: 'saw',
      },
      superMove: {
        name: 'HOUSE SHOW', kind: 'sawSuper', cost: 100,
        desc: 'All four of them at once, in a room that is much too small for this.',
        dmg: 310,
      },
      winQuote: 'That guitar was already broken.',
      pick: 'Start it up.',
    },
    {
      id: 'morby',
      name: 'KEVIN MORBY',
      tag: 'Kansas City',
      slot: 'Sat · Iron Stage · 4:15 PM',
      blurb: 'Troubadour in a good suit. Long songs, longer reach.',
      archetype: 'Long range · patient',
      ui: ['#C9A227', '#2B3A4A'],
      look: {
        skin: '#EEDCC8', hair: '#7A4A28', hairStyle: 'frizzy',
        face2: { jaw: 0.95, nose: 'straight', beard: 'moustache',
          beardColor: '#6A3E20', browWeight: 0.14, mouth: 'set' },
        top: '#F2EDE0', sleeve: '#E8E0D0', sleeveLong: true, pants: '#EDE6D6',
        shoe: '#5A3A22', stripe: '#E8C060', height: 176, bulk: 0.96,
      },
      prop: { kind: 'acoustic', body: '#D9B07A', neck: '#6B4A2A', accent: '#C9A227' },
      stats: { hp: 1150, walk: 2.9, dash: 6.9, jump: 17.0, weight: 0.98, defense: 1.0 },
      moves: tune(moveset(), { reach: 1.18, speed: 1.04 }),
      special: {
        name: 'HARMONICA HOWL', kind: 'harmonica', cost: 50,
        desc: 'Full-length harmonica note that travels the whole stage, pushing everything in front of it backward.',
        dmg: 85, push: 16, sfx: 'harmonica',
      },
      special2: {
        name: 'SINGING SAW', kind: 'singingsaw', cost: 50,
        desc: 'Bows a musical saw. The note wobbles, and it takes you off the deck.',
        sfx: 'harmonica',
      },
      superMove: {
        name: 'THIS IS A PHOTOGRAPH', kind: 'harmonicaSuper', cost: 100,
        desc: 'Holds the note until the PA gives out.',
        dmg: 275,
      },
      winQuote: 'I had another verse, too.',
      pick: 'This one\'s long.',
    },
    {
      id: 'laluz',
      name: 'LA LUZ',
      tag: 'Surf noir',
      slot: 'Sat · Blossom Stage · 4:55 PM',
      blurb: 'Reverb-drowned surf harmonies. Sounds like a beach at night and hits like one too.',
      archetype: 'Low attacks · controls the floor',
      ui: ['#2E8B8B', '#F2C4CE'],
      look: {
        skin: '#E8C4A8', hair: '#1E1620', hairStyle: 'bangsLong',
        face2: { jaw: 0.90, chin: 0.98, nose: 'small', browWeight: 0.12,
          makeup: '#2A1E2E', mouth: 'set' },
        top: '#2E8B8B', sleeve: '#28787A', sleeveLong: true, pants: '#26616A',
        shoe: '#F2C4CE', stripe: '#3FB0A8', height: 166, bulk: 0.93,
      },
      prop: { kind: 'guitar', body: '#2E8B8B', neck: '#E0C79B', accent: '#F2C4CE' },
      stats: { hp: 1140, walk: 3.3, dash: 7.8, jump: 17.4, weight: 0.92, defense: 0.97 },
      moves: tune(moveset(), { speed: 0.93 }),
      special: {
        name: 'REVERB TIDE', kind: 'surf', cost: 50,
        desc: 'A wave of spring reverb rolls along the deck. It hits low — the only answer is to be in the air.',
        dmg: 95, lvl: 'low', sfx: 'surf',
      },
      special2: {
        name: 'BREAKER', kind: 'breaker', cost: 50,
        desc: 'The other wave runs low. This one comes down from above — block standing.',
        sfx: 'surf',
      },
      superMove: {
        name: 'BROKEN PORCELAIN', kind: 'surfSuper', cost: 100,
        desc: 'The tide comes all the way in and takes the front barricade with it.',
        dmg: 285,
      },
      winQuote: 'It sounds better underwater.',
      pick: 'Drown it in reverb.',
    },
    {
      id: 'mckinley',
      name: 'McKINLEY DIXON',
      tag: 'Richmond, VA',
      slot: 'Sat · Iron Stage · 3:00 PM',
      blurb: 'Hometown. Raps over a live jazz band and does not waste a single bar.',
      archetype: 'Rushdown · relentless pressure',
      ui: ['#E8B33C', '#4A2C6B'],
      look: {
        skin: '#6E4228', hair: '#D8461E', hairStyle: 'twists',
        face2: { jaw: 0.90, chin: 1.04, nose: 'wide', beard: 'goatee',
          beardColor: '#1C1410', browWeight: 0.16, mouth: 'set', noSheen: true },
        top: '#5A3680', sleeve: '#4A2C6B', sleeveLong: true, pants: '#382450',
        shoe: '#E8B33C', vest: '#E8B33C', height: 172, bulk: 1.0,
      },
      prop: { kind: 'mic', body: '#E8B33C', neck: '#2A1A3E', accent: '#F2E3D0' },
      stats: { hp: 1190, walk: 3.6, dash: 8.4, jump: 17.8, weight: 0.97, defense: 1.0 },
      moves: tune(moveset(), { speed: 0.85, dmg: 0.94 }),
      special: {
        name: 'BAR FOR BAR', kind: 'bars', cost: 50,
        desc: 'Closes the distance and delivers six bars without breathing. Horn section punctuates each one.',
        hits: 6, dmg: 25, sfx: 'bars',
      },
      special2: {
        name: 'THE BAND', kind: 'theband', cost: 50,
        desc: 'The whole live band lands around him and the horn section goes up.',
        sfx: 'bars',
      },
      superMove: {
        name: 'BELOVED! PARADISE!', kind: 'barsSuper', cost: 100,
        desc: 'The whole band comes in behind him and the verse does not stop.',
        dmg: 305,
      },
      winQuote: 'Richmond. Say it louder.',
      pick: 'RVA, stand up.',
    },
  ];

  // Backfill derived look values every renderer expects.
  R.forEach((c) => {
    c.look.face = 1;
    c.look.H = c.look.height;
    c.look.headR = c.look.height * 0.082 * (c.look.bulk || 1);
    c.moves.special = {
      name: c.special.name, startup: c.special.windup || 14, active: 4, recovery: 22,
      dmg: 0, meter: 0, cost: c.special.cost, isSpecial: true,
      poses: ['spWind', 'spRel'], box: { x: 0, y: 0, w: 0, h: 0 },
    };
    c.moves.special2 = {
      name: c.special2.name, startup: 16, active: 4, recovery: 24,
      dmg: 0, meter: 0, cost: c.special2.cost, isSpecial: true, second: true,
      poses: ['spWind', 'spRel'], box: { x: 0, y: 0, w: 0, h: 0 },
    };
    c.moves.superMove = {
      name: c.superMove.name, startup: 18, active: 6, recovery: 30,
      dmg: 0, meter: 0, cost: 100, isSuper: true,
      poses: ['spWind', 'spRel'], box: { x: 0, y: 0, w: 0, h: 0 },
    };
  });

  IB.ROSTER = R;
  IB.byId = (id) => R.find((c) => c.id === id) || R[0];
  IB.NORMALS = NORMALS;
})(window.IB);
