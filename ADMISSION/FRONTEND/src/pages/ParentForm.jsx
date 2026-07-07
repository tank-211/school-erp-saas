import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { saveParentInfo } from "../services/applicationService";
import "./ParentForm.css";

const initialState = {
  fatherName: "",
  fatherPhone: "",
  fatherEmail: "",
  fatherOccupation: "",
  motherName: "",
  motherPhone: "",
  motherEmail: "",
  motherOccupation: "",
  guardianName: "",
  guardianRelation: "",
  guardianPhone: "",
  guardianEmail: "",
  primaryContactPerson: "",
  primaryContactRelation: "",
  primaryContactPhone: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  incomeRange: "",
};

const contactOptions = [
  { label: "Father", value: "Father" },
  { label: "Mother", value: "Mother" },
  { label: "Guardian", value: "Guardian" },
];

export default function ParentForm({
  applicationId,
  lead,
  initialData,
  onSuccess,
}) {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  // Auto-fill from lead if available
  useEffect(() => {
    if (!lead) {
      console.log("⏳ [ParentForm] Waiting for lead data...");
      return;
    }

    console.log("📌 [ParentForm] Lead data received:", {
      lead_first_name: lead.lead_first_name,
      lead_last_name: lead.lead_last_name,
      lead_email: lead.lead_email,
      lead_phone: lead.lead_phone,
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
    });

    // NOTE: Lead data contains student information, not parent information
    // Parent fields should be left empty for manual entry unless parent data is explicitly provided
    // Only use lead contact information (phone, email) if available
    const leadPhone = lead.lead_phone || lead.phone || "";
    const leadEmail = lead.lead_email || lead.email || "";

    setForm((f) => ({
      ...f,
      // Leave parent names empty for manual entry - lead contains student data, not parent data
      fatherPhone: leadPhone || f.fatherPhone,
      fatherEmail: leadEmail || f.fatherEmail,
    }));

    console.log("✅ [ParentForm] Auto-filled contact info from lead:", {
      fatherPhone: leadPhone,
      fatherEmail: leadEmail,
    });
  }, [lead]);

  useEffect(() => {
    if (!initialData || Object.keys(initialData).length === 0) {
      console.log("⏳ [ParentForm] Waiting for saved parent data...");
      return;
    }

    console.log(
      "📦 [ParentForm] Loaded parent data from database:",
      initialData,
    );

    setForm((f) => ({
      ...f,
      fatherName:
        initialData.father_name || initialData.fatherName || f.fatherName,
      fatherPhone:
        initialData.father_phone || initialData.fatherPhone || f.fatherPhone,
      fatherEmail:
        initialData.father_email || initialData.fatherEmail || f.fatherEmail,
      fatherOccupation:
        initialData.father_occupation ||
        initialData.fatherOccupation ||
        f.fatherOccupation,
      motherName:
        initialData.mother_name || initialData.motherName || f.motherName,
      motherPhone:
        initialData.mother_phone || initialData.motherPhone || f.motherPhone,
      motherEmail:
        initialData.mother_email || initialData.motherEmail || f.motherEmail,
      motherOccupation:
        initialData.mother_occupation ||
        initialData.motherOccupation ||
        f.motherOccupation,
      guardianName:
        initialData.guardian_name || initialData.guardianName || f.guardianName,
      guardianRelation:
        initialData.guardian_relation ||
        initialData.guardianRelation ||
        f.guardianRelation,
      guardianPhone:
        initialData.guardian_phone ||
        initialData.guardianPhone ||
        f.guardianPhone,
      guardianEmail:
        initialData.guardian_email ||
        initialData.guardianEmail ||
        f.guardianEmail,
      primaryContactPerson:
        initialData.primary_contact_person ||
        initialData.primaryContactPerson ||
        f.primaryContactPerson,
      primaryContactRelation:
        initialData.primary_contact_relation ||
        initialData.primaryContactRelation ||
        f.primaryContactRelation,
      primaryContactPhone:
        initialData.primary_contact_phone ||
        initialData.primaryContactPhone ||
        f.primaryContactPhone,
      address: initialData.address || f.address,
      city: initialData.city || f.city,
      state: initialData.state || f.state,
      postalCode:
        initialData.postal_code || initialData.postalCode || f.postalCode,
      incomeRange:
        initialData.income_range || initialData.incomeRange || f.incomeRange,
    }));

    console.log("✅ [ParentForm] Loaded parent data successfully");
  }, [initialData]);

  // Validation logic
  const validate = () => {
    const e = {};
    if (!form.fatherName) e.fatherName = "Father name is required";
    if (!form.fatherPhone) e.fatherPhone = "Father phone is required";
    else if (!/^\d{10}$/.test(form.fatherPhone))
      e.fatherPhone = "Must be 10 digits";
    if (!form.motherName) e.motherName = "Mother name is required";
    if (!form.primaryContactPerson) e.primaryContactPerson = "Required";
    if (!form.primaryContactRelation) e.primaryContactRelation = "Required";
    if (!form.primaryContactPhone) e.primaryContactPhone = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Input handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    if (!validate()) return;
    setLoading(true);
    try {
      await saveParentInfo(applicationId, form);
      if (onSuccess) onSuccess();
    } catch (err) {
      setApiError(err.message || "Failed to save parent info");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Parent / Guardian Information</div>
        <div style={{ fontSize: 12, color: "var(--gray-500)" }}>
          Step 2 of 6
        </div>
      </div>
      <div className="card-body">
        <form className="parent-form-container" onSubmit={handleSubmit}>
          {/* Section 1: Father Information */}
          <div className="form-section">
            <h4 className="section-title">Father Information</h4>
            <div className="grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">Father Name *</label>
                <input
                  className="form-input"
                  name="fatherName"
                  value={form.fatherName}
                  onChange={handleChange}
                />
                {errors.fatherName && (
                  <div className="error-text">{errors.fatherName}</div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Father Phone *</label>
                <input
                  className="form-input"
                  name="fatherPhone"
                  value={form.fatherPhone}
                  onChange={handleChange}
                />
                {errors.fatherPhone && (
                  <div className="error-text">{errors.fatherPhone}</div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Father Email</label>
                <input
                  className="form-input"
                  name="fatherEmail"
                  value={form.fatherEmail}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Father Occupation</label>
                <input
                  className="form-input"
                  name="fatherOccupation"
                  value={form.fatherOccupation}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Mother Information */}
          <div className="form-section mt-6">
            <h4 className="section-title">Mother Information</h4>
            <div className="grid-2 gap-4">
              <div className="form-group">
                <label className="form-label">Mother Name *</label>
                <input
                  className="form-input"
                  name="motherName"
                  value={form.motherName}
                  onChange={handleChange}
                />
                {errors.motherName && (
                  <div className="error-text">{errors.motherName}</div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Mother Phone</label>
                <input
                  className="form-input"
                  name="motherPhone"
                  value={form.motherPhone}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mother Email</label>
                <input
                  className="form-input"
                  name="motherEmail"
                  value={form.motherEmail}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mother Occupation</label>
                <input
                  className="form-input"
                  name="motherOccupation"
                  value={form.motherOccupation}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Primary Contact */}
          <div className="form-section mt-6">
            <h4 className="section-title">Primary Contact Selection</h4>
            <div className="grid-3 gap-4">
              <div className="form-group">
                <label className="form-label">Primary Contact Person *</label>
                <select
                  className="form-select"
                  name="primaryContactPerson"
                  value={form.primaryContactPerson}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  {contactOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.primaryContactPerson && (
                  <div className="error-text">
                    {errors.primaryContactPerson}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Primary Relation *</label>
                <input
                  className="form-input"
                  name="primaryContactRelation"
                  value={form.primaryContactRelation}
                  onChange={handleChange}
                  placeholder="e.g. Father"
                />
                {errors.primaryContactRelation && (
                  <div className="error-text">
                    {errors.primaryContactRelation}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Primary Phone *</label>
                <input
                  className="form-input"
                  name="primaryContactPhone"
                  value={form.primaryContactPhone}
                  onChange={handleChange}
                />
                {errors.primaryContactPhone && (
                  <div className="error-text">{errors.primaryContactPhone}</div>
                )}
              </div>
            </div>
          </div>

          {/* Section 5: Address Info */}
          <div className="form-section mt-6">
            <h4 className="section-title">Residential Address</h4>
            <div className="form-group">
              <label className="form-label">Full Address</label>
              <textarea
                className="form-input"
                name="address"
                value={form.address}
                onChange={handleChange}
                style={{ height: "60px" }}
              />
            </div>
            <div className="grid-3 gap-4 mt-2">
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  className="form-input"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  className="form-input"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Postal Code</label>
                <input
                  className="form-input"
                  name="postalCode"
                  value={form.postalCode}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {apiError && <div className="error-box mt-4">{apiError}</div>}

          <div className="form-actions mt-8">
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading
                ? "Saving Information..."
                : "Save and Continue to Academic Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

ParentForm.propTypes = {
  applicationId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
  lead: PropTypes.object,
  initialData: PropTypes.object,
  onSuccess: PropTypes.func,
};
