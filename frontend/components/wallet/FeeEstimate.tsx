"use client";

import { stroopsToXlm } from "@/lib/stellar/transaction";

interface FeeEstimateProps {
  feeStroops?: string;
  loading?: boolean;
}

export function FeeEstimate({ feeStroops, loading }: FeeEstimateProps) {
  if (!feeStroops && !loading) return null;

  const feeXlm = feeStroops ? stroopsToXlm(feeStroops) : "0";

  return (
    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
          Estimated Fee:
        </span>
        <span className="text-sm font-mono text-blue-700 dark:text-blue-300">
          {loading ? "Calculating…" : `${feeXlm} XLM`}
        </span>
      </div>
    </div>
  );
}
