import { Navigate } from 'react-router-dom';

export default function RequireRole({ children }) {
  try {
    const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
    if (!profile || !profile.role) {
      return <Navigate to="/onboarding" replace />;
    }
  } catch (e) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
