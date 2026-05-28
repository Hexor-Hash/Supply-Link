/**
 * frontend/lib/stellar/contract.ts
 *
 * Paginated event query wrapper and provenance filtering (#388).
 * All contract calls are stubs — replace with real Soroban SDK invocations.
 */

import type { TrackingEvent, EventType, EventFilter, EventPage, AuthPolicy } from "@/lib/types";
import { MOCK_EVENTS } from "@/lib/mock/products";

const DEFAULT_PAGE_SIZE = 20;

// ── Paginated event fetching ──────────────────────────────────────────────────

/**
 * Fetch a page of tracking events for a product from the contract.
 * Applies client-side filtering for event metadata fields that cannot be
 * filtered on-chain within Soroban's constraints.
 */
export async function fetchEventPage(
  productId: string,
  offset: number,
  limit: number = DEFAULT_PAGE_SIZE,
  filter?: EventFilter
): Promise<EventPage> {
  // TODO: replace with real Soroban RPC call to list_tracking_events(productId, offset, limit)
  await new Promise((r) => setTimeout(r, 300));

  // Simulate contract returning a page of raw events
  const allForProduct = MOCK_EVENTS.filter((e) => e.productId === productId);
  const total = allForProduct.length;
  const rawPage = allForProduct.slice(offset, offset + limit);

  // Apply client-side filters (event_type, actor, date range)
  const filtered = applyFilter(rawPage, filter);

  return { events: filtered, total, offset, limit };
}

/**
 * Fetch ALL events for a product across multiple pages, applying filters.
 * Use for provenance path reconstruction and audit exports.
 */
export async function fetchAllEvents(
  productId: string,
  filter?: EventFilter,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<TrackingEvent[]> {
  const first = await fetchEventPage(productId, 0, pageSize, filter);
  const total = first.total;
  const results: TrackingEvent[] = [...first.events];

  for (let offset = pageSize; offset < total; offset += pageSize) {
    const page = await fetchEventPage(productId, offset, pageSize, filter);
    results.push(...page.events);
  }

  return results;
}

/**
 * Reconstruct the provenance path for a product — ordered list of events
 * representing the full supply chain journey.
 */
export async function fetchProvenancePath(productId: string): Promise<TrackingEvent[]> {
  const events = await fetchAllEvents(productId);
  // Sort by timestamp ascending (oldest first = origin → consumer)
  return [...events].sort((a, b) => a.timestamp - b.timestamp);
}

// ── Authorization policy ──────────────────────────────────────────────────────
import {
  Contract,
  rpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Address,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk';
import { signTransaction } from './client';
import { NETWORK_PASSPHRASE, RPC_URL, CONTRACT_ID, getNetwork } from './client';
import { withContractRetry, withContractWriteRetry } from '@/lib/resilience';
import { recordDependency, recordOperation } from '@/lib/api/metrics';

const server = new rpc.Server(RPC_URL);

interface ContractInvocationParams {
  method: string;
  args: any[];
  callerAddress: string;
}

async function buildAndSimulateTransaction(
  params: ContractInvocationParams,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const account = await server.getAccount(params.callerAddress);
  const contract = new Contract(CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(params.method, ...params.args.map((arg) => nativeToScVal(arg))))
    .setTimeout(30)
    .build();

  return server.simulateTransaction(tx);
}

async function buildSignAndSubmitTransaction(params: ContractInvocationParams): Promise<string> {
  const account = await server.getAccount(params.callerAddress);
  const contract = new Contract(CONTRACT_ID);

  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(params.method, ...params.args.map((arg) => nativeToScVal(arg))))
    .setTimeout(30)
    .build();

  // Simulate to get auth and resource fees
  const simulated = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationSuccess(simulated)) {
    tx = rpc.assembleTransaction(tx, simulated).build();
  } else {
    throw new Error(`Simulation failed: ${simulated.error}`);
  }

  // Sign with Freighter
  const signed = await signTransaction(tx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
  const signedTx = TransactionBuilder.fromXDR(signed.signedTxXdr, NETWORK_PASSPHRASE);

/**
 * Fetch the authorization policy (roles + threshold) for a product.
 */
export async function fetchAuthPolicy(productId: string): Promise<AuthPolicy> {
  // TODO: replace with real Soroban RPC call to get_authorization_policy(productId)
  await new Promise((r) => setTimeout(r, 200));
  return { threshold: 1, roles: [] };
}

// ── Client-side filtering ─────────────────────────────────────────────────────

/**
 * Apply client-side filters to a list of events.
 * Used for metadata fields that cannot be filtered on-chain.
 */
export function applyFilter(
  events: TrackingEvent[],
  filter?: EventFilter
): TrackingEvent[] {
  if (!filter) return events;

  return events.filter((e) => {
    if (filter.eventType && e.eventType !== filter.eventType) return false;
    if (filter.actor && e.actor.toLowerCase() !== filter.actor.toLowerCase()) return false;
    if (filter.fromTimestamp && e.timestamp < filter.fromTimestamp) return false;
    if (filter.toTimestamp && e.timestamp > filter.toTimestamp) return false;
    return true;
  });
}

/**
 * Get unique actors from a list of events (for filter chip generation).
 */
export function extractActors(events: TrackingEvent[]): string[] {
  return [...new Set(events.map((e) => e.actor))];
}

/**
 * Get unique event types from a list of events.
 */
export function extractEventTypes(events: TrackingEvent[]): EventType[] {
  return [...new Set(events.map((e) => e.eventType))] as EventType[];
}
export const contractClient = {
  async registerProduct(
    productId: string,
    name: string,
    origin: string,
    owner: string,
    callerAddress: string,
  ): Promise<string> {
    return withContractWriteRetry(() =>
      buildSignAndSubmitTransaction({
        method: 'register_product',
        args: [productId, name, origin, new Address(owner)],
        callerAddress,
      }),
    )
      .then((hash) => {
        recordDependency('soroban-rpc', true);
        recordOperation('product.register', 'success');
        return hash;
      })
      .catch((err) => {
        recordDependency('soroban-rpc', false);
        recordOperation('product.register', 'failure');
        throw err;
      });
  },

  async addTrackingEvent(
    productId: string,
    location: string,
    eventType: string,
    metadata: string,
    callerAddress: string,
  ): Promise<string> {
    return withContractWriteRetry(() =>
      buildSignAndSubmitTransaction({
        method: 'add_tracking_event',
        args: [productId, location, eventType, metadata],
        callerAddress,
      }),
    )
      .then((hash) => {
        recordDependency('soroban-rpc', true);
        recordOperation('event.create', 'success');
        return hash;
      })
      .catch((err) => {
        recordDependency('soroban-rpc', false);
        recordOperation('event.create', 'failure');
        throw err;
      });
  },

  async getProduct(productId: string, callerAddress: string): Promise<any> {
    return withContractRetry(async () => {
      const simulated = await buildAndSimulateTransaction({
        method: 'get_product',
        args: [productId],
        callerAddress,
      });
      if (rpc.Api.isSimulationSuccess(simulated)) {
        recordDependency('soroban-rpc', true);
        recordOperation('product.verify', 'success');
        return scValToNative(simulated.result!.retval);
      }
      throw new Error('Failed to get product');
    }).catch((err) => {
      recordDependency('soroban-rpc', false);
      recordOperation('product.verify', 'failure');
      throw err;
    });
  },

  async getTrackingEvents(productId: string, callerAddress: string): Promise<any[]> {
    return withContractRetry(async () => {
      const simulated = await buildAndSimulateTransaction({
        method: 'get_tracking_events',
        args: [productId],
        callerAddress,
      });
      if (rpc.Api.isSimulationSuccess(simulated)) {
        recordDependency('soroban-rpc', true);
        recordOperation('event.fetch', 'success');
        return scValToNative(simulated.result!.retval) || [];
      }
      throw new Error('Failed to get tracking events');
    }).catch((err) => {
      recordDependency('soroban-rpc', false);
      recordOperation('event.fetch', 'failure');
      throw err;
    });
  },

  async transferOwnership(
    productId: string,
    newOwner: string,
    callerAddress: string,
  ): Promise<string> {
    return withContractWriteRetry(() =>
      buildSignAndSubmitTransaction({
        method: 'transfer_ownership',
        args: [productId, new Address(newOwner)],
        callerAddress,
      }),
    )
      .then((hash) => {
        recordDependency('soroban-rpc', true);
        return hash;
      })
      .catch((err) => {
        recordDependency('soroban-rpc', false);
        throw err;
      });
  },

  async addAuthorizedActor(
    productId: string,
    actor: string,
    callerAddress: string,
  ): Promise<string> {
    return withContractWriteRetry(() =>
      buildSignAndSubmitTransaction({
        method: 'add_authorized_actor',
        args: [productId, new Address(actor)],
        callerAddress,
      }),
    )
      .then((hash) => {
        recordDependency('soroban-rpc', true);
        return hash;
      })
      .catch((err) => {
        recordDependency('soroban-rpc', false);
        throw err;
      });
  },

  async removeAuthorizedActor(
    productId: string,
    actor: string,
    callerAddress: string,
  ): Promise<string> {
    return withContractWriteRetry(() =>
      buildSignAndSubmitTransaction({
        method: 'remove_authorized_actor',
        args: [productId, new Address(actor)],
        callerAddress,
      }),
    )
      .then((hash) => {
        recordDependency('soroban-rpc', true);
        return hash;
      })
      .catch((err) => {
        recordDependency('soroban-rpc', false);
        throw err;
      });
  },

  async getNonce(actor: string, callerAddress: string): Promise<number> {
    const simulated = await buildAndSimulateTransaction({
      method: 'get_nonce',
      args: [new Address(actor)],
      callerAddress,
    });

    if (rpc.Api.isSimulationSuccess(simulated)) {
      return Number(scValToNative(simulated.result!.retval) ?? 0);
    }
    throw new Error('Failed to get nonce');
  },

  async approveEvent(
    productId: string,
    pendingEventId: number,
    approver: string,
    callerAddress: string,
  ): Promise<string> {
    const nonce = await contractClient.getNonce(approver, callerAddress);
    return buildSignAndSubmitTransaction({
      method: 'approve_event',
      args: [productId, pendingEventId, new Address(approver), nonce],
      callerAddress,
    });
  },

  async rejectEvent(
    productId: string,
    pendingEventId: number,
    rejector: string,
    reason: string,
    callerAddress: string,
  ): Promise<string> {
    const nonce = await contractClient.getNonce(rejector, callerAddress);
    return buildSignAndSubmitTransaction({
      method: 'reject_event',
      args: [productId, pendingEventId, new Address(rejector), reason, nonce],
      callerAddress,
    });
  },

  async getPendingEvents(productId: string, callerAddress: string): Promise<any[]> {
    const simulated = await buildAndSimulateTransaction({
      method: 'get_pending_events',
      args: [productId],
      callerAddress,
    });

    if (rpc.Api.isSimulationSuccess(simulated)) {
      return scValToNative(simulated.result!.retval) || [];
    }
    throw new Error('Failed to get pending events');
  },

  async deactivateProduct(productId: string, callerAddress: string): Promise<string> {
    return withContractWriteRetry(() =>
      buildSignAndSubmitTransaction({
        method: 'deactivate_product',
        args: [productId],
        callerAddress,
      }),
    )
      .then((hash) => {
        recordDependency('soroban-rpc', true);
        return hash;
      })
      .catch((err) => {
        recordDependency('soroban-rpc', false);
        throw err;
      });
  },

  async listProducts(
    page: number = 0,
    pageSize: number = 20,
    callerAddress: string,
  ): Promise<any[]> {
    return withContractRetry(async () => {
      const simulated = await buildAndSimulateTransaction({
        method: 'list_products',
        args: [page, pageSize],
        callerAddress,
      });
      if (rpc.Api.isSimulationSuccess(simulated)) {
        recordDependency('soroban-rpc', true);
        return scValToNative(simulated.result!.retval) || [];
      }
      throw new Error('Failed to list products');
    }).catch((err) => {
      recordDependency('soroban-rpc', false);
      throw err;
    });
  },

  async getProductCount(callerAddress: string): Promise<number> {
    return withContractRetry(async () => {
      const simulated = await buildAndSimulateTransaction({
        method: 'get_product_count',
        args: [],
        callerAddress,
      });
      if (rpc.Api.isSimulationSuccess(simulated)) {
        recordDependency('soroban-rpc', true);
        return scValToNative(simulated.result!.retval) || 0;
      }
      throw new Error('Failed to get product count');
    }).catch((err) => {
      recordDependency('soroban-rpc', false);
      throw err;
    });
  },
};
