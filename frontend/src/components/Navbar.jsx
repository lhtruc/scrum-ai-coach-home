import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';
import { useEffect, useState } from 'react';

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
    
    // Đảm bảo trình duyệt nhận biết ngay lập tức việc mất token
    window.dispatchEvent(new Event('storage')); 
    
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          
          {/* LOGIC CHUẨN: Cả Dashboard và Progress đều chỉ hiện khi ĐÃ ĐĂNG NHẬP */}
          {token && (
            <>
              <span className="user-name">{profile?.email ? profile.email : 'You'}</span>
              <span style={{ marginLeft: 8, color: '#666' }}>{profile?.role ? `(${profile.role})` : ''}</span>
              <button className="btn" onClick={handleLogout} style={{ marginLeft: '8px' }}>Logout</button>
              <Link to="/dashboard" style={{
                textDecoration: 'none',
                color: 'var(--text-main)',
                fontSize: '14px',
                fontWeight: 700
              }}>
                Dashboard
              </Link>

              <Link to="/progress" style={{
                textDecoration: 'none',
                color: 'var(--text-main)',
                fontSize: '14px',
                fontWeight: 700
              }}>
                Progress
              </Link>
            </>
          )}

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