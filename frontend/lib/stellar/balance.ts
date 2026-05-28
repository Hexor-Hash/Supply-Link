import { rpc } from "@stellar/stellar-sdk";
import { RPC_URL } from "./client";

const server = new rpc.Server(RPC_URL);

const MIN_BALANCE_THRESHOLD = 1; // 1 XLM

/**
 * Fetch XLM balance for an account
 * Returns balance in XLM
 */
export async function getXlmBalance(accountAddress: string): Promise<string> {
  try {
    const account = await server.getAccount(accountAddress);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nativeBalance = (account as any).balances?.find((b: any) => b.asset_type === "native");

    if (!nativeBalance) {
      return "0";
    }

    return nativeBalance.balance;
  } catch (error) {
    console.error("Failed to fetch XLM balance:", error);
    throw new Error("Failed to fetch account balance");
  }
}

/**
 * Check if balance is below minimum threshold
 */
export function isBelowMinimumBalance(balanceXlm: string): boolean {
  try {
    const balance = parseFloat(balanceXlm);
    return balance < MIN_BALANCE_THRESHOLD;
  } catch {
    return true;
  }
}

/**
 * Format balance for display
 */
export function formatBalance(balanceXlm: string): string {
  try {
    const balance = parseFloat(balanceXlm);
    if (balance === 0) return "0 XLM";
    if (balance < 0.0001) return "< 0.0001 XLM";
    return `${balance.toFixed(4)} XLM`;
  } catch {
    return "0 XLM";
  }
}
