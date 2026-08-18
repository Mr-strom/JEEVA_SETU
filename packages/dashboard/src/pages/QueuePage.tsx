import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { ReferralCase } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Search, Filter, RefreshCw, Clock, ArrowRight } from 'lucide-react';

export const QueuePage: React.FC = () => {
  const { t } = useLanguage();
  const [cases, setCases] = useState<ReferralCase[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [delayedOnly, setDelayedOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const data = await api.listReferrals({
        status: statusFilter,
        query: searchQuery,
        delayedOnly,
      });
      setCases(data);
    } catch (err) {
      console.error('Failed to list referrals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter, delayedOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCases();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">{t('queueTitle')}</h1>
        <p className="page-subtitle">{t('queueSubtitle')}</p>
      </div>

      <div className="card">
        <div className="card-header">
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flex: 1 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <input
                type="text"
                className="search-input"
                style={{ width: '100%', paddingLeft: '36px' }}
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                }}
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm">
              <Search size={14} />
            </button>
          </form>

          <div className="filter-bar">
            {/* Status dropdown filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={15} style={{ color: 'var(--text-secondary)' }} />
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">{t('filterAll')}</option>
                <option value="ACKNOWLEDGEMENT_PENDING">{t('filterPendingAck')}</option>
                <option value="IN_TRANSIT">{t('filterInTransit')}</option>
                <option value="ARRIVED">{t('filterArrived')}</option>
                <option value="FOLLOW_UP_DUE">{t('filterFollowUp')}</option>
                <option value="CLOSED">{t('filterClosed')}</option>
              </select>
            </div>

            {/* SLA Delay Toggle */}
            <button
              onClick={() => setDelayedOnly(!delayedOnly)}
              className={`btn btn-sm ${delayedOnly ? 'btn-danger' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Clock size={14} />
              <span>{t('filterDelayedOnly')}</span>
            </button>

            {/* Refresh */}
            <button onClick={fetchCases} className="btn btn-secondary btn-sm" title="Refresh">
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
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
                <th>{t('thDeadline')}</th>
                <th>{t('thActions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px' }}>
                    {t('loading')}
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px' }}>
                    {t('noCasesFound')}
                  </td>
                </tr>
              ) : (
                cases.map((c) => {
                  const isOverdue =
                    c.status === 'ACKNOWLEDGEMENT_PENDING' &&
                    c.acknowledgementDeadline &&
                    new Date(c.acknowledgementDeadline) < new Date();

                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary-500)' }}>
                        <Link to={`/cases/${c.id}`} style={{ textDecoration: 'underline' }}>
                          {c.caseId}
                        </Link>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.patient.externalId}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {c.patient.age ? `${c.patient.age} yrs` : ''} • G{c.patient.gravida || 1}P
                          {c.patient.parity || 0}
                        </div>
                      </td>
                      <td>
                        <div>{c.sendingFacility?.name || '—'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {c.sendingFacility?.district || ''}
                        </div>
                      </td>
                      <td>
                        <div>{c.receivingFacility?.name || '—'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {c.receivingFacility?.district || ''}
                        </div>
                      </td>
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
                        {c.acknowledgementDeadline ? (
                          <div
                            style={{
                              fontSize: '12px',
                              color: isOverdue ? 'var(--status-danger-border)' : 'var(--text-secondary)',
                              fontWeight: isOverdue ? 700 : 400,
                            }}
                          >
                            {new Date(c.acknowledgementDeadline).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {isOverdue && ' (Overdue)'}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <Link to={`/cases/${c.id}`} className="btn btn-secondary btn-sm">
                          <span>{t('viewDetails')}</span>
                          <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
