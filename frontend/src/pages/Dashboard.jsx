import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import supabase from '../services/supabaseClient';
import './Dashboard.css';
import Feedback from './Feedback';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error('No access token found. Please log in again.');
  }

  localStorage.setItem('access_token', token);

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [selectedRole, setSelectedRole] = useState('Employee');

  useEffect(() => {
    const savedRole = localStorage.getItem('user_role');
    if (savedRole) {
      setSelectedRole(savedRole);
    }

    const fetchSummary = async () => {
      try {
        const headers = await getAuthHeaders();

        const response = await fetch(`${API_BASE_URL}/dashboard/summary`, {
          method: 'GET',
          headers
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to fetch dashboard summary');
        }

        const summaryData = await response.json();

        if (summaryData.user_role) {
          setSelectedRole(summaryData.user_role);
          localStorage.setItem('user_role', summaryData.user_role);
        }

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
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { user_name, user_role, current_goal, progress_percentage, next_action_step } = data || {};

  return (
    <div className="main-dashboard-view">
      <header className="dashboard-header">
        <h1 className="welcome-message">
          Welcome, <span className="highlight-text">{user_name || 'User'}</span> ({user_role || selectedRole})
        </h1>
        <p className="dashboard-subtitle">
          Here is your custom learning progress summary for today.
        </p>
      </header>

      <section className="summary-widgets">
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
            <Link to="/skills" className="widget-link">Manage Goal</Link>
          ) : (
            <Link to="/skills" className="widget-link-btn">Create Goal</Link>
          )}
        </div>

        <div className="widget-card progress-widget">
          <div>
            <span className="widget-label">Progress %</span>
            <div className="progress-value-container">
              <span className="progress-num">{progress_percentage || 0}%</span>
              <span className="progress-sub">Completed</span>
            </div>

            <div className="widget-progress-bar-track">
              <div
                className="widget-progress-bar-fill"
                style={{ width: `${progress_percentage || 0}%` }}
              />
            </div>
          </div>

          <Link to="/progress" className="widget-link">Track Progress</Link>
        </div>

        <div className="widget-card next-step-widget">
          <div>
            <span className="widget-label">Next Action Step</span>
            <h3 className="widget-value-title step-title-text">
              {next_action_step || 'None'}
            </h3>
            <p className="widget-desc">
              {current_goal
                ? 'Finish this SMART step to level up your capability.'
                : 'Create your first goal to receive next steps.'
              }
            </p>
          </div>

          <Link to="/progress" className="widget-link">View Action Plan</Link>
        </div>
      </section>

      <section className="dashboard-shortcuts-section">
        <h2 className="section-title">Quick Navigation</h2>

        <div className="shortcuts-grid">
          <div className="shortcut-item-card" onClick={() => navigate('/skills')}>
            <h4>Skill Profile</h4>
            <p>Review your assessed skills and learning level.</p>
          </div>

          <div className="shortcut-item-card" onClick={() => navigate('/goal')}>
            <h4>Goal</h4>
            <p>Create, refine, validate, and save your learning goal.</p>
          </div>

          <div className="shortcut-item-card" onClick={() => navigate('/action-plan')}>
            <h4>Action Plan</h4>
            <p>Generate SMART action milestones for your confirmed goal.</p>
          </div>

          <div className="shortcut-item-card" onClick={() => navigate('/progress')}>
            <h4>Progress</h4>
            <p>Track completed and pending action steps.</p>
          </div>

          <div className="shortcut-item-card" onClick={() => navigate('/settings')}>
            <h4>Settings</h4>
            <p>Manage role and profile preferences.</p>
          </div>
        </div>
      </section>

      <Feedback />
    </div>
  );
}