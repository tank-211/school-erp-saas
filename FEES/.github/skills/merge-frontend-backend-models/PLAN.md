# User Model Merge Migration Plan

**Generated**: 2026-06-18  
**Model**: User  
**Scope**: ACURA CRM Fee-Module v1.1  

---

## Executive Summary

The **backend User model** is production-ready (Mongoose + Joi validators + JWT auth). The **frontend has no formal User types** — it uses hardcoded values in components.

**Merge Strategy**: Adopt the backend model as the canonical source and implement corresponding TypeScript interfaces, form validators, and API integration in the frontend.

**Effort**: ~2–3 hours  
**Risk**: Low (additive changes; no breaking backend updates needed)

---

## Phase 1: Frontend Type Definitions

### 1.1 Create `frontend/src/types/user.ts`

**File**: `frontend/src/types/user.ts` (NEW)

```typescript
/**
 * Canonical User model shared between frontend and backend
 * Source of truth for all user-related types in the frontend
 */

export const USER_ROLES = ['admin', 'accountant', 'staff'] as const;
export const USER_DEPARTMENTS = ['accounts', 'administration', 'support'] as const;

export type UserRole = typeof USER_ROLES[number];
export type UserDepartment = typeof USER_DEPARTMENTS[number];

/**
 * Core User entity as returned from backend API
 */
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  department: UserDepartment;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Login request/response structures
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  token: string;
  expiresIn: number;
}

/**
 * User creation payload (for admin user management)
 */
export interface CreateUserRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: UserRole;
  department?: UserDepartment;
}

/**
 * User update payload (for profile/admin changes)
 */
export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  department?: UserDepartment;
  isActive?: boolean;
}

/**
 * Authenticated user context (session)
 */
export interface AuthContext {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
```

**Checklist**:
- [ ] File created at correct path
- [ ] All types exported
- [ ] Enums match backend exactly (`admin`, `accountant`, `staff`)
- [ ] Optional vs required fields match canonical contract

---

### 1.2 Create `frontend/src/validators/userValidator.ts`

**File**: `frontend/src/validators/userValidator.ts` (NEW)

```typescript
/**
 * Zod schemas for User form validation
 * Frontend validation mirrors backend Joi schemas
 */

import { z } from 'zod';
import { USER_ROLES, USER_DEPARTMENTS } from '../types/user';

export const loginSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
});

export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100),
  email: z
    .string()
    .email('Please provide a valid email'),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, 'Phone must be 10 digits'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
  role: z
    .enum(USER_ROLES)
    .default('staff'),
  department: z
    .enum(USER_DEPARTMENTS)
    .default('administration')
});

export const updateUserSchema = createUserSchema.partial().refine(
  obj => Object.keys(obj).length > 0,
  { message: 'At least one field must be updated' }
).extend({
  isActive: z.boolean().optional()
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
```

**Checklist**:
- [ ] File created at correct path
- [ ] All validators export corresponding TypeScript types
- [ ] Min/max lengths and regex patterns match backend
- [ ] Enum values match `USER_ROLES` and `USER_DEPARTMENTS`

---

## Phase 2: Frontend API Integration

### 2.1 Update `frontend/src/services/apiService.js`

Add user authentication functions:

**File**: `frontend/src/services/apiService.js`

**Add exports** (at end of file):

```javascript
/**
 * ==================== USER / AUTHENTICATION ====================
 */

/**
 * Login with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, user: Object, token: string, expiresIn: number}>}
 */
export const loginUser = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password })
    const { user, token, expiresIn } = response.data
    
    // Store token in localStorage
    localStorage.setItem('authToken', token)
    localStorage.setItem('user', JSON.stringify(user))
    
    return { success: true, user, token, expiresIn }
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || 'Login failed',
    }
  }
}

/**
 * Logout and clear session
 * @returns {Promise<{success: boolean}>}
 */
export const logoutUser = async () => {
  try {
    // Optional: notify backend to revoke token
    await api.post('/auth/logout')
    
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    
    return { success: true }
  } catch (error) {
    // Clear local storage even if backend call fails
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    return { success: false }
  }
}

/**
 * Get current authenticated user
 * @returns {Promise<{success: boolean, user: Object | null}>}
 */
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/users/me')
    return { success: true, user: response.data.data }
  } catch (error) {
    return { success: false, user: null }
  }
}

/**
 * Create new user (admin only)
 * @param {Object} userData - {name, email, phone, password, role, department}
 * @returns {Promise<{success: boolean, user?: Object, message?: string}>}
 */
export const createUser = async (userData) => {
  try {
    const response = await api.post('/users', userData)
    return { success: true, user: response.data.data }
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || 'Failed to create user',
    }
  }
}

/**
 * Update user (self or admin)
 * @param {string} userId
 * @param {Object} updates - Partial user object
 * @returns {Promise<{success: boolean, user?: Object, message?: string}>}
 */
export const updateUser = async (userId, updates) => {
  try {
    const response = await api.patch(`/users/${userId}`, updates)
    return { success: true, user: response.data.data }
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || 'Failed to update user',
    }
  }
}

/**
 * Get all users (admin only)
 * @param {Object} query - {role, isActive, page, limit}
 * @returns {Promise<{success: boolean, users?: Array, total?: number, message?: string}>}
 */
export const listUsers = async (query = {}) => {
  try {
    const params = new URLSearchParams(query)
    const response = await api.get(`/users?${params}`)
    return { success: true, users: response.data.data, total: response.data.total }
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || 'Failed to fetch users',
    }
  }
}

/**
 * Delete user (admin only, soft-delete)
 * @param {string} userId
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export const deleteUser = async (userId) => {
  try {
    await api.delete(`/users/${userId}`)
    return { success: true, message: 'User deleted successfully' }
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || 'Failed to delete user',
    }
  }
}
```

**Checklist**:
- [ ] Functions added to end of file
- [ ] All functions follow existing pattern (try/catch + localStorage)
- [ ] Functions match backend API contract
- [ ] Response shape consistent with other API functions

---

### 2.2 Create `frontend/src/context/AuthContext.jsx`

**File**: `frontend/src/context/AuthContext.jsx` (NEW)

```jsx
import { createContext, useState, useEffect } from 'react';
import { getCurrentUser } from '../services/apiService';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On mount, restore user from localStorage
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
    }

    setIsLoading(false);
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

**Checklist**:
- [ ] File created at correct path
- [ ] Context wraps login/logout state
- [ ] useAuth hook exports for component usage
- [ ] localStorage restore logic in useEffect

---

## Phase 3: Frontend Component Updates

### 3.1 Update `frontend/src/main.jsx`

Wrap app with AuthProvider:

```jsx
import { AuthProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
```

---

### 3.2 Create Login Page (if needed)

**File**: `frontend/src/pages/Login.jsx` (NEW or REFACTOR)

```jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../validators/userValidator';
import { loginUser } from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data) => {
    const { success, user, token } = await loginUser(data.email, data.password);
    if (success) {
      login(user, token);
      navigate('/dashboard');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} placeholder="Email" />
      {errors.email && <span>{errors.email.message}</span>}

      <input {...register('password')} type="password" placeholder="Password" />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit">Login</button>
    </form>
  );
}
```

**Checklist**:
- [ ] Form uses Zod validator
- [ ] API integration calls `loginUser`
- [ ] Success redirects to dashboard
- [ ] Error messages displayed from validator

---

## Phase 4: Backend Verification (No Changes Needed)

The backend User model is already production-ready. Verify:

**Checklist**:
- [ ] `backend/models/User.js` has all required fields ✓
- [ ] `backend/validators/authValidator.js` matches frontend validators ✓
- [ ] `backend/routes/authRoutes.js` implements `/auth/login`, `/auth/logout`, `/users/*` endpoints
- [ ] JWT token generation in `backend/controllers/authController.js` ✓
- [ ] Password hashing via bcrypt on create/update ✓

**If `/auth/login` endpoint missing**, create:

```javascript
// backend/routes/authRoutes.js
export const login = async (req, res) => {
  const { email, password } = req.body;
  
  // Validate
  const { error, value } = loginSchema.validate({ email, password });
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  // Find user
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  // Check password
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  // Generate JWT
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });

  // Update lastLogin
  user.lastLogin = new Date();
  await user.save();

  res.json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      isActive: user.isActive
    },
    token,
    expiresIn: 86400 // 24 hours in seconds
  });
};
```

---

## Phase 5: Testing

### Unit Tests

**File**: `frontend/src/validators/__tests__/userValidator.test.js`

```javascript
import { loginSchema, createUserSchema } from '../userValidator';

describe('User Validators', () => {
  it('accepts valid login credentials', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'password123'
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123'
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toContain('valid email');
  });

  it('rejects short password', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '123'
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toContain('at least 6 characters');
  });

  it('accepts valid user creation with defaults', () => {
    const result = createUserSchema.safeParse({
      name: 'John Admin',
      email: 'john@example.com',
      phone: '9876543210',
      password: 'secure123'
    });
    expect(result.success).toBe(true);
    expect(result.data.role).toBe('staff');
    expect(result.data.department).toBe('administration');
  });

  it('rejects invalid phone format', () => {
    const result = createUserSchema.safeParse({
      name: 'John Admin',
      email: 'john@example.com',
      phone: '987654', // Too short
      password: 'secure123'
    });
    expect(result.success).toBe(false);
  });
});
```

### Integration Tests

**File**: `frontend/src/__tests__/auth.integration.test.js`

```javascript
import { loginUser, createUser, logoutUser } from '../services/apiService';

describe('Auth API Integration', () => {
  it('logs in user and returns token', async () => {
    const result = await loginUser('admin@feesystem.com', 'Admin@2024');
    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
    expect(result.user.email).toBe('admin@feesystem.com');
  });

  it('logs out user and clears localStorage', async () => {
    localStorage.setItem('authToken', 'fake-token');
    const result = await logoutUser();
    expect(result.success).toBe(true);
    expect(localStorage.getItem('authToken')).toBeNull();
  });

  it('creates new user with admin role', async () => {
    const result = await createUser({
      name: 'Jane Accountant',
      email: 'jane@example.com',
      phone: '9988776655',
      password: 'secure123',
      role: 'accountant'
    });
    expect(result.success).toBe(true);
    expect(result.user.role).toBe('accountant');
  });
});
```

---

## Implementation Timeline

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| 1 | Create types and validators | 30 min | ⬜ To Do |
| 2 | Add API functions and AuthContext | 45 min | ⬜ To Do |
| 3 | Update components (Login, Navbar, Sidebar) | 30 min | ⬜ To Do |
| 4 | Verify backend endpoints | 15 min | ⬜ To Do |
| 5 | Write and run tests | 30 min | ⬜ To Do |
| **Total** | | **~2.5 hours** | |

---

## Rollback Plan

If issues arise:

1. **TypeScript compilation errors**: Check enum values match backend exactly
2. **API failures**: Verify backend endpoints exist and return correct response format
3. **localStorage corruption**: Clear localStorage and restart browser
4. **Type mismatches**: Use `as` assertion only as temporary fix; update interface instead

---

## Verification Checklist

- [ ] Frontend compiles without TypeScript errors
- [ ] Login form validates email/phone/password correctly
- [ ] Login API call succeeds with valid credentials
- [ ] Token stored in localStorage after login
- [ ] AuthContext restores user on page refresh
- [ ] Logout clears localStorage and context
- [ ] User types match backend response shape
- [ ] Enums (`role`, `department`) align between frontend/backend
- [ ] Tests pass (unit + integration)
- [ ] No API errors in browser console

---
