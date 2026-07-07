import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Search, Loader } from "lucide-react";
import { useLeads } from "../hooks/useLeads";
import {
  createApplicationFromLead,
  createApplicationWithoutLead,
} from "../services/applicationService";
import "../style.css";

/**
 * CreateApplication Component
 * Step 1: Select existing lead or create without lead
 * Step 2: Confirm and create application record
 * Integrates with real Leads API and Applications API
 */
export function CreateApplication() {
  const navigate = useNavigate();

  // State for lead selection
  const [step, setStep] = useState("select");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  // Fetch leads based on search query
  const { leads, loading, error } = useLeads(search, true);

  // State for application configuration
  const [form, setForm] = useState({
    year: "1", // Academic year ID
    type: "new",
  });

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Handle lead selection
  const handleSelectLead = (lead) => {
    setSelected(lead);
    setStep("confirm");
  };

  const handleCreateWithoutLead = () => {
    setSelected(null);
    setStep("confirm");
  };

  // Handle application creation
  const handleCreateApplication = async () => {
    try {
      setCreating(true);
      setCreateError("");

      if (!form.year) {
        setCreateError("Please select an academic year");
        return;
      }

      const result = selected?.id
        ? await createApplicationFromLead(selected.id, parseInt(form.year, 10))
        : await createApplicationWithoutLead(parseInt(form.year, 10));

      console.log("✅ Application created with ID:", result.id);

      sessionStorage.setItem("activeAdmissionId", String(result.id));

      // Navigate to multi-step form
      navigate(`/applications/form/${result.id}`, {
        state: {
          lead: selected,
          manualEntryMode: !selected,
          academicYear: form.year,
          admissionType: form.type,
          resumed: result.resumed,
        },
      });
    } catch (err) {
      console.error("❌ Error creating application:", err);
      setCreateError(err.message || "Failed to create application");
    } finally {
      setCreating(false);
    }
  };

  // Step 1: Select Lead
  if (step === "select") {
    return (
      <div className="page-sm" style={{ maxWidth: 1000 }}>
        <button className="back-btn" onClick={() => navigate("/applications")}>
          <ArrowLeft size={16} /> Back to Applications
        </button>
        <h1 className="page-title mb-1">Create New Application</h1>
        <p className="page-sub mb-5">
          Select an eligible lead or start a manual application
        </p>

        {/* Search and error handling */}
        <div className="card mb-5">
          <div className="card-body" style={{ paddingTop: 14 }}>
            <div className="flex gap-3">
              <div className="input-wrap flex-1">
                <Search className="input-icon" size={15} />
                <input
                  className="form-input"
                  placeholder="Search by name, email, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateWithoutLead}
              >
                <FileText size={14} /> New Application
              </button>
            </div>
            {error && (
              <div style={{ marginTop: 12, fontSize: 13, color: "var(--red)" }}>
                Error: {error}
              </div>
            )}
          </div>
        </div>

        {/* Leads Table */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              {loading ? "Loading leads..." : "Select from Existing Leads"}
            </div>
          </div>
          {loading ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "var(--gray-500)",
              }}
            >
              <p>Searching leads...</p>
            </div>
          ) : leads.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "var(--gray-500)",
              }}
            >
              <p>No leads found</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Grade</th>
                    <th>Parent Contact</th>
                    <th>Email</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="td-bold">
                        {lead.first_name} {lead.last_name}
                      </td>
                      <td>{lead.desired_class || "—"}</td>
                      <td>{lead.phone || "—"}</td>
                      <td style={{ fontSize: 13 }}>{lead.email || "—"}</td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleSelectLead(lead)}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Step 2: Confirm and Create Application
  return (
    <div className="page-sm" style={{ maxWidth: 700 }}>
      <button className="back-btn" onClick={() => setStep("select")}>
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="page-title mb-1">Confirm Application</h1>
      <p className="page-sub mb-5">Review and confirm before proceeding</p>

      {createError && (
        <div className="info-box info-box-red mb-4">
          <div className="info-box-text">{createError}</div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleCreateApplication();
        }}
        className="space-y-4"
      >
        {/* Selected Lead Summary */}
        {selected ? (
          <div className="card" style={{ border: "2px solid var(--primary)" }}>
            <div className="card-header">
              <div className="card-title">Selected Lead</div>
            </div>
            <div className="card-body">
              <div className="grid-2 gap-3">
                <div>
                  <div style={{ fontSize: 13, color: "var(--gray-500)" }}>
                    Student Name
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {selected.first_name} {selected.last_name}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "var(--gray-500)" }}>
                    Grade
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {selected.desired_class || "—"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "var(--gray-500)" }}>
                    Parent Contact
                  </div>
                  <div style={{ fontWeight: 600 }}>{selected.phone || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "var(--gray-500)" }}>
                    Email
                  </div>
                  <div style={{ fontWeight: 600 }}>{selected.email || "—"}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ border: "2px solid var(--blue)" }}>
            <div className="card-header">
              <div className="card-title">Manual Entry Mode</div>
            </div>
            <div className="card-body">
              <div style={{ fontSize: 14, color: "var(--gray-600)" }}>
                No lead is attached. Student and parent details will be entered
                manually in the form.
              </div>
            </div>
          </div>
        )}

        {/* Application Configuration */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Application Information</div>
          </div>
          <div className="card-body">
            <div className="grid-2 gap-3 mb-3">
              {/* Academic Year */}
              <div className="form-group">
                <label className="form-label">
                  Academic Year <span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.year}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, year: e.target.value }))
                  }
                >
                  <option value="">Select academic year</option>
                  <option value="1">2024-25</option>
                  <option value="2">2025-26</option>
                  <option value="3">2026-27</option>
                </select>
              </div>

              {/* Admission Type */}
              <div className="form-group">
                <label className="form-label">
                  Admission Type <span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.type}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, type: e.target.value }))
                  }
                >
                  <option value="new">New Admission</option>
                  <option value="transfer">Transfer</option>
                  <option value="sibling">Sibling Admission</option>
                  <option value="re-admission">Re-admission</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="info-box info-box-blue">
          <FileText
            size={18}
            style={{ color: "var(--blue)", flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <div className="info-box-title">Next Steps</div>
            <div className="info-box-text">
              After confirming this application, you'll proceed to the complete
              multi-step form where you can fill in detailed student and parent
              information, academic records, and upload documents. You can save
              and resume at any time.
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate("/applications")}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? (
              <>
                <Loader size={14} className="animate-spin" /> Creating...
              </>
            ) : (
              <>
                <FileText size={14} /> Create & Proceed to Form
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
