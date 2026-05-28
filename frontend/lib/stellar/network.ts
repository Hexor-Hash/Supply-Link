import { getNetworkDetails } from "@stellar/freighter-api";
import { NETWORK_PASSPHRASE } from "./client";

export interface NetworkInfo {
  passphrase: string;
  network: "testnet" | "mainnet" | "unknown";
}

/**
 * Get the current network from Freighter wallet
 */
export async function getWalletNetwork(): Promise<NetworkInfo | null> {
  try {
    const details = await getNetworkDetails();
    if (!details) return null;

    const passphrase = details.networkPassphrase;
    let network: "testnet" | "mainnet" | "unknown" = "unknown";

    if (passphrase.includes("Test SDF")) {
      network = "testnet";
    } else if (passphrase.includes("Public Global")) {
      network = "mainnet";
    }

    return { passphrase, network };
  } catch (error) {
    console.error("Failed to get wallet network:", error);
    return null;
  }
}

/**
 * Check if wallet network matches app network
 */
export function isNetworkMatching(walletPassphrase: string): boolean {
  return walletPassphrase === NETWORK_PASSPHRASE;
}

/**
 * Get human-readable network name
 */
export function getNetworkName(passphrase: string): string {
  if (passphrase.includes("Test SDF")) {
    return "Stellar Testnet";
  }
  if (passphrase.includes("Public Global")) {
    return "Stellar Mainnet";
  }
  return "Unknown Network";
}
