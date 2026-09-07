# Integration Guide - Frontend and Backend

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Frontend Setup](#frontend-setup)
3. [API Integration](#api-integration)
4. [Authentication Flow](#authentication-flow)
5. [Dashboard Integration](#dashboard-integration)
6. [Common Patterns](#common-patterns)
7. [Troubleshooting](#troubleshooting)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vite)                       │
│                  (Port: 5173)                            │
│  Dashboard | Students | Refunds | Payments              │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST
                     │ with JWT Auth
┌────────────────────▼────────────────────────────────────┐
│                   Backend (Express)                      │
│                  (Port: 5000)                            │
│  Routes | Controllers | Services | Models               │
└────────────────────┬────────────────────────────────────┘
                     │ Mongoose ODM
┌────────────────────▼────────────────────────────────────┐
│               MongoDB Database                           │
│  Users | Students | Payments | Refunds | Courses        │
└─────────────────────────────────────────────────────────┘
```

## Frontend Setup

### CORS Configuration

**Frontend URL (Vite Default):** `http://localhost:5173`

Backend `.env` already configured:
```env
FRONTEND_URL=http://localhost:5173
```

Express CORS middleware in `server.js`:
```javascript
app.use(cors({
  origin: [process.env.FRONTEND_URL],
  credentials: true
}));
```

### Dependencies to Install

```bash
# In frontend folder
npm install axios zustand react-router-dom
```

### File Structure
```
src/
├── services/
│   └── apiService.js         # API client configuration
├── stores/
│   ├── authStore.js          # Authentication state
│   └── dashboardStore.js     # Dashboard state
├── hooks/
│   └── useAuth.js            # Custom auth hook
├── guards/
│   └── ProtectedRoute.jsx    # Route protection
└── pages/
    ├── Dashboard.jsx
    ├── Students.jsx
    ├── Refunds.jsx
    └── Payments.jsx
```

## API Integration

### Step 1: Create API Service

Create `src/services/apiService.js`:

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to request headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token refresh and errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const userId = localStorage.getItem('userId');

        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          userId,
          refreshToken
        });

        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  logout: (userId, refreshToken) => 
    apiClient.post('/auth/logout', { userId, refreshToken }),
  refreshToken: (userId, refreshToken) =>
    apiClient.post('/auth/refresh-token', { userId, refreshToken })
};

// Student endpoints
export const studentAPI = {
  createStudent: (data) => apiClient.post('/students', data),
  getStudent: (id) => apiClient.get(`/students/${id}`),
  updateStudent: (id, data) => apiClient.put(`/students/${id}`, data),
  deleteStudent: (id) => apiClient.delete(`/students/${id}`),
  searchStudents: (filters) => apiClient.get('/students/search', { params: filters }),
  bulkUpload: (students) => apiClient.post('/students/bulk-upload', { students })
};

// Fee Payment endpoints
export const feePaymentAPI = {
  createPayment: (data) => apiClient.post('/fee-payments', data),
  recordPayment: (id, data) => apiClient.post(`/fee-payments/${id}/record-payment`, data),
  getPendingPayments: (page = 1, limit = 10) =>
    apiClient.get('/fee-payments/pending', { params: { page, limit } }),
  getOverduePayments: (page = 1, limit = 10) =>
    apiClient.get('/fee-payments/overdue', { params: { page, limit } }),
  getDashboardStats: () => apiClient.get('/fee-payments/dashboard/stats'),
  getMonthlyData: (year) => apiClient.get('/fee-payments/dashboard/monthly', { params: { year } })
};

// Refund endpoints
export const refundAPI = {
  createRequest: (data) => apiClient.post('/refunds', data),
  getRequests: (page = 1, limit = 10, status = null) =>
    apiClient.get('/refunds', { params: { page, limit, status } }),
  approve: (id, notes) => apiClient.post(`/refunds/${id}/approve`, { notes }),
  reject: (id, rejectionReason) =>
    apiClient.post(`/refunds/${id}/reject`, { rejectionReason }),
  process: (id, transactionId) =>
    apiClient.post(`/refunds/${id}/process`, { transactionId }),
  getStats: () => apiClient.get('/refunds/stats')
};

export default apiClient;
```

### Step 2: Create Authentication Store (Zustand)

Create `src/stores/authStore.js`:

```javascript
import create from 'zustand';
import { authAPI } from '../services/apiService';

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await authAPI.login(email, password);
      const { accessToken, refreshToken, user } = response.data.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userId', user._id);

      set({ user, accessToken, loading: false });
      return user;
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      set({ error: message, loading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      const userId = localStorage.getItem('userId');
      const refreshToken = localStorage.getItem('refreshToken');
      await authAPI.logout(userId, refreshToken);
      
      localStorage.clear();
      set({ user: null, accessToken: null, loading: false });
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.clear();
      set({ user: null, accessToken: null, loading: false });
    }
  },

  register: async (userData) => {
    set({ loading: true, error: null });
    try {
      const response = await authAPI.register(userData);
      set({ loading: false });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      set({ error: message, loading: false });
      throw error;
    }
  }
}));
```

### Step 3: Create Protected Route Component

Create `src/guards/ProtectedRoute.jsx`:

```javascript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user } = useAuthStore();

  if (!user || !localStorage.getItem('accessToken')) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !requiredRole.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
```

## Authentication Flow

### Login Flow
```
1. User enters credentials
   ↓
2. Frontend: POST /auth/login
   ↓
3. Backend validates credentials
   ↓
4. Backend returns accessToken + refreshToken
   ↓
5. Frontend stores tokens in localStorage
   ↓
6. Frontend redirects to dashboard
```

### Protected API Calls Flow
```
1. Frontend makes API request with Authorization header
   ↓
2. Backend middleware validates JWT
   ↓
3. If valid → Execute controller
   ↓
4. If expired → Frontend uses refreshToken
   ↓
5. If refresh fails → Redirect to login
```

### Code Example
```javascript
// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { feePaymentAPI } from '../services/apiService';

export const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const loadStats = async () => {
      try {
        const response = await feePaymentAPI.getDashboardStats();
        setStats(response.data.data);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user, navigate]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      {/* Display stats */}
    </div>
  );
};
```

## Dashboard Integration

### Fetch Statistics
```javascript
// Fetch on component mount
useEffect(() => {
  const fetchDashboardData = async () => {
    try {
      const stats = await feePaymentAPI.getDashboardStats();
      const monthly = await feePaymentAPI.getMonthlyData(new Date().getFullYear());
      
      setStats(stats.data.data);
      setMonthlyData(monthly.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  fetchDashboardData();
}, []);
```

### Update Student List
```javascript
const [students, setStudents] = useState([]);
const [pagination, setPagination] = useState({});

const loadStudents = async (page = 1, search = '') => {
  try {
    const response = await studentAPI.searchStudents({
      page,
      limit: 10,
      search
    });
    
    setStudents(response.data.data.data);
    setPagination(response.data.data.pagination);
  } catch (error) {
    console.error('Error loading students:', error);
  }
};

useEffect(() => {
  loadStudents();
}, []);
```

### Record Payment
```javascript
const recordPayment = async (paymentId, amount, method) => {
  try {
    const response = await feePaymentAPI.recordPayment(paymentId, {
      amount,
      paymentMethod: method,
      transactionId: generateTransactionId(),
      notes: 'Payment recorded'
    });

    alert('Payment recorded successfully');
    // Refresh payment list
    loadPendingPayments();
  } catch (error) {
    alert('Failed to record payment: ' + error.response?.data?.message);
  }
};
```

## Common Patterns

### Form Submission with Validation
```javascript
const [formData, setFormData] = useState({
  firstName: '',
  lastName: '',
  studentId: '',
  course: '',
  class: ''
});
const [errors, setErrors] = useState({});

const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    await studentAPI.createStudent(formData);
    alert('Student created successfully');
    setFormData({}); // Reset form
  } catch (error) {
    if (error.response?.data?.errors) {
      // Format validation errors
      const errorMap = {};
      error.response.data.errors.forEach(err => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
    } else {
      alert(error.response?.data?.message || 'Error occurred');
    }
  }
};
```

### Pagination
```javascript
const [currentPage, setCurrentPage] = useState(1);

const handlePageChange = (newPage) => {
  setCurrentPage(newPage);
  loadStudents(newPage);
};

// In JSX
<div className="pagination">
  <button 
    disabled={!pagination.hasPrevPage}
    onClick={() => handlePageChange(currentPage - 1)}
  >
    Previous
  </button>
  <span>Page {pagination.page} of {pagination.totalPages}</span>
  <button 
    disabled={!pagination.hasNextPage}
    onClick={() => handlePageChange(currentPage + 1)}
  >
    Next
  </button>
</div>
```

### Search with Debounce
```javascript
import { useEffect, useRef } from 'react';

const SearchStudents = () => {
  const [search, setSearch] = useState('');
  const debounceTimer = useRef(null);

  useEffect(() => {
    clearTimeout(debounceTimer.current);
    
    debounceTimer.current = setTimeout(() => {
      loadStudents(1, search);
    }, 500);

    return () => clearTimeout(debounceTimer.current);
  }, [search]);

  return (
    <input
      type="text"
      placeholder="Search students..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  );
};
```

## Troubleshooting

### CORS Error
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:** Check `.env` CORS origins match frontend URL

### 401 Unauthorized
```
{ "success": false, "message": "Invalid or expired token" }
```
**Solution:** Token expired, implement auto-refresh or redirect to login

### Network Error
```
Error: Network Error (XMLHttpRequest error)
```
**Solution:** Ensure backend is running (`npm run dev`)

### Validation Errors
```
"Validation Error: Email is already taken"
```
**Solution:** Handle errors array in response, display to user

### Blank Dashboard
- Check console for errors
- Verify user has correct role
- Check data is being fetched (`Network` tab in DevTools)

---

For detailed API documentation, see [API_ENDPOINTS.md](./API_ENDPOINTS.md)
