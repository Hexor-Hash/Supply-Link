import { rpc as rpc, TransactionBuilder, Networks } from "@stellar/stellar-sdk";
import { RPC_URL, NETWORK_PASSPHRASE } from "./client";

const server = new rpc.Server(RPC_URL);

export interface SimulationResult {
  success: boolean;
  fee?: string;
  error?: string;
  errorMessage?: string;
}

/**
 * Parse Soroban simulation error response and return human-readable message
 */
export function parseSimulationError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;

    // Common Soroban error patterns
    if (message.includes("insufficient auth")) {
      return "Insufficient authorization. You may not have permission to perform this action.";
    }
    if (message.includes("contract panic")) {
      return "Contract execution failed. Please check your input parameters.";
    }
    if (message.includes("not found")) {
      return "Product not found. Please verify the product ID.";
    }
    if (message.includes("unauthorized")) {
      return "Unauthorized. You don't have permission to perform this action.";
    }
    if (message.includes("invalid")) {
      return "Invalid input. Please check your parameters.";
    }

    return message;
  }

  return "An unknown error occurred during transaction simulation.";
}

/**
 * Simulate a transaction and extract fee information
 * Returns fee in stroops (1 XLM = 10,000,000 stroops)
 */
export async function simulateTransaction(
  transactionXdr: string
): Promise<SimulationResult> {
  try {
    const tx = TransactionBuilder.fromXDR(transactionXdr, NETWORK_PASSPHRASE);
    const response = await server.simulateTransaction(tx);

    // Check if simulation was successful
    if ("error" in response && response.error) {
      return {
        success: false,
        error: response.error,
        errorMessage: parseSimulationError(response.error),
      };
    }

    const fee = "minResourceFee" in response ? response.minResourceFee : undefined;

    return {
      success: true,
      fee,
    };
  } catch (error) {
    return {
      success: false,
      errorMessage: parseSimulationError(error),
    };
  }
}

/**
 * Convert stroops to XLM
 */
export function stroopsToXlm(stroops: string | number): string {
  const num = typeof stroops === "string" ? BigInt(stroops) : BigInt(stroops);
  const xlm = Number(num) / 10_000_000;
  return xlm.toFixed(7).replace(/\.?0+$/, "");
}

/**
 * Convert XLM to stroops
 */
export function xlmToStroops(xlm: string | number): string {
  const num = typeof xlm === "string" ? parseFloat(xlm) : xlm;
  return Math.floor(num * 10_000_000).toString();
}
