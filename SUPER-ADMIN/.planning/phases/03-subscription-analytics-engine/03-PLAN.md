# Phase 3: Subscription & Analytics Engine — Plan

---
wave: 1
depends_on: [Phase 1, Phase 2]
files_modified:
  - backend/src/middleware/verifySchoolSubscription.js
  - backend/controllers/schoolAuthController.js
  - backend/controllers/superAdminSchoolController.js
  - backend/controllers/superAdminBillingController.js
  - backend/routes/superAdminRoutes.js
  - backend/routes/schoolAuthRoutes.js
  - backend/database/schema.sql
  - frontend/src/services/superAdminService.js
  - frontend/src/pages/sp/SPDashboard.jsx
  - frontend/src/pages/sp/SchoolManagement.jsx
  - frontend/src/pages/sp/RenewalManager.jsx
  - frontend/src/App.jsx
  - frontend/src/styles/sp-theme.css
autonomous: true
requirements: [SUB-01, SUB-02, SUB-03, SUB-04, API-06, FEND-03, FEND-05]
---

## Overview

Implement subscription enforcement and analytics across tenants: block expired/inactive schools at school login, expose cross-tenant user stats, add manual renewal tracking, and upgrade the Super Admin dashboard for expiry visibility and operational control.

## Plans

### Plan 1: Auto-Stop Middleware for School Login (SUB-01)

Add middleware on standard school login flow that validates `school.is_active` and `school.expiry_date` before auth success.

**Files:** `backend/src/middleware/verifySchoolSubscription.js`, `backend/controllers/schoolAuthController.js`, `backend/routes/schoolAuthRoutes.js`

**Actions:**
1. Create middleware `verifySchoolSubscription` using the incoming school identifier (school_id or school domain mapping, depending on current login payload).
2. Query `school` table and reject login with `403` when:
   - `is_active = false`, or
   - `expiry_date < CURRENT_DATE`.
3. Return explicit machine-readable errors (`SCHOOL_INACTIVE`, `SUBSCRIPTION_EXPIRED`) for frontend handling.
4. Attach validated school context onto request for downstream login controller.

**Acceptance:**
- Login denied for inactive schools.
- Login denied for expired schools.
- Active + non-expired schools continue normal login.

### Plan 2: Service Toggle and Tier Management Hardening (SUB-02, SUB-03)

Strengthen school update controls to support immediate kill-switch and tier assignment with validation.

**Files:** `backend/controllers/superAdminSchoolController.js`, `backend/routes/superAdminRoutes.js`

**Actions:**
1. Restrict `plan_type` values to an allowed set (`basic`, `pro`, `ultimate`, optional `trial`).
2. Validate toggle/status transitions in update endpoint to avoid invalid combinations.
3. Add optional audit fields (`updated_by`, reason metadata when suspension/reactivation occurs).
4. Ensure PATCH responses return fresh school state used by frontend table without additional shape mapping.

**Acceptance:**
- Invalid plan updates return `400`.
- Suspend/Activate paths are deterministic and reflected instantly.
- Plan changes persist and are visible in school listing.

### Plan 3: Manual Renewal Engine + Payment History (SUB-04)

Introduce renewal logging and expiry extension APIs for controlled, manual billing operations.

**Files:** `backend/database/schema.sql`, `backend/controllers/superAdminBillingController.js`, `backend/routes/superAdminRoutes.js`

**Actions:**
1. Add renewal/payment table (e.g., `school_subscription_renewal`) with fields:
   - `school_id`, `amount`, `currency`, `period_months`, `paid_on`, `new_expiry_date`, `notes`, `created_by`, `created_at`.
2. Add endpoint `POST /api/super-admin/schools/:id/renew`:
   - transactionally insert renewal record,
   - compute/validate next expiry,
   - update `school.expiry_date` and optionally `is_active=true` for renewed suspended-expired tenants.
3. Add endpoint `GET /api/super-admin/schools/:id/renewals` for payment history timeline.

**Acceptance:**
- Renewal extends expiry date correctly.
- Renewal history retrievable per school.
- Failed renewals rollback cleanly (no partial updates).

### Plan 4: Cross-Tenant Analytics API (API-06)

Provide aggregate and per-school usage stats for dashboard visibility.

**Files:** `backend/controllers/superAdminSchoolController.js`, `backend/routes/superAdminRoutes.js`

**Actions:**
1. Upgrade `GET /api/super-admin/stats` to include:
   - total schools,
   - active schools,
   - suspended schools,
   - expired schools,
   - total active students across all schools,
   - expiring soon count (e.g., next 7/15/30 days).
2. Add grouped count query on `app_user` by `school_id` with optional role filters.
3. Add endpoint for table/dashboard card usage details if needed (e.g., `GET /api/super-admin/stats/school-users`).

**Acceptance:**
- Stats endpoint returns cross-tenant user counts grouped by school.
- Dashboard-critical totals are accurate against DB snapshot.

### Plan 5: Dashboard Upgrade for SaaS Visibility (FEND-03)

Expand dashboard with subscription intelligence and at-risk account monitoring.

**Files:** `frontend/src/pages/sp/SPDashboard.jsx`, `frontend/src/services/superAdminService.js`

**Actions:**
1. Add KPI cards for:
   - total schools,
   - active schools,
   - total active students,
   - expiring soon schools.
2. Add expiring-subscriptions panel with quick links to school detail/renewal actions.
3. Add loading/error states and resilient rendering when partial API data is unavailable.

**Acceptance:**
- Dashboard shows subscription and usage KPIs from live API.
- Expiring subscription list is clearly visible and actionable.

### Plan 6: Expiry Highlighting and Renewal UI (FEND-05, SUB-04)

Make expiry risk unmistakable in school management and provide direct renewal workflow.

**Files:** `frontend/src/pages/sp/SchoolManagement.jsx`, `frontend/src/pages/sp/RenewalManager.jsx`, `frontend/src/styles/sp-theme.css`, `frontend/src/App.jsx`

**Actions:**
1. In school table, highlight expired rows in red and expiring-soon rows in warning color.
2. Add inline “Renew” action from table rows.
3. Create renewal form/page (`RenewalManager`) with:
   - months/amount/notes inputs,
   - API call to renewal endpoint,
   - history table of prior renewals.
4. Route integration under protected portal paths.

**Acceptance:**
- Expired schools are visually red in the table.
- Renewal can be submitted from UI and immediately updates expiry visuals.
- Renewal history is visible for each school.

## Verification

### Must-Haves
- [ ] School login blocks expired/inactive tenants (SUB-01).
- [ ] Suspend/activate and plan assignment remain stable and validated (SUB-02, SUB-03).
- [ ] Manual renewal writes history + updates expiry atomically (SUB-04).
- [ ] Cross-tenant stats include grouped `app_user` counts (API-06).
- [ ] Dashboard shows total schools + active students + expiring subscriptions (FEND-03).
- [ ] School rows with expired subscriptions render in red (FEND-05).

### Suggested Tests
- [ ] Backend integration tests for login-blocking edge cases (`expiry_date` null/today/past).
- [ ] Transaction test for renewal endpoint rollback behavior.
- [ ] Frontend tests for expiry highlighting conditions and renewal flow states.
- [ ] Manual UAT for suspend -> renew -> activate lifecycle.
