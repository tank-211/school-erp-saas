# Routing Architecture Diagrams

Visual guides to understand the routing system.

## Application Route Flow

```
┌─────────────────────────────────────────────────────────┐
│                   BrowserRouter                         │
│                   (App.jsx)                             │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    PUBLIC ROUTES          PROTECTED ROUTES
    │                          │
    ├─ /login                  ├─ /dashboard
    │  └─ AuthLayout           │  └─ ProtectedRoute
    │     └─ No sidebar/header │     └─ MainLayout
    │                          │        └─ Sidebar + Header
    │                          │
    └─ /register              ├─ /leads
       └─ AuthLayout           │  └─ ProtectedRoute
          └─ No sidebar/header │     └─ MainLayout
                               │
                               ├─ /pipeline
                               │  └─ ProtectedRoute
                               │     └─ MainLayout
                               │
                               └─ ... (more routes)
```

## Component Hierarchy

```
<BrowserRouter>
  │
  └─ <Routes>
      │
      ├─ PUBLIC ROUTES (no auth required)
      │   │
      │   └─ <Route path="/login">
      │       └─ <AuthLayout>
      │           └─ <Login />
      │
      ├─ PUBLIC ROUTES
      │   │
      │   └─ <Route path="/register">
      │       └─ <AuthLayout>
      │           └─ <Register />
      │
      └─ PROTECTED ROUTES (auth required)
          │
          └─ <Route path="/dashboard">
              └─ <ProtectedRoute>  ← Checks token
                  └─ <MainLayout>
                      ├─ <Sidebar />
                      ├─ <Header />
                      └─ <Dashboard />
```

## Request Flow

### Public Route Access
```
User → /register
   │
   ├─→ BrowserRouter checks routes
   │
   ├─→ Matches: /register (publicRoutes)
   │
   ├─→ Renders AuthLayout
   │
   └─→ Shows Register page (NO sidebar/header)
```

### Protected Route Without Authentication
```
User → /dashboard (no token)
   │
   ├─→ BrowserRouter checks routes
   │
   ├─→ Matches: /dashboard (protectedRoutes)
   │
   ├─→ ProtectedRoute checks token
   │
   ├─→ No token found
   │
   └─→ Redirects to /login
```

### Protected Route With Valid Token
```
User → /dashboard (with token)
   │
   ├─→ BrowserRouter checks routes
   │
   ├─→ Matches: /dashboard (protectedRoutes)
   │
   ├─→ ProtectedRoute checks token
   │
   ├─→ Token is valid
   │
   ├─→ Renders MainLayout with Sidebar + Header
   │
   └─→ Shows Dashboard page
```

### Protected Route With Expired Token
```
User → /dashboard (with expired token)
   │
   ├─→ ProtectedRoute validates token
   │
   ├─→ Token is expired
   │
   ├─→ Token removed from localStorage
   │
   └─→ Redirects to /login
```

## File Organization

```
src/
│
├── App.jsx ........................... Main routing component
│   ├── Loops through publicRoutes
│   ├── Loops through protectedRoutes
│   └── Renders with BrowserRouter
│
├── routes.jsx ........................ Route definitions
│   ├── publicRoutes array
│   │   ├── /login
│   │   └── /register
│   └── protectedRoutes array
│       ├── /dashboard
│       ├── /leads
│       ├── /pipeline
│       ├── /reports
│       └── ... more routes
│
├── layouts/
│   ├── AuthLayout.jsx ............... Renders public pages
│   │   └── Full-screen layout (no sidebar/header)
│   └── MainLayout.jsx ............... Renders app pages
│       ├── Sidebar
│       ├── Header
│       └── Main content area
│
├── components/
│   └── ProtectedRoute.jsx ........... Auth guard
│       ├── Checks token validity
│       ├── Validates expiration
│       └── Redirects if invalid
│
└── pages/
    ├── Login.jsx
    ├── Register.jsx
    ├── Dashboard.jsx
    ├── Leads.jsx
    ├── Pipeline.jsx
    └── ... more pages
```

## Route Configuration Structure

```
ROUTE OBJECT
{
  path: string,              ← URL path (e.g., "/dashboard")
  element: JSX,              ← Component to render
  exact: boolean,            ← Exact path matching
  label: string,             ← Display name
  icon: string,              ← Icon identifier
  showInMenu: boolean,       ← Show in sidebar menu
  requiresRole?: string,     ← Optional role requirement
  children?: Route[]         ← Optional nested routes
}

EXAMPLE:
{
  path: '/leads',
  element: <Leads />,
  exact: true,
  label: 'Leads',
  icon: 'leads',
  showInMenu: true,
  requiresRole: 'user',
  children: [
    {
      path: '/leads/:id',
      element: <LeadDetail />,
      label: 'Lead Detail'
    }
  ]
}
```

## Navigation Methods

```
METHOD 1: Using Link Component
├── <Link to="/dashboard">
├── <Link to="/leads/123">
└── <Link to="/reports?status=active">
    └── Preferred for static navigation

METHOD 2: Using navigate Hook
├── navigate('/dashboard')
├── navigate('/dashboard', { replace: true })
├── navigate(-1)  ← Go back
└── Used for programmatic/conditional navigation

METHOD 3: useNavigate & Events
├── const navigate = useNavigate()
├── onClick={() => navigate('/path')}
└── Used in button/form handlers
```

## Authentication Flow

```
SIGNUP FLOW:
┌─────────────━┐
│ /register    │
│  Register.jsx│
└──────┬──────┘
       │
       │ Fill form + submit
       ▼
┌─────────────────────────┐
│ authAPI.register()      │
│ (API call)              │
└──────┬──────────────────┘
       │
       │ Success
       ▼
┌─────────────────────────┐
│ Navigate to /login      │
│ with success message    │
└─────────────────────────┘


LOGIN FLOW:
┌─────────────┐
│ /login      │
│ Login.jsx   │
└──────┬──────┘
       │
       │ Fill form + submit
       ▼
┌──────────────────────────┐
│ authAPI.login()          │
│ ├─ POST /api/auth/login │
│ ├─ Returns: token       │
│ └─ Stored in localStorage
└──────┬───────────────────┘
       │
       │ Success
       ▼
┌──────────────────────────┐
│ tokenManager.setToken()  │
│ (Save in localStorage)   │
└──────┬───────────────────┘
       │
       │
       ▼
┌──────────────────────────┐
│ navigate('/dashboard')   │
│ { replace: true }        │
└── → /dashboard ──────────┘
       │
       │ ProtectedRoute checks token
       │ Token is valid ✓
       │
       ▼
  [Dashboard Page with
   Sidebar + Header]


LOGOUT FLOW:
┌──────────────────────────┐
│ User clicks logout       │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ authAPI.logout()         │
├── tokenManager.removeToken()
└──────┬───────────────────┘
       │
       ├─ localStorage cleared
       │
       ▼
┌──────────────────────────┐
│ navigate('/login')       │
│ { replace: true }        │
└──────────────────────────┘
```

## Decision Tree: Which Layout?

```
Is user accessing a page?
│
├─ /login or /register?
│  │
│  └─ YES → AuthLayout
│          (No sidebar/header)
│
└─ Any other route (/dashboard, /leads, etc.)?
   │
   └─ Has valid token (ProtectedRoute check)?
      │
      ├─ YES → MainLayout
      │       (Sidebar + Header)
      │       Show page content
      │
      └─ NO → Redirect to /login
              (via ProtectedRoute)
```

## Route Matching Examples

```
ROUTE DEFINITION:
{ path: '/leads/:leadId', element: <LeadDetail /> }

URL                      MATCHES?
────────────────────────────────────
/leads/123     ✓    Matches, leadId = "123"
/leads/abc     ✓    Matches, leadId = "abc"
/leads/123/edit    ✗    No match (too long)
/leads/        ✗    No match (missing id)


QUERY STRING ROUTES:

/leads?status=active&sort=name
│       │       │
│       │       └─ sort=name (query param)
│       └─ status=active (query param)
└─ /leads (base path matches)

Accessed via: useSearchParams()
```

## Sidebar Menu Generation

```
routes.jsx
├── protectedRoutes[].showInMenu = true  ← Menu items
│   ├── /dashboard (show)
│   ├── /leads (show)
│   ├── /pipeline (show)
│   ├── /reports (show)
│   ├── /reports/sales (hidden, nested)
│   └── /settings (show)
│
└── protectedRoutes[].showInMenu = false ← Hidden
    ├── / (home, hidden)
    └── other internal routes

Sidebar loops through and filters:
routes.filter(r => r.showInMenu === true)
```

## Error Handling Flow

```
API Request
│
├─ Response: 401 Unauthorized
│  │
│  ├─ tokenManager.removeToken()
│  ├─ Clear localStorage
│  │
│  └─ redirect to /login
│
├─ Response: Wrong path
│  │
│  └─ <Route path="*"> (catch-all)
│     └─ 404 Not Found page
│
└─ Response: 403 Forbidden
   │
   └─ Show error message
      (use RoleProtectedRoute)
```

---

## Key Takeaways

1. **Public routes** use `AuthLayout` (no sidebar/header)
2. **Protected routes** use `MainLayout` (sidebar + header)
3. **ProtectedRoute** guards prevent unauthorized access
4. **Route definitions** in `routes.jsx` are the source of truth
5. **Navigation** uses `Link` or `navigate()` hook
6. **Token validation** happens automatically in ProtectedRoute

---

## Visual Summary

```
    USER INPUT
        │
        ▼
    /request/path
        │
        ├─────────────────────┬────────────────────┐
        │                     │                    │
        │                   PUBLIC             PROTECTED
        │                   (AuthLayout)        (MainLayout)
        │                      │                   │
        ▼                      ▼                   ▼
    MATCHED? ──YES──→ /login ──────────→ ProtectedRoute
        │              /register              Check Token
        │                                         │
        NO                              ┌─────────┴─────────┐
        │                               │                   │
        └─────────────────────→ 404   VALID             INVALID
                              Page    │                   │
                                      ▼                   ▼
                                  SHOW PAGE            REDIRECT
                                  (with                /LOGIN
                                  sidebar)
```

---

These diagrams should help you understand the complete routing architecture of your application!