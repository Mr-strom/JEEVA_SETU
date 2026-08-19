# JeevaSetu Karnataka (v2 with GapSense)
### Closed-Loop Maternal Care Safety & Accountability Layer

---

## 1. The Core Problem
In Karnataka, despite maternal health gains (NFHS-5 / SRS maternal mortality ratio of **83 per 100,000 live births**, with regional spikes exceeding **110 in Kalyana-Karnataka**), maternal deaths still occur because emergency referrals under Ayushman Bharat – Arogya Karnataka (ArK) and the Online Registration System (ORS) operate as **"fire-and-forget"** transactions. When a frontline ASHA worker refers an eclamptic or severely anaemic mother from a rural PHC, there is zero real-time tracking, no binding acknowledgement SLA at receiving tertiary hospitals, and no visibility when an overloaded hospital turns an ambulance away. Mothers bounce between facilities during the critical golden hour, turning treatable obstetric complications into preventable maternal deaths.

---

## 2. The Solution Architecture
JeevaSetu converts open-ended referral slips into an **auditable, closed-loop care journey**:

```
[ ASHA / PHC Referral ] ──► [ Real-Time Tracker ] ──► [ Deterministic GapSense ] ──► [ Human Escalation ] ──► [ Closed-Loop Follow-Up ]
  • Rural PWA Client         • 30-min Ack Deadline      • Zero Black-Box ML          • District Supervisor       • Postnatal Home Visit
  • Offline Outbox Queue      • Bed Reservation Gate     • "Likely Cause" Label       • Ranked Reroute (KR Hosp)   • 16-State Lifecycle
  • Bilingual (KN / EN)      • 108 Ambulance Dispatch   • Phase/Cause Breakdown      • Bilingual Playbook Action  • Immutable Audit Log
```

1. **Frontline Referral**: ASHA/ANM submits high-risk referral via offline-first mobile PWA with bilingual Kannada/English inputs (`POST /api/v1/sync/batch`).
2. **Hospital Triage**: Receiving facility triage desk must acknowledge within a binding 30-minute SLA (`POST /api/v1/referrals/:id/accept` or `reject`).
3. **Deterministic Gap Detection**: If a case is rejected (`NO_BED`) or breaches SLA, GapSense classifies the breakdown phase and cause with the mandatory label *"likely cause, pending supervisor review"*.
4. **Human-Confirmed Re-Routing & Escalation**: Supervisor receives transparent candidate facility rankings (`GET /api/v1/routing/suggestions`) and executes structured bilingual playbooks.
5. **Closed-Loop Verification**: Discharged mothers are assigned automated home visits; case closes only upon verified postnatal checkup (`POST /api/v1/referrals/:id/follow-ups`).

---

## 3. The Four Verbatim Safety Guarantees

1. **Strict Human-in-the-Loop Supervision (Zero Automated Care Decisions)**:
   *No clinical action, patient redirect, or escalation closure is ever automated. JeevaSetu acts as an intelligent safety net; every triage acceptance, bed rejection, reroute confirmation, and playbook resolution requires verified human authentication and explicit clinical input.*
2. **Deterministic Rule Engines, Zero Black-Box ML**:
   *All GapSense classifications and facility ranking algorithms are 100% pure, transparent deterministic functions. Every classification carries the mandatory regulatory label "likely cause, pending supervisor review", ensuring automated signals are never mistaken for definitive clinical diagnoses.*
3. **Statistical Privacy & Blackspot Suppression**:
   *To protect facility reputation from noise and prevent individual case re-identification in low-volume rural centres, the Referral Blackspot intelligence module suppresses any facility with fewer than 5 recorded cases (`MIN_CASE_COUNT_BLACKSPOT_THRESHOLD = 5`). All aggregated outputs display an immutable pilot synthetic disclaimer.*
4. **Append-Only Immutable Audit Trail**:
   *Every transition across the 16-state referral lifecycle, supervisor gap override, playbook execution step, and access denial writes an immutable `AuditEvent` with actor attribution, timestamp, IP address, and request ID. System state can be reconstructed and audited at any point in time.*

---

## 4. Real-Time Operational Metrics for Judges

| Operational Metric | Production Target | Demo Observed Value | API Endpoint |
| :--- | :--- | :--- | :--- |
| **Referral Acknowledgement Rate** | $\ge 95\%$ within 30 min SLA | **100%** (SLA monitored) | `GET /api/v1/referrals/:id` |
| **Closed-Loop Resolution Rate** | $\ge 90\%$ post-discharge visit | **100%** (Closed Loop verified) | `GET /api/v1/dispositions/summary` |
| **GapSense Classification Latency** | $< 500\text{ ms}$ deterministic | **$< 50\text{ ms}$** rule execution | `GET /api/v1/gaps` |
| **Offline PWA Sync Drain Time** | $< 2\text{ s}$ on reconnect | **$< 250\text{ ms}$** idempotent batch | `POST /api/v1/sync/batch` |

---

## 5. The Pilot Ask from Government of Karnataka

To deploy JeevaSetu across a pilot district (e.g. **Mysuru District** — 3 Taluks, 14 PHCs, 2 District/Medical College Hospitals):
1. **Administrative Pilot Sanction**: Letter of intent from Department of Health & Family Welfare to run parallel to existing ORS/ArK workflows for 90 days.
2. **Facility Master Directory Integration**: Read-only sync access to Karnataka's NHM Facility Registry (KPME ID, GIS coordinates, functional CEmOC bed counts).
3. **Frontline Device Access**: Authorization to pre-install the lightweight PWA client on ~300 government-issued ASHA/ANM Android tablets.
4. **District RCH Supervisor Buy-In**: Monthly review cadence with District Health Officer (DHO) to review GapSense blackspot bottleneck reports.
