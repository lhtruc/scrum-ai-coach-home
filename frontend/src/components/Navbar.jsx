// <<<<<<< frontend-settings-profile-2
// import "./Navbar.css";
// import { useEffect, useState } from "react";
// import {
//   Link,
//   useLocation,
//   useNavigate
// } from "react-router-dom";
// =======
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
// >>>>>>> main

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

// <<<<<<< frontend-settings-profile-2
//   const [token, setToken] = useState(null);
//   const [profile, setProfile] = useState(() => {
//     try {
//       return JSON.parse(localStorage.getItem("user_profile") || "null");
//     } catch {
//       return null;
//     }
//   });
// =======
// >>>>>>> main

  // [Accept từ nhánh: main] - Sử dụng access_token thay vì jwt_token
  // const [token, setToken] = useState(localStorage.getItem('jwt_token')); // -> Bị xóa (từ lịch sử cũ của main)
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [profile, setProfile] = useState(getProfileFromStorage);

// <<<<<<< frontend-settings-profile-2
//   useEffect(() => {
//     const syncAuth = () => {
//       setToken(localStorage.getItem("jwt_token"));
//
//       try {
//         setProfile(JSON.parse(localStorage.getItem("user_profile") || "null"));
//       } catch {
//         setProfile(null);
//       }
//     };
//
//     syncAuth();
//
//     window.addEventListener("storage", syncAuth);
//     window.addEventListener("auth-changed", syncAuth);
//
//     return () => {
//       window.removeEventListener("storage", syncAuth);
//       window.removeEventListener("auth-changed", syncAuth);
//     };
//   }, []);
//
//   const hiddenPaths = ["/welcome", "/login", "/register"];
//
//   if (hiddenPaths.includes(location.pathname)) {
//     return null;
//   }
//
//   const handleLogout = () => {
//     localStorage.removeItem("jwt_token");
//     localStorage.removeItem("user_profile");
//
//     window.dispatchEvent(new Event("auth-changed"));
// =======
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
// >>>>>>> main

    setToken(null);
    setProfile(null);

// <<<<<<< frontend-settings-profile-2
//     navigate("/login");
// =======
    // [Accept từ nhánh: main] - Dùng replace: true để xóa history sau khi logout
    navigate('/login', { replace: true });
// >>>>>>> main
  };

  // [Accept từ nhánh: main] - Xử lý hiển thị thông tin User (DisplayName + Avatar)
  const userEmail = profile?.email || '';
  const displayName = profile?.display_name || 'You';
  const userRole = profile?.role || '';
  
  const avatarInitial = displayName.charAt(0).toUpperCase();

  // [Accept từ nhánh: main] - Cấu trúc giao diện mới
// <<<<<<< frontend-settings-profile-2
//   return (
//     <nav className="navbar">
//       <div className="nav-container">
//         <div className="nav-brand">
//           <span className="logo-icon">⚡</span>
//
//           <Link
//             to="/"
//             style={{
//               color: "inherit",
//               textDecoration: "none",
//             }}
//           >
//             AI Coach
//           </Link>
//         </div>
//
//         <div className="nav-profile">
//           {token ? (
//             <>
//               <Link
//                 to="/skill-profile"
//                 style={{
//                   textDecoration: "none",
//                   marginRight: "12px",
//                   fontWeight: "600",
//                   color: "#4f46e5",
//                 }}
//               >
//                 My Profile
//               </Link>
//
//               <Link
//                 to="/settings"
//                 style={{
//                   textDecoration: "none",
//                   marginRight: "12px",
//                   fontWeight: "600",
//                   color: "#4f46e5",
//                 }}
//               >
//                 Settings
//               </Link>
//
//               <span className="user-name">
//                 {profile?.display_name || profile?.email || "You"}
//               </span>
//
//               {profile?.role && (
//                 <span style={{ marginLeft: "4px", color: "#666" }}>
//                   ({profile.role})
//                 </span>
//               )}
//
//               <button
//                 className="btn"
//                 onClick={handleLogout}
//                 style={{ marginLeft: "8px" }}
//               >
//                 Logout
//               </button>
//             </>
//           ) : (
//             <Link
//               to="/login"
//               className="btn"
//               style={{ textDecoration: "none" }}
//             >
//               Login
//             </Link>
//           )}
//         </div>
//       </div>
//     </nav>
//   );
// =======
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

                {/* ============================================== */}
                {/* [LẤY TỪ NHÁNH: frontend-settings-profile-2]    */}
                {/* Thêm link Settings, đồng thời chuyển qua NavLink*/}
                {/* ============================================== */}
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
// >>>>>>> main
}