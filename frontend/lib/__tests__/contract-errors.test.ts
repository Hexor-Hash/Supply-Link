import { describe, it, expect } from "vitest";
import {
  ContractErrorCode,
  extractContractErrorCode,
  mapContractError,
} from "@/lib/stellar/contract-errors";

describe("extractContractErrorCode", () => {
  it("extracts code from { code: number } shape", () => {
    expect(extractContractErrorCode({ code: 1 })).toBe(ContractErrorCode.ProductNotFound);
  });

  it("extracts code from { result: { code: number } } shape", () => {
    expect(extractContractErrorCode({ result: { code: 2 } })).toBe(ContractErrorCode.NotAuthorized);
  });

  it("returns null for unknown code", () => {
    expect(extractContractErrorCode({ code: 999 })).toBeNull();
  });

  it("returns null for non-object", () => {
    expect(extractContractErrorCode("error string")).toBeNull();
    expect(extractContractErrorCode(null)).toBeNull();
  });
});

describe("mapContractError", () => {
  it("maps ProductNotFound (1) correctly", () => {
    const mapped = mapContractError({ code: 1 });
    expect(mapped?.key).toBe("PRODUCT_NOT_FOUND");
    expect(mapped?.httpStatus).toBe(404);
  });

  it("maps NotAuthorized (2) correctly", () => {
    const mapped = mapContractError({ code: 2 });
    expect(mapped?.key).toBe("NOT_AUTHORIZED");
    expect(mapped?.httpStatus).toBe(403);
  });

  it("maps ApproverNotAuthorized (3) correctly", () => {
    const mapped = mapContractError({ code: 3 });
    expect(mapped?.key).toBe("APPROVER_NOT_AUTHORIZED");
    expect(mapped?.httpStatus).toBe(403);
  });

  it("maps OwnerOnly (4) correctly", () => {
    const mapped = mapContractError({ code: 4 });
    expect(mapped?.key).toBe("OWNER_ONLY");
    expect(mapped?.httpStatus).toBe(403);
  });

  it("maps NoPendingEvents (5) correctly", () => {
    const mapped = mapContractError({ code: 5 });
    expect(mapped?.key).toBe("NO_PENDING_EVENTS");
    expect(mapped?.httpStatus).toBe(404);
  });

  it("maps EventIndexOutOfBounds (6) correctly", () => {
    const mapped = mapContractError({ code: 6 });
    expect(mapped?.key).toBe("EVENT_INDEX_OUT_OF_BOUNDS");
    expect(mapped?.httpStatus).toBe(400);
  });

  it("returns null for unrecognised error", () => {
    expect(mapContractError({ code: 42 })).toBeNull();
    expect(mapContractError("not an error object")).toBeNull();
  });

  it("every mapped error has a non-empty message", () => {
    for (let code = 1; code <= 6; code++) {
      const mapped = mapContractError({ code });
      expect(mapped?.message.length).toBeGreaterThan(0);
    }
  });
});
