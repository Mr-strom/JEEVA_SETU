import { ReferralCase, FollowUpTask, DashboardSummary, CapacityReasonCode, DispositionCategory, FollowUpOutcome, Role } from '../types';

export const SYNTHETIC_REFERRAL_CASES: ReferralCase[] = [
  {
    id: 'case-001-mysuru',
    caseId: 'JS-2026-MYS001',
    patientId: 'pat-001',
    patient: {
      id: 'pat-001',
      externalId: 'ORS-KA-2026-7819',
      age: 23,
      gravida: 2,
      parity: 1,
      lmp: '2025-11-10T00:00:00Z',
      edd: '2026-08-17T00:00:00Z',
      riskFlags: ['SEVERE_ANAEMIA', 'PRE_ECLAMPSIA'],
    },
    sendingFacilityId: '22222222-2222-2222-2222-222222222203',
    sendingFacility: {
      id: '22222222-2222-2222-2222-222222222203',
      name: 'Bilikere PHC',
      type: 'PHC',
      district: 'Mysuru',
      servicesOffered: ['BASIC_EMOC', 'ANTENATAL_CARE'],
    },
    receivingFacilityId: '22222222-2222-2222-2222-222222222201',
    receivingFacility: {
      id: '22222222-2222-2222-2222-222222222201',
      name: 'Cheluvamba Hospital (MMCRI)',
      type: 'TERTIARY_HOSPITAL',
      district: 'Mysuru',
      servicesOffered: ['CEmOC', 'NICU_LEVEL_3', 'BLOOD_BANK', 'OBSTETRIC_ICU'],
    },
    status: 'ACKNOWLEDGEMENT_PENDING',
    riskFlags: ['SEVERE_ANAEMIA', 'PRE_ECLAMPSIA'],
    transportNeeded: true,
    transportMode: '108_AMBULANCE',
    clinicalSummary: 'Patient with severe pallor (Hb 6.4 g/dL), BP 154/98 mmHg, protein 2+. Immediate CEmOC and blood transfusion support required.',
    createdById: 'bbbb2222-2222-2222-2222-222222222222',
    createdBy: {
      id: 'bbbb2222-2222-2222-2222-222222222222',
      name: 'Dr. Ramesh (MO Bilikere PHC)',
      email: 'phc.bilikere@jeevasetu.internal',
      role: 'SENDING_FACILITY',
    },
    assignedToId: 'aaaa1111-1111-1111-1111-111111111111',
    assignedTo: {
      id: 'aaaa1111-1111-1111-1111-111111111111',
      name: 'Radha Bai (ASHA)',
      email: 'asha.radha@jeevasetu.internal',
      role: 'FRONTLINE_WORKER',
    },
    acknowledgementDeadline: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    events: [
      {
        id: 'ev-001',
        caseId: 'case-001-mysuru',
        type: 'SUBMITTED',
        fromStatus: 'DRAFT',
        toStatus: 'ACKNOWLEDGEMENT_PENDING',
        actorId: 'bbbb2222-2222-2222-2222-222222222222',
        actorRole: 'SENDING_FACILITY',
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'case-002-mysuru',
    caseId: 'JS-2026-MYS002',
    patientId: 'pat-002',
    patient: {
      id: 'pat-002',
      externalId: 'ORS-KA-2026-9041',
      age: 28,
      gravida: 3,
      parity: 2,
      lmp: '2025-10-15T00:00:00Z',
      edd: '2026-07-22T00:00:00Z',
      riskFlags: ['PREVIOUS_LSCS', 'OBSTRUCTED_LABOUR'],
    },
    sendingFacilityId: '22222222-2222-2222-2222-222222222203',
    sendingFacility: {
      id: '22222222-2222-2222-2222-222222222203',
      name: 'Bilikere PHC',
      type: 'PHC',
      district: 'Mysuru',
      servicesOffered: ['BASIC_EMOC'],
    },
    receivingFacilityId: '22222222-2222-2222-2222-222222222201',
    receivingFacility: {
      id: '22222222-2222-2222-2222-222222222201',
      name: 'Cheluvamba Hospital (MMCRI)',
      type: 'TERTIARY_HOSPITAL',
      district: 'Mysuru',
      servicesOffered: ['CEmOC', 'NICU_LEVEL_3'],
    },
    status: 'IN_TRANSIT',
    riskFlags: ['PREVIOUS_LSCS', 'OBSTRUCTED_LABOUR'],
    transportNeeded: true,
    transportMode: '108_AMBULANCE',
    clinicalSummary: 'Second stage labour arrest. Previous lower segment caesarean section. FHR 118 bpm.',
    createdById: 'bbbb2222-2222-2222-2222-222222222222',
    acknowledgementDeadline: null,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    events: [
      {
        id: 'ev-002-1',
        caseId: 'case-002-mysuru',
        type: 'SUBMITTED',
        fromStatus: null,
        toStatus: 'ACKNOWLEDGEMENT_PENDING',
        actorId: 'bbbb2222-2222-2222-2222-222222222222',
        actorRole: 'SENDING_FACILITY',
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'ev-002-2',
        caseId: 'case-002-mysuru',
        type: 'ACCEPTED',
        fromStatus: 'ACKNOWLEDGEMENT_PENDING',
        toStatus: 'ACCEPTED',
        actorId: 'cccc3333-3333-3333-3333-333333333333',
        actorRole: 'RECEIVING_FACILITY',
        payload: { note: 'Labour OT prepared' },
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        id: 'ev-002-3',
        caseId: 'case-002-mysuru',
        type: 'DISPATCHED',
        fromStatus: 'ACCEPTED',
        toStatus: 'IN_TRANSIT',
        actorId: 'bbbb2222-2222-2222-2222-222222222222',
        actorRole: 'SENDING_FACILITY',
        payload: { vehicleNumber: 'KA-09-G-1082' },
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'case-003-mysuru',
    caseId: 'JS-2026-MYS003',
    patientId: 'pat-003',
    patient: {
      id: 'pat-003',
      externalId: 'ORS-KA-2026-3180',
      age: 26,
      gravida: 1,
      parity: 0,
      lmp: '2025-09-01T00:00:00Z',
      edd: '2026-06-08T00:00:00Z',
      riskFlags: ['GESTATIONAL_HYPERTENSION'],
    },
    sendingFacilityId: '22222222-2222-2222-2222-222222222203',
    sendingFacility: {
      id: '22222222-2222-2222-2222-222222222203',
      name: 'Bilikere PHC',
      type: 'PHC',
      district: 'Mysuru',
      servicesOffered: ['BASIC_EMOC'],
    },
    receivingFacilityId: '22222222-2222-2222-2222-222222222201',
    receivingFacility: {
      id: '22222222-2222-2222-2222-222222222201',
      name: 'Cheluvamba Hospital (MMCRI)',
      type: 'TERTIARY_HOSPITAL',
      district: 'Mysuru',
      servicesOffered: ['CEmOC'],
    },
    status: 'ARRIVED',
    riskFlags: ['GESTATIONAL_HYPERTENSION'],
    transportNeeded: true,
    transportMode: '108_AMBULANCE',
    clinicalSummary: 'Primigravida at term with blood pressure spike. Arrived at triage.',
    createdById: 'bbbb2222-2222-2222-2222-222222222222',
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    events: [
      {
        id: 'ev-003-1',
        caseId: 'case-003-mysuru',
        type: 'SUBMITTED',
        toStatus: 'ACKNOWLEDGEMENT_PENDING',
        actorId: 'bbbb2222-2222-2222-2222-222222222222',
        actorRole: 'SENDING_FACILITY',
        createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      },
      {
        id: 'ev-003-2',
        caseId: 'case-003-mysuru',
        type: 'ACCEPTED',
        toStatus: 'ACCEPTED',
        actorId: 'cccc3333-3333-3333-3333-333333333333',
        actorRole: 'RECEIVING_FACILITY',
        createdAt: new Date(Date.now() - 100 * 60 * 1000).toISOString(),
      },
      {
        id: 'ev-003-3',
        caseId: 'case-003-mysuru',
        type: 'ARRIVED',
        toStatus: 'ARRIVED',
        actorId: 'cccc3333-3333-3333-3333-333333333333',
        actorRole: 'RECEIVING_FACILITY',
        payload: { arrivedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'case-004-mysuru',
    caseId: 'JS-2026-MYS004',
    patientId: 'pat-004',
    patient: {
      id: 'pat-004',
      externalId: 'ORS-KA-2026-1122',
      age: 24,
      gravida: 2,
      parity: 1,
      riskFlags: ['POST_PARTUM_HAEMORRHAGE'],
    },
    sendingFacilityId: '22222222-2222-2222-2222-222222222203',
    sendingFacility: {
      id: '22222222-2222-2222-2222-222222222203',
      name: 'Bilikere PHC',
      type: 'PHC',
      district: 'Mysuru',
      servicesOffered: ['BASIC_EMOC'],
    },
    receivingFacilityId: '22222222-2222-2222-2222-222222222201',
    receivingFacility: {
      id: '22222222-2222-2222-2222-222222222201',
      name: 'Cheluvamba Hospital (MMCRI)',
      type: 'TERTIARY_HOSPITAL',
      district: 'Mysuru',
      servicesOffered: ['CEmOC'],
    },
    status: 'FOLLOW_UP_DUE',
    riskFlags: ['POST_PARTUM_HAEMORRHAGE'],
    transportNeeded: true,
    transportMode: '108_AMBULANCE',
    clinicalSummary: 'PPH managed successfully with uterine balloon tamponade and 2 units PRBC. Discharged in stable condition.',
    createdById: 'bbbb2222-2222-2222-2222-222222222222',
    followUpDueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    dispositions: [
      {
        id: 'disp-004',
        category: 'DISCHARGED_HOME',
        detail: 'Discharged stable. Hb 10.1 g/dL. Mother on oral iron.',
        recordedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
];

export const SYNTHETIC_FOLLOW_UPS: FollowUpTask[] = [
  {
    id: 'task-001',
    caseId: 'case-004-mysuru',
    case: SYNTHETIC_REFERRAL_CASES[3],
    type: 'HOME_VISIT',
    ownerId: 'aaaa1111-1111-1111-1111-111111111111',
    owner: {
      id: 'aaaa1111-1111-1111-1111-111111111111',
      name: 'Radha Bai (ASHA)',
      phone: '+919876543210',
      role: 'FRONTLINE_WORKER',
    },
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    outcome: null,
    completedAt: null,
    notes: 'Check for postpartum bleeding, fever, and initiate exclusive breastfeeding support.',
    escalated: false,
    escalatedAt: null,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

export class ApiService {
  private cases: ReferralCase[] = [...SYNTHETIC_REFERRAL_CASES];
  private followUps: FollowUpTask[] = [...SYNTHETIC_FOLLOW_UPS];

  async getDashboardSummary(userRole: Role): Promise<DashboardSummary> {
    try {
      const res = await fetch('/api/v1/reporting/summary', {
        headers: { Authorization: `Bearer synthetic-token` },
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }

    const total = this.cases.length;
    const open = this.cases.filter((c) =>
      ['ACKNOWLEDGEMENT_PENDING', 'ACCEPTED', 'IN_TRANSIT', 'ARRIVED', 'CLINICAL_DISPOSITION_RECORDED', 'FOLLOW_UP_DUE'].includes(c.status),
    ).length;
    const overdue = this.cases.filter(
      (c) => c.status === 'ACKNOWLEDGEMENT_PENDING' && c.acknowledgementDeadline && new Date(c.acknowledgementDeadline) < new Date(),
    ).length;
    const escalated = this.cases.filter((c) => c.status === 'FOLLOW_UP_ESCALATED').length;
    const rerouted = this.cases.filter((c) => ['REDIRECTED', 'REROUTED'].includes(c.status)).length;
    const closed = this.cases.filter((c) => c.status === 'CLOSED').length;

    return {
      role: userRole,
      openCases: open,
      overdueCount: overdue,
      escalatedCount: escalated,
      reroutedCount: rerouted,
      closedCount: closed,
      totalCases: total,
      timestamp: new Date().toISOString(),
    };
  }

  async listReferrals(filters?: { status?: string; query?: string; delayedOnly?: boolean }): Promise<ReferralCase[]> {
    try {
      const res = await fetch('/api/v1/referrals', {
        headers: { Authorization: `Bearer synthetic-token` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.items) return data.items;
      }
    } catch {
      // Fallback
    }

    let list = [...this.cases];
    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter((c) => c.status === filters.status);
    }
    if (filters?.query) {
      const q = filters.query.toLowerCase();
      list = list.filter(
        (c) =>
          c.caseId.toLowerCase().includes(q) ||
          c.patient.externalId.toLowerCase().includes(q) ||
          c.sendingFacility?.name.toLowerCase().includes(q) ||
          c.receivingFacility?.name.toLowerCase().includes(q),
      );
    }
    if (filters?.delayedOnly) {
      list = list.filter(
        (c) => c.acknowledgementDeadline && new Date(c.acknowledgementDeadline) < new Date(),
      );
    }
    return list;
  }

  async getReferralById(id: string): Promise<ReferralCase | null> {
    try {
      const res = await fetch(`/api/v1/referrals/${id}`, {
        headers: { Authorization: `Bearer synthetic-token` },
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    const found = this.cases.find((c) => c.id === id || c.caseId === id);
    return found || null;
  }

  async acceptReferral(id: string, payload: { note?: string; receivingUnit?: string }): Promise<ReferralCase> {
    const target = this.cases.find((c) => c.id === id || c.caseId === id);
    if (!target) throw new Error('Case not found');

    target.status = 'ACCEPTED';
    target.updatedAt = new Date().toISOString();
    target.events = target.events || [];
    target.events.push({
      id: `ev-${Date.now()}`,
      caseId: target.id,
      type: 'ACCEPTED',
      fromStatus: 'ACKNOWLEDGEMENT_PENDING',
      toStatus: 'ACCEPTED',
      actorId: 'receiving-desk',
      actorRole: 'RECEIVING_FACILITY',
      payload,
      createdAt: new Date().toISOString(),
    });
    return { ...target };
  }

  async redirectReferral(id: string, payload: { targetFacilityId: string; reasonCode: CapacityReasonCode; note?: string }): Promise<ReferralCase> {
    const target = this.cases.find((c) => c.id === id || c.caseId === id);
    if (!target) throw new Error('Case not found');

    target.status = 'REDIRECTED';
    target.updatedAt = new Date().toISOString();
    target.events = target.events || [];
    target.events.push({
      id: `ev-${Date.now()}`,
      caseId: target.id,
      type: 'REDIRECTED',
      fromStatus: 'ACKNOWLEDGEMENT_PENDING',
      toStatus: 'REDIRECTED',
      actorId: 'receiving-desk',
      actorRole: 'RECEIVING_FACILITY',
      payload,
      createdAt: new Date().toISOString(),
    });
    return { ...target };
  }

  async rejectReferral(id: string, payload: { reasonCode: CapacityReasonCode; note?: string }): Promise<ReferralCase> {
    const target = this.cases.find((c) => c.id === id || c.caseId === id);
    if (!target) throw new Error('Case not found');

    target.status = 'REJECTED';
    target.updatedAt = new Date().toISOString();
    target.events = target.events || [];
    target.events.push({
      id: `ev-${Date.now()}`,
      caseId: target.id,
      type: 'REJECTED',
      fromStatus: 'ACKNOWLEDGEMENT_PENDING',
      toStatus: 'REJECTED',
      actorId: 'receiving-desk',
      actorRole: 'RECEIVING_FACILITY',
      payload,
      createdAt: new Date().toISOString(),
    });
    return { ...target };
  }

  async recordArrival(id: string, payload: { arrivedAt?: string; delayReason?: string; note?: string }): Promise<ReferralCase> {
    const target = this.cases.find((c) => c.id === id || c.caseId === id);
    if (!target) throw new Error('Case not found');

    target.status = 'ARRIVED';
    target.updatedAt = new Date().toISOString();
    target.events = target.events || [];
    target.events.push({
      id: `ev-${Date.now()}`,
      caseId: target.id,
      type: 'ARRIVED',
      fromStatus: 'IN_TRANSIT',
      toStatus: 'ARRIVED',
      actorId: 'receiving-desk',
      actorRole: 'RECEIVING_FACILITY',
      payload,
      createdAt: new Date().toISOString(),
    });
    return { ...target };
  }

  async recordDisposition(id: string, payload: { category: DispositionCategory; detail?: string }): Promise<ReferralCase> {
    const target = this.cases.find((c) => c.id === id || c.caseId === id);
    if (!target) throw new Error('Case not found');

    target.status = 'CLINICAL_DISPOSITION_RECORDED';
    target.updatedAt = new Date().toISOString();
    target.dispositions = target.dispositions || [];
    target.dispositions.push({
      id: `disp-${Date.now()}`,
      category: payload.category,
      detail: payload.detail,
      recordedAt: new Date().toISOString(),
    });
    target.events = target.events || [];
    target.events.push({
      id: `ev-${Date.now()}`,
      caseId: target.id,
      type: 'CLINICAL_DISPOSITION_RECORDED',
      fromStatus: 'ARRIVED',
      toStatus: 'CLINICAL_DISPOSITION_RECORDED',
      actorId: 'dr-savitha',
      actorRole: 'CLINICIAN',
      payload,
      createdAt: new Date().toISOString(),
    });
    return { ...target };
  }

  async dischargePatient(id: string, payload: { followUpDueDate?: string; dischargeSummary?: string }): Promise<ReferralCase> {
    const target = this.cases.find((c) => c.id === id || c.caseId === id);
    if (!target) throw new Error('Case not found');

    target.status = 'FOLLOW_UP_DUE';
    target.followUpDueDate = payload.followUpDueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    target.updatedAt = new Date().toISOString();

    const newTask: FollowUpTask = {
      id: `task-${Date.now()}`,
      caseId: target.id,
      case: target,
      type: 'HOME_VISIT',
      ownerId: target.assignedToId || 'aaaa1111-1111-1111-1111-111111111111',
      owner: {
        id: target.assignedToId || 'aaaa1111-1111-1111-1111-111111111111',
        name: target.assignedTo?.name || 'Radha Bai (ASHA)',
        phone: '+919876543210',
        role: 'FRONTLINE_WORKER',
      },
      dueDate: target.followUpDueDate,
      outcome: null,
      notes: payload.dischargeSummary || null,
      escalated: false,
      createdAt: new Date().toISOString(),
    };
    this.followUps.push(newTask);

    target.events = target.events || [];
    target.events.push({
      id: `ev-${Date.now()}`,
      caseId: target.id,
      type: 'DISCHARGED',
      toStatus: 'FOLLOW_UP_DUE',
      actorId: 'dr-savitha',
      actorRole: 'CLINICIAN',
      payload,
      createdAt: new Date().toISOString(),
    });
    return { ...target };
  }

  async closeReferral(id: string, payload: { closureReason?: string; note?: string }): Promise<ReferralCase> {
    const target = this.cases.find((c) => c.id === id || c.caseId === id);
    if (!target) throw new Error('Case not found');

    target.status = 'CLOSED';
    target.closedAt = new Date().toISOString();
    target.updatedAt = new Date().toISOString();
    target.events = target.events || [];
    target.events.push({
      id: `ev-${Date.now()}`,
      caseId: target.id,
      type: 'CLOSED',
      toStatus: 'CLOSED',
      actorId: 'supervisor-mysuru',
      actorRole: 'DISTRICT_SUPERVISOR',
      payload,
      createdAt: new Date().toISOString(),
    });
    return { ...target };
  }

  async listFollowUps(): Promise<FollowUpTask[]> {
    return [...this.followUps];
  }

  async completeFollowUp(taskId: string, payload: { outcome: FollowUpOutcome; notes?: string }): Promise<FollowUpTask> {
    const task = this.followUps.find((t) => t.id === taskId);
    if (!task) throw new Error('Task not found');

    task.outcome = payload.outcome;
    task.completedAt = new Date().toISOString();
    task.notes = payload.notes || task.notes;

    const targetCase = this.cases.find((c) => c.id === task.caseId);
    if (targetCase) {
      targetCase.status = 'FOLLOW_UP_COMPLETED';
      targetCase.updatedAt = new Date().toISOString();
    }
    return { ...task };
  }

  async escalateFollowUp(taskId: string, payload: { reason: string }): Promise<FollowUpTask> {
    const task = this.followUps.find((t) => t.id === taskId);
    if (!task) throw new Error('Task not found');

    task.escalated = true;
    task.escalatedAt = new Date().toISOString();
    task.notes = payload.reason;

    const targetCase = this.cases.find((c) => c.id === task.caseId);
    if (targetCase) {
      targetCase.status = 'FOLLOW_UP_ESCALATED';
      targetCase.updatedAt = new Date().toISOString();
    }
    return { ...task };
  }
}

export const api = new ApiService();
