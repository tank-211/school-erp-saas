import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchInvoiceDetails } from '../services/apiService'
import { CheckCircle, Download, ArrowLeft, FileText, Calendar, CreditCard, Hash } from 'lucide-react'

const PaymentSuccess = () => {
  const navigate = useNavigate()
  const [paymentData, setPaymentData] = useState(null)
  const [missing, setMissing] = useState(false)
  const [invoice, setInvoice] = useState(null)

  useEffect(() => {
    // Set by the Payment page after the server verified the Razorpay payment
    const data = sessionStorage.getItem('paymentData')
    if (!data) {
      setMissing(true)
      return
    }
    const parsed = JSON.parse(data)
    setPaymentData(parsed)
    // Student name and school contact come from the invoice itself
    if (parsed.invoiceId) {
      fetchInvoiceDetails(parsed.invoiceId).then((result) => {
        if (result.success && result.data) setInvoice(result.data)
      })
    }
  }, [])

  // The receipt page reads the recorded payment and prints to PDF
  const handleDownloadReceipt = () => {
    if (paymentData?.invoiceId) navigate(`/receipt/${paymentData.invoiceId}`)
  }

  const handleBackToDashboard = () => {
    sessionStorage.removeItem('paymentData')
    navigate('/dashboard')
  }

  const handleViewInvoice = () => {
    navigate('/fees')
  }

  const school = invoice?.school || {}
  const contactEmail = school.email || null
  const contactPhone = school.phone || null

  // Format date nicely
  const getFormattedDate = () => {
    if (paymentData?.timestamp) {
      return new Date(paymentData.timestamp).toLocaleString()
    }
    return new Date().toLocaleString()
  }

  return (
    <div className="page payment-success-page">
      {/* Back Button */}
      <button className="back-btn" onClick={handleBackToDashboard}>
        <ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </button>

      {/* Success Container */}
      <div className="success-container">
        <div className="success-card">
          {/* Success Icon */}
          <div className="success-icon-wrapper">
            <div className="success-icon-circle">
              <CheckCircle size={64} />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="success-title">Payment Successful!</h1>
          <p className="success-message">Your payment has been processed successfully</p>

          {/* Payment Details Card */}
          {paymentData ? (
            <div className="payment-details-card">
              <div className="details-header">
                <h3 className="details-title">Payment Details</h3>
              </div>
              
              <div className="details-list">
                <div className="detail-row">
                  <div className="detail-label">
                    <Hash size={14} />
                    <span>Invoice</span>
                  </div>
                  <div className="detail-value">{invoice?.invoiceNumber || paymentData.invoiceId}</div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">
                    <FileText size={14} />
                    <span>Student Name</span>
                  </div>
                  <div className="detail-value">{invoice?.studentName || paymentData.studentName || '—'}</div>
                </div>

                <div className="detail-row highlight">
                  <div className="detail-label">
                    <CreditCard size={14} />
                    <span>Amount Paid</span>
                  </div>
                  <div className="detail-value amount">₹{Number(paymentData.amount || 0).toLocaleString()}</div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">
                    <CreditCard size={14} />
                    <span>Payment Method</span>
                  </div>
                  <div className="detail-value">{paymentData.paymentMethod || 'Razorpay'}</div>
                </div>

                {paymentData.paymentNumber && (
                  <div className="detail-row">
                    <div className="detail-label">
                      <Hash size={14} />
                      <span>Receipt No.</span>
                    </div>
                    <div className="detail-value transaction-id">{paymentData.paymentNumber}</div>
                  </div>
                )}

                <div className="detail-row">
                  <div className="detail-label">
                    <Hash size={14} />
                    <span>Transaction ID</span>
                  </div>
                  <div className="detail-value transaction-id">{paymentData.transactionId}</div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">
                    <Calendar size={14} />
                    <span>Date & Time</span>
                  </div>
                  <div className="detail-value">{getFormattedDate()}</div>
                </div>
              </div>

              <div className="status-badge success">
                Payment Status: SUCCESSFUL
              </div>
            </div>
          ) : (
            <div className="payment-details-card loading">
              <div className="details-list">
                <div className="detail-row">
                  <div className="detail-label">
                    {missing
                      ? 'No recent payment to show. Open the invoice from Payment Monitoring to see its payments.'
                      : 'Loading payment details...'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="action-buttons">
            {paymentData?.invoiceId && (
              <button className="btn btn-primary btn-large" onClick={handleDownloadReceipt}>
                <Download size={18} />
                View / Print Receipt
              </button>
            )}
            {paymentData?.invoiceId && (
              <button className="btn btn-outline btn-large" onClick={handleViewInvoice}>
                <FileText size={18} />
               Back to Payment Monitoring
              </button>
            )}
            <button className="btn btn-outline btn-large" onClick={handleBackToDashboard}>
              <ArrowLeft size={18} />
              Back to Dashboard
            </button>
          </div>

          {/* Additional Info */}
          <div className="next-steps">
            <h4 className="next-steps-title">What's Next?</h4>
            <ul className="next-steps-list">
              <li>✓ The payment is recorded against the invoice</li>
              <li>✓ Open the receipt to print it or save it as a PDF</li>
              <li>✓ The invoice's payment history is in Payment Monitoring</li>
            </ul>
          </div>

          {/* Help Contact: the school's own details, when on record */}
          {(contactEmail || contactPhone) && (
            <div className="help-contact">
              <p>
                Need help? Contact {school.name || 'the school'}
                {contactEmail && <> at <a href={`mailto:${contactEmail}`}>{contactEmail}</a></>}
                {contactPhone && <>{contactEmail ? ' or ' : ' on '}{contactPhone}</>}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentSuccess