import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { SyncProvider, useSync } from './context/SyncContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { NewReferralPage } from './pages/NewReferralPage';
import { WorkerQueuePage } from './pages/WorkerQueuePage';
import { FollowUpTasksPage } from './pages/FollowUpTasksPage';
import { AlertTriangle, X } from 'lucide-react';

const ConflictModal: React.FC = () => {
  const { activeConflict, dismissConflict } = useSync();

  if (!activeConflict) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={dismissConflict}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1.5px solid #EF4444',
          borderRadius: '12px',
          padding: '20px',
          maxWidth: '440px',
          width: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FCA5A5', fontWeight: 700, fontSize: '16px' }}>
            <AlertTriangle size={20} />
            <span>Sync Conflict Detected</span>
          </div>
          <button onClick={dismissConflict} style={{ background: 'none', border: 'none', color: 'var(--text-sub)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-main)', marginBottom: '12px' }}>
          {activeConflict.reason}
        </p>

        <div style={{ backgroundColor: 'var(--bg-app)', padding: '10px', borderRadius: '6px', fontSize: '12px', color: 'var(--text-sub)', marginBottom: '16px', border: '1px solid var(--border-app)' }}>
          <div style={{ fontWeight: 600, color: 'var(--karnataka-gold)', marginBottom: '4px' }}>Current Server State:</div>
          <div>Status: {activeConflict.serverState?.status || activeConflict.serverState?.outcome || 'Updated'}</div>
          <div>Last Modified: {activeConflict.serverState?.updatedAt || activeConflict.serverState?.completedAt || 'Recently'}</div>
        </div>

        <button onClick={dismissConflict} className="primary-btn" style={{ minHeight: '44px', padding: '10px' }}>
          <span>{activeConflict.nextAvailableAction.replace(/_/g, ' ')}</span>
        </button>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="mobile-app-wrapper" lang={language}>
      <Header />
      <ConflictModal />
      <Routes>
        <Route path="/" element={<NewReferralPage />} />
        <Route path="/queue" element={<WorkerQueuePage />} />
        <Route path="/follow-ups" element={<FollowUpTasksPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <SyncProvider>
          <AppLayout />
        </SyncProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
};

export default App;
