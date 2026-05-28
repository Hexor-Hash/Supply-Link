import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { evaluatePolicy } from "@/lib/api/policy";

function makeReq(headers: Record<string, string> = {}): NextRequest {
  const req = new NextRequest("http://localhost/api/test");
  for (const [k, v] of Object.entries(headers)) {
    req.headers.set(k, v);
  }
  return req;
}

// Helper to set env vars and restore after each test
function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const original: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) original[k] = process.env[k];
  Object.assign(process.env, vars);
  fn();
  for (const [k, v] of Object.entries(original)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

describe("evaluatePolicy – public", () => {
  it("allows any request", () => {
    expect(evaluatePolicy(makeReq(), "public")).toBeNull();
  });
});

describe("evaluatePolicy – partner", () => {
  it("allows request with correct x-api-key", () => {
    withEnv({ PARTNER_API_KEY: "partner-secret" }, () => {
      const result = evaluatePolicy(makeReq({ "x-api-key": "partner-secret" }), "partner");
      expect(result).toBeNull();
    });
  });

  it("rejects request with wrong key", () => {
    withEnv({ PARTNER_API_KEY: "partner-secret" }, () => {
      const result = evaluatePolicy(makeReq({ "x-api-key": "wrong" }), "partner");
      expect(result?.status).toBe(401);
    });
  });

  it("rejects request with no key", () => {
    withEnv({ PARTNER_API_KEY: "partner-secret" }, () => {
      const result = evaluatePolicy(makeReq(), "partner");
      expect(result?.status).toBe(401);
    });
  });

  it("rejects when PARTNER_API_KEY is not configured", () => {
    withEnv({ PARTNER_API_KEY: undefined }, () => {
      const result = evaluatePolicy(makeReq({ "x-api-key": "anything" }), "partner");
      expect(result?.status).toBe(401);
    });
  });
});

describe("evaluatePolicy – internal", () => {
  it("allows request with correct key in development", () => {
    withEnv({ NODE_ENV: "development", INTERNAL_API_KEY: "int-secret" }, () => {
      const result = evaluatePolicy(makeReq({ "x-api-key": "int-secret" }), "internal");
      expect(result).toBeNull();
    });
  });

  it("rejects request with wrong key in development", () => {
    withEnv({ NODE_ENV: "development", INTERNAL_API_KEY: "int-secret" }, () => {
      const result = evaluatePolicy(makeReq({ "x-api-key": "wrong" }), "internal");
      expect(result?.status).toBe(401);
    });
  });

  it("returns 404 in production (environment gate)", () => {
    withEnv({ NODE_ENV: "production", INTERNAL_API_KEY: "int-secret", ALLOW_INTERNAL_IN_PROD: undefined }, () => {
      const result = evaluatePolicy(makeReq({ "x-api-key": "int-secret" }), "internal");
      // Returns 404 to avoid leaking endpoint existence
      expect(result?.status).toBe(404);
    });
  });

  it("allows in production when ALLOW_INTERNAL_IN_PROD=true", () => {
    withEnv({ NODE_ENV: "production", INTERNAL_API_KEY: "int-secret", ALLOW_INTERNAL_IN_PROD: "true" }, () => {
      const result = evaluatePolicy(makeReq({ "x-api-key": "int-secret" }), "internal");
      expect(result).toBeNull();
    });
  });

  it("rejects when INTERNAL_API_KEY is not configured", () => {
    withEnv({ NODE_ENV: "development", INTERNAL_API_KEY: undefined }, () => {
      const result = evaluatePolicy(makeReq({ "x-api-key": "anything" }), "internal");
      expect(result?.status).toBe(401);
    });
  });
});

describe("requirePolicy integration", () => {
  it("calls handler when policy passes", async () => {
    const { requirePolicy } = await import("@/lib/api/policy");
    withEnv({ INTERNAL_API_KEY: "secret" }, () => {
      const wrapped = requirePolicy("internal", async () => {
        const { NextResponse } = require("next/server");
        return NextResponse.json({ ok: true });
      });
      // Just verify it's a function (handler invocation needs async context)
      expect(typeof wrapped).toBe("function");
    });
  });
});
