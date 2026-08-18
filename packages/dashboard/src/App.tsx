import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { DashboardSummaryPage } from './pages/DashboardSummaryPage';
import { QueuePage } from './pages/QueuePage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { DispositionPage } from './pages/DispositionPage';
import { FollowUpsPage } from './pages/FollowUpsPage';

const ProtectedRoute: React.FC<{ route: string; children: React.ReactNode }> = ({
  route,
  children,
}) => {
  const { canAccessRoute } = useAuth();
  if (!canAccessRoute(route)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const AppLayout: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="app-container" lang={language}>
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <Routes>
          <Route path="/" element={<DashboardSummaryPage />} />
          <Route path="/dashboard" element={<DashboardSummaryPage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/cases/:id" element={<CaseDetailPage />} />
          <Route
            path="/disposition"
            element={
              <ProtectedRoute route="/disposition">
                <DispositionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/follow-ups"
            element={
              <ProtectedRoute route="/follow-ups">
                <FollowUpsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
};

export default App;
