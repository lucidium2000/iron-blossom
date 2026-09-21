/* Iron Blossom — special and super moves.
   Each kind spawns projectiles and/or applies a status to the user. Collision
   is resolved by the game loop; everything here owns its own look and timing. */
window.IB = window.IB || {};
(function (IB) {
  'use strict';
  const U = IB.U;
  const V = IB.VIEW;

  function Proj(o) {
    Object.assign(this, {
      x: 0, y: -100, vx: 0, vy: 0, w: 60, h: 60, dmg: 30, life: 2.5, t: 0,
      pierce: true, hitstun: 16, push: 6, lvl: 'mid', launch: 0, dead: false,
      kind: 'generic', color: '#FFF', spin: 0, delay: 0, owner: null,
    }, o);
    this.hits = [];
  }

  Proj.prototype.box = function () {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  };

  Proj.prototype.update = function (dt, game) {
    if (this.delay > 0) { this.delay -= dt; return; }
    const step = dt * 60;
    this.t += dt;
    this.x += this.vx * step;
    this.y += this.vy * step;
    if (this.grav) this.vy += this.grav * step;
    this.spin += (this.vspin || 0) * step;
    if (this.wobble) this.y += Math.sin(this.t * this.wobble) * 2 * step;
    if (this.trail) game.fx.trail(this.x, this.y, this.color, this.w * 0.35);
    if (this.t > this.life || this.x < -150 || this.x > V.WORLD_W + 150) this.dead = true;
  };

  /* ------------------------------------------------------- projectile art */

  const ART = {
    note: function (ctx, p) {
      const s = p.w / 60;
      ctx.save();
      ctx.rotate(Math.sin(p.t * 9) * 0.16);
      // shockwave behind the note
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 46 * s);
      g.addColorStop(0, U.rgba(p.color, 0.7));
      g.addColorStop(1, U.rgba(p.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 46 * s, 0, U.TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // the note itself
      ctx.fillStyle = '#15121A';
      ctx.beginPath(); ctx.ellipse(-7 * s, 11 * s, 13 * s, 9.5 * s, -0.35, 0, U.TAU); ctx.fill();
      ctx.fillRect(4 * s, -24 * s, 4.5 * s, 34 * s);
      ctx.beginPath();
      ctx.moveTo(8.5 * s, -24 * s);
      ctx.quadraticCurveTo(24 * s, -18 * s, 17 * s, -2 * s);
      ctx.quadraticCurveTo(21 * s, -16 * s, 8.5 * s, -14 * s);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.ellipse(-8 * s, 10 * s, 9 * s, 6.5 * s, -0.35, 0, U.TAU); ctx.fill();
      ctx.restore();
    },

    goose: function (ctx, p) {
      const s = p.w / 60;
      const flap = Math.sin(p.t * 22 + p.ph) * 0.7;
      ctx.save();
      ctx.scale(p.dir, 1);
      ctx.fillStyle = '#F0EAD8';
      ctx.beginPath();
      ctx.ellipse(0, 0, 21 * s, 10 * s, 0, 0, U.TAU);
      ctx.fill();
      ctx.strokeStyle = '#15121A'; ctx.lineWidth = 2 * s; ctx.stroke();
      // neck + head
      ctx.fillStyle = '#2C3A2E';
      ctx.beginPath();
      ctx.moveTo(14 * s, -3 * s);
      ctx.quadraticCurveTo(28 * s, -14 * s, 32 * s, -20 * s);
      ctx.lineTo(27 * s, -21 * s);
      ctx.quadraticCurveTo(24 * s, -12 * s, 12 * s, 3 * s);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(31 * s, -21 * s, 5.4 * s, 0, U.TAU); ctx.fill();
      ctx.fillStyle = '#E8A03C';
      ctx.beginPath();
      ctx.moveTo(35 * s, -22 * s); ctx.lineTo(45 * s, -20 * s); ctx.lineTo(35 * s, -18 * s);
      ctx.closePath(); ctx.fill();
      // wings
      ctx.fillStyle = '#D8D0BC';
      ctx.save();
      ctx.rotate(-0.5 + flap);
      ctx.beginPath(); ctx.ellipse(-4 * s, -8 * s, 20 * s, 8 * s, -0.3, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = '#15121A'; ctx.lineWidth = 1.8 * s; ctx.stroke();
      ctx.restore();
      ctx.restore();
    },

    kaleido: function (ctx, p) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const n = 10;
      for (let i = 0; i < n; i++) {
        const a = p.spin + (i / n) * U.TAU;
        const hue = (i / n) * 360;
        ctx.fillStyle = 'hsla(' + ((hue + p.t * 200) % 360) + ',85%,60%,0.32)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, p.w * 0.62, a, a + U.TAU / n * 0.85);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = U.rgba('#FFFFFF', 0.5);
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, p.w * 0.5, 0, U.TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, p.w * 0.3, 0, U.TAU); ctx.stroke();
      ctx.restore();
    },

    wave: function (ctx, p) {
      // rolling reverb wave — reads as water, hits low
      ctx.save();
      ctx.scale(p.dir, 1);
      const w = p.w, h = p.h;
      const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      g.addColorStop(0, U.rgba('#BEF0F0', 0.9));
      g.addColorStop(0.45, U.rgba(p.color, 0.8));
      g.addColorStop(1, U.rgba('#123A44', 0.7));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-w / 2, h / 2);
      ctx.quadraticCurveTo(-w * 0.2, -h * 0.66, w * 0.3, -h * 0.52);
      ctx.quadraticCurveTo(w * 0.62, -h * 0.44, w * 0.48, h * 0.1);
      ctx.quadraticCurveTo(w * 0.42, h * 0.42, w / 2, h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = U.rgba('#FFFFFF', 0.75);
      for (let i = 0; i < 12; i++) {
        const t = i / 12;
        ctx.beginPath();
        ctx.arc(w * (0.45 - t * 0.85), -h * 0.38 + Math.sin(p.t * 8 + i) * 7,
          4 + Math.sin(i * 2.2) * 3, 0, U.TAU);
        ctx.fill();
      }
      ctx.restore();
    },

    breath: function (ctx, p) {
      // harmonica air — concentric arcs pushing forward
      ctx.save();
      ctx.scale(p.dir, 1);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const ph = (p.t * 3 + i * 0.2) % 1;
        ctx.strokeStyle = U.rgba(p.color, (1 - ph) * 0.55);
        ctx.lineWidth = 7 - i;
        ctx.beginPath();
        ctx.ellipse(-p.w * 0.2 + ph * p.w * 0.5, 0, p.w * 0.18 + ph * p.w * 0.3,
          p.h * 0.3 + ph * p.h * 0.22, 0, -1.1, 1.1);
        ctx.stroke();
      }
      ctx.restore();
    },

    blade: function (ctx, p) {
      ctx.save();
      ctx.scale(p.dir, 1);
      ctx.rotate(p.spin);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = U.rgba(p.color, 0.8);
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(0, 0, p.w * 0.45, -1.2, 1.2);
      ctx.stroke();
      ctx.strokeStyle = U.rgba('#FFFFFF', 0.9);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, p.w * 0.45, -1.1, 1.1);
      ctx.stroke();
      ctx.restore();
    },

    horn: function (ctx, p) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const r = p.w * 0.5 * (0.6 + Math.sin(p.t * 24) * 0.12);
      const g = ctx.createRadialGradient(0, 0, 3, 0, 0, r);
      g.addColorStop(0, U.rgba('#FFFFFF', 0.85));
      g.addColorStop(0.4, U.rgba(p.color, 0.6));
      g.addColorStop(1, U.rgba(p.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = U.rgba('#FFFFFF', 0.7);
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * U.TAU + p.t * 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
        ctx.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
        ctx.stroke();
      }
      ctx.restore();
    },

    // Third Man: the red/white/black triptych, three of him at once.
    ghost: function (ctx, p) {
      const c = p.owner && p.owner.char;
      if (!c) return;
      const flat = Object.assign({}, c, {
        look: Object.assign({}, c.look, {
          skin: p.color, hair: p.color, top: p.color, sleeve: p.color,
          pants: p.color, shoe: p.color, vest: null, stripe: null,
          face2: Object.assign({}, c.look.face2, { beard: null, glasses: null }),
        }),
        prop: Object.assign({}, c.prop, { body: p.color, neck: p.color, accent: p.color }),
      });
      ctx.save();
      ctx.globalAlpha = 0.82 * Math.min(1, (p.life - p.t) * 4);
      IB.Art.drawFighter(ctx, {
        char: flat, pose: IB.Rig.POSES.swingH, face: p.dir, x: 0, y: 110,
      });
      ctx.restore();
    },

    cowbell: function (ctx, p) {
      ctx.save();
      ctx.rotate(p.spin);
      ctx.scale(2.1, 2.1);
      IB.Art.INSTRUMENT.cowbell(ctx, 150, { body: '#C9A227', neck: '#8A6E1E', accent: '#F2F2EF' });
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = U.rgba('#FFE9A8', 0.3);
      ctx.beginPath(); ctx.arc(0, 0, 26, 0, U.TAU); ctx.fill();
      ctx.restore();
    },

    // A single enormous eye that opens, then fires.
    eye: function (ctx, p) {
      const open = U.clamp(p.t * 5, 0, 1) * U.clamp((p.life - p.t) * 4, 0, 1);
      const w = p.w * 0.5, h = p.h * 0.42 * open;
      ctx.save();
      ctx.scale(p.dir, 1);
      ctx.fillStyle = '#F4EEE2';
      ctx.beginPath();
      ctx.moveTo(-w, 0);
      ctx.quadraticCurveTo(0, -h * 2, w, 0);
      ctx.quadraticCurveTo(0, h * 2, -w, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2A1840'; ctx.lineWidth = 6; ctx.stroke();
      ctx.save();
      ctx.clip();
      // iris rings cycling through the spectrum
      for (let i = 5; i >= 1; i--) {
        ctx.fillStyle = 'hsl(' + ((p.t * 260 + i * 42) % 360) + ',80%,' + (28 + i * 7) + '%)';
        ctx.beginPath(); ctx.arc(0, 0, h * 1.5 * (i / 5), 0, U.TAU); ctx.fill();
      }
      ctx.fillStyle = '#12101A';
      ctx.beginPath(); ctx.arc(0, 0, h * 0.42, 0, U.TAU); ctx.fill();
      ctx.restore();
      // the beam
      if (p.t > 0.28) {
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(0, 0, p.w * 2.4, 0);
        g.addColorStop(0, U.rgba('#F2B441', 0.85));
        g.addColorStop(1, U.rgba('#7B4BC4', 0));
        ctx.fillStyle = g;
        const bh = h * 0.7 * (1 + Math.sin(p.t * 30) * 0.12);
        ctx.fillRect(0, -bh, p.w * 2.4, bh * 2);
      }
      ctx.restore();
    },

    // Broadcast static, for the vanish and the arrival.
    static: function (ctx, p) {
      const a = U.clamp((p.life - p.t) * 3, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      for (let i = 0; i < 26; i++) {
        const yy = -p.h / 2 + (i / 26) * p.h;
        const w = p.w * (0.3 + U.hash(i, (p.t * 40) | 0) * 0.7);
        ctx.fillStyle = i % 3 === 0 ? '#2ED8C3' : (i % 3 === 1 ? '#F2EDE2' : '#1B1430');
        ctx.fillRect(-w / 2, yy, w, p.h / 26);
      }
      ctx.restore();
    },

    micstand: function (ctx, p) {
      ctx.save();
      ctx.rotate(p.spin);
      ctx.strokeStyle = '#3A4048';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-p.w * 0.46, 0);
      ctx.lineTo(p.w * 0.46, 0);
      ctx.stroke();
      ctx.strokeStyle = '#8A929A'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#2C3A2E';
      ctx.beginPath(); ctx.arc(p.w * 0.46, 0, 9, 0, U.TAU); ctx.fill();
      ctx.fillStyle = '#C8B560';
      ctx.beginPath(); ctx.arc(-p.w * 0.46, 0, 7, 0, U.TAU); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = U.rgba('#C8B560', 0.4);
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, p.w * 0.48, p.spin - 1.2, p.spin + 0.3); ctx.stroke();
      ctx.restore();
    },

    // Four amps' worth of sound pushed forward as a solid wall.
    wall: function (ctx, p) {
      ctx.save();
      ctx.scale(p.dir, 1);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const ph = ((p.t * 2.2 + i * 0.14) % 1);
        ctx.fillStyle = U.rgba(i % 2 ? '#E0245E' : '#F2EDE2', (1 - ph) * 0.30);
        const w = p.w * (0.18 + ph * 0.5);
        ctx.fillRect(-w / 2, -p.h / 2, w, p.h);
      }
      ctx.globalCompositeOperation = 'source-over';
      // the band, in silhouette, leaning into it
      ctx.fillStyle = U.rgba('#15121A', 0.55);
      for (let i = 0; i < 4; i++) {
        const x = -p.w * 0.3 + i * p.w * 0.19;
        const y = p.h * 0.34 - (i % 2) * 8;
        ctx.beginPath(); ctx.arc(x, y - 44, 11, 0, U.TAU); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x - 15, y + 26);
        ctx.quadraticCurveTo(x, y - 34, x + 15, y + 26);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },

    // Bowed musical saw: a warbling vertical blade of tone.
    saw: function (ctx, p) {
      ctx.save();
      ctx.scale(p.dir, 1);
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = U.rgba(k === 1 ? '#F2E0A0' : p.color, 0.6 - k * 0.15);
        ctx.lineWidth = 9 - k * 2.5;
        ctx.beginPath();
        for (let i = 0; i <= 22; i++) {
          const yy = -p.h / 2 + (i / 22) * p.h;
          const xx = Math.sin(p.t * 16 + i * 0.5 + k) * (10 + k * 5);
          if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
        }
        ctx.stroke();
      }
      ctx.restore();
    },

    // Overhead breaker: the curl comes down from above.
    breaker: function (ctx, p) {
      ctx.save();
      ctx.scale(p.dir, 1);
      const w = p.w, h = p.h;
      const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      g.addColorStop(0, U.rgba('#CFF4F4', 0.95));
      g.addColorStop(0.5, U.rgba(p.color, 0.85));
      g.addColorStop(1, U.rgba('#0E3038', 0.6));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-w * 0.5, -h * 0.5);
      ctx.quadraticCurveTo(w * 0.34, -h * 0.62, w * 0.5, h * 0.06);
      ctx.quadraticCurveTo(w * 0.2, h * 0.5, -w * 0.18, h * 0.42);
      ctx.quadraticCurveTo(-w * 0.52, h * 0.2, -w * 0.5, -h * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = U.rgba('#FFFFFF', 0.8);
      for (let i = 0; i < 14; i++) {
        const t = i / 14;
        ctx.beginPath();
        ctx.arc(w * (0.44 - t * 0.9), -h * 0.36 + Math.sin(p.t * 9 + i) * 9,
          4 + Math.sin(i * 1.7) * 3, 0, U.TAU);
        ctx.fill();
      }
      ctx.restore();
    },

    // The live band arriving: a ring of horn blasts.
    bandhorns: function (ctx, p) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const R = p.w * 0.5 * U.clamp(p.t * 3.2, 0.2, 1);
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * 0.92 + (i / 6) * Math.PI * 0.84;
        const bx = Math.cos(a) * R, by = Math.sin(a) * R * 0.7;
        const g = ctx.createRadialGradient(bx, by, 2, bx, by, 34);
        g.addColorStop(0, U.rgba('#FFF6D8', 0.9));
        g.addColorStop(0.5, U.rgba('#E8B33C', 0.55));
        g.addColorStop(1, U.rgba('#E8B33C', 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(bx, by, 34, 0, U.TAU); ctx.fill();
      }
      ctx.strokeStyle = U.rgba('#E8B33C', 0.6);
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(0, 0, R, R * 0.7, 0, 0, U.TAU); ctx.stroke();
      ctx.restore();
    },

    // A proper scrap: dust cloud with limbs, a cymbal and a headstock flying
    // out of it. Dijon's whole thing is the band piling round one mic.
    huddle: function (ctx, p) {
      const t = p.t;
      const R = p.w * 0.5 * U.clamp(t * 6, 0.35, 1);
      ctx.save();
      // cloud
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * U.TAU + t * 2.2;
        const rr = R * (0.52 + U.hash(i, Math.floor(t * 14)) * 0.5);
        ctx.fillStyle = U.rgba(i % 3 ? '#C8B49A' : '#E2D2BC', 0.34);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * R * 0.34, Math.sin(a) * R * 0.26, rr * 0.5, 0, U.TAU);
        ctx.fill();
      }
      // limbs and gear breaking the surface
      const n = Math.floor(t * 16);
      ctx.strokeStyle = '#3A2A1E'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const a = U.hash(i, n) * U.TAU;
        const len = R * (0.5 + U.hash(i + 5, n) * 0.5);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.15);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len * 0.8);
        ctx.stroke();
      }
      // a fist, a cymbal, a headstock
      const ca = t * 9;
      ctx.fillStyle = '#B0784E';
      ctx.beginPath(); ctx.arc(Math.cos(ca) * R * 0.7, -R * 0.62, 12, 0, U.TAU); ctx.fill();
      ctx.fillStyle = '#D8B45A';
      ctx.save();
      ctx.translate(-R * 0.66, -R * 0.5); ctx.rotate(t * 7);
      ctx.beginPath(); ctx.ellipse(0, 0, 22, 6, 0, 0, U.TAU); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#E2D2BC';
      ctx.save();
      ctx.translate(R * 0.5, -R * 0.72); ctx.rotate(-t * 5);
      ctx.fillRect(-4, -20, 8, 30);
      ctx.restore();
      // impact star
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = U.rgba('#FFE9A8', 0.5 + Math.sin(t * 24) * 0.3);
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const ang = (k / 10) * U.TAU;
        const rr = k % 2 ? R * 0.3 : R * 0.62;
        ctx[k ? 'lineTo' : 'moveTo'](Math.cos(ang) * rr, Math.sin(ang) * rr * 0.8);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    },

    // Rows of hands coming up out of the pit to throw him back.
    hands: function (ctx, p) {
      const a = U.clamp((p.life - p.t) * 3, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < 9; i++) {
          const x = -p.w / 2 + (i + (row ? 0.5 : 0)) * (p.w / 9);
          const lift = Math.sin(p.t * 9 + i * 0.7 + row) * 9;
          const c = ['#C4A28C', '#9A7452', '#7A5636', '#B08E70'][(i + row) % 4];
          ctx.strokeStyle = c;
          ctx.lineWidth = 8 - row * 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x, p.h * 0.5);
          ctx.lineTo(x + row * 4, -p.h * 0.1 - lift - row * 10);
          ctx.stroke();
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.arc(x + row * 4, -p.h * 0.12 - lift - row * 10, 7 - row, 0, U.TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    },

    // The home-studio mixing desk, swung like a slab.
    console: function (ctx, p) {
      ctx.save();
      ctx.scale(p.dir, 1);
      ctx.rotate(p.spin);
      const w = p.w, h = p.h;
      ctx.fillStyle = '#2A2E38';
      U.roundRect(ctx, -w / 2, -h / 2, w, h, 6);
      ctx.fill();
      ctx.strokeStyle = '#15121A'; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = '#1C1F26';
      U.roundRect(ctx, -w / 2 + 8, -h / 2 + 7, w - 16, h - 14, 4);
      ctx.fill();
      // faders
      for (let i = 0; i < 9; i++) {
        const x = -w / 2 + 18 + i * ((w - 36) / 8);
        ctx.strokeStyle = '#3E434E'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, -h / 2 + 16); ctx.lineTo(x, h / 2 - 14); ctx.stroke();
        ctx.fillStyle = i % 2 ? '#E2703A' : '#D8DCE0';
        ctx.fillRect(x - 4, -h / 2 + 22 + (i % 4) * 9, 8, 6);
        ctx.fillStyle = '#7CE8A0';
        ctx.beginPath(); ctx.arc(x, -h / 2 + 12, 2.2, 0, U.TAU); ctx.fill();
      }
      ctx.restore();
    },

    aura: function (ctx, p) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const r = p.w * 0.5;
      const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
      g.addColorStop(0, U.rgba('#FFE8C8', 0.5));
      g.addColorStop(0.6, U.rgba(p.color, 0.3));
      g.addColorStop(1, U.rgba(p.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, U.TAU); ctx.fill();
      // silhouettes of the band crowding in around the mic
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = U.rgba('#2A1810', 0.5);
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI * 0.85 + (i / 4) * Math.PI * 0.7;
        const x = Math.cos(a) * r * 0.72, y = Math.sin(a) * r * 0.4 + r * 0.3;
        ctx.beginPath(); ctx.arc(x, y - 26, 11, 0, U.TAU); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x - 14, y + 28);
        ctx.quadraticCurveTo(x, y - 20, x + 14, y + 28);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },
  };

  /* ---------------------------------------------------------- definitions */

  const SPEC = {};

  SPEC.riff = function (g, f, sup) {
    const n = sup ? 12 : f.char.special.hits;
    const dmg = sup ? 30 : f.char.special.dmg;
    for (let i = 0; i < n; i++) {
      g.projectiles.push(new Proj({
        kind: 'note', owner: f, color: sup ? '#FFD84A' : '#D7263D',
        x: f.x + f.face * 66, y: -118, w: 58 + i * 3, h: 66,
        vx: f.face * (8.5 + i * 0.35), dmg: dmg + i * 3,
        hitstun: 15, push: 4 + i * 0.5, life: 2.6, delay: i * 0.12,
        pierce: false, trail: true,
      }));
    }
    if (sup) g.shake(14);
  };
  SPEC.riffSuper = (g, f) => SPEC.riff(g, f, true);

  SPEC.drop = function (g, f, sup) {
    // the long quiet build, then everything at once
    f.buildUp = sup ? 1.0 : 0.78;
    g.pending.push({
      t: f.buildUp, fn: () => {
        const r = sup ? 520 : f.char.special.radius;
        const dmg = sup ? 320 : f.char.special.dmg;
        g.fx.shockwave(f.x, -110, r, '#FFFFFF');
        g.fx.shockwave(f.x, -110, r * 0.7, '#3CC8FF');
        g.fx.shockwave(f.x, -110, r * 1.3, '#E8B33C', true);
        g.fx.sparkBurst(f.x, -110, 40);
        g.blast(f.x, -110, r, dmg, 17, 'drop', f);
        g.shake(sup ? 30 : 20);
        g.flash(0.55, '#FFFFFF');
        g.crowd.react('special', f.x);
        g.slowmo(0.22);
        for (let i = 0; i < 26; i++) {
          g.fx.debris(f.x + U.rand(-r / 2, r / 2), -U.rand(20, 220), 1,
            ['#F2F2EF', '#3CC8FF', '#E8B33C'], 0.9);
        }
      },
    });
    // visible build: a tightening ring
    for (let i = 0; i < 6; i++) {
      g.pending.push({
        t: (f.buildUp / 6) * i, fn: () => {
          g.fx.shockwave(f.x, -110, 60 + i * 26, '#8AD8FF', true);
        },
      });
    }
  };
  SPEC.dropSuper = (g, f) => SPEC.drop(g, f, true);

  SPEC.kaleido = function (g, f, sup) {
    const n = sup ? 3 : 1;
    for (let i = 0; i < n; i++) {
      g.projectiles.push(new Proj({
        kind: 'kaleido', owner: f, color: '#7B4BC4',
        x: f.x + f.face * 60, y: -110 - i * 20, w: 150 + i * 30, h: 190,
        vx: f.face * 6.6, vspin: 0.06, dmg: sup ? 110 : f.char.special.dmg,
        hitstun: 20, push: 7, life: 3, pierce: true, delay: i * 0.18,
        confuse: (sup ? 320 : f.char.special.confuse),
      }));
    }
    g.flash(0.2, '#7B4BC4');
  };
  SPEC.kaleidoSuper = (g, f) => SPEC.kaleido(g, f, true);

  SPEC.phase = function (g, f, sup) {
    f.echo = sup ? 5.2 : f.char.special.echoTime / 60;
    f.echoStrength = sup ? 0.75 : 0.45;
    g.fx.shockwave(f.x, -110, 200, '#2ED8C3');
    g.flash(0.22, '#2ED8C3');
    // an opening burst so the move isn't purely a buff
    g.projectiles.push(new Proj({
      kind: 'horn', owner: f, color: '#2ED8C3',
      x: f.x + f.face * 70, y: -110, w: 130, h: 130,
      vx: f.face * 9, dmg: sup ? 120 : f.char.special.dmg,
      hitstun: 18, push: 6, life: 1.6, pierce: false, trail: true,
    }));
  };
  SPEC.phaseSuper = (g, f) => SPEC.phase(g, f, true);

  // ABSOLUTELY — he drags the whole band into a scrap around one mic, comes out
  // of it swinging a guitar, and takes health back off every connect.
  SPEC.soul = function (g, f, sup) {
    const sp = f.char.special;
    const hits = sup ? 8 : 6;
    f.vx = f.face * 7.5;              // lunge into it rather than stand still
    f.rushing = 0.3;

    g.projectiles.push(new Proj({
      kind: 'huddle', owner: f, color: '#E2703A',
      x: 0, y: -104, w: sup ? 300 : 250, h: 210,
      vx: 0, dmg: sup ? 26 : 22, hitstun: 11, push: 2.5,
      life: 0.1 + hits * 0.085, pierce: true, repeat: 0.085,
      follow: true, followOff: 34,
    }));

    // each connect gives a little back — the heal is earned, not free
    const per = Math.round((sup ? sp.heal + 40 : sp.heal) / hits);
    for (let i = 0; i < hits; i++) {
      g.pending.push({
        t: 0.1 + i * 0.085, fn: () => {
          g.fx.sparkBurst(f.x + f.face * 40 + U.rand(-40, 40), -110 + U.rand(-40, 40), 5);
          g.fx.dust(f.x + f.face * 30, 0, 3);
          g.shake(3);
          if (f.hp < f.maxHp) {
            f.hp = Math.min(f.maxHp, f.hp + per);
            if (i % 2 === 0) g.fx.text(f.x, -200 - i * 6, '+' + per, '#7CE8A0', 20);
          }
        },
      });
    }

    // and out of it with the guitar over his head
    g.pending.push({
      t: 0.1 + hits * 0.085, fn: () => {
        f.swinging = 0.34;
        f.vx = f.face * 5;
        g.projectiles.push(new Proj({
          kind: 'blade', owner: f, color: '#E2703A', dir: f.face,
          x: f.x + f.face * 76, y: -116, w: 170, h: 170,
          vx: f.face * 2, vspin: 0.4, dmg: sup ? 120 : 92,
          hitstun: 26, push: 12, launch: 11, life: 0.26, pierce: true,
        }));
        g.fx.shockwave(f.x + f.face * 70, -116, 250, '#E2703A');
        g.shake(16);
        g.hitstop(6);
        IB.Audio.sfx('hit', 1);
        g.crowd.react('special', f.x);
      },
    });
    f.armor = (sup ? 200 : sp.armor) / 60;
  };

  // THE DRESS — hauls the mixing desk over his head and puts it through them.
  SPEC.soulSuper = function (g, f) {
    f.hauling = 0.55;
    const desk = new Proj({
      kind: 'console', owner: f, color: '#E2703A', dir: f.face,
      x: f.x + f.face * 20, y: -230, w: 210, h: 86,
      vx: 0, dmg: 0, life: 1.5, pierce: true, spin: -0.22,
      follow: true, followOff: 20,
    });
    g.projectiles.push(desk);
    g.slowmo(0.2);

    g.pending.push({ t: 0.5, fn: () => {
      // step in, then bring it down
      f.vx = f.face * 9;
      desk.follow = false;
      desk.vx = f.face * 5;
      desk.vy = 13;
      desk.vspin = 0.5;
      desk.dmg = 190;
      desk.hitstun = 30;
      desk.push = 16;
      desk.launch = 13;
    } });

    g.pending.push({ t: 0.86, fn: () => {
      desk.dead = true;
      g.blast(desk.x, -60, 300, 150, 17, 'speaker', f);
      g.fx.shockwave(desk.x, -40, 360, '#E2703A');
      g.fx.shockwave(desk.x, -40, 240, '#FFE9A8', true);
      g.fx.debris(desk.x, -70, 26, ['#2A2E38', '#D8DCE0', '#E2703A', '#7CE8A0'], 1.2);
      g.fx.sparkBurst(desk.x, -70, 30);
      g.fx.dust(desk.x, 0, 22);
      g.shake(28);
      g.hitstop(10);
      g.flash(0.4, '#FFE9A8');
      g.crowd.react('ko', desk.x);
      IB.Audio.sfx('explode');
      f.hauling = 0;
    } });
  };

  SPEC.flock = function (g, f, sup) {
    const n = sup ? 12 : f.char.special.hits;
    for (let i = 0; i < n; i++) {
      const row = i % 2 ? 1 : -1;
      const tier = Math.floor(i / 2);
      const fromLeft = sup && i >= n / 2;
      const dir = fromLeft ? -f.face : f.face;
      g.projectiles.push(new Proj({
        kind: 'goose', owner: f, color: '#F0EAD8', dir,
        x: (fromLeft ? V.WORLD_W + 80 : f.x + f.face * 70) - dir * tier * 46,
        y: -150 - row * 34 - tier * 8,
        w: 56, h: 40, vx: dir * (11 + tier * 0.4),
        dmg: sup ? 26 : f.char.special.dmg, hitstun: 12, push: 3,
        life: 3, pierce: false, delay: tier * 0.07, wobble: 9, ph: i,
      }));
    }
  };
  SPEC.flockSuper = (g, f) => SPEC.flock(g, f, true);

  SPEC.saw = function (g, f, sup) {
    f.stance = (f.stance + 1) % 3;
    f.applyStance();
    const n = sup ? 9 : f.char.special.hits;
    for (let i = 0; i < n; i++) {
      g.projectiles.push(new Proj({
        kind: 'blade', owner: f, color: '#E0245E', dir: f.face,
        x: f.x + f.face * (72 + i * 9), y: -112, w: 120, h: 120,
        vx: f.face * 1.4, vspin: 0.5, dmg: sup ? 30 : f.char.special.dmg,
        hitstun: 10, push: 2, life: 0.3, pierce: true, delay: i * 0.085,
        follow: false,
      }));
      g.pending.push({ t: i * 0.085, fn: () => g.fx.sparkBurst(f.x + f.face * 80, -112, 8) });
    }
    g.fx.text(f.x, -200, ['GUITAR', 'BASS', 'DRUMS'][f.stance], '#E0245E', 26);
  };
  SPEC.sawSuper = (g, f) => SPEC.saw(g, f, true);

  SPEC.harmonica = function (g, f, sup) {
    g.projectiles.push(new Proj({
      kind: 'breath', owner: f, color: '#C9A227', dir: f.face,
      x: f.x + f.face * 90, y: -118, w: 210, h: 150,
      vx: f.face * 7.2, dmg: sup ? 105 : f.char.special.dmg,
      hitstun: 14, push: sup ? 22 : f.char.special.push,
      life: sup ? 3.6 : 2.8, pierce: true, repeat: 0.28,
    }));
    if (sup) {
      g.projectiles.push(new Proj({
        kind: 'breath', owner: f, color: '#F2E0A0', dir: f.face,
        x: f.x + f.face * 90, y: -70, w: 240, h: 170,
        vx: f.face * 6.2, dmg: 90, hitstun: 14, push: 20,
        life: 3.6, pierce: true, repeat: 0.3, delay: 0.25,
      }));
    }
  };
  SPEC.harmonicaSuper = (g, f) => SPEC.harmonica(g, f, true);

  SPEC.surf = function (g, f, sup) {
    g.projectiles.push(new Proj({
      kind: 'wave', owner: f, color: '#2E8B8B', dir: f.face,
      x: f.x + f.face * 80, y: -48, w: 170, h: 96,
      vx: f.face * 8, dmg: sup ? 100 : f.char.special.dmg,
      hitstun: 22, push: 9, life: 3, pierce: !!sup, lvl: 'low', trip: true,
    }));
    if (sup) {
      g.projectiles.push(new Proj({
        kind: 'wave', owner: f, color: '#6ED8E8', dir: -f.face,
        x: f.x - f.face * 80, y: -48, w: 170, h: 96,
        vx: -f.face * 8, dmg: 100, hitstun: 22, push: 9,
        life: 3, pierce: true, lvl: 'low', trip: true, delay: 0.2,
      }));
    }
  };
  SPEC.surfSuper = (g, f) => SPEC.surf(g, f, true);

  SPEC.bars = function (g, f, sup) {
    // closes distance, then lands a run of hits in place
    const n = sup ? 10 : f.char.special.hits;
    f.vx = f.face * 13;
    f.rushing = 0.26;
    for (let i = 0; i < n; i++) {
      g.projectiles.push(new Proj({
        kind: 'horn', owner: f, color: '#E8B33C',
        x: 0, y: -116, w: 112, h: 104, vx: 0,
        dmg: sup ? 32 : f.char.special.dmg, hitstun: 9, push: 1.5,
        life: 0.18, pierce: true, delay: 0.1 + i * 0.09, follow: true,
        followOff: 62,
      }));
    }
    g.pending.push({
      t: 0.1 + n * 0.09, fn: () => {
        g.fx.shockwave(f.x + f.face * 70, -116, 200, '#E8B33C');
        g.blast(f.x + f.face * 70, -116, 170, sup ? 70 : 40, 14, 'bars', f);
      },
    });
  };
  SPEC.barsSuper = (g, f) => SPEC.bars(g, f, true);

  /* ------------------------------------------------- second specials (2) */

  // Jack White — the red/white/black triptych steps forward together.
  SPEC.third = function (g, f) {
    ['#D7263D', '#F4F1F2', '#1A1620'].forEach((col, i) => {
      g.projectiles.push(new Proj({
        kind: 'ghost', owner: f, color: col, dir: f.face,
        x: f.x + f.face * (52 + i * 34), y: -104, w: 92, h: 150,
        vx: f.face * 5.4, dmg: 46, hitstun: 16, push: 5,
        life: 0.75, pierce: false, delay: i * 0.11,
      }));
    });
    g.flash(0.28, '#D7263D');
    g.shake(9);
    g.crowd.react('special', f.x);
  };

  // LCD Soundsystem — the cowbell, from directly above, repeatedly.
  SPEC.cowbells = function (g, f) {
    const opp = f === g.p1 ? g.p2 : g.p1;
    for (let i = 0; i < 9; i++) {
      g.projectiles.push(new Proj({
        kind: 'cowbell', owner: f, color: '#C9A227',
        x: opp.x + U.rand(-150, 150), y: -560,
        w: 54, h: 54, vx: U.rand(-0.6, 0.6), vy: 3, grav: 0.42,
        vspin: U.rand(-0.16, 0.16), dmg: 34, hitstun: 13, push: 3,
        life: 3, pierce: false, delay: i * 0.09,
      }));
    }
    g.fx.text(f.x, -230, 'MORE COWBELL', '#E8B33C', 26);
  };

  // Portugal. The Man — a single enormous eye opens and fires.
  SPEC.eye = function (g, f) {
    g.projectiles.push(new Proj({
      kind: 'eye', owner: f, color: '#7B4BC4', dir: f.face,
      x: f.x + f.face * 104, y: -164, w: 190, h: 150,
      vx: f.face * 1.2, dmg: 100, hitstun: 22, push: 8,
      life: 1.35, pierce: true, repeat: 0.3, confuse: 160,
    }));
    g.flash(0.3, '#F2B441');
    g.slowmo(0.16);
  };

  // Phantogram — blink out of the picture and arrive behind them.
  SPEC.blackout = function (g, f) {
    const opp = f === g.p1 ? g.p2 : g.p1;
    const dest = opp.x + (opp.x > f.x ? 78 : -78);
    g.projectiles.push(new Proj({
      kind: 'static', owner: f, color: '#2ED8C3',
      x: f.x, y: -104, w: 90, h: 180, vx: 0, dmg: 0, life: 0.3, pierce: true,
    }));
    f.vanish = 0.24;
    g.pending.push({
      t: 0.24, fn: () => {
        f.x = U.clamp(dest, 70, V.WORLD_W - 70);
        f.face = opp.x > f.x ? 1 : -1;
        f.vanish = 0;
        g.projectiles.push(new Proj({
          kind: 'static', owner: f, color: '#2ED8C3',
          x: f.x, y: -104, w: 96, h: 190, vx: 0, dmg: 0, life: 0.3, pierce: true,
        }));
        g.projectiles.push(new Proj({
          kind: 'horn', owner: f, color: '#2ED8C3',
          x: f.x + f.face * 62, y: -110, w: 150, h: 150,
          vx: f.face * 2, dmg: 105, hitstun: 24, push: 9, launch: 9,
          life: 0.4, pierce: false,
        }));
        g.shake(12);
        IB.Audio.sfx('special', 'phase');
      },
    });
  };

  // Dijon — off the front of the stage, the pit throws him back, and he lands
  // on them. The hands are the point: it should read as the crowd doing it.
  SPEC.stagedive = function (g, f) {
    const opp = f === g.p1 ? g.p2 : g.p1;
    const dir = U.sign(opp.x - f.x) || f.face;
    f.diving = 1.3;
    f.vx = dir * 12;
    f.vy = -15;
    f.grounded = false;
    f.state = 'jump';
    g.crowd.react('special', f.x);
    g.crowd.excite = 1;
    IB.Audio.crowdRoar(1.1);
    g.fx.dust(f.x, 0, 12);

    // the pit catches him and launches him back up
    g.pending.push({ t: 0.30, fn: () => {
      g.projectiles.push(new Proj({
        kind: 'hands', owner: f, color: '#C4A28C',
        x: f.x, y: -30, w: 240, h: 110, vx: 0,
        dmg: 0, life: 0.55, pierce: true,
      }));
      f.vy = -13;
      f.vx = dir * 9;
      g.shake(7);
      IB.Audio.sfx('land');
    } });

    // and down on top of them
    g.pending.push({ t: 0.72, fn: () => {
      f.vy = 26;
      f.vx = dir * 4;
    } });

    g.pending.push({ t: 0.95, fn: () => {
      g.blast(f.x, -60, 290, 145, 16, 'dive', f);
      g.fx.shockwave(f.x, -30, 340, '#E2703A');
      g.fx.shockwave(f.x, -30, 210, '#FFE9A8', true);
      g.fx.debris(f.x, -40, 14, ['#4A3A2C', '#6B5136'], 1);
      g.fx.dust(f.x, 0, 26);
      g.shake(24);
      g.hitstop(8);
      g.flash(0.26, '#E2703A');
      g.crowd.react('ko', f.x);
      IB.Audio.sfx('explode');
      f.diving = 0;
    } });
  };

  // Geese — the mic stand, swung out on the cable and back.
  SPEC.micstand = function (g, f) {
    const p = new Proj({
      kind: 'micstand', owner: f, color: '#C8B560', dir: f.face,
      x: f.x + f.face * 60, y: -118, w: 150, h: 60,
      vx: f.face * 12, vspin: 0.42, dmg: 30, hitstun: 11, push: 3,
      life: 1.5, pierce: true, repeat: 0.26,
    });
    g.projectiles.push(p);
    // it comes back
    g.pending.push({ t: 0.42, fn: () => { p.vx = -f.face * 11; } });
    IB.Audio.sfx('whoosh');
  };

  // Die Spitz — all four of them, at once, straight at you.
  SPEC.fourpiece = function (g, f) {
    g.projectiles.push(new Proj({
      kind: 'wall', owner: f, color: '#E0245E', dir: f.face,
      x: f.x + f.face * 92, y: -112, w: 190, h: 220,
      vx: f.face * 5.2, dmg: 30, hitstun: 10, push: 4,
      life: 1.7, pierce: true, repeat: 0.18,
    }));
    g.shake(10);
    g.crowd.react('special', f.x);
  };

  // Kevin Morby — the singing saw, bowed into a warble.
  SPEC.singingsaw = function (g, f) {
    g.projectiles.push(new Proj({
      kind: 'saw', owner: f, color: '#C9A227', dir: f.face,
      x: f.x + f.face * 80, y: -120, w: 60, h: 230,
      vx: f.face * 4.6, dmg: 92, hitstun: 26, push: 6, launch: 10,
      life: 2.6, pierce: true,
    }));
    IB.Audio.sfx('special', 'harmonica');
  };

  // La Luz — the breaker, over the top. Her other wave is low; this one isn't.
  SPEC.breaker = function (g, f) {
    g.projectiles.push(new Proj({
      kind: 'breaker', owner: f, color: '#2E8B8B', dir: f.face,
      x: f.x + f.face * 70, y: -300, w: 210, h: 160,
      vx: f.face * 7.4, vy: 2.4, dmg: 98, hitstun: 24, push: 8,
      lvl: 'overhead', life: 2.2, pierce: false,
    }));
  };

  // McKinley Dixon — the live band arrives and the horns go up around him.
  SPEC.theband = function (g, f) {
    g.projectiles.push(new Proj({
      kind: 'bandhorns', owner: f, color: '#E8B33C',
      x: f.x, y: -128, w: 380, h: 240, vx: 0,
      dmg: 34, hitstun: 12, push: 7, life: 0.9,
      pierce: true, repeat: 0.2, follow: true,
    }));
    g.pending.push({
      t: 0.5, fn: () => {
        g.blast(f.x, -120, 260, 70, 13, 'bars', f);
        g.fx.shockwave(f.x, -120, 300, '#E8B33C');
        g.shake(14);
      },
    });
    IB.Audio.sfx('special', 'bars');
  };

  Proj.prototype.draw = function (ctx, cam) {
    if (this.delay > 0) return;
    ctx.save();
    ctx.translate(this.x - cam.x, V.GROUND_Y + this.y);
    const fn = ART[this.kind] || ART.horn;
    fn(ctx, this);
    ctx.restore();
  };

  IB.Proj = Proj;
  IB.SPECIALS = SPEC;
  IB.PROJ_ART = ART;
})(window.IB);
