import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';
import { useEffect, useState } from 'react';

export default function Navbar() {
  // hide navbar for welcome, login, register pages
  const location = useLocation();
  const hiddenPaths = ['/welcome', '/login', '/register'];
  if (hiddenPaths.includes(location.pathname)) return null;

  const [token, setToken] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setToken(localStorage.getItem('jwt_token'));
    const onStorage = () => setToken(localStorage.getItem('jwt_token'));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [location.pathname]); // Cập nhật lại token khi chuyển trang

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_profile');
    setToken(null);
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-brand" style={{ color: 'inherit', textDecoration: 'none' }}>
          <span className="logo-icon">⚡</span>
          AI Coach
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/progress" style={{
            textDecoration: 'none',
            color: 'var(--text-main)',
            fontSize: '14px',
            fontWeight: 700
          }}>
            Progress
          </Link>

          <div className="nav-profile">
            {token ? (
              <>
                <span className="user-name">My Workspace</span>
                <div className="avatar">T</div>
                <button className="btn" onClick={handleLogout} style={{ marginLeft: '8px' }}>
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
      </div>
    </nav>
  );
}