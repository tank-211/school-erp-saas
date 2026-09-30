import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { superAdminService } from "../../services/superAdminService";

// One school's own Razorpay account. The school's fees are paid into this
// account; the Fees app takes online payments only once the keys pass the test.
const STATUS = {
  connected: { label: "Connected", cls: "sp-pill" },
  configured: { label: "Saved · not tested", cls: "sp-pill sp-pill-warning" },
  invalid_credentials: { label: "Keys rejected by Razorpay", cls: "sp-pill sp-pill-danger" },
  disconnected: { label: "Disconnected", cls: "sp-pill sp-pill-danger" },
  not_connected: { label: "Not set up", cls: "sp-pill sp-pill-warning" },
};

function SchoolPayments() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState("");
  const [gateway, setGateway] = useState(null);
  const [form, setForm] = useState({ key_id: "", key_secret: "", webhook_secret: "" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const apply = (data) => {
    if (data?.gateway) {
      setGateway(data.gateway);
      setForm({ key_id: data.gateway.key_id || "", key_secret: "", webhook_secret: "" });
    }
    if (data?.school_name) setSchoolName(data.school_name);
  };

  useEffect(() => {
    superAdminService
      .getSchoolGateway(id)
      .then(apply)
      .catch((err) => setError(err.message));
  }, [id]);

  const run = async (label, action, okText) => {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      const data = await action();
      apply(data);
      setNotice(data?.message || okText);
    } catch (err) {
      setError(err.message);
      // A failed test still changes the status (e.g. keys rejected): reload it
      superAdminService.getSchoolGateway(id).then(apply).catch(() => {});
    } finally {
      setBusy("");
    }
  };

  const save = (e) => {
    e.preventDefault();
    const payload = { key_id: form.key_id.trim() };
    if (form.key_secret.trim()) payload.key_secret = form.key_secret.trim();
    if (form.webhook_secret.trim()) payload.webhook_secret = form.webhook_secret.trim();
    run("save", () => superAdminService.saveSchoolGateway(id, payload), "Saved.");
  };

  const status = STATUS[gateway?.status] || STATUS.not_connected;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <section>
      <div className="sp-toolbar" style={{ alignItems: "center" }}>
        <div>
          <h1 className="sp-title">Online Payments</h1>
          <p className="sp-subtitle">
            {schoolName ? `${schoolName} · the school's own Razorpay account` : "Loading..."}
          </p>
        </div>
        <button className="sp-btn sp-btn-ghost" type="button" onClick={() => navigate("/sp-control-portal/schools")}>
          Back to Schools
        </button>
      </div>

      {error && <div className="sp-error" style={{ marginBottom: 12 }}>{error}</div>}
      {notice && <div className="sp-success" style={{ marginBottom: 12 }}>{notice}</div>}

      <div className="sp-grid" style={{ gap: 18 }}>
        <article className="sp-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>Razorpay account</h2>
            <span className={status.cls}>
              {status.label}
              {gateway?.status === "connected" && gateway?.mode ? ` · ${gateway.mode}` : ""}
            </span>
          </div>
          {gateway?.last_error && <p className="sp-subtle-copy">Last problem: {gateway.last_error}</p>}
          {gateway?.last_tested_at && (
            <p className="sp-subtle-copy">Last tested {new Date(gateway.last_tested_at).toLocaleString("en-IN")}</p>
          )}

          <form className="sp-form" onSubmit={save} autoComplete="off" style={{ marginTop: 12 }}>
            <label className="sp-label" htmlFor="key_id">
              Key ID
              <input id="key_id" className="sp-input" autoComplete="off" spellCheck={false} value={form.key_id} onChange={set("key_id")} placeholder="rzp_live_... or rzp_test_..." required />
            </label>
            <label className="sp-label" htmlFor="key_secret">
              Key Secret
              <input
                id="key_secret"
                className="sp-input"
                type="password"
                autoComplete="new-password"
                value={form.key_secret}
                onChange={set("key_secret")}
                placeholder={gateway?.has_key_secret ? "Saved · enter only to replace" : "From the school's Razorpay dashboard"}
              />
            </label>
            <label className="sp-label" htmlFor="webhook_secret">
              Webhook Secret
              <input
                id="webhook_secret"
                className="sp-input"
                type="password"
                autoComplete="new-password"
                value={form.webhook_secret}
                onChange={set("webhook_secret")}
                placeholder={gateway?.has_webhook_secret ? "Saved · enter only to replace" : "The secret you set when adding the webhook"}
              />
            </label>
            <p className="sp-subtle-copy">
              Secrets are stored encrypted and are never shown again. Saving changed keys switches online payments off until
              the test passes.
            </p>
            <div className="sp-row-actions">
              <button className="sp-btn sp-btn-primary" type="submit" disabled={!!busy}>
                {busy === "save" ? "Saving..." : "Save keys"}
              </button>
              <button
                className="sp-btn sp-btn-secondary"
                type="button"
                disabled={!!busy || !gateway?.has_key_secret}
                onClick={() => run("test", () => superAdminService.testSchoolGateway(id), "Connected.")}
              >
                {busy === "test" ? "Testing..." : "Test keys"}
              </button>
              {gateway?.has_key_secret && (
                <button
                  className="sp-btn sp-btn-danger"
                  type="button"
                  disabled={!!busy}
                  onClick={() => {
                    if (!window.confirm("Disconnect this school's Razorpay account? Online payments stop until new keys are saved and tested.")) return;
                    run("disconnect", () => superAdminService.disconnectSchoolGateway(id), "Disconnected.");
                  }}
                >
                  Disconnect
                </button>
              )}
            </div>
          </form>
        </article>

        <article className="sp-card">
          <h2 style={{ marginTop: 0 }}>Setting it up with the school</h2>
          <ol className="sp-subtle-copy" style={{ lineHeight: 1.7, paddingLeft: 18 }}>
            <li>The school opens its own Razorpay account and finishes KYC (live keys need an activated account).</li>
            <li>In Razorpay: Account &amp; Settings → API Keys → Generate Key. Copy the Key ID and Key Secret here.</li>
            <li>
              In Razorpay: Account &amp; Settings → Webhooks → Add New Webhook. URL:
              <div className="sp-input" style={{ margin: "6px 0", userSelect: "all", wordBreak: "break-all" }}>
                {gateway?.webhook_url || "…"}
              </div>
              Choose a secret, tick the events <strong>payment.captured</strong> and <strong>order.paid</strong>, and paste the
              same secret in Webhook Secret here.
            </li>
            <li>Save, then Test keys. When it shows Connected, the school's Fees app can take online payments.</li>
          </ol>
          <p className="sp-subtle-copy">
            The webhook records a payment even if the parent closes the page right after paying. Use test keys first
            (rzp_test_…) to try a payment without real money, then switch to live keys.
          </p>
        </article>
      </div>
    </section>
  );
}

export default SchoolPayments;
