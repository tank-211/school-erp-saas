// TableRow.jsx
// Reusable table row for refund requests

import React from 'react';
import StatusBadge from './StatusBadge';
import Button from './Button';
import { Eye, Check, X, Settings } from 'lucide-react';

export default function TableRow({ refund, onView, onApprove, onReject, onProcess }) {
  return (
    <tr className="hover:bg-[#f9f9f9] transition-colors" style={{ borderBottom: '1px solid #eee' }}>
      <td className="py-3 px-4 font-mono text-xs text-green-900">{refund.id}</td>
      <td className="py-3 px-4">{refund.studentName}</td>
      <td className="py-3 px-4">{refund.invoiceId}</td>
      <td className="py-3 px-4">₹{refund.amount.toLocaleString()}</td>
      <td className="py-3 px-4">{refund.reason}</td>
      <td className="py-3 px-4"><StatusBadge status={refund.status} /></td>
      <td className="py-3 px-4 whitespace-nowrap">{refund.requestedDate}</td>
      <td className="py-3 px-4">
        <div className="flex gap-2 items-center">
          <Button variant="ghost" onClick={onView} title="View">
            <Eye size={18} />
          </Button>
          {refund.status === 'Pending' && (
            <>
              <Button variant="primary" onClick={onApprove} title="Approve">
                <Check size={16} />
              </Button>
              <Button variant="danger" onClick={onReject} title="Reject">
                <X size={16} />
              </Button>
            </>
          )}
          {refund.status === 'Approved' && (
            <Button variant="secondary" onClick={onProcess} title="Process">
              <Settings size={16} />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
