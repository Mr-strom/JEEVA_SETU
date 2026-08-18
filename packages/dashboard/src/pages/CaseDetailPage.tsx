import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ReferralCase, CapacityReasonCode, DispositionCategory } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  CornerUpRight,
  Truck,
  Stethoscope,
  LogOut,
  Lock,
} from 'lucide-react';

export const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { canPerformAction } = useAuth();

  const [referral, setReferral] = useState<ReferralCase | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeModal, setActiveModal] = useState<
    'ACCEPT' | 'REDIRECT' | 'REJECT' | 'ARRIVAL' | 'DISPOSITION' | 'DISCHARGE' | 'CLOSE' | 'REROUTE' | null
  >(null);

  // Form states for modals
  const [reasonCode, setReasonCode] = useState<CapacityReasonCode>('NO_BED');
  const [modalNotes, setModalNotes] = useState<string>('');
  const [targetFacilityId, setTargetFacilityId] = useState<string>('22222222-2222-2222-2222-222222222201');
  const [rerouteOverrideReason, setRerouteOverrideReason] = useState<string>('');
  const [routeSuggestions, setRouteSuggestions] = useState<any[]>([]);
  const [delayReason, setDelayReason] = useState<string>('TRAFFIC_CONGESTION');
  const [dispCategory, setDispCategory] = useState<DispositionCategory>('ADMITTED');
  const [dischargeSummary, setDischargeSummary] = useState<string>('');
  const [closureReason] = useState<string>('Postnatal follow-up completed successfully');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getReferralById(id);
      setReferral(data);
    } catch (err) {
      console.error('Failed to load referral case', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleAction = async () => {
    if (!referral) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      if (activeModal === 'ACCEPT') {
        const updated = await api.acceptReferral(referral.id, { note: modalNotes });
        setReferral(updated);
      } else if (activeModal === 'REDIRECT') {
        const updated = await api.redirectReferral(referral.id, {
          targetFacilityId,
          reasonCode,
          note: modalNotes,
        });
        setReferral(updated);
      } else if (activeModal === 'REJECT') {
        const updated = await api.rejectReferral(referral.id, {
          reasonCode,
          note: modalNotes,
        });
        setReferral(updated);
      } else if (activeModal === 'ARRIVAL') {
        const updated = await api.recordArrival(referral.id, {
          delayReason,
          note: modalNotes,
        });
        setReferral(updated);
      } else if (activeModal === 'DISPOSITION') {
        const updated = await api.recordDisposition(referral.id, {
          category: dispCategory,
          detail: modalNotes,
        });
        setReferral(updated);
      } else if (activeModal === 'DISCHARGE') {
        const updated = await api.dischargePatient(referral.id, {
          dischargeSummary,
        });
        setReferral(updated);
      } else if (activeModal === 'CLOSE') {
        const updated = await api.closeReferral(referral.id, {
          closureReason,
          note: modalNotes,
        });
        setReferral(updated);
      } else if (activeModal === 'REROUTE') {
        const updated = await api.confirmReroute(referral.id, {
          targetFacilityId,
          overrideReason: rerouteOverrideReason.trim() || undefined,
        });
        setReferral(updated);
      }
      setActiveModal(null);
      setModalNotes('');
      setRerouteOverrideReason('');
    } catch (err: any) {
      setErrorMessage(err?.message || t('errorOccurred'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRerouteModal = async () => {
    if (!referral) return;
    try {
      const data = await api.getRouteSuggestions(referral.id);
      setRouteSuggestions(data.suggestions || []);
      if (data.suggestions?.length > 0) {
        setTargetFacilityId(data.suggestions[0].suggestedFacilityId);
      }
    } catch (e) {
      console.error('Failed to load routing suggestions', e);
    }
    setActiveModal('REROUTE');
  };

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '60px' }}>
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (!referral) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '60px' }}>
        <h2>{t('noCasesFound')}</h2>
        <Link to="/queue" className="btn btn-secondary" style={{ marginTop: '16px' }}>
          {t('navQueue')}
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Top Breadcrumb & Actions Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/queue')} className="btn btn-secondary btn-sm">
            <ArrowLeft size={16} />
            <span>{t('navQueue')}</span>
          </button>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {referral.caseId}
            </h1>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {new Date(referral.createdAt).toLocaleString()}
            </span>
          </div>
          <StatusBadge status={referral.status} />
        </div>

        {/* Operational Action Buttons Based on Status & Role */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {referral.status === 'ACKNOWLEDGEMENT_PENDING' && canPerformAction('ACCEPT_REJECT_REDIRECT') && (
            <>
              <button
                onClick={() => setActiveModal('ACCEPT')}
                className="btn btn-success btn-sm"
              >
                <CheckCircle size={15} />
                <span>{t('acceptCase')}</span>
              </button>

              <button
                onClick={() => setActiveModal('REDIRECT')}
                className="btn btn-secondary btn-sm"
              >
                <CornerUpRight size={15} />
                <span>{t('redirectCase')}</span>
              </button>

              <button
                onClick={() => setActiveModal('REJECT')}
                className="btn btn-danger btn-sm"
              >
                <XCircle size={15} />
                <span>{t('rejectCase')}</span>
              </button>
            </>
          )}

          {['ACCEPTED', 'IN_TRANSIT'].includes(referral.status) && canPerformAction('ACCEPT_REJECT_REDIRECT') && (
            <button
              onClick={() => setActiveModal('ARRIVAL')}
              className="btn btn-primary btn-sm"
            >
              <Truck size={15} />
              <span>{t('recordArrival')}</span>
            </button>
          )}

          {referral.status === 'ARRIVED' && canPerformAction('RECORD_DISPOSITION') && (
            <button
              onClick={() => setActiveModal('DISPOSITION')}
              className="btn btn-primary btn-sm"
            >
              <Stethoscope size={15} />
              <span>{t('recordDisposition')}</span>
            </button>
          )}

          {['CLINICAL_DISPOSITION_RECORDED', 'ARRIVED'].includes(referral.status) && canPerformAction('DISCHARGE') && (
            <button
              onClick={() => setActiveModal('DISCHARGE')}
              className="btn btn-secondary btn-sm"
            >
              <LogOut size={15} />
              <span>{t('dischargePatient')}</span>
            </button>
          )}

          {['REJECTED', 'REDIRECT_SUGGESTED'].includes(referral.status) && (
            <button
              onClick={handleOpenRerouteModal}
              className="btn btn-primary btn-sm"
              style={{ backgroundColor: '#2563EB' }}
            >
              <CornerUpRight size={15} />
              <span>{t('confirmRerouteBtn')}</span>
            </button>
          )}

          {['FOLLOW_UP_COMPLETED', 'FOLLOW_UP_ESCALATED'].includes(referral.status) && canPerformAction('CLOSE_CASE') && (
            <button
              onClick={() => setActiveModal('CLOSE')}
              className="btn btn-success btn-sm"
            >
              <Lock size={15} />
              <span>{t('closeCase')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Left: Patient and Clinical Overview */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">{t('patientDetails')}</h2>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <div className="form-label">{t('thPatient')}</div>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>{referral.patient.externalId}</div>
              </div>
              <div>
                <div className="form-label">{t('age')}</div>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>
                  {referral.patient.age ? `${referral.patient.age} yrs` : '—'}
                </div>
              </div>
              <div>
                <div className="form-label">{t('gravidaParity')}</div>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>
                  G{referral.patient.gravida || 1} P{referral.patient.parity || 0}
                </div>
              </div>
              <div>
                <div className="form-label">{t('edd')}</div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {referral.patient.edd ? new Date(referral.patient.edd).toLocaleDateString() : '—'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div className="form-label">{t('riskFlags')}</div>
              <div>
                {referral.riskFlags.map((rf) => (
                  <span key={rf} className="risk-pill">
                    {rf.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div className="form-label">{t('clinicalSummary')}</div>
              <div
                style={{
                  backgroundColor: 'var(--bg-card-subtle)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  border: '1px solid var(--border-card)',
                  color: 'var(--text-primary)',
                  lineHeight: '1.6',
                }}
              >
                {referral.clinicalSummary || '—'}
              </div>
            </div>

            {/* Transport details */}
            <div>
              <div className="form-label">{t('transportSection')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
                <Truck size={16} style={{ color: 'var(--primary-500)' }} />
                <span>
                  {referral.transportNeeded ? t('transportRequired') : 'Self-Arranged'} •{' '}
                  {referral.transportMode || '108 Ambulance'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Facility Handoff & Care Timeline */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">{t('timelineTitle')}</h2>
          </div>
          <div style={{ padding: '20px' }}>
            {/* Sending vs Receiving Facility Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--bg-card-subtle)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                  {t('thSendingFacility')}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>
                  {referral.sendingFacility?.name || '—'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {referral.sendingFacility?.district || ''}
                </div>
              </div>

              <div style={{ background: 'var(--bg-card-subtle)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                  {t('thReceivingFacility')}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>
                  {referral.receivingFacility?.name || '—'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {referral.receivingFacility?.district || ''}
                </div>
              </div>
            </div>

            {/* Timeline Stream */}
            <div className="timeline">
              {referral.events && referral.events.length > 0 ? (
                referral.events.map((ev) => (
                  <div key={ev.id} className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-type">{ev.type.replace(/_/g, ' ')}</span>
                        <span className="timeline-time">
                          {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {t(`role_${ev.actorRole}` as any) || ev.actorRole}
                        {ev.payload?.note && ` • "${ev.payload.note}"`}
                        {ev.payload?.reasonCode && ` • [${ev.payload.reasonCode}]`}
                        {ev.payload?.delayReason && ` • Delay: ${ev.payload.delayReason}`}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No historical events recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DIALOGS */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => !submitting && setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '17px', fontWeight: 700 }}>
                {activeModal === 'ACCEPT' && t('acceptCase')}
                {activeModal === 'REDIRECT' && t('redirectCase')}
                {activeModal === 'REJECT' && t('rejectCase')}
                {activeModal === 'ARRIVAL' && t('recordArrival')}
                {activeModal === 'DISPOSITION' && t('recordDisposition')}
                {activeModal === 'DISCHARGE' && t('dischargePatient')}
                {activeModal === 'CLOSE' && t('closeCase')}
              </h3>
            </div>

            <div className="modal-body">
              {errorMessage && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>
                  {errorMessage}
                </div>
              )}

              {/* Redirect / Reject: Mandatory Capacity Reason Code */}
              {(activeModal === 'REDIRECT' || activeModal === 'REJECT') && (
                <>
                  <div className="form-group">
                    <label className="form-label">{t('reasonCodeLabel')}</label>
                    <select
                      className="form-control"
                      value={reasonCode}
                      onChange={(e) => setReasonCode(e.target.value as CapacityReasonCode)}
                    >
                      <option value="NO_BED">{t('reason_NO_BED')}</option>
                      <option value="SERVICE_UNAVAILABLE">{t('reason_SERVICE_UNAVAILABLE')}</option>
                      <option value="NO_CLINICIAN">{t('reason_NO_CLINICIAN')}</option>
                      <option value="TRANSPORT_UNAVAILABLE">{t('reason_TRANSPORT_UNAVAILABLE')}</option>
                      <option value="OTHER">{t('reason_OTHER')}</option>
                    </select>
                  </div>

                  {activeModal === 'REDIRECT' && (
                    <div className="form-group">
                      <label className="form-label">{t('targetFacilityLabel')}</label>
                      <select
                        className="form-control"
                        value={targetFacilityId}
                        onChange={(e) => setTargetFacilityId(e.target.value)}
                      >
                        <option value="22222222-2222-2222-2222-222222222202">KR Hospital (Mysuru)</option>
                        <option value="11111111-1111-1111-1111-111111111101">Vani Vilas Hospital (Bengaluru)</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Arrival: Delay Reason selection */}
              {activeModal === 'ARRIVAL' && (
                <div className="form-group">
                  <label className="form-label">Delay Reason (If Applicable)</label>
                  <select
                    className="form-control"
                    value={delayReason}
                    onChange={(e) => setDelayReason(e.target.value)}
                  >
                    <option value="TRAFFIC_CONGESTION">Traffic Congestion</option>
                    <option value="AMBULANCE_BREAKDOWN">Ambulance Breakdown</option>
                    <option value="DELAYED_AMBULANCE_DISPATCH">Delayed Ambulance Dispatch</option>
                    <option value="WEATHER_ROAD_CONDITION">Weather / Road Condition</option>
                    <option value="PATIENT_PREPARATION_DELAY">Patient Preparation Delay</option>
                    <option value="OTHER">Other Logistical Delay</option>
                  </select>
                </div>
              )}

              {/* Disposition: Approved Category */}
              {activeModal === 'DISPOSITION' && (
                <div className="form-group">
                  <label className="form-label">{t('dispCategoryLabel')}</label>
                  <select
                    className="form-control"
                    value={dispCategory}
                    onChange={(e) => setDispCategory(e.target.value as DispositionCategory)}
                  >
                    <option value="ADMITTED">{t('disp_ADMITTED')}</option>
                    <option value="TRANSFERRED_OUT">{t('disp_TRANSFERRED_OUT')}</option>
                    <option value="DISCHARGED_HOME">{t('disp_DISCHARGED_HOME')}</option>
                    <option value="EXPIRED">{t('disp_EXPIRED')}</option>
                    <option value="LAMA">{t('disp_LAMA')}</option>
                  </select>
                </div>
              )}

              {/* Re-routing: Alternate Suggestions and Selection */}
              {activeModal === 'REROUTE' && (
                <div>
                  <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', fontSize: '13px' }}>
                    <strong>{t('rejectedByLabel')}</strong> {referral.receivingFacility?.name || 'Previous Destination'}
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('suggestedAlternatesLabel')}</label>
                    {routeSuggestions.length === 0 ? (
                      <div style={{ padding: '12px', backgroundColor: 'var(--bg-app)', border: '1px dashed var(--border-app)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {t('noAlternateConfigured')}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                        {routeSuggestions.map((sug) => {
                          const isSelected = targetFacilityId === sug.suggestedFacilityId;
                          return (
                            <div
                              key={sug.suggestedFacilityId}
                              onClick={() => setTargetFacilityId(sug.suggestedFacilityId)}
                              style={{
                                border: `1.5px solid ${isSelected ? '#3B82F6' : 'var(--border-app)'}`,
                                backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-app)',
                                borderRadius: '8px',
                                padding: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 700, fontSize: '14px' }}>{sug.suggestedFacility.name}</span>
                                <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#3B82F6', color: '#FFF', padding: '2px 8px', borderRadius: '12px' }}>
                                  {t('rankBadge')}{sug.rank} • Score: {sug.score}
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                {sug.suggestedFacility.district} • {sug.suggestedFacility.type} • {sug.suggestedFacility.capacityBeds} beds
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {(sug.reasons || []).map((r: string, idx: number) => (
                                  <span key={idx} style={{ fontSize: '10px', backgroundColor: 'var(--bg-surface)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-app)' }}>
                                    ✓ {r}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('rerouteOverrideReason')}</label>
                    <textarea
                      className="form-control"
                      value={rerouteOverrideReason}
                      onChange={(e) => setRerouteOverrideReason(e.target.value)}
                      placeholder="Required if overriding rank #1 recommendation..."
                    />
                  </div>
                </div>
              )}

              {/* Discharge summary */}
              {activeModal === 'DISCHARGE' && (
                <div className="form-group">
                  <label className="form-label">Post-Discharge Summary</label>
                  <textarea
                    className="form-control"
                    value={dischargeSummary}
                    onChange={(e) => setDischargeSummary(e.target.value)}
                    placeholder="Enter discharge instructions for ASHA/ANM follow-up..."
                  />
                </div>
              )}

              {/* General Operational Notes */}
              {activeModal !== 'DISCHARGE' && activeModal !== 'REROUTE' && (
                <div className="form-group">
                  <label className="form-label">{t('reasonNoteLabel')}</label>
                  <textarea
                    className="form-control"
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder="Enter operational notes or context..."
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setActiveModal(null)}
                disabled={submitting}
                className="btn btn-secondary btn-sm"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleAction}
                disabled={submitting}
                className="btn btn-primary btn-sm"
              >
                {submitting ? t('loading') : t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
