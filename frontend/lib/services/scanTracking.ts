/**
 * Scan tracking service for product recalls.
 *
 * Tracks anonymized consumer scans of products using Vercel KV.
 * When a product is deactivated, this data is used to identify and notify consumers.
 */

import { kv } from '@vercel/kv';
import crypto from 'crypto';

interface ScanRecord {
  productId: string;
  timestamp: number;
  ipHash: string; // Anonymized IP hash
}

/**
 * Hash an IP address for privacy while maintaining uniqueness.
 */
function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

/**
 * Record a product scan (called when consumer verifies a product).
 * Stores anonymized data: product ID, timestamp, and hashed IP.
 */
export async function recordScan(productId: string, ip: string): Promise<void> {
  try {
    const ipHash = hashIp(ip);
    const timestamp = Date.now();

    // Store scan record with expiry of 90 days
    const key = `scan:${productId}:${ipHash}:${timestamp}`;
    const record: ScanRecord = {
      productId,
      timestamp,
      ipHash,
    };

    await kv.setex(key, 90 * 24 * 60 * 60, JSON.stringify(record));

    // Also track unique scanners per product
    await kv.sadd(`scanners:${productId}`, ipHash);
  } catch (error) {
    // Silently fail - scan tracking should not block product verification
    console.error('Failed to record scan:', error);
  }
}

/**
 * Get all unique IPs (hashed) that have scanned a product.
 * Returns hashed IPs to maintain privacy.
 */
export async function getProductScanners(productId: string): Promise<string[]> {
  try {
    const scanners = await kv.smembers(`scanners:${productId}`);
    return scanners || [];
  } catch (error) {
    console.error('Failed to get product scanners:', error);
    return [];
  }
}

/**
 * Clear all scan records for a product (optional cleanup after recall).
 */
export async function clearProductScans(productId: string): Promise<void> {
  try {
    const scanners = await kv.smembers(`scanners:${productId}`);

    if (scanners && scanners.length > 0) {
      // Delete the set of scanners
      await kv.del(`scanners:${productId}`);

      // Ideally, we'd also clean up individual scan records,
      // but that would require scanning all keys (expensive).
      // KV entries will expire naturally after 90 days.
    }
  } catch (error) {
    console.error('Failed to clear product scans:', error);
  }
}
