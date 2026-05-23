import { Link } from 'react-router-dom';
import './Welcome.css';

export default function Welcome() {
  return (
    <div className="welcome-page">

      {/* Animated background orbs */}
      <div className="welcome-bg" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>

      {/* Grid texture */}
      <div className="welcome-grid-overlay" aria-hidden="true" />

      {/* Main card */}
      <div className="welcome-card">

        {/* Brand badge */}
        <div className="welcome-badge">
          <span className="welcome-badge-dot" />
          Scrum AI Coach
        </div>

        {/* Product name with animated gradient */}
        <h1 className="welcome-title" id="welcome-product-name">
          <span className="welcome-title-gradient">AI Coach</span>
        </h1>

        {/* Tagline */}
        <p className="welcome-tagline" id="welcome-tagline">
          Your personal AI-powered learning companion
        </p>

        {/* Feature pills */}
        <div className="welcome-pills" id="welcome-features">
          <span className="pill pill-purple">SMART Goals</span>
          <span className="pill pill-cyan">Skill Assessment</span>
          <span className="pill pill-emerald">Action Plans</span>
          <span className="pill pill-rose">AI Guidance</span>
        </div>

        {/* Short description */}
        <p className="welcome-description" id="welcome-description">
          AI Coach helps Employees and Students improve their skills with
          AI-based guidance — from personalized goal-setting to step-by-step
          SMART action plans.
        </p>

        {/* CTA Buttons */}
        <div className="welcome-actions" id="welcome-actions">
          <Link
            to="/register"
            id="signup-btn"
            className="welcome-btn-primary"
          >
            Sign up — it's free
          </Link>

          <div className="welcome-divider">or</div>

          <Link
            to="/login"
            id="login-btn"
            className="welcome-btn-secondary"
          >
            Log in
          </Link>
        </div>

        {/* Footer note */}
        <p className="welcome-footer">
          No credit card required. Start learning in minutes.
        </p>

      </div>
    </div>
  );
}
