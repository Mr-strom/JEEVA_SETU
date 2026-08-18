import { describe, it, expect } from 'vitest';
import { translations } from '../i18n/translations';
import { SyncStatus } from '../types';

describe('Phase 6B: Frontline PWA Client & Offline Sync State', () => {
  describe('1. Persistent Sync Status Indicator States', () => {
    it('supports all 4 sync states: SAVED_LOCALLY, WAITING_TO_SYNC, SYNCHRONISED, SYNC_FAILED', () => {
      const states: SyncStatus[] = ['SAVED_LOCALLY', 'WAITING_TO_SYNC', 'SYNCHRONISED', 'SYNC_FAILED'];

      states.forEach((status) => {
        const enKey = `sync_${status}` as keyof typeof translations.en;
        const knKey = `sync_${status}` as keyof typeof translations.kn;

        expect(translations.en[enKey]).toBeDefined();
        expect(translations.kn[knKey]).toBeDefined();
        expect(typeof translations.en[enKey]).toBe('string');
        expect(typeof translations.kn[knKey]).toBe('string');
      });

      expect(translations.en.sync_SAVED_LOCALLY).toContain('Saved locally');
      expect(translations.kn.sync_SAVED_LOCALLY).toContain('ಮೊಬೈಲ್‌ನಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿ ಸಂಗ್ರಹಿಸಲಾಗಿದೆ');

      expect(translations.en.sync_WAITING_TO_SYNC).toContain('Waiting to sync');
      expect(translations.kn.sync_WAITING_TO_SYNC).toContain('ಸರ್ವರ್‌ಗೆ ಕಳುಹಿಸಲು ಬಾಕಿ ಇದೆ');

      expect(translations.en.sync_SYNCHRONISED).toContain('Synchronised');
      expect(translations.kn.sync_SYNCHRONISED).toContain('ಸಿಂಕ್ ಆಗಿದೆ');

      expect(translations.en.sync_SYNC_FAILED).toContain('Sync failed');
      expect(translations.kn.sync_SYNC_FAILED).toContain('ಸಿಂಕ್ ವಿಫಲವಾಗಿದೆ');
    });
  });

  describe('2. Bilingual Translations (Kannada & English)', () => {
    it('all English keys are translated into Kannada without missing strings', () => {
      const enKeys = Object.keys(translations.en);
      const knKeys = Object.keys(translations.kn);

      expect(enKeys.length).toBeGreaterThan(30);
      expect(knKeys.length).toBe(enKeys.length);

      enKeys.forEach((key) => {
        const enVal = (translations.en as any)[key];
        const knVal = (translations.kn as any)[key];
        expect(enVal).toBeDefined();
        expect(knVal).toBeDefined();
        expect(enVal.trim().length).toBeGreaterThan(0);
        expect(knVal.trim().length).toBeGreaterThan(0);
      });
    });

    it('contains maternal danger signs and clinical safety notices', () => {
      expect(translations.en.safetyNotice).toContain('Not a Diagnostic Tool');
      expect(translations.kn.safetyNotice).toContain('ರೋಗನಿರ್ಣಯ ಸಾಧನವಲ್ಲ');

      expect(translations.en.risk_SEVERE_ANAEMIA).toContain('Severe Anaemia');
      expect(translations.kn.risk_SEVERE_ANAEMIA).toContain('ರಕ್ತಹೀನತೆ');

      expect(translations.en.risk_PRE_ECLAMPSIA).toContain('Pre-eclampsia');
      expect(translations.kn.risk_PRE_ECLAMPSIA).toContain('ರಕ್ತದೊತ್ತಡ');
    });
  });

  describe('3. Single Primary Action Rule Per Screen', () => {
    it('defines clear primary actions for referral creation, queue, and follow-up', () => {
      // New Referral Screen: primary is submit referral
      expect(translations.en.submitReferralPrimary).toBe('Send Referral to Hospital');
      expect(translations.kn.submitReferralPrimary).toBe('ಆಸ್ಪತ್ರೆಗೆ ಉಲ್ಲೇಖ ಕಳುಹಿಸಿ');

      // Follow-up Screen: primary is record home visit
      expect(translations.en.recordVisitPrimary).toBe('Record Home Visit');
      expect(translations.kn.recordVisitPrimary).toBe('ಮನೆ ಭೇಟಿ ದಾಖಲಿಸಿ');
    });
  });
});
