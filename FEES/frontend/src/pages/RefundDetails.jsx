/* eslint-disable react-hooks/set-state-in-effect */
import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, User, FileText, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { fetchRefundById, approveRefundRequest, rejectRefundRequest, processRefund } from '../services/apiService'

function RefundDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [refund, setRefund] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadRefund = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await fetchRefundById(id)
      if (result.success && result.data) {
        setRefund({
          id: result.data.id,
          studentName: `${result.data.student?.firstName || ''} ${result.data.student?.lastName || ''}`.trim() || 'Unknown',
          invoiceId: result.data.feePayment?.id || 'N/A',
          amount: Number(result.data.amount || 0),
          reason: result.data.reason || 'Other',
          status: result.data.status || 'Pending',
          requestedDate: result.data.requestDate ? new Date(result.data.requestDate).toISOString().split('T')[0] : 'N/A',
          adminNotes: result.data.notes || '',
        })
      } else {
        setError(result.error || 'Refund not found')
      }
    } catch {
      setError('Failed to load refund details')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadRefund()
  }, [loadRefund])

  const handleApprove = async () => {
    const result = await approveRefundRequest(refund.id, { notes: refund.adminNotes })
    if (result.success) {
      setRefund(prev => ({ ...prev, status: 'APPROVED' }))
    }
  }

  const handleReject = async () => {
    const result = await rejectRefundRequest(refund.id, 'Rejected by admin')
    if (result.success) {
      setRefund(prev => ({ ...prev, status: 'REJECTED' }))
    }
  }

  const handleProcess = async () => {
    const result = await processRefund(refund.id, {
      refundMethod: 'BANK_TRANSFER',
      bankDetails: {}
    })
    if (result.success) {
      setRefund(prev => ({ ...prev, status: 'PROCESSED' }))
    }
  }

  const handleNotesChange = (e) => {
    setRefund(prev => ({ ...prev, adminNotes: e.target.value }))
  }

  const handleClose = () => {
    navigate('/refund-management')
  }

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'PENDING':
        return 'badge-status-pending'
      case 'APPROVED':
        return 'badge-status-approved'
      case 'REJECTED':
        return 'badge-status-rejected'
      case 'PROCESSED':
        return 'badge-status-processed'
      default:
        return 'badge-gray'
    }
  }

  const getStatusIcon = (status) => {
    switch(status) {
      case 'PENDING':
        return <Clock size={16} />
      case 'APPROVED':
        return <CheckCircle size={16} />
      case 'REJECTED':
        return <XCircle size={16} />
      case 'PROCESSED':
        return <CheckCircle size={16} />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <div className="card-body text-center">
            <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
            <p>Loading refund details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !refund) {
    return (
      <div className="page">
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
            <AlertCircle size={40} style={{ color: 'var(--red)', marginBottom: '16px' }} />
            <h2 className="card-title">Refund Not Found</h2>
            <p className="text-muted mb-4">{error || `The refund request ${id} does not exist.`}</p>
            <button onClick={() => navigate('/refund-management')} className="btn btn-primary">
              Back to Refund Management
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {/* Back Button */}
      <button className="back-btn" onClick={handleClose}>
        <ArrowLeft size={20} />
        <span>Back to Refund Management</span>
      </button>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Refund Request Details</h1>
          <p className="page-sub">Review and manage refund request #{refund.id}</p>
        </div>
        <div className="page-actions">
          <span className={`badge ${getStatusBadgeClass(refund.status)}`}>
            {getStatusIcon(refund.status)}
            {refund.status}
          </span>
        </div>
      </div>

      {/* Details Card */}
      <div className="card">
        {/* Student Information Section */}
        <div className="card-header">
          <div className="flex items-center gap-2">
            <User size={18} style={{ color: 'var(--primary)' }} />
            <h3 className="card-title">Student Information</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="grid-2">
            <div className="info-item">
              <div className="form-label">Student Name</div>
              <div className="info-value-box">{refund.studentName}</div>
            </div>
            <div className="info-item">
              <div className="form-label">Invoice ID</div>
              <div className="info-value-box td-mono">{refund.invoiceId}</div>
            </div>
          </div>
        </div>

        <div className="divider"></div>

        {/* Refund Information Section */}
        <div className="card-header">
          <div className="flex items-center gap-2">
            <FileText size={18} style={{ color: 'var(--primary)' }} />
            <h3 className="card-title">Refund Information</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="grid-2">
            <div className="info-item">
              <div className="form-label">Amount</div>
              <div className="info-value-box td-bold">₹{refund.amount.toLocaleString()}</div>
            </div>
            <div className="info-item">
              <div className="form-label">Requested Date</div>
              <div className="info-value-box">{refund.requestedDate}</div>
            </div>
            <div className="info-item">
              <div className="form-label">Reason</div>
              <div className="info-value-box">{refund.reason}</div>
            </div>
            <div className="info-item">
              <div className="form-label">Status</div>
              <div className="info-value-box">
                <span className={`badge ${getStatusBadgeClass(refund.status)}`}>
                  {getStatusIcon(refund.status)}
                  {refund.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="divider"></div>

        {/* Admin Notes Section */}
        <div className="card-header">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} style={{ color: 'var(--primary)' }} />
            <h3 className="card-title">Admin Notes</h3>
          </div>
        </div>
        <div className="card-body">
          <textarea
            className="form-textarea"
            placeholder="Add notes about this refund request..."
            value={refund.adminNotes}
            onChange={handleNotesChange}
            rows="4"
          />
        </div>

        {/* Action Buttons */}
        <div className="card-body">
          <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={handleClose}>
              Close
            </button>
            {refund.status === 'PENDING' && (
              <>
                <button className="btn btn-danger" onClick={handleReject}>
                  Reject
                </button>
                <button className="btn btn-primary" onClick={handleApprove}>
                  Approve
                </button>
              </>
            )}
            {refund.status === 'APPROVED' && (
              <button className="btn btn-primary" onClick={handleProcess}>
                Mark as Processed
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info Box for Guidance */}
      {refund.status === 'PENDING' && (
        <div className="info-box info-box-blue mt-4">
          <AlertCircle size={20} style={{ color: 'var(--blue)', flexShrink: 0 }} />
          <div>
            <div className="info-box-title">Review Required</div>
            <div className="info-box-text">
              Please verify the refund request details before approving or rejecting.
              Approved refunds will be processed for payment.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RefundDetails