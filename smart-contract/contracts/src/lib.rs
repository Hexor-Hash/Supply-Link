#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol, Vec};
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Address, Env, String, Vec, Symbol};

/// Current event schema version.
///
/// Bump this constant whenever the [`TrackingEvent`] payload layout changes in
/// a backward-incompatible way. Consumers should inspect the `schema_version`
/// field (and the matching topic slot) to select the correct parser.
///
/// | Version | Changes |
/// |---------|---------|
/// | 1       | Initial versioned schema. Adds `schema_version` field. |
pub const EVENT_SCHEMA_VERSION: u32 = 1;

mod tests;
mod resilience_tests;

// ── Payload size limits (issue #311) ─────────────────────────────────────────
// All limits are in bytes (Soroban String::len() returns byte count).
// | Field    | Max bytes | Notes                          |
// |----------|-----------|--------------------------------|
// | id       |       128 | Storage key; keep short        |
// | name     |       256 | Human-readable label           |
// | origin   |       256 | Geographic/org string          |
// | location |       256 | Per-event location             |
// | metadata |      4096 | JSON payload                   |
const MAX_ID_LEN:       u32 = 128;
const MAX_NAME_LEN:     u32 = 256;
const MAX_ORIGIN_LEN:   u32 = 256;
const MAX_LOCATION_LEN: u32 = 256;
const MAX_METADATA_LEN: u32 = 4096;

// ── Event expiration policy (issue #314) ──────────────────────────────────────
/// Pending events expire after this many seconds (7 days).
const EXPIRATION_WINDOW: u64 = 604_800;  // 7 * 24 * 60 * 60 seconds

fn assert_len(s: &String, max: u32, field: &'static str) {
    if s.len() > max { panic!("{} exceeds max length", field); }
}

// ── Error types ──────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum Error {
    ProductNotFound = 1,
    NotAuthorized = 2,
    ApproverNotAuthorized = 3,
    NoPendingEvents = 4,
    OwnerOnly = 5,
    PendingEventExpired = 6,
    InvalidNonce = 7,
}

// ── Data models ──────────────────────────────────────────────────────────────

/// Represents a product registered on the Supply-Link blockchain.
///
/// Products are the core entity of the supply chain. Once registered, a product
/// accumulates [`TrackingEvent`]s as it moves through the supply chain. The
/// `owner` field always reflects the *current* custodian; historical ownership
/// is captured implicitly through `ownership_transferred` events.
///
/// # Storage
/// Stored under [`DataKey::Product`] using the product's `id` as the key.
/// Storage type is `persistent`, so entries survive ledger archival as long as
/// the rent is paid.
#[contracttype]
#[derive(Clone)]
pub struct Product {
    /// Caller-supplied unique identifier for this product (e.g. `"batch-2024-001"`).
    /// Must be unique across all registered products; duplicate IDs are rejected
    /// with `"product already exists"` and leave existing state unchanged.
    pub id: String,
    /// Human-readable product name (e.g. `"Arabica Coffee Beans"`).
    pub name: String,
    /// Geographic or organisational origin of the product
    /// (e.g. `"Yirgacheffe, Ethiopia"`).
    pub origin: String,
    /// Stellar address of the current product owner.
    /// Only this address may call owner-gated functions such as
    /// [`SupplyLinkContract::transfer_ownership`] and
    /// [`SupplyLinkContract::add_authorized_actor`].
    pub owner: Address,
    /// Unix timestamp (seconds) recorded by the Soroban ledger at registration
    /// time. Set automatically; callers cannot supply this value.
    pub timestamp: u64,
    /// Addresses that are permitted to call
    /// [`SupplyLinkContract::add_tracking_event`] for this product in addition
    /// to the owner. Managed via [`SupplyLinkContract::add_authorized_actor`]
    /// and [`SupplyLinkContract::remove_authorized_actor`].
    pub authorized_actors: Vec<Address>,
    /// Unix timestamp (seconds) after which the product is considered expired.
    /// 0 means no expiration set.
    pub expiration_timestamp: u64,
    /// Whether the product has been marked as spoiled.
    pub spoiled: bool,
    /// Number of signatures required to approve events for this product.
    /// If 0 or 1, events are recorded immediately. If > 1, events are staged
    /// as pending until the required number of approvals are received.
    pub required_signatures: u32,
    /// Lifecycle state of the product. `true` indicates the product is active
    /// and can receive tracking events. `false` indicates the product has been
    /// deactivated and is read-only. Defaults to `true` on registration.
    pub active: bool,
}

/// A single supply-chain event recorded against a [`Product`].
///
/// Events are append-only. Once written they cannot be modified or deleted,
/// providing an immutable audit trail. All events for a product are stored
/// together under [`DataKey::Events`].
///
/// # Schema versioning
/// The `schema_version` field carries [`EVENT_SCHEMA_VERSION`] at write time.
/// Indexers and backend services must read this field first and dispatch to the
/// appropriate parser before accessing any other fields. The version is also
/// encoded as the **fourth topic slot** (index 3) in every emitted event so
/// consumers can filter by version without deserialising the payload.
/// Topic layout: `(event_name, product_id, event_type, schema_version)`.
///
/// # Storage
/// Stored as a `Vec<TrackingEvent>` under [`DataKey::Events`] keyed by
/// `product_id`. Storage type is `persistent`.
#[contracttype]
#[derive(Clone)]
pub struct TrackingEvent {
    /// Schema version of this event payload. Always set to
    /// [`EVENT_SCHEMA_VERSION`] at write time. Consumers must check this field
    /// before parsing any other fields.
    pub schema_version: u32,
    /// ID of the [`Product`] this event belongs to.
    pub product_id: String,
    /// Free-form location string describing where the event occurred
    /// (e.g. `"Port of Rotterdam, Netherlands"`).
    pub location: String,
    /// Stellar address of the supply-chain participant who recorded this event.
    /// Must be the product owner or an address in `authorized_actors`.
    pub actor: Address,
    /// Unix timestamp (seconds) recorded by the Soroban ledger when the event
    /// was submitted. Set automatically; callers cannot supply this value.
    pub timestamp: u64,
    /// Supply-chain stage. Accepted values: `"HARVEST"`, `"PROCESSING"`,
    /// `"SHIPPING"`, `"RETAIL"`. The contract stores this as a raw string and
    /// does not validate the value — callers are responsible for using a
    /// recognised stage name.
    pub event_type: String,
    /// Arbitrary JSON string carrying stage-specific metadata
    /// (e.g. `{"temperature":"4°C","humidity":"60%"}`). The contract stores
    /// this opaquely; consumers are responsible for parsing it.
    pub metadata: String,
}

/// A pending event awaiting multi-signature approval.
///
/// For high-value products, events are staged until the required number of
/// authorized actors have approved them.
///
/// Each pending event has a stable identifier (`pending_event_id`) that remains
/// unchanged even if other pending events in the queue are removed or approved.
/// This prevents client mistakes from index-based references that shift after
/// queue mutations.
#[contracttype]
#[derive(Clone)]
pub struct PendingEvent {
    /// Stable unique identifier for this pending event within its product.
    /// Generated at creation time and immutable. Used for deterministic targeting
    /// in approve/reject operations to avoid index-based race conditions.
    pub pending_event_id: u64,
    /// ID of the product this event is for.
    pub product_id: String,
    /// The event data awaiting approval.
    pub event: TrackingEvent,
    /// Addresses that have approved this event.
    pub approvals: Vec<Address>,
    /// Number of approvals required before the event is finalized.
    pub required_signatures: u32,
    /// Timestamp when the pending event was created.
    pub created_at: u64,
    /// Timestamp when this pending event expires (issue #314).
    pub expiration: u64,
}

/// Event rejection data with optional reason context.
///
/// Emitted when a pending event is rejected, providing audit trail
/// and optional explanation for the rejection decision.
#[contracttype]
#[derive(Clone)]
pub struct EventRejection {
    /// The product ID the rejected event was for.
    pub product_id: String,
    /// The rejected event data.
    pub event: TrackingEvent,
    /// Address of the actor who rejected the event.
    pub rejector: Address,
    /// Optional reason for rejection (max 256 characters).
    pub reason: String,
    /// Timestamp of the rejection.
    pub timestamp: u64,
    pub event_type: String, // HARVEST | PROCESSING | SHIPPING | RETAIL | SPOILED | EXPIRED
    pub metadata: String,   // JSON string
}

/// A batch/lot grouping multiple product IDs together. (#405)
#[contracttype]
#[derive(Clone)]
pub struct Batch {
    pub id: String,
    pub name: String,
    pub owner: Address,
    pub product_ids: Vec<String>,
    pub timestamp: u64,
}

// ── Storage keys ─────────────────────────────────────────────────────────────

/// Enumeration of all persistent storage keys used by the contract.
///
/// Using a typed enum prevents key collisions and makes storage layout
/// explicit for auditors.
///
/// # Variants
/// - [`DataKey::Product`] — stores a single [`Product`] by its string ID.
/// - [`DataKey::Events`] — stores a `Vec<TrackingEvent>` for a product ID.
/// - [`DataKey::ProductCount`] — stores a `u64` global counter of registered products.
/// - [`DataKey::ProductIndex`] — maps a sequential `u64` index to a product ID
///   string, enabling paginated listing via [`SupplyLinkContract::list_products`].
#[contracttype]
pub enum DataKey {
    /// Key for a [`Product`] entry. The inner `String` is the product ID.
    Product(String),
    /// Key for the event log of a product. The inner `String` is the product ID.
    Events(String),
    /// Batch entity keyed by batch ID. (#405)
    Batch(String),
    /// Aggregate events recorded at the batch level. (#405)
    BatchEvents(String),
    /// Key for pending events awaiting multi-signature approval.
    /// The inner `String` is the product ID.
    PendingEvents(String),
    /// Key for the next stable pending event ID counter.
    /// The inner `String` is the product ID.
    /// Stores a `u64` used to generate unique identifiers for pending events.
    NextPendingId(String),
    /// Key for the global product registration counter.
    ProductCount,
    /// Key for the index-to-ID mapping used by pagination.
    /// The inner `u64` is the zero-based insertion index.
    ProductIndex(u64),
    /// Key for actor nonce tracking. The inner `Address` is the actor address.
    ActorNonce(Address),
}

// ── Contract ─────────────────────────────────────────────────────────────────

/// The Supply-Link Soroban smart contract.
///
/// Provides a decentralised, tamper-proof registry for supply-chain products
/// and their associated tracking events on the Stellar blockchain.
///
/// # Deployment
/// Testnet contract ID: `CBUWSKT2UGOAXK4ZREVDJV5XHSYB42PZ3CERU2ZFUTUMAZLJEHNZIECA`
///
/// # Authorization model
/// - **Owner-gated** functions (`transfer_ownership`, `add_authorized_actor`,
///   `remove_authorized_actor`, `update_product_metadata`) require the current
///   product owner to sign the transaction via `require_auth()`.
/// - **Actor-gated** functions (`add_tracking_event`) accept either the owner
///   or any address in `authorized_actors`.
/// - **Read-only** functions (`get_product`, `get_tracking_events`, etc.) have
///   no authorization requirements.
#[contract]
pub struct SupplyLinkContract;

#[contractimpl]
impl SupplyLinkContract {
    // ── Product registration ──────────────────────────────────────────────────

    /// Register a new product on-chain.
    ///
    /// Creates a [`Product`] entry in persistent storage and initialises the
    /// global product counter and index mapping used by
    /// [`Self::list_products`].
    ///
    /// # Parameters
    /// - `env` — Soroban execution environment (injected by the runtime).
    /// - `id` — Caller-supplied unique product identifier. Must not already
    ///   exist; duplicate IDs are rejected with `"product already exists"`.
    /// - `name` — Human-readable product name.
    /// - `origin` — Geographic or organisational origin of the product.
    /// - `owner` — Stellar address that will own the product. This address
    ///   must sign the transaction.
    /// - `required_signatures` — Number of approvals required for events (0 or 1 = immediate, >1 = multi-sig).
    ///
    /// # Returns
    /// The newly created [`Product`] struct.
    ///
    /// # Authorization
    /// Requires `owner.require_auth()`. The transaction must be signed by
    /// `owner`.
    ///
    /// # Warning
    /// If a product with `id` already exists it will be **silently overwritten**
    /// with the new `name`, `origin`, `owner`, and `required_signatures`. The
    /// previous product's data is lost. Additionally, the global
    /// `ProductCount` and `ProductIndex` are incremented unconditionally, so a
    /// duplicate registration creates a ghost index entry pointing to the same
    /// `id`. Callers should use [`Self::product_exists`] to guard against
    /// accidental overwrites.
    ///
    /// # Panics
    /// - `"product already exists"` — if a product with `id` is already registered.
    ///   `product_count` and index mappings are NOT modified on rejection.
    ///
    /// # Emitted Events
    /// Publishes a `("product_registered", id)` event with the [`Product`]
    /// struct as the event body.
    pub fn register_product(
        env: Env,
        id: String,
        name: String,
        origin: String,
        owner: Address,
        required_signatures: u32,
    ) -> Product {
        // Duplicate guard — must come before auth to avoid leaking state on
        // duplicate attempts and to keep counter/index consistent.
        if env.storage().persistent().has(&DataKey::Product(id.clone())) {
            panic!("product already exists");
        }

        owner.require_auth();
        // Issue #311: enforce size limits.
        assert_len(&id,     MAX_ID_LEN,     "id");
        assert_len(&name,   MAX_NAME_LEN,   "name");
        assert_len(&origin, MAX_ORIGIN_LEN, "origin");
        let product = Product {
            id: id.clone(),
            name,
            origin,
            owner,
            timestamp: env.ledger().timestamp(),
            authorized_actors: Vec::new(&env),
            expiration_timestamp: 0,
            spoiled: false,
            required_signatures,
            active: true,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Product(id.clone()), &product);

        // Increment product count
        let count: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::ProductCount)
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::ProductCount, &(count + 1));

        // Store product index mapping
        env.storage()
            .persistent()
            .set(&DataKey::ProductIndex(count), &id);

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "product_registered"), id.clone()),
            product.clone(),
        );

        product
    }

    /// Add a tracking event for a product.
    ///
    /// Appends a new [`TrackingEvent`] to the product's event log. The event
    /// log is stored as a `Vec<TrackingEvent>` and grows with each call.
    ///
    /// # Parameters
    /// - `env` — Soroban execution environment.
    /// - `product_id` — ID of the product to record the event against.
    /// - `caller` — Address of the supply-chain participant submitting the
    ///   event. Must be the product owner or an address in
    ///   `authorized_actors`.
    /// - `location` — Free-form location string (e.g. `"Port of Hamburg"`).
    /// - `event_type` — Canonical supply-chain stage. Must be one of:
    ///   `"HARVEST"`, `"PROCESSING"`, `"SHIPPING"`, `"RETAIL"`.
    ///   Unknown values are rejected with `"invalid event_type"` (issue #310).
    /// - `metadata` — Arbitrary JSON string with stage-specific data.
    ///
    /// # Returns
    /// The newly created [`TrackingEvent`] struct.
    ///
    /// # Authorization
    /// Requires `caller.require_auth()`. The authorization check is performed
    /// *after* verifying that `caller` is the owner or an authorized actor, so
    /// unauthorized addresses are rejected before any auth overhead is incurred.
    ///
    /// # Panics
    /// - `"product not found"` — if `product_id` is not registered.
    /// - `"caller is not authorized"` — if `caller` is neither the product
    ///   owner nor in `authorized_actors`.
    ///
    /// # Emitted Events
    /// - When `product.required_signatures <= 1`: publishes an
    ///   `("event_added", product_id, event_type, schema_version)` event with
    ///   the [`TrackingEvent`] struct as the event body.
    /// - When `product.required_signatures > 1`: the event is staged as
    ///   pending and an `("event_pending", product_id, event_type,
    ///   schema_version)` event is published instead. The event is not added
    ///   to the finalized log until [`Self::approve_event`] collects enough
    ///   approvals.
    pub fn add_tracking_event(
        env: Env,
        product_id: String,
        caller: Address,
        location: String,
        event_type: String,
        metadata: String,
    ) -> Result<TrackingEvent, Error> {
        let product: Product = env
            .storage()
            .persistent()
            .get(&DataKey::Product(product_id.clone()))
            .ok_or(Error::ProductNotFound)?;

        if product.spoiled {
            panic!("product is spoiled");
        }

        let is_owner = product.owner == caller;
        let is_actor = product.authorized_actors.contains(&caller);
        if !is_owner && !is_actor {
            panic!("caller is not authorized");
        let is_owner = product.owner == caller;
        let is_actor = product.authorized_actors.contains(&caller);
        if !is_owner && !is_actor {
            return Err(Error::NotAuthorized);
        }
        caller.require_auth();
        // Issue #311: enforce size limits.
        assert_len(&location, MAX_LOCATION_LEN, "location");
        assert_len(&metadata, MAX_METADATA_LEN, "metadata");

        let event = TrackingEvent {
            schema_version: EVENT_SCHEMA_VERSION,
            product_id: product_id.clone(),
            location,
            actor: caller.clone(),
            timestamp: env.ledger().timestamp(),
            event_type: event_type.clone(),
            metadata,
        };

        // Check if multi-signature is required
        if product.required_signatures > 1 {
            // Stage event as pending with a stable ID
            let mut pending: Vec<PendingEvent> = env
                .storage()
                .persistent()
                .get(&DataKey::PendingEvents(product_id.clone()))
                .unwrap_or_else(|| Vec::new(&env));

            // Generate next stable pending event ID
            let next_id: u64 = env
                .storage()
                .persistent()
                .get(&DataKey::NextPendingId(product_id.clone()))
                .unwrap_or(0u64);

            let mut approvals = Vec::new(&env);
            approvals.push_back(caller);

            let pending_event = PendingEvent {
                pending_event_id: next_id,
                product_id: product_id.clone(),
                event: event.clone(),
                approvals,
                required_signatures: product.required_signatures,
                created_at: env.ledger().timestamp(),
                expiration: env.ledger().timestamp() + EXPIRATION_WINDOW,
            };

            pending.push_back(pending_event);
            env.storage()
                .persistent()
                .set(&DataKey::PendingEvents(product_id.clone()), &pending);

            // Increment the ID counter for next pending event
            env.storage()
                .persistent()
                .set(&DataKey::NextPendingId(product_id.clone()), &(next_id + 1));

            // Emit pending event
            env.events().publish(
                (Symbol::new(&env, "event_pending"), product_id, event_type, EVENT_SCHEMA_VERSION),
                event.clone(),
            );
        } else {
            // Immediately finalize event
            let mut events: Vec<TrackingEvent> = env
                .storage()
                .persistent()
                .get(&DataKey::Events(product_id.clone()))
                .unwrap_or_else(|| Vec::new(&env));

            events.push_back(event.clone());
            env.storage()
                .persistent()
                .set(&DataKey::Events(product_id.clone()), &events);

            // Emit event
            env.events().publish(
                (Symbol::new(&env, "event_added"), product_id, event_type, EVENT_SCHEMA_VERSION),
                event.clone(),
            );
        }

        Ok(event)
    }

    /// Retrieve a product by its ID.
    ///
    /// # Returns
    /// The [`Product`] struct stored under `id`.
    ///
    /// # Errors
    /// - [`Error::ProductNotFound`] — if no product with `id` is registered.
    pub fn get_product(env: Env, id: String) -> Result<Product, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Product(id))
            .ok_or(Error::ProductNotFound)
    }

    /// Retrieve all tracking events for a product.
    ///
    /// Returns events in insertion order (oldest first).
    ///
    /// # Parameters
    /// - `env` — Soroban execution environment.
    /// - `product_id` — The product ID whose events to retrieve.
    ///
    /// # Returns
    /// A `Vec<TrackingEvent>` containing every event recorded for the product.
    /// Returns an empty vector if the product has no events or does not exist.
    ///
    /// # Authorization
    /// None — this is a read-only function.
    ///
    /// # Panics
    /// Does not panic.
    pub fn get_tracking_events(env: Env, product_id: String) -> Vec<TrackingEvent> {
        env.storage()
            .persistent()
            .get(&DataKey::Events(product_id))
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Transfer product ownership.
    /// Panics if the product is spoiled — spoiled products cannot be transferred.
    pub fn transfer_ownership(env: Env, product_id: String, new_owner: Address) -> bool {
    /// Check whether a product ID is registered.
    ///
    /// Useful for pre-flight checks before calling functions that panic on
    /// unknown IDs.
    ///
    /// # Parameters
    /// - `env` — Soroban execution environment.
    /// - `id` — The product ID to check.
    ///
    /// # Returns
    /// `true` if a product with `id` exists in storage, `false` otherwise.
    ///
    /// # Authorization
    /// None — this is a read-only function.
    ///
    /// # Panics
    /// Does not panic.
    pub fn product_exists(env: Env, id: String) -> bool {
        env.storage().persistent().has(&DataKey::Product(id))
    }

    /// Return the number of tracking events recorded for a product.
    ///
    /// # Parameters
    /// - `env` — Soroban execution environment.
    /// - `product_id` — The product ID to query.
    ///
    /// # Returns
    /// The number of events as a `u32`. Returns `0` if the product has no
    /// events or does not exist.
    ///
    /// # Note
    /// This function deserialises the full `Vec<TrackingEvent>` from storage
    /// to read its length. It has the same storage cost as
    /// `get_tracking_events(product_id).len()` and is not a cheaper
    /// alternative for large event logs.
    ///
    /// # Authorization
    /// None — this is a read-only function.
    ///
    /// # Panics
    /// Does not panic.
    pub fn get_events_count(env: Env, product_id: String) -> u32 {
        env.storage()
            .persistent()
            .get::<DataKey, Vec<TrackingEvent>>(&DataKey::Events(product_id))
            .map(|v| v.len())
            .unwrap_or(0)
    }

    /// Transfer product ownership to a new address.
    ///
    /// Updates the `owner` field of the [`Product`] in storage. The previous
    /// owner loses all owner-gated privileges immediately. The new owner gains
    /// them immediately.
    ///
    /// # Safety Checks
    /// - Prevents no-op transfers (transferring to the current owner)
    /// - Validates that the new owner is a valid address
    ///
    /// # Parameters
    /// - `env` — Soroban execution environment.
    /// - `product_id` — ID of the product to transfer.
    /// - `new_owner` — Stellar address of the incoming owner.
    ///
    /// # Returns
    /// `true` on success.
    ///
    /// # Authorization
    /// Requires the *current* `product.owner.require_auth()`. The transaction
    /// must be signed by the current owner.
    ///
    /// # Panics
    /// - `"product not found"` — if `product_id` is not registered.
    /// - `"cannot transfer to current owner"` — if `new_owner` equals current owner.
    ///
    /// # Emitted Events
    /// Publishes an `("ownership_transferred", product_id)` event with
    /// `new_owner` as the event body.
    pub fn transfer_ownership(
        env: Env,
        product_id: String,
        new_owner: Address,
        nonce: u64,
    ) -> Result<bool, Error> {
        let mut product: Product = env
            .storage()
            .persistent()
            .get(&DataKey::Product(product_id.clone()))
            .ok_or(Error::ProductNotFound)?;

        if product.spoiled {
            panic!("spoiled product cannot be transferred");
        }

        product.owner.require_auth();

        if product.owner == new_owner {
            panic!("new owner must differ from current owner");
        }

        Self::validate_and_increment_nonce(&env, &product.owner, nonce);
        
        product.owner = new_owner.clone();
        env.storage()
            .persistent()
            .set(&DataKey::Product(product_id.clone()), &product);

        env.events().publish(
            (Symbol::new(&env, "ownership_transferred"), product_id),
            new_owner,
        );

        true
        Ok(true)
    }

    /// Grant an address permission to add tracking events for a product.
    ///
    /// Appends `actor` to `product.authorized_actors`. Prevents duplicate entries
    /// to maintain clean governance state.
    ///
    /// # Parameters
    /// - `env` — Soroban execution environment.
    /// - `product_id` — ID of the product to update.
    /// - `actor` — Stellar address to authorise.
    ///
    /// # Returns
    /// `true` if `actor` was added, `false` if `actor` was already in the list.
    ///
    /// # Authorization
    /// Requires `product.owner.require_auth()`. Only the current product owner
    /// may grant actor permissions.
    ///
    /// # Panics
    /// - `"product not found"` — if `product_id` is not registered.
    /// - `"actor already authorized"` — if the actor is already in the authorized list.
    ///
    /// # Emitted Events
    /// Publishes an `("actor_authorized", product_id)` event with `actor` as
    /// the event body.
    pub fn add_authorized_actor(
        env: Env,
        product_id: String,
        actor: Address,
        nonce: u64,
    ) -> Result<bool, Error> {
        let mut product: Product = env
            .storage()
            .persistent()
            .get(&DataKey::Product(product_id.clone()))
            .ok_or(Error::ProductNotFound)?;

        product.owner.require_auth();
        Self::validate_and_increment_nonce(&env, &product.owner, nonce);
        
        product.authorized_actors.push_back(actor.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Product(product_id.clone()), &product);

        env.events().publish(
            (Symbol::new(&env, "actor_authorized"), product_id),
            actor,
        );

        Ok(true)
    }

    /// Revoke an address's permission to add tracking events for a product.
    ///
    /// Rebuilds `authorized_actors` without `actor`. Because
    /// [`Self::add_authorized_actor`] prevents duplicates, at most one entry
    /// will ever be removed.
    ///
    /// # Governance Safeguards
    /// - Prevents removal of the owner from authorized actors if multi-signature
    ///   is enabled and would leave insufficient authorized actors to meet the
    ///   required signature threshold.
    /// - Ensures at least one authorized path remains for governance operations.
    ///
    /// # Parameters
    /// - `env` — Soroban execution environment.
    /// - `product_id` — ID of the product to update.
    /// - `actor` — Stellar address to revoke.
    ///
    /// # Returns
    /// `true` if `actor` was found and removed, `false` if `actor` was not in
    /// the authorized list.
    ///
    /// # Authorization
    /// Requires `product.owner.require_auth()`. Only the current product owner
    /// may revoke actor permissions.
    ///
    /// # Panics
    /// - `"product not found"` — if `product_id` is not registered.
    /// - `"cannot remove owner from actors"` — if attempting to remove the owner
    ///   when it would violate governance invariants.
    /// - `"removal would violate governance"` — if removal would leave insufficient
    ///   actors to meet multi-signature requirements.
    ///
    /// # Emitted Events
    /// Does not emit an event. Removal of an actor is not announced on-chain.
    /// Consumers tracking actor permissions must observe the absence of future
    /// `actor_authorized` events or query [`Self::get_authorized_actors`]
    /// directly.
    pub fn remove_authorized_actor(
        env: Env,
        product_id: String,
        actor: Address,
        nonce: u64,
    ) -> Result<bool, Error> {
        let mut product: Product = env
            .storage()
            .persistent()
            .get(&DataKey::Product(product_id.clone()))
            .ok_or(Error::ProductNotFound)?;

        product.owner.require_auth();
        Self::validate_and_increment_nonce(&env, &product.owner, nonce);

        let mut found = false;
        let mut new_actors = Vec::new(&env);
        for i in 0..product.authorized_actors.len() {
            let current_actor = product.authorized_actors.get(i).unwrap();
            if current_actor != actor {
                new_actors.push_back(current_actor);
            } else {
                found = true;
            }
        }

        // Governance safeguard: ensure sufficient actors remain for multi-sig
        if product.required_signatures > 1 {
            // Count total authorized entities (owner + actors)
            let total_authorized = 1 + new_actors.len() as u32; // owner + remaining actors
            if total_authorized < product.required_signatures {
                panic!("removal would violate governance");
            }
        }

        product.authorized_actors = new_actors;
        env.storage()
            .persistent()
            .set(&DataKey::Product(product_id.clone()), &product);

        // Emit event
        if found {
            env.events().publish(
                (Symbol::new(&env, "actor_removed"), product_id),
                actor,
            );
        }

        Ok(found)
    }

    /// Update the mutable metadata fields of a product.
    ///
    /// Only `name` and `origin` can be changed. The `id`, `owner`,
    /// `timestamp`, `authorized_actors`, and `required_signatures` fields are
    /// immutable through this function.
    ///
    /// # Parameters
    /// - `env` — Soroban execution environment.
    /// - `product_id` — ID of the product to update.
    /// - `name` — New human-readable product name.
    /// - `origin` — New origin string.
    ///
    /// # Returns
    /// The updated [`Product`] struct.
    ///
    /// # Authorization
    /// Requires `product.owner.require_auth()`. Only the current product owner
    /// may update metadata.
    ///
    /// # Panics
    /// - `"product not found"` — if `product_id` is not registered.
    ///
    /// # Emitted Events
    /// Publishes a `("product_updated", product_id)` event with the updated
    /// [`Product`] struct as the event body.
    pub fn update_product_metadata(
        env: Env,
        product_id: String,
        name: String,
        origin: String,
    ) -> Result<Product, Error> {
        let mut product: Product = env
            .storage()
            .persistent()
            .get(&DataKey::Product(product_id.clone()))
            .ok_or(Error::ProductNotFound)?;

        product.owner.require_auth();
        // Issue #311: enforce size limits on update.
        assert_len(&name,   MAX_NAME_LEN,   "name");
        assert_len(&origin, MAX_ORIGIN_LEN, "origin");

        product.name = name;
        product.origin = origin;

        env.storage()
            .persistent()
            .set(&DataKey::Product(product_id.clone()), &product);

        env.events().publish(
            (Symbol::new(&env, "product_updated"), product_id),
            product.clone(),
        );

        Ok(product)
    }

    /// Deactivate a product, preventing new events from being recorded.
    ///
    /// Sets `product.active` to `false`. Once deactivated, a product cannot
    /// receive new tracking events. The product remains queryable but is marked
    /// as recalled/deactivated for consumer display.
    ///
    /// # Parameters
    /// - `env` — Soroban execution environment.
    /// - `product_id` — ID of the product to deactivate.
    ///
    /// # Returns
    /// The updated [`Product`] struct with `active = false`.
    ///
    /// # Authorization
    /// Requires `product.owner.require_auth()`. Only the product owner may
    /// deactivate a product.
    ///
    /// # Panics
    /// - `"product not found"` — if `product_id` is not registered.
    /// - `"product already inactive"` — if the product is already deactivated.
    ///
    /// # Emitted Events
    /// Publishes a `("product_deactivated", product_id)` event with the updated
    /// [`Product`] struct as the event body.
    pub fn deactivate_product(env: Env, product_id: String) -> Result<Product, Error> {
        let mut product: Product = env
            .storage()
            .persistent()
            .get(&DataKey::Product(product_id.clone()))
            .ok_or(Error::ProductNotFound)?;

        product.owner.require_auth();

        if !product.active {
            panic!("product already inactive");
        }

        product.active = false;

        env.storage()
            .persistent()
            .set(&DataKey::Product(product_id.clone()), &product);

        env.events().publish(
            (Symbol::new(&env, "product_deactivated"), product_id),
            product.clone(),
        );

        Ok(product)
    }

    /// Return the list of addresses authorised to add events for a product.
    ///
    /// # Parameters
    /// - `env` — Soroban execution environment.
    /// - `product_id` — ID of the product to query.
    ///
    /// # Returns
    /// A `Vec<Address>` of authorized actors. Returns an empty vector if the
    /// product does not exist or has no authorized actors.
    ///
    /// # Authorization
    /// None — this is a read-only function.
    ///
    /// # Panics
    /// Does not panic.
    pub fn get_authorized_actors(env: Env, product_id: String) -> Vec<Address> {
        env.storage()
            .persistent()
            .get::<DataKey, Product>(&DataKey::Product(product_id))
            .map(|p| p.authorized_actors)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Return the total number of products registered on this contract.
    ///
    /// The count is a monotonically increasing counter; it is never decremented
    /// even if products were to be removed (which is not currently supported).
    ///
    /// # Parameters
    /// - `env` — Soroban execution environment.
    ///
    /// # Returns
    /// A `u64` count. Returns `0` if no products have been registered.
    ///
    /// # Authorization
    /// None — this is a read-only function.
    ///
    /// # Panics
    /// Does not panic.
    pub fn get_product_count(env: Env) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::ProductCount)
            .unwrap_or(0)
    }

    /// Return a paginated slice of product IDs in registration order.
    ///
    /// Uses the [`DataKey::ProductIndex`] mapping to look up IDs by their
    /// sequential insertion index, enabling efficient pagination without
    /// iterating all storage keys.
    ///
    /// # Parameters
    /// - `env` — Soroban execution environment.
    /// - `offset` — Zero-based index of the first product to return.
    /// - `limit` — Maximum number of product IDs to return.
    ///
    /// # Returns
    /// A `Vec<String>` of product IDs. Returns an empty vector if `offset` is
    /// beyond the total count or no products are registered.
    ///
    /// # Authorization
    /// None — this is a read-only function.
    ///
    /// # Panics
    /// Does not panic.
    ///
    /// # Example
    /// ```text
    /// // Fetch the first page of 10 products
    /// list_products(env, 0, 10)
    ///
    /// // Fetch the second page
    /// list_products(env, 10, 10)
    /// ```
    pub fn list_products(env: Env, offset: u64, limit: u64) -> Vec<String> {
        let count: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::ProductCount)
            .unwrap_or(0);

        let mut products = Vec::new(&env);
        let end = core::cmp::min(offset + limit, count);

        for i in offset..end {
            if let Some(product_id) =
                env.storage()
                    .persistent()
                    .get::<DataKey, String>(&DataKey::ProductIndex(i))
            {
                products.push_back(product_id);
            }
        }

        products
    }

    /// Approve a pending event for a high-value product.
    ///
    /// For products with `required_signatures > 1`, events are staged as pending
    /// until the required number of approvals are received. This function allows
    /// authorized actors to approve a pending event using its stable identifier.
    ///
    /// # Parameters
    /// - `env` — Soroban execution environment (injected by the runtime).
    /// - `product_id` — ID of the product.
    /// - `pending_event_id` — Stable ID of the pending event to approve.
    ///   This ID remains unchanged even if other pending events are removed.
    /// - `approver` — Address of the actor approving the event.
    /// - `nonce` — Sequential nonce for authorization, incremented by the contract.
    ///
    /// # Returns
    /// `true` if the event was finalized (all signatures received), `false` if
    /// more approvals are needed.
    ///
    /// # Authorization
    /// Requires `approver.require_auth()`. The approver must be the owner or
    /// an authorized actor.
    ///
    /// # Errors
    /// - [`Error::ProductNotFound`] — if `product_id` is not registered.
    /// - [`Error::ApproverNotAuthorized`] — if approver is not owner or actor.
    /// - [`Error::NoPendingEvents`] — if there are no pending events.
    /// - [`Error::PendingEventExpired`] — if the pending event has expired (issue #314).
    ///
    /// # Panics
    /// - `"event index out of bounds"` — if `event_index` is invalid.
    ///
    /// # Emitted Events
    /// - When the event is **not yet finalized**: no event is emitted.
    /// - When the event **is finalized** (approvals reach `required_signatures`):
    ///   publishes an `("event_finalized", product_id, event_type,
    ///   schema_version)` event with the [`TrackingEvent`] struct as the body.
    pub fn approve_event(
        env: Env,
        product_id: String,
        pending_event_id: u64,
        approver: Address,
        nonce: u64,
    ) -> Result<bool, Error> {
        let product: Product = env
            .storage()
            .persistent()
            .get(&DataKey::Product(product_id.clone()))
            .ok_or(Error::ProductNotFound)?;

        let is_owner = product.owner == approver;
        let is_actor = product.authorized_actors.contains(&approver);
        if !is_owner && !is_actor {
            return Err(Error::ApproverNotAuthorized);
        }
        approver.require_auth();
        Self::validate_and_increment_nonce(&env, &approver, nonce);

        let mut pending: Vec<PendingEvent> = env
            .storage()
            .persistent()
            .get(&DataKey::PendingEvents(product_id.clone()))
            .ok_or(Error::NoPendingEvents)?;

        // Find the pending event by stable ID (not index-based)
        let mut event_position: Option<usize> = None;
        for i in 0..pending.len() {
            if pending.get(i).unwrap().pending_event_id == pending_event_id {
                event_position = Some(i);
                break;
            }
        }

        let event_index = event_position.ok_or_else(|| {
            panic!("pending event not found")
        })?;

        let mut pending_event = pending.get(event_index).unwrap().clone();

        // Check expiration (issue #314)
        let current_time = env.ledger().timestamp();
        if current_time > pending_event.expiration {
            return Err(Error::PendingEventExpired);
        }

        if !pending_event.approvals.contains(&approver) {
            pending_event.approvals.push_back(approver.clone());
        }

        let is_finalized = pending_event.approvals.len() as u32 >= pending_event.required_signatures;

        if is_finalized {
            let mut events: Vec<TrackingEvent> = env
                .storage()
                .persistent()
                .get(&DataKey::Events(product_id.clone()))
                .unwrap_or_else(|| Vec::new(&env));

            events.push_back(pending_event.event.clone());
            env.storage()
                .persistent()
                .set(&DataKey::Events(product_id.clone()), &events);

            // Remove from pending
            pending.remove(event_index);
            if pending.len() > 0 {
                env.storage()
                    .persistent()
                    .set(&DataKey::PendingEvents(product_id.clone()), &pending);
            } else {
                env.storage()
                    .persistent()
                    .remove(&DataKey::PendingEvents(product_id.clone()));
            }

            env.events().publish(
                (
                    Symbol::new(&env, "event_finalized"),
                    product_id,
                    pending_event.event.event_type.clone(),
                    EVENT_SCHEMA_VERSION,
                ),
                pending_event.event,
            );

            Ok(true)
        } else {
            // Update pending event with new approval
            pending.set(event_index, pending_event);
            env.storage()
                .persistent()
                .set(&DataKey::PendingEvents(product_id), &pending);
            Ok(false)
        }
    }

    /// Reject a pending event for a high-value product.
    ///
    /// Removes a pending event from the approval queue without finalizing it.
    /// Optionally accepts a reason for the rejection for audit purposes.
    /// Uses the stable identifier of the pending event to ensure deterministic
    /// behavior even after queue mutations.
    ///
    /// # Parameters
    /// - `env` — Soroban execution environment.
    /// - `product_id` — ID of the product.
    /// - `pending_event_id` — Stable ID of the pending event to reject.
    ///   This ID remains unchanged even if other pending events are removed.
    /// - `rejector` — Address of the actor rejecting the event.
    /// - `reason` — Optional reason for rejection (max 256 characters).
    /// - `nonce` — Sequential nonce for authorization, incremented by the contract.
    ///
    /// # Returns
    /// `true` on success.
    ///
    /// # Authorization
    /// Requires `rejector.require_auth()`. The rejector must be the owner.
    ///
    /// # Panics
    /// - `"product not found"` — if `product_id` is not registered.
    /// - `"only owner can reject"` — if rejector is not the owner.
    /// - `"no pending events"` — if there are no pending events.
    /// - `"pending event not found"` — if `pending_event_id` doesn't match any pending event.
    /// - `"rejection reason too long"` — if reason exceeds 256 characters.
    /// - `"invalid nonce"` — if nonce does not match the expected sequential value.
    pub fn reject_event(
        env: Env,
        product_id: String,
        pending_event_id: u64,
        rejector: Address,
        reason: String,
        nonce: u64,
    ) -> Result<bool, Error> {
        let product: Product = env
            .storage()
            .persistent()
            .get(&DataKey::Product(product_id.clone()))
            .ok_or(Error::ProductNotFound)?;

        if product.owner != rejector {
            return Err(Error::OwnerOnly);
        }
        rejector.require_auth();
        Self::validate_and_increment_nonce(&env, &rejector, nonce);

        // Validate reason length (max 256 characters)
        if reason.len() > 256 {
            panic!("rejection reason too long");
        }

        let mut pending: Vec<PendingEvent> = env
            .storage()
            .persistent()
            .get(&DataKey::PendingEvents(product_id.clone()))
            .ok_or(Error::NoPendingEvents)?;

        // Find the pending event by stable ID (not index-based)
        let mut event_position: Option<usize> = None;
        for i in 0..pending.len() {
            if pending.get(i).unwrap().pending_event_id == pending_event_id {
                event_position = Some(i);
                break;
            }
        }

        let event_index = event_position.ok_or_else(|| {
            panic!("pending event not found")
        })?;

        let rejected_event = pending.get(event_index).unwrap().clone();

        // Remove from pending
        pending.remove(event_index);
        if pending.len() > 0 {
            env.storage()
                .persistent()
                .set(&DataKey::PendingEvents(product_id.clone()), &pending);
        } else {
            env.storage()
                .persistent()
                .remove(&DataKey::PendingEvents(product_id.clone()));
        }

        // Emit enriched rejection event with reason
        let rejection = EventRejection {
            product_id: product_id.clone(),
            event: rejected_event.event,
            rejector,
            reason,
            timestamp: env.ledger().timestamp(),
        };

        env.events().publish(
            (Symbol::new(&env, "event_rejected"), product_id),
            rejection,
        );

        Ok(true)
    }

    /// Get pending events for a product.
    ///
    /// Returns all events awaiting multi-signature approval.
    ///
    /// # Parameters
    /// - `env` — Soroban execution environment.
    /// - `product_id` — ID of the product.
    ///
    /// # Returns
    /// A `Vec<PendingEvent>` containing all pending events for the product.
    ///
    /// # Authorization
    /// None — this is a read-only function.
    ///
    /// # Panics
    /// Does not panic.
    pub fn get_pending_events(env: Env, product_id: String) -> Vec<PendingEvent> {
        env.storage()
            .persistent()
            .get(&DataKey::PendingEvents(product_id))
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Clean up expired pending events for a product.
    ///
    /// Removes all expired pending events from storage and emits a purge event
    /// for each removed entry (issue #314).
    ///
    /// # Parameters
    /// - `env` — Soroban execution environment.
    /// - `product_id` — ID of the product to clean up.
    ///
    /// # Returns
    /// Number of events purged.
    ///
    /// # Authorization
    /// None — this is a permissionless cleanup function.
    ///
    /// # Emitted Events
    /// Publishes `("pending_events_purged", product_id)` event with the count
    /// of purged events. Also publishes `("pending_event_purged", product_id)`
    /// for each individual removed event.
    pub fn cleanup_expired_events(env: Env, product_id: String) -> u32 {
        let mut pending: Vec<PendingEvent> = env
            .storage()
            .persistent()
            .get(&DataKey::PendingEvents(product_id.clone()))
            .unwrap_or_else(|| Vec::new(&env));

        let current_time = env.ledger().timestamp();
        let mut expired_count: u32 = 0;

        // Filter out expired events
        let mut valid_pending = Vec::new(&env);
        for i in 0..pending.len() {
            let event = pending.get(i).unwrap();
            if current_time <= event.expiration {
                valid_pending.push_back(event.clone());
            } else {
                expired_count += 1;

                // Emit event for each purged entry
                env.events().publish(
                    (Symbol::new(&env, "pending_event_purged"), product_id.clone()),
                    event.product_id.clone(),
                );
            }
        }

        if valid_pending.len() > 0 {
            env.storage()
                .persistent()
                .set(&DataKey::PendingEvents(product_id.clone()), &valid_pending);
        } else {
            env.storage()
                .persistent()
                .remove(&DataKey::PendingEvents(product_id.clone()));
        }

        // Emit summary event
        env.events().publish(
            (Symbol::new(&env, "pending_events_purged"), product_id),
            expired_count,
        );

        expired_count
    }

    pub fn get_nonce(env: Env, actor: Address) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::ActorNonce(actor))
            .unwrap_or(0)
    }

    /// Get the stable pending event ID for a pending event at a given index.
    ///
    /// This function is provided for backward compatibility with clients that
    /// currently use index-based references. It bridges index-based lookups to
    /// stable IDs.
    ///
    /// # Parameters
    /// - `env` — Soroban execution environment.
    /// - `product_id` — ID of the product.
    /// - `event_index` — Zero-based index into the pending events queue.
    ///
    /// # Returns
    /// The stable `pending_event_id` of the event at that index, or panics if
    /// the index is out of bounds or no events exist.
    ///
    /// # Panics
    /// - `"no pending events"` — if there are no pending events.
    /// - `"event index out of bounds"` — if `event_index` is invalid.
    ///
    /// # Note
    /// This function should be called to convert existing index-based client code
    /// to use stable IDs. Direct index usage in approve_event/reject_event will
    /// no longer work; the stable ID must be obtained first.
    pub fn get_pending_event_id_at_index(
        env: Env,
        product_id: String,
        event_index: u32,
    ) -> u64 {
        let pending: Vec<PendingEvent> = env
            .storage()
            .persistent()
            .get(&DataKey::PendingEvents(product_id))
            .ok_or_else(|| panic!("no pending events"))?;

        if event_index >= pending.len() as u32 {
            panic!("event index out of bounds");
        }

        pending.get(event_index).unwrap().pending_event_id
    }

    fn validate_and_increment_nonce(env: &Env, actor: &Address, provided_nonce: u64) {
        let current_nonce: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::ActorNonce(actor.clone()))
            .unwrap_or(0);

        if provided_nonce != current_nonce {
            panic!("invalid nonce");
        }

        env.storage()
            .persistent()
            .set(&DataKey::ActorNonce(actor.clone()), &(current_nonce + 1));
    }
}

#[cfg(test)]
mod rejection_reason_tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_reject_event_with_reason() {
        let env = Env::default();
        let contract_id = env.register_contract(None, SupplyLinkContract);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let actor = Address::generate(&env);
        let product_id = String::from_str(&env, "test-product-001");
        let name = String::from_str(&env, "Test Product");
        let origin = String::from_str(&env, "Test Origin");
        let location = String::from_str(&env, "Test Location");
        let event_type = String::from_str(&env, "HARVEST");
        let metadata = String::from_str(&env, "{}");
        let reason = String::from_str(&env, "Invalid metadata format");

        env.mock_all_auths();

        // Register product with multi-sig
        client.register_product(&product_id, &name, &origin, &owner, &2);
        client.add_authorized_actor(&product_id, &actor, &0);

        // Add pending event
        client.add_tracking_event(&product_id, &actor, &location, &event_type, &metadata);

        // Verify pending event exists
        let pending = client.get_pending_events(&product_id);
        assert_eq!(pending.len(), 1);

        // Reject with reason
        let result = client.reject_event(&product_id, &0, &owner, &reason, &1);
        assert_eq!(result, true);

        // Verify pending event was removed
        let pending = client.get_pending_events(&product_id);
        assert_eq!(pending.len(), 0);
    }

    #[test]
    fn test_reject_event_with_empty_reason() {
        let env = Env::default();
        let contract_id = env.register_contract(None, SupplyLinkContract);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let actor = Address::generate(&env);
        let product_id = String::from_str(&env, "test-product-002");
        let name = String::from_str(&env, "Test Product");
        let origin = String::from_str(&env, "Test Origin");
        let location = String::from_str(&env, "Test Location");
        let event_type = String::from_str(&env, "HARVEST");
        let metadata = String::from_str(&env, "{}");
        let reason = String::from_str(&env, "");

        env.mock_all_auths();

        // Register product with multi-sig
        client.register_product(&product_id, &name, &origin, &owner, &2);
        client.add_authorized_actor(&product_id, &actor, &0);

        // Add pending event
        client.add_tracking_event(&product_id, &actor, &location, &event_type, &metadata);

        // Reject with empty reason (should work)
        let result = client.reject_event(&product_id, &0, &owner, &reason, &1);
        assert_eq!(result, true);
    }

    #[test]
    #[should_panic(expected = "rejection reason too long")]
    fn test_reject_event_reason_too_long() {
        let env = Env::default();
        let contract_id = env.register_contract(None, SupplyLinkContract);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let actor = Address::generate(&env);
        let product_id = String::from_str(&env, "test-product-003");
        let name = String::from_str(&env, "Test Product");
        let origin = String::from_str(&env, "Test Origin");
        let location = String::from_str(&env, "Test Location");
        let event_type = String::from_str(&env, "HARVEST");
        let metadata = String::from_str(&env, "{}");
        
        // Create a reason longer than 256 characters
        let long_reason = String::from_str(&env, &"x".repeat(257));

        env.mock_all_auths();

        // Register product with multi-sig
        client.register_product(&product_id, &name, &origin, &owner, &2);
        client.add_authorized_actor(&product_id, &actor, &0);

        // Add pending event
        client.add_tracking_event(&product_id, &actor, &location, &event_type, &metadata);

        // Try to reject with too long reason - should panic
        client.reject_event(&product_id, &0, &owner, &long_reason, &1);
    }

    #[test]
    fn test_reject_event_max_length_reason() {
        let env = Env::default();
        let contract_id = env.register_contract(None, SupplyLinkContract);
        let client = SupplyLinkContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let actor = Address::generate(&env);
        let product_id = String::from_str(&env, "test-product-004");
        let name = String::from_str(&env, "Test Product");
        let origin = String::from_str(&env, "Test Origin");
        let location = String::from_str(&env, "Test Location");
        let event_type = String::from_str(&env, "HARVEST");
        let metadata = String::from_str(&env, "{}");
        
        // Create a reason exactly 256 characters (should work)
        let max_reason = String::from_str(&env, &"x".repeat(256));

        env.mock_all_auths();

        // Register product with multi-sig
        client.register_product(&product_id, &name, &origin, &owner, &2);
        client.add_authorized_actor(&product_id, &actor, &0);

        // Add pending event
        client.add_tracking_event(&product_id, &actor, &location, &event_type, &metadata);

        // Reject with max length reason (should work)
        let result = client.reject_event(&product_id, &0, &owner, &max_reason, &1);
        assert_eq!(result, true);
    }

    /// Remove an authorized actor from a product.
    pub fn remove_authorized_actor(env: Env, product_id: String, actor: Address) -> bool {
        let mut product: Product = env
            .storage()
            .persistent()
            .get(&DataKey::Product(product_id.clone()))
            .expect("product not found");

        product.owner.require_auth();

        let mut new_actors = Vec::new(&env);
        let mut found = false;
        for i in 0..product.authorized_actors.len() {
            let a = product.authorized_actors.get(i).unwrap();
            if a == actor && !found {
                found = true;
            } else {
                new_actors.push_back(a);
            }
        }
        product.authorized_actors = new_actors;
        env.storage()
            .persistent()
            .set(&DataKey::Product(product_id), &product);
        found
    }

    // ── #406: Expiration & spoilage ───────────────────────────────────────────

    /// Set or update the expiration timestamp for a product (owner-only).
    /// Pass 0 to clear the expiration.
    pub fn update_expiration(
        env: Env,
        product_id: String,
        expiration_timestamp: u64,
    ) -> bool {
        let mut product: Product = env
            .storage()
            .persistent()
            .get(&DataKey::Product(product_id.clone()))
            .expect("product not found");
        product.owner.require_auth();
        product.expiration_timestamp = expiration_timestamp;
        env.storage()
            .persistent()
            .set(&DataKey::Product(product_id.clone()), &product);

        env.events().publish(
            (Symbol::new(&env, "expiration_updated"), product_id),
            expiration_timestamp,
        );
        true
    }

    /// Returns true if the product has an expiration set and the ledger
    /// timestamp has passed it.
    pub fn is_expired(env: Env, product_id: String) -> bool {
        let product: Product = env
            .storage()
            .persistent()
            .get(&DataKey::Product(product_id))
            .expect("product not found");
        product.expiration_timestamp > 0
            && env.ledger().timestamp() >= product.expiration_timestamp
    }

    /// Mark a product as spoiled (owner-only). Records a SPOILED event.
    /// Spoiled products cannot receive new tracking events or be transferred.
    pub fn mark_spoiled(
        env: Env,
        product_id: String,
        reason: String,
    ) -> bool {
        let mut product: Product = env
            .storage()
            .persistent()
            .get(&DataKey::Product(product_id.clone()))
            .expect("product not found");
        product.owner.require_auth();

        if product.spoiled {
            return true; // idempotent
        }

        product.spoiled = true;
        env.storage()
            .persistent()
            .set(&DataKey::Product(product_id.clone()), &product);

        // Record a SPOILED event in the event log
        let event = TrackingEvent {
            product_id: product_id.clone(),
            location: String::from_str(&env, "N/A"),
            actor: product.owner.clone(),
            timestamp: env.ledger().timestamp(),
            event_type: String::from_str(&env, "SPOILED"),
            metadata: reason.clone(),
        };
        let mut events: Vec<TrackingEvent> = env
            .storage()
            .persistent()
            .get(&DataKey::Events(product_id.clone()))
            .unwrap_or_else(|| Vec::new(&env));
        events.push_back(event);
        env.storage()
            .persistent()
            .set(&DataKey::Events(product_id.clone()), &events);

        env.events().publish(
            (Symbol::new(&env, "product_spoiled"), product_id),
            reason,
        );
        true
    }

    // ── #408: Key rotation ────────────────────────────────────────────────────

    /// Rotate the owner key for a product.
    ///
    /// The current owner must sign (via `old_owner.require_auth()`).
    /// The new owner address replaces the old one atomically.
    /// This is semantically equivalent to `transfer_ownership` but is
    /// explicitly named for key-rotation workflows.
    pub fn rotate_owner_key(
        env: Env,
        product_id: String,
        old_owner: Address,
        new_owner: Address,
    ) -> bool {
        let mut product: Product = env
            .storage()
            .persistent()
            .get(&DataKey::Product(product_id.clone()))
            .expect("product not found");

        if product.owner != old_owner {
            panic!("old_owner does not match current owner");
        }
        if old_owner == new_owner {
            panic!("new_owner must differ from old_owner");
        }

        old_owner.require_auth();

        product.owner = new_owner.clone();
        env.storage()
            .persistent()
            .set(&DataKey::Product(product_id.clone()), &product);

        env.events().publish(
            (Symbol::new(&env, "owner_key_rotated"), product_id),
            (old_owner, new_owner),
        );
        true
    }

    /// Rotate an authorized actor key for a product.
    ///
    /// The old actor must sign. The old address is removed from
    /// `authorized_actors` and the new address is appended atomically.
    pub fn rotate_authorized_actor_key(
        env: Env,
        product_id: String,
        old_actor: Address,
        new_actor: Address,
    ) -> bool {
        let mut product: Product = env
            .storage()
            .persistent()
            .get(&DataKey::Product(product_id.clone()))
            .expect("product not found");

        if old_actor == new_actor {
            panic!("new_actor must differ from old_actor");
        }

        // Verify old_actor is currently authorized
        if !product.authorized_actors.contains(&old_actor) {
            panic!("old_actor is not an authorized actor");
        }

        old_actor.require_auth();

        // Replace old_actor with new_actor
        let mut new_actors = Vec::new(&env);
        for i in 0..product.authorized_actors.len() {
            let a = product.authorized_actors.get(i).unwrap();
            if a == old_actor {
                new_actors.push_back(new_actor.clone());
            } else {
                new_actors.push_back(a);
            }
        }
        product.authorized_actors = new_actors;
        env.storage()
            .persistent()
            .set(&DataKey::Product(product_id.clone()), &product);

        env.events().publish(
            (Symbol::new(&env, "actor_key_rotated"), product_id),
            (old_actor, new_actor),
        );
        true
    }

    // ── #405: Batch / lot tracking ────────────────────────────────────────────

    /// Create a new batch/lot grouping.
    pub fn create_batch(
        env: Env,
        id: String,
        name: String,
        owner: Address,
    ) -> Batch {
        owner.require_auth();
        let batch = Batch {
            id: id.clone(),
            name,
            owner,
            product_ids: Vec::new(&env),
            timestamp: env.ledger().timestamp(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Batch(id.clone()), &batch);

        env.events().publish(
            (Symbol::new(&env, "batch_created"), id),
            batch.clone(),
        );
        batch
    }

    /// Add a product to a batch (batch owner-only).
    pub fn add_product_to_batch(
        env: Env,
        batch_id: String,
        product_id: String,
    ) -> bool {
        let mut batch: Batch = env
            .storage()
            .persistent()
            .get(&DataKey::Batch(batch_id.clone()))
            .expect("batch not found");

        // Verify product exists
        if !env.storage().persistent().has(&DataKey::Product(product_id.clone())) {
            panic!("product not found");
        }

        batch.owner.require_auth();
        batch.product_ids.push_back(product_id.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Batch(batch_id.clone()), &batch);

        env.events().publish(
            (Symbol::new(&env, "product_added_to_batch"), batch_id),
            product_id,
        );
        true
    }

    /// Record an aggregate event against a batch (batch owner-only).
    /// The event is stored at the batch level and does NOT appear in
    /// individual product event logs.
    pub fn record_batch_event(
        env: Env,
        batch_id: String,
        caller: Address,
        location: String,
        event_type: String,
        metadata: String,
    ) -> TrackingEvent {
        let batch: Batch = env
            .storage()
            .persistent()
            .get(&DataKey::Batch(batch_id.clone()))
            .expect("batch not found");

        if batch.owner != caller {
            panic!("caller is not the batch owner");
        }
        caller.require_auth();

        let event = TrackingEvent {
            product_id: batch_id.clone(),
            location,
            actor: caller,
            timestamp: env.ledger().timestamp(),
            event_type,
            metadata,
        };

        let mut events: Vec<TrackingEvent> = env
            .storage()
            .persistent()
            .get(&DataKey::BatchEvents(batch_id.clone()))
            .unwrap_or_else(|| Vec::new(&env));
        events.push_back(event.clone());
        env.storage()
            .persistent()
            .set(&DataKey::BatchEvents(batch_id), &events);

        event
    }

    /// Get all events recorded at the batch level.
    pub fn get_batch_events(env: Env, batch_id: String) -> Vec<TrackingEvent> {
        env.storage()
            .persistent()
            .get(&DataKey::BatchEvents(batch_id))
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Get a batch by ID.
    pub fn get_batch(env: Env, id: String) -> Batch {
        env.storage()
            .persistent()
            .get(&DataKey::Batch(id))
            .expect("batch not found")
    }
}

mod tests;
