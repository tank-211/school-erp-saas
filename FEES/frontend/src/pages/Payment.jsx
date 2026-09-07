/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Lock,
  Shield,
  CreditCard,
  AlertCircle,
} from 'lucide-react'
import { fetchInvoiceDetails, recordPayment, } from '../services/apiService'
import '../styles/payment-page.css'
import RazorpayPaymentModal from '../components/RazorpayPaymentModal'

const Payment = () => {
  const { invoiceId } = useParams()
  const navigate = useNavigate()

  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadInvoice = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await fetchInvoiceDetails(invoiceId)

      if (result.success && result.data) {
        setInvoice(result.data)
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

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <div className="card-body text-center">
            <div
              className="spinner"
              style={{ margin: '0 auto 20px' }}
            />
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
          <div className="card-body text-center">
            <AlertCircle
              size={40}
              style={{
                color: 'var(--red)',
                marginBottom: '16px',
              }}
            />

            <h2 className="card-title">
              Invoice Not Found
            </h2>

            <p className="text-muted mb-4">
              {error ||
                `The invoice ${invoiceId} does not exist.`}
            </p>

            <button
              onClick={() => navigate('/fees')}
              className="btn btn-primary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const totalAmount = Number(invoice.totalAmount || 0)

  const paidAmount = Number(
    invoice.paidAmount ??
      invoice.amountPaid ??
      0
  )

  const pendingAmount = Math.max(
    0,
    totalAmount - paidAmount
  )

  const handlePaymentSuccess = (paymentData) => {
    console.log(
      '✅ Razorpay payment successful:',
      paymentData
    )

    sessionStorage.setItem(
      'paymentData',
      JSON.stringify({
        invoiceId,
        amount: Number(paymentData.amount),
        paymentMethod: 'ONLINE',
        transactionId:
          paymentData.paymentId,
        orderId: paymentData.orderId,
        studentId:
          paymentData.studentId,
      })
    )

    navigate('/payment-success')
  }

  const handlePaymentFailure = (paymentError) => {
    console.error(
      '❌ Razorpay payment failed:',
      paymentError
    )
  }

    const handleTestPayment = async () => {
      try {
        console.log('🧪 Starting ₹1 test payment...')

        const result = await recordPayment(
          invoiceId,
          1,
          'CASH',
          `TEST-${Date.now()}`,
          'Development test payment'
        )

        console.log('🧪 TEST PAYMENT RESULT:', result)

        if (result.success) {
          alert('✅ ₹1 test payment recorded successfully')

          // Reload invoice so Paid/Pending amounts update
          await loadInvoice()
        } else {
          alert(
            `❌ Test payment failed: ${
              result.error || 'Unknown error'
            }`
          )
        }
      } catch (error) {
        console.error('❌ TEST PAYMENT ERROR:', error)

        alert(
          `❌ Test payment failed: ${
            error.message || 'Unknown error'
          }`
        )
      }
    }

  return (
    <div className="page">

      <button
        className="back-btn"
        onClick={() => navigate('/fees')}
      >
        <ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </button>

      <div className="payment-container">

        {/* LEFT - PAYMENT SUMMARY */}
        <div className="payment-summary-card">

          <div className="card-header">
            <h3 className="card-title">
              Payment Summary
            </h3>
          </div>

          <div className="card-body">

            <div className="summary-row">
              <span className="text-muted">
                Invoice ID
              </span>

              <span className="td-mono">
                {invoice.invoiceId}
              </span>
            </div>

            <div className="summary-row">
              <span className="text-muted">
                Student Name
              </span>

              <span className="font-semibold">
                {invoice.studentName}
              </span>
            </div>

            <div className="summary-row">
              <span className="text-muted">
                Class
              </span>

              <span className="font-semibold">
                {invoice.class || 'N/A'}
              </span>
            </div>

            <div className="divider" />

            <div className="summary-row">
              <span className="text-muted">
                Total Fee
              </span>

              <span className="font-semibold">
                ₹{totalAmount.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="summary-row">
              <span className="text-muted">
                Already Paid
              </span>

              <span className="font-semibold">
                ₹{paidAmount.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="divider" />

            <div className="summary-row amount-row">
              <span className="text-muted">
                Amount Due
              </span>

              <span
                className="stat-value"
                style={{ fontSize: '24px' }}
              >
                ₹{pendingAmount.toLocaleString('en-IN')}
              </span>
            </div>

          </div>

          <div className="summary-footer">
            <Shield size={14} />
            <span>
              Secured by 256-bit encryption
            </span>
          </div>

        </div>

        {/* RIGHT - RAZORPAY */}
        <div className="card">

          <div className="card-header">
            <h3 className="card-title">
              Secure Payment
            </h3>
          </div>

          <div className="card-body">

            {pendingAmount <= 0 ? (
              <div className="text-center">
                <Shield
                  size={40}
                  style={{
                    color: 'var(--green)',
                    marginBottom: '16px',
                  }}
                />

                <h3>Invoice Fully Paid</h3>

                <p className="text-muted">
                  There is no outstanding amount
                  on this invoice.
                </p>
              </div>
            ) : (
              <>
                <RazorpayPaymentModal
                  studentName={
                    invoice.studentName
                  }
                  studentId={
                    invoice.studentId ||
                    invoice.rollNumber
                  }
                  amount={pendingAmount}
                  invoiceId={invoice.invoiceId}
                  onSuccess={
                    handlePaymentSuccess
                  }
                  onFailure={
                    handlePaymentFailure
                  }
                />

                  <button
                    type="button"
                    onClick={handleTestPayment}
                    style={{
                      marginTop: '12px',
                      width: '100%',
                      padding: '10px 20px',
                      background: '#666',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    🧪 DEV: Test ₹1 Payment
                </button>

                <div className="security-footer">
                  <Lock size={14} />

                  <div>
                    <div className="security-title">
                      Secure Payment
                    </div>

                    <div className="security-text">
                      Your payment is processed
                      securely through Razorpay.
                      Your card and bank details
                      are not stored by this
                      application.
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>

        </div>

      </div>
    </div>
  )
}

export default Payment