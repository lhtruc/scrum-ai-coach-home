import './Navbar.css';
import { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [profile, setProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user_profile') || 'null');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    setToken(localStorage.getItem('access_token'));
    setProfile(JSON.parse(localStorage.getItem('user_profile') || 'null'));
    const onStorage = () => {
      setToken(localStorage.getItem('access_token'));
      setProfile(JSON.parse(localStorage.getItem('user_profile') || 'null'));
    };
    const onAuthChanged = (e) => {
      const user = e?.detail || null;
      setProfile(user);
      setToken(localStorage.getItem('access_token'));
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('auth-changed', onAuthChanged);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth-changed', onAuthChanged);
    };
  }, []);

  // hide navbar for welcome, login, register pages
  const hiddenPaths = ['/welcome', '/login', '/register'];
  if (hiddenPaths.includes(location.pathname)) return null;

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_profile');
    setToken(null);
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <span className="logo-icon">⚡</span>
          <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>AI Coach</Link>
        </div>
        <div className="nav-profile">
          {token ? (
            <>
              <span className="user-name">{profile?.email ? profile.email : 'You'}</span>
              <span style={{ marginLeft: 8, color: '#666' }}>{profile?.role ? `(${profile.role})` : ''}</span>
              <button className="btn" onClick={handleLogout} style={{ marginLeft: '8px' }}>Logout</button>
            </>
          ) : (
            <Link to="/login" className="btn" style={{ textDecoration: 'none' }}>Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
}