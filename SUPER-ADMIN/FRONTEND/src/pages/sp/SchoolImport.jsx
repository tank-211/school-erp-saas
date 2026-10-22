import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { superAdminService } from "../../services/superAdminService";
import { isSuperAdmin, VIEW_ONLY_HINT } from "../../utils/role";

// Import a school's existing students (admitted before the ERP): class, fee
// position (total and amount already paid) and documents. Same rules as the
// school admin's "Import Students" page in the Admission app.
const inr = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const when = (iso) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
const FEE = { paid: ["sp-pill", "Paid"], partial: ["sp-pill sp-pill-warning", "Partly paid"], unpaid: ["sp-pill sp-pill-danger", "Not paid"], no_fee: ["sp-pill sp-pill-warning", "No fee"] };

function Kpi({ label, value }) {
  return (
    <div className="sp-card" style={{ padding: "12px 14px" }}>
      <div className="sp-kpi-label">{label}</div>
      <div className="sp-kpi-value" style={{ fontSize: 22 }}>{value}</div>
    </div>
  );
}

function ImportPanel({ id, canEdit, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const input = useRef(null);

  const check = async (chosen) => {
    setError(""); setNotice(""); setPreview(null);
    if (!chosen) return;
    setBusy("check");
    try {
      const data = await superAdminService.previewStudentImport(id, chosen);
      setPreview(data);
      setOnlyProblems(data.counts.with_errors > 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  const doImport = async () => {
    if (!window.confirm(`Import ${preview.counts.ready} students into this school? They appear in Admission and Fees right away and can be undone from History until new fees are collected.`)) return;
    setBusy("import"); setError("");
    try {
      const res = await superAdminService.runStudentImport(id, file);
      setNotice(`${res.message} Fees ${inr(res.invoice_total)}, already paid ${inr(res.paid_total)}.${res.class_pending_count ? ` ${res.class_pending_count} need a class (see Needs attention).` : ""}`);
      setPreview(null); setFile(null);
      if (input.current) input.current.value = "";
      onImported();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  const c = preview?.counts;
  const rows = useMemo(() => (preview?.rows || []).filter((r) => !onlyProblems || r.errors.length), [preview, onlyProblems]);

  return (
    <>
      {error && <div className="sp-error" style={{ marginBottom: 12 }}>{error}</div>}
      {notice && <div className="sp-success" style={{ marginBottom: 12 }}>{notice}</div>}
      <article className="sp-card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>1. Template</h2>
        <p className="sp-subtle-copy">
          One row per student with class and section, parents, this year's total fee, the amount already paid with the last payment date,
          and Yes/No per document. The Classes sheet lists this school's classes and sections. Leave Class empty when it is not decided yet.
        </p>
        <button type="button" className="sp-btn sp-btn-secondary" onClick={async () => { setError(""); try { await superAdminService.downloadStudentImportTemplate(id); } catch (e) { setError(e.message); } }}>
          Download template (.xlsx)
        </button>
      </article>

      <fieldset disabled={!canEdit} className="sp-fieldset" title={canEdit ? undefined : VIEW_ONLY_HINT}>
        <article className="sp-card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>2. Upload and check</h2>
          <p className="sp-subtle-copy">Every row is checked first; nothing is saved until all rows are correct and you press Import.</p>
          <div className="sp-row-actions" style={{ alignItems: "center", flexWrap: "wrap" }}>
            <input ref={input} type="file" accept=".xlsx,.xls,.csv" disabled={!!busy} onChange={(e) => { const f = e.target.files?.[0] || null; setFile(f); check(f); }} aria-label="Filled-in student file" />
            {file && <button type="button" className="sp-btn sp-btn-ghost" disabled={!!busy} onClick={() => check(file)}>Check again</button>}
            {busy === "check" && <span className="sp-subtle-copy">Checking…</span>}
          </div>
        </article>

        {c && (
          <article className="sp-card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <h2 style={{ margin: 0 }}>3. Check and import</h2>
              <label className="sp-subtle-copy" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} /> Only rows with problems
              </label>
            </div>
            {c.empty ? <p className="sp-subtle-copy">The file has no student rows.</p> : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, margin: "12px 0" }}>
                  <Kpi label="Ready" value={c.ready} />
                  <Kpi label="With problems" value={c.with_errors} />
                  <Kpi label="Class pending" value={c.class_pending} />
                  <Kpi label="Paid / partly / not" value={`${c.paid} / ${c.partial} / ${c.unpaid}`} />
                  <Kpi label="Fees this year" value={inr(c.total_fee)} />
                  <Kpi label="Already paid" value={inr(c.total_paid)} />
                </div>
                {c.with_errors > 0 && (
                  <div className="sp-error" style={{ marginBottom: 12 }}>
                    {c.with_errors} row{c.with_errors === 1 ? " has" : "s have"} problems. Fix them in the file and press "Check again". Nothing has been imported.
                  </div>
                )}
                <div className="sp-table-wrap" style={{ maxHeight: 460, overflowY: "auto", marginBottom: 12 }}>
                  <table className="sp-table">
                    <thead><tr><th>Row</th><th>Adm. No</th><th>Student</th><th>Class</th><th>Fee</th><th>Docs pending</th><th>Problems / notes</th></tr></thead>
                    <tbody>
                      {rows.map((r) => {
                        const [cls, label] = FEE[r.fee_status] || FEE.no_fee;
                        return (
                          <tr key={r.row}>
                            <td>{r.row}</td>
                            <td>{r.admission_number || "—"}</td>
                            <td>{r.name || "—"}</td>
                            <td>{r.class_label}</td>
                            <td style={{ whiteSpace: "nowrap" }}><span className={cls}>{label}</span>{r.fee_status !== "no_fee" && <div className="sp-subtle-copy">{inr(r.paid)} of {inr(r.total)}</div>}</td>
                            <td>{r.documents_pending ? `${r.documents_pending} of 7` : "None"}</td>
                            <td style={{ minWidth: 240 }}>
                              {r.errors.map((m) => <div key={m} style={{ color: "#f87171" }}>{m}</div>)}
                              {r.warnings.map((m) => <div key={m} className="sp-subtle-copy">{m}</div>)}
                              {!r.errors.length && !r.warnings.length && "OK"}
                            </td>
                          </tr>
                        );
                      })}
                      {!rows.length && <tr><td colSpan={7}>No rows to show.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="sp-btn sp-btn-primary" disabled={!c.ready || c.with_errors > 0 || !!c.too_many || !!busy} onClick={doImport}>
                  {busy === "import" ? "Importing…" : c.with_errors ? "Fix the problems first" : `Import ${c.ready} students`}
                </button>
              </>
            )}
          </article>
        )}
      </fieldset>
    </>
  );
}

function ClassRow({ id, item, classes, canEdit, onSaved, onError }) {
  const [classId, setClassId] = useState(item.class_id || "");
  const [sectionId, setSectionId] = useState(item.section_id || "");
  const [saving, setSaving] = useState(false);
  const sections = classes.find((c) => c.id === classId)?.sections || [];
  return (
    <tr>
      <td>{item.admission_number}</td>
      <td>{item.name}</td>
      <td>
        <select className="sp-select" value={classId} disabled={!canEdit} onChange={(e) => { setClassId(e.target.value); setSectionId(""); }} aria-label={`Class for ${item.name}`}>
          <option value="">Choose class</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </td>
      <td>
        <select className="sp-select" value={sectionId} disabled={!canEdit || !classId} onChange={(e) => setSectionId(e.target.value)} aria-label={`Section for ${item.name}`}>
          <option value="">Choose section</option>
          {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </td>
      <td>
        <button type="button" className="sp-btn sp-btn-primary" disabled={!canEdit || !classId || !sectionId || saving}
          onClick={async () => {
            setSaving(true);
            try { const res = await superAdminService.assignImportedStudentClass(id, item.admission_id, classId, sectionId); onSaved(`${item.name}: ${res.message}`); }
            catch (e) { onError(e.message); setSaving(false); }
          }}>
          {saving ? "Saving…" : "Save"}
        </button>
      </td>
    </tr>
  );
}

function FollowUpPanel({ id, canEdit, refreshKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try { setData(await superAdminService.getStudentImportFollowUp(id)); } catch (e) { setError(e.message); }
  }, [id]);
  useEffect(() => { load(); }, [load, refreshKey]);
  const saved = (msg) => { setError(""); setNotice(msg); load(); };
  if (!data) return error ? <div className="sp-error">{error}</div> : <p className="sp-subtle-copy">Loading…</p>;
  return (
    <>
      {error && <div className="sp-error" style={{ marginBottom: 12 }}>{error}</div>}
      {notice && <div className="sp-success" style={{ marginBottom: 12 }}>{notice}</div>}
      <article className="sp-card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Class or section pending ({data.class_pending.length})</h2>
        {data.class_pending.length ? (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead><tr><th>Adm. No</th><th>Student</th><th>Class</th><th>Section</th><th /></tr></thead>
              <tbody>{data.class_pending.map((item) => <ClassRow key={item.admission_id} id={id} item={item} classes={data.classes} canEdit={canEdit} onSaved={saved} onError={setError} />)}</tbody>
            </table>
          </div>
        ) : <p className="sp-subtle-copy">Every imported student has a class.</p>}
      </article>
      <article className="sp-card">
        <h2 style={{ marginTop: 0 }}>Documents pending ({data.documents_pending.length})</h2>
        <p className="sp-subtle-copy">Mark a document received when the school has a paper copy. The school uploads scans from its Admission app.</p>
        {data.documents_pending.length ? (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead><tr><th>Adm. No</th><th>Student</th><th>Pending documents</th></tr></thead>
              <tbody>
                {data.documents_pending.map((item) => (
                  <tr key={item.admission_id}>
                    <td>{item.admission_number}</td>
                    <td>{item.name}</td>
                    <td>
                      {item.documents_pending.map((doc) => (
                        <button key={doc.type} type="button" className="sp-btn sp-btn-ghost" style={{ margin: "0 6px 6px 0" }} disabled={!canEdit}
                          title="Mark as received (paper copy)"
                          onClick={async () => {
                            try { await superAdminService.markImportedStudentDocument(id, item.admission_id, doc.type); saved(`${item.name}: ${doc.label} marked as received.`); }
                            catch (e) { setError(e.message); }
                          }}>
                          {doc.label} · Received
                        </button>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="sp-subtle-copy">No documents pending for imported students.</p>}
      </article>
    </>
  );
}

function HistoryPanel({ id, canEdit, refreshKey, onUndone }) {
  const [batches, setBatches] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try { setBatches((await superAdminService.getStudentImports(id)).batches); } catch (e) { setError(e.message); setBatches([]); }
  }, [id]);
  useEffect(() => { load(); }, [load, refreshKey]);
  return (
    <>
      {error && <div className="sp-error" style={{ marginBottom: 12 }}>{error}</div>}
      {notice && <div className="sp-success" style={{ marginBottom: 12 }}>{notice}</div>}
      <article className="sp-card">
        <h2 style={{ marginTop: 0 }}>Past imports</h2>
        {!batches ? <p className="sp-subtle-copy">Loading…</p> : !batches.length ? <p className="sp-subtle-copy">No imports for this school yet.</p> : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead><tr><th>When</th><th>File</th><th>By</th><th>Students</th><th>Fees / paid</th><th>Status</th><th /></tr></thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td>{when(b.created_at)}</td>
                    <td>{b.file_name || "—"}</td>
                    <td>{b.created_by || "—"}</td>
                    <td>{b.student_count}{b.class_pending_count ? ` (${b.class_pending_count} class pending)` : ""}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{inr(b.invoice_total)} / {inr(b.paid_total)}</td>
                    <td>{b.status === "undone" ? <span className="sp-pill sp-pill-warning">Undone</span> : <span className="sp-pill">Imported</span>}</td>
                    <td>
                      {b.status === "imported" && canEdit && (
                        <button type="button" className="sp-btn sp-btn-danger" onClick={async () => {
                          if (!window.confirm(`Undo the import of ${b.student_count} students? Their admissions, fees, opening payments and documents are removed.`)) return;
                          try { const res = await superAdminService.undoStudentImport(id, b.id); setNotice(res.message); load(); onUndone(); }
                          catch (e) { setError(e.message); }
                        }}>
                          Undo
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </>
  );
}

function SchoolImport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canEdit = isSuperAdmin();
  const [tab, setTab] = useState("import");
  const [refreshKey, setRefreshKey] = useState(0);
  const [schoolName, setSchoolName] = useState("");
  const changed = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    superAdminService.getStudentImports(id).then((d) => setSchoolName(d.school_name || "")).catch(() => {});
  }, [id]);

  return (
    <section>
      <div className="sp-toolbar" style={{ alignItems: "center" }}>
        <div>
          <h1 className="sp-title">Import existing students</h1>
          <p className="sp-subtitle">{schoolName ? `${schoolName} · students admitted before the ERP` : "Students admitted before the ERP"}</p>
        </div>
        <button className="sp-btn sp-btn-ghost" type="button" onClick={() => navigate("/sp-control-portal/schools")}>Back to Schools</button>
      </div>
      <div className="sp-row-actions" role="tablist" style={{ marginBottom: 14, flexWrap: "wrap" }}>
        {[["import", "Import"], ["followup", "Needs attention"], ["history", "History"]].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={`sp-btn ${tab === key ? "sp-btn-primary" : "sp-btn-ghost"}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      {tab === "import" && <ImportPanel id={id} canEdit={canEdit} onImported={changed} />}
      {tab === "followup" && <FollowUpPanel id={id} canEdit={canEdit} refreshKey={refreshKey} />}
      {tab === "history" && <HistoryPanel id={id} canEdit={canEdit} refreshKey={refreshKey} onUndone={changed} />}
    </section>
  );
}

export default SchoolImport;
