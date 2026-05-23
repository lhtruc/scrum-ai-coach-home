import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';
import { useEffect, useState } from 'react';

export default function Navbar() {
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
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
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