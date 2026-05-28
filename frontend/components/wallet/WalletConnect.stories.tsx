import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/Button";

/**
 * WalletConnect integrates with Zustand store and Freighter browser extension,
 * so we render controlled display-only versions for each state.
 */
const meta: Meta = {
  title: "Wallet/WalletConnect",
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

/** Disconnected — the default state before the user connects. */
export const Disconnected: Story = {
  render: () => (
    <div className="p-4">
      <Button variant="primary" size="md">Connect Freighter</Button>
    </div>
  ),
};

/** Loading — shown while the Freighter handshake is in progress. */
export const Loading: Story = {
  render: () => (
    <div className="p-4">
      <Button variant="primary" size="md" disabled>Connecting…</Button>
    </div>
  ),
};

/** Connected — shows the truncated address, XLM balance, and disconnect button. */
export const Connected: Story = {
  render: () => (
    <div className="p-4 flex items-center gap-2">
      <button className="text-sm font-mono text-green-600 flex items-center gap-1">
        GBXYZ…A1B2
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </button>
      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
        142.50 XLM
      </span>
      <button className="p-2 rounded hover:bg-gray-100" aria-label="Disconnect wallet">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  ),
};

/** ConnectedLowBalance — balance below the recommended threshold. */
export const ConnectedLowBalance: Story = {
  render: () => (
    <div className="p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button className="text-sm font-mono text-green-600 flex items-center gap-1">
          GBXYZ…A1B2
        </button>
        <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded font-medium">
          0.50 XLM ⚠
        </span>
      </div>
      <p className="text-xs text-red-500">Low balance — transactions may fail.</p>
    </div>
  ),
};
