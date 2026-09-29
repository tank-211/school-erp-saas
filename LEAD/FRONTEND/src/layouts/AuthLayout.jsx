import React from 'react';
import './AuthLayout.css';

/**
 * AuthLayout Component
 * Renders only authentication pages without sidebar and header
 * Used for the Login route
 */
const AuthLayout = ({ children }) => {
  return <div className="auth-layout">{children}</div>;
};

export default AuthLayout;