import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Plus, Mail, MessageSquare, Eye, BarChart2, X } from "lucide-react";
import { fetchEmailLogs, fetchEmailStats } from "../services/emailService.js";
import {
  fetchAllCommunicationRecipients,
  fetchCampaigns,
  createCampaign,
  sendCampaignNow,
  sendComposeEmail,
  fetchSmsLogs,
  fetchWhatsappLogs,
} from "../services/communicationService.js";
import { getToken } from "../utils/authToken.js";
import "../style.css";

// Dynamic API data used instead of static mock variables

const tagColor = (t) =>
  ({
    Onboarding: "badge-blue",
    "Follow-up": "badge-orange",
    Reminder: "badge-yellow",
    Information: "badge-gray",
  })[t] || "badge-gray";

const statusColor = (s) =>
  ({
    completed: "badge-green",
    active: "badge-blue",
    scheduled: "badge-orange",
  })[s] || "badge-gray";
const msgStatusColor = (s) =>
  ({ delivered: "badge-green", read: "badge-blue", sent: "badge-teal" })[s] ||
  "badge-gray";

axios.defaults.baseURL = import.meta.env.VITE_API_URL || "";

export function Communication() {
  const [tab, setTab] = useState("email");
  const [compose, setCompose] = useState(false);
  const [campaign, setCampaign] = useState(false);
  const [campaignNotice, setCampaignNotice] = useState("");

  const [emailLogs, setEmailLogs] = useState([]);
  const [emailStats, setEmailStats] = useState({
    total_emails: 0,
    opened: 0,
    clicked: 0,
    open_rate: 0,
    click_rate: 0,
  });
  const [stats, setStats] = useState({
    smsCount: 0,
    whatsappCount: 0,
    emailCount: 0,
  });
  const [templates, setTemplates] = useState([]);
  const [emailRecipients, setEmailRecipients] = useState([]);
  const [loadingEmailData, setLoadingEmailData] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sendInProgress, setSendInProgress] = useState(false);
  const [pageError, setPageError] = useState("");
  const [composeError, setComposeError] = useState("");
  const [templateError, setTemplateError] = useState("");
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  const [composeForm, setComposeForm] = useState({
    template_id: "",
    subject: "",
    message: "",
    recipient_search: "",
    selectedRecipientKeys: [],
    scheduleType: "now",
    scheduledDate: "",
    attachments: [],
  });

  const [templateForm, setTemplateForm] = useState({
    name: "",
    category: "",
    subject: "",
    content: "",
  });

  const selectedRecipients = useMemo(
    () =>
      emailRecipients.filter((recipient) =>
        composeForm.selectedRecipientKeys.includes(
          `${recipient.recipient_type}:${recipient.id}`,
        ),
      ),
    [emailRecipients, composeForm.selectedRecipientKeys],
  );

  const selectedRecipientEmails = useMemo(
    () =>
      selectedRecipients
        .map((recipient) => recipient.email)
        .filter((email) => Boolean(email && String(email).trim())),
    [selectedRecipients],
  );

  const formatDateTime = (value) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString();
  };

  const loadEmailData = async () => {
    setLoadingEmailData(true);
    setPageError("");

    try {
      const [logsResponse, statsResponse] = await Promise.all([
        fetchEmailLogs({ limit: 20 }),
        fetchEmailStats(),
      ]);

      setEmailLogs(logsResponse.logs || []);
      setEmailStats(statsResponse || {});
    } catch (error) {
      setPageError(error.message || "Failed to load email data.");
      setEmailLogs([]);
    } finally {
      setLoadingEmailData(false);
    }
  };

  const [smsData, setSmsData] = useState([]);
  const [whatsappData, setWhatsappData] = useState([]);
  const [campaignData, setCampaignData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAxiosConfig = () => {
    const token = getToken();

    if (!token) {
      return {};
    }

    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const fetchStats = async () => {
    setLoadingStats(true);

    try {
      const config = getAxiosConfig();
      const [channelRes, emailStatsRes] = await Promise.all([
        axios.get("/api/communication/channel-stats", config),
        axios.get("/api/email/stats", config),
      ]);

      // Only messages that actually went out are counted
      setStats({
        smsCount: Number(channelRes?.data?.data?.sms || 0),
        whatsappCount: Number(channelRes?.data?.data?.whatsapp || 0),
        emailCount: Number(emailStatsRes?.data?.data?.total_emails || 0),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    setTemplateError("");

    try {
      const config = getAxiosConfig();
      const res = await axios.get("/api/email/templates", config);
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      setTemplates(list);
    } catch (err) {
      console.error(err);
      setTemplateError("Failed to fetch templates.");
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setTemplateForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const createTemplate = async () => {
    if (
      !templateForm.name.trim() ||
      !templateForm.category.trim() ||
      !templateForm.subject.trim() ||
      !templateForm.content.trim()
    ) {
      setTemplateError("All template fields are required.");
      return;
    }

    setCreatingTemplate(true);
    setTemplateError("");

    try {
      const config = getAxiosConfig();
      const res = await axios.post(
        "/api/email/templates",
        {
          name: templateForm.name.trim(),
          category: templateForm.category.trim(),
          subject: templateForm.subject.trim(),
          content: templateForm.content.trim(),
        },
        config,
      );

      if (res?.data?.success) {
        alert("Template created successfully");
        await fetchTemplates();
        await fetchStats();
        setTemplateForm({
          name: "",
          category: "",
          subject: "",
          content: "",
        });
        setTemplateModalOpen(false);
      } else {
        setTemplateError(res?.data?.message || "Error creating template.");
      }
    } catch (err) {
      console.error(err);
      setTemplateError(
        err?.response?.data?.message || "Error creating template.",
      );
      alert("Error creating template");
    } finally {
      setCreatingTemplate(false);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);

      const [smsRes, waRes, campRes] = await Promise.all([
        fetchSmsLogs({ limit: 20 }),
        fetchWhatsappLogs({ limit: 20 }),
        fetchCampaigns(),
      ]);

      setSmsData(smsRes.logs || []);
      setWhatsappData(waRes.logs || []);
      setCampaignData(campRes || []);
    } catch (err) {
      setError(err?.message || "Failed to load communication data");
    } finally {
      setLoading(false);
    }
  };

  const loadRecipients = async (search = "") => {
    setLoadingRecipients(true);
    setComposeError("");

    try {
      const recipients = await fetchAllCommunicationRecipients(search);
      setEmailRecipients(recipients || []);
    } catch (error) {
      setComposeError(error.message || "Failed to load recipients.");
      setEmailRecipients([]);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const openComposeModal = async () => {
    setCompose(true);
    setComposeError("");
    await loadRecipients(composeForm.recipient_search);
  };

  const closeComposeModal = () => {
    setCompose(false);
    setComposeError("");
    setComposeForm({
      template_id: "",
      subject: "",
      message: "",
      recipient_search: "",
      selectedRecipientKeys: [],
      scheduleType: "now",
      scheduledDate: "",
      attachments: [],
    });
    setEmailRecipients([]);
  };

  const handleTemplateChange = (templateId) => {
    const selectedTemplate = templates.find(
      (template) => String(template.id) === String(templateId),
    );

    setComposeForm((prev) => ({
      ...prev,
      template_id: templateId,
      subject: selectedTemplate?.subject || prev.subject,
      message: selectedTemplate?.content || prev.message,
    }));
  };

  const handleSendEmail = async () => {
    setComposeError("");

    if (!selectedRecipientEmails.length) {
      setComposeError(
        "Please select at least one recipient with a valid email.",
      );
      return;
    }

    if (!composeForm.subject?.trim()) {
      setComposeError("Subject is required.");
      return;
    }

    if (!composeForm.message?.trim() && !composeForm.template_id) {
      setComposeError("Message is required when template is not selected.");
      return;
    }

    if (composeForm.scheduleType === "later" && !composeForm.scheduledDate) {
      setComposeError("Please select a date and time for scheduled email.");
      return;
    }

    const scheduledAt =
      composeForm.scheduleType === "later" ? new Date(composeForm.scheduledDate) : null;
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
      setComposeError("Please select a valid date and time for scheduled email.");
      return;
    }
    if (scheduledAt && scheduledAt.getTime() <= Date.now()) {
      setComposeError("The scheduled time must be in the future.");
      return;
    }

    setSendInProgress(true);

    try {
      const formData = new FormData();
      formData.append("recipients", selectedRecipientEmails.join(","));
      formData.append("subject", composeForm.subject.trim());
      formData.append("message", composeForm.message.trim());

      // Every selected recipient, so the backend sends and logs one email each
      const withEmail = selectedRecipients.filter((recipient) =>
        Boolean(recipient.email && String(recipient.email).trim()),
      );
      formData.append(
        "recipient_refs",
        withEmail.map((recipient) => `${recipient.recipient_type}:${recipient.id}`).join(","),
      );
      formData.append("recipient_id", withEmail[0].id);
      formData.append("recipient_type", withEmail[0].recipient_type);

      formData.append("scheduleType", composeForm.scheduleType);
      if (composeForm.scheduleType === "later") {
        // datetime-local is the browser's local time with no offset; the server may
        // run in UTC, so send the exact instant.
        formData.append("scheduledDate", scheduledAt.toISOString());
      }

      Array.from(composeForm.attachments || []).forEach((file) => {
        formData.append("attachments", file);
      });

      const result = await sendComposeEmail(formData);

      if (result?.failed?.length) {
        // Partly sent: keep the form open and say who did not get it
        setComposeError(
          `Sent to ${result.sent_count} recipient(s). Not sent to: ${result.failed
            .map((f) => `${f.email} (${f.error})`)
            .join("; ")}`,
        );
        await loadEmailData();
        return;
      }

      closeComposeModal();
      await loadEmailData();
    } catch (error) {
      setComposeError(error.message || "Failed to send email.");
    } finally {
      setSendInProgress(false);
    }
  };

  useEffect(() => {
    loadEmailData();
    fetchAllData();
    fetchStats();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (!compose) {
      return;
    }

    loadRecipients(composeForm.recipient_search);
  }, [compose]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Communication Hub</h1>
          <p className="page-sub">
            Manage all parent communications in one place
          </p>
        </div>
        <button className="btn btn-primary" onClick={openComposeModal}>
          <Plus size={15} /> New Message
        </button>
      </div>

      {/* Stats */}
      <div className="grid-4 mb-5">
        {[
          {
            label: "Emails Sent",
            value: loadingStats ? "..." : `${stats.emailCount}`,
            icon: Mail,
            color: "var(--blue-bg)",
            ic: "var(--blue)",
          },
          {
            label: "SMS Sent",
            value: loadingStats ? "..." : `${stats.smsCount}`,
            icon: MessageSquare,
            color: "var(--green-bg)",
            ic: "var(--green)",
          },
          {
            label: "WhatsApp Sent",
            value: loadingStats ? "..." : `${stats.whatsappCount}`,
            icon: Eye,
            color: "var(--purple-bg)",
            ic: "var(--purple)",
          },
          {
            label: "Click Rate",
            value: loadingEmailData ? "..." : `${emailStats.click_rate || 0}%`,
            icon: BarChart2,
            color: "var(--orange-bg)",
            ic: "var(--orange)",
          },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div className="stat-card" key={i}>
              <div className="stat-wide">
                <div className="stat-icon" style={{ background: s.color }}>
                  <Icon size={20} style={{ color: s.ic }} />
                </div>
                <div>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value">{s.value}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="comm-tabs">
        {["email", "sms", "whatsapp", "campaigns"].map((t) => (
          <div
            key={t}
            className={`comm-tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>

      {/* Tab content */}
      {campaignNotice && (
        <div
          style={{ background: "#eef2ff", border: "1px solid #c7d2fe", color: "#3730a3", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 14, display: "flex", justifyContent: "space-between", gap: 12 }}
        >
          <span>{campaignNotice}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setCampaignNotice("")}>Dismiss</button>
        </div>
      )}

      {tab !== "campaigns" ? (
        <div className="flex gap-5" style={{ flexWrap: "wrap" }}>
          {/* Messages */}
          <div className="card flex-1" style={{ minWidth: 300 }}>
            <div className="card-header">
              <div className="card-title">
                {tab === "email"
                  ? "Recent Messages"
                  : tab === "sms"
                    ? "SMS Messages"
                    : "WhatsApp Messages"}
              </div>
            </div>
            <div className="card-body">
              {tab === "email" && pageError && (
                <div
                  style={{
                    marginBottom: 12,
                    color: "var(--red)",
                    fontSize: 13,
                  }}
                >
                  {pageError}
                </div>
              )}
              <table className="table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>{tab === "email" ? "Subject" : "Message"}</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tab === "sms" && !smsData.length && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center" }}>
                        <p>No SMS data found</p>
                      </td>
                    </tr>
                  )}
                  {tab === "whatsapp" && !whatsappData.length && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center" }}>
                        <p>No WhatsApp data found</p>
                      </td>
                    </tr>
                  )}
                  {tab === "email" &&
                    !loadingEmailData &&
                    !emailLogs.length && (
                      <tr>
                        <td
                          colSpan={4}
                          style={{
                            textAlign: "center",
                            color: "var(--gray-500)",
                          }}
                        >
                          <p>No email logs found</p>
                        </td>
                      </tr>
                    )}

                  {(tab === "email"
                    ? emailLogs.map((item) => ({
                        recipient:
                          item.recipient_name ||
                          `Recipient #${item.recipient_id}`,
                        subject: item.subject,
                        message: item.message,
                        status: item.status || "sent",
                        date: formatDateTime(item.sent_at),
                      }))
                    : tab === "sms"
                      ? smsData.map((item) => ({
                          recipient: item.recipient_name || "Unknown",
                          message: item.message || "-",
                          status: item.status || "sent",
                          date: new Date(item.sent_at).toLocaleString(),
                        }))
                      : whatsappData.map((item) => ({
                          recipient: item.recipient_name || "Unknown",
                          message: item.message || "-",
                          status: item.status || "sent",
                          date: new Date(item.sent_at).toLocaleString(),
                        }))
                  ).map((m, i) => (
                    <tr key={i}>
                      <td className="td-bold">{m.recipient}</td>
                      <td>{m.subject || m.message}</td>
                      <td>
                        <span
                          className={`badge ${msgStatusColor(m.status)}`}
                          style={{ textTransform: "capitalize" }}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: "var(--gray-500)" }}>
                        {m.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Templates */}
          <div className="card" style={{ width: 300 }}>
            <div className="card-header">
              <div className="card-title">Templates</div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => {
                  setTemplateError("");
                  setTemplateModalOpen(true);
                }}
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="card-body">
              {loadingTemplates && (
                <div style={{ color: "var(--gray-500)", fontSize: 13 }}>
                  Loading templates...
                </div>
              )}
              {templates.map((template) => (
                <div className="template-card" key={template.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="template-name">{template.name}</span>
                    <span
                      className={`badge ${tagColor(template.category || "General")}`}
                      style={{ fontSize: 11 }}
                    >
                      {template.category || "General"}
                    </span>
                  </div>
                  <div className="template-desc">
                    {template.subject || template.content || "-"}
                  </div>
                  <div className="template-meta">
                    Last used:{" "}
                    {template.last_used_at
                      ? formatDateTime(template.last_used_at)
                      : "Never used"}
                  </div>
                </div>
              ))}
              {!loadingTemplates && templates.length === 0 && (
                <div style={{ color: "var(--gray-500)", fontSize: 13 }}>
                  No templates created yet.
                </div>
              )}
              {templateError && (
                <div style={{ color: "var(--red)", fontSize: 13 }}>
                  {templateError}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <div className="card-title"></div>
            <button
              className="btn btn-primary"
              onClick={() => setCampaign({})}
            >
              <Plus size={15} /> Create Campaign
            </button>
          </div>
          <div className="card-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Campaign Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {campaignData.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center" }}>
                      <p>No Campaigns data found</p>
                    </td>
                  </tr>
                )}
                {campaignData.map((c, i) => (
                  <tr key={c.id || i}>
                    <td className="td-bold">{c.name}</td>
                    <td>
                      <span
                        className={`badge ${c.channel === "email" ? "badge-blue" : c.channel === "sms" ? "badge-green" : "badge-teal"}`}
                      >
                        {String(c.channel).toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${statusColor(c.status)}`}
                        style={{ textTransform: "capitalize" }}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: "var(--gray-500)" }}>
                      {new Date(c.created_at).toLocaleString()}
                    </td>
                    <td>
                      {c.status !== "running" && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setCampaign({ existing: c })}
                        >
                          Send
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {compose && (
        <div className="modal-backdrop" onClick={closeComposeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Compose Email</div>
                <div style={{ fontSize: 13, color: "var(--gray-500)" }}>
                  Send email to parents or leads
                </div>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={closeComposeModal}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body space-y-4">
              <div className="form-group">
                <label className="form-label">Search Recipients</label>
                <input
                  className="form-input"
                  value={composeForm.recipient_search}
                  onChange={(e) =>
                    setComposeForm((prev) => ({
                      ...prev,
                      recipient_search: e.target.value,
                    }))
                  }
                  placeholder="Search by name, phone or email"
                />
                <button
                  className="btn btn-outline"
                  style={{ marginTop: 8 }}
                  type="button"
                  onClick={() => loadRecipients(composeForm.recipient_search)}
                >
                  {loadingRecipients ? "Searching..." : "Search"}
                </button>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Recipients <span className="req">*</span>
                </label>
                <div
                  style={{
                    border: "1px solid var(--gray-200)",
                    borderRadius: 8,
                    maxHeight: 200,
                    overflowY: "auto",
                    padding: 10,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  {emailRecipients.length === 0 && (
                    <div style={{ fontSize: 13, color: "var(--gray-500)" }}>
                      No recipients found.
                    </div>
                  )}
                  {emailRecipients.map((recipient) => {
                    const key = `${recipient.recipient_type}:${recipient.id}`;
                    const isChecked =
                      composeForm.selectedRecipientKeys.includes(key);

                    return (
                      <label
                        key={key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setComposeForm((prev) => ({
                              ...prev,
                              selectedRecipientKeys: checked
                                ? [...prev.selectedRecipientKeys, key]
                                : prev.selectedRecipientKeys.filter(
                                    (value) => value !== key,
                                  ),
                            }));
                          }}
                        />
                        <span style={{ fontSize: 13 }}>
                          {(recipient.name || `Recipient #${recipient.id}`) +
                            ` (${recipient.recipient_type})`}
                          {recipient.email
                            ? ` - ${recipient.email}`
                            : " - No Email"}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {!!selectedRecipientEmails.length && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: "var(--gray-500)",
                    }}
                  >
                    {selectedRecipientEmails.length} recipient(s) selected
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Template</label>
                <select
                  className="form-select"
                  value={composeForm.template_id}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                >
                  <option value="">Select a template (optional)</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Subject <span className="req">*</span>
                </label>
                <input
                  className="form-input"
                  placeholder="Email subject"
                  value={composeForm.subject}
                  onChange={(e) =>
                    setComposeForm((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Message <span className="req">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Type your message..."
                  value={composeForm.message}
                  onChange={(e) =>
                    setComposeForm((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Attachments</label>
                <input
                  className="form-input"
                  type="file"
                  multiple
                  onChange={(e) =>
                    setComposeForm((prev) => ({
                      ...prev,
                      attachments: Array.from(e.target.files || []),
                    }))
                  }
                />
                {!!composeForm.attachments.length && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: "var(--gray-500)",
                    }}
                  >
                    {composeForm.attachments.length} file(s) selected
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Schedule</label>
                <select
                  className="form-select"
                  value={composeForm.scheduleType}
                  onChange={(e) =>
                    setComposeForm((prev) => ({
                      ...prev,
                      scheduleType: e.target.value,
                    }))
                  }
                >
                  <option value="now">Send Now</option>
                  <option value="later">Schedule for Later</option>
                </select>
              </div>
              {composeForm.scheduleType === "later" && (
                <div className="form-group">
                  <label className="form-label">
                    Scheduled Date &amp; Time
                  </label>
                  <input
                    className="form-input"
                    type="datetime-local"
                    value={composeForm.scheduledDate}
                    onChange={(e) =>
                      setComposeForm((prev) => ({
                        ...prev,
                        scheduledDate: e.target.value,
                      }))
                    }
                  />
                </div>
              )}
              {composeError && (
                <div style={{ color: "var(--red)", fontSize: 13 }}>
                  {composeError}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button className="btn btn-outline" onClick={closeComposeModal}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSendEmail}
                  disabled={sendInProgress}
                >
                  {sendInProgress
                    ? "Sending..."
                    : composeForm.scheduleType === "later"
                      ? "Schedule Email"
                      : "Send Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {templateModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setTemplateModalOpen(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Add Template</div>
                <div style={{ fontSize: 13, color: "var(--gray-500)" }}>
                  Create a reusable email template
                </div>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setTemplateModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body space-y-4">
              <div className="form-group">
                <label className="form-label">
                  Template Name <span className="req">*</span>
                </label>
                <input
                  className="form-input"
                  name="name"
                  value={templateForm.name}
                  onChange={handleChange}
                  placeholder="e.g. Admission Welcome"
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Category <span className="req">*</span>
                </label>
                <input
                  className="form-input"
                  name="category"
                  value={templateForm.category}
                  onChange={handleChange}
                  placeholder="e.g. Onboarding"
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Subject <span className="req">*</span>
                </label>
                <input
                  className="form-input"
                  name="subject"
                  value={templateForm.subject}
                  onChange={handleChange}
                  placeholder="Email subject"
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Content <span className="req">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows={5}
                  name="content"
                  value={templateForm.content}
                  onChange={handleChange}
                  placeholder="Write your template content"
                />
              </div>
              {templateError && (
                <div style={{ color: "var(--red)", fontSize: 13 }}>
                  {templateError}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  className="btn btn-outline"
                  onClick={() => setTemplateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={createTemplate}
                  disabled={creatingTemplate}
                >
                  {creatingTemplate ? "Saving..." : "Save Template"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / send campaign */}
      {campaign && (
        <CampaignModal
          existing={campaign.existing || null}
          onClose={() => setCampaign(false)}
          onDone={(message) => {
            setCampaign(false);
            setCampaignNotice(message);
            fetchAllData();
            fetchStats();
          }}
        />
      )}
    </div>
  );
}

const AUDIENCES = [
  { value: "lead", label: "All leads" },
  { value: "parent", label: "All parents" },
  { value: "student", label: "All students" },
];

// Creates a campaign and/or sends it. Email goes through the school mailbox;
// SMS and WhatsApp report clearly when no provider is connected.
function CampaignModal({ existing, onClose, onDone }) {
  const [form, setForm] = useState({
    name: existing?.name || "",
    channel: existing?.channel || "email",
    audience_type: "lead",
    subject: "",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const run = async (send) => {
    setError("");
    if (!existing && !form.name.trim()) return setError("Campaign name is required");
    if (send && !form.message.trim()) return setError("Message is required");
    if (send && form.channel === "email" && !form.subject.trim()) return setError("Subject is required for email");
    setBusy(true);
    try {
      let target = existing;
      if (!target) {
        target = await createCampaign({
          name: form.name.trim(),
          channel: form.channel,
          audience_type: form.audience_type,
        });
      }
      if (!send) return onDone(`Campaign "${target.name}" saved as a draft.`);
      const result = await sendCampaignNow(target.id, {
        audience_type: form.audience_type,
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      const failed = result?.failed_count || 0;
      const firstError = (result?.results || []).find((r) => r.error)?.error;
      onDone(
        failed
          ? `Sent to ${result.sent_count} of ${result.total_recipients}. ${failed} failed${firstError ? `: ${firstError}` : "."}`
          : `Sent to all ${result?.sent_count || 0} recipients.`,
      );
    } catch (err) {
      setError(err.message || "Campaign failed");
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{existing ? `Send "${existing.name}"` : "Create Campaign"}</div>
            <div style={{ fontSize: 13, color: "var(--gray-500)" }}>
              {existing ? "Choose who receives it and write the message" : "Set up a new communication campaign"}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body space-y-4">
          {error && <div style={{ color: "var(--red)", fontSize: 13 }}>{error}</div>}
          {!existing && (
            <>
              <div className="form-group">
                <label className="form-label">Campaign Name <span className="req">*</span></label>
                <input className="form-input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Open house invite" />
              </div>
              <div className="form-group">
                <label className="form-label">Channel <span className="req">*</span></label>
                <select className="form-select" value={form.channel} onChange={(e) => set("channel", e.target.value)}>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label">Audience <span className="req">*</span></label>
            <select className="form-select" value={form.audience_type} onChange={(e) => set("audience_type", e.target.value)}>
              {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          {form.channel === "email" && (
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input className="form-input" value={form.subject} onChange={(e) => set("subject", e.target.value)} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea className="form-textarea" rows={5} value={form.message} onChange={(e) => set("message", e.target.value)} />
          </div>
          {form.channel !== "email" && (
            <div style={{ fontSize: 12, color: "var(--gray-500)" }}>
              SMS and WhatsApp need a messaging provider. Until one is connected, sends are recorded as failed.
            </div>
          )}
          <div className="flex justify-end gap-3">
            {!existing && (
              <button className="btn btn-outline" disabled={busy} onClick={() => run(false)}>Save draft</button>
            )}
            <button className="btn btn-primary" disabled={busy} onClick={() => run(true)}>
              {busy ? "Working..." : existing ? "Send now" : "Create & send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
