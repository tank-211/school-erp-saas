import React, { useState, useMemo, useEffect } from "react";
import { fetchStudents, recordPayment } from "../services/apiService";
import {
  Search, Download, RefreshCw, Plus, CreditCard, Eye, History as HistoryIcon,
  Printer, Pencil, MoreVertical, X, Wallet, IndianRupee, Clock, AlertCircle,
  FileText, MessageSquare, Send, Mail as MailIcon, TrendingUp, TrendingDown,
  Check, ArrowRightLeft, Percent, AlertTriangle, Users, Receipt, ChevronLeft,
  ChevronRight, Landmark
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  MOCK DATA — swap this out for your real API data                  */
/* ------------------------------------------------------------------ */

const CLASSES = ["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const SECTIONS = ["A", "B", "C"];
const STATUSES = ["Paid", "Partial", "Pending", "Not Assigned"];

const AVATAR_COLORS = [
  "bg-blue-500", "bg-pink-500", "bg-red-500", "bg-green-500",
  "bg-orange-500", "bg-purple-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
];

const initials = (name) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const mapApiStudentToUiStudent = (student) => {
  const latestAdmission = student.admission?.[0] || null;
  const latestInvoice = student.invoice?.[0] || null;
  const latestPayment = student.payment?.[0] || null;
  const feeAssignments = student.student_fee_assignment || [];

  const name = [
    student.first_name,
    student.middle_name,
    student.last_name,
  ].filter(Boolean).join(" ");

  const parentDetails = student.parent_detail || [];

  const father =
    parentDetails.find(
      (p) => String(p.relation || "").toLowerCase() === "father"
    ) ||
    parentDetails.find(
      (p) => String(p.relation || "").toLowerCase() === "guardian"
    ) ||
    null;

  const mother =
    parentDetails.find(
      (p) => String(p.relation || "").toLowerCase() === "mother"
    ) || null;

  const total =
    latestInvoice?.total_amount != null
      ? Number(latestInvoice.total_amount)
      : feeAssignments.reduce(
          (sum, assignment) =>
            sum + Number(assignment.final_amount || assignment.amount || 0),
          0
        );

  const paid =
    latestInvoice?.paid_amount != null
      ? Number(latestInvoice.paid_amount)
      : student.payment?.reduce(
          (sum, payment) =>
            String(payment.status || "").toUpperCase() === "SUCCESS"
              ? sum + Number(payment.amount || 0)
              : sum,
          0
        ) || 0;

  const balance =
    latestInvoice?.pending_amount != null
      ? Number(latestInvoice.pending_amount)
      : Math.max(total - paid, 0);

  const status =
    balance === 0 && total > 0
      ? "Paid"
      : paid > 0
        ? "Partial"
        : total > 0
          ? "Pending"
          : "Not Assigned";

  const className =
    latestAdmission?.school_class?.class_name || "-";

  const sectionName =
    latestAdmission?.section?.section_name || "-";

  const history = (student.payment || []).map((payment) => ({
    receiptNo: payment.payment_number || `PAY-${payment.id}`,
    date: payment.payment_date
      ? new Date(payment.payment_date).toLocaleDateString("en-IN")
      : "-",
    amount: Number(payment.amount || 0),
    method: payment.payment_method || "-",
    collectedBy: "Fee Office",
    status:
      String(payment.status || "").toUpperCase() === "SUCCESS"
        ? "Success"
        : payment.status || "-",
  }));

  const feeBreakdown = {};

  feeAssignments.forEach((assignment) => {
    const feeName =
      assignment.fee_structure?.fee_type || "Fee";

    feeBreakdown[feeName] =
      Number(feeBreakdown[feeName] || 0) +
      Number(assignment.final_amount || assignment.amount || 0);
  });

  return {
    id: Number(student.id),

    invoiceId: latestInvoice?.id
      ? Number(latestInvoice.id)
      : null,

    admNo: student.admission_number || "-",

    name: name || "Unnamed Student",

    roll: "-",

    cls: className,

    section: sectionName,

    parent: father
      ? [father.first_name, father.last_name].filter(Boolean).join(" ")
      : mother
        ? [mother.first_name, mother.last_name].filter(Boolean).join(" ")
        : "—",

    mobile:
      father?.phone ||
      mother?.phone ||
      student.phone ||
      "-",

    feeStructure:
      Object.keys(feeBreakdown).length > 0
        ? Object.keys(feeBreakdown).join(", ")
        : "Not Assigned",

    total,
    paid,
    balance,
    status,

    lastPayment: latestPayment?.payment_date
      ? new Date(latestPayment.payment_date).toLocaleDateString("en-IN")
      : "-",

    avatarColor:
      AVATAR_COLORS[
        Number(student.id) % AVATAR_COLORS.length
      ],

    photo: null,

    academicYear:
      latestAdmission?.academic_year?.year_name || "-",

    dob: student.date_of_birth
      ? new Date(student.date_of_birth).toLocaleDateString("en-IN")
      : "-",

    father: father
      ? [father.first_name, father.last_name]
          .filter(Boolean)
          .join(" ")
      : "—",

    mother: mother
      ? [mother.first_name, mother.last_name]
          .filter(Boolean)
          .join(" ")
      : "—",

    email:
      father?.email ||
      mother?.email ||
      student.email ||
      "-",

    address: [
      student.address,
      student.city,
      student.state,
      student.postal_code,
    ]
      .filter(Boolean)
      .join(", ") || "-",

    discount: feeAssignments.reduce(
      (sum, assignment) =>
        sum + Number(assignment.concession_amount || 0),
      0
    ),

    scholarship: 0,

    fine: 0,

    feeBreakdown,

    history,
  };
};

/* ------------------------------------------------------------------ */
/*  SMALL REUSABLE PIECES                                             */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }) {
  const map = {
    Paid: "status-paid", Partial: "status-pending", Pending: "status-overdue",
    "Not Assigned": "status-processing",
  };
  const label = { Paid: "Paid", Partial: "Partial", Pending: "Pending", "Not Assigned": "Not Assigned" };
  return <span className={`status-chip ${map[status]}`}>{label[status]}</span>;
}

function Avatar({ name, color, size = 32 }) {
  return (
    <div className={`avatar ${color}`} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials(name)}
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const bg = toast.type === "error" ? "var(--red)" : toast.type === "info" ? "var(--blue)" : "var(--green)";
  return (
    <div className="toast-notification" style={{ background: bg }}>
      {toast.message}
    </div>
  );
}

function ConfirmDialog({ dialog, onCancel, onConfirm }) {
  if (!dialog) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="upload-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{dialog.title}</div>
            <div className="modal-subtitle">{dialog.subtitle}</div>
          </div>
          <button className="modal-close" onClick={onCancel}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p className="text-sm text-muted mb-4">{dialog.message}</p>
          <div className="modal-actions" style={{ borderTop: "none", paddingTop: 0, marginTop: 0 }}>
            <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
            <button className={`btn ${dialog.danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm}>
              {dialog.confirmLabel || "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonRows({ cols = 15, rows = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c}>
              <div style={{
                height: 14, borderRadius: 6, background: "var(--gray-100)",
                width: c === 0 ? 32 : `${60 + ((c * 13) % 40)}%`,
                animation: "pulseSkeleton 1.2s ease-in-out infinite",
              }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                          */
/* ------------------------------------------------------------------ */

export default function StudentFeeManagement() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [drawerTab, setDrawerTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("2024-25");
  const [classFilter, setClassFilter] = useState("All Classes");
  const [sectionFilter, setSectionFilter] = useState("All Sections");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [selectedRows, setSelectedRows] = useState([]);
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);

  // payment formQ
  const [payForm, setPayForm] = useState({
    date: new Date().toISOString().slice(0, 10), amount: "", discount: "", fine: "",
    mode: "UPI", txnId: "", remarks: "",
  });

  useEffect(() => {
    const loadStudents = async () => {
      setLoading(true);

      const result = await fetchStudents({
        page: 1,
        limit: 100,
      });

      if (result.success) {
        console.log("👨‍🎓 Real students loaded:", result.data);

      const studentsData = result.data?.students || [];

      const mappedStudents = studentsData.map(mapApiStudentToUiStudent);

      console.log("👨‍🎓 Mapped students for UI:", mappedStudents);

      setStudents(mappedStudents);
      } else {
        console.error("👨‍🎓 Failed to load students:", result.error);
        notify(result.error || "Failed to load students.", "error");
      }

      setLoading(false);
    };

    loadStudents();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = (message, type = "success") => setToast({ message, type });

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedId) || null,
    [students, selectedId]
  );

  /* ---------------- filtering / sorting ---------------- */

  const filtered = useMemo(() => {
    let list = students.filter((s) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || s.name.toLowerCase().includes(q) ||
        s.admNo.toLowerCase().includes(q) || s.parent.toLowerCase().includes(q);
      const matchesClass = classFilter === "All Classes" || s.cls === classFilter;
      const matchesSection = sectionFilter === "All Sections" || s.section === sectionFilter;
      const matchesStatus = statusFilter === "All Status" || s.status === statusFilter;
      return matchesSearch && matchesClass && matchesSection && matchesStatus;
    });
    if (sortKey) {
      list = [...list].sort((a, b) => {
        let av = a[sortKey], bv = b[sortKey];
        if (typeof av === "string") { av = av.toLowerCase(); bv = bv.toLowerCase(); }
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [students, search, classFilter, sectionFilter, statusFilter, sortKey, sortDir]);

  const activeChips = [
    classFilter !== "All Classes" && { key: "class", label: classFilter, clear: () => setClassFilter("All Classes") },
    sectionFilter !== "All Sections" && { key: "section", label: `Section ${sectionFilter}`, clear: () => setSectionFilter("All Sections") },
    statusFilter !== "All Status" && { key: "status", label: statusFilter, clear: () => setStatusFilter("All Status") },
  ].filter(Boolean);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  /* ---------------- stats ---------------- */

  const stats = useMemo(() => {
    const totalStudents = students.length;
    const collectedToday = 184500;
    const pendingCount = students.filter((s) => s.balance > 0).length;
    const pendingAmount = students.reduce((sum, s) => sum + s.balance, 0);
    const receiptsGenerated = students.reduce((sum, s) => sum + s.history.length, 0) + 979;
    return { totalStudents, collectedToday, pendingCount, pendingAmount, receiptsGenerated };
  }, [students]);

  /* ---------------- actions ---------------- */

  const openDrawer = (student, tab = "overview") => {
    setSelectedId(student.id);
    setDrawerTab(tab);
    setPayForm({
      date: new Date().toISOString().slice(0, 10),
      amount: student.balance > 0 ? String(student.balance) : "",
      discount: "", fine: "", mode: "UPI", txnId: "", remarks: "",
    });
  };

  const submitPayment = async () => {
    if (!selectedStudent) {
      notify("No student selected.", "error");
      return;
    }

    if (!selectedStudent.invoiceId) {
      notify("No invoice found for this student.", "error");
      return;
    }

    const amount = Number(payForm.amount);

    if (!amount || amount <= 0) {
      notify("Enter a valid payment amount.", "error");
      return;
    }

    if (amount > selectedStudent.balance) {
      notify(
        `Payment cannot exceed the pending balance of ${inr(selectedStudent.balance)}.`,
        "error"
      );
      return;
    }

    const paymentMethodMap = {
      Cash: "cash",
      UPI: "upi",
      "Debit Card": "card",
      "Credit Card": "card",
      "Net Banking": "online",
      Cheque: "cheque",
    };

    const paymentMethod =
      paymentMethodMap[payForm.mode] || payForm.mode.toLowerCase();

    try {
      setLoading(true);

      const result = await recordPayment(
        selectedStudent.invoiceId,
        amount,
        paymentMethod,
        payForm.txnId || undefined,
        payForm.remarks || undefined
      );

      if (!result.success) {
        notify(result.error || "Failed to record payment.", "error");
        return;
      }

      notify(
        `Payment of ${inr(amount)} recorded successfully.`,
        "success"
      );

      const refreshed = await fetchStudents({
        page: 1,
        limit: 100,
      });

      if (refreshed.success) {
        const studentsData = refreshed.data?.students || [];
        setStudents(studentsData.map(mapApiStudentToUiStudent));
      } else {
        notify(
          "Payment was recorded, but student data could not be refreshed.",
          "info"
        );
      }

      setPayForm({
        date: new Date().toISOString().slice(0, 10),
        amount: "",
        discount: "",
        fine: "",
        mode: "UPI",
        txnId: "",
        remarks: "",
      });

      setDrawerTab("history");
    } catch (error) {
      console.error("💰 Payment submission error:", error);
      notify(
        error?.message || "Failed to record payment.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const closeDrawer = () => setSelectedId(null);

  const confirmRefund = (receipt) => {
    setDialog({
      title: "Confirm refund",
      subtitle: receipt.receiptNo,
      message: `Initiate a refund of ${inr(receipt.amount)} for ${selectedStudent?.name}? This will be sent to Refund Management for approval.`,
      confirmLabel: "Send for refund",
      danger: true,
      onConfirm: () => {
        setDialog(null);
        notify(`Refund request for ${inr(receipt.amount)} sent for approval.`, "info");
      },
    });
  };

  const quickAction = (label) => notify(`${label} — done.`, "success");

  const exportData = () => notify(`Exporting ${filtered.length} student records...`, "info");
  const refreshData = () => { setLoading(true); setTimeout(() => setLoading(false), 500); notify("Fee data refreshed."); };

  const allSelected = filtered.length > 0 && selectedRows.length === filtered.length;
  const toggleSelectAll = () => setSelectedRows(allSelected ? [] : filtered.map((s) => s.id));
  const toggleRow = (id) => setSelectedRows((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));

  /* ------------------------------------------------------------------ */

  return (
    <div className="page">
      <Toast toast={toast} />
      <ConfirmDialog dialog={dialog} onCancel={() => setDialog(null)} onConfirm={() => dialog?.onConfirm?.()} />

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Students – Fee Management</h1>
          <p className="page-sub">Manage student fee records, collect payments, update fee information, and generate receipts.</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        <div className="stat-card stat-card-blue">
          <div className="stat-row">
            <div className="stat-icon"><Users size={18} /></div>
            <div className="stat-content">
              <div className="stat-label">Total Students</div>
              <div className="stat-value">{stats.totalStudents.toLocaleString("en-IN")}</div>
              <div className="stat-trend trend-up"><TrendingUp size={12} /> +12 <span className="trend-desc">enrolled this year</span></div>
            </div>
          </div>
        </div>
        <div className="stat-card stat-card-green">
          <div className="stat-row">
            <div className="stat-icon"><IndianRupee size={18} /></div>
            <div className="stat-content">
              <div className="stat-label">Fees Collected Today</div>
              <div className="stat-value">{inr(stats.collectedToday)}</div>
              <div className="stat-trend trend-up"><TrendingUp size={12} /> +8.2% <span className="trend-desc">23 transactions today</span></div>
            </div>
          </div>
        </div>
        <div className="stat-card stat-card-orange">
          <div className="stat-row">
            <div className="stat-icon"><Clock size={18} /></div>
            <div className="stat-content">
              <div className="stat-label">Pending Payments</div>
              <div className="stat-value">{stats.pendingCount}</div>
              <div className="stat-trend trend-down"><TrendingDown size={12} /> {inr(stats.pendingAmount)} <span className="trend-desc">outstanding</span></div>
            </div>
          </div>
        </div>
        <div className="stat-card stat-card-purple">
          <div className="stat-row">
            <div className="stat-icon"><Receipt size={18} /></div>
            <div className="stat-content">
              <div className="stat-label">Receipts Generated</div>
              <div className="stat-value">{stats.receiptsGenerated.toLocaleString("en-IN")}</div>
              <div className="stat-trend trend-up"><TrendingUp size={12} /> +43 <span className="trend-desc">this month</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="search-section">
        <div className="filter-bar">
          <div className="input-wrap" style={{ flex: 2, minWidth: 220, maxWidth: 340 }}>
            <Search className="input-icon" size={15} />
            <input
              className="form-input" placeholder="Search student, admission no., parent..."
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <select className="filter-select" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              <option>2024-25</option><option>2023-24</option><option>2022-23</option>
            </select>
          </div>
          <div className="filter-group">
            <select className="filter-select" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
              <option>All Classes</option>
              {CLASSES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <select className="filter-select" value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
              <option>All Sections</option>
              {SECTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>All Status</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="filter-chips-row">
            {activeChips.map((chip) => (
              <span className="filter-chip" key={chip.key}>
                {chip.label}
                <button onClick={chip.clear}><X size={11} /></button>
              </span>
            ))}
            <button
              className="filter-chip-clear"
              onClick={() => { setClassFilter("All Classes"); setSectionFilter("All Sections"); setStatusFilter("All Status"); }}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="action-bar">
        <button className="btn btn-success" onClick={() => notify("Add Student form would open here.", "info")}>
          <Plus size={14} /> Add Student
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            if (selectedRows.length !== 1) { notify("Select exactly one student to collect a fee for.", "error"); return; }
            const st = students.find((s) => s.id === selectedRows[0]);
            openDrawer(st, "collect");
          }}
        >
          <CreditCard size={14} /> Collect Fee
        </button>
        <button className="btn btn-outline" onClick={exportData}><Download size={14} /> Export</button>
        <button className="btn btn-outline btn-icon" onClick={refreshData} title="Refresh"><RefreshCw size={14} /></button>
        {selectedRows.length > 0 && (
          <span className="text-sm text-muted" style={{ marginLeft: "auto" }}>{selectedRows.length} selected</span>
        )}
      </div>

      {/* Table + Drawer layout */}
      <div className="fee-mgmt-layout">
        <div className={`students-table-wrapper fee-mgmt-table-col ${selectedStudent ? "with-drawer" : ""}`}>
          <div className="table-responsive">
            <table className="students-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                  </th>
                  <th>Photo</th>
                  <th>Adm. No.</th>
                  <th className="sortable-th" onClick={() => toggleSort("name")}>Student Name</th>
                  <th>Roll No.</th>
                  <th>Class</th>
                  <th>Sec.</th>
                  <th>Parent</th>
                  <th>Mobile</th>
                  <th>Fee Structure</th>
                  <th className="sortable-th" onClick={() => toggleSort("total")}>Total Fee</th>
                  <th>Paid</th>
                  <th className="sortable-th" onClick={() => toggleSort("balance")}>Balance</th>
                  <th>Status</th>
                  <th>Last Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows cols={16} rows={6} />
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={16}><div className="no-data">No students match your filters.</div></td></tr>
                ) : filtered.map((s) => (
                  <tr key={s.id} className={selectedId === s.id ? "row-active" : ""}>
                    <td><input type="checkbox" checked={selectedRows.includes(s.id)} onChange={() => toggleRow(s.id)} /></td>
                    <td><Avatar name={s.name} color={s.avatarColor} /></td>
                    <td className="adm-no">{s.admNo}</td>
                    <td className="student-name">{s.name}</td>
                    <td className="roll-no">{s.roll}</td>
                    <td className="class">{s.cls}</td>
                    <td className="section">{s.section}</td>
                    <td className="parent-name">{s.parent}</td>
                    <td className="mobile">{s.mobile}</td>
                    <td className="fee-structure">{s.feeStructure}</td>
                    <td className="total-fee">{s.total ? inr(s.total) : "-"}</td>
                    <td className="paid-fee">{s.paid ? inr(s.paid) : "-"}</td>
                    <td className="balance-fee">{s.balance ? inr(s.balance) : "-"}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>{s.lastPayment}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn view-btn" title="View Details" onClick={() => openDrawer(s, "overview")}><Eye size={14} /></button>
                        <button className="action-btn collect-btn" title="Collect Fee" onClick={() => openDrawer(s, "collect")}><CreditCard size={14} /></button>
                        <button className="action-btn" title="Payment History" onClick={() => openDrawer(s, "history")}><HistoryIcon size={14} /></button>
                        <button className="action-btn" title="Print Receipt" onClick={() => quickAction("Receipt sent to printer")}><Printer size={14} /></button>
                        <button className="action-btn edit-btn" title="Update Fee" onClick={() => notify("Update Fee Structure form would open here.", "info")}><Pencil size={14} /></button>
                        <button className="action-btn" title="More Options" onClick={() => notify("More options menu", "info")}><MoreVertical size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            <span className="table-info">Showing 1–{filtered.length} of {filtered.length} students</span>
            <div className="flex items-center gap-2">
              <button className="btn btn-outline btn-sm btn-icon" disabled><ChevronLeft size={14} /></button>
              <span className="badge badge-teal">1</span>
              <button className="btn btn-outline btn-sm btn-icon" disabled><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>

        {/* Drawer */}
        {selectedStudent ? (
          <StudentDrawer
            student={selectedStudent}
            tab={drawerTab}
            setTab={setDrawerTab}
            onClose={closeDrawer}
            payForm={payForm}
            setPayForm={setPayForm}
            onSubmitPayment={submitPayment}
            onQuickAction={quickAction}
            onRefund={confirmRefund}
          />
        ) : (
          <div className="fee-mgmt-empty-col">
            <div className="empty-state">
              <div className="empty-illustration">
                <Users size={40} />
              </div>
              <h3>No student selected</h3>
              <p>Select a student to view fee details and collect payments.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DRAWER                                                             */
/* ------------------------------------------------------------------ */

function StudentDrawer({ student, tab, setTab, onClose, payForm, setPayForm, onSubmitPayment, onQuickAction, onRefund }) {
  const totalPaid = student.paid;
  const balance = student.balance;

  return (
    <div className="student-drawer">
      <div className="drawer-top">
        <div className="flex items-center gap-3">
          <Avatar name={student.name} color={student.avatarColor} size={44} />
          <div>
            <div className="drawer-student-name">{student.name}</div>
            <div className="drawer-student-sub">{student.admNo} · {student.cls} {student.section}</div>
          </div>
        </div>
        <button className="modal-close" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="drawer-tabs">
        {[["overview", "Overview"], ["collect", "Collect Fee"], ["history", "History"]].map(([key, label]) => (
          <button key={key} className={`drawer-tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      <div className="drawer-scroll">
        {tab === "overview" && (
          <>
            <div className="drawer-block">
              <h4 className="drawer-block-title">Student Information</h4>
              <div className="drawer-info-grid">
                <div><label>Roll No.</label><span>{student.roll}</span></div>
                <div><label>Class</label><span>{student.cls} - {student.section}</span></div>
                <div><label>Date of Birth</label><span>{student.dob}</span></div>
                <div><label>Academic Year</label><span>{student.academicYear}</span></div>
              </div>
            </div>

            <div className="drawer-block">
              <h4 className="drawer-block-title">Parent Details</h4>
              <div className="drawer-info-grid">
                <div><label>Father</label><span>{student.father}</span></div>
                <div><label>Mother</label><span>{student.mother}</span></div>
                <div><label>Mobile</label><span>{student.mobile}</span></div>
                <div><label>Email</label><span>{student.email}</span></div>
              </div>
              <div className="drawer-address"><label>Address</label><span>{student.address}</span></div>
            </div>

            <div className="bank-details-box" style={{ margin: "0 0 16px" }}>
              <h4>Fee Structure — {student.feeStructure}</h4>
              <div className="bank-grid">
                {Object.entries(student.feeBreakdown).map(([k, v]) => (
                  <div key={k}><label>{k}</label><span>{inr(v)}</span></div>
                ))}
                <div><label>Discount</label><span>{inr(student.discount)}</span></div>
                <div><label>Scholarship</label><span>{inr(student.scholarship)}</span></div>
                <div><label>Fine</label><span>{inr(student.fine)}</span></div>
              </div>
              <div className="divider" />
              <div className="bank-grid">
                <div><label>Total Fee</label><span>{inr(student.total)}</span></div>
                <div><label>Paid Amount</label><span style={{ color: "var(--green-dark)" }}>{inr(totalPaid)}</span></div>
                <div><label>Remaining Balance</label><span style={{ color: "var(--red-dark)" }}>{inr(balance)}</span></div>
              </div>
            </div>

            <div className="drawer-block">
              <h4 className="drawer-block-title">Quick Actions</h4>
              <div className="quick-actions-grid">
                <button className="quick-action-btn" onClick={() => onQuickAction("Receipt generated")}><FileText size={15} /> Generate Receipt</button>
                <button className="quick-action-btn" onClick={() => onQuickAction("Receipt sent to printer")}><Printer size={15} /> Print Receipt</button>
                <button className="quick-action-btn" onClick={() => onQuickAction("Statement downloaded")}><Download size={15} /> Download Statement</button>
                <button className="quick-action-btn" onClick={() => onQuickAction("SMS reminder sent")}><MessageSquare size={15} /> Send SMS Reminder</button>
                <button className="quick-action-btn" onClick={() => onQuickAction("WhatsApp reminder sent")}><Send size={15} /> Send WhatsApp Reminder</button>
                <button className="quick-action-btn" onClick={() => onQuickAction("Email reminder sent")}><MailIcon size={15} /> Send Email Reminder</button>
                <button className="quick-action-btn" onClick={() => onQuickAction("Opening ledger")}><Landmark size={15} /> View Ledger</button>
                <button className="quick-action-btn" onClick={() => onQuickAction("Discount applied")}><Percent size={15} /> Apply Discount</button>
                <button className="quick-action-btn" onClick={() => onQuickAction("Fine added")}><AlertTriangle size={15} /> Add Fine</button>
                <button className="quick-action-btn" onClick={() => onQuickAction("Transfer request started")}><ArrowRightLeft size={15} /> Transfer Student</button>
              </div>
            </div>
          </>
        )}

        {tab === "collect" && (
          <div className="drawer-block">
            <div className="info-box info-box-blue">
              <AlertCircle size={16} color="var(--blue-dark)" />
              <div>
                <div className="info-box-title">Outstanding balance</div>
                <div className="info-box-text">{student.name} currently owes {inr(balance)} of {inr(student.total)}.</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Date</label>
              <input type="date" className="form-input" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} />
            </div>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">Amount to Collect<span className="req">*</span></label>
                <div className="amount-input-wrapper">
                  <span className="currency-prefix">₹</span>
                  <input className="form-input amount-input" type="number" value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Discount</label>
                <div className="amount-input-wrapper">
                  <span className="currency-prefix">₹</span>
                  <input className="form-input amount-input" type="number" value={payForm.discount}
                    onChange={(e) => setPayForm({ ...payForm, discount: e.target.value })} placeholder="0" />
                </div>
              </div>
            </div>
            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Fine</label>
                <div className="amount-input-wrapper">
                  <span className="currency-prefix">₹</span>
                  <input className="form-input amount-input" type="number" value={payForm.fine}
                    onChange={(e) => setPayForm({ ...payForm, fine: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Balance After Payment</label>
                <div className="info-value-box">{inr(Math.max(balance - (Number(payForm.amount) || 0), 0))}</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Mode</label>
              <div className="payment-mode-grid">
                {["Cash", "UPI", "Debit Card", "Credit Card", "Net Banking", "Cheque"].map((mode) => (
                  <button
                    key={mode}
                    className={`payment-mode-chip ${payForm.mode === mode ? "selected" : ""}`}
                    onClick={() => setPayForm({ ...payForm, mode })}
                    type="button"
                  >
                    {payForm.mode === mode && <Check size={12} />} {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Transaction ID</label>
                <input className="form-input" value={payForm.txnId} onChange={(e) => setPayForm({ ...payForm, txnId: e.target.value })} placeholder="Optional" />
              </div>
              <div className="form-group">
                <label className="form-label">Remarks</label>
                <input className="form-input" value={payForm.remarks} onChange={(e) => setPayForm({ ...payForm, remarks: e.target.value })} placeholder="Optional" />
              </div>
            </div>

            <div className="modal-actions" style={{ borderTop: "none", paddingTop: 0 }}>
              <button className="btn btn-outline w-full" onClick={() => onQuickAction("Payment updated")}>Update Payment</button>
              <button className="btn btn-primary w-full" onClick={onSubmitPayment}><Wallet size={14} /> Collect Payment</button>
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="drawer-block">
            {student.history.length === 0 ? (
              <div className="empty-state" style={{ padding: "32px 12px" }}>
                <div className="empty-state-icon"><Clock size={32} /></div>
                <h3>No payments yet</h3>
                <p>Collected payments for {student.name} will appear here.</p>
              </div>
            ) : (
              <div className="payment-timeline">
                {student.history.map((h) => (
                  <div className="timeline-item" key={h.receiptNo}>
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <div className="timeline-top-row">
                        <span className="td-mono td-bold">{h.receiptNo}</span>
                        <span className="badge badge-green">{h.status}</span>
                      </div>
                      <div className="timeline-amount">{inr(h.amount)}</div>
                      <div className="timeline-meta">{h.date} · {h.method} · Collected by {h.collectedBy}</div>
                      <div className="timeline-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => onQuickAction("Receipt downloaded")}><Download size={12} /> Download</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => onQuickAction("Receipt sent to printer")}><Printer size={12} /> Reprint</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: "var(--red-dark)" }} onClick={() => onRefund(h)}><ArrowRightLeft size={12} /> Refund</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
