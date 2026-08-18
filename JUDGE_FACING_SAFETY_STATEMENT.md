# JeevaSetu Karnataka — Clinical Safety & Architectural Statement

> *"JeevaSetu turns a referral record into a completed care journey — classifies every failure by phase and cause, re-routes stranded patients automatically, and exposes referral blackspots to district planners, without replacing clinicians."*

---

## 1. The Four Core Safety Guarantees

### Guarantee 1: Strict Human-in-the-Loop Supervision
No clinical action, patient redirect, or escalation closure is ever automated. JeevaSetu acts as an intelligent safety net that detects delays and capacity blocks; every triage acceptance, bed rejection, reroute confirmation, and playbook resolution requires verified human authentication and explicit clinical input.

### Guarantee 2: Deterministic Rule Engines, Zero Black-Box ML
All GapSense classifications and facility ranking algorithms are 100% pure, transparent deterministic functions. Every classification carries the mandatory regulatory label *"likely cause, pending supervisor review"*, ensuring automated signals are never mistaken for definitive clinical diagnoses.

### Guarantee 3: Statistical Privacy & Blackspot Suppression
To protect facility reputation from noise and prevent individual case re-identification in low-volume rural centres, the Referral Blackspot intelligence module suppresses any facility with fewer than 5 recorded cases (`MIN_CASE_COUNT_BLACKSPOT_THRESHOLD`). All aggregated outputs display an immutable pilot synthetic disclaimer.

### Guarantee 4: Append-Only Immutable Audit Trail
Every transition across the 16-state referral lifecycle, supervisor gap override, playbook execution step, and access denial writes an immutable `AuditEvent` with actor attribution, timestamp, IP address, and request ID. System state can be reconstructed and audited at any point in time.

---

## 2. Regulatory & Healthcare Integration Alignment

- **Karnataka Health System Integration**: Aligned with the operational scope of Karnataka's Ayushman Bharat – Arogya Karnataka (ArK) and Online Registration System (ORS) inter-facility referral protocols.
- **Kalyana-Karnataka & Rural Healthcare Scope**: Tailored for frontline health workers (ASHA/ANM) operating under intermittent rural 2G/3G connectivity via offline-first PWA sync.
- **Synthetic Data Compliance**: All clinical records, patient references, and facility signals in this pilot are synthetic artifacts created strictly for architectural evaluation.

---

## 3. Real-Time Operational Metrics for Judges

During the live demonstration, judges can observe four core operational safety signals computed in real time:

1. **Referral Closure Rate (%)**: Proportion of initiated high-risk emergency referrals that achieve verified clinical disposition and post-discharge home follow-up.
2. **Mean Gap Time per Phase (Minutes)**: Breakdown of latency across Acknowledgement (SLA: 30m), Transport (SLA: 60m), and Clinical Disposition (SLA: 4h).
3. **Escalation Resolution SLA (Hours)**: Time taken by District RCH Supervisors to acknowledge and execute standardized clinical playbooks upon gap detection.
4. **Referral Blackspot Strain Index**: Rolling capacity rejection and diversion signals aggregated at facility and district levels to guide resource allocation.
