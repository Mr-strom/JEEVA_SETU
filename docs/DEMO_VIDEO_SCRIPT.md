# JeevaSetu Karnataka — Demo Video Recording Script
**Target Duration:** 75–90 seconds  
**Resolution:** 1080p (1920×1080) or 4K  
**Audio:** Clear spoken English, steady pace  
**Environments:**
- **Frontline Mobile Client:** `http://localhost:5173/` (Desktop viewport centered in phone bezel)
- **District Supervisor Dashboard:** `http://localhost:5174/`
- **Backend API Server:** `http://localhost:4000/`

---

## Shot-by-Shot Production Timeline

```
[0:00 - 0:12] Frontline Referral Creation (ASHA Radha Bai)
[0:12 - 0:26] The Offline Hero Shot (Sim Offline -> Queue -> Instant Drain)
[0:26 - 0:38] Hospital Triage Capacity Rejection (Cheluvamba NO_BED)
[0:38 - 0:52] Deterministic GapSense & Supervisor Re-Route (Kavitha H)
[0:52 - 1:12] The Closing Frame: Closed-Loop Case Journey Tracker (JS-0002)
[1:12 - 1:20] Safety Guarantees & Summary
```

---

### Shot 1: Frontline Emergency Referral (0:00 – 0:12)
- **Screen / URL:** `http://localhost:5173/`
- **Persona / Badge:** ASHA Worker — *Radha Bai (Bilikere PHC)*
- **Cursor Actions:**
  1. Cursor hovers over phone-frame container.
  2. Click through the 4-step referral stepper:
     - `1. Mother Profile`: ORS ID prefilled (`ORS-KA-2026-MYS002`), Age 27, G3 P2.
     - `2. Risk & Symptoms`: Check `Severe Pre-eclampsia (BP ≥ 160/110)` and `Obstructed Labour`.
     - `3. Transport`: `108 Ambulance Requested` toggled ON, destination *Cheluvamba Hospital*.
     - `4. Review & Send`: Cursor clicks the full-width high-contrast button **"Send Referral to Hospital"**.
- **Voiceover Narration:**
  > *"When an obstetric emergency strikes a rural health sub-centre, frontline ASHA workers use JeevaSetu’s bilingual mobile PWA to initiate a high-risk referral in seconds."*

---

### Shot 2: The Offline Hero Shot (0:12 – 0:26)
- **Screen / URL:** `http://localhost:5173/`
- **Cursor Actions:**
  1. Click **`[📶 Sim Offline]`** toggle on the floating demo badge.
  2. Notice top amber banner appears: *"Offline demo mode — mutations queued locally"*.
  3. Fill a quick draft and tap Submit: notice the queue counter rises to `● 1 item queued` and top strip shows `Waiting to sync (offline)`.
  4. Click **`Go Online ↗`** in the banner: notice the sync spinner fires and the counter drains instantly to `0`, restoring `Synchronised` status.
- **Voiceover Narration:**
  > *"In deep rural areas with zero connectivity, all handoffs are encrypted and queued locally. The moment a signal is restored, the queue drains automatically and idempotently without duplicate records."*

---

### Shot 3: Hospital Triage & Capacity Rejection (0:26 – 0:38)
- **Screen / URL:** `http://localhost:5174/queue`
- **Persona / Badge:** Hospital Triage — *Cheluvamba Hospital Mysuru*
- **Cursor Actions:**
  1. Switch to the Inbound Queue: show emergency case `JS-0002` with 30-minute countdown timer ticking.
  2. Click **"Reject Referral"** modal.
  3. Select mandatory reason code **`NO_BED — All CEmOC beds occupied`** and submit.
- **Voiceover Narration:**
  > *"At the receiving tertiary hospital, triage teams face strict 30-minute acknowledgement deadlines. When all ICU beds are occupied, rejecting with a verified capacity code instantly alerts the district."*

---

### Shot 4: Deterministic GapSense & Supervisor Re-Route (0:38 – 0:52)
- **Screen / URL:** `http://localhost:5174/gaps` $\rightarrow$ `http://localhost:5174/cases/JS-0002`
- **Persona / Badge:** District Supervisor — *Kavitha H (Mysuru District)*
- **Cursor Actions:**
  1. Switch to District Supervisor view: GapSense automatically flags a `CAPACITY` gap with the label *"likely cause, pending supervisor review"*.
  2. Open Routing Suggestions: show transparent ranked alternatives (*K.R. Hospital — Score: 94%*).
  3. Click **"Confirm Re-Route to K.R. Hospital"** and trigger the standard *Capacity Surge Playbook*.
- **Voiceover Narration:**
  > *"JeevaSetu’s GapSense engine classifies the bottleneck immediately without black-box ML. The district supervisor confirms a reroute to the nearest facility with verified bed capacity, preventing ambulance stranding."*

---

### Shot 5: The Closing Frame — Case Journey Tracker (0:52 – 1:12)
- **Screen / URL:** `http://localhost:5174/cases/JS-0002`
- **Cursor Actions:**
  1. Scroll smoothly to the **Case Journey Tracker** at the top of the case detail view.
  2. Point cursor to the step progression:
     - 🟢 `SUBMITTED` (Bilikere PHC)
     - 🔴 `REJECTED` (*No Bed Available*)
     - 🟣 `GAP DETECTED` (*likely cause, pending supervisor review*)
     - 🟡 `REROUTED` (*K.R. Hospital*)
     - 🟢 `IN TRANSIT` $\rightarrow$ `ARRIVED`
  3. Hover over the compact chronological event feed beneath the tracker showing actor attribution and timestamps.
- **Voiceover Narration:**
  > *"This is the complete closed loop: every handoff, rejection reason, and reroute is preserved on an immutable timeline. No mother is forgotten, and no referral slip is lost in transit."*

---

### Shot 6: Safety Statement & Wrap-Up (1:12 – 1:20)
- **Screen / Graphic:** Final slide or dashboard overview
- **Text Overlay:**
  - *100% Deterministic Rule Engine*
  - *Strict Human-in-the-Loop Decisions*
  - *Statistical Privacy & Blackspot Suppression*
  - *OpenAPI & NHM Interoperability Ready*
- **Voiceover Narration:**
  > *"JeevaSetu Karnataka: Turning fragmented referral slips into safe, auditable care journeys across Karnataka."*

---

## Live Recording Fallback Notes

If any browser interaction encounters UI latency during a live presentation capture:
1. **Fallback for Shot 1 & 2 (Client Sync):**
   ```powershell
   curl.exe -s -X POST http://localhost:4000/api/v1/sync/batch -H "Content-Type: application/json" -d "{\"mutations\":[]}"
   ```
2. **Fallback for Shot 3 & 4 (Rejection & GapSense):**
   ```powershell
   $supToken = (Invoke-RestMethod -Uri "http://localhost:4000/api/v1/auth/token" -Method Post -ContentType "application/json" -Body '{"email":"supervisor.mysuru@jeevasetu.internal"}').token
   Invoke-RestMethod -Uri "http://localhost:4000/api/v1/referrals/JS-0002" -Method Get -Headers @{ Authorization = "Bearer $supToken" }
   ```
3. **Fallback for Shot 5 (Timeline Data):**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:4000/api/v1/referrals/JS-0002/timeline" -Method Get -Headers @{ Authorization = "Bearer $supToken" }
   ```
