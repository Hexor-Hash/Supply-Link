import { describe, it, expect } from "vitest";
import {
  asProduct,
  asTrackingEvent,
  asAddress,
  type ParsedEvent,
  type EventType,
} from "../../docs/indexing/reference-parser";
import {
  SAMPLE_EVENTS,
  SAMPLE_PRODUCT,
  SAMPLE_TRACKING_EVENT,
} from "../../docs/indexing/sample-dataset";

// ── asProduct ─────────────────────────────────────────────────────────────────

describe("asProduct", () => {
  it("maps all fields correctly", () => {
    const raw = {
      id: "batch-2024-001",
      name: "Arabica Coffee Beans",
      origin: "Yirgacheffe, Ethiopia",
      owner: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
      timestamp: BigInt(1714262400),
      authorized_actors: ["GBVNN..."],
      required_signatures: 1,
    };
    const product = asProduct(raw);
    expect(product.id).toBe("batch-2024-001");
    expect(product.timestamp).toBe(1714262400);
    expect(product.required_signatures).toBe(1);
    expect(product.authorized_actors).toHaveLength(1);
  });

  it("defaults authorized_actors to [] when missing", () => {
    const product = asProduct({ id: "x", name: "n", origin: "o", owner: "addr", timestamp: 0 });
    expect(product.authorized_actors).toEqual([]);
  });

  it("defaults required_signatures to 0 when missing", () => {
    const product = asProduct({ id: "x", name: "n", origin: "o", owner: "addr", timestamp: 0 });
    expect(product.required_signatures).toBe(0);
  });

  it("coerces BigInt timestamp to number", () => {
    const product = asProduct({ id: "x", name: "n", origin: "o", owner: "a", timestamp: BigInt(9999) });
    expect(typeof product.timestamp).toBe("number");
    expect(product.timestamp).toBe(9999);
  });
});

// ── asTrackingEvent ───────────────────────────────────────────────────────────

describe("asTrackingEvent", () => {
  it("maps all fields correctly", () => {
    const raw = {
      product_id: "batch-2024-001",
      location: "Port of Rotterdam",
      actor: "GBVNN...",
      timestamp: 1714348800,
      event_type: "SHIPPING",
      metadata: '{"container":"MSCU1234567"}',
    };
    const ev = asTrackingEvent(raw);
    expect(ev.product_id).toBe("batch-2024-001");
    expect(ev.event_type).toBe("SHIPPING");
    expect(ev.metadata).toBe('{"container":"MSCU1234567"}');
  });

  it("coerces BigInt timestamp to number", () => {
    const ev = asTrackingEvent({
      product_id: "x", location: "l", actor: "a",
      timestamp: BigInt(1714348800), event_type: "HARVEST", metadata: "{}",
    });
    expect(typeof ev.timestamp).toBe("number");
  });
});

// ── asAddress ─────────────────────────────────────────────────────────────────

describe("asAddress", () => {
  it("returns the address string as-is", () => {
    const addr = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
    expect(asAddress(addr)).toBe(addr);
  });
});

// ── Sample dataset integrity ──────────────────────────────────────────────────

describe("sample dataset", () => {
  const EVENT_TYPES: EventType[] = [
    "product_registered",
    "actor_authorized",
    "event_added",
    "event_pending",
    "event_finalized",
    "event_rejected",
    "ownership_transferred",
    "product_updated",
  ];

  it("contains exactly one sample for each of the 8 event types", () => {
    const types = SAMPLE_EVENTS.map((e) => e.type);
    for (const t of EVENT_TYPES) {
      expect(types).toContain(t);
    }
    expect(SAMPLE_EVENTS).toHaveLength(8);
  });

  it("all events reference the same productId", () => {
    for (const ev of SAMPLE_EVENTS) {
      expect(ev.productId).toBe("batch-2024-001");
    }
  });

  it("events are ordered by ledger sequence (ascending)", () => {
    for (let i = 1; i < SAMPLE_EVENTS.length; i++) {
      expect(SAMPLE_EVENTS[i].ledger).toBeGreaterThan(SAMPLE_EVENTS[i - 1].ledger);
    }
  });

  it("product_registered data matches SAMPLE_PRODUCT", () => {
    const ev = SAMPLE_EVENTS.find((e) => e.type === "product_registered")!;
    expect(ev.data).toEqual(SAMPLE_PRODUCT);
  });

  it("event_added data matches SAMPLE_TRACKING_EVENT", () => {
    const ev = SAMPLE_EVENTS.find((e) => e.type === "event_added")!;
    expect(ev.data).toEqual(SAMPLE_TRACKING_EVENT);
  });

  it("event_pending and event_finalized share the same event_type", () => {
    const pending = SAMPLE_EVENTS.find((e) => e.type === "event_pending")!;
    const finalized = SAMPLE_EVENTS.find((e) => e.type === "event_finalized")!;
    expect((pending.data as any).event_type).toBe((finalized.data as any).event_type);
  });

  it("ownership_transferred data is a non-empty string (address)", () => {
    const ev = SAMPLE_EVENTS.find((e) => e.type === "ownership_transferred")!;
    expect(typeof ev.data).toBe("string");
    expect((ev.data as string).length).toBeGreaterThan(0);
  });

  it("actor_authorized data is a non-empty string (address)", () => {
    const ev = SAMPLE_EVENTS.find((e) => e.type === "actor_authorized")!;
    expect(typeof ev.data).toBe("string");
  });

  it("product_updated data has updated name and origin", () => {
    const ev = SAMPLE_EVENTS.find((e) => e.type === "product_updated")!;
    const p = ev.data as any;
    expect(p.name).not.toBe(SAMPLE_PRODUCT.name);
    expect(p.origin).not.toBe(SAMPLE_PRODUCT.origin);
    // id is immutable
    expect(p.id).toBe(SAMPLE_PRODUCT.id);
  });

  it("all events have non-empty txHash", () => {
    for (const ev of SAMPLE_EVENTS) {
      expect(ev.txHash.length).toBeGreaterThan(0);
    }
  });
});

// ── Idempotency key uniqueness ────────────────────────────────────────────────

describe("idempotency key uniqueness", () => {
  it("(ledger, txHash, eventIndex) is unique across sample dataset", () => {
    const keys = SAMPLE_EVENTS.map((e) => `${e.ledger}-${e.txHash}-${e.eventIndex}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});
