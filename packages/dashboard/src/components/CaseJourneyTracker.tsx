import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ReferralCase, CaseStatus } from '../types';
import { 
  CheckCircle2, 
  Clock, 
  Truck, 
  Building2, 
  Stethoscope, 
  LogOut, 
  Home, 
  ShieldCheck, 
  AlertOctagon, 
  CornerUpRight, 
  AlertTriangle,
  Send
} from 'lucide-react';

interface CaseJourneyTrackerProps {
  referral: ReferralCase;
}

interface JourneyStep {
  key: string;
  labelEn: string;
  labelKn: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'future' | 'rejected' | 'rerouted' | 'gap';
  time?: string;
  detail?: string;
  calloutBadge?: string;
}

export const CaseJourneyTracker: React.FC<CaseJourneyTrackerProps> = ({ referral }) => {
  const { t, language } = useLanguage();

  const events = [...(referral.events || [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  // Helper to extract timestamp for specific event types
  const getEventTime = (types: string[]): string | undefined => {
    const ev = events.find((e) => types.includes(e.type));
    if (!ev) return undefined;
    return new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Status mapping to determine milestone completion
  const statusRank: Record<CaseStatus, number> = {
    DRAFT: 0,
    SUBMITTED: 1,
    ACKNOWLEDGEMENT_PENDING: 1,
    ACCEPTED: 2,
    REJECTED: 2,
    REDIRECTED: 2,
    REDIRECT_SUGGESTED: 2,
    REROUTED: 2,
    IN_TRANSIT: 3,
    ARRIVED: 4,
    CLINICAL_DISPOSITION_RECORDED: 5,
    DISCHARGED: 6,
    FOLLOW_UP_DUE: 7,
    FOLLOW_UP_COMPLETED: 8,
    FOLLOW_UP_ESCALATED: 7,
    CLOSED: 8,
  };

  const currentRank = statusRank[referral.status] ?? 1;

  // Check if case underwent rejection/reroute/gapsense
  const rejectionEvent = events.find((e) => e.type === 'REJECTED');
  const rerouteEvent = events.find((e) => e.type === 'REROUTED' || e.type === 'REDIRECTED');
  const hasRejectionOrReroute = Boolean(rejectionEvent || rerouteEvent || ['REJECTED', 'REDIRECT_SUGGESTED', 'REROUTED'].includes(referral.status));

  // Build the steps list dynamically
  const steps: JourneyStep[] = [];

  // Step 1: SUBMITTED
  steps.push({
    key: 'SUBMITTED',
    labelEn: '1. Submitted',
    labelKn: '೧. ಉಲ್ಲೇಖ ಸಲ್ಲಿಕೆ',
    icon: <Send size={18} />,
    status: currentRank > 1 ? 'completed' : currentRank === 1 ? 'current' : 'future',
    time: getEventTime(['SUBMITTED', 'CREATED']),
    detail: referral.sendingFacility?.name || 'Bilikere PHC',
  });

  // Exception Branch: If Rejected / Rerouted
  if (hasRejectionOrReroute) {
    // Rejected Step (Red)
    const reasonCode = rejectionEvent?.payload?.reasonCode || 'NO_BED';
    const reasonLabel = t(`reason_${reasonCode}` as any) || 'No bed available';
    steps.push({
      key: 'REJECTED',
      labelEn: '2. Capacity Rejection',
      labelKn: '೨. ಸಾಮರ್ಥ್ಯ ಕೊರತೆ ತಿರಸ್ಕಾರ',
      icon: <AlertOctagon size={18} />,
      status: 'rejected',
      time: getEventTime(['REJECTED']),
      detail: `Reason: ${reasonLabel}`,
      calloutBadge: 'No Bed Available [NO_BED]',
    });

    // GapSense Classified Step
    steps.push({
      key: 'GAP_CLASSIFIED',
      labelEn: '3. GapSense Signal',
      labelKn: '೩. ಗ್ಯಾಪ್‌ಸೆನ್ಸ್ ಸೂಚನೆ',
      icon: <AlertTriangle size={18} />,
      status: 'gap',
      time: getEventTime(['GAP_EVENT', 'GAP_CLASSIFIED', 'REJECTED']),
      detail: 'Phase: CAPACITY • Cause: CAPACITY',
      calloutBadge: 'likely cause, pending supervisor review',
    });

    // Rerouted Step (Amber)
    const newFacilityName = rerouteEvent?.payload?.previousFacilityName
      ? referral.receivingFacility?.name
      : 'Hunsur Taluk Hospital';
    steps.push({
      key: 'REROUTED',
      labelEn: '4. Rerouted',
      labelKn: '೪. ಮರು-ನಿರ್ದೇಶನ',
      icon: <CornerUpRight size={18} />,
      status: 'rerouted',
      time: getEventTime(['REROUTED', 'REDIRECTED']),
      detail: `To: ${newFacilityName || referral.receivingFacility?.name}`,
      calloutBadge: `Rerouted to ${newFacilityName || referral.receivingFacility?.name || 'Alternate Hospital'}`,
    });

    // Accepted Step after reroute
    steps.push({
      key: 'ACCEPTED',
      labelEn: '5. Accepted',
      labelKn: '೫. ಆಸ್ಪತ್ರೆ ಸ್ವೀಕೃತಿ',
      icon: <CheckCircle2 size={18} />,
      status: currentRank >= 2 && referral.status !== 'REJECTED' && referral.status !== 'REDIRECT_SUGGESTED' ? 'completed' : 'current',
      time: getEventTime(['ACCEPTED', 'REROUTED']),
      detail: referral.receivingFacility?.name,
    });
  } else {
    // Normal Step 2: ACCEPTED
    steps.push({
      key: 'ACCEPTED',
      labelEn: '2. Accepted',
      labelKn: '೨. ಆಸ್ಪತ್ರೆ ಸ್ವೀಕೃತಿ',
      icon: <CheckCircle2 size={18} />,
      status: currentRank > 2 ? 'completed' : currentRank === 2 ? 'current' : 'future',
      time: getEventTime(['ACCEPTED']),
      detail: referral.receivingFacility?.name,
    });
  }

  // Next Steps: IN TRANSIT
  steps.push({
    key: 'IN_TRANSIT',
    labelEn: hasRejectionOrReroute ? '6. In Transit' : '3. In Transit',
    labelKn: hasRejectionOrReroute ? '೬. ಆಂಬ್ಯುಲೆನ್ಸ್ ಪ್ರಯಾಣ' : '೩. ಆಂಬ್ಯುಲೆನ್ಸ್ ಪ್ರಯಾಣ',
    icon: <Truck size={18} />,
    status: currentRank > 3 ? 'completed' : currentRank === 3 ? 'current' : 'future',
    time: getEventTime(['IN_TRANSIT', 'DISPATCHED']),
    detail: referral.transportMode || '108 Ambulance',
  });

  // ARRIVED
  steps.push({
    key: 'ARRIVED',
    labelEn: hasRejectionOrReroute ? '7. Arrived' : '4. Arrived',
    labelKn: hasRejectionOrReroute ? '೭. ಆಸ್ಪತ್ರೆಗೆ ಆಗಮನ' : '೪. ಆಸ್ಪತ್ರೆಗೆ ಆಗಮನ',
    icon: <Building2 size={18} />,
    status: currentRank > 4 ? 'completed' : currentRank === 4 ? 'current' : 'future',
    time: getEventTime(['ARRIVED']),
    detail: 'Triage Desk',
  });

  // TREATED (CLINICAL_DISPOSITION_RECORDED)
  steps.push({
    key: 'TREATED',
    labelEn: hasRejectionOrReroute ? '8. Treated' : '5. Treated',
    labelKn: hasRejectionOrReroute ? '೮. ವೈದ್ಯಕೀಯ ಚಿಕಿತ್ಸೆ' : '೫. ವೈದ್ಯಕೀಯ ಚಿಕಿತ್ಸೆ',
    icon: <Stethoscope size={18} />,
    status: currentRank > 5 ? 'completed' : currentRank === 5 ? 'current' : 'future',
    time: getEventTime(['CLINICAL_DISPOSITION_RECORDED', 'DISPOSITION_RECORDED']),
    detail: 'Obstetric Care',
  });

  // DISCHARGED
  steps.push({
    key: 'DISCHARGED',
    labelEn: hasRejectionOrReroute ? '9. Discharged' : '6. Discharged',
    labelKn: hasRejectionOrReroute ? '೯. ಡಿಸ್ಚಾರ್ಜ್' : '೬. ಡಿಸ್ಚಾರ್ಜ್',
    icon: <LogOut size={18} />,
    status: currentRank > 6 ? 'completed' : currentRank === 6 ? 'current' : 'future',
    time: getEventTime(['DISCHARGED']),
    detail: 'Postnatal Plan',
  });

  // FOLLOW-UP
  steps.push({
    key: 'FOLLOW_UP',
    labelEn: hasRejectionOrReroute ? '10. Follow-Up' : '7. Follow-Up',
    labelKn: hasRejectionOrReroute ? '೧೦. ಮನೆ ಭೇಟಿ' : '೭. ಮನೆ ಭೇಟಿ',
    icon: <Home size={18} />,
    status: currentRank > 7 ? 'completed' : currentRank === 7 ? 'current' : 'future',
    time: getEventTime(['FOLLOW_UP_COMPLETED', 'FOLLOW_UP_RECORDED']),
    detail: 'ASHA Home Visit',
  });

  // CLOSED
  steps.push({
    key: 'CLOSED',
    labelEn: hasRejectionOrReroute ? '11. Closed' : '8. Closed',
    labelKn: hasRejectionOrReroute ? '೧೧. ಮುಕ್ತಾಯ' : '೮. ಮುಕ್ತಾಯ',
    icon: <ShieldCheck size={18} />,
    status: currentRank >= 8 ? 'completed' : 'future',
    time: getEventTime(['CLOSED', 'CASE_CLOSED']),
    detail: 'Loop Complete',
  });

  const getStatusNodeStyle = (status: JourneyStep['status']) => {
    switch (status) {
      case 'completed':
        return {
          bg: '#065F46',
          border: '#10B981',
          text: '#34D399',
          glow: '0 0 10px rgba(16, 185, 129, 0.4)',
        };
      case 'current':
        return {
          bg: '#1D4ED8',
          border: '#60A5FA',
          text: '#FFFFFF',
          glow: '0 0 16px rgba(59, 130, 246, 0.85)',
          pulse: true,
        };
      case 'rejected':
        return {
          bg: '#7F1D1D',
          border: '#EF4444',
          text: '#FCA5A5',
          glow: '0 0 12px rgba(239, 68, 68, 0.5)',
        };
      case 'rerouted':
        return {
          bg: '#78350F',
          border: '#F59E0B',
          text: '#FDE047',
          glow: '0 0 12px rgba(245, 158, 11, 0.5)',
        };
      case 'gap':
        return {
          bg: '#581C87',
          border: '#A855F7',
          text: '#E9D5FF',
          glow: '0 0 12px rgba(168, 85, 247, 0.5)',
        };
      default:
        return {
          bg: '#0F172A',
          border: '#334155',
          text: '#64748B',
          glow: 'none',
        };
    }
  };

  return (
    <div className="card" style={{ marginBottom: '24px', overflow: 'hidden' }}>
      {/* Header */}
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="card-title" style={{ fontSize: '18px', fontWeight: 800 }}>
            {t('journeyTitle')}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {t('journeySubtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--karnataka-gold)', backgroundColor: 'rgba(251, 191, 36, 0.15)', padding: '4px 10px', borderRadius: '12px', border: '1px solid #F59E0B' }}>
            Case: {referral.caseId || referral.id}
          </span>
        </div>
      </div>

      <div style={{ padding: '24px 20px' }}>
        {/* 1. Horizontal Delivery-Style Step Tracker */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            justifyContent: 'space-between',
            overflowX: 'auto',
            paddingBottom: '16px',
            position: 'relative',
            gap: '8px',
          }}
        >
          {steps.map((step, idx) => {
            const nodeStyle = getStatusNodeStyle(step.status);
            const isLast = idx === steps.length - 1;

            return (
              <React.Fragment key={step.key}>
                {/* Step Node */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: '100px',
                    maxWidth: '125px',
                    textAlign: 'center',
                    position: 'relative',
                    zIndex: 2,
                    flexShrink: 0,
                  }}
                >
                  {/* Circle Icon */}
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: nodeStyle.bg,
                      border: `2px solid ${nodeStyle.border}`,
                      color: nodeStyle.text,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: nodeStyle.glow,
                      marginBottom: '8px',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    {step.icon}
                    {nodeStyle.pulse && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: '#60A5FA',
                          boxShadow: '0 0 8px #60A5FA',
                        }}
                      />
                    )}
                  </div>

                  {/* Primary Bilingual Step Label */}
                  <div style={{ fontSize: '13px', fontWeight: 800, color: step.status === 'future' ? '#64748B' : '#FFFFFF', lineHeight: 1.2 }}>
                    {language === 'kn' ? step.labelKn : step.labelEn}
                  </div>

                  {/* Secondary Kannada / English Sub-Label */}
                  <div style={{ fontSize: '11px', color: step.status === 'future' ? '#475569' : '#94A3B8', marginTop: '2px', fontWeight: 500 }}>
                    {language === 'kn' ? step.labelEn : step.labelKn}
                  </div>

                  {/* Timestamp */}
                  {step.time && (
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#38BDF8', marginTop: '4px', backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                      {step.time}
                    </div>
                  )}

                  {/* Callout Badge for Rejection / GapSense / Reroute */}
                  {step.calloutBadge && (
                    <div
                      style={{
                        marginTop: '6px',
                        fontSize: '10px',
                        fontWeight: 800,
                        backgroundColor: step.status === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : step.status === 'rerouted' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                        border: `1px solid ${nodeStyle.border}`,
                        color: nodeStyle.text,
                        padding: '2px 6px',
                        borderRadius: '6px',
                        lineHeight: 1.2,
                      }}
                    >
                      {step.calloutBadge}
                    </div>
                  )}
                </div>

                {/* Connector Line to Next Step */}
                {!isLast && (
                  <div
                    style={{
                      flex: 1,
                      height: '3px',
                      backgroundColor: step.status === 'completed' ? '#10B981' : step.status === 'rejected' ? '#EF4444' : '#334155',
                      marginTop: '20px',
                      minWidth: '24px',
                      borderRadius: '2px',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* 2. Compact Chronological Event Feed */}
        <div style={{ marginTop: '28px', borderTop: '1px solid var(--border-card)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--karnataka-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} />
              <span>{t('journeyChronologicalLog')}</span>
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {events.length} immutable events recorded
            </span>
          </div>

          {events.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('journeyNoEvents')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {events.map((ev, index) => {
                const timeStr = new Date(ev.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                const dateStr = new Date(ev.createdAt).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                });

                const getRoleBadge = (role: string) => {
                  switch (role) {
                    case 'FRONTLINE_WORKER':
                      return { text: 'ASHA Frontline', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
                    case 'RECEIVING_FACILITY':
                      return { text: 'Hospital Triage', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' };
                    case 'CLINICIAN':
                      return { text: 'Senior Obstetrician', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' };
                    case 'DISTRICT_SUPERVISOR':
                      return { text: 'District Supervisor', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
                    case 'ADMINISTRATOR':
                      return { text: 'State Admin', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
                    default:
                      return { text: role.replace(/_/g, ' '), color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.15)' };
                  }
                };

                const roleBadge = getRoleBadge(ev.actorRole || 'SYSTEM');

                return (
                  <div
                    key={ev.id || index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-card)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontSize: '13px',
                    }}
                  >
                    {/* Timestamp & Action Description */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: '75px' }}>
                        <span style={{ fontWeight: 800, color: '#38BDF8', fontSize: '13px' }}>{timeStr}</span>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>{dateStr}</span>
                      </div>

                      <div style={{ height: '24px', width: '2px', backgroundColor: '#334155' }} />

                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, color: '#FFFFFF' }}>
                          {ev.type === 'REJECTED'
                            ? `Capacity Rejection: ${ev.payload?.reasonCode || 'NO_BED'}`
                            : ev.type === 'REROUTED'
                            ? `Rerouted to ${ev.payload?.newFacilityId || 'Alternate Hospital'}`
                            : ev.type === 'ACCEPTED'
                            ? 'Bed Reserved & Inbound Referral Accepted'
                            : ev.type === 'SUBMITTED'
                            ? 'Emergency Maternal Referral Submitted'
                            : ev.type.replace(/_/g, ' ')}
                        </span>

                        {ev.payload?.note && (
                          <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic', marginTop: '2px' }}>
                            "{ev.payload.note}"
                          </span>
                        )}

                        {ev.payload?.delayReason && (
                          <span style={{ fontSize: '12px', color: '#FDE047', marginTop: '2px' }}>
                            ⚠️ Delay Reason: {ev.payload.delayReason}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actor Role Badge */}
                    <div
                      style={{
                        backgroundColor: roleBadge.bg,
                        color: roleBadge.color,
                        border: `1px solid ${roleBadge.color}50`,
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {roleBadge.text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
