# MERN Stack JWT Authentication Guide

This guide explains how to implement secure JWT authentication in your MERN stack application.

## 🔐 Authentication System Overview

The authentication system includes:
- JWT token management with localStorage
- Automatic token attachment to API requests
- Protected routes with authentication checks
- Automatic redirect on token expiration
- Comprehensive error handling

## 📁 File Structure

```
src/
├── services/
│   └── api.js              # Main API service with auth
├── components/
│   ├── ProtectedRoute.jsx  # Route protection component
│   └── ProtectedRoute.css  # Loading styles
├── pages/
│   ├── Login.jsx          # Login page
│   ├── Login.css          # Login styles
│   └── Dashboard.jsx      # Protected dashboard
└── App.jsx                # Main app with routing
```

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env` file in your frontend root:

```env
VITE_API_URL=http://localhost:5000/api
```

### 2. Backend Requirements

Your backend should:
- Use JWT authentication middleware
- Return tokens in login response: `{ success: true, data: { token, user } }`
- Accept `Authorization: Bearer <token>` headers
- Return 401 for expired/invalid tokens

### 3. Login Flow

```jsx
import { authAPI } from '../services/api';

const handleLogin = async (credentials) => {
  try {
    const response = await authAPI.login({
      email: credentials.email,
      password: credentials.password
    });

    // Token automatically stored in localStorage
    // Redirect handled by authAPI.login()
    console.log('Login successful:', response.user);

  } catch (error) {
    console.error('Login failed:', error.message);
  }
};
```

## 🔧 API Service Usage

### Authentication APIs

```javascript
import { authAPI } from '../services/api';

// Login
const loginResponse = await authAPI.login({ email, password });

// Get user profile
const profile = await authAPI.getProfile();

// Update profile
const updatedUser = await authAPI.updateProfile({ name: 'New Name' });

// Change password
await authAPI.changePassword({
  currentPassword: 'oldpass',
  newPassword: 'newpass'
});

// Logout
authAPI.logout();
```

### Protected APIs

```javascript
import { dashboardAPI, leadsAPI } from '../services/api';

// Dashboard data (automatically includes JWT token)
const stats = await dashboardAPI.getStats();
const metrics = await dashboardAPI.getMetrics();

// Leads management
const leads = await leadsAPI.getAll();
const newLead = await leadsAPI.create(leadData);
```

### Token Management

```javascript
import { tokenManager } from '../services/api';

// Check if authenticated
const isLoggedIn = tokenManager.isAuthenticated();

// Get current token
const token = tokenManager.getToken();

// Manual token storage
tokenManager.setToken('your-jwt-token');

// Clear token (logout)
tokenManager.removeToken();
```

## 🛡️ Protected Routes

### Using ProtectedRoute Component

```jsx
import ProtectedRoute from '../components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
    </Routes>
  );
}
```

### Using withAuth HOC

```jsx
import { withAuth } from '../components/ProtectedRoute';

// Wrap your component
const ProtectedDashboard = withAuth(Dashboard);

function App() {
  return (
    <Routes>
      <Route path="/dashboard" element={<ProtectedDashboard />} />
    </Routes>
  );
}
```

### Using useAuth Hook

```jsx
import { useAuth } from '../components/ProtectedRoute';

function MyComponent() {
  const { isAuthenticated, user, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <p>Welcome, {user?.name}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## 🔄 Automatic Error Handling

The API service automatically handles:

### 401 Unauthorized
- Clears expired tokens
- Redirects to `/login`
- Shows appropriate error messages

### Network Errors
- Timeout handling (10s default)
- Connection error messages
- Retry suggestions

### API Errors
- Backend validation errors
- Structured error responses
- User-friendly messages

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "message": "User created successfully"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Email already exists",
  "error": "VALIDATION_ERROR"
}
```

## 🔒 Security Best Practices

### Token Storage
- JWT tokens stored in localStorage
- Automatic expiration checking
- Secure token validation

### Request Headers
- `Authorization: Bearer <token>` for authenticated requests
- `Content-Type: application/json` for all requests

### Error Boundaries
- Graceful handling of authentication failures
- Automatic logout on token issues
- User-friendly error messages

## 🧪 Testing Authentication

### Manual Testing

1. **Login Flow**:
   ```bash
   # POST /api/auth/login
   {
     "email": "admin@example.com",
     "password": "password123"
   }
   ```

2. **Protected Route**:
   ```bash
   # GET /api/dashboard/stats
   # Header: Authorization: Bearer <token>
   ```

3. **Token Expiration**:
   - Modify token in localStorage
   - Access protected route
   - Should redirect to login

### Unit Testing

```javascript
import { tokenManager, authAPI } from '../services/api';

// Test token management
describe('Token Manager', () => {
  it('should store and retrieve tokens', () => {
    tokenManager.setToken('test-token');
    expect(tokenManager.getToken()).toBe('test-token');
  });

  it('should detect expired tokens', () => {
    const expiredToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJ0ZXN0IiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjEwMDAwMDAwMDB9.test';
    tokenManager.setToken(expiredToken);
    expect(tokenManager.isAuthenticated()).toBe(false);
  });
});
```

## 🚨 Troubleshooting

### Common Issues

1. **401 Unauthorized on API calls**
   - Check if token exists in localStorage
   - Verify token hasn't expired
   - Ensure backend accepts the token format

2. **Infinite redirect loops**
   - Check ProtectedRoute redirectTo prop
   - Ensure login page doesn't require authentication

3. **Token not persisting**
   - Check localStorage availability
   - Verify token format from backend

4. **API timeout errors**
   - Increase timeout in apiConfig
   - Check network connectivity
   - Verify backend is running

### Debug Mode

Enable debug logging:

```javascript
// In your component
const response = await dashboardAPI.getStats().catch(error => {
  console.error('API Error:', error);
  console.error('Token exists:', !!tokenManager.getToken());
  throw error;
});
```

## 📚 Advanced Usage

### Custom API Endpoints

```javascript
import { apiRequest } from '../services/api';

// Custom authenticated request
const customData = await apiRequest('/custom/endpoint', {
  method: 'POST',
  body: { customField: 'value' }
});
```

### File Upload with Auth

```javascript
const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  return apiRequest('/upload', {
    method: 'POST',
    headers: createAuthHeaders(), // Include auth headers
    body: formData,
  }, false); // Don't set Content-Type (let browser set it for FormData)
};
```

### Refresh Token (Future Enhancement)

```javascript
// Add to authAPI
refreshToken: async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  const response = await apiRequest('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    requiresAuth: false
  });

  if (response.token) {
    tokenManager.setToken(response.token);
  }

  return response;
}
```

## 🎯 Best Practices

1. **Always wrap protected routes** with `ProtectedRoute`
2. **Handle API errors gracefully** in components
3. **Clear tokens on logout** using `authAPI.logout()`
4. **Check authentication status** before sensitive operations
5. **Use consistent error messages** across the app
6. **Test authentication flows** thoroughly
7. **Store tokens securely** (localStorage is acceptable for web apps)
8. **Implement proper loading states** during auth checks

## 📞 Support

For issues with authentication:
1. Check browser console for errors
2. Verify backend is running and accessible
3. Test API endpoints directly with tools like Postman
4. Ensure JWT secret matches between frontend and backend
5. Check token expiration times

---

This authentication system provides a solid foundation for secure MERN stack applications with automatic token management, protected routes, and comprehensive error handling.