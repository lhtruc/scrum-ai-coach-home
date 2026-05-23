import { useState } from 'react';
import supabaseAuth from '../services/supabaseAuth';

export default function LoginForm({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await supabaseAuth.signInWithEmail(email, password);
      // data: { session, user }
      const token = data?.session?.access_token;
      onSuccess && onSuccess({ token, user: data.user });
    } catch (err) {
      const status = err?.status || err?.statusCode;
      if (status === 401) setError('Incorrect credentials');
      else setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      {error && <div className="error-msg">{error}</div>}

      <div className="form-row">
        <label htmlFor="email">Email</label>
        <input id="email" className="form-input" placeholder="you@company.com" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      </div>

      <div className="form-row">
        <label htmlFor="password">Password</label>
        <input id="password" className="form-input" placeholder="Enter your password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
      </div>

      <div>
        <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
      </div>

      <div>
        <button type="button" className="btn-google" onClick={() => supabaseAuth.signInWithGoogle()}>
          <span className="google-icon" aria-hidden>
            <svg viewBox="0 0 533.5 544.3" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <path fill="#4285f4" d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.3H272v95.1h146.9c-6.3 34-25 62.8-53.4 82v68h86.2c50.3-46.4 81.8-114.6 81.8-194z"/>
              <path fill="#34a853" d="M272 544.3c72.6 0 133.6-24 178.1-65.2l-86.2-68c-24 16.1-55 25.6-91.9 25.6-70.7 0-130.6-47.7-152-111.8H32.6v70.5C76.9 483.1 168 544.3 272 544.3z"/>
              <path fill="#fbbc04" d="M119.9 323.9c-10.8-31.6-10.8-65.6 0-97.2V156.2H32.6c-39.5 77.1-39.5 168.9 0 246z"/>
              <path fill="#ea4335" d="M272 107.7c39.6 0 75.2 13.6 103.1 40.4l77.4-77.4C405.3 24.6 346.3 0 272 0 168 0 76.9 61.2 32.6 156.2l87.3 70.5C141.4 155.5 201.3 107.7 272 107.7z"/>
            </svg>
          </span>
          <span>Login with Google</span>
        </button>
      </div>
    </form>
  );
}
