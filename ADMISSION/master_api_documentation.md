# School ERP - Master API Documentation

**Version:** 2.0  
**Date:** May 2, 2026  
**Base URL:** `http://localhost:5001/api`  
**Status:** Production Ready  
**Author:** Technical Architecture Team

> **⚠️ Source of Truth:** This is the authoritative API reference for the School ERP system. All endpoints explicitly document their database table interactions, making it the single source of truth for backend integration.

---

## Table of Contents

1. [Overview & Design Principles](#overview--design-principles)
2. [Authentication](#authentication)
3. [Lead Management](#lead-management)
4. [Application Workflow](#application-workflow)
5. [Admission Management](#admission-management)
6. [Student Management](#student-management)
7. [Parent Management](#parent-management)
8. [Communication APIs](#communication-apis)
9. [Counseling Workspace](#counseling-workspace)
10. [School Management](#school-management)
11. [User & Role Management](#user--role-management)
12. [Dashboard & Analytics](#dashboard--analytics)
13. [Templates & Campaigns](#templates--campaigns)
14. [Error Handling](#error-handling)
15. [Database Schema Reference](#database-schema-reference)
16. [Quick Reference Guide](#quick-reference-guide)

---

## Overview & Design Principles

### Multi-Tenancy

- All endpoints enforce `school_id` from JWT token
- No cross-school data access
- Every query is scoped to authenticated school

### Database Constraints

- **Immutable Fields:** `school_id`, `created_by` (cannot be changed after creation)
- **Unique Constraints:** Admission numbers, emails, application numbers are unique per school
- **Referential Integrity:** Foreign keys ensure data consistency

### API Conventions

1. **Request/Response Format:** Always JSON
2. **Status Codes:**
   - `200` = Success (GET, PUT, DELETE)
   - `201` = Created (POST)
   - `400` = Bad Request
   - `401` = Unauthorized
   - `403` = Forbidden
   - `404` = Not Found
   - `500` = Server Error
3. **Authentication:** JWT Bearer Token required (except login/signup)
4. **Partial Updates:** Most PUT endpoints accept partial data
5. **Pagination:** Supported on list endpoints with `limit` and `offset` params

### Critical Clarifications

- ⚠️ **Auto-fill is frontend responsibility** - Backend does NOT auto-populate application fields
- ⚠️ **Max 1 submitted application per lead** - Multiple drafts allowed, only 1 can be submitted
- ⚠️ **School_id from JWT token** - Never send in request body, always derived from token
- ⚠️ **Field mapping is explicit** - See section "Data Mapping: Leads → Applications"

---

## Authentication

### POST /api/auth/login

**Purpose:** Authenticate user and receive JWT token  
**Authentication:** None (public)

**Does:**

- Validates email/password credentials
- Returns JWT token with embedded `school_id` and `user_id`
- Returns user metadata (name, email, role)

**Database Tables:** `users` (reads email/password hash)

**Request:**

```json
{
  "email": "admin@school.com",
  "password": "password123"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 123,
      "name": "Admin User",
      "email": "admin@school.com",
      "school_id": 1,
      "role": "admin"
    }
  },
  "message": "Login successful"
}
```

---

### POST /api/auth/signup

**Purpose:** Create new user account  
**Authentication:** None (public)

**Database Tables:** `users` (creates new record)

**Request:**

```json
{
  "name": "John Counselor",
  "email": "john@school.com",
  "password": "pass123",
  "school_id": 1,
  "role": "counselor"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 124,
      "name": "John Counselor",
      "email": "john@school.com",
      "school_id": 1,
      "role": "counselor"
    }
  },
  "message": "Account created successfully"
}
```

---

### GET /api/auth/me

**Purpose:** Verify token and get current user details  
**Authentication:** Required (JWT Bearer token)

**Database Tables:** `users` (validates token against user record)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "school_id": 1,
    "name": "Admin User",
    "email": "admin@school.com",
    "role": "admin"
  }
}
```

---

## Lead Management

### POST /api/leads

**Purpose:** Create a new lead (prospective student)  
**Authentication:** Required  
**Database Tables:** `lead`, `academic_year`, `school`

**Request:**

```json
{
  "first_name": "Arjun",
  "last_name": "Kapoor",
  "email": "arjun@example.com",
  "phone": "+91-9876543211",
  "desired_class": "Grade 5",
  "source": "Website",
  "notes": "Very interested",
  "academic_year_id": 2026,
  "follow_up_status": "pending"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "school_id": 1,
    "first_name": "Arjun",
    "last_name": "Kapoor",
    "follow_up_status": "pending",
    "created_at": "2026-05-02T10:00:00Z"
  },
  "message": "Lead created successfully"
}
```

---

### GET /api/leads

**Purpose:** Retrieve all leads for authenticated school with optional filters  
**Authentication:** Required  
**Database Tables:** `lead`, `academic_year`

**Query Parameters:**

- `follow_up_status` (string): Filter by status
- `desired_class` (string): Filter by class
- `search` (string): Search by name/email
- `limit` (int): Records per page
- `offset` (int): Pagination offset

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "first_name": "Arjun",
      "email": "arjun@example.com",
      "phone": "+91-9876543211",
      "desired_class": "Grade 5",
      "follow_up_status": "interested"
    }
  ]
}
```

---

### GET /api/leads/:id

**Purpose:** Get single lead details by ID  
**Authentication:** Required  
**Database Tables:** `lead`, `academic_year`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "first_name": "Arjun",
    "last_name": "Kapoor",
    "email": "arjun@example.com",
    "phone": "+91-9876543211",
    "desired_class": "Grade 5",
    "follow_up_status": "interested",
    "assigned_to": "counselor_123",
    "created_at": "2026-04-15T10:00:00Z"
  }
}
```

---

### PUT /api/leads/:id

**Purpose:** Update lead information  
**Authentication:** Required  
**Database Tables:** `lead` (updates record)

**Request:**

```json
{
  "follow_up_status": "interested",
  "notes": "Updated notes",
  "assigned_to": "counselor_id"
}
```

**Response (200):** Returns updated lead object

---

### DELETE /api/leads/:id

**Purpose:** Delete a lead  
**Authentication:** Required  
**Database Tables:** `lead` (CASCADE delete affects related records)

**Response (200):**

```json
{
  "success": true,
  "message": "Lead deleted successfully"
}
```

---

### GET /api/leads/followups/upcoming

**Purpose:** Get leads with upcoming follow-ups  
**Authentication:** Required  
**Database Tables:** `lead`

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "lead_id": 1,
      "first_name": "Arjun",
      "phone": "+91-9876543211",
      "follow_up_date": "2026-05-05"
    }
  ]
}
```

---

## Application Workflow

### POST /api/applications

**Purpose:** Create application from existing lead  
**Authentication:** Required  
**Database Tables:** `admission`, `lead`, `academic_year`, `application_progress`

**Does:**

- Creates admission record in draft status
- Initializes application_progress tracker
- Links to lead and academic year
- Assigns unique application number

**Request:**

```json
{
  "lead_id": 1,
  "academic_year_id": 2026
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "lead_id": 1,
    "application_number": "APP-2026-001",
    "status": "draft",
    "current_step": 1
  }
}
```

---

### POST /api/applications/new

**Purpose:** Create application without lead (manual/walk-in entry)  
**Authentication:** Required  
**Database Tables:** `admission`, `academic_year`, `application_progress`

**Request:**

```json
{
  "academic_year_id": 2026
}
```

**Response (201):** Returns application with `lead_id: null`

---

### GET /api/applications

**Purpose:** List all applications with pagination  
**Authentication:** Required  
**Database Tables:** `admission`, `lead`, `academic_year`

**Query Parameters:**

- `limit` (int): Records per page
- `offset` (int): Pagination offset

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "application_number": "APP-2026-001",
      "lead_name": "Arjun Kapoor",
      "status": "in_progress",
      "current_step": 3
    }
  ]
}
```

---

### GET /api/applications/eligible-leads

**Purpose:** Get leads eligible for creating an application (not yet converted)  
**Authentication:** Required  
**Database Tables:** `lead`, `admission`

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "first_name": "Arjun",
      "last_name": "Kapoor",
      "email": "arjun@example.com",
      "phone": "+91-9876543211"
    }
  ]
}
```

---

### GET /api/applications/counts

**Purpose:** Get application statistics for dashboard  
**Authentication:** Required  
**Database Tables:** `admission`

**Response (200):**

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

---

### GET /api/applications/:id/progress

**Purpose:** Get application step progress  
**Authentication:** Required  
**Database Tables:** `application_progress`

**Response (200):**

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

---

### POST /api/applications/:id/student-info

**Purpose:** Save Step 1 - Student Personal Information  
**Authentication:** Required  
**Database Tables:** `application_student_info`, `student`, `admission`, `application_progress`

**Request:**

```json
{
  "first_name": "Arjun",
  "last_name": "Kapoor",
  "date_of_birth": "2015-08-15",
  "gender": "Male",
  "email": "arjun@example.com",
  "phone": "+91-9876543211",
  "blood_group": "O+",
  "aadhar_number": "1234567890123456"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "admission_id": 1,
    "status": "completed"
  }
}
```

---

### POST /api/applications/:id/parent-info

**Purpose:** Save Step 2 - Parent/Guardian Information  
**Authentication:** Required  
**Database Tables:** `application_parent_info`, `parent_detail`, `application_progress`

**Request:**

```json
{
  "father_name": "Rajesh Kapoor",
  "father_occupation": "Engineer",
  "father_phone": "+91-9123456780",
  "mother_name": "Priya Kapoor",
  "mother_occupation": "Doctor",
  "mother_phone": "+91-9123456781"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "admission_id": 1,
    "status": "completed"
  }
}
```

---

### POST /api/applications/:id/academic-details

**Purpose:** Save Step 3 - Academic Information  
**Authentication:** Required  
**Database Tables:** `application_academic_info`, `application_progress`

**Request:**

```json
{
  "current_class": "Grade 4",
  "current_school": "ABC School",
  "cgpa": 8.5
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "admission_id": 1,
    "status": "completed"
  }
}
```

---

### POST /api/applications/:id/photos

**Purpose:** Save Step 4 - Upload Student Photo  
**Authentication:** Required  
**Database Tables:** `documents`, `application_progress`  
**Content-Type:** `multipart/form-data`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "admission_id": 1,
    "file_path": "/uploads/documents/photo_1_2026-05-02.jpg",
    "status": "completed"
  }
}
```

---

### POST /api/applications/:id/documents

**Purpose:** Save Step 5 - Upload Supporting Documents  
**Authentication:** Required  
**Database Tables:** `documents`, `application_progress`  
**Content-Type:** `multipart/form-data`

**Allowed Document Types:**

- `student_photo`
- `aadhar_card`
- `birth_certificate`
- `transfer_certificate`
- `previous_marksheet`
- `other`

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "admission_id": 1,
      "document_type": "aadhar_card",
      "file_path": "/uploads/documents/aadhar_1.pdf"
    }
  ]
}
```

---

### POST /api/applications/:id/review

**Purpose:** Save Step 6 - Review & Submit Application  
**Authentication:** Required  
**Database Tables:** `admission`, `application_progress`

**Request:**

```json
{
  "consent": true,
  "acknowledge": true
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "admission_id": 1,
    "application_number": "APP-2026-001",
    "status": "submitted"
  }
}
```

**Database Operations:**

- Updates `admission.status` to 'submitted'
- Records all steps as 'completed' in `application_progress`

---

### GET /api/applications/:id/details

**Purpose:** Get full application details for resuming  
**Authentication:** Required  
**Database Tables:** `admission`, `application_student_info`, `application_parent_info`, `application_academic_info`, `documents`, `application_progress`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "admission_id": 1,
    "application_number": "APP-2026-001",
    "status": "in_progress",
    "student_info": {},
    "parent_info": {},
    "academic_info": {},
    "documents": [],
    "progress": {}
  }
}
```

---

## Admission Management

### POST /api/admissions/create

**Purpose:** Create final admission from submitted application  
**Authentication:** Required (admin/screener)  
**Database Tables:** `admission`, `student`, `student_fee_assignment`, `fee_structure`, `section`

**Request:**

```json
{
  "admission_id": 1,
  "class_id": 5,
  "section_id": 2,
  "admission_date": "2026-05-15",
  "admission_type": "new",
  "registration_number": "REG-2026-001"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "admission_id": 1,
    "student_id": 100,
    "admission_number": "ADM-2026-001",
    "status": "active"
  }
}
```

---

### GET /api/admissions

**Purpose:** Get all admissions with filters  
**Authentication:** Required  
**Database Tables:** `admission`, `student`, `school_class`, `section`

**Query Parameters:**

- `status` (string): 'active', 'withdrawn', 'suspended', 'on-leave'
- `class_id` (int): Filter by class
- `limit` (int): Pagination limit
- `offset` (int): Pagination offset

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "student_id": 100,
      "admission_number": "ADM-2026-001",
      "student_name": "Arjun Kapoor",
      "class": "Grade 5",
      "status": "active"
    }
  ]
}
```

---

### GET /api/admissions/stats

**Purpose:** Get admission statistics  
**Authentication:** Required  
**Database Tables:** `admission`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "total_admissions": 150,
    "active": 140,
    "withdrawn": 5,
    "suspended": 3,
    "on_leave": 2
  }
}
```

---

### GET /api/admissions/search

**Purpose:** Search admissions by criteria  
**Authentication:** Required  
**Database Tables:** `admission`, `student`, `application_student_info`

**Query Parameters:**

- `q` (string): Search query (student name, admission number)
- `status` (string): Filter by status
- `class_id` (int): Filter by class

**Response (200):** Returns matching admissions

---

## Student Management

### POST /api/students/enroll

**Purpose:** Create student record from approved admission  
**Authentication:** Required  
**Database Tables:** `student`, `admission`

**Request:**

```json
{
  "admission_id": 1
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "student_id": 100,
    "admission_number": "ADM-2026-001",
    "first_name": "Arjun"
  }
}
```

---

### GET /api/students

**Purpose:** Get all enrolled students  
**Authentication:** Required  
**Database Tables:** `student`, `admission`, `school_class`, `section`

**Query Parameters:**

- `status` (string): 'active', 'inactive', 'passed-out'
- `class_id` (int): Filter by class
- `search` (string): Search by name

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 100,
      "admission_number": "ADM-2026-001",
      "first_name": "Arjun",
      "email": "arjun@example.com",
      "class": "Grade 5",
      "status": "active"
    }
  ]
}
```

---

### GET /api/students/:id

**Purpose:** Get single student details  
**Authentication:** Required  
**Database Tables:** `student`, `admission`, `parent_detail`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 100,
    "admission_number": "ADM-2026-001",
    "first_name": "Arjun",
    "email": "arjun@example.com",
    "phone": "+91-9876543211",
    "blood_group": "O+",
    "aadhar_number": "1234567890123456",
    "status": "active",
    "parents": []
  }
}
```

---

### PUT /api/students/:id

**Purpose:** Update student information  
**Authentication:** Required  
**Database Tables:** `student` (updates record)

**Request:**

```json
{
  "phone": "+91-9876543211",
  "address": "456 New Street"
}
```

**Response (200):** Returns updated student

---

## Parent Management

### POST /api/parents

**Purpose:** Add parent/guardian to student  
**Authentication:** Required  
**Database Tables:** `parent_detail`, `student`

**Request:**

```json
{
  "student_id": 100,
  "relation": "Father",
  "first_name": "Rajesh",
  "last_name": "Kapoor",
  "email": "rajesh@example.com",
  "phone": "+91-9123456780",
  "occupation": "Engineer"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": 50,
    "student_id": 100,
    "relation": "Father",
    "first_name": "Rajesh"
  }
}
```

---

### GET /api/parents/:student_id

**Purpose:** Get all parents of a student  
**Authentication:** Required  
**Database Tables:** `parent_detail`

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 50,
      "relation": "Father",
      "first_name": "Rajesh",
      "email": "rajesh@example.com",
      "phone": "+91-9123456780"
    }
  ]
}
```

---

### PUT /api/parents/:id

**Purpose:** Update parent information  
**Authentication:** Required  
**Database Tables:** `parent_detail`

**Response (200):** Returns updated parent

---

### DELETE /api/parents/:id

**Purpose:** Remove parent from student  
**Authentication:** Required  
**Database Tables:** `parent_detail`

**Response (200):**

```json
{
  "success": true,
  "message": "Parent removed successfully"
}
```

---

## Communication APIs

### POST /api/communication/send-email

**Purpose:** Send email to recipients  
**Authentication:** Required  
**Database Tables:** `email_log`, `communication_recipient`

**Request:**

```json
{
  "subject": "Admission Fee Structure",
  "message": "Here's the fee structure...",
  "recipients": [{ "recipient_type": "lead", "id": 1 }]
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "email_log_id": 1,
    "recipients_count": 1,
    "status": "sent"
  }
}
```

---

### GET /api/communication/email-logs

**Purpose:** Get email delivery history  
**Authentication:** Required  
**Database Tables:** `email_log`

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "subject": "Admission Fee Structure",
      "recipient": "arjun@example.com",
      "status": "delivered",
      "sent_at": "2026-05-02T10:00:00Z"
    }
  ]
}
```

---

### GET /api/communication/email-stats

**Purpose:** Get email campaign statistics  
**Authentication:** Required  
**Database Tables:** `email_log`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "total_emails": 100,
    "delivered": 98,
    "opened": 42,
    "clicked": 15,
    "open_rate": 42.86
  }
}
```

---

### POST /api/communication/send-sms

**Purpose:** Send SMS to recipients  
**Authentication:** Required  
**Database Tables:** `sms_log`, `communication_recipient`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "sms_log_id": 1,
    "status": "sent"
  }
}
```

---

### GET /api/communication/sms-logs

**Purpose:** Get SMS delivery history  
**Authentication:** Required  
**Database Tables:** `sms_log`

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "recipient_phone": "+91-9876543211",
      "status": "delivered"
    }
  ]
}
```

---

### POST /api/communication/send-whatsapp

**Purpose:** Send WhatsApp message  
**Authentication:** Required  
**Database Tables:** `whatsapp_log`, `communication_recipient`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "whatsapp_log_id": 1,
    "status": "sent"
  }
}
```

---

### POST /api/templates

**Purpose:** Create email/SMS template  
**Authentication:** Required  
**Database Tables:** `template`

**Request:**

```json
{
  "name": "Admission Confirmation",
  "category": "Onboarding",
  "subject": "Congratulations!",
  "content": "Dear {{first_name}}...",
  "type": "email"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Admission Confirmation"
  }
}
```

---

### GET /api/templates

**Purpose:** Get all templates  
**Authentication:** Required  
**Database Tables:** `template`

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Admission Confirmation",
      "type": "email"
    }
  ]
}
```

---

### POST /api/campaigns

**Purpose:** Create email campaign  
**Authentication:** Required  
**Database Tables:** `campaign`, `campaign_recipient`

**Request:**

```json
{
  "name": "May Batch Outreach",
  "subject": "Admissions Open",
  "content": "Join us...",
  "schedule_date": "2026-05-05T09:00:00Z"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "May Batch Outreach",
    "status": "scheduled"
  }
}
```

---

## Counseling Workspace

### GET /api/counseling/stats

**Purpose:** Get counselor dashboard statistics  
**Authentication:** Required  
**Database Tables:** `lead`, `campus_visit`, `task`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "assigned_leads": 15,
    "upcoming_visits": 3,
    "pending_tasks": 7
  }
}
```

---

### GET /api/counseling/visits

**Purpose:** Get campus visits  
**Authentication:** Required  
**Database Tables:** `campus_visit`, `lead`

**Query Parameters:**

- `type` (string): 'upcoming', 'missed', 'completed'

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "visitor_name": "Arjun Kapoor",
      "visit_date": "2026-05-05",
      "start_time": "10:00",
      "grade": "Grade 5",
      "status": "scheduled"
    }
  ]
}
```

---

### POST /api/counseling/visits

**Purpose:** Schedule campus visit  
**Authentication:** Required  
**Database Tables:** `campus_visit`, `lead`, `section`

**Request:**

```json
{
  "visitor_name": "Arjun Kapoor",
  "visit_date": "2026-05-05",
  "start_time": "10:00",
  "grade": "Grade 5",
  "assigned_counselor": "counselor_123",
  "lead_id": 1
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "visitor_name": "Arjun Kapoor",
    "status": "scheduled"
  }
}
```

---

### PUT /api/counseling/visits/:id

**Purpose:** Update campus visit  
**Authentication:** Required  
**Database Tables:** `campus_visit`

**Response (200):** Returns updated visit

---

### DELETE /api/counseling/visits/:id

**Purpose:** Cancel campus visit  
**Authentication:** Required  
**Database Tables:** `campus_visit`

**Response (200):**

```json
{
  "success": true,
  "message": "Visit cancelled successfully"
}
```

---

### POST /api/counseling/visits/:id/complete

**Purpose:** Mark visit as completed  
**Authentication:** Required  
**Database Tables:** `campus_visit`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "completed"
  }
}
```

---

## School Management

### GET /api/schools/:id

**Purpose:** Get school details  
**Authentication:** Required  
**Database Tables:** `school`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Lakeside International School",
    "email": "info@lakeside.edu",
    "phone": "+91-1234567890",
    "address": "123 School Road",
    "city": "Delhi",
    "principal_name": "Dr. Rajesh Kumar"
  }
}
```

---

### GET /api/schools/:id/classes

**Purpose:** Get classes in school  
**Authentication:** Required  
**Database Tables:** `school_class`, `section`

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "class_name": "Grade 1",
      "medium": "English",
      "sections": [{ "id": 1, "section_name": "A", "capacity": 60 }]
    }
  ]
}
```

---

### GET /api/schools/:id/academic-years

**Purpose:** Get academic years  
**Authentication:** Required  
**Database Tables:** `academic_year`

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "year_name": "2025-26",
      "start_date": "2025-04-01",
      "is_active": false
    }
  ]
}
```

---

## User & Role Management

### POST /api/users

**Purpose:** Create new user  
**Authentication:** Required (admin only)  
**Database Tables:** `users`

**Request:**

```json
{
  "name": "Jane Counselor",
  "email": "jane@school.com",
  "password": "secure_pass123",
  "role": "counselor"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Jane Counselor",
    "email": "jane@school.com",
    "role": "counselor"
  }
}
```

---

### GET /api/users

**Purpose:** List all users in school  
**Authentication:** Required (admin)  
**Database Tables:** `users`

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Admin User",
      "email": "admin@school.com",
      "role": "admin"
    }
  ]
}
```

---

### PUT /api/users/:id

**Purpose:** Update user  
**Authentication:** Required (admin)  
**Database Tables:** `users`

**Response (200):** Returns updated user

---

### DELETE /api/users/:id

**Purpose:** Delete user  
**Authentication:** Required (admin)  
**Database Tables:** `users`

**Response (200):**

```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## Dashboard & Analytics

### GET /api/dashboard/stats

**Purpose:** Get main dashboard metrics  
**Authentication:** Required  
**Database Tables:** `lead`, `admission`, `student`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "total_leads": 200,
    "applications_submitted": 50,
    "admissions_approved": 35,
    "conversion_rate": 17.5
  }
}
```

---

### GET /api/dashboard/funnel

**Purpose:** Get admission funnel visualization data  
**Authentication:** Required  
**Database Tables:** `lead`, `admission`, `student`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "leads": 200,
    "applications": 50,
    "admissions": 35,
    "enrolled": 30
  }
}
```

---

### GET /api/dashboard/recent-activities

**Purpose:** Get recent system activities  
**Authentication:** Required  
**Database Tables:** `admission`, `lead`, `campus_visit`

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "application_submitted",
      "description": "Arjun Kapoor submitted application",
      "timestamp": "2026-05-02T15:30:00Z"
    }
  ]
}
```

---

## Error Handling

### Standard Error Response

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional details if available"
  }
}
```

### Common HTTP Status Codes

| Code  | Meaning                              |
| ----- | ------------------------------------ |
| `200` | OK - Request succeeded               |
| `201` | Created - Resource created           |
| `400` | Bad Request - Invalid parameters     |
| `401` | Unauthorized - Invalid/missing token |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource doesn't exist   |
| `500` | Server Error - Internal error        |

---

## Database Schema Reference

### Core Tables

| Table                    | Purpose                   | Key Fields                                         |
| ------------------------ | ------------------------- | -------------------------------------------------- |
| `school`                 | Tenant information        | id, name, email, phone, address                    |
| `academic_year`          | Academic periods          | id, school_id, year_name, is_active                |
| `school_class`           | Class/Grade definitions   | id, school_id, class_name, medium                  |
| `section`                | Class sections            | id, school_id, class_id, section_name              |
| `lead`                   | Prospective students      | id, school_id, first_name, email, follow_up_status |
| `admission`              | Admission records         | id, school_id, student_id, lead_id, status         |
| `student`                | Enrolled students         | id, school_id, admission_number, first_name        |
| `parent_detail`          | Parent information        | id, school_id, student_id, relation                |
| `users`                  | User accounts             | id, school_id, name, email, role                   |
| `application_progress`   | Multi-step form progress  | admission_id, student_info_status, etc.            |
| `documents`              | File uploads              | id, admission_id, document_type, file_path         |
| `email_log`              | Email delivery history    | id, recipient, status, sent_at                     |
| `sms_log`                | SMS delivery history      | id, recipient_phone, status                        |
| `whatsapp_log`           | WhatsApp message history  | id, recipient_phone, status                        |
| `campus_visit`           | Campus visit scheduling   | id, visitor_name, visit_date, status               |
| `template`               | Message templates         | id, name, type, content                            |
| `campaign`               | Email campaigns           | id, name, status, scheduled_date                   |
| `fee_structure`          | Fee definition            | id, class_id, fee_type, amount                     |
| `student_fee_assignment` | Fee assignment to student | id, student_id, fee_structure_id                   |

---

## Quick Reference Guide

### Core Admission Flow

```
1. POST /api/leads (Create Lead)
2. POST /api/applications (Create Application from Lead)
3. POST /api/applications/:id/student-info (Step 1)
4. POST /api/applications/:id/parent-info (Step 2)
5. POST /api/applications/:id/academic-details (Step 3)
6. POST /api/applications/:id/photos (Step 4)
7. POST /api/applications/:id/documents (Step 5)
8. POST /api/applications/:id/review (Step 6)
9. POST /api/admissions/create (Create Admission)
10. POST /api/students/enroll (Create Student)
```

### Standard Response Format

**Success:**

```json
{
  "success": true,
  "data": {
    /* response data */
  },
  "message": "Success message"
}
```

**Error:**

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional details"
  }
}
```

---

**Last Updated:** May 2, 2026  
**Maintained By:** Technical Architecture Team  
**Repository:** School ERP Backend
