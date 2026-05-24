import { useState, useEffect } from 'react';
import authApi from '../services/authApi';
import './Settings.css';

export default function Settings() {
  const [name, setName] = useState('User');
  const [role, setRole] = useState('Employee');
  const [email, setEmail] = useState('you@company.com');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
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

  return (
    <div className="settings-page-view">
      <header className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Manage your profile and learning preferences.</p>
      </header>

      <form className="settings-form glass-card" onSubmit={handleSave}>
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

        <div style={{ marginTop: '24px' }}>
          <button className="btn btn-primary" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
