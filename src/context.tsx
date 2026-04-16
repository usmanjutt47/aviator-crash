/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { LocalGameEngine } from "./utils/localGameEngine";
import {
  UserType,
  BettedUserType,
  GameHistory,
  ContextType,
  ContextDataType,
  MsgUserType,
  GameBetLimit,
  UserStatusType,
  GameStatusType,
  SeedDetailsType,
  unityContext as sharedUnityContext,
  init_state as sharedInitState,
  init_userInfo,
} from "./utils/interfaces";

export interface PlayerType {
  auto: boolean;
  betted: boolean;
  cashouted: boolean;
  betAmount: number;
  cashAmount: number;
  target: number;
}

const Context = React.createContext<ContextType>(null!);
const engine = new LocalGameEngine();

export const callCashOut = (at: number, index: "f" | "s") => {
  engine.cashOut({ type: index, endTarget: at });
};

let fIncreaseAmount = 0;
let fDecreaseAmount = 0;
let sIncreaseAmount = 0;
let sDecreaseAmount = 0;

let newState: ContextDataType = sharedInitState;
let newBetState: UserStatusType = {
  fbetState: false,
  fbetted: false,
  sbetState: false,
  sbetted: false,
};

export const Provider = ({ children }: any) => {
  const token = new URLSearchParams(useLocation().search).get("cert");
  const [state, setState] = React.useState<ContextDataType>(sharedInitState);
  const [userInfo, setUserInfo] = React.useState<UserType>(init_userInfo);
  const [msgData, setMsgData] = React.useState<MsgUserType[]>([]);
  const [msgTab, setMsgTab] = React.useState<boolean>(false);
  const [msgReceived, setMsgReceived] = React.useState<boolean>(false);
  const [errorBackend, setErrorBackend] = React.useState<boolean>(false);
  const [globalUserInfo] = React.useState<UserType>(init_userInfo);
  const [fLoading, setFLoading] = React.useState<boolean>(false);
  const [sLoading, setSLoading] = React.useState<boolean>(false);
  const hasConnectedRef = React.useRef(false);
  const disconnectTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  newState = state;
  const [unity, setUnity] = React.useState({
    unityState: true,
    unityLoading: false,
    currentProgress: 0,
  });
  const [gameState, setGameState] = React.useState({
    currentNum: "0",
    currentSecondNum: 0,
    GameState: "",
    time: 0,
  });

  const [bettedUsers, setBettedUsers] = React.useState<BettedUserType[]>([]);
  const update = (attrs: Partial<ContextDataType>) => {
    setState({ ...state, ...attrs });
  };
  const [previousHand, setPreviousHand] = React.useState<BettedUserType[]>([]);
  const [history, setHistory] = React.useState<number[]>([]);
  const [userBetState, setUserBetState] = React.useState<UserStatusType>({
    fbetState: false,
    fbetted: false,
    sbetState: false,
    sbetted: false,
  });
  newBetState = userBetState;
  const [rechargeState, setRechargeState] = React.useState(false);
  const [currentTarget, setCurrentTarget] = React.useState(0);
  const updateUserBetState = (attrs: Partial<UserStatusType>) => {
    setUserBetState({ ...userBetState, ...attrs });
  };

  const [betLimit, setBetLimit] = React.useState<GameBetLimit>({
    maxBet: 1000,
    minBet: 1,
  });
  React.useEffect(function () {
    // Unity loading event handlers
    sharedUnityContext.on("loaded", () => {
      console.log("✅ Unity WebGL loaded successfully");
      setUnity({
        currentProgress: 100,
        unityLoading: true,
        unityState: true,
      });
    });

    sharedUnityContext.on("error", (error) => {
      console.error("🔴 Unity WebGL error:", error);
      setUnity({
        currentProgress: 0,
        unityLoading: false,
        unityState: false,
      });
    });

    sharedUnityContext.on("GameController", function (message) {
      console.log("🎮 Unity message:", message);
      if (message === "Ready") {
        setUnity({
          currentProgress: 100,
          unityLoading: true,
          unityState: true,
        });
      }
    });

    sharedUnityContext.on("progress", (progression) => {
      const currentProgress = progression * 100;
      console.log(`📊 Unity loading progress: ${currentProgress.toFixed(1)}%`);
      if (progression === 1) {
        setUnity({ currentProgress, unityLoading: true, unityState: true });
      } else {
        setUnity({ currentProgress, unityLoading: false, unityState: true });
      }
    });

    return () => sharedUnityContext.removeAllEventListeners();
  }, []);

  React.useEffect(() => {
    const clearDisconnectTimer = () => {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
    };

    const scheduleDisconnectAlert = () => {
      if (!hasConnectedRef.current || disconnectTimerRef.current) {
        return;
      }
      disconnectTimerRef.current = setTimeout(() => {
        setErrorBackend(true);
        disconnectTimerRef.current = null;
      }, 2000);
    };

    const handleConnect = () => {
      console.log("✅ Local game engine ready");
      hasConnectedRef.current = true;
      clearDisconnectTimer();
      setErrorBackend(false);
    };

    const handleBettedUserInfo = (bettedUsers: BettedUserType[]) => {
      setBettedUsers(bettedUsers);
    };

    const handleMyBetState = (user: UserType) => {
      setUserBetState({
        fbetState: false,
        fbetted: user.f.betted,
        sbetState: false,
        sbetted: user.s.betted,
      });
    };

    const handleMyInfo = (user: UserType) => {
      setUserInfo(user);
      update({ userInfo: user });
    };

    const handleHistory = (historyData: number[]) => {
      setHistory(historyData);
    };

    const handleGameState = (gameStateData: GameStatusType) => {
      setGameState(gameStateData);
    };

    const handlePreviousHand = (previousHandData: BettedUserType[]) => {
      setPreviousHand(previousHandData);
    };

    const handleFinishGame = (user: UserType) => {
      let attrs = { ...newState };
      let fauto = attrs.userInfo.f.auto;
      let sauto = attrs.userInfo.s.auto;
      let fbetAmount = attrs.userInfo.f.betAmount;
      let sbetAmount = attrs.userInfo.s.betAmount;
      let betStatus = { ...newBetState };
      attrs.userInfo = user;
      attrs.userInfo.f.betAmount = fbetAmount;
      attrs.userInfo.s.betAmount = sbetAmount;
      attrs.userInfo.f.auto = fauto;
      attrs.userInfo.s.auto = sauto;
      if (!user.f.betted) {
        betStatus.fbetted = false;
        if (attrs.userInfo.f.auto) {
          if (user.f.cashouted) {
            fIncreaseAmount += user.f.cashAmount;
            if (attrs.finState && attrs.fincrease - fIncreaseAmount <= 0) {
              attrs.userInfo.f.auto = false;
              betStatus.fbetState = false;
              fIncreaseAmount = 0;
            } else if (
              attrs.fsingle &&
              attrs.fsingleAmount <= user.f.cashAmount
            ) {
              attrs.userInfo.f.auto = false;
              betStatus.fbetState = false;
            } else {
              attrs.userInfo.f.auto = true;
              betStatus.fbetState = true;
            }
          } else {
            fDecreaseAmount += user.f.betAmount;
            if (attrs.fdeState && attrs.fdecrease - fDecreaseAmount <= 0) {
              attrs.userInfo.f.auto = false;
              betStatus.fbetState = false;
              fDecreaseAmount = 0;
            } else {
              attrs.userInfo.f.auto = true;
              betStatus.fbetState = true;
            }
          }
        }
      }
      if (!user.s.betted) {
        betStatus.sbetted = false;
        if (user.s.auto) {
          if (user.s.cashouted) {
            sIncreaseAmount += user.s.cashAmount;
            if (attrs.sinState && attrs.sincrease - sIncreaseAmount <= 0) {
              attrs.userInfo.s.auto = false;
              betStatus.sbetState = false;
              sIncreaseAmount = 0;
            } else if (
              attrs.ssingle &&
              attrs.ssingleAmount <= user.s.cashAmount
            ) {
              attrs.userInfo.s.auto = false;
              betStatus.sbetState = false;
            } else {
              attrs.userInfo.s.auto = true;
              betStatus.sbetState = true;
            }
          } else {
            sDecreaseAmount += user.s.betAmount;
            if (attrs.sdeState && attrs.sdecrease - sDecreaseAmount <= 0) {
              attrs.userInfo.s.auto = false;
              betStatus.sbetState = false;
              sDecreaseAmount = 0;
            } else {
              attrs.userInfo.s.auto = true;
              betStatus.sbetState = true;
            }
          }
        }
      }
      update(attrs);
      setUserBetState(betStatus);
    };

    const handleBetLimits = (betAmounts: { max: number; min: number }) => {
      setBetLimit({ maxBet: betAmounts.max, minBet: betAmounts.min });
    };

    const handleRecharge = () => {
      setRechargeState(true);
    };

    const handleError = (data: any) => {
      setUserBetState((prev) => ({
        ...prev,
        [`${data.index}betted`]: false,
      }));
      toast.error(data.message);
    };

    const handleSuccess = (data: any) => {
      toast.success(data);
    };

    const handleMessages = (messages: MsgUserType[]) => {
      setMsgData(messages);
      setMsgReceived((prev) => !prev);
    };

    engine.on("connect", handleConnect);
    engine.on("bettedUserInfo", handleBettedUserInfo);
    engine.on("myBetState", handleMyBetState);
    engine.on("myInfo", handleMyInfo);
    engine.on("history", handleHistory);
    engine.on("gameState", handleGameState);
    engine.on("previousHand", handlePreviousHand);
    engine.on("finishGame", handleFinishGame);
    engine.on("getBetLimits", handleBetLimits);
    engine.on("recharge", handleRecharge);
    engine.on("error", handleError);
    engine.on("success", handleSuccess);
    engine.on("message", handleMessages);

    engine.connect(token || undefined);

    return () => {
      clearDisconnectTimer();
      engine.off("connect", handleConnect);
      engine.off("bettedUserInfo", handleBettedUserInfo);
      engine.off("myBetState", handleMyBetState);
      engine.off("myInfo", handleMyInfo);
      engine.off("history", handleHistory);
      engine.off("gameState", handleGameState);
      engine.off("previousHand", handlePreviousHand);
      engine.off("finishGame", handleFinishGame);
      engine.off("getBetLimits", handleBetLimits);
      engine.off("recharge", handleRecharge);
      engine.off("error", handleError);
      engine.off("success", handleSuccess);
      engine.off("message", handleMessages);
    };
  }, [token]);

  React.useEffect(() => {
    let attrs = state;
    let betStatus = userBetState;
    if (gameState.GameState === "BET") {
      if (betStatus.fbetState) {
        if (state.userInfo.f.auto) {
          if (state.fautoCound > 0) attrs.fautoCound -= 1;
          else {
            attrs.userInfo.f.auto = false;
            betStatus.fbetState = false;
            return;
          }
        }
        const data: {
          betAmount: number;
          target: number;
          type: "f" | "s";
          auto: boolean;
        } = {
          betAmount: state.userInfo.f.betAmount,
          target: state.userInfo.f.target,
          type: "f",
          auto: state.userInfo.f.auto,
        };
        if (attrs.userInfo.balance - state.userInfo.f.betAmount < 0) {
          toast.error("Your balance is not enough");
          betStatus.fbetState = false;
          betStatus.fbetted = false;
          return;
        }
        attrs.userInfo.balance -= state.userInfo.f.betAmount;
        engine.playBet(data);
        betStatus.fbetState = false;
        betStatus.fbetted = true;
        // update(attrs);
        setUserBetState(betStatus);
      }
      if (betStatus.sbetState) {
        if (state.userInfo.s.auto) {
          if (state.sautoCound > 0) attrs.sautoCound -= 1;
          else {
            attrs.userInfo.s.auto = false;
            betStatus.sbetState = false;
            return;
          }
        }
        const data: {
          betAmount: number;
          target: number;
          type: "f" | "s";
          auto: boolean;
        } = {
          betAmount: state.userInfo.s.betAmount,
          target: state.userInfo.s.target,
          type: "s",
          auto: state.userInfo.s.auto,
        };
        if (attrs.userInfo.balance - state.userInfo.s.betAmount < 0) {
          toast.error("Your balance is not enough");
          betStatus.sbetState = false;
          betStatus.sbetted = false;
          return;
        }
        attrs.userInfo.balance -= state.userInfo.s.betAmount;
        engine.playBet(data);
        betStatus.sbetState = false;
        betStatus.sbetted = true;
        // update(attrs);
        setUserBetState(betStatus);
      }
    }
  }, [gameState.GameState, userBetState.fbetState, userBetState.sbetState]);

  const getMyBets = async () => {
    const bets = engine.getMyBets(state.userInfo.userName);
    update({ myBets: bets });
  };

  useEffect(() => {
    if (gameState.GameState === "BET") getMyBets();
  }, [gameState.GameState]);

  const updateUserInfo = (attrs: Partial<UserType>) => {
    setUserInfo((prev) => {
      const updated = { ...prev, ...attrs };
      if (updated.userId) {
        engine.updateUserInfo(updated.userId, updated);
      }
      return updated;
    });
  };
  const handleGetSeed = () => {
    const seedValue = Math.random().toString(36).slice(2, 12);
    update({ seed: seedValue });
  };
  const handleGetSeedOfRound = async (id: number): Promise<SeedDetailsType> => {
    return engine.getSeedOfRound(id);
  };
  const handlePlaceBet = () => {
    // This app now uses the local engine for bets.
  };
  const toggleMsgTab = () => setMsgTab((prev) => !prev);
  const handleChangeUserSeed = (seed: string) => {
    update({ seed });
    updateUserInfo({ ...userInfo, token: seed, Session_Token: seed });
  };

  return (
    <Context.Provider
      value={{
        ...state,
        ...gameState,
        ...userBetState,
        ...betLimit,
        userInfo,
        state, // add state for consumers expecting state
        msgData,
        msgTab,
        msgReceived,
        setMsgReceived,
        errorBackend,
        unityState: unity.unityState,
        unityLoading: unity.unityLoading,
        currentProgress: unity.currentProgress,
        globalUserInfo,
        bettedUsers,
        previousHand,
        history,
        rechargeState,
        myUnityContext: sharedUnityContext,
        currentTarget,
        fLoading,
        setFLoading,
        sLoading,
        setSLoading,
        setCurrentTarget,
        update: (attrs) => setState((prev) => ({ ...prev, ...attrs })),
        updateUserInfo,
        getMyBets,
        updateUserBetState,
        setMsgData,
        sendMessage: (
          msgType: string,
          msgContent: string,
          userInfo: UserType,
        ) => {
          engine.sendMessage({ msgType, msgContent, userInfo });
        },
        handleGetSeed,
        handleGetSeedOfRound,
        handlePlaceBet,
        toggleMsgTab,
        handleChangeUserSeed,
      }}
    >
      {children}
    </Context.Provider>
  );
};

export default Context;
