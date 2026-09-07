import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children }) => {
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner"></div>
        <p>Checking authentication...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/"
        replace
        state={{ from: location }}
      />
    )
  }

  return children
}

export const withAuth = (WrappedComponent) => {
  return function AuthenticatedComponent(props) {
    return (
      <ProtectedRoute>
        <WrappedComponent {...props} />
      </ProtectedRoute>
    )
  }
}

export default ProtectedRoute