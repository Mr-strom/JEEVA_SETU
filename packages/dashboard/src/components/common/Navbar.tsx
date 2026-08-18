import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth, DEMO_USERS } from '../../context/AuthContext';
import { Role } from '../../types';
import { ShieldAlert, Globe, UserCheck } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { user, setRole } = useAuth();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'kn' : 'en');
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRole(e.target.value as Role);
  };

  return (
    <header className="topbar">
      <div className="safety-banner">
        <ShieldAlert size={16} />
        <span>{t('safetyDisclaimer')}</span>
      </div>

      <div className="topbar-actions">
        {/* Role Switcher (Demo Simulator) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCheck size={16} style={{ color: 'var(--text-secondary)' }} />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {t('switchRole')}
          </span>
          <select
            className="filter-select"
            value={user.role}
            onChange={handleRoleChange}
            style={{ padding: '6px 10px', fontSize: '13px' }}
          >
            {Object.keys(DEMO_USERS).map((r) => (
              <option key={r} value={r}>
                {t(`role_${r as Role}` as any)}
              </option>
            ))}
          </select>
        </div>

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          title="Switch Language (ಕನ್ನಡ / English)"
        >
          <Globe size={15} />
          <span style={{ fontWeight: 700 }}>
            {language === 'en' ? 'ಕನ್ನಡ' : 'English'}
          </span>
        </button>
      </div>
    </header>
  );
};
