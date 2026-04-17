import React from "react";

const ADMIN_EMAIL = "qt77@gmail.com";
const ADMIN_PASSWORD = "qt77!@#$%";
const STORAGE_KEY = "qt77-auth-users";

interface StoredUser {
  userName: string;
  password: string;
  avatar: string;
  balance: number;
  currency: string;
  canBet?: boolean;
}

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

function Admin() {
  const [email, setEmail] = React.useState(ADMIN_EMAIL);
  const [password, setPassword] = React.useState(ADMIN_PASSWORD);
  const [error, setError] = React.useState<string>("");
  const [authenticated, setAuthenticated] = React.useState(false);
  const [accounts, setAccounts] = React.useState<StoredUser[]>(() =>
    loadStoredAccounts(),
  );
  const [selectedUser, setSelectedUser] = React.useState<StoredUser | null>(
    null,
  );
  const [editedBalance, setEditedBalance] = React.useState<string>("");
  const [isAllowed, setIsAllowed] = React.useState<boolean>(true);
  const [detailsError, setDetailsError] = React.useState<string>("");
  const [detailsSaved, setDetailsSaved] = React.useState<string>("");

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
      setError("Incorrect admin email.");
      return;
    }

    if (password !== ADMIN_PASSWORD) {
      setError("Incorrect password.");
      return;
    }

    setAuthenticated(true);
  };

  const [view, setView] = React.useState<"dashboard" | "users">("dashboard");

  React.useEffect(() => {
    if (authenticated) {
      setAccounts(loadStoredAccounts());
    }
  }, [authenticated]);

  const totalBalance = accounts.reduce(
    (sum, account) => sum + account.balance,
    0,
  );
  const averageBalance = accounts.length ? totalBalance / accounts.length : 0;

  const handleLogout = () => {
    setAuthenticated(false);
    setEmail("");
    setPassword("");
    setError("");
    setView("dashboard");
    setSelectedUser(null);
    setDetailsError("");
    setDetailsSaved("");
  };

  const openUserDetails = (user: StoredUser) => {
    setSelectedUser(user);
    setEditedBalance(user.balance.toFixed(2));
    setIsAllowed(user.canBet ?? true);
    setDetailsError("");
    setDetailsSaved("");
  };

  const closeUserDetails = () => {
    setSelectedUser(null);
    setDetailsError("");
    setDetailsSaved("");
  };

  const saveUserDetails = () => {
    if (!selectedUser) return;
    const parsedBalance = Number(editedBalance);
    if (Number.isNaN(parsedBalance) || parsedBalance < 0) {
      setDetailsError("Please enter a valid non-negative balance.");
      return;
    }

    const updatedUser: StoredUser = {
      ...selectedUser,
      balance: parseFloat(parsedBalance.toFixed(2)),
      canBet: isAllowed,
    };

    const updatedAccounts = accounts.map((user) =>
      user.userName === selectedUser.userName ? updatedUser : user,
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAccounts));
    setAccounts(updatedAccounts);
    setSelectedUser(updatedUser);
    setDetailsError("");
    setDetailsSaved("User details saved successfully.");
  };

  return (
    <div className="admin-screen">
      {!authenticated ? (
        <div className="admin-card">
          <h2>Admin Login</h2>
          <p className="admin-description">
            Enter admin credentials to access the dashboard.
          </p>
          <form onSubmit={handleLogin}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter admin password"
              />
            </label>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="auth-button">
              Login
            </button>
          </form>
        </div>
      ) : (
        <div className="admin-layout">
          <aside className="admin-sidebar">
            <div className="admin-brand">
              <div className="admin-brand-mark">QT</div>
              <div>
                <div className="admin-brand-title">QT77 Admin</div>
                <div className="admin-brand-subtitle">Control Panel</div>
              </div>
            </div>
            <nav className="admin-nav">
              <button
                className={`admin-nav-item ${view === "dashboard" ? "active" : ""}`}
                onClick={() => setView("dashboard")}
                type="button"
              >
                Dashboard
              </button>
              <button
                className={`admin-nav-item ${view === "users" ? "active" : ""}`}
                onClick={() => setView("users")}
                type="button"
              >
                Users
              </button>
            </nav>
            <div className="admin-sidebar-footer">
              <div>Logged in as</div>
              <strong>qt77@gmail.com</strong>
            </div>
          </aside>

          <main className="admin-main">
            <header className="admin-main-header">
              <div>
                <h2>
                  {view === "dashboard" ? "Dashboard" : "User Management"}
                </h2>
                <p className="admin-description">
                  {view === "dashboard"
                    ? "Overview of the application and registered users."
                    : "All registered users currently stored in the app."}
                </p>
              </div>
              <button className="admin-logout" onClick={handleLogout}>
                Logout
              </button>
            </header>

            {view === "dashboard" ? (
              <>
                <div className="admin-cards">
                  <div className="admin-card-block">
                    <div className="admin-card-title">Total Users</div>
                    <div className="admin-card-value">{accounts.length}</div>
                  </div>
                  <div className="admin-card-block">
                    <div className="admin-card-title">Total Balance</div>
                    <div className="admin-card-value">
                      {totalBalance.toFixed(2)}
                    </div>
                  </div>
                  <div className="admin-card-block">
                    <div className="admin-card-title">Average Balance</div>
                    <div className="admin-card-value">
                      {averageBalance.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Balance</th>
                        <th>Currency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.length === 0 ? (
                        <tr>
                          <td colSpan={3}>No users found.</td>
                        </tr>
                      ) : (
                        accounts.map((user) => (
                          <tr
                            key={user.userName}
                            className="admin-table-row"
                            onClick={() => openUserDetails(user)}
                          >
                            <td>{user.userName}</td>
                            <td>{user.balance.toFixed(2)}</td>
                            <td>{user.currency}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Balance</th>
                        <th>Currency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.length === 0 ? (
                        <tr>
                          <td colSpan={3}>No users found.</td>
                        </tr>
                      ) : (
                        accounts.map((user) => (
                          <tr
                            key={user.userName}
                            className="admin-table-row"
                            onClick={() => openUserDetails(user)}
                          >
                            <td>{user.userName}</td>
                            <td>{user.balance.toFixed(2)}</td>
                            <td>{user.currency}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {selectedUser && (
                  <div className="user-detail-panel">
                    <div className="user-detail-header">
                      <div>
                        <h3>{selectedUser.userName}</h3>
                        <p>User details and permissions</p>
                      </div>
                      <button
                        className="user-detail-close"
                        onClick={closeUserDetails}
                      >
                        Close
                      </button>
                    </div>
                    <div className="user-detail-grid">
                      <div className="detail-field">
                        <label>Username</label>
                        <div>{selectedUser.userName}</div>
                      </div>
                      <div className="detail-field">
                        <label>Currency</label>
                        <div>{selectedUser.currency}</div>
                      </div>
                      <div className="detail-field">
                        <label>Balance</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editedBalance}
                          onChange={(event) =>
                            setEditedBalance(event.target.value)
                          }
                        />
                      </div>
                      <div className="detail-field detail-permission">
                        <label>Allow Betting</label>
                        <button
                          type="button"
                          className={`permission-toggle ${isAllowed ? "enabled" : "disabled"}`}
                          onClick={() => setIsAllowed((prev) => !prev)}
                        >
                          {isAllowed ? "Enabled" : "Disabled"}
                        </button>
                      </div>
                    </div>
                    {detailsError && (
                      <div className="auth-error">{detailsError}</div>
                    )}
                    {detailsSaved && (
                      <div className="save-success">{detailsSaved}</div>
                    )}
                    <div className="user-detail-actions">
                      <button
                        className="auth-button"
                        type="button"
                        onClick={saveUserDetails}
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

export default Admin;
