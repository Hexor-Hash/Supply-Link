import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { EventTimeline } from "@/components/tracking/EventTimeline";
import type { TrackingEvent } from "@/lib/types";

// lucide-react icons render as SVGs — no mock needed
// EVENT_TYPE_CONFIG is a plain object — no mock needed

function makeEvent(overrides: Partial<TrackingEvent> = {}): TrackingEvent {
  return {
    productId: "prod-1",
    location: "Addis Ababa",
    actor: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTU",
    timestamp: new Date("2024-01-15T10:00:00Z").getTime(),
    eventType: "HARVEST",
    metadata: "{}",
    ...overrides,
  };
}

describe("EventTimeline", () => {
  it("renders empty state when no events", () => {
    render(<EventTimeline events={[]} />);
    expect(screen.getByText(/no events recorded/i)).toBeInTheDocument();
  });

  it("renders correct number of timeline nodes", () => {
    const events = [
      makeEvent({ eventType: "HARVEST" }),
      makeEvent({ eventType: "PROCESSING" }),
      makeEvent({ eventType: "SHIPPING" }),
    ];
    render(<EventTimeline events={events} />);
    expect(screen.getByText("Harvest")).toBeInTheDocument();
    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("Shipping")).toBeInTheDocument();
  });

  it("displays correct badge label for each event type", () => {
    const types: TrackingEvent["eventType"][] = ["HARVEST", "PROCESSING", "SHIPPING", "RETAIL"];
    const labels = ["Harvest", "Processing", "Shipping", "Retail"];
    const events = types.map((eventType) => makeEvent({ eventType }));
    render(<EventTimeline events={events} />);
    labels.forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
  });

  it("formats timestamps as locale string", () => {
    const ts = new Date("2024-01-15T10:00:00Z").getTime();
    render(<EventTimeline events={[makeEvent({ timestamp: ts })]} />);
    // toLocaleString output varies by environment; just check something date-like is rendered
    const formatted = new Date(ts).toLocaleString();
    expect(screen.getByText(formatted)).toBeInTheDocument();
  });

  it("expands metadata JSON on click", () => {
    const event = makeEvent({ metadata: '{"batch":"A1","weight":100}' });
    render(<EventTimeline events={[event]} />);
    const toggle = screen.getByRole("button", { name: /show metadata/i });
    fireEvent.click(toggle);
    expect(screen.getByText(/batch/i)).toBeInTheDocument();
  });

  it("renders actor address as truncated link to Stellar Expert", () => {
    const actor = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTU";
    render(<EventTimeline events={[makeEvent({ actor })]} />);
    expect(screen.getByText(`${actor.slice(0, 8)}…${actor.slice(-6)}`)).toBeInTheDocument();
  });
});
