"use client";

import { AlertCircle } from "lucide-react";
import { isBelowMinimumBalance, formatBalance } from "@/lib/stellar/balance";

interface LowBalanceWarningProps {
  balance: string | null;
}

export function LowBalanceWarning({ balance }: LowBalanceWarningProps) {
  if (!balance || !isBelowMinimumBalance(balance)) return null;

  return (
    <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
      <div className="flex gap-3">
        <AlertCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
            Low XLM Balance
          </h3>
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Your balance is {formatBalance(balance)}. You may not have enough XLM to pay transaction
            fees. Please add more XLM to your account.
          </p>
        </div>
      </div>
    </div>
  );
}
