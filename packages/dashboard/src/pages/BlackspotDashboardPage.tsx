import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  AlertTriangle,
  Building2,
  Activity,
  ArrowRightLeft,
  Clock,
  Filter,
  X,
  Layers,
} from 'lucide-react';

interface BlackspotItem {
  facilityId: string;
  facilityName: string;
  facilityNameKn: string;
  district: string;
  districtKn?: string;
  facilityType: string;
  totalCases: number;
  rejectionsCount: number;
  rejectionRate: number;
  capacitySignalsCount: number;
  capacitySignalsByReason: {
    NO_BED: number;
    SERVICE_UNAVAILABLE: number;
    NO_CLINICIAN: number;
    TRANSPORT_UNAVAILABLE: number;
    OTHER: number;
  };
  reroutingCount: number;
  medianAckMinutes: number | null;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const DEMO_BLACKSPOTS: BlackspotItem[] = [
  {
    facilityId: '11111111-1111-1111-1111-111111111101',
    facilityName: 'Vani Vilas Hospital (BMCRI)',
    facilityNameKn: 'ವಾಣಿ ವಿಲಾಸ ಆಸ್ಪತ್ರೆ',
    district: 'Bangalore Urban',
    facilityType: 'TERTIARY_HOSPITAL',
    totalCases: 42,
    rejectionsCount: 16,
    rejectionRate: 0.38,
    capacitySignalsCount: 14,
    capacitySignalsByReason: {
      NO_BED: 9,
      SERVICE_UNAVAILABLE: 2,
      NO_CLINICIAN: 1,
      TRANSPORT_UNAVAILABLE: 2,
      OTHER: 0,
    },
    reroutingCount: 12,
    medianAckMinutes: 28,
    severity: 'HIGH',
  },
  {
    facilityId: '22222222-2222-2222-2222-222222222201',
    facilityName: 'Cheluvamba Hospital (MMCRI)',
    facilityNameKn: 'ಚೆಲುವಾಂಬ ಆಸ್ಪತ್ರೆ',
    district: 'Mysuru',
    facilityType: 'TERTIARY_HOSPITAL',
    totalCases: 28,
    rejectionsCount: 12,
    rejectionRate: 0.43,
    capacitySignalsCount: 11,
    capacitySignalsByReason: {
      NO_BED: 7,
      SERVICE_UNAVAILABLE: 3,
      NO_CLINICIAN: 1,
      TRANSPORT_UNAVAILABLE: 0,
      OTHER: 0,
    },
    reroutingCount: 9,
    medianAckMinutes: 34,
    severity: 'CRITICAL',
  },
  {
    facilityId: '33333333-3333-3333-3333-333333333301',
    facilityName: 'GIMS Teaching Hospital',
    facilityNameKn: 'ಜಿಮ್ಸ್ ಬೋಧನಾ ಆಸ್ಪತ್ರೆ',
    district: 'Kalaburagi',
    facilityType: 'TERTIARY_HOSPITAL',
    totalCases: 19,
    rejectionsCount: 3,
    rejectionRate: 0.16,
    capacitySignalsCount: 3,
    capacitySignalsByReason: {
      NO_BED: 1,
      SERVICE_UNAVAILABLE: 2,
      NO_CLINICIAN: 0,
      TRANSPORT_UNAVAILABLE: 0,
      OTHER: 0,
    },
    reroutingCount: 2,
    medianAckMinutes: 18,
    severity: 'MEDIUM',
  },
];

export const BlackspotDashboardPage: React.FC = () => {
  const { language, t } = useLanguage();

  const [rollingDays, setRollingDays] = useState<number>(30);
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');
  const [selectedFacilitySignals, setSelectedFacilitySignals] = useState<BlackspotItem | null>(null);

  const filteredBlackspots = DEMO_BLACKSPOTS.filter((b) => {
    if (districtFilter !== 'ALL' && b.district !== districtFilter) return false;
    return true;
  });

  const totalTracked = filteredBlackspots.length;
  const totalCapacitySignals = filteredBlackspots.reduce((acc, b) => acc + b.capacitySignalsCount, 0);
  const avgRejectionRate =
    totalTracked > 0
      ? Math.round(
          (filteredBlackspots.reduce((acc, b) => acc + b.rejectionRate, 0) / totalTracked) * 100,
        )
      : 0;
  const totalReroutes = filteredBlackspots.reduce((acc, b) => acc + b.reroutingCount, 0);

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return { bg: 'rgba(239, 68, 68, 0.2)', text: '#FCA5A5', border: '#EF4444' };
      case 'HIGH':
        return { bg: 'rgba(249, 115, 22, 0.2)', text: '#FDBA74', border: '#F97316' };
      case 'MEDIUM':
        return { bg: 'rgba(245, 158, 11, 0.2)', text: '#FDE68A', border: '#F59E0B' };
      default:
        return { bg: 'rgba(16, 185, 129, 0.2)', text: '#A7F3D0', border: '#10B981' };
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>
          {t('blackspotTitle')}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-sub)' }}>{t('blackspotSubtitle')}</p>
      </div>

      {/* MANDATORY PERSISTENT UNMISSABLE SAFETY DISCLAIMER */}
      <div
        style={{
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          border: '2px solid #F59E0B',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <AlertTriangle size={22} style={{ color: '#F59E0B', flexShrink: 0 }} />
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#FDE68A', lineHeight: 1.4 }}>
          {t('blackspotDisclaimer')}
        </div>
      </div>

      {/* Filter Bar & Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-sub)' }}>
            <Filter size={15} />
            <span>District:</span>
          </div>
          <select
            id="blackspot-district-filter"
            aria-label="Filter blackspots by district"
            className="form-select"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
          >
            <option value="ALL">All Districts (Karnataka)</option>
            <option value="Bangalore Urban">Bangalore Urban</option>
            <option value="Mysuru">Mysuru</option>
            <option value="Kalaburagi">Kalaburagi</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} role="group" aria-label="Filter window duration">
          <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>{t('filterRollingDays')}</span>
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              aria-label={`Filter data for past ${days} days`}
              aria-pressed={rollingDays === days}
              onClick={() => setRollingDays(days)}
              style={{
                backgroundColor: rollingDays === days ? 'var(--border-active)' : 'var(--bg-surface)',
                color: rollingDays === days ? '#FFF' : 'var(--text-main)',
                border: '1px solid var(--border-app)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-app)', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-sub)', fontSize: '12px', marginBottom: '6px' }}>
            <Building2 size={16} />
            <span>{t('statTotalTracked')}</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800 }}>{totalTracked}</div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-app)', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', fontSize: '12px', marginBottom: '6px' }}>
            <Activity size={16} />
            <span>{t('statCapacitySignals')}</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#EF4444' }}>{totalCapacitySignals}</div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-app)', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F59E0B', fontSize: '12px', marginBottom: '6px' }}>
            <Layers size={16} />
            <span>{t('statAvgRejectionRate')}</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#F59E0B' }}>{avgRejectionRate}%</div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-app)', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--border-active)', fontSize: '12px', marginBottom: '6px' }}>
            <ArrowRightLeft size={16} />
            <span>{t('statReroutes')}</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--border-active)' }}>{totalReroutes}</div>
        </div>
      </div>

      {/* Blackspots Heatmap Table */}
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-app)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <caption style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
            {t('blackspotTitle')}
          </caption>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-app)', color: 'var(--text-sub)' }}>
              <th scope="col" style={{ padding: '12px 16px' }}>{t('colFacility')}</th>
              <th scope="col" style={{ padding: '12px 16px' }}>{t('colTotalCases')}</th>
              <th scope="col" style={{ padding: '12px 16px' }}>{t('colRejectionRate')}</th>
              <th scope="col" style={{ padding: '12px 16px' }}>{t('colSignals')}</th>
              <th scope="col" style={{ padding: '12px 16px' }}>{t('colReroutes')}</th>
              <th scope="col" style={{ padding: '12px 16px' }}>{t('colMedianAck')}</th>
              <th scope="col" style={{ padding: '12px 16px' }}>{t('colSeverity')}</th>
              <th scope="col" style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBlackspots.map((item) => {
              const sev = getSeverityStyle(item.severity);
              return (
                <tr key={item.facilityId} style={{ borderBottom: '1px solid var(--border-app)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {language === 'kn' ? item.facilityNameKn : item.facilityName}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>
                      {item.district} • {item.facilityType}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{item.totalCases}</td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, width: '36px' }}>
                        {Math.round(item.rejectionRate * 100)}%
                      </span>
                      <div style={{ width: '60px', height: '6px', backgroundColor: 'var(--bg-app)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(100, item.rejectionRate * 100)}%`,
                            height: '100%',
                            backgroundColor: item.rejectionRate >= 0.3 ? '#EF4444' : item.rejectionRate >= 0.15 ? '#F59E0B' : '#10B981',
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontWeight: 700, color: item.capacitySignalsCount > 0 ? '#EF4444' : 'inherit' }}>
                      {item.capacitySignalsCount}
                    </span>
                    <div style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
                      Bed: {item.capacitySignalsByReason.NO_BED} | Svc: {item.capacitySignalsByReason.SERVICE_UNAVAILABLE}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{item.reroutingCount}</td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} style={{ color: 'var(--text-sub)' }} />
                      <span>{item.medianAckMinutes !== null ? `${item.medianAckMinutes}m` : '—'}</span>
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: sev.bg,
                        color: sev.text,
                        border: `1px solid ${sev.border}`,
                      }}
                    >
                      {item.severity}
                    </span>
                  </td>

                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedFacilitySignals(item)}
                      aria-label={`View capacity signals for ${item.facilityName}`}
                      className="secondary-btn"
                      style={{ width: 'auto', padding: '4px 10px', fontSize: '11px', minHeight: '30px' }}
                    >
                      {t('viewSignalsBtn')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Suppression notice */}
        <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-app)', borderTop: '1px solid var(--border-app)', fontSize: '12px', color: 'var(--text-sub)' }}>
          ℹ️ {t('blackspotSuppressionNotice').replace('{count}', '5')}
        </div>
      </div>

      {/* Non-identifying Capacity Signals History Modal */}
      {selectedFacilitySignals && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="blackspot-facility-name"
          aria-describedby="blackspot-signals-desc"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setSelectedFacilitySignals(null);
            } else if (e.key === 'Tab') {
              const modal = e.currentTarget;
              const focusables = modal.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
              );
              if (focusables.length > 0) {
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }
          }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-app)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 id="blackspot-facility-name" style={{ fontSize: '16px', fontWeight: 700 }}>
                  {selectedFacilitySignals.facilityName}
                </h3>
                <span id="blackspot-signals-desc" style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
                  {t('signalsModalTitle')}
                </span>
              </div>
              <button
                onClick={() => setSelectedFacilitySignals(null)}
                aria-label="Close signals dialog"
                style={{ background: 'none', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
              {selectedFacilitySignals.capacitySignalsCount === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-sub)' }}>No capacity signals recorded in this window.</p>
              ) : (
                [
                  { id: 'sig-1', reasonCode: 'NO_BED', createdAt: '2026-08-18 09:30 UTC' },
                  { id: 'sig-2', reasonCode: 'SERVICE_UNAVAILABLE', createdAt: '2026-08-17 14:15 UTC' },
                  { id: 'sig-3', reasonCode: 'NO_BED', createdAt: '2026-08-16 11:00 UTC' },
                ].map((sig) => (
                  <div key={sig.id} style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-app)', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ fontWeight: 700, color: '#EF4444' }}>{sig.reasonCode}</span>
                    <span style={{ color: 'var(--text-sub)' }}>{sig.createdAt}</span>
                  </div>
                ))
              )}
            </div>

            <button onClick={() => setSelectedFacilitySignals(null)} className="primary-btn" autoFocus>
              <span>{t('confirm')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
