# Supply-Link

> Decentralized supply chain provenance tracker built on [Stellar](https://stellar.org)'s Soroban smart contract platform.

[![Built on Stellar](https://img.shields.io/badge/Built%20on-Stellar-7B2FBE?logo=stellar)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Smart%20Contracts-Soroban-blueviolet)](https://soroban.stellar.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🚧 Current Status

**Phase 1 – MVP** (In Progress)

| Component             | Status         | Notes                                                        |
| --------------------- | -------------- | ------------------------------------------------------------ |
| Smart Contract        | ✅ Complete    | All functions implemented with property-based tests          |
| Frontend UI           | ✅ Complete    | Dashboard, products, tracking, verification pages            |
| Wallet Integration    | ✅ Complete    | Freighter wallet connect, network detection, balance display |
| QR Codes              | ✅ Complete    | Generation and scanning                                      |
| Contract Deployment   | ⚠️ Pending     | Using placeholder address for development                    |
| Live Integration      | ⚠️ Pending     | Frontend uses mock data; contract calls stubbed              |
| Production Deployment | ❌ Not Started | Awaiting testnet deployment                                  |

**Next Steps:**

1. Deploy contract to Stellar testnet
2. Wire frontend to deployed contract
3. Deploy frontend to Vercel
4. Publish a manual release checklist

---

## Overview

Supply-Link is an open-source, blockchain-based supply chain tracker that enables transparent, tamper-proof tracking of products from origin to consumer. It solves the trust and verification crisis in global supply chains by anchoring every product event immutably on the Stellar blockchain.

**Contract Address (Testnet):** `CBUWSKT2UGOAXK4ZREVDJV5XHSYB42PZ3CERU2ZFUTUMAZLJEHNZIECA` _(placeholder — not yet deployed)_

---

## The Problem

Modern supply chains suffer from deep trust failures:

| Issue                   | Impact                                |
| ----------------------- | ------------------------------------- |
| Counterfeit goods       | $4.5 trillion lost annually           |
| Supply chain fraud      | $40+ billion lost annually            |
| Counterfeit medications | 250,000+ deaths per year              |
| Consumer distrust       | 73% don't trust sustainability claims |

Paper trails are forged. Databases are siloed. No single source of truth exists across supply chain participants.

---

## The Solution

Supply-Link provides a decentralized, immutable ledger where every product event — harvest, processing, shipping, quality check, retail receipt — is recorded on-chain and verifiable by anyone with a QR code scan.

### Core Features

- **Product Registration** — Register products at origin with cryptographic proof of authenticity and a unique blockchain ID
- **Event Tracking** — Record every supply chain step with timestamp, location, actor address, and metadata
- **QR Verification** — Consumers scan a QR code to see the complete, tamper-proof product journey
- **Multi-party Authorization** — Farmers, processors, shippers, and retailers each sign their own events
- **Ownership Transfer** — Transfer product custody on-chain with full audit trail

---

## Architecture

```
Supply-Link/
├── frontend/          # Next.js 16 + React 19 + TypeScript web app
└── smart-contract/    # Rust + Soroban smart contracts
```

### Technology Stack

| Layer           | Technology                           |
| --------------- | ------------------------------------ |
| Smart Contracts | Rust + Soroban SDK 22                |
| Blockchain      | Stellar (Testnet / Mainnet)          |
| Frontend        | Next.js 16, React 19, TypeScript     |
| Styling         | Tailwind CSS v4                      |
| Wallet          | Freighter (`@stellar/freighter-api`) |
| State           | Zustand                              |
| Forms           | React Hook Form + Zod                |
| Charts          | Recharts                             |
| QR              | `qrcode` + `html5-qrcode`            |

### Data Flow

```
Producer → Register Product → Stellar Blockchain
    ↓
Processor → Add Event → Stellar Blockchain
    ↓
Shipper → Add Event → Stellar Blockchain
    ↓
Retailer → Add Event → Stellar Blockchain
    ↓
Consumer → Scan QR → View Full History
```

---

## Smart Contract

The Soroban contract exposes these core functions:

```rust
// Register a new product (owner must sign)
register_product(env, id, name, origin, owner) -> Product

// Add a tracking event (owner or authorized actor must sign)
add_tracking_event(env, product_id, caller, location, event_type, metadata) -> TrackingEvent

// Read product details
get_product(env, id) -> Product

// Read all events for a product
get_tracking_events(env, product_id) -> Vec<TrackingEvent>

// Check if a product exists (returns bool, never panics)
product_exists(env, id) -> bool

// Count events for a product (returns 0 for unknown products)
get_events_count(env, product_id) -> u32

// Transfer product ownership (current owner must sign)
transfer_ownership(env, product_id, new_owner) -> bool

// Authorize an actor to add events (owner must sign)
add_authorized_actor(env, product_id, actor) -> bool

// Remove an authorized actor (owner must sign)
remove_authorized_actor(env, product_id, actor) -> bool

// Update product name and origin (owner must sign)
update_product_metadata(env, product_id, name, origin) -> Product

// Get the list of authorized actors for a product
get_authorized_actors(env, product_id) -> Vec<Address>

// Get total number of registered products
get_product_count(env) -> u64

// List products with pagination (offset + limit)
list_products(env, offset, limit) -> Vec<String>
```

### Data Models

```rust
pub struct Product {
    pub id: String,
    pub name: String,
    pub origin: String,
    pub owner: Address,
    pub timestamp: u64,
    pub authorized_actors: Vec<Address>,
}

pub struct TrackingEvent {
    pub product_id: String,
    pub location: String,
    pub actor: Address,
    pub timestamp: u64,
    pub event_type: String,  // HARVEST | PROCESSING | SHIPPING | RETAIL
    pub metadata: String,    // JSON string
}
```

---

## Frontend Structure

```
frontend/
├── app/
│   ├── (marketing)/        Landing page
│   ├── (app)/
│   │   ├── dashboard/      Analytics & overview
│   │   ├── products/       Product registration & list
│   │   └── tracking/       Event tracking
│   ├── verify/[id]/        Public QR verification page
│   └── api/health/         Health check endpoint
├── components/
│   ├── ui/                 Reusable primitives (Button, Card, etc.)
│   ├── layouts/            App shell (Navbar, Sidebar)
│   ├── wallet/             Freighter wallet connect
│   ├── products/           Product cards & registration form
│   └── tracking/           Event timeline & add-event form
└── lib/
    ├── stellar/            Soroban SDK client & contract bindings
    ├── state/              Zustand stores
    ├── hooks/              Custom React hooks
    └── types/              Shared TypeScript domain types
```

---

## Getting Started

### Prerequisites

- [Node.js 20+](https://nodejs.org) — check with `node --version`
- [Rust](https://rustup.rs) + `cargo` — check with `cargo --version`
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli) — install with `cargo install stellar-cli --locked`
- [Freighter Wallet](https://freighter.app) browser extension — Chrome or Firefox

### 1. Clone the repository

```bash
git clone https://github.com/your-org/supply-link.git
cd supply-link
```

### 2. Run the frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
# → http://localhost:3000
```

The app runs with mock data by default — no wallet or deployed contract required to explore the UI.

### 3. Configure environment

Edit `frontend/.env.local`:

```env
# Stellar network: "testnet" or "mainnet"
NEXT_PUBLIC_STELLAR_NETWORK=testnet

# Deployed contract address (update after deploying the smart contract)
NEXT_PUBLIC_CONTRACT_ID=CBUWSKT2UGOAXK4ZREVDJV5XHSYB42PZ3CERU2ZFUTUMAZLJEHNZIECA
```

### 4. Build and deploy the smart contract

```bash
cd smart-contract

# Install the wasm32 target if you haven't already
rustup target add wasm32-unknown-unknown

# Build
cargo build --target wasm32-unknown-unknown --release

# Configure a Stellar account alias (one-time setup)
stellar keys generate --global alice --network testnet
stellar keys fund alice --network testnet   # funds from Friendbot

# Deploy to testnet
SOURCE=alice bash scripts/deploy.sh
# → Outputs your contract address; copy it into .env.local
```

### 5. Run smart contract tests

```bash
cd smart-contract
cargo test
```

The test suite includes unit tests and property-based tests (via `proptest`) covering all contract functions.

### 6. Run frontend lint

```bash
cd frontend
npm run lint
```

---

## Why Stellar / Soroban?

| Feature      | Stellar       | Ethereum | Bitcoin |
| ------------ | ------------- | -------- | ------- |
| Finality     | ~5 seconds    | Minutes  | Hours   |
| Tx cost      | ~$0.00001     | $10–100  | High    |
| Energy       | Efficient PoA | PoS      | PoW     |
| Cross-border | Native        | Limited  | Limited |

Stellar's speed and near-zero cost make it ideal for supply chain use cases where thousands of events are recorded per day across global participants.

---

## Use Cases

- **Food & Agriculture** — Track coffee from Ethiopian farm to Seattle café, verify organic/fair-trade claims
- **Pharmaceuticals** — Verify medication authenticity from factory to pharmacy, prevent counterfeits
- **Fashion** — Prove ethical sourcing and fair-wage manufacturing
- **Electronics** — Verify conflict-free mineral sourcing
- **Luxury Goods** — Authenticate high-value items, track resale ownership

---

## Roadmap

| Phase                  | Status         | Scope                                                              |
| ---------------------- | -------------- | ------------------------------------------------------------------ |
| Phase 1 – MVP          | 🔄 In Progress | Product registration, event tracking, wallet integration, QR codes |
| Phase 2 – Security     | 📅 Q2 2026     | Access control, security audit, E2E tests                          |
| Phase 3 – UX           | 📅 Q3 2026     | Timeline visualization, analytics dashboard, mobile                |
| Phase 4 – Integrations | 📅 Q3 2026     | REST API, webhooks, SDK                                            |
| Phase 5 – Scale        | 📅 Q4 2026     | Multi-language, enterprise features, mainnet launch                |

---

## Documentation

- **[API Reference](https://supply-link.vercel.app/api-docs)** — Interactive Swagger UI covering all REST API endpoints, authentication, and example request/response bodies.
- **[User Guide — Producers](docs/user-guide-producer.md)** — Step-by-step guide for installing Freighter, funding a testnet account, registering products, adding tracking events, and sharing QR codes.

---

## Contributing

Contributions are welcome across all skill levels — smart contracts, frontend, docs, design, and testing.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

---

## License

MIT — free to use, modify, and distribute.

---

_Built with ❤️ on [Stellar](https://stellar.org) & [Soroban](https://soroban.stellar.org)_
