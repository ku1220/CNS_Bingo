// DOM参照のショートカット
const qs = (id) => document.getElementById(id);

// 画面セクション（表示切替対象）
const screens = {
  hostSetup: qs("hostSetup"),
  hostGame: qs("hostGame"),
  guestJoin: qs("guestJoin"),
  guestGame: qs("guestGame"),
};

// 固定UI要素
const roomBadge = qs("roomBadge");
const brandSub = qs("brandSub");
const brandTitleImage = document.querySelector(".brand-title-image");
const bingoOverlay = qs("bingoOverlay");
const bingoRank = qs("bingoRank");
const qrCodeGame = qs("qrCodeGame");
const GUEST_SESSION_KEY = "cns-bingo-guest-session";

// クライアント側の一時状態（サーバーが正）
const state = {
  role: null,
  roomCode: null,
  playerId: null,
  roomSnapshot: null,
  playerSnapshot: null,
  bingoOverlayShown: false,
  socket: null,
  hostBaseUrl: "",
  drawAnimationTimer: null,
  drawRequestTimeout: null,
  isDrawing: false,
  previousLastDraw: null,
  guestPreviewRoomCode: "",
};

// 画面の表示切替
function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.add("hidden"));
  if (screens[name]) screens[name].classList.remove("hidden");
}

// 画面右上のルームバッジ更新
function setRoomBadge(code) {
  if (!code) {
    roomBadge.classList.add("hidden");
    roomBadge.textContent = "";
    return;
  }
  roomBadge.textContent = `ROOM ${code}`;
  roomBadge.classList.remove("hidden");
}

// 参加URLに使うベースURLを決定
function getJoinBaseUrl() {
  const custom = (state.hostBaseUrl || "").trim();
  if (!custom) return window.location.origin;
  try {
    const parsed = new URL(custom);
    return parsed.origin;
  } catch (err) {
    return window.location.origin;
  }
}

// 参加用URLを生成
function buildJoinUrl(code) {
  const url = new URL(getJoinBaseUrl());
  url.searchParams.set("role", "guest");
  url.searchParams.set("room", code);
  return url.toString();
}

// 参加URLをQRコードで表示
function renderQr(target, text) {
  if (!target) return;
  if (typeof window.QRCode !== "function") {
    target.textContent = "QR";
    return;
  }
  target.innerHTML = "";
  new QRCode(target, {
    text,
    width: 120,
    height: 120,
    colorDark: "#231f20",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });
}

function renderJoinAccess(code) {
  const joinUrl = buildJoinUrl(code);
  renderQr(qrCodeGame, joinUrl);
}

function saveGuestSession(roomCode, player) {
  if (!roomCode || !player?.id || !player?.reconnectToken) return;
  window.localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify({
    roomCode,
    playerId: player.id,
    reconnectToken: player.reconnectToken,
  }));
}

function loadGuestSession() {
  try {
    return JSON.parse(window.localStorage.getItem(GUEST_SESSION_KEY) || "null");
  } catch (err) {
    return null;
  }
}

function clearGuestSession() {
  window.localStorage.removeItem(GUEST_SESSION_KEY);
}

function tryGuestRejoin(roomCode) {
  const session = loadGuestSession();
  if (!roomCode || !session || session.roomCode !== roomCode) return false;
  const socket = connectSocket();
  if (!socket) return false;
  socket.emit("guest:rejoin", session);
  return true;
}

// Socket.io接続とイベント登録
function connectSocket() {
  if (!window.io) {
    alert("Socket.ioが読み込めません。サーバー経由でアクセスしてください。");
    return null;
  }
  if (state.socket) return state.socket;
  const socket = io();
  state.socket = socket;

  socket.on("room:created", ({ room }) => {
    state.role = "host";
    state.roomCode = room.code;
    setRoomBadge(room.code);
    renderHost(room);
    showScreen("hostGame");
  });

  socket.on("room:update", (room) => {
    if (state.role !== "host" || state.roomCode !== room.code) return;
    renderHost(room);
    if (room.status === "playing") showScreen("hostGame");
  });

  socket.on("guest:joined", ({ room, player }) => {
    state.role = "guest";
    state.roomCode = room.code;
    state.playerId = player.id;
    state.roomSnapshot = room;
    state.playerSnapshot = player;
    state.bingoOverlayShown = false;
    saveGuestSession(room.code, player);
    setRoomBadge(room.code);
    renderGuest(room, player);
    showScreen("guestGame");
  });

  socket.on("guest:update", ({ room, player }) => {
    if (state.role !== "guest" || state.playerId !== player.id) return;
    state.roomSnapshot = room;
    state.playerSnapshot = player;
    renderGuest(room, player);
  });

  socket.on("room:closed", () => {
    clearGuestSession();
    alert("ルームが解散されました。");
    resetClientState();
  });

  socket.on("guest:rejoin_failed", () => {
    clearGuestSession();
  });

  socket.on("room:preview", ({ roomCode, preset }) => {
    if (state.role || roomCode !== state.guestPreviewRoomCode) return;
    applyPreset(preset || "elegant");
  });

  socket.on("room:error", ({ message }) => {
    alert(message || "エラーが発生しました。");
  });

  return socket;
}

// ローカル状態を初期化
function resetClientState() {
  stopHostDrawAnimation();
  if (state.role === "guest") clearGuestSession();
  state.role = null;
  state.roomCode = null;
  state.playerId = null;
  state.roomSnapshot = null;
  state.playerSnapshot = null;
  state.bingoOverlayShown = false;
  state.hostBaseUrl = "";
  state.previousLastDraw = null;
  state.guestPreviewRoomCode = "";
  setRoomBadge(null);
  bootFromUrl();
}

function applyPreset(preset) {
  const activePreset = preset || "elegant";
  document.body.dataset.preset = activePreset;
  if (brandTitleImage) {
    const logoByPreset = {
      pop: {
        src: "images/POP_Title.svg",
        alt: "CNS BINGO",
      },
      cat: {
        src: "images/nekoLogo.svg",
        alt: "CNS Bingo Cat",
      },
    };
    const logo = logoByPreset[activePreset];
    if (logo) {
      brandTitleImage.src = logo.src;
      brandTitleImage.alt = logo.alt;
    }
  }
  if (!brandSub) return;
  const subTextByPreset = {
    elegant: "Elegant realtime bingo lounge",
    pop: "POP & PLAY BINGO SHOW",
    cat: "",
  };
  brandSub.textContent = subTextByPreset[activePreset] ?? subTextByPreset.elegant;
}

function applyHostSetupPreset() {
  applyPreset(qs("hostPreset")?.value || "elegant");
}

function requestGuestRoomPreview(rawRoomCode) {
  const roomCode = String(rawRoomCode || "").trim();
  state.guestPreviewRoomCode = roomCode;
  if (!roomCode) {
    applyPreset("elegant");
    return;
  }
  const socket = connectSocket();
  if (!socket) return;
  socket.emit("guest:preview", { roomCode });
}

// 主催者画面の描画
function renderHost(room) {
  state.roomSnapshot = room;
  applyPreset(room.config.preset);
  const playerCount = Object.keys(room.players).length;
  const reachedMaxPlayers = playerCount >= room.config.maxPlayers;
  qs("hostPlayerCount2").textContent = playerCount;
  qs("hostPlayerCount2").dataset.value = playerCount;
  const reachCount = Object.values(room.players).filter((p) => p.reach).length;
  const bingoCount = Object.values(room.players).filter((p) => p.bingo).length;
  qs("hostReachCount2").textContent = reachCount;
  qs("hostReachCount2").dataset.value = reachCount;
  qs("hostBingoCount2").textContent = bingoCount;
  qs("hostBingoCount2").dataset.value = bingoCount;

  const historyGrid = qs("historyGrid");
  historyGrid.innerHTML = "";
  room.drawn.forEach((num) => {
    const div = document.createElement("div");
    div.className = "ball";
    div.textContent = num;
    historyGrid.appendChild(div);
  });

  const hasNewHostDraw =
    state.role === "host" &&
    state.isDrawing &&
    room.lastDraw != null &&
    room.lastDraw !== state.previousLastDraw;
  const drawFinished = getRemainingDrawPool(room).length === 0;

  if (!state.isDrawing) {
    setDrawDisplay(room.lastDraw);
  }
  if (hasNewHostDraw) revealHostDraw(room);
  qs("drawButton").disabled = drawFinished || state.isDrawing;

  const alerts = qs("hostAlerts");
  alerts.innerHTML = "";
  if (drawFinished && room.drawn.length > 0) {
    const div = document.createElement("div");
    div.className = "alert";
    div.textContent = "すべての数字の抽選が完了しました。";
    alerts.appendChild(div);
  }
  room.bingoOrder.forEach((pid, idx) => {
    const player = room.players[pid];
    if (!player) return;
    const div = document.createElement("div");
    div.className = "alert";
    div.textContent = `${player.name} さんがビンゴ！ (${idx + 1}番目)`;
    alerts.appendChild(div);
  });

  qs("qrCodeGame").classList.toggle("hidden", reachedMaxPlayers);
  qs("qrLimitNotice").classList.toggle("hidden", !reachedMaxPlayers);
  if (!reachedMaxPlayers) renderJoinAccess(room.code);
}

function setDrawDisplay(value) {
  const drawValue = qs("drawValue");
  drawValue.innerHTML = "";
  if (value == null) {
    drawValue.textContent = "-";
    return;
  }
  drawValue.textContent = value;
}

function getRemainingDrawPool(room) {
  if (!room) return [];
  const max = room.config.maxNumber;
  const pool = [];
  for (let value = 1; value <= max; value += 1) {
    if (!room.drawn.includes(value)) pool.push(value);
  }
  return pool;
}

function stopHostDrawAnimation() {
  if (state.drawAnimationTimer) {
    clearInterval(state.drawAnimationTimer);
    state.drawAnimationTimer = null;
  }
  if (state.drawRequestTimeout) {
    clearTimeout(state.drawRequestTimeout);
    state.drawRequestTimeout = null;
  }
  state.isDrawing = false;
  const drawBox = qs("drawBox");
  if (drawBox) drawBox.classList.remove("animating");
}

function revealHostDraw(room) {
  stopHostDrawAnimation();
  const drawBox = qs("drawBox");
  setDrawDisplay(room.lastDraw);
  drawBox.classList.add("revealed");
  qs("drawButton").disabled = false;
  setTimeout(() => drawBox.classList.remove("revealed"), 1100);
}

function startHostDrawAnimation(room) {
  const drawBox = qs("drawBox");
  const pool = getRemainingDrawPool(room);
  if (!pool.length) return false;

  stopHostDrawAnimation();
  state.isDrawing = true;
  state.previousLastDraw = room.lastDraw;
  drawBox.classList.remove("revealed");
  drawBox.classList.add("animating");

  let tick = 0;
  state.drawAnimationTimer = setInterval(() => {
    const value = pool[(tick + Math.floor(Math.random() * pool.length)) % pool.length];
    setDrawDisplay(value);
    tick += 1;
  }, 52);
  state.drawRequestTimeout = setTimeout(() => {
    stopHostDrawAnimation();
    setDrawDisplay(room.lastDraw);
    qs("drawButton").disabled = false;
  }, 5000);
  return true;
}

// 参加者画面の描画
function renderGuest(room, player) {
  applyPreset(room.config.preset);
  qs("guestLastDraw").textContent = room.lastDraw ?? "-";
  qs("guestReachBadge").classList.toggle("hidden", !(player.reach && !player.bingo));
  qs("guestBingoMessage").classList.toggle("hidden", !player.bingo);
  showScreen("guestGame");

  renderCard(player, room);
  renderGuestHistory(room);
  maybeShowBingo(player);
}

function getReachLineCells(player) {
  if (!player?.checked) return new Set();
  const checked = player.checked;
  const size = checked.length;
  const reachCells = new Set();
  const lines = [];

  for (let r = 0; r < size; r += 1) {
    lines.push(Array.from({ length: size }, (_, c) => [r, c]));
  }
  for (let c = 0; c < size; c += 1) {
    lines.push(Array.from({ length: size }, (_, r) => [r, c]));
  }
  lines.push(Array.from({ length: size }, (_, i) => [i, i]));
  lines.push(Array.from({ length: size }, (_, i) => [i, size - 1 - i]));

  lines.forEach((line) => {
    const checkedCount = line.filter(([r, c]) => checked[r][c]).length;
    if (checkedCount !== size - 1) return;
    line.forEach(([r, c]) => reachCells.add(`${r}:${c}`));
  });

  return reachCells;
}

function getBingoLineCells(player) {
  if (!player?.checked || !player.bingo) return new Set();
  const checked = player.checked;
  const size = checked.length;
  const bingoCells = new Set();
  const lines = [];

  for (let r = 0; r < size; r += 1) {
    lines.push(Array.from({ length: size }, (_, c) => [r, c]));
  }
  for (let c = 0; c < size; c += 1) {
    lines.push(Array.from({ length: size }, (_, r) => [r, c]));
  }
  lines.push(Array.from({ length: size }, (_, i) => [i, i]));
  lines.push(Array.from({ length: size }, (_, i) => [i, size - 1 - i]));

  lines.forEach((line) => {
    const checkedCount = line.filter(([r, c]) => checked[r][c]).length;
    if (checkedCount !== size) return;
    line.forEach(([r, c]) => bingoCells.add(`${r}:${c}`));
  });

  return bingoCells;
}

// ビンゴカードを再描画
function renderCard(player, room) {
  const size = room.config.size;
  const cardEl = qs("bingoCard");
  const reachLineCells = getReachLineCells(player);
  const bingoLineCells = player.bingo ? getBingoLineCells(player) : new Set();
  cardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  cardEl.classList.remove("size-3", "size-5", "size-7");
  cardEl.classList.add(`size-${size}`);
  cardEl.innerHTML = "";
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const cellValue = player.card[r][c];
      const cell = document.createElement("div");
      cell.className = "cell";
      if (reachLineCells.has(`${r}:${c}`)) cell.classList.add("reach-line");
      if (bingoLineCells.has(`${r}:${c}`)) cell.classList.add("bingo-line");
      if (cellValue === "FREE") cell.classList.add("free");
      if (player.checked[r][c]) cell.classList.add("checked");
      if (room.drawn.includes(cellValue)) cell.classList.add("drawn");
      if (cellValue === "FREE") {
        cell.textContent = "FREE";
      } else {
        cell.textContent = cellValue;
      }
      cell.addEventListener("click", () => handleCellClick(r, c, room, player));
      cardEl.appendChild(cell);
    }
  }
}

// セルのタップ処理（最後に抽選されたものだけ許可）
function handleCellClick(r, c, room, player) {
  if (room.status !== "playing") return;
  const value = player.card[r][c];
  if (value === "FREE") return;
  if (player.checked[r][c]) return;
  if (room.lastDraw !== value) return;
  const socket = connectSocket();
  if (!socket) return;
  socket.emit("guest:check", { roomCode: room.code, playerId: player.id, r, c });
  if (navigator.vibrate) navigator.vibrate(20);
}

// ビンゴ表示（1回だけ）
function maybeShowBingo(player) {
  if (player.bingo && !state.bingoOverlayShown) {
    state.bingoOverlayShown = true;
    bingoRank.textContent = `${player.rank || 1}番目`;
    bingoOverlay.classList.remove("hidden");
  }
}

// 参加者の抽選履歴表示
function renderGuestHistory(room) {
  const history = qs("guestHistory");
  history.innerHTML = "";
  if (!room.drawn.length) {
    history.textContent = "まだ抽選がありません。";
    return;
  }
  const label = document.createElement("div");
  label.textContent = "抽選済み:";
  history.appendChild(label);
  const grid = document.createElement("div");
  grid.className = "history-inline";
  room.drawn.forEach((num) => {
    const item = document.createElement("div");
    item.className = "ball";
    item.textContent = num;
    grid.appendChild(item);
  });
  history.appendChild(grid);
}

function triggerHostDraw() {
  const socket = connectSocket();
  if (!socket || !state.roomCode) return;
  if (state.role !== "host" || screens.hostGame?.classList.contains("hidden")) return;
  if (state.isDrawing || qs("drawButton").disabled) return;
  if (!state.roomSnapshot) return;
  const started = startHostDrawAnimation(state.roomSnapshot);
  if (!started) return;
  qs("drawButton").disabled = true;
  setTimeout(() => {
    socket.emit("host:draw", { roomCode: state.roomCode });
  }, 1050);
}

// ルーム作成
qs("createRoom").addEventListener("click", () => {
  const socket = connectSocket();
  if (!socket) return;
  state.hostBaseUrl = qs("hostBaseUrl").value.trim();
  socket.emit("host:create", {
    size: Number(qs("hostSize").value),
    maxPlayers: Number(qs("hostMax").value),
    autoCheck: qs("hostAuto").value === "on",
    preset: qs("hostPreset").value,
  });
});

qs("hostPreset").addEventListener("change", () => {
  if (state.role) return;
  applyHostSetupPreset();
});

// 抽選実行
qs("drawButton").addEventListener("click", () => {
  triggerHostDraw();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.repeat) return;
  const activeTag = document.activeElement?.tagName;
  if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") return;
  triggerHostDraw();
});

// ゲーム終了
qs("endGame").addEventListener("click", () => {
  const socket = connectSocket();
  if (!socket || !state.roomCode) return;
  socket.emit("host:end", { roomCode: state.roomCode });
});

// 参加
qs("joinRoom").addEventListener("click", () => {
  const name = qs("guestName").value.trim();
  const roomCode = qs("guestRoom").value.trim();
  if (!name || !roomCode) return;
  const socket = connectSocket();
  if (!socket) return;
  socket.emit("guest:join", { roomCode, name });
});

qs("guestRoom").addEventListener("input", (event) => {
  if (state.role) return;
  requestGuestRoomPreview(event.target.value);
});

// 履歴の表示切替
qs("showHistory").addEventListener("click", () => {
  qs("guestHistory").classList.toggle("hidden");
});

// ビンゴ演出の閉じる
qs("closeOverlay").addEventListener("click", () => {
  bingoOverlay.classList.add("hidden");
});

// URLパラメータから初期状態を設定
function bootFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const role = params.get("role");
  const room = params.get("room");
  if (role === "guest") {
    applyPreset("elegant");
    showScreen("guestJoin");
    if (room) qs("guestRoom").value = room;
    requestGuestRoomPreview(room);
    if (room) tryGuestRejoin(room);
    return;
  }
  applyHostSetupPreset();
  showScreen("hostSetup");
}

// 初期表示
bootFromUrl();
