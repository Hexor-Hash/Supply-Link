import { NextRequest } from "next/server";
import { getCorrelationId } from "./correlation";

/**
 * Audit event schema for privileged operations.
 */
export interface AuditEvent {
  timestamp: string;
  correlationId: string;
  actor: {
    type: "partner" | "internal" | "unknown";
    ip: string;
    userAgent?: string;
  };
  operation: string;
  request: {
    method: string;
    path: string;
    query?: Record<string, string>;
    body?: any;
  };
  response: {
    status: number;
    body?: any;
  };
  result: "success" | "failure";
  metadata?: Record<string, any>;
}

/**
 * Fields that should always be redacted in audit logs.
 */
const REDACTION_KEYS = [
  "secret",
  "key",
  "password",
  "token",
  "auth",
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "seed",
  "mnemonic",
  "private",
];

/**
 * Redact sensitive fields from an object or array recursively.
 */
export function redact(data: any): any {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map(redact);
  }

  if (typeof data === "object") {
    const redacted: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (REDACTION_KEYS.some((rk) => lowerKey.includes(rk))) {
        redacted[key] = "[REDACTED]";
      } else if (typeof value === "object") {
        redacted[key] = redact(value);
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }

  return data;
}

/**
 * Centralized audit emitter for Supply-Link.
 * Emits structured JSON logs to stdout for ingestion by log aggregators.
 */
export class AuditEmitter {
  /**
   * Emit an audit event.
   */
  static emit(
    req: NextRequest,
    operation: string,
    responseStatus: number,
    requestBody?: any,
    responseBody?: any,
    metadata?: Record<string, any>
  ): void {
    const correlationId = getCorrelationId(req);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const userAgent = req.headers.get("user-agent") || undefined;

    // Determine actor type based on x-api-key (simplified check)
    // In a real scenario, this would be tied more closely to the policy layer.
    let actorType: AuditEvent["actor"]["type"] = "unknown";
    const apiKey = req.headers.get("x-api-key");
    if (apiKey === process.env.INTERNAL_API_KEY) {
      actorType = "internal";
    } else if (apiKey === process.env.PARTNER_API_KEY) {
      actorType = "partner";
    }

    const event: AuditEvent = {
      timestamp: new Date().toISOString(),
      correlationId,
      actor: {
        type: actorType,
        ip,
        userAgent,
      },
      operation,
      request: {
        method: req.method,
        path: req.nextUrl.pathname,
        query: Object.fromEntries(req.nextUrl.searchParams),
        body: requestBody ? redact(requestBody) : undefined,
      },
      response: {
        status: responseStatus,
        body: responseBody ? redact(responseBody) : undefined,
      },
      result: responseStatus >= 200 && responseStatus < 300 ? "success" : "failure",
      metadata,
    };

    // Emit as structured JSON
    console.log(`[AUDIT] ${JSON.stringify(event)}`);
  }
}
