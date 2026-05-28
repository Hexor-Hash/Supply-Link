import { describe, it, expect } from 'vitest';
import {
  isReplayError,
  isExpiredEventError,
  formatMultiSigError,
  getReplayErrorMessage,
  getExpiredEventMessage,
} from '@/lib/utils/nonce';

describe('isReplayError', () => {
  it('detects InvalidNonce in error message', () => {
    expect(isReplayError(new Error('Contract returned Error(7): InvalidNonce'))).toBe(true);
  });

  it('detects invalid_nonce in error message', () => {
    expect(isReplayError(new Error('invalid_nonce encountered'))).toBe(true);
  });

  it('detects Error(7) in error message', () => {
    expect(isReplayError(new Error('Error(7)'))).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isReplayError(new Error('Network timeout'))).toBe(false);
    expect(isReplayError(new Error('ProductNotFound'))).toBe(false);
    expect(isReplayError(new Error('NotAuthorized'))).toBe(false);
  });

  it('handles non-Error objects', () => {
    expect(isReplayError('InvalidNonce')).toBe(true);
    expect(isReplayError('random string')).toBe(false);
  });

  it('handles null and undefined gracefully', () => {
    expect(isReplayError(null)).toBe(false);
    expect(isReplayError(undefined)).toBe(false);
  });
});

describe('isExpiredEventError', () => {
  it('detects PendingEventExpired in error message', () => {
    expect(isExpiredEventError(new Error('PendingEventExpired'))).toBe(true);
  });

  it('detects generic "expired" in error message', () => {
    expect(isExpiredEventError(new Error('pending event has expired'))).toBe(true);
  });

  it('returns false for non-expiry errors', () => {
    expect(isExpiredEventError(new Error('InvalidNonce'))).toBe(false);
    expect(isExpiredEventError(new Error('ProductNotFound'))).toBe(false);
  });
});

describe('formatMultiSigError', () => {
  it('returns replay message for replay errors', () => {
    const msg = formatMultiSigError(new Error('InvalidNonce'));
    expect(msg).toBe(getReplayErrorMessage());
  });

  it('returns expiry message for expired events', () => {
    const msg = formatMultiSigError(new Error('PendingEventExpired'));
    expect(msg).toBe(getExpiredEventMessage());
  });

  it('returns the error message for generic errors', () => {
    const msg = formatMultiSigError(new Error('Network failure'));
    expect(msg).toBe('Network failure');
  });

  it('returns fallback string for non-Error objects', () => {
    const msg = formatMultiSigError('Something went wrong');
    expect(msg).toBe('Something went wrong');
  });

  it('replay message instructs user to refresh', () => {
    expect(getReplayErrorMessage()).toContain('Refresh');
  });

  it('expiry message references 7-day window', () => {
    expect(getExpiredEventMessage()).toContain('7-day');
  });
});
