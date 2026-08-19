# JeevaSetu Karnataka — Judge & Technical Q&A

---

### Q1: Is this AI making medical decisions?
**No, absolutely not.** JeevaSetu contains zero clinical machine learning models and makes no diagnostic, treatment, or triage decisions (`JUDGE_FACING_SAFETY_STATEMENT.md`). Its GapSense engine is a 100% transparent, deterministic state machine that tracks whether care handoff steps occurred within statutory SLAs. Every gap notification carries the mandatory label *"likely cause, pending supervisor review"*, and all clinical actions require human doctor confirmation (`POST /api/v1/referrals/:id/disposition`).

---

### Q2: What if there is no internet in rural Karnataka?
**The frontline client is built as an offline-first Progressive Web App (PWA).** When an ASHA worker creates a high-risk referral in a village with zero cellular reception, the mutation is saved in local IndexedDB storage (`packages/client/src/sync/outbox.ts`) and assigned an offline cryptographic UUID. Once the tablet re-establishes network connectivity, all queued handoffs drain automatically and idempotently via `POST /api/v1/sync/batch`, preventing duplicate submissions.

---

### Q3: How is patient data protected?
**JeevaSetu enforces strict de-identification, role-based access control, and immutable security audits.** Patient names are never exposed across public APIs; records use synthetic RCH/ORS external tokens, and audit logs hash sensitive identifiers. District supervisors can only view cases within their geographic jurisdiction, with cross-district IDOR probes blocked with HTTP 403 `FORBIDDEN_SCOPE_ACCESS` (`packages/api/src/auth/rbac.middleware.ts`). Furthermore, facilities with fewer than 5 recorded cases are suppressed from public blackspot views to prevent small-cell re-identification.

---

### Q4: Why not just use the existing Online Registration System (ORS)?
**Existing systems like ORS and paper slips are "fire-and-forget" registration portals without accountability SLAs.** They record that a referral was generated, but provide zero tracking of whether the patient survived transit, whether the destination ICU had an available bed, or whether the mother received follow-up after discharge. JeevaSetu wraps existing systems in a 16-state finite state machine that enforces a 30-minute triage acknowledgement SLA and tracks the loop all the way through post-discharge home visits (`POST /api/v1/referrals/:id/follow-ups`).

---

### Q5: How does a receiving hospital know to accept or reject?
**Receiving facility triage desks monitor a live Inbound Referral Queue (`packages/dashboard/src/pages/QueuePage.tsx`) backed by `GET /api/v1/referrals`.** When an emergency referral arrives with transport dispatched, triage officers have a 30-minute countdown timer to verify maternal ICU/HDU bed availability and click "Accept Referral" (`POST /api/v1/referrals/:id/accept`). If the hospital is at peak capacity, the officer must select a mandatory capacity reason code (e.g. `NO_BED`), which immediately triggers the supervisor re-routing engine (`GET /api/v1/routing/suggestions`) to prevent ambulance stranding.

---

### Q6: What does "Referral Blackspot" mean, isn't that shaming public hospitals?
**"Blackspot" is a systemic bottleneck diagnostic tool for district health officers, not a measure of clinical competence.** It aggregates infrastructure and resource strains—such as recurring blood bank shortages or unacknowledged handoffs—to help the Directorate of Health allocate emergency ambulances, ventilators, and specialist postings (`GET /api/v1/blackspot/summary`). To protect facility reputation from statistical noise, any facility with fewer than 5 cases is automatically suppressed from aggregated outputs (`MIN_CASE_COUNT_BLACKSPOT_THRESHOLD = 5`).

---

### Q7: How would this integrate with National Health Mission (NHM) and Ayushman Bharat systems?
**JeevaSetu is designed as an interoperability overlay using standard REST APIs and FHIR-aligned data models.** It ingests facility identifiers from the National Health Facility Registry (HFR) and maps patient IDs to existing RCH/Ayushman Bharat Health Account (ABHA) numbers. Because all state transitions are exposed via standard OpenAPI v3 endpoints (`packages/api/openapi.yaml`), existing e-Hospital or 108 GVK-EMRI dispatch portals can send and receive webhooks without replacing existing hospital information systems.
