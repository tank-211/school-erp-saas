# Roadmap: Super Admin SaaS Portal

## Phase 1: Super Admin Foundation & APIs
- **Goal:** Establish secure authentication and core school management APIs for the service provider.
- **Requirements Covered:**
  - API-01: Super admin login & JWT
  - API-02: verifyInternalStaff middleware
  - API-03: GET schools
  - API-04: POST new school
  - API-05: PATCH school
  - ONB-01: Provision first admin
  - ONB-02: Save school with plan details

## Phase 2: Core SaaS UI & Integration
- **Goal:** Build the dedicated frontend control portal and connect it to the new APIs.
- **Requirements Covered:**
  - FEND-01: /sp-control-portal route
  - FEND-02: Dark Slate/Indigo theme
  - FEND-04: School Management Table with actions
  - FEND-06: src/services/superAdminService.js
  - FEND-07: Staff Manager UI

## Phase 3: Subscription & Analytics Engine
- **Goal:** Enforce auto-stop logic, track usage stats, and handle manual renewals.
- **Requirements Covered:**
  - SUB-01: Auto-stop middleware on school login
  - SUB-02: Service Toggle (Kill switch)
  - SUB-03: Subscription tiers assignment
  - SUB-04: Manual renewal interface
  - API-06: Cross-tenant stats API
  - FEND-03: SaaS Dashboard views
  - FEND-05: Expiry highlight in red

## Phase 4: Global Features
- **Goal:** Implement cross-tenant communication and support ticketing.
- **Requirements Covered:**
  - GLB-01: System Announcements banner
  - GLB-02: Support Messaging list
