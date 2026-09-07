import React, { useState, useEffect } from 'react'
import { reportService } from '../services/reportService'

const ExportReport = () => {
  const [selectedReport, setSelectedReport] = useState('pdf')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')

  // Check authentication status on component mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken')
    const isAuth = !!token
    setIsAuthenticated(isAuth)
    
    if (!isAuth) {
      setDebugInfo('⚠️ Not authenticated. No accessToken or authToken found in localStorage.')
    } else {
      setDebugInfo(`✅ Authenticated. Token: ${token.substring(0, 30)}...`)
    }
  }, [])

  // Handle export function - calls backend API
  const handleExport = async () => {
    setLoading(true)
    setMessage('')

    // Check authentication before export
    if (!isAuthenticated) {
      setMessage('❌ Not authenticated. Please login first.')
      setLoading(false)
      return
    }

    try {
      let result

      console.log(`🚀 Exporting ${selectedReport}...`)

      switch (selectedReport) {
        case 'pdf':
          result = await reportService.exportPDF()
          break
        case 'transactions-csv':
          result = await reportService.exportTransactionsCSV(50)
          break
        case 'pending-csv':
          result = await reportService.exportPendingPaymentsCSV(100)
          break
        case 'refunds-csv':
          result = await reportService.exportRefundsCSV(50)
          break
        default:
          result = { success: false, message: 'Invalid report type' }
      }

      if (result.success) {
        setMessage(`✅ ${result.message}`)
      } else {
        setMessage(`❌ ${result.message}`)
        if (result.details) {
          console.error('API Error Details:', result.details)
        }
      }
    } catch (error) {
      console.error('Export error:', error)
      setMessage(`❌ ${error.message || 'Failed to export report'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Export Report</h1>
      </div>
      
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Export Options</h2>
          </div>
          <div className="card-body">
            {/* Authentication Status */}
            <div style={{ 
              marginBottom: '15px', 
              padding: '10px', 
              backgroundColor: isAuthenticated ? '#d4edda' : '#f8d7da',
              color: isAuthenticated ? '#155724' : '#721c24',
              borderRadius: '4px',
              border: isAuthenticated ? '1px solid #c3e6cb' : '1px solid #f5c6cb',
              fontSize: '0.9em'
            }}>
              {isAuthenticated ? '✅ Authenticated' : '⚠️ Not authenticated'}
            </div>

            <div className="form-group">
              <label>Select Report Format</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                <button 
                  onClick={() => setSelectedReport('pdf')}
                  disabled={loading}
                  style={{
                    padding: '12px',
                    border: selectedReport === 'pdf' ? '2px solid #667eea' : '1px solid #ddd',
                    borderRadius: '6px',
                    backgroundColor: selectedReport === 'pdf' ? '#f0f4ff' : 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: selectedReport === 'pdf' ? '600' : '400',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  📄 PDF Report
                </button>
                <button 
                  onClick={() => setSelectedReport('transactions-csv')}
                  disabled={loading}
                  style={{
                    padding: '12px',
                    border: selectedReport === 'transactions-csv' ? '2px solid #667eea' : '1px solid #ddd',
                    borderRadius: '6px',
                    backgroundColor: selectedReport === 'transactions-csv' ? '#f0f4ff' : 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: selectedReport === 'transactions-csv' ? '600' : '400',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  💳 Transactions
                </button>
                <button 
                  onClick={() => setSelectedReport('pending-csv')}
                  disabled={loading}
                  style={{
                    padding: '12px',
                    border: selectedReport === 'pending-csv' ? '2px solid #667eea' : '1px solid #ddd',
                    borderRadius: '6px',
                    backgroundColor: selectedReport === 'pending-csv' ? '#f0f4ff' : 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: selectedReport === 'pending-csv' ? '600' : '400',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  ⏳ Pending Payments
                </button>
                <button 
                  onClick={() => setSelectedReport('refunds-csv')}
                  disabled={loading}
                  style={{
                    padding: '12px',
                    border: selectedReport === 'refunds-csv' ? '2px solid #667eea' : '1px solid #ddd',
                    borderRadius: '6px',
                    backgroundColor: selectedReport === 'refunds-csv' ? '#f0f4ff' : 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: selectedReport === 'refunds-csv' ? '600' : '400',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  💰 Refund Requests
                </button>
              </div>
            </div>

            {message && (
              <div style={{ 
                marginBottom: '15px', 
                padding: '12px', 
                backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
                color: message.includes('✅') ? '#155724' : '#721c24',
                borderRadius: '4px',
                border: message.includes('✅') ? '1px solid #c3e6cb' : '1px solid #f5c6cb'
              }}>
                {message}
              </div>
            )}

            <button 
              onClick={handleExport} 
              disabled={loading || !isAuthenticated}
              className="btn btn-primary"
              style={{ 
                width: '100%',
                opacity: loading || !isAuthenticated ? 0.6 : 1,
                cursor: loading || !isAuthenticated ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '⏳ Exporting...' : '⬇️ Download Report'}
            </button>

            {/* Debug Info */}
            <div style={{ 
              marginTop: '15px', 
              padding: '10px', 
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
              fontSize: '0.85em',
              fontFamily: 'monospace',
              color: '#333'
            }}>
              <strong>Debug Info:</strong>
              <div>{debugInfo}</div>
              <div>API URL: {import.meta.env.VITE_API_URL || 'http://localhost:5000'}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📋 Available Reports</h2>
          </div>
          <div className="card-body">
            <ul style={{ lineHeight: '1.8', listStylePosition: 'inside' }}>
              <li>
                <strong>📄 PDF Report:</strong> Comprehensive report with all fee collection data, metrics, monthly trends, and transaction details
              </li>
              <li>
                <strong>💳 Transactions CSV:</strong> Recent transactions list with student names, amounts, payment methods, and dates
              </li>
              <li>
                <strong>⏳ Pending Payments CSV:</strong> List of students with pending or overdue fee payments
              </li>
              <li>
                <strong>💰 Refund Requests CSV:</strong> List of all refund requests with status and amounts
              </li>
            </ul>

            <hr style={{ margin: '15px 0', borderColor: '#ddd' }} />

            <h3 style={{ marginTop: '15px', marginBottom: '10px' }}>Troubleshooting</h3>
            <ul style={{ lineHeight: '1.8', listStylePosition: 'inside', fontSize: '0.9em' }}>
              <li><strong>401 Error:</strong> Please login first before exporting reports</li>
              <li><strong>403 Error:</strong> You don't have permission to export reports (admin role required)</li>
              <li><strong>Network Error:</strong> Make sure the backend server is running</li>
              <li><strong>Check Console:</strong> Open browser dev tools (F12) and check the Console tab for detailed error logs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportReport
