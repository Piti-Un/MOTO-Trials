// =============================================================
//  Moto Trials — Game Logic
//  Depends on: levels.js · level-manager.js (loaded first in HTML)
// =============================================================

// ── Audio System ──────────────────────────────────────────────
const sfx = {
  ctx: null, engineOsc: null, engineGain: null, filter: null, musicSrc: null,
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 300;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    
    this.engineOsc.connect(this.filter);
    this.filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
    
    this.startMusic();
  },
  playTone(freq, type, duration, vol) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + duration);
  },
  playStar()  { if (this.ctx) { this.playTone(880, 'sine', 0.1, 0.2); setTimeout(() => this.playTone(1108.73, 'sine', 0.3, 0.2), 100); } },
  playWin()   { if (this.ctx) [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => setTimeout(() => this.playTone(f, 'square', 0.3, 0.1), i * 150)); },
  playCrash() {
    if (!this.ctx) return;
    const len = this.ctx.sampleRate * 0.4;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const dat = buf.getChannelData(0);
    for (let i=0; i<len; i++) dat[i] = Math.random()*2-1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    noise.connect(lp); lp.connect(gain); gain.connect(this.ctx.destination);
    noise.start();
  },
  updateEngine(vx, gas) {
    if (!this.ctx || !this.engineOsc) return;
    const targetFreq = 30 + Math.abs(vx) * 6 + (gas ? 25 : 0);
    const targetFilt = 150 + Math.abs(vx) * 20 + (gas ? 150 : 0);
    const targetVol = (game && game.over) ? 0 : (gas ? 0.35 : 0.15);
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
    this.filter.frequency.setTargetAtTime(targetFilt, this.ctx.currentTime, 0.1);
    this.engineGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.05);
  },
  startMusic() {
    if (this.musicSrc || !this.ctx) return;
    const sr = this.ctx.sampleRate, bps = 2.5, beatLen = sr/bps, len = beatLen*8;
    const buf = this.ctx.createBuffer(1, len, sr), dat = buf.getChannelData(0);
    const notes = [110, 0, 110, 130.8, 146.8, 0, 146.8, 164.8];
    for (let i=0; i<len; i++) {
        const t = i/sr, noteIdx = Math.floor(t/(1/bps/2)) % notes.length;
        if (notes[noteIdx] === 0) continue;
        dat[i] = Math.sin(t*notes[noteIdx]*Math.PI*2) * Math.max(0, 1-(t%(1/bps/2))/(1/bps/2)) * 0.03;
    }
    this.musicSrc = this.ctx.createBufferSource();
    this.musicSrc.buffer = buf; this.musicSrc.loop = true;
    this.musicSrc.connect(this.ctx.destination); this.musicSrc.start();
  }
};

// ── Canvas ───────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
let ctx    = canvas.getContext('2d');
const CW = 787, CH = 400;



// ── State ─────────────────────────────────────────────────────
let game = null, raf = null, paused = false;
const TARGET_FPS = 60;
const FRAME_INTERVAL = 1000 / TARGET_FPS; // ~16.667 ms
let lastFrameTime = 0;
let currentLevel = null;
let gasDown = false, brakeDown = false;

// ── Touch & Mouse input ───────────────────────────────────────
const gasZone   = document.getElementById('gasZone');
const brakeZone = document.getElementById('brakeZone');

['touchstart', 'mousedown'].forEach(evt => {
  gasZone.addEventListener(evt,   e => { gasDown   = true;  e.preventDefault(); }, { passive:false });
  brakeZone.addEventListener(evt, e => { brakeDown = true;  e.preventDefault(); }, { passive:false });
});

['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(evt => {
  gasZone.addEventListener(evt,   e => { gasDown   = false; e.preventDefault(); }, { passive:false });
  brakeZone.addEventListener(evt, e => { brakeDown = false; e.preventDefault(); }, { passive:false });
});

// ── Keyboard input ────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key==='ArrowRight'||e.key==='d') gasDown   = true;
  if (e.key==='ArrowLeft' ||e.key==='a') brakeDown = true;
});
document.addEventListener('keyup', e => {
  if (e.key==='ArrowRight'||e.key==='d') gasDown   = false;
  if (e.key==='ArrowLeft' ||e.key==='a') brakeDown = false;
});

// ── Pause ─────────────────────────────────────────────────────
function togglePause() {
  paused = !paused;
  if (!paused && game && !game.over) raf = requestAnimationFrame(loop);
}

// =============================================================
//  Landing Page → Game transition
// =============================================================

/** Called by the landing page PLAY NOW button — fades out landing and shows level select */
function enterGame() {
  const lp = document.getElementById('landingPage');
  const ls = document.getElementById('levelSelect');
  if (!lp) return;

  lp.classList.add('lp-exit');                  // fade-out via CSS transition (0.6s)
  setTimeout(() => {
    lp.style.display = 'none';
    ls.style.display = 'flex';
    buildLevelGrid();
    updateHomeStars();
  }, 600);
}

// =============================================================
//  Level select UI
// =============================================================

/** Build (or rebuild) the level selection grid from LEVELS + LevelManager. */
function buildLevelGrid() {
  // Support both old grid and new horizontal grid
  const grid = document.getElementById('levelGrid');
  if (!grid) return;
  grid.innerHTML = '';

  LEVELS.forEach((lvl, idx) => {
    const unlocked = LevelManager.isUnlocked(lvl.id);
    const stars    = LevelManager.getStars(lvl.id);

    const card = document.createElement('div');
    card.className = 'ls-card' + (unlocked ? '' : ' locked');
    card.style.background = lvl.bgGradient;
    if (unlocked) card.onclick = () => selectLevel(lvl);

    const starHTML = [1,2,3].map(n =>
      `<span class="${n <= stars ? '' : 'empty'}">⭐</span>`
    ).join('');

    card.innerHTML = `
      <div class="ls-num">#${idx+1}</div>
      <div class="ls-card-emoji">${lvl.emoji}</div>
      <div class="ls-card-name">${lvl.name}</div>
      <div class="ls-card-desc">${lvl.description}</div>
      <div class="ls-diff" style="background:${lvl.diffColor}22;color:${lvl.diffColor};">${lvl.difficulty}</div>
      <div class="ls-stars">${starHTML}</div>
      ${!unlocked ? '<div class="ls-card-lock">🔒</div>' : ''}
    `;
    grid.appendChild(card);
  });
}

/** Transition: level-select → game */
function selectLevel(lvl) {
  closeTrackSheet();                                               // hide the overlay first
  currentLevel = lvl;
  document.getElementById('levelSelect').style.display = 'none';
  document.getElementById('gameScreen').style.display  = 'flex';
  startGame();
}

/** Transition: game → level-select (home screen) */
function showLevelSelect() {
  cancelAnimationFrame(raf);
  document.getElementById('gameScreen').style.display  = 'none';
  document.getElementById('overlay').style.display     = 'none';
  document.getElementById('levelSelect').style.display = 'flex';
  // Force-hide the track sheet regardless of CSS class state
  const sheet = document.getElementById('trackSheet');
  if (sheet) { sheet.style.display = 'none'; sheet.classList.add('hidden'); }
  buildLevelGrid();
  updateHomeStars();
}

/** Open the track-selection sheet over the home screen */
function openTrackSheet() {
  buildLevelGrid();
  const sheet = document.getElementById('trackSheet');
  if (sheet) {
    sheet.classList.remove('hidden');
    sheet.style.display = 'flex';
  }
}


/** Close the track-selection sheet */
function closeTrackSheet() {
  const sheet = document.getElementById('trackSheet');
  if (sheet) { sheet.style.display = 'none'; sheet.classList.add('hidden'); }
}

/** Play the first (or first unlocked) level immediately */
function playFirstLevel() {
  const totalStars = LevelManager.getTotalStars();
  // Find the first level player can access
  let target = LEVELS[0];
  for (const lvl of LEVELS) {
    if ((lvl.reqStars || 0) <= totalStars) target = lvl;
    else break;
  }
  currentLevel = target;
  document.getElementById('levelSelect').style.display = 'none';
  document.getElementById('gameScreen').style.display  = 'flex';
  startGame();
}

/** Update the star badge on the home screen */
function updateHomeStars() {
  const badge = document.getElementById('homeStarBadge');
  if (badge) badge.textContent = '⭐ ' + LevelManager.getTotalStars();
}

// =============================================================
//  Game lifecycle
// =============================================================

function startGame() {
  if (!currentLevel) return;

  sfx.init();

  document.getElementById('overlay').style.display   = 'none';
  document.getElementById('controls').style.display  = 'flex';
  gasDown = brakeDown = false;
  paused  = false;

  const track = currentLevel.buildTrack();
  const tLen  = track[track.length-1].x;

  game = {
    track,
    trackLen:   tLen,
    cam:        0,
    dist:       0,
    stars:      0,    // flags collected (0-3)
    coins:      0,    // kept for display
    over:       false,
    won:        false,
    // ── 3 checkpoint flags at 33%, 66%, 100% of track ──
    flagPositions: [
      Math.round(tLen * 0.33),
      Math.round(tLen * 0.66),
      Math.round(tLen * 1.00) - 80,
    ],
    flagsHit: [false, false, false],
    bike: {
      x:120, y:200,
      vx:0, vy:0,
      angle:0, angV:0,
      onGround: false,
      wheelR:   18,
      crashT:   0,
      skinId:   LevelManager.getEquippedSkin()
    },
    bgClouds:   [{x:100,y:60},{x:280,y:40},{x:420,y:70},{x:600,y:50},{x:800,y:65}],
    particles:  [],
    frameCount: 0,
    trailPts:   [],
  };
  game.camY = game.bike.y - CH * 0.6; // Initialize vertical camera

  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}

function endGame(won) {
  game.over = true;
  game.won  = won;
  cancelAnimationFrame(raf);
  document.getElementById('controls').style.display = 'none';

  sfx.updateEngine(0, false); // Kill engine noise immediately
  if (won) sfx.playWin();

  const delay = won ? 500 : 1200;
  setTimeout(() => {
    // Stars = number of flags collected
    const earnedStars = game.flagsHit.filter(Boolean).length;
    if (won && currentLevel) {
      LevelManager.complete(currentLevel.id, earnedStars, 3);
    }

    const ov      = document.getElementById('overlay');
    const emoji   = won ? '🏆' : '💥';
    const title   = won ? 'Level Complete!' : 'GAME OVER';
    const subText = won
      ? `${game.dist}m · ${earnedStars}/3 flags`
      : `You made it ${game.dist}m`;

    const starHTML = [1,2,3].map(n =>
      `<span class="ov-star">${n <= earnedStars ? '⭐' : '🌑'}</span>`
    ).join('');

    document.getElementById('ovEmoji').textContent = emoji;
    document.getElementById('ovTitle').textContent = title;
    document.getElementById('ovStars').innerHTML   = won ? starHTML : '';
    document.getElementById('ovSub').textContent   = subText;
    ov.style.display = 'flex';
  }, delay);
}

// =============================================================
//  Main loop
// =============================================================

function loop(timestamp) {
  if (paused || !game || game.over) return;
  raf = requestAnimationFrame(loop);
  const elapsed = timestamp - lastFrameTime;
  if (elapsed < FRAME_INTERVAL) return; // skip frame — not time yet
  lastFrameTime = timestamp - (elapsed % FRAME_INTERVAL); // stay in sync
  update();
  draw();
}

// =============================================================
//  Physics update
// =============================================================

function update() {
  const g = game, b = g.bike;
  g.frameCount++;

  const MAX_GAS_FORCE = 0.44;
  const BRAKE_FORCE   = 0.26;
  const GRAVITY       = 0.42;
  const FRICTION      = 0.978;
  const ANG_DAMP      = 0.82;

  // Init physics state
  if (b.throttle    === undefined) b.throttle    = 0;
  if (b.wheelieT    === undefined) b.wheelieT    = 0;
  if (b.stoppieT    === undefined) b.stoppieT    = 0;
  if (b.suspension  === undefined) b.suspension  = 0;
  if (b.prevY       === undefined) b.prevY       = b.y;

  // ── Suspension compression (bounce from terrain impact) ──
  const verticalHit = b.y - b.prevY;
  if (b.onGround && verticalHit > 1.5) {
    b.suspension = Math.min(verticalHit * 0.6, 8); // compress on bump
  } else {
    b.suspension *= 0.75; // spring back
  }
  b.prevY = b.y;

  // ── Progressive Throttle ──
  if (gasDown && b.crashT === 0 && b.onGround) {
    b.throttle = Math.min(1, b.throttle + 0.012);
  } else {
    b.throttle = Math.max(0, b.throttle - 0.030);
  }

  const speed = Math.abs(b.vx);

  // ── 2-Wheel Physics ──
  b.vy += GRAVITY;

  if (b.crashT === 0) {
    if (gasDown) {
      const lean = b.onGround ? 0.016 : 0.007;
      b.angV -= lean;
      const throttleForce = MAX_GAS_FORCE * (0.15 + 0.85 * b.throttle);
      b.vx += Math.cos(b.angle) * (b.onGround ? throttleForce : MAX_GAS_FORCE * 0.06);
    }
    if (brakeDown) {
      b.angV += b.onGround ? 0.016 : 0.010;
      b.throttle = 0;
      b.vx -= b.onGround ? BRAKE_FORCE : (BRAKE_FORCE * 0.08);
    }
    if (!b.onGround && !gasDown && !brakeDown) {
      b.angV *= 0.90;
    }
  }

  // ── WHEELIE physics ──
  // Triggers when: on ground, going fast, throttle full, leaning back
  if (b.onGround && b.crashT === 0 && gasDown && b.throttle > 0.7 && speed > 5 && b.angle < -0.05) {
    b.wheelieT = Math.min(b.wheelieT + 1, 90);  // build up
    // Lift front wheel by boosting rear torque
    b.angV -= 0.025 * (b.throttle - 0.6);        // rear wheel digs in, front lifts
    if (b.wheelieT > 10) {
      // Spawn rear wheel smoke burst
      spawnParticles(b.x - Math.cos(b.angle)*28, b.y + Math.sin(b.angle)*5, '#c8a060', 2);
      spawnParticles(b.x - Math.cos(b.angle)*28, b.y + Math.sin(b.angle)*5, '#fff8e0', 1);
    }
  } else {
    b.wheelieT = Math.max(0, b.wheelieT - 3);  // decay
  }

  // ── STOPPIE physics ──
  // Triggers when: braking hard at speed
  if (b.onGround && b.crashT === 0 && brakeDown && speed > 6) {
    b.stoppieT = Math.min(b.stoppieT + 1, 60);
    if (b.stoppieT > 8) {
      // Front digs, rear lifts — reverse the lean effect
      b.angV -= 0.018; // front digs in creates lift force
      // Front wheel skid particles
      spawnParticles(b.x + Math.cos(b.angle)*28, b.y + Math.sin(b.angle)*5, '#808090', 3);
    }
  } else {
    b.stoppieT = Math.max(0, b.stoppieT - 4);
  }

  // ── Nitro burst at peak speed ──
  if (b.onGround && speed > 11 && g.frameCount % 3 === 0) {
    spawnParticles(
      b.x - Math.cos(b.angle)*30,
      b.y + (Math.random()-0.5)*6,
      '#ffaa00', 2
    );
  }

  // Speed cap
  const maxSpeed = 1 + 14 * b.throttle;
  b.vx = Math.max(-3, Math.min(b.vx, maxSpeed));
  b.x += b.vx; b.y += b.vy;
  b.angle += b.angV;
  b.angV  *= ANG_DAMP;
  b.vx    *= FRICTION;

  const WB = 20;
  const WR = b.wheelR;
  
  // Wheel positions
  let fx = b.x + Math.cos(b.angle) * WB;
  let fy = b.y + Math.sin(b.angle) * WB;
  let rx = b.x - Math.cos(b.angle) * WB;
  let ry = b.y - Math.sin(b.angle) * WB;

  const tfy = getTrackY(fx, g.track);
  const try_ = getTrackY(rx, g.track);


  const isFlying = !b.onGround;


  // ─ Speed Streaks ─
  if (speed > 4 && g.frameCount % 2 === 0) {
    const col = speed > 6 ? '#ffcc00' : 'rgba(255,255,255,0.6)';
    spawnParticles(
      b.x - Math.cos(b.angle) * 30 + (Math.random()-0.5)*8,
      b.y  - Math.sin(b.angle) * 5  + (Math.random()-0.5)*8,
      col, 1
    );
  }

  // ── Ground Collision ──
  // Keep a minimum margin even at speed so bumps don't launch the bike
  const margin = speed > 8 ? 3 : speed > 4 ? 5 : 8;

  // Slope-hug: if already on ground and terrain dips, pull bike down to follow it
  if (b.onGround) {
    const groundMid = (tfy + try_) / 2 - WR;
    if (b.y < groundMid - 2) b.y += Math.min((groundMid - b.y) * 0.4, 8);
  }

  b.onGround = false;
  let touchedCount = 0;

  if (fy + WR >= tfy - margin) { fy = tfy - WR; touchedCount++; }
  if (ry + WR >= try_ - margin) { ry = try_ - WR; touchedCount++; }

  if (touchedCount > 0) {
    const wasAirborne = !b.onGround && Math.abs(b.vy) > 3;
    b.onGround = true;
    b.wasLaunching = false;

    const dx = fx - rx, dy2 = fy - ry;
    if (Math.abs(dx) > 0.1 || Math.abs(dy2) > 0.1) {
      b.angle = Math.atan2(dy2, dx);
    }
    b.y = (fy + ry) / 2;

    // Landing impact dust
    if (wasAirborne) {
      const impact = Math.min(Math.abs(b.vy), 12);
      const dustCount = Math.floor(impact * 2.5);
      spawnParticles(b.x, b.y + WR, '#c8a060', dustCount);
      spawnParticles(b.x, b.y + WR, '#fff8e0', Math.floor(dustCount * 0.5));
    }

    b.vy *= -0.05;
    if (Math.abs(b.vy) < 0.8) b.vy = 0;
    b.angV *= 0.35;
  }


  // \u2500\u2500 Head Crash Detection \u2500\u2500
  // Rider head is roughly 25px straight up from the bike center
  let hx = b.x + Math.cos(b.angle - Math.PI/2) * 25;
  let hy = b.y + Math.sin(b.angle - Math.PI/2) * 25;
  if (hy >= getTrackY(hx, g.track) - 5 && b.crashT === 0) {
    b.crashT = 1;
    sfx.playCrash();
  }

  // Crash countdown
  if (b.crashT > 0) {
    b.crashT++;
    spawnCrashParticles(b.x, b.y);
    if (b.crashT > 80) endGame(false);
  }

  // ── Flag checkpoint detection ──
  if (b.crashT === 0) {
    game.flagPositions.forEach((fx, fi) => {
      if (!game.flagsHit[fi] && b.x >= fx) {
        game.flagsHit[fi] = true;
        sfx.playStar();
        game.stars = game.flagsHit.filter(Boolean).length;
        // Gold/star burst at flag position
        const fy = getTrackY(fx, g.track);
        spawnParticles(fx, fy - 60, '#ffe040', 14);
        spawnParticles(fx, fy - 60, '#ff8020', 8);

        // ── Unlock next level on FIRST star ──
        // Save progress & unlock next level every time a flag is collected
        if (currentLevel) {
          LevelManager.complete(currentLevel.id, game.stars, 3);
          updateHomeStars();
        }

        if (fi === 2) { endGame(true); } // 3rd flag = level complete
      }
    });
  }

  // Camera (Horizontal & Vertical)
  g.cam += (b.x - CW * 0.35 - g.cam) * 0.08;
  g.cam  = Math.max(0, g.cam);
  
  if (g.camY === undefined) g.camY = b.y - CH * 0.6;
  const targetCamY = b.y - CH * 0.6;
  g.camY += (targetCamY - g.camY) * 0.1;

  g.dist = Math.max(0, Math.round(b.x / 10));

  // Wheel trail
  if (b.onGround && g.frameCount % 3 === 0) {
    const bottomY = b.y + b.wheelR;
    g.trailPts.push({x:b.x, y:bottomY, life:40});
    
    // Custom Arctic Frost particles
    const skin = SKINS.find(s => s.id === (b.skinId || 'classic')) || SKINS[0];
    if (skin.colors && skin.colors.parts === 'snow') {
      const rx = b.x - Math.cos(b.angle) * 28;
      const ry = b.y - Math.sin(b.angle) * 28 + b.wheelR;
      spawnParticles(rx, ry, Math.random() > 0.5 ? '#ffffff' : '#add8e6', 2);
    }
  }
  g.trailPts.forEach(p => p.life--);
  g.trailPts = g.trailPts.filter(p => p.life > 0);

  // Cloud parallax
  g.bgClouds.forEach(cl => { cl.x -= 0.08; if (cl.x < -80) cl.x = CW + 80; });

  // Particles
  g.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--; });
  g.particles = g.particles.filter(p => p.life > 0);

  // HUD
  document.getElementById('distLabel').textContent  = g.dist + ' m';
  const throttlePct = Math.round((b.throttle || 0) * 100);
  const throttleBar = throttlePct >= 80 ? '🔥' : throttlePct >= 50 ? '⚡' : throttlePct >= 20 ? '💨' : '🐢';
  document.getElementById('speedLabel').textContent = throttleBar + ' ' + Math.abs(Math.round(b.vx * 10)) + ' km/h';
  document.getElementById('starLabel').textContent  = '★ ' + g.stars + '/3';

  sfx.updateEngine(b.vx, gasDown);
}

// =============================================================
//  Helpers
// =============================================================

function buildCoins(track) {
  const coins = [];
  for (let i = 5; i < track.length - 5; i += 12) {
    const pt = track[i];
    coins.push({ x:pt.x, y:pt.y - 35, collected:false });
  }
  return coins;
}

function getTrackY(x, track) {
  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i], b = track[i+1];
    if (x >= a.x && x <= b.x) return a.y + (x - a.x) / (b.x - a.x) * (b.y - a.y);
  }
  return track[track.length-1].y;
}

function getTrackAngle(x, track) {
  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i], b = track[i+1];
    if (x >= a.x && x <= b.x) return Math.atan2(b.y - a.y, b.x - a.x);
  }
  return 0;
}

function spawnParticles(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 3;
    game.particles.push({x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp-2, color, life:25+Math.random()*15});
  }
}

function spawnCrashParticles(x, y) {
  if (Math.random() > 0.4) {
    spawnParticles(x,    y,   '#ff6020', 2);
    spawnParticles(x, y-10,   '#ffcc00', 1);
  }
}

// =============================================================
//  Rendering
// =============================================================

function draw() {
  const g = game, b = g.bike, cam = Math.round(g.cam);
  const camY = Math.round(g.camY || 0);
  ctx.clearRect(0, 0, CW, CH);

  // Background is fixed relative to screen
  drawBackground(currentLevel ? currentLevel.theme : 'desert', cam, g);

  ctx.save();
  ctx.translate(0, -camY); // Apply vertical camera offset

  // Track shadow
  const tc = currentLevel ? currentLevel.trackColors : {surface:'#c03010',fill:'#a02808',dirt:'#8a2006'};
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 14;
  ctx.beginPath(); let started = false;
  g.track.forEach(pt => {
    const sx = pt.x - cam;
    if (sx < -20 || sx > CW+20) return;
    if (!started) { ctx.moveTo(sx, pt.y+6); started=true; } else ctx.lineTo(sx, pt.y+6);
  });
  ctx.stroke();

  // Track surface
  ctx.strokeStyle = tc.surface; ctx.lineWidth = 5;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); started = false;
  g.track.forEach(pt => {
    const sx = pt.x - cam;
    if (sx < -20 || sx > CW+20) return;
    if (!started) { ctx.moveTo(sx, pt.y); started=true; } else ctx.lineTo(sx, pt.y);
  });
  ctx.stroke();

  // Track fill
  const vis = g.track.filter(pt => { const sx=pt.x-cam; return sx>=-20 && sx<=CW+20; });
  if (vis.length > 0) {
    ctx.fillStyle = tc.fill; ctx.beginPath();
    ctx.moveTo(vis[0].x-cam, vis[0].y);
    vis.forEach(pt => ctx.lineTo(pt.x-cam, pt.y));
    const fillBottom = Math.max(camY + CH + 800, vis[vis.length-1].y + 800);
    ctx.lineTo(vis[vis.length-1].x-cam, fillBottom);
    ctx.lineTo(vis[0].x-cam, fillBottom);
    ctx.closePath(); ctx.fill();

    // Theme ground texture
    drawGroundTexture(currentLevel ? currentLevel.theme : 'desert', tc, vis, cam, g);
  }

  // Wheel trails
  const trailColor = tc.dirt;
  g.trailPts.forEach(pt => {
    ctx.fillStyle = `rgba(160,100,20,${pt.life/40*0.4})`;
    ctx.beginPath(); ctx.arc(pt.x-cam, pt.y+1, 4, 0, Math.PI*2); ctx.fill();
  });




  // Particles
  g.particles.forEach(p => {
    ctx.globalAlpha = p.life/40;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x-cam, p.y, 4, 0, Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Draw 3 checkpoint flags
  game.flagPositions.forEach((fx, fi) => {
    const screenX = fx - cam;
    if (screenX < -40 || screenX > CW + 40) return;
    const fy = getTrackY(fx, g.track);
    drawCheckeredFlag(screenX, fy, fi, game.flagsHit[fi], g.frameCount);
  });


  drawBike(b, cam, g.frameCount);
  
  ctx.restore(); // Restore vertical camera translation
}

// ── Checkered Flag (gold pole, waving banner) ──────────────────────────
function drawCheckeredFlag(sx, gy, index, collected, frame) {
  ctx.save();
  ctx.translate(sx, gy);

  const poleH = 88;
  const wave  = Math.sin(frame * 0.06 + index) * 4; // gentle wave

  // ─ Gold pole (gradient) ─
  const pg = ctx.createLinearGradient(-3, -poleH, 3, -poleH);
  pg.addColorStop(0, '#ffe080');
  pg.addColorStop(0.5, '#d4940a');
  pg.addColorStop(1, '#a06b00');
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.roundRect(-3, -poleH, 6, poleH+2, 2); ctx.fill();

  // ─ Base cap ─
  const bg = ctx.createLinearGradient(-8, 0, 8, 4);
  bg.addColorStop(0, '#ffe080'); bg.addColorStop(1, '#a06b00');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.roundRect(-8, -2, 16, 8, 3); ctx.fill();

  // ─ Ball finial on top ─
  ctx.fillStyle = '#ffd040';
  ctx.beginPath(); ctx.arc(0, -poleH-6, 5.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#ffe898';
  ctx.beginPath(); ctx.arc(-1.5, -poleH-7.5, 2, 0, Math.PI*2); ctx.fill();

  // ─ Flag banner (waving checkered, or gold glow if collected) ─
  if (collected) {
    // Collected = solid gold banner with star
    ctx.fillStyle = '#ffc820';
    ctx.shadowColor = '#ffe060'; ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, -poleH);
    ctx.lineTo(40 + wave, -poleH + 3);
    ctx.lineTo(42 + wave, -poleH + 22);
    ctx.lineTo(2, -poleH + 18);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    // star badge
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⭐', 20 + wave*0.4, -poleH + 15);
  } else {
    // Uncollected = animated black & white checkered
    const bW = 44, bH = 22;
    const COLS = 5, ROWS = 2;
    const cW = bW/COLS, cH = bH/ROWS;
    // Clip to banner shape
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, -poleH);
    ctx.lineTo(bW + Math.sin(frame*0.06+index+1)*3, -poleH + 2);
    ctx.lineTo(bW + wave, -poleH + bH);
    ctx.lineTo(0, -poleH + bH - 2);
    ctx.closePath(); ctx.clip();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // Slight horizontal wave per row
        const wo = Math.sin(frame*0.06 + index + c*0.3) * (r+1) * 2.5;
        ctx.fillStyle = (r+c)%2===0 ? '#fff' : '#111';
        ctx.fillRect(c*cW+wo, -poleH+r*cH, cW+1.5, cH+1);
        // Sheen
        if ((r+c)%2===0) {
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.fillRect(c*cW+wo, -poleH+r*cH, cW*0.5, cH*0.5);
        }
      }
    }
    ctx.restore();
    // Banner shadow top
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -poleH);
    ctx.lineTo(bW + Math.sin(frame*0.06+index+1)*3, -poleH+2);
    ctx.stroke();
  }

  // ─ Star index badge (1/2/3) below flag top ─
  if (!collected) {
    ctx.fillStyle = index === 2 ? '#ff4040' : '#ffb020';
    ctx.beginPath(); ctx.arc(0, -poleH+28, 9, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(index+1, 0, -poleH+32);
  }

  ctx.restore();
}

// ── Ground Texture (per-theme) ────────────────────────────────
// Called right after the ground fill polygon is drawn.
function drawGroundTexture(theme, tc, vis, cam, g) {
  if (vis.length < 2) return;
  const fc = g ? g.frameCount : 0;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.shadowBlur = 0;

  switch (theme) {

    // ─ Desert: sandy ripple waves + scattered rocks ─
    case 'desert': {
      ctx.strokeStyle = tc.dirt; ctx.lineWidth = 1.5;
      for (let i = 0; i < vis.length-4; i+=5) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath();
        ctx.moveTo(sx, pt.y+5);
        ctx.quadraticCurveTo(sx+8, pt.y+2, sx+16, pt.y+5);
        ctx.stroke();
      }
      // Rock pebbles
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      for (let i = 4; i < vis.length-4; i+=20) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.ellipse(sx, pt.y+10, 6, 3.5, 0.3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(sx+13, pt.y+18, 3.5, 2, -0.2, 0, Math.PI*2); ctx.fill();
      }
      break;
    }

    // ─ Angkor: earthy soil with grass blade tufts ─
    case 'angkor': {
      // Soil streaks
      ctx.strokeStyle = tc.dirt; ctx.lineWidth = 1.2;
      for (let i = 1; i < vis.length-2; i+=7) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.moveTo(sx, pt.y+4); ctx.lineTo(sx+18, pt.y+9); ctx.stroke();
      }
      // Grass tufts on surface
      ctx.lineWidth = 1.8;
      for (let i = 3; i < vis.length-3; i+=10) {
        const pt = vis[i], sx = pt.x-cam;
        const h = 7 + (i%3)*2;
        ctx.strokeStyle = i%4===0 ? '#509030' : '#407020';
        ctx.beginPath(); ctx.moveTo(sx, pt.y); ctx.quadraticCurveTo(sx+3, pt.y-h*0.6, sx+1, pt.y-h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx+6, pt.y); ctx.quadraticCurveTo(sx+3, pt.y-h*0.5, sx+5, pt.y-h+2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx+12, pt.y); ctx.quadraticCurveTo(sx+14, pt.y-h*0.7, sx+11, pt.y-h+1); ctx.stroke();
      }
      break;
    }

    // ─ Jungle: dense grass + mud puddles ─
    case 'jungle': {
      // Mud wavy strokes
      ctx.strokeStyle = 'rgba(10,25,5,0.5)'; ctx.lineWidth = 1;
      for (let i = 0; i < vis.length-4; i+=5) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.moveTo(sx, pt.y+6);
        ctx.quadraticCurveTo(sx+6, pt.y+3, sx+14, pt.y+7); ctx.stroke();
      }
      // Dense grass blades on surface
      ctx.lineWidth = 1.6;
      for (let i = 0; i < vis.length-2; i+=5) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.strokeStyle = i%3===0 ? '#3a8020' : (i%3===1 ? '#286015' : '#4aaa28');
        const h = 5+(i%4)*2;
        const lean = (i%2 ? 2 : -2);
        ctx.beginPath(); ctx.moveTo(sx, pt.y);
        ctx.quadraticCurveTo(sx+lean, pt.y-h*0.5, sx+lean*0.5, pt.y-h);
        ctx.stroke();
      }
      // Mud puddles
      ctx.fillStyle = 'rgba(5,12,3,0.5)';
      for (let i = 8; i < vis.length-8; i+=30) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.ellipse(sx, pt.y+8, 18, 5, 0, 0, Math.PI*2); ctx.fill();
        // Puddle highlight
        ctx.fillStyle = 'rgba(50,100,30,0.2)';
        ctx.beginPath(); ctx.ellipse(sx-4, pt.y+6, 8, 2, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(5,12,3,0.5)';
      }
      break;
    }

    // ─ City: grey asphalt with lane markings and cracks ─
    case 'city': {
      // White dashed centre line
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
      ctx.setLineDash([22, 12]);
      ctx.beginPath(); let sc = false;
      vis.forEach(pt => {
        const sx = pt.x-cam;
        if (!sc) { ctx.moveTo(sx, pt.y+7); sc=true; } else ctx.lineTo(sx, pt.y+7);
      });
      ctx.stroke(); ctx.setLineDash([]);
      // Yellow edge line
      ctx.strokeStyle = 'rgba(255,210,40,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); let se = false;
      vis.forEach(pt => {
        const sx = pt.x-cam;
        if (!se) { ctx.moveTo(sx, pt.y+1); se=true; } else ctx.lineTo(sx, pt.y+1);
      });
      ctx.stroke();
      // Asphalt cracks
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
      for (let i = 4; i < vis.length-4; i+=16) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.moveTo(sx, pt.y+3); ctx.lineTo(sx+5, pt.y+14); ctx.lineTo(sx+2, pt.y+22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx+5, pt.y+14); ctx.lineTo(sx+10, pt.y+18); ctx.stroke();
      }
      break;
    }

    // ─ Ruins: stone tile joints + moss patches ─
    case 'ruins': {
      ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1.5;
      // Vertical tile joints
      for (let i = 0; i < vis.length-2; i+=18) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.moveTo(sx, pt.y); ctx.lineTo(sx, pt.y+45); ctx.stroke();
      }
      // Horizontal joint (mid-stone)
      for (let i = 0; i < vis.length-4; i+=18) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.moveTo(sx, pt.y+22); ctx.lineTo(sx+18, pt.y+22); ctx.stroke();
      }
      // Moss in joints
      ctx.fillStyle = 'rgba(40,75,15,0.5)';
      for (let i = 6; i < vis.length-6; i+=22) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.ellipse(sx, pt.y+22, 5, 2.5, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(sx, pt.y+2, 3, 1.5, 0.2, 0, Math.PI*2); ctx.fill();
      }
      // Surface worn patches (lighter highlight)
      ctx.fillStyle = 'rgba(200,180,120,0.12)';
      for (let i = 2; i < vis.length-2; i+=25) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.ellipse(sx+5, pt.y+11, 8, 4, 0.2, 0, Math.PI*2); ctx.fill();
      }
      break;
    }

    // ─ Night: dark asphalt with neon glow edge + rain streaks ─
    case 'night': {
      // Glowing blue edge line
      ctx.strokeStyle = '#2050ff'; ctx.lineWidth = 3;
      ctx.shadowColor = '#4080ff'; ctx.shadowBlur = 8;
      ctx.beginPath(); let sn = false;
      vis.forEach(pt => {
        const sx = pt.x-cam;
        if (!sn) { ctx.moveTo(sx, pt.y+1); sn=true; } else ctx.lineTo(sx, pt.y+1);
      });
      ctx.stroke(); ctx.shadowBlur = 0;
      // Glowing pink secondary line
      ctx.strokeStyle = 'rgba(255,40,160,0.4)'; ctx.lineWidth = 2;
      ctx.shadowColor = '#ff30b0'; ctx.shadowBlur = 5;
      ctx.beginPath(); let sn2 = false;
      vis.forEach(pt => {
        const sx = pt.x-cam;
        if (!sn2) { ctx.moveTo(sx, pt.y+5); sn2=true; } else ctx.lineTo(sx, pt.y+5);
      });
      ctx.stroke(); ctx.shadowBlur = 0;
      // Rain puddle streaks
      ctx.strokeStyle = 'rgba(60,80,150,0.3)'; ctx.lineWidth = 1;
      for (let i = 2; i < vis.length-2; i+=10) {
        const pt = vis[i], sx = pt.x-cam;
        const off = (fc*0.5+i*7.3)%20 - 10;
        ctx.beginPath(); ctx.moveTo(sx+off, pt.y+8); ctx.lineTo(sx+off+2, pt.y+22); ctx.stroke();
      }
      break;
    }

    // ─ Rocky: jagged cracks and rock face lines ─
    case 'rocky': {
      ctx.strokeStyle = 'rgba(80,60,30,0.5)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < vis.length-4; i+=8) {
        const pt = vis[i], sx = pt.x-cam;
        const jag = (i%3-1)*4;
        ctx.beginPath(); ctx.moveTo(sx, pt.y+3); ctx.lineTo(sx+6, pt.y+3+jag); ctx.lineTo(sx+14, pt.y+5); ctx.stroke();
      }
      // Big rock boulders
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      for (let i = 6; i < vis.length-6; i+=25) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.ellipse(sx+4, pt.y+6, 12, 7, 0.4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(160,130,80,0.15)';
        ctx.beginPath(); ctx.ellipse(sx-2, pt.y+4, 6, 3, -0.3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
      }
      // Gravel chips
      ctx.fillStyle = 'rgba(100,80,50,0.4)';
      for (let i = 2; i < vis.length-2; i+=10) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.arc(sx+3, pt.y+2, 1.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx+9, pt.y+8, 1, 0, Math.PI*2); ctx.fill();
      }
      break;
    }

    // ─ Canyon: red-rock layered strata ─
    case 'canyon': {
      ctx.strokeStyle = 'rgba(120,40,10,0.5)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < vis.length-3; i+=6) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.moveTo(sx, pt.y+8); ctx.lineTo(sx+20, pt.y+8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, pt.y+18); ctx.lineTo(sx+20, pt.y+18); ctx.stroke();
      }
      // Deep shadow cracks
      ctx.strokeStyle = 'rgba(60,0,0,0.6)'; ctx.lineWidth = 1;
      for (let i = 4; i < vis.length-4; i+=18) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.moveTo(sx+5, pt.y+1); ctx.lineTo(sx+3, pt.y+20); ctx.stroke();
      }
      // Warm dust on surface
      ctx.fillStyle = 'rgba(220,100,30,0.12)';
      for (let i = 8; i < vis.length-8; i+=30) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.ellipse(sx+8, pt.y+3, 14, 4, 0, 0, Math.PI*2); ctx.fill();
      }
      break;
    }

    // ─ Storm: dark cracked mud with lightning-strike scorches ─
    case 'storm': {
      ctx.strokeStyle = 'rgba(40,20,60,0.6)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < vis.length-4; i+=7) {
        const pt = vis[i], sx = pt.x-cam;
        const zig = (i%2 ? 3 : -3);
        ctx.beginPath(); ctx.moveTo(sx, pt.y+4); ctx.lineTo(sx+8, pt.y+4+zig); ctx.lineTo(sx+16, pt.y+4); ctx.stroke();
      }
      // Scorch patches (purple/black)
      ctx.fillStyle = 'rgba(80,0,120,0.25)';
      for (let i = 5; i < vis.length-5; i+=22) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.ellipse(sx+6, pt.y+9, 10, 5, 0.2, 0, Math.PI*2); ctx.fill();
      }
      // Lightning crack lines
      ctx.strokeStyle = 'rgba(180,100,255,0.3)'; ctx.lineWidth = 1;
      for (let i = 10; i < vis.length-10; i+=35) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.moveTo(sx, pt.y+2); ctx.lineTo(sx+4, pt.y+10); ctx.lineTo(sx+2, pt.y+20); ctx.stroke();
      }
      break;
    }

    // ─ Abyss: deep dark swampy jungle floor ─
    case 'abyss': {
      // Swamp water puddles
      ctx.fillStyle = 'rgba(0,20,0,0.6)';
      for (let i = 5; i < vis.length-5; i+=20) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.ellipse(sx+8, pt.y+10, 22, 7, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(0,60,10,0.2)';
        ctx.beginPath(); ctx.ellipse(sx+4, pt.y+8, 9, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(0,20,0,0.6)';
      }
      // Twisted roots on surface
      ctx.strokeStyle = '#0d1a08'; ctx.lineWidth = 2;
      for (let i = 0; i < vis.length-4; i+=8) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.moveTo(sx, pt.y); ctx.quadraticCurveTo(sx+6, pt.y-5, sx+14, pt.y+1); ctx.stroke();
      }
      // Glow spores
      ctx.fillStyle = 'rgba(80,255,60,0.12)';
      for (let i = 3; i < vis.length-3; i+=15) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.arc(sx+5, pt.y+2, 3, 0, Math.PI*2); ctx.fill();
      }
      break;
    }

    // ─ Volcano: cracked lava crust with glow ─
    case 'volcano': {
      // Lava cracks glowing orange
      ctx.strokeStyle = 'rgba(255,80,0,0.5)'; ctx.lineWidth = 2;
      ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 4;
      for (let i = 0; i < vis.length-4; i+=10) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.moveTo(sx, pt.y+2); ctx.lineTo(sx+5, pt.y+12); ctx.lineTo(sx+11, pt.y+5); ctx.stroke();
      }
      ctx.shadowBlur = 0;
      // Dark lava rock surface
      ctx.strokeStyle = 'rgba(80,20,0,0.7)'; ctx.lineWidth = 1;
      for (let i = 3; i < vis.length-3; i+=6) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.moveTo(sx, pt.y+6); ctx.lineTo(sx+18, pt.y+7); ctx.stroke();
      }
      // Ember sparks (small dots)
      ctx.fillStyle = 'rgba(255,160,0,0.4)';
      for (let i = 7; i < vis.length-7; i+=18) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.arc(sx+3, pt.y+1, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx+11, pt.y+3, 1.5, 0, Math.PI*2); ctx.fill();
      }
      break;
    }

    // ─ Snow: powder ripples + ice crystals ─
    case 'snow': {
      // Soft snow ripples
      ctx.strokeStyle = 'rgba(200,230,255,0.5)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < vis.length-4; i+=5) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath();
        ctx.moveTo(sx, pt.y+4);
        ctx.quadraticCurveTo(sx+7, pt.y+1, sx+14, pt.y+4);
        ctx.stroke();
      }
      // Sparkle crystals
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
      for (let i = 4; i < vis.length-4; i+=18) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.moveTo(sx-3, pt.y+2); ctx.lineTo(sx+3, pt.y+2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, pt.y-1); ctx.lineTo(sx, pt.y+5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx-2, pt.y); ctx.lineTo(sx+2, pt.y+4); ctx.stroke();
      }
      // Ice gloss highlights
      ctx.fillStyle = 'rgba(200,240,255,0.18)';
      for (let i = 6; i < vis.length-6; i+=25) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.ellipse(sx+8, pt.y+2, 16, 3, 0, 0, Math.PI*2); ctx.fill();
      }
      break;
    }

    // ─ Beach: sandy waves + shells ─
    case 'beach': {
      // Wave ripples
      ctx.strokeStyle = 'rgba(100,160,220,0.3)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < vis.length-4; i+=6) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath();
        ctx.moveTo(sx, pt.y+5);
        ctx.quadraticCurveTo(sx+8, pt.y+2, sx+18, pt.y+6);
        ctx.stroke();
      }
      // Sand texture dots
      ctx.fillStyle = 'rgba(180,140,60,0.4)';
      for (let i = 2; i < vis.length-2; i+=8) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.arc(sx+4, pt.y+8, 1.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx+10, pt.y+15, 1, 0, Math.PI*2); ctx.fill();
      }
      // Shells
      ctx.fillStyle = 'rgba(255,255,230,0.5)';
      for (let i = 8; i < vis.length-8; i+=30) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.ellipse(sx+6, pt.y+4, 5, 3, 0.5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(200,160,80,0.3)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx+4, pt.y+3); ctx.lineTo(sx+8, pt.y+5); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,230,0.5)';
      }
      break;
    }

    // ─ Cave: stalactites and crystal glow ─
    case 'cave': {
      // Ground crystal glow
      ctx.strokeStyle = 'rgba(140,80,255,0.4)'; ctx.lineWidth = 2;
      ctx.shadowColor = '#8844ff'; ctx.shadowBlur = 6;
      for (let i = 0; i < vis.length-4; i+=9) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.moveTo(sx+4, pt.y); ctx.lineTo(sx+4, pt.y+14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx+10, pt.y); ctx.lineTo(sx+12, pt.y+10); ctx.stroke();
      }
      ctx.shadowBlur = 0;
      // Dark cave floor patches
      ctx.fillStyle = 'rgba(0,0,20,0.4)';
      for (let i = 5; i < vis.length-5; i+=20) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.ellipse(sx+7, pt.y+12, 14, 5, 0, 0, Math.PI*2); ctx.fill();
      }
      // Crystal face shine
      ctx.fillStyle = 'rgba(200,160,255,0.12)';
      for (let i = 2; i < vis.length-2; i+=14) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.ellipse(sx+5, pt.y+5, 7, 3, 0.3, 0, Math.PI*2); ctx.fill();
      }
      break;
    }

    // ─ Space: asteroid dust and craters ─
    case 'space': {
      // Crater rim rings
      ctx.strokeStyle = 'rgba(120,120,140,0.4)'; ctx.lineWidth = 1.5;
      for (let i = 5; i < vis.length-5; i+=22) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.ellipse(sx+8, pt.y+8, 14, 6, 0, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = 'rgba(20,20,30,0.35)';
        ctx.beginPath(); ctx.ellipse(sx+8, pt.y+8, 11, 4, 0, 0, Math.PI*2); ctx.fill();
      }
      // Dust scatter
      ctx.fillStyle = 'rgba(180,180,200,0.25)';
      for (let i = 2; i < vis.length-2; i+=7) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.arc(sx+3, pt.y+3, 1.5, 0, Math.PI*2); ctx.fill();
      }
      // Glowing meteor streak
      ctx.strokeStyle = 'rgba(200,160,255,0.2)'; ctx.lineWidth = 1;
      for (let i = 8; i < vis.length-8; i+=30) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.moveTo(sx, pt.y+2); ctx.lineTo(sx+20, pt.y+5); ctx.stroke();
      }
      break;
    }

    // ─ Default fallback ─
    default: {
      ctx.strokeStyle = tc.dirt; ctx.lineWidth = 2;
      for (let i = 0; i < vis.length-1; i+=4) {
        const pt = vis[i], sx = pt.x-cam;
        ctx.beginPath(); ctx.moveTo(sx, pt.y+3); ctx.lineTo(sx+12, pt.y+8); ctx.stroke();
      }
      break;
    }
  }
  ctx.restore(); // reset any shadowBlur / lineDash / lineWidth set by texture cases
}

// ── Background dispatcher ────────────────────────────────────
function drawBackground(theme, cam, g) {
  ctx.save();
  ctx.shadowBlur = 0;
  switch(theme) {
    case 'angkor':  drawAngkorBg(cam,g);  break;
    case 'jungle':  drawJungleBg(cam,g);  break;
    case 'city':    drawCityBg(cam,g);    break;
    case 'ruins':   drawRuinsBg(cam,g);   break;
    case 'night':   drawNightBg(cam,g);   break;
    case 'rocky':   drawRockyBg(cam,g);   break;
    case 'canyon':  drawCanyonBg(cam,g);  break;
    case 'storm':   drawStormBg(cam,g);   break;
    case 'abyss':   drawAbyssBg(cam,g);   break;
    case 'volcano': drawVolcanoBg(cam,g); break;
    case 'snow':    drawSnowBg(cam,g);    break;
    case 'beach':   drawBeachBg(cam,g);   break;
    case 'cave':    drawCaveBg(cam,g);    break;
    case 'space':   drawSpaceBg(cam,g);   break;
    default:        drawDesertBg(cam,g);  break;
  }
  ctx.restore();
}

// ── Desert ───────────────────────────────────────────────────
function drawDesertBg(cam, g) {
  ctx.fillStyle='#f0d8a0'; ctx.fillRect(0,0,CW,CH);
  ctx.fillStyle='#e8c878'; ctx.fillRect(0,CH*0.55,CW,CH*0.45);
  [{cx:200,r:180,color:'#d4aa6a'},{cx:500,r:140,color:'#cca060'},
   {cx:750,r:200,color:'#d0a868'},{cx:980,r:160,color:'#c89858'}]
  .forEach(h => {
    const sx = h.cx - cam*0.15;
    const wx = ((sx%(CW+400))+(CW+400))%(CW+400)-200;
    ctx.fillStyle=h.color;
    ctx.beginPath(); ctx.ellipse(wx,CH*0.7,h.r,h.r*0.5,0,0,Math.PI*2); ctx.fill();
  });
  ctx.strokeStyle='#c8905a'; ctx.lineWidth=6;
  ctx.beginPath(); ctx.arc(420-(cam*0.05)%800,150,110,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(680-(cam*0.07)%800,100, 80,0,Math.PI*2); ctx.stroke();
  g.bgClouds.forEach(cl => drawDesertCloud(cl.x, cl.y));
}
function drawDesertCloud(x,y){
  ctx.fillStyle='rgba(255,248,230,0.7)';
  ctx.beginPath(); ctx.ellipse(x,y,45,22,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x-22,y+5,28,16,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x+22,y+5,28,16,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x,y-12,32,18,0,0,Math.PI*2); ctx.fill();
}

// ── Angkor Wat Sunset ────────────────────────────────────────
function drawAngkorBg(cam, g) {
  // Sky
  const sk=ctx.createLinearGradient(0,0,0,CH);
  sk.addColorStop(0,'#2a1535'); sk.addColorStop(0.45,'#c04820'); sk.addColorStop(0.7,'#e87828'); sk.addColorStop(1,'#d06020');
  ctx.fillStyle=sk; ctx.fillRect(0,0,CW,CH);
  // Sun orb
  ctx.fillStyle='#ffe070'; ctx.beginPath(); ctx.arc(CW/2,CH*0.45,22,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,220,80,0.25)'; ctx.beginPath(); ctx.arc(CW/2,CH*0.45,40,0,Math.PI*2); ctx.fill();
  // Temple silhouette
  const bY=Math.round(CH*0.63);
  const bX=Math.round(CW/2 - (cam*0.06)%CW);
  ctx.fillStyle='#150b06';
  // Platform
  ctx.fillRect(bX-180,bY,360,CH);
  // 5 towers
  [[0,90,28],[- 72,65,20],[72,65,20],[-132,46,14],[132,46,14]].forEach(([dx,h,w])=>{
    for(let s=0;s<4;s++){
      const sw=w-s*(w*0.18); const sy=bY-s*(h/4)-(h/4);
      ctx.fillRect(bX+dx-sw, sy, sw*2, h/4+2);
    }
    ctx.beginPath(); ctx.moveTo(bX+dx-w*0.15,bY-h); ctx.lineTo(bX+dx,bY-h-h*0.28); ctx.lineTo(bX+dx+w*0.15,bY-h); ctx.fill();
  });
  // Palm trees
  for(let i=-3;i<=12;i++){
    const tx=((i*60-(cam*0.1)%(CW+300))+(CW+300))%(CW+300)-150;
    const th=35+(i%3)*10;
    ctx.fillStyle='#150b06'; ctx.fillRect(tx-3, bY-th, 6, th);
    ctx.strokeStyle='#0d0704'; ctx.lineWidth=2.5;
    for(let f=0;f<5;f++){
      const a=(f/5)*Math.PI*2-Math.PI/2;
      ctx.beginPath(); ctx.moveTo(tx,bY-th);
      ctx.quadraticCurveTo(tx+Math.cos(a)*th*0.4,bY-th+Math.sin(a)*th*0.25,tx+Math.cos(a)*th*0.7,bY-th+Math.sin(a)*th*0.5);
      ctx.stroke();
    }
  }
  // Reflection glow on ground
  const rg=ctx.createLinearGradient(0,bY,0,CH);
  rg.addColorStop(0,'rgba(232,120,40,0.3)'); rg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=rg; ctx.fillRect(0,bY,CW,CH-bY);
}

// ── Dark Jungle ───────────────────────────────────────────────
function drawJungleBg(cam, g) {
  const sk=ctx.createLinearGradient(0,0,0,CH);
  sk.addColorStop(0,'#020902'); sk.addColorStop(0.5,'#081508'); sk.addColorStop(1,'#0c1e0c');
  ctx.fillStyle=sk; ctx.fillRect(0,0,CW,CH);
  // Light rays
  ctx.fillStyle='rgba(100,200,60,0.04)';
  for(let i=0;i<5;i++){
    const lx=((i*110-(cam*0.025))%(CW+200)+CW+200)%(CW+200)-100;
    ctx.beginPath(); ctx.moveTo(lx-8,0); ctx.lineTo(lx+8,0); ctx.lineTo(lx+55,CH); ctx.lineTo(lx-55,CH); ctx.closePath(); ctx.fill();
  }
  // Mid foliage
  ctx.fillStyle='#0a1a08';
  for(let i=0;i<10;i++){
    const fx=((i*70-(cam*0.08))%(CW+200)+CW+200)%(CW+200)-100;
    ctx.beginPath(); ctx.ellipse(fx,CH*0.55,55,32,0,0,Math.PI*2); ctx.fill();
  }
  // Hanging vines
  ctx.strokeStyle='#183010'; ctx.lineWidth=2;
  for(let i=0;i<14;i++){
    const vx=((i*42-(cam*0.04))%(CW+150)+CW+150)%(CW+150)-50;
    const vl=35+(i%4)*22;
    ctx.beginPath(); ctx.moveTo(vx,0); ctx.quadraticCurveTo(vx+8,vl*0.5,vx-4,vl); ctx.stroke();
  }
  // Top leaf clusters
  ctx.fillStyle='#122010';
  for(let i=-2;i<16;i++){
    const lx=((i*38-(cam*0.06))%(CW+160)+CW+160)%(CW+160)-80;
    ctx.beginPath(); ctx.ellipse(lx,-2,30,18,0.3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(lx+14,3,24,15,-0.3,0,Math.PI*2); ctx.fill();
  }
  // Bottom leaves
  ctx.fillStyle='#0c180c';
  for(let i=-2;i<16;i++){
    const lx=((i*44+20-(cam*0.1))%(CW+180)+CW+180)%(CW+180)-90;
    ctx.beginPath(); ctx.ellipse(lx,CH+4,36,20,0,0,Math.PI*2); ctx.fill();
  }
  // Ambient glow
  const ag=ctx.createRadialGradient(CW/2,CH*0.5,0,CW/2,CH*0.5,CW*0.45);
  ag.addColorStop(0,'rgba(50,130,20,0.07)'); ag.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=ag; ctx.fillRect(0,0,CW,CH);
}

// ── City Dusk ─────────────────────────────────────────────────
function drawCityBg(cam, g) {
  const sk=ctx.createLinearGradient(0,0,0,CH*0.75);
  sk.addColorStop(0,'#100828'); sk.addColorStop(0.5,'#301858'); sk.addColorStop(1,'#782838');
  ctx.fillStyle=sk; ctx.fillRect(0,0,CW,CH);
  ctx.fillStyle='#904030'; ctx.fillRect(0,CH*0.72,CW,CH*0.28);
  // Clouds
  ctx.fillStyle='rgba(130,60,90,0.35)';
  for(let i=0;i<5;i++){
    const cx=((i*140-(cam*0.03))%(CW+200)+CW+200)%(CW+200)-100;
    ctx.beginPath(); ctx.ellipse(cx,50+i*12,55,18,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+28,44+i*12,36,13,0,0,Math.PI*2); ctx.fill();
  }
  // Building silhouettes
  const bldgs=[{w:30,h:120},{w:20,h:85},{w:45,h:155},{w:25,h:100},{w:18,h:75},{w:52,h:185},{w:22,h:108},{w:40,h:140},{w:28,h:92},{w:35,h:128},{w:20,h:68},{w:48,h:162}];
  const camOff = cam * 0.07;
  bldgs.forEach((b,i) => {
    const x=((camOff*(-1)+i*58)%(CW+500)+CW+500)%(CW+500)-250;
    ctx.fillStyle='#0a0820'; ctx.fillRect(x,CH*0.72-b.h,b.w,b.h+CH*0.28);
    for(let wy=CH*0.72-b.h+7;wy<CH*0.72-10;wy+=11){
      for(let wx=x+3;wx<x+b.w-3;wx+=9){
        if((Math.floor(wx/9)+Math.floor(wy/11)*3+i)%4!==0){
          ctx.fillStyle='rgba(255,210,90,0.65)'; ctx.fillRect(wx,wy,5,6);
        }
      }
    }
  });
}

// ── Stone Ruins ───────────────────────────────────────────────
function drawRuinsBg(cam, g) {
  const sk=ctx.createLinearGradient(0,0,0,CH);
  sk.addColorStop(0,'#1e0e04'); sk.addColorStop(0.5,'#784010'); sk.addColorStop(1,'#c07020');
  ctx.fillStyle=sk; ctx.fillRect(0,0,CW,CH);
  ctx.fillStyle='rgba(200,150,60,0.12)'; ctx.fillRect(0,CH*0.4,CW,CH*0.6);
  // Stone arches
  ctx.fillStyle='#180c04';
  for(let i=0;i<6;i++){
    const ax=((i*120-(cam*0.09))%(CW+400)+CW+400)%(CW+400)-200;
    const ah=75+(i%3)*28;
    ctx.fillRect(ax-7,CH*0.58-ah,14,ah+CH*0.42);
    ctx.fillRect(ax+44,CH*0.58-ah,14,ah+CH*0.42);
    ctx.beginPath(); ctx.arc(ax+25,CH*0.58-ah,31,Math.PI,0); ctx.fill();
    ctx.fillRect(ax-12,CH*0.58-ah-6,8,8);
    ctx.fillRect(ax+52,CH*0.58-ah-4,7,7);
  }
  // Floating dust
  const t=(g?g.frameCount:0)*0.02;
  ctx.fillStyle='rgba(200,160,60,0.35)';
  for(let i=0;i<12;i++){
    const px=((i*48+t*16)%(CW+50)+CW+50)%(CW+50)-25;
    const py=CH*0.25+Math.sin(t+i*1.4)*38+i*13;
    ctx.beginPath(); ctx.arc(px,py,1.8,0,Math.PI*2); ctx.fill();
  }
}

// ── Neon Night City ───────────────────────────────────────────
function drawNightBg(cam, g) {
  ctx.fillStyle='#010306'; ctx.fillRect(0,0,CW,CH);
  // Stars
  ctx.fillStyle='rgba(255,255,255,0.75)';
  for(let i=0;i<45;i++){
    const sx=(i*71+13)%CW, sy=(i*47+9)%(CH*0.48);
    ctx.beginPath(); ctx.arc(sx,sy,i%4===0?1.5:0.8,0,Math.PI*2); ctx.fill();
  }
  // Horizon glow
  const hg=ctx.createLinearGradient(0,CH*0.54,0,CH*0.75);
  hg.addColorStop(0,'rgba(30,60,200,0.45)'); hg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=hg; ctx.fillRect(0,CH*0.54,CW,CH*0.21);
  // Buildings
  const bldgs=[{w:26,h:135},{w:18,h:90},{w:42,h:175},{w:22,h:105},{w:16,h:68},{w:52,h:205},{w:20,h:98},{w:38,h:155},{w:28,h:125},{w:32,h:148},{w:18,h:78},{w:44,h:185}];
  const camOff = cam * 0.07;
  const fc = g ? g.frameCount : 0;
  bldgs.forEach((b,i) => {
    const x=((camOff*(-1)+i*56)%(CW+500)+CW+500)%(CW+500)-250;
    ctx.fillStyle='#060a16'; ctx.fillRect(x,CH*0.75-b.h,b.w,b.h+CH*0.25);
    for(let wy=CH*0.75-b.h+5;wy<CH*0.75-8;wy+=10){
      for(let wx=x+3;wx<x+b.w-3;wx+=8){
        if((Math.floor(wx/8)+Math.floor(wy/10)*3+i)%5!==0){
          ctx.fillStyle='rgba(255,200,80,0.85)'; ctx.fillRect(wx,wy,4,5);
        }
      }
    }
    // Neon roof flash
    if(i%3===0){
      const fl=Math.sin(fc*0.05+i)>0.4;
      ctx.fillStyle=fl?'#ff208a':'rgba(255,32,138,0.3)';
      ctx.fillRect(x+b.w/2-2,CH*0.75-b.h-5,4,4);
    }
  });
}

// ── Rocky Ridge — Grey Misty Mountains ───────────────────────
function drawRockyBg(cam, g) {
  const sk = ctx.createLinearGradient(0, 0, 0, CH);
  sk.addColorStop(0, '#2a2e38'); sk.addColorStop(0.5, '#4a5060'); sk.addColorStop(1, '#6a6858');
  ctx.fillStyle = sk; ctx.fillRect(0, 0, CW, CH);
  // Mist layer
  ctx.fillStyle = 'rgba(200,210,220,0.12)'; ctx.fillRect(0, CH*0.3, CW, CH*0.4);
  // Far mountains (light grey)
  ctx.fillStyle = '#606878';
  for (let i = 0; i < 8; i++) {
    const mx = ((i * 95 - cam * 0.04) % (CW + 200) + CW + 200) % (CW + 200) - 100;
    const mh = 80 + (i % 3) * 50;
    ctx.beginPath(); ctx.moveTo(mx - 70, CH * 0.65); ctx.lineTo(mx, CH * 0.65 - mh); ctx.lineTo(mx + 70, CH * 0.65); ctx.fill();
  }
  // Near mountains (darker)
  ctx.fillStyle = '#454a50';
  for (let i = 0; i < 6; i++) {
    const mx = ((i * 140 + 30 - cam * 0.09) % (CW + 300) + CW + 300) % (CW + 300) - 150;
    const mh = 110 + (i % 2) * 70;
    ctx.beginPath(); ctx.moveTo(mx - 100, CH * 0.7); ctx.lineTo(mx, CH * 0.7 - mh); ctx.lineTo(mx + 100, CH * 0.7); ctx.fill();
    // Snow caps
    ctx.fillStyle = 'rgba(220,230,240,0.8)';
    ctx.beginPath(); ctx.moveTo(mx - 18, CH * 0.7 - mh + 30); ctx.lineTo(mx, CH * 0.7 - mh); ctx.lineTo(mx + 18, CH * 0.7 - mh + 30); ctx.fill();
    ctx.fillStyle = '#454a50';
  }
  // Fog strips
  ctx.fillStyle = 'rgba(180,190,200,0.1)';
  ctx.fillRect(0, CH * 0.5, CW, 40);
  ctx.fillRect(0, CH * 0.62, CW, 24);
}

// ── Canyon Drop — Red Rock Buttes ────────────────────────────
function drawCanyonBg(cam, g) {
  const sk = ctx.createLinearGradient(0, 0, 0, CH);
  sk.addColorStop(0, '#4a1a08'); sk.addColorStop(0.4, '#8a2e10'); sk.addColorStop(0.75, '#c04820'); sk.addColorStop(1, '#e07030');
  ctx.fillStyle = sk; ctx.fillRect(0, 0, CW, CH);
  // Sun
  const sunX = 280 - (cam * 0.02) % CW;
  ctx.fillStyle = 'rgba(255,200,80,0.9)';
  ctx.beginPath(); ctx.arc(sunX, CH * 0.2, 28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,160,40,0.25)';
  ctx.beginPath(); ctx.arc(sunX, CH * 0.2, 55, 0, Math.PI * 2); ctx.fill();
  // Canyon wall layers (back)
  ctx.fillStyle = '#7a2808';
  for (let i = 0; i < 5; i++) {
    const bx = ((i * 160 - cam * 0.06) % (CW + 400) + CW + 400) % (CW + 400) - 200;
    const bh = 100 + (i % 3) * 60;
    ctx.fillRect(bx - 80, CH * 0.6 - bh, 160, bh + CH * 0.4);
    // Strata lines
    ctx.strokeStyle = 'rgba(180,80,20,0.4)'; ctx.lineWidth = 2;
    for (let s = 0; s < 4; s++) {
      ctx.beginPath(); ctx.moveTo(bx - 80, CH * 0.6 - bh + s * (bh / 4)); ctx.lineTo(bx + 80, CH * 0.6 - bh + s * (bh / 4)); ctx.stroke();
    }
  }
  // Heat haze at horizon
  ctx.fillStyle = 'rgba(255,120,40,0.08)'; ctx.fillRect(0, CH * 0.55, CW, 40);
}

// ── Insane Peak — Storm Sky ───────────────────────────────────
function drawStormBg(cam, g) {
  const sk = ctx.createLinearGradient(0, 0, 0, CH);
  sk.addColorStop(0, '#080010'); sk.addColorStop(0.4, '#1a0530'); sk.addColorStop(0.8, '#300840'); sk.addColorStop(1, '#180520');
  ctx.fillStyle = sk; ctx.fillRect(0, 0, CW, CH);
  const fc = g ? g.frameCount : 0;
  // Rolling storm clouds
  ctx.fillStyle = 'rgba(50,20,70,0.75)';
  for (let i = 0; i < 7; i++) {
    const cx = ((i * 110 - cam * 0.05) % (CW + 300) + CW + 300) % (CW + 300) - 150;
    const cy = 40 + (i % 3) * 30;
    ctx.beginPath(); ctx.ellipse(cx, cy, 90, 38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 50, cy - 15, 65, 28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx - 40, cy + 5, 55, 22, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Lightning bolt (flashes every 80 frames)
  if (fc % 80 < 6) {
    const lx = 200 + (fc * 17) % 400;
    ctx.strokeStyle = 'rgba(200,150,255,0.9)'; ctx.lineWidth = 3;
    ctx.shadowColor = '#cc88ff'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.moveTo(lx, 30); ctx.lineTo(lx - 15, 100); ctx.lineTo(lx + 8, 140); ctx.lineTo(lx - 10, 220); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  // Purple horizon glow
  const hg = ctx.createLinearGradient(0, CH * 0.6, 0, CH);
  hg.addColorStop(0, 'rgba(100,0,180,0.3)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, CH * 0.6, CW, CH * 0.4);
}

// ── Jungle Abyss — Pitch Black Deep Swamp ────────────────────
function drawAbyssBg(cam, g) {
  const sk = ctx.createLinearGradient(0, 0, 0, CH);
  sk.addColorStop(0, '#000300'); sk.addColorStop(0.5, '#010a01'); sk.addColorStop(1, '#020e02');
  ctx.fillStyle = sk; ctx.fillRect(0, 0, CW, CH);
  const fc = g ? g.frameCount : 0;
  // Bioluminescent spore particles
  for (let i = 0; i < 20; i++) {
    const px = ((i * 43 + fc * 0.2) % (CW + 60) + CW + 60) % (CW + 60) - 30;
    const py = CH * 0.2 + Math.sin(fc * 0.02 + i * 1.2) * 40 + i * 12;
    const alpha = 0.3 + Math.sin(fc * 0.04 + i) * 0.2;
    ctx.fillStyle = `rgba(50,255,80,${alpha})`;
    ctx.shadowColor = '#40ff60'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
  // Giant tree trunks
  ctx.fillStyle = '#030c03';
  for (let i = 0; i < 8; i++) {
    const tx = ((i * 95 - cam * 0.07) % (CW + 200) + CW + 200) % (CW + 200) - 100;
    ctx.fillRect(tx - 8, 0, 16, CH * 0.8);
    // Root flare
    ctx.beginPath(); ctx.moveTo(tx - 18, CH * 0.8); ctx.lineTo(tx - 8, CH * 0.6); ctx.lineTo(tx + 8, CH * 0.6); ctx.lineTo(tx + 18, CH * 0.8); ctx.fill();
  }
  // Murky water at base
  const wg = ctx.createLinearGradient(0, CH * 0.7, 0, CH);
  wg.addColorStop(0, 'rgba(0,20,5,0)'); wg.addColorStop(1, 'rgba(0,30,8,0.6)');
  ctx.fillStyle = wg; ctx.fillRect(0, CH * 0.7, CW, CH * 0.3);
}

// ── Volcano Rush — Erupting Lava Field ───────────────────────
function drawVolcanoBg(cam, g) {
  const sk = ctx.createLinearGradient(0, 0, 0, CH);
  sk.addColorStop(0, '#100200'); sk.addColorStop(0.3, '#350800'); sk.addColorStop(0.65, '#7a1200'); sk.addColorStop(1, '#c02000');
  ctx.fillStyle = sk; ctx.fillRect(0, 0, CW, CH);
  const fc = g ? g.frameCount : 0;
  // Volcano cone
  const vx = 550 - (cam * 0.03) % 800;
  ctx.fillStyle = '#1a0400';
  ctx.beginPath(); ctx.moveTo(vx - 160, CH); ctx.lineTo(vx, CH * 0.15); ctx.lineTo(vx + 160, CH); ctx.fill();
  // Crater glow
  const cg = ctx.createRadialGradient(vx, CH * 0.15, 0, vx, CH * 0.15, 60);
  cg.addColorStop(0, 'rgba(255,150,0,0.9)'); cg.addColorStop(0.4, 'rgba(255,60,0,0.5)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cg; ctx.fillRect(vx - 60, CH * 0.08, 120, 60);
  // Lava bombs (animated)
  for (let i = 0; i < 5; i++) {
    const t = (fc * 0.015 + i * 0.6) % 1;
    const bx = vx + Math.sin(i * 1.7) * 80 * t;
    const by = CH * 0.15 - t * 150 + t * t * 200;
    ctx.fillStyle = `rgba(255,${Math.floor(100 + t * 100)},0,${1 - t})`;
    ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(bx, by, 5 + (1 - t) * 5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
  // Lava glow at ground level
  const lg = ctx.createLinearGradient(0, CH * 0.6, 0, CH);
  lg.addColorStop(0, 'rgba(255,80,0,0.2)'); lg.addColorStop(1, 'rgba(200,20,0,0.5)');
  ctx.fillStyle = lg; ctx.fillRect(0, CH * 0.6, CW, CH * 0.4);
  // Smoke plumes
  ctx.fillStyle = 'rgba(60,40,30,0.3)';
  for (let i = 0; i < 4; i++) {
    const t = (fc * 0.008 + i * 0.4) % 1;
    const sx2 = vx + (i - 2) * 20;
    const sy = CH * 0.15 - t * 180;
    const sr = 10 + t * 40;
    ctx.beginPath(); ctx.arc(sx2, sy, sr, 0, Math.PI * 2); ctx.fill();
  }
}

// ── Snowfall Summit — Frozen Alpine ──────────────────────────
function drawSnowBg(cam, g) {
  const sk = ctx.createLinearGradient(0, 0, 0, CH);
  sk.addColorStop(0, '#060e20'); sk.addColorStop(0.35, '#0e2040'); sk.addColorStop(0.7, '#1a3060'); sk.addColorStop(1, '#203880');
  ctx.fillStyle = sk; ctx.fillRect(0, 0, CW, CH);
  const fc = g ? g.frameCount : 0;
  // Aurora borealis
  for (let i = 0; i < 3; i++) {
    const aOff = Math.sin(fc * 0.01 + i * 1.5) * 30;
    const ag = ctx.createLinearGradient(0, 80 + i * 40 + aOff, 0, 140 + i * 40 + aOff);
    const colors = ['rgba(40,255,140,', 'rgba(60,160,255,', 'rgba(120,80,255,'];
    ag.addColorStop(0, colors[i] + '0)');
    ag.addColorStop(0.5, colors[i] + '0.15)');
    ag.addColorStop(1, colors[i] + '0)');
    ctx.fillStyle = ag; ctx.fillRect(0, 80 + i * 40 + aOff, CW, 60);
  }
  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 50; i++) {
    const sx2 = (i * 67 + 11) % CW, sy = (i * 41 + 7) % (CH * 0.45);
    ctx.beginPath(); ctx.arc(sx2, sy, i % 5 === 0 ? 1.8 : 0.8, 0, Math.PI * 2); ctx.fill();
  }
  // Snowy mountains (light blue-white)
  ctx.fillStyle = '#c8d8f0';
  for (let i = 0; i < 6; i++) {
    const mx = ((i * 130 - cam * 0.05) % (CW + 300) + CW + 300) % (CW + 300) - 150;
    const mh = 90 + (i % 3) * 55;
    ctx.beginPath(); ctx.moveTo(mx - 90, CH * 0.72); ctx.lineTo(mx, CH * 0.72 - mh); ctx.lineTo(mx + 90, CH * 0.72); ctx.fill();
  }
  // Falling snowflakes
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 30; i++) {
    const sx2 = ((i * 83 + fc * 0.4) % (CW + 20)) - 10;
    const sy = ((i * 59 + fc * 0.8 + i * 0.3) % (CH + 20)) - 10;
    ctx.beginPath(); ctx.arc(sx2, sy, i % 4 === 0 ? 2 : 1.2, 0, Math.PI * 2); ctx.fill();
  }
}

// ── Coral Beach — Tropical Ocean Sunset ──────────────────────
function drawBeachBg(cam, g) {
  const sk = ctx.createLinearGradient(0, 0, 0, CH);
  sk.addColorStop(0, '#001830'); sk.addColorStop(0.35, '#003858'); sk.addColorStop(0.6, '#006888'); sk.addColorStop(0.85, '#0090a8'); sk.addColorStop(1, '#00a8b8');
  ctx.fillStyle = sk; ctx.fillRect(0, 0, CW, CH);
  const fc = g ? g.frameCount : 0;
  // Sun/moon reflection
  const sunX = CW * 0.65 - (cam * 0.01) % 200;
  ctx.fillStyle = 'rgba(255,200,100,0.9)';
  ctx.beginPath(); ctx.arc(sunX, CH * 0.22, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,200,80,0.2)';
  ctx.beginPath(); ctx.arc(sunX, CH * 0.22, 50, 0, Math.PI * 2); ctx.fill();
  // Sun path reflection on water
  const rg = ctx.createLinearGradient(sunX - 30, CH * 0.5, sunX + 30, CH);
  rg.addColorStop(0, 'rgba(255,200,80,0.25)'); rg.addColorStop(1, 'rgba(255,200,80,0)');
  ctx.fillStyle = rg; ctx.fillRect(sunX - 30, CH * 0.5, 60, CH * 0.5);
  // Ocean waves
  for (let w = 0; w < 4; w++) {
    const wy = CH * (0.55 + w * 0.06);
    const wOff = Math.sin(fc * 0.03 + w * 1.1) * 8;
    ctx.strokeStyle = `rgba(100,220,240,${0.3 - w * 0.06})`; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let wx = -50; wx < CW + 50; wx += 40) {
      const wx2 = wx - (cam * 0.08) % 40;
      if (wx === -50) ctx.moveTo(wx2, wy + wOff);
      else ctx.lineTo(wx2 + 20, wy + wOff + 6 * Math.sin(wx * 0.1 + fc * 0.04));
    }
    ctx.stroke();
  }
  // Palm trees
  ctx.fillStyle = '#2a1a00';
  for (let i = 0; i < 5; i++) {
    const tx = ((i * 160 - cam * 0.06) % (CW + 300) + CW + 300) % (CW + 300) - 150;
    const th = 70 + (i % 2) * 30;
    // Trunk (curved)
    ctx.lineWidth = 8; ctx.strokeStyle = '#3a2808'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tx, CH * 0.9); ctx.quadraticCurveTo(tx + 15, CH * 0.9 - th * 0.5, tx + 10, CH * 0.9 - th); ctx.stroke();
    // Leaves
    ctx.lineWidth = 3; ctx.strokeStyle = '#2a6010';
    for (let l = 0; l < 6; l++) {
      const la = (l / 6) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(tx + 10, CH * 0.9 - th); ctx.lineTo(tx + 10 + Math.cos(la) * 35, CH * 0.9 - th + Math.sin(la) * 20); ctx.stroke();
    }
  }
}

// ── Crystal Cave — Underground Cavern ────────────────────────
function drawCaveBg(cam, g) {
  const sk = ctx.createLinearGradient(0, 0, 0, CH);
  sk.addColorStop(0, '#000005'); sk.addColorStop(0.5, '#05000f'); sk.addColorStop(1, '#0a0020');
  ctx.fillStyle = sk; ctx.fillRect(0, 0, CW, CH);
  const fc = g ? g.frameCount : 0;
  // Crystal formations hanging from ceiling
  ctx.fillStyle = '#300060';
  for (let i = 0; i < 14; i++) {
    const cx = ((i * 54 - cam * 0.04) % (CW + 100) + CW + 100) % (CW + 100) - 50;
    const ch = 30 + (i % 4) * 20;
    const cw2 = 8 + (i % 3) * 5;
    // Crystal spike
    ctx.beginPath(); ctx.moveTo(cx - cw2, 0); ctx.lineTo(cx + cw2, 0); ctx.lineTo(cx, ch); ctx.closePath(); ctx.fill();
    // Crystal glow
    const alpha = 0.4 + Math.sin(fc * 0.03 + i) * 0.15;
    ctx.fillStyle = `rgba(${100 + i % 3 * 50},${50 + i % 2 * 80},255,${alpha})`;
    ctx.shadowColor = `rgba(${100 + i % 3 * 50},${50 + i % 2 * 80},255,0.8)`;
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(cx - cw2 + 2, 0); ctx.lineTo(cx + cw2 - 2, 0); ctx.lineTo(cx, ch - 5); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#300060';
  }
  // Crystal clusters on side walls (left)
  ctx.fillStyle = '#200040';
  for (let i = 0; i < 5; i++) {
    const cy = 80 + i * 60;
    ctx.beginPath(); ctx.moveTo(0, cy - 15); ctx.lineTo(25, cy); ctx.lineTo(0, cy + 15); ctx.fill();
    ctx.fillStyle = `rgba(180,80,255,0.4)`;
    ctx.shadowColor = '#b050ff'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(0, cy - 10); ctx.lineTo(18, cy); ctx.lineTo(0, cy + 10); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#200040';
  }
  // Ambient purple glow
  const ag = ctx.createRadialGradient(CW * 0.5, CH * 0.7, 0, CW * 0.5, CH * 0.7, CW * 0.5);
  ag.addColorStop(0, 'rgba(100,0,200,0.12)'); ag.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ag; ctx.fillRect(0, 0, CW, CH);
}

// ── Asteroid Belt — Deep Space ────────────────────────────────
function drawSpaceBg(cam, g) {
  ctx.fillStyle = '#000004'; ctx.fillRect(0, 0, CW, CH);
  const fc = g ? g.frameCount : 0;
  // Star field (3 layers of parallax)
  for (let layer = 0; layer < 3; layer++) {
    const speed = [0.01, 0.03, 0.06][layer];
    const sizes = [0.6, 1.0, 1.5][layer];
    ctx.fillStyle = `rgba(255,255,255,${[0.4, 0.65, 0.9][layer]})`;
    for (let i = 0; i < 25; i++) {
      const idx = layer * 25 + i;
      const sx2 = ((idx * 71 + 13 - cam * speed) % (CW + 40) + CW + 40) % (CW + 40) - 20;
      const sy = (idx * 47 + 9) % (CH * 0.85);
      ctx.beginPath(); ctx.arc(sx2, sy, sizes, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Nebula glow
  const ng = ctx.createRadialGradient(CW * 0.3, CH * 0.3, 0, CW * 0.3, CH * 0.3, 160);
  ng.addColorStop(0, 'rgba(80,0,150,0.12)'); ng.addColorStop(0.5, 'rgba(0,40,120,0.08)'); ng.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ng; ctx.fillRect(0, 0, CW, CH);
  const ng2 = ctx.createRadialGradient(CW * 0.75, CH * 0.55, 0, CW * 0.75, CH * 0.55, 120);
  ng2.addColorStop(0, 'rgba(0,100,180,0.1)'); ng2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ng2; ctx.fillRect(0, 0, CW, CH);
  // Distant asteroids (bg)
  ctx.fillStyle = 'rgba(60,60,70,0.6)';
  for (let i = 0; i < 8; i++) {
    const ax = ((i * 88 - cam * 0.025) % (CW + 150) + CW + 150) % (CW + 150) - 75;
    const ay = 50 + (i % 4) * 55;
    const ar = 15 + (i % 3) * 10;
    ctx.beginPath(); ctx.ellipse(ax, ay, ar, ar * 0.65, i * 0.4, 0, Math.PI * 2); ctx.fill();
  }
  // Shooting star (rare)
  if (fc % 120 < 8) {
    const t = (fc % 120) / 8;
    const sx2 = 100 + t * 500;
    const sy = 40 + t * 80;
    ctx.strokeStyle = `rgba(255,255,255,${1 - t})`; ctx.lineWidth = 2;
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(sx2, sy); ctx.lineTo(sx2 - 40 * t, sy - 16 * t); ctx.stroke();
    ctx.shadowBlur = 0;
  }
}


function drawBike(b, cam, frame) {
  // ── Custom skin dispatch ──
  const skin = SKINS.find(s => s.id === (b.skinId || 'classic')) || SKINS[0];
  if (skin.drawFn) { skin.drawFn(b, cam, frame); return; }

  const sx = b.x - cam;
  const crashed = b.crashT > 0;
  const WR = 18;
  const RX = -28, FX = 28;
  const sc = skin.colors;

  // Suspension visual offset (body rises when compressed, springs back)
  const suspOffset = -(b.suspension || 0);

  ctx.save();
  ctx.translate(sx, b.y);
  ctx.rotate(b.angle);
  // Apply suspension: body lifts during compression
  ctx.translate(0, suspOffset);
  const spin = frame * (gasDown ? 0.3 : 0.1);

  // Wheelie / Stoppie HUD label
  if (!crashed) {
    ctx.save();
    ctx.rotate(-b.angle); // un-rotate so text is always upright
    if ((b.wheelieT || 0) > 20) {
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 11px Arial Black';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
      ctx.fillText('WHEELIE!', 0, -80);
      ctx.shadowBlur = 0;
    } else if ((b.stoppieT || 0) > 20) {
      ctx.fillStyle = '#00aaff';
      ctx.font = 'bold 11px Arial Black';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
      ctx.fillText('STOPPIE!', 0, -80);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  if (!crashed) {
    ctx.shadowColor = sc.glow ? sc.glow : 'rgba(255, 255, 255, 1)';
    ctx.shadowBlur = sc.glow ? 12 : 6;
  }

  // Helper macro
  const wStroke = () => { ctx.lineWidth += 4; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.lineWidth -= 4; };

  // ─ 1. Rear wheel ─
  drawWheel(RX, 0, WR, spin, crashed, sc);

  if (!crashed) { ctx.shadowColor = 'transparent'; }

  // ─ 2. Exhaust (silver pipe under rear) ─
  ctx.strokeStyle = crashed ? '#777' : sc.exhaust;
  ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(RX-4, -4); ctx.lineTo(-8, -16); ctx.stroke();
  ctx.lineWidth = 9; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(RX-8, -5); ctx.lineTo(RX-22, -4); ctx.stroke();
  // Pipe end cap
  ctx.fillStyle = crashed ? '#888' : '#aaa';
  ctx.beginPath(); ctx.arc(RX-22, -4, 4, 0, Math.PI*2); ctx.fill();

  // ─ 3. Swingarm (dark, thick) ─
  ctx.strokeStyle = crashed ? '#444' : sc.frame;
  ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(RX, 0); ctx.lineTo(-5, -16); ctx.stroke();

  // ─ 4. Frame & Engine Block ─
  ctx.fillStyle = crashed ? '#333' : sc.frame;
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
  // Main frame triangle
  ctx.beginPath(); ctx.moveTo(-5,-16); ctx.lineTo(20,-16); ctx.lineTo(12,-28); ctx.lineTo(-8,-28); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Engine block
  ctx.fillStyle = crashed ? '#2a2a2a' : '#1a1a1a';
  ctx.beginPath(); ctx.roundRect(-8, -22, 20, 12, 3); ctx.fill(); ctx.stroke();
  // Engine detail
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.roundRect(-5,-20,6,8,2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(3,-20,6,8,2); ctx.fill();

  // ─ 5. Main Body Plastics (Orange KTM style) ─
  ctx.fillStyle = crashed ? '#555' : sc.primary;
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
  // Tank (wider, more realistic)
  ctx.beginPath();
  ctx.moveTo(20, -28);
  ctx.lineTo(-4,  -28);
  ctx.lineTo(-10, -18);
  ctx.lineTo(10,  -10);
  ctx.lineTo(22,  -14);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // White graphic stripe on tank
  ctx.fillStyle = crashed ? '#888' : '#ffffff';
  ctx.beginPath();
  ctx.moveTo(14, -26); ctx.lineTo(2, -26); ctx.lineTo(0, -22); ctx.lineTo(12, -22);
  ctx.closePath(); ctx.fill();

  // Rear subframe & side panel
  ctx.fillStyle = crashed ? '#555' : sc.primary;
  ctx.beginPath();
  ctx.moveTo(-4, -26);
  ctx.lineTo(-28, -28);
  ctx.lineTo(-34, -20);
  ctx.lineTo(-14, -16);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // White stripe on rear panel
  ctx.fillStyle = crashed ? '#888' : '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-8,-26); ctx.lineTo(-22,-27); ctx.lineTo(-24,-23); ctx.lineTo(-10,-22);
  ctx.closePath(); ctx.fill();

  // ─ 6. Front Fender (orange) ─
  ctx.fillStyle = crashed ? '#555' : sc.primary;
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(20,-26); ctx.bezierCurveTo(26,-26,36,-12,40,-3);
  ctx.lineTo(36,-1); ctx.bezierCurveTo(32,-9,26,-20,18,-22);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // ─ 7. Seat (black with seam) ─
  ctx.fillStyle = crashed ? '#333' : '#1a1a1a';
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(12,-30); ctx.lineTo(-22,-30); ctx.lineTo(-26,-26); ctx.lineTo(8,-26); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Seat seam (white stitching)
  ctx.strokeStyle = crashed ? '#555' : '#555';
  ctx.lineWidth = 1; ctx.setLineDash([3,3]);
  ctx.beginPath(); ctx.moveTo(10,-28); ctx.lineTo(-21,-28); ctx.stroke();
  ctx.setLineDash([]);

  // ─ 8. Handlebars ─
  ctx.fillStyle = '#1a1a1a'; ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(15,-34,8,8,2); ctx.fill();
  ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(17,-30); ctx.lineTo(11,-44); ctx.lineTo(7,-44); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(11,-44); ctx.lineTo(27,-46); ctx.stroke();
  // Green grip
  ctx.strokeStyle = crashed ? '#555' : '#44dd00'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(23,-45); ctx.lineTo(28,-46); ctx.stroke();

  // ─ 9. Fork Tubes (white/chrome) ─
  ctx.strokeStyle = crashed ? '#888' : '#e0e0e0';
  ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(19,-28); ctx.lineTo(FX,-4); ctx.stroke();
  ctx.strokeStyle = crashed ? '#666' : '#aaa';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(21,-28); ctx.lineTo(FX+2,-4); ctx.stroke();

  // ─ 10. Front wheel ─
  const frontSc = sc.crack ? { ...sc, rim: '#c0c0c0', spoke: '#333'} : sc;
  drawWheel(FX, 0, WR, spin, crashed, frontSc);

  // ─ 11. Rider ─
  if (!crashed) { drawRider(frame); }
  else { ctx.save(); ctx.rotate(0.85); drawRider(frame); ctx.restore(); }

  ctx.restore();
}

function drawWheel(ox, oy, r, spin, crashed, sc = {rim:'#ddd',spoke:'#333'}) {
  ctx.save(); ctx.translate(ox, oy);

  if (!crashed) {
    ctx.shadowColor = sc.glow ? sc.glow : 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = sc.glow ? 10 : 4;
  }

  // Thick knobbly black tire
  ctx.strokeStyle = '#181818';
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.stroke();
  
  if (!crashed) { ctx.shadowColor = 'transparent'; }

  // Knobs
  ctx.fillStyle = '#111';
  for (let i = 0; i < 20; i++) {
    const a = spin + (i/20)*Math.PI*2;
    ctx.beginPath();
    ctx.arc(Math.cos(a)*(r+3), Math.sin(a)*(r+3), 3, 0, Math.PI*2);
    ctx.fill();
  }

  // Rim
  ctx.strokeStyle = sc.rim; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, r-6, 0, Math.PI*2); ctx.stroke();

  // Spokes
  ctx.strokeStyle = sc.spoke; ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = spin + (i/8)*Math.PI*2;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*(r-6), Math.sin(a)*(r-6)); ctx.stroke();
  }

  // Hub cap
  ctx.fillStyle = '#888';
  ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();

  ctx.restore();
}

function drawRider(frame) {
  const bob = Math.sin(frame * 0.18) * (gasDown ? 1.8 : 0.6);
  const lean = gasDown ? -0.08 : (brakeDown ? 0.06 : 0);
  ctx.save();
  ctx.rotate(lean);

  // Boot (single - 2D side view, one leg visible)
  ctx.fillStyle = '#e05010'; ctx.strokeStyle = '#1a0800'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(-2, -7, 9, 13, 3); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(3, 5, 8, 3.5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff7030';
  ctx.beginPath(); ctx.roundRect(-1, -6, 7, 4, 2); ctx.fill();

  // Leg (single - Blue denim, side view)
  ctx.strokeStyle = '#2255aa'; ctx.lineWidth = 11; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-8, -26+bob); ctx.lineTo(-2, -8+bob); ctx.stroke();
  ctx.strokeStyle = '#1a3d80'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-8, -26+bob); ctx.lineTo(-2, -8+bob); ctx.stroke();

  // Knee pad (single)
  ctx.fillStyle = '#334455'; ctx.strokeStyle = '#222'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(-5, -17+bob, 5, 6, 0.3, 0, Math.PI*2); ctx.fill(); ctx.stroke();


  // Jacket (Dark grey)
  ctx.fillStyle = '#2a2a2a'; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-18,-24+bob); ctx.lineTo(-5,-24+bob); ctx.lineTo(-3,-44+bob); ctx.lineTo(-18,-44+bob);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#383838';
  ctx.beginPath(); ctx.roundRect(-16,-42+bob,5,10,2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-8,-42+bob,4,10,2); ctx.fill();

  // Orange chest stripe
  ctx.fillStyle = '#e85010'; ctx.strokeStyle = '#1a0800'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(-17,-44+bob,13,5,2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-6,-44+bob,3,14,2); ctx.fill(); ctx.stroke();

  // Number plate
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.roundRect(-14,-39+bob,8,6,1); ctx.fill();
  ctx.fillStyle = '#111'; ctx.font = 'bold 5px Arial';
  ctx.fillText('18',-13,-34+bob);

  // Arms
  ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-12,-41+bob); ctx.lineTo(4,-37+bob); ctx.lineTo(18,-41); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-7,-42+bob); ctx.lineTo(10,-38+bob); ctx.lineTo(22,-43); ctx.stroke();

  // Gloves (bright green)
  ctx.fillStyle = '#44dd00'; ctx.strokeStyle = '#1a4400'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(18,-41,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(23,-43,5,0,Math.PI*2); ctx.fill(); ctx.stroke();

  // Neck
  ctx.fillStyle = '#e8c090';
  ctx.beginPath(); ctx.roundRect(-11,-48+bob,6,6,2); ctx.fill();

  // Helmet shell (white)
  ctx.fillStyle = '#f0f0f0'; ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-9,-57+bob,16,-Math.PI*0.85,Math.PI*0.3);
  ctx.lineTo(2,-48+bob); ctx.lineTo(-5,-44+bob);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Visor peak (orange)
  ctx.fillStyle = '#e85010'; ctx.strokeStyle = '#1a0800'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-22,-63+bob); ctx.lineTo(4,-62+bob); ctx.lineTo(0,-58+bob); ctx.lineTo(-18,-59+bob);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Goggle strap
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.roundRect(-24,-61+bob,4,6,1); ctx.fill();

  // Face opening
  ctx.fillStyle = '#222'; ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-4,-58+bob); ctx.lineTo(2,-54+bob); ctx.lineTo(-1,-47+bob); ctx.lineTo(-8,-46+bob);
  ctx.closePath(); ctx.fill();

  // Goggles (blue)
  ctx.fillStyle = '#2288ff'; ctx.strokeStyle = '#0044aa'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-2,-60+bob); ctx.lineTo(-18,-59+bob); ctx.lineTo(-15,-52+bob); ctx.lineTo(0,-53+bob);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Visor glare
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.ellipse(-9,-57+bob,5,2,0.1,0,Math.PI*2); ctx.fill();

  // Helmet highlight
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.ellipse(-14,-65+bob,6,4,-0.5,0,Math.PI*2); ctx.fill();

  ctx.restore();
}


// =============================================================
//  Bootstrap — runs on page load
// =============================================================
LevelManager.init();
buildLevelGrid();
updateHomeStars();

// =============================================================
//  Custom Wheel Helpers
// =============================================================

function drawSpokeWheel(ox, oy, r, spin, crashed, chrome) {
  ctx.save(); ctx.translate(ox, oy);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle = crashed?'#777':chrome; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0,0,r-4,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle = crashed?'#666':chrome; ctx.lineWidth = 1;
  for(let i=0;i<16;i++){const a=spin+(i/16)*Math.PI*2;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*(r-4),Math.sin(a)*(r-4));ctx.stroke();}
  ctx.fillStyle=crashed?'#888':chrome; ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawBicycleWheel(ox, oy, r, spin, crashed) {
  ctx.save(); ctx.translate(ox, oy);
  ctx.strokeStyle='#111'; ctx.lineWidth=9;
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle=crashed?'#777':'#c0c0c0'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(0,0,r-5,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle=crashed?'#555':'#aaa'; ctx.lineWidth=1;
  for(let i=0;i<20;i++){const a=spin+(i/20)*Math.PI*2;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*(r-5),Math.sin(a)*(r-5));ctx.stroke();}
  ctx.fillStyle=crashed?'#888':'#ddd'; ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawPixelWheel(ox, oy, spin, crashed) {
  ctx.save(); ctx.translate(ox, oy);
  const blk=crashed?'#222':'#1a1a2e'; const grey=crashed?'#555':'#7799bb';
  ctx.fillStyle=blk;
  for(let i=0;i<12;i++){const a=(i/12)*Math.PI*2;ctx.fillRect(Math.cos(a)*18-3,Math.sin(a)*18-3,6,6);}
  ctx.fillRect(-13,-13,26,26); ctx.fillRect(-15,-9,30,18); ctx.fillRect(-9,-15,18,30);
  ctx.fillStyle=grey;
  for(let i=0;i<6;i++){const a=spin+(i/6)*Math.PI*2;ctx.fillRect(Math.cos(a)*10-2,Math.sin(a)*10-2,4,4);}
  ctx.fillStyle=crashed?'#999':'#ddd'; ctx.fillRect(-3,-3,6,6);
  ctx.restore();
}

function drawMagWheel(ox, oy, r, spin, crashed, rim, dark) {
  ctx.save(); ctx.translate(ox, oy);
  ctx.strokeStyle='#111'; ctx.lineWidth=10;
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle=crashed?'#777':rim; ctx.lineWidth=3;
  ctx.beginPath(); ctx.arc(0,0,r-6,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle=crashed?'#555':rim; ctx.lineWidth=5;
  for(let i=0;i<5;i++){const a=spin+(i/5)*Math.PI*2;ctx.beginPath();ctx.moveTo(Math.cos(a)*4,Math.sin(a)*4);ctx.lineTo(Math.cos(a)*(r-7),Math.sin(a)*(r-7));ctx.stroke();}
  ctx.fillStyle=crashed?'#555':dark; ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

// =============================================================
//  Custom Skin Draw Functions
// =============================================================

// ── 1. Vintage Military Motorcycle ──────────────────────────
function drawBikeVintage(b, cam, frame) {
  const sx=b.x-cam; const C=b.crashT>0;
  const WR=18,RX=-26,FX=26;
  ctx.save(); ctx.translate(sx,b.y); ctx.rotate(b.angle);
  const spin=frame*(gasDown?0.2:0.07);
  const olive=C?'#666':'#7a7548', dark=C?'#444':'#4a4020';
  const chrome=C?'#888':'#c8c8c8', leat=C?'#555':'#7a4a28';
  const str='#111';
  drawSpokeWheel(RX,0,WR,spin,C,chrome);
  // Exhaust
  ctx.strokeStyle=chrome;ctx.lineWidth=5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(RX+5,-3);ctx.lineTo(-2,5);ctx.lineTo(-5,14);ctx.stroke();
  ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-5,12);ctx.lineTo(-16,16);ctx.stroke();
  // Frame
  ctx.strokeStyle=dark;ctx.lineWidth=5;ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(RX+4,-5);ctx.lineTo(-4,-20);ctx.lineTo(FX-4,-24);ctx.lineTo(FX,-8);ctx.stroke();
  // Engine with fins
  ctx.fillStyle=dark;ctx.strokeStyle=str;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(-10,-18,22,14,3);ctx.fill();ctx.stroke();
  ctx.strokeStyle=chrome;ctx.lineWidth=1.2;
  for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-1,-15+i*3);ctx.lineTo(7,-17+i*3);ctx.stroke();}
  // Tank (large, bulbous)
  ctx.fillStyle=olive;ctx.strokeStyle=str;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(FX-2,-22);ctx.bezierCurveTo(FX+2,-30,-14,-30,-14,-24);ctx.lineTo(-14,-18);ctx.lineTo(FX,-16);ctx.closePath();ctx.fill();ctx.stroke();
  // Rear mudguard
  ctx.fillStyle=olive;
  ctx.beginPath();ctx.arc(RX,0,WR+5,-Math.PI*0.82,-Math.PI*0.08);ctx.lineTo(-6,-14);ctx.closePath();ctx.fill();ctx.stroke();
  // Seat
  ctx.fillStyle=leat;
  ctx.beginPath();ctx.moveTo(-14,-26);ctx.lineTo(6,-28);ctx.lineTo(8,-23);ctx.lineTo(-14,-21);ctx.closePath();ctx.fill();ctx.stroke();
  // Front mudguard
  ctx.fillStyle=olive;
  ctx.beginPath();ctx.arc(FX,0,WR+5,-Math.PI*0.88,-Math.PI*0.05);ctx.lineTo(FX+12,-14);ctx.closePath();ctx.fill();ctx.stroke();
  // Fork
  ctx.strokeStyle=chrome;ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(FX-5,-26);ctx.lineTo(FX,-2);ctx.stroke();
  // Round headlight
  ctx.fillStyle=C?'#333':'#fffde0';ctx.strokeStyle=chrome;ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(FX+5,-18,7,0,Math.PI*2);ctx.fill();ctx.stroke();
  // Upright handlebars
  ctx.strokeStyle=chrome;ctx.lineWidth=4;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(FX-5,-26);ctx.lineTo(FX-3,-38);ctx.stroke();
  ctx.beginPath();ctx.moveTo(FX-3,-38);ctx.lineTo(FX+7,-41);ctx.stroke();
  ctx.beginPath();ctx.moveTo(FX-3,-38);ctx.lineTo(FX-17,-41);ctx.stroke();
  drawSpokeWheel(FX,0,WR,spin,C,chrome);
  if(!C)drawRider(frame);else{ctx.save();ctx.rotate(0.85);drawRider(frame);ctx.restore();}
  ctx.restore();
}

// ── 2. Beach Cruiser Bicycle ──────────────────────────────────
function drawBikeCruiser(b, cam, frame) {
  const sx=b.x-cam; const C=b.crashT>0;
  const WR=20,RX=-26,FX=26;
  ctx.save(); ctx.translate(sx,b.y); ctx.rotate(b.angle);
  const spin=frame*(gasDown?0.42:0.12);
  const red=C?'#882222':'#dd2200', chr=C?'#888':'#c8c8c8';
  const dark='#111', leat=C?'#555':'#8b5e3c';
  drawBicycleWheel(RX,0,WR,spin,C);
  // Chain
  ctx.strokeStyle='#444';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(RX+4,4);ctx.lineTo(-4,4);ctx.stroke();
  ctx.beginPath();ctx.arc(-4,3,7,0.1,Math.PI*1.9);ctx.stroke();
  // Frame tubes
  ctx.strokeStyle=red;ctx.lineWidth=6;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(RX+2,-2);ctx.lineTo(-4,-28);ctx.stroke(); // seat stay
  ctx.beginPath();ctx.moveTo(RX+2,2);ctx.lineTo(-4,2);ctx.stroke(); // chain stay
  ctx.beginPath();ctx.moveTo(-4,2);ctx.lineTo(-4,-30);ctx.stroke(); // seat tube
  ctx.beginPath();ctx.moveTo(-4,-30);ctx.bezierCurveTo(-4,-38,FX-8,-35,FX-6,-26);ctx.stroke(); // top tube
  ctx.beginPath();ctx.moveTo(-4,-30);ctx.lineTo(FX-6,-10);ctx.stroke(); // down tube
  ctx.beginPath();ctx.moveTo(FX-6,-26);ctx.lineTo(FX-6,-10);ctx.stroke(); // head tube
  ctx.strokeStyle=chr;ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(FX-4,-10);ctx.lineTo(FX,-2);ctx.stroke(); // fork
  // Crank
  ctx.fillStyle=chr;ctx.strokeStyle=dark;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(-4,2,5,0,Math.PI*2);ctx.fill();ctx.stroke();
  const ca=frame*0.2;
  ctx.strokeStyle=dark;ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(-4+Math.cos(ca)*7,2+Math.sin(ca)*7);ctx.lineTo(-4+Math.cos(ca+Math.PI)*7,2+Math.sin(ca+Math.PI)*7);ctx.stroke();
  // Seatpost + saddle
  ctx.strokeStyle=chr;ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(-4,-30);ctx.lineTo(-6,-38);ctx.stroke();
  ctx.fillStyle=leat;ctx.strokeStyle=dark;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(-16,-38);ctx.bezierCurveTo(-18,-42,2,-42,2,-38);ctx.lineTo(0,-36);ctx.lineTo(-14,-36);ctx.closePath();ctx.fill();ctx.stroke();
  // Swept handlebars
  ctx.strokeStyle=chr;ctx.lineWidth=4;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(FX-6,-27);ctx.lineTo(FX-4,-38);ctx.stroke();
  ctx.beginPath();ctx.moveTo(FX-4,-38);ctx.bezierCurveTo(FX+4,-40,FX+10,-36,FX+8,-30);ctx.stroke();
  ctx.beginPath();ctx.moveTo(FX-4,-38);ctx.bezierCurveTo(FX-12,-40,FX-18,-36,FX-16,-30);ctx.stroke();
  drawBicycleWheel(FX,0,WR,spin,C);
  if(!C)drawRider(frame);else{ctx.save();ctx.rotate(0.85);drawRider(frame);ctx.restore();}
  ctx.restore();
}

// ── 3. Pixel Art Dirt Bike ────────────────────────────────────
function drawBikePixel(b, cam, frame) {
  const sx=b.x-cam; const C=b.crashT>0;
  const RX=-28,FX=28;
  ctx.save(); ctx.translate(sx,b.y); ctx.rotate(b.angle);
  const spin=frame*(gasDown?0.3:0.1);
  const blu=C?'#557799':'#1ab2e8', dblu=C?'#335577':'#0077bb';
  const wht=C?'#aaa':'#e8f4ff', blk='#1a1a2e', grey=C?'#666':'#8899aa';
  const S=5;
  function px(x,y,c,w=S,h=S){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}
  drawPixelWheel(RX,0,spin,C);
  // Exhaust pixels
  px(RX-S,0,grey,S,S);px(RX-S*2,S,grey,S,S*2);px(RX-S*3,S,grey,S*2,S);
  // Engine block
  px(-S*2,-S*3,grey,S*4,S*3);px(-S,-S*4,blk,S*2,S);
  // Body rear
  px(RX+S,-S*5,dblu,S*5,S*2);px(RX+S,-S*3,blu,S*5,S*5);
  // Body front
  px(-S,-S*5,blu,S*8,S*4);px(S,-S*6,dblu,S*5,S);
  // Seat
  px(-S*5,-S*7,blk,S*8,S*2);
  // Handlebars
  px(FX-S,-S*9,blk,S,S*4);px(FX-S*2,-S*9,blk,S*3,S);
  // Front fork
  px(FX-S,-S*4,wht,S,S*4);
  drawPixelWheel(FX,0,spin,C);
  if(!C)drawRider(frame);else{ctx.save();ctx.rotate(0.85);drawRider(frame);ctx.restore();}
  ctx.restore();
}

// ── 4. Bimota-style Exotic Racer ─────────────────────────────
function drawBikeBimota(b, cam, frame) {
  const sx=b.x-cam; const C=b.crashT>0;
  const WR=18,RX=-26,FX=28;
  ctx.save(); ctx.translate(sx,b.y); ctx.rotate(b.angle);
  const spin=frame*(gasDown?0.3:0.1);
  const silver=C?'#777':'#c0c0c0', alum=C?'#999':'#dcdcdc';
  const red=C?'#882222':'#cc1111', dark=C?'#333':'#111';
  drawMagWheel(RX,0,WR,spin,C,silver,dark);
  // Exposed lattice frame (triangle trusses)
  ctx.strokeStyle=silver;ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();
  ctx.moveTo(RX+4,-4);ctx.lineTo(-8,-22);ctx.lineTo(8,-26);ctx.lineTo(FX-2,-10);
  ctx.moveTo(-8,-22);ctx.lineTo(0,-8);ctx.lineTo(RX+4,-4);
  ctx.moveTo(0,-8);ctx.lineTo(FX-2,-10);ctx.stroke();
  ctx.strokeStyle=alum;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(-8,-22);ctx.lineTo(-4,-12);ctx.stroke();
  ctx.beginPath();ctx.moveTo(2,-24);ctx.lineTo(4,-10);ctx.stroke();
  // Engine visible through frame
  ctx.fillStyle=C?'#444':'#909090';
  ctx.beginPath();ctx.roundRect(-8,-18,18,12,4);ctx.fill();
  // Red tank panel
  ctx.fillStyle=red;ctx.strokeStyle=dark;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(6,-24);ctx.lineTo(-6,-24);ctx.lineTo(-8,-20);ctx.lineTo(8,-18);ctx.closePath();ctx.fill();ctx.stroke();
  // Red tail fairing
  ctx.beginPath();ctx.moveTo(-6,-24);ctx.lineTo(-22,-22);ctx.lineTo(-26,-16);ctx.lineTo(-8,-12);ctx.lineTo(-6,-20);ctx.closePath();ctx.fill();ctx.stroke();
  // Swingarm
  ctx.strokeStyle=silver;ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(RX+4,-4);ctx.lineTo(-2,-14);ctx.stroke();
  // Under-seat exhaust
  ctx.strokeStyle=dark;ctx.lineWidth=8;ctx.lineCap='butt';
  ctx.beginPath();ctx.moveTo(-6,2);ctx.lineTo(-14,8);ctx.lineTo(-24,8);ctx.stroke();
  ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(-24,6);ctx.lineTo(-30,6);ctx.stroke();
  // Nose fairing (angular)
  ctx.fillStyle=C?'#444':'#181818';ctx.strokeStyle=dark;
  ctx.beginPath();ctx.moveTo(FX,-12);ctx.lineTo(FX+14,-17);ctx.lineTo(FX+10,-6);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=C?'#333':'#224488';
  ctx.beginPath();ctx.moveTo(FX+2,-14);ctx.lineTo(FX+10,-17);ctx.lineTo(FX+8,-10);ctx.closePath();ctx.fill();
  // Fork
  ctx.strokeStyle=alum;ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(FX-4,-26);ctx.lineTo(FX,-4);ctx.stroke();
  // Handlebars (low racing clip-ons)
  ctx.strokeStyle=dark;ctx.lineWidth=4;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(FX-4,-28);ctx.lineTo(FX-2,-34);ctx.stroke();
  ctx.beginPath();ctx.moveTo(FX-2,-34);ctx.lineTo(FX+8,-36);ctx.stroke();
  ctx.beginPath();ctx.moveTo(FX-2,-34);ctx.lineTo(FX-14,-36);ctx.stroke();
  drawMagWheel(FX,0,WR,spin,C,silver,dark);
  if(!C)drawRider(frame);else{ctx.save();ctx.rotate(0.85);drawRider(frame);ctx.restore();}
  ctx.restore();
}

// ── 5. BMW S1000RR Full-Fairing Sportbike ────────────────────
function drawBikeBMW(b, cam, frame) {
  const sx=b.x-cam; const C=b.crashT>0;
  const WR=18,RX=-26,FX=26;
  ctx.save(); ctx.translate(sx,b.y); ctx.rotate(b.angle);
  const spin=frame*(gasDown?0.3:0.1);
  const blue=C?'#445577':'#1155aa', wht=C?'#999':'#f0f4ff';
  const blk=C?'#222':'#0a0a14', dark='#111', carbon=C?'#333':'#1a1a1a';
  const silver=C?'#777':'#c0c0c0';
  drawMagWheel(RX,0,WR,spin,C,silver,dark);
  // Main fairing bodywork (enclosed aerodynamic shell)
  // Lower belly pan
  ctx.fillStyle=blk;ctx.strokeStyle=dark;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(RX+8,4);ctx.lineTo(FX,4);ctx.lineTo(FX+10,-4);ctx.lineTo(-4,2);ctx.closePath();ctx.fill();ctx.stroke();
  // Rear fairing / tail unit
  ctx.fillStyle=blue;
  ctx.beginPath();ctx.moveTo(-4,-14);ctx.lineTo(-24,-20);ctx.lineTo(-28,-12);ctx.lineTo(-10,0);ctx.closePath();ctx.fill();ctx.stroke();
  // M-stripe on rear (white)
  ctx.strokeStyle=wht;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-8,-12);ctx.lineTo(-22,-17);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-10,-15);ctx.lineTo(-24,-20);ctx.stroke();
  // Main tank / mid fairing (blue)
  ctx.fillStyle=blue;
  ctx.beginPath();ctx.moveTo(FX-2,-10);ctx.lineTo(0,-26);ctx.lineTo(-10,-26);ctx.lineTo(-16,-14);ctx.lineTo(-4,-6);ctx.closePath();ctx.fill();ctx.stroke();
  // White accent stripe
  ctx.fillStyle=wht;
  ctx.beginPath();ctx.moveTo(4,-24);ctx.lineTo(-6,-24);ctx.lineTo(-10,-18);ctx.lineTo(0,-18);ctx.closePath();ctx.fill();
  // Front fairing nose (blue + black aero)
  ctx.fillStyle=blue;
  ctx.beginPath();ctx.moveTo(FX-2,-10);ctx.lineTo(FX+4,-18);ctx.lineTo(FX+14,-10);ctx.lineTo(FX+10,-2);ctx.closePath();ctx.fill();ctx.stroke();
  // BMW twin-LED headlight (signature asymmetric)
  ctx.fillStyle=C?'#333':'#fffde0';ctx.strokeStyle=silver;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(FX+10,-11,5,3,0.2,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.ellipse(FX+10,-6,4,2.5,0.2,0,Math.PI*2);ctx.fill();ctx.stroke();
  // Carbon fork
  ctx.strokeStyle=carbon;ctx.lineWidth=6;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(FX-2,-26);ctx.lineTo(FX,-4);ctx.stroke();
  ctx.strokeStyle=silver;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(FX-1,-26);ctx.lineTo(FX+1,-4);ctx.stroke();
  // Low racing clip-on bars
  ctx.strokeStyle=dark;ctx.lineWidth=4;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(FX-4,-28);ctx.lineTo(FX-2,-33);ctx.stroke();
  ctx.beginPath();ctx.moveTo(FX-2,-33);ctx.lineTo(FX+6,-35);ctx.stroke();
  ctx.beginPath();ctx.moveTo(FX-2,-33);ctx.lineTo(FX-12,-35);ctx.stroke();
  // Seat cowl (black carbon)
  ctx.fillStyle=carbon;
  ctx.beginPath();ctx.moveTo(-4,-26);ctx.lineTo(8,-28);ctx.lineTo(6,-22);ctx.lineTo(-4,-20);ctx.closePath();ctx.fill();ctx.stroke();
  drawMagWheel(FX,0,WR,spin,C,silver,dark);
  if(!C)drawRider(frame);else{ctx.save();ctx.rotate(0.85);drawRider(frame);ctx.restore();}
  ctx.restore();
}

// =============================================================
//  Skins & Garage
// =============================================================

const SKINS = [
  { id: 'classic',  name: 'Classic Blaze',    reqStars: 0,
    colors: { primary: '#e84400', secondary: '#ff6622', frame: '#222222', rim: '#e8e8e8', spoke: '#444', exhaust: '#cccccc', glow: null } },
  { id: 'neon',     name: 'Neon Stealth',      reqStars: 3,
    colors: { primary: '#111111', secondary: '#222222', frame: '#050505', rim: '#00ffff', spoke: '#00ccff', exhaust: '#111', glow: '#00ffff' } },
  { id: 'scrap',    name: 'Scrap Metal',        reqStars: 6,
    colors: { primary: '#8b4513', secondary: '#5c4033', frame: '#4a3627', rim: '#964B00', spoke: '#5c4033', exhaust: '#654321', crack: true } },
  { id: 'gold',     name: 'Golden Legend',      reqStars: 10,
    colors: { primary: '#ffd700', secondary: '#daa520', frame: '#b8860b', rim: '#222222', spoke: '#111', exhaust: '#ffec8b', glow: '#ffd700' } },
  { id: 'arctic',   name: 'Arctic Frost',       reqStars: 15,
    colors: { primary: '#ffffff', secondary: '#add8e6', frame: '#f0f8ff', rim: '#add8e6', spoke: '#ffffff', exhaust: '#dff5ff', parts: 'snow' } },
  // ── Custom geometry skins (image-based) ──
  { id: 'vintage',  name: 'Vintage Classic',    reqStars: 0,  drawFn: drawBikeVintage },
  { id: 'cruiser',  name: 'Beach Cruiser',       reqStars: 2,  drawFn: drawBikeCruiser },
  { id: 'pixel',    name: 'Pixel Rider',         reqStars: 4,  drawFn: drawBikePixel },
  { id: 'bimota',   name: 'Bimota Racer',        reqStars: 8,  drawFn: drawBikeBimota },
  { id: 'bmw',      name: 'BMW S1000RR',         reqStars: 12, drawFn: drawBikeBMW },
];

let currentGarageSkinIdx = 0;
let garageRaf = null;
let garageFrame = 0;

function openGarage() {
  document.getElementById('levelSelect').style.display = 'none';
  document.getElementById('garageScreen').style.display = 'flex';
  const eq = LevelManager.getEquippedSkin();
  currentGarageSkinIdx = Math.max(0, SKINS.findIndex(s => s.id === eq));
  updateGarageUI();
  
  if (!garageRaf) {
    garageFrame = 0;
    loopGarage();
  }
}

function closeGarage() {
  document.getElementById('levelSelect').style.display = 'flex';
  document.getElementById('garageScreen').style.display = 'none';
  if (garageRaf) {
    cancelAnimationFrame(garageRaf);
    garageRaf = null;
  }
}

function prevSkin() {
  currentGarageSkinIdx = (currentGarageSkinIdx - 1 + SKINS.length) % SKINS.length;
  updateGarageUI();
}

function nextSkin() {
  currentGarageSkinIdx = (currentGarageSkinIdx + 1) % SKINS.length;
  updateGarageUI();
}

function equipSkin() {
  const skin = SKINS[currentGarageSkinIdx];
  const stars = LevelManager.getTotalStars();
  if (stars >= skin.reqStars) {
    LevelManager.setEquippedSkin(skin.id);
    updateGarageUI();
  }
}

function updateGarageUI() {
  const skin = SKINS[currentGarageSkinIdx];
  document.getElementById('skinName').textContent = skin.name;
  
  const stars = LevelManager.getTotalStars();
  const req = document.getElementById('skinReq');
  const eqBtn = document.getElementById('equipSkinBtn');
  
  if (stars < skin.reqStars) {
    req.innerHTML = '🔒 Unlocks at ' + skin.reqStars + ' Stars (You have ' + stars + ')';
    req.style.color = '#ef4444';
    eqBtn.textContent = 'LOCKED';
    eqBtn.style.background = '#475569';
    eqBtn.style.cursor = 'not-allowed';
    eqBtn.disabled = true;
  } else {
    if (LevelManager.getEquippedSkin() === skin.id) {
      req.innerHTML = '✅ Equipped';
      req.style.color = '#4ade80';
      eqBtn.textContent = 'EQUIPPED';
      eqBtn.style.background = '#0ea5e9';
      eqBtn.style.cursor = 'default';
      eqBtn.disabled = true;
    } else {
      req.innerHTML = '🔓 Unlocked';
      req.style.color = '#94a3b8';
      eqBtn.textContent = 'EQUIP';
      eqBtn.style.background = '#3b82f6';
      eqBtn.style.cursor = 'pointer';
      eqBtn.disabled = false;
    }
  }
}

function loopGarage() {
  const cn = document.getElementById('skinCanvas');
  const cx = cn.getContext('2d');
  const W = cn.width, H = cn.height;

  // Background gradient
  const bg = cx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(1, '#1e293b');
  cx.fillStyle = bg;
  cx.fillRect(0, 0, W, H);

  // Ground line
  cx.fillStyle = '#334155';
  cx.fillRect(0, H * 0.65, W, H * 0.35);
  cx.fillStyle = '#475569';
  cx.fillRect(0, H * 0.65, W, 3);

  // Redirect global ctx to the preview canvas
  const mainCtx = ctx;
  ctx = cx;  // Works now that ctx is `let`

  const skin = SKINS[currentGarageSkinIdx];
  const fakeBike = {
    x: W / 2,
    y: H * 0.65,   // sit on the ground line
    angle: 0,
    crashT: 0,
    skinId: skin.id
  };

  const oldGas = gasDown;
  gasDown = true;
  try {
    drawBike(fakeBike, 0, garageFrame);
  } catch(e) { /* safety */ }
  gasDown = oldGas;

  // Restore the real canvas ctx
  ctx = mainCtx;

  garageFrame++;
  garageRaf = requestAnimationFrame(loopGarage);
}
