import { useEffect, useState } from "react";
import { superAdminService } from "../../services/superAdminService";
import { isSuperAdmin, VIEW_ONLY_HINT } from "../../utils/role";

function PaymentGateway() {
  // Changes are for Super Admins only; other staff roles view
  const canEdit = isSuperAdmin();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [gateway, setGateway] = useState(null);

  const [form, setForm] = useState({
    environment: "test",
    client_id: "",
    client_secret: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadGateway();
  }, []);

  const loadGateway = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await superAdminService.getPaymentGateway();

      const data = response?.data || response;

      setGateway(data);

      setForm({
        environment: data?.environment || "test",
        client_id: data?.client_id || "",
        client_secret: "",
      });
    } catch (err) {
      console.error("Payment gateway load error:", err);
      setError(err.message || "Failed to load payment gateway.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setError("");

      if (!form.client_id) {
        setError("Client ID is required.");
        return;
      }

      if (!gateway?.has_client_secret && !form.client_secret) {
        setError("Client Secret is required.");
        return;
      }

      const payload = {
        environment: form.environment,
        client_id: form.client_id,
      };

      if (form.client_secret) {
        payload.client_secret = form.client_secret;
      }

      let response;

      if (gateway?.status === "not_configured") {
        response = await superAdminService.createPaymentGateway(payload);
      } else {
        response = await superAdminService.updatePaymentGateway(payload);
      }

      setMessage(
        response?.message || "Payment gateway configuration saved."
      );

      setForm((prev) => ({
        ...prev,
        client_secret: "",
      }));

      await loadGateway();
    } catch (err) {
      console.error("Payment gateway save error:", err);
      setError(err.message || "Failed to save payment gateway.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setMessage("");
      setError("");

      const response = await superAdminService.testPaymentGateway();

      setMessage(
        response?.message || "Payment gateway configuration is valid."
      );

      await loadGateway();
    } catch (err) {
      console.error("Payment gateway test error:", err);
      setError(err.message || "Payment gateway test failed.");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="sp-page">
        <div className="sp-card">
          <p>Loading payment gateway...</p>
        </div>
      </div>
    );
  }

  const isConfigured =
    gateway?.status &&
    gateway.status !== "not_configured";

  return (
    <div className="sp-page">
      <div className="sp-page-header">
        <div>
          <p className="sp-brand-kicker">Platform Configuration</p>
          <h1>Payment Gateway</h1>
          <p>
            Configure the payment gateway used by the School ERP platform.
          </p>
        </div>
      </div>

      {message && (
        <div className="sp-alert sp-alert-success">
          {message}
        </div>
      )}

      {error && (
        <div className="sp-alert sp-alert-error">
          {error}
        </div>
      )}

      <div className="sp-card">
        <div className="sp-card-header">
          <div>
            <h2>Razorpay</h2>
            <p>
              Platform Razorpay keys. "Test Connection" checks them with
              Razorpay directly.
            </p>
          </div>

          {/* "Connected" only after Razorpay accepted the keys in a test */}
          <span
            className={`sp-status ${
              gateway?.status === "connected"
                ? "sp-status-active"
                : "sp-status-inactive"
            }`}
          >
            {{
              connected: `Connected${gateway?.connected_at ? ` · ${new Date(gateway.connected_at).toLocaleDateString("en-IN")}` : ""}`,
              configured: "Saved · not tested",
              invalid_credentials: "Keys rejected by Razorpay",
              disabled: "Disabled",
            }[gateway?.status] || "Not configured"}
          </span>
        </div>

        <fieldset disabled={!canEdit} className="sp-fieldset" title={canEdit ? undefined : VIEW_ONLY_HINT}>
<form onSubmit={handleSave} autoComplete="off">
          <div className="sp-form-grid">
            <div className="sp-form-group">
              <label htmlFor="environment">
                Environment
              </label>

              <select
                id="environment"
                name="environment"
                value={form.environment}
                onChange={handleChange}
              >
                <option value="test">Test</option>
                <option value="live">Live</option>
              </select>
            </div>

            <div className="sp-form-group">
              <label htmlFor="client_id">
                Platform Client ID
              </label>

              <input
                id="client_id"
                name="client_id"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={form.client_id}
                onChange={handleChange}
                placeholder="rzp_test_... or rzp_live_..."
              />
            </div>

            <div className="sp-form-group sp-form-full">
              <label htmlFor="client_secret">
                Platform Client Secret
              </label>

              <input
                id="client_secret"
                name="client_secret"
                type="password"
                // Not a login: stop the browser filling in the saved Super Admin password
                autoComplete="new-password"
                value={form.client_secret}
                onChange={handleChange}
                placeholder={
                  gateway?.has_client_secret
                    ? "Enter new secret only if changing it"
                    : "Enter Razorpay platform client secret"
                }
              />

              {gateway?.has_client_secret && (
                <small>
                  A client secret is already configured. Leave this
                  field empty to keep the existing secret.
                </small>
              )}
            </div>
          </div>

          <div className="sp-form-actions">
            <button
              type="submit"
              className="sp-btn sp-btn-primary"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Configuration"}
            </button>

            <button
              type="button"
              className="sp-btn sp-btn-secondary"
              onClick={handleTest}
              disabled={testing || !isConfigured}
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
          </div>
        </form>
</fieldset>
      </div>

      <div className="sp-card">
        <h2>Where these keys are used</h2>

        <p>
          School fees are paid into each school's own Razorpay account, set
          on the school's Payments page (Schools → Set up payments). These
          platform keys are not used for school fees; they are kept for
          charging schools themselves (for example subscriptions) later.
        </p>
      </div>
    </div>
  );
}

export default PaymentGateway;