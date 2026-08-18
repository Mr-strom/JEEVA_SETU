import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, ListOrdered, CheckSquare, Stethoscope, User } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { t } = useLanguage();
  const { user, canAccessRoute } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-badge">JS</div>
        <div className="brand-text">
          <h1>{t('appTitle')}</h1>
          <span>{t('appSubtitle')}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {canAccessRoute('/dashboard') && (
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>{t('navDashboard')}</span>
          </NavLink>
        )}

        {canAccessRoute('/queue') && (
          <NavLink
            to="/queue"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <ListOrdered size={18} />
            <span>{t('navQueue')}</span>
          </NavLink>
        )}

        {canAccessRoute('/disposition') && (
          <NavLink
            to="/disposition"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Stethoscope size={18} />
            <span>{t('recordDisposition')}</span>
          </NavLink>
        )}

        {canAccessRoute('/follow-ups') && (
          <NavLink
            to="/follow-ups"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <CheckSquare size={18} />
            <span>{t('navFollowUps')}</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-500)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <User size={18} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.name}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.facilityName || user.district || t(`role_${user.role}` as any)}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
