import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { PlusCircle, List, CheckSquare } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { t } = useLanguage();

  return (
    <nav className="bottom-nav">
      <NavLink
        to="/"
        end
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <PlusCircle size={22} />
        <span>{t('navNewReferral')}</span>
      </NavLink>

      <NavLink
        to="/queue"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <List size={22} />
        <span>{t('navMyQueue')}</span>
      </NavLink>

      <NavLink
        to="/follow-ups"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <CheckSquare size={22} />
        <span>{t('navFollowUps')}</span>
      </NavLink>
    </nav>
  );
};
