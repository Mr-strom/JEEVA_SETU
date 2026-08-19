import React, { createContext, useContext, useState, useEffect } from 'react';

export interface DemoAccount {
  id: string;
  name: string;
  nameKn: string;
  roleTitle: string;
  roleTitleKn: string;
  email: string;
  facility: string;
  district: string;
  badgeColor: string;
  avatarIcon: string;
  description: string;
  targetRoute: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'asha',
    name: 'Radha Bai',
    nameKn: 'ರಾಧಾ ಬಾಯಿ',
    roleTitle: 'ASHA Frontline Worker',
    roleTitleKn: 'ಆಶಾ ಆರೋಗ್ಯ ಕಾರ್ಯಕರ್ತೆ',
    email: 'asha.radha@jeevasetu.internal',
    facility: 'Bilikere PHC',
    district: 'Mysuru',
    badgeColor: '#10B981',
    avatarIcon: '👩‍⚕️',
    description: 'Identifies high-risk mothers in villages, initiates emergency 108 referral, and conducts postnatal home visits.',
    targetRoute: '/',
  },
  {
    id: 'triage',
    name: 'Referral Triage Desk',
    nameKn: 'ರೆಫರಲ್ ಟ್ರಿಯಾಜ್ ಡೆಸ್ಕ್',
    roleTitle: 'Receiving Referral Desk',
    roleTitleKn: 'ಸ್ವೀಕರಿಸುವ ಆಸ್ಪತ್ರೆ ಡೆಸ್ಕ್',
    email: 'referrals.cheluvamba@jeevasetu.internal',
    facility: 'Cheluvamba Hospital (MMCRI)',
    district: 'Mysuru',
    badgeColor: '#3B82F6',
    avatarIcon: '🏥',
    description: 'Monitors inbound 108 emergency referrals, reserves maternal ICU beds within 30-min SLA, records capacity.',
    targetRoute: '/queue',
  },
  {
    id: 'clinician',
    name: 'Dr. Savitha (OBGYN)',
    nameKn: 'ಡಾ. ಸವಿತಾ (ಸ್ತ್ರೀರೋಗ ತಜ್ಞರು)',
    roleTitle: 'Senior Obstetrician',
    roleTitleKn: 'ಹಿರಿಯ ಸ್ತ್ರೀರೋಗ ತಜ್ಞರು',
    email: 'dr.savitha.obgyn@jeevasetu.internal',
    facility: 'Cheluvamba Hospital HDU',
    district: 'Mysuru',
    badgeColor: '#8B5CF6',
    avatarIcon: '🩺',
    description: 'Records patient arrival vitals, emergency LSCS surgery dispositions, discharge plans, and scheduled visits.',
    targetRoute: '/follow-ups',
  },
  {
    id: 'supervisor',
    name: 'Kavitha H',
    nameKn: 'ಕವಿತಾ ಎಚ್',
    roleTitle: 'District RCH Supervisor',
    roleTitleKn: 'ಜಿಲ್ಲಾ ಆರ್‌ಸಿಎಚ್ ಮೇಲ್ವಿಚಾರಕರು',
    email: 'supervisor.mysuru@jeevasetu.internal',
    facility: 'District Health Office',
    district: 'Mysuru',
    badgeColor: '#F59E0B',
    avatarIcon: '📋',
    description: 'Reviews GapSense breakdown events, validates "likely cause" suggestions, and executes bilingual action playbooks.',
    targetRoute: '/queue',
  },
  {
    id: 'admin',
    name: 'Directorate Admin',
    nameKn: 'ಆರೋಗ್ಯ ನಿರ್ದೇಶನಾಲಯ',
    roleTitle: 'State Health Administrator',
    roleTitleKn: 'ರಾಜ್ಯ ಆರೋಗ್ಯ ಆಡಳಿತಾಧಿಕಾರಿ',
    email: 'admin.karnataka@jeevasetu.internal',
    facility: 'Directorate of Health Services',
    district: 'Karnataka (Statewide)',
    badgeColor: '#EF4444',
    avatarIcon: '🏛️',
    description: 'Monitors statewide Referral Blackspot intelligence, capacity signals, and privacy threshold suppressions.',
    targetRoute: '/queue',
  },
];

interface DemoRoleContextType {
  currentRole: DemoAccount;
  switchRole: (accountId: string) => void;
  isDemoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
}

const DemoRoleContext = createContext<DemoRoleContextType | undefined>(undefined);

export const DemoRoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoMode, setDemoMode] = useState<boolean>(() => {
    // Enabled in dev builds, or if flag is present in localStorage / search params
    return Boolean(
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) ||
      localStorage.getItem('jeevasetu_demo_mode') === 'true' ||
      window.location.search.includes('demo=1') ||
      window.location.pathname === '/demomode'
    );
  });

  const [currentRole, setCurrentRole] = useState<DemoAccount>(() => {
    const saved = localStorage.getItem('jeevasetu_demo_role');
    const matched = DEMO_ACCOUNTS.find((a) => a.id === saved);
    return matched || DEMO_ACCOUNTS[0]; // Default to ASHA
  });

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem('jeevasetu_demo_mode', 'true');
    }
  }, [isDemoMode]);

  const switchRole = (accountId: string) => {
    const matched = DEMO_ACCOUNTS.find((a) => a.id === accountId);
    if (matched) {
      setCurrentRole(matched);
      localStorage.setItem('jeevasetu_demo_role', matched.id);
      localStorage.setItem('jeevasetu_demo_mode', 'true');
      setDemoMode(true);
    }
  };

  return (
    <DemoRoleContext.Provider value={{ currentRole, switchRole, isDemoMode, setDemoMode }}>
      {children}
    </DemoRoleContext.Provider>
  );
};

export const useDemoRole = (): DemoRoleContextType => {
  const context = useContext(DemoRoleContext);
  if (!context) {
    throw new Error('useDemoRole must be used within a DemoRoleProvider');
  }
  return context;
};
