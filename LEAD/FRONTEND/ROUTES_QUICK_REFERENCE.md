# Quick Reference: Adding Routes

Quick reference guide for adding new routes to your React application.

## Adding a Protected Route (with sidebar/header)

### 1. Create your page component

```jsx
// src/pages/MyNewPage.jsx
export default function MyNewPage() {
  return (
    <div className="page-container">
      <h1>My New Page</h1>
      {/* Page content */}
    </div>
  );
}
```

### 2. Add to routes.jsx

```javascript
// src/routes.jsx
import MyNewPage from './pages/MyNewPage';

export const protectedRoutes = [
  // ... existing routes
  {
    path: '/my-new-page',        // URL path
    element: <MyNewPage />,       // Component to render
    exact: true,                  // Exact path match
    label: 'My New Page',         // Display name
    icon: 'icon-name',           // Icon for sidebar
    showInMenu: true,            // Show in sidebar menu
  },
];
```

### 3. Done! ✅

No need to update App.jsx - it uses routes.jsx automatically.

**Navigate to it:**
```javascript
navigate('/my-new-page');
```

---

## Adding a Public Route (login/register)

### 1. Create your page

```jsx
// src/pages/MyAuthPage.jsx
export default function MyAuthPage() {
  return (
    <div className="auth-container">
      {/* Auth content */}
    </div>
  );
}
```

### 2. Add to routes.jsx

```javascript
// src/routes.jsx
export const publicRoutes = [
  // ... existing routes
  {
    path: '/my-auth-page',
    element: <MyAuthPage />,
    exact: true,
    label: 'My Auth Page'
  },
];
```

### 3. Route is automatically protected from auth requirement ✅

---

## Common Route Patterns

### Nested Routes (e.g., Reports)

```javascript
{
  path: '/reports',
  element: <Reports />,
  label: 'Reports',
  icon: 'reports',
  showInMenu: true,
  children: [
    {
      path: '/reports/sales',
      element: <SalesReports />,
      label: 'Sales',
    },
    {
      path: '/reports/performance',
      element: <Performance />,
      label: 'Performance',
    },
  ],
}
```

### Dynamic Routes with Parameters

```javascript
// Define route - use colon for parameter
{
  path: '/leads/:leadId',
  element: <LeadDetail />,
  label: 'Lead Detail',
}

// Use in component
import { useParams } from 'react-router-dom';

function LeadDetail() {
  const { leadId } = useParams();
  return <div>Lead: {leadId}</div>;
}

// Navigate with parameter
navigate(`/leads/${lead.id}`);
```

### Routes with Query Strings

```javascript
// Define route (query params don't need special syntax)
{
  path: '/leads',
  element: <Leads />,
}

// Use in component
import { useSearchParams } from 'react-router-dom';

function Leads() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status');
  return <div>Status: {status}</div>;
}

// Navigate with query string
navigate('/leads?status=active');
```

---

## Navigation Examples

```javascript
import { useNavigate, Link } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();

  // Programmatic navigation
  const handleClick = () => {
    navigate('/dashboard');
  };

  // Navigate with replacement (no back button)
  const handleLogin = () => {
    navigate('/dashboard', { replace: true });
  };

  // Navigate back
  const goBack = () => {
    navigate(-1);
  };

  return (
    <>
      {/* Link component - preferred for navigation */}
      <Link to="/dashboard">Go to Dashboard</Link>

      {/* Can use navigate for programmatic routes */}
      <button onClick={handleClick}>Click me</button>
    </>
  );
}
```

---

## File Structure Checklist

When adding a new route, ensure you have:

```
✅ src/pages/MyNewPage.jsx          (Component file)
✅ src/pages/MyNewPage.css          (Optional styles)
✅ src/routes.jsx updated           (Add route definition)
```

That's it! App.jsx automatically uses routes.jsx.

---

## Common Issues & Fixes

### "No routes matched location"

**Problem:**
```javascript
// ❌ Missing leading slash
{ path: 'my-page', element: <MyPage /> }
```

**Fix:**
```javascript
// ✅ Use leading slash
{ path: '/my-page', element: <MyPage /> }
```

### Route never matches

**Problem:**
```javascript
// ❌ Route defined but not navigating correctly
<Route path="/leads/:id" element={<LeadDetail />} />
// Trying to navigate to /leads/123 but it doesn't work
```

**Check:**
1. Is the exact parameter being used?
2. Is the route imported correctly?
3. Is `<BrowserRouter>` wrapping the app?

### Can't access page without logging in

**Make sure:**
1. Route is in `publicRoutes` (not `protectedRoutes`)
2. Route is NOT wrapped with `<ProtectedRoute>`

---

## Route Configuration Options

```javascript
{
  path: '/my-page',              // URL path (required)
  element: <MyPage />,           // Component (required)
  exact: true,                   // Exact path match (default: true)
  label: 'My Page',              // Display name for menus
  icon: 'icon-name',             // Icon identifier
  showInMenu: true,              // Show in sidebar (default: false)
  requiresRole: 'admin',         // Optional: role requirement
  children: [                    // Optional: nested routes
    {
      path: '/my-page/sub',
      element: <SubPage />,
    },
  ],
}
```

---

## Best Practices

1. **Always use leading slash:** `/my-page` ✅ not `my-page` ❌
2. **Keep routes organized:** One per file in pages/ ✅
3. **Use meaningful names:** `/user-settings` ✅ not `/us` ❌
4. **Use Link for navigation:** `<Link to="/page">` ✅ not `<a href="/">` ❌
5. **Protect sensitive routes:** Use `<ProtectedRoute>` ✅
6. **Add to menu selectively:** `showInMenu: true` only for main pages ✅

---

## Quick Test

After adding a route:

1. Start the dev server: `npm run dev`
2. Navigate to your route: `http://localhost:5173/my-page`
3. Should render without errors ✅

If you get "No routes matched location" error:
- Check the path has a leading `/`
- Check it's added to either `publicRoutes` or `protectedRoutes`
- Check the component import is correct

---

Need help? Check:
- [ROUTING_GUIDE.md](./ROUTING_GUIDE.md) - Comprehensive routing guide
- [App.jsx](./src/App.jsx) - Main routing config
- [routes.jsx](./src/routes.jsx) - Route definitions