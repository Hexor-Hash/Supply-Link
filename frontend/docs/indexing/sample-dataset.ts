/**
 * Sample dataset for indexing tests.
 * Covers all 8 contract event types with realistic data.
 */

import type { ParsedEvent } from './reference-parser';
import type { Product, TrackingEvent } from '@/lib/types';

export const SAMPLE_PRODUCT: Product = {
  id: 'batch-2024-001',
  name: 'Arabica Coffee Beans',
  origin: 'Yirgacheffe, Ethiopia',
  owner: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
  timestamp: 1714262400,
  active: true,
  authorizedActors: ['GBVNN4JYMCIHZMLMGPLLEMZNTF2TFAS5MWKIOIY3GCNT3X2QHKZ65VXN'],
  requiredSignatures: 1,
};

export const SAMPLE_TRACKING_EVENT: TrackingEvent = {
  productId: 'batch-2024-001',
  location: 'Port of Rotterdam',
  actor: 'GBVNN4JYMCIHZMLMGPLLEMZNTF2TFAS5MWKIOIY3GCNT3X2QHKZ65VXN',
  timestamp: 1714348800,
  eventType: 'SHIPPING',
  metadata: '{"container":"MSCU1234567"}',
};

const UPDATED_PRODUCT: Product = {
  ...SAMPLE_PRODUCT,
  name: 'Premium Arabica Coffee Beans',
  origin: 'Yirgacheffe, Ethiopia (Grade 1)',
};

export const SAMPLE_EVENTS: ParsedEvent[] = [
  {
    ledger: 1000,
    txHash: 'aabbcc0001',
    eventIndex: 0,
    productId: 'batch-2024-001',
    type: 'product_registered',
    data: SAMPLE_PRODUCT,
  },
  {
    ledger: 1001,
    txHash: 'aabbcc0002',
    eventIndex: 0,
    productId: 'batch-2024-001',
    type: 'actor_authorized',
    data: 'GBVNN4JYMCIHZMLMGPLLEMZNTF2TFAS5MWKIOIY3GCNT3X2QHKZ65VXN',
  },
  {
    ledger: 1002,
    txHash: 'aabbcc0003',
    eventIndex: 0,
    productId: 'batch-2024-001',
    type: 'event_added',
    data: SAMPLE_TRACKING_EVENT,
  },
  {
    ledger: 1003,
    txHash: 'aabbcc0004',
    eventIndex: 0,
    productId: 'batch-2024-001',
    type: 'event_pending',
    data: {
      productId: 'batch-2024-001',
      location: 'Hamburg Warehouse',
      actor: 'GBVNN4JYMCIHZMLMGPLLEMZNTF2TFAS5MWKIOIY3GCNT3X2QHKZ65VXN',
      timestamp: 1714435200,
      eventType: 'PROCESSING',
      metadata: '{"batch":"HH-2024-05"}',
    } satisfies TrackingEvent,
  },
  {
    ledger: 1004,
    txHash: 'aabbcc0005',
    eventIndex: 0,
    productId: 'batch-2024-001',
    type: 'event_finalized',
    data: {
      productId: 'batch-2024-001',
      location: 'Hamburg Warehouse',
      actor: 'GBVNN4JYMCIHZMLMGPLLEMZNTF2TFAS5MWKIOIY3GCNT3X2QHKZ65VXN',
      timestamp: 1714521600,
      eventType: 'PROCESSING',
      metadata: '{"batch":"HH-2024-05","approved":true}',
    } satisfies TrackingEvent,
  },
  {
    ledger: 1005,
    txHash: 'aabbcc0006',
    eventIndex: 0,
    productId: 'batch-2024-001',
    type: 'event_rejected',
    data: {
      productId: 'batch-2024-001',
      location: 'Berlin QC Lab',
      actor: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
      timestamp: 1714608000,
      eventType: 'RETAIL',
      metadata: '{"reason":"failed_qc"}',
    } satisfies TrackingEvent,
  },
  {
    ledger: 1006,
    txHash: 'aabbcc0007',
    eventIndex: 0,
    productId: 'batch-2024-001',
    type: 'ownership_transferred',
    data: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZQE3JKCA4BKZARRK4WNLQ',
  },
  {
    ledger: 1007,
    txHash: 'aabbcc0008',
    eventIndex: 0,
    productId: 'batch-2024-001',
    type: 'product_updated',
    data: UPDATED_PRODUCT,
  },
];
