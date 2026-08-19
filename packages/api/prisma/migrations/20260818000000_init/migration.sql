-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FRONTLINE_WORKER', 'SENDING_FACILITY', 'RECEIVING_FACILITY', 'CLINICIAN', 'DISTRICT_SUPERVISOR', 'STATE_OFFICER', 'ADMINISTRATOR', 'CLINICAL_ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGEMENT_PENDING', 'ACCEPTED', 'REDIRECTED', 'REJECTED', 'REDIRECT_SUGGESTED', 'REROUTED', 'IN_TRANSIT', 'ARRIVED', 'CLINICAL_DISPOSITION_RECORDED', 'DISCHARGED', 'FOLLOW_UP_DUE', 'FOLLOW_UP_COMPLETED', 'FOLLOW_UP_ESCALATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "GapPhase" AS ENUM ('ACKNOWLEDGEMENT', 'TRANSPORT', 'CAPACITY', 'DISPOSITION', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "GapCauseClass" AS ENUM ('CAPACITY', 'PROCESS', 'COMMUNICATION', 'UNDETERMINED');

-- CreateEnum
CREATE TYPE "CapacityReasonCode" AS ENUM ('NO_BED', 'SERVICE_UNAVAILABLE', 'NO_CLINICIAN', 'TRANSPORT_UNAVAILABLE', 'OTHER');

-- CreateEnum
CREATE TYPE "DispositionCategory" AS ENUM ('ADMITTED', 'TRANSFERRED_OUT', 'DISCHARGED_HOME', 'EXPIRED', 'LAMA');

-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('HOME_VISIT', 'PHONE_CHECK', 'FACILITY_VISIT');

-- CreateEnum
CREATE TYPE "FollowUpOutcome" AS ENUM ('COMPLETED', 'PATIENT_NOT_FOUND', 'PATIENT_REFUSED', 'REFERRED_ONWARD');

-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "PlaybookStepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'TRANSITION', 'OVERRIDE', 'ESCALATION', 'RE_ROUTE', 'PLAYBOOK_STEP', 'GAP_CLASSIFIED', 'GAP_OVERRIDE', 'SYNC');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "facilityId" TEXT,
    "district" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKn" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "districtKn" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "specialties" TEXT[],
    "capacityBeds" INTEGER NOT NULL DEFAULT 0,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientReference" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "nameHash" TEXT NOT NULL,
    "age" INTEGER,
    "gravida" INTEGER,
    "parity" INTEGER,
    "lmp" TIMESTAMP(3),
    "edd" TIMESTAMP(3),
    "riskFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCase" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "sendingFacilityId" TEXT NOT NULL,
    "receivingFacilityId" TEXT,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "status" "CaseStatus" NOT NULL DEFAULT 'DRAFT',
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "riskFlags" TEXT[],
    "transportNeeded" BOOLEAN NOT NULL DEFAULT false,
    "transportMode" TEXT,
    "clinicalSummary" TEXT,
    "acknowledgementDeadline" TIMESTAMP(3),
    "dispositionDeadline" TIMESTAMP(3),
    "followUpDueDate" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromStatus" "CaseStatus",
    "toStatus" "CaseStatus" NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" "Role" NOT NULL,
    "facilityId" TEXT,
    "idempotencyKey" TEXT,
    "requestId" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacitySignal" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "caseId" TEXT,
    "reasonCode" "CapacityReasonCode" NOT NULL,
    "reportedById" TEXT NOT NULL,
    "unitId" TEXT,
    "serviceName" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapacitySignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GapEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "facilityId" TEXT,
    "phase" "GapPhase" NOT NULL,
    "causeClass" "GapCauseClass" NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "classificationLabel" TEXT NOT NULL DEFAULT 'likely cause, pending supervisor review',
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "overrideUserId" TEXT,
    "overrideReason" TEXT,
    "overriddenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GapEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutingSuggestion" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "suggestedFacilityId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,
    "reasons" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutingSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escalation" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "gapEventId" TEXT NOT NULL,
    "playbookId" TEXT NOT NULL,
    "status" "EscalationStatus" NOT NULL DEFAULT 'OPEN',
    "assigneeId" TEXT,
    "currentStepIndex" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "Escalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Playbook" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKn" TEXT NOT NULL,
    "description" TEXT,
    "triggerPhase" "GapPhase" NOT NULL,
    "triggerCause" "GapCauseClass" NOT NULL,
    "stepTemplates" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybookStep" (
    "id" TEXT NOT NULL,
    "escalationId" TEXT NOT NULL,
    "playbookId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionKn" TEXT NOT NULL,
    "assigneeRole" "Role" NOT NULL,
    "slaHours" INTEGER NOT NULL DEFAULT 4,
    "status" "PlaybookStepStatus" NOT NULL DEFAULT 'PENDING',
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "evidence" JSONB,
    "startedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaybookStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disposition" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "category" "DispositionCategory" NOT NULL,
    "detail" TEXT,
    "transferredToFacilityId" TEXT,
    "recordedById" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Disposition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpTask" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" "FollowUpType" NOT NULL DEFAULT 'HOME_VISIT',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "outcome" "FollowUpOutcome",
    "notes" TEXT,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "escalatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlackspotIndicator" (
    "id" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "facilityId" TEXT NOT NULL,
    "facilityType" TEXT NOT NULL,
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "rejectionsCount" INTEGER NOT NULL DEFAULT 0,
    "capacitySignalsCount" INTEGER NOT NULL DEFAULT 0,
    "reroutingCount" INTEGER NOT NULL DEFAULT 0,
    "rejectionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "reasonsBreakdown" JSONB NOT NULL DEFAULT '{}',
    "medianAckMinutes" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlackspotIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" "Role",
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "requestId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuration" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionKn" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "requiresClinicalApproval" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_facilityId_idx" ON "User"("facilityId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Facility_district_idx" ON "Facility"("district");

-- CreateIndex
CREATE INDEX "Facility_type_idx" ON "Facility"("type");

-- CreateIndex
CREATE UNIQUE INDEX "PatientReference_externalId_key" ON "PatientReference"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCase_caseId_key" ON "ReferralCase"("caseId");

-- CreateIndex
CREATE INDEX "ReferralCase_patientId_idx" ON "ReferralCase"("patientId");

-- CreateIndex
CREATE INDEX "ReferralCase_sendingFacilityId_idx" ON "ReferralCase"("sendingFacilityId");

-- CreateIndex
CREATE INDEX "ReferralCase_receivingFacilityId_idx" ON "ReferralCase"("receivingFacilityId");

-- CreateIndex
CREATE INDEX "ReferralCase_status_idx" ON "ReferralCase"("status");

-- CreateIndex
CREATE INDEX "ReferralCase_createdById_idx" ON "ReferralCase"("createdById");

-- CreateIndex
CREATE INDEX "ReferralCase_assignedToId_idx" ON "ReferralCase"("assignedToId");

-- CreateIndex
CREATE INDEX "ReferralCase_createdAt_idx" ON "ReferralCase"("createdAt");

-- CreateIndex
CREATE INDEX "CaseEvent_caseId_idx" ON "CaseEvent"("caseId");

-- CreateIndex
CREATE INDEX "CaseEvent_type_idx" ON "CaseEvent"("type");

-- CreateIndex
CREATE INDEX "CaseEvent_actorId_idx" ON "CaseEvent"("actorId");

-- CreateIndex
CREATE INDEX "CaseEvent_createdAt_idx" ON "CaseEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CaseEvent_idempotencyKey_key" ON "CaseEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CapacitySignal_facilityId_idx" ON "CapacitySignal"("facilityId");

-- CreateIndex
CREATE INDEX "CapacitySignal_caseId_idx" ON "CapacitySignal"("caseId");

-- CreateIndex
CREATE INDEX "CapacitySignal_reasonCode_idx" ON "CapacitySignal"("reasonCode");

-- CreateIndex
CREATE INDEX "CapacitySignal_createdAt_idx" ON "CapacitySignal"("createdAt");

-- CreateIndex
CREATE INDEX "GapEvent_caseId_idx" ON "GapEvent"("caseId");

-- CreateIndex
CREATE INDEX "GapEvent_facilityId_idx" ON "GapEvent"("facilityId");

-- CreateIndex
CREATE INDEX "GapEvent_phase_idx" ON "GapEvent"("phase");

-- CreateIndex
CREATE INDEX "GapEvent_causeClass_idx" ON "GapEvent"("causeClass");

-- CreateIndex
CREATE INDEX "GapEvent_status_idx" ON "GapEvent"("status");

-- CreateIndex
CREATE INDEX "GapEvent_createdAt_idx" ON "GapEvent"("createdAt");

-- CreateIndex
CREATE INDEX "RoutingSuggestion_caseId_idx" ON "RoutingSuggestion"("caseId");

-- CreateIndex
CREATE INDEX "RoutingSuggestion_status_idx" ON "RoutingSuggestion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RoutingSuggestion_caseId_suggestedFacilityId_key" ON "RoutingSuggestion"("caseId", "suggestedFacilityId");

-- CreateIndex
CREATE UNIQUE INDEX "Escalation_gapEventId_key" ON "Escalation"("gapEventId");

-- CreateIndex
CREATE INDEX "Escalation_caseId_idx" ON "Escalation"("caseId");

-- CreateIndex
CREATE INDEX "Escalation_status_idx" ON "Escalation"("status");

-- CreateIndex
CREATE INDEX "Escalation_assigneeId_idx" ON "Escalation"("assigneeId");

-- CreateIndex
CREATE UNIQUE INDEX "Escalation_caseId_gapEventId_key" ON "Escalation"("caseId", "gapEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Playbook_triggerPhase_triggerCause_key" ON "Playbook"("triggerPhase", "triggerCause");

-- CreateIndex
CREATE INDEX "PlaybookStep_escalationId_idx" ON "PlaybookStep"("escalationId");

-- CreateIndex
CREATE INDEX "PlaybookStep_stepOrder_idx" ON "PlaybookStep"("stepOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PlaybookStep_escalationId_stepOrder_key" ON "PlaybookStep"("escalationId", "stepOrder");

-- CreateIndex
CREATE INDEX "Disposition_caseId_idx" ON "Disposition"("caseId");

-- CreateIndex
CREATE INDEX "Disposition_category_idx" ON "Disposition"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Disposition_caseId_key" ON "Disposition"("caseId");

-- CreateIndex
CREATE INDEX "FollowUpTask_caseId_idx" ON "FollowUpTask"("caseId");

-- CreateIndex
CREATE INDEX "FollowUpTask_ownerId_idx" ON "FollowUpTask"("ownerId");

-- CreateIndex
CREATE INDEX "FollowUpTask_dueDate_idx" ON "FollowUpTask"("dueDate");

-- CreateIndex
CREATE INDEX "FollowUpTask_escalated_idx" ON "FollowUpTask"("escalated");

-- CreateIndex
CREATE INDEX "BlackspotIndicator_district_idx" ON "BlackspotIndicator"("district");

-- CreateIndex
CREATE INDEX "BlackspotIndicator_weekStart_idx" ON "BlackspotIndicator"("weekStart");

-- CreateIndex
CREATE INDEX "BlackspotIndicator_facilityId_idx" ON "BlackspotIndicator"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "BlackspotIndicator_facilityId_weekStart_key" ON "BlackspotIndicator"("facilityId", "weekStart");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_idx" ON "AuditEvent"("actorId");

-- CreateIndex
CREATE INDEX "AuditEvent_entity_entityId_idx" ON "AuditEvent"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_action_idx" ON "AuditEvent"("action");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Configuration_key_key" ON "Configuration"("key");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCase" ADD CONSTRAINT "ReferralCase_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientReference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCase" ADD CONSTRAINT "ReferralCase_sendingFacilityId_fkey" FOREIGN KEY ("sendingFacilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCase" ADD CONSTRAINT "ReferralCase_receivingFacilityId_fkey" FOREIGN KEY ("receivingFacilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCase" ADD CONSTRAINT "ReferralCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCase" ADD CONSTRAINT "ReferralCase_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ReferralCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitySignal" ADD CONSTRAINT "CapacitySignal_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitySignal" ADD CONSTRAINT "CapacitySignal_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ReferralCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitySignal" ADD CONSTRAINT "CapacitySignal_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GapEvent" ADD CONSTRAINT "GapEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ReferralCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GapEvent" ADD CONSTRAINT "GapEvent_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingSuggestion" ADD CONSTRAINT "RoutingSuggestion_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ReferralCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutingSuggestion" ADD CONSTRAINT "RoutingSuggestion_suggestedFacilityId_fkey" FOREIGN KEY ("suggestedFacilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ReferralCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_gapEventId_fkey" FOREIGN KEY ("gapEventId") REFERENCES "GapEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybookStep" ADD CONSTRAINT "PlaybookStep_escalationId_fkey" FOREIGN KEY ("escalationId") REFERENCES "Escalation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybookStep" ADD CONSTRAINT "PlaybookStep_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybookStep" ADD CONSTRAINT "PlaybookStep_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disposition" ADD CONSTRAINT "Disposition_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ReferralCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disposition" ADD CONSTRAINT "Disposition_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ReferralCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlackspotIndicator" ADD CONSTRAINT "BlackspotIndicator_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
