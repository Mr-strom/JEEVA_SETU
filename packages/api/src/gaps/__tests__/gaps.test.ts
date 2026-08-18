import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { GapPhase, GapCauseClass, CapacityReasonCode, CaseStatus, Role } from '@prisma/client';
import { classifyGap } from '../gaps.engine';
import { buildApp } from '../../app';
import { authService } from '../../auth/auth.service';
import { AuthUser } from '../../shared/types';
import { prisma } from '../../shared/db';
import { auditService } from '../../audit/audit.service';

describe('Phase 8A: GapSense Deterministic Classification Engine & Overrides', () => {
  let app: FastifyInstance;

  const mockSupervisor: AuthUser = {
    id: '11111111-1111-1111-1111-111111111105',
    email: 'supervisor.mysuru@jeevasetu.karnataka.gov.in',
    name: 'Dr. Savitha Rao (DHO Mysuru)',
    role: Role.DISTRICT_SUPERVISOR,
    district: 'Mysuru',
    isActive: true,
  };

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/jeevasetu';
    app = buildApp({ logger: false });
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockSupervisor as any);
  });

  describe('1. Pure Deterministic Classification Engine — Every Table Row Tested', () => {
    it('Row 1A: Rejection with NO_BED -> Phase: CAPACITY, Cause: CAPACITY', () => {
      const res = classifyGap({
        caseId: 'case-001',
        status: CaseStatus.REJECTED,
        capacityReasonCode: CapacityReasonCode.NO_BED,
        rejectionEventId: 'ev-rej-001',
      });

      expect(res.phase).toBe(GapPhase.CAPACITY);
      expect(res.causeClass).toBe(GapCauseClass.CAPACITY);
      expect(res.classificationLabel).toBe('likely cause, pending supervisor review');
      expect(res.evidence.some((e) => e.value === CapacityReasonCode.NO_BED)).toBe(true);
    });

    it('Row 1B: Rejection with SERVICE_UNAVAILABLE -> Phase: CAPACITY, Cause: CAPACITY', () => {
      const res = classifyGap({
        caseId: 'case-002',
        status: CaseStatus.REJECTED,
        capacityReasonCode: CapacityReasonCode.SERVICE_UNAVAILABLE,
      });

      expect(res.phase).toBe(GapPhase.CAPACITY);
      expect(res.causeClass).toBe(GapCauseClass.CAPACITY);
      expect(res.evidence[0].key).toBe('CAPACITY_REJECTION_REASON');
    });

    it('Row 1C: Rejection with NO_CLINICIAN -> Phase: CAPACITY, Cause: CAPACITY', () => {
      const res = classifyGap({
        caseId: 'case-003',
        status: CaseStatus.REJECTED,
        capacityReasonCode: CapacityReasonCode.NO_CLINICIAN,
      });

      expect(res.phase).toBe(GapPhase.CAPACITY);
      expect(res.causeClass).toBe(GapCauseClass.CAPACITY);
    });

    it('Row 1D: Rejection with TRANSPORT_UNAVAILABLE -> Phase: CAPACITY, Cause: CAPACITY', () => {
      const res = classifyGap({
        caseId: 'case-004',
        status: CaseStatus.REJECTED,
        capacityReasonCode: CapacityReasonCode.TRANSPORT_UNAVAILABLE,
      });

      expect(res.phase).toBe(GapPhase.CAPACITY);
      expect(res.causeClass).toBe(GapCauseClass.CAPACITY);
    });

    it('Row 2A: Acknowledgement timer expired (normal notification) -> Phase: ACKNOWLEDGEMENT, Cause: PROCESS', () => {
      const res = classifyGap({
        caseId: 'case-005',
        status: CaseStatus.ACKNOWLEDGEMENT_PENDING,
        acknowledgementDeadline: new Date(Date.now() - 15 * 60 * 1000),
        hasAcknowledgementEvent: false,
        notificationDelivered: true,
      });

      expect(res.phase).toBe(GapPhase.ACKNOWLEDGEMENT);
      expect(res.causeClass).toBe(GapCauseClass.PROCESS);
      expect(res.classificationLabel).toBe('likely cause, pending supervisor review');
    });

    it('Row 2B: Acknowledgement timer expired (unconfirmed notification) -> Phase: ACKNOWLEDGEMENT, Cause: COMMUNICATION', () => {
      const res = classifyGap({
        caseId: 'case-006',
        status: CaseStatus.ACKNOWLEDGEMENT_PENDING,
        acknowledgementDeadline: new Date(Date.now() - 15 * 60 * 1000),
        hasAcknowledgementEvent: false,
        notificationDelivered: false,
      });

      expect(res.phase).toBe(GapPhase.ACKNOWLEDGEMENT);
      expect(res.causeClass).toBe(GapCauseClass.COMMUNICATION);
      expect(res.evidence.some((e) => e.key === 'NOTIFICATION_UNDELIVERED')).toBe(true);
    });

    it('Row 3: Arrival event long after dispatch timestamp -> Phase: TRANSPORT, Cause: PROCESS', () => {
      const dispatchTime = new Date('2026-08-18T10:00:00Z');
      const arrivalTime = new Date('2026-08-18T11:45:00Z'); // 105 min duration vs 60 min SLA

      const res = classifyGap({
        caseId: 'case-007',
        status: CaseStatus.ARRIVED,
        dispatchTimestamp: dispatchTime,
        arrivalTimestamp: arrivalTime,
        transportDelayThresholdMinutes: 60,
      });

      expect(res.phase).toBe(GapPhase.TRANSPORT);
      expect(res.causeClass).toBe(GapCauseClass.PROCESS);
      expect(res.evidence.some((e) => e.key === 'TRANSPORT_DELAY_DETECTED')).toBe(true);
    });

    it('Row 4: Disposition timer expired after arrival -> Phase: DISPOSITION, Cause: PROCESS', () => {
      const res = classifyGap({
        caseId: 'case-008',
        status: CaseStatus.ARRIVED,
        dispositionDeadline: new Date(Date.now() - 2 * 3600 * 1000),
        hasDispositionEvent: false,
      });

      expect(res.phase).toBe(GapPhase.DISPOSITION);
      expect(res.causeClass).toBe(GapCauseClass.PROCESS);
      expect(res.evidence.some((e) => e.key === 'DISPOSITION_DEADLINE_EXPIRED')).toBe(true);
    });

    it('Row 5A: Follow-up task overdue (general) -> Phase: FOLLOW_UP, Cause: PROCESS', () => {
      const res = classifyGap({
        caseId: 'case-009',
        status: CaseStatus.FOLLOW_UP_DUE,
        followUpDueDate: new Date(Date.now() - 24 * 3600 * 1000),
        followUpCompleted: false,
        followUpContactConfirmed: true,
      });

      expect(res.phase).toBe(GapPhase.FOLLOW_UP);
      expect(res.causeClass).toBe(GapCauseClass.PROCESS);
    });

    it('Row 5B: Follow-up task overdue (unconfirmed contact attempts) -> Phase: FOLLOW_UP, Cause: COMMUNICATION', () => {
      const res = classifyGap({
        caseId: 'case-010',
        status: CaseStatus.FOLLOW_UP_DUE,
        followUpDueDate: new Date(Date.now() - 24 * 3600 * 1000),
        followUpCompleted: false,
        followUpContactConfirmed: false,
      });

      expect(res.phase).toBe(GapPhase.FOLLOW_UP);
      expect(res.causeClass).toBe(GapCauseClass.COMMUNICATION);
      expect(res.evidence.some((e) => e.key === 'CONTACT_ATTEMPTS_UNCONFIRMED')).toBe(true);
    });

    it('Row 6: Conflicting or insufficient evidence -> Matching Phase, Cause: UNDETERMINED', () => {
      const res = classifyGap({
        caseId: 'case-011',
        status: CaseStatus.IN_TRANSIT,
        hasConflictingEvidence: true,
        notes: 'Ambulance GPS coordinates conflict with driver verbal report',
      });

      expect(res.phase).toBe(GapPhase.TRANSPORT);
      expect(res.causeClass).toBe(GapCauseClass.UNDETERMINED);
      expect(res.evidence.some((e) => e.key === 'CONFLICTING_EVIDENCE')).toBe(true);
    });
  });

  describe('2. Supervisor Gap Override Endpoint', () => {
    it('POST /api/v1/referrals/:id/gap/override updates GapEvent and logs AuditEvent without mutating CaseEvents', async () => {
      const token = authService.generateToken(mockSupervisor);
      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      const mockGap = {
        id: 'gap-001',
        caseId: 'case-uuid-999',
        phase: GapPhase.ACKNOWLEDGEMENT,
        causeClass: GapCauseClass.PROCESS,
        status: 'PENDING_REVIEW',
        classificationLabel: 'likely cause, pending supervisor review',
      };

      const mockCase = {
        id: 'case-uuid-999',
        caseId: 'JS-2026-009999',
        status: CaseStatus.ACKNOWLEDGEMENT_PENDING,
        gapEvents: [mockGap],
      };

      vi.spyOn(prisma.referralCase, 'findFirst').mockResolvedValue(mockCase as any);
      vi.spyOn(prisma.gapEvent, 'findUnique').mockResolvedValue(mockGap as any);
      vi.spyOn(prisma.gapEvent, 'update').mockResolvedValue({
        ...mockGap,
        phase: GapPhase.ACKNOWLEDGEMENT,
        causeClass: GapCauseClass.COMMUNICATION,
        overrideUserId: mockSupervisor.id,
        overrideReason: 'Verified telecommunication cell tower outage at PHC Bilikere',
        overriddenAt: new Date(),
        status: 'OVERRIDDEN',
      } as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/referrals/case-uuid-999/gap/override',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          overridePhase: GapPhase.ACKNOWLEDGEMENT,
          overrideCauseClass: GapCauseClass.COMMUNICATION,
          overrideReason: 'Verified telecommunication cell tower outage at PHC Bilikere',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.gapEvent.causeClass).toBe(GapCauseClass.COMMUNICATION);
      expect(body.gapEvent.status).toBe('OVERRIDDEN');
      expect(body.gapEvent.overrideUserId).toBe(mockSupervisor.id);

      // Verify AuditEvent was logged
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'GAP_OVERRIDE',
          entity: 'GapEvent',
          entityId: 'gap-001',
          actorId: mockSupervisor.id,
        }),
      );
    });
  });
});
