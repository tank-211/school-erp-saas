# Counseling Workspace Implementation Guide

## Overview

This guide provides complete documentation for the **Counseling Workspace** feature, which enables school counselors to manage assigned leads, schedule campus visits, and track counseling activities through a unified dashboard.

## Table of Contents

1. [Backend Components](#backend-components)
2. [Frontend Components](#frontend-components)
3. [API Endpoints](#api-endpoints)
4. [Data Model](#data-model)
5. [Usage Examples](#usage-examples)
6. [Error Handling](#error-handling)
7. [Constraints & Validations](#constraints--validations)
8. [Integration Steps](#integration-steps)

---

## Backend Components

### 1. Database Queries (`db/queries/counselingQueries.js`)

All database interactions use **parameterized queries** to prevent SQL injection. Functions include:

#### `getDashboardStats(schoolId, counselorId)`

- **Purpose**: Fetch dashboard statistics (assigned leads, upcoming visits, pending tasks)
- **Executes**: 3 parallel database queries
- **Returns**: `{ assignedLeads: Number, upcomingVisits: Number, pendingTasks: Number }`
- **Uses Index**: `idx_campus_visit_dashboard` for visit queries

**Example:**

```javascript
const stats = await getDashboardStats(1, 5);
// Returns: { assignedLeads: 15, upcomingVisits: 3, pendingTasks: 5 }
```

#### `getVisitsForCounselor(schoolId, counselorId, filterToday)`

- **Purpose**: Fetch campus visits for the counselor, optionally filtered to today
- **Params**:
  - `schoolId`: School ID
  - `counselorId`: Counselor user ID
  - `filterToday`: Boolean (default: false)
- **Returns**: Array of visit objects with lead and student information
- **Joins**: `campus_visit` LEFT JOIN `lead`

**Example:**

```javascript
const visits = await getVisitsForCounselor(1, 5, false);
// Returns array of all visits for counselor 5 at school 1
```

#### `searchLeads(schoolId, counselorId, query)`

- **Purpose**: Auto-fill search for leads assigned to the counselor
- **Params**:
  - `query`: Search term (name or lead ID)
  - Returns up to 20 matching leads
- **Supports**: Numeric searches (lead ID) and text searches (name)
- **Returns**: Array of lead objects

**Example:**

```javascript
const leads = await searchLeads(1, 5, "john");
// Returns leads matching "john" (first name, last name, or parent name)

const leads = await searchLeads(1, 5, "123");
// Returns lead with ID 123 (if exists)
```

#### `createCampusVisit(data)`

- **Purpose**: Create a new campus visit with double-booking prevention
- **Params**:
  ```javascript
  {
    school_id: Number,
    lead_id: Number,
    counselor_id: Number,
    student_name: String,
    grade: String,
    visit_date: String (YYYY-MM-DD),
    visit_time: String (HH:MM),
    notes: String (optional)
  }
  ```
- **Validation**: Checks if counselor already has a visit at same time/date
- **Throws**: Error with `code: 'DOUBLE_BOOKING'` if conflict
- **Returns**: Created visit object

**Example:**

```javascript
const visit = await createCampusVisit({
  school_id: 1,
  lead_id: 10,
  counselor_id: 5,
  student_name: "John Doe",
  grade: "10th",
  visit_date: "2025-03-15",
  visit_time: "10:00",
  notes: "Discuss admission requirements",
});
```

#### `getCampusVisitById(id, schoolId, counselorId)`

- **Purpose**: Fetch a single visit record
- **Returns**: Visit object or undefined

#### `updateCampusVisit(id, schoolId, counselorId, updates)`

- **Purpose**: Update visit fields
- **Allowed Fields**: `student_name`, `grade`, `visit_date`, `visit_time`, `status`, `notes`
- **Returns**: Updated visit object

#### `deleteCampusVisit(id, schoolId, counselorId)`

- **Purpose**: Soft delete (cancels) a campus visit
- **Updates**: Sets `status = 'cancelled'`
- **Returns**: void

---

### 2. Controller (`controllers/counselingController.js`)

Handles business logic, validation, and HTTP response formatting.

#### `getDashboardStats(req, res)`

- **Route**: `GET /api/counseling/stats`
- **Auth**: Required
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "assignedLeads": 15,
      "upcomingVisits": 3,
      "pendingTasks": 5
    }
  }
  ```

#### `getVisits(req, res)`

- **Route**: `GET /api/counseling/visits`
- **Auth**: Required
- **Query Params**: `filterToday=true` (optional)
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "lead_id": 10,
        "student_name": "John Doe",
        "grade": "10th",
        "visit_date": "2025-03-15",
        "visit_time": "10:00",
        "status": "scheduled",
        "notes": "...",
        "first_name": "...",
        "last_name": "...",
        "phone": "...",
        "email": "...",
        "desired_class": "..."
      }
    ]
  }
  ```

#### `searchLeads(req, res)`

- **Route**: `GET /api/counseling/leads/search`
- **Auth**: Required
- **Query Params**: `q=search_term` (required)
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "lead_id": 10,
        "student_name": "John Doe",
        "phone": "...",
        "email": "...",
        "desired_class": "10th",
        "parent_name": "...",
        "parent_phone": "...",
        "follow_up_status": "...",
        "created_at": "..."
      }
    ]
  }
  ```

#### `createCampusVisit(req, res)`

- **Route**: `POST /api/campus-visits`
- **Auth**: Required
- **Body**: `{ lead_id, student_name, grade, visit_date, visit_time, notes (optional) }`
- **Validations**:
  - All required fields present
  - Date format: YYYY-MM-DD
  - Time format: HH:MM
  - Visit date not in past
  - Lead belongs to this counselor
  - No double-booking
- **Response** (201): Created visit object
- **Error Responses**:
  - 400: Missing fields or invalid format
  - 403: Lead not assigned to counselor
  - 409: Counselor already booked at this time
  - 500: Server error

#### `getCampusVisit(req, res)`

- **Route**: `GET /api/campus-visits/:id`
- **Auth**: Required
- **Response**: Single visit object

#### `updateCampusVisit(req, res)`

- **Route**: `PUT /api/campus-visits/:id`
- **Auth**: Required
- **Body**: Partial update with allowed fields
- **Validations**: Date/time format if provided
- **Response**: Updated visit object

#### `deleteCampusVisit(req, res)`

- **Route**: `DELETE /api/campus-visits/:id`
- **Auth**: Required
- **Response**: `{ success: true, message: "Campus visit cancelled successfully" }`

---

### 3. Routes (`routes/counselingRoutes.js`)

Express router that maps HTTP endpoints to controller functions. All routes require authentication via `authenticateToken` middleware.

**Routes:**

- `GET /api/counseling/stats` → `getDashboardStats`
- `GET /api/counseling/visits` → `getVisits`
- `GET /api/counseling/leads/search` → `searchLeads`
- `POST /api/campus-visits` → `createCampusVisit`
- `GET /api/campus-visits/:id` → `getCampusVisit`
- `PUT /api/campus-visits/:id` → `updateCampusVisit`
- `DELETE /api/campus-visits/:id` → `deleteCampusVisit`

---

## Frontend Components

### CounselingService (`src/services/CounselingService.js`)

Singleton service that provides a clean API client interface for frontend components.

#### Methods

All methods handle authentication automatically using the stored JWT token.

**`getDashboardStats()`**

```javascript
const result = await CounselingService.getDashboardStats();
if (result.success) {
  console.log(result.data.assignedLeads);
}
```

**`getVisits(filterToday)`**

```javascript
// Get all visits
const allVisits = await CounselingService.getVisits(false);

// Get only today's visits
const todayVisits = await CounselingService.getVisits(true);
```

**`searchLeads(query)`**

```javascript
const results = await CounselingService.searchLeads("john");
// Returns empty array if query is empty
```

**`createCampusVisit(visitData)`**

```javascript
const newVisit = await CounselingService.createCampusVisit({
  lead_id: 10,
  student_name: "John Doe",
  grade: "10th",
  visit_date: "2025-03-15",
  visit_time: "10:00",
  notes: "Optional notes",
});
```

**`getCampusVisit(visitId)`**

```javascript
const visit = await CounselingService.getCampusVisit(1);
```

**`updateCampusVisit(visitId, updates)`**

```javascript
const updated = await CounselingService.updateCampusVisit(1, {
  status: "completed",
  notes: "Visit completed successfully",
});
```

**`deleteCampusVisit(visitId)`**

```javascript
await CounselingService.deleteCampusVisit(1);
```

---

## API Endpoints

### Request/Response Format

All endpoints use JSON for request/response bodies.

**Standard Success Response:**

```json
{
  "success": true,
  "data": {},
  "message": "Optional message"
}
```

**Standard Error Response:**

```json
{
  "success": false,
  "message": "Error description",
  "error": "Additional error details"
}
```

### Endpoint Reference

| Method | Endpoint                       | Description                                        | Auth |
| ------ | ------------------------------ | -------------------------------------------------- | ---- |
| GET    | `/api/counseling/stats`        | Dashboard statistics                               | ✓    |
| GET    | `/api/counseling/visits`       | Get all visits (with optional `filterToday` query) | ✓    |
| GET    | `/api/counseling/leads/search` | Search leads by query param `q`                    | ✓    |
| POST   | `/api/campus-visits`           | Create new visit                                   | ✓    |
| GET    | `/api/campus-visits/:id`       | Get single visit                                   | ✓    |
| PUT    | `/api/campus-visits/:id`       | Update visit                                       | ✓    |
| DELETE | `/api/campus-visits/:id`       | Cancel visit                                       | ✓    |

---

## Data Model

### Campus Visit Object

```javascript
{
  id: Number,                    // Primary key
  school_id: Number,             // Foreign key to school
  lead_id: Number,               // Foreign key to lead
  counselor_id: Number,          // Foreign key to user (counselor)
  student_name: String,          // Student name (required)
  grade: String,                 // Student grade (required)
  visit_date: Date,              // Date of visit (YYYY-MM-DD format)
  visit_time: String,            // Time of visit (HH:MM format)
  status: Enum,                  // 'scheduled', 'completed', 'cancelled', 'no_show'
  notes: String,                 // Optional notes
  created_at: Timestamp,         // Record creation time
  updated_at: Timestamp          // Last update time
}
```

### Lead Object (in search results)

```javascript
{
  lead_id: Number,
  student_name: String,
  phone: String,
  email: String,
  desired_class: String,
  parent_name: String,
  parent_phone: String,
  follow_up_status: String,
  created_at: Timestamp
}
```

---

## Usage Examples

### Example 1: Display Dashboard

```javascript
// In a React component
import CounselingService from "@/services/CounselingService";

function CounselingDashboard() {
  const [stats, setStats] = React.useState(null);

  React.useEffect(() => {
    CounselingService.getDashboardStats()
      .then((response) => {
        if (response.success) {
          setStats(response.data);
        }
      })
      .catch((error) => console.error(error));
  }, []);

  return stats ? (
    <div>
      <p>Assigned Leads: {stats.assignedLeads}</p>
      <p>Upcoming Visits: {stats.upcomingVisits}</p>
      <p>Pending Tasks: {stats.pendingTasks}</p>
    </div>
  ) : null;
}
```

### Example 2: Create Campus Visit with Lead Search

```javascript
async function createVisitWithSearch() {
  // Search for a lead
  const searchResult = await CounselingService.searchLeads("john");
  const lead = searchResult.data[0];

  // Create a visit for that lead
  const visitResult = await CounselingService.createCampusVisit({
    lead_id: lead.lead_id,
    student_name: lead.student_name,
    grade: "10th",
    visit_date: "2025-03-15",
    visit_time: "10:00",
    notes: "Admission inquiry follow-up",
  });

  if (visitResult.success) {
    console.log("Visit created:", visitResult.data);
  }
}
```

### Example 3: Display Today's Visits

```javascript
async function displayTodaysVisits() {
  const result = await CounselingService.getVisits(true); // filterToday = true

  if (result.success) {
    result.data.forEach((visit) => {
      console.log(
        `${visit.visit_time} - ${visit.student_name} (${visit.grade})`,
      );
    });
  }
}
```

---

## Error Handling

### Client-Side Error Handling

```javascript
try {
  const result = await CounselingService.createCampusVisit(visitData);
  if (!result.success) {
    // Handle API error
    console.error(result.message);
    if (result.error) {
      console.error(result.error);
    }
  }
} catch (error) {
  // Handle network error
  console.error("Network error:", error);
}
```

### Common Error Scenarios

**400 Bad Request**

- Missing required fields
- Invalid date format (use YYYY-MM-DD)
- Invalid time format (use HH:MM)
- Visit date in the past

**403 Forbidden**

- Lead not assigned to the counselor
- Trying to access another counselor's visit

**404 Not Found**

- Visit ID doesn't exist
- Lead not found

**409 Conflict**

- Counselor already has a visit at that time slot

**500 Internal Server Error**

- Database error
- Unexpected server error

---

## Constraints & Validations

### Database Constraints

1. **unique_counselor_slot**: Ensures one counselor can't have multiple visits at the same time
2. **Foreign Keys**:
   - `campus_visit.school_id` → `school.id`
   - `campus_visit.lead_id` → `lead.id`
   - `campus_visit.counselor_id` → `user.id`

### Application Validations

**Date Validations:**

- Visit date must be in format YYYY-MM-DD
- Visit date cannot be in the past

**Time Validations:**

- Visit time must be in format HH:MM (24-hour format)

**Lead Validations:**

- Lead must be assigned to the requesting counselor
- Lead must belong to the same school

**Visit Search Validations:**

- Supports numeric search (lead ID) or text search (names)
- Returns maximum 20 results
- Returns empty array for empty query string

---

## Integration Steps

### 1. Backend Integration

#### Step 1a: Add Routes to Main App

In your `backend/app.js`:

```javascript
import counselingRoutes from "./routes/counselingRoutes.js";

// Add this after other route imports
app.use("/api/counseling", counselingRoutes);
```

#### Step 1b: Ensure Database Tables Exist

Verify these tables exist in your schema:

- `campus_visit` - with columns: id, school_id, lead_id, counselor_id, student_name, grade, visit_date, visit_time, status, notes, created_at, updated_at
- `lead` - with columns: id, school_id, assigned_to, first_name, last_name, phone, email, desired_class
- `parent_detail` - with columns: lead_id, parent_name, parent_phone
- `task` - with columns: id, school_id, assigned_to, status

#### Step 1c: Create Required Indexes

```sql
-- For dashboard performance
CREATE INDEX idx_campus_visit_dashboard
ON campus_visit(school_id, counselor_id, visit_date)
WHERE status NOT IN ('cancelled', 'no_show');

-- For double-booking prevention
CREATE INDEX idx_campus_visit_slot
ON campus_visit(school_id, counselor_id, visit_date, visit_time)
WHERE status NOT IN ('cancelled', 'no_show');
```

### 2. Frontend Integration

#### Step 2a: Import and Use Service

```javascript
import CounselingService from "@/services/CounselingService";
```

#### Step 2b: Create Components

Build UI components that use the service methods:

- Dashboard component (uses `getDashboardStats`)
- Visits list component (uses `getVisits`)
- Create visit form (uses `searchLeads`, `createCampusVisit`)
- Visit detail/edit component (uses `getCampusVisit`, `updateCampusVisit`, `deleteCampusVisit`)

#### Step 2c: Handle Authentication

Ensure JWT token is stored in `localStorage` under key `token`:

```javascript
localStorage.setItem("token", jwtToken);
```

### 3. Testing

#### Backend Testing with curl:

```bash
# Get dashboard stats
curl -X GET http://localhost:5001/api/counseling/stats \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"

# Search leads
curl -X GET "http://localhost:5001/api/counseling/leads/search?q=john" \
  -H "Authorization: Bearer <TOKEN>"

# Create campus visit
curl -X POST http://localhost:5001/api/campus-visits \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": 10,
    "student_name": "John Doe",
    "grade": "10th",
    "visit_date": "2025-03-15",
    "visit_time": "10:00",
    "notes": "Test visit"
  }'
```

#### Frontend Testing:

```javascript
// In browser console
import CounselingService from "@/services/CounselingService";

CounselingService.getDashboardStats().then((result) => console.log(result));
CounselingService.getVisits().then((result) => console.log(result));
```

---

## Performance Considerations

1. **Indexing**: The queries use indexes on `campus_visit(school_id, counselor_id, visit_date)` for efficient filtering
2. **Parallel Queries**: Dashboard stats uses `Promise.all()` to execute 3 queries concurrently
3. **Pagination**: Lead search returns maximum 20 results to limit response size
4. **Soft Deletes**: Visits are soft-deleted (status = 'cancelled') to preserve history

---

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Counselors can only access their own leads and visits
3. **SQL Injection**: All queries use parameterized statements
4. **Data Isolation**: School-level isolation ensures data privacy between schools

---

## Future Enhancements

1. **Bulk Operations**: Create multiple visits at once
2. **Visit Templates**: Save recurring visit patterns
3. **Notifications**: Notify counselors of upcoming visits
4. **Analytics**: Track visit conversion rates
5. **Reports**: Generate counseling activity reports
6. **Mobile Support**: Offline-capable mobile app

---

## Troubleshooting

### Issue: "Double-booking error" when creating visit

**Solution**: Check if the counselor already has a visit at that time. Modify the visit time or date.

### Issue: "Lead not found" error

**Solution**: Verify the lead ID is correct and the lead is assigned to the counselor.

### Issue: Empty search results

**Solution**: Ensure the search query is at least 1 character and matches lead name or ID.

### Issue: 401 Unauthorized

**Solution**: Verify JWT token is valid and stored in `localStorage` under key `token`.

---

## API Response Examples

### Successful Dashboard Stats

```json
{
  "success": true,
  "data": {
    "assignedLeads": 15,
    "upcomingVisits": 3,
    "pendingTasks": 5
  }
}
```

### Successful Visit Creation

```json
{
  "success": true,
  "message": "Campus visit created successfully",
  "data": {
    "id": 42,
    "school_id": 1,
    "lead_id": 10,
    "counselor_id": 5,
    "student_name": "John Doe",
    "grade": "10th",
    "visit_date": "2025-03-15",
    "visit_time": "10:00",
    "status": "scheduled",
    "notes": "Admission inquiry",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

### Error: Double-booking

```json
{
  "success": false,
  "message": "Counselor is already booked for this time slot"
}
```

---

## Conclusion

The Counseling Workspace provides a comprehensive solution for managing counselor activities, lead assignments, and campus visits. Follow the integration steps above to add this feature to your application.
