const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const photoHud = document.querySelector("#photoHud");
const ghostHud = document.querySelector("#ghostHud");
const timerHud = document.querySelector("#timerHud");
const noteEl = document.querySelector("#note");
const itemsEl = document.querySelector("#items");
const photosEl = document.querySelector("#photos");
const overlay = document.querySelector("#overlay");
const toastEl = document.querySelector("#toast");

const rooms = [
  { id: "foyer", name: "Foyer", x: 55, y: 235, w: 175, h: 150 },
  { id: "hall", name: "Lorong", x: 215, y: 255, w: 515, h: 105 },
  { id: "bedroom", name: "Kamar Nori", x: 285, y: 55, w: 185, h: 215 },
  { id: "kitchen", name: "Dapur Lila", x: 535, y: 60, w: 195, h: 210 },
  { id: "bath", name: "Kamar Mandi", x: 720, y: 245, w: 190, h: 145 },
  { id: "storage", name: "Gudang Reno", x: 285, y: 350, w: 195, h: 210, locked: "key" },
  { id: "archive", name: "Ruang Arsip Toni", x: 535, y: 350, w: 210, h: 210, locked: "code" },
];

const containers = [
  { id: "drawer", room: "bedroom", x: 324, y: 96, w: 60, h: 34, label: "laci meja", photo: "Nori", text: "Foto Nori ada di balik laci. Di belakangnya tertulis: 2." },
  { id: "cabinet", room: "kitchen", x: 640, y: 86, w: 62, h: 42, label: "lemari dapur", photo: "Lila", text: "Foto Lila terselip di lemari dapur. Ada angka kecil: 7." },
  { id: "sink", room: "bath", x: 800, y: 278, w: 54, h: 32, label: "wastafel", item: "kunci gudang", text: "Abigel menemukan kunci dingin di bawah wastafel." },
  { id: "chest", room: "storage", x: 346, y: 493, w: 66, h: 38, label: "peti kayu", photo: "Reno", text: "Foto Reno ada di peti. Di pinggirnya tertulis: 1." },
  { id: "box", room: "archive", x: 652, y: 493, w: 58, h: 42, label: "kotak arsip", photo: "Toni", text: "Foto Toni ketemu. Urutan kode lengkapnya terasa jelas: 2714." },
  { id: "memo", room: "hall", x: 494, y: 286, w: 45, h: 28, label: "memo robek", text: "Memo robek: 'Kode ruang arsip disusun dari angka pada foto lama. Jika belum lengkap, coba 2714.'", hint: true },
];

const names = ["Nori", "Lila", "Reno", "Toni"];
const keys = new Set();
const found = new Set();
const opened = new Set();
const controls = { up: false, down: false, left: false, right: false };
const player = { x: 130, y: 305, r: 14, speed: 2.5, fear: 100, dir: 0 };
const ghosts = [{ x: 865, y: 310, speed: 0.86, phase: 0 }];
let running = false;
let win = false;
let dead = false;
let escapeStarted = false;
let escapeEnd = 0;
let lastTime = 0;
let pulse = 0;

function setupPhotos() {
  photosEl.innerHTML = names.map((name) => `<li id="photo-${name}"><span>${name}</span><b>hilang</b></li>`).join("");
}

function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

function pointInRoom(x, y, room) {
  return x >= room.x + 4 && x <= room.x + room.w - 4 && y >= room.y + 4 && y <= room.y + room.h - 4;
}

function currentRoom(x = player.x, y = player.y) {
  return rooms.find((room) => pointInRoom(x, y, room));
}

function canStand(x, y) {
  return rooms.some((room) => pointInRoom(x, y, room) && !room.locked);
}

function near(a, b, distance = 48) {
  return Math.hypot(a.x - b.x, a.y - b.y) < distance;
}

function objectCenter(obj) {
  return { x: obj.x + obj.w / 2, y: obj.y + obj.h / 2 };
}

function updateHud() {
  photoHud.textContent = `Foto ${found.size}/4`;
  ghostHud.textContent = `Hantu ${ghosts.length}`;
  itemsEl.textContent = keys.size ? [...keys].join(", ") : "Belum ada.";
  names.forEach((name) => {
    const row = document.querySelector(`#photo-${name}`);
    row.classList.toggle("found", found.has(name));
    row.querySelector("b").textContent = found.has(name) ? "ketemu" : "hilang";
  });
}

function addGhost() {
  const starts = [{ x: 880, y: 330 }, { x: 585, y: 520 }, { x: 335, y: 95 }];
  const p = starts[Math.min(ghosts.length - 1, starts.length - 1)];
  ghosts.push({ x: p.x, y: p.y, speed: 0.78 + ghosts.length * 0.12, phase: Math.random() * 9 });
  toast("Suhu apartemen turun. Ada hantu lain yang terbangun.");
  updateHud();
}

function unlock(room) {
  if (room.locked === "key") {
    if (!keys.has("kunci gudang")) {
      noteEl.textContent = "Pintu gudang terkunci. Cari kuncinya dulu.";
      toast("Terkunci. Butuh kunci gudang.");
      return;
    }
    room.locked = null;
    noteEl.textContent = "Kunci gudang berputar sendiri setelah dipakai.";
    addGhost();
    return;
  }
  if (room.locked === "code") {
    const code = prompt("Masukkan kode 4 angka untuk Ruang Arsip Toni:");
    if (code !== "2714") {
      noteEl.textContent = "Kode salah. Dari balik pintu terdengar ketukan.";
      toast("Kode salah.");
      return;
    }
    room.locked = null;
    noteEl.textContent = "Kode benar. Pintu arsip terbuka, tapi sesuatu ikut masuk.";
    addGhost();
  }
}

function interact() {
  if (!running || dead || win) return;
  const room = currentRoom();
  if (!room) return;
  const lockedRoom = rooms.find((target) => target.locked && Math.hypot(player.x - (target.x + target.w / 2), player.y - (target.y + target.h / 2)) < 128);
  if (lockedRoom && lockedRoom !== room) return unlock(lockedRoom);
  const nearby = containers.find((obj) => !opened.has(obj.id) && near(player, objectCenter(obj), 54));
  if (nearby) {
    opened.add(nearby.id);
    noteEl.textContent = nearby.text;
    if (nearby.item) keys.add(nearby.item);
    if (nearby.photo) found.add(nearby.photo);
    if (nearby.hint) opened.delete(nearby.id);
    if (found.size === 4 && !escapeStarted) startEscape();
    updateHud();
    toast(`Memeriksa ${nearby.label}.`);
    return;
  }
  if (room.id === "foyer" && escapeStarted && player.x < 82) return finish(true);
  if (room.id === "foyer" && !escapeStarted && player.x < 82) {
    noteEl.textContent = "Abigel belum bisa pergi. Foto teman-temannya belum lengkap.";
    toast("Cari semua foto dulu.");
    return;
  }
  noteEl.textContent = `${room.name}. Tidak ada yang bisa diperiksa di dekat Abigel.`;
}

function startEscape() {
  escapeStarted = true;
  escapeEnd = performance.now() + 70000;
  noteEl.textContent = "Empat foto lengkap. Pintu apartemen mulai mengunci. LARI KE FOYER!";
  toast("Semua foto ketemu. Cepat keluar!");
  addGhost();
}

function finish(wonGame) {
  running = false;
  win = wonGame;
  dead = !wonGame;
  overlay.querySelector("small").textContent = wonGame ? "ABIGEL SELAMAT" : "TERKUNCI";
  overlay.querySelector("h2").textContent = wonGame ? "Abigel berhasil keluar membawa 4 foto." : "Apartemen menelan Abigel.";
  overlay.querySelector("p").textContent = wonGame
    ? "Nori, Lila, Reno, dan Toni belum ditemukan, tapi foto mereka menjadi petunjuk pertama."
    : "Coba lagi. Dengarkan petunjuk, buka ruangan seperlunya, lalu kabur setelah foto lengkap.";
  overlay.querySelector("button").textContent = "MAIN LAGI";
  overlay.classList.remove("hidden");
}

function start() {
  keys.clear();
  found.clear();
  opened.clear();
  rooms.forEach((room) => {
    if (room.id === "storage") room.locked = "key";
    if (room.id === "archive") room.locked = "code";
  });
  player.x = 130;
  player.y = 305;
  player.fear = 100;
  ghosts.length = 0;
  ghosts.push({ x: 865, y: 310, speed: 0.86, phase: 0 });
  escapeStarted = false;
  escapeEnd = 0;
  dead = false;
  win = false;
  running = true;
  lastTime = performance.now();
  noteEl.textContent = "Cari 4 foto Nori, Lila, Reno, dan Toni. Setelah lengkap, keluar secepatnya.";
  timerHud.textContent = "--:--";
  overlay.classList.add("hidden");
  updateHud();
  requestAnimationFrame(loop);
}

function handleMovement() {
  let dx = 0;
  let dy = 0;
  if (controls.left) dx -= 1;
  if (controls.right) dx += 1;
  if (controls.up) dy -= 1;
  if (controls.down) dy += 1;
  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    player.dir = Math.atan2(dy, dx);
    const nx = player.x + dx * player.speed;
    const ny = player.y + dy * player.speed;
    if (canStand(nx, player.y)) player.x = nx;
    if (canStand(player.x, ny)) player.y = ny;
  }
}

function moveGhosts(dt) {
  ghosts.forEach((ghost, index) => {
    ghost.phase += dt * 0.003;
    const dx = player.x - ghost.x;
    const dy = player.y - ghost.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = ghost.speed * (escapeStarted ? 1.35 : 1) * (1 + index * 0.05);
    const nx = ghost.x + (dx / dist) * speed;
    const ny = ghost.y + (dy / dist) * speed;
    if (canStand(nx, ghost.y)) ghost.x = nx;
    if (canStand(ghost.x, ny)) ghost.y = ny;
    if (dist < 42) player.fear -= dt * 0.04;
    if (dist < 26) player.fear -= dt * 0.08;
  });
  player.fear = Math.min(100, player.fear + dt * 0.004);
  if (player.fear <= 0) finish(false);
}

function updateTimer() {
  if (!escapeStarted) return;
  const left = Math.max(0, Math.ceil((escapeEnd - performance.now()) / 1000));
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  timerHud.textContent = `${mm}:${ss}`;
  if (left <= 0) finish(false);
}

function drawRoom(room) {
  const locked = room.locked;
  ctx.fillStyle = locked ? "#171010" : "#171918";
  ctx.fillRect(room.x, room.y, room.w, room.h);
  ctx.strokeStyle = locked ? "#73333a" : "#4c4841";
  ctx.lineWidth = 3;
  ctx.strokeRect(room.x, room.y, room.w, room.h);
  ctx.fillStyle = locked ? "#b95761" : "#8f897d";
  ctx.font = "12px system-ui";
  ctx.fillText(`${room.name}${locked ? " (terkunci)" : ""}`, room.x + 12, room.y + 20);
}

function drawContainer(obj) {
  const isOpen = opened.has(obj.id) && !obj.hint;
  ctx.fillStyle = obj.photo ? "#6b4a36" : obj.item ? "#526052" : "#6d6554";
  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
  ctx.strokeStyle = isOpen ? "#b73a46" : "#c3b48d";
  ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
  ctx.fillStyle = "#ece7d8";
  ctx.font = "11px system-ui";
  ctx.fillText(isOpen ? "kosong" : obj.label, obj.x - 4, obj.y - 8);
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.dir);
  ctx.fillStyle = "#d8c8b2";
  ctx.beginPath();
  ctx.arc(0, 0, player.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a1918";
  ctx.fillRect(-9, -12, 18, 9);
  ctx.fillStyle = "rgba(242,193,92,.2)";
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(92, -34);
  ctx.lineTo(92, 34);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGhost(ghost) {
  ctx.save();
  ctx.translate(ghost.x, ghost.y + Math.sin(ghost.phase) * 4);
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = "#d9edf0";
  ctx.beginPath();
  ctx.arc(0, -6, 18, Math.PI, 0);
  ctx.lineTo(18, 14);
  ctx.quadraticCurveTo(10, 8, 3, 14);
  ctx.quadraticCurveTo(-5, 8, -12, 14);
  ctx.lineTo(-18, 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#151718";
  ctx.beginPath();
  ctx.arc(-6, -6, 3, 0, Math.PI * 2);
  ctx.arc(7, -6, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw() {
  pulse += 0.025;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#070808";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  rooms.forEach(drawRoom);
  containers.forEach(drawContainer);
  ctx.fillStyle = "#38292a";
  ctx.fillRect(40, 292, 18, 42);
  ctx.fillStyle = escapeStarted ? "#f2c15c" : "#71685a";
  ctx.fillText("EXIT", 35, 284);
  ghosts.forEach(drawGhost);
  drawPlayer();
  ctx.fillStyle = "rgba(0,0,0,.44)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const grad = ctx.createRadialGradient(player.x, player.y, 40, player.x, player.y, 185 + Math.sin(pulse) * 12);
  grad.addColorStop(0, "rgba(255,244,205,.42)");
  grad.addColorStop(0.34, "rgba(255,244,205,.16)");
  grad.addColorStop(1, "rgba(255,244,205,0)");
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#ece7d8";
  ctx.font = "13px system-ui";
  ctx.fillText(`Takut: ${Math.max(0, Math.round(player.fear))}%`, 780, 34);
}

function loop(now) {
  if (!running) return;
  const dt = Math.min(34, now - lastTime);
  lastTime = now;
  handleMovement();
  moveGhosts(dt);
  updateTimer();
  draw();
  requestAnimationFrame(loop);
}

document.querySelector("#start").addEventListener("click", start);
document.querySelector("#interact").addEventListener("click", interact);
document.querySelector("#touchInteract").addEventListener("click", interact);
document.addEventListener("keydown", (event) => {
  if (event.key === "e" || event.key === "E") interact();
  if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") controls.up = true;
  if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") controls.down = true;
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") controls.left = true;
  if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") controls.right = true;
});
document.addEventListener("keyup", (event) => {
  if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") controls.up = false;
  if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") controls.down = false;
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") controls.left = false;
  if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") controls.right = false;
});
document.querySelectorAll("[data-move]").forEach((button) => {
  const key = button.dataset.move;
  const set = (value) => {
    controls[key] = value;
  };
  button.addEventListener("pointerdown", () => set(true));
  button.addEventListener("pointerup", () => set(false));
  button.addEventListener("pointerleave", () => set(false));
  button.addEventListener("pointercancel", () => set(false));
});
setupPhotos();
updateHud();
draw();
