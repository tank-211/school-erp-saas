# 🏗️ Backend Architecture & System Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                  │
│                   Frontend (Vite + React/Vue)                           │
│                        (Port: 5173)                                     │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │ HTTP/REST with JWT
                           │
┌──────────────────────────▼──────────────────────────────────────────────┐
│                        APPLICATION LAYER                                │
│                      Express.js Server                                  │
│                        (Port: 5000)                                     │
│                                                                         │
│   ┌────────────────────────────────────────────────────────────────┐  │
│   │                      Request Pipeline                          │  │
│   │  Request → CORS → Body Parser → Logger → Router              │  │
│   └────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│   ┌─────────────┬──────────────┬──────────────┬─────────────────┐     │
│   │   Routes    │  Validation  │ Authentication │ Authorization  │     │
│   └─────────────┴──────────────┴──────────────┴─────────────────┘     │
│                                                                         │
│   ┌────────────────────────────────────────────────────────────────┐  │
│   │                    Controllers Layer                           │  │
│   │  Auth │ Student │ FeePayment │ Refund │ Admin                 │  │
│   └────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│   ┌────────────────────────────────────────────────────────────────┐  │
│   │                    Services Layer                              │  │
│   │  Business Logic & Data Processing                             │  │
│   └────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│   ┌────────────────────────────────────────────────────────────────┐  │
│   │                    Utils & Helpers                             │  │
│   │  Calculations │ FileParser │ ResponseFormatter                │  │
│   └────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│   ┌────────────────────────────────────────────────────────────────┐  │
│   │                  Error Handler Middleware                      │  │
│   │          (Global Error Handling & Response)                    │  │
│   └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │ Mongoose ODM
                           │
┌──────────────────────────▼──────────────────────────────────────────────┐
│                        DATA LAYER                                       │
│                    MongoDB Database                                     │
│                                                                         │
│  Collections:                                                           │
│  ├── Users (Authentication & Authorization)                            │
│  ├── Students (Student Information)                                    │
│  ├── Courses (Course Master Data)                                      │
│  ├── Classes (Class Information)                                       │
│  ├── FeeTypes (Fee Type Definitions)                                   │
│  ├── FeeStructures (Fee Configuration)                                 │
│  ├── FeePayments (Payment Tracking)                                    │
│  └── RefundRequests (Refund Management)                                │
└─────────────────────────────────────────────────────────────────────────┘
```

## Request-Response Flow

```
1. Client Request (with JWT Token)
   ↓
2. Express → CORS Middleware (origin check)
   ↓
3. Body Parser → Parse JSON request body
   ↓
4. Request Logger → Log incoming request
   ↓
5. Router → Match route pattern
   ↓
6. Validation Middleware → Validate request data (Joi)
   ↓
7. Authentication Middleware → Verify JWT token
   ↓
8. Authorization Middleware → Check user role
   ↓
9. Controller → Handle business logic
   ↓
10. Service Layer → Execute business operations
   ↓
11. Model/Database → Mongoose operations
    - Create: INSERT
    - Read: FIND/FINDBYID
    - Update: FINDBYIDANDUPDATE
    - Delete: FINDBYIDANDDELETE
    - Aggregate: Pipeline operations
   ↓
12. Service → Return processed data
   ↓
13. Controller → Format response
   ↓
14. Response Helper → Standardize response format
   ↓
15. Express → Send JSON response to client
   ↓
16. Client Receives → { success, message, data }

Error Handling at any step:
- Request → Error Handler Middleware
         → Standardized error response
         → Return error to client
         → Log error in logs/error.log
```

## Middleware Stack

```
Express App
├── cors()                     # CORS protection
├── express.json()             # Body parser
├── requestLogger              # Request logging
├── router.use('/api/auth')    # Auth routes
│   └── validateRequest()      # Input validation
│   └── authController         # Auth operations
├── router.use('/api/students')# Student routes
│   └── authenticateToken      # JWT verification
│   └── authorizeRole()        # Role check
│   └── validateRequest()      # Input validation
│   └── studentController      # Student operations
├── router.use('/api/fee-payments') # Fee routes
│   └── [Same auth flow]
├── router.use('/api/refunds')     # Refund routes
│   └── [Same auth flow]
└── errorHandler()             # Global error handler
```

## Authentication & Authorization Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      LOGIN FLOW                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  User enters credentials (email, password)                             │
│           ↓                                                            │
│  Frontend: POST /api/auth/login { email, password }                   │
│           ↓                                                            │
│  Backend: AuthService.login(email, password)                          │
│           ├─ Find user by email                                       │
│           ├─ Compare passwords (bcryptjs)                             │
│           ├─ If invalid → throw error ❌                              │
│           └─ If valid → Generate tokens ✓                             │
│                     ├─ AccessToken (expires: 7d)                      │
│                     ├─ RefreshToken (expires: 30d)                    │
│                     └─ Store RefreshToken in DB                       │
│           ↓                                                            │
│  Response: { accessToken, refreshToken, user }                        │
│           ↓                                                            │
│  Frontend: Store tokens in localStorage                               │
│           ├─ localStorage.setItem('accessToken', token)               │
│           ├─ localStorage.setItem('refreshToken', token)              │
│           └─ Set user state in auth store                             │
│           ↓                                                            │
│  Redirect to Dashboard ✓                                              │
│                                                                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│              PROTECTED API CALL FLOW                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Frontend makes protected request                                      │
│           ↓                                                            │
│  Add Authorization header: Bearer <accessToken>                        │
│           ↓                                                            │
│  Backend: authenticateToken middleware                                │
│           ├─ Extract token from header                                │
│           ├─ Verify JWT signature                                     │
│           ├─ Check expiration                                         │
│           ├─ If invalid/expired → return 401 ❌                       │
│           └─ If valid → Extract userId, role                          │
│                 └─ Attach to req.user ✓                               │
│           ↓                                                            │
│  (Optional) authorizeRole middleware                                  │
│           ├─ Check user.role against required roles                   │
│           ├─ If unauthorized → return 403 ❌                          │
│           └─ If authorized → Next ✓                                   │
│           ↓                                                            │
│  Validation middleware                                                │
│           ├─ Validate request body/query                              │
│           ├─ If invalid → return 400 ❌                               │
│           └─ If valid → Attach validated data ✓                       │
│           ↓                                                            │
│  Controller executes business logic                                    │
│           ↓                                                            │
│  Return response to client ✓                                          │
│                                                                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│              TOKEN REFRESH FLOW                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Frontend: GET /api/students (with expired accessToken)               │
│           ↓                                                            │
│  Backend: Middleware detects 401 (token expired)                      │
│           ↓                                                            │
│  Frontend Interceptor: Catch 401 error                                │
│           ├─ Get refreshToken from localStorage                       │
│           └─ POST /api/auth/refresh-token { refreshToken }            │
│           ↓                                                            │
│  Backend: Verify refreshToken                                         │
│           ├─ Check if token exists in DB                              │
│           ├─ If invalid → Redirect to login ❌                        │
│           └─ If valid → Generate new accessToken ✓                    │
│           ↓                                                            │
│  Frontend: Update accessToken in localStorage                         │
│           ↓                                                            │
│  Retry original request (GET /api/students)                           │
│           ↓                                                            │
│  Success ✓                                                            │
│                                                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

## Database Relationships

```
User (1) ──has_many── (M) RefreshToken
  │
  ├─ role: 'admin' | 'accountant' | 'staff'
  └─ lastLogin: Date
         ↓
         ├─ approves → FeePayment (discount/penalty)
         ├─ approves → RefundRequest
         └─ receives → FeePayment (payment)

Student (1) ──has_many── (M) FeePayment
         │
         ├─ belongs_to → Course (1)
         ├─ belongs_to → Class (1)
         └─ has_many → RefundRequest

Course (1) ──has_many── (M) Class
    │
    └─ has_many → FeeStructure

Class (1) ──has_many── (M) Student

FeeType (1) ──has_many── (M) FeeComponent (in FeeStructure)

FeeStructure (1) ──has_many── (M) FeePayment
    │
    └─ has_many ─ FeeType (through components)

FeePayment (1) ──has_many── (M) Payment (sub-documents)
    │
    ├─ belongs_to → Student (1)
    ├─ belongs_to → FeeStructure (1)
    ├─ has_many → RefundRequest
    └─ Payment[] (array of transactions)
        ├─ amount
        ├─ paymentMethod
        ├─ transactionId
        └─ receivedBy → User

RefundRequest (1) ──belongs_to── (1) Student
    │
    ├─ belongs_to → FeePayment (1)
    └─ approvedBy → User
```

## Data Flow Example: Record Payment

```
1. Frontend Form Input
   {
     paymentAmount: 10000,
     paymentMethod: "online",
     transactionId: "TXN123"
   }
   ↓
2. POST /api/fee-payments/:id/record-payment
   ↓
3. Middleware:
   - validate request body (Joi)
   - authenticate token (JWT)
   - authorize role (Admin/Accountant)
   ↓
4. Controller: recordPayment()
   - Extract paymentId from params
   - Get validated data
   - Call FeePaymentService.recordPayment()
   ↓
5. Service: recordPayment(paymentId, paymentData, userId)
   - Find FeePayment by ID
   - Add payment to payments array
   - Update amountPaid: += paymentData.amount
   - Calculate amountPending
   - Auto-calculate paymentStatus (pending/partial/paid)
   - Save to database
   ↓
6. Database Update
   FeePayment {
     ...
     amountPaid: 10000,          (was 0)
     amountPending: 40000,       (was 50000)
     paymentStatus: "partial",   (was "pending")
     payments: [
       {
         amount: 10000,
         paymentDate: 2024-03-29,
         paymentMethod: "online",
         transactionId: "TXN123",
         receivedBy: User._id
       }
     ]
   }
   ↓
7. Response to Frontend
   {
     success: true,
     message: "Payment recorded successfully",
     data: { updated FeePayment }
   }
   ↓
8. Frontend Updates UI
   - Refresh payment list
   - Show "Payment recorded: 10000"
   - Update dashboard stats
```

## Error Handling Flow

```
┌──────────────────────────────┐
│  Error Occurs Anywhere       │
└────────────┬─────────────────┘
             │
             ▼
    ┌────────────────────┐
    │ Type of Error?     │
    └────────────────────┘
    │
    ├─ Validation Error
    │  └─→ 400 Bad Request
    │      { errors: [ { field, message } ] }
    │
    ├─ Authentication Error (No Token)
    │  └─→ 401 Unauthorized
    │      "Access token is missing"
    │
    ├─ Authentication Error (Invalid Token)
    │  └─→ 403 Forbidden
    │      "Invalid or expired token"
    │
    ├─ Authorization Error (Wrong Role)
    │  └─→ 403 Forbidden
    │      "You do not have permission"
    │
    ├─ Resource Not Found
    │  └─→ 404 Not Found
    │      "Student not found"
    │
    ├─ Duplicate Key (MongoDB)
    │  └─→ 400 Bad Request
    │      "Email already exists"
    │
    ├─ MongoDB Validation
    │  └─→ 400 Bad Request
    │      "Validation Error: <message>"
    │
    └─ Unexpected Error
       └─→ 500 Internal Server Error
           "Internal Server Error"
             │
             ▼
    ┌──────────────────────┐
    │ 1. Log Error Details │
    │    - to file         │
    │    - to console      │
    └──────────────────────┘
             │
             ▼
    ┌──────────────────────┐
    │ 2. Send Response     │
    │    to Client         │
    │    (standardized)    │
    └──────────────────────┘
```

## Scaling & Performance Considerations

### Implemented
- ✅ Database indexing on key fields
- ✅ Connection pooling (Mongoose default: 5)
- ✅ Pagination for list endpoints
- ✅ Request logging with metadata
- ✅ Error handling without data leakage

### Ready to Implement
- 🔄 Caching layer (Redis)
- 🔄 Rate limiting (express-rate-limit)
- 🔄 API versioning (/api/v1/)
- 🔄 Helmet for security
- 🔄 Compression (gzip)
- 🔄 Load balancing (reverse proxy)

### Deployment Options
- 🐳 Docker & Docker Compose
- ☁️ AWS EC2 with PM2
- ☁️ Digital Ocean App Platform
- ☁️ Heroku
- ☁️ AWS ECS with Fargate

## File Organization Philosophy

```
Config Layer:
- Centralized configuration
- Environment-specific settings
- Security-sensitive data in .env

Model Layer:
- Single responsibility
- Clear relationships
- Validation at schema level

Service Layer:
- Business logic separation
- Reusable functions
- Error handling

Controller Layer:
- Request handling
- Response formatting
- Minimal logic

Route Layer:
- Clean URL patterns
- Middleware ordering
- Clear verb semantics

Middleware Layer:
- Focused responsibility
- Reusable across routes
- Error handling

Utils Layer:
- Helper functions
- No business logic
- Reusable utilities
```

## Development Workflow

### Creating New Feature

```
1. Define Route (routes/)
   → POST /api/resource

2. Create Controller (controllers/)
   → Handle HTTP request/response

3. Write Validator (validators/)
   → Define Joi schema

4. Create Service (services/)
   → Business logic

5. Create/Update Model (models/)
   → Database schema

6. Create Tests (tests/)
   → Unit & integration tests

7. Update Documentation
   → API_ENDPOINTS.md
   → DATABASE_SCHEMA.md

8. Test Locally
   → npm run dev
   → Test with Postman

9. Commit & Push
   → git add .
   → git commit -m "feat: new feature"
   → git push
```

---

This architecture ensures scalability, maintainability, and best practices throughout the application.
