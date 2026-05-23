import { useNavigate, Link } from 'react-router-dom';
import { useEffect } from 'react';
import LoginForm from '../components/LoginForm';
import supabaseAuth from '../services/supabaseAuth';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();

  const handleSuccess = (data) => {
    if (data?.token) {
      localStorage.setItem('jwt_token', data.token);
    }
    // optionally store user info
    if (data?.user) localStorage.setItem('user_profile', JSON.stringify(data.user));
    navigate('/dashboard', { replace: true });
  };

  useEffect(() => {
    // Handle OAuth redirect: try to parse session from URL
    (async () => {
      try {
        console.log('[Login] checking URL for OAuth fragments:', window.location.href, window.location.hash, window.location.search);
        const hasOAuthFragment = window.location.hash.includes('access_token') || window.location.hash.includes('provider_token') || window.location.search.includes('code');
        if (!hasOAuthFragment) {
          console.log('[Login] no OAuth fragment present — will NOT auto-redirect. Showing login form.');
          return;
        }

        const result = await supabaseAuth.getSessionFromUrl();
        console.log('[Login] getSessionFromUrl result:', result);
        if (result?.session) {
          const token = result.session.access_token;
          const user = result.user;
          console.log('[Login] parsed session from URL, navigating home');
          handleSuccess({ token, user });
          return;
        }
        console.log('[Login] no session parsed from OAuth fragment');
      } catch (err) {
        console.error('[Login] getSessionFromUrl error:', err);
      }
    })();
  }, []);

  return (
    <div className="login-page">
      <div className="login-card">
        <div>
          <h2 className="title">Login</h2>
          <p className="subtitle">Sign in to access your saved skills and plans.</p>
        </div>
        <LoginForm onSuccess={handleSuccess} />
        <div className="login-footer">Don't have an account? <Link to="/register">Sign up</Link></div>
      </div>
    </div>
  );
}
