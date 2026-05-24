import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Skill Profile', path: '/skills', search: '?section=profile' },
    { name: 'Goal', path: '/skills', search: '?section=goal' },
    { name: 'Progress', path: '/progress' },
    { name: 'Settings', path: '/settings' }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-logo-text">AI Coach</span>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item, idx) => {
          const itemHref = `${item.path}${item.search || ''}`;
          const isActive = item.search
            ? location.pathname === item.path && location.search === item.search
            : location.pathname === item.path;

          return (
            <Link
              key={idx}
              to={itemHref}
              className={`sidebar-nav-link${isActive ? ' active' : ''}`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <span className="sidebar-footer-text">v1.0.0</span>
      </div>
    </aside>
  );
}
