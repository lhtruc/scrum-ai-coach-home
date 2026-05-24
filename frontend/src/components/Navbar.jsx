import "./Navbar.css";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

const HIDDEN_PATHS = ["/welcome", "/login", "/register"];

const getProfileFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem("user_profile") || "null");
  } catch {
    return null;
  }
};

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [token, setToken] = useState(
    localStorage.getItem("access_token") || localStorage.getItem("jwt_token")
  );
  const [profile, setProfile] = useState(getProfileFromStorage);

  useEffect(() => {
    const syncAuthState = (e) => {
      if (e?.type === "auth-changed" && e.detail) {
        setProfile(e.detail);
      } else {
        setProfile(getProfileFromStorage());
      }

      setToken(
        localStorage.getItem("access_token") || localStorage.getItem("jwt_token")
      );
    };

    window.addEventListener("storage", syncAuthState);
    window.addEventListener("auth-changed", syncAuthState);

    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener("auth-changed", syncAuthState);
    };
  }, []);

  if (HIDDEN_PATHS.includes(location.pathname)) return null;

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("user_profile");

    window.dispatchEvent(new Event("storage"));

    setToken(null);
    setProfile(null);

    navigate("/login", { replace: true });
  };

  const displayName =
    profile?.display_name || profile?.email?.split("@")[0] || "You";

  const userRole = profile?.role || "";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="navbar-wrapper">
      <header className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-brand">
            <span className="logo-icon">AI</span>
            <span className="logo-text">Coach</span>
          </Link>

          <div className="nav-right">
            {token && (
              <nav className="nav-links" aria-label="Primary navigation">
                <NavLink to="/dashboard" className="nav-link">
                  Dashboard
                </NavLink>

                <NavLink to="/progress" className="nav-link">
                  Progress
                </NavLink>

                <NavLink to="/skill-profile" className="nav-link">
                  My Profile
                </NavLink>

                <NavLink to="/feedback" className="nav-link">
                  Feedback
                </NavLink>

                <NavLink to="/settings" className="nav-link">
                  Settings
                </NavLink>
              </nav>
            )}

            <div className="nav-profile">
              {token ? (
                <>
                  <div className="user-meta">
                    <span className="user-name" title={displayName}>
                      {displayName}
                    </span>

                    {userRole && <span className="user-role">{userRole}</span>}
                  </div>

                  <div className="avatar">{avatarInitial}</div>

                  <div className="nav-divider"></div>

                  <button className="nav-btn btn-logout" onClick={handleLogout}>
                    Logout
                  </button>
                </>
              ) : (
                <Link to="/login" className="nav-btn btn-primary">
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}