import React, { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'

const UploadBox = ({ onFileSelect, onUploadSuccess }) => {
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef(null)

  // Validate file type
  const validateFile = (selectedFile) => {
    if (!selectedFile) {
      setError('Please select a file')
      return false
    }

    const isCSV = selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')
    if (!isCSV) {
      setError('Only CSV files are allowed')
      return false
    }

    setError('')
    return true
  }

  // Handle file selection from input
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile)
      onFileSelect?.(selectedFile)
    }
  }

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && validateFile(droppedFile)) {
      setFile(droppedFile)
      onFileSelect?.(droppedFile)
    }
  }

  // Trigger file picker
  const handleClick = () => {
    fileInputRef.current?.click()
  }

  // Handle upload
  const handleUpload = () => {
    if (!file) {
      setError('Please upload a file')
      return
    }

    setLoading(true)
    setError('')

    // Simulate upload with 2 second delay
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
      onUploadSuccess?.(file)

      // Auto reset after 3 seconds
      setTimeout(() => {
        resetUpload()
      }, 3000)
    }, 2000)
  }

  // Reset upload state
  const resetUpload = () => {
    setFile(null)
    setSuccess(false)
    setError('')
  }

  // Calculate file size display
  const getFileSize = () => {
    if (!file) return ''
    const sizeInKB = file.size / 1024
    return sizeInKB > 1024
      ? `${(sizeInKB / 1024).toFixed(2)} MB`
      : `${sizeInKB.toFixed(2)} KB`
  }

  // Determine upload box border color
  const getBorderClass = () => {
    if (success) return 'upload-box-success'
    if (file) return 'upload-box-selected'
    return ''
  }

  return (
    <div className="upload-box-container">
      {/* Success Message */}
      {success && (
        <div className="success-banner">
          <CheckCircle size={20} className="success-icon" />
          <span>File uploaded successfully</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <AlertCircle size={20} className="error-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Box */}
      <div
        className={`upload-box ${getBorderClass()}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="upload-content">
          <Upload size={48} className="upload-icon" />
          <p className="upload-text">Click to upload or drag and drop</p>
          <p className="upload-subtext">CSV files only</p>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden-file-input"
          disabled={loading}
        />
      </div>

      {/* File Info Display */}
      {file && !success && (
        <div className="file-info-box">
          <div className="file-details">
            <span className="file-icon">📄</span>
            <div className="file-text">
              <p className="file-name">{file.name}</p>
              <p className="file-size">{getFileSize()}</p>
            </div>
          </div>
          <button
            className="btn-remove-file"
            onClick={(e) => {
              e.stopPropagation()
              resetUpload()
            }}
            type="button"
          >
            ✕
          </button>
        </div>
      )}

      {/* Upload Button */}
      {!success && (
        <button
          className={`btn-upload-submit ${loading ? 'loading' : ''} ${!file ? 'disabled' : ''}`}
          onClick={handleUpload}
          disabled={loading || !file}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Processing...
            </>
          ) : (
            'Upload & Process'
          )}
        </button>
      )}
    </div>
  )
}

export default UploadBox
