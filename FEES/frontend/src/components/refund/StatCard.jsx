// StatCard.jsx
// Reusable stat card for dashboard stats

import React from 'react';

const colorMap = {
  all: 'bg-gradient-to-r from-green-100 to-green-50 text-green-900',
  pending: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  processed: 'bg-blue-100 text-blue-700',
};

export default function StatCard({ label, value, type, active, onClick }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[12px] shadow cursor-pointer transition-all duration-200 border border-transparent hover:shadow-md hover:-translate-y-1 select-none ${colorMap[type] || 'bg-gray-100 text-gray-700'} ${active ? 'ring-2 ring-green-400 border-green-300' : ''}`}
      style={{ minWidth: 200, minHeight: 90, padding: '16px 20px' }}
      onClick={onClick}
    >
      <span className="text-sm font-medium text-green-700 mb-1">{label}</span>
      <span className="text-2xl font-extrabold text-green-900">{value}</span>
    </div>
  );
}
