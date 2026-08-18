import React, { createContext, useContext, useState } from 'react';
import { Role, UserProfile } from '../types';

export const DEMO_USERS: Record<Role, UserProfile> = {
  FRONTLINE_WORKER: {
    id: 'aaaa1111-1111-1111-1111-111111111111',
    email: 'asha.radha@jeevasetu.internal',
    name: 'Radha Bai (ASHA)',
    phone: '+919876543210',
    role: 'FRONTLINE_WORKER',
    facilityId: '22222222-2222-2222-2222-222222222203',
    facilityName: 'Bilikere PHC',
    district: 'Mysuru',
    isActive: true,
  },
  SENDING_FACILITY: {
    id: 'bbbb2222-2222-2222-2222-222222222222',
    email: 'phc.bilikere@jeevasetu.internal',
    name: 'Dr. Ramesh (MO Bilikere PHC)',
    phone: '+919876543211',
    role: 'SENDING_FACILITY',
    facilityId: '22222222-2222-2222-2222-222222222203',
    facilityName: 'Bilikere PHC',
    district: 'Mysuru',
    isActive: true,
  },
  RECEIVING_FACILITY: {
    id: 'cccc3333-3333-3333-3333-333333333333',
    email: 'referrals.cheluvamba@jeevasetu.internal',
    name: 'Cheluvamba Referral Desk',
    phone: '+919876543212',
    role: 'RECEIVING_FACILITY',
    facilityId: '22222222-2222-2222-2222-222222222201',
    facilityName: 'Cheluvamba Hospital (MMCRI)',
    district: 'Mysuru',
    isActive: true,
  },
  CLINICIAN: {
    id: 'dddd4444-4444-4444-4444-444444444444',
    email: 'dr.savitha.obgyn@jeevasetu.internal',
    name: 'Dr. Savitha (OB/GYN)',
    phone: '+919876543213',
    role: 'CLINICIAN',
    facilityId: '22222222-2222-2222-2222-222222222201',
    facilityName: 'Cheluvamba Hospital (MMCRI)',
    district: 'Mysuru',
    isActive: true,
  },
  DISTRICT_SUPERVISOR: {
    id: 'eeee5555-5555-5555-5555-555555555555',
    email: 'supervisor.mysuru@jeevasetu.internal',
    name: 'Kavitha H (District Supervisor)',
    phone: '+919876543214',
    role: 'DISTRICT_SUPERVISOR',
    facilityId: null,
    district: 'Mysuru',
    isActive: true,
  },
  ADMINISTRATOR: {
    id: 'ffff6666-6666-6666-6666-666666666666',
    email: 'admin.state@jeevasetu.internal',
    name: 'State Health Director (Admin)',
    phone: '+919876543215',
    role: 'ADMINISTRATOR',
    facilityId: null,
    district: null,
    isActive: true,
  },
  CLINICAL_ADMINISTRATOR: {
    id: '77777777-7777-7777-7777-777777777777',
    email: 'clinical.admin@jeevasetu.internal',
    name: 'Dr. Anupama (Clinical Lead)',
    phone: '+919876543216',
    role: 'CLINICAL_ADMINISTRATOR',
    facilityId: null,
    district: null,
    isActive: true,
  },
};

interface AuthContextType {
  user: UserProfile;
  token: string | null;
  setRole: (role: Role) => void;
  canAccessRoute: (route: string) => boolean;
  canPerformAction: (action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<Role>(() => {
    return (localStorage.getItem('jeevasetu_role') as Role) || 'DISTRICT_SUPERVISOR';
  });

  const user = DEMO_USERS[currentRole] || DEMO_USERS.DISTRICT_SUPERVISOR;

  const setRole = (role: Role) => {
    setCurrentRole(role);
    localStorage.setItem('jeevasetu_role', role);
  };

  const canAccessRoute = (route: string): boolean => {
    // Route permissions per role
    switch (route) {
      case '/':
      case '/dashboard':
        return true;
      case '/queue':
        return true;
      case '/follow-ups':
        return ['FRONTLINE_WORKER', 'SENDING_FACILITY', 'RECEIVING_FACILITY', 'CLINICIAN', 'DISTRICT_SUPERVISOR', 'ADMINISTRATOR'].includes(user.role);
      case '/disposition':
        return ['CLINICIAN', 'CLINICAL_ADMINISTRATOR'].includes(user.role);
      case '/audit':
        return ['DISTRICT_SUPERVISOR', 'ADMINISTRATOR', 'CLINICAL_ADMINISTRATOR'].includes(user.role);
      default:
        return true;
    }
  };

  const canPerformAction = (action: string): boolean => {
    switch (action) {
      case 'ACCEPT_REJECT_REDIRECT':
        return ['RECEIVING_FACILITY', 'CLINICIAN', 'ADMINISTRATOR'].includes(user.role);
      case 'RECORD_DISPOSITION':
        return ['CLINICIAN', 'CLINICAL_ADMINISTRATOR'].includes(user.role);
      case 'DISCHARGE':
        return ['CLINICIAN', 'RECEIVING_FACILITY', 'ADMINISTRATOR'].includes(user.role);
      case 'COMPLETE_FOLLOW_UP':
        return ['FRONTLINE_WORKER', 'CLINICIAN', 'ADMINISTRATOR'].includes(user.role);
      case 'CLOSE_CASE':
        return ['CLINICIAN', 'DISTRICT_SUPERVISOR', 'ADMINISTRATOR'].includes(user.role);
      case 'CREATE_REFERRAL':
        return ['FRONTLINE_WORKER', 'SENDING_FACILITY', 'ADMINISTRATOR'].includes(user.role);
      default:
        return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token: 'synthetic-demo-jwt-token',
        setRole,
        canAccessRoute,
        canPerformAction,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
