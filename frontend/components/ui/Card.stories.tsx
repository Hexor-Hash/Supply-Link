import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardHeader, CardContent, CardFooter } from "./Card";
import { Button } from "./Button";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardContent>A simple card with content.</CardContent>
    </Card>
  ),
};

export const WithHeader: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <h3 className="font-semibold text-base">Arabica Coffee Beans</h3>
        <p className="text-sm text-gray-500">Origin: Yirgacheffe, Ethiopia</p>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Registered on-chain with ID: <code>prod-a1b2c3d4</code></p>
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <h3 className="font-semibold text-base">Transfer Ownership</h3>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Transfer this product to a new owner on-chain.</p>
      </CardContent>
      <CardFooter>
        <Button variant="secondary" size="sm">Cancel</Button>
        <Button variant="primary" size="sm">Confirm Transfer</Button>
      </CardFooter>
    </Card>
  ),
};

export const ProductCard: Story = {
  render: () => (
    <Card className="max-w-xs">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold leading-tight">Organic Coffee Beans</h2>
          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium bg-green-500/10 text-green-500">
            Active
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">Origin: Ethiopia</p>
        <p className="text-xs text-gray-400 mt-1 font-mono truncate">ID: prod-a1b2c3d4</p>
      </CardHeader>
      <CardContent>
        <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">
          QR Code
        </div>
      </CardContent>
    </Card>
  ),
};
