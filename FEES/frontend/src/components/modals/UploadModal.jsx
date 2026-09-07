import React, { useState } from 'react'
import { X, Download, CheckCircle, Upload } from 'lucide-react'
import UploadBox from './UploadBox'

const UploadModal = ({ type, isOpen, onClose }) => {
  const [status, setStatus] = useState(null) // null, 'success'

  const modalConfig = {
    feeStructure: {
      title: 'Bulk Upload Fee Structure',
      instructions: [
        'Download the CSV template to see the required format',
        'Fill in your fee data following the template structure',
        'Upload the completed CSV file',
        'Review the preview and confirm the upload',
      ],
      templateName: 'fee_structure_template.csv',
    },
    invoices: {
      title: 'Bulk Upload Invoices',
      instructions: [
        'Download the CSV template with invoice fields',
        'Enter student fee information in the template',
        'Upload the completed CSV file',
        'Verify the data and process the invoices',
      ],
      templateName: 'invoices_template.csv',
    },
    payments: {
      title: 'Bulk Upload Payment Records',
      instructions: [
        'Download the payment records CSV template',
        'Add your transaction data to the template',
        'Upload the completed CSV file',
        'Reconcile payments and confirm processing',
      ],
      templateName: 'payment_records_template.csv',
    },
    students: {
      title: 'Bulk Upload Student Data',
      instructions: [
        'Download the student data CSV template',
        'Fill in student information and contact details',
        'Upload the completed CSV file',
        'Review entries and finalize the upload',
      ],
      templateName: 'student_data_template.csv',
    },
  }

  const config = modalConfig[type]

  const handleDownloadTemplate = () => {
    // Simulate CSV template download
    const csvContent = 'id,name,email,value\n1,Sample,sample@example.com,1000'
    const element = document.createElement('a')
    element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`)
    element.setAttribute('download', config.templateName)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const handleUpload = (file) => {
    // UploadBox handles the upload simulation
    // This callback is triggered when upload succeeds
    setStatus('success')
    setTimeout(() => {
      onClose()
      setStatus(null)
    }, 2000)
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h2 className="modal-title">{config.title}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Success Message */}
        {status === 'success' && (
          <div className="success-message">
            <CheckCircle size={24} className="success-icon" />
            <span>File uploaded successfully</span>
          </div>
        )}

        {status !== 'success' && (
          <>
            {/* Instructions Section */}
            <div className="modal-section">
              <h3 className="section-title">Instructions:</h3>
              <ul className="instructions-list">
                {config.instructions.map((instruction, idx) => (
                  <li key={idx}>{instruction}</li>
                ))}
              </ul>
            </div>

            {/* Template Section */}
            <div className="modal-section template-section">
              <div className="template-content">
                <Upload size={20} className="template-icon" />
                <div className="template-text">
                  <p className="template-label">CSV Template</p>
                  <p className="template-desc">Download the template to see the required format</p>
                </div>
              </div>
              <button className="download-template-btn" onClick={handleDownloadTemplate}>
                <Download size={18} />
                Download
              </button>
            </div>

            {/* File Upload Section */}
            <div className="modal-section">
              <h3 className="section-title">Upload CSV File</h3>
              <UploadBox onUploadSuccess={handleUpload} />
            </div>

            {/* Action Buttons */}
            <div className="modal-footer">
              <button className="btn-cancel" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default UploadModal
