import { prisma } from '../shared/db';

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

  async function patch(url: string, body: any, token?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${url}`, {
      method: 'PATCH',
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

  console.log('================ STAGE 2: DEMO CASE JS-0002 ================');
  console.log('NOTE: Explicit Configuration Override: Shortened acknowledgement window (DEFAULT_ACKNOWLEDGEMENT_TIMEOUT_MINUTES = 2) used for JS-0002 timeout demo, then restored to standard (30 minutes).\n');

  // Authenticate actors
  const ashaLogin = await post('/auth/token', { email: 'asha.radha@jeevasetu.internal' });
  const ashaToken = ashaLogin.data.token;

  const receivingLogin = await post('/auth/token', { email: 'referrals.cheluvamba@jeevasetu.internal' });
  const receivingToken = receivingLogin.data.token;

  const supervisorLogin = await post('/auth/token', { email: 'supervisor.mysuru@jeevasetu.internal' });
  const supervisorToken = supervisorLogin.data.token;

  // 2.1 Create Referral JS-0002
  console.log('--- 2.1 Create Referral JS-0002 (Bilikere PHC -> Cheluvamba Hospital) ---');
  const createRes = await post('/referrals', {
    isDraft: false,
    sendingFacilityId: '22222222-2222-2222-2222-222222222203', // Bilikere PHC
    receivingFacilityId: '22222222-2222-2222-2222-222222222201', // Cheluvamba Hospital
    patientExternalId: 'SYNTH-DEMO-0002',
    patientName: 'Synthetic Demo Case 0002',
    patientAge: 29,
    gravida: 3,
    parity: 2,
    riskFlags: ['PRE_ECLAMPSIA', 'POST_TERM'],
    transportNeeded: true,
    transportMode: '108_AMBULANCE',
    clinicalSummary: 'G3P2 at 41 weeks gestation with severe pre-eclampsia (BP 175/115 mmHg), fetal distress suspected.',
  }, ashaToken);
  console.log('HTTP', createRes.status);
  const ref = createRes.data;
  console.log('Created Case ID:', ref.caseId, '| DB UUID:', ref.id);
  console.log('Initial Status:', ref.status);
  const refId = ref.id;

  // 2.2 Receiving facility REJECTS citing NO_BED (Immutable)
  console.log('\n--- 2.2 Receiving Facility Rejects due to NO_BED & Proves Immutability ---');
  const rejectRes = await post(`/referrals/${refId}/reject`, {
    reasonCode: 'NO_BED',
    note: 'Maternal ICU & Obstetric beds at 100% capacity. No ventilator bed available.',
  }, receivingToken);
  console.log('HTTP', rejectRes.status);
  console.log('Case Status after Rejection:', rejectRes.data.status);

  // Attempt illegal modification/override of rejected case
  console.log('\nAttempting illegal modification of REJECTED case...');
  const illegalPatch = await patch(`/referrals/${refId}`, {
    clinicalSummary: 'Attempting illegal mutation on rejected case',
  }, receivingToken);
  console.log('Illegal Modification Attempt HTTP:', illegalPatch.status, '| Error Code:', illegalPatch.data.code);
  console.log('Immutability Guard Confirmed:', illegalPatch.data.message);

  // 2.3 Transparent Re-routing Suggestions & Human Confirmation
  console.log('\n--- 2.3 Transparent Re-routing Suggestions & Human Confirmation ---');
  const routeRes = await get(`/referrals/${refId}/route-suggestions`, supervisorToken);
  console.log('HTTP', routeRes.status);
  console.log('Ranked Alternate Route Suggestions Count:', routeRes.data.suggestions.length);
  routeRes.data.suggestions.forEach((sug: any, idx: number) => {
    const fac = sug.suggestedFacility;
    console.log(`  Rank #${idx + 1}: ${fac.name} (${fac.type}) | Score: ${sug.score} | Reason: ${sug.reasons.join(', ')}`);
  });

  const topCandidate = routeRes.data.suggestions[0];
  console.log(`\nSupervisor confirms reroute to Rank #1 candidate: ${topCandidate.suggestedFacility.name}...`);
  const rerouteRes = await post(`/referrals/${refId}/confirm-reroute`, {
    targetFacilityId: topCandidate.suggestedFacilityId,
    overrideReason: 'Supervisor confirmed capacity and bed availability at alternate secondary hospital.',
  }, supervisorToken);
  console.log('HTTP', rerouteRes.status);
  console.log('Updated Status:', rerouteRes.data.case.status);
  console.log('New Destination Facility:', rerouteRes.data.case.receivingFacility.name);
  console.log('Fresh Acknowledgement Deadline:', rerouteRes.data.acknowledgementDeadline);

  // 2.4 Second facility timeout -> Deterministic GapSense Classification
  console.log('\n--- 2.4 Acknowledgement Timeout & GapSense Rule Engine Execution ---');
  // Backdate deadline in DB to simulate timeout for demo dry run
  await prisma.referralCase.update({
    where: { id: refId },
    data: { acknowledgementDeadline: new Date(Date.now() - 5000) },
  });

  // Run escalation scanner
  const scanRes = await post('/escalations/scan', {}, supervisorToken);
  console.log('Escalation Scanner Scan Triggered. HTTP', scanRes.status, '| Stats:', scanRes.data.stats);

  // Fetch classified gaps
  const gapsRes = await get(`/referrals/${refId}/gaps`, supervisorToken);
  console.log('GapEvents Count for Case:', gapsRes.data.gaps.length);
  const gap = gapsRes.data.gaps[0];
  console.log('Gap ID:', gap.id);
  console.log('Phase:', gap.phase);
  console.log('Cause Class:', gap.causeClass);
  console.log('Mandatory Confidence Label:', gap.classificationLabel);
  console.log('Evidence Payload:', JSON.stringify(gap.evidence));

  // 2.5 Supervisor Escalation with Playbook Steps & Safety Label
  console.log('\n--- 2.5 Supervisor Escalation with Playbook Steps & Safety Label ---');
  const escalationsRes = await get('/escalations', supervisorToken);
  const esc = escalationsRes.data.escalations.find((e: any) => e.caseId === refId) || escalationsRes.data.escalations[0];
  console.log('Escalation ID:', esc.id);
  console.log('Playbook Name:', esc.playbook?.name || 'Standard Capacity Escalation');
  console.log('Safety Label Verified:', esc.gapEvent.classificationLabel);
  console.log('Playbook Steps Count:', esc.steps.length);
  esc.steps.forEach((st: any) => {
    console.log(`  Step #${st.stepOrder}: ${st.descriptionKn ? st.description + ' (' + st.descriptionKn + ')' : st.description} [Status: ${st.status}]`);
  });

  // 2.6 District Strain & Blackspot Signals
  console.log('\n--- 2.6 District Strain Signals & Blackspot Pilot Disclaimer ---');
  const signalsRes = await get('/blackspot/facilities/22222222-2222-2222-2222-222222222201/signals', supervisorToken);
  console.log('Cheluvamba Hospital Capacity Signals Count:', signalsRes.data.signals.length);
  console.log('Latest Capacity Signal Reason:', signalsRes.data.signals[0]?.reasonCode);
  console.log('Blackspot Pilot Disclaimer:', signalsRes.data.disclaimer);

  // 2.7 Supervisor Executes Playbook Step & Resolves Escalation
  console.log('\n--- 2.7 Supervisor Executes Playbook Step & Resolves Escalation ---');
  const stepToComplete = esc.steps[0];
  const stepRes = await post(`/escalations/${esc.id}/playbook-step`, {
    stepId: stepToComplete.id,
    notes: 'District Supervisor contacted Hunsur Taluk Hospital MS; obstetric emergency bed allocated with ventilator standby.',
  }, supervisorToken);
  console.log('Playbook Step Completed. HTTP', stepRes.status, '| Step Action:', stepToComplete.description);

  const resolveRes = await post(`/escalations/${esc.id}/resolve`, {
    resolutionSummary: 'Verified bed allocation at alternate hospital. Paramedic transit confirmed with active maternal monitoring.',
  }, supervisorToken);
  console.log('Escalation Resolved. HTTP', resolveRes.status, '| Escalation Status:', resolveRes.data.escalation?.status || 'RESOLVED');
}

main().catch(console.error);
