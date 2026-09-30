/* eslint-disable react-hooks/set-state-in-effect */
import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, User, FileText, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { fetchRefundById, approveRefundRequest, rejectRefundRequest } from '../services/apiService'
import ProcessRefundDialog from '../components/refund/ProcessRefundDialog'

function RefundDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [refund, setRefund] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [processing, setProcessing] = useState(false)

  const loadRefund = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await fetchRefundById(id)
      if (result.success && result.data) {
        const r = result.data
        const day = (v) => (v ? new Date(v).toLocaleDateString('en-IN') : null)
        setRefund({
          id: String(r.id),
          studentName: [r.student?.first_name, r.student?.last_name].filter(Boolean).join(' ') || '—',
          admissionNumber: r.student?.admission_number || '—',
          invoiceNumber: r.payment?.invoice?.invoice_number || '—',
          invoiceId: r.payment?.invoice?.id ? String(r.payment.invoice.id) : null,
          paymentAmount: Number(r.payment?.amount || 0),
          paymentMethod: r.payment?.payment_method || '—',
          paymentDate: day(r.payment?.payment_date) || '—',
          amount: Number(r.amount || 0),
          reason: r.reason || '—',
          description: r.description || '',
          status: String(r.status || 'PENDING').toUpperCase(),
          requestedDate: day(r.created_at) || '—',
          adminNotes: r.notes || '',
          rejectionReason: r.rejection_reason || '',
          decidedOn: day(r.approval_date),
          processedOn: day(r.processed_date),
          refundMethod: r.refund_method || '',
          refundReference: r.refund_reference || '',
          accountHolder: r.account_holder || '',
          accountLast4: r.account_last4 || '',
          ifscCode: r.ifsc_code || '',
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
    setActionError('')
    const result = await approveRefundRequest(refund.id, { notes: refund.adminNotes })
    if (result.success) loadRefund()
    else setActionError(result.error || 'Approval failed')
  }

  const handleReject = async () => {
    setActionError('')
    const reason = window.prompt('Why is this refund being rejected?')
    if (reason === null) return
    if (!reason.trim()) {
      setActionError('A rejection reason is required.')
      return
    }
    const result = await rejectRefundRequest(refund.id, reason.trim())
    if (result.success) loadRefund()
    else setActionError(result.error || 'Rejection failed')
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
              <div className="form-label">Admission No.</div>
              <div className="info-value-box">{refund.admissionNumber}</div>
            </div>
            <div className="info-item">
              <div className="form-label">Invoice</div>
              <div className="info-value-box td-mono">
                {refund.invoiceId ? (
                  <a href={`/receipt/${refund.invoiceId}`} onClick={(e) => { e.preventDefault(); navigate(`/receipt/${refund.invoiceId}`) }}>
                    {refund.invoiceNumber}
                  </a>
                ) : refund.invoiceNumber}
              </div>
            </div>
            <div className="info-item">
              <div className="form-label">Payment Refunded</div>
              <div className="info-value-box">₹{refund.paymentAmount.toLocaleString('en-IN')} · {refund.paymentMethod} · {refund.paymentDate}</div>
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
              <div className="info-value-box">{refund.reason}{refund.description ? ` — ${refund.description}` : ''}</div>
            </div>
            {refund.rejectionReason && (
              <div className="info-item">
                <div className="form-label">Rejected because</div>
                <div className="info-value-box">{refund.rejectionReason}{refund.decidedOn ? ` (${refund.decidedOn})` : ''}</div>
              </div>
            )}
            {refund.status === 'PROCESSED' && (
              <div className="info-item">
                <div className="form-label">Refunded</div>
                <div className="info-value-box">
                  {[refund.processedOn, refund.refundMethod.replace(/_/g, ' '), refund.refundReference && `ref ${refund.refundReference}`,
                    refund.accountLast4 && `a/c ••••${refund.accountLast4}`, refund.ifscCode, refund.accountHolder].filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
            )}
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
            placeholder={refund.status === 'PENDING' ? 'Notes saved with the approval...' : 'No notes'}
            value={refund.adminNotes}
            onChange={handleNotesChange}
            rows="4"
            disabled={refund.status !== 'PENDING'}
          />
        </div>

        {/* Action Buttons */}
        <div className="card-body">
          {actionError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{actionError}</div>}
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
              <button className="btn btn-primary" onClick={() => setProcessing(true)}>
                Mark as Refunded
              </button>
            )}
          </div>
        </div>
      </div>

      {processing && (
        <ProcessRefundDialog
          refund={refund}
          onClose={() => setProcessing(false)}
          onDone={() => { setProcessing(false); loadRefund() }}
        />
      )}

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