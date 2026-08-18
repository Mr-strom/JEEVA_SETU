import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useSync } from '../context/SyncContext';
import { Send, Save, AlertTriangle, User, Hospital, Truck, Check } from 'lucide-react';

export const NewReferralPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { saveReferral } = useSync();

  // Form State
  const [patientExternalId, setPatientExternalId] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [patientAge, setPatientAge] = useState<string>('24');
  const [gravida, setGravida] = useState<string>('2');
  const [parity, setParity] = useState<string>('1');
  const [lmp, setLmp] = useState<string>('');
  const [edd, setEdd] = useState<string>('');
  const [riskFlags, setRiskFlags] = useState<string[]>(['SEVERE_ANAEMIA']); // requires clinical approval
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

  return (
    <div className="client-content">
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
          {t('formTitle')}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{t('formSubtitle')}</p>
      </div>

      {validationError && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1.5px solid #EF4444',
            color: '#FCA5A5',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={18} />
          <span>{validationError}</span>
        </div>
      )}

      {successToast && (
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            border: '1.5px solid #10B981',
            color: '#A7F3D0',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Check size={18} />
          <span>{t('referralCreatedSuccess')}</span>
        </div>
      )}

      {/* 1. Mother Profile */}
      <div className="form-card">
        <div className="form-section-title">
          <User size={16} />
          <span>{t('sectionPatient')}</span>
        </div>

        <div className="form-group">
          <label className="form-label">{t('patientIdLabel')}</label>
          <input
            type="text"
            className="form-input"
            placeholder={t('patientIdPlaceholder')}
            value={patientExternalId}
            onChange={(e) => setPatientExternalId(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t('patientNameLabel')}</label>
          <input
            type="text"
            className="form-input"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div className="form-group">
            <label className="form-label">{t('patientAgeLabel')}</label>
            <input
              type="number"
              className="form-input"
              value={patientAge}
              onChange={(e) => setPatientAge(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('gravidaLabel')}</label>
            <input
              type="number"
              className="form-input"
              value={gravida}
              onChange={(e) => setGravida(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('parityLabel')}</label>
            <input
              type="number"
              className="form-input"
              value={parity}
              onChange={(e) => setParity(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="form-group">
            <label className="form-label">{t('lmpLabel')}</label>
            <input
              type="date"
              className="form-input"
              value={lmp}
              onChange={(e) => setLmp(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('eddLabel')}</label>
            <input
              type="date"
              className="form-input"
              value={edd}
              onChange={(e) => setEdd(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 2. High-Risk Indicators Checklist */}
      <div className="form-card">
        <div className="form-section-title">
          <AlertTriangle size={16} />
          <span>{t('sectionRisks')}</span>
        </div>

        <div className="checkbox-grid">
          {[
            { id: 'SEVERE_ANAEMIA', label: t('risk_SEVERE_ANAEMIA') },
            { id: 'PRE_ECLAMPSIA', label: t('risk_PRE_ECLAMPSIA') },
            { id: 'ANTEPARTUM_HAEMORRHAGE', label: t('risk_ANTEPARTUM_HAEMORRHAGE') },
            { id: 'PREVIOUS_LSCS', label: t('risk_PREVIOUS_LSCS') },
            { id: 'OBSTRUCTED_LABOUR', label: t('risk_OBSTRUCTED_LABOUR') },
            { id: 'ECLAMPSIA_CONVULSIONS', label: t('risk_ECLAMPSIA_CONVULSIONS') },
            { id: 'TWIN_PREGNANCY', label: t('risk_TWIN_PREGNANCY') },
            { id: 'GESTATIONAL_DIABETES', label: t('risk_GESTATIONAL_DIABETES') },
          ].map((item) => {
            const isSelected = riskFlags.includes(item.id);
            return (
              <label
                key={item.id}
                className={`checkbox-card ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleRiskFlag(item.id)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                />
                <span className="checkbox-label">{item.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 3. Hospital & Transport */}
      <div className="form-card">
        <div className="form-section-title">
          <Hospital size={16} />
          <span>{t('sectionTransport')}</span>
        </div>

        <div className="form-group">
          <label className="form-label">{t('receivingHospitalLabel')}</label>
          <select
            className="form-select"
            value={receivingFacilityId}
            onChange={(e) => setReceivingFacilityId(e.target.value)}
          >
            <option value="22222222-2222-2222-2222-222222222201">
              Cheluvamba Hospital (MMCRI) — Mysuru
            </option>
            <option value="22222222-2222-2222-2222-222222222202">
              KR Hospital — Mysuru
            </option>
            <option value="11111111-1111-1111-1111-111111111101">
              Vani Vilas Hospital — Bengaluru
            </option>
          </select>
        </div>

        <div className="form-group">
          <label className="checkbox-card selected" onClick={() => setTransportNeeded(!transportNeeded)}>
            <input
              type="checkbox"
              checked={transportNeeded}
              onChange={() => {}}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={18} style={{ color: 'var(--karnataka-gold)' }} />
              <span className="checkbox-label">{t('transportNeededLabel')}</span>
            </div>
          </label>
        </div>

        <div className="form-group">
          <label className="form-label">{t('clinicalSummaryLabel')}</label>
          <textarea
            className="form-textarea"
            placeholder={t('clinicalSummaryPlaceholder')}
            value={clinicalSummary}
            onChange={(e) => setClinicalSummary(e.target.value)}
          />
        </div>
      </div>

      {/* One Primary Action Per Screen */}
      <div style={{ marginTop: '20px', marginBottom: '16px' }}>
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleAction(false)}
          className="primary-btn"
        >
          <Send size={18} />
          <span>{submitting ? '...' : t('submitReferralPrimary')}</span>
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
  );
};
