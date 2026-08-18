---
product: JeevaSetu Karnataka (v2 with GapSense)
current_phase: "Phase 9B — Referral Blackspot Dashboard & Aggregated Capacity Signals"
completed:
  - "FR-01–FR-04, FR-08, FR-09, FR-11, FR-12 Backend Complete (Phase 5)"
  - "Operations Dashboard Shell Complete (packages/dashboard, Phase 6A)"
  - "Frontline PWA Client Shell Complete (packages/client, Phase 6B)"
  - "Offline Sync Layer End to End Complete (packages/api/src/sync & packages/client/src/sync, Phase 7)"
  - "Deterministic GapSense Classification Engine & Worker Complete (Phase 8A)"
  - "Escalation Playbooks & Supervisor Screens Complete (Phase 8B)"
  - "Capacity Rejection Re-routing & Suggestions Engine Complete (Phase 9A)"
  - "Built read-only Referral Blackspot aggregation module (packages/api/src/blackspot) computing rejection rates, capacity reason distributions, rerouting frequencies, and median acknowledgement times"
  - "Enforced Hard Safety Rule 1: Persistent, unmissable disclaimer label ('Pilot-period, synthetic-data operational indicator — not a clinical performance judgment') in all API responses and UI screens"
  - "Enforced Hard Safety Rule 2: Dynamic minimum case-count threshold suppression reading MIN_CASE_COUNT_BLACKSPOT_THRESHOLD from environment with fallback default of 5 (facilities below threshold are completely absent from output)"
  - "Enforced Hard Safety Rule 3: Zero patient joins or patient-identifying data anywhere in Blackspot queries"
  - "Built BlackspotDashboardPage in packages/dashboard with district filters, rolling window selectors, metric cards, heatmap table, and non-identifying capacity signals modal"
  - "Verified unit & integration test coverage: 137/137 tests passing across 14 test suites (122 API tests + 8 client tests + 7 dashboard tests)"
  - "Vite production bundle built cleanly in 4.39s"
in_progress:
  - "Phase 9 fully complete, ready for Phase 10 (End-to-End Testing & Pilot Readiness)"
blocker: "none"
next_action: "Proceed to Phase 10: Full system integration, end-to-end simulation test suite, and final pilot readiness verification"
files_changed:
  - "packages/api/src/blackspot/blackspot.types.ts"
  - "packages/api/src/blackspot/blackspot.service.ts"
  - "packages/api/src/blackspot/blackspot.routes.ts"
  - "packages/api/src/blackspot/index.ts"
  - "packages/api/src/blackspot/__tests__/blackspot.test.ts"
  - "packages/api/src/shared/constants.ts"
  - "packages/api/src/app.ts"
  - "packages/api/src/auth/auth.service.ts"
  - "packages/api/src/auth/__tests__/auth-and-rbac.test.ts"
  - "packages/dashboard/src/pages/BlackspotDashboardPage.tsx"
  - "packages/dashboard/src/components/common/Sidebar.tsx"
  - "packages/dashboard/src/context/AuthContext.tsx"
  - "packages/dashboard/src/i18n/translations.ts"
  - "packages/dashboard/src/App.tsx"
  - "packages/dashboard/src/__tests__/dashboard-and-roles.test.ts"
  - "STATE.md"
important_decisions:
  - "Blackspot queries are 100% read-only with zero mutation paths and zero joins to PatientReference or identifying tables"
  - "Facilities with fewer cases than MIN_CASE_COUNT_BLACKSPOT_THRESHOLD (default 5) are completely omitted from summary responses"
  - "Persistent, unmissable safety banner displayed at top of Blackspot dashboard in both English and Kannada"
known_errors:
  - "none"
tests_run:
  - "vitest run: 137/137 passing across 14 test suites (122 API + 8 client + 7 dashboard)"
  - "npm run typecheck: 0 errors across all workspaces"
  - "npm run build:dashboard: Vite production build passed in 4.39s"
scope_changes:
  - "AuthService.getUserById: Updated to check user.district fallback in addition to user.facility.district so that District Supervisor users (who may not have an assigned facility relation) retain their district scope for Blackspot filtering."
  - "BLACKSPOT_CONFIG.MIN_CASE_COUNT_THRESHOLD: Configured as a dynamic getter reading process.env.MIN_CASE_COUNT_BLACKSPOT_THRESHOLD with 5 as the fallback default."
---
