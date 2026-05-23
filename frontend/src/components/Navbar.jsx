import './Navbar.css';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [token, setToken] = useState(localStorage.getItem('jwt_token'));
  const [profile, setProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user_profile') || 'null');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const syncAuthState = () => {
      setToken(localStorage.getItem('jwt_token'));

      try {
        setProfile(JSON.parse(localStorage.getItem('user_profile') || 'null'));
      } catch {
        setProfile(null);
      }
    };

    syncAuthState();

    window.addEventListener('storage', syncAuthState);
    window.addEventListener('auth-changed', syncAuthState);

    return () => {
      window.removeEventListener('storage', syncAuthState);
      window.removeEventListener('auth-changed', syncAuthState);
    };
  }, []);

  const hiddenPaths = ['/welcome', '/login', '/register'];

  if (hiddenPaths.includes(location.pathname)) {
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_profile');

    window.dispatchEvent(new Event('storage'));

    setToken(null);
    setProfile(null);

    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link
          to="/"
          className="nav-brand"
          style={{ color: 'inherit', textDecoration: 'none' }}
        >
          <span className="logo-icon">⚡</span>
          AI Coach
        </Link>

        <div className="nav-profile">
          {token ? (
            <>
              <Link
                to="/skill-profile"
                className="btn"
                style={{ textDecoration: 'none', marginRight: '8px' }}
              >
                My Profile
              </Link>

              <Link
                to="/dashboard"
                style={{
                  textDecoration: 'none',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  fontWeight: 700,
                  marginRight: '8px',
                }}
              >
                Dashboard
              </Link>

              <Link
                to="/progress"
                style={{
                  textDecoration: 'none',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  fontWeight: 700,
                  marginRight: '8px',
                }}
              >
                Progress
              </Link>

              <span className="user-name">
                {profile?.email ? profile.email : 'You'}
              </span>

              {profile?.role && (
                <span style={{ color: '#666', marginLeft: '4px' }}>
                  ({profile.role})
                </span>
              )}

              <button
                className="btn"
                onClick={handleLogout}
                style={{ marginLeft: '8px' }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="btn" style={{ textDecoration: 'none' }}>
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}