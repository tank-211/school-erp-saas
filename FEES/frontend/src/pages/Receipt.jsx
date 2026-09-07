/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, AlertCircle, CheckCircle } from 'lucide-react'
import { fetchInvoiceDetails, getPaymentHistory } from '../services/apiService'

const Receipt = () => {
  const { invoiceId } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [paymentHistory, setPaymentHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadInvoiceData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [invoiceResult, historyResult] = await Promise.all([
        fetchInvoiceDetails(invoiceId),
        getPaymentHistory(invoiceId)
      ])

      if (invoiceResult.success && invoiceResult.data) {
        setInvoice(invoiceResult.data)
      } else {
        setError(invoiceResult.error || 'Invoice not found')
      }

      if (historyResult.success && historyResult.data) {
        setPaymentHistory(historyResult.data)
      }
    } catch {
      setError('Failed to load receipt data')
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    loadInvoiceData()
  }, [loadInvoiceData])

  const handleDownloadReceipt = () => {
    if (!invoice) return

    const recentPayment = paymentHistory?.payments?.[0] || invoice.payments?.[0]

    const receiptText = `
╔════════════════════════════════════════════════════════════════════╗
║                         PAYMENT RECEIPT                           ║
║                    Sacred Tree International School                ║
╚════════════════════════════════════════════════════════════════════╝

INVOICE DETAILS:
────────────────────────────────────────────────────────────────────
Invoice ID:                    ${invoice.invoiceId}
Invoice Date:                  ${invoice.invoiceDate}
Receipt Generated:             ${new Date().toLocaleDateString()}

STUDENT INFORMATION:
────────────────────────────────────────────────────────────────────
Student Name:                  ${invoice.studentName}
Class/Section:                 ${invoice.class}
Roll Number:                   ${invoice.rollNumber}

PARENT INFORMATION:
────────────────────────────────────────────────────────────────────
Parent Name:                   ${invoice.parentName || 'N/A'}
Email:                         ${invoice.email || 'N/A'}
Phone:                         ${invoice.phone || 'N/A'}

PAYMENT DETAILS:
────────────────────────────────────────────────────────────────────
Payment Method:                ${recentPayment?.paymentMethod || 'N/A'}
Transaction ID:                ${recentPayment?.transactionId || recentPayment?.id || 'N/A'}
Payment Date:                  ${recentPayment?.createdAt ? new Date(recentPayment.createdAt).toLocaleDateString() : 'N/A'}
Payment Time:                  ${new Date().toLocaleTimeString()}

FEE BREAKDOWN:
────────────────────────────────────────────────────────────────────
${invoice.feeBreakdown?.map((fee) => `${fee.description.padEnd(30)} ₹${fee.amount.toLocaleString().padStart(10)}`).join('\n') || 'N/A'}
────────────────────────────────────────────────────────────────────
TOTAL AMOUNT PAID:             ₹${(invoice.paidAmount || invoice.amountPaid || 0).toLocaleString()}

PAYMENT STATUS:
────────────────────────────────────────────────────────────────────
Status:                        ✓ PAID
Amount Paid:                   ₹${(invoice.paidAmount || invoice.amountPaid || 0).toLocaleString()}
Outstanding Amount:            ₹0.00

TERMS & CONDITIONS:
────────────────────────────────────────────────────────────────────
• This is an electronically generated receipt and is as valid as an
  original receipt.
• The payment has been successfully processed and credited to your
  student account.
• Keep this receipt for your records and verification purposes.
• For any discrepancies, contact the accounts department immediately.

════════════════════════════════════════════════════════════════════
Thank you for your payment! Your child's education is our priority.
════════════════════════════════════════════════════════════════════
    `.trim()

    const element = document.createElement('a')
    const file = new Blob([receiptText], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `Receipt_${invoiceId}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  if (loading) {
    return (
      <div className="receipt-page" style={{ padding: '40px 20px', minHeight: '100vh', backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', padding: '40px', textAlign: 'center', maxWidth: '500px' }}>
          <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
          <p>Loading receipt...</p>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="receipt-page" style={{ padding: '40px 20px', minHeight: '100vh', backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', padding: '40px', textAlign: 'center', maxWidth: '500px' }}>
          <AlertCircle size={40} style={{ color: '#dc3545', marginBottom: '20px' }} />
          <h2>Receipt Not Found</h2>
          <p style={{ marginBottom: '20px', color: '#666' }}>{error || `The receipt for ${invoiceId} does not exist in our records.`}</p>
          <button onClick={() => navigate('/')} style={{ padding: '10px 24px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const recentPayment = paymentHistory?.payments?.[0] || invoice.payments?.[0]

  return (
    <div className="receipt-page" style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button onClick={() => navigate(-1)} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#28a745', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
            <ArrowLeft size={18} />
            Back
          </button>
          <h1 style={{ margin: '0 0 5px 0', fontSize: '28px', color: '#333' }}>Payment Receipt</h1>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>{invoice.invoiceId}</p>
        </div>
        <button
          onClick={handleDownloadReceipt}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Download size={18} />
          Download Receipt
        </button>
      </div>

      {/* Receipt Card */}
      <div style={{ maxWidth: '700px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {/* Payment Status Header */}
        <div style={{ backgroundColor: '#d4edda', borderBottom: '2px solid #28a745', padding: '30px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
            <div style={{ width: '60px', height: '60px', backgroundColor: '#28a745', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={40} style={{ color: '#fff' }} />
            </div>
          </div>
          <h2 style={{ margin: '15px 0 5px 0', color: '#155724', fontSize: '24px' }}>Payment Successful</h2>
          <p style={{ margin: 0, color: '#155724', fontSize: '14px' }}>Your payment has been processed and credited</p>
        </div>

        {/* Receipt Content */}
        <div style={{ padding: '30px' }}>
          {/* Invoice & Payment Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div style={{ borderRight: '1px solid #eee', paddingRight: '20px' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Invoice Details</h4>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ color: '#666', fontSize: '12px', fontWeight: '600' }}>Invoice ID</span>
                <p style={{ margin: '4px 0 0 0', color: '#333', fontSize: '14px', fontWeight: '600' }}>{invoice.invoiceId}</p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ color: '#666', fontSize: '12px', fontWeight: '600' }}>Invoice Date</span>
                <p style={{ margin: '4px 0 0 0', color: '#333', fontSize: '14px' }}>{invoice.invoiceDate}</p>
              </div>
              <div>
                <span style={{ color: '#666', fontSize: '12px', fontWeight: '600' }}>Status</span>
                <p style={{ margin: '4px 0 0 0', color: '#28a745', fontSize: '14px', fontWeight: '600' }}>✓ Paid</p>
              </div>
            </div>
            <div>
              <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Payment Details</h4>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ color: '#666', fontSize: '12px', fontWeight: '600' }}>Payment Method</span>
                <p style={{ margin: '4px 0 0 0', color: '#333', fontSize: '14px' }}>{recentPayment?.paymentMethod || 'N/A'}</p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ color: '#666', fontSize: '12px', fontWeight: '600' }}>Payment Date</span>
                <p style={{ margin: '4px 0 0 0', color: '#333', fontSize: '14px' }}>{recentPayment?.createdAt ? new Date(recentPayment.createdAt).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <span style={{ color: '#666', fontSize: '12px', fontWeight: '600' }}>Transaction ID</span>
                <p style={{ margin: '4px 0 0 0', color: '#28a745', fontSize: '12px', fontFamily: 'monospace' }}>{recentPayment?.transactionId || recentPayment?.id || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Student Information */}
          <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>Student Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#666' }}>Student Name:</span>
                <p style={{ margin: '2px 0 0 0', color: '#333', fontWeight: '600' }}>{invoice.studentName}</p>
              </div>
              <div>
                <span style={{ color: '#666' }}>Class:</span>
                <p style={{ margin: '2px 0 0 0', color: '#333', fontWeight: '600' }}>{invoice.class}</p>
              </div>
              <div>
                <span style={{ color: '#666' }}>Roll Number:</span>
                <p style={{ margin: '2px 0 0 0', color: '#333', fontWeight: '600' }}>{invoice.rollNumber}</p>
              </div>
              <div>
                <span style={{ color: '#666' }}>Email:</span>
                <p style={{ margin: '2px 0 0 0', color: '#333' }}>{invoice.email || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Fee Breakdown */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>Fee Breakdown</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {invoice.feeBreakdown?.map((fee, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 0', color: '#333', fontSize: '13px' }}>{fee.description}</td>
                    <td style={{ padding: '10px 0', textAlign: 'right', color: '#333', fontWeight: '600', fontSize: '13px' }}>₹{fee.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderTop: '2px solid #dee2e6', marginTop: '10px' }}>
              <span style={{ color: '#333', fontWeight: '600', fontSize: '14px' }}>Total Amount Paid</span>
              <span style={{ color: '#28a745', fontWeight: 'bold', fontSize: '16px' }}>₹{(invoice.paidAmount || invoice.amountPaid || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Notes */}
          <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '13px' }}>Important Notes</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#666', fontSize: '12px' }}>
              <li style={{ marginBottom: '6px' }}>This receipt is an official record of payment. Please keep it for your records.</li>
              <li style={{ marginBottom: '6px' }}>The amount paid has been credited to your student's account.</li>
              <li style={{ marginBottom: '6px' }}>For any discrepancies, contact the accounts department within 7 days.</li>
              <li>Email: accounts@school.edu | Phone: 1800-123-4567</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '10px 24px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              Back to Dashboard
            </button>
            <button
              onClick={handleDownloadReceipt}
              style={{
                padding: '10px 24px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Download size={16} />
              Download Receipt
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '30px', color: '#666', fontSize: '12px' }}>
        <p>Sacred Tree International School | Excellence in Education</p>
        <p>This is an electronically generated receipt and is as valid as an original receipt.</p>
      </div>
    </div>
  )
}

export default Receipt