import { Link } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          <span className="logo-icon">⚡</span>
          AI Coach
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/progress" style={{
            textDecoration: 'none',
            color: 'var(--text-main)',
            fontSize: '14px',
            fontWeight: 700
          }}>
            Progress
          </Link>

          <div className="nav-profile">
            <span className="user-name">My Workspace</span>
            <div className="avatar">T</div>
          </div>
        </div>
      </div>
    </nav>
  );
}