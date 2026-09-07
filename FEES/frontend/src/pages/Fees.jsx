/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Eye, ArrowLeft, Bell } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import { MdSms } from 'react-icons/md'
import { fetchTransactions, sendWhatsAppMessage, sendSMSMessage } from '../services/apiService'

const Fees = () => {
  const navigate = useNavigate()
  const [filteredTransactions, setFilteredTransactions] = useState([])
  const [allTransactions, setAllTransactions] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [loading, setLoading] = useState(true)

  const statusOptions = ['All', 'Paid', 'Pending', 'Failed', 'Partially Paid']

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchTransactions()
      if (result.success && Array.isArray(result.data)) {
        const transformed = result.data.map((tx) => ({
          id: tx.id || tx.invoiceId,
          invoiceId: tx.invoiceId || tx.id,
          studentName: tx.studentName || 'Unknown',
          class: tx.class || tx.academicYear || 'N/A',
          amount: Number(tx.totalAmount || tx.amount || 0),
          amountPaid: Number(tx.amountPaid || 0),
          status: tx.paymentStatus || tx.status || 'Pending',
          paymentMethod: tx.payments?.[0]?.paymentMethod || tx.paymentMethod || 'N/A',
          phone: tx.student?.phone || '',
          date: tx.createdAt || tx.date || new Date().toISOString(),
        }))
        setAllTransactions(transformed)
        setFilteredTransactions(transformed)
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const filterTransactions = useCallback(() => {
    let filtered = [...allTransactions]

    if (filterStatus !== 'All') {
      filtered = filtered.filter((tx) => {
        if (filterStatus === 'Partially Paid') {
          return (
            (tx.status === 'PENDING' || tx.status === 'PARTIAL') &&
            (tx.amountPaid || 0) > 0 &&
            (tx.amountPaid || 0) < tx.amount
          )
        }
        return tx.status === filterStatus.toUpperCase() || tx.status === filterStatus
      })
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (tx) =>
          tx.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const handleNotifyPaid = async () => {
    const paidRecords = filteredTransactions.filter(tx => tx.status === 'PAID' || tx.status === 'Paid')
    if (paidRecords.length > 0) {
      alert(`Fees paid successfully for ${paidRecords.length} student(s)`)
    } else {
      alert('No paid records found')
    }
  }

  const handleNotifyPending = async () => {
    const pendingRecords = filteredTransactions.filter(
      tx => tx.status === 'PENDING' || tx.status === 'Pending' || tx.status === 'PARTIAL' || tx.status === 'Partially Paid' || tx.status === 'OVERDUE'
    )
    if (pendingRecords.length > 0) {
      alert(`Your fee is pending for ${pendingRecords.length} student(s)`)
    } else {
      alert('No pending records found')
    }
  }

  const getTransactionId = useCallback(() => {
    return 'TXN' + Date.now() + '-' + Math.random().toString(36).substring(2, 9).toUpperCase()
  }, [])

  const handleView = (transaction) => {
    if (transaction.status === 'PAID' || transaction.status === 'Paid') {
      const paymentData = {
        invoiceId: transaction.invoiceId,
        studentName: transaction.studentName,
        amount: transaction.amountPaid || transaction.amount,
        paymentMethod: transaction.paymentMethod || 'Cash',
        transactionId: getTransactionId(),
        timestamp: new Date().toISOString()
      }
      sessionStorage.setItem('paymentData', JSON.stringify(paymentData))
      navigate('/payment-success')
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
          <button className="back-btn mb-2" onClick={() => navigate('/')}>
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="page-title">Payment Monitoring</h1>
          <p className="page-sub">Track and monitor all payment transactions</p>
        </div>
      </div>

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
            <Bell size={14} /> Notify Paid
          </button>
          <button onClick={handleNotifyPending} className="btn btn-warning btn-sm">
            <Bell size={14} /> Notify Pending
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