# Architecture & Design Guide

## Overview

**MVC Architecture** with clean separation of concerns.

```
Request → Middleware → Routes → Controllers → Services → Prisma → Database
```

---

## Directory Structure

```
src/
├── controllers/        # HTTP request handlers
├── routes/             # Express routes & endpoints
├── services/           # Business logic & database ops
├── middlewares/        # Auth, validation, error handling
└── utils/              # JWT, bcrypt, validators, response formatting
```

---

## Data Flow Example

```
1. Client: POST /api/leads with JSON
2. Express: Parse JSON, match route
3. Middleware:
   - Auth: Verify JWT token
   - Validation: Check request with Zod
4. Controller: Route to createLead
5. Service: Execute business logic
6. Prisma: Generate SQL query
7. Database: Execute, return result
8. Response: Format with successResponse()
9. Client: Receive JSON with success: true
```

---

## Key Design Patterns

### 1. MVC Pattern
- **Model**: Prisma schema
- **View**: JSON responses
- **Controller**: HTTP handlers

### 2. Service Layer
- Isolates business logic
- Reusable across endpoints
- Easy to test

### 3. Middleware Chain
```javascript
app.use(cors());              // CORS
app.use(express.json());      // Parse JSON
app.use(authMiddleware);      // Auth check
app.use(validationMiddleware);// Validate input
```

### 4. Error Handling
- Centralized error middleware
- Consistent error format
- No stack trace leaks

---

## Database Schema

### Relations

```
User (1) ---> (Many) Lead
User (1) ---> (Many) Activity
User (1) ---> (Many) Communication
Lead (1) ---> (Many) Activity
Lead (1) ---> (Many) Communication
```

### Models

```
User
├── id, name, email, password, role
├── leads, activities, communications
└── Indexes: email

Lead
├── id, name, phone, email, status, source, assignedTo
├── activities, communications
└── Indexes: status, source, assignedTo

Activity
├── id, type, note, leadId, userId
└── Relations: Lead, User

Communication
├── id, type, content, status, leadId, userId
└── Relations: Lead, User

Settings
├── id, category, key, value
└── Unique: (category, key)
```

---

## Authentication Flow

```
1. Register/Login
   ↓
2. Bcrypt hash password
   ↓
3. Save to database
   ↓
4. Generate JWT token with userId
   ↓
5. Return token to client
   ↓
6. Client sends token in Authorization header
   ↓
7. authMiddleware verifies token
   ↓
8. req.userId set, request continues
```

---

## Validation Strategy

```
Schema (Zod) → validate() middleware → req.body validated
↓
If valid → continue
If invalid → 400 error with field errors
```

---

## Response Format

All endpoints return:
```json
{
  "success": boolean,
  "data": {},
  "message": "string"
}
```

---

## Security Measures

✅ JWT authentication  
✅ Bcrypt password hashing  
✅ Zod input validation  
✅ CORS & Helmet headers  
✅ Error message filtering  
✅ No credential leakage  

---

## Performance Features

✅ Pagination (skip/take)  
✅ Selective querying  
✅ Database indexes  
✅ Limited relationships  

---

## Scalability Notes

- Stateless design → horizontal scaling
- Database agnostic → easy to switch DB
- Services reusable → microservices ready
- Middleware composable → feature additions

---

## Testing Strategy

- Unit: Test individual functions
- Integration: Test with mock DB
- E2E: Test complete request cycles

---

## Deployment Readiness

- ✅ Environment variables for config
- ✅ Error handling without leaks
- ✅ Logging infrastructure
- ✅ Monitoring ready (APM)
- ✅ Database migration scripts
- ✅ Health check endpoint

