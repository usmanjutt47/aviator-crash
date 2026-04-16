const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const PORT = Number(process.env.PORT || 5001);

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const BET_PHASE_MS = 5000;
const GAME_END_MS = 2500;
const TICK_MS = 100;

const BOT_NAMES = [
  "Arjun",
  "Neha",
  "Rahul",
  "Pooja",
  "Aman",
  "Sneha",
  "Rohan",
  "Anjali",
  "Vikram",
  "Priya",
  "Karan",
  "Meera",
  "Dev",
  "Kriti",
  "Kabir",
  "Isha",
  "Nitin",
  "Riya",
  "Yash",
  "Tina",
  "Manav",
  "Sonal",
  "Aditya",
  "Nisha",
  "Varun",
  "Kajal",
  "Asha",
  "Deepak",
  "Ravi",
  "Bhavna",
];

const usersByKey = new Map();
const chats = [];
const roundSeeds = new Map();
const allSettledBets = [];
let history = [];

const game = {
  state: "BET",
  phaseStartedAt: Date.now(),
  currentSecondNum: 1,
  currentNum: "1.00",
  crashTarget: 1,
  roundId: 1,
  roundBets: [],
  previousHand: [],
};

const betLimits = { min: 1, max: 1000 };
let gameTicker = null;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, precision = 2) {
  return Number((Math.random() * (max - min) + min).toFixed(precision));
}

function randomName() {
  return `Guest${Math.floor(Math.random() * 9000 + 1000)}`;
}

function createUser(key) {
  return {
    balance: 10000,
    userType: false,
    avatar: "/avatars/av-5.png",
    userId: key,
    currency: "INR",
    userName: randomName(),
    ipAddress: "127.0.0.1",
    platform: "web",
    token: key,
    Session_Token: key,
    isSoundEnable: true,
    isMusicEnable: true,
    msgVisible: false,
    f: {
      auto: false,
      autocashout: false,
      betid: "0",
      betted: false,
      cashouted: false,
      betAmount: 20,
      cashAmount: 0,
      target: 2,
    },
    s: {
      auto: false,
      autocashout: false,
      betid: "0",
      betted: false,
      cashouted: false,
      betAmount: 20,
      cashAmount: 0,
      target: 2,
    },
    myBets: [],
  };
}

function getUser(key) {
  if (!usersByKey.has(key)) {
    usersByKey.set(key, createUser(key));
  }
  return usersByKey.get(key);
}

function calcMultiplier(seconds) {
  return (
    1 +
    0.06 * seconds +
    Math.pow(0.06 * seconds, 2) -
    Math.pow(0.04 * seconds, 3) +
    Math.pow(0.04 * seconds, 4)
  );
}

function sanitizeForBettedList(user, side) {
  const sideData = user[side];
  return {
    name: user.userName,
    betAmount: sideData.betAmount,
    cashOut: sideData.cashAmount || 0,
    cashouted: Boolean(sideData.cashouted),
    target: sideData.target || 0,
    img: user.avatar,
  };
}

function emitGameState() {
  io.emit("gameState", {
    currentNum: String(game.currentNum),
    currentSecondNum: Number(game.currentSecondNum),
    GameState: game.state,
    time: 0,
  });
}

function emitRoundData() {
  io.emit("bettedUserInfo", game.roundBets);
  io.emit("previousHand", game.previousHand);
  io.emit("history", history);
  io.emit("getBetLimits", betLimits);
}

function buildFakeRoundBets() {
  const fakeCount = randomInt(220, 300);
  const usedNames = new Set();
  const fakeBets = [];

  while (fakeBets.length < fakeCount) {
    const baseName = BOT_NAMES[randomInt(0, BOT_NAMES.length - 1)];
    const name = `${baseName}${randomInt(1, 9999)}`;
    if (usedNames.has(name)) {
      continue;
    }
    usedNames.add(name);

    const betAmount = randomFloat(10, 500, 2);
    const avatarIndex = randomInt(1, 72);
    fakeBets.push({
      __entryKey: `bot-${game.roundId}-${fakeBets.length + 1}`,
      __bot: true,
      __plannedCashoutAt: randomFloat(1.05, 15, 2),
      name,
      betAmount,
      cashOut: 0,
      cashouted: false,
      target: 0,
      img: `/avatars/av-${avatarIndex}.png`,
    });
  }

  return fakeBets;
}

function applyFakeCashouts(currentMultiplier) {
  let changed = false;

  game.roundBets.forEach((bet) => {
    if (!bet.__bot || bet.cashouted) {
      return;
    }

    if (bet.__plannedCashoutAt <= currentMultiplier) {
      bet.cashouted = true;
      bet.target = Number(currentMultiplier.toFixed(2));
      bet.cashOut = Number((bet.betAmount * bet.target).toFixed(2));
      changed = true;
    }
  });

  if (changed) {
    io.emit("bettedUserInfo", game.roundBets);
  }
}

function startBetPhase() {
  game.state = "BET";
  game.phaseStartedAt = Date.now();
  game.currentNum = "1.00";
  game.currentSecondNum = 1;
  game.roundBets = buildFakeRoundBets();
  emitGameState();
  emitRoundData();

  setTimeout(startPlayingPhase, BET_PHASE_MS);
}

function startPlayingPhase() {
  game.state = "PLAYING";
  game.phaseStartedAt = Date.now();
  game.currentSecondNum = 1;

  const randomSeconds = 3 + Math.random() * 7;
  game.crashTarget = Number(calcMultiplier(randomSeconds).toFixed(2));
  game.currentNum = "1.00";

  emitGameState();

  if (gameTicker) {
    clearInterval(gameTicker);
  }

  gameTicker = setInterval(() => {
    const elapsed = (Date.now() - game.phaseStartedAt) / 1000;
    const current = Number(calcMultiplier(elapsed).toFixed(2));
    game.currentSecondNum = current;
    game.currentNum = current.toFixed(2);
    applyFakeCashouts(current);
    emitGameState();

    if (current >= game.crashTarget) {
      clearInterval(gameTicker);
      gameTicker = null;
      endRound();
    }
  }, TICK_MS);
}

function settleUserRound(user) {
  ["f", "s"].forEach((side) => {
    const bet = user[side];
    if (!bet.betted && !bet.cashouted) {
      return;
    }

    const didCashout = Boolean(bet.cashouted);
    const cashoutAt = didCashout ? Number(bet.target || 0) : 0;

    const myBet = {
      _id: Date.now() + Math.floor(Math.random() * 10000),
      name: user.userName,
      betAmount: Number(bet.betAmount || 0),
      cashoutAt,
      cashouted: didCashout,
      createdAt: new Date().toISOString(),
      flyAway: Number(game.crashTarget),
      flyDetailID: game.roundId,
    };

    user.myBets.unshift(myBet);
    allSettledBets.unshift(myBet);

    bet.betted = false;
    bet.cashouted = false;
    bet.cashAmount = 0;
  });
}

function createTopHistoryRecordFromBet(bet, roundId, crashTarget) {
  const cashoutAt = Number(bet.target || 0);
  return {
    _id: Date.now() + Math.floor(Math.random() * 10000),
    name: bet.name,
    betAmount: Number(bet.betAmount || 0),
    cashoutAt,
    cashouted: Boolean(bet.cashouted),
    createdAt: new Date().toISOString(),
    flyAway: Number(crashTarget),
    flyDetailID: roundId,
  };
}

function getTopHistoryData(limit) {
  const settled = allSettledBets.filter((item) => item.cashouted);
  if (settled.length > 0) {
    return settled
      .slice()
      .sort((a, b) => b.betAmount * b.cashoutAt - a.betAmount * a.cashoutAt)
      .slice(0, limit);
  }

  return Array.from({ length: 20 }, (_, idx) => {
    const betAmount = randomFloat(20, 400, 2);
    const cashoutAt = randomFloat(1.1, 8, 2);
    return {
      _id: Date.now() + idx,
      name: `${BOT_NAMES[randomInt(0, BOT_NAMES.length - 1)]}${randomInt(10, 999)}`,
      betAmount,
      cashoutAt,
      cashouted: true,
      createdAt: new Date().toISOString(),
      flyAway: Number(randomFloat(cashoutAt, cashoutAt + 4, 2)),
      flyDetailID: Math.max(1, game.roundId - idx),
    };
  });
}

function endRound() {
  game.state = "GAMEEND";
  game.currentSecondNum = game.crashTarget;
  game.currentNum = game.crashTarget.toFixed(2);

  const serverSeed = Math.random().toString(36).slice(2, 18);
  roundSeeds.set(game.roundId, {
    createdAt: new Date().toISOString(),
    serverSeed,
    seedOfUsers: [
      { seed: "local-seed-a", userId: "guest-a" },
      { seed: "local-seed-b", userId: "guest-b" },
      { seed: "local-seed-c", userId: "guest-c" },
    ],
    flyDetailID: game.roundId,
    target: game.crashTarget,
  });

  history = [...history, game.crashTarget].slice(-40);

  game.roundBets.forEach((bet) => {
    if (bet.__bot && !bet.cashouted) {
      bet.cashOut = 0;
      bet.target = 0;
    }

    if (bet.cashouted) {
      allSettledBets.unshift(
        createTopHistoryRecordFromBet(bet, game.roundId, game.crashTarget),
      );
    }
  });

  game.previousHand = game.roundBets.map((item) => ({ ...item }));

  usersByKey.forEach((user) => {
    settleUserRound(user);
  });

  emitGameState();
  emitRoundData();

  io.sockets.sockets.forEach((socket) => {
    const user = getUser(socket.data.userKey || socket.id);
    socket.emit("finishGame", user);
    socket.emit("myInfo", user);
    socket.emit("myBetState", user);
  });

  game.roundId += 1;

  setTimeout(startBetPhase, GAME_END_MS);
}

function updateRoundBet(user, side) {
  const payload = sanitizeForBettedList(user, side);
  payload.__entryKey = `${user.userId}-${side}`;

  const existingIndex = game.roundBets.findIndex(
    (item) => item.__entryKey === payload.__entryKey,
  );

  if (existingIndex >= 0) {
    game.roundBets[existingIndex] = payload;
  } else {
    game.roundBets.push(payload);
  }
}

io.on("connection", (socket) => {
  socket.on("enterRoom", ({ token } = {}) => {
    const userKey = token || socket.id;
    socket.data.userKey = userKey;

    const user = getUser(userKey);

    socket.emit("myInfo", user);
    socket.emit("myBetState", user);
    socket.emit("history", history);
    socket.emit("gameState", {
      currentNum: String(game.currentNum),
      currentSecondNum: Number(game.currentSecondNum),
      GameState: game.state,
      time: 0,
    });
    socket.emit("bettedUserInfo", game.roundBets);
    socket.emit("previousHand", game.previousHand);
    socket.emit("getBetLimits", betLimits);
  });

  socket.on("playBet", (data) => {
    const side = data?.type;
    if (side !== "f" && side !== "s") {
      socket.emit("error", { index: "f", message: "Invalid bet side" });
      return;
    }

    if (game.state !== "BET") {
      socket.emit("error", { index: side, message: "Wait for next round" });
      return;
    }

    const user = getUser(socket.data.userKey || socket.id);
    const amount = Number(data?.betAmount || 0);

    if (amount < betLimits.min || amount > betLimits.max) {
      socket.emit("error", {
        index: side,
        message: `Bet must be between ${betLimits.min} and ${betLimits.max}`,
      });
      return;
    }

    if (user.balance < amount) {
      socket.emit("recharge");
      socket.emit("error", { index: side, message: "Insufficient balance" });
      return;
    }

    user.balance = Number((user.balance - amount).toFixed(2));
    user[side].betted = true;
    user[side].cashouted = false;
    user[side].cashAmount = 0;
    user[side].betAmount = amount;
    user[side].target = Number(data?.target || 2);
    user[side].auto = Boolean(data?.auto);

    updateRoundBet(user, side);

    socket.emit("myInfo", user);
    socket.emit("myBetState", user);
    io.emit("bettedUserInfo", game.roundBets);
    socket.emit("success", "Bet placed");
  });

  socket.on("cashOut", (data) => {
    const side = data?.type;
    if (side !== "f" && side !== "s") {
      return;
    }

    if (game.state !== "PLAYING") {
      return;
    }

    const user = getUser(socket.data.userKey || socket.id);
    const bet = user[side];

    if (!bet.betted || bet.cashouted) {
      return;
    }

    const elapsed = (Date.now() - game.phaseStartedAt) / 1000;
    const liveMultiplier = Number(calcMultiplier(elapsed).toFixed(2));
    const requested = Number(data?.endTarget || liveMultiplier);
    const payoutMultiplier = Math.min(
      Math.max(1.01, requested),
      liveMultiplier,
    );

    bet.cashouted = true;
    bet.betted = false;
    bet.target = Number(payoutMultiplier.toFixed(2));
    bet.cashAmount = Number((bet.betAmount * payoutMultiplier).toFixed(2));
    user.balance = Number((user.balance + bet.cashAmount).toFixed(2));

    updateRoundBet(user, side);

    socket.emit("myInfo", user);
    socket.emit("myBetState", user);
    io.emit("bettedUserInfo", game.roundBets);
    socket.emit("success", "Cashout successful");
  });

  socket.on("sendMsg", ({ msgType, msgContent, userInfo }) => {
    const message = {
      _id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId: userInfo?.userId || socket.id,
      userName: userInfo?.userName || "Guest",
      avatar: userInfo?.avatar || "/avatars/av-5.png",
      message: String(msgContent || ""),
      img: msgType === "gif" ? String(msgContent || "") : "",
      likes: 0,
      likesIDs: [],
      disLikes: 0,
      disLikesIDs: [],
    };

    if (message.message.trim()) {
      chats.push(message);
    }
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: true, message: "Backend running" });
});

app.post("/api/my-info", (req, res) => {
  const name = String(req.body?.name || "");
  const user = [...usersByKey.values()].find((item) => item.userName === name);
  res.json({ status: true, data: user?.myBets || [] });
});

app.get("/api/get-day-history", (_req, res) => {
  const data = getTopHistoryData(30);
  res.json({ status: true, data });
});

app.get("/api/get-month-history", (_req, res) => {
  const data = getTopHistoryData(30);
  res.json({ status: true, data });
});

app.get("/api/get-year-history", (_req, res) => {
  const data = getTopHistoryData(30);
  res.json({ status: true, data });
});

app.get("/api/game/seed/:id", (req, res) => {
  const id = Number(req.params.id);
  const seedData = roundSeeds.get(id) || {
    createdAt: new Date().toISOString(),
    serverSeed: "local-server-seed",
    seedOfUsers: [
      { seed: "local-seed-a", userId: "guest-a" },
      { seed: "local-seed-b", userId: "guest-b" },
    ],
    flyDetailID: id,
    target: 1,
  };

  res.json(seedData);
});

app.post("/api/get-all-chat", (_req, res) => {
  res.json({ status: true, data: chats.slice(-100) });
});

app.post("/api/like-chat", (req, res) => {
  const { chatID, userId } = req.body || {};
  const chat = chats.find((item) => item._id === chatID);
  if (!chat) {
    res.json({ status: false });
    return;
  }

  if (!chat.likesIDs.includes(userId)) {
    chat.likesIDs.push(userId);
    chat.likes = chat.likesIDs.length;
  }

  res.json({ status: true, data: chat });
});

app.post("/api/update-info", (req, res) => {
  const { userId, updateData } = req.body || {};
  const user = usersByKey.get(userId);

  if (!user) {
    res.json({ status: true });
    return;
  }

  Object.assign(user, updateData || {});

  res.json({ status: true, data: user });
});

server.listen(PORT, () => {
  console.log(`Mock backend running on http://localhost:${PORT}`);
  startBetPhase();
});
