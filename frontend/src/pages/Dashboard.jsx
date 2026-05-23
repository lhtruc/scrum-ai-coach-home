import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [selectedRole, setSelectedRole] = useState('Employee');

  useEffect(() => {
    const userProfile = JSON.parse(localStorage.getItem('user_profile') || 'null');
    const userId = userProfile?.id || null;
    
    // Load local storage role selection if any
    const savedRole = localStorage.getItem('user_role');
    if (savedRole) {
      setSelectedRole(savedRole);
    }

    const fetchSummary = async () => {
      try {
        const url = userId
          ? `http://127.0.0.1:8000/api/dashboard/summary?user_id=${userId}`
          : 'http://127.0.0.1:8000/api/dashboard/summary';
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch dashboard summary');
        const summaryData = await response.json();
        setData(summaryData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching summary:', err);
        setErrorMsg('Failed to load dashboard data. Please try again.');
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  // Update selectedRole reactively if changed in settings or elsewhere
  useEffect(() => {
    const handleStorageChange = () => {
      const savedRole = localStorage.getItem('user_role');
      if (savedRole) setSelectedRole(savedRole);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loader-ring"></div>
        <h3 style={{ marginTop: '20px' }}>Loading Main Dashboard...</h3>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="dashboard-error">
        <div className="error-card">
          <p>{errorMsg}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  const { user_name, current_goal, progress_percentage, next_action_step } = data || {};

  return (
    <div className="main-dashboard-view">
      {/* Welcome Header */}
      <header className="dashboard-header">
        <h1 className="welcome-message">
          Welcome, <span className="highlight-text">{user_name}</span> ({selectedRole})
        </h1>
        <p className="dashboard-subtitle">
          Here is your custom learning progress summary for today.
        </p>
      </header>

      {/* 3 Distinct UI Summary Cards/Widgets */}
      <section className="summary-widgets">
        {/* Widget 1: Current Goal */}
        <div className="widget-card goal-widget">
          <div>
            <span className="widget-label">Current Goal</span>
            <h3 className="widget-value-title">
              {current_goal || 'No Active Goal'}
            </h3>
            <p className="widget-desc">
              {current_goal 
                ? 'Your currently activated Scrum learning sprint.' 
                : 'Setup a skill rating to receive custom goals from AI Coach.'
              }
            </p>
          </div>
          {current_goal ? (
            <Link to="/" className="widget-link">Manage Goal</Link>
          ) : (
            <Link to="/" className="widget-link-btn">Create Goal</Link>
          )}
        </div>

        {/* Widget 2: Progress % */}
        <div className="widget-card progress-widget">
          <div>
            <span className="widget-label">Progress %</span>
            <div className="progress-value-container">
              <span className="progress-num">{progress_percentage}%</span>
              <span className="progress-sub">Completed</span>
            </div>
            <div className="widget-progress-bar-track">
              <div 
                className="widget-progress-bar-fill" 
                style={{ width: `${progress_percentage}%` }}
              />
            </div>
          </div>
          <Link to="/progress" className="widget-link">Track Progress</Link>
        </div>

        {/* Widget 3: Next Action Step */}
        <div className="widget-card next-step-widget">
          <div>
            <span className="widget-label">Next Action Step</span>
            <h3 className="widget-value-title step-title-text">
              {next_action_step || 'None'}
            </h3>
            <p className="widget-desc">
              {current_goal 
                ? 'Finish this SMART step to level up your capability.' 
                : 'Goal action plan will suggest next steps.'
              }
            </p>
          </div>
          {current_goal && (
            <Link to="/action-plan" className="widget-link">Open Action Plan</Link>
          )}
        </div>
      </section>

      {/* Navigation & Shortcuts Section */}
      <section className="dashboard-shortcuts-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="shortcuts-grid">
          <div className="shortcut-item-card" onClick={() => navigate('/')}>
            <h4>Skill Profile</h4>
            <p>Update skill rating levels and view coach analysis.</p>
          </div>
          <div className="shortcut-item-card" onClick={() => navigate('/')}>
            <h4>Goal Setting</h4>
            <p>Select recommended or customize your learning roadmaps.</p>
          </div>
          <div className="shortcut-item-card" onClick={() => navigate('/action-plan')}>
            <h4>Action Plan</h4>
            <p>Manage and regenerate dynamic AI-generated SMART steps.</p>
          </div>
          <div className="shortcut-item-card" onClick={() => navigate('/progress')}>
            <h4>Progress Dashboard</h4>
            <p>Detailed statistics and step checklist toggles.</p>
          </div>
          <div className="shortcut-item-card" onClick={() => navigate('/settings')}>
            <h4>Settings</h4>
            <p>Manage your account settings and preferences.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
