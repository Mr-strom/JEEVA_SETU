import { PrismaClient, Role, GapPhase, GapCauseClass } from '@prisma/client';

const prisma = new PrismaClient();

export async function seed() {
  console.log('🌱 Starting JeevaSetu Karnataka synthetic seed data creation...');

  // 1. Seed Facilities across 3 Karnataka districts
  const facilitiesData = [
    // Bangalore Urban
    {
      id: '11111111-1111-1111-1111-111111111101',
      name: 'Vani Vilas Hospital (Bangalore Medical College)',
      nameKn: 'ವಾಣಿ ವಿಲಾಸ ಆಸ್ಪತ್ರೆ (ಬೆಂಗಳೂರು ವೈದ್ಯಕೀಯ ಕಾಲೇಜು)',
      district: 'Bangalore Urban',
      districtKn: 'ಬೆಂಗಳೂರು ನಗರ',
      type: 'MEDICAL_COLLEGE',
      specialties: ['OBSTETRICS', 'NICU', 'BLOOD_BANK', 'ICU', 'HIGH_RISK_OB', 'EMERGENCY_SURGERY'],
      capacityBeds: 250,
      latitude: 12.9602,
      longitude: 77.5738,
      isActive: true,
    },
    {
      id: '11111111-1111-1111-1111-111111111102',
      name: 'Bowring and Lady Curzon Hospital',
      nameKn: 'ಬೌರಿಂಗ್ ಮತ್ತು ಲೇಡಿ ಕರ್ಜನ್ ಆಸ್ಪತ್ರೆ',
      district: 'Bangalore Urban',
      districtKn: 'ಬೆಂಗಳೂರು ನಗರ',
      type: 'DISTRICT_HOSPITAL',
      specialties: ['OBSTETRICS', 'BLOOD_BANK', 'GENERAL_SURGERY', '24X7_DELIVERY'],
      capacityBeds: 120,
      latitude: 12.9822,
      longitude: 77.6044,
      isActive: true,
    },
    {
      id: '11111111-1111-1111-1111-111111111103',
      name: 'Anekal Community Health Centre',
      nameKn: 'ಆನೇಕಲ್ ಸಮುದಾಯ ಆರೋಗ್ಯ ಕೇಂದ್ರ',
      district: 'Bangalore Urban',
      districtKn: 'ಬೆಂಗಳೂರು ನಗರ',
      type: 'CHC',
      specialties: ['BASIC_OBSTETRICS', '24X7_DELIVERY', 'BASIC_ANTENATAL'],
      capacityBeds: 30,
      latitude: 12.7118,
      longitude: 77.6974,
      isActive: true,
    },
    // Mysuru
    {
      id: '22222222-2222-2222-2222-222222222201',
      name: 'Cheluvamba Hospital (Mysore Medical College)',
      nameKn: 'ಚೆಲುವಾಂಬ ಆಸ್ಪತ್ರೆ (ಮೈಸೂರು ವೈದ್ಯಕೀಯ ಕಾಲೇಜು)',
      district: 'Mysuru',
      districtKn: 'ಮೈಸೂರು',
      type: 'MEDICAL_COLLEGE',
      specialties: ['OBSTETRICS', 'NICU', 'BLOOD_BANK', 'ICU', 'HIGH_RISK_OB'],
      capacityBeds: 200,
      latitude: 12.3168,
      longitude: 76.6493,
      isActive: true,
    },
    {
      id: '22222222-2222-2222-2222-222222222202',
      name: 'Hunsur Taluk General Hospital',
      nameKn: 'ಹುಣಸೂರು ತಾಲೂಕು ಸಾರ್ವಜನಿಕ ಆಸ್ಪತ್ರೆ',
      district: 'Mysuru',
      districtKn: 'ಮೈಸೂರು',
      type: 'TALUK_HOSPITAL',
      specialties: ['OBSTETRICS', 'BLOOD_STORAGE', '24X7_DELIVERY'],
      capacityBeds: 60,
      latitude: 12.3082,
      longitude: 76.2917,
      isActive: true,
    },
    {
      id: '22222222-2222-2222-2222-222222222203',
      name: 'Bilikere Primary Health Centre',
      nameKn: 'ಬಿಳಿಕೆರೆ ಪ್ರಾಥಮಿಕ ಆರೋಗ್ಯ ಕೇಂದ್ರ',
      district: 'Mysuru',
      districtKn: 'ಮೈಸೂರು',
      type: 'PHC',
      specialties: ['BASIC_ANTENATAL', 'NORMAL_DELIVERY', 'OUTREACH'],
      capacityBeds: 10,
      latitude: 12.3421,
      longitude: 76.4112,
      isActive: true,
    },
    // Kalaburagi
    {
      id: '33333333-3333-3333-3333-333333333301',
      name: 'Gulbarga Institute of Medical Sciences (GIMS)',
      nameKn: 'ಗುಲ್ಬರ್ಗ ವೈದ್ಯಕೀಯ ವಿಜ್ಞಾನ ಸಂಸ್ಥೆ',
      district: 'Kalaburagi',
      districtKn: 'ಕಲಬುರಗಿ',
      type: 'MEDICAL_COLLEGE',
      specialties: ['OBSTETRICS', 'NICU', 'BLOOD_BANK', 'EMERGENCY_SURGERY', 'ICU'],
      capacityBeds: 180,
      latitude: 17.3297,
      longitude: 76.8343,
      isActive: true,
    },
    {
      id: '33333333-3333-3333-3333-333333333302',
      name: 'Aland Community Health Centre',
      nameKn: 'ಆಳಂದ ಸಮುದಾಯ ಆರೋಗ್ಯ ಕೇಂದ್ರ',
      district: 'Kalaburagi',
      districtKn: 'ಕಲಬುರಗಿ',
      type: 'CHC',
      specialties: ['BASIC_OBSTETRICS', 'BLOOD_STORAGE', '24X7_DELIVERY'],
      capacityBeds: 30,
      latitude: 17.5642,
      longitude: 76.5714,
      isActive: true,
    },
  ];

  for (const fac of facilitiesData) {
    await prisma.facility.upsert({
      where: { id: fac.id },
      update: fac,
      create: fac,
    });
  }
  console.log(`✅ Upserted ${facilitiesData.length} synthetic Karnataka facilities`);

  // 2. Seed Users — Exactly One User per Role
  const usersData = [
    {
      id: 'aaaa1111-1111-1111-1111-111111111111',
      email: 'asha.radha@jeevasetu.internal',
      name: 'Radha Bai (ASHA)',
      role: Role.FRONTLINE_WORKER,
      facilityId: '22222222-2222-2222-2222-222222222203', // Bilikere PHC
      phone: '+91-9480000001',
      isActive: true,
    },
    {
      id: 'bbbb2222-2222-2222-2222-222222222222',
      email: 'phc.bilikere@jeevasetu.internal',
      name: 'Dr. Ramesh (MO Bilikere PHC)',
      role: Role.SENDING_FACILITY,
      facilityId: '22222222-2222-2222-2222-222222222203', // Bilikere PHC
      phone: '+91-9480000002',
      isActive: true,
    },
    {
      id: 'cccc3333-3333-3333-3333-333333333333',
      email: 'referrals.cheluvamba@jeevasetu.internal',
      name: 'Cheluvamba Referral Desk Officer',
      role: Role.RECEIVING_FACILITY,
      facilityId: '22222222-2222-2222-2222-222222222201', // Cheluvamba Hospital
      phone: '+91-9480000003',
      isActive: true,
    },
    {
      id: 'dddd4444-4444-4444-4444-444444444444',
      email: 'dr.savitha.obgyn@jeevasetu.internal',
      name: 'Dr. Savitha (Senior Obstetrician)',
      role: Role.CLINICIAN,
      facilityId: '22222222-2222-2222-2222-222222222201', // Cheluvamba Hospital
      phone: '+91-9480000004',
      isActive: true,
    },
    {
      id: 'eeee5555-5555-5555-5555-555555555555',
      email: 'supervisor.mysuru@jeevasetu.internal',
      name: 'Kavitha H (Mysuru District RCH Supervisor)',
      role: Role.DISTRICT_SUPERVISOR,
      facilityId: null, // District-level supervisor
      phone: '+91-9480000005',
      isActive: true,
    },
    {
      id: 'ffff6666-6666-6666-6666-666666666666',
      email: 'admin.karnataka@jeevasetu.internal',
      name: 'State Operations Administrator',
      role: Role.ADMINISTRATOR,
      facilityId: null,
      phone: '+91-9480000006',
      isActive: true,
    },
    {
      id: '00007777-7777-7777-7777-777777777777',
      email: 'clinical.admin@jeevasetu.internal',
      name: 'Dr. Girish (Clinical Protocol Lead)',
      role: Role.CLINICAL_ADMINISTRATOR,
      facilityId: null,
      phone: '+91-9480000007',
      isActive: true,
    },
  ];

  for (const user of usersData) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user,
    });
  }
  console.log(`✅ Upserted ${usersData.length} synthetic role-specific users`);

  // 3. Seed GapSense Escalation Playbooks
  const playbooksData = [
    {
      id: 'pb-cap-cap-01',
      name: 'Capacity Failure Action Playbook',
      nameKn: 'ಸಾಮರ್ಥ್ಯ ಕೊರತೆ ಕ್ರಿಯಾ ಮಾರ್ಗದರ್ಶಿ',
      triggerPhase: GapPhase.CAPACITY,
      triggerCause: GapCauseClass.CAPACITY,
      stepTemplates: [
        { order: 1, description: 'Verify rejection reason with receiving hospital superintendent', descriptionKn: 'ಆಸ್ಪತ್ರೆಯ ಸೂಪರಿಂಟೆಂಡೆಂಟ್ ಅವರೊಂದಿಗೆ ತಿರಸ್ಕಾರದ ಕಾರಣ ಪರಿಶೀಲಿಸಿ', assigneeRole: Role.DISTRICT_SUPERVISOR, slaHours: 1 },
        { order: 2, description: 'Confirm alternate facility route suggestion with sending MO', descriptionKn: 'ಕಳುಹಿಸುವ ವೈದ್ಯಾಧಿಕಾರಿಯೊಂದಿಗೆ ಪರ್ಯಾಯ ಆಸ್ಪತ್ರೆಯನ್ನು ದೃಢೀಕರಿಸಿ', assigneeRole: Role.DISTRICT_SUPERVISOR, slaHours: 2 },
        { order: 3, description: 'Alert target facility reception and ensure transport dispatch', descriptionKn: 'ಗುರಿ ಆಸ್ಪತ್ರೆಯ ಸ್ವಾಗತ ಕೊಠಡಿಗೆ ಮಾಹಿತಿ ನೀಡಿ ಆಂಬ್ಯುಲೆನ್ಸ್ ರವಾನೆ ಖಚಿತಪಡಿಸಿ', assigneeRole: Role.DISTRICT_SUPERVISOR, slaHours: 2 },
      ],
      isActive: true,
    },
    {
      id: 'pb-ack-proc-02',
      name: 'Acknowledgement Timeout Playbook',
      nameKn: 'ಸ್ವೀಕೃತಿ ಕಾಲಮಿತಿ ಮೀರಿದ ಕ್ರಿಯಾ ಮಾರ್ಗದರ್ಶಿ',
      triggerPhase: GapPhase.ACKNOWLEDGEMENT,
      triggerCause: GapCauseClass.PROCESS,
      stepTemplates: [
        { order: 1, description: 'Direct phone contact to receiving facility referral desk', descriptionKn: 'ಸ್ವೀಕರಿಸುವ ಆಸ್ಪತ್ರೆಯ ರೆಫರಲ್ ಡೆಸ್ಕ್‌ಗೆ ನೇರ ದೂರವಾಣಿ ಕರೆ ಮಾಡಿ', assigneeRole: Role.DISTRICT_SUPERVISOR, slaHours: 1 },
        { order: 2, description: 'If unresponsive within 15 minutes, initiate re-routing review', descriptionKn: '೧೫ ನಿಮಿಷದಲ್ಲಿ ಪ್ರತಿಕ್ರಿಯೆ ಬಾರದಿದ್ದರೆ, ಮರುಮಾರ್ಗದ ಪರಿಶೀಲನೆ ಆರಂಭಿಸಿ', assigneeRole: Role.DISTRICT_SUPERVISOR, slaHours: 1 },
      ],
      isActive: true,
    },
    {
      id: 'pb-trans-proc-03',
      name: 'Transport Transit Delay Playbook',
      nameKn: 'ಸಾರಿಗೆ ವಿಳಂಬ ಕ್ರಿಯಾ ಮಾರ್ಗದರ್ಶಿ',
      triggerPhase: GapPhase.TRANSPORT,
      triggerCause: GapCauseClass.PROCESS,
      stepTemplates: [
        { order: 1, description: 'Call 108/Ambulance coordinator for live vehicle location', descriptionKn: 'ವಾಹನದ ನೇರ ಸ್ಥಳ ತಿಳಿಯಲು ೧೦೮/ಆಂಬ್ಯುಲೆನ್ಸ್ ಸಂಯೋಜಕರಿಗೆ ಕರೆ ಮಾಡಿ', assigneeRole: Role.DISTRICT_SUPERVISOR, slaHours: 1 },
        { order: 2, description: 'Confirm maternal condition stability with transit EMT', descriptionKn: 'ಸಾರಿಗೆ ಇಎಂಟಿ ಜೊತೆ ತಾಯಿಯ ಆರೋಗ್ಯ ಸ್ಥಿರತೆಯನ್ನು ಖಚಿತಪಡಿಸಿ', assigneeRole: Role.DISTRICT_SUPERVISOR, slaHours: 1 },
      ],
      isActive: true,
    },
    {
      id: 'pb-disp-proc-04',
      name: 'Disposition Timeout Playbook',
      nameKn: 'ವಿಲೇವಾರಿ ದಾಖಲಾತಿ ವಿಳಂಬ ಕ್ರಿಯಾ ಮಾರ್ಗದರ್ಶಿ',
      triggerPhase: GapPhase.DISPOSITION,
      triggerCause: GapCauseClass.PROCESS,
      stepTemplates: [
        { order: 1, description: 'Inquire with labour room on-duty OB/GYN regarding admission status', descriptionKn: 'ದಾಖಲಾತಿ ಸ್ಥಿತಿ ತಿಳಿಯಲು ಹೆರಿಗೆ ಕೋಣೆಯ ಕರ್ತವ್ಯನಿರತ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ', assigneeRole: Role.DISTRICT_SUPERVISOR, slaHours: 2 },
      ],
      isActive: true,
    },
    {
      id: 'pb-fol-proc-05',
      name: 'Post-Discharge Follow-up Overdue Playbook',
      nameKn: 'ಡಿಸ್ಚಾರ್ಜ್ ನಂತರದ ಫಾಲೋ-ಅಪ್ ವಿಳಂಬ ಕ್ರಿಯಾ ಮಾರ್ಗದರ್ಶಿ',
      triggerPhase: GapPhase.FOLLOW_UP,
      triggerCause: GapCauseClass.PROCESS,
      stepTemplates: [
        { order: 1, description: 'Contact assigned ASHA/ANM for home visit confirmation', descriptionKn: 'ಮನೆ ಭೇಟಿ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಲು ಆಶಾ/ಎಎನ್ಎಂ ಸಂಪರ್ಕಿಸಿ', assigneeRole: Role.DISTRICT_SUPERVISOR, slaHours: 24 },
        { order: 2, description: 'If patient uncontactable, flag for PHC Medical Officer review', descriptionKn: 'ಸಂಪರ್ಕ ಸಾಧ್ಯವಾಗದಿದ್ದರೆ, ಪಿಎಚ್‌ಸಿ ವೈದ್ಯಾಧಿಕಾರಿ ಪರಿಶೀಲನೆಗೆ ಸೂಚಿಸಿ', assigneeRole: Role.DISTRICT_SUPERVISOR, slaHours: 48 },
      ],
      isActive: true,
    },
  ];

  for (const pb of playbooksData) {
    await prisma.playbook.upsert({
      where: { id: pb.id },
      update: pb,
      create: pb,
    });
  }
  console.log(`✅ Upserted ${playbooksData.length} escalation playbooks`);

  // 4. Seed Operational Configurations
  const configs = [
    {
      id: 'cfg-ack-timeout',
      key: 'ACKNOWLEDGEMENT_TIMEOUT_MINUTES',
      value: 30,
      description: 'Maximum allowable minutes before acknowledgement timer expires',
      descriptionKn: 'ಸ್ವೀಕೃತಿ ಪ್ರತಿಕ್ರಿಯೆಗೆ ಗರಿಷ್ಠ ಅನುಮತಿಸಲಾದ ನಿಮಿಷಗಳು',
      category: 'TIMERS',
      requiresClinicalApproval: false,
    },
    {
      id: 'cfg-disp-timeout',
      key: 'DISPOSITION_TIMEOUT_HOURS',
      value: 4,
      description: 'Maximum hours post-arrival before disposition must be recorded',
      descriptionKn: 'ಆಗಮನದ ನಂತರ ವಿಲೇವಾರಿ ದಾಖಲಿಸಲು ಗರಿಷ್ಠ ಗಂಟೆಗಳು',
      category: 'TIMERS',
      requiresClinicalApproval: true,
    },
    {
      id: 'cfg-blackspot-min-threshold',
      key: 'BLACKSPOT_MIN_CASE_COUNT',
      value: 5,
      description: 'Minimum per-facility referral count to display public blackspot metrics',
      descriptionKn: 'ಬ್ಲಾಕ್‌ಸ್ಪಾಟ್ ಮೆಟ್ರಿಕ್ಸ್ ತೋರಿಸಲು ಕನಿಷ್ಠ ಪ್ರಕರಣಗಳ ಮಿತಿ',
      category: 'MIN_THRESHOLD',
      requiresClinicalApproval: false,
    },
  ];

  for (const cfg of configs) {
    await prisma.configuration.upsert({
      where: { key: cfg.key },
      update: cfg,
      create: cfg,
    });
  }
  console.log(`✅ Upserted ${configs.length} operational configuration entries`);

  console.log('✨ Synthetic seed completed successfully without any real patient data.');
}

if (require.main === module) {
  seed()
    .catch((e) => {
      console.error('❌ Seed execution failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
