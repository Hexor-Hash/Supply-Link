import { z } from "zod";

/** Stellar public key: G + [A-D] + 54 base-32 chars = 56 total */
export const stellarAddressSchema = z
  .string()
  .regex(/^G[A-D][A-Z2-7]{54}$/, "Must be a valid Stellar address (G… 56 chars)");

/** Product ID: alphanumeric + hyphens/underscores, max 64 chars */
export const productIdSchema = z
  .string()
  .min(1, "Product ID is required")
  .max(64, "Product ID must be 64 characters or fewer")
  .regex(/^[a-zA-Z0-9_-]+$/, "Product ID may only contain letters, numbers, hyphens, and underscores");

/** Metadata: valid JSON, max 1 KB */
export const metadataSchema = z
  .string()
  .max(1024, "Metadata must be 1 KB or less")
  .refine(
    (val) => {
      if (!val.trim()) return true;
      try { JSON.parse(val); return true; } catch { return false; }
    },
    "Metadata must be valid JSON"
  );
