/* Iron Blossom — fighter skeleton, pose library and renderer.
   Poses are authored in degrees where 0 points straight down and positive
   rotates toward the direction the fighter is facing. Everything is blended,
   so a move only needs a start/hit/end pose to read cleanly. */
window.IB = window.IB || {};
(function (IB) {
  'use strict';
  const U = IB.U;
  const D = U.DEG;

  const FIELDS = ['lean', 'head', 'shF', 'elF', 'shB', 'elB', 'hipF', 'knF',
    'hipB', 'knB', 'rootX', 'rootY', 'rot', 'sq'];

  const BASE = { lean: 0, head: 0, shF: 0, elF: 0, shB: 0, elB: 0, hipF: 0,
    knF: 0, hipB: 0, knB: 0, rootX: 0, rootY: 0, rot: 0, sq: 0 };

  function P(o) {
    const p = Object.assign({}, BASE, o);
    for (const k of FIELDS) if (k !== 'rootX' && k !== 'rootY' && k !== 'sq') p[k] *= D;
    return p;
  }

  const POSES = {
    idle:     P({ lean: 6, shF: 20, elF: 30, shB: -14, elB: 28, hipF: 8, knF: 8, hipB: -10, knB: 12 }),
    idle2:    P({ lean: 9, shF: 25, elF: 26, shB: -10, elB: 24, hipF: 6, knF: 10, hipB: -8, knB: 14, rootY: -3 }),
    idle3:    P({ lean: 4, shF: 17, elF: 33, shB: -17, elB: 31, hipF: 9, knF: 7, hipB: -11, knB: 11, rootY: 1 }),

    walkA:    P({ lean: 10, hipF: 32, knF: 10, hipB: -30, knB: 38, shF: -22, elF: 26, shB: 24, elB: 26, rootY: -3 }),
    walkB:    P({ lean: 10, hipF: -30, knF: 38, hipB: 32, knB: 10, shF: 24, elF: 26, shB: -22, elB: 26, rootY: -3 }),
    walkC:    P({ lean: 8, hipF: 4, knF: 22, hipB: -2, knB: 24, shF: 2, elF: 28, shB: 0, elB: 28, rootY: 2 }),

    dashA:    P({ lean: 22, hipF: 48, knF: 4, hipB: -42, knB: 52, shF: -44, elF: 30, shB: 40, elB: 28, rootY: -2 }),
    dashB:    P({ lean: 24, hipF: -38, knF: 56, hipB: 50, knB: 6, shF: 44, elF: 28, shB: -42, elB: 30, rootY: -4 }),

    crouch:   P({ rootY: 38, lean: 18, shF: 40, elF: 60, shB: 22, elB: 66, hipF: 62, knF: -88, hipB: -56, knB: -86 }),
    block:    P({ lean: -6, shF: 76, elF: -98, shB: 62, elB: -92, hipF: 20, knF: 16, hipB: -18, knB: 20, rootY: 4 }),
    blockLow: P({ rootY: 34, lean: 6, shF: 62, elF: -84, shB: 52, elB: -82, hipF: 56, knF: -82, hipB: -52, knB: -82 }),

    jump:     P({ rootY: -12, lean: 8, hipF: 56, knF: -72, hipB: 22, knB: -62, shF: -62, elF: 22, shB: -52, elB: 22 }),
    rise:     P({ rootY: -6, lean: 4, hipF: 40, knF: -50, hipB: 6, knB: -46, shF: -86, elF: 26, shB: -76, elB: 26 }),
    fall:     P({ lean: -6, hipF: 30, knF: -28, hipB: -22, knB: -42, shF: -104, elF: 32, shB: -92, elB: 32 }),
    land:     P({ rootY: 30, lean: 16, hipF: 48, knF: -68, hipB: -42, knB: -66, shF: -30, elF: 44, shB: -24, elB: 42 }),

    hurtHi:   P({ lean: -24, head: -20, shF: -42, elF: 52, shB: -58, elB: 56, hipF: -10, knF: 26, hipB: 16, knB: 22 }),
    hurtMid:  P({ lean: 22, head: 14, shF: 34, elF: 62, shB: 24, elB: 62, hipF: 26, knF: 14, hipB: -22, knB: 32 }),
    hurtLo:   P({ rootY: 16, lean: 26, head: 16, shF: 26, elF: 58, shB: 18, elB: 58, hipF: 40, knF: -30, hipB: -30, knB: -20 }),
    launch:   P({ lean: -38, hipF: -32, knF: 22, hipB: -52, knB: 32, shF: -124, elF: 22, shB: -112, elB: 22, rot: -16 }),
    tumble:   P({ lean: -20, hipF: 20, knF: -60, hipB: -30, knB: -70, shF: -140, elF: 40, shB: -120, elB: 40, rot: -40 }),
    down:     P({ rot: -80, rootY: 58, hipF: -22, knF: 32, hipB: -34, knB: 44, shF: -72, elF: 32, shB: -62, elB: 26 }),
    getUp:    P({ rot: -30, rootY: 40, lean: 24, hipF: 66, knF: -86, hipB: -46, knB: -70, shF: 20, elF: 60, shB: 10, elB: 62 }),

    jabS:     P({ lean: 6, shF: 36, elF: -82, shB: -22, elB: 42, hipF: 16, knF: 10, hipB: -16, knB: 16 }),
    jabH:     P({ lean: 14, shF: 92, elF: 0, shB: -46, elB: 36, hipF: 24, knF: 6, hipB: -24, knB: 12, rootX: 7 }),
    hookS:    P({ lean: -12, shF: -36, elF: -72, shB: 32, elB: 42, hipF: -10, knF: 22, hipB: 26, knB: 16 }),
    hookH:    P({ lean: 18, shF: 102, elF: -26, shB: -56, elB: 52, hipF: 32, knF: 4, hipB: -30, knB: 18, rootX: 11 }),
    upperS:   P({ rootY: 24, lean: 22, shF: -12, elF: -104, shB: 12, elB: 62, hipF: 42, knF: -58, hipB: -36, knB: -58 }),
    upperH:   P({ rootY: -10, lean: -20, shF: 142, elF: -32, shB: -42, elB: 42, hipF: 10, knF: 6, hipB: -14, knB: 8 }),

    kickS:    P({ lean: -14, hipF: 42, knF: -92, hipB: -12, knB: 18, shF: -32, elF: 46, shB: 26, elB: 42 }),
    kickH:    P({ lean: -26, hipF: 98, knF: -8, hipB: -24, knB: 12, shF: -62, elF: 36, shB: 52, elB: 36, rootX: 9 }),
    lowKickH: P({ rootY: 20, lean: 12, hipF: 86, knF: 12, hipB: -32, knB: -52, shF: -22, elF: 52, shB: 42, elB: 46 }),
    airKickH: P({ lean: -16, hipF: 78, knF: -12, hipB: -26, knB: -50, shF: -90, elF: 30, shB: -70, elB: 30 }),

    swingS:   P({ lean: -20, shF: -134, elF: -32, shB: -124, elB: -30, hipF: -12, knF: 24, hipB: 22, knB: 16 }),
    swingH:   P({ lean: 32, shF: 72, elF: 12, shB: 62, elB: 16, hipF: 34, knF: 4, hipB: -28, knB: 20, rootX: 13 }),

    holdS:    P({ lean: -14, shF: -112, elF: -62, shB: -102, elB: -60, hipF: 10, knF: 18, hipB: -12, knB: 20 }),
    holdRel:  P({ lean: 24, shF: 82, elF: 10, shB: 72, elB: 16, hipF: 30, knF: 6, hipB: -26, knB: 18, rootX: 9 }),
    carry:    P({ lean: -8, shF: -70, elF: -78, shB: -62, elB: -74, hipF: 8, knF: 12, hipB: -10, knB: 16 }),

    grabS:    P({ lean: 12, shF: 72, elF: -32, shB: 58, elB: -26, hipF: 18, knF: 12, hipB: -18, knB: 16 }),
    grabH:    P({ lean: 8, shF: 66, elF: -22, shB: 54, elB: -18, hipF: 14, knF: 14, hipB: -14, knB: 18 }),

    spWind:   P({ rootY: 18, lean: -24, shF: -62, elF: -84, shB: -52, elB: -74, hipF: 26, knF: -38, hipB: -26, knB: -42 }),
    spRel:    P({ rootY: -8, lean: 28, shF: 86, elF: -12, shB: 76, elB: -6, hipF: 36, knF: 2, hipB: -32, knB: 16, rootX: 11 }),
    spHold:   P({ lean: -10, shF: -96, elF: -50, shB: -88, elB: -46, hipF: 4, knF: 16, hipB: -6, knB: 18, rootY: -4 }),

    playA:    P({ lean: 10, shF: 62, elF: -78, shB: -34, elB: 62, hipF: 14, knF: 12, hipB: -16, knB: 18, rootY: -2 }),
    playB:    P({ lean: 16, shF: 84, elF: -58, shB: -22, elB: 50, hipF: 20, knF: 6, hipB: -22, knB: 14, rootY: 3 }),
    playC:    P({ lean: -6, shF: 40, elF: -96, shB: -46, elB: 70, hipF: 8, knF: 18, hipB: -10, knB: 22, rootY: -6 }),
    // Mic to the mouth: elbow forward and out, forearm folded back up so the
    // hand sits just below and in front of the chin. A and B differ by how far
    // the mic is pulled in, which reads as phrasing on the beat.
    singA:    P({ lean: 4, shF: 72, elF: 146, shB: 34, elB: 46, head: -10, hipF: 10, knF: 14, hipB: -12, knB: 16 }),
    singB:    P({ lean: -2, shF: 84, elF: 132, shB: 46, elB: 38, head: -16, hipF: 14, knF: 10, hipB: -16, knB: 14, rootY: -5 }),

    showSway:   P({ lean: 6, rootX: 11, head: -8, shF: -112, elF: -48, shB: 42, elB: 44, hipF: -16, knF: 28, hipB: 20, knB: 10 }),
    showSway2:  P({ lean: 6, rootX: -11, head: 7, shF: -120, elF: -42, shB: 32, elB: 50, hipF: 18, knF: 10, hipB: -16, knB: 28 }),
    showMicOut: P({ lean: 22, head: -12, shF: 106, elF: -10, shB: -52, elB: 56, hipF: 28, knF: 8, hipB: -30, knB: 16 }),
    showGroove: P({ rootY: 26, lean: 20, shF: -98, elF: -54, shB: 48, elB: 50, hipF: 46, knF: -50, hipB: -42, knB: -46 }),
    showStrutA: P({ lean: 12, rootX: 5, hipF: 36, knF: 8, hipB: -34, knB: 42, shF: -106, elF: -50, shB: 32, elB: 40 }),
    showStrutB: P({ lean: 12, rootX: -5, hipF: -34, knF: 42, hipB: 36, knB: 8, shF: -102, elF: -54, shB: 38, elB: 36 }),
    showShoulder: P({ lean: -4, rootX: 6, head: -16, shF: -126, elF: -34, shB: 64, elB: 30, hipF: -10, knF: 22, hipB: 14, knB: 14 }),

    showPoint: P({ lean: 14, head: -6, shF: 92, elF: -6, shB: -46, elB: 54, hipF: 22, knF: 8, hipB: -24, knB: 16 }),
    showBang:  P({ lean: 36, head: 44, shF: -52, elF: 66, shB: -44, elB: 64, hipF: 18, knF: 14, hipB: -20, knB: 22, rootY: 6 }),
    showHop:   P({ rootY: -54, lean: 6, hipF: 60, knF: -86, hipB: 50, knB: -82, shF: -148, elF: -12, shB: -142, elB: -14 }),
    showKick:  P({ lean: -26, rootY: -6, hipF: 114, knF: -6, hipB: -26, knB: 14, shF: -78, elF: 30, shB: 62, elB: 34 }),
    showLow:   P({ rootY: 32, lean: 26, shF: 58, elF: -70, shB: -28, elB: 60, hipF: 56, knF: -60, hipB: -48, knB: -54 }),
    showSpin:  P({ lean: 12, shF: -44, elF: -58, shB: 118, elB: -42, hipF: 32, knF: -22, hipB: -36, knB: 28 }),
    showHorns: P({ lean: -10, head: -14, shF: -158, elF: -6, shB: 34, elB: 46, hipF: 10, knF: 12, hipB: -12, knB: 16, rootY: -8 }),

    taunt:    P({ lean: -10, head: -12, shF: -152, elF: -22, shB: 32, elB: 44, hipF: 6, knF: 14, hipB: -8, knB: 16 }),
    win:      P({ lean: -8, shF: -162, elF: -12, shB: -152, elB: -10, hipF: 6, knF: 12, hipB: -8, knB: 14, rootY: -5 }),
    lose:     P({ rootY: 46, lean: 40, head: 26, shF: 40, elF: 70, shB: 30, elB: 72, hipF: 70, knF: -96, hipB: -60, knB: -92 }),
  };

  function blend(a, b, t) {
    const out = {};
    for (let i = 0; i < FIELDS.length; i++) {
      const k = FIELDS[i];
      out[k] = a[k] + (b[k] - a[k]) * t;
    }
    return out;
  }

  // Mix any number of poses at once — used to lay a hit reaction over a stance.
  function mixMany(list) {
    const out = Object.assign({}, BASE);
    let total = 0;
    for (const [p, w] of list) total += w;
    if (total <= 0) return out;
    for (const [p, w] of list) {
      const s = w / total;
      for (let i = 0; i < FIELDS.length; i++) out[FIELDS[i]] += p[FIELDS[i]] * s;
    }
    return out;
  }

  /* ------------------------------------------------------------- skeleton */

  // Returns joint positions in local space (origin at the feet, y negative up),
  // already flipped for `face`.
  function skeleton(pose, look) {
    const H = look.H || look.height || 168;
    const f = look.face;
    const bulk = look.bulk || 1;

    const sq = 1 + (pose.sq || 0);
    const ry = pose.rootY * (look.scaleY || 1);
    const rx = pose.rootX * f;

    const pelvis = { x: rx, y: -H * 0.45 * sq + ry };

    // Torso lean rotates chest/neck/head about the pelvis.
    const lean = pose.lean;
    const torsoLen = H * 0.29 * sq;
    const chest = {
      x: pelvis.x + Math.sin(lean) * f * torsoLen * 0.0 + Math.sin(-lean) * f * torsoLen,
      y: pelvis.y - Math.cos(lean) * torsoLen,
    };
    const neckLen = H * 0.05 * sq;
    const neck = {
      x: chest.x + Math.sin(-lean) * f * neckLen,
      y: chest.y - Math.cos(lean) * neckLen,
    };
    const headLen = H * 0.078 * sq;
    const ha = lean + pose.head;
    const head = {
      x: neck.x + Math.sin(-ha) * f * headLen,
      y: neck.y - Math.cos(ha) * headLen,
      r: H * 0.097 * bulk,
      a: ha,
    };

    const ua = H * 0.175, fa = H * 0.155;
    // thigh + shin stop short of the floor; the foot fills the last stretch
    const th = H * 0.215, sh = H * 0.195;
    const shoulderDrop = H * 0.018;

    function arm(shAng, elAng, off) {
      const s = {
        x: chest.x + Math.sin(-lean + Math.PI / 2) * f * off - Math.sin(-lean) * f * shoulderDrop,
        y: chest.y - Math.cos(lean + Math.PI / 2) * off + Math.cos(lean) * shoulderDrop * 0,
      };
      // simpler and stable: shoulders sit just under the chest node
      s.x = chest.x + off * f * 0.35;
      s.y = chest.y + shoulderDrop;
      const a1 = shAng + lean;
      const e = { x: s.x + Math.sin(a1) * f * ua, y: s.y + Math.cos(a1) * ua };
      const a2 = a1 + elAng;
      const h = { x: e.x + Math.sin(a2) * f * fa, y: e.y + Math.cos(a2) * fa };
      return { s, e, h, a1, a2 };
    }

    function leg(hipAng, knAng, off) {
      const s = { x: pelvis.x + off * f, y: pelvis.y };
      const a1 = hipAng;
      const k = { x: s.x + Math.sin(a1) * f * th, y: s.y + Math.cos(a1) * th };
      const a2 = a1 + knAng;
      const ft = { x: k.x + Math.sin(a2) * f * sh, y: k.y + Math.cos(a2) * sh };
      return { s, k, f: ft, a1, a2 };
    }

    return {
      H, f, pelvis, chest, neck, head,
      armF: arm(pose.shF, pose.elF, H * 0.055),
      armB: arm(pose.shB, pose.elB, -H * 0.03),
      // wider hip separation so the legs read as a pelvis, not one pivot
      legF: leg(pose.hipF, pose.knF, H * 0.054),
      legB: leg(pose.hipB, pose.knB, -H * 0.054),
      rot: pose.rot,
      lean,
    };
  }

  /* -------------------------------------------------------------- drawing */

  const INK = '#15121a';

  // A limb is a chain of tapered segments drawn as a union: one ink silhouette
  // underneath, then the fills on top. Stroking each segment separately would
  // leave a line across every joint, which is what makes a figure read as
  // bolted-together tubes.
  // segs: [{x1,y1,x2,y2,r1,r2,c}]
  function chain(ctx, segs, back, ink) {
    const lw = segs[0].r1 * 0.30;
    ctx.fillStyle = back ? U.mix(segs[0].c, '#0A0810', 0.55) : (ink || INK);
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      U.capsule(ctx, s.x1, s.y1, s.x2, s.y2, s.r1 + lw, s.r2 + lw);
      ctx.fill();
    }
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      U.capsule(ctx, s.x1, s.y1, s.x2, s.y2, s.r1, s.r2);
      ctx.fillStyle = s.c;
      ctx.fill();
    }
    // one offset highlight pass per segment reads as a top-left key light
    ctx.fillStyle = U.rgba('#ffffff', back ? 0.035 : 0.10);
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      U.capsule(ctx, s.x1 - s.r1 * 0.3, s.y1 - s.r1 * 0.34,
        s.x2 - s.r2 * 0.3, s.y2 - s.r2 * 0.34, s.r1 * 0.40, s.r2 * 0.40);
      ctx.fill();
    }
  }

  function limb(ctx, x1, y1, x2, y2, r1, r2, color, back) {
    chain(ctx, [{ x1, y1, x2, y2, r1, r2, c: color }], back);
  }

  function drawArm(ctx, a, look, back) {
    const H = look.H;
    const sleeve = back ? U.shade(look.sleeve, -0.3) : U.garment(look.sleeve);
    const skin = back ? U.shade(look.skin, -0.3) : look.skin;
    const fore = look.sleeveLong ? sleeve : skin;
    chain(ctx, [
      { x1: a.s.x, y1: a.s.y, x2: a.e.x, y2: a.e.y, r1: H * 0.042, r2: H * 0.032, c: sleeve },
      { x1: a.e.x, y1: a.e.y, x2: a.h.x, y2: a.h.y, r1: H * 0.033, r2: H * 0.022, c: fore },
    ], back);
    ctx.beginPath();
    ctx.arc(a.h.x, a.h.y, H * 0.028, 0, U.TAU);
    ctx.fillStyle = skin;
    ctx.fill();
    ctx.strokeStyle = back ? U.mix(skin, '#0A0810', 0.5) : U.edge(skin);
    ctx.lineWidth = H * 0.012;
    ctx.stroke();
  }

  // Foot drawn from the ankle outward: heel, sole, toe box and instep, so it
  // reads as attached rather than a pill balanced under the shin.
  function foot(ctx, x, y, ang, face, H, color, back) {
    const s = H;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(U.clamp(ang, -0.9, 1.2) * 0.32 * face);
    ctx.scale(face, 1);
    // upper
    ctx.beginPath();
    ctx.moveTo(-0.036 * s, -0.004 * s);
    ctx.quadraticCurveTo(-0.050 * s, 0.020 * s, -0.044 * s, 0.034 * s);
    ctx.lineTo(0.078 * s, 0.034 * s);
    ctx.quadraticCurveTo(0.096 * s, 0.030 * s, 0.090 * s, 0.014 * s);
    ctx.quadraticCurveTo(0.078 * s, -0.004 * s, 0.030 * s, -0.014 * s);
    ctx.lineTo(0.008 * s, -0.024 * s);
    ctx.quadraticCurveTo(-0.018 * s, -0.028 * s, -0.036 * s, -0.004 * s);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = H * 0.014;
    ctx.strokeStyle = back ? U.mix(color, '#0A0810', 0.5) : INK;
    ctx.stroke();
    // sole: a filled band, which is what plants the foot on the deck
    ctx.beginPath();
    ctx.moveTo(-0.046 * s, 0.026 * s);
    ctx.lineTo(0.090 * s, 0.020 * s);
    ctx.quadraticCurveTo(0.096 * s, 0.032 * s, 0.078 * s, 0.040 * s);
    ctx.lineTo(-0.040 * s, 0.040 * s);
    ctx.quadraticCurveTo(-0.052 * s, 0.036 * s, -0.046 * s, 0.026 * s);
    ctx.closePath();
    ctx.fillStyle = back ? U.mix(color, '#0A0810', 0.62) : U.mix(color, '#14121A', 0.6);
    ctx.fill();
    ctx.lineWidth = H * 0.012;
    ctx.strokeStyle = back ? U.mix(color, '#0A0810', 0.5) : INK;
    ctx.stroke();
    ctx.restore();
  }

  function drawLeg(ctx, l, look, back) {
    const H = look.H;
    const pants = back ? U.shade(look.pants, -0.3) : U.garment(look.pants);
    const shoe = back ? U.shade(look.shoe, -0.3) : U.garment(look.shoe, 0.16);
    const bare = look.shorts ? (back ? U.shade(look.skin, -0.3) : look.skin) : pants;

    // Hip -> knee -> calf -> ankle as one silhouette. The extra node below the
    // knee gives the calf its bulge; drawing the segments separately would put
    // an outline straight across the joint.
    const cx = U.lerp(l.k.x, l.f.x, 0.34), cy = U.lerp(l.k.y, l.f.y, 0.34);
    chain(ctx, [
      { x1: l.s.x, y1: l.s.y, x2: l.k.x, y2: l.k.y, r1: H * 0.050, r2: H * 0.036, c: pants },
      { x1: l.k.x, y1: l.k.y, x2: cx, y2: cy, r1: H * 0.036, r2: H * 0.040, c: bare },
      { x1: cx, y1: cy, x2: l.f.x, y2: l.f.y, r1: H * 0.040, r2: H * 0.021, c: bare },
    ], back);

    foot(ctx, l.f.x, l.f.y, l.a2, look.face, H, shoe, back);
  }

  // The pelvis the legs actually hang from. Drawn before the torso so the
  // shirt falls over the waistband instead of the hips sitting on the shirt
  // like a satchel.
  function drawHips(ctx, sk, look) {
    const H = look.H, p = sk.pelvis, f = sk.f;
    const w1 = H * 0.082, w2 = H * 0.072;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(-sk.lean * 0.35 * f);
    ctx.beginPath();
    ctx.moveTo(-w1, -H * 0.090);
    ctx.lineTo(w1, -H * 0.090);
    ctx.quadraticCurveTo(w2 * 1.10, H * 0.026, w2 * 0.72, H * 0.082);
    // crotch notch, so the two thighs read as separate legs
    ctx.quadraticCurveTo(0, H * 0.030, -w2 * 0.72, H * 0.082);
    ctx.quadraticCurveTo(-w2 * 1.10, H * 0.026, -w1, -H * 0.090);
    ctx.closePath();
    ctx.fillStyle = U.garment(look.pants);
    ctx.fill();
    ctx.lineWidth = H * 0.017;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = U.rgba('#ffffff', 0.07);
    ctx.beginPath();
    ctx.moveTo(-w1 * 0.92, -H * 0.078);
    ctx.lineTo(-w1 * 0.1, -H * 0.078);
    ctx.lineTo(-w2 * 0.3, H * 0.06);
    ctx.lineTo(-w2 * 0.9, H * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawTorso(ctx, sk, look) {
    const H = look.H;
    look = Object.assign({}, look, { lum: U.lum(look.top) });
    const p = sk.pelvis, c = sk.chest;
    const wide = H * 0.136 * (look.bulk || 1);
    const narrow = H * 0.094 * (look.bulk || 1);
    // neck first; the torso quad below covers where it meets the shoulders
    U.capsule(ctx, sk.neck.x, sk.neck.y + H * 0.03, sk.head.x, sk.head.y + H * 0.03,
      H * 0.038, H * 0.034);
    ctx.fillStyle = U.shade(look.skin, -0.12);
    ctx.fill();
    ctx.strokeStyle = U.edge(look.skin);
    ctx.lineWidth = H * 0.016;
    ctx.stroke();
    // Torso is a quad rather than a capsule so jackets read as garments. The
    // hem stops short of the pelvis, which is what lets the hips read as hips
    // instead of the shirt running straight into the legs.
    const nx = Math.cos(sk.lean) * sk.f, ny = Math.sin(sk.lean);
    const hem = { x: U.lerp(p.x, c.x, 0.2), y: U.lerp(p.y, c.y, 0.2) };
    const pts = [
      [c.x + nx * wide, c.y + ny * wide],
      [c.x - nx * wide, c.y - ny * wide],
      [hem.x - nx * narrow, hem.y - ny * narrow],
      [hem.x + nx * narrow, hem.y + ny * narrow],
    ];
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.quadraticCurveTo(c.x + nx * wide * 1.1, (c.y + hem.y) / 2, pts[3][0], pts[3][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.quadraticCurveTo(c.x - nx * wide * 1.1, (c.y + hem.y) / 2, pts[1][0], pts[1][1]);
    ctx.closePath();
    ctx.fillStyle = U.garment(look.top);
    ctx.fill();
    ctx.strokeStyle = U.edge(look.top);
    ctx.lineWidth = H * 0.019;
    ctx.stroke();
    // jacket opening so the chest isn't one flat slab
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = U.rgba(U.edge(look.top), 0.55);
    ctx.lineWidth = H * 0.012;
    ctx.beginPath();
    ctx.moveTo(c.x + nx * wide * 0.18, c.y + ny * wide * 0.18);
    ctx.lineTo(hem.x + nx * narrow * 0.3, hem.y + ny * narrow * 0.3);
    ctx.stroke();
    ctx.restore();

    if (look.stripe) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = look.stripe;
      for (let i = -2; i < 3; i++) {
        ctx.fillRect(c.x + i * H * 0.048 - H * 0.012, c.y - H * 0.02, H * 0.022, H * 0.3);
      }
      ctx.restore();
    }
    if (look.vest) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = look.vest;
      ctx.beginPath();
      ctx.moveTo(c.x + nx * wide, c.y + ny * wide);
      ctx.lineTo(c.x + nx * wide * 0.15, c.y + ny * wide * 0.15 + H * 0.02);
      ctx.lineTo(hem.x + nx * narrow * 0.2, hem.y);
      ctx.lineTo(hem.x + nx * narrow, hem.y + ny * narrow);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    if (look.chain) {
      ctx.strokeStyle = look.chain;
      ctx.lineWidth = H * 0.011;
      ctx.beginPath();
      ctx.moveTo(sk.neck.x - H * 0.045, sk.neck.y + H * 0.045);
      ctx.quadraticCurveTo(sk.neck.x + H * 0.005, sk.neck.y + H * 0.11,
        sk.neck.x + H * 0.05, sk.neck.y + H * 0.042);
      ctx.stroke();
      ctx.fillStyle = look.chain;
      ctx.beginPath();
      ctx.arc(sk.neck.x + H * 0.004, sk.neck.y + H * 0.098, H * 0.014, 0, U.TAU);
      ctx.fill();
    }

    // collar sits over the base of the neck
    ctx.beginPath();
    ctx.ellipse(sk.neck.x, sk.neck.y + H * 0.036, H * 0.058, H * 0.03,
      -sk.lean * sk.f, 0, U.TAU);
    ctx.fillStyle = U.shade(look.top, look.lum < 0.3 ? 0.22 : -0.3);
    ctx.fill();
    ctx.strokeStyle = U.edge(look.top);
    ctx.lineWidth = H * 0.014;
    ctx.stroke();
  }

  /* ---------------------------------------------------------------- face
     Faces are built from a descriptor per fighter (skull shape, brow, eye,
     nose, facial hair, eyewear) so each act is recognisable from their real
     features rather than a shared generic head. Drawn in head-local space
     where +x is the direction the fighter faces. */

  function skull(ctx, r, F) {
    const jaw = F.jaw === undefined ? 1 : F.jaw;      // 1 = oval, <1 narrow
    const chin = F.chin === undefined ? 1 : F.chin;   // vertical length
    const brow = F.brow === undefined ? 1 : F.brow;   // forehead depth
    ctx.beginPath();
    ctx.moveTo(-r * 0.88, -r * 0.30);
    ctx.quadraticCurveTo(-r * 0.96, -r * 1.02 * brow, -r * 0.05, -r * 1.06 * brow);
    ctx.quadraticCurveTo(r * 0.82, -r * 1.02 * brow, r * 0.90, -r * 0.18);
    ctx.quadraticCurveTo(r * 0.94, r * 0.34, r * 0.56 * jaw, r * 0.80 * chin);
    ctx.quadraticCurveTo(r * 0.16, r * 1.04 * chin, -r * 0.38, r * 0.80 * chin);
    ctx.quadraticCurveTo(-r * 0.86, r * 0.46, -r * 0.88, -r * 0.30);
    ctx.closePath();
  }

  function beard(ctx, r, F, color) {
    const chin = F.chin === undefined ? 1 : F.chin;
    switch (F.beard) {
      case 'full':
      case 'stubble': {
        ctx.save();
        skull(ctx, r, F);
        ctx.clip();
        ctx.globalAlpha = F.beard === 'stubble' ? 0.38 : 1;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-r * 1.0, r * 0.18);
        ctx.quadraticCurveTo(-r * 0.5, r * 0.44, -r * 0.2, r * 0.42);
        ctx.quadraticCurveTo(r * 0.36, r * 0.34, r * 0.86, r * 0.22);
        ctx.lineTo(r * 1.0, r * 1.3 * chin);
        ctx.lineTo(-r * 1.0, r * 1.3 * chin);
        ctx.closePath();
        ctx.fill();
        // moustache bridging the upper lip
        ctx.beginPath();
        ctx.ellipse(r * 0.34, r * 0.28, r * 0.42, r * 0.17, -0.12, 0, U.TAU);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'moustache':
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(r * 0.34, r * 0.30, r * 0.46, r * 0.16, -0.14, 0, U.TAU);
        ctx.fill();
        break;
      case 'light': {
        // A heavy moustache with a thin, patchy beard following the jaw —
        // the moustache is the feature, the beard is only an edge.
        ctx.save();
        skull(ctx, r, F);
        ctx.clip();
        ctx.globalAlpha = 0.40;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-r * 1.0, r * 0.30);
        ctx.quadraticCurveTo(-r * 0.4, r * 0.60, r * 0.30, r * 0.60);
        ctx.quadraticCurveTo(r * 0.80, r * 0.56, r * 0.96, r * 0.30);
        ctx.lineTo(r * 1.0, r * 1.4 * chin);
        ctx.lineTo(-r * 1.0, r * 1.4 * chin);
        ctx.closePath();
        ctx.fill();
        // sideburns down to the jaw
        ctx.globalAlpha = 0.42;
        ctx.beginPath();
        ctx.ellipse(-r * 0.66, r * 0.10, r * 0.22, r * 0.38, 0.1, 0, U.TAU);
        ctx.fill();
        ctx.restore();
        // the moustache itself, full strength
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(r * 0.04, r * 0.27);
        ctx.quadraticCurveTo(r * 0.36, r * 0.17, r * 0.66, r * 0.28);
        ctx.quadraticCurveTo(r * 0.66, r * 0.41, r * 0.52, r * 0.39);
        ctx.quadraticCurveTo(r * 0.32, r * 0.32, r * 0.12, r * 0.39);
        ctx.quadraticCurveTo(r * 0.02, r * 0.36, r * 0.04, r * 0.27);
        ctx.closePath();
        ctx.fill();
        // soul patch
        ctx.beginPath();
        ctx.ellipse(r * 0.30, r * 0.62 * chin, r * 0.15, r * 0.13, 0, 0, U.TAU);
        ctx.fill();
        break;
      }
      case 'goatee':
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(r * 0.30, r * 0.30, r * 0.40, r * 0.14, -0.12, 0, U.TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(r * 0.26, r * 0.70 * chin, r * 0.28, r * 0.24, 0, 0, U.TAU);
        ctx.fill();
        break;
    }
  }

  function eyewear(ctx, r, F) {
    if (!F.glasses) return;
    if (F.glasses === 'shades') {
      ctx.fillStyle = F.glassColor || '#15121A';
      U.roundRect(ctx, -r * 0.30, -r * 0.34, r * 1.14, r * 0.40, r * 0.10);
      ctx.fill();
      ctx.fillStyle = U.rgba('#ffffff', 0.24);
      ctx.fillRect(r * 0.18, -r * 0.30, r * 0.22, r * 0.11);
      return;
    }
    // round or square frames
    ctx.strokeStyle = F.glassColor || '#2A2630';
    ctx.lineWidth = r * 0.10;
    ctx.beginPath();
    if (F.glasses === 'square') {
      ctx.rect(r * 0.16, -r * 0.30, r * 0.56, r * 0.42);
      ctx.rect(-r * 0.52, -r * 0.30, r * 0.52, r * 0.42);
    } else {
      ctx.arc(r * 0.44, -r * 0.09, r * 0.30, 0, U.TAU);
      ctx.moveTo(-r * 0.02, -r * 0.09);
      ctx.arc(-r * 0.26, -r * 0.09, r * 0.30, 0, U.TAU);
    }
    ctx.moveTo(r * 0.14, -r * 0.12);
    ctx.lineTo(r * 0.04, -r * 0.12);
    ctx.stroke();
    ctx.fillStyle = U.rgba('#BFD8E8', 0.18);
    ctx.beginPath();
    ctx.arc(r * 0.44, -r * 0.09, r * 0.28, 0, U.TAU);
    ctx.fill();
  }

  function drawHead(ctx, sk, look, hairFn) {
    const H = look.H, h = sk.head;
    const F = look.face2 || {};
    const r = h.r;
    look = Object.assign({}, look, { headR: r });
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.a * 0.45 * sk.f);
    ctx.scale(sk.f, 1);

    if (hairFn) hairFn(ctx, H, look, 'back');

    // ear behind the jaw line
    ctx.fillStyle = U.shade(look.skin, -0.16);
    ctx.beginPath();
    ctx.ellipse(-r * 0.46, r * 0.06, r * 0.17, r * 0.24, 0, 0, U.TAU);
    ctx.fill();

    // skull
    skull(ctx, r, F);
    ctx.fillStyle = look.skin;
    ctx.fill();
    ctx.strokeStyle = U.edge(look.skin);
    ctx.lineWidth = H * 0.015;
    ctx.stroke();

    // cheek warmth / weathering
    if (F.ruddy) {
      ctx.save();
      skull(ctx, r, F); ctx.clip();
      ctx.fillStyle = U.rgba('#C2604A', 0.22);
      ctx.beginPath();
      ctx.ellipse(r * 0.30, r * 0.16, r * 0.40, r * 0.24, 0, 0, U.TAU);
      ctx.fill();
      ctx.restore();
    }
    // modelling: lit cheekbone and temple, shadow under the jaw and behind
    ctx.save();
    skull(ctx, r, F); ctx.clip();
    ctx.fillStyle = U.rgba('#000000', 0.10);
    ctx.beginPath();
    ctx.ellipse(-r * 0.24, r * 0.46, r * 0.86, r * 0.52, 0, 0, U.TAU);
    ctx.fill();
    ctx.fillStyle = U.rgba('#000000', 0.11);
    ctx.beginPath();
    ctx.ellipse(-r * 0.86, -r * 0.1, r * 0.42, r * 0.9, 0, 0, U.TAU);
    ctx.fill();
    ctx.fillStyle = U.rgba('#FFFFFF', 0.13);
    ctx.beginPath();
    ctx.ellipse(r * 0.42, r * 0.02, r * 0.30, r * 0.20, -0.3, 0, U.TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.22, -r * 0.52, r * 0.40, r * 0.16, -0.12, 0, U.TAU);
    ctx.fill();
    ctx.restore();

    // brows
    const bw = F.browWeight || 0.16;
    ctx.strokeStyle = look.hair;
    ctx.lineWidth = r * bw;
    ctx.lineCap = 'round';
    const ba = F.browAngle === undefined ? 0.14 : F.browAngle;
    ctx.beginPath();
    ctx.moveTo(r * 0.18, -r * (0.42 + ba));
    ctx.lineTo(r * 0.66, -r * (0.34 - ba * 0.4));
    ctx.moveTo(-r * 0.44, -r * (0.36 + ba * 0.5));
    ctx.lineTo(-r * 0.02, -r * (0.44 + ba));
    ctx.stroke();

    // smudged liner
    if (F.makeup) {
      ctx.fillStyle = U.rgba(F.makeup, 0.55);
      ctx.beginPath();
      ctx.ellipse(r * 0.46, -r * 0.09, r * 0.34, r * 0.26, 0, 0, U.TAU);
      ctx.ellipse(-r * 0.22, -r * 0.09, r * 0.32, r * 0.25, 0, 0, U.TAU);
      ctx.fill();
    }

    // eyes
    const eo = F.eyeOpen === undefined ? 1 : F.eyeOpen;
    ctx.fillStyle = '#F4F0EA';
    [[r * 0.44, -r * 0.09], [-r * 0.24, -r * 0.09]].forEach(([ex, ey], i) => {
      ctx.beginPath();
      ctx.ellipse(ex, ey, r * 0.23, r * 0.20 * eo, 0, 0, U.TAU);
      ctx.fill();
    });
    ctx.fillStyle = F.eyeColor || '#241C28';
    [[r * 0.48, -r * 0.09], [-r * 0.21, -r * 0.09]].forEach(([ex, ey]) => {
      ctx.beginPath();
      ctx.ellipse(ex, ey, r * 0.13, r * 0.165 * eo, 0, 0, U.TAU);
      ctx.fill();
    });
    // lash line keeps the eyes reading at fight scale
    ctx.strokeStyle = '#241C28';
    ctx.lineWidth = r * 0.075;
    ctx.beginPath();
    ctx.moveTo(r * 0.24, -r * 0.24);
    ctx.lineTo(r * 0.64, -r * 0.22);
    ctx.moveTo(-r * 0.44, -r * 0.22);
    ctx.lineTo(-r * 0.04, -r * 0.24);
    ctx.stroke();

    // nose
    ctx.strokeStyle = U.shade(look.skin, -0.3);
    ctx.lineWidth = r * 0.10;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    switch (F.nose) {
      case 'roman':
        ctx.moveTo(r * 0.56, -r * 0.18);
        ctx.quadraticCurveTo(r * 0.92, r * 0.02, r * 0.74, r * 0.18);
        ctx.lineTo(r * 0.50, r * 0.20);
        break;
      case 'wide':
        ctx.moveTo(r * 0.52, -r * 0.10);
        ctx.quadraticCurveTo(r * 0.82, r * 0.10, r * 0.60, r * 0.22);
        ctx.lineTo(r * 0.36, r * 0.20);
        break;
      case 'small':
        ctx.moveTo(r * 0.56, r * 0.00);
        ctx.quadraticCurveTo(r * 0.72, r * 0.10, r * 0.56, r * 0.16);
        break;
      default:
        ctx.moveTo(r * 0.56, -r * 0.14);
        ctx.quadraticCurveTo(r * 0.82, r * 0.08, r * 0.62, r * 0.20);
        ctx.lineTo(r * 0.44, r * 0.20);
    }
    ctx.stroke();

    beard(ctx, r, F, F.beardColor || look.hair);
    // mouth
    ctx.strokeStyle = '#3A2028';
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    if (F.mouth === 'open') {
      ctx.fillStyle = '#3A2028';
      ctx.ellipse(r * 0.34, r * 0.46, r * 0.22, r * 0.16, -0.1, 0, U.TAU);
      ctx.fill();
    } else if (F.mouth === 'smirk') {
      ctx.moveTo(r * 0.08, r * 0.48);
      ctx.quadraticCurveTo(r * 0.36, r * 0.40, r * 0.62, r * 0.46);
      ctx.stroke();
    } else {
      ctx.moveTo(r * 0.08, r * 0.46);
      ctx.lineTo(r * 0.60, r * 0.42);
      ctx.stroke();
    }

    eyewear(ctx, r, F);
    if (hairFn) hairFn(ctx, H, look, 'front');

    // sheen across the crown so hair reads as a mass with a light on it,
    // rather than a flat silhouette
    if (!F.noSheen) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = U.rgba('#FFFFFF', 0.13);
      ctx.lineCap = 'round';
      ctx.lineWidth = r * 0.17;
      ctx.beginPath();
      ctx.arc(-r * 0.1, -r * 0.42, r * 0.92, -Math.PI * 0.86, -Math.PI * 0.34);
      ctx.stroke();
      ctx.lineWidth = r * 0.09;
      ctx.strokeStyle = U.rgba('#FFFFFF', 0.10);
      ctx.beginPath();
      ctx.arc(-r * 0.1, -r * 0.42, r * 1.12, -Math.PI * 0.78, -Math.PI * 0.44);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------------- hair
     One entry per act, shaped from photo reference. `back` draws behind the
     skull, `front` over the forehead. */
  const HAIR = {
    // Jack White: long, dark, heavy waves past the shoulder, centre-ish part.
    longWavy: function (ctx, H, look, layer) {
      const r = look.headR;
      ctx.fillStyle = look.hair;
      if (layer === 'back') {
        ctx.beginPath();
        ctx.moveTo(-r * 1.0, -r * 0.6);
        ctx.quadraticCurveTo(-r * 1.9, r * 0.6, -r * 1.35, r * 2.5);
        ctx.quadraticCurveTo(-r * 0.3, r * 2.9, r * 0.45, r * 2.3);
        ctx.quadraticCurveTo(r * 1.1, r * 1.1, r * 0.85, -r * 0.5);
        ctx.closePath();
        ctx.fill();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(-r * 1.02, -r * 0.42);
      ctx.quadraticCurveTo(-r * 1.15, -r * 1.42, r * 0.06, -r * 1.36);
      ctx.quadraticCurveTo(r * 1.06, -r * 1.28, r * 1.02, -r * 0.46);
      ctx.quadraticCurveTo(r * 0.94, -r * 0.82, r * 0.52, -r * 0.86);
      ctx.quadraticCurveTo(r * 0.1, -r * 1.02, -r * 0.5, -r * 0.82);
      ctx.closePath();
      ctx.fill();
      // a couple of waves falling in front of the ear
      ctx.beginPath();
      ctx.moveTo(-r * 0.92, -r * 0.5);
      ctx.quadraticCurveTo(-r * 1.3, r * 0.7, -r * 0.96, r * 1.9);
      ctx.quadraticCurveTo(-r * 0.62, r * 0.8, -r * 0.64, -r * 0.44);
      ctx.closePath();
      ctx.fill();
    },

    // James Murphy: greying, voluminous, swept up and outward.
    messyGrey: function (ctx, H, look, layer) {
      const r = look.headR;
      if (layer !== 'front') return;
      ctx.fillStyle = look.hair;
      ctx.beginPath();
      ctx.moveTo(-r * 1.06, -r * 0.16);
      ctx.quadraticCurveTo(-r * 1.32, -r * 1.05, -r * 0.62, -r * 1.36);
      ctx.quadraticCurveTo(-r * 0.2, -r * 1.72, r * 0.18, -r * 1.34);
      ctx.quadraticCurveTo(r * 0.62, -r * 1.7, r * 0.82, -r * 1.16);
      ctx.quadraticCurveTo(r * 1.16, -r * 0.92, r * 1.0, -r * 0.5);
      ctx.quadraticCurveTo(r * 0.7, -r * 0.92, r * 0.2, -r * 0.98);
      ctx.quadraticCurveTo(-r * 0.4, -r * 1.02, -r * 1.06, -r * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = U.rgba('#FFFFFF', 0.22);
      ctx.beginPath();
      ctx.ellipse(-r * 0.3, -r * 1.12, r * 0.5, r * 0.2, -0.3, 0, U.TAU);
      ctx.fill();
    },

    // Sarah Barthel: bleached platinum, blunt fringe, shoulder length.
    bluntBob: function (ctx, H, look, layer) {
      const r = look.headR;
      ctx.fillStyle = look.hair;
      if (layer === 'back') {
        ctx.beginPath();
        ctx.moveTo(-r * 1.05, -r * 0.5);
        ctx.quadraticCurveTo(-r * 1.4, r * 0.8, -r * 1.1, r * 1.75);
        ctx.lineTo(r * 0.7, r * 1.75);
        ctx.quadraticCurveTo(r * 1.15, r * 0.7, r * 0.9, -r * 0.4);
        ctx.closePath();
        ctx.fill();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(-r * 1.06, -r * 0.3);
      ctx.quadraticCurveTo(-r * 1.1, -r * 1.42, r * 0.05, -r * 1.38);
      ctx.quadraticCurveTo(r * 1.08, -r * 1.34, r * 1.04, -r * 0.26);
      ctx.lineTo(r * 0.98, -r * 0.66);
      // blunt fringe cut straight across the brow
      ctx.lineTo(-r * 0.3, -r * 0.74);
      ctx.lineTo(-r * 0.95, -r * 0.62);
      ctx.closePath();
      ctx.fill();
    },

    // Kevin Morby: frizzy auburn volume, wide at the sides.
    frizzy: function (ctx, H, look, layer) {
      const r = look.headR;
      ctx.fillStyle = look.hair;
      if (layer === 'back') {
        for (let i = 0; i < 11; i++) {
          const a = Math.PI * (0.02 + (i / 10) * 1.06);
          ctx.beginPath();
          ctx.arc(-Math.cos(a) * r * 1.02, -Math.sin(a) * r * 1.02 - r * 0.1, r * 0.48, 0, U.TAU);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.ellipse(-r * 0.1, -r * 0.3, r * 1.2, r * 1.1, 0, 0, U.TAU);
        ctx.fill();
        return;
      }
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(-r * 0.9 + i * r * 0.38, -r * 0.95 - (i % 2) * r * 0.2, r * 0.42, 0, U.TAU);
        ctx.fill();
      }
    },

    // Dijon: short coils, tight to the skull.
    coily: function (ctx, H, look, layer) {
      const r = look.headR;
      if (layer !== 'front') return;
      ctx.fillStyle = look.hair;
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (0.05 + (i / 8) * 0.9);
        ctx.beginPath();
        ctx.arc(-Math.cos(a) * r * 0.84, -Math.sin(a) * r * 0.86 - r * 0.16, r * 0.34, 0, U.TAU);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.ellipse(-r * 0.06, -r * 0.5, r * 0.95, r * 0.66, 0, Math.PI, U.TAU);
      ctx.fill();
    },

    // Cameron Winter: dark shaggy mop falling into the eyes.
    mop: function (ctx, H, look, layer) {
      const r = look.headR;
      if (layer !== 'front') return;
      ctx.fillStyle = look.hair;
      ctx.beginPath();
      ctx.moveTo(-r * 1.1, -r * 0.18);
      ctx.quadraticCurveTo(-r * 1.28, -r * 1.3, -r * 0.1, -r * 1.34);
      ctx.quadraticCurveTo(r * 1.06, -r * 1.3, r * 1.06, -r * 0.34);
      ctx.quadraticCurveTo(r * 0.88, -r * 0.62, r * 0.6, -r * 0.54);
      ctx.quadraticCurveTo(r * 0.3, -r * 0.86, -r * 0.1, -r * 0.66);
      ctx.quadraticCurveTo(-r * 0.6, -r * 0.44, -r * 1.1, -r * 0.18);
      ctx.closePath();
      ctx.fill();
    },

    // Die Spitz: dyed, choppy, layered punk shag.
    punkShag: function (ctx, H, look, layer) {
      const r = look.headR;
      ctx.fillStyle = look.hair;
      if (layer === 'back') {
        ctx.beginPath();
        ctx.moveTo(-r * 1.0, -r * 0.4);
        ctx.quadraticCurveTo(-r * 1.5, r * 0.7, -r * 1.0, r * 1.5);
        ctx.lineTo(r * 0.6, r * 1.2);
        ctx.quadraticCurveTo(r * 1.0, r * 0.2, r * 0.85, -r * 0.4);
        ctx.closePath();
        ctx.fill();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(-r * 1.08, -r * 0.44);
      ctx.quadraticCurveTo(-r * 1.2, -r * 1.5, r * 0.0, -r * 1.42);
      ctx.quadraticCurveTo(r * 1.12, -r * 1.36, r * 1.06, -r * 0.44);
      // choppy spikes across the fringe
      for (let i = 0; i < 5; i++) {
        const x = r * (1.0 - i * 0.45);
        ctx.lineTo(x, -r * (0.56 + (i % 2) * 0.26));
        ctx.lineTo(x - r * 0.22, -r * (0.84 - (i % 2) * 0.2));
      }
      ctx.closePath();
      ctx.fill();
    },

    // Shana Cleveland: long dark hair, heavy fringe.
    bangsLong: function (ctx, H, look, layer) {
      const r = look.headR;
      ctx.fillStyle = look.hair;
      if (layer === 'back') {
        ctx.beginPath();
        ctx.moveTo(-r * 1.02, -r * 0.55);
        ctx.quadraticCurveTo(-r * 1.55, r * 1.0, -r * 1.15, r * 2.5);
        ctx.quadraticCurveTo(-r * 0.1, r * 2.7, r * 0.7, r * 2.1);
        ctx.quadraticCurveTo(r * 1.1, r * 0.8, r * 0.88, -r * 0.45);
        ctx.closePath();
        ctx.fill();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(-r * 1.04, -r * 0.5);
      ctx.quadraticCurveTo(-r * 1.08, -r * 1.4, r * 0.04, -r * 1.36);
      ctx.quadraticCurveTo(r * 1.06, -r * 1.32, r * 1.02, -r * 0.50);
      ctx.quadraticCurveTo(r * 0.5, -r * 0.76, -r * 0.2, -r * 0.72);
      ctx.quadraticCurveTo(-r * 0.7, -r * 0.70, -r * 1.04, -r * 0.5);
      ctx.closePath();
      ctx.fill();
    },

    // McKinley Dixon: short, tight, clean hairline.
    fade: function (ctx, H, look, layer) {
      const r = look.headR;
      if (layer !== 'front') return;
      ctx.fillStyle = look.hair;
      ctx.beginPath();
      ctx.moveTo(-r * 0.98, -r * 0.24);
      ctx.quadraticCurveTo(-r * 1.02, -r * 1.12, r * 0.0, -r * 1.14);
      ctx.quadraticCurveTo(r * 0.98, -r * 1.1, r * 0.96, -r * 0.34);
      ctx.lineTo(r * 0.88, -r * 0.5);
      ctx.quadraticCurveTo(r * 0.2, -r * 0.72, -r * 0.9, -r * 0.42);
      ctx.closePath();
      ctx.fill();
    },

    // McKinley Dixon: short dyed twists standing off the scalp.
    twists: function (ctx, H, look, layer) {
      const r = look.headR;
      if (layer !== 'front') return;
      const dark = U.mix(look.hair, '#2A1008', 0.42);
      // scalp first, then short twists lying against it
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(-r * 0.04, -r * 0.42, r * 1.02, r * 0.78, 0, Math.PI, U.TAU);
      ctx.fill();
      for (let i = 0; i < 16; i++) {
        const a = Math.PI * (-0.02 + (i / 15) * 1.04);
        const bx = -Math.cos(a) * r * 0.62 - r * 0.04;
        const by = -Math.sin(a) * r * 0.5 - r * 0.42;
        const ex = -Math.cos(a) * r * 0.98 - r * 0.04;
        const ey = -Math.sin(a) * r * 0.80 - r * 0.42;
        ctx.strokeStyle = look.hair;
        ctx.lineWidth = r * 0.20;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.fillStyle = U.mix(look.hair, '#FFFFFF', 0.16);
        ctx.beginPath(); ctx.arc(ex, ey, r * 0.10, 0, U.TAU); ctx.fill();
      }
    },

    // Cameron Winter: a long dark wavy mane, not a bowl.
    wavyMane: function (ctx, H, look, layer) {
      const r = look.headR;
      ctx.fillStyle = look.hair;
      if (layer === 'back') {
        ctx.beginPath();
        ctx.moveTo(-r * 1.0, -r * 0.5);
        ctx.quadraticCurveTo(-r * 1.7, r * 0.5, -r * 1.25, r * 1.9);
        ctx.quadraticCurveTo(-r * 0.3, r * 2.25, r * 0.6, r * 1.7);
        ctx.quadraticCurveTo(r * 1.05, r * 0.7, r * 0.88, -r * 0.45);
        ctx.closePath();
        ctx.fill();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(-r * 1.12, -r * 0.2);
      ctx.quadraticCurveTo(-r * 1.3, -r * 1.42, -r * 0.05, -r * 1.42);
      ctx.quadraticCurveTo(r * 1.14, -r * 1.4, r * 1.06, -r * 0.3);
      // a lock swinging across the brow
      ctx.quadraticCurveTo(r * 0.86, -r * 0.74, r * 0.46, -r * 0.62);
      ctx.quadraticCurveTo(r * 0.0, -r * 0.5, -r * 0.42, -r * 0.78);
      ctx.quadraticCurveTo(-r * 0.86, -r * 0.52, -r * 1.12, -r * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r * 0.98, -r * 0.44);
      ctx.quadraticCurveTo(-r * 1.36, r * 0.6, -r * 1.0, r * 1.5);
      ctx.quadraticCurveTo(-r * 0.66, r * 0.6, -r * 0.68, -r * 0.4);
      ctx.closePath();
      ctx.fill();
    },

    // Dijon: short curls under a rolled beanie, a few escaping at the brim.
    beanieCurls: function (ctx, H, look, layer) {
      const r = look.headR;
      if (layer === 'back') {
        ctx.fillStyle = look.hair;
        ctx.beginPath();
        ctx.ellipse(-r * 0.2, -r * 0.1, r * 1.0, r * 0.94, 0, 0, U.TAU);
        ctx.fill();
        return;
      }
      // curls poking out under the brim before the hat goes on
      ctx.fillStyle = look.hair;
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.02 + (i / 6) * 1.0);
        ctx.beginPath();
        ctx.arc(-Math.cos(a) * r * 0.96, -Math.sin(a) * r * 0.42 - r * 0.56, r * 0.26, 0, U.TAU);
        ctx.fill();
      }
      const hatC = look.hatColor || '#22242C';
      ctx.fillStyle = hatC;
      ctx.beginPath();
      ctx.moveTo(-r * 1.0, -r * 0.78);
      ctx.quadraticCurveTo(-r * 1.08, -r * 1.62, r * 0.0, -r * 1.58);
      ctx.quadraticCurveTo(r * 1.08, -r * 1.54, r * 0.98, -r * 0.78);
      ctx.closePath();
      ctx.fill();
      // rolled brim, sitting above the brow
      ctx.fillStyle = U.shade(hatC, 0.16);
      U.roundRect(ctx, -r * 1.06, -r * 0.98, r * 2.12, r * 0.32, r * 0.13);
      ctx.fill();
      ctx.strokeStyle = U.edge(hatC); ctx.lineWidth = r * 0.08; ctx.stroke();
      // knit ribbing, crown only
      ctx.strokeStyle = U.rgba('#000000', 0.18);
      ctx.lineWidth = r * 0.055;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.28, -r * 0.98);
        ctx.lineTo(i * r * 0.28 * 1.06, -r * 1.48);
        ctx.stroke();
      }
    },

    // John Gourley: mid-length under a cap.
    capLong: function (ctx, H, look, layer) {
      const r = look.headR;
      ctx.fillStyle = look.hair;
      if (layer === 'back') {
        ctx.beginPath();
        ctx.moveTo(-r * 1.0, -r * 0.4);
        ctx.quadraticCurveTo(-r * 1.4, r * 0.7, -r * 1.05, r * 1.6);
        ctx.quadraticCurveTo(-r * 0.1, r * 1.85, r * 0.6, r * 1.3);
        ctx.quadraticCurveTo(r * 0.95, r * 0.4, r * 0.85, -r * 0.4);
        ctx.closePath();
        ctx.fill();
        return;
      }
      // cap crown and brim
      ctx.fillStyle = look.hatColor || '#2B2233';
      ctx.beginPath();
      ctx.moveTo(-r * 1.06, -r * 0.42);
      ctx.quadraticCurveTo(-r * 1.02, -r * 1.5, r * 0.06, -r * 1.48);
      ctx.quadraticCurveTo(r * 1.06, -r * 1.44, r * 1.02, -r * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.5, -r * 0.5);
      ctx.quadraticCurveTo(r * 2.0, -r * 0.62, r * 1.92, -r * 0.16);
      ctx.quadraticCurveTo(r * 1.4, -r * 0.3, r * 0.5, -r * 0.24);
      ctx.closePath();
      ctx.fill();
      if (look.hatBand) {
        ctx.fillStyle = look.hatBand;
        ctx.fillRect(-r * 0.9, -r * 0.82, r * 1.85, r * 0.26);
      }
    },
  };

  IB.Rig = { POSES, P, blend, mixMany, skeleton, HAIR, INK, limb, drawArm, drawLeg, drawHips, drawTorso, drawHead, FIELDS, BASE };
})(window.IB);
