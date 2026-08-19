import { PrismaClient, GapPhase, GapCauseClass, CapacityReasonCode, Role, CaseStatus, EscalationStatus, PlaybookStepStatus } from '@prisma/client';

const prisma = new PrismaClient();

const BILIKERE_PHC = '22222222-2222-2222-2222-222222222203';
const CHELUVAMBA_HOSPITAL = '22222222-2222-2222-2222-222222222201';
const KR_HOSPITAL = '22222222-2222-2222-2222-222222222202';

const ASHA_USER_ID = 'aaaa1111-1111-1111-1111-111111111111';
const TRIAGE_CHELUVAMBA_ID = 'bbbb2222-2222-2222-2222-222222222222';
const CLINICIAN_SAVITHA_ID = 'dddd4444-4444-4444-4444-444444444444';
const SUPERVISOR_MYSURU_ID = 'eeee5555-5555-5555-5555-555555555555';

async function seedDemoCases() {
  console.log('🚀 Seeding Stage 1 (JS-0001 Closed) and Stage 2 (JS-0002 Rerouted)...');

  // Clean old test cases if present
  await prisma.referralCase.deleteMany({
    where: { caseId: { in: ['JS-0001', 'JS-0002'] } },
  });

  // ----------------------------------------------------
  // CASE 1: JS-0001 (Happy Path -> Closed)
  // ----------------------------------------------------
  const patient1 = await prisma.patientReference.upsert({
    where: { externalId: 'ORS-KA-2026-MYS001' },
    update: {},
    create: {
      externalId: 'ORS-KA-2026-MYS001',
      nameHash: 'b9d14ec848a609653835ff48ff8d9c22d41b52a1789c1c4f4b1fa9f12d26f634',
      age: 24,
      gravida: 2,
      parity: 1,
      riskFlags: ['SEVERE_PRE_ECLAMPSIA', 'PREVIOUS_LSCS'],
    },
  });

  const case1 = await prisma.referralCase.create({
    data: {
      caseId: 'JS-0001',
      patientId: patient1.id,
      sendingFacilityId: BILIKERE_PHC,
      receivingFacilityId: CHELUVAMBA_HOSPITAL,
      createdById: ASHA_USER_ID,
      status: 'CLOSED',
      riskFlags: ['SEVERE_PRE_ECLAMPSIA', 'PREVIOUS_LSCS'],
      transportNeeded: true,
      transportMode: '108_AMBULANCE',
      clinicalSummary: 'Severe pre-eclampsia with BP 170/110 mmHg. Golden hour referral.',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      closedAt: new Date(Date.now() - 15 * 60 * 1000),
    },
  });

  // Timeline events for JS-0001
  await prisma.caseEvent.createMany({
    data: [
      {
        caseId: case1.id,
        type: 'SUBMIT_REFERRAL',
        actorId: ASHA_USER_ID,
        actorRole: 'FRONTLINE_WORKER',
        fromStatus: 'DRAFT',
        toStatus: 'SUBMITTED',
        payload: { notes: 'Emergency maternal referral initiated from Bilikere PHC' },
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      },
      {
        caseId: case1.id,
        type: 'ACCEPT_REFERRAL',
        actorId: TRIAGE_CHELUVAMBA_ID,
        actorRole: 'RECEIVING_FACILITY',
        fromStatus: 'SUBMITTED',
        toStatus: 'ACCEPTED',
        payload: { notes: 'Maternal ICU bed reserved at Cheluvamba Hospital' },
        createdAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
      },
      {
        caseId: case1.id,
        type: 'DISPATCH_TRANSPORT',
        actorId: ASHA_USER_ID,
        actorRole: 'FRONTLINE_WORKER',
        fromStatus: 'ACCEPTED',
        toStatus: 'IN_TRANSIT',
        payload: { notes: '108 Ambulance KA-09-G-1088 en route to Cheluvamba' },
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      },
      {
        caseId: case1.id,
        type: 'CONFIRM_ARRIVAL',
        actorId: TRIAGE_CHELUVAMBA_ID,
        actorRole: 'RECEIVING_FACILITY',
        fromStatus: 'IN_TRANSIT',
        toStatus: 'ARRIVED',
        payload: { notes: 'Patient arrived safely at Cheluvamba triage' },
        createdAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
      },
      {
        caseId: case1.id,
        type: 'RECORD_DISPOSITION',
        actorId: CLINICIAN_SAVITHA_ID,
        actorRole: 'CLINICIAN',
        fromStatus: 'ARRIVED',
        toStatus: 'CLINICAL_DISPOSITION_RECORDED',
        payload: { category: 'DISCHARGED_HOME', notes: 'Emergency LSCS performed. Mother and baby stable.' },
        createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      },
      {
        caseId: case1.id,
        type: 'DISCHARGE_PATIENT',
        actorId: CLINICIAN_SAVITHA_ID,
        actorRole: 'CLINICIAN',
        fromStatus: 'CLINICAL_DISPOSITION_RECORDED',
        toStatus: 'DISCHARGED',
        payload: { notes: 'Postnatal recovery complete. Assigned home follow-up.' },
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      },
      {
        caseId: case1.id,
        type: 'COMPLETE_FOLLOW_UP',
        actorId: ASHA_USER_ID,
        actorRole: 'FRONTLINE_WORKER',
        fromStatus: 'DISCHARGED',
        toStatus: 'CLOSED',
        payload: { outcome: 'COMPLETED', notes: 'Day 3 home visit completed. Mother and neonate healthy. Closed loop verified.' },
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
      },
    ],
  });

  await prisma.disposition.create({
    data: {
      caseId: case1.id,
      category: 'DISCHARGED_HOME',
      detail: 'Emergency LSCS performed. Mother and neonate discharged in stable condition.',
      recordedById: CLINICIAN_SAVITHA_ID,
    },
  });

  await prisma.followUpTask.create({
    data: {
      caseId: case1.id,
      ownerId: ASHA_USER_ID,
      type: 'HOME_VISIT',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      outcome: 'COMPLETED',
      completedAt: new Date(Date.now() - 15 * 60 * 1000),
      notes: 'Lactation established, BP 120/80 mmHg, infant feeding well.',
    },
  });

  // ----------------------------------------------------
  // CASE 2: JS-0002 (Rejected NO_BED -> Rerouted -> Escalated)
  // ----------------------------------------------------
  const patient2 = await prisma.patientReference.upsert({
    where: { externalId: 'ORS-KA-2026-MYS002' },
    update: {},
    create: {
      externalId: 'ORS-KA-2026-MYS002',
      nameHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      age: 27,
      gravida: 3,
      parity: 2,
      riskFlags: ['OBSTRUCTED_LABOUR', 'POSTPARTUM_HAEMORRHAGE_RISK'],
    },
  });

  const case2 = await prisma.referralCase.create({
    data: {
      caseId: 'JS-0002',
      patientId: patient2.id,
      sendingFacilityId: BILIKERE_PHC,
      receivingFacilityId: KR_HOSPITAL,
      createdById: ASHA_USER_ID,
      status: 'REROUTED',
      riskFlags: ['OBSTRUCTED_LABOUR', 'POSTPARTUM_HAEMORRHAGE_RISK'],
      transportNeeded: true,
      transportMode: '108_AMBULANCE',
      clinicalSummary: 'Obstructed labour with severe contractions. Initial bed rejection at Cheluvamba.',
      createdAt: new Date(Date.now() - 90 * 60 * 1000),
    },
  });

  // Timeline events for JS-0002
  await prisma.caseEvent.createMany({
    data: [
      {
        caseId: case2.id,
        type: 'SUBMIT_REFERRAL',
        actorId: ASHA_USER_ID,
        actorRole: 'FRONTLINE_WORKER',
        fromStatus: 'DRAFT',
        toStatus: 'SUBMITTED',
        payload: { notes: 'Emergency referral created for Cheluvamba Hospital' },
        createdAt: new Date(Date.now() - 90 * 60 * 1000),
      },
      {
        caseId: case2.id,
        type: 'REJECT_REFERRAL',
        actorId: TRIAGE_CHELUVAMBA_ID,
        actorRole: 'RECEIVING_FACILITY',
        fromStatus: 'SUBMITTED',
        toStatus: 'REJECTED',
        payload: { reasonCode: 'NO_BED', notes: 'No bed available — all 12 CEmOC beds occupied' },
        createdAt: new Date(Date.now() - 75 * 60 * 1000),
      },
      {
        caseId: case2.id,
        type: 'REROUTE_CONFIRMED',
        actorId: SUPERVISOR_MYSURU_ID,
        actorRole: 'DISTRICT_SUPERVISOR',
        fromStatus: 'REJECTED',
        toStatus: 'REROUTED',
        payload: {
          targetFacilityId: KR_HOSPITAL,
          targetFacilityName: 'K.R. Hospital (District Hospital Mysuru)',
          notes: 'Rerouted to K.R. Hospital — 6 CEmOC beds available',
        },
        createdAt: new Date(Date.now() - 45 * 60 * 1000),
      },
    ],
  });

  // Capacity Signal
  await prisma.capacitySignal.create({
    data: {
      facilityId: CHELUVAMBA_HOSPITAL,
      caseId: case2.id,
      reasonCode: 'NO_BED',
      detail: 'All CEmOC beds occupied at peak triage hour',
      reportedById: TRIAGE_CHELUVAMBA_ID,
    },
  });

  // Gap Event
  const gap2 = await prisma.gapEvent.create({
    data: {
      caseId: case2.id,
      phase: 'CAPACITY',
      causeClass: 'CAPACITY',
      classificationLabel: 'likely cause, pending supervisor review',
      status: 'RESOLVED',
      facilityId: CHELUVAMBA_HOSPITAL,
      evidence: [{ type: 'CAPACITY_REJECTION', reasonCode: 'NO_BED', timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString() }],
      overrideUserId: SUPERVISOR_MYSURU_ID,
      overriddenAt: new Date(Date.now() - 50 * 60 * 1000),
      overrideReason: 'Verified genuine surge capacity block. Reroute executed to KR Hospital.',
    },
  });

  // Escalation & Playbook
  const playbook = await prisma.playbook.findFirst({
    where: { triggerPhase: 'CAPACITY', triggerCause: 'CAPACITY' },
  });

  if (playbook) {
    const escalation = await prisma.escalation.create({
      data: {
        caseId: case2.id,
        gapEventId: gap2.id,
        playbookId: playbook.id,
        status: 'IN_PROGRESS',
        assigneeId: SUPERVISOR_MYSURU_ID,
      },
    });

    await prisma.playbookStep.createMany({
      data: [
        {
          escalationId: escalation.id,
          playbookId: playbook.id,
          stepOrder: 1,
          description: 'Identify nearest alternative CEmOC facility with available beds',
          descriptionKn: 'ಲಭ್ಯವಿರುವ ಹಾಸಿಗೆಗಳಿರುವ ಹತ್ತಿರದ ಪರ್ಯಾಯ CEmOC ಆಸ್ಪತ್ರೆಯನ್ನು ಗುರುತಿಸಿ',
          assigneeRole: 'DISTRICT_SUPERVISOR',
          slaHours: 1,
          status: 'COMPLETED',
          completedById: SUPERVISOR_MYSURU_ID,
          completedAt: new Date(Date.now() - 48 * 60 * 1000),
        },
        {
          escalationId: escalation.id,
          playbookId: playbook.id,
          stepOrder: 2,
          description: 'Confirm rerouting with 108 ambulance driver and frontline ASHA',
          descriptionKn: '108 ಆಂಬ್ಯುಲೆನ್ಸ್ ಚಾಲಕ ಮತ್ತು ಆಶಾ ಕಾರ್ಯಕರ್ತೆಯೊಂದಿಗೆ ಮರುಮಾರ್ಗ ದೃಢೀಕರಿಸಿ',
          assigneeRole: 'DISTRICT_SUPERVISOR',
          slaHours: 1,
          status: 'COMPLETED',
          completedById: SUPERVISOR_MYSURU_ID,
          completedAt: new Date(Date.now() - 45 * 60 * 1000),
        },
        {
          escalationId: escalation.id,
          playbookId: playbook.id,
          stepOrder: 3,
          description: 'Verify patient admission and CEmOC team readiness at destination',
          descriptionKn: 'ಗಮ್ಯಸ್ಥಾನದಲ್ಲಿ ರೋಗಿಯ ದಾಖಲಾತಿ ಮತ್ತು CEmOC ತಂಡದ ಸನ್ನದ್ಧತೆಯನ್ನು ಪರಿಶೀಲಿಸಿ',
          assigneeRole: 'DISTRICT_SUPERVISOR',
          slaHours: 2,
          status: 'IN_PROGRESS',
        },
      ],
    });
  }

  console.log('✅ Successfully seeded JS-0001 (CLOSED) and JS-0002 (REROUTED + Escalated)!');
}

seedDemoCases()
  .catch((err) => {
    console.error('❌ Error seeding demo cases:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
