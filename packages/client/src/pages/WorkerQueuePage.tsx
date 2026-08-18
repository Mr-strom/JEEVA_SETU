import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useSync } from '../context/SyncContext';
import { PlusCircle, Clock, Truck, CheckCircle, HardDrive, AlertCircle } from 'lucide-react';

export const WorkerQueuePage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { referrals } = useSync();

  const getSyncBadge = (status: string) => {
    switch (status) {
      case 'SAVED_LOCALLY':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--sync-saved-text)',
              backgroundColor: 'var(--sync-saved-bg)',
              padding: '2px 8px',
              borderRadius: '12px',
            }}
          >
            <HardDrive size={11} />
            <span>{t('sync_SAVED_LOCALLY')}</span>
          </span>
        );
      case 'WAITING_TO_SYNC':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--sync-waiting-text)',
              backgroundColor: 'var(--sync-waiting-bg)',
              padding: '2px 8px',
              borderRadius: '12px',
            }}
          >
            <Clock size={11} />
            <span>{t('sync_WAITING_TO_SYNC')}</span>
          </span>
        );
      case 'SYNCHRONISED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--sync-synced-text)',
              backgroundColor: 'var(--sync-synced-bg)',
              padding: '2px 8px',
              borderRadius: '12px',
            }}
          >
            <CheckCircle size={11} />
            <span>{t('sync_SYNCHRONISED')}</span>
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--sync-failed-text)',
              backgroundColor: 'var(--sync-failed-bg)',
              padding: '2px 8px',
              borderRadius: '12px',
            }}
          >
            <AlertCircle size={11} />
            <span>{t('sync_SYNC_FAILED')}</span>
          </span>
        );
    }
  };

  return (
    <div className="client-content">
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
          {t('queueTitle')}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{t('queueSubtitle')}</p>
      </div>

      {/* Case List */}
      {referrals.length === 0 ? (
        <div className="form-card" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <p style={{ color: 'var(--text-sub)', fontSize: '14px', marginBottom: '16px' }}>
            {t('emptyQueue')}
          </p>
        </div>
      ) : (
        referrals.map((r) => (
          <div key={r.localId} className="case-card">
            <div className="case-card-header">
              <div className="case-id">{r.caseId || 'Draft Referral'}</div>
              {getSyncBadge(r.syncStatus)}
            </div>

            <div className="case-card-body">
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                {r.patientExternalId} {r.patientName ? `(${r.patientName})` : ''}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '2px' }}>
                {r.patientAge ? `${r.patientAge} yrs • ` : ''}G{r.gravida || 1}P{r.parity || 0}
              </div>

              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {r.riskFlags.map((flag) => (
                  <span
                    key={flag}
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#FCA5A5',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {flag.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>

              {r.clinicalSummary && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-main)', fontStyle: 'italic' }}>
                  "{r.clinicalSummary}"
                </div>
              )}
            </div>

            <div
              style={{
                borderTop: '1px solid var(--border-app)',
                paddingTop: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: 'var(--text-sub)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Truck size={13} style={{ color: 'var(--karnataka-gold)' }} />
                <span>{r.transportNeeded ? '108 Ambulance Requested' : 'Self Arranged'}</span>
              </div>
              <span>{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        ))
      )}

      {/* Single Primary Action Button */}
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={() => navigate('/')}
          className="primary-btn"
        >
          <PlusCircle size={18} />
          <span>{t('navNewReferral')}</span>
        </button>
      </div>
    </div>
  );
};
