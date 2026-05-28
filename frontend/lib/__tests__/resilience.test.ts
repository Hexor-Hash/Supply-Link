import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  withRetry,
  RetryTimeoutError,
  RetriesExhaustedError,
  CircuitBreaker,
  CircuitOpenError,
} from '@/lib/resilience';

describe('withRetry', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns immediately on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on transient failure and succeeds', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('transient')).mockResolvedValue('ok');

    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    // advance past backoff
    await vi.runAllTimersAsync();
    expect(await promise).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws RetriesExhaustedError after all attempts fail', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toBeInstanceOf(RetriesExhaustedError);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry permanent errors', async () => {
    const permanentErr = new Error('not authorized');
    const fn = vi.fn().mockRejectedValue(permanentErr);
    const promise = withRetry(fn, {
      maxAttempts: 3,
      isPermanent: (e) => e instanceof Error && e.message.includes('not authorized'),
    });
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toBe(permanentErr);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry callback with attempt number', async () => {
    const onRetry = vi.fn();
    const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('ok');

    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 10, onRetry });
    await vi.runAllTimersAsync();
    await promise;
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });

  it('throws RetriesExhaustedError whose cause is RetryTimeoutError when attempt times out', async () => {
    const fn = vi.fn().mockImplementation(() => new Promise((r) => setTimeout(r, 5_000)));
    const promise = withRetry(fn, { maxAttempts: 1, timeoutMs: 100 });
    await vi.runAllTimersAsync();
    const err = await promise.catch((e) => e);
    expect(err).toBeInstanceOf(RetriesExhaustedError);
    expect(err.message).toMatch(/timed out/i);
  });
});

describe('CircuitBreaker', () => {
  it('starts closed and passes calls through', async () => {
    const cb = new CircuitBreaker('test');
    const fn = vi.fn().mockResolvedValue('ok');
    expect(await cb.call(fn)).toBe('ok');
    expect(cb.currentState).toBe('closed');
  });

  it('opens after failureThreshold failures', async () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 2 });
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(cb.call(fn)).rejects.toThrow();
    await expect(cb.call(fn)).rejects.toThrow();
    expect(cb.currentState).toBe('open');
  });

  it('throws CircuitOpenError when open', async () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 1 });
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(cb.call(fn)).rejects.toThrow();
    await expect(cb.call(vi.fn())).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it('transitions to half-open after resetTimeoutMs', async () => {
    vi.useFakeTimers();
    const cb = new CircuitBreaker('test', { failureThreshold: 1, resetTimeoutMs: 1_000 });
    const fail = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(cb.call(fail)).rejects.toThrow();
    expect(cb.currentState).toBe('open');

    vi.advanceTimersByTime(1_001);
    const succeed = vi.fn().mockResolvedValue('ok');
    expect(await cb.call(succeed)).toBe('ok');
    expect(cb.currentState).toBe('closed');
    vi.useRealTimers();
  });
});
