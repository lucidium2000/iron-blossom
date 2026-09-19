/* Iron Blossom — CPU opponent.
   Produces the same input shape a keyboard does, so the fighter code can't
   tell the difference. Decisions are re-made on a timer that shortens with
   difficulty, which is what makes an easy CPU feel slow rather than dumb. */
window.IB = window.IB || {};
(function (IB) {
  'use strict';
  const U = IB.U;

  const LEVELS = {
    easy:   { react: 0.42, aggr: 0.26, blockChance: 0.28, jump: 0.05, special: 0.22, prop: 0.20, combo: 0.15, rest: [0.5, 1.1] },
    normal: { react: 0.24, aggr: 0.48, blockChance: 0.52, jump: 0.10, special: 0.50, prop: 0.35, combo: 0.4, rest: [0.3, 0.75] },
    hard:   { react: 0.13, aggr: 0.70, blockChance: 0.76, jump: 0.16, special: 0.78, prop: 0.46, combo: 0.68, rest: [0.16, 0.42] },
    boss:   { react: 0.08, aggr: 0.84, blockChance: 0.90, jump: 0.20, special: 0.94, prop: 0.55, combo: 0.84, rest: [0.1, 0.28] },
  };

  function AI(fighter, level) {
    this.f = fighter;
    this.L = LEVELS[level] || LEVELS.normal;
    this.levelName = level;
    this.timer = 0;
    this.rest = 0;
    this.plan = 'approach';
    this.planT = 0;
    this.inp = { left: false, right: false, up: false, down: false, p: {} };
    this.holdT = 0;
  }

  AI.prototype.clear = function () {
    const i = this.inp;
    i.left = i.right = i.up = i.down = false;
    i.p = { light: false, heavy: false, kick: false, special: false, grab: false };
    return i;
  };

  AI.prototype.think = function (dt, opp, game) {
    const f = this.f;
    const i = this.clear();
    if (f.dead || opp.dead || game.roundState !== 'fight') return i;

    const L = this.L;
    const dx = opp.x - f.x;
    const dist = Math.abs(dx);
    const toward = U.sign(dx);
    const away = -toward;

    this.timer -= dt;
    this.planT -= dt;
    this.rest -= dt;

    // reactive blocking sits outside the plan timer — this is the reflex layer
    const oppAttacking = opp.state === 'attack' && opp.move &&
      opp.moveFrame < opp.move.startup + opp.move.active;
    const incoming = game.projectiles.some((p) =>
      p.owner !== f && p.delay <= 0 && Math.abs(p.x - f.x) < 320 &&
      U.sign(p.vx) === toward * -1);

    if ((oppAttacking && dist < 190) || incoming) {
      if (Math.random() < L.blockChance) {
        i[away > 0 ? 'right' : 'left'] = true;
        // guess low against sweeps and low projectiles
        const low = (opp.move && opp.move.lvl === 'low') ||
          game.projectiles.some((p) => p.owner !== f && p.lvl === 'low' && Math.abs(p.x - f.x) < 320);
        if (low) i.down = true;
        this.holdT = 0.22;
        return i;
      }
    }
    if (this.holdT > 0) { this.holdT -= dt; i[away > 0 ? 'right' : 'left'] = true; return i; }

    // anti-air
    if (!opp.grounded && dist < 150 && opp.y < -60 && Math.random() < L.aggr) {
      i.up = true; i.p.heavy = true;
      return i;
    }

    if (this.planT <= 0) {
      this.planT = U.rand(0.5, 1.4);
      const r = Math.random();
      if (f.meter >= 100 && r < L.special * 0.5) this.plan = 'super';
      else if (f.meter >= f.char.special.cost && r < L.special) this.plan = 'special';
      else if (!f.holding && r < L.prop && game.nearestProp(f)) this.plan = 'grabprop';
      else if (f.holding) this.plan = 'throwprop';
      else if (r < L.aggr) this.plan = 'attack';
      else if (r < L.aggr + 0.2) this.plan = 'retreat';
      else this.plan = 'approach';
    }

    if (this.timer > 0) {
      // keep walking while waiting out the reaction delay
      if (this.plan === 'approach' && dist > 120) i[toward > 0 ? 'right' : 'left'] = true;
      if (this.plan === 'retreat' && dist < 400) i[away > 0 ? 'right' : 'left'] = true;
      return i;
    }
    this.timer = L.react * U.rand(0.7, 1.3);

    switch (this.plan) {
      case 'super':
        if (f.meter >= 100) { i.up = true; i.p.special = true; this.plan = 'approach'; }
        break;
      case 'special':
        if (dist < 560 && f.meter >= f.char.special.cost) {
          i.p.special = true;
          if (Math.random() < 0.45) i.down = true;   // the second special
          this.plan = 'approach';
        }
        else i[toward > 0 ? 'right' : 'left'] = true;
        break;
      case 'grabprop': {
        const p = game.nearestProp(f);
        if (p) {
          const pd = p.x - f.x;
          if (Math.abs(pd) < 70) { i.p.grab = true; this.plan = 'throwprop'; }
          else i[pd > 0 ? 'right' : 'left'] = true;
        } else this.plan = 'approach';
        break;
      }
      case 'throwprop':
        if (f.holding) {
          if (dist < 620) { i.p.heavy = true; this.plan = 'approach'; }
          else i[toward > 0 ? 'right' : 'left'] = true;
        } else this.plan = 'approach';
        break;
      case 'attack':
        // a short breather between strings; without it the CPU just mashes
        if (this.rest > 0) { if (dist > 150) i[toward > 0 ? 'right' : 'left'] = true; break; }
        if (dist < 118) {
          const r = Math.random();
          if (r < 0.34) i.p.light = true;
          else if (r < 0.62) i.p.kick = true;
          else if (r < 0.82) i.p.heavy = true;
          else { i.down = true; i.p.kick = true; }
          // hit-confirm into a special when the meter is there
          if (f.hasHit && f.meter >= f.char.special.cost && Math.random() < L.combo) i.p.special = true;
          this.rest = U.rand(L.rest[0], L.rest[1]);
        } else if (dist < 210) {
          i[toward > 0 ? 'right' : 'left'] = true;
          if (Math.random() < 0.3) i.p.kick = true;
        } else {
          i[toward > 0 ? 'right' : 'left'] = true;
          if (Math.random() < L.jump) i.up = true;
        }
        break;
      case 'retreat':
        i[away > 0 ? 'right' : 'left'] = true;
        if (Math.random() < 0.12) i.down = true;
        break;
      default:
        if (dist > 130) i[toward > 0 ? 'right' : 'left'] = true;
        else if (Math.random() < 0.3) i.p.light = true;
        if (Math.random() < L.jump * 0.5) i.up = true;
    }

    // never walk off a corner into a wall forever
    if (f.x < 110 && i.left) { i.left = false; i.right = true; }
    if (f.x > IB.VIEW.WORLD_W - 110 && i.right) { i.right = false; i.left = true; }

    return i;
  };

  IB.AI = AI;
  IB.AI_LEVELS = LEVELS;
})(window.IB);
