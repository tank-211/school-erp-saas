import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { createRefundRequest } from '../services/apiService';

function RefundRequest() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    invoiceId: '',
    studentName: '',
    amount: '',
    reason: '',
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null); // Clear error when user starts typing
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.invoiceId || !formData.studentName || !formData.amount || !formData.reason) {
      setError('Please fill in all required fields');
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Map form fields to API requirements
      // Since the backend expects specific fields, we'll map them accordingly
      const refundPayload = {
        feePayment: formData.invoiceId, // Map invoiceId as feePayment for now
        amount: parseFloat(formData.amount),
        reason: mapReason(formData.reason),
        description: formData.notes,
        refundMethod: 'bank_transfer',
        // We'll leave bankDetails empty for now - can be filled later
        bankDetails: {}
      };

      console.log('📤 Submitting refund request with payload:', refundPayload);

      const response = await createRefundRequest(refundPayload);

      if (response.success) {
        console.log('✅ Refund request created successfully:', response.data);

        // Store successful response data for display on success page
        const refundData = {
          requestId: response.data?._id || response.data?.requestId || 'RFD-' + Date.now(),
          invoiceId: formData.invoiceId,
          studentName: formData.studentName,
          amount: formData.amount,
          formattedAmount: `₹${parseInt(formData.amount).toLocaleString()}`,
          reason: formData.reason,
          notes: formData.notes,
          status: response.data?.status || 'Pending Review',
          requestedDate: new Date().toISOString().split('T')[0]
        };

        sessionStorage.setItem('newRefundData', JSON.stringify(refundData));

        // Navigate to success page
        navigate('/refund/success', {
          state: {
            successData: {
              requestId: refundData.requestId,
              invoiceId: refundData.invoiceId,
              amount: refundData.formattedAmount,
              status: refundData.status
            }
          },
          replace: true
        });
      } else {
        console.error('❌ Error creating refund request:', response.error);
        setError(response.error || 'Failed to submit refund request. Please try again.');
      }
    } catch (err) {
      console.error('❌ Error during submission:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/refund-management');
  };

  // Map form reason to API reason values
  const mapReason = (formReason) => {
    const reasonMap = {
      'Duplicate Payment': 'overpayment',
      'Student Withdrawal': 'withdrawal',
      'Overpayment': 'overpayment',
      'Technical Error': 'other',
      'Other': 'other'
    };
    return reasonMap[formReason] || 'other';
  };

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate('/refund-management')}>
        <ArrowLeft size={20} />
        <span>Back to Refund Management</span>
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">Refund Request</h1>
          <p className="page-sub">Submit a refund request for payment reversal</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '20px' }}>
          <span>{error}</span>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                Invoice ID <span className="req">*</span>
              </label>
              <input
                type="text"
                name="invoiceId"
                value={formData.invoiceId}
                onChange={handleChange}
                placeholder="INV-2024-001"
                className="form-input"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Student Name <span className="req">*</span>
              </label>
              <input
                type="text"
                name="studentName"
                value={formData.studentName}
                onChange={handleChange}
                placeholder="Enter student name"
                className="form-input"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Payment Amount <span className="req">*</span>
              </label>
              <div className="amount-input-wrapper">
                <span className="currency-prefix">₹</span>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className="form-input amount-input"
                  placeholder="Enter amount"
                  min="0"
                  step="1"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Reason for Refund <span className="req">*</span>
              </label>
              <select
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className="form-select"
                disabled={isSubmitting}
              >
                <option value="">Select a reason</option>
                <option value="Duplicate Payment">Duplicate Payment</option>
                <option value="Student Withdrawal">Student Withdrawal</option>
                <option value="Overpayment">Overpayment</option>
                <option value="Technical Error">Technical Error</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Additional Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="form-textarea"
                rows="4"
                placeholder="Any additional information about this refund request..."
                disabled={isSubmitting}
              />
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Refund Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RefundRequest;