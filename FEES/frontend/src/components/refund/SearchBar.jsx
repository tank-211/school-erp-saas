// SearchBar.jsx
// Reusable search bar with optional filter

import React from 'react';
import Button from './Button';

export default function SearchBar({ value, onChange, onApproveAll, placeholder }) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
      <input
        type="text"
        className="flex-1 border border-green-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-300 transition-all text-sm"
        placeholder={placeholder || 'Search...'}
        value={value}
        onChange={onChange}
      />
      {onApproveAll && (
        <Button variant="primary" className="w-full sm:w-auto" onClick={onApproveAll}>
          Approve All Pending
        </Button>
      )}
    </div>
  );
}
