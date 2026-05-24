import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './Navbar.css';

// ==========================================
// [Accept từ nhánh: main]
// Đưa constants và hàm xử lý ra ngoài component để tối ưu hiệu suất
// ==========================================
const HIDDEN_PATHS = ['/welcome', '/login', '/register'];

const getProfileFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem('user_profile')) || null;
  } catch {
    return null;
  }
};

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  // [Accept từ nhánh: main] - Sử dụng access_token thay vì jwt_token
  // const [token, setToken] = useState(localStorage.getItem('jwt_token')); // -> Bị xóa
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [profile, setProfile] = useState(getProfileFromStorage);

  useEffect(() => {
    // [Accept từ nhánh: main] - Xử lý logic event payload xịn hơn
    const syncAuthState = (e) => {
      if (e?.type === 'auth-changed') {
        setProfile(e.detail || null);
      } else {
        setProfile(getProfileFromStorage());
      }
      setToken(localStorage.getItem('access_token'));
    };

    window.addEventListener('storage', syncAuthState);
    window.addEventListener('auth-changed', syncAuthState);

    return () => {
      window.removeEventListener('storage', syncAuthState);
      window.removeEventListener('auth-changed', syncAuthState);
    };
  }, []);

  // [Accept từ nhánh: main] - Rút gọn điều kiện if
  if (HIDDEN_PATHS.includes(location.pathname)) return null;

  const handleLogout = () => {
    // [KẾT HỢP CẢ 2] - Xóa toàn bộ token thừa để không bị lỗi đồng bộ
    localStorage.removeItem('access_token'); 
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_profile');

    window.dispatchEvent(new Event('storage'));

    setToken(null);
    setProfile(null);

    // [Accept từ nhánh: main] - Dùng replace: true để xóa history sau khi logout
    // navigate('/login'); // -> Bị xóa
    navigate('/login', { replace: true });
  };

  // [Accept từ nhánh: main] - Xử lý hiển thị thông tin User (DisplayName + Avatar)
  const userEmail = profile?.email || '';
  const displayName = profile?.display_name || 'You';
  const userRole = profile?.role || '';
  
  const avatarInitial = displayName.charAt(0).toUpperCase();

  // [Accept từ nhánh: main] - Cấu trúc giao diện mới
  return (
    <div className="navbar-wrapper">
      <header className="navbar">
        <div className="nav-container">
          {/* Logo */}
          <Link to="/" className="nav-brand">
            <span className="logo-icon">AI</span>
            <span className="logo-text">Coach</span>
          </Link>

          {/* Right Section */}
          <div className="nav-right">
            {token && (
              <nav className="nav-links" aria-label="Primary navigation">
                <NavLink to="/dashboard" className="nav-link">
                  Dashboard
                </NavLink>
                <NavLink to="/progress" className="nav-link">
                  Progress
                </NavLink>

                {/* ============================================== */}
                {/* [Accept từ nhánh: frontend-view-skill-profile] */}
                {/* Bổ sung Link đến My Profile và chuyển thành NavLink */}
                {/* ============================================== */}
                <NavLink to="/skill-profile" className="nav-link">
                  My Profile
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