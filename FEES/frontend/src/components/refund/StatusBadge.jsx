// StatusBadge.jsx
// Reusable badge for status display

import React from 'react';

const statusStyles = {
  Pending: 'bg-orange-100 text-orange-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Processed: 'bg-blue-100 text-blue-700',
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-colors duration-200 ${
        statusStyles[status] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {status}
    </span>
  );
}
