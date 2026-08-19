import React from 'react';
import { useSync } from '../context/SyncContext';
import { useLanguage } from '../context/LanguageContext';
import { WifiOff, Database, ArrowUpRight } from 'lucide-react';

export const OfflineDemoBanner: React.FC = () => {
  const { isOfflineSimulated, pendingCount, setIsOfflineSimulated } = useSync();
  const { t } = useLanguage();

  if (!isOfflineSimulated) return null;

  return (
    <div
      style={{
        backgroundColor: '#78350F',
        borderBottom: '1.5px solid #F59E0B',
        color: '#FEF08A',
        padding: '10px 14px',
        fontSize: '13px',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: '68px',
        zIndex: 25,
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <WifiOff size={16} style={{ color: '#FDE047', minWidth: 16 }} />
        <div>
          <span>{t('offlineBannerTitle')}</span>
          <span
            style={{
              marginLeft: '8px',
              backgroundColor: 'rgba(0,0,0,0.4)',
              border: '1px solid #F59E0B',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 800,
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Database size={10} />
            <span>{pendingCount} {t('itemsQueued')}</span>
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsOfflineSimulated(false)}
        style={{
          background: '#0F172A',
          border: '1px solid #FDE047',
          color: '#FDE047',
          padding: '4px 10px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap',
        }}
        title="Reconnect and drain local queue to server"
      >
        <span>Go Online</span>
        <ArrowUpRight size={12} />
      </button>
    </div>
  );
};
