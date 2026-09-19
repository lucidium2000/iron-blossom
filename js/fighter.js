/* Iron Blossom — the fighter: state machine, physics, hit detection, animation. */
window.IB = window.IB || {};
(function (IB) {
  'use strict';
  const U = IB.U, Rig = IB.Rig, P = Rig.POSES;
  const V = IB.VIEW;

  const GRAVITY = 0.78;

  // Encore routines: one move per two beats, looping. Singers get a groove
  // routine, players get a guitar routine — a frontman with a mic shouldn't
  // move like someone pinned behind a guitar.
  const PLAY_ROUTINE = ['strum', 'strum', 'showHop', 'strum', 'showPoint', 'showBang',
    'showBang', 'showLow', 'strum', 'showKick', 'showSpin', 'showHorns'];
  const SING_ROUTINE = ['strut', 'showSway', 'showMicOut', 'showSway2', 'showGroove',
    'showHop', 'strut', 'showShoulder', 'showMicOut', 'showSpin', 'showHorns',
    'showSway', 'showPoint', 'showGroove', 'strut', 'showBang'];
  const MAX_METER = 100;

  function Fighter(char, side, game) {
    this.char = char;
    this.game = game;
    this.side = side;                 // 0 = left/P1, 1 = right/P2
    this.face = side === 0 ? 1 : -1;
    this.x = side === 0 ? 700 : 1200;
    this.y = 0;
    this.vx = 0; this.vy = 0;
    this.maxHp = char.stats.hp;
    this.hp = this.maxHp;
    this.meter = 0;
    this.state = 'idle';
    this.stateT = 0;
    this.move = null;
    this.moveFrame = 0;
    this.hasHit = false;
    this.hitstun = 0;
    this.blockstun = 0;
    this.grounded = true;
    this.crouching = false;
    this.blocking = false;
    this.blockLow = false;
    this.holding = null;
    this.combo = 0;
    this.comboT = 0;
    this.echo = 0;
    this.echoStrength = 0;
    this.armor = 0;
    this.confuse = 0;
    this.stance = 0;
    this.buildUp = 0;
    this.rushing = 0;
    this.flash = 0;
    this.dead = false;
    this.hitLevel = 'mid';
    this.anim = 0;
    this.dashT = 0;
    this.lastDir = 0;
    this.dashTap = 0;
    this.jumps = 0;
    this.poseHistory = [];
    this.wins = 0;
    this.pose = P.idle;
    this.dmgMult = 1;
    this.spdMult = 1;
    this.airAttacked = false;
    this.getupInvuln = 0;
    this.throwCool = 0;
    this.landT = 0;
    this.vanish = 0;
  }

  Fighter.prototype.reset = function (x) {
    this.x = x; this.y = 0; this.vx = 0; this.vy = 0;
    this.hp = this.maxHp;
    this.state = 'idle'; this.stateT = 0; this.move = null;
    this.hitstun = 0; this.blockstun = 0; this.dead = false;
    this.combo = 0; this.echo = 0; this.armor = 0; this.confuse = 0;
    this.holding = null; this.grounded = true; this.buildUp = 0; this.landT = 0;
    this.rushing = 0; this.flash = 0; this.jumps = 0;
    this.poseHistory.length = 0;
  };

  // Die Spitz cycles instruments; each stance trades speed against damage.
  Fighter.prototype.applyStance = function () {
    const s = this.stance;
    this.dmgMult = [1, 1.18, 0.88][s];
    this.spdMult = [1, 0.88, 1.2][s];
    if (this.char.prop) {
      this.char.prop.body = ['#141014', '#3A2E4A', '#8A2A3A'][s];
    }
  };

  /* --------------------------------------------------------------- boxes */

  Fighter.prototype.hurtbox = function () {
    if (this.state === 'down') return { x: this.x - 52, y: -46, w: 104, h: 46 };
    const h = this.char.look.height;
    if (this.crouching || this.state === 'crouch') {
      return { x: this.x - 32, y: this.y - h * 0.62, w: 64, h: h * 0.62 };
    }
    return { x: this.x - 30, y: this.y - h * 0.98, w: 60, h: h * 0.98 };
  };

  Fighter.prototype.pushbox = function () {
    return { x: this.x - 26, y: this.y - 140, w: 52, h: 140 };
  };

  Fighter.prototype.hitbox = function () {
    if (this.state !== 'attack' || !this.move || this.move.box.w === 0) return null;
    const m = this.move;
    if (this.moveFrame < m.startup || this.moveFrame >= m.startup + m.active) return null;
    const b = m.box;
    const reach = this.holding && this.holding.d.weapon ? 1.3 : 1;
    return {
      x: this.face > 0 ? this.x + b.x : this.x - b.x - b.w * reach,
      y: this.y + b.y,
      w: b.w * reach,
      h: b.h,
    };
  };

  /* -------------------------------------------------------------- inputs */

  Fighter.prototype.canAct = function () {
    if (this.dead) return false;
    if (this.hitstun > 0 || this.blockstun > 0) return false;
    if (this.state === 'down' || this.state === 'getup' || this.state === 'launched') return false;
    if (this.state === 'attack') {
      const m = this.move;
      // hit-confirmed normals can cancel into a special late in the animation
      return this.hasHit && !m.isSpecial && !m.isSuper &&
        this.moveFrame >= m.startup + m.active;
    }
    if (this.state === 'win' || this.state === 'lose') return false;
    return true;
  };

  Fighter.prototype.input = function (inp, opp) {
    if (this.dead) return;

    // Portugal. The Man's special leaves you steering the wrong way.
    let L = inp.left, R = inp.right;
    if (this.confuse > 0) { const t = L; L = R; R = t; }

    const toOpp = U.sign(opp.x - this.x) || this.face;
    const back = toOpp > 0 ? L : R;
    const fwd = toOpp > 0 ? R : L;

    // face the opponent whenever we are free to
    if (this.grounded && (this.state === 'idle' || this.state === 'walk' || this.state === 'crouch')) {
      this.face = toOpp;
    }

    const canAct = this.canAct();

    // blocking: hold away from the opponent, on the ground, not attacking
    this.blocking = false;
    if (canAct && this.grounded && back && this.state !== 'attack' && !this.holding) {
      this.blocking = true;
      this.blockLow = !!inp.down;
      this.state = 'block';
    } else if (this.state === 'block') {
      this.state = 'idle';
    }

    if (!canAct) return;

    this.crouching = this.grounded && !!inp.down && !this.blocking;

    // attacks
    if (inp.p.light) { this.attack(this.crouching ? 'crouchJab' : (!this.grounded ? 'airAttack' : 'light')); return; }
    if (inp.p.heavy) {
      if (this.holding) { this.throwProp(); return; }
      if (!this.grounded) { this.attack('airAttack'); return; }
      this.attack(inp.up ? 'upper' : this.crouching ? 'lowKick' : 'heavy');
      return;
    }
    if (inp.p.kick) {
      if (!this.grounded) { this.attack('airAttack'); return; }
      this.attack(this.crouching ? 'lowKick' : 'kick');
      return;
    }
    if (inp.p.special) {
      if (inp.up && this.meter >= 100) { this.doSuper(); return; }
      if (inp.down && this.meter >= this.char.special2.cost) { this.doSpecial(true); return; }
      if (this.meter >= this.char.special.cost) { this.doSpecial(false); return; }
      this.game.fx.text(this.x, -210, 'NO METER', '#E8E0D0', 22);
      return;
    }
    if (inp.p.grab) {
      if (this.holding) { this.throwProp(); return; }
      const p = this.game.nearestProp(this);
      if (p) { p.pickUp(this); this.holding = p; IB.Audio.sfx('ui', true); return; }
      this.attack('grab');
      return;
    }

    // movement
    if (this.grounded) {
      if (this.blocking) {
        this.vx = 0;
      } else if (L || R) {
        const dir = R ? 1 : -1;
        // double-tap to dash
        if (inp.p.left || inp.p.right) {
          if (this.lastDir === dir && this.dashTap > 0) {
            this.dashT = 16;
            IB.Audio.sfx('whoosh');
            this.game.fx.dust(this.x, 0, 5);
          }
          this.lastDir = dir;
          this.dashTap = 16;
        }
        const sp = this.char.stats.walk * (dir === toOpp ? 1 : 0.82) * this.spdMult;
        this.vx = dir * (this.dashT > 0 ? this.char.stats.dash : sp) * (this.crouching ? 0.35 : 1);
        this.state = this.dashT > 0 ? 'dash' : (this.crouching ? 'crouch' : 'walk');
      } else {
        this.vx *= 0.6;
        this.state = this.crouching ? 'crouch' : 'idle';
      }

      if (inp.p.up && !this.crouching) {
        this.vy = -this.char.stats.jump;
        this.grounded = false;
        this.airAttacked = false;
        this.state = 'jump';
        this.vx += (R ? 1 : L ? -1 : 0) * 3.4;
        IB.Audio.sfx('jump');
        this.game.fx.dust(this.x, 0, 6);
      }
    } else {
      // limited air control
      if (L) this.vx = U.approach(this.vx, -5.5, 0.35);
      if (R) this.vx = U.approach(this.vx, 5.5, 0.35);
    }
  };

  /* ------------------------------------------------------------- actions */

  Fighter.prototype.attack = function (key) {
    const m = this.char.moves[key];
    if (!m) return;
    if (m.air && this.grounded) return;
    if (!m.air && !this.grounded && key !== 'airAttack') return;
    if (this.airAttacked && m.air) return;
    if (m.air) this.airAttacked = true;
    this.state = 'attack';
    this.move = m;
    this.moveKey = key;
    this.moveFrame = 0;
    this.hasHit = false;
    if (this.grounded && !m.air) this.vx *= 0.3;
    IB.Audio.sfx('whoosh');
  };

  Fighter.prototype.doSpecial = function (second) {
    const sp = second ? this.char.special2 : this.char.special;
    this.meter -= sp.cost;
    this.state = 'attack';
    this.move = second ? this.char.moves.special2 : this.char.moves.special;
    this.moveKey = second ? 'special2' : 'special';
    this.moveFrame = 0;
    this.hasHit = false;
    this.vx = 0;
    this.specialFired = false;
    IB.Audio.sfx('special', sp.sfx);
    IB.Audio.duck(0.55, 0.9);
    this.game.announce(sp.name, this.char.ui[second ? 1 : 0]);
  };

  Fighter.prototype.doSuper = function () {
    this.meter = 0;
    this.state = 'attack';
    this.move = this.char.moves.superMove;
    this.moveKey = 'superMove';
    this.moveFrame = 0;
    this.hasHit = false;
    this.vx = 0;
    this.specialFired = false;
    IB.Audio.sfx('special', this.char.special.sfx);
    IB.Audio.duck(0.4, 1.4);
    this.game.superCut(this);
  };

  Fighter.prototype.throwProp = function () {
    const p = this.holding;
    if (!p) return;
    this.holding = null;
    this.state = 'attack';
    this.move = { name: 'Throw', startup: 5, active: 4, recovery: 14, box: { x: 0, y: 0, w: 0, h: 0 },
      poses: ['holdS', 'holdRel'], meter: 8 };
    this.moveKey = 'throw';
    this.moveFrame = 0;
    this.hasHit = false;
    p.launch(this.face, 1);
    p.thrower = this;
    this.gainMeter(8);
  };

  Fighter.prototype.gainMeter = function (v) {
    this.meter = U.clamp(this.meter + v, 0, MAX_METER);
  };

  /* ---------------------------------------------------------- taking hits */

  // Returns 'hit' | 'block' | 'armor' | null
  Fighter.prototype.receive = function (o) {
    if (this.dead || this.getupInvuln > 0) return null;
    const fromRight = o.x > this.x;
    const facingHit = (fromRight && this.face > 0) || (!fromRight && this.face < 0);

    // blocking works only against attacks you're facing and guarding correctly
    if (this.blocking && facingHit && this.grounded) {
      const lvl = o.lvl || 'mid';
      const ok = lvl === 'low' ? this.blockLow : lvl === 'overhead' ? !this.blockLow : true;
      if (ok) {
        const chip = o.chip || Math.round(o.dmg * 0.08);
        this.hp -= chip;
        this.blockstun = o.blockstun || 10;
        this.vx = (fromRight ? -1 : 1) * (o.push || 4) * 0.6;
        this.gainMeter(4);
        IB.Audio.sfx('block');
        this.game.fx.hitSpark(this.x + this.face * 34, this.y - 110, 0.25, '#BFE8FF');
        this.game.fx.text(this.x, -180, 'BLOCK', '#BFE8FF', 22);
        this.game.shake(3);
        if (this.hp <= 0) this.die();
        return 'block';
      }
    }

    const dmg = Math.round(o.dmg * (1 / (this.char.stats.defense || 1)) * this.game.damageScale(this));
    this.hp -= dmg;
    this.flash = 1;
    this.gainMeter(6);
    if (o.owner && o.owner.gainMeter) o.owner.gainMeter(o.meter || 10);

    // super armour: take the damage, ignore the stun
    if (this.armor > 0) {
      this.armor -= 0.34;
      this.game.fx.hitSpark(this.x, this.y - 110, 0.5, '#FFD08A');
      this.game.fx.text(this.x, -190, 'ARMOR', '#FFD08A', 22);
      if (this.hp <= 0) this.die();
      return 'armor';
    }

    this.hitstun = o.hitstun || 16;
    this.hitLevel = o.lvl === 'low' ? 'low' : o.launch ? 'launch' : 'mid';
    this.blocking = false;
    this.state = 'hitstun';
    this.vx = (fromRight ? -1 : 1) * (o.push || 5);

    if (o.launch) {
      this.vy = -o.launch;
      this.grounded = false;
      this.state = 'launched';
    } else if (o.trip && this.grounded) {
      this.knockdown(fromRight ? -1 : 1);
    } else if (!this.grounded) {
      this.vy = Math.min(this.vy, -4);
      this.state = 'launched';
    }

    if (this.holding) { this.holding.state = 'rest'; this.holding.holder = null; this.holding = null; }

    if (o.confuse) { this.confuse = o.confuse / 60; this.game.fx.text(this.x, -200, 'SCRAMBLED', '#C8A0FF', 24); }

    const power = U.clamp(dmg / 110, 0.2, 1.2);
    IB.Audio.sfx('hit', power);
    this.game.fx.hitSpark(o.x !== undefined ? U.lerp(o.x, this.x, 0.6) : this.x, this.y - 108, power, o.color);
    this.game.shake(4 + power * 13);
    this.game.hitstop(o.launch ? 9 : 3 + power * 7);

    if (o.owner) {
      o.owner.combo++;
      o.owner.comboT = 1.4;
      if (o.owner.combo >= 3) this.game.showCombo(o.owner);
    }
    if (power > 0.7) this.game.crowd.react('hit', this.x);
    this.game.fx.text(this.x + U.rand(-14, 14), this.y - 150, String(dmg), '#FFF0C0', 26);

    if (this.hp <= 0) this.die();
    return 'hit';
  };

  Fighter.prototype.knockdown = function (dir) {
    this.state = 'down';
    this.stateT = 0;
    this.grounded = true;
    this.y = 0;
    this.vx = dir * 5;
    this.vy = 0;
    this.hitstun = 0;
    IB.Audio.sfx('land');
    this.game.fx.dust(this.x, 0, 12);
    this.game.shake(8);
  };

  Fighter.prototype.die = function () {
    this.hp = 0;
    this.dead = true;
    this.state = 'down';
    this.stateT = 0;
    this.vy = -9;
    this.vx = -this.face * 7;
    this.grounded = false;
    if (this.holding) { this.holding.state = 'rest'; this.holding.holder = null; this.holding = null; }
  };

  /* -------------------------------------------------------------- update */

  Fighter.prototype.update = function (dt, opp) {
    const step = dt * 60;
    this.anim += dt;
    this.stateT += dt;
    this.comboT -= dt;
    if (this.comboT <= 0) this.combo = 0;
    this.flash = Math.max(0, this.flash - dt * 6);
    this.echo = Math.max(0, this.echo - dt);
    this.armor = Math.max(0, this.armor - dt);
    this.confuse = Math.max(0, this.confuse - dt);
    this.buildUp = Math.max(0, this.buildUp - dt);
    this.rushing = Math.max(0, this.rushing - dt);
    this.getupInvuln = Math.max(0, this.getupInvuln - dt);
    this.landT = Math.max(0, this.landT - dt);
    this.vanish = Math.max(0, this.vanish - dt);
    this.diving = Math.max(0, (this.diving || 0) - dt);
    if (this.dashTap > 0) this.dashTap -= step;
    if (this.dashT > 0) this.dashT -= step;

    if (this.hitstun > 0) { this.hitstun -= step; if (this.hitstun <= 0 && this.state === 'hitstun') this.state = 'idle'; }
    if (this.blockstun > 0) { this.blockstun -= step; }

    // attack frame advance
    if (this.state === 'attack' && this.move) {
      this.moveFrame += step;
      const m = this.move;
      if ((m.isSpecial || m.isSuper) && !this.specialFired && this.moveFrame >= m.startup) {
        this.specialFired = true;
        const kind = m.isSuper ? this.char.superMove.kind
          : m.second ? this.char.special2.kind : this.char.special.kind;
        const fn = IB.SPECIALS[kind];
        if (fn) fn(this.game, this, false);
      }
      if (this.moveFrame >= m.startup + m.active + m.recovery) {
        this.state = this.grounded ? 'idle' : 'jump';
        this.move = null;
      }
    }

    // knockdown → getup
    if (this.state === 'down' && this.grounded && !this.dead) {
      if (this.stateT > 0.85) {
        this.state = 'getup';
        this.stateT = 0;
        this.getupInvuln = 0.3;
      }
    }
    if (this.state === 'getup' && this.stateT > 0.35) { this.state = 'idle'; this.stateT = 0; }

    // physics
    if (!this.grounded) {
      this.vy += GRAVITY * step;
      this.y += this.vy * step;
      if (this.y >= 0) {
        this.y = 0;
        this.grounded = true;
        this.airAttacked = false;
        // A normal jump lands at roughly the speed it left the ground, so
        // landing speed alone must never cause a knockdown — only being hit
        // into the air does. `heavy` is presentation only.
        const heavy = this.vy > 25;
        this.vy = 0;
        IB.Audio.sfx('land');
        this.game.fx.dust(this.x, 0, heavy ? 10 : 5);
        this.landT = 0.14;
        if (this.dead) { this.state = 'down'; this.stateT = 0; }
        else if (this.state === 'launched') { this.knockdown(U.sign(this.vx) || -this.face); }
        else if (this.state !== 'attack') this.state = 'idle';
      }
    }

    this.x += this.vx * step;
    if (this.grounded) {
      const fr = this.state === 'down' ? 0.86 : (this.state === 'walk' || this.state === 'dash') ? 1 : 0.72;
      if (this.state !== 'walk' && this.state !== 'dash') this.vx *= Math.pow(fr, step);
      if (Math.abs(this.vx) < 0.08) this.vx = 0;
    }

    const pad = 54;
    this.x = U.clamp(this.x, pad, V.WORLD_W - pad);

    // pushboxes keep fighters from occupying the same space
    if (opp && !this.dead && !opp.dead) {
      const d = opp.x - this.x;
      const minD = 52;
      if (Math.abs(d) < minD && Math.abs(this.y - opp.y) < 110) {
        const overlap = (minD - Math.abs(d)) / 2;
        const s = U.sign(d) || 1;
        this.x -= s * overlap;
        opp.x += s * overlap;
        this.x = U.clamp(this.x, pad, V.WORLD_W - pad);
        opp.x = U.clamp(opp.x, pad, V.WORLD_W - pad);
      }
    }

    this.updatePose(dt);
  };

  /* ----------------------------------------------------------- animation */

  Fighter.prototype.updatePose = function (dt) {
    const t = this.anim;
    let pose;

    switch (this.state) {
      case 'idle': {
        const c = (Math.sin(t * 2.6) + 1) / 2;
        pose = Rig.blend(P.idle, c > 0.5 ? P.idle2 : P.idle3, Math.abs(Math.sin(t * 2.6)));
        break;
      }
      case 'walk': {
        const ph = (t * 6.2) % 1;
        pose = ph < 0.25 ? Rig.blend(P.walkA, P.walkC, ph * 4)
          : ph < 0.5 ? Rig.blend(P.walkC, P.walkB, (ph - 0.25) * 4)
          : ph < 0.75 ? Rig.blend(P.walkB, P.walkC, (ph - 0.5) * 4)
          : Rig.blend(P.walkC, P.walkA, (ph - 0.75) * 4);
        break;
      }
      case 'dash': {
        const ph = (t * 11) % 1;
        pose = ph < 0.5 ? Rig.blend(P.dashA, P.dashB, ph * 2) : Rig.blend(P.dashB, P.dashA, (ph - 0.5) * 2);
        break;
      }
      case 'crouch': pose = P.crouch; break;
      case 'block': pose = this.blockLow ? P.blockLow : P.block; break;
      case 'jump':
        pose = this.vy < -4 ? Rig.blend(P.jump, P.rise, U.clamp((this.vy + 16) / 12, 0, 1))
          : this.vy < 4 ? P.rise : Rig.blend(P.rise, P.fall, U.clamp(this.vy / 10, 0, 1));
        break;
      case 'launched': pose = Rig.blend(P.launch, P.tumble, U.clamp(this.stateT * 2.2, 0, 1)); break;
      case 'hitstun': {
        const base = this.hitLevel === 'low' ? P.hurtLo : this.hitLevel === 'launch' ? P.launch : P.hurtHi;
        const rec = U.clamp(1 - this.hitstun / 16, 0, 1);
        pose = Rig.blend(base, P.hurtMid, rec * 0.55);
        break;
      }
      case 'down': pose = this.dead ? Rig.blend(P.tumble, P.down, U.clamp(this.stateT * 3, 0, 1)) : P.down; break;
      case 'getup': pose = Rig.blend(P.getUp, P.idle, U.clamp(this.stateT / 0.35, 0, 1)); break;
      case 'win': pose = Rig.blend(P.idle, P.win, U.clamp(this.stateT * 2.5, 0, 1)); break;
      case 'perform': {
        // A routine rather than a loop: a different move every two beats, eased
        // in and out so it lands on the beat instead of sliding through it.
        const b = (this.game.beat || 0);
        const slot = b / 2;
        const idx = Math.floor(slot);
        const ph = slot - idx;
        const sing = this.char.prop && this.char.prop.kind === 'mic';
        const R = sing ? SING_ROUTINE : PLAY_ROUTINE;
        const move = R[((idx % R.length) + R.length) % R.length];

        // the baseline: strumming, or a two-step strut with the mic up
        const bp = (b % 1 + 1) % 1;
        let base;
        if (sing) {
          base = bp < 0.5 ? Rig.blend(P.singA, P.singB, bp * 2)
            : Rig.blend(P.singB, P.singA, (bp - 0.5) * 2);
          // weight shifts hip to hip on every beat — this is the swagger
          const swayPose = Math.floor(b) % 2 ? P.showSway2 : P.showSway;
          base = Rig.blend(base, swayPose, 0.45 + Math.sin(bp * Math.PI) * 0.2);
        } else {
          const a = Math.floor(b) % 4 === 3 ? P.playC : P.playA;
          base = bp < 0.5 ? Rig.blend(a, P.playB, bp * 2)
            : Rig.blend(P.playB, a, (bp - 0.5) * 2);
        }

        // the singer is actually singing: mouth works on the beat
        this.singing = sing ? 0.5 + Math.sin(b * Math.PI * 2) * 0.5 : 0;

        if (move === 'strum') { pose = base; break; }
        if (move === 'strut') {
          const sp = bp < 0.5 ? Rig.blend(P.showStrutA, P.showStrutB, bp * 2)
            : Rig.blend(P.showStrutB, P.showStrutA, (bp - 0.5) * 2);
          pose = Rig.blend(base, sp, 0.85);
          break;
        }
        const target = P[move];
        // hold the shape through the middle of the slot, ease at the edges
        const w = ph < 0.25 ? U.ease(ph * 4) : ph > 0.78 ? U.ease((1 - ph) / 0.22) : 1;
        pose = Rig.blend(base, target, w);
        if (move === 'showSpin') {
          // actually turn on the spot rather than pantomime it
          const want = ph > 0.5 ? -1 : 1;
          if (this.spinFace !== want) { this.spinFace = want; this.face = want; }
        } else if (this.spinFace !== undefined) {
          this.spinFace = undefined;
          this.face = 1;
        }
        break;
      }
      case 'lose': pose = Rig.blend(P.down, P.lose, U.clamp(this.stateT * 1.5, 0, 1)); break;
      case 'attack': {
        const m = this.move;
        const a = P[m.poses[0]], b = P[m.poses[1]];
        const f = this.moveFrame;
        if (f < m.startup) pose = Rig.blend(P.idle, a, U.ease(U.clamp(f / m.startup, 0, 1)));
        else if (f < m.startup + m.active + 2) pose = Rig.blend(a, b, U.easeOut(U.clamp((f - m.startup) / Math.max(m.active, 1), 0, 1)));
        else pose = Rig.blend(b, this.grounded ? P.idle : P.fall,
          U.ease(U.clamp((f - m.startup - m.active) / Math.max(m.recovery, 1), 0, 1)));
        break;
      }
      default: pose = P.idle;
    }

    // absorb the landing visually without costing the player a frame of control
    if (this.landT > 0 && (this.state === 'idle' || this.state === 'walk')) {
      pose = Rig.blend(pose, P.land, U.ease(this.landT / 0.14) * 0.62);
    }
    if (this.holding && this.state !== 'attack') {
      pose = Rig.blend(pose, P.carry, 0.78);
    }
    if (this.buildUp > 0) {
      pose = Rig.blend(pose, P.spHold, 0.8);
    }

    this.pose = pose;

    // Phantogram's echo replays a delayed copy of the body
    if (this.echo > 0 || this.poseHistory.length) {
      this.poseHistory.push({ pose, x: this.x, y: this.y, face: this.face });
      if (this.poseHistory.length > 14) this.poseHistory.shift();
      if (this.echo <= 0 && this.poseHistory.length) this.poseHistory.shift();
    }
  };

  IB.Fighter = Fighter;
  IB.MAX_METER = MAX_METER;
})(window.IB);
