# Frontend Integration - React Dashboard Setup

## 🎯 Complete Integration Guide

This guide shows you how to connect your React (Vite) dashboard to the backend API endpoints.

---

## Step 1: Create API Service Module

**File:** `src/services/dashboardAPI.js`

```javascript
// Base API URL (configure in .env)
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Get auth token from localStorage
 */
const getToken = () => localStorage.getItem('token');

/**
 * Standard fetch wrapper with token and error handling
 */
const apiFetch = async (endpoint, options = {}) => {
  const token = getToken();
  
  if (!token) {
    throw new Error('No authentication token. Please login first.');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  // Handle token expiration (401)
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
};

/**
 * Dashboard API Service
 */
export const dashboardAPI = {
  /**
   * Get all dashboard metrics in one request
   * Maps to: Total Inquiries, Conversion Rate, Active Leads, Enrolled Students
   */
  getCompleteDashboard: async () => {
    return apiFetch('/dashboard');
  },

  /**
   * Get individual metrics
   * Returns: totalInquiries, conversionRate, activeLeads, enrolledStudents
   */
  getMetrics: async () => {
    return apiFetch('/dashboard/metrics');
  },

  /**
   * Get enrollment trend for graph
   * @param {number} months - Number of months to retrieve (default: 6)
   */
  getEnrollmentTrend: async (months = 6) => {
    return apiFetch(`/dashboard/enrollment-trend?months=${months}`);
  },

  /**
   * Get lead status distribution for pie chart
   */
  getStatusDistribution: async () => {
    return apiFetch('/dashboard/status-distribution');
  },

  /**
   * Get inquiries by grade for bar chart
   */
  getInquiriesByGrade: async () => {
    return apiFetch('/dashboard/inquiries-by-grade');
  },

  /**
   * Get today's overview (calls, emails, tours)
   */
  getTodayOverview: async () => {
    return apiFetch('/dashboard/today-overview');
  },

  /**
   * Get recent activities for timeline
   * @param {number} limit - Number of activities to fetch (default: 10)
   */
  getRecentActivities: async (limit = 10) => {
    return apiFetch(`/dashboard/recent-activities?limit=${limit}`);
  }
};

export default dashboardAPI;
```

---

## Step 2: Create Custom Hook for Dashboard Data

**File:** `src/hooks/useDashboard.js`

```javascript
import { useState, useEffect } from 'react';
import dashboardAPI from '../services/dashboardAPI';

export const useDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await dashboardAPI.getCompleteDashboard();
        setData(response.data);
      } catch (err) {
        setError(err.message);
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchDashboard, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
};

// Hook for specific metrics
export const useMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getMetrics()
      .then(res => setMetrics(res.data))
      .finally(() => setLoading(false));
  }, []);

  return { metrics, loading };
};

// Hook for enrollment trend
export const useEnrollmentTrend = (months = 6) => {
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getEnrollmentTrend(months)
      .then(res => setTrend(res.data))
      .finally(() => setLoading(false));
  }, [months]);

  return { trend, loading };
};
```

---

## Step 3: Update Dashboard Component

**File:** `src/pages/Dashboard.jsx`

```javascript
import { useDashboard } from '../hooks/useDashboard';
import MetricsCards from '../components/MetricsCards';
import EnrollmentTrendChart from '../components/EnrollmentTrendChart';
import LeadStatusPie from '../components/LeadStatusPie';
import InquiriesByGradeChart from '../components/InquiriesByGradeChart';
import TodayOverviewCards from '../components/TodayOverviewCards';
import RecentActivitiesTimeline from '../components/RecentActivitiesTimeline';

export default function Dashboard() {
  const { data, loading, error } = useDashboard();

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!data) return <div>No data available</div>;

  return (
    <div className="dashboard">
      {/* Top Metrics Row */}
      <div className="metrics-container">
        <MetricsCards 
          metrics={data.metrics}
          todayOverview={data.metrics.todayOverview}
        />
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        <div className="chart-container">
          <EnrollmentTrendChart data={data.enrollmentTrend} />
        </div>
        <div className="chart-container">
          <LeadStatusPie data={data.statusDistribution} />
        </div>
      </div>

      {/* Grade Distribution Row */}
      <div className="grade-container">
        <InquiriesByGradeChart data={data.inquiriesByGrade} />
      </div>

      {/* Recent Activities Row */}
      <div className="activities-container">
        <RecentActivitiesTimeline activities={data.recentActivities} />
      </div>
    </div>
  );
}
```

---

## Step 4: Create Metrics Cards Component

**File:** `src/components/MetricsCards.jsx`

```javascript
import './MetricsCards.css';

export default function MetricsCards({ metrics, todayOverview }) {
  if (!metrics) return null;

  const cards = [
    {
      title: 'Total Inquiries',
      value: metrics.totalInquiries.value,
      delta: metrics.totalInquiries.delta,
      bgColor: '#f0f7ff'
    },
    {
      title: 'Conversion Rate',
      value: metrics.conversionRate.value,
      delta: metrics.conversionRate.delta,
      bgColor: '#f0fff4'
    },
    {
      title: 'Active Leads',
      value: metrics.activeLeads.value,
      delta: metrics.activeLeads.delta,
      bgColor: '#fff5f0'
    },
    {
      title: 'Enrolled Students',
      value: metrics.enrolledStudents.value,
      delta: metrics.enrolledStudents.delta,
      bgColor: '#fff0f5'
    }
  ];

  return (
    <div className="metrics-grid">
      {cards.map((card, idx) => (
        <div key={idx} className="metric-card" style={{ backgroundColor: card.bgColor }}>
          <h3 className="metric-title">{card.title}</h3>
          <div className="metric-value">{card.value}</div>
          <div className="metric-delta">{card.delta}</div>
        </div>
      ))}

      {/* Today's Overview Cards */}
      <div className="today-overview">
        <div className="overview-card">
          <div className="overview-icon">☎️</div>
          <div className="overview-value">{todayOverview?.callsMade || 0}</div>
          <div className="overview-label">Calls Made</div>
        </div>
        <div className="overview-card">
          <div className="overview-icon">📧</div>
          <div className="overview-value">{todayOverview?.emailsSent || 0}</div>
          <div className="overview-label">Emails Sent</div>
        </div>
        <div className="overview-card">
          <div className="overview-icon">🗓️</div>
          <div className="overview-value">{todayOverview?.toursScheduled || 0}</div>
          <div className="overview-label">Tours Scheduled</div>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 5: Create Enrollment Trend Chart Component

**File:** `src/components/EnrollmentTrendChart.jsx`

```javascript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './EnrollmentTrendChart.css';

export default function EnrollmentTrendChart({ data = [] }) {
  return (
    <div className="chart-wrapper">
      <h3 className="chart-title">Enrollment Trend (6 Months)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="inquiries" 
            stroke="#3366cc" 
            dot={{ fill: '#3366cc', r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="enrollments" 
            stroke="#00aa44" 
            dot={{ fill: '#00aa44', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

## Step 6: Create Lead Status Pie Chart Component

**File:** `src/components/LeadStatusPie.jsx`

```javascript
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import './LeadStatusPie.css';

const COLORS = ['#ff7300', '#00c49f', '#0088fe', '#ffbb28'];

export default function LeadStatusPie({ data = [] }) {
  const chartData = data.map(item => ({
    name: item.status,
    value: parseInt(item.count)
  }));

  return (
    <div className="chart-wrapper">
      <h3 className="chart-title">Lead Status Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => `${entry.name}: ${entry.value}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

## Step 7: Create Inquiries by Grade Chart Component

**File:** `src/components/InquiriesByGradeChart.jsx`

```javascript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './InquiriesByGradeChart.css';

export default function InquiriesByGradeChart({ data = [] }) {
  return (
    <div className="chart-wrapper">
      <h3 className="chart-title">Inquiries by Grade</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="grade" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="inquiries" fill="#3366cc" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

## Step 8: Create Recent Activities Component

**File:** `src/components/RecentActivitiesTimeline.jsx`

```javascript
import './RecentActivitiesTimeline.css';

const ACTIVITY_ICONS = {
  call: '☎️',
  email: '📧',
  visit: '🏫',
  tour: '👥'
};

export default function RecentActivitiesTimeline({ activities = [] }) {
  return (
    <div className="activities-wrapper">
      <h3 className="activities-title">Recent Activities</h3>
      <div className="timeline">
        {activities.length === 0 ? (
          <div className="no-activities">No recent activities</div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="timeline-item">
              <div className="timeline-icon">
                {ACTIVITY_ICONS[activity.type] || '📌'}
              </div>
              <div className="timeline-content">
                <div className="activity-action">{activity.action}</div>
                <div className="activity-name">{activity.name}</div>
                <div className="activity-contact">
                  {activity.email} • {activity.phone}
                </div>
              </div>
              <div className="timeline-time">{activity.time}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

---

## Step 9: Environment Configuration

**File:** `.env` (in React project root)

```
VITE_API_URL=http://localhost:5000/api
VITE_API_TIMEOUT=30000
```

**File:** `src/config/api.js`

```javascript
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: import.meta.env.VITE_API_TIMEOUT || 30000,
  headers: {
    'Content-Type': 'application/json'
  }
};
```

---

## Step 10: Error Handling & Retry Logic

**File:** `src/utils/apiErrorHandler.js`

```javascript
/**
 * Handle API errors with user-friendly messages
 */
export const handleApiError = (error) => {
  console.error('API Error:', error);

  if (error.message === 'Session expired. Please login again.') {
    // Redirect to login - already handled in apiFetch
    return 'Your session has expired. Please login again.';
  }

  if (error.message.includes('Failed to fetch')) {
    return 'Network error. Please check your connection.';
  }

  if (error.message.includes('No authentication token')) {
    return 'Please login to access this page.';
  }

  return error.message || 'An error occurred. Please try again.';
};

/**
 * Retry API call with exponential backoff
 */
export const retryApiFetch = async (fetchFn, maxRetries = 3, delayMs = 1000) => {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
};
```

---

## Step 11: Create Context for Global Dashboard State

**File:** `src/context/DashboardContext.jsx`

```javascript
import { createContext, useContext, useState, useEffect } from 'react';
import dashboardAPI from '../services/dashboardAPI';

const DashboardContext = createContext();

export function DashboardProvider({ children }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardAPI.getCompleteDashboard();
      setDashboardData(response.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardContext.Provider value={{ dashboardData, loading, error, lastUpdated, refetch: fetchDashboard }}>
      {children}
    </DashboardContext.Provider>
  );
}

export const useDashboardContext = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within DashboardProvider');
  }
  return context;
};
```

---

## Step 12: Update Main App.jsx with Provider

**File:** `src/App.jsx`

```javascript
import { DashboardProvider } from './context/DashboardContext';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <DashboardProvider>
      {isAuthenticated ? (
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      ) : (
        <Login />
      )}
    </DashboardProvider>
  );
}

export default App;
```

---

## 🧪 Testing Integration

### 1. Test complete flow manually:

```bash
# 1. Login first
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"SecurePass123"}'

# Save the token from response

# 2. Use token in dashboard request
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -X GET http://localhost:5000/api/dashboard \
  -H "Authorization: Bearer $TOKEN"

# If token is invalid, you should get 401
```

### 2. Test from React component:

```javascript
// In your component
useEffect(() => {
  dashboardAPI.getCompleteDashboard()
    .then(response => {
      console.log('Dashboard data:', response.data);
      // Your component receives all dashboard data here
    })
    .catch(error => {
      console.error('Error:', error.message);
    });
}, []);
```

---

## 📱 Component Data Flow

```
┌─────────────────────────────────────────────┐
│         React Dashboard Page                │
│  (src/pages/Dashboard.jsx)                  │
└──────────┬──────────────────────────────────┘
           │ useDashboard() hook
           ↓
┌─────────────────────────────────────────────┐
│      Dashboard Service Layer                │
│  (src/services/dashboardAPI.js)             │
│  - Handles Token Management                 │
│  - Makes API Calls                          │
│  - Error Handling & 401 Response            │
└──────────┬──────────────────────────────────┘
           │ HTTP Request with Bearer Token
           ↓
┌─────────────────────────────────────────────┐
│     Backend Express Server                  │
│  (Node.js on localhost:5000)                │
│  - Verifies JWT Token                       │
│  - Fetches Data from PostgreSQL              │
│  - Returns JSON Response                    │
└──────────┬──────────────────────────────────┘
           │ JSON Response
           ↓
┌─────────────────────────────────────────────┐
│    Child Components                         │
│  - MetricsCards                             │
│  - EnrollmentTrendChart                     │
│  - LeadStatusPie                            │
│  - InstantActivitiesTimeline                │
│  (Display dashboard data)                   │
└─────────────────────────────────────────────┘
```

---

## ✅ Integration Checklist

- [ ] Backend server running on port 5000
- [ ] Database connected and seeded with sample data
- [ ] `dashboardAPI.js` service created
- [ ] `useDashboard` hook created
- [ ] Dashboard.jsx updated with API calls
- [ ] All child components receiving props
- [ ] Token stored in localStorage after login
- [ ] Token included in Authorization headers
- [ ] 401 errors redirect to login
- [ ] Data displays on dashboard
- [ ] Charts render correctly
- [ ] Activities timeline shows data
- [ ] Auto-refresh working (every 5 minutes)

---

## 🎨 CSS Styling

Each component should have a corresponding CSS file with:

```css
/* MetricsCards.css */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.metric-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
}

.metric-value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
}

.metric-delta {
  font-size: 12px;
  color: green;
  margin-top: 5px;
}
```

---

**Status:** ✅ Ready for Integration

**Frontend Endpoints:** 7 dashboard URLs mapped
**Authentication:** JWT token-based
**Data Refresh:** Auto-refresh every 5 minutes

All components are ready to receive and display backend data!
