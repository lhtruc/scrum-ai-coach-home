import "./Navbar.css";
import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate
} from "react-router-dom";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [token, setToken] = useState(null);
  const [profile, setProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user_profile") || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const syncAuth = () => {
      setToken(localStorage.getItem("jwt_token"));

      try {
        setProfile(JSON.parse(localStorage.getItem("user_profile") || "null"));
      } catch {
        setProfile(null);
      }
    };

    syncAuth();

    window.addEventListener("storage", syncAuth);
    window.addEventListener("auth-changed", syncAuth);

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("auth-changed", syncAuth);
    };
  }, []);

  const hiddenPaths = ["/welcome", "/login", "/register"];

  if (hiddenPaths.includes(location.pathname)) {
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("user_profile");

    window.dispatchEvent(new Event("auth-changed"));

    setToken(null);
    setProfile(null);

    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <span className="logo-icon">⚡</span>

          <Link
            to="/"
            style={{
              color: "inherit",
              textDecoration: "none",
            }}
          >
            AI Coach
          </Link>
        </div>

        <div className="nav-profile">
          {token ? (
            <>
              <Link
                to="/skill-profile"
                style={{
                  textDecoration: "none",
                  marginRight: "12px",
                  fontWeight: "600",
                  color: "#4f46e5",
                }}
              >
                My Profile
              </Link>

              <Link
                to="/settings"
                style={{
                  textDecoration: "none",
                  marginRight: "12px",
                  fontWeight: "600",
                  color: "#4f46e5",
                }}
              >
                Settings
              </Link>

              <span className="user-name">
                {profile?.display_name || profile?.email || "You"}
              </span>

              {profile?.role && (
                <span style={{ marginLeft: "4px", color: "#666" }}>
                  ({profile.role})
                </span>
              )}

              <button
                className="btn"
                onClick={handleLogout}
                style={{ marginLeft: "8px" }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="btn"
              style={{ textDecoration: "none" }}
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}