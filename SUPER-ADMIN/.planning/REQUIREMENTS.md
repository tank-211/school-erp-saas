# Requirements: Super Admin SaaS Portal

**Defined:** 2026-05-02
**Core Value:** Zero downtime for active schools and automated access suspension for expired accounts.

## v1 Requirements

### School Onboarding

- [ ] **ONB-01**: Form to input school details and automatically provision the first 'Admin' account in `app_user` with generated `school_id`.
- [ ] **ONB-02**: Save the newly inserted school in the `school` table with `is_active`, `plan_type`, and `expiry_date`.

### Subscription Logic

- [ ] **SUB-01**: Auto-Stop Engine middleware on standard `/login` route that blocks login if `is_active` is false or `current_date > expiry_date`.
- [ ] **SUB-02**: Manual Service Toggle to deactivate or activate a school immediately (Update `is_active`).
- [ ] **SUB-03**: Assign schools to subscription tiers (Basic, Pro, Ultimate).
- [ ] **SUB-04**: Manual renewal interface to log payment history and extend `expiry_date`.

### Super Admin API & Middleware

- [ ] **API-01**: Login route for `service_provider_staff` validating credentials and returning JWT with `internal_role`.
- [ ] **API-02**: Middleware `verifyInternalStaff` checking the JWT against `service_provider_staff` table.
- [ ] **API-03**: Route `GET /api/super-admin/schools` to fetch all school records.
- [ ] **API-04**: Route `POST /api/super-admin/schools` to insert new schools.
- [ ] **API-05**: Route `PATCH /api/super-admin/schools/:id` to update status/expiry.
- [ ] **API-06**: Route `GET /api/super-admin/stats` to run a COUNT query on `app_user` grouped by `school_id`.

### Frontend & UI Theme

- [ ] **FEND-01**: Dedicated route `/sp-control-portal` for the internal Super Admin login.
- [ ] **FEND-02**: Apply Dark Slate/Indigo theme on `/sp-control-portal` distinct from standard school view.
- [ ] **FEND-03**: SaaS Dashboard view showing total schools, total active students, and expiring subscriptions.
- [ ] **FEND-04**: School Management Table with "Suspend", "Activate", and "Edit Plan" actions.
- [ ] **FEND-05**: Highlight table rows in Red if the `expiry_date` is less than the current date.
- [ ] **FEND-06**: Create `src/services/superAdminService.js` for Axios calls.
- [ ] **FEND-07**: Staff Manager UI to manage users within `service_provider_staff`.

### Global Features

- [ ] **GLB-01**: System Announcements to push banner notifications to all school dashboards.
- [ ] **GLB-02**: Support Messaging to view support tickets submitted by school admins.

## v2 Requirements

### Value Add & Enterprise

- **V2-01**: White-Labeling Toggle to allow specific schools (Pro tier) to upload their own logo.
- **V2-02**: Master Audit Logs showing exactly who changed what in the SaaS portal.
- **V2-03**: Database Backup Trigger to manually back up a specific school's data.

## Out of Scope

| Feature                              | Reason                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| Automated Payment Gateway            | Renewals and extensions will be handled manually to simplify v1                |
| Deep White-Labeling                  | Custom subdomains and full color themes deferred, sticking to basic logo swaps |
| Real-time continuous expiry checking | Too much database overhead; checking at login time is much more efficient      |

## Traceability

| Requirement | Phase   | Status      |
| ----------- | ------- | ----------- |
| ONB-01      | Phase 1 | ✅ Complete |
| ONB-02      | Phase 1 | ✅ Complete |
| SUB-01      | Phase 3 | ✅ Complete |
| SUB-02      | Phase 3 | ✅ Complete |
| SUB-03      | Phase 3 | ✅ Complete |
| SUB-04      | Phase 3 | ✅ Complete |
| API-01      | Phase 1 | ✅ Complete |
| API-02      | Phase 1 | ✅ Complete |
| API-03      | Phase 1 | ✅ Complete |
| API-04      | Phase 1 | ✅ Complete |
| API-05      | Phase 1 | ✅ Complete |
| API-06      | Phase 3 | ✅ Complete |
| FEND-01     | Phase 2 | Pending     |
| FEND-02     | Phase 2 | Pending     |
| FEND-03     | Phase 3 | ✅ Complete |
| FEND-04     | Phase 2 | Pending     |
| FEND-05     | Phase 3 | ✅ Complete |
| FEND-06     | Phase 2 | Pending     |
| FEND-07     | Phase 2 | Pending     |
| GLB-01      | Phase 4 | ✅ Complete |
| GLB-02      | Phase 4 | ✅ Complete |

**Coverage:**

- v1 requirements: 21 total
- Mapped to phases: 21
- Complete: 9 ✅
- Planned: 0 📋

---

_Requirements defined: 2026-05-02_
_Last updated: 2026-05-03 after Phase 4 execution_
