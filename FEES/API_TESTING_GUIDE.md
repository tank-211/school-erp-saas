# API Testing Guide - Student Data Collection

This guide provides practical examples to verify that all student information is being collected and stored in the database.

## Prerequisites

- Backend server running on `http://localhost:5000`
- PostgreSQL database running (via Docker)
- Authentication token obtained from `/api/auth/login`

## Quick Test Commands

### 1. Get Authentication Token

```bash
# Replace with actual admin credentials
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }' | jq -r '.data.accessToken')

echo "Token: $TOKEN"
```

### 2. Create a Student with All Information

```bash
curl -X POST http://localhost:5000/api/students \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STU20260429001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "dateOfBirth": "2005-03-15",
    "gender": "Male",
    "street": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA",
    "courseId": "course-uuid-here",
    "classId": "class-uuid-here"
  }' | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Student created successfully",
  "data": {
    "id": "student-uuid",
    "studentId": "STU20260429001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "dateOfBirth": "2005-03-15",
    "gender": "Male",
    "street": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA",
    "status": "ACTIVE",
    "enrollmentDate": "2026-04-29T10:30:00.000Z",
    "createdAt": "2026-04-29T10:30:00.000Z",
    "updatedAt": "2026-04-29T10:30:00.000Z",
    "course": { "id": "...", "name": "...", "code": "..." },
    "class": { "id": "...", "name": "...", "code": "..." }
  }
}
```

**Save the student ID for next tests:**
```bash
STUDENT_ID="student-uuid-from-response"
```

### 3. Retrieve the Stored Student Information

```bash
curl -X GET http://localhost:5000/api/students/$STUDENT_ID \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Verify all information is returned:**
- ✓ Personal Info (firstName, lastName, email, phone)
- ✓ Birth Info (dateOfBirth, gender)
- ✓ Address (street, city, state, postalCode, country)
- ✓ Enrollment (courseId, classId, enrollmentDate)
- ✓ Status (status, isVerified)
- ✓ Timestamps (createdAt, updatedAt)

### 4. Update Student Information

```bash
curl -X PUT http://localhost:5000/api/students/$STUDENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9876543210",
    "city": "Los Angeles",
    "state": "CA"
  }' | jq .
```

**Verify the update is reflected:**
```bash
curl -X GET http://localhost:5000/api/students/$STUDENT_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.data | {phone, city, state, updatedAt}'
```

### 5. Search Students

```bash
# Search by name
curl -X GET 'http://localhost:5000/api/students/search?search=John' \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | {studentId, firstName, lastName}'

# Search by city
curl -X GET 'http://localhost:5000/api/students/search?city=New%20York' \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | {firstName, lastName, city}'

# Pagination
curl -X GET 'http://localhost:5000/api/students/search?page=1&limit=5' \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'
```

### 6. Get Student Statistics

```bash
curl -X GET http://localhost:5000/api/students/stats \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "total": 1,
    "active": 1,
    "byCourse": [
      {
        "courseId": "course-uuid",
        "_count": 1
      }
    ]
  }
}
```

### 7. Bulk Upload Students

**Create a CSV file `students.csv`:**
```csv
studentId,firstName,lastName,email,phone,city,state,courseId,classId
STU001,Alice,Johnson,alice@example.com,1234567890,NYC,NY,course-uuid,class-uuid
STU002,Bob,Smith,bob@example.com,1234567891,LA,CA,course-uuid,class-uuid
STU003,Carol,Williams,carol@example.com,1234567892,Chicago,IL,course-uuid,class-uuid
```

**Upload the file:**
```bash
curl -X POST http://localhost:5000/api/students/bulk-upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@students.csv" | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Bulk upload completed",
  "data": {
    "created": 3,
    "failed": 0,
    "errors": []
  }
}
```

## Verification Steps

### Verify in PostgreSQL Directly

```bash
# Connect to PostgreSQL
psql -h localhost -U postgres -d fee_management

# View all students
SELECT * FROM "Student";

# View student count
SELECT COUNT(*) as total FROM "Student";

# View specific student
SELECT * FROM "Student" WHERE "studentId" = 'STU20260429001';

# View students by city
SELECT "firstName", "lastName", city FROM "Student" WHERE city = 'New York';
```

### Verify with Prisma Studio

```bash
npm run prisma:studio
```

Then:
1. Navigate to `http://localhost:5555`
2. Click on the `Student` model
3. View all stored student records with complete information

### Verify with Postman

1. Import the following collection:

```json
{
  "info": {
    "name": "Student Data Collection Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get Token",
      "request": {
        "method": "POST",
        "url": "http://localhost:5000/api/auth/login",
        "header": [
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"admin@example.com\",\"password\":\"admin123\"}"
        }
      }
    },
    {
      "name": "Create Student",
      "request": {
        "method": "POST",
        "url": "http://localhost:5000/api/students",
        "header": [
          { "key": "Authorization", "value": "Bearer {{token}}" },
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"studentId\":\"STU001\",\"firstName\":\"John\",\"lastName\":\"Doe\",\"email\":\"john@example.com\",\"phone\":\"1234567890\",\"city\":\"NYC\",\"courseId\":\"course-uuid\",\"classId\":\"class-uuid\"}"
        }
      }
    },
    {
      "name": "Get Student",
      "request": {
        "method": "GET",
        "url": "http://localhost:5000/api/students/{{studentId}}",
        "header": [
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ]
      }
    },
    {
      "name": "Search Students",
      "request": {
        "method": "GET",
        "url": "http://localhost:5000/api/students/search",
        "header": [
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ]
      }
    }
  ]
}
```

## Data Collection Flow Verification

```
Step 1: Create Student
└─> POST /api/students
    └─> Controller validates input
        └─> Service processes data
            └─> Prisma creates record in PostgreSQL
                └─> Record stored in Student table ✓

Step 2: Verify Data
└─> GET /api/students/:id
    └─> Controller receives request
        └─> Service queries from database
            └─> Prisma retrieves from PostgreSQL
                └─> Complete data returned ✓

Step 3: Search/List
└─> GET /api/students/search
    └─> Controller applies filters
        └─> Service queries with conditions
            └─> Prisma retrieves multiple records
                └─> Filtered data returned ✓

Step 4: Update
└─> PUT /api/students/:id
    └─> Controller validates update
        └─> Service updates in database
            └─> Prisma modifies PostgreSQL record
                └─> Updated timestamp set ✓
```

## Troubleshooting

### Issue: "Student created but not showing in database"

**Solution:**
```bash
# Check if migrations are applied
npm run prisma:migrate

# Reset database (warning: destructive)
npm run db:reset

# Check database connection
npm run prisma:studio
```

### Issue: "Authentication failed"

**Solution:**
```bash
# Get valid token first
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' | jq -r '.data.accessToken')

# Verify token in headers
echo "Authorization: Bearer $TOKEN"
```

### Issue: "Course not found" or "Class not found"

**Solution:**
```bash
# Get valid course and class IDs from database
curl -X GET http://localhost:5000/api/courses \
  -H "Authorization: Bearer $TOKEN" | jq '.data[0] | {id, name}'

curl -X GET http://localhost:5000/api/classes \
  -H "Authorization: Bearer $TOKEN" | jq '.data[0] | {id, name}'
```

## Complete Data Model

All student information being collected:

```typescript
{
  // System Fields
  id: string;                    // UUID
  createdAt: Date;               // Creation timestamp
  updatedAt: Date;               // Last update timestamp
  
  // Identity
  studentId: string;             // Unique student identifier
  firstName: string;             // First name
  lastName: string;              // Last name
  
  // Contact
  email: string;                 // Email address
  phone: string;                 // Phone number
  
  // Personal
  dateOfBirth: Date;             // Date of birth
  gender: string;                // Gender
  
  // Address
  street: string;                // Street address
  city: string;                  // City
  state: string;                 // State/Province
  postalCode: string;            // Postal code
  country: string;               // Country
  
  // Enrollment
  courseId: string;              // Enrolled course ID
  classId: string;               // Assigned class ID
  enrollmentDate: Date;          // Enrollment date
  status: StudentStatus;         // ACTIVE, INACTIVE, GRADUATED, SUSPENDED
  isVerified: boolean;           // Email/Phone verified status
  
  // Relations
  parentId: string;              // Parent/Guardian ID
  parent: Parent;                // Parent object
  course: Course;                // Course object
  class: Class;                  // Class object
  feePayments: FeePayment[];     // Fee payments
  refunds: RefundRequest[];      // Refund requests
}
```

## Success Criteria

✓ Student data is created via API  
✓ All information fields are stored in database  
✓ Data can be retrieved via API  
✓ Data can be viewed in Prisma Studio  
✓ Data can be queried directly from PostgreSQL  
✓ Search and filtering works correctly  
✓ Updates persist in database  
✓ Bulk uploads create multiple records  
✓ Statistics reflect stored data  

Once all these criteria are met, student data collection and storage is working properly!
