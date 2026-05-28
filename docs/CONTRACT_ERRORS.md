# Contract Error Codes

Supply-Link uses a `#[contracterror]` enum to expose stable, machine-readable error codes from the Soroban smart contract. Clients should map these numeric codes to localised messages rather than matching on strings.

## Error Catalog

| Code | Rust Variant | TS Key | HTTP Status | Trigger |
|------|-------------|--------|-------------|---------|
| `1` | `Error::ProductNotFound` | `PRODUCT_NOT_FOUND` | 404 | Product ID not registered on-chain |
| `2` | `Error::NotAuthorized` | `NOT_AUTHORIZED` | 403 | Caller is not the owner or an authorized actor |
| `3` | `Error::ApproverNotAuthorized` | `APPROVER_NOT_AUTHORIZED` | 403 | Approver is not the owner or an authorized actor |
| `4` | `Error::OwnerOnly` | `OWNER_ONLY` | 403 | Action requires the product owner; a non-owner attempted it |
| `5` | `Error::NoPendingEvents` | `NO_PENDING_EVENTS` | 404 | No pending events exist in the approval queue |
| `6` | `Error::EventIndexOutOfBounds` | `EVENT_INDEX_OUT_OF_BOUNDS` | 400 | Supplied event index exceeds the pending-events queue length |

## Functions That Can Return Each Error

| Function | Possible Error Codes |
|----------|---------------------|
| `get_product` | `1` |
| `add_tracking_event` | `1`, `2` |
| `transfer_ownership` | `1` |
| `add_authorized_actor` | `1` |
| `remove_authorized_actor` | `1` |
| `update_product_metadata` | `1` |
| `approve_event` | `1`, `3`, `5`, `6` |
| `reject_event` | `1`, `4`, `5`, `6` |
| `register_product` | _(none — panics only on auth failure, which is a host error)_ |
| `product_exists`, `get_tracking_events`, `get_events_count`, `get_authorized_actors`, `get_product_count`, `list_products`, `get_pending_events` | _(none — read-only, never error)_ |

## How Errors Are Encoded

Soroban encodes `#[contracterror]` variants as `ScError::Contract(u32)` in the invocation result. The numeric discriminant is the stable identifier — it will not change across contract upgrades.

When using `@stellar/stellar-sdk`, a failed invocation throws an object that contains the error code. Use `extractContractErrorCode` from `lib/stellar/contract-errors.ts` to extract it:

```ts
import { mapContractError } from "@/lib/stellar/contract-errors";

try {
  await client.get_product({ id: productId });
} catch (err) {
  const mapped = mapContractError(err);
  if (mapped) {
    // mapped.code    → 1
    // mapped.key     → "PRODUCT_NOT_FOUND"
    // mapped.message → "The requested product does not exist on-chain."
    // mapped.httpStatus → 404
    return NextResponse.json({ error: mapped.key }, { status: mapped.httpStatus });
  }
  throw err; // re-throw unexpected errors
}
```

## Recommended Client Behaviour

| Code | Recommended Action |
|------|--------------------|
| `1` (ProductNotFound) | Show "Product not found" UI state; do not retry |
| `2` (NotAuthorized) | Prompt user to connect the correct wallet; do not retry |
| `3` (ApproverNotAuthorized) | Inform user they are not an authorized approver |
| `4` (OwnerOnly) | Inform user only the product owner can perform this action |
| `5` (NoPendingEvents) | Refresh the pending-events list; the queue may have been cleared |
| `6` (EventIndexOutOfBounds) | Refresh the pending-events list; the index is stale |

## Internationalisation

The `message` field in `MappedContractError` is a default English fallback. In the UI, use `mapped.key` as the i18n lookup key:

```ts
// messages/en.json
{
  "contractErrors": {
    "PRODUCT_NOT_FOUND": "Product not found.",
    "NOT_AUTHORIZED": "You are not authorised to perform this action.",
    ...
  }
}
```

## Adding New Error Codes

1. Add a new variant to the `Error` enum in `smart-contract/contracts/src/lib.rs` with the next sequential `u32` discriminant.
2. Add the corresponding entry to `ContractErrorCode` and `ERROR_MAP` in `frontend/lib/stellar/contract-errors.ts`.
3. Add a row to the catalog table above.
4. Add a test in `frontend/lib/__tests__/contract-errors.test.ts` and a Rust test in `smart-contract/contracts/src/lib.rs`.

**Never reuse or renumber existing discriminants.** Existing on-chain transactions and client code depend on the stability of these values.
