import { GapPhase, GapCauseClass, CapacityReasonCode } from '@prisma/client';
import { GapClassificationInput, GapClassificationResult, GapEvidenceItem } from './gaps.types';

export const GAPSENSE_LABEL = 'likely cause, pending supervisor review';

/**
 * Pure, deterministic classification function implementing the GapSense rules table exactly.
 * No ML, no LLM calls, 100% reproducible and testable.
 */
export function classifyGap(input: GapClassificationInput): GapClassificationResult {
  const evidence: GapEvidenceItem[] = [];

  // Guard: Conflicting or explicitly insufficient evidence -> matching phase with UNDETERMINED cause
  if (input.hasConflictingEvidence) {
    evidence.push({
      key: 'CONFLICTING_EVIDENCE',
      description: 'Conflicting timestamps or contradictory event logs detected.',
      value: input.notes || 'Evidence is ambiguous or contradictory',
    });

    const phase = inferPhaseFromStatus(input);
    return {
      phase,
      causeClass: GapCauseClass.UNDETERMINED,
      evidence,
      classificationLabel: GAPSENSE_LABEL,
      confidenceScore: 0.5,
    };
  }

  // 1. Rejection with Capacity Reason Code -> Phase: CAPACITY, Cause: CAPACITY
  const capacityReasonCodes: string[] = [
    CapacityReasonCode.NO_BED,
    CapacityReasonCode.SERVICE_UNAVAILABLE,
    CapacityReasonCode.NO_CLINICIAN,
    CapacityReasonCode.TRANSPORT_UNAVAILABLE,
  ];

  if (
    input.capacityReasonCode &&
    capacityReasonCodes.includes(input.capacityReasonCode)
  ) {
    evidence.push({
      key: 'CAPACITY_REJECTION_REASON',
      description: `Facility rejected referral with mandatory reason code: ${input.capacityReasonCode}`,
      eventId: input.rejectionEventId || undefined,
      value: input.capacityReasonCode,
    });

    return {
      phase: GapPhase.CAPACITY,
      causeClass: GapCauseClass.CAPACITY,
      evidence,
      classificationLabel: GAPSENSE_LABEL,
      confidenceScore: 1.0,
    };
  }

  // 2. Acknowledgement timer expired, no response event -> Phase: ACKNOWLEDGEMENT
  if (
    input.acknowledgementDeadline &&
    new Date(input.acknowledgementDeadline) <= new Date() &&
    !input.hasAcknowledgementEvent
  ) {
    evidence.push({
      key: 'ACKNOWLEDGEMENT_DEADLINE_EXPIRED',
      description: `Acknowledgement SLA expired at ${new Date(input.acknowledgementDeadline).toISOString()} without response event.`,
      timestamp: new Date(input.acknowledgementDeadline).toISOString(),
    });

    if (input.notificationDelivered === false) {
      evidence.push({
        key: 'NOTIFICATION_UNDELIVERED',
        description: 'Hospital notification delivery confirmation was not received.',
        value: false,
      });
      return {
        phase: GapPhase.ACKNOWLEDGEMENT,
        causeClass: GapCauseClass.COMMUNICATION,
        evidence,
        classificationLabel: GAPSENSE_LABEL,
        confidenceScore: 1.0,
      };
    }

    return {
      phase: GapPhase.ACKNOWLEDGEMENT,
      causeClass: GapCauseClass.PROCESS,
      evidence,
      classificationLabel: GAPSENSE_LABEL,
      confidenceScore: 1.0,
    };
  }

  // 3. Arrival event long after dispatch timestamp -> Phase: TRANSPORT, Cause: PROCESS
  if (input.dispatchTimestamp && input.arrivalTimestamp) {
    const dispatchTime = new Date(input.dispatchTimestamp).getTime();
    const arrivalTime = new Date(input.arrivalTimestamp).getTime();
    const durationMinutes = Math.round((arrivalTime - dispatchTime) / (60 * 1000));
    const thresholdMinutes = input.transportDelayThresholdMinutes ?? 60; // default 60 min // requires clinical approval

    if (durationMinutes > thresholdMinutes) {
      evidence.push({
        key: 'TRANSPORT_DELAY_DETECTED',
        description: `Patient transport duration of ${durationMinutes} minutes exceeded SLA threshold of ${thresholdMinutes} minutes.`,
        timestamp: new Date(input.arrivalTimestamp).toISOString(),
        value: { durationMinutes, thresholdMinutes },
      });

      return {
        phase: GapPhase.TRANSPORT,
        causeClass: GapCauseClass.PROCESS,
        evidence,
        classificationLabel: GAPSENSE_LABEL,
        confidenceScore: 1.0,
      };
    }
  }

  // 4. Disposition timer expired after arrival -> Phase: DISPOSITION, Cause: PROCESS
  if (
    input.dispositionDeadline &&
    new Date(input.dispositionDeadline) <= new Date() &&
    !input.hasDispositionEvent
  ) {
    evidence.push({
      key: 'DISPOSITION_DEADLINE_EXPIRED',
      description: `Inpatient clinical disposition deadline expired at ${new Date(input.dispositionDeadline).toISOString()} without recorded decision.`,
      timestamp: new Date(input.dispositionDeadline).toISOString(),
    });

    return {
      phase: GapPhase.DISPOSITION,
      causeClass: GapCauseClass.PROCESS,
      evidence,
      classificationLabel: GAPSENSE_LABEL,
      confidenceScore: 1.0,
    };
  }

  // 5. Follow-up task overdue -> Phase: FOLLOW_UP
  if (
    input.followUpDueDate &&
    new Date(input.followUpDueDate) <= new Date() &&
    !input.followUpCompleted
  ) {
    evidence.push({
      key: 'FOLLOW_UP_TASK_OVERDUE',
      description: `Post-discharge follow-up due date ${new Date(input.followUpDueDate).toISOString()} passed without completion record.`,
      timestamp: new Date(input.followUpDueDate).toISOString(),
    });

    if (input.followUpContactConfirmed === false) {
      evidence.push({
        key: 'CONTACT_ATTEMPTS_UNCONFIRMED',
        description: 'Frontline worker contact attempts to reach the family remain unconfirmed.',
        value: false,
      });

      return {
        phase: GapPhase.FOLLOW_UP,
        causeClass: GapCauseClass.COMMUNICATION,
        evidence,
        classificationLabel: GAPSENSE_LABEL,
        confidenceScore: 1.0,
      };
    }

    return {
      phase: GapPhase.FOLLOW_UP,
      causeClass: GapCauseClass.PROCESS,
      evidence,
      classificationLabel: GAPSENSE_LABEL,
      confidenceScore: 1.0,
    };
  }

  // 6. Fallback: Insufficient / Undetermined evidence
  evidence.push({
    key: 'INSUFFICIENT_EVIDENCE',
    description: 'No deterministic threshold breached; insufficient data to establish cause.',
    value: input.status,
  });

  return {
    phase: inferPhaseFromStatus(input),
    causeClass: GapCauseClass.UNDETERMINED,
    evidence,
    classificationLabel: GAPSENSE_LABEL,
    confidenceScore: 0.3,
  };
}

/**
 * Pure helper inferring matching lifecycle phase from current case status
 */
function inferPhaseFromStatus(input: GapClassificationInput): GapPhase {
  switch (input.status) {
    case 'ACKNOWLEDGEMENT_PENDING':
    case 'SUBMITTED':
      return GapPhase.ACKNOWLEDGEMENT;
    case 'IN_TRANSIT':
      return GapPhase.TRANSPORT;
    case 'REJECTED':
    case 'REDIRECTED':
      return GapPhase.CAPACITY;
    case 'ARRIVED':
    case 'CLINICAL_DISPOSITION_RECORDED':
      return GapPhase.DISPOSITION;
    case 'DISCHARGED':
    case 'FOLLOW_UP_DUE':
    case 'FOLLOW_UP_ESCALATED':
      return GapPhase.FOLLOW_UP;
    default:
      return GapPhase.ACKNOWLEDGEMENT;
  }
}
