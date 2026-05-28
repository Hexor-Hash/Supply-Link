import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { AuditEmitter, redact } from "../audit";

describe("Audit Redaction", () => {
  it("should redact sensitive keys", () => {
    const input = {
      id: "123",
      secret: "super-secret",
      apiKey: "sensitive-key",
      user: {
        name: "John",
        password: "password123",
      },
      tags: ["public", "secret-tag"],
    };

    const output = redact(input);

    expect(output.id).toBe("123");
    expect(output.secret).toBe("[REDACTED]");
    expect(output.apiKey).toBe("[REDACTED]");
    expect(output.user.name).toBe("John");
    expect(output.user.password).toBe("[REDACTED]");
    // Note: tags is an array, we don't redact array elements unless they are objects
    expect(output.tags[0]).toBe("public");
    expect(output.tags[1]).toBe("secret-tag");
  });

  it("should handle nested arrays and objects", () => {
    const input = {
      items: [
        { id: 1, token: "t1" },
        { id: 2, token: "t2" },
      ],
    };

    const output = redact(input);

    expect(output.items[0].token).toBe("[REDACTED]");
    expect(output.items[1].token).toBe("[REDACTED]");
  });
});

describe("AuditEmitter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("should emit a structured audit log", () => {
    const req = new NextRequest("http://localhost/api/v1/test", {
      method: "POST",
      headers: {
        "x-correlation-id": "test-corr-id",
        "x-forwarded-for": "1.2.3.4",
        "user-agent": "test-agent",
        "x-api-key": "partner-key",
      },
    });

    // Mock env vars
    process.env.PARTNER_API_KEY = "partner-key";

    AuditEmitter.emit(req, "test.operation", 200, { data: "input" }, { result: "ok" });

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[AUDIT]"));
    
    const logCall = (console.log as any).mock.calls[0][0];
    const event = JSON.parse(logCall.replace("[AUDIT] ", ""));

    expect(event.operation).toBe("test.operation");
    expect(event.correlationId).toBe("test-corr-id");
    expect(event.actor.ip).toBe("1.2.3.4");
    expect(event.actor.type).toBe("partner");
    expect(event.request.body.data).toBe("input");
    expect(event.response.body.result).toBe("ok");
    expect(event.result).toBe("success");
  });

  it("should redact sensitive fields in emitted logs", () => {
    const req = new NextRequest("http://localhost/api/v1/test", {
      method: "POST",
    });

    AuditEmitter.emit(req, "test.redaction", 200, { secret: "hide-me" });

    const logCall = (console.log as any).mock.calls[0][0];
    const event = JSON.parse(logCall.replace("[AUDIT] ", ""));

    expect(event.request.body.secret).toBe("[REDACTED]");
  });
});
