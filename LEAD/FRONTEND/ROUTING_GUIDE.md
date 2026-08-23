# React Router v6 Routing Guide

Complete guide to the routing system implemented in your School CRM application using React Router v6 with Vite.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Route Structure](#route-structure)
3. [File Organization](#file-organization)
4. [Route Types](#route-types)
5. [Navigation](#navigation)
6. [Common Patterns](#common-patterns)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Architecture Overview

### Route Flow

```
BrowserRouter (App.jsx)
    ├── Public Routes (AuthLayout)
    │   ├── /login → Login page
    │   └── /register → Register page
    │
    └── Protected Routes (MainLayout with ProtectedRoute)
        ├── /dashboard → Dashboard
        ├── /leads → Leads management
        ├── /pipeline → Pipeline
        ├── /tasks → Tasks
        ├── /communication → Communication
        ├── /applications → Applications
        ├── /reports/* → Reports (nested routes)
        └── /settings → Settings
```

### Layout Structure

```
Public Routes (No Auth Required)
├── AuthLayout
│   └── Full-screen login/register page
│
Protected Routes (Auth Required)
├── ProtectedRoute (checks token)
└── MainLayout (with Sidebar + Header)
    └── Page content
```

---

## File Organization

```
src/
├── App.jsx                          # Main app with routing logic
├── routes.jsx                       # Route definitions (CENTRALIZED)
├── layouts/
│   ├── AuthLayout.jsx              # Layout for login/register
│   ├── AuthLayout.css
│   ├── MainLayout.jsx              # Layout with sidebar/header
│   └── MainLayout.css
├── pages/
│   ├── Login.jsx                   # Login page
│   ├── Login.css
│   ├── Register.jsx                # Register page
│   ├── Register.css
│   ├── Dashboard.jsx
│   ├── Leads.jsx
│   ├── reports/
│   │   ├── SalesReports.jsx
│   │   ├── Performance.jsx
│   │   └── CustomReports.jsx
│   └── ... other pages
├── components/
│   └── ProtectedRoute.jsx          # Auth guard component
└── services/
    └── api.js                      # API with JWT auth
```

---

## Route Structure

### 1. Public Routes

Routes that **don't require authentication** and render without sidebar/header:

```javascript
// src/routes.jsx
export const publicRoutes = [
  {
    path: '/login',
    element: <Login />,
    exact: true,
    label: 'Login'
  },
  {
    path: '/register',
    element: <Register />,
    exact: true,
    label: 'Register'
  },
];
```

**Usage in App.jsx:**
```jsx
{publicRoutes.map((route) => (
  <Route
    key={`public-${route.path}`}
    path={route.path}
    element={
      <AuthLayout>
        {route.element}
      </AuthLayout>
    }
  />
))}
```

### 2. Protected Routes

Routes that **require authentication** and render with sidebar/header:

```javascript
// src/routes.jsx
export const protectedRoutes = [
  {
    path: '/dashboard',
    element: <Dashboard />,
    exact: true,
    label: 'Dashboard',
    icon: 'dashboard',
    showInMenu: true,
  },
  // ... more routes
];
```

**Usage in App.jsx:**
```jsx
{protectedRoutes.map((route) => (
  <Route
    key={`protected-${route.path}`}
    path={route.path}
    element={
      <ProtectedRoute>
        <MainLayout
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(v => !v)}
          onAddLead={() => setModalOpen(true)}
        >
          {route.element}
        </MainLayout>
      </ProtectedRoute>
    }
  />
))}
```

### 3. Nested Routes (e.g., Reports)

```javascript
// In routes.jsx
{
  path: '/reports',
  element: <SalesReports />,
  label: 'Reports',
  children: [
    {
      path: '/reports/sales',
      element: <SalesReports />,
      label: 'Sales Reports',
    },
    {
      path: '/reports/performance',
      element: <Performance />,
      label: 'Performance',
    },
    {
      path: '/reports/custom',
      element: <CustomReports />,
      label: 'Custom Reports',
    },
  ],
}
```

**Used in App.jsx for explicit nested routing**

---

## Route Types

### Public Routes (No Auth Required)

| Path | Component | Layout |
|------|-----------|--------|
| `/login` | Login | AuthLayout |
| `/register` | Register | AuthLayout |

### Protected Routes (Auth Required)

| Path | Component | Layout | Icon |
|------|-----------|--------|------|
| `/` | Dashboard | MainLayout | — |
| `/dashboard` | Dashboard | MainLayout | dashboard |
| `/leads` | Leads | MainLayout | leads |
| `/pipeline` | Pipeline | MainLayout | pipeline |
| `/tasks` | Tasks | MainLayout | tasks |
| `/communication` | Communication | MainLayout | communication |
| `/applications` | Applications | MainLayout | applications |
| `/reports/sales` | SalesReports | MainLayout | reports |
| `/reports/performance` | Performance | MainLayout | — |
| `/reports/custom` | CustomReports | MainLayout | — |
| `/settings` | Settings | MainLayout | settings |

---

## Navigation

### Using React Router's navigate hook

```jsx
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();

  // Navigate to a route
  const handleClick = () => {
    navigate('/dashboard');
  };

  // Navigate with state
  const handleLoginSuccess = () => {
    navigate('/dashboard', {
      replace: true,  // Replace history entry
      state: { message: 'Login successful!' }
    });
  };

  // Navigate to previous page
  const goBack = () => {
    navigate(-1);
  };

  return <button onClick={handleClick}>Go to Dashboard</button>;
}
```

### Using Link Component

```jsx
import { Link } from 'react-router-dom';

function Navigation() {
  return (
    <nav>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/leads">Leads</Link>
      <Link to="/settings">Settings</Link>
    </nav>
  );
}
```

### Programmatic Navigation

```jsx
// In Login component
const navigate = useNavigate();

const handleLoginSuccess = async () => {
  await authAPI.login(credentials);
  navigate('/dashboard', { replace: true });
};
```

---

## Common Patterns

### 1. Adding a New Route

**Step 1:** Add to routes.jsx
```javascript
export const protectedRoutes = [
  // ... existing routes
  {
    path: '/new-page',
    element: <NewPage />,
    exact: true,
    label: 'New Page',
    icon: 'new-page',
    showInMenu: true,
  },
];
```

**Step 2:** Create the page component
```javascript
// pages/NewPage.jsx
export default function NewPage() {
  return <div>New Page Content</div>;
}
```

**Step 3:** No need to update App.jsx - it uses routes.jsx automatically!

### 2. Protected Routes with Role-Based Access

```jsx
// components/RoleProtectedRoute.jsx
import { useAuth } from './ProtectedRoute';

function RoleProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();

  if (!allowedRoles.includes(user?.role)) {
    return <div>Access denied</div>;
  }

  return children;
}

// Usage in routes
<Route path="/admin" element={
  <ProtectedRoute>
    <RoleProtectedRoute allowedRoles={['admin']}>
      <AdminPanel />
    </RoleProtectedRoute>
  </ProtectedRoute>
} />
```

### 3. Conditional Navigation Based on Auth

```jsx
import { useAuth } from './components/ProtectedRoute';
import { Navigate } from 'react-router-dom';

function DashboardRedirect() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
```

### 4. Nested Route Navigation

```jsx
// pages/Reports.jsx
import { Link, Outlet } from 'react-router-dom';

export default function Reports() {
  return (
    <div>
      <nav>
        <Link to="/reports/sales">Sales</Link>
        <Link to="/reports/performance">Performance</Link>
        <Link to="/reports/custom">Custom</Link>
      </nav>
      <Outlet /> {/* Renders the nested route component */}
    </div>
  );
}
```

### 5. Query Parameters

```jsx
import { useSearchParams } from 'react-router-dom';

function Leads() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status');
  const page = searchParams.get('page') || '1';

  return (
    <div>
      <p>Showing leads with status: {status}</p>
      <button onClick={() => setSearchParams({ status: 'active' })}>
        Active Leads
      </button>
    </div>
  );
}

// Usage: /leads?status=active&page=2
```

### 6. URL Parameters

```jsx
import { useParams } from 'react-router-dom';

// Route definition
<Route path="/leads/:leadId" element={<LeadDetail />} />

// Component usage
function LeadDetail() {
  const { leadId } = useParams();
  return <div>Lead: {leadId}</div>;
}

// Navigate with params
navigate(`/leads/${lead.id}`);
```

---

## Troubleshooting

### Problem: "No routes matched location '/register'"

**Causes:**
1. Route not added to routes.jsx
2. BrowserRouter not wrapping the app
3. Route path has typo
4. Missing leading slash in path (e.g., `register` instead of `/register`)

**Solutions:**
```javascript
// ✅ Correct - leading slash
<Route path="/register" element={<Register />} />

// ❌ Wrong - no leading slash
<Route path="register" element={<Register />} />

// ✅ Add to routes.jsx
export const publicRoutes = [
  {
    path: '/register',
    element: <Register />,
    exact: true,
    label: 'Register'
  },
];

// ✅ Ensure BrowserRouter wraps everything
<BrowserRouter>
  <Routes>
    {/* Your routes */}
  </Routes>
</BrowserRouter>
```

### Problem: Sidebar/Header showing on login page

**Solution:** Use AuthLayout for public routes:
```jsx
<Route
  path="/login"
  element={
    <AuthLayout>  {/* Renders without sidebar/header */}
      <Login />
    </AuthLayout>
  }
/>
```

### Problem: Lost page content on navigation

**Solution:** Check that MainLayout properly renders children:
```jsx
// ✅ Correct
function MainLayout({ children }) {
  return (
    <div>
      <Sidebar />
      <Header />
      <main>{children}</main>  {/* Renders page content */}
    </div>
  );
}

// ❌ Wrong - forgot {children}
function MainLayout({ children }) {
  return (
    <div>
      <Sidebar />
      <Header />
    </div>
  );
}
```

### Problem: Unable to navigate to protected routes without login

**Check ProtectedRoute:**
```jsx
function ProtectedRoute({ children }) {
  const authenticated = tokenManager.isAuthenticated();

  if (!authenticated) {
    return null; // Will redirect via useEffect in the component
  }

  return children;
}
```

---

## Best Practices

### 1. Centralize Route Definitions

```javascript
// ✅ Good - single source of truth
// routes.jsx
export const routes = [
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/leads', element: <Leads /> },
  // ...
];

// App.jsx
{routes.map(route => <Route key={route.path} {...route} />)}

// ❌ Avoid - routes scattered in App.jsx
<Route path="/dashboard" element={<Dashboard />} />
<Route path="/leads" element={<Leads />} />
```

### 2. Use Consistent Path Naming

```javascript
// ✅ Good
const routes = [
  '/dashboard',
  '/leads',
  '/reports/sales',
];

// ❌ Avoid inconsistent naming
const routes = [
  '/dashboard',
  '/lead-list',
  '/report-sales',
];
```

### 3. Structure Routes by Feature

```
routes/
├── publicRoutes.js      # Login, Register
├── protectedRoutes.js   # Dashboard, Leads, etc.
├── reportRoutes.js      # Nested routes
└── adminRoutes.js       # Admin-only routes
```

### 4. Use Layout Components

```javascript
// ✅ Good - reusable layouts
<Route path="/login" element={<AuthLayout><Login />/AuthLayout>} />

// ❌ Avoid - repeating layout logic
<Route path="/login" element={
  <div style={authStyles}>
    <div style={containerStyles}>
      <Login />
    </div>
  </div>
} />
```

### 5. Implement Route Guards

```javascript
// ✅ Good - protect sensitive routes
<Route path="/admin" element={
  <ProtectedRoute>
    <RoleGuard role="admin">
      <AdminPanel />
    </RoleGuard>
  </ProtectedRoute>
} />

// ❌ Avoid - no protection
<Route path="/admin" element={<AdminPanel />} />
```

### 6. Handle 404 Routes

```javascript
// ✅ Good - catch-all route at end
<Routes>
  <Route path="/dashboard" element={<Dashboard />} />
  {/* other routes */}
  <Route path="*" element={<NotFound />} />
</Routes>

// ❌ Avoid - 404 route blocks other routes
<Route path="*" element={<NotFound />} />
<Route path="/dashboard" element={<Dashboard />} />
```

### 7. Use Lazy Loading for Performance

```javascript
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Leads = lazy(() => import('./pages/Leads'));

<Suspense fallback={<LoadingSpinner />}>
  <Route path="/dashboard" element={<Dashboard />} />
</Suspense>
```

### 8. Proper Route Transitions

```javascript
// ✅ Good - smooth transitions
const navigate = useNavigate();

const handleSuccess = () => {
  navigate('/dashboard', {
    replace: true,
    state: { from: location.pathname }
  });
};

// ❌ Avoid - hard refresh
window.location.href = '/dashboard';
```

---

## Testing Routes

```javascript
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

test('renders login page', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  
  // Navigate to /login
  window.history.pushState({}, '', '/login');
  expect(screen.getByText('Welcome Back')).toBeInTheDocument();
});
```

---

## Summary

Your routing system now:
- ✅ Properly separates public and protected routes
- ✅ Uses different layouts for auth vs. app pages
- ✅ Centralizes route definitions in routes.jsx
- ✅ Protects routes with authentication
- ✅ Supports nested routes
- ✅ Follows React Router v6 best practices

All routes are now properly configured and the `/register` route should work without errors!