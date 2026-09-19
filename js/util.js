/* Iron Blossom — shared utilities */
window.IB = window.IB || {};
(function (IB) {
  'use strict';

  const U = {};

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.pick = (arr) => arr[(Math.random() * arr.length) | 0];
  U.sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
  U.approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
  U.TAU = Math.PI * 2;
  U.DEG = Math.PI / 180;

  // Smooth interpolation used for pose blending.
  U.ease = (t) => t * t * (3 - 2 * t);
  U.easeOut = (t) => 1 - (1 - t) * (1 - t);
  U.easeIn = (t) => t * t;

  // Deterministic value noise — used for background texture so stages don't
  // shimmer between frames.
  U.hash = function (x, y) {
    let h = x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
  };

  U.aabb = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // Mix two hex colours. Cheap, and we call it a lot during draw.
  const hexCache = new Map();
  U.parseHex = function (hex) {
    let c = hexCache.get(hex);
    if (c) return c;
    let h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    c = { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    hexCache.set(hex, c);
    return c;
  };

  const mixCache = new Map();
  U.mix = function (c1, c2, t) {
    const key = c1 + c2 + ((t * 100) | 0);
    let out = mixCache.get(key);
    if (out) return out;
    const a = U.parseHex(c1), b = U.parseHex(c2);
    out =
      'rgb(' +
      Math.round(U.lerp(a.r, b.r, t)) + ',' +
      Math.round(U.lerp(a.g, b.g, t)) + ',' +
      Math.round(U.lerp(a.b, b.b, t)) + ')';
    if (mixCache.size < 4000) mixCache.set(key, out);
    return out;
  };

  U.shade = (hex, amt) => (amt < 0 ? U.mix(hex, '#000000', -amt) : U.mix(hex, '#ffffff', amt));

  // Relative luminance, used to decide whether a shape needs a dark outline or
  // a light one. Near-black costumes disappear against a dark outline.
  U.lum = function (hex) {
    const c = U.parseHex(hex);
    return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
  };

  // Outlines are always dark in this art style; instead of lightening the
  // outline for a near-black garment, lift the garment itself just enough that
  // the shape still reads against a dark stage.
  U.edge = function (hex, ink) { return ink || '#15121A'; };

  U.garment = function (hex, min) {
    const m = min === undefined ? 0.2 : min;
    const l = U.lum(hex);
    return l >= m ? hex : U.mix(hex, '#FFFFFF', Math.min(0.55, (m - l) * 1.5));
  };

  U.rgba = function (hex, a) {
    const c = U.parseHex(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  };

  // Rounded-rect path helper (Path2D-free so we can batch into one ctx path).
  U.roundRect = function (ctx, x, y, w, h, r) {
    const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  };

  // Tapered capsule between two points — the workhorse of the fighter rig.
  // Walks one side, round the far cap, back the other side, round the near cap.
  // arc() emits the implicit lineTo for each straight side, so the path stays
  // simple; an out-of-order point here makes it self-intersect and the nonzero
  // fill rule then drops half the shape.
  U.capsule = function (ctx, x1, y1, x2, y2, r1, r2) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.arc(x1, y1, Math.max(r1, 0.01), a + Math.PI / 2, a + Math.PI * 1.5, false);
    ctx.arc(x2, y2, Math.max(r2, 0.01), a - Math.PI / 2, a + Math.PI / 2, false);
    ctx.closePath();
  };

  U.blob = function (ctx, pts, close) {
    if (!pts.length) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i][0] + pts[i + 1][0]) / 2;
      const yc = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], xc, yc);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
    if (close !== false) ctx.closePath();
  };

  IB.U = U;
})(window.IB);
