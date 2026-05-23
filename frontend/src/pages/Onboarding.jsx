import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authApi from '../services/authApi';
import './Onboarding.css';

export default function Onboarding() {
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleConfirm = async () => {
    if (!role) return setError('Please select a role');
    setError('');
    setLoading(true);
    try {
      const res = await authApi.updateRole(role);
      // update local profile in storage if present
      const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
      profile.role = role;
      localStorage.setItem('user_profile', JSON.stringify(profile));
        try {
          window.dispatchEvent(new CustomEvent('auth-changed', { detail: profile }));
        } catch (e) {
          /* ignore */
        }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to save role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-shell">
      <div className="onboarding-card">
        <h2 className="onboarding-title">Welcome — choose your role</h2>
        <p className="onboarding-sub">Select whether you're an Employee or a Student.</p>

        <div className="role-options">
          <button
            className={`role-btn ${role === 'Employee' ? 'selected' : ''}`}
            onClick={() => setRole('Employee')}
          >
            Employee
          </button>

          <button
            className={`role-btn ${role === 'Student' ? 'selected' : ''}`}
            onClick={() => setRole('Student')}
          >
            Student
          </button>
        </div>

        {error && <div className="onboarding-error">{error}</div>}

        <div className="onboarding-actions">
          <button className="btn-primary" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
