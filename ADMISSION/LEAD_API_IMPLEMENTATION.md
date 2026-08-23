# Add New Lead API - Implementation Summary

## Overview

Complete Node.js + Express + PostgreSQL backend implementation for Lead management in the School ERP system. Uses plain SQL with parameterized queries (no ORM) and JWT authentication.

---

## Files Created/Updated

### 1. **middleware/auth.js** ✅

JWT Authentication Middleware

**Purpose**: Protects all lead routes by verifying JWT tokens

**Key Features**:

- Accepts tokens from `Authorization: Bearer <token>` header or `x-access-token` header
- Verifies token using `process.env.JWT_SECRET`
- Sets `req.user` with decoded payload: `{ id, school_id, role, ...rest }`
- Returns 401 for missing/invalid/expired tokens
- Returns 500 for internal auth errors

**Usage**:

```javascript
import { authMiddleware } from "../middleware/auth.js";
router.use(authMiddleware); // Protects all routes below this line
```

**Environment Variable Required**:

```
JWT_SECRET=your-secret-key
```

---

### 2. **db/pool.js** ✅

PostgreSQL Connection Pool

**Purpose**: Manages database connections using the `pg` npm package

**Configuration**:

- Reads from environment variables: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Pool size: 20 connections
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds

**Environment Variables Required**:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=school_erp
DB_USER=postgres
DB_PASSWORD=your-password
```

**Exports**: Default export of the Pool instance

---

### 3. **db/queries/leadQueries.js** ✅

SQL Query Functions

**Functions**:

#### `createLead(data)`

- **Purpose**: INSERT new lead into database
- **Input**: Object with lead fields
- **Returns**: Created lead row (full record with id, timestamps, etc.)
- **SQL**: Parameterized INSERT with RETURNING \*
- **Default Values**: `follow_up_status` defaults to 'pending' if not provided

```javascript
const newLead = await createLead({
  school_id: 1,
  academic_year_id: 5,
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com",
  phone: "9876543210",
  desired_class: "Grade 5",
  source: "Website",
  follow_up_status: "pending",
  notes: "Interested in admission",
  assigned_to: null,
  follow_up_date: "2026-04-15",
  created_by: 123,
});
// Returns: { id: 1, school_id: 1, ..., created_at: '2026-03-30T...', ... }
```

#### `getAllLeads(school_id, filters)`

- **Purpose**: SELECT all leads for a school with optional filtering
- **Input**: `school_id` (number), `filters` object (optional)
- **Filters**: `{ follow_up_status, desired_class, assigned_to }`
- **Returns**: Array of lead rows
- **Ordering**: By `created_at DESC` (newest first)
- **SQL**: Dynamic query with parameterized conditions

```javascript
const leads = await getAllLeads(1, {
  follow_up_status: "pending",
  desired_class: "Grade 5",
});
// Returns: [{ id: 1, ... }, { id: 2, ... }, ...]
```

#### `getLeadById(id, school_id)`

- **Purpose**: SELECT single lead by ID (tenant-scoped)
- **Input**: Lead ID, School ID
- **Returns**: Lead row object or undefined
- **SQL**: WHERE id = $1 AND school_id = $2 (ensures tenant isolation)

```javascript
const lead = await getLeadById(1, 1);
// Returns: { id: 1, school_id: 1, ... } or undefined
```

#### `updateLead(id, school_id, data)`

- **Purpose**: UPDATE lead record (partial updates supported)
- **Input**: Lead ID, School ID, data object (any fields)
- **Returns**: Updated lead row or undefined
- **SQL**: COALESCE for partial updates, WHERE clause ensures tenant isolation
- **Updates**: Sets `updated_at` to NOW() automatically

```javascript
const updated = await updateLead(1, 1, {
  follow_up_status: "contacted",
  notes: "Called parent",
});
// Returns: { id: 1, follow_up_status: 'contacted', updated_at: '2026-03-30T...', ... }
```

#### `deleteLead(id, school_id)`

- **Purpose**: DELETE lead record
- **Input**: Lead ID, School ID
- **Returns**: Boolean (true if deleted, false if not found)
- **SQL**: DELETE WHERE id = $1 AND school_id = $2

```javascript
const deleted = await deleteLead(1, 1);
// Returns: true or false
```

---

### 4. **controllers/leadController.js** ✅

HTTP Request Handlers

**Error Handling**: All functions use try/catch with `next(error)` for centralized error handling

**Security**:

- `school_id` ALWAYS from `req.user.school_id` (never from request body)
- `created_by` ALWAYS from `req.user.id` (never from request body)

#### `createLead(req, res, next)`

- **Route**: POST /api/leads
- **Validation**: Phone must be present and non-empty
- **Returns**: 201 `{ success: true, data: leadRow, message: "Lead created successfully." }`
- **Error**: 400 if phone missing

```javascript
// Request Body:
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "9876543210", // REQUIRED
  "desired_class": "Grade 5",
  "source": "Website",
  "academic_year_id": 5,
  "notes": "Interested"
}

// Response (201):
{
  "success": true,
  "data": {
    "id": 1,
    "school_id": 1,
    "first_name": "John",
    "phone": "9876543210",
    "created_by": 123,
    "created_at": "2026-03-30T10:30:00Z",
    ...
  },
  "message": "Lead created successfully."
}
```

#### `getAllLeads(req, res, next)`

- **Route**: GET /api/leads
- **Query Params**: `follow_up_status`, `desired_class`, `assigned_to` (all optional)
- **Returns**: 200 `{ success: true, data: [leadRows] }`
- **Scope**: Only returns leads for authenticated school

```javascript
// Request:
GET /api/leads?follow_up_status=pending&desired_class=Grade%205

// Response (200):
{
  "success": true,
  "data": [
    {
      "id": 1,
      "first_name": "John",
      "follow_up_status": "pending",
      ...
    },
    {
      "id": 2,
      "first_name": "Jane",
      "follow_up_status": "pending",
      ...
    }
  ]
}
```

#### `getLeadById(req, res, next)`

- **Route**: GET /api/leads/:id
- **Returns**: 200 `{ success: true, data: leadRow }` or 404 `{ success: false, message: "Lead not found." }`
- **Scope**: Tenant-isolated query

```javascript
// Response (200):
{
  "success": true,
  "data": {
    "id": 1,
    "school_id": 1,
    "first_name": "John",
    ...
  }
}

// Response (404):
{
  "success": false,
  "message": "Lead not found."
}
```

#### `updateLead(req, res, next)`

- **Route**: PUT /api/leads/:id
- **Body**: Any lead field except `school_id` and `created_by`
- **Returns**: 200 `{ success: true, data: updatedRow, message: "Lead updated successfully." }` or 404
- **Scope**: Tenant-isolated update

```javascript
// Request Body:
{
  "follow_up_status": "contacted",
  "notes": "Followed up, parent interested"
}

// Response (200):
{
  "success": true,
  "data": {
    "id": 1,
    "follow_up_status": "contacted",
    "notes": "Followed up, parent interested",
    "updated_at": "2026-03-30T11:00:00Z",
    ...
  },
  "message": "Lead updated successfully."
}
```

#### `deleteLead(req, res, next)`

- **Route**: DELETE /api/leads/:id
- **Returns**: 204 (no content) on success or 404 `{ success: false, message: "Lead not found." }`
- **Scope**: Tenant-isolated deletion

```javascript
// Response (204):
// No body, just status code

// Response (404):
{
  "success": false,
  "message": "Lead not found."
}
```

---

### 5. **routes/leadRoutes.js** ✅

API Route Definitions

**Base Path**: `/api/leads`

**Auth**: All routes protected by `authMiddleware` (requires valid JWT token)

**Routes**:

| Method | Path             | Handler       | Status Codes       |
| ------ | ---------------- | ------------- | ------------------ |
| POST   | `/api/leads`     | `createLead`  | 201, 400, 401, 500 |
| GET    | `/api/leads`     | `getAllLeads` | 200, 401, 500      |
| GET    | `/api/leads/:id` | `getLeadById` | 200, 404, 401, 500 |
| PUT    | `/api/leads/:id` | `updateLead`  | 200, 404, 401, 500 |
| DELETE | `/api/leads/:id` | `deleteLead`  | 204, 404, 401, 500 |

---

## API Integration in app.js

**Already integrated** at application startup:

```javascript
import leadRoutes from "./routes/leadRoutes.js";
app.use("/api/leads", leadRoutes);
```

---

## Database Schema - LEAD Table

```sql
CREATE TABLE lead (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES school(id) ON DELETE CASCADE,
  academic_year_id BIGINT NOT NULL REFERENCES academic_year(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20) NOT NULL,

  source VARCHAR(100),
  follow_up_status VARCHAR(50) DEFAULT 'pending' CHECK (
    follow_up_status IN (
      'pending', 'contacted', 'interested',
      'not-interested', 'converted', 'lost'
    )
  ),
  notes TEXT,
  assigned_to VARCHAR(100),
  follow_up_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100),
  last_contacted_at TIMESTAMP
);
```

---

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install pg dotenv jsonwebtoken
```

### 2. Create .env File

```bash
touch .env
```

**Content**:

```
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=school_erp
DB_USER=postgres
DB_PASSWORD=your-password

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars!

# Backend
PORT=5000
NODE_ENV=development
```

### 3. Create Database

```bash
# Using psql
psql -U postgres -c "CREATE DATABASE school_erp;"

# Run schema
psql -U postgres -d school_erp -f backend/database/schema.sql
```

### 4. Start Backend Server

```bash
npm start
# Or for development with auto-restart:
npm run dev
```

---

## Testing the API

### Using cURL

**1. Create a Lead**

```bash
curl -X POST http://localhost:5000/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "desired_class": "Grade 5",
    "source": "Website",
    "academic_year_id": 1,
    "notes": "Interested in admission"
  }'
```

**2. Get All Leads**

```bash
curl -X GET "http://localhost:5000/api/leads?follow_up_status=pending" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**3. Get Lead by ID**

```bash
curl -X GET http://localhost:5000/api/leads/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**4. Update a Lead**

```bash
curl -X PUT http://localhost:5000/api/leads/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "follow_up_status": "contacted",
    "notes": "Followed up with parent"
  }'
```

**5. Delete a Lead**

```bash
curl -X DELETE http://localhost:5000/api/leads/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Generating a Test JWT Token

For testing without a full auth service:

```javascript
// In Node.js REPL or a test file:
import jwt from "jsonwebtoken";

const token = jwt.sign(
  {
    id: 1, // User ID (app_user)
    school_id: 1, // School ID (tenant)
    role: "admin",
  },
  "your-super-secret-key-min-32-chars!",
  { expiresIn: "1h" },
);

console.log(token);
```

---

## Response Format Standards

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description here"
}
```

---

## Security Features

✅ **JWT Authentication**: All routes protected  
✅ **Parameterized Queries**: Prevents SQL injection  
✅ **Tenant Isolation**: `school_id` enforced for all queries  
✅ **User Context**: `created_by` and auth checks prevent unauthorized modifications  
✅ **Input Validation**: Phone is required and validated  
✅ **Error Handling**: Centralized error handler with try/catch blocks

---

## Key Implementation Rules Followed

1. ✅ Uses plain SQL with parameterized queries ($1, $2, etc.) - no ORM
2. ✅ `school_id` ALWAYS from `req.user.school_id`, never from request body
3. ✅ `created_by` ALWAYS from `req.user.id`
4. ✅ All functions use try/catch with `next(err)` for error handling
5. ✅ Consistent JSON response shape: `{ success: bool, data?, message? }`
6. ✅ All comments explain what each function does
7. ✅ Returns proper HTTP status codes (201 for create, 204 for delete, 404 for not found)
8. ✅ Query params for optional filters, not required body fields

---

## Files Summary

| File                            | Status     | Purpose                    |
| ------------------------------- | ---------- | -------------------------- |
| `middleware/auth.js`            | ✅ Created | JWT authentication         |
| `db/pool.js`                    | ✅ Updated | PostgreSQL connection pool |
| `db/queries/leadQueries.js`     | ✅ Updated | SQL query functions        |
| `controllers/leadController.js` | ✅ Updated | HTTP handlers              |
| `routes/leadRoutes.js`          | ✅ Updated | API routes with auth       |

All files are production-ready and fully documented!

I have made those changes in the database; now give me a prompt for creating backend logic including all route controllers and services files and connection to the front end for:

1. Total Inquiries
2. Conversion Rate
3. Active Leads
4. Enrolled Student
5. Pending Applications
6. Offers Sent
7. Fees Collected.
   Also, describe which table and its column will connect to which widget.
