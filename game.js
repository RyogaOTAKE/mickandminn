'use strict';
// UPRISING — Dystopian 2D Action  (GBA-style)

// ── Engine ────────────────────────────────────────────────────────
const TILE = 16;
const MW = 30, MH = 19;
const CW = MW * TILE;   // 480
const CH = MH * TILE;   // 304

const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
canvas.width  = CW;
canvas.height = CH;

// Scale canvas to fit screen while preserving aspect ratio
function resize() {
  const scaleX = window.innerWidth  / CW;
  const scaleY = window.innerHeight / CH;
  const scale  = Math.min(scaleX, scaleY) * 0.95;
  const w = Math.floor(CW * scale);
  const h = Math.floor(CH * scale);
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
  document.getElementById('wrap').style.width  = w + 'px';
  document.getElementById('wrap').style.height = h + 'px';
}
window.addEventListener('resize', resize);
resize();

// ── Palette ───────────────────────────────────────────────────────
const C = {
  bg:'#060a10',
  fl:'#0d1520',  fl2:'#111e30',
  wl:'#0c1828',  wlL:'#162840', wlD:'#05100e',
  rd:'#b82020',  drd:'#6e1010', brd:'#dd3333',
  yl:'#d8981a',  yl2:'#f0c030',
  gn:'#166e40',  gnL:'#1ea860',
  gy:'#263544',  lgy:'#6e8090',
  wh:'#ccdce8',
  sk:'#c09050',
  bl:'#0f2e80',  lbl:'#2a55c0',
  or:'#cc4f10',
  bk:'#000000',
};

// ── Tile types ────────────────────────────────────────────────────
const FLOOR=0,WALL=1,EXIT=2,MACH=3,CAM=4,FILE=5,BROAD=6;

// ── Map parser ────────────────────────────────────────────────────
function parseMap(rows) {
  const grid = [];
  const spawns = { player: null, guards: [] };
  for (let y = 0; y < MH; y++) {
    grid[y] = [];
    const row = (rows[y] || '');
    for (let x = 0; x < MW; x++) {
      const ch = row[x] || '#';
      switch (ch) {
        case '#': grid[y][x] = WALL;  break;
        case '.': grid[y][x] = FLOOR; break;
        case 'E': grid[y][x] = EXIT;  break;
        case 'M': grid[y][x] = MACH;  break;
        case 'C': grid[y][x] = CAM;   break;
        case 'F': grid[y][x] = FILE;  break;
        case 'B': grid[y][x] = BROAD; break;
        case 'P': grid[y][x] = FLOOR; spawns.player = { x, y }; break;
        case 'G': grid[y][x] = FLOOR; spawns.guards.push({ x, y }); break;
        default:  grid[y][x] = FLOOR; break;
      }
    }
  }
  return { grid, spawns };
}

// ── Level definitions ─────────────────────────────────────────────
const LEVEL_DEFS = [
  {
    title: 'THE FACTORY',
    sub:   'MISSION 01  ——  SABOTAGE',
    objLabel: 'Destroy all machines',
    objType: [MACH],
    rows: [
      '##############################',
      '#............................#',
      '#.######.......######........#',
      '#.#....#.......#....#........#',
      '#.#..M.#.......#.M..#........#',
      '#.#....#.......#....#........#',
      '#.######.......######........#',
      '#............................#',
      '#...G............G.....G....#',
      '#............................#',
      '#.P..........................#',
      '#............................#',
      '#...G............G.....G....#',
      '#............................#',
      '#.####.#######.#######.####.#',
      '#.#....#.....#.#.....#....#.#',
      '#.#..M.#.G...#.#...G.#.M..#.#',
      '#.#....#.....#.#.....#....#.E#',
      '##############################',
    ],
  },
  {
    title: 'THE MINISTRY',
    sub:   'MISSION 02  ——  INCINERATE',
    objLabel: 'Destroy files and cameras',
    objType: [FILE, CAM],
    rows: [
      '##############################',
      '#............................#',
      '#.###########.###########...#',
      '#.#...G.....#.#.....G...#...#',
      '#.#...F.....#.#.....F...#...#',
      '#.#.........#.#.........#...#',
      '#.#.C.......#.#.......C.#...#',
      '#.###########.###########...#',
      '#............................#',
      '#...G....G........G....G....#',
      '#............................#',
      '#.P..........................#',
      '#............................#',
      '#...G....G........G....G....#',
      '#............................#',
      '#.########################..#',
      '#.#...F....C....C....F...#..#',
      '#.#......................#..E#',
      '##############################',
    ],
  },
  {
    title: 'THE BROADCAST TOWER',
    sub:   'MISSION 03  ——  SILENCE',
    objLabel: 'Destroy broadcast units',
    objType: [BROAD],
    rows: [
      '##############################',
      '#............................#',
      '#.##.....B.......B.....##...#',
      '#.##.....##.....##.....##...#',
      '#.##......#######......##...#',
      '#.##...................##...#',
      '#.#G....................G#..#',
      '#.##...................##...#',
      '#.####.#########.####.###..#',
      '#.....G.........G..........#',
      '#.P........................#',
      '#..........................#',
      '#...G......G.....G......G..#',
      '#..........................#',
      '#.####.##########.####.....#',
      '#.#....#........#....#.....#',
      '#.#..B.#.G....G.#.B..#.....#',
      '#.#....#........#....#....E#',
      '##############################',
    ],
  },
];

// ── Story pages ───────────────────────────────────────────────────
const STORIES = [
  // Opening
  [
    ['YEAR 2087.', C.yl],
    ['The Party has ruled for 44 years.', C.wh],
    ['You are Worker #4291-B.', C.lgy],
    ['Your purpose: serve the State.', C.lgy],
    ['', null],
    ['Today they took your friend', C.wh],
    ['to the Ministry.', C.wh],
    ['"Thought crime," they said.', C.rd],
    ['', null],
    ['You said nothing.', C.lgy],
    ['Just like every other time.', C.lgy],
    ['', null],
    ['...until now.', C.yl2],
  ],
  // After level 0
  [
    ['The machines are silent.', C.wh],
    ['', null],
    ['For the first time in years,', C.lgy],
    ['you feel something.', C.lgy],
    ['', null],
    ['They banned the word 20 years ago.', C.lgy],
    ['', null],
    ['"FREEDOM."', C.yl2],
    ['', null],
    ['The Ministry keeps records.', C.wh],
    ['Records of the disappeared.', C.rd],
    ['', null],
    ['Those records must burn.', C.brd],
  ],
  // After level 1
  [
    ['The files are ash.', C.wh],
    ['', null],
    ['But what you read...', C.lgy],
    ['thousands of names.', C.rd],
    ['People who no longer exist.', C.rd],
    ['', null],
    ['You knew some of them.', C.wh],
    ['', null],
    ['The Voice broadcasts 24 hours.', C.lgy],
    ['"Fear. Obedience. Order."', C.rd],
    ['', null],
    ['Tonight —', C.wh],
    ['it stops.', C.yl2],
  ],
  // Ending
  [
    ['The broadcast tower falls silent.', C.wh],
    ['', null],
    ['For one moment,', C.lgy],
    ['the city holds its breath.', C.lgy],
    ['', null],
    ['No slogans. No commands.', C.lgy],
    ['Just... silence.', C.wh],
    ['', null],
    ['Somewhere in the dark,', C.lgy],
    ['a radio crackles to life.', C.wh],
    ['', null],
    ['Someone is listening.', C.yl],
    ['', null],
    ['The revolution is not an event.', C.wh],
    ['It is a decision.', C.yl2],
    ['', null],
    ['Made again.', C.lgy],
    ['Every day.', C.yl2],
  ],
];

// ── Input ─────────────────────────────────────────────────────────
const keys = {};
const justDown = {};

window.addEventListener('keydown', e => {
  if (!keys[e.code]) { justDown[e.code] = true; }
  keys[e.code] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
    e.preventDefault();
  }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function clearJustDown() {
  for (const k in justDown) delete justDown[k];
}

function anyKey() {
  return Object.values(justDown).some(v => v);
}

// ── Mobile input ──────────────────────────────────────────────────
function setupMobile() {
  if (!('ontouchstart' in window) && navigator.maxTouchPoints === 0) return;
  const ui = document.getElementById('mobile-ui');
  ui.style.display = 'block';

  function hold(id, code) {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', e => { e.preventDefault(); keys[code] = true; justDown[code] = true; }, { passive:false });
    el.addEventListener('touchend',   e => { e.preventDefault(); keys[code] = false; }, { passive:false });
    el.addEventListener('touchcancel',e => { keys[code] = false; }, { passive:false });
  }
  hold('btn-up',    'ArrowUp');
  hold('btn-down',  'ArrowDown');
  hold('btn-left',  'ArrowLeft');
  hold('btn-right', 'ArrowRight');
  hold('abtn-action', 'KeyZ');
  hold('abtn-bomb',   'KeyX');
}
setupMobile();

// ── Game state ────────────────────────────────────────────────────
let screen  = 'title';   // title | story | play | lvlend | gameover | win
let levelIdx = 0;
let storyIdx = 0;       // which STORIES[] entry
let storyLine = 0;      // current line shown
let storyTimer = 0;
let totalBombs = 3;
let score = 0;

// Per-level state
let map, player, guards, targets, bombs, particles, effects;
let camX = 0;
let frameN = 0;
let alertBlink = 0;
let objCount = 0;   // remaining objectives this level

function resetLevel(idx) {
  levelIdx = idx;
  const def = LEVEL_DEFS[idx];
  const parsed = parseMap(def.rows);

  map = parsed.grid;

  // Player
  const ps = parsed.spawns.player;
  player = {
    x: ps.x * TILE, y: ps.y * TILE,
    vx: 0, vy: 0,
    hp: 3, maxHp: 3,
    dir: 1,   // 1=right -1=left
    state: 'idle',  // idle walk attack hurt dead
    stateTimer: 0,
    invincible: 0,
    bombs: totalBombs,
    moveTimer: 0,
  };

  // Guards
  guards = parsed.spawns.guards.map((g, i) => ({
    x: g.x * TILE, y: g.y * TILE,
    startX: g.x * TILE, startY: g.y * TILE,
    dir: (i % 2 === 0) ? 1 : -1,
    state: 'patrol',   // patrol | alert | chase | stun
    stateTimer: 0,
    alertTimer: 0,
    speed: 0.55 + Math.random() * 0.25,
    patrolDist: (3 + Math.floor(Math.random() * 5)) * TILE,
    patrolPhase: 0,
    stunTimer: 0,
    hp: 2,
  }));

  // Targets (scan map)
  targets = [];
  for (let gy = 0; gy < MH; gy++) {
    for (let gx = 0; gx < MW; gx++) {
      const t = map[gy][gx];
      if (def.objType.includes(t)) {
        targets.push({ tx: gx, ty: gy, type: t, alive: true });
      }
    }
  }
  objCount = targets.length;

  bombs     = [];
  particles = [];
  effects   = [];
  frameN    = 0;
  alertBlink = 0;
}

// ── Drawing helpers ───────────────────────────────────────────────
function rect(x, y, w, h, col) {
  ctx.fillStyle = col;
  ctx.fillRect(x, y, w, h);
}

function text(str, x, y, col, size=8, align='left') {
  ctx.fillStyle = col;
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillText(str, x, y);
}

function clearScreen(col) {
  ctx.fillStyle = col;
  ctx.fillRect(0, 0, CW, CH);
}

// ── Tile rendering ────────────────────────────────────────────────
function drawTile(tx, ty, t, blink) {
  const px = tx * TILE, py = ty * TILE;
  switch (t) {
    case FLOOR:
      rect(px, py, TILE, TILE, (tx+ty)%2===0 ? C.fl : C.fl2);
      break;
    case WALL: {
      rect(px, py, TILE, TILE, C.wl);
      rect(px, py, TILE, 2, C.wlL);
      rect(px, py, 2, TILE, C.wlL);
      rect(px, py+TILE-2, TILE, 2, C.wlD);
      break;
    }
    case EXIT:
      rect(px, py, TILE, TILE, C.fl);
      rect(px+2, py+2, TILE-4, TILE-4, C.gn);
      rect(px+5, py+3, 6, 10, C.gnL);
      break;
    case MACH:
      if (!isTargetAlive(tx,ty)) { rect(px,py,TILE,TILE,C.fl); break; }
      rect(px, py, TILE, TILE, C.gy);
      rect(px+1, py+1, TILE-2, TILE-2, C.wlL);
      rect(px+3, py+3, 10, 5, C.bk);
      rect(px+4, py+4, 2, 3, C.or);
      rect(px+7, py+4, 2, 3, C.yl);
      rect(px+10,py+4, 2, 3, C.or);
      if (blink) { rect(px+1,py+1,3,3,C.brd); }
      break;
    case CAM:
      if (!isTargetAlive(tx,ty)) { rect(px,py,TILE,TILE,C.fl); break; }
      rect(px, py, TILE, TILE, C.fl);
      rect(px+4, py+4, 8, 6, C.gy);
      rect(px+6, py+5, 4, 4, C.bk);
      rect(px+7, py+6, 2, 2, C.rd);
      if (blink) { rect(px+7,py+6,2,2,C.yl2); }
      break;
    case FILE:
      if (!isTargetAlive(tx,ty)) { rect(px,py,TILE,TILE,C.fl); break; }
      rect(px, py, TILE, TILE, C.fl);
      rect(px+3, py+1, 10, 14, C.lgy);
      rect(px+4, py+5, 8, 1, C.gy);
      rect(px+4, py+9, 8, 1, C.gy);
      rect(px+5, py+3, 3, 1, C.bk);
      break;
    case BROAD:
      if (!isTargetAlive(tx,ty)) { rect(px,py,TILE,TILE,C.fl); break; }
      rect(px, py, TILE, TILE, C.fl);
      rect(px+7, py+10, 2, 5, C.lgy);
      rect(px+3, py+4,  10, 1, C.lbl);
      rect(px+5, py+5,  6, 1, C.lbl);
      rect(px+6, py+6,  4, 1, C.lbl);
      rect(px+7, py+7,  2, 2, C.lbl);
      if (blink) { rect(px+7,py+7,2,2,C.yl2); }
      break;
  }
}

function isTargetAlive(tx, ty) {
  return targets.some(t => t.tx === tx && t.ty === ty && t.alive);
}

function drawMap() {
  const blink = (frameN % 40) < 20;
  for (let ty = 0; ty < MH; ty++) {
    for (let tx = 0; tx < MW; tx++) {
      drawTile(tx, ty, map[ty][tx], blink);
    }
  }
}

// ── Sprite drawing ────────────────────────────────────────────────
function drawPlayer(p) {
  if (p.hp <= 0) return;
  const px = Math.round(p.x), py = Math.round(p.y);
  const flip = p.dir < 0;
  const hurt  = p.invincible > 0 && (frameN % 6 < 3);
  const walk  = p.state === 'walk';
  const legOff = walk ? ((Math.floor(frameN/4)%2) * 2 - 1) * 2 : 0;

  ctx.save();
  if (flip) {
    ctx.translate(px + TILE, py);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(px, py);
  }

  if (!hurt) {
    // Coat (dark red = anarchist)
    rect(4,  6,  8, 7, C.drd);
    rect(3,  6,  9, 5, C.rd);
    // Head
    rect(5,  1,  6, 5, C.sk);
    // Hair (dark)
    rect(5,  1,  6, 2, '#2a1a0a');
    rect(5,  1,  2, 4, '#2a1a0a');
    // Eyes
    rect(8,  3,  2, 1, C.bk);
    // Bandana around lower face
    rect(5,  4,  6, 2, '#880000');
    // Belt
    rect(4, 11,  8, 1, C.bk);
    // Legs
    rect(5, 12 + legOff,   2, 4, '#1a1a2a');
    rect(9, 12 - legOff,   2, 4, '#1a1a2a');
    // Boots
    rect(4, 15,  3, 1, '#0a0a10');
    rect(9, 15,  3, 1, '#0a0a10');
    // Arms
    rect(2,  7,  2, 5, C.sk);
    rect(12, 7,  2, 5, C.sk);
  } else {
    // Hurt flash white
    rect(3, 1, 10, 15, '#ffffff44');
  }

  ctx.restore();
}

function drawGuard(g) {
  if (g.stunTimer > 0 && (frameN%6)<3) return; // stun flicker
  const px = Math.round(g.x), py = Math.round(g.y);
  const flip = g.dir < 0;
  const walk  = Math.abs(g.vx||0) > 0.1 || Math.abs(g.vy||0) > 0.1;
  const legOff = walk ? ((Math.floor(frameN/5)%2)*2-1)*2 : 0;
  const isAlert = g.state === 'alert' || g.state === 'chase';

  ctx.save();
  if (flip) {
    ctx.translate(px + TILE, py);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(px, py);
  }

  // Uniform (dark blue)
  const unifCol = g.stunTimer > 0 ? C.gy : (isAlert ? C.lbl : C.bl);
  rect(4,  6,  8, 7, unifCol);
  rect(3,  6,  9, 4, isAlert ? C.lbl : C.bl);
  // Helmet
  rect(4,  0,  8, 3, C.gy);
  rect(3,  2,  10,2, C.gy);
  // Visor
  rect(4,  2,  8, 2, '#001428');
  rect(6,  2,  4, 1, C.lblue || '#3366cc');
  // Face
  rect(5,  4,  6, 3, C.sk);
  // Belt / gear
  rect(4, 11,  8, 1, C.gy);
  // Legs
  rect(5, 12 + legOff, 2, 4, '#1a2030');
  rect(9, 12 - legOff, 2, 4, '#1a2030');
  // Boots
  rect(4, 15, 3, 1, '#080810');
  rect(9, 15, 3, 1, '#080810');
  // Arms
  rect(2,  7,  2, 5, unifCol);
  rect(12, 7,  2, 5, unifCol);
  // Baton (right hand)
  if (!isAlert) { rect(14, 9, 1, 5, C.lgy); }
  else          { rect(14, 7, 1, 6, C.brd); }

  // Alert icon above head
  if (isAlert && (frameN%20)<10) {
    ctx.restore();
    ctx.save();
    ctx.translate(px, py);
    rect(6, -10, 4, 8, C.yl2);
    rect(7, -3, 2, 2, C.yl2);
    // exclamation mark
    ctx.fillStyle = C.bk;
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('!', 8, -9);
  }
  ctx.restore();
}

// ── Bomb / explosion drawing ──────────────────────────────────────
function drawBombs() {
  for (const b of bombs) {
    const px = b.x, py = b.y;
    const pulse = (Math.floor(frameN/4)%2);
    rect(px+4, py+4, 8, 8, C.bk);
    rect(px+5, py+5, 6, 6, C.lgy);
    rect(px+6, py+6, 4, 4, pulse ? C.yl2 : C.rd);
    // Fuse countdown indicator
    const ratio = b.timer / b.maxTimer;
    rect(px+4, py+13, Math.floor(8*ratio), 2, ratio>0.3?C.yl2:C.brd);
  }
}

function drawParticles() {
  for (const p of particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    rect(p.x-p.r, p.y-p.r, p.r*2, p.r*2, p.col);
  }
  ctx.globalAlpha = 1;
}

function drawEffects() {
  for (const e of effects) {
    const a = e.timer / e.maxTimer;
    if (e.type === 'exp') {
      ctx.globalAlpha = a;
      const r = Math.floor((1-a)*40);
      const ox = Math.round(e.x), oy = Math.round(e.y);
      rect(ox-r, oy-r, r*2, r*2, C.yl2);
      rect(ox-Math.floor(r*0.7), oy-Math.floor(r*0.7), Math.floor(r*1.4), Math.floor(r*1.4), C.or);
      rect(ox-Math.floor(r*0.4), oy-Math.floor(r*0.4), Math.floor(r*0.8), Math.floor(r*0.8), C.wh);
    }
    if (e.type === 'txt') {
      ctx.globalAlpha = a;
      text(e.msg, e.x, e.y - (1-a)*16, e.col, 7, 'center');
    }
    ctx.globalAlpha = 1;
  }
}

// ── HUD ───────────────────────────────────────────────────────────
function drawHUD() {
  const def = LEVEL_DEFS[levelIdx];
  // Top bar background
  rect(0, 0, CW, 14, '#000000cc');
  // Level name
  text(def.title, 4, 3, C.yl, 7);
  // HP hearts
  for (let i = 0; i < player.maxHp; i++) {
    rect(CW - 14 - i*14, 3, 10, 8, i < player.hp ? C.brd : C.gy);
    if (i < player.hp) {
      rect(CW-15-i*14,   4,  4, 2, C.brd);
      rect(CW-11-i*14,   4,  4, 2, C.brd);
    }
  }
  // Bombs
  for (let i = 0; i < player.bombs; i++) {
    rect(4 + i*12, CH-12, 8, 8, C.yl);
    rect(7 + i*12, CH-14, 2, 3, C.lgy);
  }
  if (player.bombs > 0) text('BOMB x'+player.bombs, 4, CH-12, C.yl2, 7);

  // Objectives
  const txt = def.objLabel + '  ' + objCount + ' left';
  text(txt, CW/2, 3, C.lgy, 7, 'center');
}

// ── Collision ─────────────────────────────────────────────────────
function tileAt(px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return WALL;
  return map[ty][tx];
}

function isSolid(t) {
  return t === WALL || t === MACH || t === CAM || t === FILE || t === BROAD;
}

function isObjTile(t) {
  return t === MACH || t === CAM || t === FILE || t === BROAD;
}

function canMove(x, y, dx, dy) {
  const nx = x + dx, ny = y + dy;
  const margin = 2;
  const pts = [
    [nx+margin,         ny+margin],
    [nx+TILE-1-margin,  ny+margin],
    [nx+margin,         ny+TILE-1-margin],
    [nx+TILE-1-margin,  ny+TILE-1-margin],
  ];
  for (const [cx, cy] of pts) {
    const t = tileAt(cx, cy);
    if (isSolid(t)) {
      // Allow movement through destroyed objectives
      const objAlive = targets.some(tg => tg.tx===Math.floor(cx/TILE) && tg.ty===Math.floor(cy/TILE) && tg.alive);
      if (t === WALL || objAlive) return false;
    }
  }
  return true;
}

// ── Guard AI ──────────────────────────────────────────────────────
const DETECT_DIST   = 5 * TILE;
const ALERT_LOSE    = 4 * TILE;

function updateGuards() {
  for (const g of guards) {
    if (g.hp <= 0) continue;

    // Stun
    if (g.stunTimer > 0) {
      g.stunTimer--;
      g.vx = 0; g.vy = 0;
      continue;
    }

    const dx = player.x - g.x;
    const dy = player.y - g.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    // Detection
    if (dist < DETECT_DIST && player.hp > 0 && player.invincible === 0) {
      g.state = 'alert';
      g.alertTimer = 180;
    }
    if (g.alertTimer > 0) {
      g.alertTimer--;
      if (g.alertTimer <= 0 && dist > ALERT_LOSE) {
        g.state = 'patrol';
      }
    }

    if (g.state === 'patrol') {
      g.x += g.dir * g.speed;
      g.y  = g.startY;  // keep on patrol row
      g.patrolPhase += g.speed;
      if (g.patrolPhase >= g.patrolDist) {
        g.patrolPhase = 0;
        g.dir *= -1;
      }
      if (!canMove(g.x, g.y, 0, 0)) {
        g.dir *= -1;
        g.x -= g.dir * g.speed * 2;
      }
    } else {
      // Chase
      const speed = 1.2;
      const ndx = dx / (dist||1);
      const ndy = dy / (dist||1);
      const mvx = ndx * speed;
      const mvy = ndy * speed;
      if (canMove(g.x, g.y, mvx, 0)) g.x += mvx;
      if (canMove(g.x, g.y, 0, mvy)) g.y += mvy;
      if (dx !== 0) g.dir = dx > 0 ? 1 : -1;
    }

    g.x = Math.max(0, Math.min((MW-1)*TILE, g.x));
    g.y = Math.max(0, Math.min((MH-1)*TILE, g.y));

    // Hit player
    if (g.state !== 'patrol' && player.invincible === 0 && player.hp > 0) {
      if (dist < TILE * 1.2) {
        hitPlayer(1);
        alertBlink = 30;
      }
    }
  }
}

// ── Player actions ────────────────────────────────────────────────
function updatePlayer() {
  if (player.hp <= 0) return;
  if (player.invincible > 0) player.invincible--;
  if (player.stateTimer > 0) player.stateTimer--;

  const spd = 2;
  let mx = 0, my = 0;
  if (keys['ArrowLeft']  || keys['KeyA']) { mx = -spd; player.dir = -1; }
  if (keys['ArrowRight'] || keys['KeyD']) { mx =  spd; player.dir =  1; }
  if (keys['ArrowUp']    || keys['KeyW']) { my = -spd; }
  if (keys['ArrowDown']  || keys['KeyS']) { my =  spd; }

  if (canMove(player.x, player.y, mx, 0)) player.x += mx;
  if (canMove(player.x, player.y, 0, my)) player.y += my;

  player.x = Math.max(0, Math.min((MW-1)*TILE, player.x));
  player.y = Math.max(0, Math.min((MH-1)*TILE, player.y));

  player.state = (mx !== 0 || my !== 0) ? 'walk' : 'idle';

  // Attack (Z)
  if (justDown['KeyZ'] || justDown['KeyJ']) {
    attackNearbyGuard();
  }

  // Plant bomb (X)
  if (justDown['KeyX'] || justDown['KeyK']) {
    plantBomb();
  }

  // Check exit
  const cx = Math.floor((player.x + TILE/2) / TILE);
  const cy = Math.floor((player.y + TILE/2) / TILE);
  if (map[cy][cx] === EXIT && objCount === 0) {
    levelComplete();
  }
}

function attackNearbyGuard() {
  const RANGE = TILE * 2;
  for (const g of guards) {
    if (g.hp <= 0 || g.stunTimer > 0) continue;
    const dx = g.x - player.x, dy = g.y - player.y;
    if (Math.sqrt(dx*dx+dy*dy) < RANGE) {
      g.stunTimer = 180;
      g.state = 'patrol';
      g.alertTimer = 0;
      spawnParticles(g.x+TILE/2, g.y+TILE/2, C.brd, 8);
      addEffect('txt', g.x+TILE/2, g.y, '★ KO', C.yl2, 60);
      score += 10;
      return;
    }
  }
  // Miss sfx (flash)
  addEffect('txt', player.x+TILE/2, player.y, '...', C.lgy, 40);
}

function plantBomb() {
  if (player.bombs <= 0) {
    addEffect('txt', player.x+TILE/2, player.y, 'NO BOMBS', C.rd, 50);
    return;
  }

  // Find nearest alive target within range
  const RANGE = TILE * 2.5;
  let best = null, bestDist = Infinity;
  for (const t of targets) {
    if (!t.alive) continue;
    const tx = t.tx * TILE, ty = t.ty * TILE;
    const dx = tx - player.x, dy = ty - player.y;
    const d  = Math.sqrt(dx*dx+dy*dy);
    if (d < RANGE && d < bestDist) { bestDist = d; best = t; }
  }

  if (!best) {
    addEffect('txt', player.x+TILE/2, player.y, 'OUT OF RANGE', C.rd, 50);
    return;
  }

  player.bombs--;
  bombs.push({
    x: best.tx * TILE, y: best.ty * TILE,
    target: best,
    timer: 180, maxTimer: 180,
  });
}

function updateBombs() {
  for (let i = bombs.length-1; i >= 0; i--) {
    const b = bombs[i];
    b.timer--;
    if (b.timer <= 0) {
      explodeBomb(b);
      bombs.splice(i, 1);
    }
  }
}

function explodeBomb(b) {
  // Destroy target
  if (b.target.alive) {
    b.target.alive = false;
    map[b.target.ty][b.target.tx] = FLOOR;
    objCount = Math.max(0, objCount - 1);
    score += 100;
  }

  // Explosion visuals
  const cx = b.x + TILE/2, cy = b.y + TILE/2;
  addEffect('exp', cx, cy, null, null, 40);
  spawnParticles(cx, cy, C.yl2, 20);
  spawnParticles(cx, cy, C.or,  14);
  spawnParticles(cx, cy, C.brd, 10);

  const msg = objCount === 0 ? 'LAST ONE!' : 'DESTROYED!';
  addEffect('txt', cx, cy - 16, msg, C.yl2, 80);

  // Damage guards in radius
  const BLAST = TILE * 3;
  for (const g of guards) {
    if (g.hp <= 0) continue;
    const dx = g.x - cx, dy = g.y - cy;
    if (Math.sqrt(dx*dx+dy*dy) < BLAST) {
      g.stunTimer = 300;
      g.state = 'patrol';
      g.alertTimer = 0;
    }
  }

  // Hurt player if too close
  const pdx = player.x+TILE/2 - cx, pdy = player.y+TILE/2 - cy;
  if (Math.sqrt(pdx*pdx+pdy*pdy) < TILE*2 && player.invincible === 0) {
    hitPlayer(1);
  }

  alertBlink = 40;
}

function hitPlayer(dmg) {
  if (player.invincible > 0) return;
  player.hp -= dmg;
  player.invincible = 90;
  spawnParticles(player.x+TILE/2, player.y+TILE/2, C.brd, 10);
  if (player.hp <= 0) {
    player.state = 'dead';
    setTimeout(() => { screen = 'gameover'; }, 1500);
  }
}

// ── Particles / effects helpers ───────────────────────────────────
function spawnParticles(cx, cy, col, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 2.5;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle)*speed,
      vy: Math.sin(angle)*speed,
      r: 1 + Math.floor(Math.random()*3),
      col,
      life: 20 + Math.floor(Math.random()*30),
      maxLife: 50,
    });
  }
}

function updateParticles() {
  for (let i = particles.length-1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.92; p.vy *= 0.92;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function addEffect(type, x, y, msg, col, duration) {
  effects.push({ type, x, y, msg, col, timer: duration, maxTimer: duration });
}

function updateEffects() {
  for (let i = effects.length-1; i >= 0; i--) {
    effects[i].timer--;
    if (effects[i].timer <= 0) effects.splice(i, 1);
  }
}

// ── Level transition ──────────────────────────────────────────────
function levelComplete() {
  score += 200;
  totalBombs = Math.min(5, totalBombs + 1);
  screen = 'story';
  storyIdx = levelIdx + 1;
  storyLine = 0;
  storyTimer = 0;
}

// ── Screen rendering ──────────────────────────────────────────────
function drawTitle() {
  clearScreen(C.bg);

  // Scanlines
  for (let y = 0; y < CH; y += 4) {
    rect(0, y, CW, 1, 'rgba(0,0,0,0.18)');
  }

  // Logo
  const blink = (frameN % 40) < 28;
  rect(0, 70, CW, 2, C.rd);
  rect(0, 200, CW, 2, C.rd);
  ctx.fillStyle = C.rd;
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('UPRISING', CW/2+2, 97);
  ctx.fillStyle = C.yl2;
  ctx.fillText('UPRISING', CW/2, 95);

  ctx.fillStyle = C.lgy;
  ctx.font = 'bold 9px monospace';
  ctx.fillText('A  D Y S T O P I A N  2 D  A C T I O N', CW/2, 140);

  ctx.fillStyle = C.gy;
  ctx.font = '8px monospace';
  ctx.fillText('ARROW KEYS: MOVE   Z: ATTACK   X: BOMB', CW/2, 158);

  if (blink) {
    ctx.fillStyle = C.wh;
    ctx.font = 'bold 9px monospace';
    ctx.fillText('PRESS  Z  OR  ENTER  TO  START', CW/2, 215);
  }

  ctx.fillStyle = C.gy;
  ctx.font = '7px monospace';
  ctx.fillText('SCORE: ' + score, CW/2, 255);

  // Party slogans scrolling
  const slogans = [
    'WORK IS FREEDOM',
    'IGNORANCE IS STRENGTH',
    'WAR IS PEACE',
    'OBEY AND PROSPER',
    'THE PARTY SEES ALL',
  ];
  const si = Math.floor(frameN / 120) % slogans.length;
  if (frameN % 120 < 80) {
    ctx.fillStyle = 'rgba(180,40,20,0.35)';
    ctx.font = '8px monospace';
    ctx.fillText(slogans[si], CW/2, 278);
  }
}

function drawStory() {
  clearScreen(C.bg);
  // Scanlines
  for (let y = 0; y < CH; y += 3) rect(0, y, CW, 1, 'rgba(0,0,0,0.15)');

  const lines = STORIES[storyIdx];
  if (!lines) {
    // No more story — reached the end
    if (storyIdx >= LEVEL_DEFS.length) {
      screen = 'win';
      return;
    }
    screen = 'play';
    resetLevel(storyIdx === 0 ? 0 : levelIdx + 1);
    return;
  }

  const shown = Math.min(lines.length, Math.floor(storyTimer / 8));
  const startY = Math.max(20, CH/2 - shown*14/2);

  for (let i = 0; i < shown; i++) {
    const [msg, col] = lines[i];
    if (!msg) continue;
    const a = Math.min(1, (storyTimer - i*8) / 12);
    ctx.globalAlpha = a;
    ctx.fillStyle = col || C.wh;
    ctx.font = (col === C.yl2 || col === C.yl) ? 'bold 10px monospace' : '9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(msg, CW/2, startY + i*14);
  }
  ctx.globalAlpha = 1;

  // "Press Z to continue"
  if (storyTimer > lines.length * 8 + 30) {
    if ((frameN%30)<20) {
      ctx.fillStyle = C.lgy;
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[ press Z or tap to continue ]', CW/2, CH-20);
    }
  }
}

function drawGameOver() {
  clearScreen(C.bg);
  for (let y = 0; y < CH; y+=3) rect(0,y,CW,1,'rgba(0,0,0,0.2)');
  rect(0, CH/2-40, CW, 80, '#1a0008');
  ctx.fillStyle = C.rd;
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CAPTURED', CW/2, CH/2-12);
  ctx.fillStyle = C.lgy;
  ctx.font = '9px monospace';
  ctx.fillText('SENT TO THE MINISTRY...', CW/2, CH/2+12);
  if ((frameN%40)<28) {
    ctx.fillStyle = C.wh;
    ctx.font = '8px monospace';
    ctx.fillText('Z / tap to try again', CW/2, CH/2+40);
  }
}

function drawWin() {
  clearScreen(C.bg);
  for (let y = 0; y < CH; y+=3) rect(0,y,CW,1,'rgba(0,0,0,0.15)');
  ctx.fillStyle = C.yl2;
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('UPRISING', CW/2, CH/2-50);
  ctx.fillStyle = C.wh;
  ctx.font = '9px monospace';
  ctx.fillText('Mission complete.', CW/2, CH/2-20);
  ctx.fillStyle = C.yl;
  ctx.font = 'bold 10px monospace';
  ctx.fillText('SCORE: ' + score, CW/2, CH/2+5);
  ctx.fillStyle = C.lgy;
  ctx.font = '8px monospace';
  ctx.fillText('The revolution continues.', CW/2, CH/2+30);
  if ((frameN%40)<28) {
    ctx.fillStyle = C.wh;
    ctx.font = '8px monospace';
    ctx.fillText('Z / tap to return to title', CW/2, CH/2+60);
  }
}

function drawPlay() {
  clearScreen(C.bg);
  drawMap();
  drawBombs();
  drawParticles();
  for (const g of guards) {
    if (g.hp > 0) drawGuard(g);
  }
  drawPlayer(player);
  drawEffects();

  // Alert border flash
  if (alertBlink > 0) {
    alertBlink--;
    ctx.strokeStyle = C.brd;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, CW-6, CH-6);
  }

  // Scanline overlay
  for (let y = 0; y < CH; y += 3) rect(0, y, CW, 1, 'rgba(0,0,0,0.08)');

  drawHUD();
}

// ── Main loop ─────────────────────────────────────────────────────
let lastTime = 0;

function loop(ts) {
  requestAnimationFrame(loop);
  if (ts - lastTime < 16.6) return;  // ~60fps cap
  lastTime = ts;
  frameN++;

  switch (screen) {
    case 'title':
      drawTitle();
      if (justDown['KeyZ'] || justDown['Enter'] || justDown['Space']) {
        screen = 'story';
        storyIdx = 0;
        storyLine = 0;
        storyTimer = 0;
        score = 0;
        totalBombs = 3;
      }
      break;

    case 'story':
      storyTimer++;
      drawStory();
      if (justDown['KeyZ'] || justDown['Enter'] || justDown['Space']) {
        const lines = STORIES[storyIdx];
        if (!lines || storyTimer > (lines.length*8 + 20)) {
          // Advance
          if (storyIdx === 0) {
            // Opening → level 0
            screen = 'play';
            resetLevel(0);
          } else if (storyIdx > LEVEL_DEFS.length - 1) {
            // Ending
            screen = 'win';
          } else {
            // Between levels
            screen = 'play';
            resetLevel(storyIdx);
          }
        } else {
          storyTimer = (lines.length*8 + 30);  // skip to end of text
        }
      }
      break;

    case 'play':
      updatePlayer();
      updateGuards();
      updateBombs();
      updateParticles();
      updateEffects();
      drawPlay();
      break;

    case 'gameover':
      frameN++;
      drawPlay();  // show frozen scene
      drawGameOver();
      if (justDown['KeyZ'] || justDown['Enter'] || justDown['Space']) {
        screen = 'play';
        resetLevel(levelIdx);
        player.hp = player.maxHp;
      }
      break;

    case 'win':
      drawWin();
      if (justDown['KeyZ'] || justDown['Enter'] || justDown['Space']) {
        screen = 'title';
        frameN = 0;
      }
      break;
  }

  clearJustDown();
}

requestAnimationFrame(loop);
