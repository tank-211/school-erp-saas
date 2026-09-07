/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import RazorpayPaymentModal from './RazorpayPaymentModal';
import '../styles/payment-page.css';
import { fetchInvoiceDetails } from '../services/apiService';

function PaymentPage() {
  const { invoiceId } = useParams();
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [feeData, setFeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadInvoiceData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await fetchInvoiceDetails(invoiceId)
      if (result.success && result.data) {
        const data = result.data
        setFeeData({
          studentName: data.studentName,
          studentId: data.rollNumber,
          amount: data.totalAmount - (data.paidAmount || data.amountPaid || 0),
          invoiceId: data.invoiceId,
          totalAmount: data.totalAmount,
        })
      } else {
        setError(result.error || 'Invoice not found')
      }
    } catch {
      setError('Failed to load invoice data')
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    if (invoiceId) {
      loadInvoiceData()
    }
  }, [invoiceId, loadInvoiceData])

  const handlePaymentSuccess = (paymentData) => {
    console.log('✅ Payment successful:', paymentData)
    setPaymentStatus('success');
    setPaymentDetails(paymentData);

    if (invoiceId && paymentData.amount) {
      recordPaymentOnBackend(invoiceId, paymentData)
    }
  };

  const recordPaymentOnBackend = async (invId, paymentData) => {
    try {
      const { recordPayment } = await import('../services/apiService')
      const result = await recordPayment(
        invId,
        paymentData.amount,
        'ONLINE',
        paymentData.paymentId,
        `Razorpay payment - Order: ${paymentData.orderId}`
      )
      if (result.success) {
        console.log('✅ Payment recorded in backend')
      }
    } catch (error) {
      console.error('❌ Error recording payment:', error)
    }
  }

  const handlePaymentFailure = (error) => {
    console.error('❌ Payment failed:', error)
    setPaymentStatus('failure');
    setPaymentDetails(error);
  };


  if (loading) {
    return (
      <div className="payment-page-container">
        <div className="payment-page-header">
          <h1>Fee Payment</h1>
          <p>Secure payment powered by Razorpay</p>
        </div>
        <div className="payment-page-content">
          <div className="card">
            <div className="card-body text-center">
              <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
              <p>Loading invoice details...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !feeData) {
    return (
      <div className="payment-page-container">
        <div className="payment-page-header">
          <h1>Fee Payment</h1>
          <p>Secure payment powered by Razorpay</p>
        </div>
        <div className="payment-page-content">
          <div className="card">
            <div className="card-body text-center">
              <h3>Error Loading Invoice</h3>
              <p>{error || 'Invoice not found'}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="payment-page-container">
      <div className="payment-page-header">
        <h1>Fee Payment</h1>
        <p>Secure payment powered by Razorpay</p>
      </div>

      <div className="payment-page-content">
        {/* Fee Details Section */}
        <div className="fee-details-section">
          <h2>Fee Details</h2>
          <table className="fee-table">
            <tbody>
              <tr>
                <td>Student Name:</td>
                <td className="value">{feeData.studentName}</td>
              </tr>
              <tr>
                <td>Student ID:</td>
                <td className="value">{feeData.studentId}</td>
              </tr>
              <tr>
                <td>Total Fee:</td>
                <td className="value">₹{parseFloat(feeData.totalAmount).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Amount Due:</td>
                <td className="value highlight">₹{parseFloat(feeData.amount).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Invoice ID:</td>
                <td className="value">{feeData.invoiceId}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Status Section */}
        {paymentStatus && (
          <div className={`payment-status payment-status-${paymentStatus}`}>
            {paymentStatus === 'success' ? (
              <div className="success-message">
                <h3>✅ Payment Successful!</h3>
                <p>Your payment has been verified and recorded.</p>
                <div className="success-details">
                  <p>
                    <strong>Payment ID:</strong> {paymentDetails.paymentId}
                  </p>
                  <p>
                    <strong>Amount:</strong> ₹{parseFloat(paymentDetails.amount).toFixed(2)}
                  </p>
                  <p>
                    <strong>Status:</strong>{' '}
                    {paymentDetails.verificationResponse?.data?.status || 'Captured'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="failure-message">
                <h3>❌ Payment Failed</h3>
                <p>{paymentDetails?.message || 'Payment could not be processed'}</p>
              </div>
            )}
          </div>
        )}

        {/* Payment Modal Component */}
        {showPaymentModal ? (
          <div className="payment-modal-wrapper">
            <RazorpayPaymentModal
              studentName={feeData.studentName}
              studentId={feeData.studentId}
              amount={feeData.amount}
              invoiceId={feeData.invoiceId}
              onSuccess={handlePaymentSuccess}
              onFailure={handlePaymentFailure}
            />
          </div>
        ) : (
          <div className="payment-button-section">
            <button
              className="pay-button"
              onClick={() => setShowPaymentModal(true)}
              disabled={paymentStatus === 'success'}
            >
              Pay ₹{parseFloat(feeData.amount).toFixed(2)} Now
            </button>
            <p className="payment-info">
              Click above to proceed to secure payment via Razorpay
            </p>
          </div>
        )}

        {/* Security Information */}
        <div className="security-info">
          <h3>🔒 Security Information</h3>
          <ul>
            <li>Your payment is processed securely by Razorpay</li>
            <li>We never see your bank or card details</li>
            <li>All transactions are encrypted and PCI DSS compliant</li>
            <li>Payment verification happens on our secure backend</li>
            <li>No sensitive information is stored on the frontend</li>
          </ul>
        </div>

        {/* FAQ Section */}
        <div className="faq-section">
          <h3>Frequently Asked Questions</h3>
          <div className="faq-item">
            <h4>What payment methods are accepted?</h4>
            <p>We currently accept UPI payments (Google Pay, PhonePe, PayTM, BHIM, etc.)</p>
          </div>
          <div className="faq-item">
            <h4>Is my data secure?</h4>
            <p>
              Yes! Your sensitive data (Secret Keys, Bank Details) is never exposed to the
              frontend. All verification happens on our secure backend servers.
            </p>
          </div>
          <div className="faq-item">
            <h4>What if payment fails?</h4>
            <p>
              If payment fails, you'll see an error message. You can retry the payment or
              contact support.
            </p>
          </div>
          <div className="faq-item">
            <h4>When will my fee status update?</h4>
            <p>
              Your fee payment is recorded immediately after successful verification. You'll
              see a confirmation message.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentPage;