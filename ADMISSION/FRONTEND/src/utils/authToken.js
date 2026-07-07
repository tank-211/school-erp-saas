/**
 * utils/authToken.js
 * Utility functions for managing JWT authentication tokens
 */

const TOKEN_KEY = 'token';
const USER_KEY = 'user_data';

/**
 * Get token from localStorage
 */
export const getToken = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      console.log('🔐 [TOKEN] Retrieved token from localStorage');
    }
    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

/**
 * Set token in localStorage
 */
export const setToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      console.log('🔐 [TOKEN] Stored token in localStorage');
    }
  } catch (error) {
    console.error('Error setting token:', error);
  }
};

/**
 * Remove token from localStorage
 */
export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    console.log('🔐 [TOKEN] Cleared token from localStorage');
  } catch (error) {
    console.error('Error clearing token:', error);
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return !!getToken();
};

/**
 * Get user data from localStorage
 */
export const getUserData = () => {
  try {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

/**
 * Set user data in localStorage
 */
export const setUserData = (userData) => {
  try {
    if (userData) {
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    }
  } catch (error) {
    console.error('Error setting user data:', error);
  }
};

/**
 * Get authorization header
 */
export const getAuthHeader = () => {
  const token = getToken();
  if (!token) {
    return null;
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Parse JWT token and extract payload (without verification - frontend only)
 * Use this only for getting user info from token
 */
export const parseToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
};
