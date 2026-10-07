/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, CheckCircle, XCircle, Clock, FileText, Download } from 'lucide-react';
import { fetchRefundRequests, approveRefundRequest, rejectRefundRequest } from '../services/apiService';
import ProcessRefundDialog from '../components/refund/ProcessRefundDialog';
import { reportService } from '../services/reportService';

function RefundManagement() {
  const navigate = useNavigate();
  const [activeCard, setActiveCard] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refunds, setRefunds] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState(null); // { ok, text }
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(null); // refund being processed

  const loadRefunds = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const result = await fetchRefundRequests({ page: 1, limit: 100 })
      if (!result.success) {
        // Includes "Refunds are not set up yet" until the refunds table exists
        setLoadError(result.error || 'Could not load refund requests')
        setRefunds([])
        return
      }
      const list = Array.isArray(result.data) ? result.data : []
      setRefunds(list.map((r) => ({
        id: String(r.id),
        studentName: [r.student?.first_name, r.student?.last_name].filter(Boolean).join(' ') || '—',
        admissionNumber: r.student?.admission_number || '',
        invoiceNumber: r.payment?.invoice?.invoice_number || '—',
        amount: Number(r.amount || 0),
        reason: r.reason || '—',
        status: String(r.status || 'PENDING').toUpperCase(),
        requestedDate: r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—',
        adminNotes: r.notes || '',
      })))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRefunds()
  }, [loadRefunds])

  // Counts follow the list, so they stay right after approving or rejecting
  const stats = useMemo(() => ({
    all: refunds.length,
    pending: refunds.filter((r) => r.status === 'PENDING').length,
    approved: refunds.filter((r) => r.status === 'APPROVED').length,
    rejected: refunds.filter((r) => r.status === 'REJECTED').length,
    processed: refunds.filter((r) => r.status === 'PROCESSED').length,
  }), [refunds]);

  const q = searchQuery.trim().toLowerCase();
  const filteredRefunds = refunds.filter(
    (refund) =>
      !q ||
      refund.studentName.toLowerCase().includes(q) ||
      refund.id.toLowerCase().includes(q) ||
      refund.invoiceNumber.toLowerCase().includes(q) ||
      refund.admissionNumber.toLowerCase().includes(q)
  );

  const getStatusBadgeClass = (status) => {
    const classes = {
      PENDING: 'badge-status-pending',
      APPROVED: 'badge-status-approved',
      REJECTED: 'badge-status-rejected',
      PROCESSED: 'badge-status-processed',
    };
    return classes[status] || 'badge-gray';
  };

  const setStatus = (id, status) =>
    setRefunds((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

  const handleApprove = async (refund) => {
    const result = await approveRefundRequest(refund.id, { notes: refund.adminNotes })
    if (result.success) setStatus(refund.id, 'APPROVED')
    return result
  };

  const handleApproveAll = async () => {
    const pending = refunds.filter((r) => r.status === 'PENDING')
    if (!pending.length || !window.confirm(`Approve all ${pending.length} pending refund request(s)?`)) return
    setBusy(true)
    let failed = 0
    for (const refund of pending) {
      const result = await handleApprove(refund)
      if (!result.success) failed += 1
    }
    setBusy(false)
    setNotice(failed
      ? { ok: false, text: `${pending.length - failed} approved, ${failed} failed.` }
      : { ok: true, text: `${pending.length} refund request(s) approved.` })
  }

  const approveOne = async (refund) => {
    const result = await handleApprove(refund)
    setNotice(result.success ? { ok: true, text: `Refund #${refund.id} approved.` } : { ok: false, text: result.error || 'Approval failed' })
  }

  const handleReject = async (refund) => {
    const reason = window.prompt(`Why is refund #${refund.id} being rejected?`)
    if (reason === null) return
    if (!reason.trim()) {
      setNotice({ ok: false, text: 'A rejection reason is required.' })
      return
    }
    const result = await rejectRefundRequest(refund.id, reason.trim())
    if (result.success) setStatus(refund.id, 'REJECTED')
    setNotice(result.success ? { ok: true, text: `Refund #${refund.id} rejected.` } : { ok: false, text: result.error || 'Rejection failed' })
  };

  const openProcess = (refund) => setProcessing(refund)

  const handleExport = async () => {
    const result = await reportService.exportRefundsCSV(10000)
    setNotice({ ok: result.success, text: result.message })
  }

  const handleView = (refund) => {
    navigate(`/refund-details/${refund.id}`);
  };

  const displayRefunds = activeCard === 'all' 
    ? filteredRefunds 
    : filteredRefunds.filter(r => r.status.toLowerCase() === activeCard);

  return (
    <div className="page">
      {/* Back Button */}
      <button className="back-btn" onClick={() => navigate('/dashboard')}>
        <ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </button>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Refund Management</h1>
          <p className="page-sub">Review and process refund requests</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={handleExport} disabled={!!loadError}>
            <Download size={16} />
            Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/refund-request')}>
            New Refund Request
          </button>
        </div>
      </div>

      {loadError && (
        <div className="alert alert-error" style={{ marginBottom: '20px' }}>
          <span>{loadError}</span>
        </div>
      )}
      {notice && (
        <div className={`alert ${notice.ok ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{notice.text}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid-5">
        <div 
          className={`refund-stat-card ${activeCard === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCard('all')}
        >
          <div className="refund-stat-label">All Requests</div>
          <div className="refund-stat-value">{stats.all}</div>
        </div>
        <div 
          className={`refund-stat-card ${activeCard === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveCard('pending')}
        >
          <div className="refund-stat-label">Pending</div>
          <div className="refund-stat-value">{stats.pending}</div>
        </div>
        <div 
          className={`refund-stat-card ${activeCard === 'approved' ? 'active' : ''}`}
          onClick={() => setActiveCard('approved')}
        >
          <div className="refund-stat-label">Approved</div>
          <div className="refund-stat-value">{stats.approved}</div>
        </div>
        <div 
          className={`refund-stat-card ${activeCard === 'rejected' ? 'active' : ''}`}
          onClick={() => setActiveCard('rejected')}
        >
          <div className="refund-stat-label">Rejected</div>
          <div className="refund-stat-value">{stats.rejected}</div>
        </div>
        <div 
          className={`refund-stat-card ${activeCard === 'processed' ? 'active' : ''}`}
          onClick={() => setActiveCard('processed')}
        >
          <div className="refund-stat-label">Processed</div>
          <div className="refund-stat-value">{stats.processed}</div>
        </div>
      </div>

      {/* Search Bar + Approve All */}
      <div className="refund-search-wrapper">
        <div className="refund-search-container">
          <div className="input-wrap">
            <Search size={16} className="input-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search by student, admission no., request ID or invoice number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleApproveAll} disabled={busy || stats.pending === 0}>
          Approve All Pending
        </button>
      </div>

      {/* Refund Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Refund Requests ({displayRefunds.length})</h3>
        </div>
        <div className="card-body">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Student Name</th>
                  <th>Invoice</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Request Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                      <div className="spinner"></div>
                    </td>
                  </tr>
                ) : displayRefunds.length > 0 ? (
                  displayRefunds.map((refund) => (
                    <tr key={refund.id}>
                      <td className="td-mono">#{refund.id}</td>
                      <td className="td-bold">{refund.studentName}</td>
                      <td className="td-mono">{refund.invoiceNumber}</td>
                      <td>₹{refund.amount.toLocaleString()}</td>
                      <td>{refund.reason}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(refund.status)}`}>
                          {refund.status}
                        </span>
                      </td>
                      <td>{refund.requestedDate}</td>
                      <td>
                        <div className="flex gap-1">
                          <button 
                            className="btn btn-ghost btn-sm refund-action-btn"
                            onClick={() => handleView(refund)}
                            title="View Details"
                          >
                            <FileText size={14} />
                          </button>
                          {refund.status === 'PENDING' && (
                            <>
                              <button 
                                className="btn btn-ghost btn-sm refund-action-btn"
                                onClick={() => approveOne(refund)}
                                title="Approve"
                              >
                                <CheckCircle size={14} style={{ color: 'var(--green)' }} />
                              </button>
                              <button 
                                className="btn btn-ghost btn-sm refund-action-btn"
                                onClick={() => handleReject(refund)}
                                title="Reject"
                              >
                                <XCircle size={14} style={{ color: 'var(--red)' }} />
                              </button>
                            </>
                          )}
                          {refund.status === 'APPROVED' && (
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => openProcess(refund)}
                            >
                              Process
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                      {loadError ? 'Refund requests are unavailable' : 'No refund requests found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {processing && (
        <ProcessRefundDialog
          refund={processing}
          onClose={() => setProcessing(null)}
          onDone={() => {
            setStatus(processing.id, 'PROCESSED')
            setNotice({ ok: true, text: `Refund #${processing.id} marked as refunded. The invoice balance and collections have been updated.` })
            setProcessing(null)
          }}
        />
      )}
    </div>
  );
}

export default RefundManagement;