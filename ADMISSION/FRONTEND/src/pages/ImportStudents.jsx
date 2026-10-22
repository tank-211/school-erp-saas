import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle, Download, FileSpreadsheet, RotateCcw, Upload, X } from "lucide-react";
import {
  downloadTemplate, previewImport, runImport, fetchBatches, undoImport,
  fetchFollowUp, assignClass, markDocument,
} from "../services/studentImportService.js";

/**
 * Import Existing Students (school admins): students who were admitted before
 * the school started using the ERP, with their class, fee position (total and
 * amount already paid) and documents. Nothing is saved until the preview is
 * clean and the admin presses Import; an import can be undone until new fees
 * are collected from those students.
 */

const inr = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const when = (iso) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

const FEE_BADGE = {
  paid: ["badge-green", "Paid"],
  partial: ["badge-orange", "Partly paid"],
  unpaid: ["badge-yellow", "Not paid"],
  no_fee: ["badge-gray", "No fee"],
};

function Banner({ kind, children, onClose }) {
  const ok = kind === "ok";
  return (
    <div
      role={ok ? "status" : "alert"}
      style={{
        marginBottom: 16, borderRadius: "var(--r)", padding: "10px 14px", fontSize: 14, display: "flex", justifyContent: "space-between", gap: 12,
        background: ok ? "var(--green-bg)" : "var(--red-bg)", border: `1px solid ${ok ? "#86efac" : "#fca5a5"}`, color: ok ? "#15803d" : "#b91c1c",
      }}
    >
      <span>{children}</span>
      {onClose && <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Dismiss"><X size={14} /></button>}
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="stat-card" style={{ padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: "var(--gray-500)" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: tone || "var(--gray-800)" }}>{value}</div>
    </div>
  );
}

/* ---------------- Import tab ---------------- */

function ImportTab({ onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const input = useRef(null);

  const check = async (chosen) => {
    setError(""); setResult(null); setPreview(null);
    if (!chosen) return;
    setBusy("check");
    try {
      const data = await previewImport(chosen);
      setPreview(data);
      setOnlyProblems(data.counts.with_errors > 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  const pick = (e) => {
    const chosen = e.target.files?.[0] || null;
    setFile(chosen);
    check(chosen);
  };

  const doImport = async () => {
    if (!file || !preview) return;
    const c = preview.counts;
    if (!window.confirm(`Import ${c.ready} students? They will appear in Admission and Fees right away. You can undo this import from History until new fees are collected from them.`)) return;
    setBusy("import"); setError("");
    try {
      const res = await runImport(file);
      setResult(res.data);
      setPreview(null); setFile(null);
      if (input.current) input.current.value = "";
      onImported?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  const c = preview?.counts;
  const rows = useMemo(() => (preview?.rows || []).filter((r) => !onlyProblems || r.errors.length), [preview, onlyProblems]);
  const canImport = c && c.ready > 0 && c.with_errors === 0 && !c.too_many;

  return (
    <>
      {error && <Banner kind="error" onClose={() => setError("")}>{error}</Banner>}
      {result && (
        <Banner kind="ok" onClose={() => setResult(null)}>
          {result.student_count} students imported (fees {inr(result.invoice_total)}, already paid {inr(result.paid_total)}).
          {result.class_pending_count ? ` ${result.class_pending_count} still need a class` : ""}
          {result.documents_pending_count ? `${result.class_pending_count ? " and" : ""} ${result.documents_pending_count} have documents pending` : ""}
          {result.class_pending_count || result.documents_pending_count ? " — see Needs attention." : ""}
        </Banner>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><div className="card-title">1. Download the template</div></div>
        <div className="card-body">
          <p style={{ fontSize: 14, color: "var(--gray-600)", margin: "0 0 12px" }}>
            One row per student: class and section, parents, this year's total fee, the amount already paid and the date of the last
            payment, and Yes/No for each document the school already has. The <strong>Classes</strong> sheet lists your classes and
            sections exactly as they must be written. Leave Class empty for students whose class is not decided yet.
          </p>
          <button type="button" className="btn btn-outline" disabled={!!busy}
            onClick={async () => { setError(""); try { await downloadTemplate(); } catch (e) { setError(e.message); } }}>
            <Download size={16} /> Download template (.xlsx)
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><div className="card-title">2. Upload the filled file and check it</div></div>
        <div className="card-body">
          <p style={{ fontSize: 14, color: "var(--gray-600)", margin: "0 0 12px" }}>
            Every row is checked first. Nothing is saved until all rows are correct and you press Import.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label className="btn btn-primary" style={{ cursor: busy ? "default" : "pointer" }}>
              <Upload size={16} /> {file ? "Choose another file" : "Choose file"}
              <input ref={input} type="file" accept=".xlsx,.xls,.csv" onChange={pick} disabled={!!busy} style={{ display: "none" }} />
            </label>
            {file && (
              <span style={{ fontSize: 14, color: "var(--gray-600)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FileSpreadsheet size={16} /> {file.name}
              </span>
            )}
            {file && <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => check(file)}>Check again</button>}
            {busy === "check" && <span style={{ fontSize: 14 }}>Checking…</span>}
          </div>
        </div>
      </div>

      {c && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">3. Check and import</div>
            <label style={{ fontSize: 13, display: "inline-flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} /> Only rows with problems
            </label>
          </div>
          <div className="card-body">
            {c.empty ? (
              <p style={{ fontSize: 14 }}>The file has no student rows.</p>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 14 }}>
                  <Stat label="Ready to import" value={c.ready} tone="#15803d" />
                  <Stat label="Rows with problems" value={c.with_errors} tone={c.with_errors ? "#b91c1c" : undefined} />
                  <Stat label="Class pending" value={c.class_pending} />
                  <Stat label="Paid / partly / not paid" value={`${c.paid} / ${c.partial} / ${c.unpaid}`} />
                  <Stat label="Fees this year" value={inr(c.total_fee)} />
                  <Stat label="Already paid" value={inr(c.total_paid)} />
                </div>
                {c.too_many && <Banner kind="error">At most {c.too_many} students can be imported at once; split the file.</Banner>}
                {c.with_errors > 0 && (
                  <Banner kind="error">
                    {c.with_errors} row{c.with_errors === 1 ? " has" : "s have"} problems (listed below). Fix them in your file, save it, and press
                    "Check again". Nothing has been imported.
                  </Banner>
                )}
                <div className="table-wrap" style={{ marginBottom: 14, maxHeight: 460, overflowY: "auto" }}>
                  <table className="table">
                    <thead>
                      <tr><th>Row</th><th>Adm. No</th><th>Student</th><th>Class</th><th>Fee</th><th>Docs pending</th><th>Problems / notes</th></tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const [cls, label] = FEE_BADGE[r.fee_status] || FEE_BADGE.no_fee;
                        return (
                          <tr key={r.row}>
                            <td>{r.row}</td>
                            <td>{r.admission_number || "—"}</td>
                            <td>{r.name || "—"}</td>
                            <td>{r.class_label}</td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              <span className={`badge ${cls}`}>{label}</span>
                              {r.fee_status !== "no_fee" && (
                                <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 2 }}>{inr(r.paid)} of {inr(r.total)}</div>
                              )}
                            </td>
                            <td>{r.documents_pending ? `${r.documents_pending} of 7` : "None"}</td>
                            <td style={{ fontSize: 13, minWidth: 260 }}>
                              {r.errors.map((m) => (
                                <div key={m} style={{ color: "#b91c1c", display: "flex", gap: 4 }}><AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 3 }} /> {m}</div>
                              ))}
                              {r.warnings.map((m) => <div key={m} style={{ color: "var(--gray-500)" }}>{m}</div>)}
                              {!r.errors.length && !r.warnings.length && <span style={{ color: "#15803d" }}>OK</span>}
                            </td>
                          </tr>
                        );
                      })}
                      {!rows.length && <tr><td colSpan={7}>No rows to show.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="btn btn-primary" disabled={!canImport || !!busy} onClick={doImport}>
                  {busy === "import" ? "Importing…" : c.with_errors ? "Fix the problems first" : `Import ${c.ready} students`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- Needs attention tab ---------------- */

function ClassRow({ item, classes, onSaved, setError }) {
  const [classId, setClassId] = useState(item.class_id || "");
  const [sectionId, setSectionId] = useState(item.section_id || "");
  const [saving, setSaving] = useState(false);
  const sections = classes.find((c) => c.id === classId)?.sections || [];
  const save = async () => {
    setSaving(true); setError("");
    try {
      await assignClass(item.admission_id, classId, sectionId);
      onSaved(`${item.name}: class saved.`);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };
  return (
    <tr>
      <td>{item.admission_number}</td>
      <td>{item.name}</td>
      <td>
        <select className="form-input" value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(""); }} aria-label={`Class for ${item.name}`}>
          <option value="">Choose class</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </td>
      <td>
        <select className="form-input" value={sectionId} onChange={(e) => setSectionId(e.target.value)} disabled={!classId} aria-label={`Section for ${item.name}`}>
          <option value="">Choose section</option>
          {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </td>
      <td><button type="button" className="btn btn-primary btn-sm" disabled={!classId || !sectionId || saving} onClick={save}>{saving ? "Saving…" : "Save"}</button></td>
    </tr>
  );
}

function DocumentChip({ item, doc, onSaved, setError }) {
  const [busy, setBusy] = useState(false);
  const file = useRef(null);
  const save = async (chosen) => {
    setBusy(true); setError("");
    try {
      await markDocument(item.admission_id, doc.type, chosen || null);
      onSaved(`${item.name}: ${doc.label} ${chosen ? "uploaded" : "marked as received"}.`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, border: "1px solid var(--gray-200)", borderRadius: "var(--r-full)", padding: "2px 4px 2px 10px", margin: "0 6px 6px 0", fontSize: 12 }}>
      {doc.label}
      <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => save(null)} title="The school has a paper copy">Received</button>
      <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => file.current?.click()} title="Upload a scan (PDF, JPG, PNG)">Upload</button>
      <input ref={file} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && save(e.target.files[0])} />
    </span>
  );
}

function FollowUpTab({ refreshKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try { setData(await fetchFollowUp()); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);
  const saved = (msg) => { setNotice(msg); load(); };

  if (!data) return error ? <Banner kind="error">{error}</Banner> : <div className="card"><div className="card-body">Loading…</div></div>;
  return (
    <>
      {error && <Banner kind="error" onClose={() => setError("")}>{error}</Banner>}
      {notice && <Banner kind="ok" onClose={() => setNotice("")}>{notice}</Banner>}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Class or section pending ({data.class_pending.length})</div>
            <div className="card-sub">Imported students who still need a class and section.</div>
          </div>
        </div>
        <div className="card-body card-body-p0">
          {data.class_pending.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Adm. No</th><th>Student</th><th>Class</th><th>Section</th><th /></tr></thead>
                <tbody>
                  {data.class_pending.map((item) => (
                    <ClassRow key={item.admission_id} item={item} classes={data.classes} onSaved={saved} setError={setError} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ padding: "0 20px 16px", fontSize: 14, display: "flex", gap: 6, alignItems: "center" }}><CheckCircle size={16} color="#15803d" /> Every imported student has a class.</p>
          )}
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Documents pending ({data.documents_pending.length})</div>
            <div className="card-sub">Mark a document Received when the school has a paper copy, or Upload a scan.</div>
          </div>
        </div>
        <div className="card-body card-body-p0">
          {data.documents_pending.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Adm. No</th><th>Student</th><th>Pending documents</th></tr></thead>
                <tbody>
                  {data.documents_pending.map((item) => (
                    <tr key={item.admission_id}>
                      <td>{item.admission_number}</td>
                      <td>{item.name}</td>
                      <td>{item.documents_pending.map((doc) => <DocumentChip key={doc.type} item={item} doc={doc} onSaved={saved} setError={setError} />)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ padding: "0 20px 16px", fontSize: 14, display: "flex", gap: 6, alignItems: "center" }}><CheckCircle size={16} color="#15803d" /> No documents pending for imported students.</p>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------------- History tab ---------------- */

function HistoryTab({ refreshKey, onUndone }) {
  const [batches, setBatches] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    try { setBatches(await fetchBatches()); } catch (e) { setError(e.message); setBatches([]); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const undo = async (b) => {
    if (!window.confirm(`Undo the import of ${b.student_count} students from ${when(b.created_at)}? Those students, their admissions, fees, opening payments and documents will be removed.`)) return;
    setBusy(b.id); setError("");
    try {
      const res = await undoImport(b.id);
      setNotice(res.message);
      load(); onUndone?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      {error && <Banner kind="error" onClose={() => setError("")}>{error}</Banner>}
      {notice && <Banner kind="ok" onClose={() => setNotice("")}>{notice}</Banner>}
      <div className="card">
        <div className="card-header"><div className="card-title">Past imports</div></div>
        <div className="card-body card-body-p0">
          {!batches ? <p style={{ padding: "0 20px 16px" }}>Loading…</p> : !batches.length ? (
            <p style={{ padding: "0 20px 16px", fontSize: 14 }}>No imports yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>When</th><th>File</th><th>By</th><th>Students</th><th>Fees / paid</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id}>
                      <td>{when(b.created_at)}</td>
                      <td>{b.file_name || "—"}</td>
                      <td>{b.created_by || "—"}</td>
                      <td>{b.student_count}{b.class_pending_count ? ` (${b.class_pending_count} class pending)` : ""}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{inr(b.invoice_total)} / {inr(b.paid_total)}</td>
                      <td>{b.status === "undone" ? <span className="badge badge-gray">Undone {when(b.undone_at)}</span> : <span className="badge badge-green">Imported</span>}</td>
                      <td>
                        {b.status === "imported" && (
                          <button type="button" className="btn btn-outline btn-sm" disabled={!!busy} onClick={() => undo(b)}>
                            <RotateCcw size={14} /> {busy === b.id ? "Undoing…" : "Undo"}
                          </button>
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
    </>
  );
}

export function ImportStudents() {
  const [tab, setTab] = useState("import");
  const [refreshKey, setRefreshKey] = useState(0);
  const changed = () => setRefreshKey((k) => k + 1);
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Import Existing Students</h1>
          <p className="page-sub">Bring in students admitted before the ERP — with their class, fees already paid and documents</p>
        </div>
      </div>
      <div className="tabs" role="tablist">
        {[["import", "Import"], ["followup", "Needs attention"], ["history", "History"]].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={`tab-btn ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      {tab === "import" && <ImportTab onImported={changed} />}
      {tab === "followup" && <FollowUpTab refreshKey={refreshKey} />}
      {tab === "history" && <HistoryTab refreshKey={refreshKey} onUndone={changed} />}
    </div>
  );
}

export default ImportStudents;
