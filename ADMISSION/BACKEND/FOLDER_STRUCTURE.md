# Backend Folder Structure Guide

## 📂 Complete Directory Tree

```
backend/
│
├── config/
│   └── db.js
│       ├── Pool configuration
│       ├── Connection management
│       ├── Error handling
│       └── Query execution helper
│
├── controllers/
│   ├── schoolController.js      [School Management]
│   │   ├── getAllSchools()      - Fetch all schools
│   │   ├── getSchoolById()      - Fetch single school
│   │   └── createSchool()       - Create new school
│   │
│   ├── studentController.js     [Student Management]
│   │   ├── getAllStudents()     - Fetch all students w/ pagination
│   │   ├── getStudentById()     - Fetch student with details
│   │   └── createStudent()      - Create new student
│   │
│   └── leadController.js        [Lead Management]
│       ├── getAllLeads()        - Fetch leads with filters
│       ├── getLeadById()        - Fetch single lead
│       ├── createLead()         - Create new lead
│       └── updateLeadStatus()   - Update lead follow-up status
│
├── routes/
│   ├── schoolRoutes.js          [School Endpoints]
│   │   ├── GET /
│   │   ├── GET /:id
│   │   └── POST /
│   │
│   ├── studentRoutes.js         [Student Endpoints]
│   │   ├── GET /
│   │   ├── GET /:id
│   │   └── POST /
│   │
│   └── leadRoutes.js            [Lead Endpoints]
│       ├── GET /
│       ├── GET /:id
│       ├── POST /
│       └── PUT /:id/status
│
├── database/
│   ├── schema.sql               [Complete Database Schema]
│   │   ├── school
│   │   ├── academic_year
│   │   ├── school_class
│   │   ├── section
│   │   ├── student
│   │   ├── parent_detail
│   │   ├── lead
│   │   ├── admission
│   │   ├── fee_structure
│   │   ├── student_fee_assignment
│   │   ├── invoice
│   │   ├── payment
│   │   ├── Views (for reporting)
│   │   └── Sample Data
│   │
│   └── [Other migration files can go here]
│
├── app.js                       [Express Application Setup]
│   ├── Middleware configuration
│   ├── CORS setup
│   ├── Route registration
│   ├── Error handling
│   └── Health check endpoint
│
├── server.js                    [Server Entry Point]
│   ├── Port configuration
│   ├── Server startup
│   └── Graceful shutdown
│
├── .env                         [Environment Variables] ⚠️ GITIGNORE
│   ├── NODE_ENV
│   ├── PORT
│   ├── DB_HOST/PORT/USER/PASSWORD/NAME
│   ├── Connection pool settings
│   └── CORS configuration
│
├── .env.example                 [Example Environment File]
│   └── Template for .env
│
├── package.json                 [Dependencies]
│   ├── express
│   ├── pg
│   ├── cors
│   ├── dotenv
│   └── Other dependencies
│
├── DATABASE_SETUP.md            [Database Setup Guide]
│   ├── Prerequisites
│   ├── Installation steps
│   ├── Schema loading
│   ├── Verification
│   └── Troubleshooting
│
├── API_DOCUMENTATION.md         [API Reference]
│   ├── Endpoints
│   ├── Request/Response formats
│   ├── Example cURL commands
│   └── Status codes
│
├── BACKEND_README.md            [Backend Overview]
│   ├── Features
│   ├── Quick start
│   ├── Configuration
│   └── Troubleshooting
│
└── FOLDER_STRUCTURE.md          [This File]
    └── Detailed folder explanation
```

---

## 📋 Module Responsibilities

### 📁 config/

**Responsibility:** Application configuration and database connection

**Files:**

- `db.js` - PostgreSQL connection pool
  - Initializes pg.Pool
  - Configures connection parameters from environment variables
  - Handles connection errors
  - Provides query execution with logging
  - Exports pool for use in controllers

**Usage:**

```javascript
const pool = require("./config/db");
const result = await pool.query("SELECT * FROM school");
```

---

### 📁 controllers/

**Responsibility:** Handle HTTP requests and implement business logic

**Pattern:**

```
Request → Validate → Query Database → Format Response → Send Response
```

**Files:**

#### schoolController.js

- `getAllSchools()` - Retrieves all schools
- `getSchoolById()` - Retrieves specific school
- `createSchool()` - Creates new school record

#### studentController.js

- `getAllStudents()` - Paginated student list
- `getStudentById()` - Student with parents & admissions
- `createStudent()` - Creates new student

#### leadController.js

- `getAllLeads()` - Filtered lead list
- `getLeadById()` - Lead details
- `createLead()` - Creates new lead
- `updateLeadStatus()` - Updates follow-up status

**Error Handling Pattern:**

```javascript
try {
  // Database operations
  const result = await pool.query(sql, params);

  // Response
  res.status(200).json({
    success: true,
    data: result.rows,
  });
} catch (error) {
  // Error response
  res.status(500).json({
    success: false,
    error: error.message,
  });
}
```

---

### 📁 routes/

**Responsibility:** Define API endpoints and map to controllers

**Pattern:**

```
Route → Method → Controller Function → Database
```

**Files:**

#### schoolRoutes.js

```
GET    /api/schools           → getAllSchools
GET    /api/schools/:id       → getSchoolById
POST   /api/schools           → createSchool
```

#### studentRoutes.js

```
GET    /api/students          → getAllStudents
GET    /api/students/:id      → getStudentById
POST   /api/students          → createStudent
```

#### leadRoutes.js

```
GET    /api/leads             → getAllLeads
GET    /api/leads/:id         → getLeadById
POST   /api/leads             → createLead
PUT    /api/leads/:id/status  → updateLeadStatus
```

**Route Structure:**

```javascript
const express = require("express");
const router = express.Router();
const controller = require("../controllers/...");

router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.post("/", controller.create);

module.exports = router;
```

---

### 📁 database/

**Responsibility:** Database schema and data persistence

**Files:**

#### schema.sql

Complete SQL script containing:

1. **Table Definitions**
   - school (Multi-tenant root)
   - academic_year (Academic periods)
   - school_class (Grades/Classes)
   - section (Class sections)
   - student (Student records)
   - parent_detail (Parent information)
   - lead (Prospective students)
   - admission (Admission records)
   - fee_structure (Fee configuration)
   - student_fee_assignment (Fee assignments)
   - invoice (Fee invoices)
   - payment (Payment records)

2. **Indexes** for performance
   - Primary keys
   - Foreign key columns
   - Filter columns (status, email, etc.)

3. **Constraints**
   - Foreign keys with ON DELETE CASCADE
   - Unique constraints
   - Check constraints for validation
   - Default values (timestamps, status)

4. **Sample Data**
   - 1 School
   - 1 Academic year
   - 3 Classes
   - 3 Sections
   - 1 Student with parent
   - 1 Lead
   - 1 Admission
   - 3 Fee structures
   - Sample invoices and payments

5. **Views** for reporting
   - student_enrollment_view
   - student_fee_summary_view

---

### 📄 app.js

**Responsibility:** Express application configuration

**Contains:**

```javascript
- Import dependencies (express, cors, dotenv)
- Import routes
- Create Express app
- Configure middleware
  ├── CORS
  ├── Body parser
  └── Request logging
- Register routes
  ├── /api/schools
  ├── /api/students
  └── /api/leads
- Health check endpoint
- Error handling
  ├── 404 handler
  └── Global error handler
```

**Middleware Order (Important!):**

1. CORS configuration
2. Body parsing
3. Request logging
4. Route handlers
5. 404 handler
6. Error handler (last!)

---

### 📄 server.js

**Responsibility:** Server entry point

**Functions:**

- Loads environment variables
- Imports Express app
- Configures port/host
- Starts server
- Handles graceful shutdown
- Catches uncaught exceptions
- Displays startup information

**Startup Output:**

```
┌─────────────────────────────────────────────────┐
│  School ERP Backend Server Started Successfully │
├─────────────────────────────────────────────────┤
│ Server:      http://localhost:5000              │
│ Environment: DEVELOPMENT                        │
│ Database:    admission@localhost                │
│ Health Check: GET /api/health                   │
└─────────────────────────────────────────────────┘
```

---

## 🔄 Request Flow Example

### Example: Create a Student

```
1. CLIENT
   Creates POST request to http://localhost:5000/api/students
   with JSON body:
   {
     "school_id": 1,
     "admission_number": "ADM123",
     "first_name": "John",
     ...
   }

2. SERVER.JS
   - Receives request
   - Passes to Express app

3. APP.JS
   - CORS middleware allows request
   - Body parser extracts JSON
   - Logging middleware logs request
   - Router matches POST /api/students

4. ROUTES/studentRoutes.js
   - POST / matches
   - Calls studentController.createStudent()

5. CONTROLLERS/studentController.js
   - Extracts data from req.body
   - Validates required fields
   - Calls pool.query() with SQL INSERT

6. CONFIG/db.js
   - Executes SQL query on PostgreSQL
   - Returns result or error

7. CONTROLLERS/studentController.js (continued)
   - Receives result from database
   - Formats JSON response
   - Sends response with status 201

8. CLIENT
   - Receives JSON response
   - New student created in database
```

---

## 📊 Data Flow Diagram

```
┌─────────────────┐
│  HTTP Request   │
│   (Client)      │
└────────┬────────┘
         │
         ↓
┌──────────────────┐
│   server.js      │ - Start server, listen on port
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│    app.js        │ - Setup Express, middleware
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  Middleware      │ - CORS, bodyParser, logging
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│   routes/        │ - Route matching, method checking
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ controllers/     │ - Business logic, validation
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│   config/db.js   │ - Execute SQL query, error handling
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  PostgreSQL      │ - Data persistence, queries
└────────┬─────────┘
         │
         ↓
    (Response flows back through same path)
         │
         ↓
┌──────────────────┐
│  HTTP Response   │ - JSON data sent to client
│   200/400/500    │
└──────────────────┘
```

---

## 🔄 Data Relationships

```
school
  ├── academic_year
  │   ├── admission
  │   └── fee_structure
  ├── school_class
  │   ├── section
  │   │   └── admission
  │   └── fee_structure
  ├── student
  │   ├── parent_detail
  │   ├── admission
  │   │   └── student_fee_assignment
  │   ├── student_fee_assignment
  │   ├── invoice
  │   └── payment
  └── lead
```

---

## ✅ File Checklist

### Configuration

- [ ] .env - Configured with correct DB credentials
- [ ] .env.example - Template for .env
- [ ] package.json - Dependencies installed

### Code Files

- [ ] config/db.js - Database connection
- [ ] controllers/ - All 3 controllers created
- [ ] routes/ - All 3 route files created
- [ ] app.js - Express setup
- [ ] server.js - Server entry point

### Database

- [ ] database/schema.sql - Schema loaded into PostgreSQL

### Documentation

- [ ] DATABASE_SETUP.md - Setup instructions
- [ ] API_DOCUMENTATION.md - API reference
- [ ] BACKEND_README.md - Overview
- [ ] FOLDER_STRUCTURE.md - This file

---

## 🚀 Quick Commands

```bash
# Install dependencies
npm install

# Set up database
createdb admission
psql -U postgres -d admission -f database/schema.sql

# Start server
npm start

# Test endpoints
curl http://localhost:5000/api/schools
```

---

**Backend Structure Ready for Development!** 🎉
