"use client";

import { AlertCircle } from "lucide-react";

interface TransactionErrorProps {
  error: string;
  onDismiss?: () => void;
}

export function TransactionError({ error, onDismiss }: TransactionErrorProps) {
  return (
    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div className="flex gap-3">
        <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
            Transaction Error
          </h3>
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex-shrink-0"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
