/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Eye, ArrowLeft, Bell } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import { MdSms } from 'react-icons/md'
import { fetchTransactions, sendWhatsAppMessage, sendSMSMessage, sendBulkReminders } from '../services/apiService'

const Fees = () => {
  const navigate = useNavigate()
  const [filteredTransactions, setFilteredTransactions] = useState([])
  const [allTransactions, setAllTransactions] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const statusOptions = ['All', 'Paid', 'Partly Paid', 'Not Paid', 'Overdue']

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchTransactions()
      if (result.success && Array.isArray(result.data)) {
        const transformed = result.data.map((tx) => ({
          id: tx.invoiceId,
          invoiceId: String(tx.invoiceId),
          invoiceNumber: tx.invoiceNumber,
          studentName: tx.studentName || 'Unknown',
          class: tx.className || '—',
          amount: Number(tx.totalAmount || 0),
          amountPaid: Number(tx.paidAmount || 0),
          status: String(tx.status || 'unpaid').toUpperCase(),
          paymentMethod: tx.lastPaymentMethod || '—',
          phone: tx.phone || '',
          date: tx.invoiceDate,
        }))
        setAllTransactions(transformed)
        setFilteredTransactions(transformed)
      }
      else setLoadError(result.error || 'Could not load invoices')
    } catch (error) {
      setLoadError(error.message || 'Could not load invoices')
    } finally {
      setLoading(false)
    }
  }, [])

  const filterTransactions = useCallback(() => {
    let filtered = [...allTransactions]

    if (filterStatus !== 'All') {
      // Decided from the amounts, whatever the stored status word is
      const due = (tx) => tx.amount - tx.amountPaid
      const test = {
        'Paid': (tx) => due(tx) <= 0,
        'Partly Paid': (tx) => tx.amountPaid > 0 && due(tx) > 0,
        'Not Paid': (tx) => tx.amountPaid <= 0 && due(tx) > 0,
        'Overdue': (tx) => tx.status === 'OVERDUE',
      }[filterStatus]
      filtered = filtered.filter(test)
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (tx) =>
          tx.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(tx.invoiceNumber || tx.invoiceId).toLowerCase().includes(searchTerm.toLowerCase()) ||
          (tx.class && tx.class.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    setFilteredTransactions(filtered)
  }, [searchTerm, filterStatus, allTransactions])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  useEffect(() => {
    filterTransactions()
  }, [searchTerm, filterStatus, allTransactions, filterTransactions])

  // Reminders to every listed invoice that still has money due
  const remindPending = async (channel) => {
    const pending = filteredTransactions.filter((tx) => tx.amount - tx.amountPaid > 0)
    if (!pending.length) return alert('No invoices with money due in this list')
    if (!window.confirm(`Send ${channel === 'sms' ? 'SMS' : 'WhatsApp'} reminders for ${pending.length} invoice(s)?`)) return
    const result = await sendBulkReminders(channel, pending.map((tx) => tx.invoiceId))
    alert(result.message)
  }
  const handleNotifyPaid = () => remindPending('whatsapp')
  const handleNotifyPending = () => remindPending('sms')

  // Paid invoices open their receipt, others the invoice
  const handleView = (transaction) => {
    if (transaction.status === 'PAID') {
      navigate(`/receipt/${transaction.invoiceId}`)
    } else {
      navigate(`/invoice/${transaction.invoiceId}`)
    }
  }

  const handleWhatsApp = async (tx) => {
    const result = await sendWhatsAppMessage(tx.invoiceId)
    if (result.success) {
      alert(`WhatsApp message sent to ${tx.studentName}`)
    } else {
      alert(result.message || 'Failed to send WhatsApp message')
    }
  }

  const handleSMS = async (tx) => {
    const result = await sendSMSMessage(tx.invoiceId)
    if (result.success) {
      alert(`SMS sent to ${tx.studentName}`)
    } else {
      alert(result.message || 'Failed to send SMS')
    }
  }

  const getPaymentStatus = (transaction) => {
    const amountPaid = transaction.amountPaid || 0
    const status = transaction.status
    if (status === 'PAID' || status === 'Paid') return { text: 'Paid', class: 'badge-green' }
    if (amountPaid > 0 && amountPaid < transaction.amount) return { text: 'Partially Paid', class: 'badge-orange' }
    if (status === 'PENDING' || status === 'Pending') return { text: 'Pending', class: 'badge-yellow' }
    if (status === 'OVERDUE' || status === 'Overdue') return { text: 'Overdue', class: 'badge-red' }
    return { text: status, class: 'badge-red' }
  }

  const getRemainingAmount = (transaction) => {
    const amountPaid = transaction.amountPaid || 0
    return transaction.amount - amountPaid
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="back-btn mb-2" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="page-title">Payment Monitoring</h1>
          <p className="page-sub">Track and monitor all payment transactions</p>
        </div>
      </div>

      {loadError && (
        <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
          {loadError}
        </div>
      )}

      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="flex-1" style={{ minWidth: '200px' }}>
          <div className="input-wrap">
            <Search size={18} className="input-icon" />
            <input
              type="text"
              placeholder="Search by name or invoice ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="form-select"
          style={{ width: '150px' }}
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status === 'All' ? 'All Status' : status}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button onClick={handleNotifyPaid} className="btn btn-success btn-sm">
            <Bell size={14} /> WhatsApp reminders
          </button>
          <button onClick={handleNotifyPending} className="btn btn-warning btn-sm">
            <Bell size={14} /> SMS reminders
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Total Amount</th>
                  <th>Paid Amount</th>
                  <th>Pending Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                  <th>Notify</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                      Loading transactions...
                    </td>
                  </tr>
                ) : filteredTransactions.map((tx) => {
                  const statusInfo = getPaymentStatus(tx)
                  const pendingAmount = getRemainingAmount(tx)

                  return (
                    <tr key={tx.id}>
                      <td>{tx.invoiceId}</td>
                      <td>{tx.studentName}</td>
                      <td>{tx.class}</td>
                      <td>₹{tx.amount.toLocaleString()}</td>
                      <td>₹{tx.amountPaid.toLocaleString()}</td>
                      <td>₹{pendingAmount.toLocaleString()}</td>
                      <td>
                        <span className={`badge ${statusInfo.class}`}>
                          {statusInfo.text}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => handleView(tx)} className="btn btn-primary btn-sm">
                          <Eye size={14} /> View
                        </button>
                      </td>

                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleWhatsApp(tx)}
                          >
                            <FaWhatsapp size={16} />
                          </button>

                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSMS(tx)}
                          >
                            <MdSms size={16} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Fees