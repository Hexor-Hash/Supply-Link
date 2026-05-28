/**
 * Centralised secret management for Supply-Link backend.
 *
 * Responsibilities:
 *  - Inventory and classify all backend secrets
 *  - Validate presence and format at load time
 *  - Provide a safe accessor that never leaks values into errors/logs
 *  - Redact secret values from arbitrary strings (for logging)
 */

// ── Secret registry ───────────────────────────────────────────────────────────

export type SecretCriticality = "critical" | "optional";

interface SecretSpec {
  /** Environment variable name */
  key: string;
  criticality: SecretCriticality;
  /** Returns null if valid, an error message string if invalid */
  validate?: (value: string) => string | null;
}

/** Stellar secret key: starts with 'S', 56 chars, base32 alphabet */
function validateStellarSecret(value: string): string | null {
  if (!/^S[A-Z2-7]{55}$/.test(value)) {
    return "must be a 56-character Stellar secret key starting with 'S'";
  }
  return null;
}

/** Non-empty string with minimum length */
function minLength(n: number) {
  return (value: string): string | null =>
    value.length >= n ? null : `must be at least ${n} characters`;
}

export const SECRET_REGISTRY: SecretSpec[] = [
  {
    key: "STELLAR_FEE_BUMP_SECRET",
    criticality: "critical",
    validate: validateStellarSecret,
  },
  {
    key: "BLOB_READ_WRITE_TOKEN",
    criticality: "optional",
    validate: minLength(10),
  },
  {
    key: "KV_REST_API_URL",
    criticality: "optional",
    validate: (v) => (v.startsWith("https://") ? null : "must be an https:// URL"),
  },
  {
    key: "KV_REST_API_TOKEN",
    criticality: "optional",
    validate: minLength(10),
  },
];

// ── Validation result ─────────────────────────────────────────────────────────

export interface SecretValidationResult {
  key: string;
  criticality: SecretCriticality;
  present: boolean;
  valid: boolean;
  /** Human-readable reason — never contains the secret value */
  reason?: string;
}

export function validateSecrets(
  env: NodeJS.ProcessEnv = process.env
): SecretValidationResult[] {
  return SECRET_REGISTRY.map((spec) => {
    const value = env[spec.key];
    if (!value) {
      return {
        key: spec.key,
        criticality: spec.criticality,
        present: false,
        valid: false,
        reason: "not set",
      };
    }
    const formatError = spec.validate?.(value) ?? null;
    return {
      key: spec.key,
      criticality: spec.criticality,
      present: true,
      valid: formatError === null,
      reason: formatError ?? undefined,
    };
  });
}

/** Returns true only if all critical secrets are present and valid. */
export function areCriticalSecretsValid(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return validateSecrets(env)
    .filter((r) => r.criticality === "critical")
    .every((r) => r.valid);
}

// ── Safe accessor ─────────────────────────────────────────────────────────────

export class SecretMissingError extends Error {
  constructor(public readonly key: string) {
    super(`Required secret '${key}' is not configured`);
    this.name = "SecretMissingError";
  }
}

export class SecretInvalidError extends Error {
  constructor(
    public readonly key: string,
    reason: string
  ) {
    // reason describes the format problem, never the value
    super(`Secret '${key}' failed validation: ${reason}`);
    this.name = "SecretInvalidError";
  }
}

/**
 * Retrieve a secret from the environment, throwing typed errors on failure.
 * Never includes the secret value in thrown errors.
 */
export function requireSecret(
  key: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  const spec = SECRET_REGISTRY.find((s) => s.key === key);
  const value = env[key];
  if (!value) throw new SecretMissingError(key);
  if (spec?.validate) {
    const err = spec.validate(value);
    if (err) throw new SecretInvalidError(key, err);
  }
  return value;
}

// ── Log redaction ─────────────────────────────────────────────────────────────

/**
 * Replace any known secret values in a string with '[REDACTED]'.
 * Call this before passing strings to console.error / logging services.
 */
export function redactSecrets(
  input: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  let result = input;
  for (const spec of SECRET_REGISTRY) {
    const value = env[spec.key];
    if (value && value.length >= 8) {
      // Escape special regex chars in the secret value
      const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(escaped, "g"), "[REDACTED]");
    }
  }
  return result;
}
