/**
 * Built-in job handlers for heavy operations.
 *
 * Import this module once at app startup (e.g. in a route that uses jobs)
 * to register all handlers.
 */
import { registerHandler } from "./types";

// ── Image processing ──────────────────────────────────────────────────────────
registerHandler<{ url: string; productId: string }>("image.process", async (job) => {
  // Placeholder: resize / compress / generate thumbnail via sharp or similar.
  // Replace with real implementation when image pipeline is added.
  console.log(`[jobs] image.process productId=${job.payload.productId} url=${job.payload.url}`);
});

// ── Analytics aggregation ─────────────────────────────────────────────────────
registerHandler<{ productId: string }>("analytics.aggregate", async (job) => {
  // Placeholder: recompute provenance score, event stats, etc.
  console.log(`[jobs] analytics.aggregate productId=${job.payload.productId}`);
});

// ── Malware / content scan ────────────────────────────────────────────────────
registerHandler<{ url: string; jobId: string }>("scan.malware", async (job) => {
  // Placeholder: call external scanning service.
  console.log(`[jobs] scan.malware url=${job.payload.url}`);
});
