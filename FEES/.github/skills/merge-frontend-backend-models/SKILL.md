---
name: merge-frontend-backend-models
description: 'Workspace skill: unify frontend and backend data models (e.g., User, Student, FeePayment) into a single canonical contract, update code, and verify API compatibility.'
argument-hint: 'Model names to merge (comma-separated), e.g., "User, Student"'
user-invocable: true
---

# Merge Frontend & Backend Models

## What this skill does
- Scans frontend and backend model definitions for the specified model names.
- Produces a canonical model contract (fields, types, validation rules, relationships).
- Generates a migration plan: code updates, API contract adjustments, frontend store updates, and tests.
- Optionally applies changes to files when asked.

## When to use
- You have duplicate or diverging model definitions across frontend and backend.
- You want a single source of truth for model shape and validation.
- You are preparing API versioning, or migrating data structures.

## Inputs
- `models` (argument): comma-separated model names to merge (case-insensitive). Example: `/merge-frontend-backend-models User, Student`.
- `apply`: optional flag to auto-apply suggested code changes. Default: `false`.

## Procedure
1. Discover model files in `backend/models/` and `frontend/src/` matching the provided names.
2. Parse the model definitions to extract fields, types, defaults, enums, required flags, and relationships.
3. Produce a canonical model contract document `./.github/skills/merge-frontend-backend-models/canonical/<model>.md`.
4. Create a migration plan with concrete code edits:
   - Backend: schema updates, validators, DTOs, and API responses.
   - Frontend: types/interfaces (TypeScript), form validators, and store/state updates.
   - Tests: unit tests for validation and API integration tests.
5. Present the changes and ask for confirmation before applying.
6. Optionally apply edits using workspace-safe edits and create a PR branch.

## Deliverables
- Canonical model contract files in `./.github/skills/merge-frontend-backend-models/canonical/`.
- A human-readable migration plan saved at `./.github/skills/merge-frontend-backend-models/PLAN.md`.
- Patch suggestions (diffs) and optional automatic edits if `apply=true`.

## Quality checks
- Field name collisions flagged with suggested renames.
- Enum/value incompatibilities highlighted.
- Required/optional mismatches highlighted with suggested migration steps (default values, backfill SQL/mongo script).
- API response shape changes listed with versioning guidance.

## Examples
- `/merge-frontend-backend-models User` — analyze and propose canonical contract for `User`.
- `/merge-frontend-backend-models User, Student apply=true` — analyze and apply changes after confirmation.

## Next steps & customizations
- Add automated test generator script under `./scripts/` to scaffold tests for the merged models.
- Add a code-mod under `./scripts/codemods/` to perform automated renames across the codebase.

## References
- Backend models: `./backend/models/`
- Frontend models/types: `./frontend/src/`


---
