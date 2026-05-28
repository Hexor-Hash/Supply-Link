# ADR-003: Zustand over Redux/Context for State Management

**Status:** Accepted  
**Date:** 2024-01-15  
**Deciders:** Core team

---

## Context

Supply-Link needs to share state across multiple routes and components:

- **Wallet state** — connected address, XLM balance, network mismatch flag.
- **Product list** — fetched from the Soroban contract, cached client-side.
- **Transaction state** — pending/confirmed/failed status for in-flight on-chain transactions.

We evaluated three options:

| Criterion | Zustand | Redux Toolkit | React Context + useReducer |
|---|---|---|---|
| Bundle size | ~1 KB | ~15 KB | 0 (built-in) |
| Boilerplate | Minimal | Moderate (slices, actions) | Moderate (reducers, providers) |
| DevTools | Yes (Redux DevTools via middleware) | Yes (first-class) | No |
| Async actions | Simple (plain async functions) | `createAsyncThunk` | Manual |
| Outside-React access | Yes (`useStore.getState()`) | Yes (`store.getState()`) | No |
| TypeScript ergonomics | Excellent | Good | Good |
| Re-render control | Selector-based, fine-grained | Selector-based | Coarse (whole subtree) |

---

## Decision

We will use **Zustand** for all global client state.

---

## Consequences

**Positive:**
- Minimal boilerplate: the entire store is defined in a single `lib/state/store.ts` file with no action creators, reducers, or provider wrappers.
- Fine-grained subscriptions via selectors prevent unnecessary re-renders — important for wallet state that is read by many components.
- Async wallet operations (connect, fetch balance) are plain `async` functions inside the store — no middleware or thunk configuration needed.
- The store is accessible outside React components (e.g. in `lib/stellar/` utility functions) via `useStore.getState()`.
- Tiny bundle footprint (~1 KB) is appropriate for a dApp where users may be on mobile connections.

**Negative / Trade-offs:**
- No built-in time-travel debugging (Redux DevTools integration requires the `zustand/middleware` devtools middleware).
- Less opinionated structure means discipline is needed to keep the store from growing into a monolith — we mitigate this by keeping domain slices as separate objects within the store.
- Smaller ecosystem of middleware compared to Redux.

**Mitigations:**
- The store is kept in a single file (`lib/state/store.ts`) and reviewed as part of every PR that touches state.
- We add the Zustand devtools middleware in development builds for debugging.
