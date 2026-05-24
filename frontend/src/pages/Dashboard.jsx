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
        <h3>Loading Main Dashboard...</h3>
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

  const {
    user_name,
    user_role,
    current_goal,
    progress_percentage,
    next_action_step,
    next_action_step_number
  } = data || {};
  const progress = Math.min(Math.max(Number(progress_percentage) || 0, 0), 100);
  const displayRole = user_role || selectedRole;
  const hasGoal = Boolean(current_goal);
  const nextActionStepMarker = next_action_step_number
    ? String(next_action_step_number).padStart(2, '0')
    : '--';
  const progressStatus = progress >= 75 ? 'Strong momentum' : progress >= 35 ? 'In progress' : 'Needs first win';
  const focusCopy = hasGoal
    ? 'Keep the next action small enough to finish, visible enough to review, and connected to your current Scrum goal.'
    : 'Complete your skill profile first so the coach can suggest a relevant learning sprint.';
  const quickActions = [
    {
      title: 'Skill Profile',
      desc: 'Update levels and review coach analysis.',
      path: '/skills',
      icon: 'SP',
      meta: hasGoal ? 'Review' : 'Start here'
    },
    {
      title: 'Goal Setting',
      desc: 'Choose a recommended path or refine your goal.',
      path: '/skills',
      icon: 'GS',
      meta: hasGoal ? 'Tune goal' : 'Create goal'
    },
    {
      title: 'Action Plan',
      desc: 'Work through SMART steps generated for your goal.',
      path: '/action-plan',
      icon: 'AP',
      meta: hasGoal ? 'Next step' : 'Locked'
    },
    {
      title: 'Progress Dashboard',
      desc: 'Inspect completion trends and step checklist.',
      path: '/progress',
      icon: 'PD',
      meta: `${progress}% done`
    },
    {
      title: 'Settings',
      desc: 'Manage account settings and preferences.',
      path: '/settings',
      icon: 'ST',
      meta: 'Account'
    }
  ];

  return (
    <div className="main-dashboard-view">
      <section className="dashboard-command-center">
        <div className="dashboard-hero-copy">
          {/* <span className="dashboard-kicker">{displayRole} learning cockpit</span> */}
          <h1 className="welcome-message">
            Welcome back, <span>{user_name || 'User'}</span>
          </h1>
          <p className="dashboard-subtitle">
            <b>John C. Maxwell:</b> “Small disciplines repeated with consistency every day lead to great achievements.” 
          </p>
          <div className="dashboard-hero-actions">
            <Link to={hasGoal ? '/action-plan' : '/skills'} className="dashboard-primary-action">
              {hasGoal ? 'Continue action plan' : 'Create first goal'} <span>{'▶'}</span>
            </Link>
            <Link to="/progress" className="dashboard-secondary-action">View progress</Link>
          </div>
        </div>

        <div className="dashboard-progress-panel" aria-label="Learning progress">
          <div className="progress-ring" style={{ '--progress': `${progress * 3.6}deg` }}>
            <div className="progress-ring-inner">
              <strong>{progress}%</strong>
              <span>complete</span>
            </div>
          </div>
          <div className="progress-panel-copy">
            <span className="panel-label">{progressStatus}</span>
            <h2>{hasGoal ? current_goal : 'No active goal yet'}</h2>
            <p>
              {hasGoal
                ? 'Your selected goal is active. Keep the next step moving before adding more work.'
                : 'Start with a skill rating to unlock a focused goal and action plan.'}
            </p>
          </div>
        </div>
      </section>

      <section className="dashboard-insight-grid">
        <article className="focus-panel">
          <div className="section-heading-row">
            <div>
              <span className="section-eyebrow">Focus now</span>
              <h2 className="section-title">Next action step</h2>
            </div>
            {hasGoal && <Link to="/action-plan" className="compact-link">Open plan</Link>}
          </div>
          <div className="next-step-block">
            <span className="step-marker">{nextActionStepMarker}</span>
            <div>
              <h3>{next_action_step || 'No step selected yet'}</h3>
              <p>{focusCopy}</p>
            </div>
          </div>
        </article>

        <aside className="dashboard-metrics-strip">
          <div className="metric-item">
            <span className="metric-label">Goal</span>
            <strong>{hasGoal ? 'Active' : 'Missing'}</strong>
          </div>
          <div className="metric-item">
            <span className="metric-label">Progress</span>
            <strong>{progress}%</strong>
          </div>
          <div className="metric-item">
            <span className="metric-label">Role</span>
            <strong>{displayRole}</strong>
          </div>
        </aside>
      </section>

      <section className="dashboard-shortcuts-section">
        <div className="section-heading-row">
          <div>
            <span className="section-eyebrow">Workspace</span>
            <h2 className="section-title">Quick actions</h2>
          </div>
        </div>
        <div className="shortcuts-list">
          {quickActions.map((action) => (
            <button
              key={action.title}
              type="button"
              className="shortcut-action-row"
              onClick={() => navigate(action.path)}
            >
              <span className="shortcut-icon">{action.icon}</span>
              <span className="shortcut-copy">
                <strong>{action.title}</strong>
                <span>{action.desc}</span>
              </span>
              <span className="shortcut-meta">{action.meta}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-feedback-section">
        <h2 className="section-title">Weekly Feedback</h2>
        <Feedback />
      </section>
    </div>
  );
}
