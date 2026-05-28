/**
 * Fee-bump transaction utilities for gasless verification.
 *
 * Stellar's fee-bump mechanism allows a sponsor account to pay transaction fees
 * on behalf of a user. This enables consumers to verify products without holding XLM.
 *
 * Cost implications:
 * - Base fee: 100 stroops per operation
 * - Fee-bump overhead: 100 stroops (1 additional operation)
 * - Total for read-only verification: ~200 stroops (~$0.00002 at current rates)
 */

export interface FeeBumpRequest {
  innerTx: string; // Base64-encoded transaction XDR
}

export interface FeeBumpResponse {
  feeBumpTx: string; // Base64-encoded fee-bump transaction XDR
  cost: string; // Cost in stroops
  message: string;
}

/**
 * Wraps a user's transaction in a fee-bump transaction.
 * The app's account pays the fees, enabling gasless operations.
 */
export async function createFeeBumpTransaction(innerTxXdr: string): Promise<FeeBumpResponse> {
  const response = await fetch("/api/v1/fee-bump", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ innerTx: innerTxXdr }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create fee-bump transaction");
  }

  return response.json();
}

/**
 * Converts stroops to XLM for display.
 * 1 XLM = 10,000,000 stroops
 */
export function stroopsToXlm(stroops: string | number): number {
  return Number(stroops) / 10_000_000;
}

/**
 * Estimates the cost of a fee-bump transaction in USD.
 * Uses a rough estimate of $0.10 per XLM.
 */
export function estimateFeeBumpCostUsd(stroops: string | number): number {
  const xlm = stroopsToXlm(stroops);
  return xlm * 0.1; // Rough estimate
}
