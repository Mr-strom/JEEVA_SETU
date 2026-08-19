import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useSync } from '../context/SyncContext';
import { 
  Send, 
  Save, 
  AlertTriangle, 
  User, 
  Hospital, 
  Truck, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Edit3, 
  ShieldAlert, 
  FileText 
} from 'lucide-react';

const FACILITIES_MAP: Record<string, string> = {
  '22222222-2222-2222-2222-222222222201': 'Cheluvamba Hospital (MMCRI) — Mysuru',
  '22222222-2222-2222-2222-222222222202': 'KR Hospital — Mysuru',
  '11111111-1111-1111-1111-111111111101': 'Vani Vilas Hospital — Bengaluru',
};

export const NewReferralPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { saveReferral } = useSync();

  // Multi-Step State: 1 = Mother Profile, 2 = Risks & Symptoms, 3 = Hospital & Transport, 4 = Review & Send
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [patientExternalId, setPatientExternalId] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [patientAge, setPatientAge] = useState<string>('24');
  const [gravida, setGravida] = useState<string>('2');
  const [parity, setParity] = useState<string>('1');
  const [lmp, setLmp] = useState<string>('');
  const [edd, setEdd] = useState<string>('');
  const [riskFlags, setRiskFlags] = useState<string[]>(['SEVERE_ANAEMIA']);
  const [transportNeeded, setTransportNeeded] = useState<boolean>(true);
  const [receivingFacilityId, setReceivingFacilityId] = useState<string>('22222222-2222-2222-2222-222222222201');
  const [clinicalSummary, setClinicalSummary] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<boolean>(false);

  const toggleRiskFlag = (flag: string) => {
    setRiskFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag],
    );
  };

  const validateStep = (step: number): boolean => {
    setValidationError(null);
    if (step === 1) {
      if (!patientExternalId.trim()) {
        setValidationError('Please enter patient RCH / ORS ID before proceeding.');
        return false;
      }
    } else if (step === 2) {
      if (riskFlags.length === 0) {
        setValidationError('Please select at least one maternal risk indicator.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(4, prev + 1));
    }
  };

  const handleBack = () => {
    setValidationError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleAction = async (isDraft: boolean) => {
    if (!isDraft && (!patientExternalId.trim() || riskFlags.length === 0)) {
      setValidationError(t('validationError'));
      return;
    }

    setValidationError(null);
    setSubmitting(true);

    try {
      await saveReferral(
        {
          patientExternalId: patientExternalId.trim() || `ORS-DRAFT-${Date.now()}`,
          patientName: patientName.trim() || undefined,
          patientAge: patientAge ? parseInt(patientAge, 10) : undefined,
          gravida: gravida ? parseInt(gravida, 10) : undefined,
          parity: parity ? parseInt(parity, 10) : undefined,
          lmp: lmp || undefined,
          edd: edd || undefined,
          riskFlags,
          transportNeeded,
          transportMode: transportNeeded ? '108_AMBULANCE' : undefined,
          clinicalSummary: clinicalSummary.trim() || undefined,
          sendingFacilityId: '22222222-2222-2222-2222-222222222203', // Bilikere PHC
          receivingFacilityId,
          isDraft,
        },
        isDraft,
      );

      setSuccessToast(true);
      setTimeout(() => {
        navigate('/queue');
      }, 800);
    } catch (err) {
      console.error('Failed to save referral', err);
    } finally {
      setSubmitting(false);
    }
  };

  const allRiskItems = [
    { id: 'SEVERE_ANAEMIA', label: t('risk_SEVERE_ANAEMIA') },
    { id: 'PRE_ECLAMPSIA', label: t('risk_PRE_ECLAMPSIA') },
    { id: 'ANTEPARTUM_HAEMORRHAGE', label: t('risk_ANTEPARTUM_HAEMORRHAGE') },
    { id: 'PREVIOUS_LSCS', label: t('risk_PREVIOUS_LSCS') },
    { id: 'OBSTRUCTED_LABOUR', label: t('risk_OBSTRUCTED_LABOUR') },
    { id: 'ECLAMPSIA_CONVULSIONS', label: t('risk_ECLAMPSIA_CONVULSIONS') },
    { id: 'TWIN_PREGNANCY', label: t('risk_TWIN_PREGNANCY') },
    { id: 'GESTATIONAL_DIABETES', label: t('risk_GESTATIONAL_DIABETES') },
  ];

  return (
    <div className="client-content">
      {/* Top Title */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-main)' }}>
          {t('formTitle')}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-sub)' }}>{t('formSubtitle')}</p>
      </div>

      {/* 4-Step Progress Indicator Bar */}
      <div className="stepper-bar" role="tablist" aria-label="Referral Form Progress">
        <div 
          className={`step-item ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}
          onClick={() => setCurrentStep(1)}
        >
          <div className="step-circle">{currentStep > 1 ? <Check size={16} /> : '1'}</div>
          <span className="step-label">1. Profile</span>
        </div>

        <div className={`step-line ${currentStep > 1 ? 'completed' : ''}`} />

        <div 
          className={`step-item ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}
          onClick={() => validateStep(1) && setCurrentStep(2)}
        >
          <div className="step-circle">{currentStep > 2 ? <Check size={16} /> : '2'}</div>
          <span className="step-label">2. Risks</span>
        </div>

        <div className={`step-line ${currentStep > 2 ? 'completed' : ''}`} />

        <div 
          className={`step-item ${currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : ''}`}
          onClick={() => validateStep(1) && validateStep(2) && setCurrentStep(3)}
        >
          <div className="step-circle">{currentStep > 3 ? <Check size={16} /> : '3'}</div>
          <span className="step-label">3. Hospital</span>
        </div>

        <div className={`step-line ${currentStep > 3 ? 'completed' : ''}`} />

        <div 
          className={`step-item ${currentStep === 4 ? 'active' : ''}`}
          onClick={() => validateStep(1) && validateStep(2) && setCurrentStep(4)}
        >
          <div className="step-circle">4</div>
          <span className="step-label">4. Review</span>
        </div>
      </div>

      {/* Validation Error Message */}
      {validationError && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.18)',
            border: '1.5px solid #EF4444',
            color: '#FCA5A5',
            padding: '14px 16px',
            borderRadius: '12px',
            marginBottom: '18px',
            fontSize: '14px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertTriangle size={20} style={{ minWidth: 20 }} />
          <span>{validationError}</span>
        </div>
      )}

      {/* Success Toast */}
      {successToast && (
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            border: '1.5px solid #10B981',
            color: '#A7F3D0',
            padding: '14px 16px',
            borderRadius: '12px',
            marginBottom: '18px',
            fontSize: '14px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Check size={20} />
          <span>{t('referralCreatedSuccess')}</span>
        </div>
      )}

      {/* =========================================================================
          STEP 1: MOTHER PROFILE
          ========================================================================= */}
      {currentStep === 1 && (
        <div className="form-card">
          <div className="form-section-title">
            <User size={18} />
            <span>{t('stepMotherProfile')}</span>
          </div>

          <div className="form-group">
            <label htmlFor="patientExternalId" className="form-label">{t('patientIdLabel')}</label>
            <input
              id="patientExternalId"
              type="text"
              className="form-input"
              placeholder={t('patientIdPlaceholder')}
              value={patientExternalId}
              onChange={(e) => setPatientExternalId(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="patientName" className="form-label">{t('patientNameLabel')}</label>
            <input
              id="patientName"
              type="text"
              className="form-input"
              placeholder="e.g. Lakshmi Devi"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label htmlFor="patientAge" className="form-label">{t('patientAgeLabel')}</label>
              <input
                id="patientAge"
                type="number"
                className="form-input"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="gravida" className="form-label">{t('gravidaLabel')}</label>
              <input
                id="gravida"
                type="number"
                className="form-input"
                value={gravida}
                onChange={(e) => setGravida(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="parity" className="form-label">{t('parityLabel')}</label>
              <input
                id="parity"
                type="number"
                className="form-input"
                value={parity}
                onChange={(e) => setParity(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label htmlFor="lmp" className="form-label">{t('lmpLabel')}</label>
              <input
                id="lmp"
                type="date"
                className="form-input"
                value={lmp}
                onChange={(e) => setLmp(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="edd" className="form-label">{t('eddLabel')}</label>
              <input
                id="edd"
                type="date"
                className="form-input"
                value={edd}
                onChange={(e) => setEdd(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <button
              type="button"
              onClick={handleNext}
              className="primary-btn"
            >
              <span>{t('stepNext')}</span>
              <ArrowRight size={18} />
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction(true)}
              className="secondary-btn"
            >
              <Save size={16} />
              <span>{t('saveDraftSecondary')}</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 2: RISK INDICATORS & CLINICAL SYMPTOMS
          ========================================================================= */}
      {currentStep === 2 && (
        <div className="form-card">
          <div className="form-section-title">
            <AlertTriangle size={18} />
            <span>{t('stepRisksSymptoms')}</span>
          </div>

          <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '14px' }}>
            Tap all high-risk signs observed during clinical check:
          </p>

          <div className="checkbox-grid" role="group" aria-label={t('sectionRisks')}>
            {allRiskItems.map((item) => {
              const isSelected = riskFlags.includes(item.id);
              return (
                <label
                  key={item.id}
                  htmlFor={`risk-${item.id}`}
                  className={`checkbox-card ${isSelected ? 'selected' : ''}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      toggleRiskFlag(item.id);
                    }
                  }}
                >
                  <input
                    id={`risk-${item.id}`}
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleRiskFlag(item.id)}
                    aria-checked={isSelected}
                  />
                  <span className="checkbox-label">{item.label}</span>
                </label>
              );
            })}
          </div>

          <div className="form-group" style={{ marginTop: '20px' }}>
            <label htmlFor="clinicalSummary" className="form-label">{t('clinicalSummaryLabel')}</label>
            <textarea
              id="clinicalSummary"
              className="form-textarea"
              rows={4}
              placeholder={t('clinicalSummaryPlaceholder')}
              value={clinicalSummary}
              onChange={(e) => setClinicalSummary(e.target.value)}
            />
          </div>

          <div className="btn-nav-row">
            <button
              type="button"
              onClick={handleBack}
              className="secondary-btn"
              style={{ flex: 1, marginTop: 0 }}
            >
              <ArrowLeft size={16} />
              <span>{t('stepBack')}</span>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="primary-btn"
              style={{ flex: 2 }}
            >
              <span>{t('stepNext')}</span>
              <ArrowRight size={18} />
            </button>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleAction(true)}
            className="secondary-btn"
            style={{ marginTop: '10px' }}
          >
            <Save size={16} />
            <span>{t('saveDraftSecondary')}</span>
          </button>
        </div>
      )}

      {/* =========================================================================
          STEP 3: HOSPITAL & TRANSPORT
          ========================================================================= */}
      {currentStep === 3 && (
        <div className="form-card">
          <div className="form-section-title">
            <Hospital size={18} />
            <span>{t('stepHospitalTransport')}</span>
          </div>

          <div className="form-group">
            <label htmlFor="receivingFacilityId" className="form-label">{t('receivingHospitalLabel')}</label>
            <select
              id="receivingFacilityId"
              className="form-select"
              value={receivingFacilityId}
              onChange={(e) => setReceivingFacilityId(e.target.value)}
            >
              <option value="22222222-2222-2222-2222-222222222201">
                Cheluvamba Hospital (MMCRI) — Mysuru (Tertiary)
              </option>
              <option value="22222222-2222-2222-2222-222222222202">
                KR Hospital — Mysuru (District Hospital)
              </option>
              <option value="11111111-1111-1111-1111-111111111101">
                Vani Vilas Hospital — Bengaluru (Medical College)
              </option>
            </select>
          </div>

          <div className="form-group">
            <label
              htmlFor="transportNeeded"
              className={`checkbox-card ${transportNeeded ? 'selected' : ''}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  setTransportNeeded(!transportNeeded);
                }
              }}
            >
              <input
                id="transportNeeded"
                type="checkbox"
                checked={transportNeeded}
                onChange={() => setTransportNeeded(!transportNeeded)}
                aria-checked={transportNeeded}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <Truck size={22} style={{ color: 'var(--karnataka-gold)' }} />
                <span className="checkbox-label">{t('transportNeededLabel')}</span>
              </div>
            </label>
          </div>

          <div className="btn-nav-row">
            <button
              type="button"
              onClick={handleBack}
              className="secondary-btn"
              style={{ flex: 1, marginTop: 0 }}
            >
              <ArrowLeft size={16} />
              <span>{t('stepBack')}</span>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="primary-btn"
              style={{ flex: 2 }}
            >
              <span>{t('stepReviewSend')}</span>
              <ArrowRight size={18} />
            </button>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleAction(true)}
            className="secondary-btn"
            style={{ marginTop: '10px' }}
          >
            <Save size={16} />
            <span>{t('saveDraftSecondary')}</span>
          </button>
        </div>
      )}

      {/* =========================================================================
          STEP 4: REVIEW & SEND
          ========================================================================= */}
      {currentStep === 4 && (
        <div className="form-card">
          <div className="form-section-title">
            <FileText size={18} />
            <span>{t('reviewTitle')}</span>
          </div>

          <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '16px' }}>
            {t('reviewSubtitle')}
          </p>

          {/* Section 1 Review */}
          <div className="review-card">
            <div className="review-section-header">
              <span className="review-section-title">1. Mother Profile</span>
              <button type="button" onClick={() => setCurrentStep(1)} className="review-edit-btn">
                <Edit3 size={12} />
                <span>{t('stepEdit')}</span>
              </button>
            </div>
            <div className="review-grid">
              <div>
                <div className="review-field-name">RCH / ORS ID</div>
                <div className="review-field-value">{patientExternalId || 'Not entered'}</div>
              </div>
              <div>
                <div className="review-field-name">Mother Name</div>
                <div className="review-field-value">{patientName || 'Anonymous'}</div>
              </div>
              <div>
                <div className="review-field-name">Age / Gravida / Parity</div>
                <div className="review-field-value">{patientAge} yrs • G{gravida} P{parity}</div>
              </div>
              <div>
                <div className="review-field-name">EDD</div>
                <div className="review-field-value">{edd || 'Not specified'}</div>
              </div>
            </div>
          </div>

          {/* Section 2 Review */}
          <div className="review-card">
            <div className="review-section-header">
              <span className="review-section-title">2. Risks & Observations</span>
              <button type="button" onClick={() => setCurrentStep(2)} className="review-edit-btn">
                <Edit3 size={12} />
                <span>{t('stepEdit')}</span>
              </button>
            </div>
            <div>
              {riskFlags.length === 0 ? (
                <span style={{ color: '#94A3B8', fontSize: '13px' }}>{t('noRisksSelected')}</span>
              ) : (
                riskFlags.map((flag) => {
                  const item = allRiskItems.find((r) => r.id === flag);
                  return (
                    <span key={flag} className="review-danger-chip">
                      ⚠️ {item?.label || flag}
                    </span>
                  );
                })
              )}
            </div>
            {clinicalSummary && (
              <div style={{ marginTop: '12px', fontSize: '13px', color: '#CBD5E1', background: '#070C18', padding: '10px', borderRadius: '8px', border: '1px solid #1E293B' }}>
                <strong style={{ color: '#FBBF24' }}>Clinical Notes:</strong> {clinicalSummary}
              </div>
            )}
          </div>

          {/* Section 3 Review */}
          <div className="review-card">
            <div className="review-section-header">
              <span className="review-section-title">3. Destination & Transport</span>
              <button type="button" onClick={() => setCurrentStep(3)} className="review-edit-btn">
                <Edit3 size={12} />
                <span>{t('stepEdit')}</span>
              </button>
            </div>
            <div className="review-grid">
              <div className="review-grid-full">
                <div className="review-field-name">Hospital</div>
                <div className="review-field-value" style={{ color: '#60A5FA' }}>
                  {FACILITIES_MAP[receivingFacilityId] || receivingFacilityId}
                </div>
              </div>
              <div className="review-grid-full" style={{ marginTop: '6px' }}>
                <div className="review-field-name">Transport Mode</div>
                <div className="review-field-value" style={{ color: transportNeeded ? '#FBBF24' : '#94A3B8' }}>
                  {transportNeeded ? `🚨 ${t('ambulanceRequested')}` : t('ambulanceNotRequested')}
                </div>
              </div>
            </div>
          </div>

          {/* Safety Transmission Notice */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.15)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)', marginBottom: '18px', fontSize: '13px', color: '#93C5FD' }}>
            <ShieldAlert size={18} style={{ minWidth: 18, color: '#60A5FA' }} />
            <span>Emergency referral alert will be transmitted directly to hospital triage desk upon sending.</span>
          </div>

          {/* Primary Submit Action (One Primary Action Rule) */}
          <div>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction(false)}
              className="primary-btn"
            >
              <Send size={20} />
              <span>{submitting ? '...' : t('submitReferralPrimary')}</span>
            </button>

            <div className="btn-nav-row">
              <button
                type="button"
                onClick={handleBack}
                className="secondary-btn"
                style={{ flex: 1, marginTop: 0 }}
              >
                <ArrowLeft size={16} />
                <span>{t('stepBack')}</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleAction(true)}
                className="secondary-btn"
                style={{ flex: 1, marginTop: 0 }}
              >
                <Save size={16} />
                <span>{t('saveDraftSecondary')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
