import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle } from "lucide-react";
import "../style.css";
import { useAuth } from "../context/AuthContext.jsx";

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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        console.log(
          "✅ [LOGIN] Token received:",
          data.data.token?.substring(0, 20) + "...",
        );

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

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "var(--primary-bg)",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow-lg)",
          padding: 40,
          width: "100%",
          maxWidth: 400,
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 8,
            color: "var(--gray-900)",
          }}
        >
          {isAdminLogin ? "Admin Portal Login" : "Login"}
        </h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <p style={{ fontSize: 14, color: "var(--gray-500)", margin: 0 }}>
            {isAdminLogin ? "Enter admin credentials to access the portal" : "Enter your credentials to access the system"}
          </p>
          {showAdminAccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--gray-200)', borderRadius: '9999px', padding: '4px', background: 'var(--gray-50)' }}>
              <button
                type="button"
                onClick={() => setIsAdminLogin(false)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  background: !isAdminLogin ? 'white' : 'transparent',
                  color: !isAdminLogin ? 'var(--primary-dark)' : 'var(--gray-500)',
                  fontWeight: 600,
                  boxShadow: !isAdminLogin ? 'var(--shadow-sm)' : 'none'
                }}
              >
                Staff
              </button>
              <button
                type="button"
                onClick={() => setIsAdminLogin(true)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  background: isAdminLogin ? 'white' : 'transparent',
                  color: isAdminLogin ? 'var(--primary-dark)' : 'var(--gray-500)',
                  fontWeight: 600,
                  boxShadow: isAdminLogin ? 'var(--shadow-sm)' : 'none'
                }}
              >
                Admin Portal
              </button>
            </div>
          )}
        </div>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: "var(--r)",
              padding: "12px 16px",
              marginBottom: 16,
              display: "flex",
              gap: 12,
            }}
          >
            <AlertCircle
              size={20}
              style={{ color: "#dc2626", flexShrink: 0 }}
            />
            <div style={{ color: "#991b1b", fontSize: 14 }}>{error}</div>
          </div>
        )}

        {success && (
          <div
            style={{
              background: "#dcfce7",
              border: "1px solid #86efac",
              borderRadius: "var(--r)",
              padding: "12px 16px",
              marginBottom: 16,
              display: "flex",
              gap: 12,
            }}
          >
            <CheckCircle
              size={20}
              style={{ color: "#16a34a", flexShrink: 0 }}
            />
            <div style={{ color: "#15803d", fontSize: 14 }}>{success}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 500,
                marginBottom: 6,
                color: "var(--gray-700)",
              }}
            >
              Email
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="admin@test.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 500,
                marginBottom: 6,
                color: "var(--gray-700)",
              }}
            >
              Password
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p
          style={{
            fontSize: 13,
            color: "var(--gray-500)",
            marginTop: 16,
            textAlign: "center",
          }}
        >
          Test Credentials:
          <br />
          Email: {isAdminLogin ? "admin@test.com" : "staff@test.com"}
          <br />
          Password: 123456
        </p>
      </div>
    </div>
  );
}
