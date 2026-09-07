// Button.jsx
// Reusable button component with variants

import React from 'react';

const base =
  'inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';

const variants = {
  primary: 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-400',
  secondary: 'bg-white text-green-700 border border-green-300 hover:bg-green-50 focus:ring-green-200',
  danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-400',
  ghost: 'bg-transparent text-green-700 hover:bg-green-50',
};

export default function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`${base} ${variants[variant] || ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
