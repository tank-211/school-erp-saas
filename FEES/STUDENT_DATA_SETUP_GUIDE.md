# Student Data Collection and Database Setup Guide

## Overview
Your Fee Management System is designed to collect all student information and store it in PostgreSQL database using Prisma ORM. This guide explains how to properly set up and verify that all student data is being stored and retrieved from the database.

---

## Current Architecture

### Database: PostgreSQL (via Docker)
- **Host**: localhost
- **Port**: 5432
- **Database**: fee_management
- **Username**: postgres
- **Password**: postgres

### Backend Server
- **Location**: `/backend/src/server.ts` (TypeScript with Prisma)
- **Port**: 5000
- **Database Client**: Prisma ORM

### Student Management System
- **Service**: `/backend/src/services/studentService.ts`
- **Controller**: `/backend/src/controllers/studentController.ts`
- **Routes**: `/backend/src/routes/studentRoutes.ts`

---

## Setup Instructions

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Environment Configuration
Create/update `.env` file in the backend directory with:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fee_management?schema=public

# Server
NODE_ENV=development
PORT=5000
HOST=localhost

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# JWT
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here

# Logging
LOG_LEVEL=debug

# File Upload
MAX_FILE_SIZE=10485760
```

### Step 3: Start PostgreSQL Database
```bash
# Using Docker Compose
docker-compose up -d

# Verify database is running
docker ps
```

### Step 4: Run Prisma Migrations
```bash
# Generate Prisma Client
npm run prisma:generate

# Run all pending migrations
npm run prisma:migrate

# View database with Prisma Studio
npm run prisma:studio
```

### Step 5: Start the Server
```bash
# Development mode with auto-reload
npm run dev

# Production build
npm run build
npm start
```

The server should start at `http://localhost:5000` and you should see:
```
✓ Server running on http://localhost:5000
✓ Prisma connected to database
✓ Routes initialized
```

---

## Student Data Fields

When creating or updating a student, the following information is stored:

```javascript
{
  // Required Fields
  "studentId": "STU001",          // Unique student ID
  "firstName": "John",             // First name
  "lastName": "Doe",               // Last name
  "courseId": "course-id-uuid",   // ID of enrolled course
  "classId": "class-id-uuid",     // ID of assigned class

  // Optional Personal Information
  "email": "john@example.com",     // Email address
  "phone": "+1234567890",          // Phone number
  "dateOfBirth": "2005-05-15",    // Date of birth
  "gender": "Male",                // Gender

  // Optional Address Information
  "street": "123 Main St",         // Street address
  "city": "New York",              // City
  "state": "NY",                   // State/Province
  "postalCode": "10001",           // Postal code
  "country": "USA",                // Country

  // Optional Parent Information
  "parentId": "parent-id-uuid"    // ID of parent record (optional)
}
```

---

## API Endpoints for Student Management

### 1. Create a Student
**POST** `/api/students`

```bash
curl -X POST http://localhost:5000/api/students \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STU001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "city": "New York",
    "courseId": "COURSE-UUID",
    "classId": "CLASS-UUID"
  }'
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Student created successfully",
  "data": {
    "id": "student-uuid",
    "studentId": "STU001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "city": "New York",
    "courseId": "COURSE-UUID",
    "classId": "CLASS-UUID",
    "status": "ACTIVE",
    "enrollmentDate": "2026-04-29T10:30:00.000Z",
    "createdAt": "2026-04-29T10:30:00.000Z",
    "course": { "id": "...", "name": "...", "code": "..." },
    "class": { "id": "...", "name": "...", "code": "..." }
  }
}
```

### 2. Get Student Details
**GET** `/api/students/:id`

```bash
curl -X GET http://localhost:5000/api/students/student-uuid \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response**:
```json
{
  "success": true,
  "message": "Student retrieved successfully",
  "data": {
    "id": "student-uuid",
    "studentId": "STU001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "dateOfBirth": "2005-05-15",
    "gender": "Male",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA",
    "status": "ACTIVE",
    "enrollmentDate": "2026-04-29T10:30:00.000Z",
    "course": { "id": "...", "name": "...", "code": "..." },
    "class": { "id": "...", "name": "...", "code": "..." },
    "feePayments": [...],
    "createdAt": "2026-04-29T10:30:00.000Z",
    "updatedAt": "2026-04-29T10:30:00.000Z"
  }
}
```

### 3. Update Student Information
**PUT** `/api/students/:id`

```bash
curl -X PUT http://localhost:5000/api/students/student-uuid \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "city": "Los Angeles",
    "state": "CA"
  }'
```

### 4. Search/List Students
**GET** `/api/students/search`

```bash
curl -X GET 'http://localhost:5000/api/students/search?search=John&city=New%20York&page=1&limit=10' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response**:
```json
{
  "success": true,
  "message": "Students retrieved successfully",
  "data": [
    {
      "id": "student-uuid",
      "studentId": "STU001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "course": { "id": "...", "name": "..." },
      "class": { "id": "...", "name": "..." }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

### 5. Get Student Statistics
**GET** `/api/students/stats`

```bash
curl -X GET http://localhost:5000/api/students/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 150,
    "active": 145,
    "byCourse": [
      { "courseId": "course-1", "_count": 50 },
      { "courseId": "course-2", "_count": 95 }
    ]
  }
}
```

### 6. Bulk Upload Students (CSV/Excel)
**POST** `/api/students/bulk-upload`

```bash
curl -X POST http://localhost:5000/api/students/bulk-upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@students.csv"
```

**CSV Format**:
```
studentId,firstName,lastName,email,phone,city,state,courseId,classId,parentPhone
STU001,John,Doe,john@example.com,1234567890,New York,NY,COURSE-UUID,CLASS-UUID,9876543210
STU002,Jane,Smith,jane@example.com,1234567891,Los Angeles,CA,COURSE-UUID,CLASS-UUID,9876543211
```

---

## Verify Data is Being Stored

### Method 1: Using Prisma Studio
```bash
npm run prisma:studio
```
- Opens web interface at `http://localhost:5555`
- Browse Student table directly
- See all fields and relationships

### Method 2: Using PostgreSQL Client
```bash
# Connect to PostgreSQL
psql -h localhost -U postgres -d fee_management

# View all students
SELECT id, "studentId", "firstName", "lastName", email, city, status, "enrollmentDate" FROM "Student" ORDER BY "createdAt" DESC;

# View student count
SELECT COUNT(*) FROM "Student";

# View students by status
SELECT status, COUNT(*) FROM "Student" GROUP BY status;
```

### Method 3: Test API Endpoints
```bash
# Get all students
curl http://localhost:5000/api/students/search \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check response includes all student data
```

---

## Common Issues and Solutions

### Issue: "Student created but not showing in database"
**Solution**: 
- Ensure migrations have been run: `npm run prisma:migrate`
- Check PostgreSQL is running: `docker ps`
- Verify DATABASE_URL in .env

### Issue: "Prisma Client not found"
**Solution**:
```bash
npm install
npm run prisma:generate
```

### Issue: "Connection refused at localhost:5432"
**Solution**:
```bash
# Start Docker containers
docker-compose up -d

# Check if running
docker ps | grep postgres
```

### Issue: "JWT Token validation failed"
**Solution**:
- Get valid token from `/api/auth/login`
- Include in header: `Authorization: Bearer TOKEN`

---

## Data Flow Diagram

```
Frontend (Create Student Form)
        ↓
POST /api/students
        ↓
Student Controller (validates input)
        ↓
Student Service (processes data)
        ↓
Prisma Client (ORM)
        ↓
PostgreSQL Database (stores data)
        ↓
Data persisted in Student table
        ↓
GET /api/students/:id (retrieve stored data)
        ↓
Frontend (displays student information)
```

---

## Database Schema (Student Table)

```sql
-- Student table structure
CREATE TABLE "Student" (
  id TEXT PRIMARY KEY,
  "studentId" TEXT UNIQUE NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  "dateOfBirth" TIMESTAMP,
  gender TEXT,
  street TEXT,
  city TEXT,
  state TEXT,
  "postalCode" TEXT,
  country TEXT,
  "courseId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "enrollmentDate" TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  "isVerified" BOOLEAN DEFAULT false,
  "parentId" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP,
  
  FOREIGN KEY ("courseId") REFERENCES "Course"(id),
  FOREIGN KEY ("classId") REFERENCES "Class"(id),
  FOREIGN KEY ("parentId") REFERENCES "Parent"(id)
);

-- Indexes for performance
CREATE INDEX idx_student_id ON "Student"("studentId");
CREATE INDEX idx_email ON "Student"(email);
CREATE INDEX idx_city ON "Student"(city);
CREATE INDEX idx_status ON "Student"(status);
CREATE INDEX idx_course_id ON "Student"("courseId");
CREATE INDEX idx_class_id ON "Student"("classId");
```

---

## Testing Student Data Collection

### Test 1: Create Single Student
```bash
# 1. Get authentication token
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  | jq -r '.data.accessToken')

# 2. Create student with all information
curl -X POST http://localhost:5000/api/students \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STU001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "dateOfBirth": "2005-05-15",
    "gender": "Male",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA",
    "courseId": "COURSE-UUID",
    "classId": "CLASS-UUID"
  }' | jq

# 3. Verify in database
curl http://localhost:5000/api/students/search \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | {id, firstName, lastName, city, email}'
```

### Test 2: Verify All Fields Stored
```bash
# Query specific student
curl http://localhost:5000/api/students/STUDENT-UUID \
  -H "Authorization: Bearer $TOKEN" | jq '.data | {firstName, lastName, email, phone, city, state, country, enrollmentDate}'
```

### Test 3: Bulk Upload
1. Create CSV file with student data
2. Upload via API
3. Verify all records in database

---

## Next Steps

1. ✅ Set up PostgreSQL database
2. ✅ Run Prisma migrations
3. ✅ Start TypeScript server
4. ✅ Create test students via API
5. ✅ Verify data in database
6. ✅ Connect frontend to API endpoints
7. ✅ Display student data from database

---

## Support and Resources

- **Prisma Documentation**: https://www.prisma.io/docs/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Express.js Documentation**: https://expressjs.com/
- **Docker Documentation**: https://docs.docker.com/

