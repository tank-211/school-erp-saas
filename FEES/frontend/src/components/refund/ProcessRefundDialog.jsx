import { useState } from 'react';
import { processRefund } from '../../services/apiService';

// Records how an approved refund was paid back. Used on Refund Management and
// Refund Details. Only the last 4 digits of an account number are stored.
const EMPTY = { refundMethod: 'bank_transfer', transactionId: '', accountHolder: '', accountNumber: '', ifscCode: '' };

export default function ProcessRefundDialog({ refund, onClose, onDone }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const bank = form.refundMethod === 'bank_transfer';

  const submit = async () => {
    setError('');
    if (bank && (!form.accountHolder.trim() || !form.accountNumber.trim() || !form.ifscCode.trim())) {
      setError('Bank transfer needs account holder, account number and IFSC.');
      return;
    }
    setBusy(true);
    const result = await processRefund(refund.id, {
      refundMethod: form.refundMethod,
      transactionId: form.transactionId.trim() || undefined,
      bankDetails: bank
        ? { accountHolder: form.accountHolder.trim(), accountNumber: form.accountNumber.trim(), ifscCode: form.ifscCode.trim() }
        : undefined,
    });
    setBusy(false);
    if (result.success) onDone(result.data);
    else setError(result.error || 'Processing failed');
  };

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div className="card" style={{ maxWidth: 460, margin: '10vh auto', padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <h3 className="card-title" style={{ marginBottom: 4 }}>Process refund #{refund.id}</h3>
        <p className="text-muted" style={{ marginBottom: 16 }}>
          ₹{Number(refund.amount || 0).toLocaleString('en-IN')} to {refund.studentName}
        </p>
        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
        <div className="form-group">
          <label className="form-label">Refund method</label>
          <select className="form-select" value={form.refundMethod} onChange={set('refundMethod')}>
            <option value="bank_transfer">Bank transfer</option>
            <option value="upi">UPI</option>
            <option value="cheque">Cheque</option>
            <option value="cash">Cash</option>
            <option value="original_method">Back to the original payment method</option>
          </select>
        </div>
        {bank && (
          <>
            <div className="form-group">
              <label className="form-label">Account holder</label>
              <input className="form-input" value={form.accountHolder} onChange={set('accountHolder')} />
            </div>
            <div className="form-group">
              <label className="form-label">Account number (only the last 4 digits are kept)</label>
              <input className="form-input" value={form.accountNumber} onChange={set('accountNumber')} />
            </div>
            <div className="form-group">
              <label className="form-label">IFSC</label>
              <input className="form-input" value={form.ifscCode} onChange={set('ifscCode')} />
            </div>
          </>
        )}
        <div className="form-group">
          <label className="form-label">Reference / transaction ID</label>
          <input className="form-input" value={form.transactionId} onChange={set('transactionId')} placeholder="UTR, cheque number, UPI reference..." />
        </div>
        <div className="flex gap-3 justify-end">
          <button className="btn btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Saving...' : 'Mark as refunded'}</button>
        </div>
      </div>
    </div>
  );
}
