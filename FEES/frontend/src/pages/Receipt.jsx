/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { fetchInvoiceDetails, getPaymentHistory } from '../services/apiService'

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
const day = (value) => (value ? new Date(value).toLocaleDateString('en-IN') : '—')

const label = { color: '#666', fontSize: '12px', fontWeight: '600' }
const value = { margin: '4px 0 0 0', color: '#333', fontSize: '14px' }
const button = (bg) => ({
  padding: '10px 20px',
  backgroundColor: bg,
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: '600',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
})

const Receipt = () => {
  const { invoiceId } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadInvoiceData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [invoiceResult, historyResult] = await Promise.all([
        fetchInvoiceDetails(invoiceId),
        getPaymentHistory(invoiceId),
      ])

      if (invoiceResult.success && invoiceResult.data) {
        setInvoice(invoiceResult.data)
      } else {
        setError(invoiceResult.error || 'Invoice not found')
      }

      if (historyResult.success && Array.isArray(historyResult.data?.payments)) {
        setPayments(historyResult.data.payments)
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

  const shell = (children) => (
    <div className="receipt-page" style={{ padding: '40px 20px', minHeight: '100vh', backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', padding: '40px', textAlign: 'center', maxWidth: '500px' }}>
        {children}
      </div>
    </div>
  )

  if (loading) {
    return shell(
      <>
        <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
        <p>Loading receipt...</p>
      </>
    )
  }

  if (error || !invoice) {
    return shell(
      <>
        <AlertCircle size={40} style={{ color: '#dc3545', marginBottom: '20px' }} />
        <h2>Receipt Not Found</h2>
        <p style={{ marginBottom: '20px', color: '#666' }}>{error || `No receipt was found for invoice ${invoiceId}.`}</p>
        <button onClick={() => navigate('/fees')} style={button('#28a745')}>
          Back to Payments
        </button>
      </>
    )
  }

  const school = invoice.school || {}
  const paid = Number(invoice.paidAmount || invoice.amountPaid || 0)
  const balance = Math.max(Number(invoice.amountPending ?? (Number(invoice.totalAmount || 0) - paid)), 0)
  const fullyPaid = paid > 0 && balance <= 0
  const latest = payments[0] || null
  const classLabel = [invoice.className, invoice.section].filter(Boolean).join(' / ')
  const breakdown = Array.isArray(invoice.feeBreakdown) ? invoice.feeBreakdown : []
  const contact = [school.phone, school.email].filter(Boolean).join(' | ')

  const banner = fullyPaid
    ? { bg: '#d4edda', border: '#28a745', color: '#155724', icon: <CheckCircle size={40} style={{ color: '#fff' }} />, dot: '#28a745', title: 'Fully Paid', text: `${money(paid)} received against this invoice` }
    : paid > 0
      ? { bg: '#fff3cd', border: '#ffc107', color: '#856404', icon: <Clock size={36} style={{ color: '#fff' }} />, dot: '#ffc107', title: 'Partly Paid', text: `${money(paid)} received · ${money(balance)} still due` }
      : { bg: '#f8d7da', border: '#dc3545', color: '#721c24', icon: <AlertCircle size={36} style={{ color: '#fff' }} />, dot: '#dc3545', title: 'No Payment Yet', text: `${money(balance)} due${invoice.dueDate ? ` by ${invoice.dueDate}` : ''}` }

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
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Invoice {invoice.invoiceNumber || invoice.invoiceId}</p>
        </div>
        {/* The browser's print dialog can save the receipt as a PDF */}
        <button onClick={() => window.print()} style={button('#28a745')}>
          <Download size={18} />
          Print / Save as PDF
        </button>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {/* School letterhead */}
        <div style={{ padding: '20px 30px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
          <h2 style={{ margin: 0, color: '#333', fontSize: '20px' }}>{school.name || 'School'}</h2>
          {school.address && <p style={{ margin: '4px 0 0', color: '#666', fontSize: '13px' }}>{school.address}</p>}
          {contact && <p style={{ margin: '2px 0 0', color: '#666', fontSize: '13px' }}>{contact}</p>}
        </div>

        {/* Payment status, from what has actually been paid */}
        <div style={{ backgroundColor: banner.bg, borderBottom: `2px solid ${banner.border}`, padding: '24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <div style={{ width: '60px', height: '60px', backgroundColor: banner.dot, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {banner.icon}
            </div>
          </div>
          <h2 style={{ margin: '10px 0 5px 0', color: banner.color, fontSize: '22px' }}>{banner.title}</h2>
          <p style={{ margin: 0, color: banner.color, fontSize: '14px' }}>{banner.text}</p>
        </div>

        <div style={{ padding: '30px' }}>
          {/* Invoice & latest payment */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div style={{ borderRight: '1px solid #eee', paddingRight: '20px' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Invoice Details</h4>
              <div style={{ marginBottom: '12px' }}>
                <span style={label}>Invoice No.</span>
                <p style={{ ...value, fontWeight: '600' }}>{invoice.invoiceNumber || invoice.invoiceId}</p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <span style={label}>Invoice Date</span>
                <p style={value}>{invoice.invoiceDate || '—'}</p>
              </div>
              <div>
                <span style={label}>Invoice Total</span>
                <p style={value}>{money(invoice.totalAmount)}</p>
              </div>
            </div>
            <div>
              <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Latest Payment</h4>
              {latest ? (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={label}>Receipt No.</span>
                    <p style={{ ...value, fontFamily: 'monospace', fontSize: '12px' }}>{latest.paymentNumber || latest.id}</p>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={label}>Amount / Method</span>
                    <p style={value}>{money(latest.amount)} · {latest.paymentMethod || '—'}</p>
                  </div>
                  <div>
                    <span style={label}>Payment Date</span>
                    <p style={value}>{day(latest.paymentDate)}</p>
                  </div>
                </>
              ) : (
                <p style={{ ...value, color: '#666' }}>No payment has been recorded for this invoice.</p>
              )}
            </div>
          </div>

          {/* Student */}
          <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>Student Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#666' }}>Student Name:</span>
                <p style={{ margin: '2px 0 0 0', color: '#333', fontWeight: '600' }}>{invoice.studentName}</p>
              </div>
              <div>
                <span style={{ color: '#666' }}>Class:</span>
                <p style={{ margin: '2px 0 0 0', color: '#333', fontWeight: '600' }}>{classLabel || '—'}</p>
              </div>
              <div>
                <span style={{ color: '#666' }}>Admission No.:</span>
                <p style={{ margin: '2px 0 0 0', color: '#333', fontWeight: '600' }}>{invoice.rollNumber || '—'}</p>
              </div>
              <div>
                <span style={{ color: '#666' }}>Academic Year:</span>
                <p style={{ margin: '2px 0 0 0', color: '#333' }}>{invoice.academicYear || '—'}</p>
              </div>
            </div>
          </div>

          {/* What the invoice covers */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>Fee Breakdown</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {(breakdown.length ? breakdown : [{ feeType: invoice.notes || 'School fees', amount: invoice.totalAmount }]).map((fee, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 0', color: '#333', fontSize: '13px' }}>{fee.feeType || fee.description}</td>
                    <td style={{ padding: '10px 0', textAlign: 'right', color: '#333', fontWeight: '600', fontSize: '13px' }}>{money(fee.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 4px', borderTop: '2px solid #dee2e6', marginTop: '10px' }}>
              <span style={{ color: '#333', fontWeight: '600', fontSize: '14px' }}>Total Paid</span>
              <span style={{ color: '#28a745', fontWeight: 'bold', fontSize: '16px' }}>{money(paid)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: '#333', fontSize: '14px' }}>Balance Due</span>
              <span style={{ color: balance > 0 ? '#dc3545' : '#333', fontWeight: '600', fontSize: '14px' }}>{money(balance)}</span>
            </div>
          </div>

          {/* Every payment on this invoice */}
          {payments.length > 1 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>All Payments</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px 0' }}>{day(p.paymentDate)}</td>
                      <td style={{ padding: '8px 0' }}>{p.paymentMethod || '—'}</td>
                      <td style={{ padding: '8px 0', fontFamily: 'monospace', fontSize: '12px' }}>{p.paymentNumber || p.id}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>{money(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={() => navigate('/fees')} style={button('#6c757d')}>
              Back to Payments
            </button>
            <button onClick={() => window.print()} style={button('#28a745')}>
              <Download size={16} />
              Print / Save as PDF
            </button>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '30px', color: '#666', fontSize: '12px' }}>
        <p>{school.name ? `${school.name} · ` : ''}This is a computer-generated receipt.</p>
      </div>
    </div>
  )
}

export default Receipt
