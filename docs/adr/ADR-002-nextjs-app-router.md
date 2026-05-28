# ADR-002: Next.js App Router over Pages Router

**Status:** Accepted  
**Date:** 2024-01-15  
**Deciders:** Core team

---

## Context

The Supply-Link frontend needs:

1. A public, unauthenticated QR verification page (`/verify/[id]`) that should be server-rendered for SEO and fast first paint.
2. An authenticated app shell (`/dashboard`, `/products`, `/tracking`) that is client-rendered and wallet-gated.
3. Nested layouts — the app shell has a persistent Navbar; the marketing landing page does not.
4. Streaming and Suspense support for progressive loading of on-chain data.

We chose Next.js as the framework. Within Next.js we had to decide between the **Pages Router** (stable, widely documented) and the **App Router** (introduced in Next.js 13, stable from 13.4+).

---

## Decision

We will use the **Next.js App Router** (`app/` directory).

---

## Consequences

**Positive:**
- Nested layouts (`app/(app)/layout.tsx` vs `app/layout.tsx`) let us share the Navbar only inside the authenticated shell without prop-drilling or conditional rendering hacks.
- React Server Components allow the `/verify/[id]` page to fetch on-chain data server-side, improving SEO and time-to-first-byte for consumers scanning QR codes.
- `loading.tsx` files give us automatic Suspense boundaries with skeleton UIs at the route level — no manual `<Suspense>` wrapping needed.
- `error.tsx` files provide per-route error boundaries, isolating wallet or contract errors to the affected page.
- Route groups (`(app)`, `(marketing)`) let us co-locate related routes without affecting the URL structure.
- This is the direction Next.js is investing in; Pages Router is in maintenance mode.

**Negative / Trade-offs:**
- App Router has a steeper learning curve than Pages Router, especially around the Server/Client component boundary and `"use client"` directives.
- Some third-party libraries (particularly those that use browser APIs at module load time) require `"use client"` wrappers — e.g. `html5-qrcode`, Freighter API.
- Caching behaviour (fetch cache, `revalidate`) is more complex than `getServerSideProps` / `getStaticProps`.
- Fewer community examples exist compared to Pages Router.

**Mitigations:**
- All wallet and blockchain interactions are isolated in `lib/stellar/` and wrapped in `"use client"` components, keeping the Server/Client boundary explicit.
- We use `loading.tsx` skeletons consistently so the complexity of Suspense is hidden from feature developers.
