/**
 * Network configuration parity checks for Supply-Link.
 *
 * Defines the expected configuration matrix per environment and validates
 * that the runtime environment matches it. Used at startup and in health
 * diagnostics to detect drift early.
 */

// ── Configuration matrix ──────────────────────────────────────────────────────

export type NetworkEnv = "testnet" | "mainnet";

interface NetworkMatrix {
  passphrase: string;
  /** Allowed RPC hostnames for this environment */
  rpcHostnames: string[];
  /** Contract ID must start with 'C' and be 56 chars (Stellar contract address) */
  contractIdPattern: RegExp;
}

export const NETWORK_MATRIX: Record<NetworkEnv, NetworkMatrix> = {
  testnet: {
    passphrase: "Test SDF Network ; September 2015",
    rpcHostnames: ["soroban-testnet.stellar.org"],
    contractIdPattern: /^C[A-Z2-7]{55}$/,
  },
  mainnet: {
    passphrase: "Public Global Stellar Network ; September 2015",
    rpcHostnames: ["soroban-mainnet.stellar.org"],
    contractIdPattern: /^C[A-Z2-7]{55}$/,
  },
};

// ── Parity check result ───────────────────────────────────────────────────────

export interface ConfigCheckResult {
  valid: boolean;
  /** Detected drifts — each entry describes a mismatch without leaking secret values */
  drifts: string[];
  /** Safe summary of effective config (no secret values) */
  effectiveConfig: {
    network: string;
    rpcHostname: string;
    contractIdPrefix: string; // first 8 chars only
    passphraseMatch: boolean;
  };
}

// ── Core validator ────────────────────────────────────────────────────────────

export function checkNetworkConfig(env: NodeJS.ProcessEnv = process.env): ConfigCheckResult {
  const drifts: string[] = [];

  const network = env.NEXT_PUBLIC_STELLAR_NETWORK as NetworkEnv | undefined;
  const contractId = env.NEXT_PUBLIC_CONTRACT_ID ?? "";
  const rpcUrl = env.NEXT_PUBLIC_RPC_URL ?? "";
  const passphrase = env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? "";

  // 1. Network must be a known value
  if (!network || !(network in NETWORK_MATRIX)) {
    drifts.push(
      `NEXT_PUBLIC_STELLAR_NETWORK is '${network ?? "unset"}'; expected 'testnet' or 'mainnet'`
    );
    return {
      valid: false,
      drifts,
      effectiveConfig: {
        network: network ?? "unset",
        rpcHostname: safeHostname(rpcUrl),
        contractIdPrefix: contractId.slice(0, 8) || "(unset)",
        passphraseMatch: false,
      },
    };
  }

  const matrix = NETWORK_MATRIX[network];

  // 2. Contract ID format
  if (!contractId) {
    drifts.push("NEXT_PUBLIC_CONTRACT_ID is not set");
  } else if (!matrix.contractIdPattern.test(contractId)) {
    drifts.push(
      `NEXT_PUBLIC_CONTRACT_ID has invalid format for ${network} (expected 56-char Stellar contract address starting with 'C')`
    );
  }

  // 3. RPC hostname must belong to the expected environment
  const rpcHostname = safeHostname(rpcUrl);
  if (rpcUrl && !matrix.rpcHostnames.some((h) => rpcHostname === h || rpcHostname.endsWith(`.${h}`))) {
    drifts.push(
      `NEXT_PUBLIC_RPC_URL hostname '${rpcHostname}' is not in the allowed list for ${network}: [${matrix.rpcHostnames.join(", ")}]`
    );
  }

  // 4. Network passphrase must match (if explicitly set)
  const passphraseMatch = !passphrase || passphrase === matrix.passphrase;
  if (!passphraseMatch) {
    drifts.push(
      `NEXT_PUBLIC_NETWORK_PASSPHRASE does not match expected value for ${network}`
    );
  }

  // 5. Cross-environment contamination: mainnet contract on testnet or vice-versa
  //    Heuristic: if network is testnet but passphrase looks like mainnet (or vice-versa)
  const otherNetwork: NetworkEnv = network === "testnet" ? "mainnet" : "testnet";
  if (passphrase && passphrase === NETWORK_MATRIX[otherNetwork].passphrase) {
    drifts.push(
      `NEXT_PUBLIC_NETWORK_PASSPHRASE matches ${otherNetwork} but NEXT_PUBLIC_STELLAR_NETWORK is ${network} — possible environment contamination`
    );
  }

  return {
    valid: drifts.length === 0,
    drifts,
    effectiveConfig: {
      network,
      rpcHostname: rpcHostname || "(default)",
      contractIdPrefix: contractId.slice(0, 8) || "(unset)",
      passphraseMatch,
    },
  };
}

// ── Startup guard ─────────────────────────────────────────────────────────────

/**
 * Throws if the network configuration is invalid.
 * Call once at module load time in server-only code paths.
 */
export function assertNetworkConfig(env: NodeJS.ProcessEnv = process.env): void {
  const result = checkNetworkConfig(env);
  if (!result.valid) {
    throw new Error(
      `[Supply-Link] Network configuration drift detected:\n${result.drifts.map((d) => `  • ${d}`).join("\n")}`
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url; // not a valid URL; return as-is for drift reporting
  }
}
