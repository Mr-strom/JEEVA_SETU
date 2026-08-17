import { describe, it, expect } from 'vitest';
import {
  CaseStatus,
  CaseEventType,
  Role,
  applyTransition,
  canTransition,
  getNextState,
  getValidEvents,
  isTerminalState,
  isInitialState,
  StateMachineError,
} from '../state-machine';

describe('State Machine - Valid Transitions', () => {
  const validTransitions: Array<{
    from: CaseStatus;
    event: CaseEventType;
    to: CaseStatus;
    roles: Role[];
  }> = [
    { from: CaseStatus.DRAFT, event: CaseEventType.SUBMITTED, to: CaseStatus.SUBMITTED, roles: [Role.FRONTLINE_WORKER] },
    { from: CaseStatus.SUBMITTED, event: CaseEventType.CREATED, to: CaseStatus.ACKNOWLEDGEMENT_PENDING, roles: [Role.SENDING_FACILITY, Role.RECEIVING_FACILITY] },
    { from: CaseStatus.ACKNOWLEDGEMENT_PENDING, event: CaseEventType.ACCEPTED, to: CaseStatus.ACCEPTED, roles: [Role.RECEIVING_FACILITY] },
    { from: CaseStatus.ACKNOWLEDGEMENT_PENDING, event: CaseEventType.REDIRECTED, to: CaseStatus.REDIRECTED, roles: [Role.RECEIVING_FACILITY] },
    { from: CaseStatus.ACKNOWLEDGEMENT_PENDING, event: CaseEventType.REJECTED, to: CaseStatus.REJECTED, roles: [Role.RECEIVING_FACILITY] },
    { from: CaseStatus.REJECTED, event: CaseEventType.REDIRECT_SUGGESTED, to: CaseStatus.REDIRECT_SUGGESTED, roles: [Role.DISTRICT_SUPERVISOR, Role.SENDING_FACILITY] },
    { from: CaseStatus.REDIRECT_SUGGESTED, event: CaseEventType.REROUTED, to: CaseStatus.REROUTED, roles: [Role.DISTRICT_SUPERVISOR, Role.SENDING_FACILITY] },
    { from: CaseStatus.REROUTED, event: CaseEventType.CREATED, to: CaseStatus.ACKNOWLEDGEMENT_PENDING, roles: [Role.SENDING_FACILITY, Role.RECEIVING_FACILITY] },
    { from: CaseStatus.ACCEPTED, event: CaseEventType.DISPATCHED, to: CaseStatus.IN_TRANSIT, roles: [Role.SENDING_FACILITY, Role.FRONTLINE_WORKER] },
    { from: CaseStatus.IN_TRANSIT, event: CaseEventType.ARRIVED, to: CaseStatus.ARRIVED, roles: [Role.RECEIVING_FACILITY, Role.CLINICIAN] },
    { from: CaseStatus.ARRIVED, event: CaseEventType.CLINICAL_DISPOSITION_RECORDED, to: CaseStatus.CLINICAL_DISPOSITION_RECORDED, roles: [Role.CLINICIAN, Role.RECEIVING_FACILITY] },
    { from: CaseStatus.CLINICAL_DISPOSITION_RECORDED, event: CaseEventType.DISCHARGED, to: CaseStatus.DISCHARGED, roles: [Role.CLINICIAN, Role.RECEIVING_FACILITY] },
    { from: CaseStatus.DISCHARGED, event: CaseEventType.FOLLOW_UP_DUE, to: CaseStatus.FOLLOW_UP_DUE, roles: [Role.CLINICIAN, Role.RECEIVING_FACILITY, Role.FRONTLINE_WORKER] },
    { from: CaseStatus.FOLLOW_UP_DUE, event: CaseEventType.FOLLOW_UP_COMPLETED, to: CaseStatus.FOLLOW_UP_COMPLETED, roles: [Role.FRONTLINE_WORKER, Role.CLINICIAN] },
    { from: CaseStatus.FOLLOW_UP_DUE, event: CaseEventType.FOLLOW_UP_ESCALATED, to: CaseStatus.FOLLOW_UP_ESCALATED, roles: [Role.FRONTLINE_WORKER, Role.DISTRICT_SUPERVISOR] },
    { from: CaseStatus.FOLLOW_UP_COMPLETED, event: CaseEventType.CLOSED, to: CaseStatus.CLOSED, roles: [Role.CLINICIAN, Role.DISTRICT_SUPERVISOR, Role.ADMINISTRATOR] },
    { from: CaseStatus.FOLLOW_UP_ESCALATED, event: CaseEventType.CLOSED, to: CaseStatus.CLOSED, roles: [Role.CLINICIAN, Role.DISTRICT_SUPERVISOR, Role.ADMINISTRATOR] },
    { from: CaseStatus.REDIRECTED, event: CaseEventType.CREATED, to: CaseStatus.ACKNOWLEDGEMENT_PENDING, roles: [Role.SENDING_FACILITY, Role.RECEIVING_FACILITY] },
  ];

  for (const { from, event, to, roles } of validTransitions) {
    for (const role of roles) {
      it(`allows ${from} --${event}--> ${to} for ${role}`, () => {
        const result = applyTransition({ currentState: from, event, actorRole: role });
        expect(result.allowed).toBe(true);
        expect(result.nextState).toBe(to);
        expect(result.error).toBeUndefined();
      });
    }
  }
});

describe('State Machine - Invalid Transitions (at least 5)', () => {
  const invalidTransitions: Array<{
    from: CaseStatus;
    event: CaseEventType;
    role: Role;
    description: string;
  }> = [
    { from: CaseStatus.DRAFT, event: CaseEventType.ACCEPTED, role: Role.RECEIVING_FACILITY, description: 'DRAFT cannot go directly to ACCEPTED' },
    { from: CaseStatus.SUBMITTED, event: CaseEventType.DISPATCHED, role: Role.SENDING_FACILITY, description: 'SUBMITTED cannot go to DISPATCHED' },
    { from: CaseStatus.ACCEPTED, event: CaseEventType.REJECTED, role: Role.RECEIVING_FACILITY, description: 'ACCEPTED cannot be REJECTED' },
    { from: CaseStatus.IN_TRANSIT, event: CaseEventType.CLINICAL_DISPOSITION_RECORDED, role: Role.CLINICIAN, description: 'IN_TRANSIT cannot record disposition' },
    { from: CaseStatus.DISCHARGED, event: CaseEventType.ACCEPTED, role: Role.RECEIVING_FACILITY, description: 'DISCHARGED cannot go back to ACCEPTED' },
    { from: CaseStatus.CLOSED, event: CaseEventType.REOPENED, role: Role.ADMINISTRATOR, description: 'CLOSED is terminal, no REOPENED event exists' },
    { from: CaseStatus.ACKNOWLEDGEMENT_PENDING, event: CaseEventType.DISPATCHED, role: Role.SENDING_FACILITY, description: 'ACKNOWLEDGEMENT_PENDING cannot dispatch' },
    { from: CaseStatus.FOLLOW_UP_DUE, event: CaseEventType.DISPATCHED, role: Role.SENDING_FACILITY, description: 'FOLLOW_UP_DUE cannot dispatch' },
  ];

  for (const { from, event, role, description } of invalidTransitions) {
    it(`rejects ${from} --${event}--> ? for ${role}: ${description}`, () => {
      const result = applyTransition({ currentState: from, event, actorRole: role });
      expect(result.allowed).toBe(false);
      expect(result.nextState).toBe(from);
      expect(result.error).toBeDefined();
    });
  }
});

describe('State Machine - Role Authorization', () => {
  it('rejects SUBMITTED from non-FRONTLINE_WORKER', () => {
    const result = applyTransition({
      currentState: CaseStatus.DRAFT,
      event: CaseEventType.SUBMITTED,
      actorRole: Role.CLINICIAN,
    });
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('not authorized');
  });

  it('rejects ACCEPTED from non-RECEIVING_FACILITY', () => {
    const result = applyTransition({
      currentState: CaseStatus.ACKNOWLEDGEMENT_PENDING,
      event: CaseEventType.ACCEPTED,
      actorRole: Role.FRONTLINE_WORKER,
    });
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('not authorized');
  });

  it('rejects REROUTED from non-authorized role', () => {
    const result = applyTransition({
      currentState: CaseStatus.REDIRECT_SUGGESTED,
      event: CaseEventType.REROUTED,
      actorRole: Role.CLINICIAN,
    });
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('not authorized');
  });

  it('rejects CLOSED from FRONTLINE_WORKER', () => {
    const result = applyTransition({
      currentState: CaseStatus.FOLLOW_UP_COMPLETED,
      event: CaseEventType.CLOSED,
      actorRole: Role.FRONTLINE_WORKER,
    });
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('not authorized');
  });
});

describe('State Machine - Helper Functions', () => {
  it('canTransition returns true for valid transitions', () => {
    expect(canTransition(CaseStatus.DRAFT, CaseEventType.SUBMITTED)).toBe(true);
    expect(canTransition(CaseStatus.ACKNOWLEDGEMENT_PENDING, CaseEventType.ACCEPTED)).toBe(true);
    expect(canTransition(CaseStatus.REJECTED, CaseEventType.REDIRECT_SUGGESTED)).toBe(true);
  });

  it('canTransition returns false for invalid transitions', () => {
    expect(canTransition(CaseStatus.DRAFT, CaseEventType.ACCEPTED)).toBe(false);
    expect(canTransition(CaseStatus.ACCEPTED, CaseEventType.REJECTED)).toBe(false);
    expect(canTransition(CaseStatus.CLOSED, CaseEventType.SUBMITTED)).toBe(false);
  });

  it('getNextState returns correct next state', () => {
    expect(getNextState(CaseStatus.DRAFT, CaseEventType.SUBMITTED)).toBe(CaseStatus.SUBMITTED);
    expect(getNextState(CaseStatus.ACKNOWLEDGEMENT_PENDING, CaseEventType.REJECTED)).toBe(CaseStatus.REJECTED);
    expect(getNextState(CaseStatus.REROUTED, CaseEventType.CREATED)).toBe(CaseStatus.ACKNOWLEDGEMENT_PENDING);
  });

  it('getNextState returns null for invalid transitions', () => {
    expect(getNextState(CaseStatus.DRAFT, CaseEventType.ACCEPTED)).toBeNull();
    expect(getNextState(CaseStatus.CLOSED, CaseEventType.SUBMITTED)).toBeNull();
  });

  it('getValidEvents returns correct events for each state', () => {
    expect(getValidEvents(CaseStatus.DRAFT)).toEqual([CaseEventType.SUBMITTED]);
    expect(getValidEvents(CaseStatus.ACKNOWLEDGEMENT_PENDING)).toEqual([
      CaseEventType.ACCEPTED,
      CaseEventType.REDIRECTED,
      CaseEventType.REJECTED,
    ]);
    expect(getValidEvents(CaseStatus.REJECTED)).toEqual([CaseEventType.REDIRECT_SUGGESTED]);
    expect(getValidEvents(CaseStatus.CLOSED)).toEqual([]);
  });

  it('isTerminalState returns true only for CLOSED', () => {
    expect(isTerminalState(CaseStatus.CLOSED)).toBe(true);
    expect(isTerminalState(CaseStatus.DRAFT)).toBe(false);
    expect(isTerminalState(CaseStatus.FOLLOW_UP_COMPLETED)).toBe(false);
    expect(isTerminalState(CaseStatus.FOLLOW_UP_ESCALATED)).toBe(false);
  });

  it('isInitialState returns true only for DRAFT', () => {
    expect(isInitialState(CaseStatus.DRAFT)).toBe(true);
    expect(isInitialState(CaseStatus.SUBMITTED)).toBe(false);
    expect(isInitialState(CaseStatus.ACKNOWLEDGEMENT_PENDING)).toBe(false);
  });
});

describe('State Machine - Reroute Loop', () => {
  it('completes full reroute loop: REJECTED -> REDIRECT_SUGGESTED -> REROUTED -> ACKNOWLEDGEMENT_PENDING', () => {
    let state = CaseStatus.REJECTED;
    let result = applyTransition({ currentState: state, event: CaseEventType.REDIRECT_SUGGESTED, actorRole: Role.DISTRICT_SUPERVISOR });
    expect(result.allowed).toBe(true);
    state = result.nextState;
    expect(state).toBe(CaseStatus.REDIRECT_SUGGESTED);

    result = applyTransition({ currentState: state, event: CaseEventType.REROUTED, actorRole: Role.DISTRICT_SUPERVISOR });
    expect(result.allowed).toBe(true);
    state = result.nextState;
    expect(state).toBe(CaseStatus.REROUTED);

    result = applyTransition({ currentState: state, event: CaseEventType.CREATED, actorRole: Role.SENDING_FACILITY });
    expect(result.allowed).toBe(true);
    state = result.nextState;
    expect(state).toBe(CaseStatus.ACKNOWLEDGEMENT_PENDING);
  });
});

describe('State Machine - Redirect Path', () => {
  it('handles REDIRECTED path: ACKNOWLEDGEMENT_PENDING -> REDIRECTED -> ACKNOWLEDGEMENT_PENDING', () => {
    let state = CaseStatus.ACKNOWLEDGEMENT_PENDING;
    let result = applyTransition({ currentState: state, event: CaseEventType.REDIRECTED, actorRole: Role.RECEIVING_FACILITY });
    expect(result.allowed).toBe(true);
    state = result.nextState;
    expect(state).toBe(CaseStatus.REDIRECTED);

    result = applyTransition({ currentState: state, event: CaseEventType.CREATED, actorRole: Role.SENDING_FACILITY });
    expect(result.allowed).toBe(true);
    state = result.nextState;
    expect(state).toBe(CaseStatus.ACKNOWLEDGEMENT_PENDING);
  });
});