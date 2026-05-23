import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import authApi from '../services/authApi';

export default function RequireAuth({ children }) {
  const [loading, setLoading] = useState(true);
  const [hasRole, setHasRole] = useState(false);
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setHasRole(false);
      return;
    }

    const checkUser = async () => {
      try {
        const res = await authApi.getCurrentUser();
        const role = res?.user?.role;
        setHasRole(!!role);
      } catch (err) {
        setHasRole(false);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [token]);

  if (!token) return <Navigate to="/login" replace />;
  if (loading) return <div>Loading...</div>;
  if (!hasRole) return <Navigate to="/onboarding" replace />;

  return children;
}
