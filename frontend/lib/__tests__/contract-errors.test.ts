import { describe, it, expect } from 'vitest';
import {
  ContractErrorCode,
  extractContractErrorCode,
  mapContractError,
  contractErrorI18nKey,
} from '@/lib/stellar/contract-errors';

describe('extractContractErrorCode', () => {
  it('extracts code from { code: number } shape', () => {
    expect(extractContractErrorCode({ code: 1 })).toBe(ContractErrorCode.ProductNotFound);
  });

  it('extracts code from { result: { code: number } } shape', () => {
    expect(extractContractErrorCode({ result: { code: 2 } })).toBe(ContractErrorCode.NotAuthorized);
  });

  it('returns null for unknown code', () => {
    expect(extractContractErrorCode({ code: 999 })).toBeNull();
  });

  it('returns null for non-object', () => {
    expect(extractContractErrorCode('error string')).toBeNull();
    expect(extractContractErrorCode(null)).toBeNull();
  });
});

describe('mapContractError', () => {
  it('maps ProductNotFound (1) correctly', () => {
    const mapped = mapContractError({ code: 1 });
    expect(mapped?.key).toBe('PRODUCT_NOT_FOUND');
    expect(mapped?.httpStatus).toBe(404);
  });

  it('maps NotAuthorized (2) correctly', () => {
    const mapped = mapContractError({ code: 2 });
    expect(mapped?.key).toBe('NOT_AUTHORIZED');
    expect(mapped?.httpStatus).toBe(403);
  });

  it('maps ApproverNotAuthorized (3) correctly', () => {
    const mapped = mapContractError({ code: 3 });
    expect(mapped?.key).toBe('APPROVER_NOT_AUTHORIZED');
    expect(mapped?.httpStatus).toBe(403);
  });

  it('maps NoPendingEvents (4) correctly', () => {
    const mapped = mapContractError({ code: 4 });
    expect(mapped?.key).toBe('NO_PENDING_EVENTS');
    expect(mapped?.httpStatus).toBe(404);
  });

  it('maps OwnerOnly (5) correctly', () => {
    const mapped = mapContractError({ code: 5 });
    expect(mapped?.key).toBe('OWNER_ONLY');
    expect(mapped?.httpStatus).toBe(403);
  });

  it('maps PendingEventExpired (6) correctly', () => {
    const mapped = mapContractError({ code: 6 });
    expect(mapped?.key).toBe('PENDING_EVENT_EXPIRED');
    expect(mapped?.httpStatus).toBe(410);
  });

  it('maps InvalidNonce (7) correctly', () => {
    const mapped = mapContractError({ code: 7 });
    expect(mapped?.key).toBe('INVALID_NONCE');
    expect(mapped?.httpStatus).toBe(409);
  });

  it('error codes match the Rust #[contracterror] enum ordering', () => {
    expect(ContractErrorCode.NoPendingEvents).toBe(4);
    expect(ContractErrorCode.OwnerOnly).toBe(5);
    expect(ContractErrorCode.PendingEventExpired).toBe(6);
    expect(ContractErrorCode.InvalidNonce).toBe(7);
  });

  it('returns null for unrecognised error', () => {
    expect(mapContractError({ code: 42 })).toBeNull();
    expect(mapContractError('not an error object')).toBeNull();
  });

  it('every mapped error has a non-empty message', () => {
    for (let code = 1; code <= 7; code++) {
      const mapped = mapContractError({ code });
      expect(mapped?.message.length).toBeGreaterThan(0);
    }
  });
});

describe('contractErrorI18nKey', () => {
  it('returns a namespaced key for a known contract error', () => {
    expect(contractErrorI18nKey({ code: 1 })).toBe('errors.PRODUCT_NOT_FOUND');
    expect(contractErrorI18nKey({ code: 7 })).toBe('errors.INVALID_NONCE');
  });

  it('falls back to errors.UNKNOWN for unrecognised errors', () => {
    expect(contractErrorI18nKey({ code: 999 })).toBe('errors.UNKNOWN');
    expect(contractErrorI18nKey('nope')).toBe('errors.UNKNOWN');
  });
});
