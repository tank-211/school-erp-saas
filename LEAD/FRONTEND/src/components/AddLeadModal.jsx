import React, { useState, useEffect } from 'react'
import { createLead } from '../services/api'
import './AddLeadModal.css'
import { leadsAPI } from '../services/api'

const getUserFromToken = () => {
  const token = localStorage.getItem("authToken");
  if (!token) return null;

  return JSON.parse(atob(token.split(".")[1]));
};

function F({ label, name, placeholder, type = 'text', required, half, third, value, onChange, error }) {
  return (
    <div className={`form-field ${half ? 'half' : ''} ${third ? 'third' : ''}`}>
      <label className="field-label">
        {label}{required && <span className="req">*</span>}
      </label>
      <input
        type={type}
        className={`field-input ${error ? 'error' : ''}`}
        placeholder={placeholder || ''}
        value={value}
        onChange={onChange}
      />
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

function S({ label, name, options, placeholder, required, half, third, value, onChange, error }) {
  return (
    <div className={`form-field ${half ? 'half' : ''} ${third ? 'third' : ''}`}>
      <label className="field-label">
        {label}{required && <span className="req">*</span>}
      </label>
      <select
        className={`field-select ${error ? 'error' : ''}`}
        value={value}
        onChange={onChange}
      >
        <option value="">{placeholder || `Select ${label.toLowerCase()}`}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

const initialForm = {
  // Student
  studentFirstName: '', studentLastName: '', dob: '',
  gender: '', grade: '', currentSchool: '',
  // Father
  fatherFirstName: '', fatherLastName: '', fatherEmail: '',
  fatherPhone: '', occupation: '', company: '',
  // Mother
  motherFirstName: '', motherLastName: '', motherEmail: '',
  motherPhone: '', motherOccupation: '', motherCompany: '',
  // Lead Info
  source: '', counselor: '', tag: '', notes: '',
}



const GRADES = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12']
const SOURCES = ['Website','Referral','Walk-in','Ads','Social Media','Phone Inquiry','Email Campaign']
const COUNSELORS = ['Mrs. Priya Sharma','Mr. Amit Patel','Mrs. Sunita Kumar','Mr. Rajesh Verma']

export default function AddLeadModal({ open, onClose }) {
  const [tab, setTab] = useState('manual')
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null) // { type: 'success'|'error', text: '...' }
  const [file, setFile] = useState(null)

  const handleBulkUpload = async () => {
  if (!file) {
    setMessage({ type: 'error', text: 'Please select a file first' })
    return
  }

  try {
    setLoading(true)
    setMessage(null)

    const res = await leadsAPI.bulkImport(file)

    console.log("UPLOAD RESULT:", res)

    setMessage({
      type: 'success',
      text: `✓ Uploaded ${res.data.count} leads`
    })

    setTimeout(() => {
    onClose();
    }, 1200);

  } catch (err) {
    console.error(err)
    setMessage({
      type: 'error',
      text: err.message
    })
  } finally {
    setLoading(false)
  }
}

  // Lock body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const set = (field, val) => {
    setForm(f => ({ ...f, [field]: val }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
  }

  const validate = () => {
    const required = ['studentFirstName','studentLastName','dob','gender','grade','fatherFirstName','fatherLastName','fatherEmail','fatherPhone']
    const errs = {}
    required.forEach(k => { if (!form[k] || !form[k].trim()) errs[k] = 'Required' })
    if (form.fatherEmail && !/\S+@\S+\.\S+/.test(form.fatherEmail)) errs.fatherEmail = 'Invalid email'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleAddLead = async () => {

    if (!validate()) return;
    
    try {
      setLoading(true)
      setMessage(null)
      
      
      // Transform form data to match API expectations
    const clean = (val) => {
      if (!val) return undefined;

      const v = val.trim();

      if (!v || v.toLowerCase() === "undefined" || v.toLowerCase() === "null") {
        return undefined;
      }

      return v;
    };

      const motherFullName =
      [clean(form.motherFirstName), clean(form.motherLastName)]
        .filter(Boolean)
        .join(" ") || undefined;
  
  const leadData = {
    studentFirstName: form.studentFirstName?.trim(),
    studentLastName: form.studentLastName?.trim(),
    dob: form.dob ? new Date(form.dob).toISOString() : undefined,
    gender: form.gender,
    grade: form.grade,
    currentSchool: form.currentSchool,

    fatherName: `${clean(form.fatherFirstName)} ${clean(form.fatherLastName)}`.trim(),
    fatherPhone: form.fatherPhone?.trim() || undefined,
    fatherEmail: form.fatherEmail?.trim() || undefined,

    motherName: motherFullName || undefined,
    motherPhone: clean(form.motherPhone) || undefined,
    motherEmail: form.motherEmail?.trim() || undefined,

    source: form.source || undefined,
    notes: form.notes || undefined,
    status: 'new',

    // 🔥 THIS IS WHAT YOU MISSED
  };

      console.log("FINAL PAYLOAD OBJECT:", leadData)
      console.log("🔥 schoolId:", leadData.schoolId);
      console.log("🔥 assignedTo:", leadData.assignedTo);
      console.log("studentFirstName:", `"${leadData.studentFirstName}"`)
      console.log("studentLastName:", leadData.studentLastName)
      console.log("gender:", leadData.gender)
      console.log("grade:", leadData.grade)
      console.log("fatherName:", `"${leadData.fatherName}"`)
      console.log("fatherPhone:", `"${leadData.fatherPhone}"`)
      console.log("motherName:", `"${leadData.motherName}"`)
      console.log("motherPhone:", `"${leadData.motherPhone}"`)
      if (!leadData.fatherName) console.log("❌ fatherName EMPTY")
      if (!leadData.fatherPhone) console.log("❌ fatherPhone EMPTY")
      if (!leadData.studentFirstName) console.log("❌ studentFirstName EMPTY")

      await createLead(leadData)
      
      setMessage({ type: 'success', text: '✓ Lead added successfully!' })
      
      // Close modal after 1.5 seconds
      setTimeout(() => {
        onClose()
        setForm(initialForm)
        setErrors({})
        setMessage(null)
      }, 1500)
      
    } catch (error) {
      console.log("🔥 REAL ERROR:", error);

      setMessage({
        type: 'error',
        text: error.message || "Something went wrong"
      });
    }
       finally {
      setLoading(false)
    }
  }

  const handleDraft = () => {
    console.log('Saved as draft:', form)
    onClose()
    setForm(initialForm)
    setErrors({})
  }

  const handleClose = () => {
    onClose()
    setForm(initialForm)
    setErrors({})
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="modal-box">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Add New Lead</h2>
            <p className="modal-sub">Enter lead information or upload in bulk</p>
          </div>
          <button className="modal-close" onClick={handleClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button className={`modal-tab ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Manual Entry
          </button>
          <button className={`modal-tab ${tab === 'bulk' ? 'active' : ''}`} onClick={() => setTab('bulk')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Bulk Upload
          </button>
        </div>

        {/* Message Banner */}
        {message && (
          <div style={{
            margin: '12px 20px 0',
            padding: '10px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`
          }}>
            {message.text}
          </div>
        )}

        {/* Body */}
        <div className="modal-body">
          {tab === 'manual' ? (
            <>
              {/* ── Student Information ── */}
              <div className="form-section">
                <div className="section-heading">
                  <GradeIcon />
                  <span>Student Information</span>
                </div>

                <div className="form-row">
                    <F
                      label="First Name"
                      name="studentFirstName"
                      placeholder="Enter first name"
                      value={form.studentFirstName}
                      onChange={(e) => set('studentFirstName', e.target.value)}
                      error={errors.studentFirstName}
                      required
                      third
                    />

                    <F
                      label="Last Name"
                      name="studentLastName"
                      placeholder="Enter last name"
                      value={form.studentLastName}
                      onChange={(e) => set('studentLastName', e.target.value)}
                      error={errors.studentLastName}
                      required
                      third
                    />

                    <F
                      label="Date of Birth"
                      name="dob"
                      type="date"
                      placeholder="mm/dd/yyyy"
                      value={form.dob}
                      onChange={(e) => set('dob', e.target.value)}
                      error={errors.dob}
                      required
                      third
                    />
              </div>
              
                <div className="form-row">
                  <S label="Gender" name="gender" options={['Male','Female','Other']} value={form.gender} onChange={(e) => set('gender', e.target.value)} error={errors.gender} required third />
                  <S label="Grade Applying For" name="grade" options={GRADES} value={form.grade} onChange={(e) => set('grade', e.target.value)} error={errors.grade} required third />
                  <F label="Current School" name="currentSchool" placeholder="Current school name" value={form.currentSchool} onChange={(e) => set('currentSchool', e.target.value)} error={errors.currentSchool} third />
                </div>
              </div>

              {/* ── Father's Information ── */}
              <div className="form-section">
                <div className="section-heading">
                  <FatherIcon />
                  <span>Father's Information</span>
                </div>
                <div className="form-row">
                  <F label="First Name" name="fatherFirstName" placeholder="Enter first name" value={form.fatherFirstName} onChange={(e) => set('fatherFirstName', e.target.value)} error={errors.fatherFirstName} required third />
                  <F label="Last Name" name="fatherLastName" placeholder="Enter last name" value={form.fatherLastName} onChange={(e) => set('fatherLastName', e.target.value)} error={errors.fatherLastName} required third />
                  <F label="Email" name="fatherEmail" type="email" placeholder="email@example.com" value={form.fatherEmail} onChange={(e) => set('fatherEmail', e.target.value)} error={errors.fatherEmail} required third />
                </div>
                <div className="form-row">
                  <F label="Phone Number" name="fatherPhone" placeholder="+91 XXXXX XXXXX" value={form.fatherPhone} onChange={(e) => set('fatherPhone', e.target.value)} error={errors.fatherPhone} required third />
                  <F label="Occupation" name="occupation" placeholder="Occupation" value={form.occupation} onChange={(e) => set('occupation', e.target.value)} error={errors.occupation} third />
                  <F label="Company/Organization" name="company" placeholder="Company name" value={form.company} onChange={(e) => set('company', e.target.value)} error={errors.company} third />
                </div>
              </div>

              {/* ── Mother's Information ── */}
              <div className="form-section">
                <div className="section-heading">
                  <MotherIcon />
                  <span>Mother's Information</span>
                </div>
                <div className="form-row">
                  <F label="First Name" name="motherFirstName" placeholder="Enter first name" value={form.motherFirstName} onChange={(e) => set('motherFirstName', e.target.value)} error={errors.motherFirstName} third />
                  <F label="Last Name" name="motherLastName" placeholder="Enter last name" value={form.motherLastName} onChange={(e) => set('motherLastName', e.target.value)} error={errors.motherLastName} third />
                  <F label="Email" name="motherEmail" type="email" placeholder="email@example.com" value={form.motherEmail} onChange={(e) => set('motherEmail', e.target.value)} error={errors.motherEmail} third />
                </div>
                <div className="form-row">
                  <F label="Phone Number" name="motherPhone" placeholder="+91 XXXXX XXXXX" value={form.motherPhone} onChange={(e) => set('motherPhone', e.target.value)} error={errors.motherPhone} third />
                  <F label="Occupation" name="motherOccupation" placeholder="Occupation" value={form.motherOccupation} onChange={(e) => set('motherOccupation', e.target.value)} error={errors.motherOccupation} third />
                  <F label="Company/Organization" name="motherCompany" placeholder="Company name" value={form.motherCompany} onChange={(e) => set('motherCompany', e.target.value)} error={errors.motherCompany} third />
                </div>
              </div>

              {/* ── Lead Information ── */}
              <div className="form-section">
                <div className="section-heading">
                  <LeadIcon />
                  <span>Lead Information</span>
                </div>
                <div className="form-row">
                  <S label="Lead Source" name="source" options={SOURCES} value={form.source} onChange={(e) => set('source', e.target.value)} error={errors.source}  half />
                  <S label="Assign Counselor" name="counselor" options={COUNSELORS} value={form.counselor} onChange={(e) => set('counselor', e.target.value)} error={errors.counselor} half />
                </div>
                <div className="form-row">
                  <div className="form-field" style={{ flex: 1 }}>
                    <label className="field-label">Notes / Remarks</label>
                    <textarea
                      className="field-textarea"
                      placeholder="Add any notes or remarks about this lead..."
                      rows={3}
                      value={form.notes}
                      onChange={e => set('notes', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ── Bulk Upload ── */
            <div className="bulk-upload">
              <div
                className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const droppedFile = e.dataTransfer.files[0]; console.log("DROPPED FILE:", droppedFile);  setFile(droppedFile); }}
              >
                <div className="drop-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <p className="drop-title">Drag &amp; drop your file here</p>
                <p className="drop-sub">Supports .xlsx, .csv files up to 10 MB</p>
                <label className="drop-btn">
                  Browse File
                  <input type="file"accept=".xlsx,.csv"style={{ display: 'none' }}onChange={(e) => {const selected = e.target.files[0];console.log("SELECTED FILE:", selected);setFile(selected);}}/>                </label>
              </div>
              <div className="bulk-template">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download sample template
              </div>
              <div className="bulk-rules">
                <p className="bulk-rules-title">File Requirements</p>
                <ul>
                  <li>First row must be column headers</li>
                  <li>Required columns: First Name, Last Name, Grade, Parent Name, Phone, Email</li>
                  <li>Maximum 500 leads per upload</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button 
            className="btn-cancel" 
            onClick={handleClose}
            disabled={loading}
            style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            Cancel
          </button>
          <div className="footer-actions">
            <button 
              className="btn-draft" 
              onClick={handleDraft}
              disabled={loading}
              style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              Save as Draft
            </button>
            <button 
              className="btn-add-lead" 
              onClick={tab === 'manual' ? handleAddLead : handleBulkUpload}
              disabled={loading}
              style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
                {loading 
                  ? (tab === 'manual' ? 'Adding...' : 'Uploading...') 
                  : (tab === 'manual' ? 'Add Lead' : 'Upload Leads')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function GradeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
}
function FatherIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function MotherIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function LeadIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
}
