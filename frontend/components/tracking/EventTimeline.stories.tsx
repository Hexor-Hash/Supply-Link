import type { Meta, StoryObj } from "@storybook/react";
import { EventTimeline } from "./EventTimeline";
import type { TrackingEvent } from "@/lib/types";

const meta: Meta<typeof EventTimeline> = {
  title: "Tracking/EventTimeline",
  component: EventTimeline,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof EventTimeline>;

const ACTOR = "GBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PRODUCT_ID = "prod-a1b2c3d4";

const fullJourney: TrackingEvent[] = [
  {
    productId: PRODUCT_ID,
    location: "Yirgacheffe, Ethiopia",
    actor: ACTOR,
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 10,
    eventType: "HARVEST",
    metadata: JSON.stringify({ altitude: "1900m", variety: "Heirloom", certifiedOrganic: true }),
  },
  {
    productId: PRODUCT_ID,
    location: "Addis Ababa Processing Plant",
    actor: ACTOR,
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 7,
    eventType: "PROCESSING",
    metadata: JSON.stringify({ method: "Washed", moisture: "11%", grade: "Grade 1" }),
  },
  {
    productId: PRODUCT_ID,
    location: "Port of Djibouti",
    actor: ACTOR,
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 4,
    eventType: "SHIPPING",
    metadata: JSON.stringify({ vessel: "MSC Beatrice", container: "MSCU1234567", destination: "Rotterdam" }),
  },
  {
    productId: PRODUCT_ID,
    location: "Blue Bottle Coffee, Seattle WA",
    actor: ACTOR,
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 1,
    eventType: "RETAIL",
    metadata: JSON.stringify({ sku: "BB-ETH-001", price: "$24.99", batchSize: "200 bags" }),
  },
];

export const FullJourney: Story = {
  args: { events: fullJourney },
};

export const SingleEvent: Story = {
  args: { events: [fullJourney[0]] },
};

export const HarvestOnly: Story = {
  args: {
    events: [fullJourney[0]],
  },
};

export const NoMetadata: Story = {
  args: {
    events: fullJourney.map((e) => ({ ...e, metadata: "{}" })),
  },
};

export const Empty: Story = {
  args: { events: [] },
};

export const ManyEvents: Story = {
  args: {
    events: Array.from({ length: 12 }, (_, i) => ({
      productId: PRODUCT_ID,
      location: `Checkpoint ${i + 1}`,
      actor: ACTOR,
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * (12 - i),
      eventType: (["HARVEST", "PROCESSING", "SHIPPING", "RETAIL"] as const)[i % 4],
      metadata: "{}",
    })),
  },
};
