// 標準/外部モジュール
const path = require("path");
const crypto = require("crypto");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

// 静的配信（HTML/CSS/JS/画像）
const app = express();
app.use(express.static(path.join(__dirname)));

const server = http.createServer(app);
const io = new Server(server);

// ルーム状態はメモリ保持（再起動で消える）
const rooms = new Map();
// 4桁のルームコード生成
function randomCode() {
  let code = "";
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(code));
  return code;
}

// 数字モードの上限値
function poolMaxBySize(size) {
  if (size === 3) return 30;
  if (size === 5) return 75;
  return 99;
}

function formatPlayerName(name) {
  const trimmed = String(name || "").trim().slice(0, 16);
  return trimmed || "guest";
}

function normalizePlayerName(name) {
  return formatPlayerName(name).toLocaleLowerCase("ja-JP");
}

// 配列シャッフル（Fisher-Yates）
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ビンゴカード生成（中央FREE）
function createCard(size, maxNumber) {
  const total = size * size;
  const numbers = shuffle(Array.from({ length: maxNumber }, (_, i) => i + 1)).slice(0, total - 1);
  const card = [];
  let idx = 0;
  for (let r = 0; r < size; r += 1) {
    const row = [];
    for (let c = 0; c < size; c += 1) {
      if (r === Math.floor(size / 2) && c === Math.floor(size / 2)) {
        row.push("FREE");
      } else {
        row.push(numbers[idx]);
        idx += 1;
      }
    }
    card.push(row);
  }
  return card;
}

// ビンゴ/リーチ判定
function evaluateCard(checked) {
  const size = checked.length;
  let bingo = false;
  let reach = false;
  const lines = [];

  for (let r = 0; r < size; r += 1) {
    lines.push(checked[r]);
  }
  for (let c = 0; c < size; c += 1) {
    const col = [];
    for (let r = 0; r < size; r += 1) col.push(checked[r][c]);
    lines.push(col);
  }
  const diag1 = [];
  const diag2 = [];
  for (let i = 0; i < size; i += 1) {
    diag1.push(checked[i][i]);
    diag2.push(checked[i][size - 1 - i]);
  }
  lines.push(diag1, diag2);

  lines.forEach((line) => {
    const checkedCount = line.filter(Boolean).length;
    if (checkedCount === size) bingo = true;
    if (checkedCount === size - 1) reach = true;
  });

  return { bingo, reach };
}

// 判定結果をプレイヤーに反映
function updatePlayerStatus(player, room) {
  const result = evaluateCard(player.checked);
  player.bingo = result.bingo;
  player.reach = !result.bingo && result.reach;
  if (player.bingo && !room.bingoOrder.includes(player.id)) {
    room.bingoOrder.push(player.id);
    player.rank = room.bingoOrder.length;
  }
}

// 自動チェック（救済）
function autoCheckPlayer(player, room) {
  if (!player) return;
  const size = room.config.size;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (player.card[r][c] === room.lastDraw) {
        player.checked[r][c] = true;
      }
    }
  }
  updatePlayerStatus(player, room);
}

// 途中参加者に、これまでの抽選履歴を反映
function syncPlayerWithDrawHistory(player, room) {
  if (!player) return;
  const drawnSet = new Set(room.drawn);
  const size = room.config.size;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const value = player.card[r][c];
      if (value === "FREE" || drawnSet.has(value)) {
        player.checked[r][c] = true;
      }
    }
  }
  updatePlayerStatus(player, room);
}

// 手動チェック猶予が過ぎた前回抽選分を確定
function finalizePendingChecks(room) {
  if (!room || room.config.autoCheck || room.lastDraw == null) return;
  Object.values(room.players).forEach((player) => autoCheckPlayer(player, room));
}

// ルーム作成（設定を保持）
function createRoom(config) {
  const code = randomCode();
  return {
    code,
    status: "playing",
    config: {
      size: config.size,
      maxPlayers: config.maxPlayers,
      autoCheck: config.autoCheck,
      preset: config.preset || "elegant",
      maxNumber: poolMaxBySize(config.size),
    },
    drawn: [],
    lastDraw: null,
    players: {},
    bingoOrder: [],
  };
}

// 参加者に渡す最小情報（カードは含めない）
function makePublicRoom(room) {
  const playerCount = Object.keys(room.players).length;
  const reachCount = Object.values(room.players).filter((p) => p.reach).length;
  const bingoCount = Object.values(room.players).filter((p) => p.bingo).length;
  return {
    code: room.code,
    status: room.status,
    config: {
      size: room.config.size,
      preset: room.config.preset,
      maxNumber: room.config.maxNumber,
    },
    drawn: room.drawn,
    lastDraw: room.lastDraw,
    playerCount,
    reachCount,
    bingoCount,
  };
}

function makeHostRoom(room) {
  const players = {};
  Object.entries(room.players).forEach(([playerId, player]) => {
    players[playerId] = {
      id: player.id,
      name: player.name,
      reach: player.reach,
      bingo: player.bingo,
      rank: player.rank,
    };
  });
  return {
    code: room.code,
    status: room.status,
    config: room.config,
    drawn: room.drawn,
    lastDraw: room.lastDraw,
    players,
    bingoOrder: room.bingoOrder,
  };
}

function makeGuestPlayer(player, includeReconnectToken = false) {
  const payload = {
    id: player.id,
    name: player.name,
    card: player.card,
    checked: player.checked,
    reach: player.reach,
    bingo: player.bingo,
    rank: player.rank,
  };
  if (includeReconnectToken) payload.reconnectToken = player.reconnectToken;
  return payload;
}

// 主催者へ完全なルーム情報を配信
function broadcastHost(room) {
  io.to(room.code).emit("room:update", makeHostRoom(room));
}

// 参加者へ個別状態を配信
function broadcastGuests(room) {
  const publicRoom = makePublicRoom(room);
  Object.values(room.players).forEach((player) => {
    if (!player.socketId) return;
    io.to(player.socketId).emit("guest:update", { room: publicRoom, player: makeGuestPlayer(player) });
  });
}

// Socket.ioイベント定義
io.on("connection", (socket) => {
  socket.on("host:create", (payload) => {
    const config = {
      size: Number(payload?.size || 5),
      maxPlayers: Number(payload?.maxPlayers || 60),
      autoCheck: Boolean(payload?.autoCheck),
      preset: ["elegant", "pop", "cat"].includes(payload?.preset) ? payload.preset : "elegant",
    };
    const room = createRoom(config);
    rooms.set(room.code, room);
    socket.join(room.code);
    socket.data.role = "host";
    socket.data.roomCode = room.code;
    socket.emit("room:created", { room });
    broadcastHost(room);
  });

  // 抽選実行
  socket.on("host:draw", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || room.status !== "playing") return;
    finalizePendingChecks(room);
    const maxNumber = room.config.maxNumber;
    const allNums = Array.from({ length: maxNumber }, (_, i) => i + 1);
    const remaining = allNums.filter((n) => !room.drawn.includes(n));
    if (remaining.length === 0) return;

    const num = remaining[Math.floor(Math.random() * remaining.length)];
    room.lastDraw = num;
    room.drawn.push(num);

    if (room.config.autoCheck) {
      Object.values(room.players).forEach((player) => autoCheckPlayer(player, room));
    }

    broadcastHost(room);
    broadcastGuests(room);
  });

  // ゲーム終了
  socket.on("host:end", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    rooms.delete(roomCode);
    io.to(roomCode).emit("room:closed", { roomCode });
    io.in(roomCode).socketsLeave(roomCode);
  });

  // 参加
  socket.on("guest:preview", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    socket.emit("room:preview", {
      roomCode,
      preset: room?.config?.preset || "elegant",
    });
  });

  socket.on("guest:join", ({ roomCode, name }) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit("room:error", { message: "ルームが存在しません。" });
      return;
    }
    if (Object.keys(room.players).length >= room.config.maxPlayers) {
      socket.emit("room:error", { message: "参加人数が上限に達しています。" });
      return;
    }
    const playerName = formatPlayerName(name);
    const normalizedPlayerName = normalizePlayerName(playerName);
    const duplicateName = Object.values(room.players).some(
      (player) => normalizePlayerName(player.name) === normalizedPlayerName,
    );
    if (duplicateName) {
      socket.emit("room:error", { message: "そのニックネームは既に使用されています。" });
      return;
    }

    const playerId = `p_${Math.random().toString(36).slice(2, 10)}`;
    const card = createCard(room.config.size, room.config.maxNumber);
    const checked = card.map((row) => row.map((cell) => cell === "FREE"));
    const player = {
      id: playerId,
      name: playerName,
      card,
      checked,
      joinedAt: Date.now(),
      reach: false,
      bingo: false,
      rank: null,
      reconnectToken: crypto.randomBytes(16).toString("hex"),
      socketId: socket.id,
    };

    if (room.drawn.length > 0) {
      syncPlayerWithDrawHistory(player, room);
    }

    room.players[playerId] = player;
    socket.join(roomCode);
    socket.data.role = "guest";
    socket.data.roomCode = roomCode;
    socket.data.playerId = playerId;

    socket.emit("guest:joined", { room: makePublicRoom(room), player: makeGuestPlayer(player, true) });
    broadcastHost(room);
    broadcastGuests(room);
  });

  socket.on("guest:rejoin", ({ roomCode, playerId, reconnectToken }) => {
    const room = rooms.get(roomCode);
    const player = room?.players?.[playerId];
    if (!room || !player || player.reconnectToken !== reconnectToken) {
      socket.emit("guest:rejoin_failed");
      return;
    }

    player.socketId = socket.id;
    socket.join(roomCode);
    socket.data.role = "guest";
    socket.data.roomCode = roomCode;
    socket.data.playerId = playerId;

    socket.emit("guest:joined", { room: makePublicRoom(room), player: makeGuestPlayer(player, true) });
    broadcastHost(room);
    broadcastGuests(room);
  });

  // マスのチェック（不正防止）
  socket.on("guest:check", ({ roomCode, playerId, r, c }) => {
    const room = rooms.get(roomCode);
    if (!room || room.status !== "playing") return;
    const player = room.players[playerId];
    if (!player) return;
    const value = player.card?.[r]?.[c];
    if (value === "FREE") return;
    if (player.checked?.[r]?.[c]) return;
    if (room.lastDraw !== value) return;

    player.checked[r][c] = true;
    updatePlayerStatus(player, room);

    broadcastHost(room);
    broadcastGuests(room);
  });

  // 切断時の後処理
  socket.on("disconnect", () => {
    const { role, roomCode, playerId } = socket.data || {};
    if (role === "guest" && roomCode && playerId) {
      const room = rooms.get(roomCode);
      if (room && room.players[playerId]) {
        room.players[playerId].socketId = null;
        broadcastHost(room);
        broadcastGuests(room);
      }
    }
  });
});

// サーバー起動
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`CNS Bingo server running on http://localhost:${PORT}`);
});
