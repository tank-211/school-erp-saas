import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Download, ArrowLeft, FileText, Calendar, CreditCard, Hash } from 'lucide-react'

const PaymentSuccess = () => {
  const navigate = useNavigate()
  const [paymentData, setPaymentData] = useState(null)

  useEffect(() => {
    // Get payment data from sessionStorage
    const data = sessionStorage.getItem('paymentData')
    if (data) {
      setPaymentData(JSON.parse(data))
    }
  }, [])

  const handleDownloadReceipt = () => {
    if (paymentData) {
      const receipt = `
╔══════════════════════════════════════════════════════════════╗
║                    PAYMENT RECEIPT                           ║
║              Sacred Tree International School                ║
╚══════════════════════════════════════════════════════════════╝

Invoice ID:       ${paymentData.invoiceId}
Student Name:     ${paymentData.studentName}
Amount Paid:      ₹${paymentData.amount.toLocaleString()}
Payment Method:   ${paymentData.paymentMethod || 'Razorpay'}
Transaction ID:   ${paymentData.transactionId}
Date & Time:      ${paymentData.timestamp || new Date().toLocaleString()}
Payment Status:   ✅ SUCCESSFUL

────────────────────────────────────────────────────────────────
Thank you for your payment!
For any queries, contact: accounts@sacredtree.edu.in
────────────────────────────────────────────────────────────────
      `.trim()

      const element = document.createElement('a')
      const file = new Blob([receipt], { type: 'text/plain' })
      element.href = URL.createObjectURL(file)
      element.download = `Receipt_${paymentData.invoiceId}_${Date.now()}.txt`
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
    }
  }

  const handleBackToDashboard = () => {
    sessionStorage.removeItem('paymentData')
    navigate('/')
  }

 const handleViewInvoice = () => {
  navigate('/fees')
}


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
                    <span>Invoice ID</span>
                  </div>
                  <div className="detail-value">{paymentData.invoiceId}</div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">
                    <FileText size={14} />
                    <span>Student Name</span>
                  </div>
                  <div className="detail-value">{paymentData.studentName}</div>
                </div>

                <div className="detail-row highlight">
                  <div className="detail-label">
                    <CreditCard size={14} />
                    <span>Amount Paid</span>
                  </div>
                  <div className="detail-value amount">₹{paymentData.amount.toLocaleString()}</div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">
                    <CreditCard size={14} />
                    <span>Payment Method</span>
                  </div>
                  <div className="detail-value">{paymentData.paymentMethod || 'Razorpay'}</div>
                </div>

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
                  <div className="detail-label">Loading payment details...</div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="action-buttons">
            <button className="btn btn-primary btn-large" onClick={handleDownloadReceipt}>
              <Download size={18} />
              Download Receipt
            </button>
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
              <li>✓ A confirmation email has been sent to your registered email</li>
              <li>✓ Download and save your receipt for your records</li>
              <li>✓ You can view your payment history in the dashboard</li>
              <li>✓ For any queries, contact the accounts department</li>
            </ul>
          </div>

          {/* Help Contact */}
          <div className="help-contact">
            <p>Need help? Contact us at <a href="mailto:accounts@sacredtree.edu.in">accounts@sacredtree.edu.in</a></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentSuccess