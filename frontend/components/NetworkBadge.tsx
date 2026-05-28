"use client";

import { getNetwork, getNetworkName } from "@/lib/stellar/client";

export function NetworkBadge() {
  const network = getNetwork();
  const networkName = getNetworkName();

  const isMainnet = network === "mainnet";
  const bgColor = isMainnet ? "bg-red-100" : "bg-orange-100";
  const textColor = isMainnet ? "text-red-700" : "text-orange-700";
  const borderColor = isMainnet ? "border-red-300" : "border-orange-300";

  return (
    <div
      className={`px-3 py-1 rounded-full text-xs font-semibold border ${bgColor} ${textColor} ${borderColor}`}
    >
      {networkName}
      {isMainnet && (
        <span className="ml-1 font-bold" title="Real XLM will be spent">
          ⚠️
        </span>
      )}
    </div>
  );
}
