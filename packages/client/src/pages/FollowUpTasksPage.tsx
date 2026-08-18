import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useSync } from '../context/SyncContext';
import { ClientFollowUpTask } from '../types';
import { CheckSquare, Calendar, MapPin, Check, X } from 'lucide-react';

export const FollowUpTasksPage: React.FC = () => {
  const { t } = useLanguage();
  const { followUps, completeFollowUp } = useSync();

  const [activeTask, setActiveTask] = useState<ClientFollowUpTask | null>(null);
  const [outcome, setOutcome] = useState<'COMPLETED' | 'PATIENT_NOT_FOUND' | 'PATIENT_REFUSED' | 'REFERRED_ONWARD'>('COMPLETED');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmitVisit = async () => {
    if (!activeTask) return;
    setSubmitting(true);
    try {
      await completeFollowUp(activeTask.id, outcome, notes);
      setActiveTask(null);
      setNotes('');
    } catch (err) {
      console.error('Failed to complete follow up', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="client-content">
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
          {t('followUpTitle')}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{t('followUpSubtitle')}</p>
      </div>

      {followUps.length === 0 ? (
        <div className="form-card" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <p style={{ color: 'var(--text-sub)', fontSize: '14px' }}>{t('emptyFollowUps')}</p>
        </div>
      ) : (
        followUps.map((fup) => (
          <div key={fup.id} className="case-card">
            <div className="case-card-header">
              <div className="case-id">{fup.caseId}</div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: fup.outcome ? 'var(--sync-synced-text)' : 'var(--sync-waiting-text)',
                  backgroundColor: fup.outcome ? 'var(--sync-synced-bg)' : 'var(--sync-waiting-bg)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                {fup.outcome ? <Check size={12} /> : <Calendar size={12} />}
                <span>{fup.outcome ? t(`outcome_${fup.outcome}` as any) : 'Due in 2 days'}</span>
              </div>
            </div>

            <div className="case-card-body">
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                {fup.patientName} ({fup.patientExternalId})
              </div>

              {fup.villageName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-sub)', marginTop: '4px' }}>
                  <MapPin size={12} />
                  <span>{fup.villageName}</span>
                </div>
              )}

              {fup.notes && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-sub)', backgroundColor: 'var(--bg-app)', padding: '8px 10px', borderRadius: '6px' }}>
                  "{fup.notes}"
                </div>
              )}
            </div>

            {/* Single Primary Action per Task */}
            {!fup.outcome && (
              <div style={{ borderTop: '1px solid var(--border-app)', paddingTop: '12px' }}>
                <button
                  onClick={() => {
                    setActiveTask(fup);
                    setNotes('');
                  }}
                  className="primary-btn"
                  style={{ minHeight: '44px', padding: '10px' }}
                >
                  <CheckSquare size={16} />
                  <span>{t('recordVisitPrimary')}</span>
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {/* Modal Dialog for Recording Visit */}
      {activeTask && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
          onClick={() => !submitting && setActiveTask(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-app)',
              borderRadius: '12px',
              padding: '20px',
              width: '100%',
              maxWidth: '480px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{t('recordVisitPrimary')}</h3>
              <button
                onClick={() => setActiveTask(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-sub)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">{t('outcomeLabel')}</label>
              <select
                className="form-select"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as any)}
              >
                <option value="COMPLETED">{t('outcome_COMPLETED')}</option>
                <option value="PATIENT_NOT_FOUND">{t('outcome_PATIENT_NOT_FOUND')}</option>
                <option value="PATIENT_REFUSED">{t('outcome_PATIENT_REFUSED')}</option>
                <option value="REFERRED_ONWARD">{t('outcome_REFERRED_ONWARD')}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('visitNotesLabel')}</label>
              <textarea
                className="form-textarea"
                placeholder="Maternal BP, Lochia, Fever, Neonatal breathing & breastfeeding..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              onClick={handleSubmitVisit}
              disabled={submitting}
              className="primary-btn"
              style={{ marginTop: '10px' }}
            >
              <Check size={18} />
              <span>{submitting ? '...' : t('confirmVisitButton')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
