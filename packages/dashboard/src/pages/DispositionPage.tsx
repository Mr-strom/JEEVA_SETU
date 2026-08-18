import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { ReferralCase } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DispositionPage: React.FC = () => {
  const { t } = useLanguage();
  const [arrivedCases, setArrivedCases] = useState<ReferralCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadArrived() {
      setLoading(true);
      try {
        const all = await api.listReferrals();
        setArrivedCases(all.filter((c) => ['ARRIVED', 'CLINICAL_DISPOSITION_RECORDED'].includes(c.status)));
      } catch (err) {
        console.error('Failed to fetch arrived referrals', err);
      } finally {
        setLoading(false);
      }
    }
    loadArrived();
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">{t('recordDisposition')}</h1>
        <p className="page-subtitle">
          {t('role_CLINICIAN')} • Inpatient triage, clinical admission & discharge management
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Arrived Inpatients Awaiting Disposition & Discharge</h2>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('thCaseId')}</th>
                <th>{t('thPatient')}</th>
                <th>{t('thSendingFacility')}</th>
                <th>{t('thRiskFlags')}</th>
                <th>{t('thStatus')}</th>
                <th>Latest Disposition</th>
                <th>{t('thActions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px' }}>
                    {t('loading')}
                  </td>
                </tr>
              ) : arrivedCases.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px' }}>
                    No arrived patients currently awaiting disposition.
                  </td>
                </tr>
              ) : (
                arrivedCases.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary-500)' }}>
                      <Link to={`/cases/${c.id}`}>{c.caseId}</Link>
                    </td>
                    <td>
                      <div>{c.patient.externalId}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {c.patient.age ? `${c.patient.age} yrs` : ''} • G{c.patient.gravida || 1}P{c.patient.parity || 0}
                      </div>
                    </td>
                    <td>{c.sendingFacility?.name || '—'}</td>
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
                      {c.dispositions && c.dispositions.length > 0 ? (
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {c.dispositions[c.dispositions.length - 1].category.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pending Evaluation</span>
                      )}
                    </td>
                    <td>
                      <Link to={`/cases/${c.id}`} className="btn btn-primary btn-sm">
                        <Stethoscope size={14} />
                        <span>Manage Clinical Care</span>
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
