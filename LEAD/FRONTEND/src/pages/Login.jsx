import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import '../erp-login.css';

// Same sign-in page as Admission and Fees (erp-login.css)
const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Set by the session guard (services/api.js) when the API rejects the token
  useEffect(() => {
    try {
      if (sessionStorage.getItem('session_expired')) {
        sessionStorage.removeItem('session_expired');
        setError('Your session has expired. Please sign in again.');
      }
    } catch { /* storage unavailable */ }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Stores the token (authAPI.login)
      await authAPI.login(formData);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      // Includes "subscription expired", "too many attempts", "invalid credentials"
      setError(err.message || 'Login failed. Please check your credentials.');
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
            <div className="erp-login-module">Lead Management</div>
          </div>
        </div>

        <h1 className="erp-login-title">Sign in</h1>
        <p className="erp-login-sub">Use the email and password your school administrator gave you.</p>

        {error && <div className="erp-login-alert erp-login-alert-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="erp-login-form">
          <label className="erp-login-label">
            Email address
            <input
              className="erp-login-input"
              type="email"
              name="email"
              autoComplete="username"
              value={formData.email}
              onChange={handleInputChange}
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
                name="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleInputChange}
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
};

export default Login;
