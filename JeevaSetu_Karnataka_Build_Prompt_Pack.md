# JeevaSetu Karnataka — Build Prompt Pack
### Phase 1–13, written for a solo build across multiple AI models

This file is your build engine. It does not replace your existing **Cross-Chat Memory and Phase Check-In** document — that document's check-in protocol still applies at the start of every new chat. This file is the thing you paste *after* that check-in: the actual prompt that gets a model to produce the deliverable for the phase you're in.

---

## 0. How to use this file

1. Open a new chat/session in whichever model you're using for that piece of work.
2. Copy the **Master Context Block** (Section 2) and paste it first, every single time, in every model, no exceptions — these models don't share memory with each other or across sessions, so this block is what makes each conversation self-sufficient.
3. Copy the phase prompt you need and paste it directly underneath the Master Context Block in the same message.
4. At the end of the session, ask the model to output the **STATE.md update** (Section 18) and save that file at your repo root, committed. Paste its contents at the top of your *next* prompt, in front of the Master Context Block, regardless of which model or IDE you switch to.
5. Work phase by phase. Don't let a model jump ahead into a later phase's territory (e.g., don't let a backend prompt start inventing frontend components) — it causes drift and inconsistency across your files, which is the exact failure mode of multi-model solo builds.

---

## 1. Model routing — which tool for which job

| Task type | Use | Why |
|---|---|---|
| Big multi-file scaffolding, schema design, the state machine, repo bootstrap | **Gemini (Antigravity)** — spend your best available Gemini tier here | Largest context and native multi-file agentic editing in that IDE; this is the one place mistakes are expensive because everything else depends on it |
| One endpoint, one component, one test file, one bug fix | **Nemotron Ultra / Blackbox / Kilo Code (VS Code)** | Free-tier models are noticeably more reliable on a narrow, bounded task than on a sprawling repo-wide ask — give them one file's worth of work, not a module |
| Debugging a specific error or stack trace | Whichever model already has that file open | No need to re-explain the whole system for a local fix |
| Anything touching `state-machine/` or `gaps/` (GapSense rules) | Your strongest model, full Master Context Block, no shortcuts | These two modules are load-bearing for the entire product — an inconsistency here breaks every phase downstream |

---

## 2. Two things worth fixing before you write any code

**1. Don't rely on chat memory as your source of truth — use a file in the repo.** Tokens run out, chats get abandoned, and you're already spreading work across four different models with zero memory-sharing between them. The STATE.md handoff in Section 18 turns "what have I built so far" into a fact you can read off disk instead of a fact you have to reconstruct from memory or re-explain every time. Commit it after every session, even a short one.

**2. Build the schema and state machine (Phase 4) completely before touching any UI.** Every other phase — backend, frontend, sync, GapSense, routing — is a consumer of that one artifact. If it's wrong or incomplete, you'll be patching it retroactively from six different files across four different models, which is a much worse job than getting it right once, up front, in your strongest model.

---

## 2A. What this file deliberately leaves out

No API keys, no third-party service credentials, no auth-provider setup instructions, no hosting account creation. Every prompt below that touches configuration uses environment-variable *placeholders* and a `.env.example` file only. You wire up real credentials yourself, later, only when you're actually ready to deploy — that's a five-minute task once the code exists and not something worth spending prompts on now.

---

## 3. MASTER CONTEXT BLOCK — paste this before every phase prompt below

```
PRODUCT: JeevaSetu Karnataka (v2, with GapSense)

IDENTITY: A clinician-supervised, closed-loop maternal referral safety layer for
high-risk pregnancies in Karnataka. Tracks a referral from creation through
facility acknowledgement, acceptance, transport, arrival, clinical disposition,
discharge, follow-up, and closure. It is a coordination and accountability
system. It is NOT a diagnostic tool, NOT a treatment recommender, NOT an
autonomous triage system, and NOT a replacement for Karnataka's Online Referral
System (ORS) — it is a care-closure layer that sits around existing workflows.

GAPSENSE UPGRADE: When a handoff fails, the system classifies WHICH PHASE broke
(ACKNOWLEDGEMENT, TRANSPORT, CAPACITY, DISPOSITION, FOLLOW_UP) and the LIKELY
CAUSE (CAPACITY, PROCESS, COMMUNICATION, UNDETERMINED) using deterministic rules
— no ML. It escalates to a human supervisor with an approved action playbook,
auto-suggests alternate facilities on capacity-based rejections (always
human-confirmed before any re-route), and aggregates capacity signals into a
read-only Referral Blackspot dashboard for district supervisors.

HARD SAFETY RULES — never violate these in any code, copy, or UI you generate:
- No diagnosis, prescription, or treatment recommendation anywhere in the product.
- Every GapSense classification is labelled "likely cause, pending supervisor review."
- No escalation, re-route, or playbook action ever executes automatically —
  every one of these requires explicit human confirmation.
- Classification is deterministic rule logic only, never ML/LLM-based, in the MVP.
- Rejection events and capacity signals are immutable — re-routing never edits
  or deletes them, it only appends new events.
- All demo/seed data is synthetic or de-identified — never wire up real patient data.
- Every state change, classification, override, and correction is an audited event.
- Blackspot indicators always carry a "pilot-period, synthetic-data" disclaimer
  and suppress output below a minimum per-facility case-count threshold.

CASE STATE MACHINE:
DRAFT -> SUBMITTED -> ACKNOWLEDGEMENT_PENDING -> ACCEPTED | REDIRECTED | REJECTED
REJECTED -> REDIRECT_SUGGESTED -> REROUTED -> (loops back to ACKNOWLEDGEMENT_PENDING at the new destination)
ACCEPTED -> IN_TRANSIT -> ARRIVED -> CLINICAL_DISPOSITION_RECORDED -> DISCHARGED
DISCHARGED -> FOLLOW_UP_DUE -> FOLLOW_UP_COMPLETED | FOLLOW_UP_ESCALATED -> CLOSED
The server rejects invalid transitions. An open escalation is an associated
operational object — it does not, by itself, change the case's clinical status.

CORE ENTITIES: User, Role, Facility, ReferralCase, PatientReference,
ReferralDetails, CaseEvent (append-only), CapacitySignal, GapEvent,
RoutingSuggestion, Escalation, EscalationPlaybook, FollowUpTask, Notification,
AuditEvent, Configuration.

ENUMS:
phase: ACKNOWLEDGEMENT | TRANSPORT | CAPACITY | DISPOSITION | FOLLOW_UP
cause_class: CAPACITY | PROCESS | COMMUNICATION | UNDETERMINED
capacity reason_code: NO_BED | SERVICE_UNAVAILABLE | NO_CLINICIAN | TRANSPORT_UNAVAILABLE | OTHER

GAPSENSE CLASSIFICATION RULES (deterministic — implement exactly this table):
- Rejection with NO_BED / SERVICE_UNAVAILABLE / NO_CLINICIAN / TRANSPORT_UNAVAILABLE
  -> phase CAPACITY, cause CAPACITY
- Acknowledgement timer expired, no response event
  -> phase ACKNOWLEDGEMENT, cause PROCESS (COMMUNICATION if no notification-delivery confirmation)
- Arrival event long after dispatch timestamp
  -> phase TRANSPORT, cause PROCESS
- Disposition timer expired after arrival
  -> phase DISPOSITION, cause PROCESS
- Follow-up task overdue
  -> phase FOLLOW_UP, cause PROCESS (COMMUNICATION if contact attempts unconfirmed)
- Conflicting or insufficient evidence
  -> matching phase, cause UNDETERMINED
Rules, timer thresholds, and evidence weights live in the Configuration entity.
A supervisor override stores override_user_id and override_reason on the
GapEvent and writes an AuditEvent; it never modifies the underlying events.

STACK: React + TypeScript + Vite (operations dashboard); responsive PWA (or
Android wrapper) with IndexedDB/SQLite offline outbox (frontline client);
TypeScript Node.js API using Fastify or NestJS; PostgreSQL; a Redis-backed or
database-backed scheduled worker; OpenAPI 3.1 contract; Zod or JSON Schema for
runtime validation; Vitest/Jest + Playwright + API integration tests;
structured JSON logging. Architecture is a modular monolith plus a worker
process — not microservices.

MODULE FOLDERS (src/): auth, users, facilities, referrals, case-events,
state-machine, transport, capacities, gaps, playbooks, routing, dispositions,
follow-ups, escalations, notifications, blackspot, sync, audit, reporting,
configuration, shared. Controllers never write to the database directly — all
writes go through the state-machine service or module command handlers.
`gaps/` and `routing/` are pure functions over audited events and the facility
directory — no side effects, fully unit-testable.

API CONVENTIONS: Prefix /api/v1. Every mutating endpoint requires an
Idempotency-Key header, and replays of the same key return the original result
rather than creating a new event. Dates are ISO 8601 UTC. Every response
includes a request ID. Errors return a stable machine-readable code, a
human-readable message, and field-level validation errors.

ROLES AND SCOPE: frontline worker (own/assigned cases, minimum fields),
sending facility (own sent cases, confirms re-routes), receiving facility
(cases routed to them), clinician (assigned facility + disposition fields),
district supervisor (cases/escalations/gap-overrides/Blackspot within their
district), administrator (config + user management), clinical administrator
(reason codes, classification rules, playbooks). The server enforces scope on
every query and mutation — UI hiding alone is never sufficient.

GENERAL CONVENTIONS: No real API keys, credentials, or third-party service
setup in anything you generate — environment-variable placeholders and a
.env.example only. Do not invent clinical thresholds — anything clinically
consequential gets a `// requires clinical approval` marker instead of a
guessed number. Kannada and English strings are required on every user-facing
MVP screen (implement the string/translation layer even before every string is
translated). Write everything at the level a senior engineer would ship to a
real pilot — typed, validated, tested, documented — not hackathon-throwaway
code, even though the current goal is a hackathon-ready prototype.

SESSION HANDOFF: At the end of your response, output an updated STATE.md block
in the format given below so the next session (possibly a different model) can
resume with zero missing context.

STATE.md FORMAT:
---
product: JeevaSetu Karnataka (v2 with GapSense)
current_phase: "<phase number and name>"
completed:
  - "<completed item>"
in_progress:
  - "<current item>"
blocker: "<exact blocker or none>"
next_action: "<smallest next action>"
files_changed:
  - "<path>"
important_decisions:
  - "<decision>"
known_errors:
  - "<error or none>"
tests_run:
  - "<test and result>"
scope_changes:
  - "<change or none>"
---
```

---

## 4. Phase 1 — Discovery *(verification pass — the real discovery is already done)*

**Model:** any — this is a cheap ingestion/gap-check task.
**Purpose:** confirm a fresh model has correctly absorbed the product before you trust it with anything else.

```
Read the Master Context Block above carefully. Do not generate any code yet.

Confirm your understanding by answering, in your own words and in under 300
words total:
1. What specific failure point does this product solve, and what does it
   deliberately NOT do?
2. State the full case state machine from memory, including the re-routing loop.
3. State all five GapSense phase values and all four cause_class values, and
   give one example evidence pattern for each phase.
4. Name one thing this product must never do under any circumstance.

If anything in the Master Context Block is internally inconsistent or
ambiguous, say so explicitly instead of silently resolving it yourself.
```

**Before moving on, verify:** the model's four answers match Section 3 exactly, with no invented clinical logic and no drift on the state machine or enums.

---

## 5. Phase 2 — Product design *(convert the frozen requirements into a build backlog)*

**Model:** Gemini/Antigravity preferred (needs to reason over the whole requirement set at once).
**Prerequisite:** Phase 1 passed.

```
Using the Master Context Block, produce a numbered engineering backlog that
converts these functional requirements into buildable, ordered tasks:

FR-01 Authentication and role access
FR-02 Referral creation (draft save, validation, offline submission, unique case ID)
FR-03 Receiving-facility response (accept/redirect/reject with capacity reason code)
FR-04 Transport and arrival tracking (delay reasons, controlled values)
FR-05 GapSense gap detection and classification
FR-06 Escalation engine and action playbooks
FR-07 Re-routing on capacity rejection (ranked alternates, human confirmation)
FR-08 Clinical disposition (approved categories only)
FR-09 Follow-up task (due date, owner, completion/escalation)
FR-10 Referral Blackspot intelligence dashboard
FR-11 Dashboard and reports
FR-12 Audit trail
FR-13 Language and accessibility (Kannada/English)

For each FR, output: a short task list (3-6 tasks), the module(s) from the
MODULE FOLDERS list it touches, its dependencies on other FRs, and one
concrete acceptance test per task (not vague — something a test file could
literally assert). Order the full backlog so nothing depends on a task that
comes later in the list. Group the ordered backlog under the 13 build phases
by name (Discovery, Product design, UX/UI, Architecture, Backend,
Frontend/mobile, Offline sync, Escalation and GapSense, Routing and Blackspot,
Testing, Deployment, Pilot preparation, Pitch/demo).
```

**Before moving on, verify:** every FR-01–FR-13 appears exactly once, the ordering has no forward dependency, and every task has a concrete (not vague) acceptance test.

---

## 6. Phase 3 — UX/UI

**Model:** Gemini/Antigravity for the full inventory; Nemotron/Blackbox fine for one screen at a time afterward.

```
Using the Master Context Block, produce a text-based screen inventory (no
visual mockup needed yet — markdown wireframe descriptions are fine) covering:

1. Frontline client (ASHA/ANM): referral creation form, draft/queue view,
   sync-status indicator (four states: saved locally / waiting to sync /
   synchronised / sync failed), follow-up task view. One primary action per
   screen, large touch targets, short Kannada/English labels.
2. Operations dashboard (sending facility, receiving facility, clinician,
   supervisor, administrator): role-specific queue, case detail with full
   timeline, the facility accept/redirect/reject screen with capacity reason
   code selection, the escalation screen (must always show phase, likely
   cause, and the approved action checklist labelled "suggested — confirm
   before acting"), the re-routing confirmation screen, the Blackspot
   dashboard view, and the audit timeline view.

For each screen give: purpose, the role(s) that can see it, the key fields or
components on it, the states it must visibly distinguish (e.g. offline vs
synced; escalated vs resolved), and one accessibility note (contrast, no
colour-only status, mobile viewport, Kannada string length). Do not design
any screen that could be read as diagnostic or as recommending treatment.
```

**Before moving on, verify:** every screen lists which role(s) can see it, the escalation screen explicitly shows phase + cause + playbook + a confirm-before-acting label, and no screen implies a clinical judgment.

---

## 7. Phase 4 — Architecture *(repo scaffold + schema — do this fully before any UI)*

**Model:** Gemini/Antigravity — this is the highest-stakes phase, spend your best model here.
  
```
Using the Master Context Block, scaffold the repository:

1. A monorepo layout with three packages: `api` (Node.js/TypeScript,
   Fastify or NestJS), `dashboard` (React/TypeScript/Vite), `client`
   (frontline PWA, React/TypeScript/Vite, with an IndexedDB-backed local
   database and outbox table). Include root and per-package package.json,
   tsconfig, linting/formatting config, and a top-level README describing
   the layout.
2. Inside `api/src/`, create the module folder structure exactly as listed
   under MODULE FOLDERS in the Master Context Block — empty modules with an
   index file and a one-line purpose comment each are fine for now.
3. A PostgreSQL schema (via Prisma or TypeORM, your choice, but be
   consistent) implementing every entity listed under CORE ENTITIES with
   the fields implied by the Master Context Block, plus: `referral_cases`
   as the materialised read model, `case_events` as the append-only history,
   and unique constraints that prevent duplicate escalations per
   (case_id, stage) and duplicate mutations per idempotency key.
4. A state-machine module (`state-machine/`) that encodes the full case
   state machine as data (not scattered if-statements), exposes a single
   `applyTransition(currentState, event, actorRole)` function, and rejects
   any transition not explicitly defined. Write unit tests for every valid
   transition and at least five invalid ones.
5. An OpenAPI 3.1 skeleton listing every endpoint path and method from this
   list (bodies/schemas can be stubbed for now, paths and methods must be
   exact):
   GET /api/v1/me · GET /api/v1/facilities · GET /api/v1/users ·
   PATCH /api/v1/users/{id} · POST /api/v1/referrals ·
   GET /api/v1/referrals · GET /api/v1/referrals/{id} ·
   PATCH /api/v1/referrals/{id} · POST /api/v1/referrals/{id}/events ·
   GET /api/v1/referrals/{id}/timeline · POST /api/v1/referrals/{id}/accept ·
   POST /api/v1/referrals/{id}/redirect · POST /api/v1/referrals/{id}/reject ·
   POST /api/v1/referrals/{id}/arrival ·
   POST /api/v1/referrals/{id}/disposition ·
   POST /api/v1/referrals/{id}/discharge · POST /api/v1/referrals/{id}/close ·
   GET /api/v1/referrals/{id}/gap ·
   POST /api/v1/referrals/{id}/gap/override ·
   GET /api/v1/referrals/{id}/route-suggestions ·
   POST /api/v1/referrals/{id}/confirm-reroute · GET /api/v1/escalations ·
   GET /api/v1/escalations/{id} ·
   POST /api/v1/escalations/{id}/acknowledge ·
   POST /api/v1/escalations/{id}/playbook-step ·
   POST /api/v1/escalations/{id}/resolve · GET /api/v1/playbooks ·
   PUT /api/v1/playbooks/{id} · GET /api/v1/follow-ups ·
   POST /api/v1/follow-ups/{id}/complete ·
   POST /api/v1/follow-ups/{id}/escalate · GET /api/v1/blackspot/summary ·
   GET /api/v1/blackspot/facilities/{id}/signals · POST /api/v1/sync/batch ·
   GET /api/v1/sync/changes · POST /api/v1/sync/ack
6. A `.env.example` with placeholder variable names only (DATABASE_URL,
   AUTH_PROVIDER_ISSUER, etc.) — no real values, no instructions to obtain
   real values yet.

Do not implement business logic yet beyond the state machine and schema.
This phase's job is a correct, complete skeleton everything else builds on.
```

**Before moving on, verify:** every entity in CORE ENTITIES has a table, every endpoint in the list exists in the OpenAPI file with the right method, the state machine rejects invalid transitions in its own tests, and `.env.example` contains zero real values.

---

## 8. Phase 5 — Backend

### 5A. Auth, roles, facilities, seed data

**Model:** Gemini/Antigravity (still foundational, still multi-file).

```
Implement FR-01 (authentication and role access) against the schema from
Phase 4. Build: role-based access control middleware enforcing the ROLES AND
SCOPE table server-side (not just UI hiding); GET /api/v1/me; GET
/api/v1/facilities; GET /api/v1/users and PATCH /api/v1/users/{id}
(admin-only); a synthetic seed script creating: at least 6 facilities across
2-3 Karnataka districts with varied `services_offered`, one user per role,
and no real patient data anywhere. Log every login and permission failure as
a security-relevant event (see AuditEvent). Write API tests proving: a worker
cannot reach the supervisor dashboard endpoints, a receiving facility cannot
edit sender-only fields after submission, and an admin can deactivate a user.
```

### 5B. Referral creation, queue, case detail, timeline

**Model:** Nemotron/Blackbox/Kilo — scoped to the `referrals/` and
`case-events/` modules only.

```
Implement FR-02 against the `referrals/` and `case-events/` modules only —
do not touch auth, facilities, or any other module. Build: POST
/api/v1/referrals (draft save, field validation via Zod/JSON Schema, unique
case ID generation, idempotency-key handling so a retried submission never
creates two cases); GET /api/v1/referrals (role-scoped, filterable by
facility/status/urgency/phase/cause/date); GET /api/v1/referrals/{id}; PATCH
/api/v1/referrals/{id} for permitted operational fields only; POST
/api/v1/referrals/{id}/events; GET /api/v1/referrals/{id}/timeline returning
events in chronological order. Every mutation writes an append-only
CaseEvent. Write API tests for: duplicate submission with the same
Idempotency-Key returns the original case, not a new one; an invalid draft
is rejected with field-level errors; the case appears in the sender's queue
immediately after creation.
```

### 5C. Facility response, transport, arrival

**Model:** Nemotron/Blackbox/Kilo.

```
Implement FR-03 and FR-04 against the `referrals/`, `transport/`, and
`capacities/` modules. Build: POST /api/v1/referrals/{id}/accept (identifies
receiving unit/role where available); POST /api/v1/referrals/{id}/redirect
and POST /api/v1/referrals/{id}/reject — both require a capacity reason_code
from {NO_BED, SERVICE_UNAVAILABLE, NO_CLINICIAN, TRANSPORT_UNAVAILABLE,
OTHER} plus a note, and the server must reject the request if the reason
code is missing; a capacity-code rejection writes exactly one CapacitySignal
and moves the case to REJECTED (do not implement the REDIRECT_SUGGESTED
transition here — that belongs to Phase 9); POST
/api/v1/referrals/{id}/arrival recording delay reason from controlled values
plus optional note, rejecting arrival on a case that was never submitted.
Write API tests for: rejecting without a reason code fails; a capacity
rejection creates exactly one CapacitySignal; a supervisor can filter cases
delayed beyond a configured window.
```

### 5D. Disposition, follow-up, dashboard summary, audit

**Model:** Nemotron/Blackbox/Kilo.

```
Implement FR-08, FR-09, FR-11, and FR-12 against the `dispositions/`,
`follow-ups/`, `reporting/`, and `audit/` modules. Build: POST
/api/v1/referrals/{id}/disposition (clinician-only, approved categories
only — no free clinical text beyond a minimal notes field); POST
/api/v1/referrals/{id}/discharge (creates a FollowUpTask with due date,
owner, contact method); GET /api/v1/follow-ups; POST
/api/v1/follow-ups/{id}/complete; POST /api/v1/follow-ups/{id}/escalate;
POST /api/v1/referrals/{id}/close (rejects if mandatory follow-up is
unresolved); role-specific dashboard summary cards for open/overdue/
escalated/re-routed/closed counts; an audit module ensuring every important
event is queryable by case and is never editable or deletable from any API
surface. Write API tests for: only a clinician role can record disposition;
a case cannot close with an unresolved mandatory follow-up; audit events are
read-only via the API.
```

**Before moving on, verify:** every FR-01–FR-04, FR-08, FR-09, FR-11, FR-12 acceptance criterion from your Phase 2 backlog has a passing test, and no module outside its stated scope was touched by any of the four sub-prompts.

---

## 9. Phase 6 — Frontend/mobile

### 6A. Operations dashboard

**Model:** Gemini/Antigravity for the shell and routing; Nemotron/Blackbox fine for individual screens after.

```
Build the `dashboard` package's shell against the API from Phase 5 and the
screen inventory from Phase 3: role-based routing (a user only sees routes
permitted by their role), the case queue with filters, the case detail view
with full timeline, the facility accept/redirect/reject screen with capacity
reason code selection, the disposition and follow-up screens, and a language
switcher covering every string on these screens in Kannada and English. Do
not build the escalation, re-routing, or Blackspot screens yet — those come
in Phases 8 and 9. Use accessible components: high contrast, no
colour-only status, large touch targets, readable typography.
```

### 6B. Frontline PWA client

**Model:** Nemotron/Blackbox/Kilo, one screen per prompt if the model struggles with the whole client at once.

```
Build the `client` package: the referral creation form (draft save,
validation, offline submission), the worker's case/task queue, the
follow-up task view, and a persistent sync-status indicator distinguishing
saved locally / waiting to sync / synchronised / sync failed. Do not
implement the actual sync network logic yet — stub it with a local-only
save for now, that's Phase 7. One primary action per screen. Kannada and
English strings on every screen.
```

**Before moving on, verify:** a user in each role sees only their permitted routes, language switching changes every visible string on both packages, and no screen from Phase 8/9's territory (escalation, re-routing, Blackspot) was built early.

---

## 10. Phase 7 — Offline sync

**Model:** Gemini/Antigravity preferred — this touches both the client outbox and the server sync endpoints together and benefits from seeing both sides at once.

```
Implement the offline-sync layer end to end: on the client, a local outbox
table (mutation ID, case ID, operation type, payload, local timestamp,
retry count, sync status) with exponential-backoff retry and a maximum
retry policy, wired into the referral form and follow-up screens from
Phase 6B. On the server, implement POST /api/v1/sync/batch (ordered
mutation submission), GET /api/v1/sync/changes?cursor=... (cursor-based
pull), and POST /api/v1/sync/ack. The sync response must separately
identify applied, already_applied, conflict, and rejected mutations — a
conflict must never be silently overwritten, and the client must surface it
to the user with the latest server state and the next available action.
Write sync tests for: offline create then sync, retry with the same
Idempotency-Key, duplicate request handling, a conflicting concurrent
status transition, and recovery after an app restart with pending
outbox items.
```

**Before moving on, verify:** killing the client mid-sync and restarting it does not lose or duplicate a mutation, and a manufactured conflict is shown to the user rather than silently resolved.

---

## 11. Phase 8 — Escalation and GapSense

### 8A. GapSense rule engine + escalation worker

**Model:** Gemini/Antigravity — this is the second highest-stakes phase after Phase 4; the classification table must be implemented exactly.

```
Implement the `gaps/` module as pure, deterministic functions implementing
the GAPSENSE CLASSIFICATION RULES table from the Master Context Block
exactly — no ML, no LLM calls, fully unit-testable with fixed inputs and
expected outputs. Every classification produces a GapEvent with phase,
cause_class, and evidence, always effectively labelled "likely cause,
pending supervisor review." Implement POST
/api/v1/referrals/{id}/gap/override storing override_user_id and
override_reason on the GapEvent and writing an AuditEvent, without
modifying the underlying CaseEvents. Then implement the scheduled worker
(`escalations/` + worker process) that periodically scans for cases past
their configured deadline with the required event still absent, creates
exactly one Escalation per (case, stage) using a unique constraint to
prevent duplicates even if the worker runs twice, invokes the GapSense rule
engine, and logs scanned/created/notified/failed counts per run. Write unit
tests covering every row of the classification table plus the
UNDETERMINED fallback, and worker tests proving a double run never creates
a duplicate escalation.
```

### 8B. Escalation playbooks + supervisor screens

**Model:** Nemotron/Blackbox/Kilo.

```
Implement the `playbooks/` module: EscalationPlaybook CRUD scoped to the
clinical-administrator role (GET/PUT /api/v1/playbooks), each playbook
holding an approved checklist keyed by (phase, cause_class). Implement GET
/api/v1/escalations, GET /api/v1/escalations/{id} (returning phase, cause,
and the matched playbook), POST /api/v1/escalations/{id}/acknowledge, POST
/api/v1/escalations/{id}/playbook-step, and POST
/api/v1/escalations/{id}/resolve — every one of these audited, none of them
auto-executing anything. Build the supervisor escalation screen from the
Phase 3 inventory: phase, likely cause, case context, and the playbook
checklist, explicitly labelled "suggested — confirm before acting," with a
clear override control that requires a typed reason. Write API tests
proving an escalation can be acknowledged, a playbook step recorded, and a
resolution stored, all attributed to the acting user.
```

**Before moving on, verify:** every row in the classification table has a passing unit test, running the worker twice on the same overdue case never produces two escalations, and no code path executes a playbook step or override without an explicit prior human action recorded.

---

## 12. Phase 9 — Routing and Blackspot

### 9A. Re-routing on capacity rejection

**Model:** Gemini/Antigravity — spans `routing/`, `referrals/`, and the state machine together.

```
Implement FR-07: when a rejection carries a capacity reason_code, transition
the case REJECTED -> REDIRECT_SUGGESTED (extend the Phase 4 state machine
if you haven't already) and compute a ranked list of RoutingSuggestion
records from the facility network, filtered by required service capability,
excluding the rejecting facility, ranked by configurable weights (district
match, distance preference, recent acknowledgement performance — mark exact
default weights as `// requires clinical/ops approval` rather than
inventing final numbers). Implement GET
/api/v1/referrals/{id}/route-suggestions and POST
/api/v1/referrals/{id}/confirm-reroute, which requires the sender or
supervisor role, moves the case to REROUTED, restarts the acknowledgement
timer at the new destination, and never edits or deletes the original
rejection event or its CapacitySignal. If no alternate is configured, show
"no alternate currently configured" and escalate immediately rather than
leaving the case silent. Build the re-routing confirmation screen from
Phase 3, including an override control requiring a typed reason. Write
routing tests for: suggestions always exclude the rejecting facility, at
least one alternate is returned whenever the network has one, confirmation
restarts the acknowledgement lifecycle, and the rejection event is
byte-for-byte unchanged after re-routing.
```

### 9B. Blackspot aggregation and dashboard

**Model:** Nemotron/Blackbox/Kilo — this is a read-only query layer, well-scoped for a smaller model.

```
Implement FR-10 as a read-only aggregation (SQL view or query, not a
mutation path) over CapacitySignal, CaseEvent, and Escalation, grouped by
facility and district, computing: rejection rate with capacity codes,
capacity-signal count, median acknowledgement time, and re-routing
frequency, over a rolling window. Suppress output for any facility below a
configured minimum case count. Implement GET /api/v1/blackspot/summary and
GET /api/v1/blackspot/facilities/{id}/signals, and never join
patient-identifying fields into this output. Build the Blackspot dashboard
screen from Phase 3 as a heatmap or table, with a persistent, unmissable
"pilot-period, synthetic-data operational indicator — not a clinical
performance judgment" label. Write a test proving a facility under the
minimum case-count threshold does not appear in the output at all.
```

**Before moving on, verify:** a scripted capacity rejection produces a re-route suggestion excluding itself, confirming it restarts the acknowledgement clock, and the Blackspot view never shows a facility below the configured minimum sample size.

---

## 13. Phase 10 — Testing

**Model:** whichever model has the most context on the module under test; run this phase module-by-module rather than in one giant prompt.

```
Using the Master Context Block and the TESTING scope below, write or extend
tests for [NAME THE MODULE — do one module per prompt: state-machine, gaps,
routing, sync, escalations worker, or an end-to-end demo flow].

TESTING SCOPE:
- Unit: state machine, validation, permission checks, deadline calculation,
  GapSense classification rules, playbook matching.
- API: every P0 endpoint, invalid transitions, idempotency, authorisation,
  rejection-without-reason-code.
- Sync: offline create, retry, duplicate request, conflict, app restart.
- Worker: overdue detection, duplicate prevention, notification failure,
  re-classification on new evidence.
- Routing: suggestion ranking, excluding the rejecting facility, confirmation
  restarts the lifecycle, override with reason.
- End-to-end: the full JS-0001 normal-loop flow, and the full JS-0002
  capacity-rejection re-routing flow, from creation to CLOSED.
- Accessibility: keyboard navigation, contrast, status conveyed by text not
  colour alone, mobile viewport, Kannada string rendering.
- Security: IDOR (accessing another facility's case by ID), role bypass,
  expired/invalid token handling, oversized payload rejection, no patient
  data in logs.

For the module you're testing, list what's already covered (if anything),
then add the missing cases from the relevant bullet above. Do not weaken or
delete an existing passing test to make a new one pass.
```

**Before moving on, verify:** both JS-0001 and JS-0002 pass as full end-to-end runs, and a manual attempt to fetch a case belonging to another facility by ID is rejected.

---

## 14. Phase 11 — Deployment

**Model:** Gemini/Antigravity for the pipeline/config scaffold.

```
Set up deployment scaffolding only — no real accounts, no real secrets.
Create separate development, staging/demo, and production-like environment
configurations (even if they'll initially run in one project), all secrets
referenced as environment variables with placeholder names in
.env.example, never hard-coded. Add versioned database migrations (if not
already in place from Phase 4). Add a health endpoint verifying API
availability and database connectivity, and a readiness endpoint verifying
required dependencies. Write a CI pipeline definition (GitHub Actions or
equivalent) running: formatting check, type check, unit tests, API tests,
and a production build, failing the build on any red step. Write a short
ROLLBACK.md with concrete rollback steps. Do not attempt to actually
provision hosting, a managed database, or an identity provider — that's a
manual step you'll do yourself once this scaffolding exists.
```

**Before moving on, verify:** the CI pipeline definition fails correctly on a deliberately broken test, `.env.example` still contains zero real values, and the health/readiness endpoints exist and are covered by a smoke test.

---

## 15. Phase 12 — Pilot preparation

**Model:** any — this is a documentation deliverable, not code.

```
Using the Master Context Block, the MVP's PRD open questions (district and
facility selection, official escalation ownership, approved clinical status
values, urgency windows, minimum necessary patient data, consent/notice
requirements, device policy, notification channel choice, arrival
verification without facility update, data retention period, which events
need clinical/second-person sign-off, playbook governance and review
cadence, and how real bed/service capacity would eventually be verified),
and the PRD's risk table (diagnosis-tool drift, classification mistaken for
clinical judgment, duplicate-platform perception, over-collection, sync
conflicts, alert fatigue, poor frontline usability, unclear escalation
ownership, real-patient-privacy exposure, suggestion misuse in re-routing),
produce a single "Pilot Readiness Checklist" document: one checklist item
per open question and per risk, each with a status (answered / needs
Karnataka-side input / needs clinical approval) and, where you can propose
one, a concrete draft answer explicitly marked as a draft requiring
sign-off — never presented as a final decision. Also produce a one-page
"Safety and Privacy Statement for Judges" summarising the clinical boundary,
the synthetic-data posture, the audit trail, and the human-confirmation
guarantees, in plain, non-technical language.
```

**Before moving on, verify:** every open question and every risk from the PRD appears exactly once, and nothing in the draft answers reads as a final clinical or governance decision rather than a proposal awaiting approval.

---

## 16. Phase 13 — Pitch/demo

**Model:** any — this is presentation content, not code, though it should be written by a model that has full context on what actually got built.

```
Using the Master Context Block and the actual current STATE.md (paste it
below this prompt), produce:

1. A step-by-step demo script for Case JS-0001 (normal loop): create a
   referral offline, sync it, show receiving-facility notification, force a
   missed acknowledgement, show the escalation with phase "ACKNOWLEDGEMENT"
   and cause "PROCESS" plus its playbook, accept the case, mark transport
   delayed then arrived, record disposition, create a follow-up task, leave
   it overdue once to show a follow-up-phase escalation, then complete it.
2. A step-by-step demo script for Case JS-0002 (the upgrade): receiving
   facility rejects citing NO_BED, show REDIRECT_SUGGESTED and the ranked
   alternates, supervisor confirms one, show REROUTED, acceptance and
   arrival at the new facility, then open the Blackspot dashboard and show
   the capacity-signal view with its pilot-data disclaimer.
3. A synthetic seed-data script generator prompt (for whichever model will
   actually implement it) that creates enough realistic Karnataka-district
   facility and case data for both scripts to run live without an empty
   dashboard.
4. A slide outline: problem (one line), solution (one line), the closed-loop
   workflow, the GapSense upgrade, the safety boundary, and 3-4 measurable
   prototype metrics pulled only from what was actually tested in Phase 10
   — no invented numbers.

Do not claim any clinical outcome improvement anywhere in this output —
frame everything as making failures visible, measurable, classifiable, and
actionable, per the product's own positioning.
```

**Before moving on, verify:** both demo scripts run start to finish on seed data without a manual database edit mid-demo, and the slide outline's metrics all trace back to a real Phase 10 test result, not a guess.

---

## 17. Quick reference — phase order at a glance

```
1  Discovery                     -> verification pass, already substantively done
2  Product design                -> backlog conversion
3  UX/UI                         -> screen inventory
4  Architecture                  -> repo scaffold + schema + state machine  [highest stakes]
5  Backend                       -> 5A auth/facilities, 5B referrals, 5C response/transport, 5D disposition/follow-up
6  Frontend/mobile               -> 6A dashboard shell, 6B frontline PWA
7  Offline sync                  -> client outbox + server sync endpoints
8  Escalation and GapSense       -> 8A rule engine + worker  [second highest stakes], 8B playbooks + screens
9  Routing and Blackspot         -> 9A re-routing, 9B aggregation dashboard
10 Testing                       -> module by module, plus both demo flows end-to-end
11 Deployment                    -> scaffolding only, no real secrets
12 Pilot preparation             -> readiness checklist + judge-facing safety statement
13 Pitch/demo                    -> both demo scripts, seed data, slide outline
```

---

## 18. STATE.md — carry this forward every session

Ask every model to emit this block at the end of its response, and commit the file at your repo root. Paste its latest contents in front of the Master Context Block the next time you open a new chat or switch models.

```yaml
product: JeevaSetu Karnataka (v2 with GapSense)
current_phase: "<phase number and name>"
completed:
  - "<completed item>"
in_progress:
  - "<current item>"
blocker: "<exact blocker or none>"
next_action: "<smallest next action>"
files_changed:
  - "<path>"
important_decisions:
  - "<decision>"
known_errors:
  - "<error or none>"
tests_run:
  - "<test and result>"
scope_changes:
  - "<change or none>"
```
