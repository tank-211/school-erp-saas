import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Mail, Send, X } from "lucide-react";
import {
  fetchEmailTemplates,
  resolveApplicationRecipient,
  sendEmailMessage,
} from "../services/emailService.js";
import { getUserData } from "../utils/authToken.js";

const TARGET_AUDIENCES = [
  { value: "lead_student", label: "Lead / Student" },
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
];

const applyVariables = (input, variables) => {
  const source = String(input || "");

  return Object.entries(variables).reduce((content, [key, value]) => {
    const token = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
    return content.replace(token, value ?? "");
  }, source);
};

const buildPreviewVariables = (application, recipient) => {
  const userData = getUserData() || {};

  return {
    first_name:
      recipient?.first_name ||
      application?.student_name?.split(" ")?.[0] ||
      application?.first_name ||
      "",
    last_name: recipient?.last_name || application?.last_name || "",
    student_name:
      application?.student_name ||
      [recipient?.first_name, recipient?.last_name].filter(Boolean).join(" ") ||
      "",
    school_name: userData.school_name || userData.school || "School",
    application_id: application?.id || "",
    recipient_email: recipient?.recipient_email || recipient?.email || "",
    recipient_name: recipient?.recipient_name || "",
    grade: application?.grade || "",
  };
};

export function CommunicationModal({
  open,
  onClose,
  selectedApplications = [],
  title = "Bulk Email",
  subtitle = "Review recipients, personalize the message, then send in batches.",
}) {
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [targetAudience, setTargetAudience] = useState("lead_student");
  const [livePreview, setLivePreview] = useState(true);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [resolvedRecipients, setResolvedRecipients] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendState, setSendState] = useState("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [logEntries, setLogEntries] = useState([]);

  const selectedCount = selectedApplications.length;
  const firstResolvedRecipient = useMemo(
    () => resolvedRecipients.find((item) => item.success)?.recipient || null,
    [resolvedRecipients],
  );
  const firstSelectedApplication = selectedApplications[0] || null;
  const previewVariables = useMemo(
    () => buildPreviewVariables(firstSelectedApplication, firstResolvedRecipient),
    [firstSelectedApplication, firstResolvedRecipient],
  );
  const previewSubject = livePreview
    ? applyVariables(subject, previewVariables)
    : subject;
  const previewMessage = livePreview
    ? applyVariables(message, previewVariables)
    : message;
  const canClose = sendState !== "sending";

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const list = await fetchEmailTemplates();
        if (!cancelled) {
          setTemplates(list || []);
        }
      } catch (error) {
        if (!cancelled) {
          setTemplates([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingTemplates(false);
        }
      }
    };

    loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !selectedApplications.length) {
      setResolvedRecipients([]);
      setProgress({ done: 0, total: 0 });
      setLogEntries([]);
      setSendError("");
      setSendState("idle");
      return;
    }

    let cancelled = false;

    const loadRecipients = async () => {
      setLoadingRecipients(true);
      setSendError("");

      const results = await Promise.all(
        selectedApplications.map(async (application) => {
          try {
            const recipient = await resolveApplicationRecipient(
              application.id,
              targetAudience,
            );

            return {
              applicationId: application.id,
              application,
              recipient,
              success: true,
            };
          } catch (error) {
            return {
              applicationId: application.id,
              application,
              error: error.message || "Failed to resolve recipient.",
              success: false,
            };
          }
        }),
      );

      if (!cancelled) {
        setResolvedRecipients(results);
        setLoadingRecipients(false);
      }
    };

    loadRecipients();

    return () => {
      cancelled = true;
    };
  }, [open, selectedApplications, targetAudience]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const template = templates.find((item) => String(item.id) === String(templateId));
    if (template) {
      setSubject(template.subject || "");
      setMessage(template.content || "");
    }
  }, [templateId, templates, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSendError("");
    setProgress({ done: 0, total: 0 });
    setLogEntries([]);
    setSendState("idle");
  }, [open]);

  const handleTemplateChange = (value) => {
    setTemplateId(value);
    const selectedTemplate = templates.find((item) => String(item.id) === String(value));
    if (selectedTemplate) {
      setSubject(selectedTemplate.subject || "");
      setMessage(selectedTemplate.content || "");
    }
  };

  const handleSend = async () => {
    setSendError("");

    if (!selectedApplications.length) {
      setSendError("Select at least one application before sending.");
      return;
    }

    if (!subject.trim()) {
      setSendError("Subject is required.");
      return;
    }

    if (!message.trim()) {
      setSendError("Message is required.");
      return;
    }

    setSendState("sending");
    setProgress({ done: 0, total: selectedApplications.length });
    setLogEntries([]);

    const batches = resolvedRecipients.length ? resolvedRecipients : selectedApplications.map((application) => ({ application, success: false }));

    let completed = 0;
    const nextLogs = [];

    for (const entry of batches) {
      const application = entry.application;

      try {
        const recipient = entry.success
          ? entry.recipient
          : await resolveApplicationRecipient(application.id, targetAudience);
        const variables = buildPreviewVariables(application, recipient);
        const finalSubject = applyVariables(subject, variables).trim();
        const finalMessage = applyVariables(message, variables).trim();

        if (!finalSubject) {
          throw new Error("Subject resolved to an empty value.");
        }

        if (!finalMessage) {
          throw new Error("Message resolved to an empty value.");
        }

        await sendEmailMessage({
          recipient_type: recipient.recipient_type,
          recipient_id: recipient.recipient_id,
          recipient_email: recipient.recipient_email,
          subject: finalSubject,
          message: finalMessage,
        });

        nextLogs.push({
          id: `${application.id}-${recipient.recipient_id}-success`,
          applicationId: application.id,
          recipient: recipient.recipient_name || recipient.recipient_email,
          email: recipient.recipient_email,
          status: "Success",
          detail: `Sent to ${recipient.recipient_email}`,
        });
      } catch (error) {
        nextLogs.push({
          id: `${application.id}-${Date.now()}-failed`,
          applicationId: application.id,
          recipient: application.student_name || `Application #${application.id}`,
          email: entry?.recipient?.recipient_email || "—",
          status: "Failed",
          detail: error.message || "Failed to send email.",
        });
      } finally {
        completed += 1;
        setProgress({ done: completed, total: selectedApplications.length });
        setLogEntries([...nextLogs]);
      }
    }

    setSendState("completed");
  };

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" style={{ zIndex: 1200 }}>
      <div
        className="modal"
        style={{ maxWidth: 860, width: "min(860px, calc(100vw - 32px))", position: "relative" }}
      >
        <div className="modal-header">
          <div>
            <div className="modal-title">{title}</div>
            <div style={{ fontSize: 13, color: "var(--gray-500)" }}>{subtitle}</div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            disabled={!canClose}
            title={canClose ? "Close" : "Wait for the batch to complete"}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: "grid", gap: 16 }}>
          <div className="card" style={{ border: "1px solid var(--gray-200)" }}>
            <div className="card-body" style={{ display: "grid", gap: 14 }}>
              <div className="grid-2 gap-3">
                <div className="form-group">
                  <label className="form-label">Target Audience</label>
                  <select
                    className="form-select"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    disabled={sendState === "sending"}
                  >
                    {TARGET_AUDIENCES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Template</label>
                  <select
                    className="form-select"
                    value={templateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    disabled={sendState === "sending" || loadingTemplates}
                  >
                    <option value="">Manual message</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Live Preview</div>
                  <div style={{ fontSize: 12, color: "var(--gray-500)" }}>
                    Replace variables using the first selected recipient.
                  </div>
                </div>
                <label className="toggle" style={{ display: "inline-flex", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={livePreview}
                    onChange={(e) => setLivePreview(e.target.checked)}
                    disabled={sendState === "sending"}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
          </div>

          <div className="grid-2 gap-3">
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                className="form-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                disabled={sendState === "sending"}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Recipient Email</label>
              <div
                className="form-input"
                style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 42 }}
              >
                <Mail size={14} style={{ color: "var(--gray-400)", flexShrink: 0 }} />
                <span style={{ color: "var(--gray-800)" }}>
                  {loadingRecipients
                    ? "Resolving recipients..."
                    : firstResolvedRecipient?.recipient_email || "Waiting for recipient resolution"}
                </span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea
              className="form-textarea"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={sendState === "sending"}
            />
          </div>

          <div className="card" style={{ border: "1px solid var(--gray-200)" }}>
            <div className="card-body" style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Preview</div>
                  <div style={{ fontSize: 12, color: "var(--gray-500)" }}>
                    {selectedCount} application{selectedCount === 1 ? "" : "s"} selected
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--gray-500)" }}>
                  {loadingTemplates ? "Loading templates..." : "Ready"}
                </div>
              </div>
              <div style={{ padding: 12, borderRadius: 12, background: "var(--gray-50)", border: "1px solid var(--gray-200)" }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{previewSubject || "Subject preview"}</div>
                <div style={{ whiteSpace: "pre-wrap", color: "var(--gray-700)" }}>
                  {previewMessage || "Message preview"}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--gray-500)" }}>
                {livePreview && firstResolvedRecipient
                  ? `Previewing variables for ${firstResolvedRecipient.recipient_name || firstResolvedRecipient.recipient_email}.`
                  : "Live preview is off."}
              </div>
            </div>
          </div>

          <div className="card" style={{ border: "1px solid var(--gray-200)" }}>
            <div className="card-header">
              <div className="card-title">Resolved Recipients</div>
              <div style={{ fontSize: 13, color: "var(--gray-500)" }}>
                {resolvedRecipients.filter((item) => item.success).length} of {selectedCount} ready
              </div>
            </div>
            <div className="card-body" style={{ display: "grid", gap: 8, maxHeight: 220, overflow: "auto" }}>
              {resolvedRecipients.length === 0 ? (
                <div style={{ color: "var(--gray-500)", fontSize: 13 }}>
                  Recipient resolution will appear here after the applications are loaded.
                </div>
              ) : (
                resolvedRecipients.map((entry) => (
                  <div
                    key={entry.applicationId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid var(--gray-200)",
                      background: entry.success ? "#f8fffb" : "#fff7f7",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        Application #{entry.applicationId}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--gray-500)" }}>
                        {entry.success
                          ? `${entry.recipient.recipient_name || entry.recipient.recipient_email} • ${entry.recipient.recipient_email}`
                          : entry.error}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: entry.success ? "var(--green)" : "var(--red)" }}>
                      {entry.success ? "Ready" : "Failed"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {sendError && (
            <div style={{ color: "var(--red)", fontSize: 13 }}>
              {sendError}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button className="btn btn-outline" onClick={onClose} disabled={!canClose}>
              Close
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={sendState === "sending" || !selectedApplications.length}
            >
              {sendState === "sending" ? (
                <>
                  <Loader2 size={15} style={{ marginRight: 8, animation: "spin 1s linear infinite" }} />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={15} style={{ marginRight: 8 }} />
                  Send Bulk Email
                </>
              )}
            </button>
          </div>
        </div>

        {sendState === "sending" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,255,255,0.88)",
              backdropFilter: "blur(3px)",
              borderRadius: 16,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              zIndex: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }} />
              <div>
                <div style={{ fontWeight: 700 }}>Sending {progress.done} of {progress.total}</div>
                <div style={{ fontSize: 12, color: "var(--gray-500)" }}>
                  Progress updates appear in real time below.
                </div>
              </div>
            </div>

            <div style={{ height: 10, background: "var(--gray-200)", borderRadius: 9999, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%`,
                  background: "linear-gradient(90deg, var(--primary), var(--blue))",
                  transition: "width 0.2s ease",
                }}
              />
            </div>

            <div style={{ flex: 1, overflow: "auto", display: "grid", gap: 8 }}>
              {logEntries.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid var(--gray-200)",
                    background: entry.status === "Success" ? "#f0fdf4" : "#fff1f2",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {entry.recipient}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--gray-500)" }}>
                      {entry.email}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--gray-600)", marginTop: 4 }}>
                      {entry.detail}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: entry.status === "Success" ? "var(--green)" : "var(--red)" }}>
                    {entry.status}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-primary" onClick={onClose} disabled={sendState !== "completed"}>
                <CheckCircle2 size={15} style={{ marginRight: 8 }} />
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
