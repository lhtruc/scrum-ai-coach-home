import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './Layout.css';

export default function Layout({ children }) {
  const location = useLocation();
  const publicPaths = ['/', '/welcome', '/login', '/register'];
  const isPublic = publicPaths.includes(location.pathname);

  if (isPublic) {
    return <main>{children}</main>;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="app-main-content">
        <Navbar />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
