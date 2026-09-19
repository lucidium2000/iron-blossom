/* Iron Blossom — particles, impact effects and stage weather. */
window.IB = window.IB || {};
(function (IB) {
  'use strict';
  const U = IB.U;
  const V = IB.VIEW;

  function FX() {
    this.p = [];        // world-space particles
    this.rings = [];
    this.sparks = [];
    this.texts = [];
    this.weather = [];
    this.trails = [];
  }

  const MAX = 700;

  FX.prototype.add = function (o) {
    if (this.p.length > MAX) this.p.shift();
    this.p.push(o);
  };

  /* ------------------------------------------------------------- emitters */

  FX.prototype.debris = function (x, y, n, colors, scale) {
    for (let i = 0; i < n; i++) {
      this.add({
        k: 'chunk', x, y,
        vx: U.rand(-7, 7), vy: U.rand(-11, -2),
        w: U.rand(4, 13) * (scale || 1), h: U.rand(4, 11) * (scale || 1),
        rot: U.rand(0, U.TAU), vrot: U.rand(-0.3, 0.3),
        c: U.pick(colors), life: U.rand(0.7, 1.7), t: 0, g: 0.55,
      });
    }
  };

  FX.prototype.dust = function (x, y, n) {
    for (let i = 0; i < n; i++) {
      this.add({
        k: 'puff', x: x + U.rand(-16, 16), y: y - U.rand(0, 8),
        vx: U.rand(-3.2, 3.2), vy: U.rand(-2.4, -0.4),
        r: U.rand(7, 18), c: '#D9CDBB', life: U.rand(0.35, 0.8), t: 0, g: 0.04,
      });
    }
  };

  // NB: the particle array is `this.sparks`, so the emitter cannot share that
  // name — an instance property shadows the prototype method and every call
  // throws "not a function".
  FX.prototype.sparkBurst = function (x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = U.rand(0, U.TAU), sp = U.rand(4, 14);
      this.sparks.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3,
        life: U.rand(0.25, 0.6), t: 0, c: U.pick(['#FFE9A8', '#FFB03C', '#FF7A2A']),
      });
    }
  };

  FX.prototype.petals = function (x, y, n) {
    for (let i = 0; i < n; i++) {
      this.add({
        k: 'petal', x, y, vx: U.rand(-4, 4), vy: U.rand(-7, -1),
        r: U.rand(4, 8), rot: U.rand(0, U.TAU), vrot: U.rand(-0.14, 0.14),
        c: U.pick(['#F7DCE4', '#EFC2D0', '#FFF0F4']), life: U.rand(1.4, 2.8), t: 0, g: 0.12,
        sway: U.rand(0.5, 2),
      });
    }
  };

  FX.prototype.splash = function (x, y, color, n) {
    for (let i = 0; i < n; i++) {
      this.add({
        k: 'drop', x, y, vx: U.rand(-6, 6), vy: U.rand(-10, -2),
        r: U.rand(2.5, 6), c: color, life: U.rand(0.5, 1.1), t: 0, g: 0.6,
      });
    }
  };

  FX.prototype.geyser = function (x, y) {
    for (let i = 0; i < 44; i++) {
      this.add({
        k: 'drop', x: x + U.rand(-12, 12), y,
        vx: U.rand(-4, 4), vy: U.rand(-22, -11),
        r: U.rand(4, 11), c: U.pick(['#F7EFD8', '#E8DCB8', '#FFFFFF']),
        life: U.rand(0.7, 1.5), t: 0, g: 0.5,
      });
    }
  };

  FX.prototype.shockwave = function (x, y, r, color, thin) {
    this.rings.push({ x, y, r: 12, max: r, c: color, t: 0, life: 0.45, thin: !!thin });
  };

  FX.prototype.hitSpark = function (x, y, power, color) {
    this.rings.push({ x, y, r: 6, max: 40 + power * 70, c: color || '#FFF2C4', t: 0, life: 0.2, thin: true });
    for (let i = 0; i < 5 + power * 10; i++) {
      const a = U.rand(0, U.TAU), sp = U.rand(5, 9 + power * 14);
      this.sparks.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: U.rand(0.14, 0.34), t: 0,
        c: color || U.pick(['#FFFFFF', '#FFE9A8', '#FFC060']),
      });
    }
    this.add({
      k: 'star', x, y, vx: 0, vy: 0, r: 22 + power * 46,
      c: color || '#FFF6D8', life: 0.16, t: 0, g: 0, rot: U.rand(0, U.TAU),
    });
  };

  FX.prototype.text = function (x, y, str, color, size) {
    this.texts.push({ x, y, str, c: color || '#FFF0C0', t: 0, life: 0.9, size: size || 30 });
  };

  FX.prototype.trail = function (x, y, color, r) {
    if (this.trails.length > 120) this.trails.shift();
    this.trails.push({ x, y, c: color, r, t: 0, life: 0.3 });
  };

  /* ------------------------------------------------------------- weather */

  FX.prototype.initWeather = function (kind) {
    this.weatherKind = kind;
    this.weather.length = 0;
    const n = kind === 'mist' ? 26 : kind === 'moths' ? 22 : 64;
    for (let i = 0; i < n; i++) this.weather.push(this.makeWeather(kind, true));
  };

  FX.prototype.makeWeather = function (kind, seed) {
    const x = U.rand(-200, V.WORLD_W + 200);
    const y = seed ? U.rand(-V.H, 60) : -U.rand(40, 260);
    switch (kind) {
      case 'petals':
        return { x, y, vx: U.rand(-0.7, 1.6), vy: U.rand(0.5, 1.5), r: U.rand(4, 9),
          rot: U.rand(0, U.TAU), vrot: U.rand(-0.06, 0.06), sway: U.rand(0.6, 1.8),
          ph: U.rand(0, U.TAU), c: U.pick(['#F7DCE4', '#EFC2D0', '#FFF0F4', '#F2C4CE']) };
      case 'embers':
        return { x, y: seed ? U.rand(-V.H, V.H * 0.6) : U.rand(V.H * 0.3, V.H * 0.6),
          vx: U.rand(-0.5, 0.9), vy: U.rand(-1.5, -0.4), r: U.rand(1.6, 4),
          ph: U.rand(0, U.TAU), sway: U.rand(0.8, 2.4),
          c: U.pick(['#FF8A3C', '#FFC060', '#FF5A2A']), glow: true };
      case 'confetti':
        return { x, y, vx: U.rand(-1.6, 1.6), vy: U.rand(1.2, 2.8), r: U.rand(4, 9),
          rot: U.rand(0, U.TAU), vrot: U.rand(-0.24, 0.24), sway: U.rand(1, 2.6),
          ph: U.rand(0, U.TAU), rect: true,
          c: U.pick(['#E8B33C', '#C2412F', '#3CC8FF', '#F2F2EF', '#7B4BC4', '#2ED8C3']) };
      case 'mist':
        return { x, y: U.rand(V.H * 0.45, V.H * 0.78), vx: U.rand(0.15, 0.6), vy: 0,
          r: U.rand(60, 170), ph: U.rand(0, U.TAU), sway: U.rand(0.2, 0.6),
          c: '#DCEEF2', soft: true };
      case 'moths':
        return { x, y: U.rand(V.H * 0.15, V.H * 0.6), vx: U.rand(-1, 1), vy: U.rand(-0.6, 0.6),
          r: U.rand(2.4, 5), ph: U.rand(0, U.TAU), sway: U.rand(3, 7), c: '#F0E4C8', flutter: true };
      default:
        return { x, y, vx: 0, vy: 1, r: 3, c: '#fff', ph: 0, sway: 1 };
    }
  };

  /* -------------------------------------------------------------- update */

  FX.prototype.update = function (dt) {
    const step = dt * 60;

    for (let i = this.p.length - 1; i >= 0; i--) {
      const o = this.p[i];
      o.t += dt;
      if (o.t >= o.life) { this.p.splice(i, 1); continue; }
      o.vy += (o.g || 0) * step;
      o.x += o.vx * step;
      o.y += o.vy * step;
      if (o.vrot) o.rot += o.vrot * step;
      if (o.k === 'petal') o.x += Math.sin(o.t * o.sway * 4) * 0.7 * step;
      if (o.k === 'puff') { o.r += 0.5 * step; o.vx *= 0.94; }
      if (o.y > 0 && (o.k === 'chunk' || o.k === 'drop')) {
        o.y = 0; o.vy *= -0.32; o.vx *= 0.7;
        if (Math.abs(o.vy) < 0.6) { o.vy = 0; o.g = 0; o.vx = 0; o.vrot = 0; }
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.t += dt;
      if (s.t >= s.life) { this.sparks.splice(i, 1); continue; }
      s.vy += 0.4 * step;
      s.x += s.vx * step;
      s.y += s.vy * step;
      s.vx *= 0.93;
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.t += dt;
      if (r.t >= r.life) { this.rings.splice(i, 1); continue; }
      r.r = U.lerp(12, r.max, U.easeOut(r.t / r.life));
    }

    for (let i = this.texts.length - 1; i >= 0; i--) {
      const x = this.texts[i];
      x.t += dt;
      x.y -= 42 * dt;
      if (x.t >= x.life) this.texts.splice(i, 1);
    }

    for (let i = this.trails.length - 1; i >= 0; i--) {
      this.trails[i].t += dt;
      if (this.trails[i].t >= this.trails[i].life) this.trails.splice(i, 1);
    }

    const kind = this.weatherKind;
    for (let i = 0; i < this.weather.length; i++) {
      const w = this.weather[i];
      w.ph += dt * w.sway;
      w.x += (w.vx + (w.flutter ? Math.sin(w.ph * 3) * 1.4 : Math.sin(w.ph) * 0.5)) * step;
      w.y += (w.vy + (w.flutter ? Math.cos(w.ph * 2.3) * 0.9 : 0)) * step;
      if (w.rot !== undefined) w.rot += w.vrot * step;
      const off = w.y > V.H + 120 || w.y < -V.H - 220 || w.x > V.WORLD_W + 400 || w.x < -400;
      if (off) this.weather[i] = this.makeWeather(kind, false);
    }
  };

  /* --------------------------------------------------------------- draw */

  // Weather that belongs behind the fighters (mist, distant petals).
  FX.prototype.drawWeatherBack = function (ctx, cam) {
    const kind = this.weatherKind;
    if (kind === 'mist') {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      this.weather.forEach((w) => {
        const x = w.x - cam.x * 0.5;
        if (x < -220 || x > V.W + 220) return;
        const g = ctx.createRadialGradient(x, w.y, 0, x, w.y, w.r);
        g.addColorStop(0, U.rgba(w.c, 0.1));
        g.addColorStop(1, U.rgba(w.c, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, w.y, w.r, 0, U.TAU); ctx.fill();
      });
      ctx.restore();
    }
  };

  FX.prototype.drawWeatherFront = function (ctx, cam) {
    const kind = this.weatherKind;
    if (kind === 'mist') return;
    ctx.save();
    if (kind === 'embers' || kind === 'moths') ctx.globalCompositeOperation = 'lighter';
    this.weather.forEach((w) => {
      const x = w.x - cam.x * 0.85;
      if (x < -60 || x > V.W + 60) return;
      if (w.glow) {
        const g = ctx.createRadialGradient(x, w.y, 0, x, w.y, w.r * 5);
        g.addColorStop(0, U.rgba(w.c, 0.85));
        g.addColorStop(1, U.rgba(w.c, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, w.y, w.r * 5, 0, U.TAU); ctx.fill();
      } else if (w.rect) {
        ctx.save();
        ctx.translate(x, w.y);
        ctx.rotate(w.rot);
        ctx.fillStyle = w.c;
        ctx.fillRect(-w.r / 2, -w.r * 0.35, w.r, w.r * 0.7);
        ctx.restore();
      } else if (w.flutter) {
        ctx.fillStyle = U.rgba(w.c, 0.8);
        const s = Math.abs(Math.sin(w.ph * 8)) * w.r;
        ctx.beginPath(); ctx.ellipse(x, w.y, w.r, s + 1, 0, 0, U.TAU); ctx.fill();
      } else {
        ctx.save();
        ctx.translate(x, w.y);
        ctx.rotate(w.rot || 0);
        ctx.fillStyle = w.c;
        ctx.beginPath();
        ctx.ellipse(0, 0, w.r, w.r * 0.62, 0, 0, U.TAU);
        ctx.fill();
        ctx.restore();
      }
    });
    ctx.restore();
  };

  FX.prototype.draw = function (ctx, cam) {
    const gy = V.GROUND_Y;

    // motion trails first, they sit under everything
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.trails.length; i++) {
      const t = this.trails[i];
      const a = 1 - t.t / t.life;
      ctx.fillStyle = U.rgba(t.c, a * 0.3);
      ctx.beginPath();
      ctx.arc(t.x - cam.x, gy + t.y, t.r * a, 0, U.TAU);
      ctx.fill();
    }
    ctx.restore();

    for (let i = 0; i < this.p.length; i++) {
      const o = this.p[i];
      const a = 1 - o.t / o.life;
      const x = o.x - cam.x, y = gy + o.y;
      switch (o.k) {
        case 'chunk':
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(o.rot);
          ctx.fillStyle = o.c;
          ctx.globalAlpha = U.clamp(a * 1.6, 0, 1);
          ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
          ctx.strokeStyle = U.rgba('#000', 0.4);
          ctx.lineWidth = 1.2;
          ctx.strokeRect(-o.w / 2, -o.h / 2, o.w, o.h);
          ctx.restore();
          break;
        case 'puff':
          ctx.fillStyle = U.rgba(o.c, a * 0.34);
          ctx.beginPath(); ctx.arc(x, y, o.r, 0, U.TAU); ctx.fill();
          break;
        case 'drop':
          ctx.fillStyle = U.rgba(o.c, U.clamp(a * 1.4, 0, 1));
          ctx.beginPath(); ctx.arc(x, y, o.r * (0.5 + a * 0.5), 0, U.TAU); ctx.fill();
          break;
        case 'petal':
          ctx.save();
          ctx.translate(x, y); ctx.rotate(o.rot);
          ctx.globalAlpha = U.clamp(a * 1.5, 0, 1);
          ctx.fillStyle = o.c;
          ctx.beginPath(); ctx.ellipse(0, 0, o.r, o.r * 0.6, 0, 0, U.TAU); ctx.fill();
          ctx.restore();
          break;
        case 'star': {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(o.rot);
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = U.rgba(o.c, a);
          const R = o.r * (0.5 + a * 0.6);
          ctx.beginPath();
          for (let k = 0; k < 8; k++) {
            const ang = (k / 8) * U.TAU;
            const rr = k % 2 ? R * 0.34 : R;
            ctx[k ? 'lineTo' : 'moveTo'](Math.cos(ang) * rr, Math.sin(ang) * rr);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;
        }
      }
    }
    ctx.globalAlpha = 1;

    // sparks
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i];
      const a = 1 - s.t / s.life;
      ctx.strokeStyle = U.rgba(s.c, a);
      ctx.beginPath();
      ctx.moveTo(s.x - cam.x, gy + s.y);
      ctx.lineTo(s.x - cam.x - s.vx * 1.6, gy + s.y - s.vy * 1.6);
      ctx.stroke();
    }
    ctx.restore();

    // rings
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      const a = 1 - r.t / r.life;
      ctx.strokeStyle = U.rgba(r.c, a * (r.thin ? 0.85 : 0.6));
      ctx.lineWidth = r.thin ? 3 + a * 5 : 6 + a * 18;
      ctx.beginPath();
      ctx.ellipse(r.x - cam.x, gy + r.y, r.r, r.r * 0.72, 0, 0, U.TAU);
      ctx.stroke();
    }
    ctx.restore();
  };

  FX.prototype.drawTexts = function (ctx, cam) {
    ctx.save();
    ctx.textAlign = 'center';
    for (let i = 0; i < this.texts.length; i++) {
      const x = this.texts[i];
      const a = 1 - Math.pow(x.t / x.life, 2.2);
      const pop = x.t < 0.1 ? 1 + (0.1 - x.t) * 4 : 1;
      ctx.save();
      ctx.translate(x.x - cam.x, V.GROUND_Y + x.y);
      ctx.scale(pop, pop);
      ctx.font = '800 ' + x.size + 'px "Barlow Condensed", "Arial Narrow", sans-serif';
      ctx.lineWidth = 5;
      ctx.strokeStyle = U.rgba('#15121A', a);
      ctx.strokeText(x.str, 0, 0);
      ctx.fillStyle = U.rgba(x.c, a);
      ctx.fillText(x.str, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  };

  IB.FX = FX;
})(window.IB);
