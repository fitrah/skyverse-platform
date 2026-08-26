const $ = (s) => document.querySelector(s);
const canvas = $("#game");
const overlay = $("#overlay");
const hud = $("#hud");
const journal = $("#journal");
const noteEl = $("#note");
const photoHud = $("#photoHud");
const ghostHud = $("#ghostHud");
const fearHud = $("#fearHud");
const timerHud = $("#timerHud");
const photosEl = $("#photos");
const itemsEl = $("#items");
const toastEl = $("#toast");
const crosshair = $("#crosshair");

const rooms = [
  { id: "foyer", name: "Foyer", x: -14, z: 0, w: 8, d: 7 },
  { id: "hall", name: "Lorong Utama", x: 0, z: 0, w: 22, d: 5 },
  { id: "bedroom", name: "Kamar Nori", x: -5, z: -6, w: 8, d: 8 },
  { id: "kitchen", name: "Dapur Lila", x: 6, z: -6, w: 9, d: 8 },
  { id: "bath", name: "Kamar Mandi", x: 13, z: 1, w: 7, d: 7 },
  { id: "storage", name: "Gudang Reno", x: -5, z: 6, w: 8, d: 8, locked: "key" },
  { id: "archive", name: "Ruang Arsip Toni", x: 7, z: 6, w: 9, d: 8, locked: "code" },
];

const objects = [
  { id: "drawer", room: "bedroom", label: "laci meja", x: -7, z: -7.4, photo: "Nori", text: "Foto Nori ditemukan di laci. Di belakangnya tertulis angka 2." },
  { id: "cabinet", room: "kitchen", label: "lemari dapur", x: 8.5, z: -8, photo: "Lila", text: "Foto Lila terselip di lemari dapur. Ada angka 7 di pojok foto." },
  { id: "sink", room: "bath", label: "wastafel retak", x: 13.5, z: -0.5, item: "kunci gudang", text: "Abigel menemukan kunci gudang di bawah wastafel." },
  { id: "chest", room: "storage", label: "peti kayu", x: -6.8, z: 8.1, photo: "Reno", text: "Foto Reno ada di peti kayu. Angka 1 tertulis di bingkainya." },
  { id: "box", room: "archive", label: "kotak arsip", x: 9.3, z: 8.2, photo: "Toni", text: "Foto Toni ditemukan. Kode lengkap yang berulang di kepala Abigel: 2714." },
  { id: "memo", room: "hall", label: "memo robek", x: 1.2, z: -1.4, hint: true, text: "Memo robek: 'Ruang arsip terbuka dengan angka yang tersisa dari foto lama. Jika panik, ingat 2714.'" },
];

const names = ["Nori", "Lila", "Reno", "Toni"];
const found = new Set();
const opened = new Set();
const inventory = new Set();
const objectMeshes = new Map();
const roomFloors = new Map();
const keys = {};
const touchMove = { x: 0, z: 0 };
const player = { pos: new THREE.Vector3(-14, 0.75, 0), vel: new THREE.Vector3(), speed: 5.3, fear: 100 };
const ghosts = [];
let scene, camera, renderer, clock, hero, yaw = 0, pitch = 0.45, running = false, won = false, dead = false;
let escapeStarted = false, escapeEnd = 0, pulse = 0, lastRoomId = "";
let startedAt = 0;

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.74, metalness: 0.03, ...opts });
}

function box(w, h, d, color, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function inRoom(x, z, room) {
  return Math.abs(x - room.x) <= room.w / 2 - 0.25 && Math.abs(z - room.z) <= room.d / 2 - 0.25;
}

function currentRoom(x = player.pos.x, z = player.pos.z) {
  return rooms.find((room) => inRoom(x, z, room) && !room.locked);
}

function canStand(x, z) {
  return rooms.some((room) => !room.locked && inRoom(x, z, room));
}

function makeTexturedFloor(room) {
  const floor = box(room.w, 0.08, room.d, room.locked ? 0x2b2022 : 0x34302a);
  floor.position.set(room.x, 0, room.z);
  scene.add(floor);
  roomFloors.set(room.id, floor);

  const rug = box(room.w * 0.46, 0.04, room.d * 0.18, room.id === "foyer" ? 0x6d2c35 : 0x544437);
  rug.position.set(room.x, 0.08, room.z + room.d * 0.16);
  scene.add(rug);
}

function wall(x, z, w, d, h = 2.9) {
  const mesh = box(w, h, d, 0x555147);
  mesh.position.set(x, h / 2, z);
  scene.add(mesh);
}

function buildRoom(room) {
  makeTexturedFloor(room);
  const northGap = room.id === "storage" || room.id === "archive" ? 2.5 : 0;
  const southGap = room.id === "bedroom" || room.id === "kitchen" ? 2.5 : 0;
  const westGap = room.id === "foyer" ? 2.6 : 0;
  const eastGap = room.id === "bath" || room.id === "foyer" ? 2.6 : 0;
  const t = 0.18;
  if (!northGap) wall(room.x, room.z - room.d / 2, room.w, t);
  else {
    wall(room.x - room.w * 0.3, room.z - room.d / 2, room.w * 0.4, t);
    wall(room.x + room.w * 0.3, room.z - room.d / 2, room.w * 0.4, t);
  }
  if (!southGap) wall(room.x, room.z + room.d / 2, room.w, t);
  else {
    wall(room.x - room.w * 0.3, room.z + room.d / 2, room.w * 0.4, t);
    wall(room.x + room.w * 0.3, room.z + room.d / 2, room.w * 0.4, t);
  }
  if (!westGap) wall(room.x - room.w / 2, room.z, t, room.d);
  else {
    wall(room.x - room.w / 2, room.z - room.d * 0.3, t, room.d * 0.36);
    wall(room.x - room.w / 2, room.z + room.d * 0.3, t, room.d * 0.36);
  }
  if (!eastGap) wall(room.x + room.w / 2, room.z, t, room.d);
  else {
    wall(room.x + room.w / 2, room.z - room.d * 0.3, t, room.d * 0.36);
    wall(room.x + room.w / 2, room.z + room.d * 0.3, t, room.d * 0.36);
  }
}

function addDoor(room) {
  if (!room.locked) return;
  const door = box(2.2, 2.6, 0.24, room.locked === "code" ? 0x4f263c : 0x4a2f25, { emissive: 0x180608, emissiveIntensity: 0.35 });
  door.position.set(room.x, 1.3, room.z > 0 ? room.z - room.d / 2 + 0.2 : room.z + room.d / 2 - 0.2);
  door.name = `door-${room.id}`;
  scene.add(door);
  room.doorMesh = door;
}

function furniture() {
  objects.forEach((obj) => {
    const mesh = box(1.1, obj.photo ? 0.8 : 0.65, 0.9, obj.photo ? 0x6c4b34 : obj.item ? 0x566756 : 0x77705f);
    mesh.position.set(obj.x, mesh.geometry.parameters.height / 2, obj.z);
    mesh.userData.objectId = obj.id;
    scene.add(mesh);
    objectMeshes.set(obj.id, mesh);

    const glow = new THREE.PointLight(obj.photo ? 0xf1b766 : 0x96f1b8, 1.35, 5.2);
    glow.position.set(obj.x, 1.3, obj.z);
    scene.add(glow);
    obj.glow = glow;
  });

  for (let i = 0; i < 18; i++) {
    const debris = box(0.3 + Math.random() * 0.8, 0.08, 0.3 + Math.random() * 0.8, 0x3c382f);
    const room = rooms[1 + Math.floor(Math.random() * (rooms.length - 1))];
    debris.position.set(room.x + (Math.random() - 0.5) * room.w * 0.65, 0.12, room.z + (Math.random() - 0.5) * room.d * 0.65);
    debris.rotation.y = Math.random() * Math.PI;
    scene.add(debris);
  }
}

function makeHero() {
  const group = new THREE.Group();
  const body = box(0.7, 1.05, 0.45, 0x7b2432);
  body.position.y = 1.05;
  group.add(body);
  const head = box(0.52, 0.52, 0.52, 0xd8b08f);
  head.position.y = 1.83;
  group.add(head);
  const hair = box(0.6, 0.58, 0.24, 0x251313);
  hair.position.set(0, 1.88, 0.21);
  group.add(hair);
  const skirt = box(0.78, 0.38, 0.52, 0x332336);
  skirt.position.y = 0.53;
  group.add(skirt);
  const armL = box(0.18, 0.8, 0.2, 0xd8b08f);
  armL.position.set(-0.52, 0.98, 0);
  const armR = armL.clone();
  armR.position.x = 0.52;
  group.add(armL, armR);
  const lamp = new THREE.SpotLight(0xffe3a8, 10.5, 22, Math.PI / 4.5, 0.55, 1);
  lamp.position.set(0, 1.55, -0.3);
  lamp.target.position.set(0, 1.15, -5);
  group.add(lamp, lamp.target);
  group.userData = { armL, armR, lamp };
  scene.add(group);
  return group;
}

function makeGhost(x, z, speed = 1.55) {
  const group = new THREE.Group();
  const cloth = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), mat(0xd9edf0, { transparent: true, opacity: 0.58, emissive: 0x6eafbf, emissiveIntensity: 0.55 }));
  cloth.scale.set(1, 1.35, 0.82);
  cloth.position.y = 1.45;
  group.add(cloth);
  const eyeL = box(0.08, 0.08, 0.04, 0x050606, { emissive: 0x050606, emissiveIntensity: 2 });
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.18, 1.52, -0.45);
  eyeR.position.set(0.18, 1.52, -0.45);
  group.add(eyeL, eyeR);
  const light = new THREE.PointLight(0xaeeaff, 1.7, 6);
  light.position.y = 1.45;
  group.add(light);
  group.position.set(x, 0, z);
  scene.add(group);
  const ghost = { group, speed, phase: Math.random() * 8 };
  ghosts.push(ghost);
  updateHud();
  return ghost;
}

function init3d() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1214);
  scene.fog = new THREE.Fog(0x121010, 17, 58);
  camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 80);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  scene.add(new THREE.HemisphereLight(0xc9b991, 0x202226, 1.65));
  const moon = new THREE.DirectionalLight(0xcfd7ff, 1.75);
  moon.position.set(-8, 12, 7);
  scene.add(moon);
  [[-3, -1], [8, -3], [0, 4], [-12, 0]].forEach(([x, z]) => {
    const lamp = new THREE.PointLight(0xffd49a, 1.55, 12);
    lamp.position.set(x, 2.7, z);
    scene.add(lamp);
  });
  rooms.forEach(buildRoom);
  rooms.forEach(addDoor);
  furniture();
  hero = makeHero();
  clock = new THREE.Clock();
  renderer.setAnimationLoop(loop);
}

function setupPhotos() {
  photosEl.innerHTML = names.map((name) => `<li id="photo-${name}">${name}<br><b>hilang</b></li>`).join("");
}

function updateHud() {
  photoHud.textContent = `Foto ${found.size}/4`;
  ghostHud.textContent = `Hantu ${ghosts.length}`;
  fearHud.textContent = `Takut ${Math.max(0, Math.round(player.fear))}%`;
  itemsEl.textContent = inventory.size ? [...inventory].join(", ") : "Belum ada";
  names.forEach((name) => {
    const row = $(`#photo-${name}`);
    row?.classList.toggle("found", found.has(name));
    const state = row?.querySelector("b");
    if (state) state.textContent = found.has(name) ? "ketemu" : "hilang";
  });
}

function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => toastEl.classList.remove("show"), 1900);
}

function resetWorldState() {
  found.clear();
  opened.clear();
  inventory.clear();
  rooms.forEach((room) => {
    if (room.id === "storage") room.locked = "key";
    if (room.id === "archive") room.locked = "code";
    if (room.doorMesh) room.doorMesh.visible = !!room.locked;
    const floor = roomFloors.get(room.id);
    if (floor) floor.material.color.set(room.locked ? 0x2b2022 : 0x34302a);
  });
  objectMeshes.forEach((mesh) => {
    mesh.visible = true;
    mesh.scale.set(1, 1, 1);
  });
  objects.forEach((obj) => {
    if (obj.glow) obj.glow.visible = true;
  });
  ghosts.splice(0).forEach((ghost) => scene.remove(ghost.group));
  makeGhost(13, 1, 1.5);
  player.pos.set(-14, 0.75, 0);
  player.vel.set(0, 0, 0);
  player.fear = 100;
  startedAt = performance.now();
  yaw = -Math.PI / 2;
  pitch = 0.46;
  hero.position.copy(player.pos);
  running = true;
  won = false;
  dead = false;
  escapeStarted = false;
  escapeEnd = 0;
  lastRoomId = "";
  timerHud.textContent = "--:--";
  noteEl.textContent = "Cari 4 foto Nori, Lila, Reno, dan Toni. Setelah lengkap, keluar secepatnya.";
  updateHud();
}

function unlock(room) {
  if (room.locked === "key") {
    if (!inventory.has("kunci gudang")) {
      noteEl.textContent = "Pintu gudang terkunci. Cari kuncinya dulu.";
      toast("Gudang Reno terkunci.");
      return;
    }
    room.locked = null;
    room.doorMesh.visible = false;
    roomFloors.get(room.id)?.material.color.set(0x34302a);
    noteEl.textContent = "Kunci gudang berputar, lalu patah. Hantu baru terbangun.";
    makeGhost(-5, 6, 1.65);
    toast("Gudang terbuka. Hantu bertambah.");
    return;
  }
  if (room.locked === "code") {
    const code = prompt("Masukkan kode 4 angka Ruang Arsip Toni:");
    if (code !== "2714") {
      noteEl.textContent = "Kode salah. Dari balik pintu terdengar ketukan pelan.";
      toast("Kode salah.");
      return;
    }
    room.locked = null;
    room.doorMesh.visible = false;
    roomFloors.get(room.id)?.material.color.set(0x34302a);
    noteEl.textContent = "Kode benar. Ruang arsip terbuka, tapi bayangan lain ikut masuk.";
    makeGhost(7, 6, 1.78);
    toast("Ruang arsip terbuka. Hantu bertambah.");
  }
}

function nearbyLockedRoom() {
  return rooms.find((room) => room.locked && Math.hypot(player.pos.x - room.x, player.pos.z - room.z) < 5.5);
}

function nearbyObject() {
  return objects.find((obj) => !opened.has(obj.id) && Math.hypot(player.pos.x - obj.x, player.pos.z - obj.z) < 1.9);
}

function interact() {
  if (!running || won || dead) return;
  const locked = nearbyLockedRoom();
  if (locked) return unlock(locked);

  const obj = nearbyObject();
  if (obj) {
    if (!obj.hint) opened.add(obj.id);
    noteEl.textContent = obj.text;
    if (obj.item) inventory.add(obj.item);
    if (obj.photo) found.add(obj.photo);
    const mesh = objectMeshes.get(obj.id);
    if (mesh && !obj.hint) mesh.visible = false;
    if (obj.glow && !obj.hint) obj.glow.visible = false;
    updateHud();
    toast(`Memeriksa ${obj.label}.`);
    if (found.size === 4 && !escapeStarted) startEscape();
    return;
  }

  const room = currentRoom();
  if (room?.id === "foyer" && player.pos.x < -16.8) {
    if (escapeStarted) return finish(true);
    noteEl.textContent = "Abigel belum bisa pergi. Foto teman-temannya belum lengkap.";
    toast("Cari semua foto dulu.");
    return;
  }
  noteEl.textContent = room ? `${room.name}. Tidak ada yang bisa diperiksa di dekat Abigel.` : "Pintu itu tidak mau terbuka.";
}

function startEscape() {
  escapeStarted = true;
  escapeEnd = performance.now() + 75000;
  noteEl.textContent = "Empat foto lengkap. Apartemen mulai mengunci. Cepat keluar lewat foyer!";
  makeGhost(-14, 0, 1.9);
  toast("Semua foto ketemu. Lari ke pintu keluar!");
}

function finish(success) {
  running = false;
  won = success;
  dead = !success;
  saveProgress(success);
  document.exitPointerLock?.();
  hud.classList.add("hidden");
  journal.classList.add("hidden");
  crosshair.classList.add("hidden");
  $("#touchControls").classList.add("hidden");
  overlay.querySelector("small").textContent = success ? "ABIGEL SELAMAT" : "TERKUNCI";
  overlay.querySelector("h1").textContent = success ? "Abigel berhasil keluar membawa 4 foto." : "Apartemen menelan Abigel.";
  overlay.querySelector("p").textContent = success
    ? "Foto Nori, Lila, Reno, dan Toni menjadi petunjuk pertama untuk mencari mereka."
    : "Coba lagi. Cari kunci, ingat kode 2714, dan kabur segera setelah foto lengkap.";
  overlay.querySelector("button").textContent = "MAIN LAGI";
  overlay.classList.remove("hidden");
}

function saveProgress(success) {
  fetch("/api/games/abigel-apartment/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      photos: found.size,
      ghosts: ghosts.length,
      fear: Math.round(player.fear),
      timeMs: Math.round(performance.now() - startedAt),
      won: success,
    }),
  }).catch(() => {});
}

function start() {
  resetWorldState();
  overlay.classList.add("hidden");
  hud.classList.remove("hidden");
  journal.classList.remove("hidden");
  crosshair.classList.remove("hidden");
  if (matchMedia("(pointer: coarse)").matches || innerWidth < 900) $("#touchControls").classList.remove("hidden");
}

function movement(dt) {
  let mx = 0;
  let mz = 0;
  if (keys.KeyW || keys.ArrowUp) mz -= 1;
  if (keys.KeyS || keys.ArrowDown) mz += 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  mx += touchMove.x;
  mz += touchMove.z;
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const move = new THREE.Vector3().addScaledVector(forward, -mz).addScaledVector(right, mx);
  if (move.lengthSq() > 1) move.normalize();
  player.vel.lerp(move.multiplyScalar(player.speed), 1 - Math.exp(-12 * dt));
  const nx = player.pos.x + player.vel.x * dt;
  const nz = player.pos.z + player.vel.z * dt;
  if (canStand(nx, player.pos.z)) player.pos.x = nx;
  if (canStand(player.pos.x, nz)) player.pos.z = nz;
  hero.position.copy(player.pos);
  if (player.vel.lengthSq() > 0.12) hero.rotation.y = Math.atan2(player.vel.x, player.vel.z);
  const lamp = hero.userData.lamp;
  if (lamp) {
    lamp.position.set(0, 1.55, -0.25);
    lamp.target.position.set(Math.sin(hero.rotation.y) * 5, 1.05, Math.cos(hero.rotation.y) * 5);
  }
}

function updateGhosts(dt, time) {
  ghosts.forEach((ghost, index) => {
    ghost.phase += dt * 3;
    const g = ghost.group;
    const dx = player.pos.x - g.position.x;
    const dz = player.pos.z - g.position.z;
    const dist = Math.hypot(dx, dz) || 1;
    const speed = ghost.speed * (escapeStarted ? 1.28 : 1) * (1 + index * 0.05);
    const nx = g.position.x + (dx / dist) * speed * dt;
    const nz = g.position.z + (dz / dist) * speed * dt;
    if (canStand(nx, g.position.z)) g.position.x = nx;
    if (canStand(g.position.x, nz)) g.position.z = nz;
    g.position.y = Math.sin(time * 2 + ghost.phase) * 0.12;
    g.lookAt(player.pos.x, 1.2, player.pos.z);
    if (dist < 2.2) player.fear -= dt * 22;
    else if (dist < 4.5) player.fear -= dt * 7;
  });
  player.fear = Math.min(100, player.fear + dt * 1.2);
  if (player.fear <= 0) finish(false);
}

function updateCamera(dt) {
  const focus = player.pos.clone().add(new THREE.Vector3(0, 1.2, 0));
  const distance = 7.6;
  const want = focus.clone().add(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch) * distance, Math.sin(pitch) * distance + 1.5, Math.cos(yaw) * Math.cos(pitch) * distance));
  camera.position.lerp(want, 1 - Math.exp(-8 * dt));
  camera.lookAt(focus);
}

function updateRoomNote() {
  const room = currentRoom();
  if (room && room.id !== lastRoomId) {
    lastRoomId = room.id;
    toast(room.name);
  }
}

function updateTimer() {
  if (!escapeStarted) return;
  const left = Math.max(0, Math.ceil((escapeEnd - performance.now()) / 1000));
  timerHud.textContent = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  if (left <= 0) finish(false);
}

function animateObjects(time) {
  pulse += 0.05;
  objectMeshes.forEach((mesh, id) => {
    if (!mesh.visible) return;
    const obj = objects.find((item) => item.id === id);
    if (obj?.photo || obj?.item) mesh.rotation.y = Math.sin(time * 1.6 + mesh.position.x) * 0.06;
  });
}

function loop() {
  const dt = Math.min(clock.getDelta(), 0.04);
  const time = clock.elapsedTime;
  if (running) {
    movement(dt);
    updateGhosts(dt, time);
    updateCamera(dt);
    updateTimer();
    updateRoomNote();
    animateObjects(time);
    updateHud();
  }
  renderer.render(scene, camera);
}

function setupInput() {
  addEventListener("keydown", (event) => {
    keys[event.code] = true;
    if (event.code === "KeyE") interact();
    if (event.code.startsWith("Arrow")) event.preventDefault();
  });
  addEventListener("keyup", (event) => {
    keys[event.code] = false;
    if (event.code.startsWith("Arrow")) event.preventDefault();
  });
  canvas.addEventListener("click", () => running && canvas.requestPointerLock?.());
  addEventListener("mousemove", (event) => {
    if (document.pointerLockElement === canvas && running) {
      yaw -= event.movementX * 0.0024;
      pitch = THREE.MathUtils.clamp(pitch - event.movementY * 0.0018, 0.18, 0.88);
    }
  });
  $("#interact").addEventListener("click", interact);
  $("#touchInteract").addEventListener("click", interact);
  $("#start").addEventListener("click", start);
  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

function setupTouch() {
  const stick = $("#moveStick");
  const knob = $("#moveKnob");
  const look = $("#lookZone");
  let moveId = null;
  let lookId = null;
  let lx = 0;
  let ly = 0;
  const move = (event) => {
    if (event.pointerId !== moveId) return;
    const rect = stick.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const max = 38;
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, max / len);
    const nx = dx * k;
    const ny = dy * k;
    knob.style.transform = `translate(${nx}px,${ny}px)`;
    touchMove.x = nx / max;
    touchMove.z = ny / max;
  };
  stick.addEventListener("pointerdown", (event) => {
    moveId = event.pointerId;
    stick.setPointerCapture(moveId);
    move(event);
  });
  stick.addEventListener("pointermove", move);
  const stopMove = (event) => {
    if (event.pointerId !== moveId) return;
    moveId = null;
    touchMove.x = 0;
    touchMove.z = 0;
    knob.style.transform = "translate(0,0)";
  };
  stick.addEventListener("pointerup", stopMove);
  stick.addEventListener("pointercancel", stopMove);
  look.addEventListener("pointerdown", (event) => {
    lookId = event.pointerId;
    lx = event.clientX;
    ly = event.clientY;
    look.setPointerCapture(lookId);
  });
  look.addEventListener("pointermove", (event) => {
    if (event.pointerId !== lookId) return;
    yaw -= (event.clientX - lx) * 0.006;
    pitch = THREE.MathUtils.clamp(pitch - (event.clientY - ly) * 0.005, 0.18, 0.88);
    lx = event.clientX;
    ly = event.clientY;
  });
  look.addEventListener("pointerup", (event) => {
    if (event.pointerId === lookId) lookId = null;
  });
  look.addEventListener("pointercancel", (event) => {
    if (event.pointerId === lookId) lookId = null;
  });
}

setupPhotos();
init3d();
setupInput();
setupTouch();
updateHud();
