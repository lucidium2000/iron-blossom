/* Iron Blossom — stages.
   Layout convention: the fight happens on a stage deck. Behind it sits the
   barricade, then the crowd, then the festival grounds and the Richmond
   skyline. Static layers are pre-rendered into offscreen canvases once and
   scrolled with parallax; only lights, weather and the front crowd rows are
   redrawn per frame. */
window.IB = window.IB || {};
(function (IB) {
  'use strict';
  const U = IB.U;

  const VIEW_W = 1280, VIEW_H = 720;
  const GROUND_Y = 592;        // deck surface in the unzoomed layout space
  const DECK_FRONT = 660;      // front lip of the deck
  const BARRICADE_Y = 446;     // where the barricade sits in that same space
  const WORLD_W = 1900;
  // The camera pins the deck line to this screen row at every zoom level, so
  // the horizon never slides around while the fighters close distance.
  const GROUND_SCREEN = 566;

  IB.VIEW = { W: VIEW_W, H: VIEW_H, GROUND_Y, DECK_FRONT, BARRICADE_Y, WORLD_W, GROUND_SCREEN };

  const LW = 2600;             // width of each cached layer canvas

  function layer(w, h, fn) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    fn(x, w, h);
    return c;
  }

  function sky(ctx, w, h, stops) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    stops.forEach(([p, c]) => g.addColorStop(p, c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  /* --------------------------------------------------------- shared props */

  function tower(ctx, x, y, w, h, color, lit, seed) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y - h, w, h);
    if (lit) {
      ctx.fillStyle = lit;
      for (let r = 0; r < Math.floor(h / 16); r++) {
        for (let c = 0; c < Math.floor(w / 12); c++) {
          if (U.hash(x + c * 7 + seed, y + r * 13) > 0.62) {
            ctx.fillRect(x + 5 + c * 12, y - h + 10 + r * 16, 4, 6);
          }
        }
      }
    }
  }

  function skyline(ctx, w, baseY, color, lit, seed) {
    let x = -40;
    let i = 0;
    while (x < w + 80) {
      const bw = 34 + U.hash(i + seed, 1) * 76;
      const bh = 60 + U.hash(i + seed, 2) * 190;
      tower(ctx, x, baseY, bw, bh, color, lit, seed + i);
      // a couple of the towers get a crown so the line isn't flat
      if (U.hash(i + seed, 3) > 0.78) {
        ctx.fillStyle = color;
        ctx.fillRect(x + bw / 2 - 3, baseY - bh - 26, 6, 26);
      }
      x += bw + 6 + U.hash(i + seed, 4) * 16;
      i++;
    }
  }

  function treeline(ctx, w, baseY, color, h1, h2, seed) {
    ctx.fillStyle = color;
    for (let x = -30; x < w + 40; x += 16) {
      const h = h1 + U.hash(x + seed, 9) * (h2 - h1);
      ctx.beginPath();
      ctx.moveTo(x - 16, baseY);
      ctx.quadraticCurveTo(x - 9, baseY - h, x, baseY - h * 0.92);
      ctx.quadraticCurveTo(x + 10, baseY - h * 1.05, x + 18, baseY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillRect(0, baseY - 2, w, 12);
  }

  // The backline every festival stage has: risers, cabs, a video wall.
  function backline(ctx, w, y, S) {
    // video wall
    const vw = 520, vx = w / 2 - vw / 2;
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(vx - 14, y - 300, vw + 28, 250);
    const g = ctx.createLinearGradient(vx, y - 290, vx + vw, y - 60);
    g.addColorStop(0, S.wall1);
    g.addColorStop(0.5, S.wall2);
    g.addColorStop(1, S.wall1);
    ctx.fillStyle = g;
    ctx.fillRect(vx, y - 288, vw, 226);
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#000';
    for (let i = 0; i < 226; i += 4) ctx.fillRect(vx, y - 288 + i, vw, 2);
    ctx.globalAlpha = 1;

    // speaker stacks flanking
    [vx - 130, vx + vw + 40].forEach((sx) => {
      ctx.fillStyle = '#15161C';
      ctx.fillRect(sx, y - 300, 86, 250);
      ctx.fillStyle = '#0C0D11';
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(sx + 6, y - 294 + i * 40, 74, 34);
        ctx.fillStyle = '#1E2029';
        ctx.beginPath(); ctx.arc(sx + 26, y - 277 + i * 40, 12, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + 58, y - 277 + i * 40, 12, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#0C0D11';
      }
    });

    // truss above
    ctx.strokeStyle = '#2A2D36';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(0, y - 330); ctx.lineTo(w, y - 330); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1D2028';
    for (let x = 0; x < w; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, y - 330); ctx.lineTo(x + 14, y - 348);
      ctx.lineTo(x + 28, y - 330); ctx.stroke();
    }
    ctx.strokeStyle = '#2A2D36'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(0, y - 352); ctx.lineTo(w, y - 352); ctx.stroke();
  }

  // Wooden deck with cable runs and gaff tape.
  function deck(ctx, w, y, S) {
    ctx.fillStyle = S.deck;
    ctx.fillRect(0, y, w, 200);
    ctx.fillStyle = U.shade(S.deck, -0.18);
    for (let x = 0; x < w; x += 96) ctx.fillRect(x, y, 3, 200);
    const g = ctx.createLinearGradient(0, y, 0, y + 90);
    g.addColorStop(0, U.rgba('#000000', 0.34));
    g.addColorStop(1, U.rgba('#000000', 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, y, w, 90);
    // front lip
    ctx.fillStyle = U.shade(S.deck, -0.42);
    ctx.fillRect(0, y + 66, w, 10);
    // cable run snaking downstage
    ctx.strokeStyle = '#101218';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-20, y + 30);
    for (let x = 0; x < w + 40; x += 120) {
      ctx.quadraticCurveTo(x + 60, y + 30 + (x % 240 === 0 ? 16 : -10), x + 120, y + 30);
    }
    ctx.stroke();
    ctx.strokeStyle = '#1B2028'; ctx.lineWidth = 3;
    ctx.stroke();
    // gaff tape marks
    ctx.fillStyle = U.rgba('#E8E3D6', 0.5);
    for (let x = 60; x < w; x += 310) {
      ctx.fillRect(x, y + 48, 44, 5);
      ctx.fillRect(x + 18, y + 40, 5, 22);
    }
  }

  function barricade(ctx, w, y, S) {
    // security pit floor behind the deck
    ctx.fillStyle = S.pit;
    ctx.fillRect(0, y, w, 120);
    // steel barricade
    ctx.strokeStyle = '#8E949E';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(0, y + 4); ctx.lineTo(w, y + 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y + 40); ctx.lineTo(w, y + 40); ctx.stroke();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#767C86';
    for (let x = 10; x < w; x += 78) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 56); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 39, y + 6); ctx.lineTo(x + 39, y + 40); ctx.stroke();
    }
    // branded scrim on the barricade
    for (let x = 30; x < w; x += 470) {
      ctx.fillStyle = U.rgba(S.accent, 0.55);
      ctx.fillRect(x, y + 8, 250, 30);
      ctx.fillStyle = '#12101A';
      ctx.font = '700 19px Barlow Condensed, Arial Narrow, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('IRON BLOSSOM · RVA', x + 125, y + 30);
    }
    ctx.textAlign = 'left';
  }

  /* -------------------------------------------------------------- stages */

  const STAGES = [
    {
      id: 'ironstage',
      name: 'IRON STAGE',
      sub: 'Midtown Green · Richmond, VA',
      weather: 'confetti',
      lightColors: ['#FF5A3C', '#FFC93C', '#3CC8FF'],
      crowd: { density: 1.0, mood: 1.0 },
      S: {
        deck: '#4A3A2C', pit: '#211C1C', accent: '#E8B33C',
        wall1: '#5A1F2E', wall2: '#C2412F', haze: '#FFB870',
      },
      props: ['barrel', 'barrel', 'speaker', 'roadcase', 'cooler'],
      far(ctx, w, h) {
        sky(ctx, w, h, [[0, '#2C4E7A'], [0.34, '#6E7FA8'], [0.62, '#E89A62'], [0.85, '#F7C983'], [1, '#FBE2B4']]);
        // sun low over the river
        const g = ctx.createRadialGradient(w * 0.68, h * 0.62, 10, w * 0.68, h * 0.62, 300);
        g.addColorStop(0, U.rgba('#FFF0C8', 0.95));
        g.addColorStop(0.3, U.rgba('#FFC070', 0.4));
        g.addColorStop(1, U.rgba('#FFA050', 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        skyline(ctx, w, h * 0.76, '#2F3A55', null, 11);
        skyline(ctx, w, h * 0.8, '#1F2739', '#FFD9A0', 27);
        treeline(ctx, w, h * 0.82, '#16202A', 30, 62, 5);
      },
      mid(ctx, w, h) {
        const y = h * 0.78;
        // festival grounds: tents, flags, a ferris wheel over the treeline
        ctx.strokeStyle = '#141A22'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(w * 0.16, y - 120, 92, 0, U.TAU); ctx.stroke();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * U.TAU;
          ctx.beginPath();
          ctx.moveTo(w * 0.16, y - 120);
          ctx.lineTo(w * 0.16 + Math.cos(a) * 92, y - 120 + Math.sin(a) * 92);
          ctx.stroke();
          ctx.fillStyle = i % 2 ? '#E8B33C' : '#C2412F';
          ctx.fillRect(w * 0.16 + Math.cos(a) * 92 - 6, y - 120 + Math.sin(a) * 92 - 6, 12, 12);
        }
        ctx.fillStyle = '#141A22';
        ctx.fillRect(w * 0.16 - 5, y - 120, 10, 120);
        // vendor tents
        for (let i = 0; i < 9; i++) {
          const x = 120 + i * 270 + U.hash(i, 3) * 60;
          const tw = 76;
          ctx.fillStyle = i % 2 ? '#1C2530' : '#222C38';
          ctx.fillRect(x, y - 34, tw, 34);
          ctx.fillStyle = i % 3 === 0 ? '#C2412F' : '#2E4A5A';
          ctx.beginPath();
          ctx.moveTo(x - 10, y - 34);
          ctx.lineTo(x + tw / 2, y - 62);
          ctx.lineTo(x + tw + 10, y - 34);
          ctx.closePath();
          ctx.fill();
        }
        backline(ctx, w, h * 0.92, this.S);
      },
    },

    {
      id: 'blossom',
      name: 'BLOSSOM STAGE',
      sub: 'Golden hour · dogwoods in the back field',
      weather: 'petals',
      lightColors: ['#FF9EC4', '#FFD98A', '#9AD8E0'],
      crowd: { density: 0.78, mood: 0.85 },
      S: {
        deck: '#6B5136', pit: '#2A2320', accent: '#F2C4CE',
        wall1: '#4A2A4E', wall2: '#D98BA4', haze: '#FFD2C0',
      },
      props: ['keg', 'chair', 'cooler', 'crate'],
      far(ctx, w, h) {
        sky(ctx, w, h, [[0, '#4A3A6E'], [0.3, '#9C6E92'], [0.58, '#E79C86'], [0.8, '#F7C79A'], [1, '#FCE7C8']]);
        const g = ctx.createRadialGradient(w * 0.3, h * 0.66, 10, w * 0.3, h * 0.66, 340);
        g.addColorStop(0, U.rgba('#FFF4DC', 0.9));
        g.addColorStop(0.35, U.rgba('#FFB68C', 0.35));
        g.addColorStop(1, U.rgba('#FF9E7A', 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        skyline(ctx, w, h * 0.74, '#3C3350', null, 41);
        treeline(ctx, w, h * 0.8, '#2A2440', 46, 96, 15);
        // dogwoods in bloom
        for (let i = 0; i < 16; i++) {
          const x = 60 + i * 168 + U.hash(i, 21) * 70;
          const y = h * 0.81;
          ctx.strokeStyle = '#2A2028'; ctx.lineWidth = 7;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 6, y - 66); ctx.stroke();
          for (let b = 0; b < 12; b++) {
            const a = U.hash(i * 9 + b, 7) * U.TAU;
            const r = 22 + U.hash(i + b, 13) * 30;
            ctx.fillStyle = b % 3 === 0 ? '#F7DCE4' : '#EFC2D0';
            ctx.beginPath();
            ctx.arc(x + 6 + Math.cos(a) * r, y - 70 + Math.sin(a) * r * 0.7, 9 + U.hash(b, i) * 7, 0, U.TAU);
            ctx.fill();
          }
        }
      },
      mid(ctx, w, h) {
        const y = h * 0.86;
        // festoon lights strung across the field
        for (let row = 0; row < 3; row++) {
          const yy = y - 150 - row * 40;
          ctx.strokeStyle = '#1B1620'; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-20, yy);
          for (let x = 0; x < w + 60; x += 180) ctx.quadraticCurveTo(x + 90, yy + 34, x + 180, yy);
          ctx.stroke();
          for (let x = 10; x < w; x += 36) {
            const sag = Math.sin((x / 180) * Math.PI) * 30;
            ctx.fillStyle = '#FFE0A8';
            ctx.beginPath(); ctx.arc(x, yy + Math.abs(sag % 34), 4.5, 0, U.TAU); ctx.fill();
            ctx.fillStyle = U.rgba('#FFE0A8', 0.22);
            ctx.beginPath(); ctx.arc(x, yy + Math.abs(sag % 34), 13, 0, U.TAU); ctx.fill();
          }
        }
        backline(ctx, w, h * 0.92, this.S);
      },
    },

    {
      id: 'tredegar',
      name: 'TREDEGAR IRON WORKS',
      sub: 'The old foundry on the James · after dark',
      weather: 'embers',
      lightColors: ['#FF7A2A', '#FFB03C', '#C23A1E'],
      crowd: { density: 0.9, mood: 1.1 },
      S: {
        deck: '#3A3230', pit: '#181416', accent: '#E2622A',
        wall1: '#2A1410', wall2: '#8A2C16', haze: '#FF8A48',
      },
      props: ['ironbarrel', 'ironbarrel', 'anvil', 'speaker'],
      far(ctx, w, h) {
        sky(ctx, w, h, [[0, '#0B0F16'], [0.4, '#1B2430'], [0.72, '#41291F'], [1, '#6B3018']]);
        // furnace glow along the base
        const g = ctx.createLinearGradient(0, h * 0.6, 0, h);
        g.addColorStop(0, U.rgba('#FF6A20', 0));
        g.addColorStop(1, U.rgba('#FF6A20', 0.32));
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        // smokestacks
        for (let i = 0; i < 6; i++) {
          const x = 90 + i * 430 + U.hash(i, 31) * 90;
          const hh = 200 + U.hash(i, 5) * 150;
          ctx.fillStyle = '#131820';
          ctx.fillRect(x, h * 0.78 - hh, 28, hh);
          ctx.fillRect(x - 6, h * 0.78 - hh, 40, 14);
          ctx.fillStyle = U.rgba('#FF4A2A', 0.6);
          ctx.fillRect(x + 8, h * 0.78 - hh - 6, 12, 6);
          // smoke
          ctx.fillStyle = U.rgba('#8A7A70', 0.12);
          for (let s = 0; s < 5; s++) {
            ctx.beginPath();
            ctx.arc(x + 14 + s * 12, h * 0.78 - hh - 30 - s * 26, 22 + s * 9, 0, U.TAU);
            ctx.fill();
          }
        }
        skyline(ctx, w, h * 0.79, '#0E131B', '#FFB070', 73);
      },
      mid(ctx, w, h) {
        const y = h * 0.86;
        // brick arcade of the old works
        ctx.fillStyle = '#3A2018';
        ctx.fillRect(0, y - 190, w, 190);
        ctx.fillStyle = '#2A1710';
        for (let bx = 0; bx < w; bx += 26) {
          for (let by = 0; by < 190; by += 12) {
            if (U.hash(bx, by) > 0.45) ctx.fillRect(bx + (by % 24 ? 0 : 13), y - 190 + by, 24, 10);
          }
        }
        for (let i = 0; i < 12; i++) {
          const x = 40 + i * 215;
          ctx.fillStyle = '#0D0A0C';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y - 96);
          ctx.arc(x + 44, y - 96, 44, Math.PI, 0);
          ctx.lineTo(x + 88, y);
          ctx.closePath();
          ctx.fill();
          const g = ctx.createLinearGradient(x, y, x, y - 120);
          g.addColorStop(0, U.rgba('#FF7A2A', 0.42));
          g.addColorStop(1, U.rgba('#FF7A2A', 0));
          ctx.fillStyle = g; ctx.fill();
        }
        backline(ctx, w, h * 0.92, this.S);
      },
    },

    {
      id: 'belleisle',
      name: 'BELLE ISLE',
      sub: 'On the rocks in the middle of the James',
      weather: 'mist',
      lightColors: ['#6ED8E8', '#A8E8C0', '#F0D08A'],
      crowd: { density: 0.62, mood: 0.75 },
      S: {
        deck: '#6A6257', pit: '#22262A', accent: '#6ED8E8',
        wall1: '#123240', wall2: '#2E7E86', haze: '#BEE8EE',
      },
      props: ['log', 'cooler', 'rock', 'tube'],
      far(ctx, w, h) {
        sky(ctx, w, h, [[0, '#1C3550'], [0.35, '#4E7488'], [0.65, '#9CB8B0'], [0.88, '#E4C99C'], [1, '#F2DCB8']]);
        treeline(ctx, w, h * 0.66, '#1E3038', 50, 110, 61);
        // pipeline / railway bridge across the water
        ctx.fillStyle = '#20262C';
        ctx.fillRect(0, h * 0.66, w, 18);
        for (let x = 0; x < w; x += 110) {
          ctx.fillRect(x, h * 0.66 + 18, 14, 58);
          ctx.strokeStyle = '#20262C'; ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(x, h * 0.66); ctx.lineTo(x + 55, h * 0.66 - 34); ctx.lineTo(x + 110, h * 0.66);
          ctx.stroke();
        }
        // the river with rapids
        const g = ctx.createLinearGradient(0, h * 0.72, 0, h);
        g.addColorStop(0, '#3E6A72');
        g.addColorStop(1, '#22484E');
        ctx.fillStyle = g;
        ctx.fillRect(0, h * 0.72, w, h * 0.28);
        ctx.fillStyle = U.rgba('#DDF0F0', 0.5);
        for (let i = 0; i < 260; i++) {
          const x = U.hash(i, 77) * w;
          const y = h * 0.73 + U.hash(i, 88) * h * 0.2;
          ctx.fillRect(x, y, 10 + U.hash(i, 99) * 26, 2.5);
        }
        // boulders breaking the surface
        ctx.fillStyle = '#4A4A46';
        for (let i = 0; i < 26; i++) {
          const x = U.hash(i, 5) * w;
          const y = h * 0.76 + U.hash(i, 6) * h * 0.16;
          ctx.beginPath();
          ctx.ellipse(x, y, 16 + U.hash(i, 7) * 30, 9 + U.hash(i, 8) * 13, 0, 0, U.TAU);
          ctx.fill();
        }
      },
      mid(ctx, w, h) {
        const y = h * 0.88;
        ctx.fillStyle = '#3A3E3A';
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < w + 40; x += 60) {
          ctx.lineTo(x, y - 30 - U.hash(x, 3) * 46);
        }
        ctx.lineTo(w, y + 120); ctx.lineTo(0, y + 120);
        ctx.closePath();
        ctx.fill();
        treeline(ctx, w, y - 20, '#243028', 40, 88, 91);
        backline(ctx, w, h * 0.92, this.S);
      },
    },

    {
      id: 'backstage',
      name: 'BACKSTAGE',
      sub: 'Loading dock · after the last set',
      weather: 'moths',
      lightColors: ['#FFD08A', '#8AE0FF', '#FF6A6A'],
      crowd: { density: 0.45, mood: 1.2, vip: true },
      S: {
        deck: '#33353C', pit: '#131519', accent: '#FFD08A',
        wall1: '#181C26', wall2: '#3A4254', haze: '#FFE0A0',
      },
      props: ['flightcase', 'keg', 'amp', 'cone', 'trashcan'],
      far(ctx, w, h) {
        sky(ctx, w, h, [[0, '#070910'], [0.5, '#101726'], [1, '#1C2740']]);
        for (let i = 0; i < 160; i++) {
          const x = U.hash(i, 3) * w, y = U.hash(i, 4) * h * 0.55;
          ctx.fillStyle = U.rgba('#FFFFFF', 0.1 + U.hash(i, 5) * 0.5);
          ctx.fillRect(x, y, 2, 2);
        }
        skyline(ctx, w, h * 0.72, '#0A0E16', '#FFCE86', 131);
      },
      mid(ctx, w, h) {
        const y = h * 0.88;
        // warehouse wall + chain link
        ctx.fillStyle = '#1E222B';
        ctx.fillRect(0, y - 240, w, 240);
        ctx.fillStyle = '#242933';
        for (let x = 0; x < w; x += 8) ctx.fillRect(x, y - 240, 3, 240);
        // roll-up doors
        for (let i = 0; i < 7; i++) {
          const x = 70 + i * 370;
          ctx.fillStyle = '#2C3240';
          ctx.fillRect(x, y - 190, 210, 190);
          ctx.fillStyle = '#20252F';
          for (let yy = 0; yy < 190; yy += 14) ctx.fillRect(x, y - 190 + yy, 210, 8);
          ctx.fillStyle = '#F2C15A';
          ctx.font = '700 22px Barlow Condensed, Arial Narrow, sans-serif';
          ctx.fillText('DOCK ' + (i + 1), x + 12, y - 198);
        }
        // sodium lamps
        for (let i = 0; i < 6; i++) {
          const x = 180 + i * 420;
          ctx.strokeStyle = '#151922'; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(x, y - 240); ctx.lineTo(x, y - 300); ctx.lineTo(x + 40, y - 300); ctx.stroke();
          ctx.fillStyle = '#FFD08A';
          ctx.beginPath(); ctx.arc(x + 44, y - 296, 11, 0, U.TAU); ctx.fill();
          const g = ctx.createRadialGradient(x + 44, y - 296, 4, x + 44, y - 296, 180);
          g.addColorStop(0, U.rgba('#FFD08A', 0.32));
          g.addColorStop(1, U.rgba('#FFD08A', 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(x + 44, y - 296, 180, 0, U.TAU); ctx.fill();
        }
        backline(ctx, w, h * 0.92, this.S);
      },
    },
  ];

  /* ---------------------------------------------------------- lifecycle */

  STAGES.forEach((st) => {
    st.build = function () {
      if (st._built) return;
      st.farImg = layer(LW, VIEW_H, (c, w, h) => st.far(c, w, h));
      st.midImg = layer(LW, VIEW_H, (c, w, h) => st.mid.call(st, c, w, h));
      st.deckImg = layer(LW, 220, (c, w) => deck(c, w, 0, st.S));
      st.barImg = layer(LW, 140, (c, w) => barricade(c, w, 0, st.S));
      st._built = true;
    };
  });

  IB.STAGES = STAGES;
  IB.stageById = (id) => STAGES.find((s) => s.id === id) || STAGES[0];
  IB.drawDeckTo = deck;
})(window.IB);
