/* Iron Blossom — match engine: loop, camera, collision, round flow, rendering. */
window.IB = window.IB || {};
(function (IB) {
  'use strict';
  const U = IB.U, V = IB.VIEW;

  const ROUND_TIME = 99;
  const ENCORE_TIME = 20;   // the winner's victory set, in seconds
  const HITSTOP_SCALE = 1 / 60;

  function Game(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fx = new IB.FX();
    this.cam = { x: 300, y: 0, zoom: 1, shake: 0, shakeT: 0 };
    this.projectiles = [];
    this.props = [];
    this.pickups = [];
    this.pending = [];
    this.echoes = [];
    this.t = 0;
    this.hitstopT = 0;
    this.slow = 0;
    this.flashT = 0;
    this.flashColor = '#fff';
    this.announceText = null;
    this.cinematic = null;
    this.roundState = 'idle';
    this.paused = false;
    this.onMatchEnd = null;
    this.comboBanner = null;
    this.beat = 0;
  }

  /* ---------------------------------------------------------------- setup */

  Game.prototype.setup = function (opts) {
    const stage = IB.stageById(opts.stageId);
    stage.build();
    this.stage = stage;
    this.mode = opts.mode || 'arcade';
    this.rounds = opts.rounds || 2;      // first to this many
    this.p1 = new IB.Fighter(opts.p1, 0, this);
    this.p2 = new IB.Fighter(opts.p2, 1, this);
    this.p1.wins = 0; this.p2.wins = 0;
    this.ai1 = null;
    this.ai2 = opts.mode === 'versus' ? null : new IB.AI(this.p2, opts.aiLevel || 'normal');
    this.cam = { x: 310, y: 0, zoom: 1.5, shake: 0, shakeT: 0 };
    this.crowd = new IB.Crowd(stage);
    this.fx.initWeather(stage.weather);
    this.roundNum = 1;
    this.startRound();
    // The music belongs to the act whose set you're crashing, so every fight
    // on the ladder sounds like a different band.
    IB.Audio.playTrack(this.p2.char.id);
  };

  Game.prototype.startRound = function () {
    this.p1.reset(700);
    this.p2.reset(1200);
    this.p1.face = 1; this.p2.face = -1;
    this.p1.meter = this.roundNum === 1 ? 0 : Math.min(this.p1.meter, 50);
    this.p2.meter = this.roundNum === 1 ? 0 : Math.min(this.p2.meter, 50);
    this.projectiles.length = 0;
    this.pickups.length = 0;
    this.pending.length = 0;
    this.echoes.length = 0;
    this.fx.p.length = 0;
    this.timer = ROUND_TIME;
    this.roundState = 'intro';
    this.roundT = 0;
    this.cam.x = 310;
    this.cam.zoom = 1.5;
    this.spawnProps();
    this.announce('ROUND ' + this.roundNum, '#E8B33C', 1.1);
    IB.Audio.sfx('stinger', 'ready');
  };

  Game.prototype.spawnProps = function () {
    this.props.length = 0;
    const list = this.stage.props;
    const span = V.WORLD_W - 360;
    list.forEach((type, i) => {
      // spread them across the deck, nudged off the exact centre line
      const x = 180 + (i + 0.5) * (span / list.length) + U.rand(-60, 60);
      this.props.push(new IB.Prop(type, x));
    });
  };

  /* -------------------------------------------------------------- helpers */

  Game.prototype.shake = function (v) { this.cam.shake = Math.max(this.cam.shake, v); };
  Game.prototype.hitstop = function (frames) { this.hitstopT = Math.max(this.hitstopT, frames * HITSTOP_SCALE); };
  Game.prototype.slowmo = function (s) { this.slow = Math.max(this.slow, s); };
  Game.prototype.flash = function (a, c) { this.flashT = Math.max(this.flashT, a); this.flashColor = c || '#fff'; };

  Game.prototype.announce = function (text, color, life) {
    this.announceText = { text, color: color || '#F2EDE2', t: 0, life: life || 0.9 };
  };

  Game.prototype.showCombo = function (f) {
    this.comboBanner = { side: f.side, n: f.combo, t: 0, color: f.char.ui[0] };
  };

  Game.prototype.damageScale = function (target) {
    const n = target._chain || 0;
    target._chain = n + 1;
    return Math.max(0.34, 1 - n * 0.085);
  };

  Game.prototype.nearestProp = function (f) {
    let best = null, bd = 90;
    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      if (p.state !== 'rest' || !p.d.pick) continue;
      const d = Math.abs(p.x - f.x);
      if (d < bd && Math.abs(p.y) < 40) { bd = d; best = p; }
    }
    return best;
  };

  Game.prototype.spawnPickup = function (x, kind) {
    this.pickups.push({ x, y: -30, vy: -6, kind, t: 0, taken: false });
  };

  // Radial damage used by exploding props and area specials.
  Game.prototype.blast = function (x, y, radius, dmg, push, kind, owner) {
    [this.p1, this.p2].forEach((f) => {
      if (f === owner || f.dead) return;
      const d = Math.hypot(f.x - x, (f.y - 100) - y);
      if (d > radius) return;
      const falloff = 1 - d / radius;
      f.receive({
        x, dmg: Math.round(dmg * (0.45 + falloff * 0.55)),
        hitstun: 18, push: push * (0.5 + falloff * 0.5),
        launch: kind === 'keg' || kind === 'drop' ? 11 : 0,
        owner, meter: 8, lvl: 'mid', color: kind === 'speaker' ? '#FFD08A' : undefined,
      });
    });
    this.fx.shockwave(x, y, radius, kind === 'keg' ? '#F7EFD8' : '#FFD08A');
  };

  Game.prototype.superCut = function (f) {
    this.cinematic = { f, t: 0, life: 1.05 };
    this.slowmo(0.3);
  };

  /* ------------------------------------------------------------ collision */

  function overlaps(a, b) { return a && b && U.aabb(a, b); }

  Game.prototype.resolveAttacks = function (a, b) {
    const hb = a.hitbox();
    if (!hb || a.hasHit) return;
    const m = a.move;

    // attacks break scenery too
    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      if (p.state === 'gone' || p.state === 'held' || p.hitCool > 0) continue;
      if (overlaps(hb, p.box())) {
        p.hitCool = 0.2;
        p.hurt(m.dmg * 0.9, a.face, this);
        this.fx.hitSpark(p.x, p.y - p.d.h / 2, 0.4);
        IB.Audio.sfx('hit', 0.35);
        a.hasHit = true;
        a.gainMeter(m.meter * 0.5);
        this.hitstop(3);
        return;
      }
    }

    if (m.isGrab) {
      if (overlaps(hb, b.hurtbox()) && b.grounded && !b.dead) {
        a.hasHit = true;
        b.receive({
          x: a.x, dmg: 95, hitstun: 26, push: 9, launch: 9,
          owner: a, meter: 16, lvl: 'throw', unblockable: true,
        });
        this.fx.text(a.x, -230, 'THROW', '#FFD08A', 26);
        this.shake(12);
        this.crowd.react('hit', a.x);
      }
      return;
    }

    if (!overlaps(hb, b.hurtbox())) return;
    a.hasHit = true;

    // a held prop turns your heavy into a weapon swing
    const weaponBonus = a.holding && a.holding.d.weapon ? 1.5 : 1;
    const result = b.receive({
      x: hb.x + hb.w / 2, dmg: Math.round(m.dmg * a.dmgMult * weaponBonus),
      chip: m.chip, hitstun: m.hitstun, blockstun: m.blockstun,
      push: m.push, launch: m.launch, trip: m.trip, lvl: m.lvl,
      owner: a, meter: m.meter,
    });
    if (result === 'hit' || result === 'armor') {
      a.gainMeter(m.meter);
      // Phantogram's phantom repeats the hit a beat later
      if (a.echo > 0) {
        this.pending.push({
          t: 0.16, fn: () => {
            if (b.dead) return;
            b.receive({
              x: b.x - b.face * 40, dmg: Math.round(m.dmg * a.echoStrength),
              hitstun: Math.round(m.hitstun * 0.6), push: m.push * 0.5,
              owner: a, meter: 4, lvl: 'mid', color: '#2ED8C3',
            });
            this.fx.hitSpark(b.x, b.y - 110, 0.5, '#2ED8C3');
          },
        });
      }
    }
  };

  Game.prototype.resolveProjectiles = function (dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.follow && p.owner) {
        p.x = p.owner.x + p.owner.face * (p.followOff || 0);
      }
      p.update(dt, this);
      if (p.dead) { this.projectiles.splice(i, 1); continue; }
      if (p.delay > 0) continue;

      [this.p1, this.p2].forEach((f) => {
        if (f === p.owner || f.dead) return;
        if (p.hits.indexOf(f) >= 0) return;
        if (!overlaps(p.box(), f.hurtbox())) return;
        const r = f.receive({
          x: p.x, dmg: p.dmg, hitstun: p.hitstun, push: p.push,
          launch: p.launch, lvl: p.lvl, trip: p.trip, owner: p.owner,
          meter: 6, confuse: p.confuse, color: p.color, blockstun: 12,
          chip: Math.round(p.dmg * 0.12),
        });
        if (r) {
          if (p.repeat) { p.hits.push(f); this.pending.push({ t: p.repeat, fn: () => { const k = p.hits.indexOf(f); if (k >= 0) p.hits.splice(k, 1); } }); }
          else p.hits.push(f);
          if (!p.pierce) p.dead = true;
        }
      });

      // projectiles smash props as well
      if (!p.dead) {
        for (let k = 0; k < this.props.length; k++) {
          const pr = this.props[k];
          if (pr.state === 'gone' || pr.state === 'held') continue;
          if (p.hits.indexOf(pr) >= 0) continue;
          if (overlaps(p.box(), pr.box())) {
            p.hits.push(pr);
            pr.hurt(p.dmg, U.sign(p.vx), this);
            if (!p.pierce) { p.dead = true; break; }
          }
        }
      }
    }
  };

  Game.prototype.resolveProps = function (dt) {
    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      p.update(dt, this);
      if (p.state !== 'thrown' || p.hitCool > 0) continue;
      [this.p1, this.p2].forEach((f) => {
        if (f === p.thrower && p.hitCool === 0 && Math.abs(p.vx) > 2 && f.dead === false) {
          // a prop you just threw shouldn't immediately hit you back
          if (Math.abs(p.x - f.x) < 60) return;
        }
        if (f.dead) return;
        if (!overlaps(p.box(), f.hurtbox())) return;
        const speed = Math.hypot(p.vx, p.vy);
        if (speed < 4) return;
        p.hitCool = 0.4;
        f.receive({
          x: p.x, dmg: Math.round(p.d.dmg * U.clamp(speed / 16, 0.5, 1.4)),
          hitstun: 22, push: 9 * p.d.weight, launch: p.d.weight > 1.4 ? 8 : 0,
          owner: p.thrower, meter: 10, lvl: 'mid',
        });
        this.fx.text(p.x, -200, p.d.label + '!', '#FFD08A', 24);
        this.crowd.react('hit', p.x);
        p.vx *= -0.3;
        if (!p.d.unbreakable) p.hurt(p.maxHp * 0.6, U.sign(p.vx), this);
      });
    }
  };

  Game.prototype.resolvePickups = function (dt) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const k = this.pickups[i];
      k.t += dt;
      k.vy += 0.5 * dt * 60;
      k.y += k.vy * dt * 60;
      if (k.y > 0) { k.y = 0; k.vy = 0; }
      [this.p1, this.p2].forEach((f) => {
        if (k.taken || f.dead) return;
        if (Math.abs(f.x - k.x) < 44 && Math.abs(f.y - k.y) < 140) {
          k.taken = true;
          const heal = 90;
          f.hp = Math.min(f.maxHp, f.hp + heal);
          this.fx.text(f.x, -200, '+' + heal, '#7CE8A0', 28);
          this.fx.splash(k.x, k.y, '#9AD8FF', 14);
          IB.Audio.sfx('confirm');
        }
      });
      if (k.taken || k.t > 12) this.pickups.splice(i, 1);
    }
  };

  /* ---------------------------------------------------------------- loop */

  Game.prototype.update = function (dt, inputs) {
    if (this.paused) return;
    this.t += dt;
    if (IB.Audio.track) this.beat = (this.t * IB.Audio.track.bpm) / 60;

    // cinematic and hitstop freeze the simulation but not the presentation
    if (this.cinematic) {
      this.cinematic.t += dt;
      if (this.cinematic.t >= this.cinematic.life) this.cinematic = null;
      else return;
    }
    if (this.hitstopT > 0) { this.hitstopT -= dt; return; }

    let scale = 1;
    if (this.slow > 0) { this.slow -= dt; scale = 0.35; }
    const d = dt * scale;

    for (let i = this.pending.length - 1; i >= 0; i--) {
      this.pending[i].t -= d;
      if (this.pending[i].t <= 0) { const fn = this.pending[i].fn; this.pending.splice(i, 1); fn(); }
    }

    const p1 = this.p1, p2 = this.p2;

    // round flow
    this.roundT += d;
    if (this.roundState === 'intro') {
      if (this.roundT > 1.2) {
        this.roundState = 'fight';
        this.roundT = 0;
        this.announce('FIGHT!', '#E2622A', 0.8);
        IB.Audio.sfx('stinger', 'fight');
        this.crowd.react('special', (p1.x + p2.x) / 2);
      }
    } else if (this.roundState === 'fight') {
      this.timer -= d;
      if (this.timer <= 0) { this.timer = 0; this.endRound(p1.hp === p2.hp ? null : (p1.hp > p2.hp ? p1 : p2), 'TIME UP'); }
      if (p1.dead || p2.dead) this.endRound(p1.dead ? p2 : p1, 'K.O.');
    } else if (this.roundState === 'ko') {
      if (this.roundT > 2.6) this.nextRound();
    } else if (this.roundState === 'encore') {
      this.encoreT += d;
      const w = this.encoreWinner;
      w.state = 'perform';
      // work the stage rather than stand on one mark
      if (this.encoreHome === undefined) this.encoreHome = U.clamp(w.x, 480, V.WORLD_W - 480);
      const stride = Math.sin(this.encoreT * 0.62) * 230;
      const want = this.encoreHome + stride;
      const dx = want - w.x;
      w.x = U.lerp(w.x, want, 1 - Math.pow(0.02, d));
      if (w.spinFace === undefined && Math.abs(dx) > 8) w.face = dx > 0 ? 1 : -1;
      this.crowd.excite = Math.max(this.crowd.excite, 0.85);
      this.crowd.hype = Math.min(1, (this.crowd.hype || 0) + d * 2);
      const sh = this.show;
      sh.strobe = Math.max(0, sh.strobe - d * 7);
      sh.fog = Math.min(1, sh.fog + d * 0.5);

      // the show cues itself off the bar line
      const bar = Math.floor(this.beat / 4);
      if (bar !== sh.lastBar) {
        sh.lastBar = bar;
        sh.strobe = 1;
        // confetti cannons either side of the performer
        [-1, 1].forEach((sgn) => {
          for (let i = 0; i < 14; i++) {
            this.fx.add({
              k: 'chunk', x: w.x + sgn * 330, y: -170,
              vx: -sgn * U.rand(3, 11), vy: U.rand(-13, -5),
              w: U.rand(5, 12), h: U.rand(4, 9),
              rot: U.rand(0, U.TAU), vrot: U.rand(-0.35, 0.35),
              c: U.pick([w.char.ui[0], w.char.ui[1], '#E8B33C', '#F2EDE2', '#3CC8FF']),
              life: U.rand(1.4, 2.8), t: 0, g: 0.24,
            });
          }
        });
        // pyro along the front of the deck every other bar
        if (bar % 2 === 0) {
          sh.pyro.length = 0;
          for (let i = 0; i < 5; i++) sh.pyro.push({ x: w.x - 340 + i * 170, t: 0 });
          IB.Audio.sfx('explode');
        }
        this.fx.shockwave(w.x, -120, 260, w.char.ui[0], true);
        if (bar % 4 === 0) { IB.Audio.crowdRoar(0.8); this.shake(6); }
      }
      for (let i = sh.pyro.length - 1; i >= 0; i--) {
        sh.pyro[i].t += d;
        if (sh.pyro[i].t > 0.85) sh.pyro.splice(i, 1);
      }
      // any attack button skips the set
      const i1 = inputs.p1.p, i2 = inputs.p2 ? inputs.p2.p : {};
      if (this.encoreT > 0.8 && (i1.light || i1.heavy || i1.kick || i1.special ||
          i2.light || i2.heavy || i2.kick || i2.special)) this.finishEncore();
      if (this.encoreT >= ENCORE_TIME) this.finishEncore();
    }

    if (this.roundState === 'fight') {
      p1.input(inputs.p1, p2);
      if (this.ai2) p2.input(this.ai2.think(d, p1, this), p1);
      else p2.input(inputs.p2, p1);
    } else {
      const idle = { left: false, right: false, up: false, down: false, p: {} };
      p1.input(idle, p2); p2.input(idle, p1);
    }

    p1.update(d, p2);
    p2.update(d, p1);
    if (p1.hitstun <= 0 && p1.blockstun <= 0) p1._chain = 0;
    if (p2.hitstun <= 0 && p2.blockstun <= 0) p2._chain = 0;

    if (this.roundState === 'fight' || this.roundState === 'ko') {
      this.resolveAttacks(p1, p2);
      this.resolveAttacks(p2, p1);
    }
    this.resolveProjectiles(d);
    this.resolveProps(d);
    this.resolvePickups(d);
    this.fx.update(d);
    this.crowd.update(d, (p1.x + p2.x) / 2);

    if (this.announceText) {
      this.announceText.t += dt;
      if (this.announceText.t > this.announceText.life + 0.5) this.announceText = null;
    }
    if (this.comboBanner) {
      this.comboBanner.t += dt;
      if (this.comboBanner.t > 1.4) this.comboBanner = null;
    }
    this.flashT = Math.max(0, this.flashT - dt * 2.6);

    this.updateCamera(dt);
  };

  Game.prototype.updateCamera = function (dt) {
    const p1 = this.p1, p2 = this.p2;
    if (this.roundState === 'encore' && this.encoreWinner) {
      const w = this.encoreWinner;
      const punch = Math.pow(Math.max(0, Math.sin(this.beat * Math.PI)), 6) * 0.06;
      const tz = 1.50 + Math.sin(this.encoreT * 0.5) * 0.07 + punch;
      this.cam.zoom = U.lerp(this.cam.zoom, tz, 1 - Math.pow(0.01, dt));
      const hv = V.W / (2 * this.cam.zoom);
      const tx = U.clamp(w.x - V.W / 2, hv - V.W / 2, V.WORLD_W - V.W / 2 - hv);
      this.cam.x = U.lerp(this.cam.x, tx, 1 - Math.pow(0.02, dt));
      this.cam.y = U.lerp(this.cam.y, 0, 1 - Math.pow(0.01, dt));
      if (this.cam.shake > 0) this.cam.shake = Math.max(0, this.cam.shake - dt * 62);
      return;
    }
    const mid = (p1.x + p2.x) / 2;
    const dist = Math.abs(p1.x - p2.x);
    const highest = Math.min(p1.y, p2.y);

    const targetZoom = U.clamp(1.92 - dist / 1100, 1.2, 1.76);
    this.cam.zoom = U.lerp(this.cam.zoom, targetZoom, 1 - Math.pow(0.004, dt));

    const halfView = V.W / (2 * this.cam.zoom);
    let tx = mid - V.W / 2;
    tx = U.clamp(tx, halfView - V.W / 2, V.WORLD_W - V.W / 2 - halfView);
    this.cam.x = U.lerp(this.cam.x, tx, 1 - Math.pow(0.002, dt));
    // ease down when someone goes high so the jump stays in frame
    this.cam.y = U.lerp(this.cam.y, U.clamp(-highest * 0.3, 0, 96), 1 - Math.pow(0.01, dt));

    if (this.cam.shake > 0) this.cam.shake = Math.max(0, this.cam.shake - dt * 62);
  };

  /* ---------------------------------------------------------- round ends */

  Game.prototype.endRound = function (winner, reason) {
    if (this.roundState !== 'fight') return;
    this.roundState = 'ko';
    this.roundT = 0;
    this.slowmo(0.9);
    this.shake(26);
    this.flash(0.5, '#fff');
    IB.Audio.sfx('stinger', 'ko');
    IB.Audio.crowdRoar(1);
    this.crowd.react('ko', winner ? winner.x : (this.p1.x + this.p2.x) / 2);
    this.announce(reason, '#E2622A', 1.5);
    if (winner) {
      winner.wins++;
      winner.state = 'win';
      winner.stateT = 0;
      const loser = winner === this.p1 ? this.p2 : this.p1;
      if (!loser.dead) { loser.state = 'lose'; loser.stateT = 0; }
    }
    this.lastWinner = winner;
  };

  Game.prototype.nextRound = function () {
    const p1 = this.p1, p2 = this.p2;
    if (p1.wins >= this.rounds || p2.wins >= this.rounds) {
      this.startEncore(p1.wins > p2.wins ? p1 : p2);
      return;
    }
    this.roundNum++;
    this.startRound();
  };

  /* --------------------------------------------------------------- encore
     The winner gets the stage to themselves for a set. Their own theme comes
     up in a fuller arrangement, the crowd loses it, and the fighter actually
     plays along to the beat. */
  Game.prototype.startEncore = function (winner) {
    const loser = winner === this.p1 ? this.p2 : this.p1;
    this.roundState = 'encore';
    this.encoreT = 0;
    this.encoreWinner = winner;
    this.encoreHome = undefined;
    this.projectiles.length = 0;
    this.pending.length = 0;

    winner.state = 'perform';
    winner.stateT = 0;
    winner.vx = 0; winner.vy = 0; winner.grounded = true; winner.y = 0;
    winner.hitstun = 0; winner.blockstun = 0;
    winner.face = 1;
    loser.state = loser.dead ? 'down' : 'lose';
    loser.stateT = 0;

    // centre the winner, put the loser off to the side
    const mid = U.clamp(winner.x, 420, V.WORLD_W - 420);
    winner.x = mid;
    loser.x = mid - 300;

    // lighting rig: eight moving heads, each with its own sweep
    this.show = {
      heads: [],
      strobe: 0,
      pyro: [],
      lastBar: -1,
      fog: 0,
    };
    for (let i = 0; i < 8; i++) {
      this.show.heads.push({
        x: 110 + i * 152,
        phase: i * 0.78,
        rate: 0.55 + (i % 3) * 0.22,
        swing: 200 + (i % 4) * 90,
      });
    }
    IB.Audio.sfx('stinger', 'win');
    IB.Audio.playTrack(winner.char.id, true);
    IB.Audio.setEncore(true);
    IB.Audio.crowdRoar(1.2);
    this.crowd.excite = 1;
    this.crowd.react('special', winner.x);
    this.flash(0.4, winner.char.ui[0]);
  };

  Game.prototype.finishEncore = function () {
    if (this.roundState !== 'encore') return;
    this.roundState = 'matchEnd';
    this.crowd.hype = 0;
    IB.Audio.setEncore(false);
    const w = this.encoreWinner;
    if (this.onMatchEnd) this.onMatchEnd(w, w === this.p1 ? this.p2 : this.p1);
  };

  /* ------------------------------------------------------------- drawing */

  Game.prototype.drawStageLights = function (ctx, stage, cam, beat) {
    const st = stage || this.stage;
    cam = cam || this.cam;
    if (beat === undefined) beat = this.beat;
    const t = this.t;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const c = st.lightColors[i % st.lightColors.length];
      const sway = Math.sin(t * (0.5 + i * 0.16) + i * 1.7);
      const ox = 150 + i * 250 - cam.x * 0.55;
      const topY = V.BARRICADE_Y - 190;
      const spread = 90 + Math.sin(t * 0.7 + i) * 28;
      const bx = ox + sway * 300;
      const pulse = 0.28 + 0.2 * Math.abs(Math.sin(beat * Math.PI + i));
      const g = ctx.createLinearGradient(ox, topY, bx, V.GROUND_Y + 40);
      g.addColorStop(0, U.rgba(c, pulse));
      g.addColorStop(0.6, U.rgba(c, pulse * 0.32));
      g.addColorStop(1, U.rgba(c, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ox - 9, topY);
      ctx.lineTo(bx - spread, V.GROUND_Y + 40);
      ctx.lineTo(bx + spread, V.GROUND_Y + 40);
      ctx.lineTo(ox + 9, topY);
      ctx.closePath();
      ctx.fill();
      // the fixture itself
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#15171D';
      U.roundRect(ctx, ox - 13, topY - 16, 26, 20, 4); ctx.fill();
      ctx.fillStyle = U.rgba(c, 0.9);
      ctx.beginPath(); ctx.arc(ox, topY + 2, 7, 0, U.TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
    }
    ctx.restore();
  };

  Game.prototype.drawFighter = function (ctx, f) {
    const sx = f.x - this.cam.x;
    const sy = V.GROUND_Y + f.y;

    IB.Art.groundShadow(ctx, sx, V.GROUND_Y + 2,
      44 * U.clamp(1 + f.y / 400, 0.4, 1), U.clamp(0.36 + f.y / 500, 0.08, 0.36));

    // Phantogram's delayed phantom
    if (f.echo > 0 && f.poseHistory.length > 8) {
      const h = f.poseHistory[0];
      ctx.save();
      ctx.globalAlpha = 0.42;
      IB.Art.drawFighter(ctx, {
        char: f.char, pose: h.pose, face: h.face,
        x: h.x - this.cam.x, y: V.GROUND_Y + h.y, ghost: true, noProp: false,
      });
      ctx.restore();
    }

    // dash / rush afterimages
    if (f.dashT > 0 || f.rushing > 0) {
      ctx.save();
      ctx.globalAlpha = 0.24;
      IB.Art.drawFighter(ctx, {
        char: f.char, pose: f.pose, face: f.face,
        x: sx - f.face * 26, y: sy, alpha: 0.5,
      });
      ctx.restore();
    }

    if (!(f.vanish > 0)) {
      IB.Art.drawFighter(ctx, {
        char: f.char, pose: f.pose, face: f.face, x: sx, y: sy,
        flash: f.flash, armor: f.armor > 0 ? U.clamp(f.armor, 0, 1) : 0,
        sing: f.singing,
      });
    }

    // sound coming off the mic while they sing
    if (f.state === 'perform' && f.char.prop && f.char.prop.kind === 'mic') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const hx = sx + f.face * 52, hy = sy - f.char.look.height * 0.78;
      for (let i = 0; i < 3; i++) {
        const ph = ((this.beat * 1.4 + i * 0.33) % 1);
        ctx.strokeStyle = U.rgba(f.char.ui[0], (1 - ph) * 0.55);
        ctx.lineWidth = 4 - i;
        ctx.beginPath();
        ctx.arc(hx, hy, 14 + ph * 66, -0.85 * f.face + (f.face > 0 ? 0 : Math.PI),
          0.85 * f.face + (f.face > 0 ? 0 : Math.PI), f.face < 0);
        ctx.stroke();
      }
      ctx.restore();
    }

    // the quiet build before LCD's drop
    if (f.buildUp > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const r = 40 + (1 - f.buildUp) * 120;
      const g = ctx.createRadialGradient(sx, sy - 110, 5, sx, sy - 110, r);
      g.addColorStop(0, U.rgba('#8AD8FF', 0.5));
      g.addColorStop(1, U.rgba('#8AD8FF', 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy - 110, r, 0, U.TAU); ctx.fill();
      ctx.restore();
    }
    if (f.confuse > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const a = this.t * 4 + (i / 4) * U.TAU;
        ctx.fillStyle = U.rgba('#C8A0FF', 0.5);
        ctx.beginPath();
        ctx.arc(sx + Math.cos(a) * 34, sy - 190 + Math.sin(a) * 12, 5, 0, U.TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  Game.prototype.render = function () {
    const ctx = this.ctx;
    const cam = this.cam;
    const st = this.stage;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, V.W, V.H);

    const sh = cam.shake;
    const shx = sh > 0 ? U.rand(-sh, sh) : 0;
    const shy = sh > 0 ? U.rand(-sh, sh) * 0.6 : 0;

    ctx.save();
    ctx.translate(V.W / 2 + shx, V.GROUND_SCREEN + shy + cam.y);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-V.W / 2, -V.GROUND_Y);

    // background layers
    ctx.drawImage(st.farImg, -((cam.x * 0.22) % 1200) - 100, 0);
    ctx.drawImage(st.midImg, -((cam.x * 0.42) % 1300) - 100, 0);

    this.fx.drawWeatherBack(ctx, cam);
    this.crowd.draw(ctx, cam, this.beat);
    ctx.drawImage(st.barImg, -(cam.x * 0.68) % 1400 - 100, V.BARRICADE_Y + 30);
    this.crowd.drawFront(ctx, cam, this.beat);
    this.drawStageLights(ctx, st, cam, this.beat);
    ctx.drawImage(st.deckImg, -(cam.x % 1300) - 100, V.GROUND_Y);

    // resting scenery behind the fighters
    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      if (p.state === 'rest') p.draw(ctx, cam);
    }

    // health pickups
    this.pickups.forEach((k) => {
      const x = k.x - cam.x, y = V.GROUND_Y + k.y;
      const bob = Math.sin(k.t * 4) * 5;
      ctx.save();
      ctx.translate(x, y - 22 + bob);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, 0, 3, 0, 0, 34);
      g.addColorStop(0, U.rgba('#9AD8FF', 0.7));
      g.addColorStop(1, U.rgba('#9AD8FF', 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 34, 0, U.TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#E8F4FF';
      ctx.beginPath();
      ctx.moveTo(-11, -14); ctx.lineTo(11, -14); ctx.lineTo(7, 16); ctx.lineTo(-7, 16);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3CC8FF';
      ctx.fillRect(-9, -8, 18, 18);
      ctx.strokeStyle = '#15121A'; ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-11, -14); ctx.lineTo(11, -14); ctx.lineTo(7, 16); ctx.lineTo(-7, 16);
      ctx.closePath(); ctx.stroke();
      ctx.strokeStyle = '#E8F4FF'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(4, -14); ctx.lineTo(9, -30); ctx.stroke();
      ctx.restore();
    });

    // fighters, far one first so the nearer reads on top
    const order = this.p1.y < this.p2.y ? [this.p1, this.p2] : [this.p2, this.p1];
    order.forEach((f) => this.drawFighter(ctx, f));

    // carried and airborne scenery in front
    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      if (p.state === 'held' || p.state === 'thrown') p.draw(ctx, cam);
    }

    for (let i = 0; i < this.projectiles.length; i++) this.projectiles[i].draw(ctx, cam);

    this.fx.draw(ctx, cam);
    if (this.roundState === 'encore') this.drawShow(ctx, cam);
    this.fx.drawWeatherFront(ctx, cam);
    this.fx.drawTexts(ctx, cam);

    ctx.restore();

    this.drawPost(ctx);
  };

  Game.prototype.drawPost = function (ctx) {
    // vignette
    const g = ctx.createRadialGradient(V.W / 2, V.H / 2, V.H * 0.42, V.W / 2, V.H / 2, V.H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(6,5,10,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, V.W, V.H);

    if (this.flashT > 0) {
      ctx.fillStyle = U.rgba(this.flashColor, this.flashT * 0.6);
      ctx.fillRect(0, 0, V.W, V.H);
    }

    if (this.roundState === 'encore') {
      if (this.show && this.show.strobe > 0.55) {
        ctx.fillStyle = U.rgba('#FFFFFF', (this.show.strobe - 0.55) * 0.5);
        ctx.fillRect(0, 0, V.W, V.H);
      }
      this.drawEncore(ctx);
    }
    if (this.cinematic) this.drawCinematic(ctx);
    if (this.announceText) this.drawAnnounce(ctx);
    if (this.comboBanner) this.drawCombo(ctx);
  };

  /* The encore light show. Drawn inside the camera transform so the beams and
     pyro sit in the world with the performer. */
  Game.prototype.drawShow = function (ctx, cam) {
    const sh = this.show;
    if (!sh) return;
    const w = this.encoreWinner;
    const c = w.char;
    const t = this.encoreT;
    const beatPulse = Math.pow(Math.max(0, Math.sin(this.beat * Math.PI)), 3);

    // haze, so the beams have something to bite on
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const fg = ctx.createLinearGradient(0, V.BARRICADE_Y - 200, 0, V.GROUND_Y);
    fg.addColorStop(0, U.rgba('#9FB4D8', 0.0));
    fg.addColorStop(1, U.rgba('#9FB4D8', 0.07 * sh.fog));
    ctx.fillStyle = fg;
    ctx.fillRect(0, V.BARRICADE_Y - 200, V.W, 400);

    // moving heads on the truss
    const topY = V.BARRICADE_Y - 196;
    const palette = [c.ui[0], c.ui[1], '#3CC8FF', '#E8B33C', '#7CE8A0'];
    for (let i = 0; i < sh.heads.length; i++) {
      const hd = sh.heads[i];
      const col = palette[(i + Math.floor(this.beat / 4)) % palette.length];
      const ox = hd.x - cam.x * 0.55;
      const sway = Math.sin(t * hd.rate * 2.2 + hd.phase);
      const bx = ox + sway * hd.swing;
      const spread = 40 + Math.abs(sway) * 26;
      const inten = 0.22 + beatPulse * 0.30;
      const g = ctx.createLinearGradient(ox, topY, bx, V.GROUND_Y + 40);
      g.addColorStop(0, U.rgba(col, inten));
      g.addColorStop(0.55, U.rgba(col, inten * 0.36));
      g.addColorStop(1, U.rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ox - 7, topY);
      ctx.lineTo(bx - spread, V.GROUND_Y + 40);
      ctx.lineTo(bx + spread, V.GROUND_Y + 40);
      ctx.lineTo(ox + 7, topY);
      ctx.closePath();
      ctx.fill();
      // the lamp itself
      ctx.fillStyle = U.rgba(col, 0.95);
      ctx.beginPath(); ctx.arc(ox, topY + 3, 7 + beatPulse * 4, 0, U.TAU); ctx.fill();
    }

    // laser fan out of the truss centre
    const lx = w.x - cam.x;
    for (let i = -6; i <= 6; i++) {
      const a = i * 0.13 + Math.sin(t * 1.3) * 0.25;
      ctx.strokeStyle = U.rgba('#7CE8A0', 0.16 + beatPulse * 0.2);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, topY - 12);
      ctx.lineTo(lx + Math.sin(a) * 900, topY - 12 + Math.cos(a) * 900);
      ctx.stroke();
    }

    // follow spot holding the performer
    const fx2 = w.x - cam.x;
    const fs = ctx.createLinearGradient(fx2, topY, fx2, V.GROUND_SCREEN);
    fs.addColorStop(0, U.rgba('#FFF4DC', 0.30));
    fs.addColorStop(1, U.rgba('#FFF4DC', 0.04));
    ctx.fillStyle = fs;
    ctx.beginPath();
    ctx.moveTo(fx2 - 16, topY);
    ctx.lineTo(fx2 - 128, V.GROUND_Y + 30);
    ctx.lineTo(fx2 + 128, V.GROUND_Y + 30);
    ctx.lineTo(fx2 + 16, topY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // pyro jets off the front of the deck
    sh.pyro.forEach((py) => {
      const px = py.x - cam.x;
      const prog = py.t / 0.85;
      const hgt = Math.sin(prog * Math.PI) * 240;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        const wdt = 26 - k * 7;
        const g = ctx.createLinearGradient(px, V.GROUND_Y, px, V.GROUND_Y - hgt);
        g.addColorStop(0, U.rgba('#FFF0B0', 0.85 - k * 0.2));
        g.addColorStop(0.45, U.rgba('#FF9A2A', 0.55 - k * 0.15));
        g.addColorStop(1, U.rgba('#C2301A', 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(px - wdt, V.GROUND_Y + 10);
        ctx.quadraticCurveTo(px - wdt * 0.4, V.GROUND_Y - hgt * 0.6, px, V.GROUND_Y - hgt);
        ctx.quadraticCurveTo(px + wdt * 0.4, V.GROUND_Y - hgt * 0.6, px + wdt, V.GROUND_Y + 10);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });
  };

  Game.prototype.drawEncore = function (ctx) {
    const w = this.encoreWinner;
    if (!w) return;
    const t = this.encoreT;
    const inT = U.clamp(t / 0.5, 0, 1);
    const c = w.char;

    // warm wash over the whole stage
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(V.W / 2, V.H * 0.55, 40, V.W / 2, V.H * 0.55, V.W * 0.6);
    g.addColorStop(0, U.rgba(c.ui[0], 0.14 + 0.05 * Math.sin(this.beat * Math.PI)));
    g.addColorStop(1, U.rgba(c.ui[0], 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, V.W, V.H);
    ctx.restore();

    // lower third
    const slide = U.easeOut(inT);
    const barY = V.H - 128;
    ctx.save();
    ctx.globalAlpha = slide;
    ctx.translate(0, (1 - slide) * 90);
    ctx.fillStyle = 'rgba(11,9,16,.82)';
    ctx.fillRect(0, barY, V.W, 64);
    ctx.fillStyle = c.ui[0];
    ctx.fillRect(0, barY, 10, 64);
    ctx.textAlign = 'left';
    ctx.font = '700 15px "Barlow Condensed", sans-serif';
    ctx.fillStyle = '#E8B33C';
    ctx.fillText('E N C O R E', 30, barY + 24);
    ctx.font = '400 34px "Alfa Slab One", Georgia, serif';
    ctx.fillStyle = '#F2EDE2';
    ctx.fillText(c.name, 30, barY + 54);
    ctx.font = '600 15px "Barlow Condensed", sans-serif';
    ctx.fillStyle = '#9A93A6';
    ctx.textAlign = 'right';
    ctx.fillText(c.slot, V.W - 30, barY + 26);
    ctx.fillText('Any attack to skip', V.W - 30, barY + 50);
    // set-length bar
    ctx.fillStyle = 'rgba(242,237,226,.16)';
    ctx.fillRect(0, barY + 60, V.W, 4);
    ctx.fillStyle = c.ui[0];
    ctx.fillRect(0, barY + 60, V.W * U.clamp(t / ENCORE_TIME, 0, 1), 4);
    ctx.textAlign = 'left';
    ctx.restore();
    ctx.globalAlpha = 1;
  };

  Game.prototype.drawAnnounce = function (ctx) {
    const a = this.announceText;
    const inT = U.clamp(a.t / 0.18, 0, 1);
    const outT = a.t > a.life ? U.clamp((a.t - a.life) / 0.5, 0, 1) : 0;
    const scale = U.lerp(2.1, 1, U.easeOut(inT)) * (1 + outT * 0.5);
    const alpha = (1 - outT);
    ctx.save();
    ctx.textAlign = 'center';
    // fit long move names inside the frame before the pop-in scale is applied
    let size = 64;
    ctx.font = '400 ' + size + 'px "Alfa Slab One", Georgia, serif';
    const w = ctx.measureText(a.text).width;
    const maxW = V.W * 0.78;
    if (w > maxW) size = Math.max(26, Math.floor(size * maxW / w));
    ctx.translate(V.W / 2, V.H * 0.3);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    ctx.font = '400 ' + size + 'px "Alfa Slab One", Georgia, serif';
    ctx.lineWidth = 12 * (size / 64);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#15121A';
    ctx.strokeText(a.text, 0, 0);
    const g = ctx.createLinearGradient(0, -size * 0.7, 0, size * 0.3);
    g.addColorStop(0, '#FFF6E0');
    g.addColorStop(1, a.color);
    ctx.fillStyle = g;
    ctx.fillText(a.text, 0, 0);
    ctx.restore();
  };

  Game.prototype.drawCombo = function (ctx) {
    const c = this.comboBanner;
    const a = U.clamp(1 - (c.t - 1) / 0.4, 0, 1);
    const x = c.side === 0 ? 210 : V.W - 210;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.translate(x, 210);
    const pop = c.t < 0.12 ? 1.5 - c.t * 4 : 1;
    ctx.scale(pop, pop);
    ctx.font = '400 52px "Alfa Slab One", Georgia, serif';
    ctx.lineWidth = 9; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#15121A';
    ctx.strokeText(c.n + ' HIT', 0, 0);
    ctx.fillStyle = '#FFF0C0';
    ctx.fillText(c.n + ' HIT', 0, 0);
    ctx.font = '700 22px "Barlow Condensed", sans-serif';
    ctx.strokeText('COMBO', 0, 26);
    ctx.fillStyle = c.color;
    ctx.fillText('COMBO', 0, 26);
    ctx.restore();
  };

  Game.prototype.drawCinematic = function (ctx) {
    const c = this.cinematic;
    const p = c.t / c.life;
    const f = c.f;
    const char = f.char;
    ctx.save();
    ctx.fillStyle = U.rgba('#0A0810', 0.72 * Math.min(1, p * 5) * Math.min(1, (1 - p) * 5));
    ctx.fillRect(0, 0, V.W, V.H);

    // diagonal colour bands sweeping through
    ctx.save();
    ctx.translate(V.W / 2, V.H / 2);
    ctx.rotate(-0.22);
    for (let i = 0; i < 3; i++) {
      const off = ((p * 2.4 + i * 0.33) % 1.4 - 0.2) * V.W - V.W / 2;
      ctx.fillStyle = U.rgba(char.ui[i % 2], 0.3);
      ctx.fillRect(off, -V.H, 130 - i * 30, V.H * 2);
    }
    ctx.restore();

    const slide = U.easeOut(U.clamp(p * 3, 0, 1));
    ctx.save();
    ctx.translate(V.W * 0.3 - (1 - slide) * 300, V.H * 0.62);
    ctx.scale(1.5, 1.5);
    IB.Art.portrait(ctx, char, 0, -190, 200, this.t);
    ctx.restore();

    ctx.textAlign = 'left';
    const tslide = U.easeOut(U.clamp((p - 0.12) * 3, 0, 1));
    ctx.globalAlpha = tslide;
    ctx.translate(V.W * 0.44 + (1 - tslide) * 160, 0);
    ctx.font = '700 26px "Barlow Condensed", sans-serif';
    ctx.fillStyle = char.ui[0];
    ctx.fillText(char.name, 0, V.H * 0.42);
    ctx.font = '400 54px "Alfa Slab One", Georgia, serif';
    ctx.lineWidth = 10; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#15121A';
    const words = char.superMove.name.split(' ');
    words.forEach((w, i) => {
      ctx.strokeText(w, 0, V.H * 0.52 + i * 54);
      ctx.fillStyle = '#FFF2D8';
      ctx.fillText(w, 0, V.H * 0.52 + i * 54);
    });
    ctx.restore();
  };

  IB.Game = Game;
  IB.ROUND_TIME = ROUND_TIME;
})(window.IB);
