/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, AlertCircle, Edit2 } from 'lucide-react'
import { fetchInvoiceDetails } from '../services/apiService'

const Invoice = () => {
  const { invoiceId } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPartialInput, setShowPartialInput] = useState(false)
  const [customAmount, setCustomAmount] = useState('')
  const [remainingBalance, setRemainingBalance] = useState(0)

  const loadInvoice = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await fetchInvoiceDetails(invoiceId)
      if (result.success && result.data) {
        setInvoice(result.data)
        const paid = result.data.paidAmount || result.data.amountPaid || 0
        const total = result.data.totalAmount || 0
        setRemainingBalance(total - paid)
      } else {
        setError(result.error || 'Invoice not found')
      }
    } catch {
      setError('Failed to load invoice')
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    loadInvoice()
  }, [loadInvoice])

  const handleProceedToPayment = (amount) => {
    if (amount && amount > 0 && amount <= remainingBalance) {
      navigate(`/payment/${invoiceId}`, { 
        state: { 
          partialAmount: amount,
          remainingBalance: remainingBalance - amount,
          originalTotal: invoice.totalAmount
        } 
      })
    } else if (!showPartialInput) {
      navigate(`/payment/${invoiceId}`, { 
        state: { 
          partialAmount: remainingBalance,
          remainingBalance: 0,
          originalTotal: invoice.totalAmount
        } 
      })
    }
  }

  const handlePartialPaymentClick = () => {
    setShowPartialInput(true)
    setCustomAmount(remainingBalance.toString())
  }

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
            <p>Loading invoice...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="page">
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
            <AlertCircle size={40} style={{ color: 'var(--red)', marginBottom: '16px' }} />
            <h2 className="card-title">Invoice Not Found</h2>
            <p className="text-muted mb-4">{error || `The invoice ${invoiceId} does not exist in our records.`}</p>
            <button onClick={() => navigate('/fees')} className="btn btn-primary">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const amountPaid = invoice.paidAmount || invoice.amountPaid || 0
  const isFullyPaid = remainingBalance <= 0

  return (
    <div className="page">
      {/* Back Button */}
      <button className="back-btn" onClick={() => navigate('/fees')}>
        <ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </button>

      {/* Invoice Container - Clean White Design */}
      <div className="invoice-wrapper">
        
        {/* School Header - Clean White */}
        <div className="invoice-school-header">
          <div className="school-logo-section">
            <div className="school-initial">ST</div>
            <div>
              <h2 className="school-name">Sacred Tree</h2>
              <p className="school-subtitle">International School</p>
            </div>
          </div>
          <div className="invoice-title-section">
            <h1 className="invoice-main-title">Admission Fee Invoice</h1>
            <p className="invoice-id-text">Invoice ID: {invoice.invoiceId}</p>
          </div>
          <button className="btn btn-outline btn-sm">
            <Download size={14} />
            Download PDF
          </button>
        </div>

        {/* Student Info Row */}
        <div className="student-info-row">
          <div className="info-row">
            <span className="info-label">Student Name</span>
            <span className="info-value">{invoice.studentName}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Class / Section</span>
            <span className="info-value">{invoice.class}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Admission ID</span>
            <span className="info-value">ADM-2024-1234</span>
          </div>
          <div className="info-row">
            <span className="info-label">Academic Year</span>
            <span className="info-value">2024-2025</span>
          </div>
        </div>

        {/* Fee Breakdown Table */}
        <div className="fee-section">
          <h3 className="section-title">Fee Breakdown</h3>
          <table className="fee-table">
            <thead>
              <tr>
                <th>Description</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.feeBreakdown && invoice.feeBreakdown.map((fee, idx) => (
                <tr key={idx}>
                  <td>{fee.description}</td>
                  <td className="text-right">₹{fee.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td className="total-label">Total Amount</td>
                <td className="text-right total-amount">₹{invoice.totalAmount.toLocaleString()}</td>
              </tr>
            </tfoot>
           </table>
        </div>

        {/* Payment Terms */}
        <div className="terms-section">
          <h3 className="section-title">Payment Terms</h3>
          <ul className="terms-list">
            <li>• Payment must be made by the due date to avoid late fees</li>
            <li>• Late payment will incur a 5% penalty per week</li>
            <li>• All fees are non-refundable unless stated otherwise</li>
            <li>• For any queries, contact the accounts department</li>
          </ul>
        </div>

        {/* Payment Status (if partial payment exists) */}
        {amountPaid > 0 && remainingBalance > 0 && (
          <div className="info-box info-box-orange" style={{ margin: '0 24px 20px' }}>
            <AlertCircle size={16} />
            <span>Pending Balance: ₹{remainingBalance.toLocaleString()}</span>
          </div>
        )}

        {/* Partial Payment Input */}
        {!isFullyPaid && showPartialInput && (
          <div className="partial-payment-box">
            <div className="partial-input-wrapper">
              <span className="currency-symbol">₹</span>
              <input
                type="number"
                className="form-input"
                value={customAmount}
                onChange={(e) => {
                  let value = parseFloat(e.target.value)
                  if (value > remainingBalance) value = remainingBalance
                  if (value < 0) value = 0
                  setCustomAmount(value || 0)
                }}
                min="0"
                max={remainingBalance}
                placeholder="Enter amount"
              />
            </div>
            <div className="flex gap-3" style={{ marginTop: '12px' }}>
              <button 
                className="btn btn-primary"
                onClick={() => handleProceedToPayment(parseFloat(customAmount))}
              >
                Pay ₹{parseFloat(customAmount || 0).toLocaleString()}
              </button>
              <button 
                className="btn btn-outline"
                onClick={() => setShowPartialInput(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!isFullyPaid && !showPartialInput && (
          <div className="invoice-actions">
            <button 
              onClick={() => handleProceedToPayment(remainingBalance)} 
              className="btn btn-primary"
            >
              Proceed to Payment
            </button>
            <button 
              onClick={handlePartialPaymentClick} 
              className="btn btn-outline"
            >
              <Edit2 size={14} />
              Pay Partial Amount
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Invoice