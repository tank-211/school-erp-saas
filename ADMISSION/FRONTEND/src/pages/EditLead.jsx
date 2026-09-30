// ── EditLead.jsx ────────────────────────────────────────────
// Edits the fields a lead actually stores (name, contact, class, source,
// status, counselor, notes). Classes come from School Setup and counselors
// from the school's active staff.
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import "../style.css";
import { getLeadById, updateLead } from "../services/leadService.js";
import { fetchSchoolCounselors } from "../services/schoolService.js";
import { useSchoolSetup } from "../hooks/useSchoolSetup";
import { useAuth } from "../context/AuthContext.jsx";

const STATUSES = [
  ["pending", "Pending"],
  ["contacted", "Contacted"],
  ["interested", "Interested"],
  ["not_interested", "Not Interested"],
  ["converted", "Converted"],
  ["lost", "Lost"],
];

const SOURCES = ["Website Form", "Google Ads", "Facebook", "Referral", "Walk-in", "WhatsApp", "Other"];

export function EditLead() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { classNames } = useSchoolSetup();
  const [counselors, setCounselors] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLeadById(id).then((result) => {
      if (!result.success) {
        setError(result.message);
        return;
      }
      const lead = result.data || {};
      setForm({
        first_name: lead.first_name || "",
        last_name: lead.last_name || "",
        phone: lead.phone || "",
        email: lead.email || "",
        desired_class: lead.desired_class || "",
        source: lead.source || "",
        follow_up_status: lead.follow_up_status || "pending",
        assigned_to: lead.assigned_to ? String(lead.assigned_to) : "",
        notes: lead.notes || "",
      });
    });
  }, [id]);

  useEffect(() => {
    if (user?.school_id) fetchSchoolCounselors(user.school_id).then(setCounselors);
  }, [user?.school_id]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    if (!form.first_name.trim()) return setError("Student first name is required");
    if (!form.phone.trim()) return setError("Phone number is required");
    setSaving(true);
    setError("");
    const result = await updateLead(id, {
      ...form,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      desired_class: form.desired_class || null,
      source: form.source || null,
      assigned_to: form.assigned_to || null,
    });
    setSaving(false);
    if (!result.success) return setError(result.message);
    navigate(`/leads/${id}`);
  };

  // Keep a class or source that is not in today's lists (older leads) selectable
  const classOptions = form?.desired_class && !classNames.includes(form.desired_class)
    ? [form.desired_class, ...classNames]
    : classNames;
  const sourceOptions = form?.source && !SOURCES.includes(form.source) ? [form.source, ...SOURCES] : SOURCES;

  return (
    <div className="page-sm" style={{ maxWidth: 760 }}>
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="page-title mb-1">Edit Lead</h1>
      <p className="page-sub mb-5">Update the prospective student's details</p>

      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "var(--r)", padding: "12px 16px", marginBottom: 20, display: "flex", gap: 12 }}>
          <AlertCircle size={20} style={{ color: "#dc2626", flexShrink: 0 }} />
          <div style={{ color: "#991b1b", fontSize: 14 }}>{error}</div>
        </div>
      )}

      {!form ? (
        !error && <div className="loading">Loading lead...</div>
      ) : (
        <form className="card" onSubmit={save}>
          <div className="card-body">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Student first name *</label>
                <input className="form-input" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Student last name</label>
                <input className="form-input" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input className="form-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Grade</label>
                <select className="form-select" value={form.desired_class} onChange={(e) => set("desired_class", e.target.value)}>
                  <option value="">Select grade</option>
                  {classOptions.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Lead source</label>
                <select className="form-select" value={form.source} onChange={(e) => set("source", e.target.value)}>
                  <option value="">Select source</option>
                  {sourceOptions.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.follow_up_status} onChange={(e) => set("follow_up_status", e.target.value)}>
                  {STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Counselor</label>
                <select className="form-select" value={form.assigned_to} onChange={(e) => set("assigned_to", e.target.value)}>
                  <option value="">Unassigned</option>
                  {counselors.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}{c.role === "admin" ? " (Admin)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" rows={5} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              <Save size={14} /> {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default EditLead;
