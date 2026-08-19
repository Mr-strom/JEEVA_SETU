# JeevaSetu Karnataka — Pilot Readiness & Evaluation Guide (v2 with GapSense)

> **Pilot Scope Notice**: This deployment operates strictly on synthetic clinical data for pilot validation and architectural evaluation within the Karnataka Reproductive & Child Health (RCH) ecosystem.

---

## 1. Pilot Concept & Geographic Footprint

JeevaSetu Karnataka establishes a clinician-supervised maternal referral safety layer that transforms emergency obstetric referrals from unmonitored transmissions into closed-loop care journeys. Built to mirror Karnataka's three-tier healthcare administrative hierarchy, the pilot spans three representative districts: **Bangalore Urban** (Apex Tertiary: Vani Vilas Hospital / BMCRI), **Mysuru** (Tertiary Referral: Cheluvamba Hospital / MMCRI, Secondary: Hunsur Taluk Hospital, Primary: Bilikere PHC), and **Kalaburagi** (Kalyana-Karnataka Tertiary: GIMS, Secondary: Aland CHC). The system enforces strict role-based scoping across 7 synthetic actor profiles: Frontline Workers (ASHA/ANM), Primary Medical Officers (Sending Facility), Referral Desk Officers (Receiving Facility), Senior Obstetricians (Clinician), District RCH Supervisors (District Oversight), State Health Officers, and System Administrators.

---

## 2. Pilot Readiness Checklist

| Category | Item | Verification Command / Target | Readiness State |
| :--- | :--- | :--- | :--- |
| **Infrastructure** | PostgreSQL 16 & Redis 7 | `docker compose up -d postgres redis` | **READY** (Healthy on 5432 / 6379) |
| **Schema & Migrations** | Initial Migration Applied | `npm run db:migrate:deploy` | **READY** (`20260818000000_init` applied) |
| **Synthetic Dataset** | 3 Districts & 7 User Roles | `npm run prisma:seed` | **READY** (3 districts, 8 facilities, 7 roles) |
| **Background Worker** | GapSense Escalation Worker | `npm run start:worker` | **READY** (Idempotent 60s background scanner) |
| **Liveness & Readiness** | Container Probes | `GET /health` & `GET /ready` | **READY** (HTTP 200 with DB & Redis checks) |
| **Client PWA** | Offline Service Worker | `dist/sw.js` & `public/manifest.json` | **READY** (Cache-first shell, network-first API) |
| **Dashboard** | Bilingual Operations Desk | `packages/dashboard` | **READY** (Bilingual EN/KN, live role simulation) |

### Seeded Demonstration Profiles
- **Frontline Worker (ASHA)**: `asha.radha@jeevasetu.internal` (`+91-9480000001`, Bilikere PHC, Mysuru)
- **Sending MO (Primary)**: `phc.bilikere@jeevasetu.internal` (`+91-9480000002`, Bilikere PHC, Mysuru)
- **Receiving Desk (Tertiary)**: `referrals.cheluvamba@jeevasetu.internal` (`+91-9480000003`, Cheluvamba Hospital)
- **Senior Obstetrician**: `dr.savitha.obgyn@jeevasetu.internal` (`+91-9480000004`, Cheluvamba Hospital)
- **District Supervisor**: `supervisor.mysuru@jeevasetu.internal` (`+91-9480000005`, Mysuru District RCH)
- **State Administrator**: `admin.karnataka@jeevasetu.internal` (`+91-9480000006`, State Directorate)

> **Demo Persona Switcher (`/demomode`) — Dev-Only Presentation Aid**:
> During live judge evaluation, presenters can navigate to `http://localhost:5173/demomode` (or tap the floating role badge at the bottom of the client screen) to switch instantly between all 5 seeded demo accounts (ASHA, Hospital Triage, Obstetrician, District Supervisor, and State Admin).
> *Note: This route is strictly a development/demonstration aid (`import.meta.env.DEV` or `?demo=1`) and is excluded from standard production frontline workflows.*

---

## 3. Demonstration Flow Scripts

### Demo Flow 1: JS-0001 — Happy-Path Closed-Loop Journey
1. **Frontline Creation**: ASHA creates a high-risk referral (Pre-eclampsia + Severe Anaemia) with transport request at Bilikere PHC (`SUBMITTED`).
2. **Immediate Triage**: Cheluvamba Hospital Referral Desk acknowledges and accepts case within 30-minute SLA (`ACCEPTED`).
3. **Transit & Arrival**: Patient departs via 108 Ambulance (`IN_TRANSIT`) and registers arrival at Cheluvamba triage desk (`ARRIVED`).
4. **Clinical Disposition**: Obstetrician records admission and delivery disposition (`CLINICAL_DISPOSITION_RECORDED`).
5. **Discharge & Post-Discharge Follow-up**: Patient discharged with automated 3-day home visit task scheduled for ASHA (`FOLLOW_UP_DUE`).
6. **Task Completion & Case Closure**: ASHA records successful home visit (`FOLLOW_UP_COMPLETED`), closing referral case with complete audit trail (`CLOSED`).

### Demo Flow 2: JS-0002 — Capacity Rejection, Re-Routing & GapSense Escalation
1. **Referral Submission**: Bilikere PHC submits emergency referral to Cheluvamba Hospital.
2. **Capacity Rejection**: Cheluvamba triage rejects due to `NO_BED` (maternal ICU full) $\rightarrow$ Case transitions to `REJECTED`.
3. **Deterministic GapSense Classification**: GapSense engine classifies failure as `Phase: CAPACITY`, `Cause: CAPACITY`, with label *"likely cause, pending supervisor review"*.
4. **Re-Routing Suggestions**: Engine calculates candidate scores: KR Hospital ranked #1 (Same district + OB/ICU match).
5. **Supervisor Reroute**: District Supervisor confirms reroute to KR Hospital $\rightarrow$ timer restarts with fresh 30-minute SLA (`REROUTED`).
6. **Escalation & Playbook Resolution**: Gap creates structured Escalation; Supervisor executes playbook steps and human-confirmed resolution summary.

---

## 4. How a Judge Should Poke This System

To rigorously validate the safety, determinism, and role boundaries, perform the following adversarial checks:

| Adversarial Probe | Action to Take | Expected Safe System Outcome |
| :--- | :--- | :--- |
| **1. Capacity Rejection Trigger** | Reject referral at receiving desk with reason `NO_BED`. | Case moves to `REJECTED`, GapEvent is created with *"likely cause, pending supervisor review"*, and route suggestions are ranked. |
| **2. Gap Timeout Trigger** | Let acknowledgement deadline expire on `ACKNOWLEDGEMENT_PENDING` case. | Worker flags overdue case, GapSense classifies `PROCESS/COMMUNICATION` gap, and spawns supervisor escalation without breaking state machine. |
| **3. Illegal State Skipping** | Attempt direct transition from `SUBMITTED` $\rightarrow$ `ARRIVED` or act on `CLOSED` case. | API returns HTTP 400 `INVALID_STATE_TRANSITION` with exact valid target states enumerated. |
| **4. Cross-District IDOR** | Log in as Mysuru District Supervisor and request Kalaburagi facility signals. | API returns HTTP 403 `FORBIDDEN_SCOPE_ACCESS` and writes an immutable security `AuditEvent`. |
| **5. Airplane-Mode Offline Sync** | Disconnect network on Client PWA, create referral draft, reconnect. | Service worker falls back cleanly, OutboxManager queues mutations in IndexedDB/localStorage, and batch sync applies idempotently upon reconnection. |
| **6. Blackspot Aggregation Guard** | Query Blackspot Summary for a facility with fewer than 5 recorded cases. | Facility is suppressed from dashboard output; pilot disclaimer is prominently displayed. |

---

## 5. System Boundary: What JeevaSetu Does NOT Do

1. **NO Autonomous Clinical Decisions**: JeevaSetu does NOT diagnose medical conditions, recommend drug dosages, or alter patient clinical pathways.
2. **NO Machine Learning Black Boxes**: Gap classification and facility re-routing ranking use 100% deterministic, rule-based logic.
3. **NO Auto-Execution of Escalations**: System notifications and playbook steps provide recommendations; human supervisors must explicitly confirm and resolve every escalation.
4. **NO Real Patient Identifiers**: The system uses synthetic health identifiers and anonymized case references; zero unhashed patient identifiers are stored in audit logs.
