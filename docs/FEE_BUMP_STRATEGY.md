# Stellar Fee-Bump Strategy

## Overview

Supply-Link uses Stellar's fee-bump transaction mechanism to enable **gasless verification** for consumers. This removes the barrier of requiring XLM to verify products on the blockchain.

## How It Works

1. **User initiates verification** (no wallet required)
2. **Frontend creates a transaction** to read product data from the contract
3. **Transaction is sent to `/api/v1/fee-bump`** endpoint
4. **Backend wraps it in a fee-bump transaction** signed by the app's account
5. **Fee-bump transaction is submitted** to Stellar network
6. **App pays the fees** (~200 stroops, ~$0.00002)

## Cost Implications

| Operation | Fee (stroops) | Fee (XLM) | Cost (USD) |
|-----------|---------------|-----------|-----------|
| Base operation | 100 | 0.00001 | $0.000001 |
| Fee-bump overhead | 100 | 0.00001 | $0.000001 |
| **Total per verification** | **200** | **0.00002** | **~$0.000002** |

At 1 million verifications per month:
- **Total cost**: ~$0.002 (negligible)
- **Stellar network cost**: ~$0.002
- **No additional infrastructure cost**

## Implementation Details

### Fee-Bump Account Setup

1. Create a dedicated Stellar account for fee-bumping:
   ```bash
   stellar keys generate fee-bump-account
   ```

2. Fund it with XLM (testnet: use friendbot; mainnet: purchase XLM)

3. Set `STELLAR_FEE_BUMP_SECRET` environment variable:
   ```bash
   export STELLAR_FEE_BUMP_SECRET="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
   ```

### API Endpoint

**POST `/api/v1/fee-bump`**

Request:
```json
{
  "innerTx": "AAAAAgAAAABgSJlAAAAAAAAAAAEAAAABAAAA..."
}
```

Response:
```json
{
  "feeBumpTx": "AAAAAgAAAABgSJlAAAAAAAAAAAEAAAABAAAA...",
  "cost": "200",
  "message": "Fee-bump transaction created. Ready to submit to Stellar network."
}
```

### Client-Side Usage

```typescript
import { createFeeBumpTransaction } from "@/lib/stellar/feeBump";

// Build a read-only transaction
const tx = new TransactionBuilder(...)
  .addOperation(Operation.invokeHostFunction(...))
  .build();

// Wrap in fee-bump
const feeBumpResponse = await createFeeBumpTransaction(tx.toXDR());

// Submit to network
await submitTransaction(feeBumpResponse.feeBumpTx);
```

## Security Considerations

1. **Fee-bump account is read-only**: It can only pay fees, not modify contract state
2. **Rate limiting**: Implement rate limiting on `/api/v1/fee-bump` to prevent abuse
3. **Verification-only**: Fee-bumping is applied only to read operations (verification)
4. **Write operations**: Producers must have XLM to register products or add events

## Future Enhancements

- [ ] Implement rate limiting per IP/user
- [ ] Add metrics tracking for fee-bump usage
- [ ] Support fee-bump for write operations (with approval flow)
- [ ] Implement fee-bump account rotation for security
