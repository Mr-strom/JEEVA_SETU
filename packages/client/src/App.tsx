import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { SyncProvider } from './context/SyncContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { NewReferralPage } from './pages/NewReferralPage';
import { WorkerQueuePage } from './pages/WorkerQueuePage';
import { FollowUpTasksPage } from './pages/FollowUpTasksPage';

const AppLayout: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="mobile-app-wrapper" lang={language}>
      <Header />
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
