export enum CaseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  ACKNOWLEDGEMENT_PENDING = 'ACKNOWLEDGEMENT_PENDING',
  ACCEPTED = 'ACCEPTED',
  REDIRECTED = 'REDIRECTED',
  REJECTED = 'REJECTED',
  REDIRECT_SUGGESTED = 'REDIRECT_SUGGESTED',
  REROUTED = 'REROUTED',
  IN_TRANSIT = 'IN_TRANSIT',
  ARRIVED = 'ARRIVED',
  CLINICAL_DISPOSITION_RECORDED = 'CLINICAL_DISPOSITION_RECORDED',
  DISCHARGED = 'DISCHARGED',
  FOLLOW_UP_DUE = 'FOLLOW_UP_DUE',
  FOLLOW_UP_COMPLETED = 'FOLLOW_UP_COMPLETED',
  FOLLOW_UP_ESCALATED = 'FOLLOW_UP_ESCALATED',
  CLOSED = 'CLOSED',
}

export enum CaseEventType {
  CREATED = 'CREATED',
  SUBMITTED = 'SUBMITTED',
  ACCEPTED = 'ACCEPTED',
  REDIRECTED = 'REDIRECTED',
  REJECTED = 'REJECTED',
  REDIRECT_SUGGESTED = 'REDIRECT_SUGGESTED',
  REROUTED = 'REROUTED',
  DISPATCHED = 'DISPATCHED',
  ARRIVED = 'ARRIVED',
  CLINICAL_DISPOSITION_RECORDED = 'CLINICAL_DISPOSITION_RECORDED',
  DISCHARGED = 'DISCHARGED',
  FOLLOW_UP_DUE = 'FOLLOW_UP_DUE',
  FOLLOW_UP_COMPLETED = 'FOLLOW_UP_COMPLETED',
  FOLLOW_UP_ESCALATED = 'FOLLOW_UP_ESCALATED',
  CLOSED = 'CLOSED',
}

export enum Role {
  FRONTLINE_WORKER = 'FRONTLINE_WORKER',
  SENDING_FACILITY = 'SENDING_FACILITY',
  RECEIVING_FACILITY = 'RECEIVING_FACILITY',
  CLINICIAN = 'CLINICIAN',
  DISTRICT_SUPERVISOR = 'DISTRICT_SUPERVISOR',
  ADMINISTRATOR = 'ADMINISTRATOR',
  CLINICAL_ADMINISTRATOR = 'CLINICAL_ADMINISTRATOR',
}

export interface TransitionInput {
  currentState: CaseStatus;
  event: CaseEventType;
  actorRole: Role;
  payload?: Record<string, unknown>;
}

export interface TransitionResult {
  nextState: CaseStatus;
  event: CaseEventType;
  allowed: boolean;
  error?: string;
}

export type StateMachineDefinition = ReadonlyMap<CaseStatus, ReadonlyMap<CaseEventType, CaseStatus>>;

export const VALID_TRANSITIONS: StateMachineDefinition = new Map<CaseStatus, ReadonlyMap<CaseEventType, CaseStatus>>([
  [CaseStatus.DRAFT, new Map([[CaseEventType.SUBMITTED, CaseStatus.SUBMITTED]])],
  [CaseStatus.SUBMITTED, new Map([[CaseEventType.CREATED, CaseStatus.ACKNOWLEDGEMENT_PENDING]])],
  [
    CaseStatus.ACKNOWLEDGEMENT_PENDING,
    new Map([
      [CaseEventType.ACCEPTED, CaseStatus.ACCEPTED],
      [CaseEventType.REDIRECTED, CaseStatus.REDIRECTED],
      [CaseEventType.REJECTED, CaseStatus.REJECTED],
    ]),
  ],
  [CaseStatus.REJECTED, new Map([[CaseEventType.REDIRECT_SUGGESTED, CaseStatus.REDIRECT_SUGGESTED]])],
  [CaseStatus.REDIRECT_SUGGESTED, new Map([[CaseEventType.REROUTED, CaseStatus.REROUTED]])],
  [CaseStatus.REROUTED, new Map([[CaseEventType.CREATED, CaseStatus.ACKNOWLEDGEMENT_PENDING]])],
  [CaseStatus.ACCEPTED, new Map([[CaseEventType.DISPATCHED, CaseStatus.IN_TRANSIT]])],
  [CaseStatus.IN_TRANSIT, new Map([[CaseEventType.ARRIVED, CaseStatus.ARRIVED]])],
  [CaseStatus.ARRIVED, new Map([[CaseEventType.CLINICAL_DISPOSITION_RECORDED, CaseStatus.CLINICAL_DISPOSITION_RECORDED]])],
  [CaseStatus.CLINICAL_DISPOSITION_RECORDED, new Map([[CaseEventType.DISCHARGED, CaseStatus.DISCHARGED]])],
  [CaseStatus.DISCHARGED, new Map([[CaseEventType.FOLLOW_UP_DUE, CaseStatus.FOLLOW_UP_DUE]])],
  [
    CaseStatus.FOLLOW_UP_DUE,
    new Map([
      [CaseEventType.FOLLOW_UP_COMPLETED, CaseStatus.FOLLOW_UP_COMPLETED],
      [CaseEventType.FOLLOW_UP_ESCALATED, CaseStatus.FOLLOW_UP_ESCALATED],
    ]),
  ],
  [CaseStatus.FOLLOW_UP_COMPLETED, new Map([[CaseEventType.CLOSED, CaseStatus.CLOSED]])],
  [CaseStatus.FOLLOW_UP_ESCALATED, new Map([[CaseEventType.CLOSED, CaseStatus.CLOSED]])],
  [CaseStatus.REDIRECTED, new Map([[CaseEventType.CREATED, CaseStatus.ACKNOWLEDGEMENT_PENDING]])],
]);

export const ROLE_PERMISSIONS: ReadonlyMap<CaseEventType, readonly Role[]> = new Map([
  [CaseEventType.SUBMITTED, [Role.FRONTLINE_WORKER]],
  [CaseEventType.CREATED, [Role.SENDING_FACILITY, Role.RECEIVING_FACILITY]],
  [CaseEventType.ACCEPTED, [Role.RECEIVING_FACILITY]],
  [CaseEventType.REDIRECTED, [Role.RECEIVING_FACILITY]],
  [CaseEventType.REJECTED, [Role.RECEIVING_FACILITY]],
  [CaseEventType.REDIRECT_SUGGESTED, [Role.DISTRICT_SUPERVISOR, Role.SENDING_FACILITY]],
  [CaseEventType.REROUTED, [Role.DISTRICT_SUPERVISOR, Role.SENDING_FACILITY]],
  [CaseEventType.DISPATCHED, [Role.SENDING_FACILITY, Role.FRONTLINE_WORKER]],
  [CaseEventType.ARRIVED, [Role.RECEIVING_FACILITY, Role.CLINICIAN]],
  [CaseEventType.CLINICAL_DISPOSITION_RECORDED, [Role.CLINICIAN, Role.RECEIVING_FACILITY]],
  [CaseEventType.DISCHARGED, [Role.CLINICIAN, Role.RECEIVING_FACILITY]],
  [CaseEventType.FOLLOW_UP_DUE, [Role.CLINICIAN, Role.RECEIVING_FACILITY, Role.FRONTLINE_WORKER]],
  [CaseEventType.FOLLOW_UP_COMPLETED, [Role.FRONTLINE_WORKER, Role.CLINICIAN]],
  [CaseEventType.FOLLOW_UP_ESCALATED, [Role.FRONTLINE_WORKER, Role.DISTRICT_SUPERVISOR]],
  [CaseEventType.CLOSED, [Role.CLINICIAN, Role.DISTRICT_SUPERVISOR, Role.ADMINISTRATOR]],
]);

export class StateMachineError extends Error {
  constructor(
    message: string,
    public readonly currentState: CaseStatus,
    public readonly event: CaseEventType,
    public readonly actorRole: Role
  ) {
    super(message);
    this.name = 'StateMachineError';
  }
}

export function applyTransition(input: TransitionInput): TransitionResult {
  const { currentState, event, actorRole } = input;

  const allowedRoles = ROLE_PERMISSIONS.get(event);
  if (allowedRoles && !allowedRoles.includes(actorRole)) {
    return {
      nextState: currentState,
      event,
      allowed: false,
      error: `Role ${actorRole} not authorized for event ${event}`,
    };
  }

  const stateTransitions = VALID_TRANSITIONS.get(currentState);
  if (!stateTransitions) {
    return {
      nextState: currentState,
      event,
      allowed: false,
      error: `No transitions defined from state ${currentState}`,
    };
  }

  const nextState = stateTransitions.get(event);
  if (!nextState) {
    return {
      nextState: currentState,
      event,
      allowed: false,
      error: `Invalid transition: ${currentState} --${event}--> ?`,
    };
  }

  return {
    nextState,
    event,
    allowed: true,
  };
}

export function getValidEvents(currentState: CaseStatus): readonly CaseEventType[] {
  const stateTransitions = VALID_TRANSITIONS.get(currentState);
  if (!stateTransitions) return [];
  return Array.from(stateTransitions.keys());
}

export function canTransition(currentState: CaseStatus, event: CaseEventType): boolean {
  const stateTransitions = VALID_TRANSITIONS.get(currentState);
  return stateTransitions?.has(event) ?? false;
}

export function getNextState(currentState: CaseStatus, event: CaseEventType): CaseStatus | null {
  const stateTransitions = VALID_TRANSITIONS.get(currentState);
  return stateTransitions?.get(event) ?? null;
}

export function isTerminalState(state: CaseStatus): boolean {
  return state === CaseStatus.CLOSED;
}

export function isInitialState(state: CaseStatus): boolean {
  return state === CaseStatus.DRAFT;
}