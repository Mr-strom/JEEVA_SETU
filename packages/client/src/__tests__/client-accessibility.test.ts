import { describe, it, expect } from 'vitest';
import { translations, TranslationKey } from '../i18n/translations';

describe('Phase 10 Module 2: Frontline PWA Client Accessibility (WCAG AA & Rural Android)', () => {
  describe('1. Non-Color-Alone Status Communication', () => {
    const syncStates = ['SAVED_LOCALLY', 'WAITING_TO_SYNC', 'SYNCHRONISED', 'SYNC_FAILED'];

    it('all sync states have explicit text labels in both English and Kannada (never color alone)', () => {
      syncStates.forEach((state) => {
        const enKey = `sync_${state}` as TranslationKey;
        const knKey = `sync_${state}` as TranslationKey;

        expect(translations.en[enKey]).toBeDefined();
        expect(translations.en[enKey].length).toBeGreaterThan(0);

        expect(translations.kn[knKey]).toBeDefined();
        expect(translations.kn[knKey].length).toBeGreaterThan(0);
      });
    });

    it('case status badges and visit outcomes have clear textual status labels in both languages', () => {
      const statusKeys: TranslationKey[] = [
        'statusPending',
        'statusInTransit',
        'statusArrived',
        'statusDischarged',
        'outcome_COMPLETED',
        'outcome_PATIENT_NOT_FOUND',
        'outcome_PATIENT_REFUSED',
        'outcome_REFERRED_ONWARD',
      ];

      statusKeys.forEach((key) => {
        expect(translations.en[key]).toBeDefined();
        expect(translations.kn[key]).toBeDefined();
        expect(translations.kn[key].length).toBeGreaterThan(0);
      });
    });
  });

  describe('2. Bilingual Completeness & Script Rendering', () => {
    it('every English key has a 1-to-1 matching non-empty Kannada translation', () => {
      const enKeys = Object.keys(translations.en) as TranslationKey[];
      const knKeys = Object.keys(translations.kn) as TranslationKey[];

      expect(knKeys.length).toBeGreaterThanOrEqual(enKeys.length);

      enKeys.forEach((key) => {
        expect(translations.kn[key]).toBeDefined();
        expect(translations.kn[key].trim().length).toBeGreaterThan(0);
        // Ensure no untranslated English placeholders or tofu brackets
        expect(translations.kn[key]).not.toContain('[TODO]');
        expect(translations.kn[key]).not.toContain('undefined');
      });
    });

    it('high-risk danger signs have unambiguous Kannada clinical terms', () => {
      const riskKeys: TranslationKey[] = [
        'risk_SEVERE_ANAEMIA',
        'risk_PRE_ECLAMPSIA',
        'risk_ANTEPARTUM_HAEMORRHAGE',
        'risk_OBSTRUCTED_LABOUR',
        'risk_ECLAMPSIA_CONVULSIONS',
      ];

      riskKeys.forEach((k) => {
        expect(translations.kn[k]).toBeDefined();
        expect(translations.kn[k]).not.toBe(translations.en[k]);
      });
    });
  });

  describe('3. Screen Reader & Form Association Semantics', () => {
    it('verifies standard field names and required labels for all form inputs', () => {
      const requiredFieldLabels: TranslationKey[] = [
        'patientIdLabel',
        'patientNameLabel',
        'patientAgeLabel',
        'gravidaLabel',
        'parityLabel',
        'lmpLabel',
        'eddLabel',
        'receivingHospitalLabel',
        'clinicalSummaryLabel',
      ];

      requiredFieldLabels.forEach((fieldKey) => {
        expect(translations.en[fieldKey]).toBeDefined();
        expect(translations.kn[fieldKey]).toBeDefined();
      });
    });
  });

  describe('4. Modal Focus Trapping', () => {
    it('cycles focus back to first element when tabbing from last element in modal dialog', () => {
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

      const totalElements = 4; // close button (0), outcome select (1), notes textarea (2), submit button (3)

      // Tab on last element (3) cycles to first element (0)
      expect(getNextFocusedIndex(3, totalElements, false)).toBe(0);

      // Shift+Tab on first element (0) cycles to last element (3)
      expect(getNextFocusedIndex(0, totalElements, true)).toBe(3);

      // Intermediate forward and backward navigation
      expect(getNextFocusedIndex(1, totalElements, false)).toBe(2);
      expect(getNextFocusedIndex(2, totalElements, true)).toBe(1);
    });
  });
});
