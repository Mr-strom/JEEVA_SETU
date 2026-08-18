import React from 'react';
import { CaseStatus } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

export const StatusBadge: React.FC<{ status: CaseStatus }> = ({ status }) => {
  const { t } = useLanguage();

  const getStyleClass = (): string => {
    switch (status) {
      case 'DRAFT':
        return 'status-gray';
      case 'SUBMITTED':
      case 'ACKNOWLEDGEMENT_PENDING':
        return 'status-pending';
      case 'ACCEPTED':
      case 'IN_TRANSIT':
      case 'ARRIVED':
        return 'status-active';
      case 'CLINICAL_DISPOSITION_RECORDED':
      case 'FOLLOW_UP_DUE':
        return 'status-purple';
      case 'REDIRECTED':
      case 'REDIRECT_SUGGESTED':
      case 'REROUTED':
        return 'status-pending';
      case 'REJECTED':
      case 'FOLLOW_UP_ESCALATED':
        return 'status-danger';
      case 'FOLLOW_UP_COMPLETED':
      case 'CLOSED':
        return 'status-success';
      default:
        return 'status-gray';
    }
  };

  const translationKey = `status_${status}` as any;
  const label = t(translationKey) || status;

  return (
    <span className={`status-badge ${getStyleClass()}`}>
      <span className="dot">●</span>
      {label}
    </span>
  );
};
