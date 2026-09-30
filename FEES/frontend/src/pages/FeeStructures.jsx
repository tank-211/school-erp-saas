import React, { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Power, X, RefreshCw, AlertCircle } from "lucide-react";
import {
  fetchFeeStructures,
  fetchSchoolLookups,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
} from "../services/apiService";

// A school's fees per class and academic year. When an admission is completed,
// the active fees of its class and year are assigned to the student and billed
// on an invoice, so this page is the school's price list.

const FEE_TYPE_SUGGESTIONS = [
  "Tuition Fee",
  "Admission Fee",
  "Exam Fee",
  "Lab Fee",
  "Library Fee",
  "Sports Fee",
  "Transport Fee",
  "Development Fee",
];

const inr = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const formatDate = (ymd) => {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const canEdit = () => {
  try {
    const role = String(JSON.parse(localStorage.getItem("user") || "{}")?.role || "").toLowerCase();
    return role === "admin" || role === "accountant";
  } catch {
    return false;
  }
};

function Toast({ toast }) {
  if (!toast) return null;
  const bg = toast.type === "error" ? "var(--red)" : "var(--green)";
  return <div className="toast-notification" style={{ background: bg }}>{toast.message}</div>;
}

const emptyForm = (yearId = "", classId = "") => ({
  academicYearId: yearId,
  classId,
  feeType: "",
  amount: "",
  dueDate: "",
  description: "",
});

function FeeForm({ mode, initial, fee, years, classes, busy, error, onCancel, onSubmit }) {
  const [form, setForm] = useState(initial);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const editing = mode === "edit";

  const submit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onCancel}>
      <div className="upload-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{editing ? "Edit fee" : "Add fee"}</div>
            <div className="modal-subtitle">
              {editing ? `${fee.className} · ${fee.academicYear}` : "Fees are added to students of this class and year when their admission is completed."}
            </div>
          </div>
          <button className="modal-close" onClick={onCancel} disabled={busy} aria-label="Close"><X size={16} /></button>
        </div>
        <form className="modal-body" onSubmit={submit}>
          {error && (
            <div className="info-box info-box-orange" style={{ color: "var(--red-dark)", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{error}</span>
            </div>
          )}

          {!editing && (
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="fs-year">Academic year<span className="req">*</span></label>
                <select id="fs-year" className="form-select" value={form.academicYearId} onChange={set("academicYearId")} required>
                  <option value="">Select year</option>
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}{y.isActive ? " (active)" : ""}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="fs-class">Class<span className="req">*</span></label>
                <select id="fs-class" className="form-select" value={form.classId} onChange={set("classId")} required>
                  <option value="">Select class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="fs-type">Fee type<span className="req">*</span></label>
              <input
                id="fs-type"
                className="form-input"
                list="fs-type-options"
                value={form.feeType}
                onChange={set("feeType")}
                maxLength={100}
                placeholder="e.g. Tuition Fee"
                required
                autoComplete="off"
              />
              <datalist id="fs-type-options">
                {FEE_TYPE_SUGGESTIONS.map((t) => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="fs-amount">Amount (₹)<span className="req">*</span></label>
              <input
                id="fs-amount"
                className="form-input"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={set("amount")}
                required
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="fs-due">Due date</label>
              <input id="fs-due" className="form-input" type="date" value={form.dueDate} onChange={set("dueDate")} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="fs-desc">Description</label>
              <input id="fs-desc" className="form-input" value={form.description} onChange={set("description")} maxLength={1000} placeholder="Optional" />
            </div>
          </div>

          {editing && fee.assignedCount > 0 && (
            <p className="text-sm text-muted mb-4">
              {fee.assignedCount} student{fee.assignedCount === 1 ? " is" : "s are"} already billed {inr(fee.amount)} for this fee.
              A new amount applies to students assigned from now on; existing invoices do not change.
            </p>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving..." : editing ? "Save changes" : "Add fee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDialog({ dialog, busy, onCancel }) {
  if (!dialog) return null;
  return (
    <div className="modal-overlay" onClick={busy ? undefined : onCancel}>
      <div className="upload-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{dialog.title}</div>
          <button className="modal-close" onClick={onCancel} disabled={busy} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p className="text-sm text-muted mb-4">{dialog.message}</p>
          <div className="modal-actions" style={{ borderTop: "none", paddingTop: 0, marginTop: 0 }}>
            <button className="btn btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
            <button className={`btn ${dialog.danger ? "btn-danger" : "btn-primary"}`} onClick={dialog.onConfirm} disabled={busy}>
              {busy ? "Working..." : dialog.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeeStructures() {
  const editable = canEdit();
  const [fees, setFees] = useState([]);
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [showOff, setShowOff] = useState(true);
  const [formState, setFormState] = useState(null); // { mode, fee?, initial }
  const [formError, setFormError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = async () => {
    setLoading(true);
    setLoadError("");
    const [feeRes, lookupRes] = await Promise.all([fetchFeeStructures(), fetchSchoolLookups()]);
    if (!feeRes.success || !lookupRes.success) {
      setLoadError(feeRes.error || lookupRes.error || "Could not load fees");
      setLoading(false);
      return;
    }
    const yearList = lookupRes.data?.academicYears || [];
    setFees(Array.isArray(feeRes.data) ? feeRes.data : []);
    setYears(yearList);
    setClasses(lookupRes.data?.classes || []);
    // Start on the school's active year the first time
    setYearFilter((current) => current || yearList.find((y) => y.isActive)?.id || yearList[0]?.id || "");
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const activeYear = years.find((y) => y.isActive);
  const classOrder = useMemo(() => new Map(classes.map((c, i) => [c.id, i])), [classes]);

  const visible = useMemo(
    () =>
      fees
        .filter((f) => !yearFilter || f.academicYearId === yearFilter)
        .filter((f) => !classFilter || f.classId === classFilter)
        .filter((f) => showOff || f.isActive)
        .sort(
          (a, b) =>
            (classOrder.get(a.classId) ?? 999) - (classOrder.get(b.classId) ?? 999) ||
            a.feeType.localeCompare(b.feeType)
        ),
    [fees, yearFilter, classFilter, showOff, classOrder]
  );

  // Rows grouped by class, with each class's total of active fees
  const groups = useMemo(() => {
    const map = new Map();
    for (const f of visible) {
      if (!map.has(f.classId)) map.set(f.classId, { classId: f.classId, className: f.className, rows: [], total: 0 });
      const g = map.get(f.classId);
      g.rows.push(f);
      if (f.isActive) g.total += f.amount;
    }
    return [...map.values()];
  }, [visible]);

  const classesWithoutFees = useMemo(() => {
    if (!yearFilter || classFilter) return [];
    const priced = new Set(fees.filter((f) => f.academicYearId === yearFilter && f.isActive).map((f) => f.classId));
    return classes.filter((c) => !priced.has(c.id));
  }, [fees, classes, yearFilter, classFilter]);

  const selectedYearName = years.find((y) => y.id === yearFilter)?.name;

  const openAdd = (classId = classFilter) => {
    setFormError("");
    setFormState({ mode: "add", initial: emptyForm(yearFilter || activeYear?.id || "", classId || "") });
  };

  const openEdit = (fee) => {
    setFormError("");
    setFormState({
      mode: "edit",
      fee,
      initial: {
        academicYearId: fee.academicYearId,
        classId: fee.classId,
        feeType: fee.feeType,
        amount: String(fee.amount),
        dueDate: fee.dueDate || "",
        description: fee.description || "",
      },
    });
  };

  const submitForm = async (form) => {
    setBusy(true);
    setFormError("");
    const payload = {
      feeType: form.feeType.trim(),
      amount: form.amount,
      dueDate: form.dueDate || "",
      description: form.description.trim(),
    };
    const res =
      formState.mode === "edit"
        ? await updateFeeStructure(formState.fee.id, payload)
        : await createFeeStructure({ ...payload, academicYearId: form.academicYearId, classId: form.classId });
    setBusy(false);
    if (!res.success) {
      setFormError(res.error);
      return;
    }
    const saved = res.data;
    setFees((list) =>
      formState.mode === "edit" ? list.map((f) => (f.id === saved.id ? saved : f)) : [...list, saved]
    );
    if (formState.mode === "add" && saved.academicYearId !== yearFilter) setYearFilter(saved.academicYearId);
    setFormState(null);
    notify(formState.mode === "edit" ? "Fee updated" : `${saved.feeType} added for ${saved.className} (${saved.academicYear})`);
  };

  const toggleActive = (fee) => {
    const turningOff = fee.isActive;
    setDialog({
      title: turningOff ? `Switch off ${fee.feeType}?` : `Switch on ${fee.feeType}?`,
      message: turningOff
        ? `${fee.className} admissions for ${fee.academicYear} completed from now on will not be billed this fee. Students already billed keep their invoices.`
        : `${fee.className} admissions for ${fee.academicYear} completed from now on will be billed ${inr(fee.amount)} for this fee.`,
      confirmLabel: turningOff ? "Switch off" : "Switch on",
      danger: turningOff,
      onConfirm: async () => {
        setBusy(true);
        const res = await updateFeeStructure(fee.id, { isActive: !fee.isActive });
        setBusy(false);
        setDialog(null);
        if (!res.success) return notify(res.error, "error");
        setFees((list) => list.map((f) => (f.id === res.data.id ? res.data : f)));
        notify(turningOff ? "Fee switched off" : "Fee switched on");
      },
    });
  };

  const remove = (fee) => {
    setDialog({
      title: `Delete ${fee.feeType}?`,
      message: `This removes ${fee.feeType} (${inr(fee.amount)}) for ${fee.className}, ${fee.academicYear}. No student has been billed for it yet.`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        setBusy(true);
        const res = await deleteFeeStructure(fee.id);
        setBusy(false);
        setDialog(null);
        if (!res.success) return notify(res.error, "error");
        setFees((list) => list.filter((f) => f.id !== fee.id));
        notify("Fee deleted");
      },
    });
  };

  const noSetup = !loading && !loadError && (years.length === 0 || classes.length === 0);

  return (
    <div className="page">
      <Toast toast={toast} />
      <ConfirmDialog dialog={dialog} busy={busy} onCancel={() => !busy && setDialog(null)} />
      {formState && (
        <FeeForm
          key={formState.fee?.id || "new"}
          mode={formState.mode}
          fee={formState.fee}
          initial={formState.initial}
          years={years}
          classes={classes}
          busy={busy}
          error={formError}
          onCancel={() => !busy && setFormState(null)}
          onSubmit={submitForm}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Fee Structure</h1>
          <p className="page-sub">
            The fees for each class and academic year. When an admission is completed, the class's active fees are billed on the student's invoice.
          </p>
        </div>
        {editable && !noSetup && !loadError && (
          <button className="btn btn-primary" onClick={() => openAdd()} disabled={loading}>
            <Plus size={14} /> Add fee
          </button>
        )}
      </div>

      {loadError ? (
        <div className="card">
          <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
            <span style={{ color: "var(--red-dark)" }}>{loadError}</span>
            <button className="btn btn-outline btn-sm" onClick={load}><RefreshCw size={14} /> Try again</button>
          </div>
        </div>
      ) : noSetup ? (
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-muted">
              {years.length === 0 ? "No academic years" : "No classes"} are set up for your school yet. Add them in the Admission app under
              School Setup, then come back to set the fees.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="search-section">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className="filter-group">
                <label className="form-label" htmlFor="fs-filter-year">Academic year</label>
                <select id="fs-filter-year" className="filter-select" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}{y.isActive ? " (active)" : ""}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label className="form-label" htmlFor="fs-filter-class">Class</label>
                <select id="fs-filter-class" className="filter-select" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                  <option value="">All classes</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <label className="text-sm" style={{ display: "flex", gap: 6, alignItems: "center", paddingBottom: 10, whiteSpace: "nowrap" }}>
                <input type="checkbox" checked={showOff} onChange={(e) => setShowOff(e.target.checked)} /> Show switched-off fees
              </label>
            </div>
            {selectedYearName && activeYear && yearFilter !== activeYear.id && (
              <div className="info-box info-box-orange text-sm">
                You are viewing {selectedYearName}. Your school's active year is {activeYear.name}.
              </div>
            )}
          </div>

          <div className="students-table-wrapper">
            <div className="table-responsive">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Fee type</th>
                    <th>Amount</th>
                    <th>Due date</th>
                    <th>Students billed</th>
                    <th>Status</th>
                    {editable && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={editable ? 6 : 5}><div className="no-data">Loading fees...</div></td></tr>
                  ) : groups.length === 0 ? (
                    <tr>
                      <td colSpan={editable ? 6 : 5}>
                        <div className="no-data">
                          No fees for {classFilter ? classes.find((c) => c.id === classFilter)?.name : "any class"} in {selectedYearName || "this year"} yet.
                          {editable && (
                            <div style={{ marginTop: 10 }}>
                              <button className="btn btn-primary btn-sm" onClick={() => openAdd()}><Plus size={14} /> Add fee</button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    groups.map((g) => (
                      <React.Fragment key={g.classId}>
                        <tr style={{ background: "var(--gray-50)" }}>
                          <td colSpan={editable ? 6 : 5} style={{ fontWeight: 600 }}>
                            {g.className}
                            <span className="text-muted" style={{ fontWeight: 400, marginLeft: 8 }}>
                              Total {inr(g.total)} per student
                            </span>
                          </td>
                        </tr>
                        {g.rows.map((f) => (
                          <tr key={f.id} style={f.isActive ? undefined : { opacity: 0.6 }}>
                            <td>
                              <div style={{ fontWeight: 500 }}>{f.feeType}</div>
                              {f.description && <div className="text-sm text-muted">{f.description}</div>}
                            </td>
                            <td className="td-bold">{inr(f.amount)}</td>
                            <td>{formatDate(f.dueDate)}</td>
                            <td>{f.assignedCount}</td>
                            <td>
                              <span className={`badge ${f.isActive ? "badge-green" : "badge-gray"}`}>{f.isActive ? "Active" : "Switched off"}</span>
                            </td>
                            {editable && (
                              <td>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button className="action-btn" title="Edit" aria-label={`Edit ${f.feeType}`} onClick={() => openEdit(f)}>
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    className="action-btn"
                                    title={f.isActive ? "Switch off" : "Switch on"}
                                    aria-label={`${f.isActive ? "Switch off" : "Switch on"} ${f.feeType}`}
                                    onClick={() => toggleActive(f)}
                                  >
                                    <Power size={14} />
                                  </button>
                                  <button
                                    className="action-btn"
                                    title={f.assignedCount > 0 ? "Already billed to students: switch it off instead" : "Delete"}
                                    aria-label={`Delete ${f.feeType}`}
                                    onClick={() => remove(f)}
                                    disabled={f.assignedCount > 0}
                                    style={f.assignedCount > 0 ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!loading && classesWithoutFees.length > 0 && (
            <div className="info-box info-box-blue text-sm" style={{ marginTop: 16 }}>
              No active fees in {selectedYearName} for: {classesWithoutFees.map((c) => c.name).join(", ")}. Admissions to these
              classes are completed without an invoice.
              {editable && classesWithoutFees.length === 1 && (
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => openAdd(classesWithoutFees[0].id)}>
                  <Plus size={14} /> Add fee for {classesWithoutFees[0].name}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
