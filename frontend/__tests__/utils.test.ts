import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// ── Explorer URL tests ────────────────────────────────────────────────────────

describe("explorer URLs", () => {
  const HASH = "abc123";
  const ADDR = "GABC123";
  const CONTRACT = "CTEST000";

  beforeEach(() => {
    vi.resetModules();
  });

  it("generates testnet txUrl", async () => {
    vi.doMock("@/lib/stellar/client", () => ({
      NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
    }));
    const { txUrl } = await import("@/lib/stellar/explorer");
    expect(txUrl(HASH)).toBe(`https://stellar.expert/explorer/testnet/tx/${HASH}`);
  });

  it("generates mainnet txUrl", async () => {
    vi.doMock("@/lib/stellar/client", () => ({
      NETWORK_PASSPHRASE: "Public Global Stellar Network ; September 2015",
    }));
    const { txUrl } = await import("@/lib/stellar/explorer");
    expect(txUrl(HASH)).toBe(`https://stellar.expert/explorer/mainnet/tx/${HASH}`);
  });

  it("generates testnet accountUrl", async () => {
    vi.doMock("@/lib/stellar/client", () => ({
      NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
    }));
    const { accountUrl } = await import("@/lib/stellar/explorer");
    expect(accountUrl(ADDR)).toBe(`https://stellar.expert/explorer/testnet/account/${ADDR}`);
  });

  it("generates mainnet accountUrl", async () => {
    vi.doMock("@/lib/stellar/client", () => ({
      NETWORK_PASSPHRASE: "Public Global Stellar Network ; September 2015",
    }));
    const { accountUrl } = await import("@/lib/stellar/explorer");
    expect(accountUrl(ADDR)).toBe(`https://stellar.expert/explorer/mainnet/account/${ADDR}`);
  });

  it("generates testnet contractUrl", async () => {
    vi.doMock("@/lib/stellar/client", () => ({
      NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
    }));
    const { contractUrl } = await import("@/lib/stellar/explorer");
    expect(contractUrl(CONTRACT)).toBe(`https://stellar.expert/explorer/testnet/contract/${CONTRACT}`);
  });

  it("generates mainnet contractUrl", async () => {
    vi.doMock("@/lib/stellar/client", () => ({
      NETWORK_PASSPHRASE: "Public Global Stellar Network ; September 2015",
    }));
    const { contractUrl } = await import("@/lib/stellar/explorer");
    expect(contractUrl(CONTRACT)).toBe(`https://stellar.expert/explorer/mainnet/contract/${CONTRACT}`);
  });
});

// ── Export utilities ──────────────────────────────────────────────────────────

import { exportToCSV, exportToJSON } from "@/lib/utils/export";
import type { TrackingEvent } from "@/lib/types";

const EVENT: TrackingEvent = {
  productId: "prod-1",
  location: "Ethiopia",
  actor: "GABC123",
  timestamp: 1700000000000,
  eventType: "HARVEST",
  metadata: '{"batch":"A1"}',
};

describe("exportToJSON", () => {
  it("returns valid JSON array", () => {
    const result = exportToJSON([EVENT]);
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].productId).toBe("prod-1");
  });

  it("returns empty array for no events", () => {
    expect(JSON.parse(exportToJSON([]))).toEqual([]);
  });
});

describe("exportToCSV", () => {
  it("returns empty string for no events", () => {
    expect(exportToCSV([])).toBe("");
  });

  it("includes header row", () => {
    const csv = exportToCSV([EVENT]);
    expect(csv.split("\n")[0]).toBe("productId,location,actor,timestamp,eventType,metadata");
  });

  it("includes data row with correct values", () => {
    const csv = exportToCSV([EVENT]);
    const dataRow = csv.split("\n")[1];
    expect(dataRow).toContain("prod-1");
    expect(dataRow).toContain("Ethiopia");
    expect(dataRow).toContain("HARVEST");
  });
});

// ── Zod form schema (RegisterProductForm) ────────────────────────────────────

const registerSchema = z.object({
  id: z.string().min(1, "Product ID is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  origin: z.string().min(2, "Origin is required"),
  description: z.string().optional(),
});

describe("registerSchema", () => {
  it("accepts valid input", () => {
    expect(registerSchema.safeParse({ id: "prod-1", name: "Coffee", origin: "Ethiopia" }).success).toBe(true);
  });

  it("rejects empty id", () => {
    const r = registerSchema.safeParse({ id: "", name: "Coffee", origin: "Ethiopia" });
    expect(r.success).toBe(false);
  });

  it("rejects name shorter than 2 chars", () => {
    const r = registerSchema.safeParse({ id: "prod-1", name: "A", origin: "Ethiopia" });
    expect(r.success).toBe(false);
  });

  it("rejects origin shorter than 2 chars", () => {
    const r = registerSchema.safeParse({ id: "prod-1", name: "Coffee", origin: "E" });
    expect(r.success).toBe(false);
  });

  it("allows optional description to be omitted", () => {
    expect(registerSchema.safeParse({ id: "prod-1", name: "Coffee", origin: "Ethiopia" }).success).toBe(true);
  });

  it("allows optional description when provided", () => {
    expect(
      registerSchema.safeParse({ id: "prod-1", name: "Coffee", origin: "Ethiopia", description: "Organic" }).success
    ).toBe(true);
  });
});

// ── Metadata validator ────────────────────────────────────────────────────────

import { validateMetadata } from "@/lib/utils/metadata";

describe("validateMetadata", () => {
  it("accepts valid JSON object", () => {
    expect(validateMetadata('{"batch":"A1"}')).toMatchObject({ valid: true });
  });

  it("rejects invalid JSON", () => {
    expect(validateMetadata("not-json")).toMatchObject({ valid: false, error: "Invalid JSON" });
  });

  it("rejects JSON array (not an object)", () => {
    expect(validateMetadata("[1,2,3]")).toMatchObject({ valid: false });
  });

  it("accepts empty object", () => {
    expect(validateMetadata("{}")).toMatchObject({ valid: true });
  });

  it("returns parsed data on success", () => {
    const result = validateMetadata('{"key":"value"}');
    expect(result.data).toEqual({ key: "value" });
  });
});
