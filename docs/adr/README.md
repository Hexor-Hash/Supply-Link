# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for Supply-Link.

An ADR documents a significant architectural decision: the context that led to it, the decision itself, and its consequences (positive and negative).

## Index

| ADR | Title | Status |
|---|---|---|
| [ADR-001](ADR-001-stellar-soroban-over-ethereum.md) | Choice of Stellar/Soroban over Ethereum | Accepted |
| [ADR-002](ADR-002-nextjs-app-router.md) | Next.js App Router over Pages Router | Accepted |
| [ADR-003](ADR-003-zustand-over-redux.md) | Zustand over Redux/Context for State Management | Accepted |
| [ADR-004](ADR-004-freighter-wallet.md) | Freighter as the Wallet Provider | Accepted |

## Template

New ADRs should follow this structure:

```markdown
# ADR-NNN: Title

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-NNN  
**Date:** YYYY-MM-DD  
**Deciders:** [names or team]

## Context
What is the issue that motivates this decision?

## Decision
What is the change we are making?

## Consequences
What becomes easier or harder as a result?
```
