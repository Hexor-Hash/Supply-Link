import { isConnected, signTransaction, getAddress } from "@stellar/freighter-api";

export type StellarNetwork = "testnet" | "mainnet";

interface NetworkConfig {
  passphrase: string;
  rpcUrl: string;
  name: string;
}

const NETWORKS: Record<StellarNetwork, NetworkConfig> = {
  testnet: {
    passphrase: "Test SDF Network ; September 2015",
    rpcUrl: "https://soroban-testnet.stellar.org",
    name: "Testnet",
  },
  mainnet: {
    passphrase: "Public Global Stellar Network ; September 2015",
    rpcUrl: "https://soroban-mainnet.stellar.org",
    name: "Mainnet",
  },
};

const CURRENT_NETWORK: StellarNetwork =
  (process.env.NEXT_PUBLIC_STELLAR_NETWORK as StellarNetwork) || "testnet";

const NETWORK_CONFIG = NETWORKS[CURRENT_NETWORK];

export function getNetwork(): StellarNetwork {
  return CURRENT_NETWORK;
}

export function getNetworkName(): string {
  return NETWORK_CONFIG.name;
}

export class FreighterNotInstalledError extends Error {
  constructor() {
    super("Freighter wallet extension is not installed");
    this.name = "FreighterNotInstalledError";
  }
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    const result = await isConnected();
    if (!result.isConnected) return null;
    const addressResult = await getAddress();
    return addressResult.address;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Freighter") ||
        error.message.includes("not installed") ||
        error.message.includes("extension"))
    ) {
      throw new FreighterNotInstalledError();
    }
    throw error;
  }
}

export async function safeSignTransaction(
  transaction: string
): Promise<string> {
  try {
    const result = await signTransaction(transaction);
    return result.signedTxXdr;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Freighter") ||
        error.message.includes("not installed"))
    ) {
      throw new FreighterNotInstalledError();
    }
    throw error;
  }
}

export { signTransaction };

export const CONTRACT_ID =
  process.env.NEXT_PUBLIC_CONTRACT_ID ?? 'CBUWSKT2UGOAXK4ZREVDJV5XHSYB42PZ3CERU2ZFUTUMAZLJEHNZIECA';

export const NETWORK_PASSPHRASE = NETWORK_CONFIG.passphrase;

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? NETWORK_CONFIG.rpcUrl;

/**
 * Stub: call register_product on the Soroban contract.
 * Returns a simulated transaction hash.
 */
export async function registerProduct(
  productId: string,
  name: string,
  origin: string,
  description: string,
  callerAddress: string
): Promise<string> {
  console.log("registerProduct", { productId, name, origin, description, callerAddress });
  // TODO: build + sign + submit Soroban transaction
  await new Promise((r) => setTimeout(r, 1200));
  return `mock_tx_${Date.now()}`;
}

/**
 * Stub: call list_products on the Soroban contract (paginated).
 */
export async function listProducts(
  page = 0,
  pageSize = 20
): Promise<{ products: import("../types").Product[]; total: number }> {
  console.log("listProducts", { page, pageSize });
  await new Promise((r) => setTimeout(r, 800));
  return { products: [], total: 0 };
}

/**
 * Stub: call transfer_ownership on the Soroban contract.
 * Replace body with real StellarSdk contract invocation.
 */
export async function transferOwnership(
  productId: string,
  newOwner: string,
  callerAddress: string
): Promise<void> {
  console.log("transferOwnership", { productId, newOwner, callerAddress });
  // TODO: build + sign + submit Soroban transaction
  await new Promise((r) => setTimeout(r, 1000)); // simulate network delay
}

/**
 * Stub: call add_authorized_actor on the Soroban contract.
 * Replace body with real StellarSdk contract invocation.
 */
export async function addAuthorizedActor(
  productId: string,
  actor: string,
  callerAddress: string,
): Promise<void> {
  console.log('addAuthorizedActor', { productId, actor, callerAddress });
  // TODO: build + sign + submit Soroban transaction
  await new Promise((r) => setTimeout(r, 1000)); // simulate network delay
}

/**
 * Stub: call remove_authorized_actor on the Soroban contract.
 * Replace body with real StellarSdk contract invocation.
 */
export async function removeAuthorizedActor(
  productId: string,
  actor: string,
  callerAddress: string,
): Promise<void> {
  console.log('removeAuthorizedActor', { productId, actor, callerAddress });
  // TODO: build + sign + submit Soroban transaction
  await new Promise((r) => setTimeout(r, 1000)); // simulate network delay
}
