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
  const school = invoice.school || {}
  const initials = (school.name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  const classLabel = [invoice.className, invoice.section].filter(Boolean).join(' / ')
  const breakdown = Array.isArray(invoice.feeBreakdown) ? invoice.feeBreakdown : []
  const contact = [school.phone, school.email].filter(Boolean).join(' | ')

  return (
    <div className="page">
      {/* Back Button */}
      <button className="back-btn" onClick={() => navigate('/fees')}>
        <ArrowLeft size={20} />
        <span>Back to Payments</span>
      </button>

      {/* Invoice Container - Clean White Design */}
      <div className="invoice-wrapper">
        
        {/* School Header - Clean White */}
        <div className="invoice-school-header">
          <div className="school-logo-section">
            {initials && <div className="school-initial">{initials}</div>}
            <div>
              <h2 className="school-name">{school.name || 'School'}</h2>
              {school.address && <p className="school-subtitle">{school.address}</p>}
            </div>
          </div>
          <div className="invoice-title-section">
            <h1 className="invoice-main-title">Fee Invoice</h1>
            <p className="invoice-id-text">Invoice No: {invoice.invoiceNumber || invoice.invoiceId}</p>
            {invoice.invoiceDate && <p className="invoice-id-text">Date: {invoice.invoiceDate}</p>}
          </div>
          {/* The browser's print dialog can save the invoice as a PDF */}
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
            <Download size={14} />
            Print / Save as PDF
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
            <span className="info-value">{classLabel || '—'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Admission No.</span>
            <span className="info-value">{invoice.rollNumber || '—'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Academic Year</span>
            <span className="info-value">{invoice.academicYear || '—'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Due Date</span>
            <span className="info-value">{invoice.dueDate || '—'}</span>
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
              {breakdown.length > 0 ? (
                breakdown.map((fee, idx) => (
                  <tr key={idx}>
                    <td>{fee.feeType || fee.description}</td>
                    <td className="text-right">₹{Number(fee.amount || 0).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                // No itemised lines on record: show what the invoice says it covers
                <tr>
                  <td>{invoice.notes || 'School fees'}</td>
                  <td className="text-right">₹{Number(invoice.totalAmount || 0).toLocaleString()}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td className="total-label">Total Amount</td>
                <td className="text-right total-amount">₹{Number(invoice.totalAmount || 0).toLocaleString()}</td>
              </tr>
            </tfoot>
           </table>
        </div>

        {/* Payment Terms */}
        <div className="terms-section">
          <h3 className="section-title">Payment Details</h3>
          <ul className="terms-list">
            {invoice.dueDate && <li>• Please pay by {invoice.dueDate}</li>}
            <li>• Paid so far: ₹{Number(amountPaid).toLocaleString()} · Balance: ₹{Number(Math.max(remainingBalance, 0)).toLocaleString()}</li>
            {contact && <li>• For queries, contact the school: {contact}</li>}
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