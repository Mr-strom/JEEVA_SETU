async function main() {
  const API_URL = 'http://localhost:4000/api/v1';

  async function post(url: string, body: any, token?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  async function get(url: string, token?: string) {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${url}`, { headers });
    const data = await res.json();
    return { status: res.status, data };
  }

  console.log('================ STAGE 1: DEMO CASE JS-0001 ================');

  // 1.1 Login as ASHA
  console.log('\n--- 1.1 ASHA Login ---');
  const ashaLogin = await post('/auth/token', { email: 'asha.radha@jeevasetu.internal' });
  console.log('HTTP', ashaLogin.status);
  console.log('JWT Token (trimmed):', ashaLogin.data.token.slice(0, 45) + '...');
  console.log('User Role:', ashaLogin.data.user.role, '| Facility:', ashaLogin.data.user.facilityId);
  const ashaToken = ashaLogin.data.token;

  // 1.2 Create Referral JS-0001
  console.log('\n--- 1.2 Create Referral (POST /api/v1/referrals) ---');
  const createRes = await post('/referrals', {
    isDraft: false,
    sendingFacilityId: '22222222-2222-2222-2222-222222222203', // Bilikere PHC
    receivingFacilityId: '22222222-2222-2222-2222-222222222201', // Cheluvamba Hospital
    patientExternalId: 'SYNTH-DEMO-0001',
    patientName: 'Synthetic Demo Case 0001',
    patientAge: 24,
    gravida: 1,
    parity: 0,
    riskFlags: ['PRE_ECLAMPSIA', 'SEVERE_ANAEMIA'],
    transportNeeded: true,
    transportMode: '108_AMBULANCE',
    clinicalSummary: 'Primigravida 37 weeks, BP 170/110 mmHg, 3+ proteinuria, hyperreflexia, imminent eclampsia protocol required.',
  }, ashaToken);
  console.log('HTTP', createRes.status);
  const ref = createRes.data;
  console.log('Created Case ID:', ref.caseId, '| DB UUID:', ref.id);
  console.log('Status:', ref.status);
  console.log('Sending Facility:', ref.sendingFacility.name);
  console.log('Receiving Facility:', ref.receivingFacility.name);
  console.log('Acknowledgement Deadline:', ref.acknowledgementDeadline);
  const refId = ref.id;

  // 1.3 The Closing-Loop Clock: Receiving desk acknowledges & accepts
  console.log('\n--- 1.3 Receiving Facility Acknowledges & Accepts (POST /api/v1/referrals/:id/accept) ---');
  const deskLogin = await post('/auth/token', { email: 'referrals.cheluvamba@jeevasetu.internal' });
  const deskToken = deskLogin.data.token;
  const acceptRes = await post(`/referrals/${refId}/accept`, {
    note: 'Emergency Obstetrician Dr. Savitha alerted. Maternal ICU bed #4 reserved. 108 ambulance triage notified.',
    receivingUnit: 'Obstetric High Dependency Unit (HDU)',
  }, deskToken);
  console.log('HTTP', acceptRes.status);
  console.log('Updated Status:', acceptRes.data.status);
  console.log('Receiving Facility:', acceptRes.data.receivingFacility.name);

  // 1.4 Sending Facility Marks IN_TRANSIT
  console.log('\n--- 1.4 Sending Facility Marks IN_TRANSIT (POST /api/v1/referrals/:id/events) ---');
  const moLogin = await post('/auth/token', { email: 'phc.bilikere@jeevasetu.internal' });
  const moToken = moLogin.data.token;
  const transitRes = await post(`/referrals/${refId}/events`, {
    eventType: 'DEPARTED_FACILITY',
    payload: {
      transportMode: '108_AMBULANCE',
      ambulanceVehicleNumber: 'KA-09-G-1081',
      departureTime: new Date().toISOString(),
      paramedicName: 'Suresh Kumar',
    },
  }, moToken);
  console.log('HTTP', transitRes.status);
  console.log('Recorded CaseEvent:', transitRes.data.type, '| From:', transitRes.data.fromStatus, '-> To:', transitRes.data.toStatus);

  // 1.5 Receiving Facility records ARRIVED + Clinical Disposition
  console.log('\n--- 1.5 Receiving Facility Records ARRIVED & Clinical Disposition ---');
  const arrivalRes = await post(`/referrals/${refId}/arrival`, {
    arrivalCondition: 'Conscious, BP 162/104 mmHg, fetal heart rate 140 bpm. IV Magnesium Sulfate infusion running.',
    triageNotes: 'Immediately transferred to Labour Room HDU under Senior Obstetrician supervision.',
  }, deskToken);
  console.log('Arrival Recorded. Status:', arrivalRes.data.status);

  // Obstetrician records Clinical Disposition
  const obgynLogin = await post('/auth/token', { email: 'dr.savitha.obgyn@jeevasetu.internal' });
  const obgynToken = obgynLogin.data.token;
  const dispRes = await post(`/referrals/${refId}/disposition`, {
    category: 'ADMITTED',
    detail: 'Severe Pre-eclampsia in labour. Emergency LSCS performed successfully under spinal anesthesia. Healthy female baby delivered (2.8 kg, APGAR 8/10).',
  }, obgynToken);
  console.log('Clinical Disposition Recorded. Status:', dispRes.data.status);

  // 1.6 Discharge & Post-Discharge Follow-up Task Completion -> CLOSED
  console.log('\n--- 1.6 Discharge & Post-Discharge Follow-up Task Completion -> Case CLOSED ---');
  const dischargeRes = await post(`/referrals/${refId}/discharge`, {
    dischargeSummary: 'Mother and neonate stable on Postnatal Day 3. BP controlled at 124/82 mmHg on oral labetalol. Discharged with 3-day home visit scheduled for ASHA Radha Bai.',
  }, obgynToken);
  console.log('Discharge Recorded. Status:', dischargeRes.data.status, '| Follow-Up Due Date:', dischargeRes.data.followUpDueDate);

  // List follow-up tasks for ASHA
  const followUpsRes = await get('/follow-ups', ashaToken);
  const task = followUpsRes.data.items.find((t: any) => t.caseId === refId) || followUpsRes.data.items[0];
  console.log('Follow-Up Task ID:', task.id, '| Type:', task.type, '| Due Date:', task.dueDate);

  // ASHA completes the home visit task
  const completeTaskRes = await post(`/follow-ups/${task.id}/complete`, {
    outcome: 'COMPLETED',
    notes: 'Home visit conducted on Postnatal Day 6. Mother BP 120/80 mmHg, healing surgical wound clean and dry, baby breastfeeding actively, no danger signs.',
  }, ashaToken);
  console.log('Follow-Up Completed. Task Outcome:', completeTaskRes.data.outcome);

  // Case Closure
  const closeRes = await post(`/referrals/${refId}/close`, {
    closureReason: 'Complete closed-loop care pathway achieved: emergency triage, surgical delivery, and verified postnatal home follow-up completed.',
  }, obgynToken);
  console.log('Referral Case Closed. Status:', closeRes.data.status, '| Closed At:', closeRes.data.closedAt);

  // Fetch full timeline
  const timelineRes = await get(`/referrals/${refId}/timeline`, ashaToken);
  console.log('\n--- Final Referral Timeline (' + timelineRes.data.length + ' Chronological Events) ---');
  timelineRes.data.forEach((evt: any, idx: number) => {
    const time = evt.createdAt || evt.timestamp || 'N/A';
    console.log(`  ${idx + 1}. [${time}] ${evt.type} (${evt.fromStatus || 'START'} -> ${evt.toStatus || evt.type}) by ${evt.actorRole}`);
  });

  // 1.7 Referral Blackspot Summary Guard
  console.log('\n--- 1.7 Referral Blackspot Summary & Threshold Suppression ---');
  const supervisorLogin = await post('/auth/token', { email: 'supervisor.mysuru@jeevasetu.internal' });
  const supervisorToken = supervisorLogin.data.token;
  const blackspotRes = await get('/blackspot/summary', supervisorToken);
  console.log('HTTP', blackspotRes.status);
  console.log('Total Facilities Tracked:', blackspotRes.data.totalFacilitiesTracked);
  console.log('Minimum Case Threshold:', blackspotRes.data.minThreshold);
  console.log('Suppressed Facilities Count (< ' + blackspotRes.data.minThreshold + ' cases):', blackspotRes.data.suppressedFacilitiesCount);
  console.log('Unsuppressed High-Volume Facilities in Summary:', blackspotRes.data.blackspots.length);
  console.log('Pilot Disclaimer:', blackspotRes.data.disclaimer);
}

main().catch(console.error);
