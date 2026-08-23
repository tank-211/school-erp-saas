# School ERP - Comprehensive API Documentation

**Date Generated:** May 2, 2026  
**System:** School Admission CRM (Multi-tenant SaaS)  
**Version:** 1.0.0

---

## Table of Contents

1. [Authentication APIs](#authentication-apis)
2. [Lead Management APIs](#lead-management-apis)
3. [Application & Admission APIs](#application--admission-apis)
4. [Student Management APIs](#student-management-apis)
5. [Parent Management APIs](#parent-management-apis)
6. [Communication APIs](#communication-apis)
7. [Counseling Workspace APIs](#counseling-workspace-apis)
8. [School Management APIs](#school-management-apis)
9. [User & Admin Management APIs](#user--admin-management-apis)
10. [Dashboard & Analytics APIs](#dashboard--analytics-apis)
11. [Templates & Campaigns APIs](#templates--campaigns-apis)
12. [Database Schema Reference](#database-schema-reference)

---

## Authentication APIs

### `POST /api/auth/login`

**Description:** User login with email and password  
**Authentication:** None (public)  
**Request Body:**

```json
{
  "email": "user@school.com",
  "password": "password123"
}
```

**Response:** 200 OK

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "JWT_TOKEN",
    "user": {
      "id": 1,
      "name": "John Counselor",
      "email": "john@school.com",
      "school_id": 1,
      "role": "counselor"
    }
  }
}
```

**Database Tables:** `app_user`  
**Related Queries:** `authQueries.getUserByEmail()`

---

### `POST /api/auth/signup`

**Description:** Create new user account  
**Authentication:** None (public)  
**Request Body:**

```json
{
  "name": "Jane Admin",
  "email": "jane@school.com",
  "password": "password123",
  "confirmPassword": "password123",
  "school_id": 1,
  "role": "counselor"
}
```

**Response:** 201 Created

```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "token": "JWT_TOKEN",
    "user": {
      "id": 2,
      "name": "Jane Admin",
      "email": "jane@school.com",
      "school_id": 1,
      "role": "counselor"
    }
  }
}
```

**Database Tables:** `app_user`  
**Related Queries:** `authQueries.getUserByEmail()`, `authQueries.createUser()`

---

### `GET /api/auth/me`

**Description:** Get current authenticated user details  
**Authentication:** Required (JWT)  
**Response:** 200 OK

```json
{
  "success": true,
  "data": {
    "id": 1,
    "school_id": 1,
    "name": "John Counselor",
    "email": "john@school.com",
    "role": "counselor"
  }
}
```

**Database Tables:** `app_user`

---

## Lead Management APIs

### `POST /api/leads`

**Description:** Create a new lead (prospective student)  
**Authentication:** Required (JWT)  
**Request Body:**

```json
{
  "first_name": "Arjun",
  "last_name": "Kapoor",
  "email": "arjun@example.com",
  "phone": "+91-9876543211",
  "desired_class": "Grade 5",
  "source": "Website",
  "notes": "Interested in science stream",
  "academic_year_id": 1,
  "follow_up_status": "pending"
}
```

**Response:** 201 Created

```json
{
  "success": true,
  "message": "Lead created successfully",
  "data": {
    "id": 1,
    "school_id": 1,
    "first_name": "Arjun",
    "last_name": "Kapoor",
    "email": "arjun@example.com",
    "phone": "+91-9876543211",
    "desired_class": "Grade 5",
    "follow_up_status": "pending",
    "created_at": "2026-05-02T10:00:00Z",
    "created_by": "admin"
  }
}
```

**Database Tables:** `lead`, `academic_year`, `school`  
**Related Queries:** `leadQueries.createLead()`

---

### `GET /api/leads`

**Description:** Get all leads for authenticated school with optional filters  
**Authentication:** Required (JWT)  
**Query Parameters:**

- `follow_up_status` (optional): 'pending', 'contacted', 'interested', 'not-interested', 'converted', 'lost'
- `desired_class` (optional): Filter by class
- `assigned_to` (optional): Filter by assigned counselor
- `search` (optional): Search by name or email
- `limit` (optional): Number of records (default: unlimited)

**Response:** 200 OK

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "first_name": "Arjun",
      "last_name": "Kapoor",
      "email": "arjun@example.com",
      "phone": "+91-9876543211",
      "desired_class": "Grade 5",
      "follow_up_status": "interested",
      "assigned_to": "counselor_id",
      "last_contacted_at": "2026-05-01T14:30:00Z"
    }
  ]
}
```

**Database Tables:** `lead`, `academic_year`  
**Related Queries:** `leadQueries.getAllLeads()`

---

### `GET /api/leads/:id`

**Description:** Get single lead details by ID  
**Authentication:** Required (JWT)  
**Response:** 200 OK

```json
{
  "success": true,
  "data": {
    "id": 1,
    "school_id": 1,
    "first_name": "Arjun",
    "last_name": "Kapoor",
    "email": "arjun@example.com",
    "phone": "+91-9876543211",
    "desired_class": "Grade 5",
    "source": "Website",
    "follow_up_status": "interested",
    "notes": "Very interested, waiting for fee structure",
    "assigned_to": "counselor_123",
    "last_contacted_at": "2026-05-01T14:30:00Z",
    "created_at": "2026-04-15T10:00:00Z"
  }
}
```

**Database Tables:** `lead`  
**Related Queries:** `leadQueries.getLeadById()`

---

### `PUT /api/leads/:id`

**Description:** Update lead details  
**Authentication:** Required (JWT)  
**Request Body:** (all fields optional)

```json
{
  "first_name": "Arjun",
  "last_name": "Kapoor",
  "email": "newemail@example.com",
  "phone": "+91-9876543211",
  "follow_up_status": "interested",
  "notes": "Updated notes",
  "assigned_to": "counselor_id"
}
```

**Response:** 200 OK (returns updated lead object)  
**Database Tables:** `lead`  
**Related Queries:** `leadQueries.updateLead()`

---

### `DELETE /api/leads/:id`

**Description:** Delete a lead  
**Authentication:** Required (JWT)  
**Response:** 200 OK

```json
{
  "success": true,
  "message": "Lead deleted successfully"
}
```

**Database Tables:** `lead` (CASCADE delete on `admission`, `campus_visit` if related)  
**Related Queries:** `leadQueries.deleteLead()`

---

### `GET /api/leads/followups/upcoming`

**Description:** Get upcoming follow-ups for leads  
**Authentication:** Required (JWT)  
**Response:** 200 OK

```json
{
  "success": true,
  "data": [
    {
      "lead_id": 1,
      "follow_up_date": "2026-05-05",
      "first_name": "Arjun",
      "phone": "+91-9876543211",
      "status": "pending"
    }
  ]
}
```

**Database Tables:** `lead`

---

## Application & Admission APIs

### Core Admission Flow

**Data Model:**

- **Application** (multi-step form tracking)
- **Admission** (final admission record)
- **Lead** (source of application)
- **Student** (created after admission approval)

---

### `POST /api/applications`

**Description:** Create application from existing lead  
**Authentication:** Required (JWT)  
**Request Body:**

```json
{
  "lead_id": 1,
  "academic_year_id": 1
}
```

**Response:** 201 Created

```json
{
  "success": true,
  "message": "Application created successfully",
  "data": {
    "id": 1,
    "school_id": 1,
    "lead_id": 1,
    "academic_year_id": 1,
    "application_number": "APP-2026-001",
    "status": "draft",
    "current_step": 1,
    "created_at": "2026-05-02T10:00:00Z"
  }
}
```

**Database Tables:** `application`, `lead`, `academic_year`, `app_user`, `admission`  
**Related Service:** `applicationService.createApplication()`

---

### `POST /api/applications/new`

**Description:** Create application without lead (manual entry mode)  
**Authentication:** Required (JWT)  
**Request Body:**

```json
{
  "academic_year_id": 1
}
```

**Response:** 201 Created  
**Database Tables:** `application`, `academic_year`

---

### `GET /api/applications`

**Description:** Get all applications with pagination  
**Authentication:** Required (JWT)  
**Query Parameters:**

- `limit` (optional): Records per page (default: undefined)
- `offset` (optional): Pagination offset (default: 0)

**Response:** 200 OK

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "application_number": "APP-2026-001",
      "lead_name": "Arjun Kapoor",
      "status": "in_progress",
      "current_step": 3,
      "academic_year": "2026-27"
    }
  ]
}
```

**Database Tables:** `application`, `lead`, `academic_year`

---

### `GET /api/applications/eligible-leads`

**Description:** Get leads eligible for application (not yet applied)  
**Authentication:** Required (JWT)  
**Query Parameters:**

- `search` (optional): Search term
- `limit` (optional): Number of records

**Response:** 200 OK

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "first_name": "Arjun",
      "last_name": "Kapoor",
      "email": "arjun@example.com",
      "phone": "+91-9876543211",
      "desired_class": "Grade 5"
    }
  ]
}
```

**Database Tables:** `lead`, `application`

---

### `GET /api/applications/counts`

**Description:** Get application statistics for dashboard  
**Authentication:** Required (JWT)  
**Response:** 200 OK

```json
{
  "success": true,
  "data": {
    "draft": 5,
    "in_progress": 12,
    "submitted": 8,
    "approved": 3,
    "rejected": 1
  }
}
```

**Database Tables:** `application`

---

### `GET /api/applications/search`

**Description:** Search applications by various criteria  
**Authentication:** Required (JWT)  
**Query Parameters:**

- `q` (optional): Search query
- `status` (optional): Filter by status

**Response:** 200 OK  
**Database Tables:** `application`, `lead`, `application_student_info`

---

### `GET /api/applications/:id/progress`

**Description:** Get application progress status (which steps completed)  
**Authentication:** Required (JWT)  
**Response:** 200 OK

```json
{
  "success": true,
  "data": {
    "admission_id": 1,
    "student_info_status": "completed",
    "parent_info_status": "pending",
    "academic_details_status": "pending",
    "photos_status": "pending",
    "documents_status": "pending",
    "review_status": "pending"
  }
}
```

**Database Tables:** `application_progress`

---

### `POST /api/applications/:id/student-info`

**Description:** Save Step 1 - Student Personal Information  
**Authentication:** Required (JWT)  
**Request Body:**

```json
{
  "first_name": "Arjun",
  "middle_name": "Kumar",
  "last_name": "Kapoor",
  "date_of_birth": "2015-08-15",
  "gender": "Male",
  "email": "arjun@example.com",
  "phone": "+91-9876543211",
  "address": "123 Main Street",
  "city": "Delhi",
  "state": "Delhi",
  "postal_code": "110001",
  "country": "India",
  "blood_group": "O+",
  "aadhar_number": "1234567890123456"
}
```

**Response:** 200 OK

```json
{
  "success": true,
  "message": "Student information saved",
  "data": {
    "admission_id": 1,
    "status": "completed"
  }
}
```

**Database Tables:** `application_student_info`, `student`, `admission`  
**Related Service:** `applicationService.saveStudentInfo()`

---

### `POST /api/applications/:id/parent-info`

**Description:** Save Step 2 - Parent/Guardian Information  
**Authentication:** Required (JWT)  
**Request Body:**

```json
{
  "father_name": "Rajesh Kapoor",
  "father_occupation": "Engineer",
  "father_phone": "+91-9123456780",
  "father_email": "rajesh@example.com",
  "mother_name": "Priya Kapoor",
  "mother_occupation": "Doctor",
  "mother_phone": "+91-9123456781",
  "mother_email": "priya@example.com",
  "guardian_name": null,
  "primary_contact_person": "Rajesh Kapoor",
  "primary_contact_relation": "Father",
  "primary_contact_phone": "+91-9123456780",
  "address": "123 Main Street",
  "city": "Delhi",
  "income_range": "500000-1000000"
}
```

**Response:** 200 OK  
**Database Tables:** `application_parent_info`, `parent_detail`, `admission`

---

### `POST /api/applications/:id/academic-details`

**Description:** Save Step 3 - Academic History  
**Authentication:** Required (JWT)  
**Request Body:**

```json
{
  "desired_class": "Grade 5",
  "previous_school": "ABC Primary School",
  "previous_class": "Grade 4",
  "marks_percentage": 85.5,
  "board_name": "CBSE",
  "academic_year": "2024-25",
  "extracurricular_activities": "Cricket, Debate",
  "achievements": "School Topper",
  "strengths": "Mathematics, Science",
  "areas_to_improve": "Languages"
}
```

**Response:** 200 OK  
**Database Tables:** `application_academic_info`, `academic`, `admission`

---

### `POST /api/applications/:id/photos`

**Description:** Upload Step 4 - Student Photos  
**Authentication:** Required (JWT)  
**Content-Type:** multipart/form-data  
**Files:**

- `student_photo`: Student passport photo
- `passport_photos`: Additional photos (optional)

**Response:** 200 OK

```json
{
  "success": true,
  "message": "Photos uploaded successfully",
  "data": {
    "student_photo": "/uploads/photos/student_1.jpg",
    "passport_photos": ["/uploads/photos/passport_1.jpg"]
  }
}
```

**Database Tables:** `student_photos`, `admission`

---

### `POST /api/applications/:id/documents`

**Description:** Upload Step 5 - Required Documents  
**Authentication:** Required (JWT)  
**Content-Type:** multipart/form-data  
**Supported Document Types:**

- `birth_certificate`, `aadhaar_card`, `passport_photos`, `transfer_certificate`, `previous_report_card`, `address_proof`, `parent_id_proof`, `student_photo`, `other`

**Response:** 200 OK

```json
{
  "success": true,
  "message": "Documents uploaded successfully",
  "data": [
    {
      "document_type": "birth_certificate",
      "file_name": "birth_cert.pdf",
      "file_path": "/uploads/documents/birth_cert_1.pdf",
      "document_number": "BC123456789",
      "verification_status": "pending"
    }
  ]
}
```

**Database Tables:** `application_documents`, `documents`

---

### `POST /api/applications/:id/review`

**Description:** Submit application for review (Step 6)  
**Authentication:** Required (JWT)  
**Request Body:**

```json
{
  "notes": "Application ready for review"
}
```

**Response:** 200 OK

```json
{
  "success": true,
  "message": "Application submitted for review",
  "data": {
    "status": "submitted",
    "submitted_at": "2026-05-02T10:00:00Z"
  }
}
```

**Database Tables:** `application`, `admission`

---

### `GET /api/applications/:id/details`

**Description:** Get full application details (for prefill when resuming)  
**Authentication:** Required (JWT)  
**Response:** 200 OK

```json
{
  "success": true,
  "data": {
    "application": {...},
    "student_info": {...},
    "parent_info": {...},
    "academic_info": {...},
    "photos": {...},
    "documents": [...],
    "progress": {...}
  }
}
```

**Database Tables:** `application`, `application_student_info`, `application_parent_info`, `application_academic_info`, `application_documents`, `application_progress`

---

### `GET /api/admissions/stats`

**Description:** Get admission statistics  
**Authentication:** Required (JWT)  
**Response:** 200 OK

```json
{
  "success": true,
  "data": {
    "total": 50,
    "submitted": 30,
    "under_review": 10,
    "approved": 8,
    "waitlisted": 2
  },
  "message": "Admission statistics retrieved successfully"
}
```

**Database Tables:** `admission`, `application`

---

### `GET /api/admissions`

**Description:** Get all admissions with pagination  
**Authentication:** Required (JWT)  
**Query Parameters:**

- `limit`: Records per page (default: 10, max: 100)
- `offset`: Pagination offset (default: 0)

**Response:** 200 OK

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "student_name": "Arjun Kapoor",
      "admission_number": "ADM-2026-001",
      "class": "Grade 5",
      "section": "A",
      "admission_date": "2026-04-10",
      "status": "active"
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

**Database Tables:** `admission`, `student`, `school_class`, `section`

---

### `GET /api/admissions/search?query=`

**Description:** Search admissions by student name or parent contact  
**Authentication:** Required (JWT)  
**Query Parameters:**

- `query` (required): Search term (min 1 character)

**Response:** 200 OK  
**Database Tables:** `admission`, `student`, `parent_detail`

---

### `GET /api/admissions/:applicationId`

**Description:** Get admission details by application ID  
**Authentication:** Required (JWT)  
**Response:** 200 OK

```json
{
  "success": true,
  "data": {
    "admission_id": 1,
    "student_name": "Arjun Kapoor",
    "parent_name": "Rajesh Kapoor",
    "class": "Grade 5",
    "section": "A",
    "admission_date": "2026-04-10",
    "registration_number": "REG-2026-001",
    "status": "active",
    "created_at": "2026-04-10T10:00:00Z"
  }
}
```

**Database Tables:** `admission`, `student`, `parent_detail`, `school_class`, `section`

---

### `POST /api/admissions/create`

**Description:** Create a new admission (direct entry)  
**Authentication:** Required (JWT)  
**Content-Type:** multipart/form-data or application/json  
**Request Body:**

```json
{
  "student": {
    "first_name": "Arjun",
    "last_name": "Kapoor",
    "date_of_birth": "2015-08-15",
    "gender": "Male"
  },
  "parent": {
    "father_name": "Rajesh",
    "mother_name": "Priya",
    "phone": "+91-9123456780"
  },
  "admission": {
    "academic_year_id": 1,
    "class_id": 1,
    "section_id": 1,
    "admission_date": "2026-04-10",
    "admission_type": "new"
  }
}
```

**Response:** 201 Created  
**Database Tables:** `admission`, `student`, `parent_detail`, `application_progress`, `documents`

---

## Student Management APIs

### `GET /api/students`

**Description:** Get all students with pagination  
**Authentication:** Optional  
**Query Parameters:**

- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10): Records per page

**Response:** 200 OK

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
      "date_of_birth": "2015-08-15",
      "status": "active",
      "school_name": "Green Valley School"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```

**Database Tables:** `student`, `school`

---

### `GET /api/students/:id`

**Description:** Get student by ID with parents and admissions details  
**Authentication:** Optional  
**Response:** 200 OK

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
      "email": "rohan@example.com",
      "date_of_birth": "2015-08-15",
      "status": "active"
    },
    "parents": [
      {
        "id": 1,
        "relation": "Father",
        "first_name": "Rajesh",
        "last_name": "Singh",
        "phone": "+91-9123456780",
        "occupation": "Engineer"
      }
    ],
    "admissions": [
      {
        "id": 1,
        "academic_year": "2024-25",
        "class_name": "Class 1",
        "section_name": "A",
        "admission_date": "2024-04-10",
        "status": "active"
      }
    ]
  }
}
```

**Database Tables:** `student`, `parent_detail`, `admission`, `school_class`, `section`, `academic_year`

---

### `POST /api/students`

**Description:** Create new student  
**Authentication:** Optional  
**Request Body:**

```json
{
  "school_id": 1,
  "admission_number": "ADM002",
  "first_name": "Priya",
  "last_name": "Sharma",
  "date_of_birth": "2016-05-20",
  "gender": "Female",
  "email": "priya@example.com",
  "phone": "+91-9987654321",
  "city": "Delhi",
  "blood_group": "B+"
}
```

**Response:** 201 Created  
**Database Tables:** `student`

---

### `POST /api/students/save`

**Description:** Save student information  
**Authentication:** Optional  
**Request Body:** (similar to create)  
**Response:** 200 OK  
**Database Tables:** `student`

---

## Parent Management APIs

### `GET /api/parents/:id`

**Description:** Get parent details by ID  
**Authentication:** Optional  
**Response:** 200 OK

```json
{
  "success": true,
  "data": {
    "id": 1,
    "student_id": 1,
    "relation": "Father",
    "first_name": "Rajesh",
    "last_name": "Singh",
    "email": "rajesh@example.com",
    "phone": "+91-9123456780",
    "occupation": "Engineer",
    "address": "123 Main Street"
  }
}
```

**Database Tables:** `parent_detail`

---

### `POST /api/parents/save`

**Description:** Save parent information (create or update)  
**Authentication:** Optional  
**Request Body:**

```json
{
  "school_id": 1,
  "student_id": 1,
  "relation": "Father",
  "first_name": "Rajesh",
  "last_name": "Singh",
  "email": "rajesh@example.com",
  "phone": "+91-9123456780",
  "occupation": "Engineer"
}
```

**Response:** 200 OK  
**Database Tables:** `parent_detail`

---

## Communication APIs

### `GET /api/communication/recipients`

**Description:** Get list of recipients for communication (leads, students, parents)  
**Authentication:** Required (JWT)  
**Query Parameters:**

- `type` (optional): 'lead', 'student', or 'parent'
- `search` (optional): Search term

**Response:** 200 OK

```json
{
  "success": true,
  "data": [
    {
      "type": "lead",
      "id": 1,
      "name": "Arjun Kapoor",
      "email": "arjun@example.com",
      "phone": "+91-9876543211"
    }
  ]
}
```

**Database Tables:** `lead`, `student`, `parent_detail`

---

### `POST /api/communication/send`

**Description:** Send communication (email, SMS, WhatsApp)  
**Authentication:** Required (JWT)  
**Content-Type:** multipart/form-data (if attachments)  
**Request Body:**

```json
{
  "recipient_type": "lead",
  "recipient_ids": [1, 2, 3],
  "channel": "email",
  "subject": "Application Status Update",
  "message": "Dear parent, your application has been received...",
  "attachments": []
}
```

**Response:** 201 Created

```json
{
  "success": true,
  "message": "Email sent successfully",
  "data": {
    "communication_id": 1,
    "recipients_count": 3,
    "status": "sent"
  }
}
```

**Database Tables:** `communication_log`, `scheduled_emails`, `lead`, `student`, `parent_detail`

---

### `GET /api/communication/logs`

**Description:** Get communication logs with filters  
**Authentication:** Required (JWT)  
**Query Parameters:**

- `recipient_type` (optional): 'lead', 'student', 'parent'
- `channel` (optional): 'email', 'sms', 'whatsapp'
- `status` (optional): 'sent', 'delivered', 'failed'
- `from_date` (optional): Start date
- `to_date` (optional): End date
- `limit` (optional): Records per page
- `offset` (optional): Pagination offset

**Response:** 200 OK

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "recipient_type": "lead",
      "recipient_name": "Arjun Kapoor",
      "channel": "email",
      "subject": "Application Status Update",
      "status": "delivered",
      "sent_at": "2026-05-02T10:00:00Z",
      "delivered_at": "2026-05-02T10:05:00Z"
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

**Database Tables:** `communication_log`, `lead`, `student`, `parent_detail`

---

### `PUT /api/communication/:id/status`

**Description:** Update communication status  
**Authentication:** Required (JWT)  
**Request Body:**

```json
{
  "status": "delivered"
}
```

**Response:** 200 OK  
**Database Tables:** `communication_log`

---

## Email APIs

### `POST /api/email/send`

**Description:** Send email  
**Authentication:** Required (JWT)  
**Request Body:**

```json
{
  "recipient_type": "lead",
  "recipient_ids": [1],
  "subject": "Welcome to our school",
  "message": "Dear parent...",
  "scheduled_at": "2026-05-05T10:00:00Z"
}
```

**Response:** 201 Created  
**Database Tables:** `communication_log`, `scheduled_emails`

---

### `POST /api/email/resolve-recipient`

**Description:** Resolve application recipient for email  
**Authentication:** Required (JWT)  
**Request Body:**

```json
{
  "application_id": 1
}
```

**Response:** 200 OK

```json
{
  "success": true,
  "data": {
    "email": "arjun@example.com",
    "name": "Arjun Kapoor"
  }
}
```

**Database Tables:** `application`, `lead`, `student`, `parent_detail`

---

### `GET /api/email/logs`

**Description:** Get email logs  
**Authentication:** Required (JWT)  
**Response:** 200 OK (similar to communication logs)  
**Database Tables:** `communication_log`

---

### `GET /api/email/stats`

**Description:** Get email statistics  
**Authentication:** Required (JWT)  
**Response:** 200 OK

```json
{
  "success": true,
  "data": {
    "total_sent": 150,
    "delivered": 145,
    "failed": 5,
    "opened": 120,
    "clicked": 45
  }
}
```

**Database Tables:** `communication_log`

---

### `POST /api/email/templates`

**Description:** Create email template  
**Authentication:** Required (JWT)  
**Request Body:**

```json
{
  "name": "Admission Confirmation",
  "category": "onboarding",
  "subject": "Welcome to {{school_name}}",
  "content": "Dear {{student_name}}, your admission has been confirmed..."
}
```

**Response:** 201 Created  
**Database Tables:** `message_template`

---

### `GET /api/email/templates`

**Description:** Get email templates  
**Authentication:** Required (JWT)  
**Query Parameters:**

- `category` (optional): Filter by category

**Response:** 200 OK  
**Database Tables:** `message_template`

---

### `PUT /api/email/templates/:id`

**Description:** Update email template  
**Authentication:** Required (JWT)  
**Response:** 200 OK  
**Database Tables:** `message_template`

---

### `DELETE /api/email/templates/:id`

**Description:** Delete email template  
**Authentication:** Required (JWT)  
**Response:** 200 OK  
**Database Tables:** `message_template`

---

## SMS APIs

### `POST /api/sms/send`

**Description:** Send SMS message  
**Authentication:** Required (JWT)  
**Request Body:**

```json
{
  "recipient_type": "lead",
  "recipient_ids": [1],
  "message": "Your application has been received. Track status here: link"
}
```

**Response:** 201 Created  
**Database Tables:** `communication_log`

---

### `GET /api/sms/logs`

**Description:** Get SMS logs  
**Authentication:** Required (JWT)  
**Response:** 200 OK (similar to communication logs)  
**Database Tables:** `communication_log`

---

## WhatsApp APIs

### `POST /api/whatsapp/send`

**Description:** Send WhatsApp message  
**Authentication:** Required (JWT)  
**Request Body:**

```json
{
  "recipient_type": "lead",
  "recipient_ids": [1],
  "message": "Your application has been received."
}
```

**Response:** 201 Created  
**Database Tables:** `communication_log`

---

### `GET /api/whatsapp/logs`

**Description:** Get WhatsApp logs  
**Authentication:** Required (JWT)  
**Response:** 200 OK (similar to communication logs)  
**Database Tables:** `communication_log`

---

## Counseling Workspace APIs

### `GET /api/counseling/stats`

**Description:** Get counselor dashboard statistics  
**Authentication:** Required (JWT)  
**Response:** 200 OK

```json
{
  "success": true,
  "data": {
    "assignedLeads": 15,
    "upcomingVisits": 5,
    "pendingTasks": 3
  }
}
```

**Database Tables:** `lead`, `campus_visit`, `task`, `app_user`

---

### `GET /api/counseling/visits`

**Description:** Get all campus visits for counselor  
**Authentication:** Required (JWT)  
**Query Parameters:**

- `filterToday` (optional, default: false): Show only today's visits

**Response:** 200 OK

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "lead_id": 1,
      "student_name": "Arjun Kapoor",
      "visitor_name": "Rajesh Kapoor",
      "visitor_phone": "+91-9123456780",
      "visit_date": "2026-05-05",
      "start_time": "10:00",
      "end_time": "10:30",
      "status": "scheduled",
      "internal_notes": "Interested in science stream"
    }
  ]
}
```

**Database Tables:** `campus_visit`, `lead`

---

### `POST /api/counseling/visits`

**Description:** Create campus visit  
**Authentication:** Required (JWT)  
**Request Body:**

```json
{
  "lead_id": 1,
  "visitor_name": "Rajesh Kapoor",
  "visitor_phone": "+91-9123456780",
  "student_name": "Arjun Kapoor",
  "grade": "Grade 5",
  "number_of_visitors": 1,
  "visit_date": "2026-05-05",
  "start_time": "10:00",
  "end_time": "10:30",
  "visit_type": "campus_visit",
  "tour_preferences": ["labs", "library", "sports"],
  "internal_notes": "Very interested"
}
```

**Response:** 201 Created

```json
{
  "success": true,
  "data": {
    "id": 1,
    "school_id": 1,
    "lead_id": 1,
    "visit_date": "2026-05-05",
    "status": "scheduled",
    "assigned_to": 5
  }
}
```

**Database Tables:** `campus_visit`, `lead`  
**Constraint:** One counselor cannot have multiple visits at the same time

---

### `GET /api/counseling/visits/future`

**Description:** Get future campus visits  
**Authentication:** Required (JWT)  
**Response:** 200 OK (array of future visits)  
**Database Tables:** `campus_visit`

---

### `GET /api/counseling/visits/missed`

**Description:** Get missed campus visits  
**Authentication:** Required (JWT)  
**Response:** 200 OK (array of missed/no_show visits)  
**Database Tables:** `campus_visit`

---

### `GET /api/counseling/visits/:id`

**Description:** Get specific campus visit details  
**Authentication:** Required (JWT)  
**Response:** 200 OK  
**Database Tables:** `campus_visit`, `lead`

---

### `PUT /api/counseling/visits/:id`

**Description:** Update campus visit  
**Authentication:** Required (JWT)  
**Request Body:** (partial update fields)  
**Response:** 200 OK  
**Database Tables:** `campus_visit`

---

### `PATCH /api/counseling/visits/:id/status`

**Description:** Update campus visit status  
**Authentication:** Required (JWT)  
**Request Body:**

```json
{
  "status": "completed"
}
```

**Response:** 200 OK  
**Database Tables:** `campus_visit`  
**Valid Statuses:** 'scheduled', 'completed', 'cancelled', 'no_show'

---

### `DELETE /api/counseling/visits/:id`

**Description:** Delete campus visit  
**Authentication:** Required (JWT)  
**Response:** 200 OK  
**Database Tables:** `campus_visit`

---

### `GET /api/counseling/leads/search`

**Description:** Search assigned leads by name or ID  
**Authentication:** Required (JWT)  
**Query Parameters:**

- `q` (required): Search term (min 2 chars for text, or numeric lead ID)

**Response:** 200 OK

```json
{
  "success": true,
  "data": [
    {
      "lead_id": 1,
      "student_name": "Arjun Kapoor",
      "phone": "+91-9876543211",
      "desired_class": "Grade 5",
      "follow_up_status": "interested"
    }
  ]
}
```

**Database Tables:** `lead`, `campus_visit`

---

### `GET /api/counseling/slots`

**Description:** Get available time slots for campus visits  
**Authentication:** Required (JWT)  
**Query Parameters:**

- `date` (optional): Filter by date

**Response:** 200 OK  
**Database Tables:** `campus_visit`

---

## School Management APIs

### `GET /api/schools`

**Description:** Get all schools  
**Authentication:** Optional  
**Response:** 200 OK

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
      "status": "active"
    }
  ]
}
```

**Database Tables:** `school`

---

### `GET /api/schools/:id`

**Description:** Get school by ID  
**Authentication:** Optional  
**Response:** 200 OK

```json
{
  "success": true,
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
    "status": "active"
  }
}
```

**Database Tables:** `school`

---

### `GET /api/schools/:schoolId/counselors`

**Description:** Get counselors for a school  
**Authentication:** Optional  
**Response:** 200 OK

```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "name": "John Counselor",
      "email": "john@school.com",
      "role": "counselor",
      "status": "active"
    }
  ]
}
```

**Database Tables:** `app_user`  
**Filter:** role = 'counselor'

---

### `POST /api/schools`

**Description:** Create new school  
**Authentication:** Optional  
**Request Body:**

```json
{
  "name": "New School",
  "email": "info@newschool.edu",
  "phone": "+91-9876543210",
  "address": "123, School Road",
  "city": "Mumbai",
  "state": "Maharashtra",
  "principal_name": "Dr. Name"
}
```

**Response:** 201 Created  
**Database Tables:** `school`

---

## User & Admin Management APIs

### `GET /api/users`

**Description:** Get all users for authenticated school  
**Authentication:** Required (JWT)  
**Response:** 200 OK

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Admin User",
      "email": "admin@school.com",
      "role": "admin",
      "status": "active",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

**Database Tables:** `app_user`

---

### `POST /api/users`

**Description:** Create new user  
**Authentication:** Required (JWT)  
**Request Body:**

```json
{
  "name": "New User",
  "email": "user@school.com",
  "password": "password123",
  "role": "counselor"
}
```

**Response:** 201 Created  
**Database Tables:** `app_user`

---

### `PUT /api/users/:id/reset-password`

**Description:** Reset user password  
**Authentication:** Required (JWT)  
**Request Body:**

```json
{
  "newPassword": "newpassword123"
}
```

**Response:** 200 OK  
**Database Tables:** `app_user`

---

### `GET /api/admin/users`

**Description:** Get all users (admin only)  
**Authentication:** Required (JWT) + Admin role  
**Response:** 200 OK  
**Database Tables:** `app_user`

---

### `POST /api/admin/create-user`

**Description:** Create new user (admin only)  
**Authentication:** Required (JWT) + Admin role  
**Request Body:**

```json
{
  "name": "New User",
  "email": "user@school.com",
  "password": "password123",
  "role": "counselor"
}
```

**Response:** 201 Created  
**Database Tables:** `app_user`

---

### `PUT /api/admin/update-password/:id`

**Description:** Update user password (admin only)  
**Authentication:** Required (JWT) + Admin role  
**Request Body:**

```json
{
  "newPassword": "newpassword123"
}
```

**Response:** 200 OK  
**Database Tables:** `app_user`

---

### `DELETE /api/admin/delete-user/:id`

**Description:** Delete user (admin only)  
**Authentication:** Required (JWT) + Admin role  
**Response:** 200 OK

```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Database Tables:** `app_user`

---

## Dashboard & Analytics APIs

### `GET /api/dashboard`

**Description:** Get main dashboard statistics  
**Authentication:** Required (JWT)  
**Response:** 200 OK

```json
{
  "success": true,
  "data": {
    "total_leads": 150,
    "applications_in_progress": 25,
    "admissions_this_year": 45,
    "revenue_collected": 250000
  }
}
```

**Database Tables:** `lead`, `application`, `admission`, `payment`

---

### `GET /api/dashboard/monthly-trend`

**Description:** Get monthly application trend  
**Authentication:** Required (JWT)  
**Response:** 200 OK

```json
{
  "success": true,
  "data": [
    {
      "month": "January",
      "leads": 30,
      "applications": 20,
      "admissions": 15
    }
  ]
}
```

**Database Tables:** `lead`, `application`, `admission`

---

### `GET /api/dashboard/grade-distribution`

**Description:** Get student distribution by grade  
**Authentication:** Required (JWT)  
**Response:** 200 OK

```json
{
  "success": true,
  "data": [
    {
      "grade": "Grade 1",
      "total_students": 45,
      "available_seats": 15
    }
  ]
}
```

**Database Tables:** `student`, `school_class`, `section`

---

### `GET /api/dashboard/counselor-performance`

**Description:** Get counselor performance metrics  
**Authentication:** Required (JWT)  
**Response:** 200 OK

```json
{
  "success": true,
  "data": [
    {
      "counselor_id": 5,
      "counselor_name": "John Counselor",
      "assigned_leads": 15,
      "conversions": 8,
      "conversion_rate": 53.3
    }
  ]
}
```

**Database Tables:** `lead`, `admission`, `app_user`

---

## Templates & Campaigns APIs

### `POST /api/templates`

**Description:** Create communication template  
**Authentication:** Required (JWT)  
**Request Body:**

```json
{
  "name": "Admission Confirmation",
  "category": "onboarding",
  "subject": "Your admission has been confirmed",
  "content": "Dear {{student_name}}, Welcome to {{school_name}}"
}
```

**Response:** 201 Created  
**Database Tables:** `message_template`

---

### `GET /api/templates`

**Description:** Get all templates  
**Authentication:** Required (JWT)  
**Query Parameters:**

- `category` (optional): Filter by category

**Response:** 200 OK  
**Database Tables:** `message_template`

---

### `PUT /api/templates/:id`

**Description:** Update template  
**Authentication:** Required (JWT)  
**Response:** 200 OK  
**Database Tables:** `message_template`

---

### `DELETE /api/templates/:id`

**Description:** Delete template  
**Authentication:** Required (JWT)  
**Response:** 200 OK  
**Database Tables:** `message_template`

---

### `POST /api/campaigns`

**Description:** Create marketing campaign  
**Authentication:** Required (JWT)  
**Request Body:**

```json
{
  "name": "Summer Admission Campaign",
  "channel": "email",
  "start_date": "2026-05-01",
  "end_date": "2026-06-30",
  "audience_type": "lead"
}
```

**Response:** 201 Created  
**Database Tables:** `campaign`

---

### `GET /api/campaigns`

**Description:** Get all campaigns  
**Authentication:** Required (JWT)  
**Query Parameters:**

- `status` (optional): Filter by status

**Response:** 200 OK  
**Database Tables:** `campaign`

---

### `POST /api/campaigns/:id/send`

**Description:** Send campaign  
**Authentication:** Required (JWT)  
**Request Body:**

```json
{
  "message": "Dear parent..."
}
```

**Response:** 200 OK

```json
{
  "success": true,
  "message": "Campaign sent successfully",
  "data": {
    "recipients": 50,
    "status": "sent"
  }
}
```

**Database Tables:** `campaign`, `communication_log`

---

## Database Schema Reference

### Core Tables (Admission Flow)

#### `school`

Multi-tenant organization table

```sql
- id (PK)
- name (unique)
- email, phone, address
- city, state, postal_code, country
- principal_name
- status (active, inactive, suspended)
- created_at, updated_at
```

#### `academic_year`

Academic year definitions

```sql
- id (PK)
- school_id (FK)
- year_name (e.g., "2024-25")
- start_date, end_date
- is_active
- status (active, inactive, completed)
```

#### `school_class`

Class definitions

```sql
- id (PK)
- school_id (FK)
- class_name (e.g., "Class 1", "Grade 5")
- class_numeric_value
- medium (e.g., "English", "Hindi")
```

#### `section`

Sections within classes

```sql
- id (PK)
- school_id (FK)
- class_id (FK)
- section_name (A, B, C...)
- capacity (e.g., 45 students)
- class_teacher
```

#### `lead`

Prospective students (CRM)

```sql
- id (PK)
- school_id (FK)
- academic_year_id (FK)
- first_name, last_name
- email, phone
- desired_class
- source (e.g., Website, Reference)
- follow_up_status (pending, contacted, interested, converted, lost)
- notes
- assigned_to (counselor ID)
- last_contacted_at
- created_at, updated_at
```

#### `student`

Confirmed students

```sql
- id (PK)
- school_id (FK)
- admission_number (unique)
- first_name, middle_name, last_name
- date_of_birth, gender
- email, phone
- address, city, state, postal_code, country
- blood_group
- aadhar_number
- status (active, inactive, passed-out, suspended)
- created_at, updated_at
```

#### `parent_detail`

Parent/guardian information

```sql
- id (PK)
- school_id (FK)
- student_id (FK)
- relation (Father, Mother, Guardian, Other)
- first_name, last_name
- email, phone
- occupation
- address, city, income_range
- created_at, updated_at
```

#### `admission`

Admission records

```sql
- id (PK)
- school_id (FK)
- student_id (FK)
- lead_id (FK, nullable)
- academic_year_id (FK)
- class_id (FK)
- section_id (FK)
- admission_date
- status (active, on-leave, suspended, withdrawn, draft, submitted)
- admission_type (new, transfer, regular)
- registration_number (unique)
- previous_school
- application_id (FK to application table)
- created_at, updated_at
```

### Multi-Step Application Tables

#### `application`

Main application tracking

```sql
- id (PK)
- school_id (FK)
- academic_year_id (FK)
- lead_id (FK)
- application_number (unique)
- status (draft, in_progress, submitted, approved, rejected)
- current_step (1-6)
- assigned_to (app_user ID)
- rejection_reason
- submitted_at
- created_at, updated_at
```

#### `application_student_info`

Step 1: Student personal information

```sql
- id (PK)
- application_id (FK, unique)
- first_name, middle_name, last_name
- date_of_birth, gender
- email, phone
- address, city, state, postal_code, country
- blood_group, aadhar_number
- created_at, updated_at
```

#### `application_parent_info`

Step 2: Parent/guardian details

```sql
- id (PK)
- application_id (FK, unique)
- father_name, father_occupation, father_email, father_phone
- mother_name, mother_occupation, mother_email, mother_phone
- guardian_name, guardian_relation, guardian_email, guardian_phone
- primary_contact_person, primary_contact_relation, primary_contact_phone
- address, city, state, postal_code, income_range
- created_at, updated_at
```

#### `application_academic_info`

Step 3: Academic history

```sql
- id (PK)
- application_id (FK, unique)
- desired_class
- previous_school, previous_class
- marks_percentage
- board_name, academic_year
- extracurricular_activities
- achievements
- created_at, updated_at
```

#### `application_documents`

Step 5: Document uploads

```sql
- id (PK)
- application_id (FK)
- document_type (birth_certificate, aadhaar_card, passport_photos, etc.)
- file_name, file_path
- document_number
- file_size, mime_type
- verification_status (pending, approved, rejected)
- rejection_reason
- uploaded_by (app_user ID)
- verified_by (app_user ID)
- verified_at
- uploaded_at, created_at, updated_at
- UNIQUE(application_id, document_type)
```

#### `application_progress`

Application step completion status

```sql
- id (PK)
- admission_id (FK, unique)
- student_info_status (pending, completed)
- parent_info_status (pending, completed)
- academic_details_status (pending, completed)
- photos_status (pending, completed)
- documents_status (pending, completed)
- review_status (pending, completed)
- created_at, updated_at
```

### Supporting Tables

#### `app_user`

System users with roles

```sql
- id (PK)
- school_id (FK)
- name
- email (unique across system)
- password_hash
- role (super_admin, admin, counselor, accountant)
- status (active, inactive, suspended)
- UNIQUE(school_id, email)
```

#### `communication_log`

All communications sent

```sql
- id (PK)
- school_id (FK)
- recipient_type (lead, student, parent)
- recipient_id
- channel (email, sms, whatsapp)
- subject
- message
- status (sent, delivered, failed, opened, clicked)
- sent_at, delivered_at, opened_at, clicked_at
- campaign_id (FK, nullable)
- created_by
- created_at
```

#### `message_template`

Communication templates

```sql
- id (PK)
- school_id (FK)
- name
- category (onboarding, follow-up, reminder)
- subject
- content
- last_used_at
- created_at
```

#### `campaign`

Marketing campaigns

```sql
- id (PK)
- school_id (FK)
- name
- channel (email, sms, whatsapp)
- status
- start_date, end_date
- audience_type (lead, student, parent)
- created_at
```

#### `campus_visit`

Campus visit scheduling (Counseling Workspace)

```sql
- id (PK)
- school_id (FK)
- lead_id (FK, nullable)
- visit_date, start_time, end_time
- visitor_name, visitor_phone
- student_name, grade
- number_of_visitors (default 1)
- tour_preferences, internal_notes
- status (scheduled, completed, cancelled, no_show)
- visit_type (campus_visit)
- assigned_to (counselor ID)
- created_by
- created_at, updated_at
- UNIQUE(school_id, assigned_to, visit_date, start_time)
```

#### `task`

Counselor tasks and follow-ups

```sql
- id (PK)
- school_id (FK)
- assigned_to (counselor ID)
- title
- task_description
- priority (low, medium, high)
- is_done (boolean)
- due_date
- created_at, updated_at
```

#### `fee_structure`

Fee definitions

```sql
- id (PK)
- school_id (FK)
- academic_year_id (FK)
- class_id (FK)
- fee_type (Tuition Fee, Admission Fee, etc.)
- amount
- due_date
- description
- is_active
- UNIQUE(academic_year_id, class_id, fee_type)
```

#### `student_fee_assignment`

Fee assignments to students

```sql
- id (PK)
- school_id (FK)
- student_id (FK)
- admission_id (FK)
- fee_structure_id (FK)
- amount, due_date
- concession_percentage, concession_amount
- final_amount
- status (pending, partial, completed, overdue, waived)
- UNIQUE(admission_id, fee_structure_id)
```

#### `invoice`

Invoice records

```sql
- id (PK)
- school_id (FK)
- student_id (FK)
- invoice_number (unique)
- invoice_date, due_date
- total_amount, paid_amount, pending_amount
- status (unpaid, partial, paid, overdue, cancelled)
- notes
- created_by
```

#### `payment`

Payment transactions

```sql
- id (PK)
- school_id (FK)
- student_id (FK)
- invoice_id (FK)
- payment_number (unique)
- amount, payment_date
- payment_method (cash, check, bank-transfer, card, upi, other)
- transaction_id, bank_name, cheque_number
- status (pending, successful, failed, cancelled)
- remarks
- received_by
```

#### `lead_activity`

CRM activity tracking

```sql
- id (PK)
- lead_id (FK)
- activity_type (call, email, visit, sms, whatsapp, follow_up, meeting, no_response, other)
- notes
- outcome (positive, negative, neutral, pending)
- next_follow_up_date
- scheduled_time
- created_by (app_user ID)
- created_at, updated_at
```

#### `audit_log`

Enterprise audit trail

```sql
- id (PK)
- school_id (FK)
- user_id (FK, app_user)
- action (create, update, delete, view, export, approve, reject, submit, other)
- entity (table name)
- entity_id
- status (success, failure)
- old_data (JSONB)
- new_data (JSONB)
- change_summary
- ip_address, user_agent
- created_at
```

---

## API Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {...},
  "pagination": {
    "total": 100,
    "limit": 10,
    "offset": 0,
    "pages": 10
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400
}
```

---

## Authentication

**Type:** JWT (JSON Web Token)  
**Header:** `Authorization: Bearer <TOKEN>`  
**Token Expiration:** 24 hours  
**Token Contains:**

- `id` (user ID)
- `school_id` (tenant ID)
- `role` (user role)
- `email` (user email)

---

## Error Codes

| Code | Description                                   |
| ---- | --------------------------------------------- |
| 200  | OK - Request successful                       |
| 201  | Created - Resource created successfully       |
| 204  | No Content - Resource deleted successfully    |
| 400  | Bad Request - Invalid parameters              |
| 401  | Unauthorized - Missing/invalid authentication |
| 403  | Forbidden - Insufficient permissions          |
| 404  | Not Found - Resource not found                |
| 409  | Conflict - Resource already exists            |
| 500  | Internal Server Error - Server error          |

---

## Rate Limiting

Current implementation: No rate limiting  
Recommended: 1000 requests/hour per user

---

## Notes

- All endpoints use **school_id** from JWT token for tenant isolation (never from request)
- All datetime fields are in **ISO 8601 format** (UTC)
- **File uploads** use multipart/form-data
- **Soft deletes** are used for audit compliance (CASCADE delete only when appropriate)
- Database timestamps use **CURRENT_TIMESTAMP**
- All tables have **created_at** and **updated_at** timestamps with triggers
- **Indexes** are created for foreign keys and frequently queried fields

---

**Document Version:** 1.0.0  
**Last Updated:** May 2, 2026  
**Database:** PostgreSQL  
**API Framework:** Express.js  
**Authentication:** JWT with Bearer token
