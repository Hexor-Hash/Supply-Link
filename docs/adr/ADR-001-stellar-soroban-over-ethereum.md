# ADR-001: Choice of Stellar/Soroban over Ethereum

**Status:** Accepted  
**Date:** 2024-01-15  
**Deciders:** Core team

---

## Context

Supply-Link records every supply-chain event on-chain. A typical product journey generates 4–20 events. With thousands of products in flight simultaneously, the platform needs to handle tens of thousands of on-chain writes per day at a cost that is viable for small producers (Ethiopian farmers, small-batch manufacturers) who cannot absorb $10–100 gas fees per transaction.

We evaluated three platforms:

| Criterion | Stellar/Soroban | Ethereum (L1) | Ethereum L2 (Arbitrum) |
|---|---|---|---|
| Finality | ~5 seconds | 12–15 min (probabilistic) | ~1 min |
| Tx cost | ~$0.00001 | $10–100 | $0.01–0.50 |
| Smart contract language | Rust (Soroban SDK) | Solidity | Solidity |
| Native cross-border payments | Yes (Stellar DEX, anchors) | No | No |
| Ecosystem maturity | Growing | Very mature | Mature |
| Energy model | Federated Byzantine Agreement | Proof of Stake | Proof of Stake |

---

## Decision

We will build on **Stellar** using **Soroban** smart contracts written in Rust.

---

## Consequences

**Positive:**
- Near-zero transaction costs make it economically viable for every supply-chain participant to sign their own events, even at high volume.
- 5-second finality means QR verification is near-real-time — consumers get an up-to-date product history immediately after scanning.
- Rust + Soroban SDK gives us memory safety, a strong type system, and deterministic WASM execution — all desirable properties for auditable supply-chain logic.
- Stellar's built-in cross-border payment rails open a future path to paying producers directly on-chain.
- The Freighter wallet is a first-class browser extension for Stellar, giving us a polished wallet UX without building our own.

**Negative / Trade-offs:**
- Soroban is newer than the EVM ecosystem; fewer third-party auditors and tooling options exist today.
- The developer talent pool for Soroban/Rust is smaller than Solidity.
- No EVM compatibility means we cannot reuse existing Solidity contracts or EVM tooling (Hardhat, Foundry, etc.).
- Stellar's storage model (persistent vs. temporary vs. instance) requires careful rent management that Ethereum developers are not accustomed to.

**Mitigations:**
- We document the storage model explicitly in the contract source and in `docs/adr/`.
- We write comprehensive `///` doc comments and generate HTML docs via `cargo doc` to compensate for the smaller auditor pool.
