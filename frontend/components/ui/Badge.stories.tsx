import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./Badge";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["harvest", "processing", "shipping", "retail", "default"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Harvest: Story = {
  args: { children: "HARVEST", variant: "harvest" },
};

export const Processing: Story = {
  args: { children: "PROCESSING", variant: "processing" },
};

export const Shipping: Story = {
  args: { children: "SHIPPING", variant: "shipping" },
};

export const Retail: Story = {
  args: { children: "RETAIL", variant: "retail" },
};

export const Default: Story = {
  args: { children: "UNKNOWN", variant: "default" },
};

export const AllEventTypes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-4">
      <Badge variant="harvest">HARVEST</Badge>
      <Badge variant="processing">PROCESSING</Badge>
      <Badge variant="shipping">SHIPPING</Badge>
      <Badge variant="retail">RETAIL</Badge>
      <Badge variant="default">UNKNOWN</Badge>
    </div>
  ),
};
