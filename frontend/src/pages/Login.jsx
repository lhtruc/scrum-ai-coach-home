import { useNavigate, Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import LoginForm from '../components/LoginForm';
import supabaseAuth from '../services/supabaseAuth';
import authApi from '../services/authApi';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const oauthProcessedRef = useRef(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

  const handleSuccess = async (data) => {
    // Try to obtain token from the supplied data or from the Supabase client
    let token = data?.token;

    if (!token) {
      try {
        const sessionData = await supabaseAuth.getSession();
        token = sessionData?.session?.access_token;
      } catch (err) {
        console.warn('Failed to read session from Supabase client', err);
      }
    }

    if (token) {
      localStorage.setItem('access_token', token);

      // Ensure backend has an accounts row for this auth user (Google etc.)
      try {
        await authApi.syncAccount(token);
      } catch (err) {
        // don't block login on sync failure; log for debugging
        console.warn('syncAccount failed', err);
      }
    }

    if (data?.user) {
      localStorage.setItem('user_profile', JSON.stringify(data.user));
      try {
        window.dispatchEvent(new CustomEvent('auth-changed', { detail: data.user }));
      } catch (e) {
        /* ignore */
      }
    }

    // Decide redirect by calling backend /api/auth/me with the token we have
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    try {
      const resp = await fetch('http://127.0.0.1:8000/api/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const me = await resp.json().catch(() => null);

      if (resp.ok && me?.user) {
        // persist canonical user profile returned by backend (includes role)
        try {
          localStorage.setItem('user_profile', JSON.stringify(me.user));
        } catch (e) {
          /* ignore storage errors */
        }

        // If backend didn't yet have an accounts row with role (common with OAuth), try syncing once
        if (!me.user.role && token) {
          try {
            await authApi.syncAccount(token);
            const retryResp = await fetch('http://127.0.0.1:8000/api/auth/me', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });
            const retryMe = await retryResp.json().catch(() => null);
            if (retryResp.ok && retryMe?.user) {
              try { localStorage.setItem('user_profile', JSON.stringify(retryMe.user)); } catch {}
              // dispatch event so navbar updates immediately
              window.dispatchEvent(new CustomEvent('auth-changed', { detail: retryMe.user }));
              if (retryMe.user.role) {
                navigate('/', { replace: true });
                return;
              }
            }
          } catch (e) {
            console.warn('retry syncAccount failed', e);
          }
        }

        // dispatch event so navbar updates immediately with whatever profile we have
        window.dispatchEvent(new CustomEvent('auth-changed', { detail: me.user }));

        if (me.user.role) {
          navigate('/', { replace: true });
        } else {
          navigate('/onboarding', { replace: true });
        }
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch (err) {
      console.error('Error fetching /api/auth/me', err);
      navigate('/onboarding', { replace: true });
    }
  };

  useEffect(() => {
    // Handle OAuth redirect: try to parse session from URL
    if (oauthProcessedRef.current) return;

    (async () => {
      try {
        console.log('[Login] checking URL for OAuth fragments:', window.location.href, window.location.hash, window.location.search);
        const hasOAuthFragment = window.location.hash.includes('access_token') || window.location.hash.includes('provider_token') || window.location.search.includes('code');
        if (!hasOAuthFragment) {
          console.log('[Login] no OAuth fragment present — will NOT auto-redirect. Showing login form.');
          return;
        }

        // indicate processing so UI can show a signing-in state
        setIsProcessingOAuth(true);

        try {
          const result = await supabaseAuth.getSessionFromUrl();
          console.log('[Login] getSessionFromUrl result:', result);
          if (result?.session) {
            const token = result.session.access_token;
            const user = result.user;
            console.log('[Login] parsed session from URL, navigating home');
            // mark processed and clean up URL to avoid re-processing
            oauthProcessedRef.current = true;
            try {
              const newUrl = window.location.pathname + window.location.search;
              window.history.replaceState(null, '', newUrl);
            } catch (e) {
              /* ignore */
            }
            await handleSuccess({ token, user });
            return;
          }
          console.log('[Login] no session parsed from OAuth fragment');
        } finally {
          setIsProcessingOAuth(false);
        }
      } catch (err) {
        console.error('[Login] getSessionFromUrl error:', err);
        setIsProcessingOAuth(false);
      }
    })();
  }, []);

  return (
    isProcessingOAuth ? (
      <div className="login-page">
        <div className="login-card">
          <h2 className="title">Signing you in...</h2>
          <p className="subtitle">Please wait while we finish Google login.</p>
        </div>
      </div>
    ) : (
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
    )
  );
}
