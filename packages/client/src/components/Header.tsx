import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useSync } from '../context/SyncContext';
import { Globe, RefreshCw, Check, Clock, AlertCircle, HardDrive } from 'lucide-react';

export const Header: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { syncStatus, triggerSync } = useSync();

  const toggleLanguage = () => {
    setLanguage(language === 'kn' ? 'en' : 'kn');
  };

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'SAVED_LOCALLY':
        return <HardDrive size={14} />;
      case 'WAITING_TO_SYNC':
        return <Clock size={14} />;
      case 'SYNCHRONISED':
        return <Check size={14} />;
      case 'SYNC_FAILED':
        return <AlertCircle size={14} />;
    }
  };

  return (
    <header className="app-header">
      <div className="header-top">
        <div className="brand-section">
          <div className="flag-badge">JS</div>
          <div className="app-title-text">
            <h1>{t('appTitle')}</h1>
            <span>{t('workerFacility')}</span>
          </div>
        </div>

        <button
          onClick={toggleLanguage}
          aria-label={language === 'kn' ? 'Switch to English' : 'ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಿ'}
          style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-app)',
            color: 'var(--text-main)',
            padding: '6px 12px',
            borderRadius: '16px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Globe size={14} />
          <span>{language === 'kn' ? 'English' : 'ಕನ್ನಡ'}</span>
        </button>
      </div>

      {/* Persistent Sync Status Pill Banner */}
      <div
        className={`sync-banner sync-${syncStatus}`}
        role="status"
        aria-live="polite"
        tabIndex={0}
        aria-label={`Sync Status: ${t(`sync_${syncStatus}` as any) || syncStatus}`}
        onClick={triggerSync}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            triggerSync();
          }
        }}
        title="Tap to simulate sync state"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {getSyncIcon()}
          <span>{t(`sync_${syncStatus}` as any) || syncStatus}</span>
        </div>
        <RefreshCw size={13} />
      </div>
    </header>
  );
};
