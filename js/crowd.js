/* Iron Blossom — the crowd behind the barricade.
   Four parallax rows of festival-goers who bob on the beat, film with their
   phones, throw their arms up on big hits, and heckle whoever is on stage. */
window.IB = window.IB || {};
(function (IB) {
  'use strict';
  const U = IB.U;
  const V = IB.VIEW;

  // Muted on purpose: the crowd is a texture, not a subject. Anything brighter
  // fights the fighters for attention.
  const SHIRTS = ['#6E3A32', '#2C4450', '#8A6E38', '#3E4A38', '#5A3446', '#8A8478',
    '#242833', '#4E3A2A', '#2E4A44', '#73432A', '#413356', '#1E2630', '#7A5A66'];
  const SKINS = ['#C4A28C', '#B08E70', '#9A7452', '#7A5636', '#5C3A22', '#402616', '#CBAE96'];
  const HAIRS = ['#161210', '#2C1E14', '#4E3820', '#8E7440', '#63242E', '#22222C', '#9A948A',
    '#3E2A44', '#1E2A38', '#6E5638'];
  const HATSTYLE = [null, null, null, null, null, 'cap', 'cap', 'bucket', 'beanie', 'cowboy'];
  const HAIRSTYLE = ['short', 'short', 'long', 'long', 'bun', 'pony', 'curly', 'buzz', 'bald', 'shag'];
  const TOPSTYLE = ['tee', 'tee', 'tee', 'tank', 'hoodie', 'button', 'tee', 'tank'];
  const HANDPROP = [null, null, null, null, null, null, 'cup', 'glow', 'horns', 'peace', 'sign'];

  // Heckles are aimed at "whoever is on stage" generally — the sort of thing a
  // festival crowd shouts at anyone.
  const HECKLES = [
    'PLAY SOMETHING I KNOW!', 'FREEBIRD!', 'LOUDER!!', 'MY FEET HURT',
    'IS THIS STILL THE OPENER?', 'RVA!!! RVA!!!', 'I PAID $16 FOR THIS BEER',
    'PLAY THE HIT!', 'I CAN\'T SEE ANYTHING', 'DO AN ENCORE!',
    'SOMEBODY IS IN MY SPOT', 'WOOOOOOO', 'TURN THE VOCALS UP',
    'MY PHONE IS AT 4%', 'I DROVE FROM NORFOLK FOR THIS',
    'WHERE\'S THE FUNNEL CAKE', 'SHOW US THE SETLIST', 'WHO IS ON NEXT?',
    'THAT WAS NOT THE RIGHT KEY', 'ONE MORE SONG!', 'IS IT GONNA RAIN?',
    'SUNSCREEN? ANYONE?', 'MY RIDE LEAVES AT TEN', 'THE MERCH LINE IS INSANE',
    'TAKE IT TO THE BRIDGE', 'I LOVE YOU!!', 'SECURITY IS WATCHING',
    'THIS IS MY SONG!', 'DO THE SLOW ONE', 'I HAVE WORK TOMORROW',
  ];

  const REACT_HIT = ['OOOOOOH!', 'DAMN!', 'GET \'EM!', 'NO WAY!', 'AYYYY!', 'HE FELT THAT'];
  const REACT_KO = ['THAT\'S THE ENCORE!', 'IT\'S OVER!', 'OHHHHHH!', 'SOMEBODY CALL SECURITY'];
  const REACT_SPECIAL = ['THERE IT IS!', 'THAT\'S THE ONE!', 'TURN IT UP!', 'LET\'S GOOO!'];

  function Crowd(stage) {
    this.stage = stage;
    this.people = [];
    this.bubbles = [];
    this.surfers = [];
    this.excite = 0;
    this.nextHeckle = 1.5;
    this.nextSurfer = 8;

    const cfg = stage.crowd || { density: 1, mood: 1 };
    // Four rows: 0 nearest the barricade, 3 furthest back and hazed out.
    const rows = [
      { y: V.BARRICADE_Y + 8, s: 1.0, par: 0.68, haze: 0.0, step: 30 },
      { y: V.BARRICADE_Y - 20, s: 0.87, par: 0.61, haze: 0.12, step: 26 },
      { y: V.BARRICADE_Y - 44, s: 0.74, par: 0.55, haze: 0.24, step: 22 },
      { y: V.BARRICADE_Y - 65, s: 0.63, par: 0.49, haze: 0.36, step: 19 },
      { y: V.BARRICADE_Y - 83, s: 0.53, par: 0.44, haze: 0.48, step: 16 },
    ];
    this.rows = rows;

    rows.forEach((row, ri) => {
      const step = row.step / Math.max(cfg.density, 0.3);
      for (let x = -80; x < 2700; x += step * (0.7 + U.hash(x, ri) * 0.6)) {
        const r = U.hash(x, ri * 17 + 3);
        const shirt = SHIRTS[(U.hash(x, ri + 1) * SHIRTS.length) | 0];
        this.people.push({
          x, row: ri,
          s: row.s * (0.88 + U.hash(x, ri + 9) * 0.26),
          shirt,
          skin: SKINS[(U.hash(x, ri + 2) * SKINS.length) | 0],
          hair: HAIRS[(U.hash(x, ri + 5) * HAIRS.length) | 0],
          phase: U.hash(x, ri + 7) * U.TAU,
          rate: 0.85 + U.hash(x, ri + 11) * 0.4,
          // what this person is doing: filming, arms up, on shoulders, normal
          kind: r > 0.86 ? 'shoulders' : r > 0.66 ? 'phone' : r > 0.42 ? 'armsup' : 'normal',
          hat: HATSTYLE[(U.hash(x, ri + 13) * HATSTYLE.length) | 0],
          hairStyle: HAIRSTYLE[(U.hash(x, ri + 17) * HAIRSTYLE.length) | 0],
          top: TOPSTYLE[(U.hash(x, ri + 19) * TOPSTYLE.length) | 0],
          prop: HANDPROP[(U.hash(x, ri + 23) * HANDPROP.length) | 0],
          shades: U.hash(x, ri + 29) > 0.80,
          // a band tee: a contrasting block on the chest
          tee: U.hash(x, ri + 31) > 0.55 ? U.shade(shirt, U.hash(x, ri + 37) > 0.5 ? 0.45 : -0.4) : null,
          lean: (U.hash(x, ri + 41) - 0.5) * 0.18,
          flash: 0,
        });
      }
    });
    this.people.sort((a, b) => b.row - a.row);

    // pit security along the barricade, facing the crowd
    this.guards = [];
    for (let x = 60; x < 2700; x += 330 + U.hash(x, 3) * 120) {
      this.guards.push({
        x,
        s: 1.24 + U.hash(x, 51) * 0.18,
        skin: SKINS[(U.hash(x, 53) * SKINS.length) | 0],
        hair: HAIRS[(U.hash(x, 59) * HAIRS.length) | 0],
        phase: U.hash(x, 61) * U.TAU,
      });
    }
    this.hype = 0;
    this.balls = [];
    this.nextBall = U.rand(6, 14);
  }

  Crowd.prototype.react = function (kind, worldX) {
    const pool = kind === 'ko' ? REACT_KO : kind === 'special' ? REACT_SPECIAL : REACT_HIT;
    this.excite = Math.min(1, this.excite + (kind === 'ko' ? 1 : kind === 'special' ? 0.6 : 0.35));
    const n = kind === 'ko' ? 4 : kind === 'special' ? 3 : 1;
    for (let i = 0; i < n; i++) {
      this.speak(U.pick(pool), worldX + U.rand(-560, 560), 1.7, true);
    }
    // a scatter of camera flashes on the big moments
    if (kind !== 'hit') {
      this.people.forEach((p) => { if (p.kind === 'phone' && Math.random() < 0.3) p.flash = 1; });
    }
  };

  Crowd.prototype.speak = function (text, nearX, life, loud) {
    // Attach the bubble to an actual person so it tracks with parallax, and
    // keep clear of whoever is already talking so the callouts stay legible.
    const busy = this.bubbles.map((b) => b.p.x);
    let best = null, bd = 1e9, fallback = null, fd = 1e9;
    for (let i = 0; i < this.people.length; i++) {
      const p = this.people[i];
      if (p.row > 1) continue;
      const d = Math.abs(p.x - nearX) + U.hash(i, 3) * 60;
      if (d < fd) { fd = d; fallback = p; }
      let clear = true;
      for (let k = 0; k < busy.length; k++) if (Math.abs(busy[k] - p.x) < 260) { clear = false; break; }
      if (clear && d < bd) { bd = d; best = p; }
    }
    best = best || fallback;
    if (!best) return;
    // stagger heights so two nearby bubbles never sit on the same line
    const lane = this.bubbles.length % 3;
    this.bubbles.push({ p: best, text, t: 0, life: life || 2.4, loud: !!loud, lane });
    if (this.bubbles.length > 5) this.bubbles.shift();
  };

  Crowd.prototype.update = function (dt, focusX) {
    this.excite = Math.max(0, this.excite - dt * 0.55);
    this.nextHeckle -= dt;
    if (this.nextHeckle <= 0) {
      this.nextHeckle = U.rand(2.6, 6.5) / (0.6 + this.excite);
      this.speak(U.pick(HECKLES), focusX + U.rand(-420, 420), U.rand(2.2, 3.2), false);
    }
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.t += dt;
      if (b.t > b.life) this.bubbles.splice(i, 1);
    }
    for (let i = 0; i < this.people.length; i++) {
      if (this.people[i].flash > 0) this.people[i].flash -= dt * 3.5;
    }

    this.nextBall -= dt;
    if (this.nextBall <= 0) {
      this.nextBall = U.rand(14, 28);
      this.balls.push({ x: focusX - 500, y: -40, vx: U.rand(50, 90), vy: -30, t: 0, spin: 0 });
    }
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.t += dt;
      b.x += b.vx * dt;
      b.vy += 90 * dt;
      b.y += b.vy * dt;
      b.spin += dt * 1.6;
      // the crowd keeps batting it back up
      if (b.y > 0) { b.y = 0; b.vy = -U.rand(70, 110); }
      if (b.x > 2700) this.balls.splice(i, 1);
    }

    this.nextSurfer -= dt;
    if (this.nextSurfer <= 0) {
      this.nextSurfer = U.rand(11, 22);
      this.surfers.push({ x: -120, y: 0, row: 0, dir: 1, t: 0 });
    }
    for (let i = this.surfers.length - 1; i >= 0; i--) {
      const s = this.surfers[i];
      s.t += dt;
      s.x += dt * 130 * s.dir;
      if (s.x > 2600) this.surfers.splice(i, 1);
    }
    if (IB.Audio && IB.Audio.crowdLevel) IB.Audio.crowdLevel(this.excite);
  };

  /* -------------------------------------------------------------- drawing */

  // Two-segment arm with a round cap at the hand.
  function arm(ctx, x1, y1, x2, y2, x3, y3, w, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.stroke();
  }

  function handProp(ctx, p, x, y, s, kind) {
    switch (kind) {
      case 'cup':
        ctx.fillStyle = '#E8E2D4';
        ctx.beginPath();
        ctx.moveTo(x - 3.4 * s, y - 7 * s);
        ctx.lineTo(x + 3.4 * s, y - 7 * s);
        ctx.lineTo(x + 2.4 * s, y + 1 * s);
        ctx.lineTo(x - 2.4 * s, y + 1 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#B5432A';
        ctx.fillRect(x - 3.2 * s, y - 7 * s, 6.4 * s, 1.8 * s);
        break;
      case 'glow': {
        ctx.fillStyle = '#7CE8A0';
        ctx.fillRect(x - 1.2 * s, y - 9 * s, 2.4 * s, 10 * s);
        ctx.fillStyle = U.rgba('#7CE8A0', 0.3);
        ctx.beginPath(); ctx.arc(x, y - 4 * s, 7 * s, 0, U.TAU); ctx.fill();
        break;
      }
      case 'horns':
        ctx.fillStyle = p.skin;
        ctx.fillRect(x - 3 * s, y - 7 * s, 2 * s, 7 * s);
        ctx.fillRect(x + 1.2 * s, y - 7 * s, 2 * s, 7 * s);
        break;
      case 'peace':
        ctx.strokeStyle = p.skin;
        ctx.lineWidth = 1.8 * s;
        ctx.beginPath();
        ctx.moveTo(x - 0.5 * s, y); ctx.lineTo(x - 3 * s, y - 7 * s);
        ctx.moveTo(x + 0.5 * s, y); ctx.lineTo(x + 3 * s, y - 7 * s);
        ctx.stroke();
        break;
      case 'sign': {
        ctx.fillStyle = '#EDE6D6';
        ctx.fillRect(x - 11 * s, y - 15 * s, 22 * s, 13 * s);
        ctx.strokeStyle = '#2A2430'; ctx.lineWidth = 1.2 * s;
        ctx.strokeRect(x - 11 * s, y - 15 * s, 22 * s, 13 * s);
        ctx.fillStyle = '#B5432A';
        ctx.fillRect(x - 8 * s, y - 12.5 * s, 16 * s, 2.4 * s);
        ctx.fillStyle = '#3A3444';
        ctx.fillRect(x - 8 * s, y - 8.5 * s, 12 * s, 1.8 * s);
        ctx.fillRect(x - 8 * s, y - 5.8 * s, 9 * s, 1.8 * s);
        break;
      }
    }
  }

  function hair(ctx, p, x, hy, r, detail) {
    ctx.fillStyle = p.hair;
    switch (p.hairStyle) {
      case 'bald':
        return;
      case 'long':
        ctx.beginPath();
        ctx.ellipse(x, hy + r * 0.55, r * 1.15, r * 1.5, 0, 0, U.TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, hy - r * 0.1, r * 1.06, Math.PI, U.TAU);
        ctx.fill();
        break;
      case 'bun':
        ctx.beginPath(); ctx.arc(x, hy - r * 1.25, r * 0.52, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(x, hy - r * 0.12, r * 1.04, Math.PI, U.TAU); ctx.fill();
        break;
      case 'pony':
        ctx.beginPath();
        ctx.ellipse(x - r * 1.1, hy + r * 0.5, r * 0.4, r * 1.1, 0.3, 0, U.TAU);
        ctx.fill();
        ctx.beginPath(); ctx.arc(x, hy - r * 0.12, r * 1.04, Math.PI, U.TAU); ctx.fill();
        break;
      case 'curly':
        for (let i = 0; i < 5; i++) {
          const a = Math.PI + (i / 4) * Math.PI;
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * r * 0.78, hy + Math.sin(a) * r * 0.78, r * 0.55, 0, U.TAU);
          ctx.fill();
        }
        break;
      case 'buzz':
        ctx.beginPath(); ctx.arc(x, hy - r * 0.05, r * 0.98, Math.PI, U.TAU); ctx.fill();
        break;
      case 'shag':
        ctx.beginPath();
        ctx.moveTo(x - r * 1.15, hy + r * 0.45);
        ctx.quadraticCurveTo(x - r * 1.2, hy - r * 1.25, x, hy - r * 1.2);
        ctx.quadraticCurveTo(x + r * 1.2, hy - r * 1.25, x + r * 1.15, hy + r * 0.45);
        ctx.quadraticCurveTo(x, hy - r * 0.3, x - r * 1.15, hy + r * 0.45);
        ctx.fill();
        break;
      default:
        ctx.beginPath(); ctx.arc(x, hy - r * 0.15, r * 1.05, Math.PI, U.TAU); ctx.fill();
    }
  }

  function hat(ctx, p, x, hy, r) {
    const c = U.shade(p.shirt, -0.35);
    switch (p.hat) {
      case 'cap':
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(x, hy - r * 0.2, r * 1.06, Math.PI, U.TAU); ctx.fill();
        ctx.fillRect(x + r * 0.2, hy - r * 0.4, r * 1.5, r * 0.32);
        break;
      case 'bucket':
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(x, hy - r * 0.15, r * 1.0, Math.PI, U.TAU); ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x, hy - r * 0.15, r * 1.6, r * 0.34, 0, 0, U.TAU);
        ctx.fill();
        break;
      case 'beanie':
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(x, hy - r * 0.1, r * 1.1, Math.PI, U.TAU); ctx.fill();
        ctx.fillRect(x - r * 1.1, hy - r * 0.25, r * 2.2, r * 0.42);
        break;
      case 'cowboy':
        ctx.fillStyle = '#7A5A3A';
        ctx.beginPath(); ctx.arc(x, hy - r * 0.3, r * 0.92, Math.PI, U.TAU); ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x, hy - r * 0.3, r * 1.9, r * 0.34, 0, 0, U.TAU);
        ctx.fill();
        break;
    }
  }

  // detail: 2 = front rows (full anatomy + accessories), 1 = mid, 0 = far
  function person(ctx, p, x, y, beat, excite, detail, hype) {
    const s = p.s;
    const h = 46 * s;
    let bob = Math.sin(beat * U.TAU * p.rate + p.phase) * 3.4 * s * (0.5 + excite);
    // during the encore the whole field jumps together on the beat
    if (hype > 0) {
      const j = Math.max(0, Math.sin(beat * Math.PI));
      bob -= j * j * 15 * s * hype;
    }
    const yy = y + bob;
    const shoulder = yy - h * 0.5;
    const hy = yy - h * 0.8;
    const r = 7.0 * s;
    const lean = p.lean * (detail ? 1 : 0);

    // ---- torso, with a collar shape that varies by garment
    const bodyTop = p.top === 'tank' ? shoulder - h * 0.02 : shoulder - h * 0.06;
    ctx.fillStyle = p.shirt;
    ctx.beginPath();
    ctx.moveTo(x - 10.5 * s + lean * 6, yy + 3 * s);
    ctx.lineTo(x - 11 * s + lean * 8, shoulder + h * 0.04);
    ctx.quadraticCurveTo(x - 10.5 * s + lean * 9, bodyTop, x - 4.5 * s + lean * 9, bodyTop);
    ctx.lineTo(x + 4.5 * s + lean * 9, bodyTop);
    ctx.quadraticCurveTo(x + 10.5 * s + lean * 9, bodyTop, x + 11 * s + lean * 8, shoulder + h * 0.04);
    ctx.lineTo(x + 10.5 * s + lean * 6, yy + 3 * s);
    ctx.closePath();
    ctx.fill();

    if (detail > 0) {
      // band tee graphic
      if (p.tee) {
        ctx.fillStyle = p.tee;
        ctx.fillRect(x - 4.5 * s + lean * 8, shoulder + h * 0.09, 9 * s, 7 * s);
      }
      if (p.top === 'hoodie') {
        // hood bunched behind the neck
        ctx.fillStyle = U.shade(p.shirt, -0.28);
        ctx.beginPath();
        ctx.ellipse(x + lean * 8, shoulder - h * 0.03, 9.5 * s, 5 * s, 0, 0, U.TAU);
        ctx.fill();
        ctx.fillStyle = U.shade(p.shirt, 0.3);
        ctx.fillRect(x - 0.6 * s, shoulder + h * 0.05, 1.2 * s, 8 * s);
      }
      if (p.top === 'button') {
        ctx.strokeStyle = U.shade(p.shirt, -0.35);
        ctx.lineWidth = 1 * s;
        ctx.beginPath();
        ctx.moveTo(x + lean * 8, shoulder);
        ctx.lineTo(x + lean * 6, yy + 2 * s);
        ctx.stroke();
      }
      // shoulder seams read as sleeves
      if (p.top === 'tee') {
        ctx.fillStyle = U.shade(p.shirt, -0.16);
        ctx.fillRect(x - 11 * s + lean * 8, shoulder + h * 0.02, 4 * s, 5.5 * s);
        ctx.fillRect(x + 7 * s + lean * 8, shoulder + h * 0.02, 4 * s, 5.5 * s);
      }
    }

    // ---- arms
    const armW = 3.6 * s;
    const lsx = x - 8 * s + lean * 8, rsx = x + 8 * s + lean * 8;
    const sy = shoulder + h * 0.06;
    const armUp = hype > 0.4 || p.kind === 'armsup' || (p.kind === 'normal' && excite > 0.55);
    const skinArm = p.top === 'tank' || p.top === 'tee' ? p.skin : p.shirt;
    ctx.lineCap = 'round';

    if (p.kind === 'phone') {
      const hx = x + 8 * s, hyy = yy - h * 1.16;
      arm(ctx, rsx, sy, rsx + 5 * s, sy - h * 0.34, hx, hyy, armW, skinArm);
      ctx.fillStyle = '#12141A';
      ctx.fillRect(hx - 3.4 * s, hyy - 10 * s, 7 * s, 12 * s);
      ctx.fillStyle = p.flash > 0 ? '#FFFFFF' : U.rgba('#9AD8FF', 0.85);
      ctx.fillRect(hx - 2.4 * s, hyy - 9 * s, 5 * s, 9.5 * s);
      if (p.flash > 0) {
        ctx.fillStyle = U.rgba('#FFFFFF', p.flash * 0.5);
        ctx.beginPath(); ctx.arc(hx, hyy - 5 * s, 22 * s, 0, U.TAU); ctx.fill();
      }
      arm(ctx, lsx, sy, lsx - 4 * s, sy + h * 0.2, lsx - 6 * s, yy - h * 0.04, armW, skinArm);
    } else if (armUp) {
      const sw = Math.sin(beat * U.TAU * 0.5 + p.phase) * 0.35;
      const rhx = rsx + Math.sin(sw + 0.4) * 9 * s, rhy = yy - h * 1.2;
      const lhx = lsx + Math.sin(sw - 0.4) * 9 * s, lhy = yy - h * 1.16;
      arm(ctx, rsx, sy, rsx + 6 * s, sy - h * 0.36, rhx, rhy, armW, skinArm);
      arm(ctx, lsx, sy, lsx - 6 * s, sy - h * 0.34, lhx, lhy, armW, skinArm);
      if (detail > 0 && p.prop) handProp(ctx, p, rhx, rhy, s, p.prop);
    } else if (p.prop === 'cup' && detail > 0) {
      const hx = rsx + 3 * s, hyy = yy - h * 0.72;
      arm(ctx, rsx, sy, rsx + 5 * s, sy + h * 0.14, hx, hyy, armW, skinArm);
      handProp(ctx, p, hx, hyy, s, 'cup');
      arm(ctx, lsx, sy, lsx - 4 * s, sy + h * 0.2, lsx - 5 * s, yy - h * 0.04, armW, skinArm);
    } else {
      arm(ctx, rsx, sy, rsx + 4.5 * s, sy + h * 0.2, rsx + 5 * s, yy - h * 0.02, armW, skinArm);
      arm(ctx, lsx, sy, lsx - 4.5 * s, sy + h * 0.2, lsx - 5 * s, yy - h * 0.02, armW, skinArm);
    }

    // ---- neck + head
    ctx.fillStyle = U.shade(p.skin, -0.18);
    ctx.fillRect(x - 2.4 * s + lean * 8, shoulder - h * 0.12, 4.8 * s, 6 * s);
    ctx.fillStyle = p.skin;
    ctx.beginPath();
    ctx.ellipse(x + lean * 9, hy, r * 0.94, r * 1.04, 0, 0, U.TAU);
    ctx.fill();

    if (detail > 1) {
      // just enough face to register as people, not features
      ctx.fillStyle = U.rgba('#1A1620', 0.75);
      ctx.fillRect(x - 3 * s + lean * 9, hy - r * 0.1, 1.5 * s, 1.6 * s);
      ctx.fillRect(x + 1.6 * s + lean * 9, hy - r * 0.1, 1.5 * s, 1.6 * s);
    }
    if (p.shades && detail > 0) {
      ctx.fillStyle = '#15121A';
      ctx.fillRect(x - r * 0.8 + lean * 9, hy - r * 0.26, r * 1.6, r * 0.42);
    }

    hair(ctx, p, x + lean * 9, hy, r, detail);
    if (p.hat && detail > 0) hat(ctx, p, x + lean * 9, hy, r);

    // ---- someone up on shoulders
    if (p.kind === 'shoulders') {
      const ty = yy - h * 1.0;
      const tr = r * 0.88;
      ctx.fillStyle = U.shade(p.shirt, 0.28);
      ctx.beginPath();
      ctx.moveTo(x - 7.5 * s, ty);
      ctx.quadraticCurveTo(x, ty - h * 0.52, x + 7.5 * s, ty);
      ctx.closePath();
      ctx.fill();
      const tsy = ty - h * 0.3;
      arm(ctx, x + 5 * s, tsy, x + 10 * s, tsy - h * 0.2, x + 13 * s, ty - h * 0.82, 3.2 * s, p.skin);
      arm(ctx, x - 5 * s, tsy, x - 10 * s, tsy - h * 0.2, x - 13 * s, ty - h * 0.8, 3.2 * s, p.skin);
      ctx.fillStyle = p.skin;
      ctx.beginPath(); ctx.arc(x, ty - h * 0.5, tr, 0, U.TAU); ctx.fill();
      ctx.fillStyle = p.hair;
      ctx.beginPath(); ctx.arc(x, ty - h * 0.54, tr * 1.04, Math.PI, U.TAU); ctx.fill();
    }
  }

  // Pit security: hi-vis, backs to the stage, watching the crowd. Nearer the
  // camera than the barricade, so drawn after it and noticeably larger than
  // anyone in the rows behind.
  function guard(ctx, g, x, y, beat) {
    const s = g.s, h = 74 * s;
    const sway = Math.sin(beat * 0.5 + g.phase) * 1.8 * s;
    const bx = x + sway;
    const shoulder = y - h * 0.62;

    // legs behind the rail
    ctx.fillStyle = '#20242C';
    ctx.fillRect(bx - 8 * s, y - h * 0.3, 6.5 * s, h * 0.3);
    ctx.fillRect(bx + 1.5 * s, y - h * 0.3, 6.5 * s, h * 0.3);

    // torso
    ctx.fillStyle = '#1B1E24';
    ctx.fillRect(bx - 11 * s, shoulder, 22 * s, h * 0.36);

    // hi-vis vest with reflective banding
    ctx.fillStyle = '#D8E84A';
    ctx.beginPath();
    ctx.moveTo(bx - 11.5 * s, shoulder);
    ctx.lineTo(bx + 11.5 * s, shoulder);
    ctx.lineTo(bx + 10 * s, y - h * 0.26);
    ctx.lineTo(bx - 10 * s, y - h * 0.26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = U.rgba('#F4F4EE', 0.8);
    ctx.fillRect(bx - 10.5 * s, shoulder + h * 0.12, 21 * s, 3 * s);
    ctx.fillStyle = '#1B1E24';
    ctx.fillRect(bx - 1.2 * s, shoulder, 2.4 * s, h * 0.3);
    // SECURITY block across the back
    ctx.fillStyle = U.rgba('#1B1E24', 0.85);
    ctx.fillRect(bx - 8 * s, shoulder + h * 0.04, 16 * s, 4.5 * s);

    // arms, hands resting on the rail
    ctx.strokeStyle = '#1B1E24';
    ctx.lineWidth = 5 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx - 10 * s, shoulder + h * 0.05);
    ctx.lineTo(bx - 14 * s, shoulder + h * 0.2);
    ctx.moveTo(bx + 10 * s, shoulder + h * 0.05);
    ctx.lineTo(bx + 14 * s, shoulder + h * 0.2);
    ctx.stroke();
    ctx.fillStyle = g.skin;
    ctx.beginPath(); ctx.arc(bx - 14.5 * s, shoulder + h * 0.22, 3 * s, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + 14.5 * s, shoulder + h * 0.22, 3 * s, 0, U.TAU); ctx.fill();

    // head from behind, plus an earpiece cable
    ctx.fillStyle = g.skin;
    ctx.beginPath(); ctx.arc(bx, shoulder - h * 0.14, 8.4 * s, 0, U.TAU); ctx.fill();
    ctx.fillStyle = g.hair;
    ctx.beginPath(); ctx.arc(bx, shoulder - h * 0.17, 8.6 * s, 0, U.TAU); ctx.fill();
    ctx.fillStyle = g.skin;
    ctx.beginPath(); ctx.arc(bx, shoulder - h * 0.09, 6.4 * s, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#2A2E36';
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    ctx.moveTo(bx + 7 * s, shoulder - h * 0.16);
    ctx.quadraticCurveTo(bx + 10 * s, shoulder - h * 0.02, bx + 8 * s, shoulder + h * 0.06);
    ctx.stroke();
  }

  function bubble(ctx, x, y, text, alpha, loud) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = (loud ? '700 ' : '600 ') + (loud ? 21 : 18) + 'px "Barlow Condensed", "Arial Narrow", sans-serif';
    const w = ctx.measureText(text).width + 22;
    const h = loud ? 30 : 26;
    const bx = x - w / 2, by = y - h;

    ctx.fillStyle = loud ? '#FFE8A8' : '#F7F4EC';
    ctx.strokeStyle = '#15121A';
    ctx.lineWidth = 2.4;
    U.roundRect(ctx, bx, by, w, h, 6);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 6, by + h - 1);
    ctx.lineTo(x + 1, by + h + 9);
    ctx.lineTo(x + 7, by + h - 1);
    ctx.closePath();
    ctx.fillStyle = loud ? '#FFE8A8' : '#F7F4EC';
    ctx.fill();
    ctx.strokeStyle = '#15121A';
    ctx.beginPath();
    ctx.moveTo(x - 6, by + h - 1);
    ctx.lineTo(x + 1, by + h + 9);
    ctx.lineTo(x + 7, by + h - 1);
    ctx.stroke();

    ctx.fillStyle = '#15121A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, by + h / 2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  Crowd.prototype.draw = function (ctx, cam, beat) {
    const ex = this.excite;
    const st = this.stage;

    // Detail falls off with depth: full anatomy up front, silhouettes at the
    // back. This is both the right read and what keeps ~200 drawn people cheap.
    for (let i = 0; i < this.people.length; i++) {
      const p = this.people[i];
      const row = this.rows[p.row];
      const x = p.x - cam.x * row.par;
      if (x < -70 || x > V.W + 70) continue;
      person(ctx, p, x, row.y, beat, ex, p.row < 2 ? 2 : p.row < 4 ? 1 : 0, this.hype || 0);
    }

    // beach balls batted around over the pit
    this.balls.forEach((b) => {
      const row = this.rows[0];
      const bx = b.x - cam.x * row.par;
      if (bx < -40 || bx > V.W + 40) return;
      const by = row.y - 72 + b.y;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(b.spin);
      const cols = ['#E8E2D4', '#C2412F', '#E8B33C', '#2E7E9E'];
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = cols[k];
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 9, (k / 4) * U.TAU, ((k + 1) / 4) * U.TAU);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });

    // haze over the back rows pushes them into the distance
    const g = ctx.createLinearGradient(0, V.BARRICADE_Y - 110, 0, V.BARRICADE_Y + 24);
    g.addColorStop(0, U.rgba(st.S.haze, 0.34));
    g.addColorStop(1, U.rgba(st.S.haze, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, V.BARRICADE_Y - 110, V.W, 134);
    // and a cool scrim so the lit fighters read against them
    const d = ctx.createLinearGradient(0, V.BARRICADE_Y - 120, 0, V.BARRICADE_Y + 60);
    d.addColorStop(0, 'rgba(12,10,20,.46)');
    d.addColorStop(0.7, 'rgba(12,10,20,.24)');
    d.addColorStop(1, 'rgba(12,10,20,.34)');
    ctx.fillStyle = d;
    ctx.fillRect(0, V.BARRICADE_Y - 120, V.W, 180);

    // crowd surfers ride along the top of the front row
    this.surfers.forEach((s) => {
      const row = this.rows[0];
      const x = s.x - cam.x * row.par;
      if (x < -80 || x > V.W + 80) return;
      const y = row.y - 58 + Math.sin(s.t * 6) * 4;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(s.t * 3) * 0.12);
      ctx.fillStyle = '#E8B33C';
      U.roundRect(ctx, -22, -7, 44, 14, 6);
      ctx.fill();
      ctx.fillStyle = '#E0B894';
      ctx.beginPath(); ctx.arc(22, -3, 7, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = '#E0B894'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(6, -4); ctx.lineTo(4, -20);
      ctx.moveTo(-14, 2); ctx.lineTo(-24, 12);
      ctx.stroke();
      ctx.restore();
    });

    // heckles last, over everything in the crowd
    for (let i = 0; i < this.bubbles.length; i++) {
      const b = this.bubbles[i];
      const row = this.rows[b.p.row];
      const x = b.p.x - cam.x * row.par;
      if (x < -140 || x > V.W + 140) continue;
      const rise = Math.min(1, b.t * 5);
      const fade = b.t > b.life - 0.4 ? (b.life - b.t) / 0.4 : 1;
      bubble(ctx, x, row.y - 68 * b.p.s - rise * 14 - (b.lane || 0) * 30, b.text,
        U.clamp(fade, 0, 1) * 0.96, b.loud);
    }
  };

  // Called after the barricade image, since the pit is nearer than the rail.
  Crowd.prototype.drawFront = function (ctx, cam, beat) {
    const row = this.rows[0];
    for (let i = 0; i < this.guards.length; i++) {
      const g = this.guards[i];
      const x = g.x - cam.x * (row.par + 0.04);
      if (x < -50 || x > V.W + 50) continue;
      guard(ctx, g, x, V.BARRICADE_Y + 118, beat);
    }
  };

  IB.Crowd = Crowd;
  IB.HECKLES = HECKLES;
})(window.IB);
