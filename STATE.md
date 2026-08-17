---
product: JeevaSetu Karnataka (v2 with GapSense)
current_phase: "Phase 5B — Referral Creation, Queue, Case Detail & Timeline"
completed:
  - "FR-01: Authentication, JWT management, and server-side RBAC middleware"
  - "FR-02: POST /api/v1/referrals with Zod validation, unique case ID generation (JS-YYYY-NNNNNN), and idempotency-key replay protection"
  - "FR-02: GET /api/v1/referrals with role-scoped filtering (frontline worker, sending facility, receiving facility, supervisor, admin)"
  - "FR-02: GET /api/v1/referrals/:id case detail with role scope enforcement and patient/facility metadata"
  - "FR-02: PATCH /api/v1/referrals/:id for permitted operational fields, appending immutable CaseEvents"
  - "FR-02: POST /api/v1/referrals/:id/events for custom operational event logging"
  - "FR-12: GET /api/v1/referrals/:id/timeline returning immutable case events in strict chronological order"
  - "All mutations write append-only CaseEvent records without editing historical records in-place"
  - "Comprehensive API test suite in packages/api/src/referrals/__tests__/referrals.test.ts (71/71 tests passing across test suites)"
in_progress:
  - "Phase 5B complete, ready for Phase 5C (Receiving-facility response: accept / redirect / reject)"
blocker: "none"
next_action: "Proceed to Phase 5C: Receiving-facility response (accept / redirect / reject with capacity reason codes, FR-03, FR-07)"
files_changed:
  - "packages/api/src/app.ts"
  - "packages/api/src/case-events/index.ts"
  - "packages/api/src/case-events/case-events.service.ts"
  - "packages/api/src/referrals/index.ts"
  - "packages/api/src/referrals/referrals.schema.ts"
  - "packages/api/src/referrals/referrals.service.ts"
  - "packages/api/src/referrals/referrals.routes.ts"
  - "packages/api/src/referrals/__tests__/referrals.test.ts"
  - "STATE.md"
important_decisions:
  - "Idempotency replay safely returns original created ReferralCase and prevents duplicate CaseEvents"
  - "All mutations write append-only CaseEvents with requestId and idempotencyKey audit markers"
  - "Role scoping strictly enforced server-side for queue listing and single-case lookup"
known_errors:
  - "none"
tests_run:
  - "vitest run: 71/71 passing (56 state-machine tests + 10 auth & RBAC tests + 5 referral lifecycle tests)"
  - "npm run typecheck: 0 errors"
scope_changes:
  - "none"
---
