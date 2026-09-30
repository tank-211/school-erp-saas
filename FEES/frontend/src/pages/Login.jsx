import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import '../styles/erp-login.css';

// Same sign-in page as Admission and Lead (erp-login.css)
export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await loginUser(email, password);
      if (result.success) {
        login(result.user, result.token);
        navigate('/dashboard');
      } else {
        // Includes "subscription expired", "too many attempts", "invalid credentials"
        setError(result.message || 'Login failed. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="erp-login">
      <div className="erp-login-card">
        <div className="erp-login-brand">
          <div className="erp-login-mark">SE</div>
          <div>
            <div className="erp-login-product">School ERP</div>
            <div className="erp-login-module">Fee Management</div>
          </div>
        </div>

        <h1 className="erp-login-title">Sign in</h1>
        <p className="erp-login-sub">Use the email and password your school administrator gave you.</p>

        {error && <div className="erp-login-alert erp-login-alert-error" role="alert">{error}</div>}

        <form onSubmit={handleLogin} className="erp-login-form">
          <label className="erp-login-label">
            Email address
            <input
              className="erp-login-input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu"
              required
              disabled={loading}
            />
          </label>

          <label className="erp-login-label">
            Password
            <div className="erp-login-password">
              <input
                className="erp-login-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
                disabled={loading}
              />
              <button type="button" className="erp-login-show" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <button type="submit" className="erp-login-button" disabled={loading}>
            {loading && <span className="erp-login-spinner" />}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="erp-login-foot">Accounts are created by your school administrator.</p>
      </div>
      <div className="erp-login-apps">Admissions · Leads · Fees</div>
    </div>
  );
}

export default Login;
