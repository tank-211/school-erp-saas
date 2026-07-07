# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-02)

**Core value:** Zero downtime for active schools and automated access suspension for expired accounts.
**Current focus:** All v1 phases (1-4) completed. Super Admin SaaS Portal foundation ready for deployment or v2 features.

## Phase History

### Phase 1: Super Admin Foundation & APIs — ✅ Complete

- **Completed:** 2026-05-02
- **Files created/modified:**
  - `backend/config/db.js` — Postgres connection pool
  - `backend/app.js` — Express setup with CORS, JSON parsing, route registration
  - `backend/server.js` — Server entry point with DB connection check
  - `backend/src/middleware/verifyInternalStaff.js` — JWT auth middleware for service provider staff
  - `backend/controllers/superAdminAuthController.js` — Login with bcrypt + JWT
  - `backend/controllers/superAdminSchoolController.js` — School CRUD + auto admin provisioning
  - `backend/routes/superAdminRoutes.js` — Route wiring
- **Requirements completed:** API-01, API-02, API-03, API-04, API-05, ONB-01, ONB-02

### Phase 3: Subscription & Analytics Engine — ✅ Complete

- **Completed:** 2026-05-02
- **Files created/modified:**
  - `backend/app.js` — Mounted school auth routes and preserved super admin routing
  - `backend/controllers/superAdminSchoolController.js` — Plan validation, richer stats, expiring-school data
  - `backend/controllers/superAdminBillingController.js` — Manual renewal flow and renewal history
  - `backend/database/schema.sql` — Renewal ledger table for manual subscription tracking
  - `backend/routes/superAdminRoutes.js` — Renewal endpoints for subscriptions
  - `backend/src/middleware/verifySchoolSubscription.js` — Date-accurate login-time subscription gate
  - `frontend/src/App.jsx` — Renewal route added under protected portal
  - `frontend/src/pages/sp/SPDashboard.jsx` — SaaS stats, expiring subscriptions, school-user counts
  - `frontend/src/pages/sp/SchoolManagement.jsx` — Expiry highlighting and renewal actions
  - `frontend/src/pages/sp/RenewalManager.jsx` — Manual renewal UI + history
  - `frontend/src/services/superAdminService.js` — Renewal endpoints and richer stats payload
  - `frontend/src/styles/sp-theme.css` — Expiry state and dashboard list styles
- **Requirements completed:** SUB-01, SUB-02, SUB-03, SUB-04, API-06, FEND-03, FEND-05

### Phase 4: Global Features — ✅ Complete

- **Completed:** 2026-05-03
- **Goal:** Implement cross-tenant communication and support ticketing
- **Requirements covered:** GLB-01, GLB-02
- **Files created/modified:**
  - `backend/database/schema.sql` — Added system_announcements and support_tickets tables
  - `backend/controllers/superAdminGlobalController.js` — New controller for global features
  - `backend/routes/superAdminRoutes.js` — Added announcement and support ticket routes
  - `backend/routes/publicRoutes.js` — Public endpoint for school announcements
  - `backend/app.js` — Mounted public routes
  - `frontend/src/pages/sp/AnnouncementManager.jsx` — UI for managing announcements
  - `frontend/src/pages/sp/SupportManager.jsx` — UI for managing support tickets
  - `frontend/src/services/superAdminService.js` — Added announcement and support methods
  - `frontend/src/components/school/AnnouncementBanner.jsx` — Banner component for schools
  - `frontend/src/App.jsx` — Added routes and banner component
  - `frontend/src/components/sp/SPSidebar.jsx` — Added navigation links
  - `frontend/src/styles/sp-theme.css` — Added banner and status styles
