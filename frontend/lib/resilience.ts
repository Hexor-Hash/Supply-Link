/**
 * Resilience utilities: retry with exponential backoff, circuit breaker,
 * and timeout wrapping for network and contract calls.
 */

export interface RetryConfig {
  /** Maximum number of attempts (including the first). Default: 3 */
  maxAttempts?: number;
  /** Base delay in ms for exponential backoff. Default: 500 */
  baseDelayMs?: number;
  /** Maximum delay cap in ms. Default: 10_000 */
  maxDelayMs?: number;
  /** Timeout per attempt in ms. Default: 15_000 */
  timeoutMs?: number;
  /**
   * Return true for errors that should NOT be retried (e.g. 4xx, auth errors).
   * Permanent errors are thrown immediately without further attempts.
   */
  isPermanent?: (error: unknown) => boolean;
  /** Called after each failed attempt with the attempt number (1-based) and error. */
  onRetry?: (attempt: number, error: unknown) => void;
}

const DEFAULT: Required<Omit<RetryConfig, 'isPermanent' | 'onRetry'>> = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
  timeoutMs: 15_000,
};

function backoffMs(attempt: number, base: number, cap: number): number {
  const exp = base * Math.pow(2, attempt - 1);
  const capped = Math.min(exp, cap);
  // ±10% jitter
  return Math.round(capped * (0.9 + Math.random() * 0.2));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new RetryTimeoutError(ms)), ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      },
    );
  });
}

export class RetryTimeoutError extends Error {
  constructor(ms: number) {
    super(`Request timed out after ${ms}ms`);
    this.name = 'RetryTimeoutError';
  }
}

export class RetriesExhaustedError extends Error {
  constructor(
    public readonly attempts: number,
    public readonly cause: unknown,
  ) {
    super(
      `Failed after ${attempts} attempt(s): ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    this.name = 'RetriesExhaustedError';
  }
}

/**
 * Execute `fn` with retry/backoff semantics.
 *
 * @example
 * const data = await withRetry(() => fetchContractState(id), { maxAttempts: 4 });
 */
export async function withRetry<T>(fn: () => Promise<T>, config: RetryConfig = {}): Promise<T> {
  const maxAttempts = config.maxAttempts ?? DEFAULT.maxAttempts;
  const baseDelayMs = config.baseDelayMs ?? DEFAULT.baseDelayMs;
  const maxDelayMs = config.maxDelayMs ?? DEFAULT.maxDelayMs;
  const timeoutMs = config.timeoutMs ?? DEFAULT.timeoutMs;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (err) {
      lastError = err;

      if (config.isPermanent?.(err)) throw err;

      if (attempt < maxAttempts) {
        config.onRetry?.(attempt, err);
        const delay = backoffMs(attempt, baseDelayMs, maxDelayMs);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw new RetriesExhaustedError(maxAttempts, lastError);
}

// ── Circuit Breaker ───────────────────────────────────────────────────────────

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  /** Failures before opening the circuit. Default: 5 */
  failureThreshold?: number;
  /** How long (ms) to stay open before trying half-open. Default: 30_000 */
  resetTimeoutMs?: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private openedAt = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(
    public readonly name: string,
    config: CircuitBreakerConfig = {},
  ) {
    this.failureThreshold = config.failureThreshold ?? 5;
    this.resetTimeoutMs = config.resetTimeoutMs ?? 30_000;
  }

  get currentState(): CircuitState {
    return this.state;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.openedAt >= this.resetTimeoutMs) {
        this.state = 'half-open';
      } else {
        throw new CircuitOpenError(this.name);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
      this.openedAt = Date.now();
    }
  }
}

export class CircuitOpenError extends Error {
  constructor(name: string) {
    super(`Circuit "${name}" is open — dependency unavailable`);
    this.name = 'CircuitOpenError';
  }
}

// ── Shared circuit breakers ───────────────────────────────────────────────────

export const contractCircuit = new CircuitBreaker('soroban-rpc', {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
});
export const horizonCircuit = new CircuitBreaker('horizon', {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
});

/**
 * Convenience: retry + circuit breaker for contract read calls.
 * Permanent errors (4xx-equivalent contract errors) are not retried.
 */
export function withContractRetry<T>(fn: () => Promise<T>, config?: RetryConfig): Promise<T> {
  return contractCircuit.call(() =>
    withRetry(fn, {
      maxAttempts: 3,
      baseDelayMs: 500,
      ...config,
      isPermanent: (err) =>
        err instanceof CircuitOpenError ||
        (err instanceof Error && /not found|not authorized|invalid/i.test(err.message)) ||
        (config?.isPermanent?.(err) ?? false),
    }),
  );
}

/**
 * Convenience: retry + circuit breaker for contract write (sign+submit) calls.
 * Writes use fewer retries and a longer timeout.
 */
export function withContractWriteRetry<T>(fn: () => Promise<T>, config?: RetryConfig): Promise<T> {
  return contractCircuit.call(() =>
    withRetry(fn, {
      maxAttempts: 2,
      baseDelayMs: 1_000,
      timeoutMs: 30_000,
      ...config,
      isPermanent: (err) =>
        err instanceof CircuitOpenError ||
        (err instanceof Error && /not authorized|invalid|already exists/i.test(err.message)) ||
        (config?.isPermanent?.(err) ?? false),
    }),
  );
}
