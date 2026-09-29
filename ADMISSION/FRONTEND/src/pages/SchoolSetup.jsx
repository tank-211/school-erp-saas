import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays, CheckCircle, Circle, GraduationCap, Layers, Pencil, Plus, Trash2, X,
} from "lucide-react";
import {
  fetchSetupOverview,
  createAcademicYear, updateAcademicYear, activateAcademicYear, deleteAcademicYear,
  createClass, createClassesBulk, updateClass, deleteClass,
  createSection, updateSection, deleteSection,
} from "../services/setupService.js";

/**
 * School Setup (admin only): academic years, classes and sections.
 * A school needs an active academic year before it can add leads, and at least
 * one class with a section before it can admit students.
 */

const STANDARD_CLASSES = [
  { class_name: "Nursery", class_numeric_value: -2 },
  { class_name: "LKG", class_numeric_value: -1 },
  { class_name: "UKG", class_numeric_value: 0 },
  ...Array.from({ length: 12 }, (_, i) => ({ class_name: `Class ${i + 1}`, class_numeric_value: i + 1 })),
];

const formatDate = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

// Suggest the year after the latest one (or the current Indian school year)
const suggestYear = (years) => {
  const latest = [...years].sort((a, b) => (a.end_date < b.end_date ? 1 : -1))[0];
  let start;
  if (latest?.end_date) {
    const next = new Date(`${latest.end_date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    start = next.getUTCFullYear();
  } else {
    const now = new Date();
    start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  }
  return {
    year_name: `${start}-${String((start + 1) % 100).padStart(2, "0")}`,
    start_date: `${start}-04-01`,
    end_date: `${start + 1}-03-31`,
  };
};

function Modal({ title, onClose, children, error }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {error && (
            <div role="alert" style={{ marginBottom: 12, background: "var(--red-bg)", borderRadius: "var(--r)", padding: "8px 12px", fontSize: 13, color: "#b91c1c" }}>
              {error}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div className="form-group" style={{ marginBottom: 14 }}>
      <label className="form-label">{label}</label>
      {children}
      {hint && <span style={{ fontSize: 12, color: "var(--gray-500)" }}>{hint}</span>}
    </div>
  );
}

function FormActions({ saving, onCancel, label }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
      <button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
      <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : label}</button>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function YearModal({ year, suggestion, onClose, onSaved, onError, error }) {
  const [form, setForm] = useState(
    year
      ? { year_name: year.year_name, start_date: year.start_date, end_date: year.end_date, make_active: false }
      : { ...suggestion, make_active: false }
  );
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = year
        ? await updateAcademicYear(year.id, form)
        : await createAcademicYear(form);
      onSaved(result.message);
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={year ? "Edit academic year" : "Add academic year"} onClose={onClose} error={error}>
      <form onSubmit={submit}>
        <Field label="Year name" hint="For example 2026-27">
          <input className="form-input" value={form.year_name} onChange={set("year_name")} required maxLength={50} />
        </Field>
        <div className="grid-2">
          <Field label="Starts on">
            <input type="date" className="form-input" value={form.start_date} onChange={set("start_date")} required />
          </Field>
          <Field label="Ends on">
            <input type="date" className="form-input" value={form.end_date} onChange={set("end_date")} required />
          </Field>
        </div>
        {!year && (
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, marginBottom: 8 }}>
            <input type="checkbox" checked={form.make_active} onChange={set("make_active")} />
            Make this the active year (new leads and admissions will use it)
          </label>
        )}
        <FormActions saving={saving} onCancel={onClose} label={year ? "Save changes" : "Add year"} />
      </form>
    </Modal>
  );
}

function ClassModal({ schoolClass, onClose, onSaved, onError, error }) {
  const [form, setForm] = useState(
    schoolClass
      ? { class_name: schoolClass.class_name, class_numeric_value: schoolClass.class_numeric_value, medium: schoolClass.medium || "" }
      : { class_name: "", class_numeric_value: "", medium: "", sections: "A" }
  );
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        class_name: form.class_name,
        class_numeric_value: Number(form.class_numeric_value),
        medium: form.medium,
      };
      const result = schoolClass
        ? await updateClass(schoolClass.id, payload)
        : await createClass({ ...payload, sections: form.sections.split(",").map((s) => s.trim()).filter(Boolean) });
      onSaved(result.message);
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={schoolClass ? "Edit class" : "Add class"} onClose={onClose} error={error}>
      <form onSubmit={submit}>
        <Field label="Class name" hint="For example Class 5, LKG">
          <input className="form-input" value={form.class_name} onChange={set("class_name")} required maxLength={100} />
        </Field>
        <div className="grid-2">
          <Field label="Order" hint="Sorts classes: Nursery -2, LKG -1, UKG 0, Class 1 = 1">
            <input type="number" className="form-input" value={form.class_numeric_value} onChange={set("class_numeric_value")} required min={-5} max={20} step={1} />
          </Field>
          <Field label="Medium (optional)">
            <input className="form-input" value={form.medium} onChange={set("medium")} placeholder="English" maxLength={50} />
          </Field>
        </div>
        {!schoolClass && (
          <Field label="Sections" hint="Comma-separated, for example A, B, C">
            <input className="form-input" value={form.sections} onChange={set("sections")} />
          </Field>
        )}
        <FormActions saving={saving} onCancel={onClose} label={schoolClass ? "Save changes" : "Add class"} />
      </form>
    </Modal>
  );
}

function StandardClassesModal({ existingNames, onClose, onSaved, onError, error }) {
  const [picked, setPicked] = useState(
    () => new Set(STANDARD_CLASSES.filter((c) => !existingNames.has(c.class_name.toLowerCase())).map((c) => c.class_name))
  );
  const [sections, setSections] = useState("A");
  const [saving, setSaving] = useState(false);

  const toggle = (name) => {
    const next = new Set(picked);
    next.has(name) ? next.delete(name) : next.add(name);
    setPicked(next);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await createClassesBulk({
        classes: STANDARD_CLASSES.filter((c) => picked.has(c.class_name)),
        sections: sections.split(",").map((s) => s.trim()).filter(Boolean),
      });
      onSaved(result.message);
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add standard classes" onClose={onClose} error={error}>
      <form onSubmit={submit}>
        <p style={{ fontSize: 13, color: "var(--gray-500)", marginBottom: 12 }}>
          Pick the classes your school runs. Classes you already have are greyed out.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 14 }}>
          {STANDARD_CLASSES.map((c) => {
            const exists = existingNames.has(c.class_name.toLowerCase());
            return (
              <label key={c.class_name} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14, color: exists ? "var(--gray-400)" : "inherit" }}>
                <input type="checkbox" disabled={exists} checked={!exists && picked.has(c.class_name)} onChange={() => toggle(c.class_name)} />
                {c.class_name}
              </label>
            );
          })}
        </div>
        <Field label="Sections for each class" hint="Comma-separated, for example A, B">
          <input className="form-input" value={sections} onChange={(e) => setSections(e.target.value)} />
        </Field>
        <FormActions saving={saving} onCancel={onClose} label={`Add ${picked.size} class${picked.size === 1 ? "" : "es"}`} />
      </form>
    </Modal>
  );
}

function SectionModal({ schoolClass, section, onClose, onSaved, onError, error }) {
  const [form, setForm] = useState(
    section
      ? { section_name: section.section_name, capacity: section.capacity ?? 60, class_teacher: section.class_teacher || "" }
      : { section_name: "", capacity: 60, class_teacher: "" }
  );
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, capacity: Number(form.capacity) };
      const result = section
        ? await updateSection(section.id, payload)
        : await createSection(schoolClass.id, payload);
      onSaved(result.message);
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={section ? `Edit section ${section.section_name}` : `Add section to ${schoolClass.class_name}`} onClose={onClose} error={error}>
      <form onSubmit={submit}>
        <div className="grid-2">
          <Field label="Section name">
            <input className="form-input" value={form.section_name} onChange={set("section_name")} required maxLength={50} placeholder="A" />
          </Field>
          <Field label="Capacity">
            <input type="number" className="form-input" value={form.capacity} onChange={set("capacity")} min={1} max={500} step={1} />
          </Field>
        </div>
        <Field label="Class teacher (optional)">
          <input className="form-input" value={form.class_teacher} onChange={set("class_teacher")} maxLength={150} />
        </Field>
        <FormActions saving={saving} onCancel={onClose} label={section ? "Save changes" : "Add section"} />
      </form>
    </Modal>
  );
}

/* ---------------------------------------------------------------- */

function ChecklistItem({ done, title, detail }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0" }}>
      {done
        ? <CheckCircle size={20} style={{ color: "var(--green)", flexShrink: 0 }} />
        : <Circle size={20} style={{ color: "var(--gray-300)", flexShrink: 0 }} />}
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--gray-500)" }}>{detail}</div>
      </div>
    </div>
  );
}

export function SchoolSetup() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(null); // { type, ...props }
  const [modalError, setModalError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      setData(await fetchSetupOverview());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const closeModal = () => {
    setModal(null);
    setModalError("");
  };

  const done = (message) => {
    closeModal();
    setNotice(message);
    setError("");
    load();
  };

  // Errors from a dialog show inside it; others at the top of the page
  const showError = (message) => (modal ? setModalError(message) : setError(message));

  const run = async (action) => {
    try {
      const result = await action();
      done(result.message);
    } catch (err) {
      showError(err.message);
    }
  };

  const years = data?.academic_years || [];
  const classes = data?.classes || [];
  const checklist = data?.checklist;
  const existingNames = useMemo(() => new Set(classes.map((c) => c.class_name.toLowerCase())), [classes]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">School Setup</h1>
          <p className="page-sub">Academic years, classes and sections for your school</p>
        </div>
      </div>

      {notice && (
        <div role="status" style={{ marginBottom: 16, background: "var(--green-bg)", border: "1px solid #86efac", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 14, color: "#15803d", display: "flex", justifyContent: "space-between" }}>
          <span>{notice}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNotice("")}>Dismiss</button>
        </div>
      )}
      {error && (
        <div role="alert" style={{ marginBottom: 16, background: "var(--red-bg)", border: "1px solid #fca5a5", borderRadius: "var(--r)", padding: "10px 14px", fontSize: 14, color: "#b91c1c", display: "flex", justifyContent: "space-between" }}>
          <span>{error}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="card"><div className="card-body">Loading setup…</div></div>
      ) : !data ? null : (
        <>
          {/* Checklist */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><div className="card-title">Setup checklist</div></div>
            <div className="card-body">
              <ChecklistItem
                done={checklist.has_active_year}
                title="Active academic year"
                detail={checklist.has_active_year
                  ? `${checklist.active_year.year_name} is active. New leads and admissions use it.`
                  : "Add an academic year and make it active. Leads cannot be added until then."}
              />
              <ChecklistItem
                done={checklist.class_count > 0}
                title="Classes"
                detail={checklist.class_count > 0 ? `${checklist.class_count} class${checklist.class_count === 1 ? "" : "es"} set up.` : "Add the classes your school runs."}
              />
              <ChecklistItem
                done={checklist.section_count > 0 && checklist.classes_without_sections.length === 0}
                title="Sections"
                detail={checklist.section_count === 0
                  ? "Add at least one section per class. Students are admitted into a section."
                  : checklist.classes_without_sections.length
                    ? `No sections yet in: ${checklist.classes_without_sections.join(", ")}.`
                    : `${checklist.section_count} section${checklist.section_count === 1 ? "" : "s"} across all classes.`}
              />
            </div>
          </div>

          {/* Academic years */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ justifyContent: "space-between" }}>
              <div className="card-title" style={{ display: "flex", gap: 8, alignItems: "center" }}><CalendarDays size={18} /> Academic years</div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal({ type: "year" })}>
                <Plus size={16} /> Add year
              </button>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {years.length === 0 ? (
                <div style={{ padding: 20, color: "var(--gray-500)", fontSize: 14 }}>No academic years yet.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr><th>Year</th><th>Dates</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr>
                    </thead>
                    <tbody>
                      {years.map((y) => (
                        <tr key={y.id}>
                          <td style={{ fontWeight: 600 }}>{y.year_name}</td>
                          <td>{formatDate(y.start_date)} – {formatDate(y.end_date)}</td>
                          <td>{y.is_active ? <span className="badge badge-green">Active</span> : <span className="badge badge-gray">{y.status === "completed" ? "Completed" : "Inactive"}</span>}</td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            {!y.is_active && (
                              <button type="button" className="btn btn-outline btn-sm" onClick={() => {
                                if (window.confirm(`Make ${y.year_name} the active year? New leads and admissions will use it.`)) {
                                  run(() => activateAcademicYear(y.id));
                                }
                              }}>Make active</button>
                            )}{" "}
                            <button type="button" className="btn btn-ghost btn-icon" aria-label={`Edit ${y.year_name}`} onClick={() => setModal({ type: "year", year: y })}><Pencil size={16} /></button>
                            {!y.is_active && (
                              <button type="button" className="btn btn-ghost btn-icon" aria-label={`Delete ${y.year_name}`} onClick={() => {
                                if (window.confirm(`Delete ${y.year_name}? Only unused years can be deleted.`)) run(() => deleteAcademicYear(y.id));
                              }}><Trash2 size={16} /></button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Classes and sections */}
          <div className="card">
            <div className="card-header" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div className="card-title" style={{ display: "flex", gap: 8, alignItems: "center" }}><GraduationCap size={18} /> Classes and sections</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setModal({ type: "standard" })}>
                  <Layers size={16} /> Add standard classes
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal({ type: "class" })}>
                  <Plus size={16} /> Add class
                </button>
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {classes.length === 0 ? (
                <div style={{ padding: 20, color: "var(--gray-500)", fontSize: 14 }}>
                  No classes yet. Use “Add standard classes” to add Nursery to Class 12 in one step.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr><th>Class</th><th>Sections</th><th style={{ textAlign: "right" }}>Actions</th></tr>
                    </thead>
                    <tbody>
                      {classes.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{c.class_name}</div>
                            {c.medium && <div style={{ fontSize: 12, color: "var(--gray-500)" }}>{c.medium}</div>}
                          </td>
                          <td>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                              {c.sections.length === 0 && <span style={{ fontSize: 13, color: "var(--orange)" }}>No sections</span>}
                              {c.sections.map((s) => (
                                <span key={s.id} className="badge badge-teal" style={{ gap: 4 }}>
                                  <button type="button" onClick={() => setModal({ type: "section", schoolClass: c, section: s })}
                                    style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "inherit", font: "inherit" }}
                                    title={`Capacity ${s.capacity ?? "—"}${s.class_teacher ? ` · ${s.class_teacher}` : ""}`}>
                                    {s.section_name}
                                  </button>
                                  <button type="button" aria-label={`Delete section ${s.section_name}`}
                                    onClick={() => { if (window.confirm(`Delete section ${s.section_name} of ${c.class_name}?`)) run(() => deleteSection(s.id)); }}
                                    style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "inherit", display: "flex" }}>
                                    <X size={12} />
                                  </button>
                                </span>
                              ))}
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal({ type: "section", schoolClass: c })}>
                                <Plus size={14} /> Section
                              </button>
                            </div>
                          </td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            <button type="button" className="btn btn-ghost btn-icon" aria-label={`Edit ${c.class_name}`} onClick={() => setModal({ type: "class", schoolClass: c })}><Pencil size={16} /></button>
                            <button type="button" className="btn btn-ghost btn-icon" aria-label={`Delete ${c.class_name}`} onClick={() => {
                              if (window.confirm(`Delete ${c.class_name} and its sections? Only classes with no admissions or fee structures can be deleted.`)) run(() => deleteClass(c.id));
                            }}><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {modal?.type === "year" && (
        <YearModal year={modal.year} suggestion={suggestYear(years)} onClose={closeModal} onSaved={done} onError={showError} error={modalError} />
      )}
      {modal?.type === "class" && (
        <ClassModal schoolClass={modal.schoolClass} onClose={closeModal} onSaved={done} onError={showError} error={modalError} />
      )}
      {modal?.type === "standard" && (
        <StandardClassesModal existingNames={existingNames} onClose={closeModal} onSaved={done} onError={showError} error={modalError} />
      )}
      {modal?.type === "section" && (
        <SectionModal schoolClass={modal.schoolClass} section={modal.section} onClose={closeModal} onSaved={done} onError={showError} error={modalError} />
      )}
    </div>
  );
}

export default SchoolSetup;
