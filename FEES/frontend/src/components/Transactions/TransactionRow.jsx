import React from 'react'
import { FaWhatsapp } from "react-icons/fa";
import { MdSms } from "react-icons/md";
import { useNavigate } from 'react-router-dom'

const getStatusClass = (status) => {
  if (status === 'Paid' || status === 'PAID') return 'status-paid'
  if (status === 'Pending' || status === 'PENDING') return 'status-pending'
  if (status === 'Overdue') return 'status-overdue'
  if (status === 'Processing') return 'status-processing'
  return ''
}

const TransactionRow = ({
  studentName,
  invoiceId,
  invoiceNo,
  paymentMethod,
  method,
  amount,
  status,
  date,
  transactionDate,
  phone
}) => {
  const navigate = useNavigate()
  
  // Handle different field names from different data sources
  const invId = invoiceId || invoiceNo || ''
  const payMethod = paymentMethod || method || ''
  const txDate = date || transactionDate || ''

  const handleView = () => {
    navigate(`/invoice/${invId}`)
  }

  const getFeeStatusMessage = () => {
    if (status?.toLowerCase() === 'pending' || status?.toLowerCase() === 'pending') {
      return `Hello, your fee of ₹${amount} is pending. Please pay at your earliest.`
    } else if (status?.toLowerCase() === 'paid' || status?.toLowerCase() === 'paid') {
      return `Hello, your fee of ₹${amount} has been paid successfully. Thank you!`
    }
    return ''
  }

  const message = encodeURIComponent(getFeeStatusMessage())

  return (
    <tr className="transaction-row">
      <td>{studentName}</td>
      <td>{invId}</td>
      <td>{payMethod}</td>
      <td>{amount}</td>
      <td>
        <span className={`status-chip ${getStatusClass(status)}`}>
          {status}
        </span>
      </td>
      <td>{txDate}</td>
      <td>
        <button className="btn-view" type="button" onClick={handleView}>
          View
        </button>
      </td>
      <td>
        <div className="flex gap-2 items-center justify-center">
          {phone && (
            <>
              <a
                href={`https://wa.me/91${phone}?text=${message}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-full hover:bg-green-50 text-green-600 transition-colors"
                title="Send WhatsApp"
              >
                <FaWhatsapp size={18} />
              </a>
              <a
                href={`sms:${phone}?body=${message}`}
                className="p-1.5 rounded-full hover:bg-blue-50 text-blue-600 transition-colors"
                title="Send SMS"
              >
                <MdSms size={18} />
              </a>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

export default TransactionRow
