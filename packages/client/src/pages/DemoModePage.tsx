import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoRole, DEMO_ACCOUNTS, DemoAccount } from '../context/DemoRoleContext';
import { useLanguage } from '../context/LanguageContext';
import { ArrowRight, Shield, Sparkles, CheckCircle2 } from 'lucide-react';

export const DemoModePage: React.FC = () => {
  const { currentRole, switchRole } = useDemoRole();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const handleSelectRole = (account: DemoAccount) => {
    switchRole(account.id);
    navigate(account.targetRoute);
  };

  return (
    <div className="client-content" style={{ paddingBottom: '90px' }}>
      {/* Banner Header */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1.5px solid #F59E0B',
            color: '#FDE047',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '10px',
          }}
        >
          <Sparkles size={14} />
          <span>Judge Presentation • Demo Switcher</span>
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#FFFFFF', marginBottom: '6px' }}>
          Select Live Demo Persona
        </h2>
        <p style={{ fontSize: '14px', color: '#94A3B8', maxWidth: '380px', margin: '0 auto' }}>
          Switch viewpoints instantly to experience closed-loop handoffs from frontline to triage to supervisor.
        </p>
      </div>

      {/* 5 Demo Persona Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {DEMO_ACCOUNTS.map((account) => {
          const isSelected = currentRole.id === account.id;

          return (
            <div
              key={account.id}
              onClick={() => handleSelectRole(account)}
              tabIndex={0}
              role="button"
              aria-label={`Switch to ${account.name} - ${account.roleTitle}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectRole(account);
                }
              }}
              style={{
                backgroundColor: isSelected ? 'rgba(30, 41, 59, 0.95)' : '#0F172A',
                border: isSelected ? `2px solid ${account.badgeColor}` : '1.5px solid #334155',
                borderRadius: '16px',
                padding: '16px 18px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSelected
                  ? `0 0 20px ${account.badgeColor}33, 0 4px 12px rgba(0,0,0,0.5)`
                  : '0 2px 8px rgba(0,0,0,0.3)',
                position: 'relative',
              }}
            >
              {/* Top Row: Avatar, Name, and Role Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px', lineHeight: 1 }}>{account.avatarIcon}</span>
                  <div>
                    <div style={{ fontSize: '17px', fontWeight: 900, color: '#FFFFFF' }}>
                      {language === 'kn' ? account.nameKn : account.name}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: account.badgeColor }}>
                      {language === 'kn' ? account.roleTitleKn : account.roleTitle}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: `${account.badgeColor}25`,
                      color: account.badgeColor,
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 800,
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>Active</span>
                  </div>
                )}
              </div>

              {/* Facility & Location Info */}
              <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '10px' }}>
                📍 <strong>{account.facility}</strong> • {account.district}
              </div>

              {/* Persona Description */}
              <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.45, marginBottom: '12px' }}>
                {account.description}
              </p>

              {/* Launch Action Button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '1px solid #1E293B',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: isSelected ? account.badgeColor : '#60A5FA',
                }}
              >
                <span>Launch Persona Workspace</span>
                <ArrowRight size={16} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Dev-Only Notice Footnote */}
      <div
        style={{
          marginTop: '24px',
          padding: '12px',
          borderRadius: '10px',
          backgroundColor: '#070C18',
          border: '1px solid #1E293B',
          textAlign: 'center',
          fontSize: '12px',
          color: '#64748B',
        }}
      >
        <Shield size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
        <span>Development / Demo Preview Route (/demomode) • Not accessible in standard production workflows</span>
      </div>
    </div>
  );
};
