import React, { useState, useEffect } from 'react';
import { tokenManager } from '../services/api';
import { useNavigate } from 'react-router-dom'

/**
 * ProtectedRoute Component
 * Wraps components that require authentication
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({ children, redirectTo = '/login' }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = () => {
    try {
      const authenticated = tokenManager.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (!authenticated) {
        // Redirect to login page
        navigate(redirectTo);
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      setIsAuthenticated(false);
      navigate(redirectTo);
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner"></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  // If not authenticated, don't render children (redirect handled above)
  if (!isAuthenticated) {
    return null;
  }

  // Render protected content
  return children;
};

/**
 * Higher-Order Component for protecting routes
 * Alternative to using ProtectedRoute component
 */
export const withAuth = (WrappedComponent, redirectTo = '/login') => {
  return function AuthenticatedComponent(props) {
    return (
      <ProtectedRoute redirectTo={redirectTo}>
        <WrappedComponent {...props} />
      </ProtectedRoute>
    );
  };
};

/**
 * Hook for authentication state management
 * Can be used in components that need auth state
 */
export const useAuth = () => {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(tokenManager.isAuthenticated());
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check authentication on mount
    const authenticated = tokenManager.isAuthenticated();
    setIsAuthenticated(authenticated);

    // Listen for storage changes (token updates)
    const handleStorageChange = (e) => {
      if (e.key === 'authToken') {
        const authenticated = tokenManager.isAuthenticated();
        setIsAuthenticated(authenticated);
        if (!authenticated) {
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = (token) => {
    tokenManager.setToken(token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    tokenManager.removeToken();
    setIsAuthenticated(false);
    setUser(null);
    navigate('/login');
  };

  return {
    isAuthenticated,
    user,
    login,
    logout,
  };
};

export default ProtectedRoute;