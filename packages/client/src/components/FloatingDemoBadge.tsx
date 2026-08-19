import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDemoRole } from '../context/DemoRoleContext';
import { useSync } from '../context/SyncContext';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeftRight, Wifi, WifiOff } from 'lucide-react';

export const FloatingDemoBadge: React.FC = () => {
  const { currentRole, isDemoMode } = useDemoRole();
  const { isOfflineSimulated, toggleOfflineSimulation, pendingCount } = useSync();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show the floating badge if we're already on the /demomode page
  if (!isDemoMode || location.pathname === '/demomode') {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '84px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 45,
        width: 'calc(100% - 24px)',
        maxWidth: '420px',
        backgroundColor: '#0B1120',
        border: `1.5px solid ${isOfflineSimulated ? '#F59E0B' : currentRole.badgeColor}`,
        borderRadius: '24px',
        padding: '8px 12px',
        boxShadow: `0 8px 24px rgba(0, 0, 0, 0.8), 0 0 16px ${isOfflineSimulated ? '#F59E0B40' : currentRole.badgeColor + '40'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Left: Persona info (click to open switcher) */}
      <div
        onClick={() => navigate('/demomode')}
        tabIndex={0}
        role="button"
        aria-label={`Demo Role: ${currentRole.name}. Tap to switch persona.`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate('/demomode');
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          flex: 1,
        }}
        title="Tap to switch demo persona"
      >
        <span style={{ fontSize: '20px', lineHeight: 1 }}>{currentRole.avatarIcon}</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.04em' }}>
              Persona
            </span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: currentRole.badgeColor, boxShadow: `0 0 6px ${currentRole.badgeColor}` }} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
            {language === 'kn' ? currentRole.nameKn : currentRole.name} • <span style={{ color: currentRole.badgeColor }}>{language === 'kn' ? currentRole.roleTitleKn : currentRole.roleTitle}</span>
          </span>
        </div>
      </div>

      {/* Right Actions: Offline Simulation Toggle & Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Offline Simulation Toggle Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleOfflineSimulation();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: isOfflineSimulated ? '#78350F' : '#1E293B',
            color: isOfflineSimulated ? '#FDE047' : '#94A3B8',
            border: isOfflineSimulated ? '1.5px solid #F59E0B' : '1px solid #334155',
            padding: '5px 8px',
            borderRadius: '14px',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title={isOfflineSimulated ? 'Offline mode active (click to reconnect & sync)' : 'Click to simulate offline network'}
        >
          {isOfflineSimulated ? <WifiOff size={13} /> : <Wifi size={13} />}
          <span>{isOfflineSimulated ? 'Offline' : 'Sim Offline'}</span>
          {isOfflineSimulated && pendingCount > 0 && (
            <span
              style={{
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '1px 5px',
                fontSize: '10px',
                fontWeight: 900,
                marginLeft: '2px',
              }}
            >
              {pendingCount}
            </span>
          )}
        </button>

        {/* Quick Switch Button */}
        <button
          type="button"
          onClick={() => navigate('/demomode')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            backgroundColor: '#1E293B',
            color: '#60A5FA',
            padding: '5px 8px',
            borderRadius: '14px',
            fontSize: '11px',
            fontWeight: 800,
            border: '1px solid #334155',
            cursor: 'pointer',
          }}
          title="Switch Demo Persona"
        >
          <ArrowLeftRight size={12} />
          <span>Switch</span>
        </button>
      </div>
    </div>
  );
};
