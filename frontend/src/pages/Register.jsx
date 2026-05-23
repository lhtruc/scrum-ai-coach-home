import { Link } from 'react-router-dom';
import './Login.css';

export default function Register() {
  return (
    <div className="login-page">
      <div className="login-card">
        <div>
          <h2 className="title">Register</h2>
          <p className="subtitle">Registration is not handled in this frontend build.</p>
        </div>

        <div style={{ marginTop: 8, color: '#475569' }}>
          If you need an account, please contact your administrator or sign up through the hosted service.
        </div>

        <div style={{ marginTop: 18 }}>
          <Link to="/login" className="btn-google" style={{ textDecoration: 'none' }}>Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
