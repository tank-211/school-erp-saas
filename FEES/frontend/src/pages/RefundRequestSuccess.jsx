import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Home } from 'lucide-react';

const RefundRequestSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Only what the server returned for the request just made; nothing made up
  const successData = location.state?.successData || null;
  const statusLabel = { PENDING: 'Pending review', APPROVED: 'Approved', REJECTED: 'Rejected', PROCESSED: 'Refunded' };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleBackToRefunds = () => {
    navigate('/refund-management');
  };

  const handleNewRequest = () => {
    navigate('/refund-request');
  };

  return (
    <div className="page">
      {/* Back Button */}
      <button className="back-btn" onClick={handleBackToRefunds}>
        <ArrowLeft size={20} />
        <span>Back to Refund Management</span>
      </button>

      {/* Success Content */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '70vh'
      }}>
        <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
          <div className="card-body" style={{ textAlign: 'center', padding: '48px 40px' }}>
            {/* Success Icon */}
            <div style={{ marginBottom: '24px' }}>
              <div className="success-animation">
                <CheckCircle size={80} style={{ color: 'var(--green)' }} />
              </div>
            </div>

            <h1 className="page-title" style={{ marginBottom: '12px', color: 'var(--green)' }}>
              Request Submitted Successfully!
            </h1>

            <p className="page-sub" style={{ marginBottom: '32px' }}>
              Your refund request has been submitted and will be reviewed by our team.
              You will receive an email notification once your request is processed.
            </p>

            {/* Details Section */}
            <div style={{ 
              background: 'var(--gray-50)', 
              borderRadius: 'var(--r-md)', 
              padding: '20px',
              marginBottom: '32px',
              textAlign: 'left'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid var(--gray-200)'
              }}>
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--gray-500)' }}>
                  Request ID
                </span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--gray-800)', fontFamily: 'monospace' }}>
                  {successData?.requestId ? `#${successData.requestId}` : '—'}
                </span>
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid var(--gray-200)'
              }}>
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--gray-500)' }}>
                  Invoice ID
                </span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--gray-800)', fontFamily: 'monospace' }}>
                  {successData?.invoiceId || '—'}
                </span>
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid var(--gray-200)'
              }}>
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--gray-500)' }}>
                  Refund Amount
                </span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary)' }}>
                  {successData?.amount || '—'}
                </span>
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '10px 0'
              }}>
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--gray-500)' }}>
                  Status
                </span>
                <span className="badge badge-status-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {statusLabel[successData?.status] || successData?.status || '—'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleBackToDashboard}>
                <Home size={16} />
                Back to Dashboard
              </button>
              <button className="btn btn-outline" onClick={handleBackToRefunds}>
                View All Refunds
              </button>
              <button className="btn btn-outline" onClick={handleNewRequest}>
                New Refund Request
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundRequestSuccess;