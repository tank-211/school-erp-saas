# School ERP - API Documentation

## 🌐 Base URL

`http://localhost:5001/api`

---

## 🏥 Health Check

Route Name: Check Server Health
Method: GET
Path: /api/health

Description:
Returns the health status of the server, current timestamp, and environment configuration.

Sample Request:
GET /api/health

Expected Response:

```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-03-12T22:31:47.000Z",
  "environment": "development"
}
```

Status Codes:
200 - Success
500 - Server Error

---

## 🏫 Schools Endpoints

Route Name: Get All Schools
Method: GET
Path: /api/schools

Description:
Returns a list of all registered schools in the system with basic details like name, email, and principal.

Sample Request:
GET /api/schools

Expected Response:

```json
{
  "success": true,
  "message": "Schools retrieved successfully",
  "count": 1,
  "data": [
    {
      "id": 1,
      "name": "Green Valley School",
      "email": "info@greenvalley.edu",
      "phone": "+91-9876543210",
      "city": "Delhi",
      "state": "Delhi",
      "principal_name": "Dr. Rajesh Kumar",
      "status": "active",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

Status Codes:
200 - Success
500 - Server Error

---

Route Name: Get School By ID
Method: GET
Path: /api/schools/:id

Description:
Returns complete details of a specific school including address, established year, and full status.

Sample Request:
GET /api/schools/1

Expected Response:

```json
{
  "success": true,
  "message": "School retrieved successfully",
  "data": {
    "id": 1,
    "name": "Green Valley School",
    "email": "info@greenvalley.edu",
    "phone": "+91-9876543210",
    "address": "123, School Road",
    "city": "Delhi",
    "state": "Delhi",
    "postal_code": "110001",
    "country": "India",
    "established_year": 2010,
    "principal_name": "Dr. Rajesh Kumar",
    "status": "active",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

Status Codes:
200 - Success
404 - Not Found
500 - Server Error

---

Route Name: Create School
Method: POST
Path: /api/schools

Description:
Creates a new school entry in the system. Requires at least the school name.

Sample Request:
POST /api/schools

```json
{
  "name": "Sunshine Academy",
  "email": "info@sunshine.edu",
  "phone": "+91-9876543211",
  "address": "456, Education Lane",
  "city": "Mumbai",
  "state": "Maharashtra",
  "principal_name": "Ms. Anjali Sharma"
}
```

Expected Response:

```json
{
  "success": true,
  "message": "School created successfully",
  "data": {
    "id": 2,
    "name": "Sunshine Academy",
    "email": "info@sunshine.edu",
    "status": "active",
    "created_at": "2024-03-12T22:31:47.000Z"
  }
}
```

Status Codes:
201 - Created
400 - Bad Request (e.g., missing name)
500 - Server Error

---

## 👨‍🎓 Students Endpoints

Route Name: Get All Students
Method: GET
Path: /api/students

Description:
Returns a paginated list of students with their associated school name.

Sample Request:
GET /api/students?page=1&limit=10

Expected Response:

```json
{
  "success": true,
  "message": "Students retrieved successfully",
  "data": [
    {
      "id": 1,
      "admission_number": "ADM001",
      "full_name": "Rohan Kumar Singh",
      "email": "rohan@example.com",
      "phone": "+91-9123456789",
      "gender": "Male",
      "status": "active",
      "school_name": "Green Valley School",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "pages": 15
  }
}
```

Status Codes:
200 - Success
500 - Server Error

---

Route Name: Get Student By ID
Method: GET
Path: /api/students/:id

Description:
Returns full student profile, parent/guardian details, and academic history (admissions).

Sample Request:
GET /api/students/1

Expected Response:

```json
{
  "success": true,
  "message": "Student details retrieved successfully",
  "data": {
    "student": {
      "id": 1,
      "admission_number": "ADM001",
      "first_name": "Rohan",
      "last_name": "Singh",
      "school_name": "Green Valley School",
      "status": "active"
    },
    "parents": [
      {
        "relation": "Father",
        "first_name": "Rajesh",
        "last_name": "Singh",
        "phone": "+91-9123456780"
      }
    ],
    "admissions": [
      {
        "class_name": "Class 1",
        "section_name": "A",
        "year_name": "2024-25",
        "status": "active"
      }
    ]
  }
}
```

Status Codes:
200 - Success
404 - Not Found
500 - Server Error

---

Route Name: Create Student
Method: POST
Path: /api/students

Description:
Registers a new student. Requires school_id, admission_number, and first_name.

Sample Request:
POST /api/students

```json
{
  "school_id": 1,
  "admission_number": "ADM002",
  "first_name": "Arjun",
  "last_name": "Verma",
  "date_of_birth": "2014-06-20",
  "gender": "Male",
  "phone": "+91-9123456790"
}
```

Expected Response:

```json
{
  "success": true,
  "message": "Student created successfully",
  "data": {
    "id": 2,
    "admission_number": "ADM002",
    "first_name": "Arjun",
    "last_name": "Verma",
    "status": "active"
  }
}
```

Status Codes:
201 - Created
400 - Bad Request (missing required fields)
500 - Server Error

---

## 📞 Leads Endpoints

Route Name: Get All Leads
Method: GET
Path: /api/leads

Description:
Returns a paginated list of leads with optional filters for school_id and follow_up_status.

Sample Request:
GET /api/leads?school_id=1&status=interested&page=1&limit=10

Expected Response:

```json
{
  "success": true,
  "message": "Leads retrieved successfully",
  "data": [
    {
      "id": 1,
      "first_name": "Arjun",
      "last_name": "Kapoor",
      "follow_up_status": "interested",
      "source": "Website",
      "school_name": "Green Valley School",
      "academic_year": "2024-25"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "pages": 3
  }
}
```

Status Codes:
200 - Success
500 - Server Error

---

Route Name: Get Lead By ID
Method: GET
Path: /api/leads/:id

Description:
Returns detailed information for a specific prospective lead, including notes and assignment.

Sample Request:
GET /api/leads/1

Expected Response:

```json
{
  "success": true,
  "message": "Lead retrieved successfully",
  "data": {
    "id": 1,
    "first_name": "Arjun",
    "last_name": "Kapoor",
    "phone": "+91-9876543211",
    "follow_up_status": "interested",
    "notes": "Parent expressed interest in science stream",
    "school_name": "Green Valley School",
    "year_name": "2024-25"
  }
}
```

Status Codes:
200 - Success
404 - Not Found
500 - Server Error

---

Route Name: Create Lead
Method: POST
Path: /api/leads

Description:
Creates a new prospective student lead. Requires school_id, academic_year_id, first_name, and phone.

Sample Request:
POST /api/leads

```json
{
  "school_id": 1,
  "academic_year_id": 1,
  "first_name": "Priya",
  "last_name": "Sharma",
  "email": "priya@example.com",
  "phone": "+91-9999999999",
  "desired_class": "Class 8",
  "source": "Social Media"
}
```

Expected Response:

```json
{
  "success": true,
  "message": "Lead created successfully",
  "data": {
    "id": 2,
    "first_name": "Priya",
    "follow_up_status": "pending",
    "created_at": "2024-03-12T22:31:47.000Z"
  }
}
```

Status Codes:
201 - Created
400 - Bad Request (missing required fields)
500 - Server Error

---

Route Name: Update Lead Status
Method: PUT
Path: /api/leads/:id/status

Description:
Updates the follow-up status, internal notes, and staff assignment for a lead.

Sample Request:
PUT /api/leads/1/status

```json
{
  "follow_up_status": "converted",
  "notes": "Student admitted successfully to Class 6",
  "assigned_to": "principal"
}
```

Expected Response:

```json
{
  "success": true,
  "message": "Lead status updated successfully",
  "data": {
    "id": 1,
    "follow_up_status": "converted",
    "notes": "Student admitted successfully to Class 6",
    "assigned_to": "principal",
    "updated_at": "2024-03-12T22:31:47.000Z"
  }
}
```

Status Codes:
200 - Success
400 - Bad Request (missing status)
404 - Not Found
500 - Server Error

---

## 🎓 Admissions Endpoints

Route Name: Get Admissions Statistics
Method: GET
Path: /api/admissions/stats

Description:
Returns summary counts of all admission applications grouped by their workflow status.

Sample Request:
GET /api/admissions/stats

Expected Response:

```json
{
  "total": 42
}
```

Status Codes:
200 - Success
500 - Server Error

---

Route Name: Search Admissions
Method: GET
Path: /api/admissions/search

Description:
Search for admission applications using student name or parent contact number.

Sample Request:
GET /api/admissions/search?query=Rohan

Expected Response:

```json
{
  "success": true,
  "data": [
    {
      "application_id": "APP_123",
      "student_name": "Rohan Kumar Singh",
      "grade": "Class 5",
      "parent_contact": "+91-9123456780",
      "status": "APPROVED"
    }
  ],
  "message": "Found 1 admission(s) matching your search"
}
```

Status Codes:
200 - Success
400 - Bad Request (missing query parameter)
500 - Server Error

---

Route Name: Get All Admissions
Method: GET
Path: /api/admissions

Description:
Returns a paginated list of all admission applications in the system.

Sample Request:
GET /api/admissions?limit=10&offset=0

Expected Response:

```json
{
  "success": true,
  "data": [
    {
      "application_id": "APP_123",
      "student_name": "Rohan Kumar Singh",
      "grade": "Class 5",
      "status": "APPROVED"
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 10,
    "offset": 0,
    "pages": 5
  }
}
```

Status Codes:
200 - Success
400 - Bad Request (invalid pagination params)
500 - Server Error

---

Route Name: Get Admission By ID
Method: GET
Path: /api/admissions/:applicationId

Description:
Returns comprehensive details of a single admission application, joining student, class, and parent data.

Sample Request:
GET /api/admissions/APP_123

Expected Response:

```json
{
  "success": true,
  "data": {
    "application_id": "APP_123",
    "first_name": "Rohan",
    "last_name": "Singh",
    "class_name": "Class 5",
    "section_name": "A",
    "status": "APPROVED",
    "father_name": "Rajesh Singh",
    "father_mobile": "+91-9123456780"
  }
}
```

Status Codes:
200 - Success
404 - Not Found
500 - Server Error
