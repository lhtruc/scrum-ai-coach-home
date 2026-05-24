import { useState, useEffect } from 'react';
// import { useNavigate } from "react-router-dom"; // -> Không dùng nữa do đã bỏ nút Logout ở trang này
import authApi from '../services/authApi';
import settingsApi from '../services/settingsApi'; // -> Giữ lại để gọi API đổi mật khẩu từ nhánh frontend-settings-profile-2
import './Settings.css';

// ==========================================
// [CODE CŨ BỊ LOẠI BỎ TỪ: frontend-settings-profile-2]
// Được comment lại bằng // theo yêu cầu, không xóa đi.
// ==========================================
// const navigate = useNavigate();
// const [displayName, setDisplayName] = useState("");
// const [loading, setLoading] = useState(true);
// 
// const fetchProfile = async () => { ... } // Bỏ vì nhánh main lấy trực tiếp từ localStorage cho nhanh
// 
// const handleProfileUpdate = async (e) => { ... } // Bỏ vì nhánh main đã có handleSave xịn hơn
// 
// const handleLogout = async () => {
//   try {
//     await settingsApi.logout();
//   } catch (error) {
//     console.error(error);
//   }
//   localStorage.removeItem("jwt_token");
//   localStorage.removeItem("user_profile");
//   window.dispatchEvent(new Event("auth-changed"));
//   navigate("/login");
// };
// ==========================================

export default function Settings() {
  // --- STATE TỪ NHÁNH MAIN (Cho Profile) ---
  const [name, setName] = useState('User');
  const [role, setRole] = useState('Employee');
  const [email, setEmail] = useState('you@company.com');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- STATE TỪ NHÁNH CŨ (Cho Đổi Mật Khẩu) ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [isSavingPwd, setIsSavingPwd] = useState(false);

  useEffect(() => {
    // Logic của nhánh main: Đọc thẳng từ localStorage để hiển thị ngay, không cần loading
    const userProfile = JSON.parse(localStorage.getItem('user_profile') || 'null');
    if (userProfile) {
      setName(userProfile.display_name || userProfile.name || 'User');
      setEmail(userProfile.email || 'you@company.com');
      if (userProfile.role) {
        setRole(userProfile.role);
      }
    }
    const savedRole = localStorage.getItem('user_role');
    if (savedRole) {
      setRole(savedRole);
    }
  }, []);

  // [Hàm của nhánh main] - Cập nhật Profile
  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsSaving(true);

    try {
      const result = await authApi.updateProfile({
        display_name: name.trim(),
        role
      });

      localStorage.setItem('user_role', role);
      const userProfile = JSON.parse(localStorage.getItem('user_profile') || 'null') || {};
      const nextProfile = {
        ...userProfile,
        ...(result.profile || {}),
        id: userProfile.id,
        email: userProfile.email || email,
        display_name: name.trim(),
        role
      };
      localStorage.setItem('user_profile', JSON.stringify(nextProfile));

      window.dispatchEvent(new CustomEvent('auth-changed', { detail: nextProfile }));
      window.dispatchEvent(new Event('storage'));

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // [Hàm của nhánh frontend-settings-profile-2] - Tích hợp UI lỗi/thành công của main
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess(false);

    if (!currentPassword) {
      setPwdError("Please enter your current password");
      return;
    }
    if (newPassword.length < 8) {
      setPwdError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("Confirm password does not match");
      return;
    }

    setIsSavingPwd(true);
    try {
      await settingsApi.updatePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setPwdSuccess(true);
      setTimeout(() => setPwdSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setPwdError(err.message || "Failed to update password");
    } finally {
      setIsSavingPwd(false);
    }
  };

  // Dùng UI của nhánh main cho toàn bộ file
  return (
    <div className="settings-page-view">
      <header className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Manage your profile and security preferences.</p>
      </header>

      {/* --- FORM 1: PROFILE --- */}
      <form className="settings-form glass-card" onSubmit={handleSave}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-main)' }}>Profile Information</h2>
        {success && <div className="settings-success-alert">Settings saved successfully!</div>}
        {error && <div className="settings-error-alert">{error}</div>}
        
        <div className="settings-form-row">
          <label htmlFor="pref-name">Name</label>
          <input 
            id="pref-name" 
            className="form-input" 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
          />
        </div>

        <div className="settings-form-row">
          <label htmlFor="pref-email">Email</label>
          <input 
            id="pref-email" 
            className="form-input" 
            type="email" 
            value={email} 
            disabled 
          />
          <span className="settings-field-hint">Email address cannot be changed.</span>
        </div>

        <div className="settings-form-row">
          <label htmlFor="pref-role">Selected Role</label>
          <select 
            id="pref-role" 
            className="form-input" 
            value={role} 
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="Employee">Employee</option>
            <option value="Student">Student</option>
          </select>
          <span className="settings-field-hint">Your customized dashboard views will update based on this role.</span>
        </div>

        <div style={{ marginTop: '12px' }}>
          <button className="btn btn-primary" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>

      {/* --- FORM 2: SECURITY / PASSWORD (Mang từ nhánh cũ qua) --- */}
      <form className="settings-form glass-card" onSubmit={handlePasswordUpdate}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-main)' }}>Security / Password</h2>
        {pwdSuccess && <div className="settings-success-alert">Password updated successfully!</div>}
        {pwdError && <div className="settings-error-alert">{pwdError}</div>}

        <div className="settings-form-row">
          <label>Current Password</label>
          <input
            className="form-input"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>

        <div className="settings-form-row">
          <label>New Password</label>
          <input
            className="form-input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>

        <div className="settings-form-row">
          <label>Confirm New Password</label>
          <input
            className="form-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <div style={{ marginTop: '12px' }}>
          <button className="btn btn-primary" type="submit" disabled={isSavingPwd}>
            {isSavingPwd ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>

      {/* 
      // Nút Logout cũ bị loại bỏ vì đã tích hợp trên Navbar
      // <div className="logout-section">
      //   <button className="logout-btn" onClick={handleLogout}>Log Out</button>
      // </div> 
      */}
    </div>
  );
}