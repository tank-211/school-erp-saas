/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  Lock,
  Shield,
  CreditCard,
  AlertCircle,
} from 'lucide-react'
import { fetchInvoiceDetails, getOnlinePaymentStatus } from '../services/apiService'
import '../styles/payment-page.css'
import RazorpayPaymentModal from '../components/RazorpayPaymentModal'

const Payment = () => {
  const { invoiceId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // Online payment needs the school's own Razorpay account to be connected

  const [online, setOnline] = useState(null)

  useEffect(() => {

    getOnlinePaymentStatus().then((r) => setOnline(r.success ? r.data : { enabled: false, error: r.error }))

  }, [])

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

  // "Pay Partial Amount" on the invoice page sends the chosen amount here;
  // without one the full pending amount is paid. Never more than is pending.
  const requestedAmount = Number(location.state?.partialAmount)
  const payAmount =
    Number.isFinite(requestedAmount) && requestedAmount > 0
      ? Math.min(Math.round(requestedAmount * 100) / 100, pendingAmount)
      : pendingAmount
  const isPartial = payAmount < pendingAmount

  const handlePaymentSuccess = (paymentData) => {
    console.log(
      '✅ Razorpay payment successful:',
      paymentData
    )

    sessionStorage.setItem(
      'paymentData',
      JSON.stringify({
        invoiceId,
        // What the server recorded (from Razorpay's order), not what the page asked for
        amount: Number(
          paymentData.verificationResponse?.amount ?? paymentData.amount
        ),
        paymentNumber:
          paymentData.verificationResponse?.paymentNumber,
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
                {invoice.className || invoice.class || 'N/A'}
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

            {isPartial && (
              <>
                <div className="summary-row">
                  <span className="text-muted">
                    Paying Now (partial)
                  </span>

                  <span className="font-semibold">
                    ₹{payAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="summary-row">
                  <span className="text-muted">
                    Balance After Payment
                  </span>

                  <span className="font-semibold">
                    ₹{(Math.round((pendingAmount - payAmount) * 100) / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </>
            )}

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
            ) : online === null ? (
              <p className="text-muted">Checking online payment...</p>
            ) : !online.enabled ? (
              <div className="text-center">
                <h3>Online payment is not set up</h3>
                <p className="text-muted">
                  {online.error ||
                    "This school's Razorpay account has not been connected yet. The platform team connects it from Super Admin. Meanwhile, record cash, cheque or bank payments from the Students page."}
                </p>
              </div>
            ) : (
              <>
                {online.mode === 'test' && (
                  <p className="text-muted" style={{ marginBottom: 12 }}>
                    Test mode: no real money is charged.
                  </p>
                )}
                <RazorpayPaymentModal
                  studentName={
                    invoice.studentName
                  }
                  studentId={
                    invoice.studentId ||
                    invoice.rollNumber
                  }
                  amount={payAmount}
                  invoiceId={invoice.invoiceId}
                  onSuccess={
                    handlePaymentSuccess
                  }
                  onFailure={
                    handlePaymentFailure
                  }
                />

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