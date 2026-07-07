# Frontend Architecture

Generated: 2026-04-12

This document describes the React frontend (Vite) in `Frontend_AA/` and is intended to onboard developers quickly: folder layout, module breakdown, component hierarchy, data flow, props, routing, API integration, state usage, and common issues.

---

**Table of contents**

- Section 1 — Project structure
- Section 2 — Routing
- Section 3 — Applications module breakdown
- Section 4 — Component hierarchy
- Section 5 — Data flow
- Section 6 — API integration
- Section 7 — State management
- Section 8 — Common issues & troubleshooting

---

## Section 1 — Project structure

Root (Frontend_AA)

```
Frontend_AA/
├── index.html
├── package.json
├── vite.config.js
├── eslint.config.js
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── style.css
│   ├── assets/
│   ├── components/
│   │   ├── ApplicationsTable.jsx    # Table component for applications list
│   │   ├── HealthCheck.jsx          # Health status component
│   │   ├── Layout.jsx               # App shell, header, sidebar, and <Outlet />
│   │   ├── StatsCard.jsx            # Reusable stats card component
│   │   └── UpcomingFollowups.jsx    # Upcoming follow-ups widget
│   ├── hooks/
│   │   ├── useAdmissions.js         # Custom hook for admissions data
│   │   ├── useApplication.js        # Custom hook for application management
│   │   ├── useLeads.js              # Custom hook for leads data
│   │   └── useUpcomingFollowups.js  # Custom hook for follow-ups
│   ├── pages/                       # page-level views (route targets)
│   │   ├── AddLead.jsx              # Add new lead form
│   │   ├── AdminPortal.jsx          # Admin user management dashboard
│   │   ├── Applications.jsx         # Applications list and management
│   │   ├── Communication.jsx        # Communication tools
│   │   ├── Counseling.jsx           # Counseling dashboard
│   │   ├── CreateApplication.jsx    # Create application form
│   │   ├── Dashboard.jsx            # Main dashboard with stats and widgets
│   │   ├── Enrollment.jsx           # Enrollment management
│   │   ├── FeesPayments.jsx         # Fees and payments
│   │   ├── Leads.jsx                # Leads list and management
│   │   ├── Login.jsx                # Authentication page
│   │   ├── MultiStepApplication.jsx # Multi-step application form
│   │   ├── NewApplication.jsx       # New application page
│   │   ├── OffersSeats.jsx          # Offers and seats management
│   │   ├── ParentForm.jsx           # Parent information form
│   │   ├── Pipeline.jsx             # Sales pipeline view
│   │   ├── Reports.jsx              # Reports and analytics
│   │   ├── ScheduleVisit.jsx        # Schedule visit page
│   │   ├── Screening.jsx            # Application screening
│   │   ├── Security.jsx             # Security settings
│   │   └── Settings.jsx             # Application settings
│   ├── services/                    # API clients
│   │   ├── admissionService.js      # Admission-related API calls
│   │   ├── applicationService.js    # Application management API calls
│   │   ├── dashboardService.js      # Dashboard stats and data API calls
│   │   └── leadService.js           # Lead-related API calls
│   └── utils/
│       └── authToken.js             # Token helpers, isAuthenticated()
└── README.md
```

Folder purposes

- `src/pages/` - Route targets. Each file is a full page view. Keep page-specific logic here.
- `src/components/` - Shared, presentational components used across pages (Layout, HealthCheck, StatsCard, UpcomingFollowups, ApplicationsTable).
- `src/hooks/` - Custom React hooks for data fetching and state management (useAdmissions, useApplication, useLeads, useUpcomingFollowups).
- `src/services/` - API client functions that encapsulate fetch calls and request/response shape.
- `src/utils/` - Small helpers (auth token management, formatting, etc.).
- `src/assets/` - Images and static assets.
- `App.jsx` - Central router and protected-route wrapper.

Notes: The app uses feature-based organization with dedicated hooks and services for each domain (leads, applications, admissions, dashboard). Components are shared across pages, and custom hooks handle data fetching with error states and loading indicators.

---

## Section 2 — Routing structure

Routing is defined in `src/App.jsx` using `react-router-dom`.

Public route

- `/login` → `Login.jsx`

Protected shell (requires `isAuthenticated()`)

- `/` → `Dashboard.jsx` (index)
- `/leads` → `Leads.jsx`
- `/leads/add` → `AddLead.jsx`
- `/pipeline` → `Pipeline.jsx`
- `/communication` → `Communication.jsx`
- `/counseling` → `Counseling.jsx`
- `/counseling/schedule-visit` → `ScheduleVisit.jsx`
- `/applications` → `Applications.jsx`
- `/applications/create` → `CreateApplication.jsx`
- `/applications/form/:id` → `MultiStepApplication.jsx` (NEW - dynamic route for multi-step form)
- `/application/:id` → `MultiStepApplication.jsx` (alias endpoint)
- `/applications/new` → `NewApplication.jsx` (legacy)
- `/screening` → `Screening.jsx`
- `/offers-seats` → `OffersSeats.jsx`
- `/fees-payments` → `FeesPayments.jsx`
- `/enrollment` → `Enrollment.jsx`
- `/reports` → `Reports.jsx`
- `/security` → `Security.jsx`
- `/admin` → `AdminPortal.jsx`
- `/settings` → `Settings.jsx`

**NEW Application Workflow Routes:**

1. `/applications` - View all applications with stats and drafts
2. `/applications/create` - Create new application (select lead or create without lead)
3. `/applications/form/:id` - Multi-step application form (preferred route)
4. `/application/:id` - Alias for viewing/completing application

Behavior: Protected routes are nested under `Layout.jsx` which renders the shell and an `<Outlet />`. If `isAuthenticated()` returns false, the `ProtectedRoute` redirects to `/login`.

The application creation flow:

1. User navigates to `/applications`
2. Clicks "New Application"
3. Navigates to `/applications/create` to select a lead
4. System creates application and navigates to `/applications/form/:id` with the multi-step form
5. User completes all 6 steps and submits
6. Application returns to `/applications` after successful submission

---

## Section 3 — Applications module breakdown

The applications feature has been completely refactored with full API integration. Files of interest:

- `src/pages/Applications.jsx`
- `src/pages/CreateApplication.jsx`
- `src/pages/NewApplication.jsx`
- `src/pages/MultiStepApplication.jsx` (NEW - main multi-step form)
- `src/hooks/useApplication.js` (NEW - custom hook for application management)
- `src/services/applicationService.js` (UPDATED - comprehensive API integration)

### Applications.jsx

**Purpose:** List, filter, and manage admission applications with stats and draft tracking.

**Data Integration:** Real API calls to backend:

- `GET /api/applications/counts` → Application statistics by status
- `GET /api/applications/draft` → Draft applications
- `GET /api/applications?limit=100&offset=0` → All applications
- `GET /api/applications/search?query=<term>` → Search applications

**Displays:**

- Stats cards: Total, Submitted, Under Review, Approved, Waitlisted, Draft Applications
- Expandable Draft Applications section with resume functionality
- Filter controls: search input, status dropdown filter
- Applications table (Application ID, Student Name, Grade, Contact, Submitted Date, Status)
- Error handling and loading states

**Props:** None (page-level component)

**State:**

- `stats` - object with application counts by status
- `applications` - array of all applications
- `draftApplications` - array of draft applications
- `filteredApps` - filtered view of applications
- `search` - search query string
- `filter` - current status filter ("all", "submitted", "under_review", "approved", etc.)
- `showDrafts` - boolean to toggle draft applications visibility
- `loading` - loading state for API calls
- `error` / `searchError` - error messages

**Key Functions:**

- `loadData()` - Fetches stats, drafts, and all applications on mount
- `handleSearch(value)` - Real-time search with API integration
- `handleStatusFilter(status)` - Apply status filter
- `applyFilter(appList, statusFilter)` - Helper for both search and status filtering
- `handleViewApplication(appId)` - Navigate to application view
- `handleResumeDraft(appId)` - Resume draft application and navigate

**UX Flows:**

- Click "New Application" → navigate to `/applications/create`
- Click status stat card → filter applications by status
- Click "Draft Applications" stat card → toggle draft applications section
- Click "Resume" on draft application → navigate to `/applications/form/:id`
- Use search input → live search results with API integration

### CreateApplication.jsx

**Purpose:** Start a new application by selecting an eligible lead or creating without a lead.

**Data Integration:** Real API calls:

- `GET /api/leads` (via useLeads hook) → Fetch eligible leads, supports search
- `POST /api/applications` → Create application from lead
- `POST /api/applications/new` → Create application without lead

**Features:**

- Step 1: Lead selection with search
  - Search input to filter eligible leads
  - Lead list display with selection capability
  - Option to create application without lead (manual entry)
- Step 2: Confirmation and Application Creation
  - Select academic year from dropdown
  - Confirm selection before creation
  - Creates application record and navigates to multi-step form

**Expected Lead Object:**

```json
{
  "id": 1,
  "first_name": "Rohan",
  "last_name": "Sharma",
  "desired_class": "Grade 5",
  "email": "rohan@example.com",
  "phone": "+919999999999",
  "source": "Website"
}
```

**Props:** None (page-level)

**State:**

- `step` - "select" (choose lead) or "confirm" (create application)
- `search` - search query for leads
- `selected` - selected lead object or null
- `form` - object with `{ year, type }` for application configuration
- `creating` - loading state during application creation
- `createError` - error message if creation fails

**Key Functions:**

- `handleSelectLead(lead)` - Select a lead and advance to confirm step
- `handleCreateWithoutLead()` - Create application without lead
- `handleCreateApplication()` - Create the application via API and navigate

**API Integration:**

- Uses `useLeads` hook for lead fetching and searching
- Calls `createApplicationFromLead(leadId, academicYearId)` or `createApplicationWithoutLead(academicYearId)`
- Stores `activeAdmissionId` in sessionStorage for use in multi-step form
- Navigates to `/applications/form/:id` with state containing lead info and configuration

### MultiStepApplication.jsx (NEW - Main Application Form)

**Purpose:** Complete 6-step admission application form with auto-fill from lead data.

**Six Steps:**

1. **Student Information** - Name, DOB, gender, current school, class
2. **Parent/Guardian Information** - Father and mother details (name, phone, email, occupation)
3. **Academic Information** - Current class, board, GPA, subjects, previous school
4. **Photos** - Student photo, student Aadhar, parent photos and Aadhar cards
5. **Documents** - Birth certificate, transfer certificate, previous report cards, address proof, parent ID
6. **Review & Submit** - Review all information and submit application

**Data Integration:** Real API calls via `useApplication` hook:

- `GET /api/applications/:id/progress` → Current step and completion status
- `GET /api/applications/:id/details` → Application data for prefill
- `POST /api/applications/:id/student-info` → Save student info
- `POST /api/applications/:id/parent-info` → Save parent info
- `POST /api/applications/:id/academic-info` → Save academic info
- `POST /api/applications/:id/documents` → Upload documents and photos
- `POST /api/applications/:id/submit` → Submit final application

**Props:** None (page-level, gets ID from URL parameter and location state)

**Key Features:**

- Auto-fill student information from lead data if created from lead
- Multi-step navigation with back/next buttons
- Auto-save on each step
- Progress tracking showing completed steps
- File upload with preview for documents and photos
- Document type validation (birth_certificate, aadhaar_card, transfer_certificate, etc.)
- Photo capture and upload for student and parents
- Review step showing all entered information
- Error handling and loading states throughout
- Resume draft functionality - picks up from where user left off

**Key Functions:**

- `handleSaveStudentInfo(studentData)` - Save step 1
- `handleSaveParentInfo(parentData)` - Save step 2
- `handleSaveAcademicInfo(academicData)` - Save step 3
- `handleSaveDocuments(documentData)` - Save step 4-5
- `handleSubmitApplication()` - Final submission

**Expected Submission Shape:**

```json
{
  "lead_id": 1,
  "student_info": {
    "first_name": "Rohan",
    "last_name": "Sharma",
    "date_of_birth": "2015-08-20",
    "gender": "Male",
    "current_school": "ABC School",
    "current_class": "Grade 4"
  },
  "parent_info": {
    "father_name": "Rajesh Sharma",
    "father_phone": "9876543210",
    "father_email": "rajesh@example.com",
    "mother_name": "Priya Sharma",
    "mother_phone": "9876543211"
  },
  "academic_info": {
    "board": "ICSE",
    "previous_school": "ABC School",
    "last_gpa": "9.5",
    "subjects": ["Math", "Science", "English"]
  },
  "documents": [
    {
      "type": "birth_certificate",
      "file": "File object",
      "file_path": "/uploads/app001-birth-cert.pdf"
    }
  ],
  "academic_year_id": 2026
}
```

### NewApplication.jsx

**Purpose:** Legacy placeholder for new application (currently integrated into CreateApplication and MultiStepApplication flow).

**Current Status:** Maintained for backward compatibility. Main workflow now flows through CreateApplication → MultiStepApplication.

---

## Section 4 — Component hierarchy (high-level)

**Applications Feature Architecture:**

```
ApplicationsPage (route `/applications`)
├─ StatsCard (stat rendering - Total, Submitted, Under Review, etc.)
├─ SearchBar (search input)
├─ StatusFilter (dropdown filter)
├─ ApplicationsTable (table rows)
└─ DraftApplications (expandable section with draft apps)

CreateApplication (route `/applications/create`)
├─ LeadSearchBar (search with API)
├─ LeadList (table with eligible leads)
├─ LeadCard (selected lead display)
└─ ApplicationConfirmation (year selection and create button)

MultiStepApplication (route `/applications/form/:id`) - NEW
├─ StepIndicator (showing current step 1-6)
├─ StudentInfoStep
│  ├─ Name, DOB, Gender inputs
│  ├─ Current School input
│  ├─ Class dropdown with normalization
│  └─ Previous class auto-display
├─ ParentInfoStep (ParentForm component)
│  ├─ Father details section
│  ├─ Mother details section
│  └─ Address fields
├─ AcademicInfoStep
│  ├─ Current Class dropdown
│  ├─ Board selection
│  ├─ GPA input
│  └─ Subjects multi-select
├─ PhotoUploadStep
│  ├─ Student photo section
│  ├─ Student Aadhar upload
│  ├─ Father photo & Aadhar
│  ├─ Mother photo & Aadhar
│  └─ File previews
├─ DocumentUploadStep
│  ├─ Birth certificate upload
│  ├─ Transfer certificate upload
│  ├─ Previous report card upload
│  ├─ Address proof upload
│  └─ File previews with validation
├─ ReviewStep
│  ├─ Summary of all steps
│  ├─ Document list display
│  └─ Submit button
├─ Navigation (Back/Next buttons)
├─ ProgressTracker (shows completed steps)
└─ ErrorHandler (displays validation errors)

NewApplication (route `/applications/new`) - Legacy
└─ Multi-step form (minimal usage)
```

**Shared Components Used:**

- `Layout.jsx` — App shell (header, sidebar, main content outlet)
- `ParentForm.jsx` — Reusable parent information form component (used in MultiStepApplication Step 2)
- `HealthCheck.jsx` — Simple status widget

**Note:** Document upload uses file validation, type detection, and size limits (max 5MB). Photos require specific dimensions validation in production.

---

## Section 5 — Data flow

**Canonical flow for any page:**

1. UI component mounts
2. Component calls a `service` function in `src/services/` (e.g., `applicationService`) that wraps `fetch`
3. `service` sends request to backend API (`/api/*`), passing auth header from `src/utils/authToken.js`
4. Backend processes and responds with JSON
5. Service returns parsed JSON to component (or custom hook)
6. Component/hook updates state via `useState` and re-renders

**Application Creation Flow (NEW):**

1. User navigates to `/applications` → `Applications.jsx` mounts
2. `useEffect` calls `getApplicationCounts()`, `getDraftApplications()`, `getApplications()`
3. Services call backend endpoints, get data, populate stats cards and applications table
4. User clicks "New Application" → navigate to `/applications/create`
5. `CreateApplication.jsx` mounts → `useLeads` hook fetches eligible leads
6. User selects a lead or chooses manual entry
7. User confirms → calls `createApplicationFromLead()` or `createApplicationWithoutLead()` service
8. Service sends `POST /api/applications` or `POST /api/applications/new`
9. Backend creates application record, returns `{ id, current_step, status }`
10. Frontend stores `activeAdmissionId` in sessionStorage
11. Navigate to `/applications/form/:id` with location state containing lead data
12. `MultiStepApplication.jsx` mounts → `useApplication` hook loads application
13. Hook fetches progress and details via `getApplicationProgress()` and `getApplicationDetails()`
14. User fills each step:
    - Step 1 → calls `saveStudentInfo()` → `POST /api/applications/:id/student-info`
    - Step 2 → calls `saveParentInfo()` → `POST /api/applications/:id/parent-info`
    - Step 3 → calls `saveAcademicInfo()` → `POST /api/applications/:id/academic-info`
    - Steps 4-5 → calls `saveDocuments()` → `POST /api/applications/:id/documents` (multipart form data)
    - Step 6 → calls `submitApplication()` → `POST /api/applications/:id/submit`
15. After submission → redirect to `/applications` with success state

**Lead Creation Flow (existing):**

- `AddLead.jsx` collects form → calls `leadService.createLead(payload)`
- `leadService.createLead` builds headers via `getAuthHeader()` and posts to `/api/leads`
- Backend returns created lead → UI shows confirmation

**Auth header provider (in `src/utils/authToken.js`):**

- `getAuthHeader()` returns `{ 'Content-Type': 'application/json', 'Authorization': 'Bearer <token>' }` or `null`.
- `isAuthenticated()` uses `sessionStorage` presence to gate protected routes.

**Custom Hooks for API Integration:**

- `useApplication(applicationId)` - Manages multi-step application state, fetches progress and details, provides save handlers
- `useLeads(searchQuery, isEligibleOnly)` - Fetches leads with optional search and filtering
- `useAdmissions()` - Fetches admissions stats and list
- `useUpcomingFollowups()` - Fetches upcoming follow-ups for widgets

These hooks encapsulate `useEffect`, error handling, and loading states, making components cleaner.

---

## Section 6 — API integration

The frontend uses multiple service files for API integration, each handling a specific domain:

### `src/services/leadService.js` — Base URL `http://localhost:5001/api/leads`

Key endpoints:

- POST `/api/leads` - Create new lead
  - Request: JSON body with lead fields
  - Response: `{ success: true, data: lead, message }`

- GET `/api/leads` - Get all leads (with optional filters)
  - Query params: `follow_up_status`, `desired_class`, `assigned_to`
  - Response: `{ success: true, data: [leads] }`

- GET `/api/leads/:id` - Get lead by ID
  - Response: `{ success: true, data: lead }`

- PUT `/api/leads/:id` - Update lead
  - Request: Partial lead object
  - Response: `{ success: true, data: updatedLead }`

- DELETE `/api/leads/:id` - Delete lead
  - Response: `204` on success

- GET `/api/leads/followups/upcoming` - Get upcoming follow-ups
  - Query params: `interval` (days), `limit`
  - Response: `{ success: true, data: [followups], count }`

### `src/services/dashboardService.js` — Base URL `http://localhost:5001/api/dashboard`

Dashboard statistics and data:

- GET `/api/dashboard` - Get dashboard stats
  - Response: `{ success: true, data: { totalInquiries, conversionRate, activeLeads, ... } }`

- GET `/api/dashboard/funnel` - Get admission funnel data
  - Response: `{ success: true, data: { inquiry, contacted, interested, visit, applied, enrolled } }`

- GET `/api/dashboard/monthly-trend` - Get monthly trends
  - Response: `{ success: true, data: [{ month, inquiries, enrollments }] }`

- GET `/api/dashboard/grade-distribution` - Get grade distribution
  - Response: `{ success: true, data: [{ label, value }] }`

- GET `/api/dashboard/counselor-performance` - Get counselor performance
  - Response: `{ success: true, data: [{ name, leads, conversions, pct }] }`

- GET `/api/health` - Health check
  - Response: `{ success: true, message, timestamp, environment }`

### `src/services/applicationService.js` — Base URL `http://localhost:5001/api/applications`

**Application management (UPDATED with full API integration):**

**Creating Applications:**

- POST `/api/applications` - Create application from lead
  - Request: `{ lead_id, academic_year_id }`
  - Response: `{ success: true, data: { id, current_step, status } }`

- POST `/api/applications/new` - Create application without lead
  - Request: `{ academic_year_id }`
  - Response: `{ success: true, data: { id, current_step, status } }`

**Getting Applications:**

- GET `/api/applications/counts` - Get application counts by status (NEW)
  - Response: `{ success: true, data: { total, submitted, under_review, approved, rejected, waitlisted, draft } }`

- GET `/api/applications/draft` - Get draft applications (NEW)
  - Response: `{ success: true, data: [{ id, student_name, current_step, status }] }`

- GET `/api/applications?limit=100&offset=0` - Get all applications with pagination
  - Query: `limit` (default 100), `offset` (default 0)
  - Response: `{ success: true, data: [applications], pagination: {...} }`

- GET `/api/applications/search?query=<term>` - Search applications by student name or ID (NEW)
  - Query: `query` (required), `limit` (optional)
  - Response: `{ success: true, data: [matching applications] }`

- GET `/api/applications/eligible-leads?search=<term>&limit=10` - Get eligible leads for application (NEW)
  - Query: `search` (optional), `limit` (default 10)
  - Response: `{ success: true, data: [eligible leads] }`

- GET `/api/applications/:id/resume` - Resume draft application (NEW)
  - Response: `{ success: true, data: { id, status, current_step, student_info, parent_info, ... } }`

- GET `/api/applications/:id/progress` - Get application progress/step status (NEW)
  - Response: `{ success: true, data: { current_step, status, steps: {...} } }`

- GET `/api/applications/:id/details` - Get full application details for prefill (NEW)
  - Response: `{ success: true, data: { application, student_info, parent_info, academic_info, photos, documents } }`

**Saving Application Steps:**

- POST `/api/applications/:id/student-info` - Save student info (Step 1)
  - Request: `{ first_name, last_name, date_of_birth, gender, current_school, current_class }`
  - Response: `{ success: true, message: "..." }`

- POST `/api/applications/:id/parent-info` - Save parent info (Step 2)
  - Request: `{ father_name, father_phone, father_email, mother_name, mother_phone, mother_email, address }`
  - Response: `{ success: true, message: "..." }`

- POST `/api/applications/:id/academic-info` - Save academic info (Step 3)
  - Request: `{ board, previous_school, current_class, last_gpa, subjects }`
  - Response: `{ success: true, message: "..." }`

- POST `/api/applications/:id/documents` - Upload documents and photos (Steps 4-5) (multipart/form-data)
  - Request: FormData with file objects and document type metadata
  - Response: `{ success: true, data: { documents: [...], photos: [...] } }`

- POST `/api/applications/:id/submit` - Submit final application (Step 6)
  - Request: `{ confirmation: true }`
  - Response: `{ success: true, data: { application_id, status: 'SUBMITTED', submitted_date }, message: "..." }`

**Service Functions Exported:**

- `createApplicationFromLead(leadId, academicYearId)`
- `createApplicationWithoutLead(academicYearId)`
- `getEligibleLeads(searchQuery, limit)`
- `getApplicationCounts()`
- `getDraftApplications()`
- `getApplications({ limit, offset })`
- `searchApplications(queryText, limit)`
- `resumeDraftApplication(applicationId)`
- `getApplicationProgress(applicationId)`
- `getApplicationDetails(applicationId)`
- `saveStudentInfo(applicationId, studentData)`
- `saveParentInfo(applicationId, parentData)`
- `saveAcademicInfo(applicationId, academicData)`
- `saveDocuments(applicationId, documentData)` (multipart)
- `submitApplication(applicationId)`

### `src/services/admissionService.js` — Base URL `http://localhost:5001/api/admissions`

Admission processing:

- GET `/api/admissions/stats` - Get admission statistics
  - Response: `{ success: true, data: { total, submitted, under_review, approved, waitlisted } }`

- GET `/api/admissions/search` - Search admissions
  - Query: `query` (name or phone)
  - Response: `{ success: true, data: [admissions] }`

- GET `/api/admissions` - Get all admissions (paginated)
  - Query: `limit`, `offset`
  - Response: `{ success: true, data: [admissions], pagination }`

- GET `/api/admissions/:id` - Get admission details
  - Response: `{ success: true, data: admission }`

Notes: All services use JWT authentication via `Authorization: Bearer <token>` header and standardize responses to `{ success: boolean, data: any, message?: string }`.

---

## Section 7 — State management

**Current Approach:** Local component state using React hooks + custom hooks for API data fetching.

**Patterns used:**

- `useState` for local state (forms, filters, selected items)
- `useEffect` for API calls on component mount and when dependencies change
- Custom hooks (`useApplication`, `useLeads`, etc.) to encapsulate data fetching logic
- `sessionStorage` for auth tokens and application session IDs
- `location.state` to pass data between page routes (e.g., lead data when navigating from CreateApplication to MultiStepApplication)

**Where state lives:**

- **Page-level (Applications.jsx):**
  - `stats`, `applications`, `draftApplications`, `filteredApps` - from API
  - `search`, `filter`, `showDrafts` - UI state
  - `loading`, `error` - async state

- **Page-level (CreateApplication.jsx):**
  - `step`, `search`, `selected`, `form` - form state
  - `creating`, `createError` - async state
  - Lead data comes from `useLeads` hook

- **Page-level (MultiStepApplication.jsx):**
  - All application data and handlers come from `useApplication` hook
  - `formData` for current step input
  - `selectedFiles` for document/photo uploads

- **Hook-level (useApplication.js - NEW):**
  - `progress`, `details` - application data from API
  - `currentStep` - current step tracking
  - `loading`, `error` - async states
  - Save handlers for each step

- **Hook-level (useLeads.js):**
  - `leads` - list of leads
  - `loading`, `error` - async states
  - Auto-fetches when search query or isEligibleOnly changes

- **Global/Session:**
  - `sessionStorage.activeAdmissionId` - active application ID for multi-step form
  - `sessionStorage.authToken` - JWT token for API requests

**Recommendations:**

- For larger datasets or complex state interactions, consider React Context for auth + user info
- For server state management (caching, revalidation), consider React Query (TanStack Query)
- Keep service layer for API calls and hooks for UI-specific state encapsulation
- Use custom hooks to decouple data fetching from component rendering

---

## Section 8 — Props & expected data (summary)

Most current pages are self-contained and do not accept props. For future componentization, use these interfaces:

- `StatsCard` (stat label)
  - Props: `{ label: string, value: number, color?: string }`
- `ApplicationsTable` (list of applications)
  - Props: `{ items: Array<Application>, onView: (id) => void }`
  - `Application` shape: `{ id, name, grade, contact, submitted, status }`
- `LeadCard` / `LeadList`
  - Props: `{ lead: { id, name, grade, contact, email, score }, onSelect: (lead) => void }`
- `FullApplicationForm` (multi-step)
  - Props: `{ initialData?: ApplicationDraft, onSubmit: (payload) => Promise }`

---

## Section 9 — Component-level responsibilities & quick map

- **Layout.jsx** — Renders header, nav, sidebar; includes logout link; contains `<Outlet/>` for nested routes.
- **Login.jsx** — Login form; calls `POST /api/auth/login`; saves token to sessionStorage via `authToken.js`.
- **Leads.jsx** / **AddLead.jsx** — Leads listing and creation UI; call `leadService` with real API integration.
- **Applications.jsx** (UPDATED) — Stats and applications list with draft tracking; calls real API endpoints for counts, drafts, and applications list with search and filter.
- **CreateApplication.jsx** (UPDATED) — Lead selection and application creation; integrates `useLeads` hook and real API calls.
- **MultiStepApplication.jsx** (NEW) — Complete 6-step application form; uses `useApplication` hook to manage form state and API integration; handles file uploads.

### Custom Hooks Responsibilities

- **useApplication.js** (NEW) — Manages multi-step application lifecycle:
  - Fetches application progress and details on mount
  - Provides handlers for saving each step (`handleSaveStudentInfo`, `handleSaveParentInfo`, etc.)
  - Tracks current step and completed steps
  - Manages loading and error states

- **useLeads.js** — Manages lead data fetching:
  - Auto-fetches leads based on search query
  - Supports filtering for eligible leads only
  - Handles pagination
  - Manages loading and error states

- **useAdmissions.js** — Manages admissions data:
  - Fetches admissions list with pagination
  - Fetches admission statistics
  - Handles filtering and searching

### Service Layer Responsibilities

- **applicationService.js** (UPDATED) — All application-related API calls:
  - Application creation (from lead or manual)
  - Fetching application lists, stats, drafts
  - Searching and filtering applications
  - Step-by-step form saving
  - Final submission

- **leadService.js** — All lead-related API calls
- **admissionService.js** — All admission-related API calls
- **dashboardService.js** — Dashboard statistics and analytics

---

## Section 9.5 — Application Form Data Flow (Detailed)

**Step-by-Step Flow from User Action to Submission:**

```
1. User navigates to /applications
   ↓
   Applications.jsx mounts
   ↓
   useEffect runs → getApplicationCounts()
   ↓
   API call: GET /api/applications/counts
   ↓
   Backend returns: { draft: 5, submitted: 15, under_review: 3, ... }
   ↓
   Stats cards display with counts

2. User clicks "New Application" button
   ↓
   Navigate to /applications/create
   ↓
   CreateApplication.jsx mounts
   ↓
   useLeads hook runs → fetches leads via GET /api/applications/eligible-leads
   ↓
   Lead list displays with search capability

3. User selects a lead or chooses "Manual Entry"
   ↓
   If lead selected:
     → handleSelectLead(lead) stores lead object
   If manual entry:
     → handleCreateWithoutLead() skips lead selection
   ↓
   Move to confirmation step

4. User confirms academic year → handleCreateApplication()
   ↓
   API call: POST /api/applications (or POST /api/applications/new if manual)
   Request: { lead_id: 456, academic_year_id: 2026 }
   ↓
   Backend creates application record
   ↓
   Backend returns: { id: 789, status: "draft", current_step: 1 }
   ↓
   Frontend stores activeAdmissionId in sessionStorage
   ↓
   Navigate to /applications/form/789 with lead data in location.state

5. MultiStepApplication.jsx mounts
   ↓
   useApplication(789) hook initializes
   ↓
   useEffect runs three things in parallel:
     a) getApplicationProgress(789)
        API: GET /api/applications/789/progress
        Returns: { steps: {...}, current_step: 1, overall_completion: 0 }

     b) getApplicationDetails(789)
        API: GET /api/applications/789/details
        Returns: { student_info: {...}, parent_info: {...}, ... }

     c) If lead data in location.state:
        → Pre-fill form data from lead via useEffect mapping
        → Maps lead { first_name, last_name, desired_class } to formData
   ↓
   Component renders Step 1 (Student Info) with pre-filled data if from lead

6. User fills Student Information
   ↓
   User clicks "Next" → handleSaveStudentInfo(formData)
   ↓
   Validation runs (required: first_name, last_name, DOB)
   ↓
   API call: POST /api/applications/789/student-info
   Request: { first_name: "...", last_name: "...", date_of_birth: "...", ... }
   ↓
   Backend saves to application_student_info table
   ↓
   Backend returns: { success: true, message: "..." }
   ↓
   Frontend updates progress state
   ↓
   Advance to Step 2 (Parent Info)

7. User fills Parent Information
   ↓
   ParentForm component collects: father_name, mother_name, phones, emails
   ↓
   User clicks "Next" → handleSaveParentInfo(parentData)
   ↓
   API call: POST /api/applications/789/parent-info
   Request: { father_name: "...", father_phone: "...", mother_name: "...", ... }
   ↓
   Backend saves to application_parent_info table
   ↓
   Advance to Step 3 (Academic Info)

8. User fills Academic Information
   ↓
   User enters: current_school, current_class, percentage, subjects
   ↓
   User clicks "Next" → handleSaveAcademicInfo(academicData)
   ↓
   API call: POST /api/applications/789/academic-info
   Request: { current_school: "...", current_class: "...", percentage: 85, subjects: [...] }
   ↓
   Backend saves to application_academic_info table
   ↓
   Advance to Step 4 (Photos)

9. User uploads photos (Step 4)
   ↓
   User selects files: student_photo, student_aadhar, parent_photos
   ↓
   User clicks "Next" → handleSaveDocuments(formDataWithFiles)
   ↓
   Prepare multipart/form-data with files
   ↓
   API call: POST /api/applications/789/documents (multipart/form-data)
   FormData: [file objects with metadata]
   ↓
   Backend uploads files to /backend/uploads/
   ↓
   Backend saves file references to database
   ↓
   Advance to Step 5 (Documents)

10. User uploads documents (Step 5)
    ↓
    User selects: birth_certificate, transfer_certificate, previous_report, etc.
    ↓
    Same flow as Step 4:
    ↓
    API call: POST /api/applications/789/documents (more multipart)
    ↓
    Backend stores additional documents
    ↓
    Advance to Step 6 (Review & Submit)

11. User reviews all information (Step 6)
    ↓
    Review component displays all saved data:
    - Student info (name, DOB, etc.)
    - Parent info (names, contacts)
    - Academic info (school, class, marks)
    - Uploaded documents with file links
    ↓
    User clicks "Submit Application"
    ↓
    handleSubmitApplication() runs
    ↓
    Final validation check
    ↓
    API call: POST /api/applications/789/submit
    Request: {}
    ↓
    Backend changes status to "submitted"
    ↓
    Backend records submission timestamp
    ↓
    Backend returns: { success: true, data: { status: "submitted", submitted_at: "..." } }
    ↓
    Frontend displays success message
    ↓
    Navigate back to /applications with success toast
    ↓
    Applications list now shows the submitted application
```

---

## Section 9.6 — Component Responsibility Table

| Component                | File                       | Responsibility                                                            | API Calls                                                                                                                                                 |
| ------------------------ | -------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Applications**         | `Applications.jsx`         | List all applications, show stats, manage draft tracking, search & filter | `GET /applications/counts`, `GET /applications/draft`, `GET /applications`                                                                                |
| **CreateApplication**    | `CreateApplication.jsx`    | Lead selection, manual entry option, application creation                 | `GET /applications/eligible-leads`, `POST /applications`, `POST /applications/new`                                                                        |
| **MultiStepApplication** | `MultiStepApplication.jsx` | Main form controller, step navigation, data collection across 6 steps     | `GET /applications/:id/progress`, `GET /applications/:id/details`, `POST /applications/:id/[student-info\|parent-info\|academic-info\|documents\|submit]` |
| **ParentForm**           | `ParentForm.jsx`           | Collect parent details (father & mother), reusable across forms           | None (parent data passed via props)                                                                                                                       |
| **StatsCard**            | `StatsCard.jsx`            | Display stat with label and value                                         | None (data passed via props)                                                                                                                              |
| **ApplicationsTable**    | `ApplicationsTable.jsx`    | Render applications in table format with action buttons                   | None (data passed via props)                                                                                                                              |
| **Layout**               | `Layout.jsx`               | App shell, header, navigation, logout                                     | None                                                                                                                                                      |
| **useApplication**       | `hooks/useApplication.js`  | **Manage form state, progress tracking, save handlers for all 6 steps**   | All application endpoints (GET progress, GET details, POST student-info, etc.)                                                                            |
| **useLeads**             | `hooks/useLeads.js`        | Fetch leads with search and filtering                                     | `GET /leads`                                                                                                                                              |

**Key Insight:** `useApplication` hook is the brain of the multi-step form. It owns all API communication and state management for the application workflow.

---

## Section 9.7 — Auto-Fill Logic (Frontend Implementation)

⚠️ **CRITICAL:** Auto-fill happens ONLY in the frontend. The backend does NOT auto-populate application fields from lead data.

**How Auto-Fill Works:**

1. **User creates application from lead** (in CreateApplication.jsx)
   - Lead object selected and passed via `location.state`
   - Application created via `POST /api/applications`

2. **MultiStepApplication mounts** (MultiStepApplication.jsx)
   - Receives `lead` object from `location.state`
   - useApplication hook fetches application details (which is EMPTY on first form visit)
   - useEffect detects both lead data AND empty application data

3. **Mapping Logic** (in MultiStepApplication.jsx or useApplication hook)

   ```javascript
   // When both lead and application data exist:
   if (locationState?.lead && !applicationDetails?.student_info?.first_name) {
     // Auto-fill student info from lead
     setFormData((prevFormData) => ({
       ...prevFormData,
       first_name: locationState.lead.first_name || "",
       last_name: locationState.lead.last_name || "",
       desired_class: locationState.lead.desired_class || "",
       email: locationState.lead.email || "",
       phone: locationState.lead.phone || "",
     }));
   }
   ```

4. **Form Data Structure** (Example for Step 1 - Student Info)

   ```javascript
   // Initial state (empty):
   const [formData, setFormData] = useState({
     first_name: "",
     last_name: "",
     middle_name: "",
     date_of_birth: "",
     gender: "",
     blood_group: "",
     aadhar_number: "",
     phone: "",
     email: "",
     current_school: "",
     current_class: "",
   });

   // After auto-fill from lead:
   // {
   //   first_name: 'John',           ← from lead.first_name
   //   last_name: 'Doe',            ← from lead.last_name
   //   middle_name: '',             ← empty (lead doesn't have this)
   //   date_of_birth: '',           ← empty (lead doesn't have this)
   //   gender: '',                  ← empty (lead doesn't have this)
   //   ...
   //   desired_class: 'Grade 5',    ← from lead.desired_class
   //   email: 'john@example.com',   ← from lead.email
   //   phone: '9876543210'          ← from lead.phone
   // }
   ```

5. **User can now:**
   - See pre-filled name, email, phone from lead
   - Add missing information (DOB, gender, blood group, etc.)
   - Submit the form with all required fields

**Implementation Example:**

```javascript
// In MultiStepApplication.jsx or useApplication hook

useEffect(() => {
  // This runs when component mounts or lead data changes
  if (locationState?.lead && currentStep === 1) {
    // Auto-fill ONLY if we're on Step 1 AND we have lead data
    const autoFillData = {
      first_name: locationState.lead.first_name || "",
      last_name: locationState.lead.last_name || "",
      email: locationState.lead.email || "",
      phone: locationState.lead.phone || "",
      desired_class: locationState.lead.desired_class || "",
      // Don't fill date_of_birth, gender, etc. - lead doesn't have these
    };

    setFormData((prevData) => ({
      ...prevData,
      ...autoFillData,
    }));
  }
}, [locationState?.lead, currentStep]);
```

**What Gets Auto-Filled:**

- ✅ `first_name` from `lead.first_name`
- ✅ `last_name` from `lead.last_name`
- ✅ `email` from `lead.email`
- ✅ `phone` from `lead.phone`
- ✅ `desired_class` from `lead.desired_class`

**What Does NOT Get Auto-Filled:**

- ❌ `date_of_birth` (lead doesn't have this)
- ❌ `gender` (lead doesn't have this)
- ❌ `blood_group` (lead doesn't have this)
- ❌ `aadhar_number` (lead doesn't have this)
- ❌ `parent_info` (lead doesn't have parent details - separate fields)
- ❌ `academic_info` (lead doesn't have academic history)

**Manual Entry (No Lead):**

- When creating application without lead, `location.state` won't have lead data
- All form fields start empty
- User fills all fields manually
- No auto-fill logic runs

---

## Section 9.8 — Form State Structure Example

**Complete State Structure for Multi-Step Application:**

```javascript
// Step 1: Student Information
const studentFormData = {
  first_name: 'John',              // ← from lead if available
  last_name: 'Doe',                // ← from lead if available
  middle_name: 'Alexander',
  date_of_birth: '2015-08-20',
  gender: 'Male',
  blood_group: 'O+',
  aadhar_number: '123456789012',
  phone: '9876543210',             // ← from lead if available
  email: 'john@example.com',       // ← from lead if available
  current_school: 'ABC School',
  current_class: 'Grade 4'
};

// Step 2: Parent Information
const parentFormData = {
  father_name: 'Rajesh Kumar',
  father_occupation: 'Engineer',
  father_phone: '9876543200',
  father_email: 'rajesh@example.com',
  mother_name: 'Priya Kumar',
  mother_occupation: 'Doctor',
  mother_phone: '9876543201',
  mother_email: 'priya@example.com',
  address: '123, School Road, Delhi 110001'
};

// Step 3: Academic Information
const academicFormData = {
  current_school: 'ABC School',
  current_class: 'Grade 4',
  board: 'ICSE',
  last_percentage: 85,
  subjects: ['English', 'Mathematics', 'Science', 'Social Studies'],
  previous_school: 'XYZ Playhouse'
};

// Step 4-5: Document Upload State
const documentFormData = {
  birth_certificate: null,         // File object or null
  transfer_certificate: null,      // File object or null
  previous_report_card: null,      // File object or null
  address_proof: null,
  parent_id_proof: null,
  student_photo: null,
  student_aadhar: null,
  parent_photos: null,
  parent_aadhar_cards: null
};

// Overall Application State (in useApplication hook)
const applicationState = {
  // Current step tracking
  currentStep: 1,                  // 1-6
  totalSteps: 6,

  // Form data for current step
  formData: {
    // Dynamically contains studentFormData OR parentFormData OR academicFormData OR documentFormData
  },

  // Completion tracking
  completedSteps: {
    1: false,                      // Student Info completed?
    2: false,                      // Parent Info completed?
    3: false,                      // Academic Info completed?
    4: false,                      // Photos completed?
    5: false,                      // Documents completed?
    6: false                       // Review completed?
  },
  overall_completion: 0,           // 0-100%

  // File uploads
  selectedFiles: {
    birth_certificate: null,
    student_photo: null,
    // ... etc
  },
  uploadProgress: {},              // Track file upload progress

  // API states
  loading: false,                  // Global loading state
  saving: false,                   // Saving current step
  submitting: false,               // Final submission in progress
  error: null,                     // Error message if any

  // Progress data from API
  progress: {
    current_step: 1,
    status: 'draft',
    steps: {
      1: { completed: false, fields: ['first_name', 'last_name', ...] },
      2: { completed: false, fields: ['father_name', 'mother_name', ...] },
      // ... etc
    }
  },

  // Full application details from GET /applications/:id/details
  details: {
    application_id: 789,
    status: 'draft',
    student_info: {...},           // All fields saved so far
    parent_info: {...},
    academic_info: {...},
    documents: [...]
  },

  // Lead data (if created from lead)
  leadData: {
    id: 456,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '9876543210',
    desired_class: 'Grade 5'
    // ... rest of lead fields
  }
};
```

**How useApplication Hook Manages State:**

```javascript
const useApplication = (applicationId) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [completedSteps, setCompletedSteps] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch on mount
  useEffect(() => {
    const fetchApplicationData = async () => {
      try {
        setLoading(true);
        const progress = await getApplicationProgress(applicationId);
        const details = await getApplicationDetails(applicationId);

        setCurrentStep(progress.current_step);
        setCompletedSteps(progress.completedSteps);
        // Pre-populate formData based on current step
        setFormData(extractFormDataForStep(details, progress.current_step));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchApplicationData();
  }, [applicationId]);

  // Save handlers for each step
  const handleSaveStudentInfo = async (studentData) => {
    try {
      setLoading(true);
      await saveStudentInfo(applicationId, studentData);
      setCompletedSteps((prev) => ({ ...prev, 1: true }));
      setCurrentStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ... similar handlers for other steps ...

  return {
    currentStep,
    formData,
    setFormData,
    completedSteps,
    loading,
    error,
    handleSaveStudentInfo,
    handleSaveParentInfo,
    // ... other handlers ...
  };
};
```

---

## Section 10 — Common issues & troubleshooting

- **API unreachable / CORS**
  - Symptoms: `Failed to fetch` in browser console. Check backend URL, server running, CORS middleware, and proxy config in `vite.config.js`.
- **Authentication issues**
  - Symptoms: Protected routes redirect to `/login`. Verify `sessionStorage` contains token and `isAuthenticated()` returns true.
- **Missing lead_id on application creation**
  - Symptoms: `POST /api/applications` returns 400 "Missing required fields"
  - Causes:
    - Manual entry chosen but `lead_id` not explicitly set to `null`
    - Frontend sends `lead_id: undefined` instead of `null`
  - Solution: Explicitly set `lead_id: null` for manual entry mode

  ```javascript
  // WRONG:
  POST /api/applications { academic_year_id: 2026 }  // lead_id missing

  // RIGHT (for manual entry):
  POST /api/applications/new { academic_year_id: 2026 }  // Use /new endpoint

  // OR (if still using /api/applications):
  POST /api/applications { lead_id: null, academic_year_id: 2026 }
  ```

- **API response structure mismatch**
  - Symptoms: Form state shows as empty or undefined, even though API returns data
  - Causes: Frontend expects different field names than backend returns
  - Solution: Check API response in Network tab → compare to expected structure

  ```javascript
  // Backend returns:
  { first_name: "John", last_name: "Doe", ... }

  // Frontend expects same field names
  // Map if different:
  setFormData({
    firstName: response.first_name,  // Remap if needed
    lastName: response.last_name
  });
  ```

- **Field name mismatch between frontend and backend**
  - Symptoms: Form fields not pre-filling from application data
  - Causes: Frontend uses camelCase (firstName) but API returns snake_case (first_name)
  - Solution: Standardize on one format or add explicit mapping layer

  ```javascript
  // Create a mapper function:
  const mapApiToForm = (apiData) => ({
    first_name: apiData.first_name,
    last_name: apiData.last_name,
    // ... etc
  });

  // Use consistently:
  setFormData(mapApiToForm(apiResponse));
  ```

- **Parent fields not getting mapped to form state**
  - Symptoms: Parent info step shows empty fields even though parent data exists in application
  - Causes:
    - Step 2 extraction logic not properly pulling from application_parent_info
    - Parent data not saved yet (first time filling parent info)
  - Solution:
    ```javascript
    // In MultiStepApplication.jsx when loading Step 2:
    if (applicationDetails?.parent_info) {
      setFormData(applicationDetails.parent_info); // Direct mapping
    } else {
      setFormData(initialParentFormState); // Start empty
    }
    ```
- **Form state not updating after API save**
  - Symptoms: User fills form, clicks "Next", data saves to API but UI doesn't advance
  - Causes:
    - State update race condition
    - Error not handled properly
    - Loading state not reset
  - Solution:
    ```javascript
    const handleSaveStudentInfo = async (data) => {
      try {
        setLoading(true);
        await saveStudentInfo(applicationId, data);
        // Explicitly update state AFTER successful save
        setCompletedSteps((prev) => ({ ...prev, 1: true }));
        setCurrentStep(2); // Advance step
      } catch (err) {
        setError(err.message); // Show error
      } finally {
        setLoading(false); // CRITICAL: Reset loading state
      }
    };
    ```
- **Multi-step form loses data**
  - Symptoms: Data from previous steps disappears when navigating back to them
  - Causes:
    - `activeAdmissionId` not stored in sessionStorage
    - Hook not fetching `getApplicationDetails()` properly
    - Form state reset on component unmount
  - Solution: Check browser's Storage tab for `activeAdmissionId` key
  ```javascript
  // Verify in browser DevTools:
  // Application tab → Session Storage → activeAdmissionId = "789"
  // If missing, add to sessionStorage when creating application:
  sessionStorage.setItem("activeAdmissionId", applicationId);
  ```
- **File upload fails silently**
  - Symptoms: Document/photo upload returns 413 or file size error, or no error shown to user
  - Causes:
    - Max file size exceeded (5MB per file)
    - Invalid file format
    - Multipart/form-data not formatted correctly
    - Error not caught or displayed
  - Solution:

    ```javascript
    // Check file size before upload:
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      setError("File exceeds 5MB limit");
      return;
    }

    // Check file type:
    const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Invalid file format. Use PDF, JPG, or PNG");
      return;
    }

    // Ensure error is displayed:
    try {
      await saveDocuments(applicationId, formData);
    } catch (err) {
      setError(err.message); // Display error to user
    }
    ```

- **Application counts show incorrect numbers**
  - Symptoms: Stats cards display wrong numbers (e.g., draft: 5 but only 2 drafts shown)
  - Causes:
    - Backend counting across all schools (not filtered by authenticated school)
    - Status values inconsistent (draft vs DRAFT vs in_progress)
    - Pagination not accounting for all records
  - Solution: Verify backend filters by school_id and uses correct status names

  ```javascript
  // Check API response:
  GET /api/applications/counts
  Returns: { draft: 5, submitted: 15, under_review: 3, ... }

  // If numbers wrong, check backend query includes:
  // WHERE school_id = req.user.school_id
  ```

- **Draft applications don't appear**
  - Symptoms: No draft applications shown even though user hasn't finished
  - Causes:
    - Backend not correctly filtering by status='draft'
    - Draft status value incorrect (backend uses different value)
    - User creating multiple applications and some are not in draft status
  - Solution: Check backend returns correct status values

  ```javascript
  // Expected response:
  GET /api/applications/draft
  {
    success: true,
    data: [
      { id: 789, student_name: "John Doe", status: "draft", created_at: "..." },
      { id: 790, student_name: "Jane Smith", status: "draft", created_at: "..." }
    ]
  }

  // If missing, verify backend query filters by status='draft' or 'in_progress'
  ```

- **Form validation issues (required fields block submission)**
  - Symptoms: Cannot proceed to next step, validation errors shown
  - Causes: Missing required fields or validation rules too strict
  - Solution: Check validation rules for:
    - Required fields: first_name, last_name, date_of_birth (step 1)
    - Required fields: father_name, mother_name (step 2)
    - Document validation: birth_certificate required (step 5)
    - File size validation (max 5MB)
    - Required photos (student_photo minimum)

  ```javascript
  // Check validation before save:
  const validateStudentInfo = (formData) => {
    const errors = [];
    if (!formData.first_name?.trim()) errors.push("First name required");
    if (!formData.last_name?.trim()) errors.push("Last name required");
    if (!formData.date_of_birth) errors.push("Date of birth required");
    return errors;
  };

  // Show errors before API call:
  const handleSaveStudentInfo = (data) => {
    const errors = validateStudentInfo(data);
    if (errors.length > 0) {
      setError(errors.join(", "));
      return; // Don't make API call
    }
    // Proceed with save...
  };
  ```

- **Search not working in applications**
  - Symptoms: Search returns no results even though applications exist
  - Causes:
    - Query parameter format incorrect
    - Backend search using exact match instead of fuzzy match
    - Whitespace or special characters in search term
  - Solution:

    ```javascript
    // Frontend sends:
    GET /api/applications/search?q=john%20doe

    // Backend should use ILIKE (PostgreSQL):
    WHERE student_name ILIKE '%' || $1 || '%'  // Fuzzy match

    // NOT exact match:
    WHERE student_name = $1  // ❌ This won't work for partial searches
    ```

- **Auto-fill not working (lead name not pre-filling)**
  - Symptoms: Form fields stay empty after creating application from lead
  - Causes:
    - Lead data not passed in `location.state` from CreateApplication
    - useEffect not detecting lead data
    - Condition checking for wrong prop/state variable
    - Lead data shape different than expected
  - Solution:

    ```javascript
    // Verify in MultiStepApplication.jsx:
    const { state } = useLocation();
    console.log("Lead data:", state?.lead); // Debug log

    // Ensure CreateApplication passes lead:
    navigate(`/applications/form/${app.id}`, {
      state: { lead: selectedLead }, // ✅ Pass lead here
    });

    // Check useEffect dependency:
    useEffect(() => {
      if (state?.lead && currentStep === 1) {
        // Do auto-fill
      }
    }, [state?.lead, currentStep]); // ✅ Include both dependencies
    ```

- **Auto-fill overwrites user changes**
  - Symptoms: User manually edits a field, then it reverts to auto-filled value
  - Causes:
    - Auto-fill useEffect running too often
    - useEffect not checking if field already has user input
    - Unconditional state update overwriting user changes
  - Solution:

    ```javascript
    // ❌ WRONG - runs every time form updates, overwrites changes:
    useEffect(() => {
      if (lead) {
        setFormData((prev) => ({
          ...prev,
          first_name: lead.first_name, // Always overwrites!
        }));
      }
    }, [lead, formData]); // Dependency cycle!

    // ✅ RIGHT - runs only on mount or when lead changes:
    useEffect(() => {
      // Only auto-fill if field is currently empty
      if (lead && !formData.first_name) {
        setFormData((prev) => ({
          ...prev,
          first_name: lead.first_name,
        }));
      }
    }, [lead]); // Only depend on lead, not formData
    ```

- **Multi-step form loses data**
  - Symptoms: Data from previous steps disappears. Ensure `activeAdmissionId` is stored in sessionStorage and hook properly fetches `getApplicationDetails()`.
  - Solution: Check browser's Storage tab for `activeAdmissionId` key.
- **File upload fails**
  - Symptoms: Document/photo upload returns 413 or file size error. Max file size is 5MB per file.
  - Solution: Check file size, format (PDF, JPG, PNG), and ensure `application/:id/documents` endpoint accepts multipart/form-data.
- **Application counts show incorrect numbers**
  - Symptoms: Stats cards display wrong numbers. Ensure backend is counting correctly by status.
  - Solution: Check backend `/api/applications/counts` endpoint response.
- **Draft applications don't appear**
  - Symptoms: No draft applications shown even though user hasn't finished. Ensure backend correctly returns drafts with `status: 'DRAFT'` or `status: 'in_progress'`.
  - Solution: Verify backend query for draft applications.
- **Form validation issues**
  - Symptoms: Cannot proceed to next step. Check validation rules for:
    - Required fields (first_name, last_name, date_of_birth, etc.)
    - Document type validation
    - File size validation (max 5MB)
    - Required photos (student_photo minimum)
- **Search not working**
  - Symptoms: Search returns no results. Check query parameter format and backend search implementation.
  - Solution: Verify backend `/api/applications/search` uses ILIKE or similar for fuzzy matching.

---

## Section 11 — Application Architecture Specifics

### Multi-Step Form Design

The multi-step application form is built with the following architecture:

**Step Auto-Save:**

- Each step saves automatically when user clicks "Next"
- Validates before allowing progression
- Displays errors inline if validation fails
- Can resume from where user left off

**Document Upload Specifications:**

- Maximum file size: 5MB per file
- Allowed formats: PDF, JPG, PNG
- Document types: birth_certificate, aadhaar_card, transfer_certificate, previous_report_card, address_proof, parent_id_proof
- Photo types: student_photo, parent_photo
- All documents uploaded as multipart/form-data to `/api/applications/:id/documents`

**Class Normalization:**

- Accepts formats: "Nursery", "Jr KG", "Sr KG", "Class 1-12"
- Automatically calculates previous class for display
- Handles case-insensitive input

**Lead Data Integration:**

- When creating from lead, student name is auto-populated
- Lead contact info can be pre-filled for parent details
- Lead source tracked for analytics

### API Response Standardization

All application endpoints follow this response format:

```json
{
  "success": true,
  "data": {
    /* endpoint-specific data */
  },
  "message": "Human-readable message"
}
```

Errors:

```json
{
  "success": false,
  "message": "Error description",
  "error_code": "OPTIONAL_ERROR_CODE"
}
```

---

## Section 12 — Recommended improvements & next steps

**Completed in this update:**

- ✅ Full API integration for applications workflow
- ✅ Multi-step form with auto-save
- ✅ Draft application management
- ✅ Custom hooks for data fetching
- ✅ Document and photo upload
- ✅ Application progress tracking

**Recommended future improvements:**

1. **Form state persistence:**
   - Cache form data in localStorage for better UX
   - Auto-recover unsaved data on page reload

2. **Component extraction:**
   - Move form steps into separate components (`StudentForm`, `ParentForm`, `AcademicForm`)
   - Create reusable `DocumentUploadComponent`
   - Extract file preview component

3. **Validation enhancement:**
   - Add real-time field-level validation
   - Implement phone number formatting
   - Add date picker for date fields
   - Email validation for parent emails

4. **UI/UX improvements:**
   - Add progress bar showing completion percentage
   - Add "Save as Draft" button on each step
   - Add "Auto-save" indicator
   - Add file upload progress feedback

5. **Performance optimizations:**
   - Implement React Query for server state
   - Add pagination to applications list
   - Implement virtual scrolling for large lists
   - Add debouncing to search input

6. **Accessibility:**
   - Add ARIA labels to form fields
   - Improve keyboard navigation
   - Add form error announcements
   - Better color contrast for status badges

7. **Analytics:**
   - Track which steps users abandon
   - Log form submission success/failure
   - Track file upload performance

---

**Last Updated:** April 21, 2026  
**Documentation Version:** 2.0  
**Frontend Status:** Applications module complete with full API integration and multi-step form
