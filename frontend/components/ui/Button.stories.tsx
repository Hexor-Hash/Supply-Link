import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "destructive", "ghost"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { children: "Connect Wallet", variant: "primary", size: "md" },
};

export const Secondary: Story = {
  args: { children: "Cancel", variant: "secondary", size: "md" },
};

export const Destructive: Story = {
  args: { children: "Revoke Access", variant: "destructive", size: "md" },
};

export const Ghost: Story = {
  args: { children: "Learn More", variant: "ghost", size: "md" },
};

export const Small: Story = {
  args: { children: "Small", variant: "primary", size: "sm" },
};

export const Large: Story = {
  args: { children: "Register Product", variant: "primary", size: "lg" },
};

export const Disabled: Story = {
  args: { children: "Connecting…", variant: "primary", disabled: true },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 p-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="primary" disabled>Disabled</Button>
    </div>
  ),
};
