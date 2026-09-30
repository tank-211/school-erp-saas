import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { createRefundRequest, findInvoiceByNumber, getPaymentHistory } from '../services/apiService';

const REASONS = ['Duplicate Payment', 'Student Withdrawal', 'Overpayment', 'Technical Error', 'Other'];
const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

// A refund is always against one recorded payment: find the invoice, pick the
// payment, then give the amount and reason. The student comes from the invoice.
function RefundRequest() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [looking, setLooking] = useState(false);
  const [invoice, setInvoice] = useState(null); // { invoiceId, invoiceNumber, student, payments }

  const [paymentId, setPaymentId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const selectedPayment = invoice?.payments?.find((p) => p.id === paymentId) || null;

  const lookUp = async (e) => {
    e?.preventDefault();
    setError(null);
    setInvoice(null);
    setPaymentId('');
    setAmount('');
    if (!invoiceNumber.trim()) {
      setError('Enter the invoice number, for example INV-1759...');
      return;
    }
    setLooking(true);
    try {
      const found = await findInvoiceByNumber(invoiceNumber);
      if (!found.success) throw new Error(found.error);
      if (!found.data) throw new Error(`No invoice ${invoiceNumber.trim()} in your school`);

      const history = await getPaymentHistory(found.data.invoiceId);
      if (!history.success) throw new Error(history.error || 'Could not load the invoice payments');
      const payments = Array.isArray(history.data?.payments) ? history.data.payments : [];
      setInvoice({
        invoiceId: found.data.invoiceId,
        invoiceNumber: found.data.invoiceNumber,
        studentName: found.data.studentName,
        student: history.data?.student || null,
        payments,
      });
      if (payments.length === 1) {
        setPaymentId(payments[0].id);
        setAmount(String(payments[0].amount));
      }
    } catch (err) {
      setError(err.message || 'Invoice lookup failed');
    } finally {
      setLooking(false);
    }
  };

  const choosePayment = (id) => {
    setPaymentId(id);
    const p = invoice?.payments?.find((x) => x.id === id);
    setAmount(p ? String(p.amount) : '');
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const value = parseFloat(amount);

    if (!invoice?.student?.id) return setError('Look up the invoice first');
    if (!selectedPayment) return setError('Choose the payment to refund');
    if (!value || value <= 0) return setError('Enter the amount to refund');
    if (value > Number(selectedPayment.amount)) return setError(`The refund cannot be more than the payment (${money(selectedPayment.amount)})`);
    if (!reason) return setError('Choose a reason');
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await createRefundRequest({
        studentId: invoice.student.id,
        feePaymentId: selectedPayment.id,
        amount: value,
        reason,
        description: notes.trim() || undefined,
      });

      if (!response.success) {
        setError(response.error || 'Failed to submit the refund request');
        return;
      }

      navigate('/refund/success', {
        state: {
          successData: {
            requestId: response.data?.id ? String(response.data.id) : null,
            invoiceId: invoice.invoiceNumber,
            amount: money(value),
            status: response.data?.status || 'PENDING',
          },
        },
        replace: true,
      });
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const studentLabel = invoice
    ? [invoice.student?.firstName, invoice.student?.lastName].filter(Boolean).join(' ') || invoice.studentName
    : '';

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate('/refund-management')}>
        <ArrowLeft size={20} />
        <span>Back to Refund Management</span>
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">Refund Request</h1>
          <p className="page-sub">Request a refund against a recorded payment</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '20px' }}>
          <span>{error}</span>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {/* Step 1: the invoice */}
          <form onSubmit={lookUp} className="form-group">
            <label className="form-label">
              Invoice Number <span className="req">*</span>
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-..."
                className="form-input"
                disabled={isSubmitting || looking}
              />
              <button type="submit" className="btn btn-outline" disabled={isSubmitting || looking}>
                <Search size={14} /> {looking ? 'Finding...' : 'Find'}
              </button>
            </div>
          </form>

          {invoice && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Student</label>
                <div className="form-input" style={{ background: 'var(--gray-50, #f9fafb)' }}>
                  {studentLabel || '—'}
                  {invoice.student?.admissionNumber ? ` · ${invoice.student.admissionNumber}` : ''}
                </div>
              </div>

              {/* Step 2: the payment */}
              <div className="form-group">
                <label className="form-label">
                  Payment to Refund <span className="req">*</span>
                </label>
                {invoice.payments.length === 0 ? (
                  <p className="text-muted">No payment has been recorded on this invoice, so there is nothing to refund.</p>
                ) : (
                  <select
                    value={paymentId}
                    onChange={(e) => choosePayment(e.target.value)}
                    className="form-select"
                    disabled={isSubmitting}
                  >
                    <option value="">Select a payment</option>
                    {invoice.payments.map((p) => (
                      <option key={p.id} value={p.id}>
                        {money(p.amount)} · {p.paymentMethod || 'payment'} ·{' '}
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : '—'}
                        {p.paymentNumber ? ` · ${p.paymentNumber}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Step 3: amount and reason */}
              <div className="form-group">
                <label className="form-label">
                  Refund Amount <span className="req">*</span>
                </label>
                <div className="amount-input-wrapper">
                  <span className="currency-prefix">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="form-input amount-input"
                    placeholder="Enter amount"
                    min="0"
                    max={selectedPayment ? selectedPayment.amount : undefined}
                    step="0.01"
                    disabled={isSubmitting || !selectedPayment}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Reason for Refund <span className="req">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="form-select"
                  disabled={isSubmitting}
                >
                  <option value="">Select a reason</option>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Additional Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  onClick={() => navigate('/refund-management')}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || !selectedPayment}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Refund Request'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default RefundRequest;
