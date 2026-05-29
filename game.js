// Mick & Minn - 3D Mouse Adventure Game

let scene, camera, renderer, clock;
let player, playerBody;
let animals = [];
let keys = {};
let yaw = 0, pitch = 0;
let isPointerLocked = false;
let nearbyAnimal = null;
let metAnimals = new Set();
let dialogTimeout = null;
let isMobile = false;

// Touch state
let joystick = { active: false, id: null, startX: 0, startY: 0, dx: 0, dy: 0 };
let lookTouch = { active: false, id: null, lastX: 0, lastY: 0 };

const SPEED = 5;
const INTERACT_DIST = 3.5;
const WORLD_SIZE = 40;

const animalDialogs = {
  dog: [
    ['ワン！', 'やあ、ミック！今日も元気そうだね！'],
    ['ワンワン！', 'ボク最近お気に入りの骨を見つけたんだ！'],
    ['ウォン！', 'いつか一緒に走り回ろうよ！'],
  ],
  duck: [
    ['クワッ！', 'ガァ〜！池の水が今日はとくに気持ちいいよ！'],
    ['クワクワ！', 'パン屑がいっぱい落ちてたんだ、ラッキー！'],
    ['グァッ！', '羽をバタバタさせる練習してるんだ！'],
  ],
  cat: [
    ['ニャー…', 'あなた、そこに居たの。まぁ悪くない日ね。'],
    ['フシャー！', 'ちょっと、邪魔しないでよ…日向ぼっこ中なんだから。'],
    ['ニャーン', '…まあ少しだけ遊んであげてもいいかな。'],
  ],
  rabbit: [
    ['ピョン！', 'ミック、ニンジンケーキ一緒に食べない？'],
    ['ぴょこぴょこ', '今日は草がとっても美味しそうだよ！'],
    ['ぴょんぴょん！', '耳に風が当たると気持ちいいよね！'],
  ],
  bird: [
    ['チュンチュン♪', 'やあ！今日は遠くまで飛んできたんだ！'],
    ['ピーピー！', '高いところから見る景色は最高だよ！'],
    ['チーチー！', '一緒に歌を歌おうよ、ミック！'],
  ],
};

function startGame() {
  document.getElementById('start-screen').style.display = 'none';
  init();
  animate();
  if (isMobile) {
    setupTouch();
  } else {
    setupPointerLock();
  }
}

function detectDevice() {
  isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (isMobile) {
    const desc = document.getElementById('control-desc');
    if (desc) desc.textContent = '左：移動ジョイスティック　右：視点ドラッグ';
  }
}

function init() {
  const canvas = document.getElementById('canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 20, 60);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
  clock = new THREE.Clock();

  buildWorld();
  buildPlayer();
  spawnAnimals();
  addLighting();

  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', e => { keys[e.code] = true; });
  window.addEventListener('keyup',   e => { keys[e.code] = false; });
  window.addEventListener('keydown', e => {
    if ((e.code === 'KeyE') && nearbyAnimal) triggerDialog(nearbyAnimal);
  });
}

// ── Touch Controls ────────────────────────────────────
function setupTouch() {
  document.getElementById('joystick-zone').style.display = 'block';
  document.getElementById('interact-btn').style.display = 'flex';
  document.getElementById('look-hint').style.display = 'block';
  document.getElementById('hint').style.display = 'none';
  document.getElementById('controls-hint').style.display = 'none';
  document.getElementById('crosshair').style.display = 'none';

  document.addEventListener('touchstart', onTouchStart, { passive: false });
  document.addEventListener('touchmove',  onTouchMove,  { passive: false });
  document.addEventListener('touchend',   onTouchEnd,   { passive: false });
  document.addEventListener('touchcancel',onTouchEnd,   { passive: false });

  document.getElementById('interact-btn').addEventListener('touchstart', e => {
    e.stopPropagation();
    e.preventDefault();
    if (nearbyAnimal) triggerDialog(nearbyAnimal);
  }, { passive: false });
}

function joystickCenter() {
  const z = document.getElementById('joystick-zone');
  const r = z.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function isOnJoystick(cx, cy) {
  const c = joystickCenter();
  const dx = cx - c.x, dy = cy - c.y;
  return (dx*dx + dy*dy) < 80 * 80;
}

function onTouchStart(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const leftSide = t.clientX < window.innerWidth * 0.5;
    if (leftSide && !joystick.active) {
      joystick = { active: true, id: t.identifier, startX: t.clientX, startY: t.clientY, dx: 0, dy: 0 };
      setKnob(0, 0);
    } else if (!leftSide && !lookTouch.active) {
      lookTouch = { active: true, id: t.identifier, lastX: t.clientX, lastY: t.clientY };
    }
  }
}

function onTouchMove(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (joystick.active && t.identifier === joystick.id) {
      const MAX = 50;
      let dx = t.clientX - joystick.startX;
      let dy = t.clientY - joystick.startY;
      const len = Math.sqrt(dx*dx + dy*dy);
      if (len > MAX) { dx = dx / len * MAX; dy = dy / len * MAX; }
      joystick.dx = dx / MAX;
      joystick.dy = dy / MAX;
      setKnob(dx, dy);
    }
    if (lookTouch.active && t.identifier === lookTouch.id) {
      const ddx = t.clientX - lookTouch.lastX;
      const ddy = t.clientY - lookTouch.lastY;
      yaw   -= ddx * 0.005;
      pitch -= ddy * 0.005;
      pitch  = Math.max(-0.9, Math.min(0.8, pitch));
      lookTouch.lastX = t.clientX;
      lookTouch.lastY = t.clientY;
    }
  }
}

function onTouchEnd(e) {
  for (const t of e.changedTouches) {
    if (joystick.active && t.identifier === joystick.id) {
      joystick = { active: false, id: null, startX: 0, startY: 0, dx: 0, dy: 0 };
      setKnob(0, 0);
    }
    if (lookTouch.active && t.identifier === lookTouch.id) {
      lookTouch = { active: false, id: null, lastX: 0, lastY: 0 };
    }
  }
}

function setKnob(dx, dy) {
  document.getElementById('joystick-knob').style.transform =
    `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

// ── Lighting ──────────────────────────────────────────
function addLighting() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfffbe0, 1.2);
  sun.position.set(15, 30, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 100;
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xadd8e6, 0.3);
  fill.position.set(-10, 10, -10);
  scene.add(fill);
}

// ── World ─────────────────────────────────────────────
function buildWorld() {
  // Ground
  const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2, 20, 20);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x4a7c3f });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Path
  const pathGeo = new THREE.PlaneGeometry(3, WORLD_SIZE * 1.5);
  const pathMat = new THREE.MeshLambertMaterial({ color: 0xd4b896 });
  const path = new THREE.Mesh(pathGeo, pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.01;
  scene.add(path);

  // Trees
  const treePositions = [
    [-8,0,-8],[-12,0,-5],[10,0,-10],[8,0,5],[-10,0,12],[12,0,10],
    [-6,0,14],[14,0,-15],[-15,0,0],[0,0,-18],[5,0,18],[-18,0,-12],
  ];
  treePositions.forEach(([x,y,z]) => addTree(x,y,z));

  // Pond
  const pondGeo = new THREE.CircleGeometry(4, 32);
  const pondMat = new THREE.MeshLambertMaterial({ color: 0x1e90ff, transparent: true, opacity: 0.7 });
  const pond = new THREE.Mesh(pondGeo, pondMat);
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(-8, 0.02, 8);
  scene.add(pond);

  // Flower patches
  for (let i = 0; i < 60; i++) {
    addFlower(
      (Math.random() - 0.5) * WORLD_SIZE,
      0,
      (Math.random() - 0.5) * WORLD_SIZE
    );
  }

  // Fence
  addFence();

  // Bench
  addBench(6, 0, -6);
  addBench(-6, 0, 4);
}

function addTree(x, y, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.3, 1.8, 8),
    new THREE.MeshLambertMaterial({ color: 0x8b5e3c })
  );
  trunk.position.set(x, 0.9, z);
  trunk.castShadow = true;
  scene.add(trunk);

  const colors = [0x228b22, 0x2e8b57, 0x32cd32];
  const col = colors[Math.floor(Math.random() * colors.length)];
  [[0,2.8,0,1.4],[0,3.6,0,1.0],[0,4.3,0,0.7]].forEach(([dx,dy,dz,r]) => {
    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(r, 8, 6),
      new THREE.MeshLambertMaterial({ color: col })
    );
    leaves.position.set(x + dx, y + dy, z + dz);
    leaves.castShadow = true;
    scene.add(leaves);
  });
}

function addFlower(x, y, z) {
  const colors = [0xff69b4, 0xff4500, 0xffd700, 0xda70d6, 0xff6347];
  const geo = new THREE.SphereGeometry(0.08, 6, 4);
  const mat = new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
  const flower = new THREE.Mesh(geo, mat);
  flower.position.set(x, y + 0.3, z);
  scene.add(flower);
}

function addFence() {
  const postMat = new THREE.MeshLambertMaterial({ color: 0xdeb887 });
  const railMat = new THREE.MeshLambertMaterial({ color: 0xf5deb3 });
  const r = WORLD_SIZE - 2;
  const sides = [
    { axis: 'x', from: -r, to: r, fixed: r, zAxis: false },
    { axis: 'x', from: -r, to: r, fixed: -r, zAxis: false },
    { axis: 'z', from: -r, to: r, fixed: r, zAxis: true },
    { axis: 'z', from: -r, to: r, fixed: -r, zAxis: true },
  ];
  sides.forEach(({ from, to, fixed, zAxis }) => {
    for (let t = from; t <= to; t += 4) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), postMat);
      post.position.set(zAxis ? fixed : t, 0.6, zAxis ? t : fixed);
      post.castShadow = true;
      scene.add(post);
    }
    for (let h = 0.4; h <= 0.9; h += 0.4) {
      const len = (to - from);
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(zAxis ? 0.08 : len, 0.08, zAxis ? len : 0.08),
        railMat
      );
      rail.position.set(zAxis ? fixed : (from + to) / 2, h, zAxis ? (from + to) / 2 : fixed);
      scene.add(rail);
    }
  });
}

function addBench(x, y, z) {
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x8b5e3c });
  const legMat  = new THREE.MeshLambertMaterial({ color: 0x555 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.6), woodMat);
  seat.position.set(x, y + 0.6, z);
  seat.castShadow = true;
  scene.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 0.08), woodMat);
  back.position.set(x, y + 1.0, z + 0.25);
  scene.add(back);
  [[-0.8, 0.3, 0], [0.8, 0.3, 0]].forEach(([dx, dy, dz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.5), legMat);
    leg.position.set(x + dx, y + dy, z);
    scene.add(leg);
  });
}

// ── Player (Black Humanoid Mouse) ─────────────────────
function buildPlayer() {
  player = new THREE.Group();

  const blackMat  = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const whiteMat  = new THREE.MeshLambertMaterial({ color: 0xfff0f0 });
  const pinkMat   = new THREE.MeshLambertMaterial({ color: 0xffb6c1 });
  const eyeMat    = new THREE.MeshLambertMaterial({ color: 0xff0000 });

  // Body
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.45, 8, 12), blackMat);
  body.position.y = 0.6;
  body.castShadow = true;
  player.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), blackMat);
  head.position.y = 1.15;
  head.castShadow = true;
  player.add(head);

  // Ears
  [-0.17, 0.17].forEach(x => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), blackMat);
    ear.position.set(x, 1.36, 0);
    player.add(ear);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), pinkMat);
    inner.position.set(x, 1.36, 0.05);
    player.add(inner);
  });

  // Eyes (red)
  [-0.08, 0.08].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), eyeMat);
    eye.position.set(x, 1.16, 0.2);
    player.add(eye);
  });

  // Snout
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshLambertMaterial({ color: 0x333 }));
  snout.position.set(0, 1.1, 0.22);
  snout.scale.z = 0.6;
  player.add(snout);

  // Nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), pinkMat);
  nose.position.set(0, 1.12, 0.3);
  player.add(nose);

  // Arms
  [-0.32, 0.32].forEach((x, i) => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 6, 8), blackMat);
    arm.position.set(x, 0.7, 0);
    arm.rotation.z = (i === 0 ? 1 : -1) * 0.4;
    arm.castShadow = true;
    player.add(arm);
  });

  // Legs
  [-0.1, 0.1].forEach(x => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.3, 6, 8), blackMat);
    leg.position.set(x, 0.25, 0);
    leg.castShadow = true;
    player.add(leg);
  });

  // Tail
  const tailCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0.55, -0.22),
    new THREE.Vector3(-0.3, 0.3, -0.5),
    new THREE.Vector3(-0.1, 0.1, -0.8)
  );
  const tailGeo = new THREE.TubeGeometry(tailCurve, 12, 0.025, 6, false);
  const tail = new THREE.Mesh(tailGeo, blackMat);
  player.add(tail);

  player.position.set(0, 0, 0);
  scene.add(player);

  // Camera offset — attached to player look direction
  player.add(camera);
  camera.position.set(0, 1.5, 0);
}

// ── Animals ───────────────────────────────────────────
function spawnAnimals() {
  const configs = [
    { type:'dog',    pos:[ 6,  0,  6],  rot: 0.5 },
    { type:'dog',    pos:[-10, 0, -6],  rot: 2.1 },
    { type:'duck',   pos:[-7,  0,  9],  rot: 1.0 },
    { type:'duck',   pos:[-9,  0,  6],  rot: 3.5 },
    { type:'cat',    pos:[ 8,  0, -8],  rot: 0.2 },
    { type:'cat',    pos:[-4,  0, -10], rot: 4.0 },
    { type:'rabbit', pos:[ 3,  0,  12], rot: 1.5 },
    { type:'rabbit', pos:[-5,  0, -14], rot: 2.8 },
    { type:'bird',   pos:[ 12, 0,  3],  rot: 0.9 },
    { type:'bird',   pos:[-14, 0,  4],  rot: 3.2 },
  ];
  configs.forEach(cfg => {
    const a = buildAnimal(cfg.type);
    a.mesh.position.set(...cfg.pos);
    a.mesh.rotation.y = cfg.rot;
    a.id = `${cfg.type}_${cfg.pos.join('_')}`;
    scene.add(a.mesh);
    animals.push(a);
  });
}

function buildAnimal(type) {
  const mesh = new THREE.Group();
  switch(type) {
    case 'dog':    buildDog(mesh);    break;
    case 'duck':   buildDuck(mesh);   break;
    case 'cat':    buildCat(mesh);    break;
    case 'rabbit': buildRabbit(mesh); break;
    case 'bird':   buildBird(mesh);   break;
  }
  return { mesh, type, bobOffset: Math.random() * Math.PI * 2 };
}

function buildDog(g) {
  const fur  = new THREE.MeshLambertMaterial({ color: 0xc8a46e });
  const dark = new THREE.MeshLambertMaterial({ color: 0x5a3e1b });
  const eye  = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const nose = new THREE.MeshLambertMaterial({ color: 0x333 });
  const pink = new THREE.MeshLambertMaterial({ color: 0xffb6c1 });

  addBox(g, fur,  0,    0.38, 0,    0.38, 0.32, 0.52); // body
  addBox(g, fur,  0,    0.82, 0.15, 0.28, 0.26, 0.28); // head
  addBox(g, dark, 0.10, 1.08, 0.15, 0.10, 0.14, 0.06); // ear L
  addBox(g, dark,-0.10, 1.08, 0.15, 0.10, 0.14, 0.06); // ear R
  addBox(g, fur,  0,    0.72, 0.30, 0.14, 0.10, 0.08); // snout
  addBox(g, nose, 0,    0.79, 0.36, 0.06, 0.04, 0.04); // nose
  addBox(g, eye,  0.07, 0.84, 0.40, 0.04, 0.04, 0.03);
  addBox(g, eye, -0.07, 0.84, 0.40, 0.04, 0.04, 0.03);
  // legs
  [[-0.13,0.12,0.15],[0.13,0.12,0.15],[-0.13,0.12,-0.15],[0.13,0.12,-0.15]].forEach(([x,y,z]) => {
    addBox(g, fur, x, y, z, 0.09, 0.24, 0.09);
  });
  // tail
  addBox(g, fur, 0, 0.55, -0.28, 0.06, 0.20, 0.06);
  // tongue
  addBox(g, pink, 0, 0.68, 0.34, 0.06, 0.04, 0.02);
}

function buildDuck(g) {
  const yellow  = new THREE.MeshLambertMaterial({ color: 0xffdf00 });
  const orange  = new THREE.MeshLambertMaterial({ color: 0xff8c00 });
  const white   = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const eye     = new THREE.MeshLambertMaterial({ color: 0x111 });

  addSphere(g, white,  0,    0.32, 0,    0.30, 0.22, 0.34); // body
  addSphere(g, white,  0,    0.62, 0.18, 0.18, 0.17, 0.17); // head
  addBox(g,   orange,  0,    0.62, 0.34, 0.14, 0.06, 0.07); // bill
  addBox(g,   eye,     0.07, 0.66, 0.33, 0.04, 0.04, 0.03);
  addBox(g,   eye,    -0.07, 0.66, 0.33, 0.04, 0.04, 0.03);
  addBox(g,   yellow,  0.18, 0.40, 0,    0.06, 0.18, 0.04); // wing L
  addBox(g,   yellow, -0.18, 0.40, 0,    0.06, 0.18, 0.04); // wing R
  addBox(g,   orange,  0.07, 0.02, 0.05, 0.06, 0.04, 0.18); // foot L
  addBox(g,   orange, -0.07, 0.02, 0.05, 0.06, 0.04, 0.18); // foot R
}

function buildCat(g) {
  const grey  = new THREE.MeshLambertMaterial({ color: 0x888 });
  const light = new THREE.MeshLambertMaterial({ color: 0xddd });
  const green = new THREE.MeshLambertMaterial({ color: 0x7cfc00 });
  const pink  = new THREE.MeshLambertMaterial({ color: 0xffb6c1 });
  const nose  = new THREE.MeshLambertMaterial({ color: 0xff9999 });

  addBox(g, grey,  0,    0.40, 0,    0.30, 0.28, 0.40); // body
  addSphere(g, grey,  0,    0.76, 0.06, 0.22, 0.20, 0.22); // head
  // ears (pointy triangles approximated)
  addBox(g, grey,  0.12, 0.97, 0.06, 0.08, 0.13, 0.04);
  addBox(g, grey, -0.12, 0.97, 0.06, 0.08, 0.13, 0.04);
  addBox(g, pink,  0.12, 0.97, 0.07, 0.04, 0.08, 0.02);
  addBox(g, pink, -0.12, 0.97, 0.07, 0.04, 0.08, 0.02);
  addBox(g, light, 0,    0.70, 0.22, 0.10, 0.08, 0.04); // muzzle
  addBox(g, nose,  0,    0.75, 0.26, 0.04, 0.03, 0.02);
  addBox(g, green, 0.07, 0.78, 0.27, 0.04, 0.04, 0.03);
  addBox(g, green,-0.07, 0.78, 0.27, 0.04, 0.04, 0.03);
  [[-0.10,0.12,0.14],[0.10,0.12,0.14],[-0.10,0.12,-0.14],[0.10,0.12,-0.14]].forEach(([x,y,z]) => {
    addBox(g, grey, x, y, z, 0.07, 0.24, 0.07);
  });
  // tail (curved via two boxes)
  addBox(g, grey, 0,    0.50, -0.22, 0.05, 0.28, 0.05);
  addBox(g, grey, -0.10, 0.66, -0.22, 0.05, 0.14, 0.05);
}

function buildRabbit(g) {
  const white = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const pink  = new THREE.MeshLambertMaterial({ color: 0xffb6c1 });
  const eye   = new THREE.MeshLambertMaterial({ color: 0xff6666 });

  addSphere(g, white, 0,    0.36, 0,    0.28, 0.26, 0.30); // body
  addSphere(g, white, 0,    0.70, 0.08, 0.22, 0.20, 0.20); // head
  // long ears
  addBox(g, white,  0.10, 1.08, 0.06, 0.08, 0.28, 0.05);
  addBox(g, white, -0.10, 1.08, 0.06, 0.08, 0.28, 0.05);
  addBox(g, pink,   0.10, 1.08, 0.08, 0.04, 0.22, 0.02);
  addBox(g, pink,  -0.10, 1.08, 0.08, 0.04, 0.22, 0.02);
  addSphere(g, pink,  0, 0.68, 0.21, 0.06, 0.05, 0.04); // nose
  addBox(g, eye,  0.07, 0.72, 0.22, 0.04, 0.04, 0.03);
  addBox(g, eye, -0.07, 0.72, 0.22, 0.04, 0.04, 0.03);
  [[-0.09,0.12,0.12],[0.09,0.12,0.12],[-0.09,0.12,-0.10],[0.09,0.12,-0.10]].forEach(([x,y,z]) => {
    addBox(g, white, x, y, z, 0.07, 0.22, 0.07);
  });
  addSphere(g, white, 0, 0.18, -0.26, 0.07, 0.07, 0.07); // cotton tail
}

function buildBird(g) {
  const red    = new THREE.MeshLambertMaterial({ color: 0xff3333 });
  const orange = new THREE.MeshLambertMaterial({ color: 0xff8c00 });
  const dark   = new THREE.MeshLambertMaterial({ color: 0x2a1a1a });
  const eye    = new THREE.MeshLambertMaterial({ color: 0x111 });

  addSphere(g, red,    0,    0.34, 0,    0.20, 0.18, 0.22); // body
  addSphere(g, red,    0,    0.58, 0.10, 0.16, 0.14, 0.15); // head
  addBox(g,   orange,  0,    0.57, 0.24, 0.10, 0.06, 0.06); // beak
  addBox(g,   eye,     0.06, 0.61, 0.24, 0.03, 0.03, 0.02);
  addBox(g,   eye,    -0.06, 0.61, 0.24, 0.03, 0.03, 0.02);
  addBox(g,   dark,    0.18, 0.34, 0,    0.06, 0.20, 0.04); // wing L
  addBox(g,   dark,   -0.18, 0.34, 0,    0.06, 0.20, 0.04); // wing R
  addBox(g,   orange,  0.04, 0.02, 0.04, 0.04, 0.04, 0.14); // leg L
  addBox(g,   orange, -0.04, 0.02, 0.04, 0.04, 0.04, 0.14); // leg R
  addBox(g,   red,     0,    0.46, -0.18, 0.04, 0.18, 0.04); // tail feather
}

function addBox(g, mat, x, y, z, w, h, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
}
function addSphere(g, mat, x, y, z, rx, ry, rz) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mat);
  m.position.set(x, y, z);
  m.scale.set(rx, ry, rz);
  m.castShadow = true;
  g.add(m);
}

// ── Pointer Lock ──────────────────────────────────────
function setupPointerLock() {
  const canvas = document.getElementById('canvas');
  canvas.addEventListener('click', () => canvas.requestPointerLock());

  document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === canvas;
  });

  document.addEventListener('mousemove', e => {
    if (!isPointerLocked) return;
    yaw   -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch  = Math.max(-0.9, Math.min(0.8, pitch));
  });
}

// ── Dialog ────────────────────────────────────────────
const speakerNames = { dog:'🐶 ポチ', duck:'🦆 がーちゃん', cat:'🐱 ミミ', rabbit:'🐰 ピョン', bird:'🐦 チュン' };

function triggerDialog(animal) {
  const lines = animalDialogs[animal.type];
  const line  = lines[Math.floor(Math.random() * lines.length)];
  const dlg = document.getElementById('dialog');
  document.getElementById('dialog-speaker').textContent = speakerNames[animal.type];
  document.getElementById('dialog-text').textContent = line[1];
  dlg.style.display = 'block';
  if (!metAnimals.has(animal.id)) {
    metAnimals.add(animal.id);
    document.getElementById('score-count').textContent = metAnimals.size;
  }
  if (dialogTimeout) clearTimeout(dialogTimeout);
  dialogTimeout = setTimeout(() => { dlg.style.display = 'none'; }, 4000);
}

// ── Game Loop ─────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t  = clock.elapsedTime;

  updatePlayer(dt);
  updateAnimals(t);
  checkInteract();

  renderer.render(scene, camera);
}

function updatePlayer(dt) {
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right   = new THREE.Vector3( Math.cos(yaw), 0, -Math.sin(yaw));
  const move    = new THREE.Vector3();

  if (keys['KeyW'] || keys['ArrowUp'])    move.addScaledVector(forward,  1);
  if (keys['KeyS'] || keys['ArrowDown'])  move.addScaledVector(forward, -1);
  if (keys['KeyA'] || keys['ArrowLeft'])  move.addScaledVector(right,   -1);
  if (keys['KeyD'] || keys['ArrowRight']) move.addScaledVector(right,    1);

  // Virtual joystick
  if (joystick.active && (Math.abs(joystick.dx) > 0.05 || Math.abs(joystick.dy) > 0.05)) {
    move.addScaledVector(forward, -joystick.dy);
    move.addScaledVector(right,    joystick.dx);
  }

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(SPEED * dt);
    player.position.add(move);
    const half = WORLD_SIZE - 2;
    player.position.x = Math.max(-half, Math.min(half, player.position.x));
    player.position.z = Math.max(-half, Math.min(half, player.position.z));
  }

  player.rotation.y = yaw;
  camera.rotation.x = pitch;
}

function updateAnimals(t) {
  animals.forEach(a => {
    // Idle bob
    a.mesh.position.y = Math.sin(t * 1.5 + a.bobOffset) * 0.04;
    // Slow rotation toward player
    const dx = player.position.x - a.mesh.position.x;
    const dz = player.position.z - a.mesh.position.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    if (dist < 8) {
      const targetY = Math.atan2(dx, dz);
      const diff = ((targetY - a.mesh.rotation.y) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      a.mesh.rotation.y += diff * 0.04;
    }
  });
}

function checkInteract() {
  let closest = null;
  let closestDist = INTERACT_DIST;

  animals.forEach(a => {
    const dx = player.position.x - a.mesh.position.x;
    const dz = player.position.z - a.mesh.position.z;
    const d  = Math.sqrt(dx*dx + dz*dz);
    if (d < closestDist) { closestDist = d; closest = a; }
  });

  nearbyAnimal = closest;
  document.getElementById('interact-prompt').style.display = (!isMobile && closest) ? 'block' : 'none';

  // Mobile interact button
  const btn = document.getElementById('interact-btn');
  if (isMobile) {
    btn.classList.toggle('active', !!closest);
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

detectDevice();
