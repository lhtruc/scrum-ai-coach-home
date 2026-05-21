import './Navbar.css';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <span className="logo-icon">⚡</span>
          AI Coach
        </div>
        <div className="nav-profile">
          <span className="user-name">My Workspace</span>
          <div className="avatar">T</div>
        </div>
      </div>
    </nav>
  );
}