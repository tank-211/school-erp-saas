// RefundTable.jsx
// Table for displaying refund requests

import React from 'react';
import TableRow from './TableRow';

export default function RefundTable({ refunds, onView, onApprove, onReject, onProcess, loading, emptyText }) {
  return (
    <div className="bg-white rounded-[12px] shadow overflow-x-auto mt-2" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-green-50 text-green-900">
            <th className="py-3 px-4 text-left font-semibold">Request ID</th>
            <th className="py-3 px-4 text-left font-semibold">Student Name</th>
            <th className="py-3 px-4 text-left font-semibold">Invoice ID</th>
            <th className="py-3 px-4 text-left font-semibold">Amount</th>
            <th className="py-3 px-4 text-left font-semibold">Reason</th>
            <th className="py-3 px-4 text-left font-semibold">Status</th>
            <th className="py-3 px-4 text-left font-semibold">Requested Date</th>
            <th className="py-3 px-4 text-left font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={8} className="py-8 text-center text-green-500 animate-pulse">Loading refund requests...</td>
            </tr>
          ) : refunds.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-8 text-center text-gray-400">{emptyText || 'No refund requests found.'}</td>
            </tr>
          ) : (
            refunds.map((refund) => (
              <TableRow
                key={refund.id}
                refund={refund}
                onView={() => onView(refund)}
                onApprove={() => onApprove(refund)}
                onReject={() => onReject(refund)}
                onProcess={() => onProcess(refund)}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
