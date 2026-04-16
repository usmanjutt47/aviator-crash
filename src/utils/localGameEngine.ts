import {
  BettedUserType,
  GameHistory,
  GameStatusType,
  GameBetLimit,
  MsgUserType,
  SeedDetailsType,
  UserType,
} from "./interfaces";

type EventHandler = (...args: any[]) => void;

type GameEngineEvents =
  | "connect"
  | "bettedUserInfo"
  | "myBetState"
  | "myInfo"
  | "history"
  | "gameState"
  | "previousHand"
  | "finishGame"
  | "getBetLimits"
  | "recharge"
  | "error"
  | "success"
  | "message";

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

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, precision = 2) {
  return Number((Math.random() * (max - min) + min).toFixed(precision));
}

function randomName() {
  return `Guest${Math.floor(Math.random() * 9000 + 1000)}`;
}

export class LocalGameEngine {
  private listeners = new Map<string, Set<EventHandler>>();
  private usersByKey = new Map<string, UserType>();
  private chats: MsgUserType[] = [];
  private roundSeeds = new Map<number, SeedDetailsType>();
  private allSettledBets: GameHistory[] = [];
  private history: number[] = [];
  private betLimits: GameBetLimit = { minBet: 1, maxBet: 1000 };
  private gameTicker: ReturnType<typeof setInterval> | null = null;
  private game = {
    state: "BET",
    phaseStartedAt: Date.now(),
    currentSecondNum: 1,
    currentNum: "1.00",
    crashTarget: 1,
    roundId: 1,
    roundBets: [] as BettedUserType[],
    previousHand: [] as BettedUserType[],
  };

  constructor() {
    this.startBetPhase();
  }

  on(event: GameEngineEvents, callback: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: GameEngineEvents, callback: EventHandler) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: GameEngineEvents, payload?: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(payload));
    }
  }

  private createUser(key: string): UserType {
    return {
      balance: 10000,
      userType: false,
      avatar: "/avatars/av-5.png",
      userId: key,
      currency: "PKR",
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
    } as UserType;
  }

  private getUser(key: string) {
    if (!this.usersByKey.has(key)) {
      this.usersByKey.set(key, this.createUser(key));
    }
    return this.usersByKey.get(key)!;
  }

  private calcMultiplier(seconds: number) {
    return Number(
      (
        1 +
        0.06 * seconds +
        Math.pow(0.06 * seconds, 2) -
        Math.pow(0.04 * seconds, 3) +
        Math.pow(0.04 * seconds, 4)
      ).toFixed(2),
    );
  }

  private sanitizeForBettedList(user: UserType, side: "f" | "s") {
    const sideData = user[side];
    return {
      __entryKey: `${user.userId}-${side}`,
      __bot: false,
      __plannedCashoutAt: 0,
      name: user.userName,
      betAmount: sideData.betAmount,
      cashOut: sideData.cashAmount || 0,
      cashouted: Boolean(sideData.cashouted),
      target: sideData.target || 0,
      img: user.avatar,
    };
  }

  private emitGameState() {
    this.emit("gameState", {
      currentNum: String(this.game.currentNum),
      currentSecondNum: Number(this.game.currentSecondNum),
      GameState: this.game.state,
      time: 0,
    });
  }

  private emitRoundData() {
    this.emit("bettedUserInfo", this.game.roundBets);
    this.emit("previousHand", this.game.previousHand);
    this.emit("history", this.history);
    this.emit("getBetLimits", this.betLimits);
  }

  private buildFakeRoundBets() {
    const fakeCount = randomInt(150, 220);
    const usedNames = new Set<string>();
    const fakeBets: BettedUserType[] = [];

    while (fakeBets.length < fakeCount) {
      const baseName = BOT_NAMES[randomInt(0, BOT_NAMES.length - 1)];
      const name = `${baseName}${randomInt(1, 9999)}`;
      if (usedNames.has(name)) continue;
      usedNames.add(name);
      const betAmount = randomFloat(10, 500, 2);
      const avatarIndex = randomInt(1, 72);
      fakeBets.push({
        __entryKey: `bot-${this.game.roundId}-${fakeBets.length + 1}`,
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

  private applyFakeCashouts(currentMultiplier: number) {
    let changed = false;
    this.game.roundBets.forEach((bet) => {
      if (!bet.__bot || bet.cashouted) return;
      const planned = bet.__plannedCashoutAt ?? 0;
      if (planned <= currentMultiplier) {
        bet.cashouted = true;
        bet.target = Number(currentMultiplier.toFixed(2));
        bet.cashOut = Number((bet.betAmount * bet.target).toFixed(2));
        changed = true;
      }
    });
    if (changed) {
      this.emit("bettedUserInfo", this.game.roundBets);
    }
  }

  private updateRoundBet(user: UserType, side: "f" | "s") {
    const payload = this.sanitizeForBettedList(user, side);
    const existingIndex = this.game.roundBets.findIndex(
      (item) => item.__entryKey === payload.__entryKey,
    );
    if (existingIndex >= 0) {
      this.game.roundBets[existingIndex] = payload;
    } else {
      this.game.roundBets.push(payload);
    }
  }

  private settleUserRound(user: UserType) {
    ["f", "s"].forEach((side) => {
      const bet = user[side as "f" | "s"];
      if (!bet.betted && !bet.cashouted) return;
      const cashoutAt = bet.cashouted ? Number(bet.target || 0) : 0;
      const myBet: GameHistory = {
        _id: Date.now() + Math.floor(Math.random() * 10000),
        name: user.userName,
        betAmount: Number(bet.betAmount || 0),
        cashoutAt,
        cashouted: Boolean(bet.cashouted),
        createdAt: new Date().toISOString(),
        flyAway: Number(this.game.crashTarget),
        flyDetailID: this.game.roundId,
      };
      user.myBets.unshift(myBet);
      this.allSettledBets.unshift(myBet);
      bet.betted = false;
      bet.cashouted = false;
      bet.cashAmount = 0;
    });
  }

  private createTopHistoryRecordFromBet(
    bet: BettedUserType,
    roundId: number,
    crashTarget: number,
  ) {
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

  private getTopHistoryData(limit: number) {
    if (this.allSettledBets.length > 0) {
      return this.allSettledBets
        .slice()
        .sort((a, b) => b.betAmount * b.cashoutAt - a.betAmount * a.cashoutAt)
        .slice(0, limit);
    }
    return Array.from({ length: limit }, (_, idx) => {
      const betAmount = randomFloat(20, 400, 2);
      const cashoutAt = randomFloat(1.1, 8, 2);
      return {
        _id: Date.now() + idx,
        name: `${BOT_NAMES[randomInt(0, BOT_NAMES.length - 1)]}${randomInt(
          10,
          999,
        )}`,
        betAmount,
        cashoutAt,
        cashouted: true,
        createdAt: new Date().toISOString(),
        flyAway: Number(randomFloat(cashoutAt, cashoutAt + 4, 2)),
        flyDetailID: Math.max(1, this.game.roundId - idx),
      };
    });
  }

  private endRound() {
    this.game.state = "GAMEEND";
    this.game.currentSecondNum = this.game.crashTarget;
    this.game.currentNum = this.game.crashTarget.toFixed(2);
    const serverSeed = Math.random().toString(36).slice(2, 18);
    this.roundSeeds.set(this.game.roundId, {
      createdAt: new Date().toISOString(),
      serverSeed,
      seedOfUsers: [
        { seed: "local-seed-a", userId: "guest-a" },
        { seed: "local-seed-b", userId: "guest-b" },
        { seed: "local-seed-c", userId: "guest-c" },
      ],
      flyDetailID: this.game.roundId,
      target: this.game.crashTarget,
    });
    this.history = [...this.history, this.game.crashTarget].slice(-40);
    this.game.roundBets.forEach((bet) => {
      if (bet.__bot && !bet.cashouted) {
        bet.cashOut = 0;
        bet.target = 0;
      }
      if (bet.cashouted) {
        this.allSettledBets.unshift(
          this.createTopHistoryRecordFromBet(
            bet,
            this.game.roundId,
            this.game.crashTarget,
          ),
        );
      }
    });
    this.game.previousHand = this.game.roundBets.map((item) => ({ ...item }));
    this.usersByKey.forEach((user) => {
      this.settleUserRound(user);
    });
    this.emitGameState();
    this.emitRoundData();
    const currentUser = this.getUser("me");
    this.emit("finishGame", currentUser);
    this.emit("myInfo", currentUser);
    this.emit("myBetState", currentUser);
    this.game.roundId += 1;
    setTimeout(() => this.startBetPhase(), GAME_END_MS);
  }

  private startBetPhase() {
    this.game.state = "BET";
    this.game.phaseStartedAt = Date.now();
    this.game.currentNum = "1.00";
    this.game.currentSecondNum = 1;
    this.game.roundBets = this.buildFakeRoundBets();
    this.emitGameState();
    this.emitRoundData();
    setTimeout(() => this.startPlayingPhase(), BET_PHASE_MS);
  }

  private startPlayingPhase() {
    this.game.state = "PLAYING";
    this.game.phaseStartedAt = Date.now();
    this.game.currentSecondNum = 1;
    const randomSeconds = 3 + Math.random() * 7;
    this.game.crashTarget = Number(
      this.calcMultiplier(randomSeconds).toFixed(2),
    );
    this.game.currentNum = "1.00";
    this.emitGameState();
    if (this.gameTicker) {
      clearInterval(this.gameTicker);
    }
    this.gameTicker = setInterval(() => {
      const elapsed = (Date.now() - this.game.phaseStartedAt) / 1000;
      const current = Number(this.calcMultiplier(elapsed).toFixed(2));
      this.game.currentSecondNum = current;
      this.game.currentNum = current.toFixed(2);
      this.applyFakeCashouts(current);
      this.emitGameState();
      if (current >= this.game.crashTarget) {
        clearInterval(this.gameTicker!);
        this.gameTicker = null;
        this.endRound();
      }
    }, TICK_MS);
  }

  connect(token?: string) {
    const userKey = token || "me";
    const user = this.getUser(userKey);
    this.emit("connect");
    this.emit("myInfo", user);
    this.emit("myBetState", user);
    this.emit("history", this.history);
    this.emit("gameState", {
      currentNum: String(this.game.currentNum),
      currentSecondNum: Number(this.game.currentSecondNum),
      GameState: this.game.state,
      time: 0,
    });
    this.emit("bettedUserInfo", this.game.roundBets);
    this.emit("previousHand", this.game.previousHand);
    this.emit("getBetLimits", this.betLimits);
  }

  playBet(data: {
    betAmount: number;
    target: number;
    type: "f" | "s";
    auto: boolean;
  }) {
    if (this.game.state !== "BET") {
      this.emit("error", { index: data.type, message: "Wait for next round" });
      return;
    }
    const user = this.getUser("me");
    const amount = Number(data.betAmount || 0);
    if (amount < this.betLimits.minBet || amount > this.betLimits.maxBet) {
      this.emit("error", {
        index: data.type,
        message: `Bet must be between ${this.betLimits.minBet} and ${this.betLimits.maxBet}`,
      });
      return;
    }
    if (user.balance < amount) {
      this.emit("recharge");
      this.emit("error", { index: data.type, message: "Insufficient balance" });
      return;
    }
    user.balance = Number((user.balance - amount).toFixed(2));
    user[data.type].betted = true;
    user[data.type].cashouted = false;
    user[data.type].cashAmount = 0;
    user[data.type].betAmount = amount;
    user[data.type].target = Number(data.target || 2);
    user[data.type].auto = Boolean(data.auto);
    this.updateRoundBet(user, data.type);
    this.emit("myInfo", user);
    this.emit("myBetState", user);
    this.emit("bettedUserInfo", this.game.roundBets);
    this.emit("success", "Bet placed");
  }

  cashOut(data: { type: "f" | "s"; endTarget: number }) {
    if (this.game.state !== "PLAYING") {
      return;
    }
    const user = this.getUser("me");
    const bet = user[data.type];
    if (!bet.betted || bet.cashouted) {
      return;
    }
    const elapsed = (Date.now() - this.game.phaseStartedAt) / 1000;
    const liveMultiplier = Number(this.calcMultiplier(elapsed).toFixed(2));
    const requested = Number(data.endTarget || liveMultiplier);
    const payoutMultiplier = Math.min(
      Math.max(1.01, requested),
      liveMultiplier,
    );
    bet.cashouted = true;
    bet.betted = false;
    bet.target = Number(payoutMultiplier.toFixed(2));
    bet.cashAmount = Number((bet.betAmount * payoutMultiplier).toFixed(2));
    user.balance = Number((user.balance + bet.cashAmount).toFixed(2));
    this.updateRoundBet(user, data.type);
    this.emit("myInfo", user);
    this.emit("myBetState", user);
    this.emit("bettedUserInfo", this.game.roundBets);
    this.emit("success", "Cashout successful");
  }

  sendMessage(payload: {
    msgType: string;
    msgContent: string;
    userInfo: UserType;
  }) {
    const message: MsgUserType = {
      _id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId: payload.userInfo.userId,
      userName: payload.userInfo.userName,
      avatar: payload.userInfo.avatar,
      message: payload.msgContent,
      img: payload.msgType === "gif" ? payload.msgContent : "",
      likes: 0,
      likesIDs: [],
      disLikes: 0,
      disLikesIDs: [],
    };
    this.chats.push(message);
    this.emit("message", this.chats.slice(-100));
  }

  updateUserInfo(userId: string, updateData: Partial<UserType>) {
    const user = this.usersByKey.get(userId);
    if (user) {
      Object.assign(user, updateData);
      this.emit("myInfo", user);
    }
  }

  getMyBets(userName: string) {
    const user = [...this.usersByKey.values()].find(
      (item) => item.userName === userName,
    );
    return user?.myBets || [];
  }

  getSeedOfRound(id: number): SeedDetailsType {
    return (
      this.roundSeeds.get(id) || {
        createdAt: new Date().toISOString(),
        serverSeed: "local-server-seed",
        seedOfUsers: [
          { seed: "local-seed-a", userId: "guest-a" },
          { seed: "local-seed-b", userId: "guest-b" },
        ],
        flyDetailID: id,
        target: 1,
      }
    );
  }

  getChatMessages() {
    return this.chats.slice(-100);
  }

  getTopHistory(limit: number) {
    return this.getTopHistoryData(limit);
  }
}
