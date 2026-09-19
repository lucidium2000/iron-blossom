/* Iron Blossom — interactive stage objects.
   Everything on the deck can be hit, most of it can be picked up and thrown,
   and several pieces do something specific when they break: a speaker cab lets
   go of a shockwave, a keg geysers and launches, a cooler drops a slushie that
   heals whoever walks over it. */
window.IB = window.IB || {};
(function (IB) {
  'use strict';
  const U = IB.U;

  const INK = '#15121A';

  function band(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  const DEFS = {
    barrel: {
      w: 54, h: 74, hp: 110, weight: 1, dmg: 95, pick: true, mat: 'wood',
      label: 'BARREL',
      draw(ctx, p) {
        const w = this.w, h = this.h;
        ctx.fillStyle = '#7A4F2C';
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 5, 0);
        ctx.quadraticCurveTo(-w / 2 - 4, -h / 2, -w / 2 + 5, -h);
        ctx.lineTo(w / 2 - 5, -h);
        ctx.quadraticCurveTo(w / 2 + 4, -h / 2, w / 2 - 5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = U.rgba('#000', 0.16);
        for (let i = 1; i < 5; i++) ctx.fillRect(-w / 2 + i * 11, -h + 3, 2, h - 6);
        band(ctx, -w / 2 - 2, -h * 0.82, w + 4, 8, '#5A5A62');
        band(ctx, -w / 2 - 2, -h * 0.26, w + 4, 8, '#5A5A62');
        ctx.fillStyle = U.rgba('#fff', 0.1);
        ctx.fillRect(-w / 2 + 7, -h + 4, 7, h - 8);
      },
    },
    ironbarrel: {
      w: 56, h: 78, hp: 190, weight: 1.6, dmg: 130, pick: true, mat: 'metal',
      label: 'IRON DRUM',
      draw(ctx) {
        const w = this.w, h = this.h;
        const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
        g.addColorStop(0, '#3E454E'); g.addColorStop(0.35, '#6B737E');
        g.addColorStop(0.7, '#454C56'); g.addColorStop(1, '#2C3138');
        ctx.fillStyle = g;
        U.roundRect(ctx, -w / 2, -h, w, h, 5);
        ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
        ['#8A939E', '#8A939E'].forEach((c, i) => band(ctx, -w / 2 - 2, -h * (i ? 0.3 : 0.74), w + 4, 7, c));
        ctx.fillStyle = '#B5432A';
        ctx.fillRect(-w / 2 + 8, -h * 0.58, w - 16, 14);
        ctx.fillStyle = '#F0E4D0';
        ctx.font = '700 10px "Barlow Condensed", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TREDEGAR', 0, -h * 0.58 + 11);
        ctx.textAlign = 'left';
      },
    },
    keg: {
      w: 48, h: 62, hp: 90, weight: 1.1, dmg: 85, pick: true, mat: 'keg',
      label: 'KEG',
      draw(ctx) {
        const w = this.w, h = this.h;
        const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
        g.addColorStop(0, '#7E868E'); g.addColorStop(0.35, '#C6CDD4');
        g.addColorStop(0.75, '#8A929A'); g.addColorStop(1, '#5E656C');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-w / 2, -6);
        ctx.quadraticCurveTo(-w / 2 - 5, -h / 2, -w / 2, -h + 6);
        ctx.quadraticCurveTo(0, -h - 3, w / 2, -h + 6);
        ctx.quadraticCurveTo(w / 2 + 5, -h / 2, w / 2, -6);
        ctx.quadraticCurveTo(0, 2, -w / 2, -6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
        band(ctx, -w / 2 - 3, -h * 0.72, w + 6, 6, '#6E767E');
        band(ctx, -w / 2 - 3, -h * 0.3, w + 6, 6, '#6E767E');
        ctx.fillStyle = '#3A4048';
        U.roundRect(ctx, -9, -h - 9, 18, 10, 3); ctx.fill();
      },
    },
    speaker: {
      w: 72, h: 128, hp: 260, weight: 3, dmg: 0, pick: false, mat: 'speaker',
      label: 'SPEAKER STACK',
      draw(ctx, p) {
        const w = this.w, h = this.h;
        ctx.fillStyle = '#191B22';
        U.roundRect(ctx, -w / 2, -h, w, h, 4);
        ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
        for (let i = 0; i < 3; i++) {
          const cy = -h + 22 + i * 40;
          ctx.fillStyle = '#0E1015';
          U.roundRect(ctx, -w / 2 + 6, cy - 16, w - 12, 34, 3); ctx.fill();
          const pump = p && p.pump ? p.pump : 0;
          ctx.fillStyle = '#262A34';
          ctx.beginPath(); ctx.arc(0, cy + 1, 14 + pump * 2, 0, U.TAU); ctx.fill();
          ctx.fillStyle = '#12141A';
          ctx.beginPath(); ctx.arc(0, cy + 1, 6 + pump, 0, U.TAU); ctx.fill();
        }
        ctx.fillStyle = '#C8A24A';
        ctx.fillRect(-w / 2 + 6, -h + 4, w - 12, 9);
      },
    },
    amp: {
      w: 84, h: 66, hp: 200, weight: 2.4, dmg: 0, pick: false, mat: 'speaker',
      label: 'AMP CAB',
      draw(ctx, p) {
        const w = this.w, h = this.h;
        ctx.fillStyle = '#2B2118';
        U.roundRect(ctx, -w / 2, -h, w, h, 4); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#4A3A28';
        ctx.fillRect(-w / 2 + 6, -h + 18, w - 12, h - 26);
        ctx.fillStyle = U.rgba('#000', 0.28);
        for (let x = -w / 2 + 6; x < w / 2 - 6; x += 5) ctx.fillRect(x, -h + 18, 2, h - 26);
        ctx.fillStyle = '#C9C2B2';
        ctx.fillRect(-w / 2 + 6, -h + 5, w - 12, 10);
        ctx.fillStyle = '#E2622A';
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-w / 2 + 16 + i * 14, -h + 10, 3, 0, U.TAU); ctx.fill(); }
      },
    },
    roadcase: {
      w: 88, h: 58, hp: 230, weight: 1.9, dmg: 120, pick: true, mat: 'metal',
      label: 'ROAD CASE',
      draw(ctx) {
        const w = this.w, h = this.h;
        ctx.fillStyle = '#23262E';
        U.roundRect(ctx, -w / 2, -h, w, h, 4); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = '#9AA2AC'; ctx.lineWidth = 4;
        U.roundRect(ctx, -w / 2 + 4, -h + 4, w - 8, h - 8, 3); ctx.stroke();
        ctx.fillStyle = '#9AA2AC';
        [[-w / 2 + 2, -h + 2], [w / 2 - 12, -h + 2], [-w / 2 + 2, -12], [w / 2 - 12, -12]]
          .forEach(([x, y]) => ctx.fillRect(x, y, 10, 10));
        ctx.fillStyle = '#E8B33C';
        ctx.font = '700 13px "Barlow Condensed", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('IRON BLOSSOM', 0, -h / 2 + 5);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#12141A';
        ctx.beginPath(); ctx.arc(-w / 2 + 14, 2, 6, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(w / 2 - 14, 2, 6, 0, U.TAU); ctx.fill();
      },
    },
    flightcase: {
      w: 74, h: 84, hp: 250, weight: 2.1, dmg: 125, pick: true, mat: 'metal',
      label: 'FLIGHT CASE',
      draw(ctx) { DEFS.roadcase.draw.call({ w: 74, h: 84 }, ctx); },
    },
    cooler: {
      w: 60, h: 44, hp: 70, weight: 0.8, dmg: 70, pick: true, mat: 'cooler',
      label: 'COOLER',
      draw(ctx) {
        const w = this.w, h = this.h;
        ctx.fillStyle = '#D8DCE0';
        U.roundRect(ctx, -w / 2, -h, w, h, 5); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#C2412F';
        U.roundRect(ctx, -w / 2 - 2, -h - 8, w + 4, 12, 4); ctx.fill();
        ctx.strokeStyle = INK; ctx.stroke();
        ctx.fillStyle = '#8E969E';
        ctx.fillRect(-8, -h + 12, 16, 5);
      },
    },
    chair: {
      w: 38, h: 66, hp: 55, weight: 0.5, dmg: 62, pick: true, mat: 'metal', weapon: true,
      label: 'FOLDING CHAIR',
      draw(ctx) {
        ctx.strokeStyle = '#3E4650'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-14, 0); ctx.lineTo(-6, -32); ctx.lineTo(14, -32);
        ctx.moveTo(14, 0); ctx.lineTo(8, -32);
        ctx.moveTo(-6, -32); ctx.lineTo(-12, -64);
        ctx.stroke();
        ctx.fillStyle = '#5A6470';
        ctx.save(); ctx.rotate(-0.06);
        U.roundRect(ctx, -14, -38, 30, 8, 3); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#5A6470';
        ctx.save(); ctx.rotate(0.12);
        U.roundRect(ctx, -16, -66, 12, 30, 3); ctx.fill();
        ctx.restore();
      },
    },
    crate: {
      w: 56, h: 48, hp: 60, weight: 0.7, dmg: 66, pick: true, mat: 'flowers',
      label: 'FLOWER CRATE',
      draw(ctx) {
        const w = this.w, h = this.h;
        ctx.fillStyle = '#9A7A4E';
        ctx.fillRect(-w / 2, -h, w, h);
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(-w / 2, -h, w, h);
        ctx.strokeStyle = U.rgba('#000', 0.25); ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h); ctx.lineTo(w / 2, 0);
        ctx.moveTo(w / 2, -h); ctx.lineTo(-w / 2, 0);
        ctx.stroke();
        for (let i = 0; i < 7; i++) {
          ctx.fillStyle = i % 2 ? '#F2C4CE' : '#F7E0E8';
          ctx.beginPath();
          ctx.arc(-w / 2 + 8 + i * 7, -h - 4 - (i % 3) * 5, 7, 0, U.TAU);
          ctx.fill();
        }
      },
    },
    anvil: {
      w: 64, h: 44, hp: 400, weight: 3.4, dmg: 175, pick: true, mat: 'metal', heavy: true,
      label: 'ANVIL',
      draw(ctx) {
        ctx.fillStyle = '#3A3F46';
        ctx.beginPath();
        ctx.moveTo(-30, -44); ctx.lineTo(24, -44); ctx.lineTo(34, -36);
        ctx.lineTo(20, -30); ctx.lineTo(12, -28); ctx.lineTo(14, -12);
        ctx.lineTo(22, 0); ctx.lineTo(-22, 0); ctx.lineTo(-14, -12);
        ctx.lineTo(-16, -30); ctx.lineTo(-30, -34);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = U.rgba('#fff', 0.16);
        ctx.fillRect(-28, -43, 50, 5);
      },
    },
    log: {
      w: 84, h: 38, hp: 90, weight: 1.2, dmg: 92, pick: true, mat: 'wood',
      label: 'DRIFTWOOD',
      draw(ctx) {
        ctx.fillStyle = '#8A7A66';
        U.roundRect(ctx, -42, -34, 84, 34, 16); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#6E604E';
        ctx.beginPath(); ctx.ellipse(-40, -17, 6, 16, 0, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = U.rgba('#000', 0.2); ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(-30 + i * 18, -32); ctx.lineTo(-24 + i * 18, -4);
          ctx.stroke();
        }
      },
    },
    rock: {
      w: 62, h: 46, hp: 999, weight: 2.2, dmg: 140, pick: true, mat: 'rock', unbreakable: true,
      label: 'RIVER ROCK',
      draw(ctx) {
        ctx.fillStyle = '#5E6058';
        ctx.beginPath();
        ctx.moveTo(-31, 0); ctx.lineTo(-24, -32); ctx.lineTo(-4, -44);
        ctx.lineTo(20, -38); ctx.lineTo(31, -14); ctx.lineTo(26, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = U.rgba('#fff', 0.14);
        ctx.beginPath();
        ctx.moveTo(-22, -30); ctx.lineTo(-4, -41); ctx.lineTo(6, -30);
        ctx.closePath(); ctx.fill();
      },
    },
    tube: {
      w: 66, h: 56, hp: 45, weight: 0.35, dmg: 38, pick: true, mat: 'rubber', bouncy: true,
      label: 'INNER TUBE',
      draw(ctx) {
        ctx.strokeStyle = '#1E2228'; ctx.lineWidth = 15;
        ctx.beginPath(); ctx.ellipse(0, -28, 25, 21, 0, 0, U.TAU); ctx.stroke();
        ctx.strokeStyle = '#2E343C'; ctx.lineWidth = 11;
        ctx.beginPath(); ctx.ellipse(0, -28, 25, 21, 0, 0, U.TAU); ctx.stroke();
        ctx.fillStyle = '#F2C15A';
        ctx.fillRect(-4, -52, 8, 6);
      },
    },
    cone: {
      w: 34, h: 48, hp: 30, weight: 0.25, dmg: 26, pick: true, mat: 'rubber',
      label: 'TRAFFIC CONE',
      draw(ctx) {
        ctx.fillStyle = '#E2622A';
        ctx.beginPath();
        ctx.moveTo(-9, -48); ctx.lineTo(9, -48); ctx.lineTo(19, -6); ctx.lineTo(-19, -6);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.stroke();
        ctx.fillStyle = '#F0EAE0';
        ctx.fillRect(-14, -30, 28, 8);
        ctx.fillStyle = '#C2521E';
        U.roundRect(ctx, -20, -8, 40, 8, 3); ctx.fill();
      },
    },
    trashcan: {
      w: 52, h: 68, hp: 80, weight: 0.9, dmg: 76, pick: true, mat: 'metal',
      label: 'TRASH CAN',
      draw(ctx) {
        const w = this.w, h = this.h;
        ctx.fillStyle = '#4A5058';
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 4, 0); ctx.lineTo(-w / 2, -h);
        ctx.lineTo(w / 2, -h); ctx.lineTo(w / 2 - 4, 0);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = U.rgba('#000', 0.3); ctx.lineWidth = 2;
        for (let i = 1; i < 5; i++) {
          ctx.beginPath(); ctx.moveTo(-w / 2 + i * 2, -h + i * 13); ctx.lineTo(w / 2 - i * 2, -h + i * 13); ctx.stroke();
        }
        ctx.fillStyle = '#5E656E';
        U.roundRect(ctx, -w / 2 - 3, -h - 8, w + 6, 10, 3); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.stroke();
      },
    },
  };

  // Every def draws from its own dimensions; bind them so `this` works.
  for (const k in DEFS) {
    const d = DEFS[k];
    const fn = d.draw;
    d.draw = function (ctx, p) { return fn.call(d, ctx, p); };
  }

  function Prop(type, x) {
    const d = DEFS[type];
    this.type = type;
    this.d = d;
    this.x = x;
    this.y = 0;            // world y; 0 is the deck, negative is up
    this.vx = 0; this.vy = 0;
    this.rot = 0; this.vrot = 0;
    this.hp = d.hp;
    this.maxHp = d.hp;
    this.state = 'rest';   // rest | held | thrown | gone
    this.holder = null;
    this.hitCool = 0;
    this.pump = 0;
    this.shake = 0;
    this.grounded = true;
  }

  Prop.prototype.box = function () {
    const d = this.d;
    return { x: this.x - d.w / 2, y: this.y - d.h, w: d.w, h: d.h };
  };

  Prop.prototype.hurt = function (dmg, dir, game) {
    if (this.state === 'gone') return false;
    this.hp -= dmg;
    this.shake = 1;
    this.pump = 1;
    if (this.d.mat === 'speaker') IB.Audio.sfx('metal');
    if (this.hp <= 0) {
      if (this.d.unbreakable) {
        this.hp = this.maxHp;
        this.vx += dir * 6;
        this.state = 'thrown';
        this.grounded = false;
        this.vy = -5;
        return false;
      }
      this.breakUp(game, dir);
      return true;
    }
    return false;
  };

  Prop.prototype.breakUp = function (game, dir) {
    this.state = 'gone';
    const d = this.d, x = this.x, y = this.y - d.h / 2;
    const FX = game.fx;
    switch (d.mat) {
      case 'wood':
        IB.Audio.sfx('wood');
        FX.debris(x, y, 18, ['#7A4F2C', '#8E6238', '#5A3A1E'], 1);
        break;
      case 'metal':
        IB.Audio.sfx('metal');
        FX.debris(x, y, 16, ['#6B737E', '#8A939E', '#3E454E'], 1);
        FX.sparkBurst(x, y, 14);
        break;
      case 'rubber':
        IB.Audio.sfx('wood');
        FX.debris(x, y, 10, ['#2E343C', '#1E2228'], 0.8);
        break;
      case 'rock':
        IB.Audio.sfx('metal');
        FX.debris(x, y, 14, ['#5E6058', '#7A7C72'], 1);
        break;
      case 'flowers':
        IB.Audio.sfx('wood');
        FX.debris(x, y, 12, ['#9A7A4E', '#8A6A3E'], 0.9);
        FX.petals(x, y, 26);
        break;
      case 'cooler':
        IB.Audio.sfx('glass');
        FX.debris(x, y, 14, ['#D8DCE0', '#C2412F', '#8E969E'], 0.8);
        FX.splash(x, y, '#9AD8FF', 18);
        game.spawnPickup(x, 'slushie');
        break;
      case 'keg':
        IB.Audio.sfx('explode');
        FX.debris(x, y, 12, ['#C6CDD4', '#7E868E'], 1);
        FX.geyser(x, y);
        game.blast(x, y, 220, 95, 15, 'keg');
        break;
      case 'speaker':
        IB.Audio.sfx('explode');
        FX.debris(x, y, 22, ['#191B22', '#262A34', '#C8A24A'], 1.2);
        FX.shockwave(x, y, 340, '#FFD08A');
        game.blast(x, y, 300, 120, 12, 'speaker');
        game.shake(18);
        game.crowd.react('special', x);
        break;
      default:
        IB.Audio.sfx('wood');
        FX.debris(x, y, 12, ['#8A8A8A'], 1);
    }
  };

  Prop.prototype.pickUp = function (fighter) {
    this.state = 'held';
    this.holder = fighter;
    this.grounded = false;
    this.vx = this.vy = 0;
    this.rot = 0;
  };

  Prop.prototype.launch = function (dirX, power) {
    const w = this.d.weight;
    this.state = 'thrown';
    this.holder = null;
    this.grounded = false;
    this.vx = (dirX * 19 * power) / Math.max(w, 0.4);
    this.vy = -9 / Math.max(w * 0.7, 0.5);
    this.vrot = dirX * 0.32;
    this.hitCool = 0;
    IB.Audio.sfx('whoosh');
  };

  Prop.prototype.update = function (dt, game) {
    const d = this.d;
    this.pump = Math.max(0, this.pump - dt * 4);
    this.shake = Math.max(0, this.shake - dt * 5);
    if (this.state === 'gone') return;

    if (this.state === 'held') {
      const f = this.holder;
      if (!f || f.dead) { this.state = 'rest'; this.holder = null; this.grounded = true; return; }
      this.x = f.x + f.face * 30;
      this.y = f.y - 118 + Math.sin(game.t * 5) * 2;
      this.rot = f.face * 0.2;
      return;
    }

    const step = dt * 60;
    this.vy += 0.62 * step;
    this.x += this.vx * step;
    this.y += this.vy * step;
    this.rot += this.vrot * step;
    this.hitCool = Math.max(0, this.hitCool - dt);

    const W = IB.VIEW.WORLD_W;
    if (this.x < 40) { this.x = 40; this.vx = Math.abs(this.vx) * 0.5; }
    if (this.x > W - 40) { this.x = W - 40; this.vx = -Math.abs(this.vx) * 0.5; }

    if (this.y >= 0) {
      this.y = 0;
      if (this.state === 'thrown') {
        const impact = Math.abs(this.vy);
        if (!d.unbreakable && impact > 9) {
          this.hurt(d.hp * 0.75, U.sign(this.vx), game);
          if (this.state === 'gone') return;
        }
        IB.Audio.sfx(d.mat === 'metal' ? 'metal' : 'land');
        game.fx.dust(this.x, 0, 8);
      }
      this.vy = d.bouncy ? -Math.abs(this.vy) * 0.55 : -Math.abs(this.vy) * 0.22;
      if (Math.abs(this.vy) < 1.4) { this.vy = 0; this.grounded = true; this.state = 'rest'; }
      this.vx *= 0.7;
      this.vrot *= 0.5;
      if (Math.abs(this.vx) < 0.3) { this.vx = 0; this.vrot = 0; this.rot = Math.round(this.rot / (Math.PI / 2)) * (Math.PI / 2); }
    }
  };

  Prop.prototype.draw = function (ctx, cam) {
    if (this.state === 'gone') return;
    const sx = this.x - cam.x;
    const sy = IB.VIEW.GROUND_Y + this.y;
    const sh = this.shake > 0 ? Math.sin(this.shake * 50) * this.shake * 3 : 0;

    if (this.state !== 'held' && this.y > -20) {
      const a = U.clamp(0.3 + this.y / 60, 0, 0.32);
      IB.Art.groundShadow(ctx, sx, IB.VIEW.GROUND_Y + 2, this.d.w * 0.5, a);
    }
    ctx.save();
    ctx.translate(sx + sh, sy);
    if (this.rot) ctx.rotate(this.rot);
    ctx.lineJoin = 'round';
    this.d.draw(ctx, this);

    // damage cracks once it has taken a beating
    const dmg = 1 - this.hp / this.maxHp;
    if (dmg > 0.25 && !this.d.unbreakable) {
      ctx.strokeStyle = U.rgba('#000', 0.45 * dmg);
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const s = U.hash(i, this.type.length) ;
        ctx.beginPath();
        ctx.moveTo(-this.d.w / 2 + s * this.d.w, -this.d.h * 0.8);
        ctx.lineTo(-this.d.w / 2 + s * this.d.w + 7, -this.d.h * 0.4);
        ctx.lineTo(-this.d.w / 2 + s * this.d.w - 4, -this.d.h * 0.1);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  IB.Prop = Prop;
  IB.PROP_DEFS = DEFS;
})(window.IB);
