import { z } from 'zod';
import type { EventType } from '@/lib/types';

export const harvestMetadataSchema = z.object({
  batchNumber: z.string().max(64).optional(),
  harvestDate: z.string().optional(),
  farmId: z.string().max(128).optional(),
  quantity: z.number().positive().optional(),
  unit: z.enum(['kg', 'lb', 'ton', 'unit']).optional(),
  temperature: z.string().max(32).optional(),
  humidity: z.string().max(32).optional(),
  certifications: z.array(z.string().max(128)).max(10).optional(),
});

export const processingMetadataSchema = z.object({
  facilityId: z.string().max(128).optional(),
  processType: z.string().max(128).optional(),
  processingDate: z.string().optional(),
  batchId: z.string().max(64).optional(),
  temperature: z.string().max(32).optional(),
  duration: z.string().max(64).optional(),
  qualityGrade: z.string().max(32).optional(),
  inspector: z.string().max(128).optional(),
});

export const shippingMetadataSchema = z.object({
  carrier: z.string().max(128).optional(),
  trackingNumber: z.string().max(128).optional(),
  departureDate: z.string().optional(),
  estimatedArrival: z.string().optional(),
  containerNumber: z.string().max(64).optional(),
  portOfOrigin: z.string().max(256).optional(),
  portOfDestination: z.string().max(256).optional(),
  temperature: z.string().max(32).optional(),
});

export const retailMetadataSchema = z.object({
  storeId: z.string().max(128).optional(),
  shelfLocation: z.string().max(128).optional(),
  arrivalDate: z.string().optional(),
  expiryDate: z.string().optional(),
  price: z.number().positive().optional(),
  currency: z.string().max(8).optional(),
  sku: z.string().max(128).optional(),
  stockLevel: z.number().int().nonnegative().optional(),
});

export const eventMetadataSchemas = {
  HARVEST: harvestMetadataSchema,
  PROCESSING: processingMetadataSchema,
  SHIPPING: shippingMetadataSchema,
  RETAIL: retailMetadataSchema,
} as const satisfies Record<EventType, z.ZodObject<z.ZodRawShape>>;

export type HarvestMetadata = z.infer<typeof harvestMetadataSchema>;
export type ProcessingMetadata = z.infer<typeof processingMetadataSchema>;
export type ShippingMetadata = z.infer<typeof shippingMetadataSchema>;
export type RetailMetadata = z.infer<typeof retailMetadataSchema>;

export type EventMetadata =
  | HarvestMetadata
  | ProcessingMetadata
  | ShippingMetadata
  | RetailMetadata;

export function validateEventMetadata(
  eventType: string,
  metadata: string,
): { valid: boolean; data?: Record<string, unknown>; error?: string } {
  const schema = eventMetadataSchemas[eventType as EventType];
  if (!schema) {
    return { valid: false, error: `Unknown event type: ${eventType}` };
  }

  let parsed: unknown;
  try {
    parsed = metadata.trim() ? JSON.parse(metadata) : {};
  } catch {
    return { valid: false, error: 'Metadata must be valid JSON' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { valid: false, error: 'Metadata must be a JSON object' };
  }

  const result = schema.safeParse(parsed);
  if (result.success) {
    return { valid: true, data: result.data as Record<string, unknown> };
  }

  const messages = result.error.issues
    .map((i) => (i.path.length > 0 ? `${i.path.join('.')}: ${i.message}` : i.message))
    .join('; ');
  return { valid: false, error: messages };
}
