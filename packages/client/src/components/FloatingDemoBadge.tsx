import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDemoRole } from '../context/DemoRoleContext';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeftRight } from 'lucide-react';

export const FloatingDemoBadge: React.FC = () => {
  const { currentRole, isDemoMode } = useDemoRole();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show the floating badge if we're already on the /demomode page
  if (!isDemoMode || location.pathname === '/demomode') {
    return null;
  }

  return (
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
        position: 'fixed',
        bottom: '84px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 45,
        width: 'calc(100% - 32px)',
        maxWidth: '400px',
        backgroundColor: '#0F172A',
        border: `1.5px solid ${currentRole.badgeColor}`,
        borderRadius: '30px',
        padding: '8px 14px',
        boxShadow: `0 4px 20px rgba(0, 0, 0, 0.7), 0 0 14px ${currentRole.badgeColor}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.2s ease',
      }}
      title="Tap to switch demo persona"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '20px', lineHeight: 1 }}>{currentRole.avatarIcon}</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.04em' }}>
              Demo Persona
            </span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: currentRole.badgeColor, boxShadow: `0 0 6px ${currentRole.badgeColor}` }} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
            {language === 'kn' ? currentRole.nameKn : currentRole.name} • <span style={{ color: currentRole.badgeColor }}>{language === 'kn' ? currentRole.roleTitleKn : currentRole.roleTitle}</span>
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: '#1E293B',
          color: '#60A5FA',
          padding: '5px 10px',
          borderRadius: '16px',
          fontSize: '12px',
          fontWeight: 800,
          border: '1px solid #334155',
        }}
      >
        <ArrowLeftRight size={13} />
        <span>Switch</span>
      </div>
    </div>
  );
};
