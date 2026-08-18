import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle,
  CheckCircle2,
  User,
  CheckSquare,
  Sparkles,
  Edit3,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface PlaybookStepData {
  id: string;
  stepOrder: number;
  description: string;
  descriptionKn: string;
  assigneeRole: string;
  slaHours: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  completedAt?: string | null;
  completedByName?: string | null;
  notes?: string | null;
}

interface EscalationData {
  id: string;
  caseId: string;
  caseRef: string;
  patientExternalId: string;
  patientName: string;
  sendingFacility: string;
  receivingFacility: string;
  phase: 'ACKNOWLEDGEMENT' | 'TRANSPORT' | 'CAPACITY' | 'DISPOSITION' | 'FOLLOW_UP';
  causeClass: 'CAPACITY' | 'PROCESS' | 'COMMUNICATION' | 'UNDETERMINED';
  classificationLabel: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  playbookName: string;
  playbookNameKn: string;
  startedAt: string;
  acknowledgedAt?: string | null;
  assigneeName?: string | null;
  gapEventId: string;
  steps: PlaybookStepData[];
}

const DEMO_ESCALATIONS: EscalationData[] = [
  {
    id: 'esc-001',
    caseId: '11111111-1111-1111-1111-111111111111',
    caseRef: 'JS-2026-000101',
    patientExternalId: 'ORS-KA-2026-8812',
    patientName: 'Kavitha R (24 yrs)',
    sendingFacility: 'Bilikere PHC',
    receivingFacility: 'Cheluvamba Hospital',
    phase: 'ACKNOWLEDGEMENT',
    causeClass: 'PROCESS',
    classificationLabel: 'likely cause, pending supervisor review',
    status: 'IN_PROGRESS',
    playbookName: 'Acknowledgement Timeout Protocol',
    playbookNameKn: 'ಸ್ವೀಕೃತಿ ಕಾಲಮಿತಿ ಪ್ರೋಟೋಕಾಲ್',
    startedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    acknowledgedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    assigneeName: 'Dr. Savitha Rao (DHO Mysuru)',
    gapEventId: 'gap-001',
    steps: [
      {
        id: 'step-01',
        stepOrder: 1,
        description: 'Call receiving hospital referral desk landline and confirm duty obstetrics team alerted',
        descriptionKn: 'ಸ್ವೀಕರಿಸುವ ಆಸ್ಪತ್ರೆಯ ರೆಫರಲ್ ಡೆಸ್ಕ್‌ಗೆ ಕರೆ ಮಾಡಿ ತುರ್ತು ಸ್ತ್ರೀರೋಗ ವೈದ್ಯರ ಗಮನಕ್ಕೆ ತನ್ನಿ',
        assigneeRole: 'DISTRICT_SUPERVISOR',
        slaHours: 1,
        status: 'COMPLETED',
        completedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        completedByName: 'Dr. Savitha Rao',
        notes: 'Contacted Dr. Ramesh on duty. Bed allocated in Ward 4.',
      },
      {
        id: 'step-02',
        stepOrder: 2,
        description: 'Verify 108 ambulance GPS location and estimated time of arrival with district transport coordinator',
        descriptionKn: '೧೦೮ ಆಂಬ್ಯುಲೆನ್ಸ್ ಜಿಪಿಎಸ್ ಸ್ಥಳ ಮತ್ತು ತಲುಪುವ ನಿರೀಕ್ಷಿತ ಸಮಯವನ್ನು ಪರಿಶೀಲಿಸಿ',
        assigneeRole: 'DISTRICT_SUPERVISOR',
        slaHours: 2,
        status: 'PENDING',
      },
    ],
  },
  {
    id: 'esc-002',
    caseId: '22222222-2222-2222-2222-222222222202',
    caseRef: 'JS-2026-000102',
    patientExternalId: 'ORS-KA-2026-4491',
    patientName: 'Suma G (28 yrs)',
    sendingFacility: 'Hunsur Taluk Hospital',
    receivingFacility: 'KR Hospital Mysuru',
    phase: 'CAPACITY',
    causeClass: 'CAPACITY',
    classificationLabel: 'likely cause, pending supervisor review',
    status: 'OPEN',
    playbookName: 'Maternity ICU Capacity Rejection Protocol',
    playbookNameKn: 'ಹೆರಿಗೆ ಐಸಿಯು ಸಾಮರ್ಥ್ಯ ಕೊರತೆ ಪ್ರೋಟೋಕಾಲ್',
    startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    gapEventId: 'gap-002',
    steps: [
      {
        id: 'step-03',
        stepOrder: 1,
        description: 'Confirm high-risk obstetrics ICU availability at designated alternate tertiary facility',
        descriptionKn: 'ಪರ್ಯಾಯ ತೃತೀಯ ದರ್ಜೆ ಆಸ್ಪತ್ರೆಯಲ್ಲಿ ತುರ್ತು ಐಸಿಯು ಲಭ್ಯತೆ ಖಚಿತಪಡಿಸಿ',
        assigneeRole: 'DISTRICT_SUPERVISOR',
        slaHours: 1,
        status: 'PENDING',
      },
      {
        id: 'step-04',
        stepOrder: 2,
        description: 'Request supervisor human confirmation for case re-routing and notify 108 dispatch',
        descriptionKn: 'ಉಲ್ಲೇಖವನ್ನು ಮರು ಮಾರ್ಗ ಬದಲಾಯಿಸಲು ದೃಢೀಕರಿಸಿ ಮತ್ತು ೧೦೮ ಆಂಬ್ಯುಲೆನ್ಸ್‌ಗೆ ತಿಳಿಸಿ',
        assigneeRole: 'DISTRICT_SUPERVISOR',
        slaHours: 1,
        status: 'PENDING',
      },
    ],
  },
];

export const SupervisorEscalationsPage: React.FC = () => {
  const { language, t } = useLanguage();
  const { user } = useAuth();

  const [escalations, setEscalations] = useState<EscalationData[]>(DEMO_ESCALATIONS);
  const [selectedEscalationId, setSelectedEscalationId] = useState<string>(DEMO_ESCALATIONS[0].id);

  // Modal States
  const [activeModal, setActiveModal] = useState<'STEP' | 'OVERRIDE' | 'RESOLVE' | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [stepNotes, setStepNotes] = useState<string>('');

  const [overridePhase, setOverridePhase] = useState<'ACKNOWLEDGEMENT' | 'TRANSPORT' | 'CAPACITY' | 'DISPOSITION' | 'FOLLOW_UP'>('ACKNOWLEDGEMENT');
  const [overrideCause, setOverrideCause] = useState<'CAPACITY' | 'PROCESS' | 'COMMUNICATION' | 'UNDETERMINED'>('COMMUNICATION');
  const [overrideReason, setOverrideReason] = useState<string>('');

  const [resolutionSummary, setResolutionSummary] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const selectedEscalation = escalations.find((e) => e.id === selectedEscalationId) || escalations[0];

  const handleAcknowledge = async () => {
    setSubmitting(true);
    try {
      setEscalations((prev) =>
        prev.map((e) =>
          e.id === selectedEscalation.id
            ? {
                ...e,
                status: 'IN_PROGRESS',
                acknowledgedAt: new Date().toISOString(),
                assigneeName: user.name,
              }
            : e,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteStep = async () => {
    if (!activeStepId) return;
    setSubmitting(true);
    try {
      setEscalations((prev) =>
        prev.map((e) =>
          e.id === selectedEscalation.id
            ? {
                ...e,
                steps: e.steps.map((s) =>
                  s.id === activeStepId
                    ? {
                        ...s,
                        status: 'COMPLETED',
                        completedAt: new Date().toISOString(),
                        completedByName: user.name,
                        notes: stepNotes.trim() || undefined,
                      }
                    : s,
                ),
              }
            : e,
        ),
      );
      setActiveModal(null);
      setStepNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideReason.trim()) return;
    setSubmitting(true);
    try {
      setEscalations((prev) =>
        prev.map((e) =>
          e.id === selectedEscalation.id
            ? {
                ...e,
                phase: overridePhase,
                causeClass: overrideCause,
              }
            : e,
        ),
      );
      setActiveModal(null);
      setOverrideReason('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!resolutionSummary.trim()) return;
    setSubmitting(true);
    try {
      setEscalations((prev) =>
        prev.map((e) =>
          e.id === selectedEscalation.id
            ? {
                ...e,
                status: 'RESOLVED',
              }
            : e,
        ),
      );
      setActiveModal(null);
      setResolutionSummary('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>
          {t('escalationsTitle')}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-sub)' }}>{t('escalationsSubtitle')}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Escalations List */}
        <div>
          {escalations.map((esc) => {
            const isSelected = esc.id === selectedEscalation.id;
            return (
              <div
                key={esc.id}
                onClick={() => setSelectedEscalationId(esc.id)}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: `1.5px solid ${isSelected ? 'var(--border-active)' : 'var(--border-app)'}`,
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '12px',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 0 12px rgba(59, 130, 246, 0.2)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--border-active)', fontSize: '15px' }}>
                    {esc.caseRef}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: esc.status === 'OPEN' ? 'rgba(239, 68, 68, 0.2)' : esc.status === 'IN_PROGRESS' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: esc.status === 'OPEN' ? '#FCA5A5' : esc.status === 'IN_PROGRESS' ? '#FDE68A' : '#A7F3D0',
                      border: `1px solid ${esc.status === 'OPEN' ? '#EF4444' : esc.status === 'IN_PROGRESS' ? '#F59E0B' : '#10B981'}`,
                    }}
                  >
                    {esc.status}
                  </span>
                </div>

                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                  {esc.patientName} ({esc.patientExternalId})
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '8px' }}>
                  {esc.sendingFacility} ➔ {esc.receivingFacility}
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, backgroundColor: 'var(--bg-app)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-app)' }}>
                    {esc.phase}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, backgroundColor: 'rgba(220, 38, 38, 0.15)', color: '#FCA5A5', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(220, 38, 38, 0.3)' }}>
                    {esc.causeClass}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Escalation Detailed Work Area */}
        {selectedEscalation && (
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-app)', borderRadius: '12px', padding: '24px' }}>
            {/* Top Details & Case Link */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--border-app)', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{selectedEscalation.caseRef}</h2>
                  <Link to={`/cases/${selectedEscalation.caseId}`} style={{ fontSize: '13px', color: 'var(--border-active)', textDecoration: 'none', fontWeight: 600 }}>
                    View Full Case Record ➔
                  </Link>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-sub)', marginTop: '4px' }}>
                  Patient: {selectedEscalation.patientName} ({selectedEscalation.patientExternalId}) • From {selectedEscalation.sendingFacility}
                </div>
              </div>

              {selectedEscalation.status === 'OPEN' && (
                <button
                  onClick={handleAcknowledge}
                  disabled={submitting}
                  className="primary-btn"
                  style={{ width: 'auto', padding: '10px 16px' }}
                >
                  <User size={16} />
                  <span>{t('acknowledgeEscalation')}</span>
                </button>
              )}
            </div>

            {/* GapSense Classification Box (With Mandatory Safety Labels) */}
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1.5px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} style={{ color: '#EF4444' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#FCA5A5', textTransform: 'uppercase' }}>
                    GapSense Deterministic Classification
                  </span>
                </div>

                <button
                  onClick={() => setActiveModal('OVERRIDE')}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-app)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Edit3 size={13} />
                  <span>{t('overrideGapBtn')}</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>Phase: {selectedEscalation.phase}</span>
                <span>•</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#EF4444' }}>Likely Cause: {selectedEscalation.causeClass}</span>
              </div>

              {/* Mandatory Clinical Safety Label */}
              <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#FCA5A5' }}>
                "{t('likelyCauseLabel')}"
              </div>
            </div>

            {/* Playbook Checklist (Explicitly labelled "suggested — confirm before acting") */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
                    {language === 'kn' ? selectedEscalation.playbookNameKn : selectedEscalation.playbookName}
                  </h3>
                </div>

                {/* Prominent Safety Badge Rule */}
                <div
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid #F59E0B',
                    color: '#FDE68A',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <AlertTriangle size={13} />
                  <span>{t('playbookSuggestedBadge')}</span>
                </div>
              </div>

              {/* Steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedEscalation.steps.map((step) => {
                  const isDone = step.status === 'COMPLETED';
                  return (
                    <div
                      key={step.id}
                      style={{
                        backgroundColor: 'var(--bg-app)',
                        border: `1.5px solid ${isDone ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-app)'}`,
                        borderRadius: '10px',
                        padding: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: isDone ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-surface-elevated)',
                              color: isDone ? '#10B981' : 'var(--text-main)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '13px',
                            }}
                          >
                            {isDone ? <CheckCircle2 size={16} /> : step.stepOrder}
                          </div>

                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                              {language === 'kn' ? step.descriptionKn : step.description}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-sub)', display: 'flex', gap: '12px' }}>
                              <span>{t('stepAssignee')} {step.assigneeRole}</span>
                              <span>{t('stepSla')} {step.slaHours}h</span>
                            </div>

                            {isDone && step.notes && (
                              <div style={{ marginTop: '8px', fontSize: '12px', color: '#A7F3D0', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '6px 10px', borderRadius: '6px' }}>
                                ✓ {step.completedByName}: {step.notes}
                              </div>
                            )}
                          </div>
                        </div>

                        {!isDone && selectedEscalation.status !== 'RESOLVED' && (
                          <button
                            onClick={() => {
                              setActiveStepId(step.id);
                              setActiveModal('STEP');
                            }}
                            className="secondary-btn"
                            style={{ width: 'auto', margin: 0, padding: '6px 12px', minHeight: '34px', fontSize: '12px' }}
                          >
                            <CheckSquare size={14} />
                            <span>{t('markStepDone')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resolve Escalation Action */}
            {selectedEscalation.status !== 'RESOLVED' && (
              <div style={{ borderTop: '1px solid var(--border-app)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setActiveModal('RESOLVE')}
                  className="primary-btn"
                  style={{ width: 'auto', padding: '12px 24px', backgroundColor: '#10B981' }}
                >
                  <CheckCircle2 size={18} />
                  <span>{t('resolveEscalation')}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal 1: Complete Playbook Step */}
      {activeModal === 'STEP' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-app)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{t('markStepDone')}</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-sub)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Supervisor Action Notes & Findings</label>
              <textarea
                className="form-textarea"
                placeholder={t('stepNotesPlaceholder')}
                value={stepNotes}
                onChange={(e) => setStepNotes(e.target.value)}
              />
            </div>
            <button onClick={handleCompleteStep} disabled={submitting} className="primary-btn">
              <span>{t('confirm')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal 2: Supervisor Gap Override (Requires typed reason) */}
      {activeModal === 'OVERRIDE' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-app)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{t('overrideGapTitle')}</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-sub)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div className="form-group">
              <label className="form-label">Correct Phase</label>
              <select className="form-select" value={overridePhase} onChange={(e) => setOverridePhase(e.target.value as any)}>
                <option value="ACKNOWLEDGEMENT">ACKNOWLEDGEMENT</option>
                <option value="TRANSPORT">TRANSPORT</option>
                <option value="CAPACITY">CAPACITY</option>
                <option value="DISPOSITION">DISPOSITION</option>
                <option value="FOLLOW_UP">FOLLOW_UP</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Correct Likely Cause</label>
              <select className="form-select" value={overrideCause} onChange={(e) => setOverrideCause(e.target.value as any)}>
                <option value="CAPACITY">CAPACITY</option>
                <option value="PROCESS">PROCESS</option>
                <option value="COMMUNICATION">COMMUNICATION</option>
                <option value="UNDETERMINED">UNDETERMINED</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('overrideReasonLabel')}</label>
              <textarea
                className="form-textarea"
                placeholder={t('overrideReasonPlaceholder')}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
            </div>

            <button onClick={handleOverride} disabled={submitting || !overrideReason.trim()} className="primary-btn">
              <span>{t('confirm')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal 3: Resolve Escalation */}
      {activeModal === 'RESOLVE' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-app)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{t('resolveEscalation')}</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-sub)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div className="form-group">
              <label className="form-label">{t('resolutionSummaryLabel')}</label>
              <textarea
                className="form-textarea"
                placeholder={t('resolutionSummaryPlaceholder')}
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
              />
            </div>

            <button onClick={handleResolve} disabled={submitting || !resolutionSummary.trim()} className="primary-btn" style={{ backgroundColor: '#10B981' }}>
              <span>{t('confirm')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
