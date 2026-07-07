import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, X, AlertCircle, CheckCircle } from "lucide-react";
import "../style.css";
import { createLead } from "../services/leadService.js";
import { getToken } from "../utils/authToken.js";

export function AddLead() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    studentName: "",
    dob: "",
    gender: "",
    grade: "",
    currentSchool: "",
    fatherName: "",
    fatherOccupation: "",
    fatherEmail: "",
    fatherPhone: "",
    motherName: "",
    motherOccupation: "",
    motherEmail: "",
    motherPhone: "",
    address: "",
    city: "",
    state: "",
    pin: "",
    leadSource: "",
    referredBy: "",
    counselor: "",
    priority: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate required fields
    if (!form.studentName.trim()) {
      setError("Student name is required");
      return;
    }
    if (!form.fatherPhone.trim()) {
      setError("Phone number is required");
      return;
    }
    if (!form.grade) {
      setError("Grade is required");
      return;
    }

    // Check authentication
    if (!getToken()) {
      setError("Not authenticated. Please login first.");
      return;
    }

    setLoading(true);
    try {
      const result = await createLead(form);

      if (result.success) {
        setSuccess("Lead created successfully! Redirecting...");
        setTimeout(() => {
          navigate("/leads");
        }, 1500);
      } else {
        setError(result.message || "Failed to create lead");
      }
    } catch (err) {
      setError(err.message || "An error occurred while creating the lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-sm" style={{ maxWidth: 860 }}>
      <button className="back-btn" onClick={() => navigate("/leads")}>
        <ArrowLeft size={16} /> Back to Leads
      </button>
      <h1 className="page-title mb-1">Add New Lead</h1>
      <p className="page-sub mb-5">
        Enter the details of the prospective student and family
      </p>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            borderRadius: "var(--r)",
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <AlertCircle size={20} style={{ color: "#dc2626", flexShrink: 0 }} />
          <div style={{ color: "#991b1b", fontSize: 14 }}>{error}</div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div
          style={{
            background: "#dcfce7",
            border: "1px solid #86efac",
            borderRadius: "var(--r)",
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <CheckCircle size={20} style={{ color: "#16a34a", flexShrink: 0 }} />
          <div style={{ color: "#15803d", fontSize: 14 }}>{success}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Student Info */}
        <div className="card">
          <div className="card-body">
            <div className="form-section-title">Student Information</div>
            <div className="grid-2 gap-3 mb-3">
              <div className="form-group">
                <label className="form-label">
                  Student Name <span className="req">*</span>
                </label>
                <input
                  className="form-input"
                  placeholder="Enter full name"
                  value={form.studentName}
                  onChange={(e) => set("studentName", e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.dob}
                  onChange={(e) => set("dob", e.target.value)}
                  placeholder="dd-mm-yyyy"
                />
              </div>
            </div>
            <div className="grid-2 gap-3 mb-3">
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select
                  className="form-select"
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value)}
                >
                  <option value="">Select gender</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Grade Applying For <span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.grade}
                  onChange={(e) => set("grade", e.target.value)}
                  required
                >
                  <option value="">Select grade</option>
                  {[
                    "Nursery",
                    "LKG",
                    "UKG",
                    "Grade 1",
                    "Grade 2",
                    "Grade 3",
                    "Grade 4",
                    "Grade 5",
                    "Grade 6",
                    "Grade 7",
                    "Grade 8",
                    "Grade 9",
                    "Grade 10",
                    "Grade 11",
                    "Grade 12",
                  ].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Current School</label>
              <input
                className="form-input"
                placeholder="Enter current school name"
                value={form.currentSchool}
                onChange={(e) => set("currentSchool", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Parent Info */}
        <div className="card">
          <div className="card-body">
            <div className="form-section-title">
              Parent/Guardian Information
            </div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 13,
                color: "var(--gray-600)",
                marginBottom: 10,
              }}
            >
              Father's Details
            </div>
            <div className="grid-2 gap-3 mb-3">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  placeholder="Enter father's name"
                  value={form.fatherName}
                  onChange={(e) => set("fatherName", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Occupation</label>
                <input
                  className="form-input"
                  placeholder="Enter occupation"
                  value={form.fatherOccupation}
                  onChange={(e) => set("fatherOccupation", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="father@email.com"
                  value={form.fatherEmail}
                  onChange={(e) => set("fatherEmail", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Phone <span className="req">*</span>
                </label>
                <input
                  className="form-input"
                  placeholder="+91 XXXXX XXXXX"
                  value={form.fatherPhone}
                  onChange={(e) => set("fatherPhone", e.target.value)}
                />
              </div>
            </div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 13,
                color: "var(--gray-600)",
                marginBottom: 10,
              }}
            >
              Mother's Details
            </div>
            <div className="grid-2 gap-3">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  placeholder="Enter mother's name"
                  value={form.motherName}
                  onChange={(e) => set("motherName", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Occupation</label>
                <input
                  className="form-input"
                  placeholder="Enter occupation"
                  value={form.motherOccupation}
                  onChange={(e) => set("motherOccupation", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="mother@email.com"
                  value={form.motherEmail}
                  onChange={(e) => set("motherEmail", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  className="form-input"
                  placeholder="+91 XXXXX XXXXX"
                  value={form.motherPhone}
                  onChange={(e) => set("motherPhone", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="card">
          <div className="card-body">
            <div className="form-section-title">Contact Information</div>
            <div className="form-group mb-3">
              <label className="form-label">Address</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Enter complete address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
            <div className="grid-3 gap-3">
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  className="form-input"
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  className="form-input"
                  placeholder="State"
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">PIN Code</label>
                <input
                  className="form-input"
                  placeholder="PIN Code"
                  value={form.pin}
                  onChange={(e) => set("pin", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lead Details */}
        <div className="card">
          <div className="card-body">
            <div className="form-section-title">Lead Details</div>
            <div className="grid-2 gap-3 mb-3">
              <div className="form-group">
                <label className="form-label">Lead Source</label>
                <select
                  className="form-select"
                  value={form.leadSource}
                  onChange={(e) => set("leadSource", e.target.value)}
                >
                  <option value="">Select source</option>
                  {[
                    "Website Form",
                    "Google Ads",
                    "Facebook",
                    "Referral",
                    "Walk-in",
                    "WhatsApp",
                    "Other",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Referred By</label>
                <input
                  className="form-input"
                  placeholder="Name of referrer (if applicable)"
                  value={form.referredBy}
                  onChange={(e) => set("referredBy", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Assign to Counselor</label>
                <select
                  className="form-select"
                  value={form.counselor}
                  onChange={(e) => set("counselor", e.target.value)}
                >
                  <option value="">Select counselor</option>
                  {[
                    "Priya Sharma",
                    "Amit Patel",
                    "Neha Kumar",
                    "Rahul Singh",
                    "Anjali Gupta",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-select"
                  value={form.priority}
                  onChange={(e) => set("priority", e.target.value)}
                >
                  <option value="">Select priority</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Additional Notes</label>
              <textarea
                className="form-textarea"
                placeholder="Any additional information or special requirements..."
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate("/leads")}
            disabled={loading}
          >
            <X size={15} /> Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save size={15} /> {loading ? "Saving..." : "Save Lead"}
          </button>
        </div>
      </form>
    </div>
  );
}
