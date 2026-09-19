/* Iron Blossom — fighter rendering: instruments, costume layers, portraits. */
window.IB = window.IB || {};
(function (IB) {
  'use strict';
  const U = IB.U, Rig = IB.Rig;
  const INK = Rig.INK;

  const Art = {};

  /* ---------------------------------------------------------- instruments */

  function strings(ctx, x1, y1, x2, y2, n, spread, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.9;
    for (let i = 0; i < n; i++) {
      const o = (i / (n - 1) - 0.5) * spread;
      ctx.beginPath();
      ctx.moveTo(x1, y1 + o);
      ctx.lineTo(x2, y2 + o);
      ctx.stroke();
    }
  }

  const INSTRUMENT = {
    guitar: function (ctx, H, p) {
      const s = H * 0.0050;
      // body: offset double cutaway
      ctx.beginPath();
      ctx.ellipse(-8 * s, 0, 17 * s, 15 * s, 0, 0, U.TAU);
      ctx.ellipse(6 * s, 2 * s, 14 * s, 13 * s, 0, 0, U.TAU);
      ctx.fillStyle = p.body;
      ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
      // pickguard
      ctx.beginPath();
      ctx.ellipse(2 * s, 5 * s, 9 * s, 6 * s, -0.3, 0, U.TAU);
      ctx.fillStyle = U.shade(p.accent, -0.1);
      ctx.fill();
      // neck
      U.roundRect(ctx, 16 * s, -4 * s, 52 * s, 7 * s, 2 * s);
      ctx.fillStyle = p.neck; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
      // frets
      ctx.strokeStyle = U.rgba('#000000', 0.35); ctx.lineWidth = 1;
      for (let i = 1; i < 9; i++) {
        const x = 16 * s + (i / 9) * 52 * s;
        ctx.beginPath(); ctx.moveTo(x, -4 * s); ctx.lineTo(x, 3 * s); ctx.stroke();
      }
      strings(ctx, 16 * s, -0.5 * s, 66 * s, -0.5 * s, 4, 5 * s, U.rgba('#ffffff', 0.55));
      // headstock
      ctx.beginPath();
      ctx.moveTo(67 * s, -5 * s);
      ctx.lineTo(82 * s, -8 * s);
      ctx.lineTo(82 * s, 5 * s);
      ctx.lineTo(67 * s, 3 * s);
      ctx.closePath();
      ctx.fillStyle = U.shade(p.body, -0.2); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    },

    acoustic: function (ctx, H, p) {
      const s = H * 0.0052;
      ctx.beginPath();
      ctx.ellipse(-10 * s, 0, 15 * s, 17 * s, 0, 0, U.TAU);
      ctx.ellipse(8 * s, 0, 18 * s, 16 * s, 0, 0, U.TAU);
      ctx.fillStyle = p.body; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.beginPath();
      ctx.arc(4 * s, 0, 6.5 * s, 0, U.TAU);
      ctx.fillStyle = '#2A1B10'; ctx.fill();
      ctx.strokeStyle = p.accent; ctx.lineWidth = 1.6; ctx.stroke();
      U.roundRect(ctx, 24 * s, -3.5 * s, 46 * s, 6.5 * s, 2 * s);
      ctx.fillStyle = p.neck; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
      strings(ctx, 10 * s, 0, 68 * s, 0, 5, 5 * s, U.rgba('#ffffff', 0.5));
      ctx.beginPath();
      ctx.moveTo(69 * s, -6 * s); ctx.lineTo(82 * s, -7 * s);
      ctx.lineTo(82 * s, 5 * s); ctx.lineTo(69 * s, 4 * s);
      ctx.closePath();
      ctx.fillStyle = U.shade(p.neck, -0.2); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    },

    mic: function (ctx, H, p) {
      const s = H * 0.0062;
      // cable trailing back
      ctx.strokeStyle = '#181820'; ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, 6 * s);
      ctx.bezierCurveTo(-14 * s, 22 * s, -34 * s, 8 * s, -46 * s, 26 * s);
      ctx.stroke();
      U.roundRect(ctx, -2 * s, -3 * s, 20 * s, 6 * s, 2.5 * s);
      ctx.fillStyle = p.neck; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.beginPath();
      ctx.arc(20 * s, 0, 6.2 * s, 0, U.TAU);
      ctx.fillStyle = p.body; ctx.fill();
      ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = U.rgba('#ffffff', 0.3);
      ctx.beginPath(); ctx.arc(19 * s, -2 * s, 2.4 * s, 0, U.TAU); ctx.fill();
    },

    cowbell: function (ctx, H, p) {
      const s = H * 0.0065;
      ctx.beginPath();
      ctx.moveTo(0, -7 * s); ctx.lineTo(15 * s, -5 * s);
      ctx.lineTo(15 * s, 5 * s); ctx.lineTo(0, 8 * s);
      ctx.closePath();
      ctx.fillStyle = p.body; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = U.rgba('#ffffff', 0.25);
      ctx.fillRect(3 * s, -4 * s, 3 * s, 9 * s);
      U.roundRect(ctx, -22 * s, -2 * s, 22 * s, 3.4 * s, 1.5 * s);
      ctx.fillStyle = '#C8A876'; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
    },
  };

  Art.INSTRUMENT = INSTRUMENT;

  /* ---------------------------------------------------------- the fighter */

  // opts: { char, pose, face, x, y, scale, flash, alpha, ghost, noProp, armor }
  Art.drawFighter = function (ctx, o) {
    const c = o.char;
    const look = Object.assign({}, c.look, { face: o.face, H: c.look.height });
    look.headR = c.look.height * 0.082 * (c.look.bulk || 1);
    // an open mouth on the beat is what sells "this person is singing"
    if (o.sing > 0.5) {
      look.face2 = Object.assign({}, look.face2, { mouth: 'open' });
    }
    const sk = Rig.skeleton(o.pose, look);
    const H = look.H;
    const scale = o.scale || 1;

    ctx.save();
    ctx.translate(o.x, o.y);
    if (scale !== 1) ctx.scale(scale, scale);
    if (sk.rot) ctx.rotate(sk.rot * o.face);
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = H * 0.017;

    if (o.ghost) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.filter = 'blur(1px)';
    }

    // back limbs
    Rig.drawLeg(ctx, sk.legB, look, true);
    Rig.drawArm(ctx, sk.armB, look, true);
    Rig.drawHips(ctx, sk, look);

    // A raised knee belongs in front of the body; a planted leg tucks under the
    // shirt hem, which is what stops the thigh reading as a bolted-on stilt.
    const kneeUp = sk.legF.k.y < sk.pelvis.y - H * 0.02;
    if (!kneeUp) Rig.drawLeg(ctx, sk.legF, look, false);

    Rig.drawTorso(ctx, sk, look);

    // A mic is held, not worn: it goes in the front hand and points at the
    // mouth. Everything strapped on hangs at the hip instead.
    const handHeld = c.prop && (c.prop.kind === 'mic' || c.prop.kind === 'cowbell');
    if (!o.noProp && c.prop && INSTRUMENT[c.prop.kind] && handHeld) {
      const hd = sk.armF.h;
      const dx = (sk.head.x - hd.x) * o.face, dy = sk.head.y - hd.y + H * 0.04;
      ctx.save();
      ctx.translate(hd.x, hd.y);
      ctx.scale(o.face, 1);
      ctx.rotate(Math.atan2(dy, dx));
      INSTRUMENT[c.prop.kind](ctx, H, c.prop);
      ctx.restore();
    }
    if (!o.noProp && c.prop && INSTRUMENT[c.prop.kind] && !handHeld) {
      const anchorX = sk.pelvis.x + o.face * H * 0.055;
      const anchorY = sk.pelvis.y - H * 0.04;
      ctx.save();
      ctx.translate(anchorX, anchorY);
      ctx.scale(o.face, 1);
      ctx.rotate(-0.46 + sk.lean * 0.5 + (o.propAngle || 0));
      // strap
      if (c.prop.kind === 'guitar' || c.prop.kind === 'acoustic') {
        ctx.strokeStyle = U.shade(c.prop.accent, -0.4);
        ctx.lineWidth = H * 0.02;
        ctx.beginPath();
        ctx.moveTo(-H * 0.05, -H * 0.01);
        ctx.lineTo(H * 0.06, -H * 0.24);
        ctx.stroke();
      }
      INSTRUMENT[c.prop.kind](ctx, H, c.prop);
      ctx.restore();
    }

    if (kneeUp) Rig.drawLeg(ctx, sk.legF, look, false);
    Rig.drawHead(ctx, sk, look, Rig.HAIR[look.hairStyle]);
    Rig.drawArm(ctx, sk.armF, look, false);

    ctx.restore();

    // white-out flash on connect, drawn as a silhouette pass
    if (o.flash > 0) {
      ctx.save();
      ctx.translate(o.x, o.y);
      if (scale !== 1) ctx.scale(scale, scale);
      if (sk.rot) ctx.rotate(sk.rot * o.face);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = o.flash * 0.75;
      const flat = Object.assign({}, look, {
        skin: '#ffffff', top: '#ffffff', sleeve: '#ffffff', pants: '#ffffff',
        shoe: '#ffffff', hair: '#ffffff', vest: null, stripe: null,
      });
      Rig.drawLeg(ctx, sk.legB, flat, false);
      Rig.drawArm(ctx, sk.armB, flat, false);
      Rig.drawHips(ctx, sk, flat);
      Rig.drawTorso(ctx, sk, flat);
      Rig.drawLeg(ctx, sk.legF, flat, false);
      ctx.beginPath();
      ctx.arc(sk.head.x, sk.head.y, sk.head.r * 1.1, 0, U.TAU);
      ctx.fillStyle = '#ffffff'; ctx.fill();
      Rig.drawArm(ctx, sk.armF, flat, false);
      ctx.restore();
    }

    // armour shimmer while a super-armoured special is active
    if (o.armor) {
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, -H * 0.5, H * 0.1, 0, -H * 0.5, H * 0.65);
      g.addColorStop(0, U.rgba(c.ui[0], 0.0));
      g.addColorStop(0.7, U.rgba(c.ui[0], 0.18 * o.armor));
      g.addColorStop(1, U.rgba(c.ui[0], 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -H * 0.5, H * 0.65, 0, U.TAU);
      ctx.fill();
      ctx.restore();
    }
    return sk;
  };

  Art.groundShadow = function (ctx, x, y, w, alpha) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, w, w * 0.22, 0, 0, U.TAU);
    ctx.fillStyle = U.rgba('#000000', alpha);
    ctx.filter = 'blur(2px)';
    ctx.fill();
    ctx.restore();
  };

  /* ----------------------------------------------------------- portraits */

  // A head-and-shoulders bust for the select screen and the VS card.
  Art.portrait = function (ctx, c, x, y, size, t) {
    const look = Object.assign({}, c.look, { face: 1, H: size, height: size });
    look.headR = size * 0.082 * (look.bulk || 1);
    const H = size;
    const bob = Math.sin(t * 2) * size * 0.012;
    const pose = Rig.blend(Rig.POSES.idle, Rig.POSES.idle2, (Math.sin(t * 2) + 1) / 2);
    const sk = Rig.skeleton(pose, look);

    ctx.save();
    ctx.translate(x, y + H * 0.92 + bob);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = H * 0.017;
    Rig.drawLeg(ctx, sk.legB, look, true);
    Rig.drawArm(ctx, sk.armB, look, true);
    Rig.drawHips(ctx, sk, look);
    Rig.drawLeg(ctx, sk.legF, look, false);
    Rig.drawTorso(ctx, sk, look);
    if (c.prop && INSTRUMENT[c.prop.kind]) {
      ctx.save();
      if (c.prop.kind === 'mic' || c.prop.kind === 'cowbell') {
        const hd = sk.armF.h;
        ctx.translate(hd.x, hd.y);
        ctx.rotate(Math.atan2(sk.head.y - hd.y + H * 0.04, sk.head.x - hd.x));
      } else {
        ctx.translate(sk.pelvis.x + H * 0.055, sk.pelvis.y - H * 0.04);
        ctx.rotate(-0.46);
      }
      INSTRUMENT[c.prop.kind](ctx, H, c.prop);
      ctx.restore();
    }
    Rig.drawHead(ctx, sk, look, Rig.HAIR[look.hairStyle]);
    Rig.drawArm(ctx, sk.armF, look, false);
    ctx.restore();
  };

  // Roster-grid bust: head and shoulders, cropped by the cell.
  Art.icon = function (ctx, c, cx, box, t) {
    const H = box * 2.67;
    const look = Object.assign({}, c.look, { face: 1, H, height: H });
    look.headR = H * 0.082 * (look.bulk || 1);
    const pose = Rig.blend(Rig.POSES.idle, Rig.POSES.idle2, (Math.sin(t * 1.8 + cx) + 1) / 2);
    const sk = Rig.skeleton(pose, look);
    ctx.save();
    ctx.translate(cx, box * 0.42 + 0.885 * H);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = H * 0.015;
    Rig.drawArm(ctx, sk.armB, look, true);
    Rig.drawTorso(ctx, sk, look);
    Rig.drawHead(ctx, sk, look, Rig.HAIR[look.hairStyle]);
    Rig.drawArm(ctx, sk.armF, look, false);
    ctx.restore();
  };

  IB.Art = Art;
})(window.IB);
