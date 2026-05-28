/**
 * frontend/lib/stellar/fees.ts
 *
 * Dynamic fee estimation and multi-currency fee support (#407).
 */

import { RPC_URL, NETWORK_PASSPHRASE } from "@/lib/stellar/client";

export type FeeCurrency = "XLM" | "USDC" | "native";

export interface FeeEstimate {
  baseFee: number;       // stroops (1 XLM = 10_000_000 stroops)
  baseFeeXlm: string;    // human-readable XLM amount
  currency: FeeCurrency;
  network: string;
  surgeMultiplier: number;
  estimatedFee: number;  // stroops after surge
  estimatedFeeXlm: string;
}

const STROOP = 10_000_000; // stroops per XLM
const DEFAULT_BASE_FEE = 100; // 100 stroops = 0.00001 XLM

/**
 * Query the Stellar network for the current base fee via the Soroban RPC
 * `getFeeStats` method. Falls back to the protocol minimum if the call fails.
 */
export async function fetchBaseFee(): Promise<number> {
  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getFeeStats",
        params: [],
      }),
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return DEFAULT_BASE_FEE;

    const data = await res.json();
    // Soroban RPC returns fee stats; use the p50 inclusion fee as base
    const p50 = data?.result?.sorobanInclusionFee?.p50;
    if (p50 && !isNaN(Number(p50))) {
      return Number(p50);
    }
    return DEFAULT_BASE_FEE;
  } catch {
    return DEFAULT_BASE_FEE;
  }
}

/**
 * Estimate the fee for a transaction given the current network conditions.
 *
 * @param operationCount - Number of operations in the transaction (default 1)
 * @param currency - Fee currency (currently only XLM is supported natively)
 */
export async function estimateFee(
  operationCount = 1,
  currency: FeeCurrency = "XLM"
): Promise<FeeEstimate> {
  const baseFee = await fetchBaseFee();
  // Surge multiplier: use 1.5x as a safe buffer for inclusion
  const surgeMultiplier = 1.5;
  const estimatedFee = Math.ceil(baseFee * operationCount * surgeMultiplier);

  return {
    baseFee,
    baseFeeXlm: stroopsToXlm(baseFee),
    currency,
    network: NETWORK_PASSPHRASE,
    surgeMultiplier,
    estimatedFee,
    estimatedFeeXlm: stroopsToXlm(estimatedFee),
  };
}

/** Convert stroops to a human-readable XLM string. */
export function stroopsToXlm(stroops: number): string {
  return (stroops / STROOP).toFixed(7).replace(/\.?0+$/, "") || "0";
}

/** Convert XLM to stroops. */
export function xlmToStroops(xlm: number): number {
  return Math.round(xlm * STROOP);
}
