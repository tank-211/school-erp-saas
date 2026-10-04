import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../style.css";
import "../erp-login.css";
import { useAuth } from "../context/AuthContext.jsx";

const API_URL = import.meta.env.VITE_API_URL;

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [isAdminLogin, setIsAdminLogin] = useState(location.pathname === "/admin-login");
  const [showAdminAccess, setShowAdminAccess] = useState(location.pathname === "/admin-login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const handleSecretShortcut = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setShowAdminAccess(true);
        setIsAdminLogin(true);
      }
    };

    window.addEventListener("keydown", handleSecretShortcut);
    return () => window.removeEventListener("keydown", handleSecretShortcut);
  }, []);

  // Sent here because the session ended (see utils/sessionGuard.js)
  useEffect(() => {
    try {
      if (sessionStorage.getItem("session_expired")) {
        sessionStorage.removeItem("session_expired");
        setError("Your session has expired. Please sign in again.");
      }
    } catch {
      // storage unavailable
    }
  }, []);

  useEffect(() => {
    if (location.pathname === "/admin-login") {
      setShowAdminAccess(true);
      setIsAdminLogin(true);
    }
  }, [location.pathname]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.email || !form.password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();


      if (data.success) {
        const user = login(data.data.token, data.data.user);

        if (isAdminLogin && user?.role !== "admin") {
          logout();
          setError("Permission Denied: Admin access required");
          return;
        }

        setSuccess("Login successful! Redirecting...");

        setTimeout(() => {
          navigate(user?.role === "admin" ? "/admin" : "/dashboard", { replace: true });
        }, 1500);
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Same sign-in page as Lead and Fees (erp-login.css)
  return (
    <div className="erp-login">
      <div className="erp-login-card">
        <div className="erp-login-brand">
          <div className="erp-login-mark">SE</div>
          <div>
            <div className="erp-login-product">School ERP</div>
            <div className="erp-login-module">{isAdminLogin ? "Admissions · Admin Portal" : "Admissions"}</div>
          </div>
        </div>

        <h1 className="erp-login-title">Sign in</h1>
        <p className="erp-login-sub">
          {isAdminLogin
            ? "School administrators only."
            : "Use the email and password your school administrator gave you."}
        </p>

        {showAdminAccess && (
          <div className="erp-login-tabs" role="tablist">
            <button
              type="button"
              className={`erp-login-tab ${!isAdminLogin ? "is-active" : ""}`}
              onClick={() => setIsAdminLogin(false)}
            >
              Staff
            </button>
            <button
              type="button"
              className={`erp-login-tab ${isAdminLogin ? "is-active" : ""}`}
              onClick={() => setIsAdminLogin(true)}
            >
              Admin Portal
            </button>
          </div>
        )}

        {error && (
          <div className="erp-login-alert erp-login-alert-error" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="erp-login-alert erp-login-alert-success">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="erp-login-form">
          <label className="erp-login-label">
            Email address
            <input
              className="erp-login-input"
              type="email"
              autoComplete="username"
              placeholder="you@school.edu"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              disabled={loading}
            />
          </label>

          <label className="erp-login-label">
            Password
            <div className="erp-login-password">
              <input
                className="erp-login-input"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                disabled={loading}
              />
              <button type="button" className="erp-login-show" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <button type="submit" className="erp-login-button" disabled={loading}>
            {loading && <span className="erp-login-spinner" />}
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="erp-login-foot">Accounts are created by your school administrator.</p>
      </div>
      <div className="erp-login-apps">Admissions · Leads · Fees</div>
    </div>
  );
}
