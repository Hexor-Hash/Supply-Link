import { NETWORK_PASSPHRASE } from "./client";

type Network = "testnet" | "mainnet";

/**
 * Determine network from passphrase
 */
function getNetwork(): Network {
  return NETWORK_PASSPHRASE.includes("Test SDF") ? "testnet" : "mainnet";
}

/**
 * Get base URL for Stellar Expert
 */
function getBaseUrl(): string {
  const network = getNetwork();
  return `https://stellar.expert/explorer/${network}`;
}

/**
 * Generate Stellar Expert URL for a transaction
 */
export function txUrl(transactionHash: string): string {
  return `${getBaseUrl()}/tx/${transactionHash}`;
}

/**
 * Generate Stellar Expert URL for an account
 */
export function accountUrl(address: string): string {
  return `${getBaseUrl()}/account/${address}`;
}

/**
 * Generate Stellar Expert URL for a contract
 */
export function contractUrl(contractId: string): string {
  return `${getBaseUrl()}/contract/${contractId}`;
}

/**
 * Open Stellar Expert link in new tab
 */
export function openExplorerLink(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
