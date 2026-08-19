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
        return <HardDrive size={15} />;
      case 'WAITING_TO_SYNC':
        return <Clock size={15} />;
      case 'SYNCHRONISED':
        return <Check size={15} />;
      case 'SYNC_FAILED':
        return <AlertCircle size={15} />;
    }
  };

  const getStatusText = () => {
    return t(`sync_${syncStatus}` as any) || syncStatus;
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
            border: '1.5px solid var(--border-app)',
            color: 'var(--text-main)',
            padding: '8px 14px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 800,
            cursor: 'pointer',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
        >
          <Globe size={16} />
          <span>{language === 'kn' ? 'English' : 'ಕನ್ನಡ'}</span>
        </button>
      </div>

      {/* 3-State Status Strip Banner */}
      <div
        className={`sync-banner sync-${syncStatus}`}
        role="status"
        aria-live="polite"
        tabIndex={0}
        aria-label={`Sync Status: ${getStatusText()}`}
        onClick={triggerSync}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            triggerSync();
          }
        }}
        title="Tap to trigger immediate server sync"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="sync-pulse-dot" />
          {getSyncIcon()}
          <span>{getStatusText()}</span>
        </div>
        <RefreshCw size={14} style={{ opacity: 0.85 }} />
      </div>
    </header>
  );
};
