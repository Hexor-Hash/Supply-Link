import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// ── Freighter mock ────────────────────────────────────────────────────────────

const mockGetWalletAddress = vi.fn();
const mockGetWalletNetwork = vi.fn();
const mockGetXlmBalance = vi.fn();
const mockValidateWalletConnection = vi.fn();
const mockSetWalletAddress = vi.fn();
const mockSetXlmBalance = vi.fn();
const mockSetNetworkMismatch = vi.fn();
const mockDisconnect = vi.fn();

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn().mockResolvedValue(true),
  getAddress: vi.fn().mockResolvedValue({ address: null }),
  getNetworkDetails: vi.fn().mockResolvedValue({ networkPassphrase: "Test SDF Network ; September 2015" }),
}));

vi.mock("@/lib/stellar/client", () => ({
  getWalletAddress: mockGetWalletAddress,
  FreighterNotInstalledError: class FreighterNotInstalledError extends Error {
    constructor() {
      super("Freighter wallet extension is not installed");
      this.name = "FreighterNotInstalledError";
    }
  },
  NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
  CONTRACT_ID: "CTEST000",
  RPC_URL: "https://soroban-testnet.stellar.org",
}));

vi.mock("@/lib/stellar/network", () => ({
  getWalletNetwork: mockGetWalletNetwork,
  isNetworkMatching: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/stellar/balance", () => ({
  getXlmBalance: mockGetXlmBalance,
  formatBalance: (b: string) => `${b} XLM`,
}));

vi.mock("@/lib/stellar/explorer", () => ({
  accountUrl: (addr: string) => `https://stellar.expert/explorer/testnet/account/${addr}`,
}));

let storeState = {
  walletAddress: null as string | null,
  xlmBalance: null as string | null,
  networkMismatch: false,
  setWalletAddress: mockSetWalletAddress,
  setXlmBalance: mockSetXlmBalance,
  setNetworkMismatch: mockSetNetworkMismatch,
  validateWalletConnection: mockValidateWalletConnection,
  disconnect: mockDisconnect,
};

vi.mock("@/lib/state/store", () => ({
  useStore: (selector?: (s: typeof storeState) => unknown) =>
    selector ? selector(storeState) : storeState,
}));

import { WalletConnect } from "@/components/wallet/WalletConnect";

beforeEach(() => {
  vi.clearAllMocks();
  mockValidateWalletConnection.mockResolvedValue(undefined);
  mockGetWalletNetwork.mockResolvedValue({ passphrase: "Test SDF Network ; September 2015" });
  storeState = {
    walletAddress: null,
    xlmBalance: null,
    networkMismatch: false,
    setWalletAddress: mockSetWalletAddress,
    setXlmBalance: mockSetXlmBalance,
    setNetworkMismatch: mockSetNetworkMismatch,
    validateWalletConnection: mockValidateWalletConnection,
    disconnect: mockDisconnect,
  };
});

describe("WalletConnect", () => {
  it("renders Connect Freighter button when not connected", () => {
    render(<WalletConnect />);
    expect(screen.getByRole("button", { name: /connect freighter/i })).toBeInTheDocument();
  });

  it("shows loading state while connecting", async () => {
    mockGetWalletAddress.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve("GABC123"), 200))
    );
    render(<WalletConnect />);
    fireEvent.click(screen.getByRole("button", { name: /connect freighter/i }));
    expect(await screen.findByText(/connecting/i)).toBeInTheDocument();
  });

  it("displays truncated address when connected", () => {
    storeState.walletAddress = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTU";
    render(<WalletConnect />);
    const addr = storeState.walletAddress;
    expect(screen.getByText(`${addr.slice(0, 6)}…${addr.slice(-4)}`)).toBeInTheDocument();
  });

  it("handles connection error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetWalletAddress.mockRejectedValue(new Error("Connection refused"));
    render(<WalletConnect />);
    fireEvent.click(screen.getByRole("button", { name: /connect freighter/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /connect freighter/i })).not.toBeDisabled();
    });
    consoleSpy.mockRestore();
  });

  it("shows FreighterNotInstalled modal when Freighter is not installed", async () => {
    const { FreighterNotInstalledError } = await import("@/lib/stellar/client");
    mockGetWalletAddress.mockRejectedValue(new FreighterNotInstalledError());
    render(<WalletConnect />);
    fireEvent.click(screen.getByRole("button", { name: /connect freighter/i }));
    await waitFor(() => {
      expect(screen.getByText(/freighter not installed/i)).toBeInTheDocument();
    });
  });
});
