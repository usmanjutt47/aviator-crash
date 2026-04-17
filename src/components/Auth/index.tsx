import React from "react";
import type { UserType } from "../../utils/interfaces";

interface AuthScreenProps {
  onAuthenticate: (user: Partial<UserType>) => void;
}

type AuthMode = "login" | "signup";

interface StoredUser {
  userName: string;
  password: string;
  avatar: string;
  balance: number;
  currency: string;
}

const STORAGE_KEY = "qt77-auth-users";
const GAME_USER_KEY = "qt77-game-user";

function loadStoredAccounts(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) || "[]",
    ) as StoredUser[];
  } catch {
    return [];
  }
}

function saveStoredAccounts(accounts: StoredUser[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

function AuthScreen({ onAuthenticate }: AuthScreenProps) {
  const [mode, setMode] = React.useState<AuthMode>("login");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState<string>("");

  const accounts = React.useMemo(() => loadStoredAccounts(), []);

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setError("");
  };

  const persistLogin = (user: StoredUser) => {
    const authUser = {
      userId: "me",
      userName: user.userName,
      avatar: user.avatar,
      balance: user.balance,
      currency: user.currency,
      token: "me",
      Session_Token: "me",
      ipAddress: "127.0.0.1",
      platform: "web",
      userType: false,
      myBets: [],
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
    } as Partial<UserType>;

    window.localStorage.setItem(GAME_USER_KEY, JSON.stringify(authUser));
    onAuthenticate(authUser);
  };

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const trimmedName = username.trim();
    if (!trimmedName) {
      setError("Username is required.");
      return;
    }
    const account = accounts.find(
      (item) => item.userName.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (!account) {
      setError("Account not found. Please sign up first.");
      return;
    }
    if (account.password !== password) {
      setError("Incorrect password.");
      return;
    }
    persistLogin(account);
  };

  const handleSignup = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const trimmedName = username.trim();
    if (trimmedName.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const duplicate = accounts.some(
      (item) => item.userName.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (duplicate) {
      setError("This username is already taken.");
      return;
    }

    const newUser: StoredUser = {
      userName: trimmedName,
      password,
      avatar: "/avatars/av-5.png",
      balance: 0,
      currency: "PKR",
    };
    saveStoredAccounts([...accounts, newUser]);
    persistLogin(newUser);
  };

  const switchMode = () => {
    setMode((prev) => (prev === "login" ? "signup" : "login"));
    resetForm();
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h2>{mode === "login" ? "Login to Play" : "Create Account"}</h2>
        <p className="auth-description">
          {mode === "login"
            ? "Enter your username and password to continue."
            : "Choose a username and password to start playing."}
        </p>
        <form onSubmit={mode === "login" ? handleLogin : handleSignup}>
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
            />
          </label>
          {mode === "signup" && (
            <label>
              Confirm Password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
              />
            </label>
          )}
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="auth-button">
            {mode === "login" ? "Login" : "Sign Up"}
          </button>
        </form>
        <div className="auth-switch">
          {mode === "login" ? (
            <>
              New here? <span onClick={switchMode}>Create an account</span>
            </>
          ) : (
            <>
              Already have an account? <span onClick={switchMode}>Login</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthScreen;
