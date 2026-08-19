export type Language = 'en' | 'kn';

export const translations = {
  en: {
    // App Branding
    appTitle: 'JeevaSetu Frontline',
    workerRole: 'ASHA / ANM Frontline Worker',
    workerFacility: 'Bilikere PHC — Mysuru District',
    safetyNotice: 'Safety Layer • Not a Diagnostic Tool',

    // Sync Statuses
    sync_SAVED_LOCALLY: 'Saved locally on phone',
    sync_WAITING_TO_SYNC: 'Waiting to sync (offline)',
    sync_SYNCHRONISED: 'Synchronised with server',
    sync_SYNC_FAILED: 'Sync failed (tap to retry)',
    syncSubtitle: 'Data is saved safely offline on your device',

    // Navigation
    navNewReferral: 'New Referral',
    navMyQueue: 'My Cases',
    navFollowUps: 'Follow-ups',

    // New Referral Form
    formTitle: 'Emergency Maternal Referral',
    formSubtitle: 'Capture high-risk maternal handoff details for hospital care',
    sectionPatient: '1. Mother Profile',
    patientIdLabel: 'RCH / ORS ID (Mandatory)',
    patientIdPlaceholder: 'e.g. ORS-KA-2026-1089',
    patientNameLabel: 'Mother Name (Optional)',
    patientAgeLabel: 'Age (Years)',
    gravidaLabel: 'Gravida (Total Pregnancies)',
    parityLabel: 'Parity (Live Births)',
    lmpLabel: 'Last Menstrual Period (LMP)',
    eddLabel: 'Expected Delivery Date (EDD)',

    sectionRisks: '2. High-Risk Indicators (Requires Clinical Review)',
    risk_SEVERE_ANAEMIA: 'Severe Anaemia (Hb < 7 g/dL / Severe Pallor)',
    risk_PRE_ECLAMPSIA: 'High Blood Pressure / Pre-eclampsia (BP >= 140/90)',
    risk_ANTEPARTUM_HAEMORRHAGE: 'Antepartum Bleeding / Vaginal Bleeding',
    risk_PREVIOUS_LSCS: 'Previous C-Section (Previous LSCS)',
    risk_OBSTRUCTED_LABOUR: 'Prolonged / Obstructed Labour (> 12 hours)',
    risk_ECLAMPSIA_CONVULSIONS: 'Convulsions / Fits / Eclampsia',
    risk_TWIN_PREGNANCY: 'Multiple Pregnancy (Twins/Triplets)',
    risk_GESTATIONAL_DIABETES: 'Gestational Diabetes / High Sugar',

    sectionTransport: '3. Hospital & Transport',
    receivingHospitalLabel: 'Receiving Referral Hospital',
    transportNeededLabel: 'Request 108 Emergency Ambulance Dispatch',
    clinicalSummaryLabel: 'Symptoms & Observations for Receiving Doctors',
    clinicalSummaryPlaceholder: 'Describe current vitals, onset time, contractions, bleeding, fetal movement...',

    // Primary Actions
    submitReferralPrimary: 'Send Referral to Hospital',
    saveDraftSecondary: 'Save Draft Locally',
    validationError: 'Please enter patient RCH ID and select high-risk indicators before sending.',
    referralCreatedSuccess: 'Referral saved! Hospital desk notified.',

    // Worker Queue
    queueTitle: 'My Referred Cases',
    queueSubtitle: 'Track handoff and hospital status for mothers you referred',
    emptyQueue: 'No referrals created yet. Tap "New Referral" below.',
    statusPending: 'Awaiting Hospital Ack',
    statusInTransit: 'Ambulance in Transit',
    statusArrived: 'Arrived at Hospital',
    statusDischarged: 'Discharged — Follow-up Needed',

    // Follow-ups
    followUpTitle: 'Post-Discharge Home Visits',
    followUpSubtitle: 'Verify maternal and baby wellness post-discharge',
    emptyFollowUps: 'No pending home visits scheduled today.',
    recordVisitPrimary: 'Record Home Visit',
    outcomeLabel: 'Visit Outcome',
    outcome_COMPLETED: 'Mother & Baby Healthy (Normal)',
    outcome_PATIENT_NOT_FOUND: 'Patient Not Available / Relocated',
    outcome_PATIENT_REFUSED: 'Family Refused Check',
    outcome_REFERRED_ONWARD: 'Danger Signs Found — Re-referred',
    visitNotesLabel: 'Vitals & Care Notes (BP, Temperature, Infant Feeding)',
    confirmVisitButton: 'Submit Visit Record',
    cancel: 'Cancel',

    // Multi-Step Form Stepper & Review
    stepMotherProfile: '1. Mother Profile',
    stepRisksSymptoms: '2. Risks & Symptoms',
    stepHospitalTransport: '3. Hospital & Transport',
    stepReviewSend: '4. Review & Send',
    stepNext: 'Next Step',
    stepBack: 'Back',
    stepEdit: 'Edit',
    reviewTitle: 'Review Referral Details',
    reviewSubtitle: 'Confirm all maternal information before dispatching handoff alert',
    reviewSummaryHeading: 'Summary of Handoff',
    noRisksSelected: 'No risk signs selected',
    ambulanceRequested: '108 Emergency Ambulance Requested',
    ambulanceNotRequested: 'Self / Local Vehicle Transport',
    sync_SYNCING: 'Syncing with server...',
    stepProgress: 'Step',
    ofSteps: 'of',

    // Offline Simulation (Demo Mode)
    simulateOffline: 'Simulate Offline',
    simulateOfflineDesc: 'Queues all handoff mutations in local outbox without contacting server',
    offlineBannerTitle: 'Offline demo mode — mutations queued locally',
    itemsQueued: 'items queued',
    liveSyncRestored: 'Network restored — drained outbox to server',

    // Language Toggle
    languageToggle: 'ಕನ್ನಡ',
  },
  kn: {
    // App Branding
    appTitle: 'ಜೀವಸೇತು ಆಶಾ / ಎಎನ್‌ಎಂ',
    workerRole: 'ಆಶಾ / ಎಎನ್‌ಎಂ ಆರೋಗ್ಯ ಕಾರ್ಯಕರ್ತೆ',
    workerFacility: 'ಬಿಳಿಕೆರೆ ಪ್ರಾಥಮಿಕ ಆರೋಗ್ಯ ಕೇಂದ್ರ — ಮೈಸೂರು ಜಿಲ್ಲೆ',
    safetyNotice: 'ಆರೈಕೆ ಸುರಕ್ಷತಾ ವ್ಯವಸ್ಥೆ • ಇದು ರೋಗನಿರ್ಣಯ ಸಾಧನವಲ್ಲ',

    // Sync Statuses
    sync_SAVED_LOCALLY: 'ಮೊಬೈಲ್‌ನಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿ ಸಂಗ್ರಹಿಸಲಾಗಿದೆ',
    sync_WAITING_TO_SYNC: 'ಸರ್ವರ್‌ಗೆ ಕಳುಹಿಸಲು ಬಾಕಿ ಇದೆ (ಆಫ್‌ಲೈನ್)',
    sync_SYNCHRONISED: 'ಸರ್ವರ್‌ನೊಂದಿಗೆ ಸಿಂಕ್ ಆಗಿದೆ',
    sync_SYNC_FAILED: 'ಸಿಂಕ್ ವಿಫಲವಾಗಿದೆ (ಮರುಪ್ರಯತ್ನಿಸಿ)',
    sync_SYNCING: 'ಸರ್ವರ್‌ನೊಂದಿಗೆ ಸಿಂಕ್ ಮಾಡಲಾಗುತ್ತಿದೆ...',
    syncSubtitle: 'ನೆಟ್‌ವರ್ಕ್ ಇಲ್ಲದಿದ್ದರೂ ನಿಮ್ಮ ಫೋನ್‌ನಲ್ಲಿ ಮಾಹಿತಿ ಸುರಕ್ಷಿತವಾಗಿದೆ',

    // Navigation
    navNewReferral: 'ಹೊಸ ಉಲ್ಲೇಖ',
    navMyQueue: 'ನನ್ನ ಪ್ರಕರಣಗಳು',
    navFollowUps: 'ಫಾಲೋ-ಅಪ್ ಭೇಟಿ',

    // New Referral Form
    formTitle: 'ತುರ್ತು ಗರ್ಭಿಣಿ ಉಲ್ಲೇಖ (ರೆಫರಲ್)',
    formSubtitle: 'ಆಸ್ಪತ್ರೆಯ ತಕ್ಷಣದ ಆರೈಕೆಗಾಗಿ ಗರ್ಭಿಣಿಯ ವಿವರ ದಾಖಲಿಸಿ',
    sectionPatient: '೧. ತಾಯಿಯ ವಿವರ',
    patientIdLabel: 'ಆರ್‌ಸಿಎಚ್ / ಒಆರ್‌ಎಸ್ ಐಡಿ (ಕಡ್ಡಾಯ)',
    patientIdPlaceholder: 'ಉದಾ: ORS-KA-2026-1089',
    patientNameLabel: 'ತಾಯಿಯ ಹೆಸರು (ಐಚ್ಛಿಕ)',
    patientAgeLabel: 'ವಯಸ್ಸು (ವರ್ಷಗಳು)',
    gravidaLabel: 'ಒಟ್ಟು ಗರ್ಭಧಾರಣೆ ಸಂಖ್ಯೆ (G)',
    parityLabel: 'ಜೀವಂತ ಮಕ್ಕಳ ಸಂಖ್ಯೆ (P)',
    lmpLabel: 'ಕಡೆಯ ಮುಟ್ಟಿನ ದಿನಾಂಕ (LMP)',
    eddLabel: 'ಹೆರಿಗೆಯ ನಿರೀಕ್ಷಿತ ದಿನಾಂಕ (EDD)',

    sectionRisks: '೨. ಹೆರಿಗೆಯ ಅಪಾಯದ ಲಕ್ಷಣಗಳು',
    risk_SEVERE_ANAEMIA: 'ತೀವ್ರ ರಕ್ತಹೀನತೆ (Hb < 7 g/dL / ತೀವ್ರ ಬಿಳಿಚಿಕೊಳ್ಳುವಿಕೆ)',
    risk_PRE_ECLAMPSIA: 'ಅಧಿಕ ರಕ್ತದೊತ್ತಡ (BP >= 140/90)',
    risk_ANTEPARTUM_HAEMORRHAGE: 'ಹೆರಿಗೆ ಮುನ್ನ ರಕ್ತಸ್ರಾವ',
    risk_PREVIOUS_LSCS: 'ಹಿಂದಿನ ಹೆರಿಗೆ ಸಿ-ಸೆಕ್ಷನ್ (Previous LSCS)',
    risk_OBSTRUCTED_LABOUR: 'ದೀರ್ಘಕಾಲದ / ಅಡಚಣೆಯುಳ್ಳ ಹೆರಿಗೆ ನೋವು (> ೧೨ ಗಂಟೆ)',
    risk_ECLAMPSIA_CONVULSIONS: 'ಫಿಟ್ಸ್ / ಮೂರ್ಛೆ ರೋಗ (ಎಕ್ಲಾಂಪ್ಸಿಯಾ)',
    risk_TWIN_PREGNANCY: 'ಅವಳಿ / ಬಹು ಗರ್ಭಧಾರಣೆ',
    risk_GESTATIONAL_DIABETES: 'ಗರ್ಭಾವಸ್ಥೆಯ ಸಕ್ಕರೆ ಕಾಯಿಲೆ (ಡಯಾಬಿಟಿಸ್)',

    sectionTransport: '೩. ಆಸ್ಪತ್ರೆ ಮತ್ತು ಸಾರಿಗೆ',
    receivingHospitalLabel: 'ಸ್ವೀಕರಿಸುವ ರೆಫರಲ್ ಆಸ್ಪತ್ರೆ',
    transportNeededLabel: '೧೦೮ ತುರ್ತು ಆಂಬ್ಯುಲೆನ್ಸ್ ಕಳುಹಿಸಲು ವಿನಂತಿಸಿ',
    clinicalSummaryLabel: 'ವೈದ್ಯರಿಗೆ ರೋಗಲಕ್ಷಣಗಳ ವಿವರ',
    clinicalSummaryPlaceholder: 'ರಕ್ತದೊತ್ತಡ, ನೋವಿನ ಸಮಯ, ಮಗುವಿನ ಚಲನವಲನ, ರಕ್ತಸ್ರಾವದ ವಿವರಗಳನ್ನು ಬರೆಯಿರಿ...',

    // Primary Actions
    submitReferralPrimary: 'ಆಸ್ಪತ್ರೆಗೆ ಉಲ್ಲೇಖ ಕಳುಹಿಸಿ',
    saveDraftSecondary: 'ಡ್ರಾಫ್ಟ್ ಆಗಿ ಉಳಿಸಿ',
    validationError: 'ದಯವಿಟ್ಟು ಆರ್‌ಸಿಎಚ್ ಐಡಿ ಮತ್ತು ಕನಿಷ್ಠ ಒಂದು ಅಪಾಯದ ಲಕ್ಷಣವನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
    referralCreatedSuccess: 'ಉಲ್ಲೇಖ ಉಳಿಸಲಾಗಿದೆ! ಆಸ್ಪತ್ರೆಗೆ ಮಾಹಿತಿ ತಲುಪಿದೆ.',

    // Multi-Step Form Stepper & Review
    stepMotherProfile: '೧. ತಾಯಿಯ ವಿವರ',
    stepRisksSymptoms: '೨. ಅಪಾಯ ಮತ್ತು ಲಕ್ಷಣಗಳು',
    stepHospitalTransport: '೩. ಆಸ್ಪತ್ರೆ ಮತ್ತು ಸಾರಿಗೆ',
    stepReviewSend: '೪. ಪರಿಶೀಲಿಸಿ ಕಳುಹಿಸಿ',
    stepNext: 'ಮುಂದಿನ ಹಂತ',
    stepBack: 'ಹಿಂದೆ',
    stepEdit: 'ಬದಲಾಯಿಸಿ',
    reviewTitle: 'ಉಲ್ಲೇಖ ಸಾರಾಂಶ ಪರಿಶೀಲಿಸಿ',
    reviewSubtitle: 'ಆಸ್ಪತ್ರೆಗೆ ಕಳುಹಿಸುವ ಮೊದಲು ವಿವರಗಳನ್ನು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ',
    reviewSummaryHeading: 'ಹಸ್ತಾಂತರ ವಿವರಗಳ ಸಾರಾಂಶ',
    noRisksSelected: 'ಯಾವುದೇ ಅಪಾಯದ ಲಕ್ಷಣ ಆಯ್ಕೆಯಾಗಿಲ್ಲ',
    ambulanceRequested: '೧೦೮ ಆಂಬ್ಯುಲೆನ್ಸ್ ವಿನಂತಿಸಲಾಗಿದೆ',
    ambulanceNotRequested: 'ಸ್ವಂತ / ಸ್ಥಳೀಯ ಸಾರಿಗೆ',
    stepProgress: 'ಹಂತ',
    ofSteps: '/',

    // Worker Queue
    queueTitle: 'ನನ್ನ ಉಲ್ಲೇಖಿತ ಪ್ರಕರಣಗಳು',
    queueSubtitle: 'ನೀವು ಕಳುಹಿಸಿದ ಗರ್ಭಿಣಿಯರ ಆಸ್ಪತ್ರೆ ಹಸ್ತಾಂತರ ಸ್ಥಿತಿ',
    emptyQueue: 'ಯಾವುದೇ ಉಲ್ಲೇಖಗಳು ಇನ್ನೂ ಇಲ್ಲ. ಕೆಳಗಿನ "ಹೊಸ ಉಲ್ಲೇಖ" ಒತ್ತಿರಿ.',
    statusPending: 'ಆಸ್ಪತ್ರೆಯ ಸ್ವೀಕೃತಿ ಬಾಕಿ ಇದೆ',
    statusInTransit: 'ಆಂಬ್ಯುಲೆನ್ಸ್ ಪ್ರಯಾಣದಲ್ಲಿದೆ',
    statusArrived: 'ಆಸ್ಪತ್ರೆಗೆ ತಲುಪಿದ್ದಾರೆ',
    statusDischarged: 'ಡಿಸ್ಚಾರ್ಜ್ — ಮನೆ ಭೇಟಿ ಅಗತ್ಯವಿದೆ',

    // Follow-ups
    followUpTitle: 'ಡಿಸ್ಚಾರ್ಜ್ ನಂತರದ ಮನೆ ಭೇಟಿ',
    followUpSubtitle: 'ತಾಯಿ ಮತ್ತು ಮಗುವಿನ ಆರೋಗ್ಯ ಪರಿಶೀಲನೆ',
    emptyFollowUps: 'ಇಂದು ಯಾವುದೇ ಬಾಕಿ ಮನೆ ಭೇಟಿಗಳಿಲ್ಲ.',
    recordVisitPrimary: 'ಮನೆ ಭೇಟಿ ದಾಖಲಿಸಿ',
    outcomeLabel: 'ಭೇಟಿಯ ಫಲಿತಾಂಶ',
    outcome_COMPLETED: 'ತಾಯಿ ಮತ್ತು ಮಗು ಆರೋಗ್ಯವಾಗಿದ್ದಾರೆ (ಸಾಮಾನ್ಯ)',
    outcome_PATIENT_NOT_FOUND: 'ತಾಯಿ ಮನೆಯಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ / ಊರಿಗೆ ಹೋಗಿದ್ದಾರೆ',
    outcome_PATIENT_REFUSED: 'ಪರಿಶೀಲನೆಗೆ ನಿರಾಕರಿಸಿದ್ದಾರೆ',
    outcome_REFERRED_ONWARD: 'ಅಪಾಯದ ಲಕ್ಷಣಗಳು ಕಂಡುಬಂದಿವೆ — ಮರು ಉಲ್ಲೇಖಿಸಲಾಗಿದೆ',
    visitNotesLabel: 'ಆರೋಗ್ಯ ಟಿಪ್ಪಣಿ (ಬಿಪಿ, ಜ್ವರ, ಎದೆಹಾಲು ಕುಡಿಸುವಿಕೆ)',
    confirmVisitButton: 'ಭೇಟಿ ದಾಖಲೆ ಸಲ್ಲಿಸಿ',
    cancel: 'ರದ್ದುಮಾಡಿ',

    // Offline Simulation (Demo Mode)
    simulateOffline: 'ಆಫ್‌ಲೈನ್ ಸಿಮ್ಯುಲೇಶನ್',
    simulateOfflineDesc: 'ಸರ್ವರ್ ಸಂಪರ್ಕವಿಲ್ಲದೆ ಎಲ್ಲಾ ಮಾಹಿತಿಯನ್ನು ಮೊಬೈಲ್‌ನಲ್ಲೇ ಸಂಗ್ರಹಿಸುತ್ತದೆ',
    offlineBannerTitle: 'ಆಫ್‌ಲೈನ್ ಡೆಮೊ ಮೋಡ್ — ಮಾಹಿತಿ ಮೊಬೈಲ್‌ನಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿದೆ',
    itemsQueued: 'ಬಾಕಿ ಉಳಿದಿವೆ',
    liveSyncRestored: 'ನೆಟ್‌ವರ್ಕ್ ಮರುಸ್ಥಾಪಿಸಲಾಗಿದೆ — ಮಾಹಿತಿ ಸಿಂಕ್ ಆಗಿದೆ',

    // Language Toggle
    languageToggle: 'English',
  },
};

export type TranslationKey = keyof typeof translations.en;
