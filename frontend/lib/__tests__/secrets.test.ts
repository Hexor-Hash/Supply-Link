import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  validateSecrets,
  areCriticalSecretsValid,
  requireSecret,
  SecretMissingError,
  SecretInvalidError,
  redactSecrets,
} from "@/lib/secrets";

// A valid 56-char Stellar secret key (S + 55 base32 chars)
const VALID_STELLAR_SECRET = "SCZANGBA5TNPQX2VALUV3SQNZT3LJYI3LBFCEQOARH5WQTXUJZKOLTA";

describe("validateSecrets", () => {
  it("marks critical secret as invalid when missing", () => {
    const results = validateSecrets({});
    const feeBump = results.find((r) => r.key === "STELLAR_FEE_BUMP_SECRET")!;
    expect(feeBump.present).toBe(false);
    expect(feeBump.valid).toBe(false);
    expect(feeBump.criticality).toBe("critical");
  });

  it("marks critical secret as valid when correctly formatted", () => {
    const results = validateSecrets({ STELLAR_FEE_BUMP_SECRET: VALID_STELLAR_SECRET });
    const feeBump = results.find((r) => r.key === "STELLAR_FEE_BUMP_SECRET")!;
    expect(feeBump.valid).toBe(true);
    expect(feeBump.reason).toBeUndefined();
  });

  it("marks critical secret as invalid when format is wrong", () => {
    const results = validateSecrets({ STELLAR_FEE_BUMP_SECRET: "not-a-stellar-key" });
    const feeBump = results.find((r) => r.key === "STELLAR_FEE_BUMP_SECRET")!;
    expect(feeBump.present).toBe(true);
    expect(feeBump.valid).toBe(false);
    expect(feeBump.reason).toMatch(/56-character/);
  });

  it("marks optional secrets as optional criticality", () => {
    const results = validateSecrets({});
    const blob = results.find((r) => r.key === "BLOB_READ_WRITE_TOKEN")!;
    expect(blob.criticality).toBe("optional");
  });

  it("validates KV_REST_API_URL must be https", () => {
    const results = validateSecrets({ KV_REST_API_URL: "http://insecure.example.com" });
    const kv = results.find((r) => r.key === "KV_REST_API_URL")!;
    expect(kv.valid).toBe(false);
    expect(kv.reason).toMatch(/https/);
  });
});

describe("areCriticalSecretsValid", () => {
  it("returns false when critical secret is missing", () => {
    expect(areCriticalSecretsValid({})).toBe(false);
  });

  it("returns false when critical secret has invalid format", () => {
    expect(areCriticalSecretsValid({ STELLAR_FEE_BUMP_SECRET: "SBAD" })).toBe(false);
  });

  it("returns true when all critical secrets are valid", () => {
    expect(areCriticalSecretsValid({ STELLAR_FEE_BUMP_SECRET: VALID_STELLAR_SECRET })).toBe(true);
  });
});

describe("requireSecret", () => {
  it("throws SecretMissingError when env var is absent", () => {
    expect(() => requireSecret("STELLAR_FEE_BUMP_SECRET", {})).toThrow(SecretMissingError);
  });

  it("throws SecretInvalidError when format is wrong", () => {
    expect(() =>
      requireSecret("STELLAR_FEE_BUMP_SECRET", { STELLAR_FEE_BUMP_SECRET: "SBAD" })
    ).toThrow(SecretInvalidError);
  });

  it("error message does not contain the secret value", () => {
    const badValue = "SBADVALUE_THAT_SHOULD_NOT_APPEAR_IN_ERROR_MESSAGE_EVER";
    try {
      requireSecret("STELLAR_FEE_BUMP_SECRET", { STELLAR_FEE_BUMP_SECRET: badValue });
    } catch (e) {
      expect(String(e)).not.toContain(badValue);
    }
  });

  it("returns the value when valid", () => {
    const value = requireSecret("STELLAR_FEE_BUMP_SECRET", {
      STELLAR_FEE_BUMP_SECRET: VALID_STELLAR_SECRET,
    });
    expect(value).toBe(VALID_STELLAR_SECRET);
  });

  it("returns value for unregistered key without format validation", () => {
    const value = requireSecret("SOME_UNKNOWN_KEY", { SOME_UNKNOWN_KEY: "anything" });
    expect(value).toBe("anything");
  });
});

describe("redactSecrets", () => {
  const env = { STELLAR_FEE_BUMP_SECRET: VALID_STELLAR_SECRET };

  it("replaces secret value with [REDACTED]", () => {
    const log = `Error: key=${VALID_STELLAR_SECRET} failed`;
    expect(redactSecrets(log, env)).toBe("Error: key=[REDACTED] failed");
  });

  it("leaves strings without secrets unchanged", () => {
    const log = "Normal log message with no secrets";
    expect(redactSecrets(log, env)).toBe(log);
  });

  it("redacts multiple occurrences", () => {
    const log = `${VALID_STELLAR_SECRET} and again ${VALID_STELLAR_SECRET}`;
    expect(redactSecrets(log, env)).toBe("[REDACTED] and again [REDACTED]");
  });

  it("does not redact when env has no matching secrets", () => {
    const log = "some log";
    expect(redactSecrets(log, {})).toBe("some log");
  });
});
