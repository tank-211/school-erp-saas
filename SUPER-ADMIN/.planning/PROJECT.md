# Super Admin SaaS Portal

## What This Is

A dedicated control portal for the Service Provider / SaaS Owner to manage multi-tenant school accounts, subscription lifecycles, and global system configurations. It acts as the gatekeeper for the School ERP, ensuring no school can access the system without being registered and actively subscribed.

## Core Value

Zero downtime for active schools and automated access suspension for expired accounts.

## Requirements

### Validated

- ✓ Multi-tenant database schema (school, app_user, service_provider_staff) — existing
- ✓ Basic school tenant structure — existing

### Active

- [ ] **School Onboarding**: Form to input school details and automatically provision the first 'Admin' account in `app_user`.
- [ ] **Service Toggle (Kill Switch)**: Manual toggle to deactivate a school immediately.
- [ ] **Subscription Auto-Stop**: Middleware on standard `/login` route that blocks login if `is_active` is false or `current_date > expiry_date`.
- [ ] **Plan Management**: Assign schools to tiers (Basic, Pro, Ultimate).
- [ ] **Renewal Portal**: Manual log to track payment history and extend `expiry_date`.
- [ ] **Super Admin Auth**: Login route for `service_provider_staff` returning JWT with `internal_role`.
- [ ] **Super Admin Middleware**: `verifyInternalStaff` to protect SaaS management routes.
- [ ] **Cross-Tenant Analytics**: Dashboard showing total schools, total users per school, and admission trends.
- [ ] **SaaS UI Theme**: Dark Slate/Indigo theme on `/sp-control-portal` distinct from standard school view.
- [ ] **Global Communications**: Banner announcements across all school dashboards.
- [ ] **Support Ticketing**: List of support requests from school admins.

### Out of Scope

- Automated Payment Gateway (Stripe/Razorpay) — Renewals and extensions will be handled manually for now.
- Deep White-Labeling (Custom subdomains/colors) — Limited to logo swapping for "Pro" tiers in the immediate term.
- Real-time continuous expiry checking — Handled efficiently via login middleware instead.

## Context

- **Technical Environment**: Node.js/Express backend, Vite + React frontend (using existing Layout.jsx sidebar architecture).
- **Database**: PostgreSQL with existing `service_provider_staff` and `school` tables mapped.
- **Workflow**: The user expects a clear separation between the Super Admin portal and the standard School Admin views.

## Constraints

- **Security**: Must explicitly validate JWT internal_role before allowing cross-tenant modifications.
- **Performance**: Auto-stop logic must happen efficiently at login rather than a background cron job constantly scanning (as per user's proposed architecture).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Login-time expiry check | More efficient than running continuous background cron jobs | — Pending |
| Separate `/sp-control-portal` route | Keeps SaaS logic cleanly isolated from standard ERP routing | — Pending |
| Manual renewal tracking | Simplifies v1 launch without payment gateway compliance overhead | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-02 after initialization*
