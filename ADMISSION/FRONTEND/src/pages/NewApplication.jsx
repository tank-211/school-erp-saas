import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Upload,
  AlertTriangle,
  FileText,
  Loader,
} from "lucide-react";
import { createAdmission } from "../services/admissionService";
import "../style.css";

const STEPS = [
  "Student Info",
  "Parent Info",
  "Academic Details",
  "Photos & ID",
  "Documents",
  "Review & Submit",
];

const docItems = [
  { name: "Birth Certificate", sub: "PDF, JPG, or PNG (Max 5MB)", req: true },
  {
    name: "Previous School Records",
    sub: "PDF, JPG, or PNG (Max 5MB)",
    req: true,
  },
  { name: "Address Proof", sub: "PDF, JPG, or PNG (Max 5MB)", req: true },
  {
    name: "Transfer Certificate",
    sub: "Required for transfer students (PDF, JPG, PNG - Max 5MB)",
    req: false,
  },
];

const photoGroups = [
  {
    label: "Student",
    items: [
      { name: "Student Photograph", sub: "Passport size (JPG, PNG - Max 5MB)" },
      {
        name: "Student Aadhar Card",
        sub: "Both sides (JPG, PNG, PDF - Max 5MB)",
      },
    ],
  },
  {
    label: "Father",
    items: [
      {
        name: "Father's Photograph",
        sub: "Passport size (JPG, PNG - Max 5MB)",
      },
      {
        name: "Father's Aadhar Card",
        sub: "Both sides (JPG, PNG, PDF - Max 5MB)",
      },
    ],
  },
  {
    label: "Mother",
    items: [
      {
        name: "Mother's Photograph",
        sub: "Passport size (JPG, PNG - Max 5MB)",
      },
      {
        name: "Mother's Aadhar Card",
        sub: "Both sides (JPG, PNG, PDF - Max 5MB)",
      },
    ],
  },
];

const REQUIRED_PHOTO_KEYS = [
  "photo_Student_Student Photograph",
  "photo_Student_Student Aadhar Card",
  "photo_Father_Father's Photograph",
  "photo_Mother_Mother's Photograph",
];

const REQUIRED_DOCUMENT_KEYS = [
  "doc_BirthCertificate",
  "doc_PreviousSchoolRecords",
  "doc_AddressProof",
];

export function NewApplication() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateData = location.state || {};

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState({});

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    gender: "",
    blood: "",
    nationality: "",
    religion: "",
    fatherName: "",
    fatherOcc: "",
    fatherPhone: "",
    fatherEmail: "",
    motherName: "",
    motherOcc: "",
    motherPhone: "",
    motherEmail: "",
    gradeFor: "",
    acYear: stateData.academicYear || "2026-27",
    prevSchool: stateData.prevSchool || "",
    prevGrade: "",
    street: "",
    city: "",
    state: "",
    pin: "",
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const pct = Math.round((step / (STEPS.length - 1)) * 100);
  const uploadedFileEntries = Object.entries(files).filter(([, file]) => Boolean(file));

  // Handle file selection for photos and documents
  const handleFileSelect = (category, name, file) => {
    if (file && file.size > 5 * 1024 * 1024) {
      setError(`File "${name}" exceeds 5MB limit`);
      return;
    }
    setFiles((p) => ({ ...p, [`${category}_${name}`]: file }));
    setError("");
  };

  // Validate required fields for current step
  const validateStep = (s) => {
    if (s === 0) {
      if (
        !form.firstName ||
        !form.lastName ||
        !form.dob ||
        !form.gender ||
        !form.nationality
      )
        return "Please fill all required student information fields";
    }
    if (s === 1) {
      if (
        !form.fatherName ||
        !form.fatherPhone ||
        !form.fatherEmail ||
        !form.motherName ||
        !form.motherPhone ||
        !form.motherEmail
      )
        return "Please fill all required parent information fields";
    }
    if (s === 2) {
      if (
        !form.gradeFor ||
        !form.street ||
        !form.city ||
        !form.state ||
        !form.pin
      )
        return "Please fill all required academic and address fields";
    }
    if (s === 4) {
      if (!REQUIRED_DOCUMENT_KEYS.every((key) => files[key]))
        return "Please upload all required documents (Birth Certificate, Previous School Records, Address Proof)";
    }
    if (s === 3) {
      if (!REQUIRED_PHOTO_KEYS.every((key) => files[key])) {
        return "Please upload the required student and parent photos before continuing";
      }
    }
    return "";
  };

  // Handle next step with validation
  const handleNext = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  // Submit application to backend
  const handleSubmit = async () => {
    const err = validateStep(4);
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Build FormData
      const formData = new FormData();

      // Lead info (if provided from CreateApplication)
      if (stateData.lead) {
        formData.append("lead_id", stateData.lead.id);
      }

      // Student info
      formData.append("student_first_name", form.firstName);
      formData.append("student_last_name", form.lastName);
      formData.append("dob", form.dob);
      formData.append("gender", form.gender);
      formData.append("blood_group", form.blood);
      formData.append("nationality", form.nationality);
      formData.append("religion", form.religion);

      // Parent info
      formData.append("father_name", form.fatherName);
      formData.append("father_occupation", form.fatherOcc);
      formData.append("father_phone", form.fatherPhone);
      formData.append("father_email", form.fatherEmail);

      formData.append("mother_name", form.motherName);
      formData.append("mother_occupation", form.motherOcc);
      formData.append("mother_phone", form.motherPhone);
      formData.append("mother_email", form.motherEmail);

      // Academic info
      formData.append("grade_applied_for", form.gradeFor);
      formData.append("academic_year", form.acYear);
      formData.append("admission_type", stateData.admissionType || "new");
      formData.append("previous_school", form.prevSchool);
      formData.append("previous_grade", form.prevGrade);

      // Address
      formData.append("street_address", form.street);
      formData.append("city", form.city);
      formData.append("state", form.state);
      formData.append("pincode", form.pin);

      // Files
      Object.entries(files).forEach(([key, file]) => {
        if (file) {
          formData.append(key, file);
        }
      });

      // Call API
      const response = await createAdmission(formData);

      if (response.success) {
        alert("Application submitted successfully!");
        navigate("/applications", { state: { refresh: true } });
      } else {
        setError(response.message || "Failed to submit application");
      }
    } catch (err) {
      console.error("Submission error:", err);
      setError(err.message || "Error submitting application");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="card">
            <div className="card-body">
              <div className="form-section-title">Student Information</div>
              <div className="grid-2 gap-3 mb-3">
                <div className="form-group">
                  <label className="form-label">
                    First Name <span className="req">*</span>
                  </label>
                  <input
                    className="form-input"
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Last Name <span className="req">*</span>
                  </label>
                  <input
                    className="form-input"
                    value={form.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Date of Birth <span className="req">*</span>
                  </label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.dob}
                    onChange={(e) => set("dob", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Gender <span className="req">*</span>
                  </label>
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
                  <label className="form-label">Blood Group</label>
                  <select
                    className="form-select"
                    value={form.blood}
                    onChange={(e) => set("blood", e.target.value)}
                  >
                    <option value="">Select blood group</option>
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(
                      (b) => (
                        <option key={b}>{b}</option>
                      ),
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Nationality <span className="req">*</span>
                  </label>
                  <input
                    className="form-input"
                    value={form.nationality}
                    onChange={(e) => set("nationality", e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Religion</label>
                <input
                  className="form-input"
                  value={form.religion}
                  onChange={(e) => set("religion", e.target.value)}
                />
              </div>
            </div>
          </div>
        );
      case 1:
        return (
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
              <div className="grid-2 gap-3 mb-4">
                <div className="form-group">
                  <label className="form-label">
                    Full Name <span className="req">*</span>
                  </label>
                  <input
                    className="form-input"
                    value={form.fatherName}
                    onChange={(e) => set("fatherName", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Occupation</label>
                  <input
                    className="form-input"
                    value={form.fatherOcc}
                    onChange={(e) => set("fatherOcc", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Phone Number <span className="req">*</span>
                  </label>
                  <input
                    className="form-input"
                    value={form.fatherPhone}
                    onChange={(e) => set("fatherPhone", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Email Address <span className="req">*</span>
                  </label>
                  <input
                    className="form-input"
                    type="email"
                    value={form.fatherEmail}
                    onChange={(e) => set("fatherEmail", e.target.value)}
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
                  <label className="form-label">
                    Full Name <span className="req">*</span>
                  </label>
                  <input
                    className="form-input"
                    value={form.motherName}
                    onChange={(e) => set("motherName", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Occupation</label>
                  <input
                    className="form-input"
                    value={form.motherOcc}
                    onChange={(e) => set("motherOcc", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Phone Number <span className="req">*</span>
                  </label>
                  <input
                    className="form-input"
                    value={form.motherPhone}
                    onChange={(e) => set("motherPhone", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Email Address <span className="req">*</span>
                  </label>
                  <input
                    className="form-input"
                    type="email"
                    value={form.motherEmail}
                    onChange={(e) => set("motherEmail", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="card">
            <div className="card-body">
              <div className="form-section-title">Academic Details</div>
              <div className="grid-2 gap-3 mb-3">
                <div className="form-group">
                  <label className="form-label">
                    Grade Applying For <span className="req">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={form.gradeFor}
                    onChange={(e) => set("gradeFor", e.target.value)}
                  >
                    <option value="">Select grade</option>
                    {[
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
                <div className="form-group">
                  <label className="form-label">
                    Academic Year <span className="req">*</span>
                  </label>
                  <input
                    className="form-input"
                    value={form.acYear}
                    readOnly
                    style={{ background: "var(--gray-50)" }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Previous School</label>
                  <input
                    className="form-input"
                    value={form.prevSchool}
                    onChange={(e) => set("prevSchool", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Previous Grade</label>
                  <input
                    className="form-input"
                    value={form.prevGrade}
                    onChange={(e) => set("prevGrade", e.target.value)}
                  />
                </div>
              </div>
              <div className="form-section-title mt-4">Address</div>
              <div className="form-group mb-3">
                <label className="form-label">
                  Street Address <span className="req">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={form.street}
                  onChange={(e) => set("street", e.target.value)}
                />
              </div>
              <div className="grid-2 gap-3 mb-3">
                <div className="form-group">
                  <label className="form-label">
                    City <span className="req">*</span>
                  </label>
                  <input
                    className="form-input"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    State <span className="req">*</span>
                  </label>
                  <input
                    className="form-input"
                    value={form.state}
                    onChange={(e) => set("state", e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group" style={{ maxWidth: 200 }}>
                <label className="form-label">
                  Pincode <span className="req">*</span>
                </label>
                <input
                  className="form-input"
                  value={form.pin}
                  onChange={(e) => set("pin", e.target.value)}
                />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="card">
            <div className="card-body">
              <div className="form-section-title">
                Photographs & Identity Verification
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--gray-500)",
                  marginBottom: 16,
                }}
              >
                Upload recent passport-size photographs and Aadhar card copies
                for verification purposes.
              </p>
              {photoGroups.map((g) => (
                <div key={g.label}>
                  <div className="photo-group-title">
                    <FileText size={15} style={{ color: "var(--primary)" }} />
                    {g.label}
                  </div>
                  <div className="photo-grid mb-4">
                    {g.items.map((item) => {
                      const fileKey = `photo_${g.label}_${item.name}`;
                      const hasFile = !!files[fileKey];
                      return (
                        <div
                          className="photo-box"
                          key={item.name}
                          style={hasFile ? { borderColor: "var(--green)" } : {}}
                        >
                          <div className="photo-box-name">
                            <FileText size={13} />
                            {item.name} <span className="req">*</span>
                          </div>
                          <div className="photo-box-sub">{item.sub}</div>
                          <label htmlFor={fileKey} style={{ marginBottom: 0 }}>
                            <input
                              id={fileKey}
                              type="file"
                              hidden
                              accept="image/*,.pdf"
                              onChange={(e) =>
                                handleFileSelect(
                                  "photo",
                                  fileKey,
                                  e.target.files?.[0],
                                )
                              }
                            />
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() =>
                                document.getElementById(fileKey).click()
                              }
                            >
                              <Upload size={13} />{" "}
                              {hasFile ? "Change" : "Choose"} File
                            </button>
                          </label>
                          {hasFile && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--green)",
                                marginTop: 4,
                              }}
                            >
                              ✓ {files[fileKey].name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="info-box info-box-orange mt-2">
                <AlertTriangle
                  size={16}
                  style={{
                    color: "var(--orange)",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />
                <div className="info-box-text">
                  <strong>Note:</strong> All photographs should be recent, clear
                  passport-size images with white background. Aadhar cards
                  should show both front and back clearly.
                </div>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="card">
            <div className="card-body">
              <div className="form-section-title">Supporting Documents</div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--gray-500)",
                  marginBottom: 16,
                }}
              >
                Upload required documents for admission processing
              </p>
              {docItems.map((d) => {
                const fileKey = `doc_${d.name.replace(/\s+/g, "")}`;
                const hasFile = !!files[fileKey];
                return (
                  <div
                    className="doc-row"
                    key={d.name}
                    style={
                      hasFile
                        ? {
                            background: "#f0fdf4",
                            borderLeft: "3px solid var(--green)",
                          }
                        : {}
                    }
                  >
                    <div className="doc-row-info">
                      <div className="doc-name">
                        {d.name}
                        {d.req && <span className="req"> *</span>}
                      </div>
                      <div className="doc-sub">{d.sub}</div>
                      {hasFile && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--green)",
                            marginTop: 4,
                          }}
                        >
                          ✓ {files[fileKey].name}
                        </div>
                      )}
                    </div>
                    <label htmlFor={fileKey} style={{ margin: 0 }}>
                      <input
                        id={fileKey}
                        type="file"
                        hidden
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) =>
                          handleFileSelect("doc", fileKey, e.target.files?.[0])
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => document.getElementById(fileKey).click()}
                      >
                        <Upload size={13} /> {hasFile ? "Change" : "Upload"}
                      </button>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <div className="review-section">
              <div className="review-section-title">Student Information</div>
              <div style={{ fontSize: 13, color: "var(--gray-600)" }}>
                {form.firstName || "·"} {form.lastName}
              </div>
              <div style={{ fontSize: 13, color: "var(--gray-600)" }}>
                DOB: {form.dob || "·"} | Gender: {form.gender || "·"}
              </div>
            </div>
            <div className="review-section">
              <div className="review-section-title">Parent Information</div>
              <div style={{ fontSize: 13, color: "var(--gray-600)" }}>
                Father: {form.fatherName || "·"} ({form.fatherPhone})
              </div>
              <div style={{ fontSize: 13, color: "var(--gray-600)" }}>
                Mother: {form.motherName || "·"} ({form.motherPhone})
              </div>
            </div>
            <div className="review-section">
              <div className="review-section-title">Academic Information</div>
              <div style={{ fontSize: 13, color: "var(--gray-600)" }}>
                Grade: {form.gradeFor || "·"} | Year: {form.acYear} | Type:{" "}
                {stateData.admissionType || "new"}
              </div>
            </div>
            <div className="review-section">
              <div className="review-section-title">Uploaded Files Summary</div>
              <div className="grid-2 gap-2">
                {Object.entries(files)
                  .filter(([, f]) => f)
                  .map(([key]) => (
                    <div
                      key={key}
                      style={{
                        fontSize: 13,
                        color: "var(--green)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <CheckCircle size={14} />
                      {key.replace("_", " ")}
                    </div>
                  ))}
                {Object.entries(files)
                  .filter(([, f]) => !f)
                  .slice(0, 3)
                  .map(([key]) => (
                    <div
                      key={key}
                      className="file-missing"
                      style={{ fontSize: 13 }}
                    >
                      <AlertTriangle size={13} />
                      {key.replace("_", " ")} - Missing
                    </div>
                  ))}
              </div>
            </div>
            <div className="info-box info-box-green">
              <CheckCircle
                size={16}
                style={{ color: "var(--green)", flexShrink: 0 }}
              />
              <div className="info-box-text">
                ✓ All information verified. Ready to submit.
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="page-sm wizard-shell" style={{ maxWidth: 920 }}>
      <div className="wizard-header mb-4">
        <div className="wizard-header-main">
          <button
            className="back-btn"
            style={{ margin: 0 }}
            onClick={() => navigate("/applications")}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-title" style={{ fontSize: 22 }}>
              New Application
            </h1>
            <p className="page-sub">
              Complete the student, parent, academic, and document sections in one flow.
            </p>
          </div>
        </div>
        <div className="wizard-header-meta">
          <div className="wizard-meta-card">
            <span className="wizard-meta-label">Step</span>
            <strong>
              {step + 1} / {STEPS.length}
            </strong>
          </div>
          <div className="wizard-meta-card">
            <span className="wizard-meta-label">Uploaded Files</span>
            <strong>{uploadedFileEntries.length}</strong>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div
          className="info-box info-box-red mb-4"
          style={{ borderColor: "var(--red)" }}
        >
          <AlertTriangle
            size={16}
            style={{ color: "var(--red)", flexShrink: 0 }}
          />
          <div className="info-box-text">{error}</div>
        </div>
      )}

      {/* Step bar */}
      <div className="step-bar mb-5">
        <div className="step-track">
          <div className="step-track-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="step-labels">
          {STEPS.map((s, i) => (
            <div className="step-item" key={i}>
              <div
                className={`step-circle ${i < step ? "done" : i === step ? "active" : ""}`}
              >
                {i < step ? <CheckCircle size={16} /> : i + 1}
              </div>
              <span className={`step-name ${i === step ? "active" : ""}`}>
                {s}
              </span>
            </div>
          ))}
        </div>
      </div>

      {renderStep()}

      {/* Nav */}
      <div className="wizard-actions mt-5">
        <button
          className="back-btn"
          style={{ margin: 0 }}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ArrowLeft size={15} /> Previous
        </button>
        <div className="flex gap-3 flex-wrap">
          {step < STEPS.length - 1 ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleNext}
              disabled={loading}
            >
              Next <ArrowRight size={13} />
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                <Loader size={13} className="animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <CheckCircle size={13} /> Submit Application
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
