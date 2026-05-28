/**
 * Access policy layer for Supply-Link API routes.
 *
 * Tiers:
 *   public   – no auth required, available in all environments
 *   partner  – requires PARTNER_API_KEY header
 *   internal – requires INTERNAL_API_KEY header; blocked in production
 *              unless ALLOW_INTERNAL_IN_PROD=true
 *
 * Deny-by-default: any route wrapped with requirePolicy() that is not
 * explicitly classified will be rejected with 403.
 */
import { NextRequest, NextResponse } from "next/server";

export type AccessTier = "public" | "partner" | "internal";

type Env = "development" | "test" | "production";

function currentEnv(): Env {
  const e = process.env.NODE_ENV;
  if (e === "production") return "production";
  if (e === "test") return "test";
  return "development";
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

function checkPartner(req: NextRequest): boolean {
  const key = process.env.PARTNER_API_KEY;
  if (!key) return false; // no key configured → deny
  return req.headers.get("x-api-key") === key;
}

function checkInternal(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY;
  if (!key) return false;
  return req.headers.get("x-api-key") === key;
}

// ── Core guard ────────────────────────────────────────────────────────────────

/**
 * Evaluate access policy for a request.
 * Returns a NextResponse error if access is denied, or null if allowed.
 */
export function evaluatePolicy(req: NextRequest, tier: AccessTier): NextResponse | null {
  const env = currentEnv();

  if (tier === "public") return null;

  if (tier === "internal") {
    // Block internal endpoints in production unless explicitly opted in
    if (env === "production" && process.env.ALLOW_INTERNAL_IN_PROD !== "true") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!checkInternal(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
  }

  if (tier === "partner") {
    if (!checkPartner(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
  }

  // Deny-by-default for unknown tiers
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * Wrap a route handler with an access policy.
 *
 * @example
 * export const GET = requirePolicy("internal", handler);
 */
export function requirePolicy(
  tier: AccessTier,
  handler: (req: NextRequest, ctx?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx?: any): Promise<NextResponse> => {
    const denied = evaluatePolicy(req, tier);
    if (denied) return denied;
    return handler(req, ctx);
  };
}
