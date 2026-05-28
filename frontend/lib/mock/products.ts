import type { Product, TrackingEvent } from '@/lib/types';

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    name: 'Organic Coffee Beans',
    origin: 'Ethiopia',
    owner: 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    timestamp: 1710000000000,
    active: true,
    authorizedActors: [
      'GACTOR1ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567',
      'GACTOR2ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567',
    ],
    ownershipHistory: [
      { owner: 'GORIGINALOWNERABCDEFGHIJKLMNOPQRSTUVWXYZ', transferredAt: 1700000000000 },
      { owner: 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', transferredAt: 1710000000000 },
    ],
    category: 'agricultural',
    subcategory: 'coffee',
    certifications: [
      {
        id: 'cert-001-organic',
        productId: 'prod-001',
        certType: 'organic',
        issuer: 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        issuedAt: 1710100000000,
        revoked: false,
      },
      {
        id: 'cert-001-fair-trade',
        productId: 'prod-001',
        certType: 'fair_trade',
        issuer: 'GACTOR1ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567',
        issuedAt: 1710150000000,
        revoked: false,
      },
    ],
  },
  {
    id: 'prod-002',
    name: 'Fair Trade Cocoa',
    origin: 'Ghana',
    owner: 'GDEF1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    timestamp: 1711000000000,
    active: true,
    authorizedActors: ['GACTOR3ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567'],
    ownershipHistory: [
      { owner: 'GDEF1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', transferredAt: 1711000000000 },
    ],
    category: 'agricultural',
    subcategory: 'cocoa',
    certifications: [
      {
        id: 'cert-002-fair-trade',
        productId: 'prod-002',
        certType: 'fair_trade',
        issuer: 'GDEF1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        issuedAt: 1711100000000,
        revoked: false,
      },
      {
        id: 'cert-002-rainforest',
        productId: 'prod-002',
        certType: 'rainforest_alliance',
        issuer: 'GACTOR3ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567',
        issuedAt: 1711200000000,
        revoked: false,
      },
    ],
  },
];

export const MOCK_EVENTS: TrackingEvent[] = [
  {
    productId: 'prod-001',
    eventType: 'HARVEST',
    location: 'Yirgacheffe, Ethiopia',
    actor: 'GACTOR1ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567',
    timestamp: 1710000000000,
    metadata: JSON.stringify({
      notes: 'Hand-picked, shade-grown',
      lat: 6.1667,
      lng: 38.2,
      carbon_footprint: 8,
      certification_level: 'gold',
      sustainable_practices: ['shade_grown', 'hand_picked', 'water_conservation'],
      renewable_energy_pct: 85,
      recyclable_packaging: true,
    }),
  },
  {
    productId: 'prod-001',
    eventType: 'PROCESSING',
    location: 'Addis Ababa, Ethiopia',
    actor: 'GACTOR1ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567',
    timestamp: 1710200000000,
    metadata: JSON.stringify({
      method: 'Washed',
      moisture: '11%',
      lat: 9.0054,
      lng: 38.7636,
      carbon_footprint: 12,
      sustainable_practices: ['water_recycle'],
      renewable_energy_pct: 70,
    }),
  },
  {
    productId: 'prod-001',
    eventType: 'SHIPPING',
    location: 'Port of Djibouti',
    actor: 'GACTOR2ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567',
    timestamp: 1710400000000,
    metadata: JSON.stringify({
      vessel: 'MV Stellar',
      destination: 'Rotterdam',
      lat: 11.5892,
      lng: 43.1456,
      carbon_footprint: 45,
      sustainable_practices: ['low_sulfur_fuel'],
    }),
  },
  {
    productId: 'prod-001',
    eventType: 'RETAIL',
    location: 'Amsterdam, Netherlands',
    actor: 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    timestamp: 1710600000000,
    metadata: JSON.stringify({
      store: 'Green Beans Co.',
      lat: 52.3676,
      lng: 4.9041,
      carbon_footprint: 5,
      recyclable_packaging: true,
      renewable_energy_pct: 100,
    }),
  },
  {
    productId: 'prod-002',
    eventType: 'HARVEST',
    location: 'Ashanti Region, Ghana',
    actor: 'GACTOR3ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567',
    timestamp: 1711000000000,
    metadata: JSON.stringify({
      variety: 'Forastero',
      lat: 6.6885,
      lng: -1.6244,
      carbon_footprint: 15,
      certification_level: 'silver',
      sustainable_practices: ['agroforestry', 'no_child_labor'],
      renewable_energy_pct: 50,
      recyclable_packaging: false,
    }),
  },
];

export function getProductById(id: string): Product | undefined {
  return MOCK_PRODUCTS.find((p) => p.id === id);
}

export function getAllProducts(): Product[] {
  return MOCK_PRODUCTS;
}

export function getEventsByProductId(id: string): TrackingEvent[] {
  return MOCK_EVENTS.filter((e) => e.productId === id);
}
