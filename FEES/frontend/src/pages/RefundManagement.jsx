/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, CheckCircle, XCircle, Clock, FileText, Download } from 'lucide-react';
import { fetchRefundRequests, approveRefundRequest, rejectRefundRequest, processRefund } from '../services/apiService';

function RefundManagement() {
  const navigate = useNavigate();
  const [activeCard, setActiveCard] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refunds, setRefunds] = useState([]);
  const [stats, setStats] = useState({
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    processed: 0,
  });

  const loadRefunds = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchRefundRequests({ page: 1, limit: 100 })
      if (result.success && Array.isArray(result.data)) {
        const transformed = result.data.map((r) => ({
          id: r.id,
          studentName: `${r.student?.firstName || ''} ${r.student?.lastName || ''}`.trim() || 'Unknown',
          invoiceId: r.feePayment?.id || 'N/A',
          amount: Number(r.amount || 0),
          reason: r.reason || 'Other',
          status: r.status || 'Pending',
          requestedDate: r.requestDate ? new Date(r.requestDate).toISOString().split('T')[0] : 'N/A',
          adminNotes: r.notes || '',
        }))
        setRefunds(transformed)
        setStats({
          all: transformed.length,
          pending: transformed.filter((r) => r.status === 'PENDING').length,
          approved: transformed.filter((r) => r.status === 'APPROVED').length,
          rejected: transformed.filter((r) => r.status === 'REJECTED').length,
          processed: transformed.filter((r) => r.status === 'PROCESSED').length,
        })
      }
    } catch (error) {
      console.error('Error loading refunds:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRefunds()
  }, [loadRefunds])

  const filteredRefunds = refunds.filter(
    (refund) =>
      refund.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      refund.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      refund.invoiceId.toLowerCase().includes(searchQuery.toLowerCase())
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

  const handleApproveAll = async () => {
    const pendingRefunds = refunds.filter(r => r.status === 'PENDING')
    for (const refund of pendingRefunds) {
      await handleApprove(refund)
    }
  }

  const handleApprove = async (refund) => {
    const result = await approveRefundRequest(refund.id, { notes: refund.adminNotes })
    if (result.success) {
      setRefunds((prev) =>
        prev.map((r) => (r.id === refund.id ? { ...r, status: 'APPROVED' } : r))
      )
    }
  };

  const handleReject = async (refund) => {
    const result = await rejectRefundRequest(refund.id, 'Rejected by admin')
    if (result.success) {
      setRefunds((prev) =>
        prev.map((r) => (r.id === refund.id ? { ...r, status: 'REJECTED' } : r))
      )
    }
  };

  const handleProcess = async (refund) => {
    const result = await processRefund(refund.id, {
      refundMethod: 'BANK_TRANSFER',
      bankDetails: {}
    })
    if (result.success) {
      setRefunds((prev) =>
        prev.map((r) => (r.id === refund.id ? { ...r, status: 'PROCESSED' } : r))
      )
    }
  };

  const handleView = (refund) => {
    navigate(`/refund-details/${refund.id}`);
  };

  const displayRefunds = activeCard === 'all' 
    ? filteredRefunds 
    : filteredRefunds.filter(r => r.status.toLowerCase() === activeCard);

  return (
    <div className="page">
      {/* Back Button */}
      <button className="back-btn" onClick={() => navigate('/')}>
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
          <button className="btn btn-outline">
            <Download size={16} />
            Export Report
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/refund-request')}>
            New Refund Request
          </button>
        </div>
      </div>

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
              placeholder="Search by student name, request ID, or invoice ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleApproveAll}>
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
                  <th>Invoice ID</th>
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
                      <td className="td-mono">{refund.id}</td>
                      <td className="td-bold">{refund.studentName}</td>
                      <td className="td-mono">{refund.invoiceId}</td>
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
                                onClick={() => handleApprove(refund)}
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
                              onClick={() => handleProcess(refund)}
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
                      No refund requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RefundManagement;