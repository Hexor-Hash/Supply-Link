import { z } from "zod";

export const metadataSchema = z.record(z.string(), z.unknown());

export function validateMetadata(raw: string): { valid: boolean; data?: Record<string, unknown>; error?: string } {
  try {
    const parsed = JSON.parse(raw);
    const result = metadataSchema.safeParse(parsed);
    if (result.success) return { valid: true, data: result.data };
    return { valid: false, error: result.error.message };
  } catch {
    return { valid: false, error: "Invalid JSON" };
  }
}
