/**
 * API Service for School CRM
 * Provides reusable functions for all backend API calls with JWT authentication
 */
const API_BASE_URL = import.meta.env.VITE_API_URL;
console.log("API_URL =", API_BASE_URL);
// Token management utilities
export const tokenManager = {
  // Get token from localStorage
  getToken: () => {
    return localStorage.getItem('authToken');
  },

  // Store token in localStorage
  setToken: (token, role) => {
    if (token) {
      localStorage.setItem('authToken', token);
    }
    if (role) {
      localStorage.setItem('role', role);
    }
  },

  // Remove token from localStorage
  removeToken: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('role');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = tokenManager.getToken();
    if (!token) return false;

    try {
      // Basic check - decode JWT payload to verify expiration
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

// Base API configuration
const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds
};

// Create headers with authentication
const createAuthHeaders = (additionalHeaders = {}) => {
  const token = tokenManager.getToken();
    console.log("🔥 TOKEN SENT:", token); // ADD THIS
  const headers = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Generic API request handler with authentication and error handling
const apiRequest = async (endpoint, options = {}) => {
  const {
    method = 'GET',
    body = null,
    headers = {},
    requiresAuth = true,
  } = options;
  console.log("🚀 API REQUEST BODY:", body);

  const url = `${apiConfig.baseURL}${endpoint}`;
  const requestOptions = {
    method,
    headers: requiresAuth
      ? createAuthHeaders(headers)
      : { 'Content-Type': 'application/json', ...headers },
};

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestOptions.body = JSON.stringify(body);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), apiConfig.timeout);

    const response = await fetch(url, {
      ...requestOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
      console.error("❌ Unauthorized request");

      // ❗ DO NOT AUTO LOGOUT blindly
      throw new Error("Unauthorized");
    }

    // Handle other error status codes
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || 'API error');
        error.details = errorData;
        throw error;

    }

    // Handle successful responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();

      // Backend returns { success: boolean, data: any, message?: string }
      if (!result.success) {
        throw new Error(result.message || 'API request failed');
      }

      return result;
    }

    // For non-JSON responses (like file downloads)
    return response;

  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }

      console.log("🔥 REAL ERROR:", error);
    throw error;
  }
};

// Authentication API functions
export const authAPI = {
  /**
   * Login user and store token
   * @param {Object} credentials - { email, password }
   * @returns {Promise} User data and token
   */
  login: async (credentials) => {
    try {
      const response = await fetch(`${apiConfig.baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Login failed');
      }

      const result = await response.json();

      console.log("🔥 LOGIN RESPONSE:", result); // 👈 ADD HERE
      console.log("🔥 TOKEN RECEIVED:", result.data.token); // 👈 ADD HERE

    if (result.success && result.data.token) {
      tokenManager.setToken(
        result.data.token,
        result.data.user.role
      );

      localStorage.setItem(
        "user",
        JSON.stringify(result.data.user)
      );
    }

      return result;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise} Created user data
   */
  register: async (userData) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: userData,
      requiresAuth: false,
    });
  },

  /**
   * Logout user and clear token
   */
  logout: () => {
    tokenManager.removeToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  /**
   * Get current user profile
   * @returns {Promise} User profile data
   */
  getProfile: async () => {
    return apiRequest('/auth/me');
  },

  /**
   * Update user profile
   * @param {Object} profileData - Updated profile data
   * @returns {Promise} Updated user data
   */
  updateProfile: async (profileData) => {
    return apiRequest('/auth/profile', {
      method: 'PUT',
      body: profileData,
    });
  },

  /**
   * Change user password
   * @param {Object} passwordData - { currentPassword, newPassword }
   * @returns {Promise} Success message
   */
  changePassword: async (passwordData) => {
    return apiRequest('/auth/change-password', {
      method: 'POST',
      body: passwordData,
    });
  },
};

// Dashboard API functions
export const dashboardAPI = {
  /**
   * Fetch dashboard statistics
   * @returns {Promise} Dashboard stats with totalInquiries, conversionRate, activeLeads, enrolledStudents
   */
  getStats: async () => {
    return apiRequest('/dashboard/stats');
  },

  /**
   * Fetch complete dashboard data
   * @returns {Promise} Complete dashboard data
   */
  getCompleteDashboard: async () => {
    return apiRequest('/dashboard');
  },

  /**
   * Fetch dashboard metrics
   * @returns {Promise} Top-level metrics
   */
  getMetrics: async () => {
    return apiRequest('/dashboard/metrics');
  },

  /**
   * Fetch enrollment trend data
   * @param {Object} options - { months: number }
   * @returns {Promise} Trend data
   */
  getEnrollmentTrend: async (options = {}) => {
    const params = new URLSearchParams(options);
    return apiRequest(`/dashboard/enrollment-trend?${params}`);
  },

  /**
   * Fetch status distribution data
   * @returns {Promise} Status distribution chart data
   */
  getStatusDistribution: async () => {
    return apiRequest('/dashboard/status-distribution');
  },

  /**
   * Fetch inquiries by grade data
   * @returns {Promise} Grade distribution data
   */
  getGradeDistribution: async () => {
    return apiRequest('/dashboard/grade-distribution');
  },

  /**
   * Fetch today's overview
   * @returns {Promise} Today's summary data
   */
  getTodayOverview: async () => {
    return apiRequest('/dashboard/today-overview');
  },

  /**
   * Fetch recent activities
   * @returns {Promise} Recent activities data
   */
  getRecentActivities: async () => {
    return apiRequest('/dashboard/recent-activities');
  },
};

// Leads API functions
export const leadsAPI = {
  /**
   * Create a new lead
   * @param {Object} leadData - Lead form data
   * @returns {Promise} Created lead object
   */
  create: async (leadData) => {
    return apiRequest('/leads', {
      method: 'POST',
      body: leadData,
    });
  },

  /**
   * Get all leads with optional filters
   * @param {Object} filters - Query parameters
   * @returns {Promise} Array of leads
   */
  getAll: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const queryString = params.toString();
    return apiRequest(`/leads${queryString ? `?${queryString}` : ''}`);
  },
  getStats: async () => {
    return apiRequest('/leads/stats');
  },

  /**
   * Get lead by ID
   * @param {number} id - Lead ID
   * @returns {Promise} Lead object
   */
  getById: async (id) => {
    return apiRequest(`/leads/${id}`);
  },

  /**
   * Update lead
   * @param {number} id - Lead ID
   * @param {Object} leadData - Updated lead data
   * @returns {Promise} Updated lead object
   */
  update: async (id, leadData) => {
    return apiRequest(`/leads/${id}`, {
      method: 'PUT',
      body: leadData,
    });
  },

  /**
   * Delete lead
   * @param {number} id - Lead ID
   * @returns {Promise} Success message
   */
  delete: async (id) => {
    return apiRequest(`/leads/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Bulk import leads
   * @param {Array} leadsData - Array of lead objects
   * @returns {Promise} Import results
   */
  bulkImport: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = tokenManager.getToken();

    const response = await fetch(`${API_BASE_URL}/leads/bulk`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Bulk upload failed');
    }

    return result;
  }
}; // ✅ THIS LINE WAS MISSING

// Activities API functions
export const activitiesAPI = {
  /**
   * Get activities for a lead
   * @param {number} leadId - Lead ID
   * @returns {Promise} Array of activities
   */
  getByLeadId: async (leadId) => {
    return apiRequest(`/activities?leadId=${leadId}`);
  },

  /**
   * Create new activity
   * @param {Object} activityData - Activity data
   * @returns {Promise} Created activity
   */
  create: async (activityData) => {
    return apiRequest('/activities', {
      method: 'POST',
      body: activityData,
    });
  },

  /**
   * Update activity
   * @param {number} id - Activity ID
   * @param {Object} activityData - Updated activity data
   * @returns {Promise} Updated activity
   */
  update: async (id, activityData) => {
    return apiRequest(`/activities/${id}`, {
      method: 'PUT',
      body: activityData,
    });
  },

  /**
   * Delete activity
   * @param {number} id - Activity ID
   * @returns {Promise} Success message
   */
  delete: async (id) => {
    return apiRequest(`/activities/${id}`, {
      method: 'DELETE',
    });
  },
};

// Health check (no auth required)
export const healthAPI = {
  /**
   * Check API health
   * @returns {Promise} Health status
   */
  check: async () => {
    return apiRequest('/health', { requiresAuth: false });
  },
};

// Legacy functions for backward compatibility
/**
 * Fetch dashboard statistics (legacy)
 * @returns {Promise} Dashboard stats
 */
export async function getDashboardStats() {
  return dashboardAPI.getStats();
}

/**
 * Create a new lead (legacy)
 * @param {Object} leadData - Lead form data
 * @returns {Promise} Created lead object
 */
export async function createLead(leadData) {
  return leadsAPI.create(leadData);
}

/**
 * Get all leads (legacy)
 * @returns {Promise} Array of leads
 */
export async function getAllLeads() {
  return leadsAPI.getAll();
}

export const settingsAPI = {
  getSettings: () => apiRequest("/settings"),

  updateProfile: (data) =>
    apiRequest("/settings/profile", {
  method: "PUT",
  body: data,}),

  updateNotifications: (data) =>
    apiRequest("/settings/notifications", {
      method: "PUT",
      body: data,
    }),

  updateSystem: (data) =>
    apiRequest("/settings/system", {
      method: "PUT",
      body: data,
    }),

  changePassword: (data) =>
    apiRequest("/settings/password", {
      method: "PUT",
      body: data,
    }),
};
export const communicationAPI = {
  getHistory: (leadId) =>
    apiRequest(`/communications/history/${leadId}`),

  sendEmail: (data) =>
    apiRequest("/communications/email", {
      method: "POST",
      body: data,
    }),

  logCall: (data) =>
    apiRequest("/communications/call", {
      method: "POST",
      body: data,
    }),

  logWhatsApp: (data) =>
    apiRequest("/communications/whatsapp", {
      method: "POST",
      body: data,
    }),

  logSMS: (data) =>
    apiRequest("/communications/sms", {
      method: "POST",
      body: data,
    }),

  updateCommunication: (id, data) =>
    apiRequest(`/communications/${id}`, {
      method: "PUT",
      body: data,
    }),

  deleteCommunication: (id) =>
    apiRequest(`/communications/${id}`, {
      method: "DELETE",
    }),
};

// Export everything as a default object
export default {
  // Token management
  tokenManager,

  // API modules
  auth: authAPI,
  dashboard: dashboardAPI,
  leads: leadsAPI,
  activities: activitiesAPI,
  communication: communicationAPI,
  settings: settingsAPI,
  health: healthAPI,

  // Legacy functions
  getDashboardStats,
  createLead,
  getAllLeads,
};
export const notificationAPI = {
  getAll: async () => {
    return apiRequest('/notifications');
  },

  getUnreadCount: async () => {
    return apiRequest('/notifications/unread-count');
  },

  markAsRead: async (id) => {
    return apiRequest(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },
};
export const taskAPI = {
  getTasks: () => apiRequest("/tasks"),

  createTask: (data) => apiRequest("/tasks", {
      method: "POST",
      body: data,
    }),

  deleteTask: (id) =>
  apiRequest(`/tasks/${id}`, {
    method: "DELETE"
  }),
  updateStatus: (id, status) =>
    apiRequest(`/tasks/${id}/status`, {
      method: "PUT",
      body: { status }
    }),
  updateTask: (id, data) =>
    apiRequest(`/tasks/${id}`, {
      method: "PUT",
      body: data
    })
};

export const leadAPI = {
  getLeads: () => apiRequest("/leads")
};

export const userAPI = {
  getUsers: () => apiRequest("/users")
};

