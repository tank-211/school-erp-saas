import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { superAdminService } from "../../services/superAdminService";

function SPLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await superAdminService.login(form.email, form.password);
      localStorage.setItem("spToken", response.token);
      localStorage.setItem("spUser", JSON.stringify(response.user));
      navigate("/sp-control-portal/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sp-shell sp-auth-wrapper">
      <div className="sp-auth-card">
        <p className="sp-brand-kicker">Dark Slate / Indigo</p>
        <h1 className="sp-title">SP Control Portal</h1>
        <p className="sp-subtitle">
          Internal access for platform operations team.
        </p>

        <form className="sp-form" onSubmit={handleSubmit}>
          <label className="sp-label" htmlFor="email">
            Email
            <input
              id="email"
              className="sp-input"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label className="sp-label" htmlFor="password">
            Password
            <input
              id="password"
              className="sp-input"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          {error && <div className="sp-error">{error}</div>}

          <button
            className="sp-btn sp-btn-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SPLogin;
