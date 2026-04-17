import React, { useEffect, useState } from "react";
import Header from "./components/header";
import BetsUsers from "./components/bet-users";
import Main from "./components/Main";
import AuthScreen from "./components/Auth";
import propeller from "./assets/images/propeller.png";

import Context from "./context";

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedUser = window.localStorage.getItem("qt77-game-user");
    if (!storedUser) return;
    try {
      const parsed = JSON.parse(storedUser) as Partial<typeof userInfo>;
      if (parsed?.userName) {
        updateUserInfo(parsed);
        setAuthenticated(true);
      }
    } catch {
      // ignore invalid stored data
    }
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

  const isAuthenticated = authenticated;

  const depositPlans = [
    50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1400, 1600,
    1800,
  ];

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
    setDepositMessage(
      "Deposit request submitted. Balance will be added within 1 hour.",
    );
  };

  const handleWithdrawSubmit = () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      setWithdrawMessage("Please enter a valid withdraw amount.");
      return;
    }
    setWithdrawMessage(`Withdraw request for ${amount.toFixed(2)} submitted.`);
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
            <button
              className="home-back-button"
              onClick={() => setPageMode("home")}
            >
              Back
            </button>
          </div>
          <div className="wallet-panel">
            <h3>Deposit Plans</h3>
            <div className="deposit-info-row">
              <div className="deposit-info-card">
                <div className="deposit-info-label">JazzCash / EasyPaisa</div>
                <div className="deposit-info-value">03043061019</div>
                <div className="deposit-info-subtitle">
                  Muhammad Usman Tariq
                </div>
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
            <button
              className="home-back-button"
              onClick={() => setPageMode("home")}
            >
              Back
            </button>
          </div>
          <div className="wallet-panel">
            <h3>Withdraw Request</h3>
            <div className="deposit-upload">
              <input
                type="number"
                placeholder="Amount to withdraw"
                value={withdrawAmount}
                onChange={(event) => setWithdrawAmount(event.target.value)}
              />
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

  const games = [
    {
      title: "QT77",
      subtitle: "Play Now",
      img: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
      enabled: true,
    },
    {
      title: "Money Coming",
      subtitle: "Coming Soon",
      img: "https://images.unsplash.com/photo-1512446733611-9099a758e54e?auto=format&fit=crop&w=800&q=80",
      enabled: false,
    },
    {
      title: "Fortune Gems 2",
      subtitle: "Coming Soon",
      img: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80",
      enabled: false,
    },
    {
      title: "Treasure Bowl",
      subtitle: "Coming Soon",
      img: "https://images.unsplash.com/photo-1483721310020-03333e577078?auto=format&fit=crop&w=800&q=80",
      enabled: false,
    },
  ];

  if (!enteredGame) {
    return (
      <div className="home-screen">
        <div className="home-shell">
          <div className="home-topbar">
            <div className="home-logo">QT77</div>
            <div className="home-top-right">
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
                  }}
                >
                  Withdraw
                </button>
              </div>
            </div>

            <div className="home-games-grid">
              {games.map((game) => (
                <div
                  key={game.title}
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
