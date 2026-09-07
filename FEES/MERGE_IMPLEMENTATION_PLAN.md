# Fee-Module Backend-Frontend Merge Plan
**Generated**: 2026-06-18  
**Status**: Integration Planning Phase  
**Priority**: Critical - 8 blocking issues identified

---

## 🚨 Critical Blocking Issues

| # | Issue | Impact | Fix Time |
|---|-------|--------|----------|
| 1 | **Database Config Bug** | Backend can't connect to DB | 15 min |
| 2 | **Missing API Endpoints** (5 endpoints) | Frontend pages fail to load | 60 min |
| 3 | **Data Structure Mismatches** | API responses don't match frontend expectations | 45 min |
| 4 | **No Login/Auth UI** | Can't authenticate; assumes pre-logged-in state | 90 min |
| 5 | **Enum Value Mismatches** | Payment status "Paid" vs "PAID" | 20 min |
| 6 | **Environment Setup** | Missing .env files, wrong connections | 30 min |
| 7 | **CORS Issues** | Frontend can't call backend API | 10 min |
| 8 | **No User Context** | Can't track authenticated user | 60 min |

**Total Merge Time: ~4-5 hours**

---

## Phase 1: Database & Backend Configuration (30 min)

### 1.1 Fix Database Connection Bug

**Issue**: `backend/config/database.js` imports Mongoose (MongoDB) but project uses Prisma (PostgreSQL)

**File**: `backend/config/database.js`

**Current (WRONG)**:
```javascript
import mongoose from 'mongoose';
// MongoDB connection...
```

**Fix**: Remove this file entirely. Prisma handles all DB connections via `backend/prisma/schema.prisma`

**Action**: Delete `backend/config/database.js`

---

### 1.2 Set Up Environment Variables

**Create**: `backend/.env`

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fee_module_db

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE_IN=24h
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRE_IN=7d

# API
API_PORT=5000
NODE_ENV=development
API_BASE_URL=http://localhost:5000

# Razorpay (if used)
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-secret

# Email/Notifications (if used)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# CORS
FRONTEND_URL=http://localhost:5173
```

**Create**: `frontend/.env`

```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=ACURA Fee Management
VITE_API_TIMEOUT=10000
```

**Create**: `frontend/.env.production`

```env
VITE_API_URL=https://your-domain.com/api
VITE_APP_NAME=ACURA Fee Management
VITE_API_TIMEOUT=10000
```

---

### 1.3 Enable CORS on Backend

**File**: `backend/server.js` (add at start)

```javascript
import cors from 'cors';

// After express init
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Install if needed**:
```bash
npm install cors
```

---

## Phase 2: Fix Missing API Endpoints (60 min)

### 2.1 Add Missing Fee Payment Detail Endpoint

**File**: `backend/routes/feePaymentRoutes.js` - Add this route:

```javascript
// Get single fee payment by ID
router.get('/:id', authMiddleware, feePaymentController.getFeePaymentById);
```

**File**: `backend/controllers/feePaymentController.js` - Add this function:

```javascript
export const getFeePaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const feePayment = await prisma.feePayment.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            course: true,
            class: true
          }
        },
        feeStructure: {
          include: {
            components: true
          }
        }
      }
    });

    if (!feePayment) {
      return res.status(404).json({ success: false, message: 'Fee payment not found' });
    }

    res.json({
      success: true,
      data: {
        ...feePayment,
        studentName: `${feePayment.student.firstName} ${feePayment.student.lastName}`,
        class: feePayment.student.class.name,
        invoiceId: feePayment.id
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

### 2.2 Add Pending Fees Endpoint

**File**: `backend/routes/feePaymentRoutes.js` - Add:

```javascript
// Get all pending fees
router.get('/pending/list', authMiddleware, feePaymentController.getPendingFees);
```

**File**: `backend/controllers/feePaymentController.js` - Add:

```javascript
export const getPendingFees = async (req, res) => {
  try {
    const { studentId, classId } = req.query;
    
    const where = { 
      paymentStatus: 'PENDING'
    };
    
    if (studentId) where.studentId = studentId;
    if (classId) where.student = { class: { id: classId } };

    const pendingFees = await prisma.feePayment.findMany({
      where,
      include: {
        student: {
          include: {
            course: true,
            class: true
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    res.json({
      success: true,
      data: pendingFees.map(fee => ({
        ...fee,
        studentName: `${fee.student.firstName} ${fee.student.lastName}`,
        class: fee.student.class.name
      })),
      total: pendingFees.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

### 2.3 Add Transactions Endpoint

**File**: `backend/routes/paymentRoutes.js` - Add:

```javascript
// Get all transactions
router.get('/transactions/list', authMiddleware, paymentController.getTransactions);
```

**File**: `backend/controllers/paymentController.js` - Add:

```javascript
export const getTransactions = async (req, res) => {
  try {
    const { limit = 10, offset = 0, status } = req.query;
    
    const where = {};
    if (status) where.status = status;

    const transactions = await prisma.payment.findMany({
      where,
      include: {
        feePayment: {
          include: {
            student: true
          }
        }
      },
      orderBy: { transactionDate: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.payment.count({ where });

    res.json({
      success: true,
      data: transactions.map(t => ({
        id: t.id,
        studentName: `${t.feePayment.student.firstName} ${t.feePayment.student.lastName}`,
        amount: t.amount,
        method: t.paymentMethod,
        status: t.status,
        date: t.transactionDate,
        invoiceId: t.feePaymentId
      })),
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

### 2.4 Add Notification Endpoints (Placeholder)

**File**: `backend/routes/notificationRoutes.js` (NEW):

```javascript
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Send WhatsApp message
router.post('/whatsapp', authMiddleware, async (req, res) => {
  try {
    const { invoiceId } = req.body;
    
    // TODO: Integrate with Twilio/WhatsApp API
    // For now, return success
    
    res.json({
      success: true,
      message: 'WhatsApp message sent successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send SMS message
router.post('/sms', authMiddleware, async (req, res) => {
  try {
    const { invoiceId } = req.body;
    
    // TODO: Integrate with Twilio SMS API
    // For now, return success
    
    res.json({
      success: true,
      message: 'SMS sent successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
```

**File**: `backend/server.js` - Add route:

```javascript
import notificationRoutes from './routes/notificationRoutes.js';

// After other routes
app.use('/api/notifications', notificationRoutes);
```

---

## Phase 3: Fix Data Structure Mismatches (45 min)

### 3.1 Normalize Payment Status Enums

**Issue**: Frontend expects "Paid"/"Pending", backend uses "PAID"/"PENDING"

**Solution**: Create a mapping function in backend

**File**: `backend/utils/statusMapper.js` (NEW):

```javascript
export const paymentStatusMap = {
  PAID: 'Paid',
  PENDING: 'Pending',
  OVERDUE: 'Overdue',
  PARTIALLY_PAID: 'Partially Paid',
  CANCELLED: 'Cancelled'
};

export const getDisplayStatus = (dbStatus) => {
  return paymentStatusMap[dbStatus] || dbStatus;
};

export const getDbStatus = (displayStatus) => {
  const reverse = Object.fromEntries(
    Object.entries(paymentStatusMap).map(([k, v]) => [v, k])
  );
  return reverse[displayStatus] || displayStatus;
};
```

**Update all FeePayment responses to use this**:

```javascript
// In any controller returning fee payments
const response = {
  ...feePayment,
  paymentStatus: getDisplayStatus(feePayment.paymentStatus),
  studentName: `${feePayment.student.firstName} ${feePayment.student.lastName}`,
  class: feePayment.student.class.name
};
```

---

### 3.2 Fix Refund API Request/Response Mismatch

**Issue**: Frontend sends `invoiceId`, backend expects `feePaymentId`

**File**: `backend/controllers/refundController.js` - Update:

```javascript
export const createRefund = async (req, res) => {
  try {
    const { invoiceId, feePaymentId, amount, reason, description } = req.body;
    
    // Accept both invoiceId and feePaymentId
    const paymentId = feePaymentId || invoiceId;

    if (!paymentId) {
      return res.status(400).json({ 
        success: false, 
        message: 'invoiceId or feePaymentId is required' 
      });
    }

    // Rest of logic...
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

## Phase 4: Add Authentication & User Context (90 min)

### 4.1 Create Login Page

**File**: `frontend/src/pages/Login.jsx` (NEW):

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../services/apiService';
import '../styles/auth.css';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await loginUser(email, password);
    
    if (result.success) {
      localStorage.setItem('authToken', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      navigate('/dashboard');
    } else {
      setError(result.message || 'Login failed');
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>ACURA Fee Management</h1>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

### 4.2 Create Auth Context

**File**: `frontend/src/context/AuthContext.jsx` (NEW):

```jsx
import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Restore session from localStorage
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.clear();
      }
    }

    setIsLoading(false);
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    setIsAuthenticated(true);
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

### 4.3 Add Protected Route Component

**File**: `frontend/src/components/ProtectedRoute.jsx` (NEW):

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
```

---

### 4.4 Update App Routing

**File**: `frontend/src/App.jsx` - Update to:

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Fees from './pages/Fees';
import Payments from './pages/Payments';
import Refunds from './pages/Refunds';
// ... other imports

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/fees" 
        element={
          <ProtectedRoute>
            <Fees />
          </ProtectedRoute>
        } 
      />
      {/* ... other protected routes */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

---

## Phase 5: Setup & Testing Checklist (60 min)

### Pre-Startup Checklist

**Backend Setup**:
- [ ] Delete `backend/config/database.js`
- [ ] Create `backend/.env` with all variables
- [ ] Install dependencies: `npm install`
- [ ] Run Prisma migrations: `npx prisma migrate dev`
- [ ] Seed database (if needed): `npx prisma db seed`
- [ ] Add CORS middleware to `backend/server.js`
- [ ] Create notification routes
- [ ] Update all controllers to return normalized data

**Frontend Setup**:
- [ ] Create `frontend/.env`
- [ ] Install dependencies: `npm install`
- [ ] Create Login page (`frontend/src/pages/Login.jsx`)
- [ ] Create Auth context (`frontend/src/context/AuthContext.jsx`)
- [ ] Create ProtectedRoute component
- [ ] Update App.jsx with auth routing
- [ ] Update all API calls to include Authorization header

### Startup Commands

**Terminal 1 - Backend**:
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm install
npm run dev
```

Then visit: `http://localhost:5173`

### Testing Workflow

1. **Login Test**:
   - Navigate to `http://localhost:5173/login`
   - Use test credentials: `admin@feesystem.com` / `Admin@2024`
   - Verify redirect to dashboard

2. **API Integration Test**:
   - Open DevTools (F12) → Network tab
   - Navigate to different pages
   - Verify API calls succeed (200/201 status)
   - Check response data format matches expectations

3. **Data Consistency Test**:
   - Check status values display correctly ("Paid" not "PAID")
   - Verify student names, amounts, dates display properly
   - Test filters/search functionality

4. **Error Handling Test**:
   - Try invalid login
   - Try accessing protected routes without token
   - Test API error responses display properly

---

## Implementation Order

**Do in this order** to avoid dependency issues:

1. ✅ **Phase 1**: Database config + environment setup (First - required for backend to run)
2. ✅ **Phase 2**: Add missing endpoints (Before frontend can use them)
3. ✅ **Phase 3**: Fix data mismatches (So frontend displays correctly)
4. ✅ **Phase 4**: Auth UI + context (So users can log in)
5. ✅ **Phase 5**: Test everything together

---

## Success Criteria

| Criteria | Status |
|----------|--------|
| Backend starts without DB connection errors | ⬜ |
| Frontend starts without API errors | ⬜ |
| Login page loads and accepts input | ⬜ |
| Login with valid credentials redirects to dashboard | ⬜ |
| Dashboard loads and displays data | ⬜ |
| All status values display correctly | ⬜ |
| Navigation between pages works | ⬜ |
| No console errors or warnings | ⬜ |
| API requests include auth token | ⬜ |
| All CRUD operations work (create, read, update, delete) | ⬜ |

---

## Rollback Plan

If something breaks:

1. **Backend won't start**:
   - Check `.env` file DATABASE_URL is correct
   - Check PostgreSQL is running
   - Run `npx prisma migrate reset` to reset DB

2. **Frontend API errors**:
   - Check backend is running on port 5000
   - Check `.env` VITE_API_URL is correct
   - Check browser console for exact error message

3. **Auth not working**:
   - Clear localStorage and try again
   - Check JWT_SECRET in backend `.env`
   - Verify user exists in database

4. **Data not displaying**:
   - Check API response in DevTools Network tab
   - Compare with expected format from Phase 3
   - Check for console JavaScript errors

---
