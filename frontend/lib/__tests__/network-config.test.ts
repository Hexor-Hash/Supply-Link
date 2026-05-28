import { describe, it, expect } from "vitest";
import {
  checkNetworkConfig,
  assertNetworkConfig,
  NETWORK_MATRIX,
} from "@/lib/network-config";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_CONTRACT = "CBUWSKT2UGOAXK4ZREVDJV5XHSYB42PZ3CERU2ZFUTUMAZLJEHNZIECA";

const TESTNET_OK: NodeJS.ProcessEnv = {
  NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
  NEXT_PUBLIC_CONTRACT_ID: VALID_CONTRACT,
};

const MAINNET_OK: NodeJS.ProcessEnv = {
  NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
  NEXT_PUBLIC_CONTRACT_ID: VALID_CONTRACT,
};

// ── Valid configurations ──────────────────────────────────────────────────────

describe("checkNetworkConfig — valid", () => {
  it("passes for a minimal valid testnet config", () => {
    const result = checkNetworkConfig(TESTNET_OK);
    expect(result.valid).toBe(true);
    expect(result.drifts).toHaveLength(0);
    expect(result.effectiveConfig.network).toBe("testnet");
  });

  it("passes for a minimal valid mainnet config", () => {
    const result = checkNetworkConfig(MAINNET_OK);
    expect(result.valid).toBe(true);
    expect(result.effectiveConfig.network).toBe("mainnet");
  });

  it("passes when RPC URL matches the expected testnet hostname", () => {
    const result = checkNetworkConfig({
      ...TESTNET_OK,
      NEXT_PUBLIC_RPC_URL: "https://soroban-testnet.stellar.org",
    });
    expect(result.valid).toBe(true);
  });

  it("passes when explicit passphrase matches the matrix", () => {
    const result = checkNetworkConfig({
      ...TESTNET_OK,
      NEXT_PUBLIC_NETWORK_PASSPHRASE: NETWORK_MATRIX.testnet.passphrase,
    });
    expect(result.valid).toBe(true);
  });
});

// ── Missing / unknown network ─────────────────────────────────────────────────

describe("checkNetworkConfig — unknown network", () => {
  it("reports drift when NEXT_PUBLIC_STELLAR_NETWORK is missing", () => {
    const result = checkNetworkConfig({ NEXT_PUBLIC_CONTRACT_ID: VALID_CONTRACT });
    expect(result.valid).toBe(false);
    expect(result.drifts[0]).toMatch(/NEXT_PUBLIC_STELLAR_NETWORK/);
  });

  it("reports drift when NEXT_PUBLIC_STELLAR_NETWORK is an unknown value", () => {
    const result = checkNetworkConfig({
      NEXT_PUBLIC_STELLAR_NETWORK: "staging",
      NEXT_PUBLIC_CONTRACT_ID: VALID_CONTRACT,
    });
    expect(result.valid).toBe(false);
    expect(result.drifts[0]).toMatch(/staging/);
  });
});

// ── Contract ID drift ─────────────────────────────────────────────────────────

describe("checkNetworkConfig — contract ID", () => {
  it("reports drift when contract ID is missing", () => {
    const result = checkNetworkConfig({ NEXT_PUBLIC_STELLAR_NETWORK: "testnet" });
    expect(result.valid).toBe(false);
    expect(result.drifts.some((d) => d.includes("NEXT_PUBLIC_CONTRACT_ID"))).toBe(true);
  });

  it("reports drift when contract ID has wrong format", () => {
    const result = checkNetworkConfig({
      NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
      NEXT_PUBLIC_CONTRACT_ID: "not-a-contract-id",
    });
    expect(result.valid).toBe(false);
    expect(result.drifts.some((d) => d.includes("invalid format"))).toBe(true);
  });

  it("effectiveConfig exposes only the first 8 chars of contract ID", () => {
    const result = checkNetworkConfig(TESTNET_OK);
    expect(result.effectiveConfig.contractIdPrefix).toBe(VALID_CONTRACT.slice(0, 8));
    expect(result.effectiveConfig.contractIdPrefix).not.toBe(VALID_CONTRACT);
  });
});

// ── RPC hostname drift ────────────────────────────────────────────────────────

describe("checkNetworkConfig — RPC hostname", () => {
  it("reports drift when testnet config points at mainnet RPC", () => {
    const result = checkNetworkConfig({
      ...TESTNET_OK,
      NEXT_PUBLIC_RPC_URL: "https://soroban-mainnet.stellar.org",
    });
    expect(result.valid).toBe(false);
    expect(result.drifts.some((d) => d.includes("soroban-mainnet.stellar.org"))).toBe(true);
  });

  it("reports drift when mainnet config points at testnet RPC", () => {
    const result = checkNetworkConfig({
      ...MAINNET_OK,
      NEXT_PUBLIC_RPC_URL: "https://soroban-testnet.stellar.org",
    });
    expect(result.valid).toBe(false);
    expect(result.drifts.some((d) => d.includes("soroban-testnet.stellar.org"))).toBe(true);
  });
});

// ── Passphrase drift / cross-environment contamination ───────────────────────

describe("checkNetworkConfig — passphrase", () => {
  it("reports drift when passphrase does not match the declared network", () => {
    const result = checkNetworkConfig({
      ...TESTNET_OK,
      NEXT_PUBLIC_NETWORK_PASSPHRASE: "Wrong passphrase",
    });
    expect(result.valid).toBe(false);
    expect(result.drifts.some((d) => d.includes("NEXT_PUBLIC_NETWORK_PASSPHRASE"))).toBe(true);
  });

  it("reports cross-environment contamination when testnet env has mainnet passphrase", () => {
    const result = checkNetworkConfig({
      ...TESTNET_OK,
      NEXT_PUBLIC_NETWORK_PASSPHRASE: NETWORK_MATRIX.mainnet.passphrase,
    });
    expect(result.valid).toBe(false);
    expect(result.drifts.some((d) => d.includes("contamination"))).toBe(true);
  });
});

// ── assertNetworkConfig ───────────────────────────────────────────────────────

describe("assertNetworkConfig", () => {
  it("does not throw for a valid config", () => {
    expect(() => assertNetworkConfig(TESTNET_OK)).not.toThrow();
  });

  it("throws with drift details for an invalid config", () => {
    expect(() => assertNetworkConfig({})).toThrow(/drift detected/);
  });

  it("thrown error lists the specific drift", () => {
    try {
      assertNetworkConfig({ NEXT_PUBLIC_STELLAR_NETWORK: "testnet" });
    } catch (e) {
      expect(String(e)).toMatch(/NEXT_PUBLIC_CONTRACT_ID/);
    }
  });
});
