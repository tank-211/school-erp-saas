# Phase 2: Core SaaS UI & Integration — Plan

---
wave: 1
depends_on: [Phase 1]
files_modified:
  - frontend/src/services/superAdminService.js
  - frontend/src/pages/sp/SPLogin.jsx
  - frontend/src/pages/sp/SPDashboard.jsx
  - frontend/src/pages/sp/SchoolManagement.jsx
  - frontend/src/pages/sp/StaffManager.jsx
  - frontend/src/components/sp/SPLayout.jsx
  - frontend/src/components/sp/SPSidebar.jsx
  - frontend/src/styles/sp-theme.css
  - frontend/src/App.jsx
autonomous: true
requirements: [FEND-01, FEND-02, FEND-04, FEND-06, FEND-07]
---

## Overview

Build the dedicated Super Admin frontend portal at `/sp-control-portal` with Dark Slate/Indigo theme, school management table, and staff manager. Connect to Phase 1 APIs via a dedicated service layer.

## Plans

### Plan 1: Install Dependencies & API Service Layer

Install react-router-dom and axios. Create `src/services/superAdminService.js` with all API calls.

**Files:** `frontend/package.json`, `frontend/src/services/superAdminService.js`

**Actions:**
1. `cd frontend && npm install react-router-dom axios`
2. Create service with: `login(email, password)`, `getSchools()`, `createSchool(data)`, `updateSchool(id, data)`, `getStats()`
3. Use `axios.create({ baseURL: 'http://localhost:5001/api/super-admin' })` with JWT interceptor from localStorage

**Acceptance:** File contains `axios.create`, `login`, `getSchools`, `createSchool`, `updateSchool`

### Plan 2: Dark Slate/Indigo Theme CSS

Create `src/styles/sp-theme.css` with CSS custom properties for dark mode.

**Key tokens:**
- `--sp-bg-primary: #0f172a` (slate-900)
- `--sp-bg-secondary: #1e293b` (slate-800)
- `--sp-bg-card: #334155` (slate-700)
- `--sp-accent: #6366f1` (indigo-500)
- `--sp-accent-hover: #818cf8` (indigo-400)
- `--sp-text-primary: #f1f5f9`
- `--sp-text-secondary: #94a3b8`
- `--sp-danger: #ef4444`
- `--sp-success: #22c55e`
- `--sp-warning: #f59e0b`

**Acceptance:** File contains all CSS custom properties above plus `.sp-` prefixed utility classes

### Plan 3: SP Layout & Sidebar Components

Create `SPLayout.jsx` (dark sidebar + main content area) and `SPSidebar.jsx` (navigation links).

**Sidebar links:** Dashboard, School Management, Staff Manager
**Layout:** Fixed sidebar (250px) + scrollable main content

**Acceptance:** `SPLayout.jsx` renders `SPSidebar` + `<Outlet/>`, `SPSidebar.jsx` contains NavLink items

### Plan 4: SP Login Page

Create `SPLogin.jsx` at route `/sp-control-portal`.

**Features:** Dark themed login form, email + password fields, calls `superAdminService.login()`, stores JWT + user in localStorage, redirects to `/sp-control-portal/dashboard` on success, shows error messages

**Acceptance:** Contains `superAdminService.login`, `localStorage.setItem`, form with email/password inputs

### Plan 5: School Management Table Page

Create `SchoolManagement.jsx` with a searchable table.

**Columns:** Name, Email, Plan, Status, Active, Expiry Date, Actions
**Actions per row:** Suspend, Activate, Edit Plan buttons
**Features:** Search filter, calls `getSchools()` on mount, `updateSchool()` on action click

**Acceptance:** Contains `getSchools`, `updateSchool`, table with school data, action buttons

### Plan 6: Staff Manager Page

Create `StaffManager.jsx` to manage `service_provider_staff` users.

**Features:** List staff members, add new staff form (name, email, password, role), display in table
**Note:** Requires a new backend route — add `GET/POST /api/super-admin/staff` to backend

**Acceptance:** Contains staff listing table and add-staff form

### Plan 7: App Router Integration

Update `App.jsx` with react-router-dom routes.

**Routes:**
- `/sp-control-portal` → `SPLogin`
- `/sp-control-portal/dashboard` → `SPDashboard` (inside SPLayout)
- `/sp-control-portal/schools` → `SchoolManagement` (inside SPLayout)
- `/sp-control-portal/staff` → `StaffManager` (inside SPLayout)

Add `ProtectedRoute` wrapper that checks localStorage for SP JWT.

**Acceptance:** `App.jsx` contains all 4 routes, `ProtectedRoute` component checks auth

## Verification

### Must-Haves
- [ ] `/sp-control-portal` renders dark-themed login page
- [ ] Successful login redirects to dashboard
- [ ] School Management table loads and displays schools from API
- [ ] Suspend/Activate/Edit Plan actions call PATCH endpoint
- [ ] Staff Manager lists and adds staff
- [ ] Dark Slate/Indigo theme is visually distinct from standard ERP views
- [ ] All API calls use `superAdminService.js`
