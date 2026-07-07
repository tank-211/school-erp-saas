# API Endpoint Summary - School ERP System

## Quick Reference

**Total Endpoints:** 80+  
**Core Routes:** 18  
**Authentication:** JWT Bearer Token  
**Base URL:** `http://localhost:5001/api`

---

## Core Admission Flow (Critical Path)

```
1. Lead Creation → 2. Create Application → 3. Fill Multi-Step Form → 4. Submit → 5. Approval → 6. Admission
   /leads            /applications          /applications/:id/*      /applications/:id/review  /admissions
```

### Lead Lifecycle

- **Create Lead:** `POST /api/leads`
- **Update Lead:** `PUT /api/leads/:id`
- **Get Leads:** `GET /api/leads?filters`
- **Convert to Application:** `POST /api/applications`

### Application Workflow (Multi-Step)

- **Step 1 (Student Info):** `POST /api/applications/:id/student-info`
- **Step 2 (Parent Info):** `POST /api/applications/:id/parent-info`
- **Step 3 (Academic Info):** `POST /api/applications/:id/academic-details`
- **Step 4 (Photos):** `POST /api/applications/:id/photos`
- **Step 5 (Documents):** `POST /api/applications/:id/documents`
- **Step 6 (Review/Submit):** `POST /api/applications/:id/review`
- **Get Progress:** `GET /api/applications/:id/progress`
- **Resume Application:** `GET /api/applications/:id/details`

### Admission

- **Create Admission:** `POST /api/admissions/create`
- **Get Admissions:** `GET /api/admissions`
- **Get Stats:** `GET /api/admissions/stats`
- **Search:** `GET /api/admissions/search`

---

## Endpoint Reference by Module

### Authentication (3 endpoints)

```
POST   /api/auth/login              → User login
POST   /api/auth/signup             → User registration
GET    /api/auth/me                 → Get current user
```

### Lead Management (6 endpoints)

```
POST   /api/leads                   → Create lead
GET    /api/leads                   → Get all leads (with filters)
GET    /api/leads/:id               → Get lead by ID
PUT    /api/leads/:id               → Update lead
DELETE /api/leads/:id               → Delete lead
GET    /api/leads/followups/upcoming → Get upcoming follow-ups
```

### Application Management (12 endpoints)

```
POST   /api/applications            → Create from lead
POST   /api/applications/new        → Create manual entry
POST   /api/applications/save-step  → Save step data
GET    /api/applications            → Get all applications
GET    /api/applications/counts     → Get statistics
GET    /api/applications/search     → Search applications
GET    /api/applications/eligible-leads → Get available leads
GET    /api/applications/:id/progress   → Get progress status
GET    /api/applications/:id/details    → Get full details
POST   /api/applications/:id/student-info    → Save student info
POST   /api/applications/:id/parent-info     → Save parent info
POST   /api/applications/:id/academic-details → Save academic info
POST   /api/applications/:id/photos         → Upload photos
POST   /api/applications/:id/documents      → Upload documents
POST   /api/applications/:id/review         → Submit for review
```

### Admission Management (6 endpoints)

```
POST   /api/admissions/create           → Create admission
POST   /api/admissions/create-from-lead → Create from lead
GET    /api/admissions                  → Get all admissions
GET    /api/admissions/stats            → Get statistics
GET    /api/admissions/search           → Search admissions
GET    /api/admissions/:applicationId   → Get admission details
```

### Student Management (4 endpoints)

```
GET    /api/students                 → Get all students
GET    /api/students/:id             → Get student with parents & admissions
POST   /api/students                 → Create student
POST   /api/students/save            → Save student
```

### Parent Management (2 endpoints)

```
GET    /api/parents/:id              → Get parent by ID
POST   /api/parents/save             → Create/update parent
```

### Communication (5 endpoints)

```
GET    /api/communication/recipients → Get recipient list
POST   /api/communication/send       → Send communication
GET    /api/communication/logs       → Get communication logs
PUT    /api/communication/:id/status → Update status
GET    /api/communication/logs       → Get logs with filters
```

### Email Management (8 endpoints)

```
POST   /api/email/send               → Send email
POST   /api/email/resolve-recipient  → Resolve recipient
GET    /api/email/logs               → Get email logs
GET    /api/email/stats              → Get email statistics
POST   /api/email/templates          → Create template
GET    /api/email/templates          → Get templates
PUT    /api/email/templates/:id      → Update template
DELETE /api/email/templates/:id      → Delete template
```

### SMS Management (2 endpoints)

```
POST   /api/sms/send                 → Send SMS
GET    /api/sms/logs                 → Get SMS logs
```

### WhatsApp Management (2 endpoints)

```
POST   /api/whatsapp/send            → Send WhatsApp message
GET    /api/whatsapp/logs            → Get WhatsApp logs
```

### Counseling Workspace (9 endpoints)

```
GET    /api/counseling/stats              → Get counselor stats
GET    /api/counseling/visits             → Get visits
POST   /api/counseling/visits             → Create visit
GET    /api/counseling/visits/future      → Get future visits
GET    /api/counseling/visits/missed      → Get missed visits
GET    /api/counseling/visits/:id         → Get visit details
PUT    /api/counseling/visits/:id         → Update visit
PATCH  /api/counseling/visits/:id/status  → Update status
DELETE /api/counseling/visits/:id         → Delete visit
GET    /api/counseling/leads/search       → Search assigned leads
GET    /api/counseling/slots              → Get available slots
```

### School Management (4 endpoints)

```
GET    /api/schools                  → Get all schools
GET    /api/schools/:id              → Get school by ID
GET    /api/schools/:schoolId/counselors → Get counselors
POST   /api/schools                  → Create school
```

### User Management (3 endpoints)

```
GET    /api/users                    → Get users
POST   /api/users                    → Create user
PUT    /api/users/:id/reset-password → Reset password
```

### Admin Management (4 endpoints)

```
GET    /api/admin/users              → Get all users (admin only)
POST   /api/admin/create-user        → Create user (admin only)
PUT    /api/admin/update-password/:id → Update password (admin only)
DELETE /api/admin/delete-user/:id    → Delete user (admin only)
```

### Dashboard & Analytics (4 endpoints)

```
GET    /api/dashboard                    → Get main dashboard stats
GET    /api/dashboard/monthly-trend      → Get monthly trends
GET    /api/dashboard/grade-distribution → Get grade distribution
GET    /api/dashboard/counselor-performance → Get counselor metrics
```

### Templates & Campaigns (7 endpoints)

```
POST   /api/templates                → Create template
GET    /api/templates                → Get templates
PUT    /api/templates/:id            → Update template
DELETE /api/templates/:id            → Delete template
POST   /api/campaigns                → Create campaign
GET    /api/campaigns                → Get campaigns
POST   /api/campaigns/:id/send       → Send campaign
```

---

## Database Tables (32 Tables)

### Tenant & School Setup

- `school` - Multi-tenant organizations
- `academic_year` - Academic year definitions
- `school_class` - Class definitions
- `section` - Class sections

### Admission Core

- `lead` - Prospective students (CRM)
- `student` - Confirmed students
- `parent_detail` - Parent/guardian info
- `admission` - Admission records

### Application (Multi-Step Form)

- `application` - Main application tracking
- `application_student_info` - Step 1: Student details
- `application_parent_info` - Step 2: Parent details
- `application_academic_info` - Step 3: Academic history
- `application_documents` - Step 5: Document uploads
- `application_progress` - Progress tracking

### Finance

- `fee_structure` - Fee definitions
- `student_fee_assignment` - Fee assignments
- `invoice` - Invoice records
- `payment` - Payment transactions

### User & Security

- `app_user` - System users with roles
- `audit_log` - Enterprise audit trail

### Communication

- `communication_log` - All communications
- `message_template` - Message templates
- `campaign` - Marketing campaigns
- `scheduled_emails` - Scheduled emails

### Counseling Workspace

- `campus_visit` - Campus visit scheduling
- `task` - Counselor tasks
- `lead_activity` - CRM activity tracking

### Additional

- `documents` - Document metadata (legacy)
- `student_photos` - Student photo storage (step 4)
- `academic` - Academic details (step 3)

---

## Key Database Relationships

### Lead → Application → Admission Flow

```
lead (id, school_id, academic_year_id)
  ↓
application (id, lead_id, school_id, academic_year_id)
  ↓
application_* (student_info, parent_info, academic_info, documents, progress)
  ↓
admission (id, school_id, student_id, lead_id, academic_year_id, class_id, section_id)
  ↓
student (id, school_id)
parent_detail (id, school_id, student_id)
```

### Multi-Tenancy

- **All tables** have `school_id` foreign key
- **app_user** linked to school
- **All queries** filtered by `school_id` from JWT token
- **UNIQUE** constraints include school_id where needed

### Indexing Strategy

- **Foreign Keys:** Automatically indexed
- **Frequently Queried:** school_id, status, created_at, follow_up_status
- **Performance Queries:** Dashboard queries use multi-column indexes

---

## Common Request/Response Patterns

### Pagination

```json
{
  "limit": 10,
  "offset": 0,
  "total": 100,
  "pages": 10
}
```

### Filters

```
GET /api/leads?follow_up_status=interested&desired_class=Grade5&limit=20
GET /api/applications?status=submitted&offset=20
GET /api/communication/logs?channel=email&status=delivered&from_date=2026-05-01
```

### File Upload

```
POST /api/applications/:id/documents
Content-Type: multipart/form-data

Form data:
- document_type: "birth_certificate"
- file: <binary file>
- document_number: "BC123456"
```

### Error Handling

```json
{
  "success": false,
  "message": "Field is required: email",
  "statusCode": 400
}
```

---

## Constraint Examples

### Unique Constraints

- `school (name)` - One school name per system
- `app_user (email)` - Global email uniqueness
- `app_user (school_id, email)` - Email unique per school
- `student (admission_number)` - Global uniqueness
- `application (school_id, application_number)` - Number unique per school
- `campus_visit (school_id, assigned_to, visit_date, start_time)` - No double-booking
- `application_documents (application_id, document_type)` - One doc type per app

### Cascade Deletes

- Delete `school` → deletes all related data (cascade)
- Delete `admission` → deletes `application_progress`, `documents`
- Delete `lead` → deletes `campus_visit`, `lead_activity`

### Foreign Key Constraints

- `application_documents.application_id` → `application(id)` ON DELETE CASCADE
- `campus_visit.assigned_to` → `app_user(id)` ON DELETE SET NULL
- `lead.created_by` → VARCHAR (not FK, for flexibility)

---

## Authentication & Authorization

### User Roles

1. **super_admin** - System administrator (across all schools)
2. **admin** - School administrator
3. **counselor** - Admission counselor
4. **accountant** - Finance officer

### Protected Routes

- All `/api/*` routes except `/api/auth/login`, `/api/auth/signup`
- Some endpoints require additional role checks (e.g., admin operations)

### Token Claims

```json
{
  "id": 1,
  "school_id": 1,
  "role": "counselor",
  "email": "user@school.com",
  "iat": 1234567890,
  "exp": 1234654290
}
```

---

## Performance Optimization Notes

1. **Indexes Created On:**
   - All foreign keys
   - `follow_up_status` (leads list filtering)
   - `status` (applications, admissions, payment)
   - `created_at` (recent records)
   - `school_id + status + date` (dashboard queries)

2. **N+1 Query Prevention:**
   - Use `JOIN` queries for related data
   - Batch load parent/student with admissions
   - Load communication logs with recipient details

3. **Large Result Sets:**
   - Always paginate (max 100 per page)
   - Filter by school_id and status
   - Use LIMIT/OFFSET with indexes

---

## Migration Files Applied

1. `migration-add-document-number.sql` - Added document number tracking
2. `migration-add-email-indexes.sql` - Performance indexes
3. `migration-add-followup-indexes.sql` - Lead follow-up performance
4. `migration-add-scheduled-emails.sql` - Scheduled email support
5. `migration-add-sms-whatsapp-campaign-support.sql` - Multi-channel support
6. `migration-admission-resume-workflow.sql` - Multi-step application workflow
7. `migration-application-parent-constraints.sql` - Parent info uniqueness
8. `migration-fix-application-documents-constraints.sql` - Document constraints
9. `migration-fix-application-documents-document-types.sql` - Document type validation
10. `migration-fix-application-upsert-constraints.sql` - Upsert operations

---

## Important Notes

1. **School Isolation:** All queries automatically scoped to `req.user.school_id`
2. **Soft Deletes:** Not used; hard deletes with CASCADE where appropriate
3. **Audit Trail:** `audit_log` table tracks all sensitive operations
4. **JWT Expiry:** 24 hours; users must re-login after expiry
5. **Timestamps:** All in UTC, ISO 8601 format
6. **File Uploads:** Maximum 5MB per file, multipart/form-data
7. **Search:** ILIKE (case-insensitive) for text searches
8. **Filters:** All optional; can combine multiple filters

---

## Testing the API

### Sample cURL Commands

**Login:**

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.com","password":"password123"}'
```

**Create Lead:**

```bash
curl -X POST http://localhost:5001/api/leads \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name":"Arjun",
    "last_name":"Kapoor",
    "email":"arjun@example.com",
    "phone":"+91-9876543211",
    "desired_class":"Grade 5",
    "academic_year_id":1
  }'
```

**Get Leads:**

```bash
curl -X GET "http://localhost:5001/api/leads?follow_up_status=interested&limit=10" \
  -H "Authorization: Bearer TOKEN"
```

---

## Related Documentation

- **master_api_documentation.md** - Original detailed API docs
- **COMPREHENSIVE_API_DOCUMENTATION.md** - Full documentation with examples
- **DATABASE_SETUP.md** - Database initialization
- **BACKEND_README.md** - Backend setup instructions

---

**Generated:** May 2, 2026  
**System:** School Admission ERP v1.0  
**Framework:** Express.js  
**Database:** PostgreSQL
