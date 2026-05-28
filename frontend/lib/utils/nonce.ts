export const REPLAY_ERROR_CODES = ['InvalidNonce', 'invalid_nonce', 'Error(7)'] as const;

export function isReplayError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return REPLAY_ERROR_CODES.some((code) => msg.includes(code));
}

export function getReplayErrorMessage(): string {
  return 'This transaction was already submitted. Refresh the page to get the latest nonce and try again.';
}

export function formatNonceError(error: unknown): string {
  if (isReplayError(error)) return getReplayErrorMessage();
  return error instanceof Error ? error.message : 'Transaction failed';
}

export function isExpiredEventError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('PendingEventExpired') || msg.includes('expired');
}

export function getExpiredEventMessage(): string {
  return 'This pending event has expired (7-day window exceeded) and can no longer be approved.';
}

export function formatMultiSigError(error: unknown): string {
  if (isReplayError(error)) return getReplayErrorMessage();
  if (isExpiredEventError(error)) return getExpiredEventMessage();
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Multi-signature operation failed';
}
