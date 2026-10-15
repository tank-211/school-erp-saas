import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { superAdminService } from "../../services/superAdminService";
import { isSuperAdmin, VIEW_ONLY_HINT } from "../../utils/role";

// One school's own email account. Lead and Admission send that school's
// emails (to leads, parents, campaigns) through it.
const STATUS = {
  connected: { label: "Working", cls: "sp-pill" },
  configured: { label: "Saved · not tested", cls: "sp-pill sp-pill-warning" },
  failed: { label: "Test failed", cls: "sp-pill sp-pill-danger" },
  disconnected: { label: "Disconnected", cls: "sp-pill sp-pill-danger" },
  not_configured: { label: "Not set up", cls: "sp-pill sp-pill-warning" },
};

const PROVIDERS = [
  { value: "brevo", label: "Brevo (recommended)", hint: "Free for 300 emails a day. Works on any hosting plan." },
  { value: "resend", label: "Resend", hint: "Needs the school's own domain verified in Resend." },
  { value: "smtp", label: "SMTP (Gmail, Outlook, school mail server)", hint: "Does not work on Render's free plan, which blocks SMTP." },
];

const emptyForm = {
  provider: "brevo",
  from_name: "",
  from_address: "",
  reply_to: "",
  api_key: "",
  smtp_host: "",
  smtp_port: "587",
  smtp_user: "",
  smtp_password: "",
};

function SchoolCommunication() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canEdit = isSuperAdmin();
  const [schoolName, setSchoolName] = useState("");
  const [email, setEmail] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(false);

  const apply = (data) => {
    if (data?.email) {
      const e = data.email;
      setEmail(e);
      setForm({
        ...emptyForm,
        provider: e.provider || "brevo",
        from_name: e.from_name || "",
        from_address: e.from_address || "",
        reply_to: e.reply_to || "",
        smtp_host: e.smtp_host || "",
        smtp_port: e.smtp_port ? String(e.smtp_port) : "587",
        smtp_user: e.smtp_user || "",
      });
    }
    if (data?.school_name) setSchoolName(data.school_name);
    if (data?.school_email) setTestTo((current) => current || data.school_email);
  };

  useEffect(() => {
    superAdminService
      .getSchoolCommunication(id)
      .then(apply)
      .catch((err) => setError(err.message))
      .finally(() => setLoaded(true));
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
      if (err.email) setEmail(err.email);
    } finally {
      setBusy("");
    }
  };

  const save = (e) => {
    e.preventDefault();
    const payload = {
      provider: form.provider,
      from_name: form.from_name.trim(),
      from_address: form.from_address.trim(),
      reply_to: form.reply_to.trim(),
    };
    if (form.provider === "smtp") {
      Object.assign(payload, {
        smtp_host: form.smtp_host.trim(),
        smtp_port: Number(form.smtp_port),
        smtp_user: form.smtp_user.trim(),
      });
      if (form.smtp_password) payload.smtp_password = form.smtp_password;
    } else if (form.api_key.trim()) {
      payload.api_key = form.api_key.trim();
    }
    run("save", () => superAdminService.saveSchoolCommunication(id, payload), "Saved.");
  };

  const status = STATUS[email?.status] || STATUS.not_configured;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const provider = PROVIDERS.find((p) => p.value === form.provider) || PROVIDERS[0];
  const savedSameProvider = email?.provider === form.provider;
  const isSmtp = form.provider === "smtp";

  return (
    <section>
      <div className="sp-toolbar" style={{ alignItems: "center" }}>
        <div>
          <h1 className="sp-title">Communication</h1>
          <p className="sp-subtitle">
            {schoolName ? `${schoolName} · the school's own email account` : loaded ? "School not found" : "Loading..."}
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
            <h2 style={{ margin: 0 }}>Email</h2>
            <span className={status.cls}>{status.label}</span>
          </div>
          {email?.last_error && <p className="sp-subtle-copy">Last problem: {email.last_error}</p>}
          {email?.last_tested_at && (
            <p className="sp-subtle-copy">Last tested {new Date(email.last_tested_at).toLocaleString("en-IN")}</p>
          )}

          <fieldset disabled={!canEdit} className="sp-fieldset" title={canEdit ? undefined : VIEW_ONLY_HINT}>
            <form className="sp-form" onSubmit={save} autoComplete="off" style={{ marginTop: 12 }}>
              <label className="sp-label" htmlFor="provider">
                Email service
                <select id="provider" className="sp-select" value={form.provider} onChange={set("provider")}>
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </label>
              <p className="sp-subtle-copy" style={{ marginTop: -4 }}>{provider.hint}</p>

              <label className="sp-label" htmlFor="from_name">
                Sender name
                <input id="from_name" className="sp-input" value={form.from_name} onChange={set("from_name")} placeholder={schoolName || "School name"} maxLength={150} />
              </label>
              <label className="sp-label" htmlFor="from_address">
                Send from (email address)
                <input id="from_address" className="sp-input" type="email" value={form.from_address} onChange={set("from_address")} placeholder="office@school.in" required maxLength={150} />
              </label>
              <label className="sp-label" htmlFor="reply_to">
                Replies go to (optional)
                <input id="reply_to" className="sp-input" type="email" value={form.reply_to} onChange={set("reply_to")} placeholder="Same as the sender if empty" maxLength={150} />
              </label>

              {!isSmtp && (
                <label className="sp-label" htmlFor="api_key">
                  API key
                  <input
                    id="api_key"
                    className="sp-input"
                    type="password"
                    autoComplete="new-password"
                    value={form.api_key}
                    onChange={set("api_key")}
                    placeholder={savedSameProvider && email?.has_api_key ? "Saved · enter only to replace" : `From the school's ${provider.label.split(" ")[0]} account`}
                  />
                </label>
              )}

              {isSmtp && (
                <>
                  <label className="sp-label" htmlFor="smtp_host">
                    SMTP server
                    <input id="smtp_host" className="sp-input" value={form.smtp_host} onChange={set("smtp_host")} placeholder="smtp.gmail.com" />
                  </label>
                  <label className="sp-label" htmlFor="smtp_port">
                    Port
                    <input id="smtp_port" className="sp-input" type="number" min="1" max="65535" value={form.smtp_port} onChange={set("smtp_port")} />
                  </label>
                  <label className="sp-label" htmlFor="smtp_user">
                    User name
                    <input id="smtp_user" className="sp-input" autoComplete="off" value={form.smtp_user} onChange={set("smtp_user")} placeholder="office@school.in" />
                  </label>
                  <label className="sp-label" htmlFor="smtp_password">
                    Password
                    <input
                      id="smtp_password"
                      className="sp-input"
                      type="password"
                      autoComplete="new-password"
                      value={form.smtp_password}
                      onChange={set("smtp_password")}
                      placeholder={savedSameProvider && email?.has_smtp_password ? "Saved · enter only to replace" : "For Gmail, an app password"}
                    />
                  </label>
                </>
              )}

              <p className="sp-subtle-copy">
                Keys and passwords are stored encrypted and are never shown again. Changing the service, sender or key
                needs a new test.
              </p>
              <div className="sp-row-actions">
                <button className="sp-btn sp-btn-primary" type="submit" disabled={!!busy}>
                  {busy === "save" ? "Saving..." : "Save"}
                </button>
                {email?.provider && (email.has_api_key || email.has_smtp_password) && (
                  <button
                    className="sp-btn sp-btn-danger"
                    type="button"
                    disabled={!!busy}
                    onClick={() => {
                      if (!window.confirm(`Disconnect ${schoolName || "this school"}'s email? Lead and Admission will not send email for this school until new details are saved.`)) return;
                      run("disconnect", () => superAdminService.disconnectSchoolCommunication(id), "Disconnected.");
                    }}
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </form>
          </fieldset>

          {email?.provider && !isSmtp && email.has_api_key && (
            <fieldset disabled={!canEdit} className="sp-fieldset" style={{ marginTop: 18 }}>
              <form
                className="sp-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  run("test", () => superAdminService.testSchoolCommunication(id, testTo.trim()), "Test email sent.");
                }}
              >
                <label className="sp-label" htmlFor="test_to">
                  Send a test email to
                  <input id="test_to" className="sp-input" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" required />
                </label>
                <div className="sp-row-actions">
                  <button className="sp-btn sp-btn-secondary" type="submit" disabled={!!busy}>
                    {busy === "test" ? "Sending..." : "Send test email"}
                  </button>
                </div>
              </form>
            </fieldset>
          )}
        </article>

        <article className="sp-card">
          <h2 style={{ marginTop: 0 }}>Setting up Brevo with the school</h2>
          <ol className="sp-subtle-copy" style={{ lineHeight: 1.7, paddingLeft: 18 }}>
            <li>The school creates a free account at brevo.com (or you create one for them).</li>
            <li>
              In Brevo: <strong>Senders, Domains &amp; Dedicated IPs → Senders → Add a sender</strong> with the address the
              school wants to send from, and confirm it from that inbox.
            </li>
            <li>In Brevo: <strong>SMTP &amp; API → API keys → Generate a new API key</strong>. Paste it above.</li>
            <li>Enter the same sender address above, Save, then send a test email.</li>
          </ol>
          <p className="sp-subtle-copy">
            When the test arrives, the status shows <strong>Working</strong> and the school's staff can email leads and
            parents from Lead and Admission. For better delivery later, verify the school's own domain in Brevo.
          </p>
          <h3 style={{ marginBottom: 6 }}>SMS and WhatsApp</h3>
          <p className="sp-subtle-copy">
            Not available yet. Sending SMS in India needs DLT registration and approved message templates, and WhatsApp needs
            an approved business number; they will be added here once those are in place.
          </p>
        </article>
      </div>
    </section>
  );
}

export default SchoolCommunication;
