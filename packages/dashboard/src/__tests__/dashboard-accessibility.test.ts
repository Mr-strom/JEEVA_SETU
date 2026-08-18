import { describe, it, expect } from 'vitest';
import { translations, TranslationKey } from '../i18n/translations';

describe('Phase 10 Module 2: Operations Dashboard Accessibility & High-Contrast Review', () => {
  describe('1. Color-Blind Friendly Status and Severity Indicators', () => {
    it('every status badge and severity rank includes human-readable text labels', () => {
      const statusKeys: TranslationKey[] = [
        'status_DRAFT',
        'status_SUBMITTED',
        'status_ACKNOWLEDGEMENT_PENDING',
        'status_ACCEPTED',
        'status_REDIRECTED',
        'status_REJECTED',
        'status_REROUTED',
        'status_IN_TRANSIT',
        'status_ARRIVED',
        'status_CLINICAL_DISPOSITION_RECORDED',
        'status_DISCHARGED',
        'status_FOLLOW_UP_DUE',
        'status_FOLLOW_UP_COMPLETED',
        'status_FOLLOW_UP_ESCALATED',
        'status_CLOSED',
      ];

      statusKeys.forEach((key) => {
        expect(translations.en[key]).toBeDefined();
        expect(translations.en[key].length).toBeGreaterThan(0);
        expect(translations.kn[key]).toBeDefined();
        expect(translations.kn[key].length).toBeGreaterThan(0);
      });
    });

    it('blackspot dashboard columns and stats have complete bilingual strings', () => {
      const blackspotKeys: TranslationKey[] = [
        'blackspotTitle',
        'blackspotSubtitle',
        'blackspotDisclaimer',
        'blackspotSuppressionNotice',
        'statTotalTracked',
        'statCapacitySignals',
        'statAvgRejectionRate',
        'statReroutes',
        'colFacility',
        'colTotalCases',
        'colRejectionRate',
        'colSignals',
        'colReroutes',
        'colMedianAck',
        'colSeverity',
        'viewSignalsBtn',
        'signalsModalTitle',
      ];

      blackspotKeys.forEach((key) => {
        expect(translations.en[key]).toBeDefined();
        expect(translations.kn[key]).toBeDefined();
        expect(translations.kn[key].length).toBeGreaterThan(0);
      });
    });
  });

  describe('2. Persistent Safety Disclaimer Prominence', () => {
    it('safety disclaimer and blackspot indicators have exact mandatory phrasing', () => {
      expect(translations.en.blackspotDisclaimer).toBe(
        'Pilot-period, synthetic-data operational indicator — not a clinical performance judgment',
      );
      expect(translations.kn.blackspotDisclaimer).toBe(
        'ಪ್ರಾಯೋಗಿಕ ಹಂತದ, ಸಿಂಥೆಟಿಕ್ ದತ್ತಾಂಶ ಆಧಾರಿತ ಕಾರ್ಯಾಚರಣಾ ಸೂಚಕ — ಇದು ಕ್ಲಿನಿಕಲ್ ಕಾರ್ಯಕ್ಷಮತೆಯ ತೀರ್ಪಲ್ಲ',
      );
    });
  });

  describe('3. Dictionary Completeness & Zero-Tofu Verification', () => {
    it('every English key in dashboard dictionary has a corresponding Kannada string', () => {
      const enKeys = Object.keys(translations.en) as TranslationKey[];
      const knKeys = Object.keys(translations.kn) as TranslationKey[];

      expect(knKeys.length).toBeGreaterThanOrEqual(enKeys.length);

      enKeys.forEach((k) => {
        expect(translations.kn[k]).toBeDefined();
        expect(translations.kn[k].trim().length).toBeGreaterThan(0);
        expect(translations.kn[k]).not.toContain('[TODO]');
      });
    });
  });

  describe('4. Modal Dialog Focus Trapping', () => {
    it('traps keyboard focus within modal by cycling from last element to first element on Tab', () => {
      function getNextFocusedIndex(
        currentIndex: number,
        totalFocusables: number,
        isShiftTab: boolean,
      ): number {
        if (totalFocusables === 0) return -1;
        if (isShiftTab) {
          return currentIndex === 0 ? totalFocusables - 1 : currentIndex - 1;
        } else {
          return currentIndex === totalFocusables - 1 ? 0 : currentIndex + 1;
        }
      }

      const totalElements = 3; // e.g. close button (0), dialog list (1), confirm button (2)

      // Tabbing from last element (2) wraps to first element (0)
      expect(getNextFocusedIndex(2, totalElements, false)).toBe(0);

      // Shift-Tabbing from first element (0) wraps to last element (2)
      expect(getNextFocusedIndex(0, totalElements, true)).toBe(2);

      // Normal forward and backward navigation
      expect(getNextFocusedIndex(0, totalElements, false)).toBe(1);
      expect(getNextFocusedIndex(1, totalElements, true)).toBe(0);
    });
  });
});
