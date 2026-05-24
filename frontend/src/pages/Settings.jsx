import { useState, useEffect } from 'react';
import authApi from '../services/authApi';
import settingsApi from '../services/settingsApi'; 
import './Settings.css';

export default function Settings() {
  // --- STATE CHO PROFILE ---
  const [name, setName] = useState('User');
  const [role, setRole] = useState('Employee');
  const [email, setEmail] = useState('you@company.com');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- STATE CHO ĐỔI MẬT KHẨU ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [isSavingPwd, setIsSavingPwd] = useState(false);

  useEffect(() => {
    // Đọc thẳng từ localStorage để hiển thị ngay, không cần loading state
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

  // Xử lý Cập nhật Profile
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

  // Xử lý Đổi Mật Khẩu
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

  return (
    <div className="settings-page-view">
      <header className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Manage your profile and security preferences.</p>
      </header>

      <section className="settings-card-grid">
        <form className="settings-form glass-card" onSubmit={handleSave}>
          <div className="settings-card-header">
            <span className="settings-card-kicker">Account</span>
            <h2>Profile Information</h2>
          </div>
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

          <div className="settings-form-actions">
            <button className="btn btn-primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>

        <form className="settings-form glass-card" onSubmit={handlePasswordUpdate}>
          <div className="settings-card-header">
            <span className="settings-card-kicker">Security</span>
            <h2>Password</h2>
          </div>
          {pwdSuccess && <div className="settings-success-alert">Password updated successfully!</div>}
          {pwdError && <div className="settings-error-alert">{pwdError}</div>}

          <div className="settings-form-row">
            <label htmlFor="current-password">Current Password</label>
            <input
              id="current-password"
              className="form-input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="settings-form-row">
            <label htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              className="form-input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="settings-form-row">
            <label htmlFor="confirm-password">Confirm New Password</label>
            <input
              id="confirm-password"
              className="form-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="settings-form-actions">
            <button className="btn btn-primary" type="submit" disabled={isSavingPwd}>
              {isSavingPwd ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
