import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DashboardSummary, ReferralCase } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Activity, AlertTriangle, CheckCircle, Clock, ArrowRight, CornerUpRight } from 'lucide-react';

export const DashboardSummaryPage: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentCases, setRecentCases] = useState<ReferralCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [sum, cases] = await Promise.all([
          api.getDashboardSummary(user.role),
          api.listReferrals(),
        ]);
        if (isMounted) {
          setSummary(sum);
          setRecentCases(cases.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to load dashboard summary', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [user.role]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">{t('navDashboard')}</h1>
        <p className="page-subtitle">
          {t('queueSubtitle')} • {t(`role_${user.role}` as any)}
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">{t('metrics_open')}</span>
            <Activity size={20} style={{ color: 'var(--primary-500)' }} />
          </div>
          <div className="metric-value">{loading ? '...' : summary?.openCases ?? 0}</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">{t('metrics_overdue')}</span>
            <Clock size={20} style={{ color: '#F59E0B' }} />
          </div>
          <div className="metric-value" style={{ color: '#FDE68A' }}>
            {loading ? '...' : summary?.overdueCount ?? 0}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">{t('metrics_escalated')}</span>
            <AlertTriangle size={20} style={{ color: '#EF4444' }} />
          </div>
          <div className="metric-value" style={{ color: '#FCA5A5' }}>
            {loading ? '...' : summary?.escalatedCount ?? 0}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">{t('metrics_rerouted')}</span>
            <CornerUpRight size={20} style={{ color: '#A855F7' }} />
          </div>
          <div className="metric-value" style={{ color: '#E9D5FF' }}>
            {loading ? '...' : summary?.reroutedCount ?? 0}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">{t('metrics_closed')}</span>
            <CheckCircle size={20} style={{ color: '#10B981' }} />
          </div>
          <div className="metric-value" style={{ color: '#A7F3D0' }}>
            {loading ? '...' : summary?.closedCount ?? 0}
          </div>
        </div>
      </div>

      {/* Recent Cases Quick Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{t('queueTitle')}</h2>
          <Link to="/queue" className="btn btn-secondary btn-sm">
            <span>{t('filterAll')}</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('thCaseId')}</th>
                <th>{t('thPatient')}</th>
                <th>{t('thSendingFacility')}</th>
                <th>{t('thReceivingFacility')}</th>
                <th>{t('thRiskFlags')}</th>
                <th>{t('thStatus')}</th>
                <th>{t('thActions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>
                    {t('loading')}
                  </td>
                </tr>
              ) : recentCases.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>
                    {t('noCasesFound')}
                  </td>
                </tr>
              ) : (
                recentCases.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary-500)' }}>{c.caseId}</td>
                    <td>
                      <div>{c.patient.externalId}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {c.patient.age ? `${c.patient.age} yrs` : ''} • G{c.patient.gravida || 1}P{c.patient.parity || 0}
                      </div>
                    </td>
                    <td>{c.sendingFacility?.name || '—'}</td>
                    <td>{c.receivingFacility?.name || '—'}</td>
                    <td>
                      {c.riskFlags.map((rf) => (
                        <span key={rf} className="risk-pill">
                          {rf.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>
                      <Link to={`/cases/${c.id}`} className="btn btn-secondary btn-sm">
                        {t('viewDetails')}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
