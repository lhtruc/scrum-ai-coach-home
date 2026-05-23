import './Navbar.css';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState(null);

  useEffect(() => {
    setToken(localStorage.getItem('jwt_token'));

    const onStorage = () => {
      setToken(localStorage.getItem('jwt_token'));
    };

    window.addEventListener('storage', onStorage);

    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const hiddenPaths = ['/welcome', '/login', '/register'];

  if (hiddenPaths.includes(location.pathname)) {
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_profile');
    setToken(null);
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <span className="logo-icon">⚡</span>
          <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            AI Coach
          </Link>
        </div>

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

              <span className="user-name">You</span>

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