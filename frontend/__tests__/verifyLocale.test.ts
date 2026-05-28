/**
 * Locale rendering tests for the verify page translations.
 * Validates that all required keys exist in each locale and that
 * there is no fallback text leakage (untranslated English copy).
 */
import { describe, it, expect } from 'vitest';
import en from '@/messages/en.json';
import es from '@/messages/es.json';
import fr from '@/messages/fr.json';
import { ContractErrorCode, mapContractError } from '@/lib/stellar/contract-errors';

type Messages = typeof en;

const LOCALES: Record<string, Messages> = { en, es, fr };

// Keys that must be present in every locale under the verify namespace
const REQUIRED_VERIFY_KEYS = [
  'notFound.title',
  'notFound.desc',
  'notFound.hint',
  'notFound.scanAnother',
  'origin',
  'registered',
  'owner',
  'active',
  'inactive',
  'verifiedBadge',
  'journey',
  'scanAnother',
  'communityRatings',
  'noEvents',
  'eventTypes.HARVEST',
  'eventTypes.PROCESSING',
  'eventTypes.SHIPPING',
  'eventTypes.RETAIL',
] as const;

// Keys that must be present in every locale under the ratings namespace
const REQUIRED_RATINGS_KEYS = [
  'count',
  'leaveRating',
  'commentPlaceholder',
  'submitButton',
  'submitting',
  'connectPrompt',
  'connectWalletFirst',
  'selectRating',
  'submitSuccess',
  'submitError',
] as const;

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

describe('verify page locale completeness', () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    describe(`locale: ${locale}`, () => {
      for (const key of REQUIRED_VERIFY_KEYS) {
        it(`has verify.${key}`, () => {
          const value = getNestedValue(messages.verify as unknown as Record<string, unknown>, key);
          expect(value, `Missing key: verify.${key} in ${locale}`).toBeDefined();
          expect(typeof value).toBe('string');
          expect((value as string).length).toBeGreaterThan(0);
        });
      }
    });
  }
});

describe('no fallback leakage in non-English locales', () => {
  const englishVerify = en.verify as unknown as Record<string, unknown>;

  for (const [locale, messages] of Object.entries(LOCALES)) {
    if (locale === 'en') continue;

    it(`${locale} verify strings differ from English`, () => {
      const localeVerify = messages.verify as unknown as Record<string, unknown>;
      // At least the main labels should differ from English
      const enOrigin = getNestedValue(englishVerify, 'origin') as string;
      const localeOrigin = getNestedValue(localeVerify, 'origin') as string;
      expect(localeOrigin).not.toBe(enOrigin);
    });
  }
});

describe('ratings namespace locale completeness', () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    describe(`locale: ${locale}`, () => {
      for (const key of REQUIRED_RATINGS_KEYS) {
        it(`has ratings.${key}`, () => {
          const value = getNestedValue(messages.ratings as unknown as Record<string, unknown>, key);
          expect(value, `Missing key: ratings.${key} in ${locale}`).toBeDefined();
          expect(typeof value).toBe('string');
          expect((value as string).length).toBeGreaterThan(0);
        });
      }
    });
  }
});

describe('contract error messages are localized', () => {
  // Every mapped contract-error key (plus UNKNOWN fallback) must have a string in each locale.
  const contractErrorKeys = Object.values(ContractErrorCode)
    .map((code) => mapContractError({ code })?.key)
    .filter((k): k is string => Boolean(k))
    .concat('UNKNOWN');

  for (const [locale, messages] of Object.entries(LOCALES)) {
    describe(`locale: ${locale}`, () => {
      for (const key of contractErrorKeys) {
        it(`has errors.${key}`, () => {
          const value = (messages.errors as unknown as Record<string, unknown>)[key];
          expect(value, `Missing key: errors.${key} in ${locale}`).toBeDefined();
          expect(typeof value).toBe('string');
          expect((value as string).length).toBeGreaterThan(0);
        });
      }
    });
  }

  it('non-English contract error messages differ from English', () => {
    const enErrors = en.errors as unknown as Record<string, string>;
    const esErrors = es.errors as unknown as Record<string, string>;
    expect(esErrors.PRODUCT_NOT_FOUND).not.toBe(enErrors.PRODUCT_NOT_FOUND);
  });
});

describe('date formatting', () => {
  it('formats dates differently per locale', () => {
    const date = new Date('2024-06-15T10:30:00Z');
    const enFormatted = new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
    const frFormatted = new Intl.DateTimeFormat('fr', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
    expect(enFormatted).not.toBe(frFormatted);
  });
});
