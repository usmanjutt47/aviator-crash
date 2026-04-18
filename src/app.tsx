import React, { useEffect, useState } from "react";
import Header from "./components/header";
import BetsUsers from "./components/bet-users";
import Main from "./components/Main";
import AuthScreen from "./components/Auth";
import propeller from "./assets/images/propeller.png";

import Context from "./context";

const REQUESTS_KEY = "qt77-deposit-requests";
const AUTH_USERS_KEY = "qt77-auth-users";
const HOME_GAME_IMAGE_FILES = [
  "aviator.jpeg",
  "fly-x.jpeg",
  "casino-night.jpeg",
  "chiken-road.jpeg",
  "money-coming.jpeg",
  "superace.jpeg",
  "tower-block.jpeg",
  "jackpot.jpeg",
  "piggy-bank-plunder.jpeg",
];

type DepositRequest = {
  id: string;
  userName: string;
  plan: number;
  proof: string;
  status: "Pending" | "Paid" | "Declined";
  submittedAt: string;
  adminMessage?: string;
};

function loadStoredAccounts() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(AUTH_USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function loadDepositRequests(): DepositRequest[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(
      window.localStorage.getItem(REQUESTS_KEY) || "[]",
    ) as DepositRequest[];
  } catch {
    return [];
  }
}

function saveDepositRequests(requests: DepositRequest[]) {
  window.localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
}

function getGameTitleFromFileName(fileName: string) {
  const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");
  return nameWithoutExtension
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function App() {
  const {
    unityLoading,
    currentProgress,
    rechargeState,
    errorBackend,
    userInfo,
    updateUserInfo,
  } = React.useContext(Context);
  const [authenticated, setAuthenticated] = useState(false);
  const [enteredGame, setEnteredGame] = useState(false);
  const [pageMode, setPageMode] = useState<"home" | "deposit" | "withdraw">(
    "home",
  );
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofName, setProofName] = useState("");
  const [depositMessage, setDepositMessage] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMessage, setWithdrawMessage] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<
    "JazzCash" | "EasyPaisa"
  >("EasyPaisa");
  const [withdrawAccountName, setWithdrawAccountName] = useState("");
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState("");
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>(() =>
    loadDepositRequests(),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedUser = window.localStorage.getItem("qt77-game-user");
    if (!storedUser) return;
    try {
      const parsed = JSON.parse(storedUser) as Partial<typeof userInfo>;
      if (parsed?.userName) {
        const storedAccounts = loadStoredAccounts();
        const account = storedAccounts.find(
          (item: any) => item.userName === parsed.userName,
        );
        const syncedUser = account
          ? {
              ...parsed,
              balance: account.balance,
              currency: account.currency,
              avatar: account.avatar,
              email: account.email,
            }
          : parsed;
        window.localStorage.setItem(
          "qt77-game-user",
          JSON.stringify(syncedUser),
        );
        updateUserInfo(syncedUser);
        setAuthenticated(true);
      }
    } catch {
      // ignore invalid stored data
    }
  }, [updateUserInfo]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== "qt77-game-user" || !event.newValue) return;
      try {
        const updatedUser = JSON.parse(event.newValue) as Partial<
          typeof userInfo
        >;
        if (updatedUser?.userName) {
          updateUserInfo(updatedUser);
        }
      } catch {
        // ignore invalid storage event data
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [updateUserInfo]);

  const handleAuthenticate = (user: Partial<typeof userInfo>) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("qt77-game-user", JSON.stringify(user));
    }
    updateUserInfo(user);
    setAuthenticated(true);
    setEnteredGame(false);
    setPageMode("home");
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("qt77-game-user");
    }
    setAuthenticated(false);
    setEnteredGame(false);
    setPageMode("home");
  };

  const isAuthenticated = authenticated;

  const latestRequest = depositRequests
    .filter((req) => req.userName === (userInfo.userName || "Guest"))
    .sort(
      (a, b) =>
        Number(new Date(b.submittedAt)) - Number(new Date(a.submittedAt)),
    )[0];

  const depositPlans = [300, 500, 1000, 1500, 2000, 5000, 10000];

  const handleProofChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProofFile(file);
      setProofName(file.name);
    }
  };

  const handleDepositSubmit = () => {
    if (!selectedPlan) {
      setDepositMessage("Please select a deposit plan.");
      return;
    }
    if (!proofFile) {
      setDepositMessage("Please upload a screenshot proof.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const proofString = reader.result as string;
      const request: DepositRequest = {
        id: Date.now().toString(),
        userName: userInfo.userName || "Guest",
        plan: selectedPlan,
        proof: proofString,
        status: "Pending",
        submittedAt: new Date().toISOString(),
      };
      const updatedRequests = [...depositRequests, request];
      setDepositRequests(updatedRequests);
      saveDepositRequests(updatedRequests);
      setDepositMessage(
        "Deposit request submitted. Balance will be added within 1 hour.",
      );
      setProofFile(null);
      setProofName("");
    };
    reader.readAsDataURL(proofFile);
  };

  const handleWithdrawSubmit = () => {
    const amount = Number(withdrawAmount);
    if (!withdrawAccountName.trim()) {
      setWithdrawMessage("Please enter the account holder name.");
      return;
    }
    if (!withdrawAccountNumber.trim()) {
      setWithdrawMessage("Please enter the account number.");
      return;
    }
    if (!amount || amount <= 0) {
      setWithdrawMessage("Please enter a valid withdraw amount.");
      return;
    }
    if (amount > (userInfo.balance || 0)) {
      setWithdrawMessage(
        "Please enter an amount less than or equal to your account balance.",
      );
      return;
    }
    setWithdrawMessage(
      `Withdraw request for ${amount.toFixed(2)} via ${withdrawMethod} submitted for ${withdrawAccountName} (${withdrawAccountNumber}). Your account balance is unchanged.`,
    );
  };

  const handleWithdrawMax = () => {
    setWithdrawAmount(Number(userInfo.balance || 0).toFixed(2));
    setWithdrawMessage("");
  };

  if (!isAuthenticated) {
    return <AuthScreen onAuthenticate={handleAuthenticate} />;
  }

  if (pageMode === "deposit") {
    return (
      <div className="home-screen">
        <div className="home-shell">
          <div className="home-topbar">
            <div className="home-logo">QT77 Deposit</div>
            <div>
              <button
                className="home-logout-button"
                onClick={handleLogout}
                type="button"
              >
                Logout
              </button>
              <button
                className="home-back-button"
                onClick={() => setPageMode("home")}
                type="button"
              >
                Back
              </button>
            </div>
          </div>
          <div className="wallet-panel">
            <h3>Deposit Plans</h3>
            <div className="deposit-info-row">
              <div className="deposit-info-card">
                <div className="deposit-info-label">EasyPaisa</div>
                <div className="deposit-info-value">03096655156</div>
                <div className="deposit-info-subtitle">Tariq Masih</div>
              </div>
              <div className="deposit-info-card">
                <div className="deposit-info-label">Upload screenshot</div>
                <div className="deposit-info-value">Screenshot proof</div>
                <div className="deposit-info-subtitle">
                  After upload, select a plan and submit.
                </div>
              </div>
            </div>
            <div className="deposit-plans-grid">
              {depositPlans.map((plan) => (
                <button
                  key={plan}
                  type="button"
                  className={`deposit-plan ${selectedPlan === plan ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedPlan(plan);
                    setDepositMessage("");
                  }}
                >
                  {plan} PKR
                </button>
              ))}
            </div>
            <div className="deposit-upload">
              <label className="deposit-upload-label">
                Upload screenshot proof
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProofChange}
                />
              </label>
              {proofName && (
                <div className="deposit-file-name">{proofName}</div>
              )}
            </div>
            <button
              className="auth-button"
              type="button"
              onClick={handleDepositSubmit}
            >
              Add Balance
            </button>
            {depositMessage && (
              <div className="deposit-message">{depositMessage}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (pageMode === "withdraw") {
    return (
      <div className="home-screen">
        <div className="home-shell">
          <div className="home-topbar">
            <div className="home-logo">QT77 Withdraw</div>
            <div>
              <button
                className="home-logout-button"
                onClick={handleLogout}
                type="button"
              >
                Logout
              </button>
              <button
                className="home-back-button"
                onClick={() => setPageMode("home")}
                type="button"
              >
                Back
              </button>
            </div>
          </div>
          <div className="wallet-panel">
            <h3>Withdraw Request</h3>
            <div className="deposit-info-row">
              <div className="deposit-info-card">
                <div className="deposit-info-label">Balance</div>
                <div className="deposit-info-value">
                  {Number(userInfo.balance || 0).toFixed(2)}{" "}
                  {userInfo.currency || "PKR"}
                </div>
              </div>
            </div>
            <div className="withdraw-input-row">
              <input
                type="text"
                placeholder="Account holder name"
                value={withdrawAccountName}
                onChange={(event) => setWithdrawAccountName(event.target.value)}
              />
            </div>
            <div className="withdraw-input-row">
              <input
                type="text"
                placeholder="Account number"
                value={withdrawAccountNumber}
                onChange={(event) =>
                  setWithdrawAccountNumber(event.target.value)
                }
              />
            </div>
            <div className="withdraw-input-row">
              <input
                type="number"
                placeholder="Amount to withdraw"
                value={withdrawAmount}
                onChange={(event) => setWithdrawAmount(event.target.value)}
              />
              <button
                type="button"
                className="withdraw-max-button"
                onClick={handleWithdrawMax}
              >
                Max
              </button>
            </div>
            <div className="withdraw-methods">
              <label>
                <input
                  type="radio"
                  name="withdrawMethod"
                  value="JazzCash"
                  checked={withdrawMethod === "JazzCash"}
                  onChange={() => setWithdrawMethod("JazzCash")}
                />
                JazzCash
              </label>
              <label>
                <input
                  type="radio"
                  name="withdrawMethod"
                  value="EasyPaisa"
                  checked={withdrawMethod === "EasyPaisa"}
                  onChange={() => setWithdrawMethod("EasyPaisa")}
                />
                EasyPaisa
              </label>
            </div>
            <button
              className="auth-button"
              type="button"
              onClick={handleWithdrawSubmit}
            >
              Request Withdraw
            </button>
            {withdrawMessage && (
              <div className="deposit-message">{withdrawMessage}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const games = HOME_GAME_IMAGE_FILES.map((fileName) => {
    const isAviator = fileName.toLowerCase() === "aviator.jpeg";
    return {
      title: getGameTitleFromFileName(fileName),
      subtitle: isAviator ? "Play Now" : "Coming Soon",
      img: `/${fileName}`,
      enabled: isAviator,
    };
  });

  if (!enteredGame) {
    return (
      <div className="home-screen">
        <div className="home-shell">
          <div className="home-topbar">
            <div className="home-logo">QT77</div>
            <div className="home-top-right">
              <button
                className="home-logout-button"
                onClick={handleLogout}
                type="button"
              >
                Logout
              </button>
              <span className="home-top-label">How to play?</span>
              <span className="home-balance-label">
                {Number(userInfo.balance || 0).toFixed(2)}{" "}
                {userInfo.currency || "PKR"}
              </span>
            </div>
          </div>

          <div className="home-content">
            <div className="home-user-card">
              <img
                className="home-user-avatar"
                src={userInfo.avatar || "/avatars/av-5.png"}
                alt="User avatar"
              />
              <div className="home-user-info">
                <div className="home-user-name">
                  {userInfo.userName || "Guest"}
                </div>
                <div className="home-user-balance">
                  {Number(userInfo.balance || 0).toFixed(2)}{" "}
                  {userInfo.currency || "PKR"}
                </div>
              </div>
              <div className="home-action-buttons">
                <button
                  className="home-action-button deposit"
                  onClick={() => {
                    setPageMode("deposit");
                    setDepositMessage("");
                    setSelectedPlan(null);
                    setProofFile(null);
                    setProofName("");
                  }}
                >
                  Deposit
                </button>
                <button
                  className="home-action-button withdraw"
                  onClick={() => {
                    setPageMode("withdraw");
                    setWithdrawMessage("");
                    setWithdrawAmount("");
                    setWithdrawMethod("EasyPaisa");
                    setWithdrawAccountName("");
                    setWithdrawAccountNumber("");
                  }}
                >
                  Withdraw
                </button>
              </div>
            </div>
            {latestRequest && (
              <div className="deposit-status-banner">
                <strong>Deposit Request Status:</strong> {latestRequest.status}
                {latestRequest.adminMessage && (
                  <span> — {latestRequest.adminMessage}</span>
                )}
              </div>
            )}

            <div className="home-games-grid">
              {games.map((game) => (
                <div
                  key={game.img}
                  className={`game-card ${game.enabled ? "game-card-active" : "disabled"}`}
                  onClick={() => game.enabled && setEnteredGame(true)}
                >
                  <div
                    className="game-card-image"
                    style={{ backgroundImage: `url(${game.img})` }}
                  />
                  <div className="game-card-details">
                    <div className="game-card-title">{game.title}</div>
                    <div className="game-card-subtitle">{game.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      {errorBackend && (
        <div
          style={{
            position: "fixed",
            top: "10px",
            right: "10px",
            background: "#ff4444",
            color: "white",
            padding: "8px 16px",
            borderRadius: "4px",
            zIndex: 9999,
            fontSize: "12px",
          }}
        >
          ⚠️ Connection to server lost
        </div>
      )}

      {!unityLoading && (
        <div className="myloading">
          <div className="loading-container">
            <div className="rotation">
              <img alt="propeller" src={propeller}></img>
            </div>
            <div className="waiting">
              <div
                style={{ width: `${currentProgress * 1.111 + 0.01}%` }}
              ></div>
            </div>
            <p>{Number(currentProgress * 1.111 + 0.01).toFixed(2)}%</p>
          </div>
        </div>
      )}
      {rechargeState && (
        <div className="recharge">
          <div className="recharge-body">
            <div className="recharge-body-font">
              Insufficient balance amount
            </div>
            <a href="https://induswin.com/#/pages/recharge/recharge">
              Induswin.com
            </a>
          </div>
        </div>
      )}
      <Header />
      <div className="game-container">
        <BetsUsers />
        <Main />
      </div>
    </div>
  );
}

export default App;
