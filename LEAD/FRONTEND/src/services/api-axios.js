/**
 * Axios-based API Service for School CRM
 * Alternative implementation using axios instead of fetch
 * Install axios: npm install axios
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management utilities (same as fetch version)
export const tokenManager = {
  getToken: () => localStorage.getItem('authToken'),

  setToken: (token) => {
    if (token) {
      localStorage.setItem('authToken', token);
      localStorage.setItem("role", data.data.role)
    }
  },

  removeToken: () => {
    localStorage.removeItem('authToken');
  },

  isAuthenticated: () => {
    const token = tokenManager.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      console.error('Invalid token format:', error);
      tokenManager.removeToken();
      return false;
    }
  }
};

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      tokenManager.removeToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Authentication required. Please log in again.');
    }

    // Handle other errors
    const message = error.response?.data?.message || error.message || 'API request failed';
    throw new Error(message);
  }
);

// Authentication API functions
export const authAPI = {
  login: async (credentials) => {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const { data } = response;

      if (data.token) {
        tokenManager.setToken(data.token);
      }

      return data;
    } catch (error) {
      throw error;
    }
  },

  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  logout: () => {
    tokenManager.removeToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  getProfile: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await apiClient.put('/auth/profile', profileData);
    return response.data;
  },

  changePassword: async (passwordData) => {
    const response = await apiClient.post('/auth/change-password', passwordData);
    return response.data;
  },
};

// Dashboard API functions
export const dashboardAPI = {
  getStats: async () => {
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  },

  getCompleteDashboard: async () => {
    const response = await apiClient.get('/dashboard');
    return response.data;
  },

  getMetrics: async () => {
    const response = await apiClient.get('/dashboard/metrics');
    return response.data;
  },

  getEnrollmentTrend: async (params = {}) => {
    const response = await apiClient.get('/dashboard/enrollment-trend', { params });
    return response.data;
  },
};

// Leads API functions
export const leadsAPI = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/leads', { params });
    return response.data;
  },

  create: async (leadData) => {
    const response = await apiClient.post('/leads', leadData);
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/leads/${id}`);
    return response.data;
  },

  update: async (id, leadData) => {
    const response = await apiClient.put(`/leads/${id}`, leadData);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/leads/${id}`);
    return response.data;
  },
};

// Export axios instance for custom requests
export { apiClient };

// Default export
export default {
  tokenManager,
  auth: authAPI,
  dashboard: dashboardAPI,
  leads: leadsAPI,
};