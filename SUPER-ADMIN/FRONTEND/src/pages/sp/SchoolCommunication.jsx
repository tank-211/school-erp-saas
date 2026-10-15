import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { superAdminService } from "../../services/superAdminService";
import { isSuperAdmin, VIEW_ONLY_HINT } from "../../utils/role";

// One school's own email, SMS and WhatsApp accounts. Lead, Admission and Fees
// send that school's messages (to leads, parents, fee reminders) through them.
const STATUS = {
  connected: { label: "Working", cls: "sp-pill" },
  configured: { label: "Saved · not tested", cls: "sp-pill sp-pill-warning" },
  failed: { label: "Test failed", cls: "sp-pill sp-pill-danger" },
  disconnected: { label: "Disconnected", cls: "sp-pill sp-pill-danger" },
  not_configured: { label: "Not set up", cls: "sp-pill sp-pill-warning" },
};

const CHANNELS = [
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
  { key: "whatsapp", label: "WhatsApp" },
];

const PROVIDERS = {
  email: [
    { value: "brevo", label: "Brevo (recommended)", hint: "Free for 300 emails a day. Works on any hosting plan." },
    { value: "resend", label: "Resend", hint: "Needs the school's own domain verified in Resend." },
    { value: "smtp", label: "SMTP (Gmail, Outlook, school mail server)", hint: "Does not work on Render's free plan, which blocks SMTP." },
  ],
  sms: [
    { value: "msg91", label: "MSG91 (recommended for India)", hint: "Sends the school's DLT-approved template. The message goes into the template's variable." },
    { value: "twilio", label: "Twilio", hint: "Sends the message as written. Indian numbers need the school's DLT registration with Twilio." },
  ],
  whatsapp: [
    { value: "meta", label: "WhatsApp Cloud API (Meta)", hint: "The school's WhatsApp Business number, set up in Meta for Developers." },
    { value: "twilio", label: "Twilio WhatsApp", hint: "The school's WhatsApp sender registered in Twilio." },
  ],
};

const EMPTY = {
  email: { provider: "brevo", from_name: "", from_address: "", reply_to: "", api_key: "", smtp_host: "", smtp_port: "587", smtp_user: "", smtp_password: "" },
  sms: { provider: "msg91", api_key: "", account_sid: "", sender: "", template_id: "", template_var: "var1" },
  whatsapp: { provider: "meta", token: "", account_sid: "", sender: "", template: "", template_lang: "en" },
};

// Form values from the saved settings (secrets are never sent back)
const formFrom = (channel, saved) => {
  const s = saved || {};
  if (channel === "email") {
    return {
      ...EMPTY.email,
      provider: s.provider || "brevo",
      from_name: s.from_name || "",
      from_address: s.from_address || "",
      reply_to: s.reply_to || "",
      smtp_host: s.smtp_host || "",
      smtp_port: s.smtp_port ? String(s.smtp_port) : "587",
      smtp_user: s.smtp_user || "",
    };
  }
  if (channel === "sms") {
    return {
      ...EMPTY.sms,
      provider: s.provider || "msg91",
      account_sid: s.account_sid || "",
      sender: s.sender || "",
      template_id: s.template_id || "",
      template_var: s.template_var || "var1",
    };
  }
  return {
    ...EMPTY.whatsapp,
    provider: s.provider || "meta",
    account_sid: s.account_sid || "",
    sender: s.sender || "",
    template: s.template || "",
    template_lang: s.template_lang || "en",
  };
};

// What is sent to the server for each channel
const payloadFrom = (channel, f) => {
  const t = (v) => String(v || "").trim();
  if (channel === "email") {
    const p = { provider: f.provider, from_name: t(f.from_name), from_address: t(f.from_address), reply_to: t(f.reply_to) };
    if (f.provider === "smtp") {
      Object.assign(p, { smtp_host: t(f.smtp_host), smtp_port: Number(f.smtp_port), smtp_user: t(f.smtp_user) });
      if (f.smtp_password) p.smtp_password = f.smtp_password;
    } else if (t(f.api_key)) {
      p.api_key = t(f.api_key);
    }
    return p;
  }
  if (channel === "sms") {
    const p = { provider: f.provider, sender: t(f.sender) };
    if (f.provider === "msg91") Object.assign(p, { template_id: t(f.template_id), template_var: t(f.template_var) });
    else p.account_sid = t(f.account_sid);
    if (t(f.api_key)) p.api_key = t(f.api_key);
    return p;
  }
  const p = { provider: f.provider, sender: t(f.sender), template: t(f.template) };
  if (f.provider === "meta") p.template_lang = t(f.template_lang);
  else p.account_sid = t(f.account_sid);
  if (t(f.token)) p.token = t(f.token);
  return p;
};

function Field({ id, label, hint, children }) {
  return (
    <label className="sp-label" htmlFor={id}>
      {label}
      {children}
      {hint && <span className="sp-subtle-copy" style={{ display: "block", marginTop: 4, fontWeight: 400 }}>{hint}</span>}
    </label>
  );
}

function SecretInput({ id, value, onChange, saved, placeholder }) {
  return (
    <input
      id={id}
      className="sp-input"
      type="password"
      autoComplete="new-password"
      value={value}
      onChange={onChange}
      placeholder={saved ? "Saved · enter only to replace" : placeholder}
    />
  );
}

function ChannelFields({ channel, form, set, saved, schoolName }) {
  const sameProvider = saved?.provider === form.provider;

  if (channel === "email") {
    const isSmtp = form.provider === "smtp";
    return (
      <>
        <Field id="from_name" label="Sender name">
          <input id="from_name" className="sp-input" value={form.from_name} onChange={set("from_name")} placeholder={schoolName || "School name"} maxLength={150} />
        </Field>
        <Field id="from_address" label="Send from (email address)">
          <input id="from_address" className="sp-input" type="email" value={form.from_address} onChange={set("from_address")} placeholder="office@school.in" required maxLength={150} />
        </Field>
        <Field id="reply_to" label="Replies go to (optional)">
          <input id="reply_to" className="sp-input" type="email" value={form.reply_to} onChange={set("reply_to")} placeholder="Same as the sender if empty" maxLength={150} />
        </Field>
        {!isSmtp && (
          <Field id="api_key" label="API key">
            <SecretInput id="api_key" value={form.api_key} onChange={set("api_key")} saved={sameProvider && saved?.has_api_key} placeholder={`From the school's ${form.provider === "brevo" ? "Brevo" : "Resend"} account`} />
          </Field>
        )}
        {isSmtp && (
          <>
            <Field id="smtp_host" label="SMTP server">
              <input id="smtp_host" className="sp-input" value={form.smtp_host} onChange={set("smtp_host")} placeholder="smtp.gmail.com" />
            </Field>
            <Field id="smtp_port" label="Port">
              <input id="smtp_port" className="sp-input" type="number" min="1" max="65535" value={form.smtp_port} onChange={set("smtp_port")} />
            </Field>
            <Field id="smtp_user" label="User name">
              <input id="smtp_user" className="sp-input" autoComplete="off" value={form.smtp_user} onChange={set("smtp_user")} placeholder="office@school.in" />
            </Field>
            <Field id="smtp_password" label="Password">
              <SecretInput id="smtp_password" value={form.smtp_password} onChange={set("smtp_password")} saved={sameProvider && saved?.has_smtp_password} placeholder="For Gmail, an app password" />
            </Field>
          </>
        )}
      </>
    );
  }

  if (channel === "sms") {
    if (form.provider === "msg91") {
      return (
        <>
          <Field id="sms_key" label="Auth key" hint="MSG91 → API → Auth key.">
            <SecretInput id="sms_key" value={form.api_key} onChange={set("api_key")} saved={sameProvider && saved?.has_api_key} placeholder="From the school's MSG91 account" />
          </Field>
          <Field id="sms_template" label="Template ID" hint="MSG91 → SMS → Templates: the template mapped to the school's DLT-approved template.">
            <input id="sms_template" className="sp-input" value={form.template_id} onChange={set("template_id")} placeholder="e.g. 65f1c0d2d6fc05..." maxLength={100} />
          </Field>
          <Field id="sms_var" label="Variable that carries the message" hint="The variable name in the MSG91 template, e.g. var1 for ##var1##.">
            <input id="sms_var" className="sp-input" value={form.template_var} onChange={set("template_var")} placeholder="var1" maxLength={50} />
          </Field>
          <Field id="sms_sender" label="Sender ID (optional)" hint="The 6-letter DLT header, e.g. ABCSCH. Leave empty if the template already has it.">
            <input id="sms_sender" className="sp-input" value={form.sender} onChange={set("sender")} placeholder="ABCSCH" maxLength={11} />
          </Field>
        </>
      );
    }
    return (
      <>
        <Field id="sms_sid" label="Account SID">
          <input id="sms_sid" className="sp-input" value={form.account_sid} onChange={set("account_sid")} placeholder="AC..." maxLength={40} autoComplete="off" />
        </Field>
        <Field id="sms_token" label="Auth token">
          <SecretInput id="sms_token" value={form.api_key} onChange={set("api_key")} saved={sameProvider && saved?.has_api_key} placeholder="From the Twilio console" />
        </Field>
        <Field id="sms_from" label="Send from" hint="The Twilio number with country code, or a Messaging Service SID (MG...).">
          <input id="sms_from" className="sp-input" value={form.sender} onChange={set("sender")} placeholder="+1... or MG..." maxLength={40} />
        </Field>
      </>
    );
  }

  // WhatsApp
  if (form.provider === "meta") {
    return (
      <>
        <Field id="wa_sender" label="Phone number ID" hint="Meta for Developers → WhatsApp → API Setup. This is an ID, not the phone number.">
          <input id="wa_sender" className="sp-input" value={form.sender} onChange={set("sender")} placeholder="e.g. 106540352242922" maxLength={25} inputMode="numeric" />
        </Field>
        <Field id="wa_token" label="Access token" hint="A permanent token from a system user in Meta Business Settings (temporary tokens stop after 24 hours).">
          <SecretInput id="wa_token" value={form.token} onChange={set("token")} saved={sameProvider && saved?.has_token} placeholder="EAAG..." />
        </Field>
        <Field id="wa_template" label="Approved template name" hint="A message template approved in WhatsApp Manager whose body has one variable {{1}}; the message goes there. Leave empty only for replies within 24 hours.">
          <input id="wa_template" className="sp-input" value={form.template} onChange={set("template")} placeholder="school_message" maxLength={150} />
        </Field>
        <Field id="wa_lang" label="Template language" hint="The language code of the template, e.g. en, en_US, hi.">
          <input id="wa_lang" className="sp-input" value={form.template_lang} onChange={set("template_lang")} placeholder="en" maxLength={20} />
        </Field>
      </>
    );
  }
  return (
    <>
      <Field id="wa_sid" label="Account SID">
        <input id="wa_sid" className="sp-input" value={form.account_sid} onChange={set("account_sid")} placeholder="AC..." maxLength={40} autoComplete="off" />
      </Field>
      <Field id="wa_ttoken" label="Auth token">
        <SecretInput id="wa_ttoken" value={form.token} onChange={set("token")} saved={sameProvider && saved?.has_token} placeholder="From the Twilio console" />
      </Field>
      <Field id="wa_from" label="WhatsApp sender" hint="The school's WhatsApp number in Twilio with country code, or a Messaging Service SID (MG...).">
        <input id="wa_from" className="sp-input" value={form.sender} onChange={set("sender")} placeholder="+91..." maxLength={40} />
      </Field>
      <Field id="wa_content" label="Template Content SID" hint="An approved template (HX...) whose body has one variable {{1}}; the message goes there. Leave empty only for replies within 24 hours.">
        <input id="wa_content" className="sp-input" value={form.template} onChange={set("template")} placeholder="HX..." maxLength={40} />
      </Field>
    </>
  );
}

const HELP = {
  email: {
    title: "Setting up Brevo with the school",
    steps: [
      <>The school creates a free account at brevo.com (or you create one for them).</>,
      <>In Brevo: <strong>Senders, Domains &amp; Dedicated IPs → Senders → Add a sender</strong> with the address the school sends from, and confirm it from that inbox.</>,
      <>In Brevo: <strong>SMTP &amp; API → API keys → Generate a new API key</strong>. Paste it here.</>,
      <>Enter the same sender address, Save, then send a test email.</>,
    ],
    note: "For better delivery later, verify the school's own domain in Brevo.",
  },
  sms: {
    title: "Setting up SMS (India)",
    steps: [
      <>The school registers on a DLT portal (Jio, Airtel, Vi or BSNL) with its <strong>entity ID</strong>, a 6-letter <strong>sender ID</strong> (header) and a <strong>message template</strong> with a variable, e.g. "Dear Parent, {"{#var#}"} - ABC School".</>,
      <>In MSG91: add the DLT entity and sender ID, then <strong>SMS → Templates → Create</strong> with the same text and DLT template ID, using ##var1## for the variable.</>,
      <>Copy MSG91's <strong>template ID</strong> and <strong>auth key</strong> here, Save, and send a test SMS.</>,
    ],
    note: "Operators block messages that do not match an approved template, so staff messages should fit the template's wording and length.",
  },
  whatsapp: {
    title: "Setting up WhatsApp (Meta)",
    steps: [
      <>In Meta for Developers, create a <strong>Business</strong> app, add <strong>WhatsApp</strong>, and add the school's phone number (a number not used in the WhatsApp app).</>,
      <>In WhatsApp Manager, create a <strong>Utility</strong> template, e.g. "Message from ABC School: {"{{1}}"}", and wait for approval.</>,
      <>In Business Settings, create a <strong>system user</strong> with a permanent token that has WhatsApp permissions.</>,
      <>Enter the <strong>phone number ID</strong>, token and template name here, Save, and send a test.</>,
    ],
    note: "WhatsApp only delivers messages a business starts through approved templates; Meta charges per conversation.",
  },
};

function SchoolCommunication() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canEdit = isSuperAdmin();
  const [tab, setTab] = useState("email");
  const [school, setSchool] = useState({ name: "", email: "", phone: "" });
  const [saved, setSaved] = useState({ email: null, sms: null, whatsapp: null });
  const [forms, setForms] = useState(EMPTY);
  const [testTo, setTestTo] = useState({ email: "", sms: "", whatsapp: "" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Applies a server answer; `only` resets just that channel's form (keeps others' typing)
  const apply = (data, only) => {
    if (!data) return;
    if (data.email || data.sms || data.whatsapp) {
      setSaved({ email: data.email || null, sms: data.sms || null, whatsapp: data.whatsapp || null });
      setForms((current) => {
        const next = { ...current };
        for (const c of only ? [only] : ["email", "sms", "whatsapp"]) next[c] = formFrom(c, data[c]);
        return next;
      });
    }
    if (data.school_name) setSchool({ name: data.school_name, email: data.school_email || "", phone: data.school_phone || "" });
    setTestTo((t) => ({
      email: t.email || data.school_email || "",
      sms: t.sms || data.school_phone || "",
      whatsapp: t.whatsapp || data.school_phone || "",
    }));
  };

  useEffect(() => {
    superAdminService
      .getSchoolCommunication(id)
      .then((data) => apply(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoaded(true));
  }, [id]);

  const run = async (label, action, okText) => {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      const data = await action();
      apply(data, tab);
      setNotice(data?.message || okText);
    } catch (err) {
      setError(err.message);
      if (err.settings) {
        // keep what the person typed; only refresh the statuses
        setSaved({ email: err.settings.email, sms: err.settings.sms, whatsapp: err.settings.whatsapp });
      }
    } finally {
      setBusy("");
    }
  };

  const form = forms[tab];
  const current = saved[tab];
  const set = (key) => (e) => {
    const value = e.target.value;
    setForms((f) => ({ ...f, [tab]: { ...f[tab], [key]: value } }));
  };
  const provider = PROVIDERS[tab].find((p) => p.value === form.provider) || PROVIDERS[tab][0];
  const status = STATUS[current?.status] || STATUS.not_configured;
  const label = CHANNELS.find((c) => c.key === tab).label;
  const hasSecret = Boolean(current?.has_api_key || current?.has_smtp_password || current?.has_token);
  const canTest = current?.provider && hasSecret && !(tab === "email" && current.provider === "smtp");
  const help = HELP[tab];

  const save = (e) => {
    e.preventDefault();
    run("save", () => superAdminService.saveSchoolCommunication(id, tab, payloadFrom(tab, form)), "Saved.");
  };

  return (
    <section>
      <div className="sp-toolbar" style={{ alignItems: "center" }}>
        <div>
          <h1 className="sp-title">Communication</h1>
          <p className="sp-subtitle">
            {school.name ? `${school.name} · the school's own email, SMS and WhatsApp accounts` : loaded ? "School not found" : "Loading..."}
          </p>
        </div>
        <button className="sp-btn sp-btn-ghost" type="button" onClick={() => navigate("/sp-control-portal/schools")}>
          Back to Schools
        </button>
      </div>

      <div className="sp-row-actions" role="tablist" style={{ marginBottom: 14, flexWrap: "wrap" }}>
        {CHANNELS.map((c) => {
          const st = STATUS[saved[c.key]?.status] || STATUS.not_configured;
          return (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={tab === c.key}
              className={`sp-btn ${tab === c.key ? "sp-btn-primary" : "sp-btn-ghost"}`}
              onClick={() => {
                setTab(c.key);
                setError("");
                setNotice("");
              }}
            >
              {c.label} · {st.label}
            </button>
          );
        })}
      </div>

      {error && <div className="sp-error" style={{ marginBottom: 12 }}>{error}</div>}
      {notice && <div className="sp-success" style={{ marginBottom: 12 }}>{notice}</div>}

      <div className="sp-grid" style={{ gap: 18 }}>
        <article className="sp-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>{label}</h2>
            <span className={status.cls}>{status.label}</span>
          </div>
          {current?.last_error && <p className="sp-subtle-copy">Last problem: {current.last_error}</p>}
          {current?.last_tested_at && (
            <p className="sp-subtle-copy">Last tested {new Date(current.last_tested_at).toLocaleString("en-IN")}</p>
          )}

          <fieldset disabled={!canEdit} className="sp-fieldset" title={canEdit ? undefined : VIEW_ONLY_HINT}>
            <form className="sp-form" onSubmit={save} autoComplete="off" style={{ marginTop: 12 }}>
              <Field id={`${tab}_provider`} label={`${label} service`} hint={provider.hint}>
                <select id={`${tab}_provider`} className="sp-select" value={form.provider} onChange={set("provider")}>
                  {PROVIDERS[tab].map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </Field>

              <ChannelFields channel={tab} form={form} set={set} saved={current} schoolName={school.name} />

              <p className="sp-subtle-copy">
                Keys, tokens and passwords are stored encrypted and are never shown again. Changing the service, sender,
                template or key needs a new test.
              </p>
              <div className="sp-row-actions">
                <button className="sp-btn sp-btn-primary" type="submit" disabled={!!busy}>
                  {busy === "save" ? "Saving..." : `Save ${label}`}
                </button>
                {current?.provider && hasSecret && (
                  <button
                    className="sp-btn sp-btn-danger"
                    type="button"
                    disabled={!!busy}
                    onClick={() => {
                      if (!window.confirm(`Disconnect ${school.name || "this school"}'s ${label}? Nothing will be sent by ${label} for this school until new details are saved.`)) return;
                      run("disconnect", () => superAdminService.disconnectSchoolCommunication(id, tab), "Disconnected.");
                    }}
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </form>
          </fieldset>

          {canTest && (
            <fieldset disabled={!canEdit} className="sp-fieldset" style={{ marginTop: 18 }}>
              <form
                className="sp-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  run("test", () => superAdminService.testSchoolCommunication(id, tab, testTo[tab].trim()), "Test sent.");
                }}
              >
                <Field id={`${tab}_test_to`} label={tab === "email" ? "Send a test email to" : `Send a test ${label} to (mobile number)`}>
                  <input
                    id={`${tab}_test_to`}
                    className="sp-input"
                    type={tab === "email" ? "email" : "tel"}
                    value={testTo[tab]}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTestTo((t) => ({ ...t, [tab]: value }));
                    }}
                    placeholder={tab === "email" ? "you@example.com" : "98765 43210"}
                    required
                  />
                </Field>
                <div className="sp-row-actions">
                  <button className="sp-btn sp-btn-secondary" type="submit" disabled={!!busy}>
                    {busy === "test" ? "Sending..." : `Send test ${tab === "email" ? "email" : label}`}
                  </button>
                </div>
              </form>
            </fieldset>
          )}
        </article>

        <article className="sp-card">
          <h2 style={{ marginTop: 0 }}>{help.title}</h2>
          <ol className="sp-subtle-copy" style={{ lineHeight: 1.7, paddingLeft: 18 }}>
            {help.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          <p className="sp-subtle-copy">{help.note}</p>
          <p className="sp-subtle-copy">
            When the test arrives, the status shows <strong>Working</strong> and the school's staff can send {label} from
            Lead, Admission and Fees. A school without a working {label} account gets a clear "not set up" message; no
            other school's account is ever used.
          </p>
        </article>
      </div>
    </section>
  );
}

export default SchoolCommunication;
