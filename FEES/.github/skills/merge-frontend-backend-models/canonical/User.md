# Canonical User Model Contract

**Status**: Ready for Implementation  
**Generated**: 2026-06-18  
**Scope**: ACURA CRM Fee-Module  

---

## Overview

This document defines the unified `User` model contract for both frontend and backend. The backend model is authoritative; the frontend must implement corresponding TypeScript interfaces and form validators.

---

## Canonical User Model

### Core Fields

| Field | Type | Backend | Frontend | Required | Unique | Default | Notes |
|-------|------|---------|----------|----------|--------|---------|-------|
| `id` / `_id` | ObjectId/String | ✓ | ✓ | Yes | Yes | Auto-generated | MongoDB ObjectId or UUID |
| `name` | String | ✓ | ✓ | Yes | No | — | Min 2 chars, trimmed |
| `email` | String | ✓ | ✓ | Yes | Yes | — | Valid email format, lowercase, unique |
| `phone` | String | ✓ | ✓ | Yes | Yes | — | 10-digit format, unique |
| `password` | String | ✓ (select:false) | ✗ | Yes | No | — | Min 6 chars, hashed on backend |
| `role` | Enum | ✓ | ✓ | No | No | 'staff' | Values: `admin`, `accountant`, `staff` |
| `department` | Enum | ✓ | ✓ | No | No | 'administration' | Values: `accounts`, `administration`, `support` |
| `isActive` | Boolean | ✓ | ✓ | No | No | true | Soft-delete flag |
| `lastLogin` | Date | ✓ | — | No | No | null | Auto-updated on login |
| `refreshTokens` | Array<{token, createdAt}> | ✓ | ✗ | No | No | [] | Server-only; expires in 30 days |
| `createdAt` | Date | ✓ (auto) | — | — | — | now() | Managed by Mongoose |
| `updatedAt` | Date | ✓ (auto) | — | — | — | now() | Managed by Mongoose |

---

## Backend Implementation

### Mongoose Schema

```javascript
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Please provide a phone number'],
      unique: true,
      match: [/^[0-9]{10}$/, 'Phone must be 10 digits']
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Never returned in queries by default
    },
    role: {
      type: String,
      enum: ['admin', 'accountant', 'staff'],
      default: 'staff'
    },
    department: {
      type: String,
      enum: ['accounts', 'administration', 'support'],
      default: 'administration'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date
    },
    refreshTokens: [{
      token: String,
      createdAt: {
        type: Date,
        default: Date.now,
        expires: 2592000 // 30 days TTL
      }
    }]
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
```

### Validators (Joi Schema)

**Login**: `email` + `password` (min 6 chars)  
**Create User**: `name` + `email` + `phone` (10 digits) + `password` (min 6 chars) + optional `role` + optional `department`  
**Update User**: Partial fields (name, email, phone, role, department, isActive) with min 1 field

---

## Frontend Implementation

### TypeScript Interface

```typescript
// User type for authenticated user context
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'accountant' | 'staff';
  department: 'accounts' | 'administration' | 'support';
  isActive: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// API Response wrapper
export interface LoginResponse {
  success: boolean;
  user: User;
  token: string;
  expiresIn: number;
}

// Form submission payload
export interface CreateUserPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: 'admin' | 'accountant' | 'staff';
  department?: 'accounts' | 'administration' | 'support';
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  phone?: string;
  role?: 'admin' | 'accountant' | 'staff';
  department?: 'accounts' | 'administration' | 'support';
  isActive?: boolean;
}
```

### Form Validator (Zod Schema)

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please provide a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please provide a valid email'),
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'accountant', 'staff']).default('staff'),
  department: z.enum(['accounts', 'administration', 'support']).default('administration')
});

export const updateUserSchema = createUserSchema.partial().refine(
  obj => Object.keys(obj).length > 0,
  { message: 'At least one field must be updated' }
);

export type LoginFormData = z.infer<typeof loginSchema>;
export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
```

---

## API Contract

### Authentication Endpoints

| Endpoint | Method | Request | Response | Notes |
|----------|--------|---------|----------|-------|
| `/auth/login` | POST | `{ email, password }` | `{ success, user, token, expiresIn }` | Returns JWT token; updates `lastLogin` |
| `/auth/logout` | POST | `{ token }` | `{ success, message }` | Revokes `refreshToken` entry |
| `/auth/refresh` | POST | `{ refreshToken }` | `{ success, token, expiresIn }` | Issues new JWT token |

### User Management Endpoints

| Endpoint | Method | Request | Response | Notes |
|----------|--------|---------|----------|-------|
| `/users` | GET | Query params: `?role=admin&isActive=true` | `{ success, data: [User], total }` | List all users (admin only) |
| `/users` | POST | `{ name, email, phone, password, role?, department? }` | `{ success, user: User }` | Create new user (admin only) |
| `/users/:id` | GET | — | `{ success, user: User }` | Get single user (self or admin) |
| `/users/:id` | PATCH | Partial fields | `{ success, user: User }` | Update user (self or admin) |
| `/users/:id` | DELETE | — | `{ success, message }` | Soft-delete user (admin only) |

### API Response Format (Backend → Frontend)

```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Admin",
    "email": "admin@example.com",
    "phone": "9876543210",
    "role": "admin",
    "department": "accounts",
    "isActive": true,
    "createdAt": "2026-06-18T10:00:00Z",
    "updatedAt": "2026-06-18T12:30:00Z"
  },
  "message": "User retrieved successfully"
}
```

---

## Validation Rules

### Backend (Mongoose + Joi)

- **name**: 2–100 characters, trimmed
- **email**: Valid format, lowercase, unique across system
- **phone**: Exactly 10 digits, unique across system
- **password**: Min 6 characters (hashed before storage)
- **role**: One of `admin`, `accountant`, `staff`
- **department**: One of `accounts`, `administration`, `support`
- **isActive**: Boolean (defaults to true)

### Frontend (Zod + React Hook Form)

- Real-time validation on form fields
- Email/phone uniqueness check via API debounce
- Password strength indicator (optional enhancement)
- Enum dropdown selects for role/department

---

## Breaking Changes & Migration

### If Merging from Separate Systems

1. **ID Mapping**: Ensure frontend User IDs align with backend ObjectId format (use `toString()` if needed)
2. **Timestamps**: Frontend must handle ISO date strings; format for display with `new Date()`
3. **Role Enums**: Hardcode role constants to avoid string mismatches:
   ```typescript
   export const ROLES = { ADMIN: 'admin', ACCOUNTANT: 'accountant', STAFF: 'staff' } as const;
   ```
4. **Password Handling**: Never send password in responses; validate min-length only on frontend

---

## Testing Checklist

- [ ] Backend: Validate schema constraints (unique email/phone, min lengths)
- [ ] Backend: Test JWT token generation and refresh flow
- [ ] Frontend: Form validation displays correct error messages
- [ ] Frontend: API integration test for login/logout/refresh
- [ ] End-to-end: Login → Create User → Update User → Logout
- [ ] Security: Verify password is never logged or exposed in responses

---
