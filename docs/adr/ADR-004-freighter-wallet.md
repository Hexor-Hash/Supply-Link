# ADR-004: Freighter as the Wallet Provider

**Status:** Accepted  
**Date:** 2024-01-15  
**Deciders:** Core team

---

## Context

Supply-Link requires users (producers, processors, shippers, retailers) to sign Soroban transactions from a browser. We needed a wallet solution that:

1. Supports Stellar/Soroban transaction signing natively.
2. Has a browser extension available for Chrome/Firefox/Brave.
3. Exposes a JavaScript API we can call from Next.js.
4. Is actively maintained and has a security track record.
5. Does not require users to expose their private key to the dApp.

We evaluated:

| Option | Stellar native | Soroban support | Browser extension | JS API | Maintained by |
|---|---|---|---|---|---|
| **Freighter** | Yes | Yes | Yes (Chrome, Firefox, Brave) | `@stellar/freighter-api` | Stellar Development Foundation |
| Albedo | Yes | Partial | Web-based (no extension) | Yes | Community |
| Rabet | Yes | Partial | Yes | Yes | Community |
| WalletConnect | No (EVM-focused) | No | N/A | Yes | WalletConnect Foundation |
| Hardware wallet (Ledger) | Yes | Partial | Via Ledger Live | Limited | Ledger |

---

## Decision

We will use **Freighter** as the sole wallet provider, integrated via the official `@stellar/freighter-api` npm package.

---

## Consequences

**Positive:**
- Freighter is maintained by the Stellar Development Foundation — the same organisation that maintains Soroban. This alignment means Freighter is always updated alongside new Soroban features.
- `@stellar/freighter-api` provides a clean, promise-based API for address retrieval, network detection, and transaction signing — no raw XDR manipulation needed in the frontend.
- Users never expose their private key; Freighter signs transactions inside the extension sandbox.
- Network mismatch detection (`getNetworkDetails()`) lets us warn users when their Freighter is on mainnet while the app targets testnet.
- The extension is available on all major Chromium-based browsers and Firefox, covering the vast majority of our target users.

**Negative / Trade-offs:**
- Users must install the Freighter browser extension before they can interact with the dApp — this is a friction point for first-time users.
- Mobile browsers are not supported (Freighter is desktop-only). Mobile support is deferred to Phase 3.
- We are coupled to a single wallet provider. If Freighter is deprecated or has a security incident, we would need to integrate an alternative.
- No WalletConnect support means users with hardware wallets or mobile-only setups cannot use the dApp today.

**Mitigations:**
- We show a `FreighterNotInstalledModal` with a direct install link when the extension is not detected, reducing drop-off.
- All wallet interactions are abstracted behind `lib/stellar/client.ts` — swapping the wallet provider in the future requires changes only in that file.
- We monitor Freighter's GitHub and security advisories as part of our dependency review process.
