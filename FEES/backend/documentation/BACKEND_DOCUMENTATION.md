# ERP Fee Management System - Backend Documentation

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Installation & Setup](#installation--setup)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Integration Guide](#integration-guide)

## 🎯 Project Overview

A scalable, enterprise-grade backend for an ERP Fee Management System built with:
- **Framework**: Express.js (Node.js)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi schema validation
- **Logging**: Winston logger
- **File Upload**: Multer with CSV/Excel parsing

### Key Features
- Role-based access control (Admin, Accountant, Staff)
- Complete fee payment management
- Refund request & processing system
- Bulk student import
- Dashboard analytics
- Monthly collection reports
- Overdue payment tracking

## 🏗️ Architecture

### MVC Pattern
```
backend/
├── config/           # Configuration & database setup
├── controllers/      # Request handlers
├── middleware/       # Authentication, validation, error handling
├── models/          # MongoDB schemas
├── routes/          # API endpoints
├── services/        # Business logic
├── utils/           # Helper functions
├── validators/      # Input validation schemas
├── logs/            # Application logs
└── server.js        # Entry point
```

### Flow Diagram
```
Request → Middleware (Logger, CORS) 
  → Router 
  → Validation Middleware 
  → Authentication Middleware 
  → Controller 
  → Service Layer 
  → Database 
  → Response
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js v18+
- MongoDB v4.4+
- npm or yarn

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` and update:
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Server
NODE_ENV=development
PORT=5000
HOST=localhost

# Database
MONGODB_URI=mongodb://localhost:27017/fee-management

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d

# Frontend URLs
FRONTEND_URL=http://localhost:5173
ADMIN_FRONTEND_URL=http://localhost:3000
```

### Step 3: Start MongoDB
```bash
# On Windows
mongod

# On macOS/Linux
brew services start mongodb-community
```

### Step 4: Run the Server
```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

Server will be running at: `http://localhost:5000`

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login user |
| POST | `/api/auth/refresh-token` | Public | Refresh access token |
| POST | `/api/auth/logout` | Authenticated | Logout user |

### Students
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/students` | Admin, Accountant | Create student |
| GET | `/api/students/:id` | Authenticated | Get student details |
| PUT | `/api/students/:id` | Admin, Accountant | Update student |
| DELETE | `/api/students/:id` | Admin | Delete student |
| GET | `/api/students/search` | Authenticated | Search students (with filters) |
| POST | `/api/students/bulk-upload` | Admin | Bulk upload students |

### Fee Payments
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/fee-payments` | Admin, Accountant | Create fee payment |
| POST | `/api/fee-payments/:id/record-payment` | Admin, Accountant | Record payment |
| GET | `/api/fee-payments/pending` | Authenticated | Get pending payments |
| GET | `/api/fee-payments/overdue` | Authenticated | Get overdue payments |
| GET | `/api/fee-payments/dashboard/stats` | Admin, Accountant | Get dashboard statistics |
| GET | `/api/fee-payments/dashboard/monthly` | Admin, Accountant | Get monthly data |

### Refunds
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/refunds` | Authenticated | Create refund request |
| GET | `/api/refunds` | Authenticated | Get refund requests |
| POST | `/api/refunds/:id/approve` | Admin, Accountant | Approve refund |
| POST | `/api/refunds/:id/reject` | Admin, Accountant | Reject refund |
| POST | `/api/refunds/:id/process` | Admin | Process refund |
| GET | `/api/refunds/stats` | Admin, Accountant | Get refund statistics |

## 💾 Database Schema

### User
```javascript
{
  name: String,
  email: String (unique),
  phone: String (unique),
  password: String (hashed),
  role: 'admin' | 'accountant' | 'staff',
  department: String,
  isActive: Boolean,
  lastLogin: Date,
  refreshTokens: Array,
  createdAt: Date,
  updatedAt: Date
}
```

### Student
```javascript
{
  studentId: String (unique),
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  dateOfBirth: Date,
  gender: String,
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  course: ObjectId (ref: Course),
  class: ObjectId (ref: Class),
  parentInfo: Object,
  enrollmentDate: Date,
  status: 'active' | 'inactive' | 'graduated' | 'dropped',
  createdAt: Date,
  updatedAt: Date
}
```

### FeePayment
```javascript
{
  student: ObjectId (ref: Student),
  feeStructure: ObjectId (ref: FeeStructure),
  totalAmount: Number,
  amountPaid: Number,
  amountPending: Number,
  dueDate: Date,
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled',
  payments: [{
    amount: Number,
    paymentDate: Date,
    paymentMethod: 'cash' | 'cheque' | 'online' | 'bank_transfer',
    transactionId: String,
    receivedBy: ObjectId (ref: User)
  }],
  penaltyCharges: Number,
  discountAmount: Number,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### RefundRequest
```javascript
{
  student: ObjectId (ref: Student),
  feePayment: ObjectId (ref: FeePayment),
  amount: Number,
  reason: 'withdrawal' | 'course_cancellation' | 'overpayment' | 'scholarship' | 'other',
  description: String,
  requestDate: Date,
  status: 'pending' | 'approved' | 'rejected' | 'processed',
  approvedBy: ObjectId (ref: User),
  approvalDate: Date,
  refundMethod: 'bank_transfer' | 'cheque' | 'cash',
  bankDetails: Object,
  processedDate: Date,
  refundTransactionId: String,
  createdAt: Date,
  updatedAt: Date
}
```

See `models/` folder for complete schema details.

## 🔐 Authentication

### JWT Token Structure
```
Header:  { alg: 'HS256', typ: 'JWT' }
Payload: { userId, role, iat, exp }
```

### Flow
1. **Login** → Backend validates credentials, returns `accessToken` & `refreshToken`
2. **API Requests** → Include token in header: `Authorization: Bearer <token>`
3. **Token Expiry** → Use `refreshToken` to get new access token
4. **Logout** → Token stored in DB is removed

### Roles & Permissions
```javascript
{
  admin: {
    canDelete: true,
    canApprove: true,
    canViewReports: true,
    canManageUsers: true
  },
  accountant: {
    canDelete: false,
    canApprove: true,
    canViewReports: true,
    canManageUsers: false
  },
  staff: {
    canDelete: false,
    canApprove: false,
    canViewReports: false,
    canManageUsers: false
  }
}
```

## ⚠️ Error Handling

### Standard Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common HTTP Status Codes
| Status | Meaning |
|--------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (Validation Error) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

## 🔗 Integration Guide

### 1. Frontend Setup (Vite)

#### Install Axios
```bash
npm install axios
```

#### Create API Service
```javascript
// src/services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Refresh token logic
    }
    return Promise.reject(error);
  }
);

export default api;
```

#### Login Example
```javascript
import api from './api';

const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', response.data.data.accessToken);
    localStorage.setItem('refreshToken', response.data.data.refreshToken);
    return response.data.data;
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

### 2. CORS Configuration
Backend already supports CORS. Frontend URLs configured in `.env`:
```env
FRONTEND_URL=http://localhost:5173
ADMIN_FRONTEND_URL=http://localhost:3000
```

### 3. State Management
Use Zustand/Redux to store:
- User info
- Access & refresh tokens
- Role-based UI rendering

### 4. Middleware for Protected Routes
```javascript
// src/guards/ProtectedRoute.jsx
export const ProtectedRoute = ({ children, requiredRole }) => {
  const { user } = useAuthStore();
  
  if (!user) return <Navigate to="/login" />;
  if (requiredRole && !requiredRole.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
};
```

### 5. Sample Dashboard Data Fetch
```javascript
const fetchDashboardStats = async () => {
  try {
    const response = await api.get('/fee-payments/dashboard/stats');
    setStats(response.data.data);
  } catch (error) {
    console.error('Failed to fetch stats:', error);
  }
};
```

## 📊 Deployment

### Production Checklist
- [ ] Update `.env` with production MongoDB URI
- [ ] Set `NODE_ENV=production`
- [ ] Generate strong `JWT_SECRET`
- [ ] Update CORS origins
- [ ] Enable HTTPS
- [ ] Set up rate limiting
- [ ] Configure email service
- [ ] Set up monitoring & logging
- [ ] Create database backups

### Using PM2 (Production Process Manager)
```bash
npm install -g pm2
pm2 start server.js --name "fee-management-api"
pm2 save
pm2 startup
```

## 📝 Sample Requests

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "password": "password123",
    "role": "accountant"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Create Student
```bash
curl -X POST http://localhost:5000/api/students \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STU001",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "course": "COURSE_ID",
    "class": "CLASS_ID",
    "address": {
      "city": "New York"
    }
  }'
```

---

For more details, check individual files in `config/`, `models/`, `services/`, and `controllers/` directories.
