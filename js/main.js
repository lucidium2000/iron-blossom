/* Iron Blossom — boot, input, screen flow, arcade ladder, HUD. */
(function (IB) {
  'use strict';
  const U = IB.U, V = IB.VIEW;

  const $ = (id) => document.getElementById(id);
  const canvas = $('cv');
  const game = new IB.Game(canvas);

  let screen = 'title';
  let mode = 'arcade';
  let ladder = null;

  /* ---------------------------------------------------------------- fit */

  function fit() {
    const el = $('stage');
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    el.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
  }
  window.addEventListener('resize', fit);
  fit();

  /* -------------------------------------------------------------- input */

  const held = Object.create(null);
  const pressed = Object.create(null);

  const MAP1 = { KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down',
    KeyJ: 'light', KeyK: 'heavy', KeyL: 'kick', KeyU: 'grab', KeyI: 'special' };
  const MAP2 = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    Digit1: 'light', Digit2: 'heavy', Digit3: 'kick', Digit4: 'grab', Digit5: 'special',
    Numpad1: 'light', Numpad2: 'heavy', Numpad3: 'kick', Numpad4: 'grab', Numpad5: 'special' };

  const BLOCK_DEFAULT = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];

  // Prefer KeyboardEvent.code so the WASD block stays put on non-QWERTY
  // layouts, but fall back to .key where code isn't populated.
  function codeOf(e) {
    if (e.code) return e.code;
    const k = e.key;
    if (!k) return '';
    if (k.length === 1) {
      if (k >= '0' && k <= '9') return 'Digit' + k;
      const u = k.toUpperCase();
      if (u >= 'A' && u <= 'Z') return 'Key' + u;
    }
    return k;
  }

  window.addEventListener('keydown', (e) => {
    IB.Audio.init();
    const code = codeOf(e);
    if (BLOCK_DEFAULT.indexOf(code) >= 0) e.preventDefault();
    if (!held[code]) pressed[code] = true;
    held[code] = true;
    if (code === 'Escape') {
      if (screen === 'fight') togglePause();
      else if ($('howto').classList.contains('on')) closeVeil('howto');
    }
    if (code === 'Enter' && screen === 'title') go('arcade');
  });
  window.addEventListener('keyup', (e) => { held[codeOf(e)] = false; });
  window.addEventListener('blur', () => { for (const k in held) held[k] = false; });
  window.addEventListener('pointerdown', () => IB.Audio.init(), { once: false });

  const touchState = Object.create(null);

  function readInput(map, tPrefix) {
    const inp = { left: false, right: false, up: false, down: false, p: {} };
    for (const code in map) {
      const act = map[code];
      if (held[code]) inp[act] = true;
      if (pressed[code]) inp.p[act] = true;
    }
    if (tPrefix) {
      for (const k in touchState) {
        if (k.indexOf(tPrefix) !== 0) continue;
        const act = k.slice(tPrefix.length);
        if (touchState[k] === 1) { inp[act] = true; inp.p[act] = true; touchState[k] = 2; }
        else if (touchState[k] === 2) inp[act] = true;
      }
    }
    // held flags for the action buttons so `inp.up` works for supers
    inp.p.up = inp.p.up || false;
    return inp;
  }

  function clearPressed() { for (const k in pressed) delete pressed[k]; }

  /* ------------------------------------------------------------ screens */

  function show(name) {
    screen = name;
    ['title', 'select'].forEach((s) => $(s).classList.toggle('on', s === name));
    $('hud').classList.toggle('on', name === 'fight');
    $('touch').classList.toggle('on', name === 'fight' && isTouch);
    if (name === 'title') IB.Audio.playTrack('title');
    if (name === 'select') IB.Audio.playTrack('select');
  }

  function openVeil(id) { $(id).classList.add('on'); }
  function closeVeil(id) { $(id).classList.remove('on'); }

  document.querySelectorAll('[data-close]').forEach((b) =>
    b.addEventListener('click', () => closeVeil(b.dataset.close)));

  document.querySelectorAll('[data-go]').forEach((b) =>
    b.addEventListener('click', () => go(b.dataset.go)));

  function go(what) {
    IB.Audio.init();
    IB.Audio.sfx('confirm');
    if (what === 'howto') { openVeil('howto'); return; }
    mode = what;
    ladder = null;
    sel.p1 = null; sel.p2 = null;
    sel.step = 1;
    sel.stage = 0;
    if (what === 'arcade') sel.stage = 0;
    buildSelect();
    show('select');
  }

  /* ------------------------------------------------------- select screen */

  const sel = { p1: null, p2: null, step: 1, stage: 0, hover: null };
  const iconCanvases = [];

  function buildSelect() {
    const grid = $('grid');
    grid.innerHTML = '';
    iconCanvases.length = 0;
    IB.ROSTER.forEach((c, i) => {
      const cell = document.createElement('button');
      cell.className = 'cell';
      cell.dataset.i = i;
      const cv = document.createElement('canvas');
      cv.width = 200; cv.height = 200;
      cell.appendChild(cv);
      const nm = document.createElement('span');
      nm.className = 'nm';
      nm.textContent = c.name;
      cell.appendChild(nm);
      const pip = document.createElement('span');
      pip.className = 'pip';
      cell.appendChild(pip);
      cell.addEventListener('mouseenter', () => { sel.hover = i; IB.Audio.sfx('ui', true); paintCards(); });
      cell.addEventListener('focus', () => { sel.hover = i; paintCards(); });
      cell.addEventListener('click', () => choose(i));
      grid.appendChild(cell);
      iconCanvases.push({ cv, ctx: cv.getContext('2d'), c, cell, pip });
    });

    const sp = $('stagePick');
    sp.innerHTML = '';
    IB.STAGES.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'spill' + (i === sel.stage ? ' on' : '');
      b.textContent = s.name;
      b.addEventListener('click', () => {
        sel.stage = i;
        IB.Audio.sfx('ui', true);
        sp.querySelectorAll('.spill').forEach((x, k) => x.classList.toggle('on', k === i));
      });
      sp.appendChild(b);
    });
    sp.parentElement.style.opacity = mode === 'arcade' ? 0.35 : 1;
    sp.style.pointerEvents = mode === 'arcade' ? 'none' : 'auto';

    $('selStep').textContent = mode === 'versus' ? 'Player 1' : mode === 'arcade' ? 'Festival Run' : 'Player 1';
    sel.step = 1;
    updateSelUI();
    paintCards();
  }

  function choose(i) {
    const c = IB.ROSTER[i];
    IB.Audio.sfx('confirm');
    // preview the act's own theme the moment you lock them in
    IB.Audio.playTrack(c.id);
    if (sel.step === 1) {
      sel.p1 = c;
      if (mode === 'versus') { sel.step = 2; $('selStep').textContent = 'Player 2'; }
      else { sel.step = 3; $('selStep').textContent = 'Opponent'; }
    } else if (sel.step === 2 || sel.step === 3) {
      sel.p2 = c;
      sel.step = 4;
      $('selStep').textContent = 'Ready';
    } else {
      sel.p1 = c; sel.p2 = null; sel.step = mode === 'versus' ? 2 : 3;
      $('selStep').textContent = mode === 'versus' ? 'Player 2' : 'Opponent';
    }
    if (mode === 'arcade' && sel.p1) { sel.step = 4; sel.p2 = null; $('selStep').textContent = 'Ready'; }
    updateSelUI();
    paintCards();
  }

  function updateSelUI() {
    iconCanvases.forEach((o, i) => {
      o.cell.classList.toggle('p1', sel.p1 === IB.ROSTER[i]);
      o.cell.classList.toggle('p2', sel.p2 === IB.ROSTER[i]);
      o.pip.textContent = sel.p1 === IB.ROSTER[i] ? 'P1' : sel.p2 === IB.ROSTER[i] ? 'P2' : '';
    });
    $('goBtn').disabled = mode === 'arcade' ? !sel.p1 : !(sel.p1 && sel.p2);
  }

  function cardHTML(c, who) {
    if (!c) {
      return '<div class="who" style="color:#4E4859">' + who + '</div>' +
        '<div class="tag">Nobody yet.</div>';
    }
    return '<div class="who" style="color:' + c.ui[0] + '">' + c.name + '</div>' +
      '<div class="tag">' + c.tag + '</div>' +
      '<div class="slot">' + c.slot + '</div>' +
      '<canvas class="pcanvas" width="600" height="412"></canvas>' +
      '<div class="blurb">' + c.blurb + '</div>' +
      '<div class="arch">' + c.archetype + '</div>' +
      '<div class="movebox">' +
      '<div class="mlabel">Special · 50%</div>' +
      '<div class="mname" style="color:' + c.ui[0] + '">' + c.special.name + '</div>' +
      '<div class="mdesc">' + c.special.desc + '</div>' +
      '<div class="mlabel" style="margin-top:7px">Second special · 50% · hold down</div>' +
      '<div class="mname" style="color:' + c.ui[1] + '">' + c.special2.name + '</div>' +
      '<div class="mdesc">' + c.special2.desc + '</div>' +
      '<div class="mlabel" style="margin-top:7px">Super · 100%</div>' +
      '<div class="mname" style="color:' + c.ui[0] + '">' + c.superMove.name + '</div>' +
      '</div>';
  }

  let card1Char = undefined, card2Char = undefined;

  function paintCards() {
    const hover = sel.hover !== null ? IB.ROSTER[sel.hover] : null;
    const left = sel.p1 || hover;
    const right = mode === 'arcade' ? null : (sel.p2 || (sel.p1 ? hover : null));
    if (left !== card1Char) { $('card1').innerHTML = cardHTML(left, 'Player 1'); card1Char = left; }
    if (right !== card2Char) {
      $('card2').innerHTML = mode === 'arcade'
        ? '<div class="who" style="color:#4E4859">THE BILL</div><div class="tag">Five sets, five stages.</div>' +
          '<div class="blurb" style="margin-top:10px">' + IB.STAGES.map((s) =>
            '<div style="padding:5px 0;border-bottom:1px solid rgba(242,237,226,.1)"><b style="color:#E8B33C">' +
            s.name + '</b><br><span style="font-size:13.5px;color:#A79FB2">' + s.sub + '</span></div>').join('') +
          '</div>'
        : cardHTML(right, 'Player 2');
      card2Char = right;
    }
  }

  $('backBtn').addEventListener('click', () => { IB.Audio.sfx('ui', false); show('title'); });
  // leaving select for the title puts the title theme back on

  $('goBtn').addEventListener('click', startFromSelect);

  /* --------------------------------------------------------- match flow */

  const LADDER_STAGES = ['ironstage', 'blossom', 'belleisle', 'tredegar', 'backstage'];
  const LADDER_DIFF = ['easy', 'easy', 'normal', 'hard', 'boss'];

  function startFromSelect() {
    IB.Audio.sfx('confirm');
    if (mode === 'arcade') {
      const pool = IB.ROSTER.filter((c) => c !== sel.p1);
      // shuffle, then always close on a headliner for the backstage set
      for (let i = pool.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
      }
      const finals = pool.filter((c) => c.id === 'jackwhite' || c.id === 'lcd');
      const boss = finals[0] || pool[0];
      const rest = pool.filter((c) => c !== boss).slice(0, 4);
      ladder = { i: 0, foes: rest.concat([boss]) };
      startMatch(sel.p1, ladder.foes[0], LADDER_STAGES[0], 'arcade', LADDER_DIFF[0]);
    } else if (mode === 'versus') {
      startMatch(sel.p1, sel.p2, IB.STAGES[sel.stage].id, 'versus');
    } else {
      startMatch(sel.p1, sel.p2, IB.STAGES[sel.stage].id, 'single', 'normal');
    }
  }

  function startMatch(p1, p2, stageId, m, diff) {
    game.setup({ p1, p2, stageId, mode: m === 'arcade' ? 'arcade' : m, aiLevel: diff, rounds: 2 });
    game.onMatchEnd = onMatchEnd;
    $('n1').textContent = p1.name;
    $('n2').textContent = p2.name;
    $('n1').style.color = p1.ui[0];
    $('n2').style.color = p2.ui[0];
    $('stagetag').textContent = game.stage.name + ' · ' + game.stage.sub;
    $('nowplay').textContent = (m === 'arcade'
      ? 'Set ' + (ladder.i + 1) + ' of ' + ladder.foes.length + ' · '
      : '') + 'Now playing — ' + p2.name;
    renderPips();
    show('fight');
    closeVeil('result');
  }

  function renderPips() {
    [['w1', game.p1], ['w2', game.p2]].forEach(([id, f]) => {
      const el = $(id);
      el.innerHTML = '';
      for (let i = 0; i < game.rounds; i++) {
        const d = document.createElement('i');
        d.className = 'pip2' + (i < f.wins ? ' won' : '');
        el.appendChild(d);
      }
    });
  }

  function onMatchEnd(winner, loser) {
    const playerWon = winner === game.p1;
    $('rLabel').textContent = playerWon ? (mode === 'arcade' ? 'Set complete' : 'Winner') : 'Defeat';
    $('rName').textContent = winner.char.name;
    $('rName').style.color = winner.char.ui[0];
    $('rQuote').textContent = '“' + winner.char.winQuote + '”';
    const next = $('nextBtn');
    if (mode === 'arcade' && playerWon) {
      if (ladder.i + 1 < ladder.foes.length) { next.textContent = 'Next set'; next.dataset.act = 'next'; }
      else { $('rLabel').textContent = 'You closed the festival'; next.textContent = 'Back to title'; next.dataset.act = 'title'; }
    } else if (mode === 'arcade') {
      next.textContent = 'Try again'; next.dataset.act = 'retry';
    } else {
      next.textContent = 'Rematch'; next.dataset.act = 'rematch';
    }
    setTimeout(() => openVeil('result'), 900);
  }

  $('nextBtn').addEventListener('click', () => {
    const act = $('nextBtn').dataset.act;
    IB.Audio.sfx('confirm');
    closeVeil('result');
    if (act === 'next') {
      ladder.i++;
      startMatch(sel.p1, ladder.foes[ladder.i], LADDER_STAGES[ladder.i], 'arcade', LADDER_DIFF[ladder.i]);
    } else if (act === 'retry') {
      startMatch(sel.p1, ladder.foes[ladder.i], LADDER_STAGES[ladder.i], 'arcade', LADDER_DIFF[ladder.i]);
    } else if (act === 'rematch') {
      startMatch(game.p1.char, game.p2.char, game.stage.id, mode, game.ai2 ? game.ai2.levelName : undefined);
    } else {
      show('title');
    }
  });
  $('rQuit').addEventListener('click', () => { closeVeil('result'); show('title'); });

  function togglePause() {
    game.paused = !game.paused;
    $('pause').classList.toggle('on', game.paused);
  }
  $('resumeBtn').addEventListener('click', togglePause);
  $('howto2').addEventListener('click', () => openVeil('howto'));
  $('quitBtn').addEventListener('click', () => {
    game.paused = false; closeVeil('pause'); show('title');
  });

  /* ------------------------------------------------------------- toggles */

  let musicOn = true, sfxOn = true;
  $('tgMusic').addEventListener('click', () => {
    musicOn = !musicOn; IB.Audio.setMusic(musicOn);
    $('tgMusic').classList.toggle('off', !musicOn);
  });
  $('tgSfx').addEventListener('click', () => {
    sfxOn = !sfxOn; IB.Audio.setSfx(sfxOn);
    $('tgSfx').classList.toggle('off', !sfxOn);
  });

  /* --------------------------------------------------------------- touch */

  const isTouch = window.matchMedia('(hover: none)').matches;
  if (isTouch) {
    const pads = [
      ['left', 36, 560, '◀'], ['right', 122, 560, '▶'],
      ['up', 79, 480, '▲'], ['down', 79, 636, '▼'],
      ['light', 1040, 590, 'L'], ['heavy', 1122, 546, 'H'],
      ['kick', 1160, 626, 'K'], ['grab', 1046, 500, 'G'], ['special', 1140, 460, 'SP'],
    ];
    const wrap = $('touch');
    pads.forEach(([act, x, y, label]) => {
      const b = document.createElement('div');
      b.className = 'tpad' + (act === 'special' ? ' wide' : '');
      b.textContent = label;
      b.style.left = x + 'px';
      b.style.top = y + 'px';
      const key = 'p1' + act;
      const on = (e) => { e.preventDefault(); if (!touchState[key]) touchState[key] = 1; };
      const off = (e) => { e.preventDefault(); touchState[key] = 0; };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('pointerleave', off);
      wrap.appendChild(b);
    });
  }

  /* ----------------------------------------------------------------- HUD */

  const hpEase = { 1: 1, 2: 1 };

  function updateHUD() {
    const p1 = game.p1, p2 = game.p2;
    if (!p1) return;
    // the encore is the winner's set, not a scoreline
    $('hudtop').classList.toggle('hide', game.roundState === 'encore');
    $('nowplay').style.opacity = game.roundState === 'encore' ? 0 : 1;
    if (game.roundState === 'encore') return;
    [[p1, 'h1', 'g1', 'm1', 'mw1', 1], [p2, 'h2', 'g2', 'm2', 'mw2', 2]].forEach(([f, h, g, m, mw, k]) => {
      const pct = U.clamp(f.hp / f.maxHp, 0, 1);
      hpEase[k] = Math.max(pct, hpEase[k] - 0.006);
      const bar = $(h);
      bar.style.width = (pct * 100) + '%';
      bar.classList.toggle('low', pct < 0.3);
      $(g).style.width = (hpEase[k] * 100) + '%';
      $(m).style.width = (f.meter) + '%';
      $(mw).classList.toggle('full', f.meter >= 100);
    });
    const t = Math.ceil(game.timer);
    const c = $('clock');
    c.textContent = t < 10 ? '0' + t : String(t);
    c.classList.toggle('warn', t <= 10);
    $('roundLbl').textContent = 'Round ' + game.roundNum;
    renderPips();
  }

  /* ---------------------------------------------------------------- loop */

  let last = performance.now();
  const selCtx = { t: 0 };

  let frameErrors = 0;

  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;

    // A throw inside the loop would otherwise stop requestAnimationFrame for
    // good and read to the player as a hard crash. Keep running and report.
    try {
      if (screen === 'fight') {
        const inputs = { p1: readInput(MAP1, 'p1'), p2: readInput(MAP2, null) };
        game.update(dt, inputs);
        game.render();
        updateHUD();
      } else {
        drawMenuBackdrop(dt);
        if (screen === 'select') drawSelectArt(dt);
      }
    } catch (e) {
      if (frameErrors++ < 5) console.error('Iron Blossom frame error:', e);
    }
    clearPressed();
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------- menu canvas backdrop */

  const menuStage = IB.stageById('ironstage');
  let menuReady = false;
  const menuCam = { x: 260, y: 0, zoom: 1, shake: 0 };
  let menuCrowd = null;
  const menuFX = new IB.FX();

  function drawMenuBackdrop(dt) {
    const ctx = game.ctx;
    if (!menuReady) {
      menuStage.build();
      menuCrowd = new IB.Crowd(menuStage);
      menuFX.initWeather('confetti');
      menuReady = true;
    }
    selCtx.t += dt;
    menuCam.x = 260 + Math.sin(selCtx.t * 0.11) * 200;
    menuCrowd.update(dt, menuCam.x + 640);
    menuFX.update(dt);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, V.W, V.H);
    ctx.drawImage(menuStage.farImg, -((menuCam.x * 0.22) % 1200) - 100, 0);
    ctx.drawImage(menuStage.midImg, -((menuCam.x * 0.42) % 1300) - 100, 0);
    menuCrowd.draw(ctx, menuCam, selCtx.t * 2);
    ctx.drawImage(menuStage.barImg, -(menuCam.x * 0.68) % 1400 - 100, V.BARRICADE_Y + 30);
    game.drawStageLights(ctx, menuStage, menuCam, selCtx.t * 2);
    ctx.drawImage(menuStage.deckImg, -(menuCam.x % 1300) - 100, V.GROUND_Y);
    menuFX.drawWeatherFront(ctx, menuCam);

    // darken behind the menus so type stays readable
    const g = ctx.createLinearGradient(0, 0, 0, V.H);
    g.addColorStop(0, 'rgba(11,9,16,.40)');
    g.addColorStop(0.5, 'rgba(11,9,16,.26)');
    g.addColorStop(1, 'rgba(11,9,16,.66)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, V.W, V.H);
  }

  function drawSelectArt(dt) {
    // roster icons
    iconCanvases.forEach((o) => {
      const c = o.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, 200, 200);
      const g = c.createLinearGradient(0, 0, 0, 200);
      g.addColorStop(0, o.c.ui[1]);
      g.addColorStop(1, '#171320');
      c.globalAlpha = 0.5;
      c.fillStyle = g;
      c.fillRect(0, 0, 200, 200);
      c.globalAlpha = 1;
      IB.Art.icon(c, o.c, 100, 200, selCtx.t);
    });
    // big portraits in the side cards
    document.querySelectorAll('.pcanvas').forEach((cv) => {
      const card = cv.closest('.sidecard');
      const ch = card.id === 'card1' ? card1Char : card2Char;
      if (!ch) return;
      const c = cv.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, cv.width, cv.height);
      const g = c.createRadialGradient(300, 300, 20, 300, 300, 300);
      g.addColorStop(0, U.rgba(ch.ui[0], 0.30));
      g.addColorStop(1, U.rgba(ch.ui[0], 0));
      c.fillStyle = g;
      c.fillRect(0, 0, cv.width, cv.height);
      IB.Art.portrait(c, ch, 300, 30, 520, selCtx.t);
    });
  }

  show('title');
  requestAnimationFrame(frame);
  window.IBGAME = game;
})(window.IB);
