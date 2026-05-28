/**
 * Ratings API route — hardened with replay-proof signature protocol.
 *
 * POST /api/ratings
 *   Requires a signed message in canonical format:
 *     supply-link:rate:<productId>:<stars>:<nonce>:<expiresAt>
 *   Enforces: expiry window, one-time nonce, one-rating-per-wallet-per-product.
 *
 * GET /api/ratings?productId=<id>
 *   Returns aggregated ratings for a product.
 *
 * closes #306
 */

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { verifySignature } from '@/lib/stellar/verify';
import { withCors, handleOptions } from '@/lib/api/cors';
import { apiError, withCorrelationId, ErrorCode } from '@/lib/api/errors';
import { withIdempotency } from '@/lib/api/idempotency';
import { withMetrics, recordDependency } from '@/lib/api/metrics';
import { applyRateLimit, RATE_LIMIT_PRESETS } from '@/lib/api/rateLimit';
import { ratingsBodySchema, ratingsQuerySchema } from '@/lib/api/schemas';
import { handleValidationError, parseJsonBody, parseQuery } from '@/lib/api/validation';
import {
  parseAndValidateMessage,
  consumeNonce,
  hasDuplicateRating,
  recordRating,
} from '@/lib/api/ratingsProtocol';

export function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request, 'ratings', RATE_LIMIT_PRESETS.ratings);
  if (limited) return limited;

  return withMetrics('ratings:POST', async () =>
    withIdempotency(request, async (req, rawBody) => {
      const respond = (body: unknown, init?: ResponseInit) =>
        withCors(req, withCorrelationId(req, NextResponse.json(body, init)));

      try {
        const data = parseJsonBody(req, rawBody, ratingsBodySchema);
        const { productId, walletAddress, stars, comment, message, signature } = data;

        const msgValidation = parseAndValidateMessage(message, productId, stars);
        if (!msgValidation.ok) {
          return withCors(
            req,
            apiError(req, 400, ErrorCode.VALIDATION_ERROR, `Invalid message: ${msgValidation.reason}`),
          );
        }

        const isValid = await verifySignature(walletAddress, message, signature);
        if (!isValid) {
          return withCors(req, apiError(req, 401, ErrorCode.INVALID_SIGNATURE, 'Invalid signature'));
        }

        const nonce = message.split(':')[4];
        const nonceConsumed = await consumeNonce(walletAddress, nonce);
        if (!nonceConsumed) {
          return withCors(
            req,
            apiError(req, 409, ErrorCode.IDEMPOTENCY_CONFLICT, 'Nonce already used — replay detected'),
          );
        }

        const isDuplicate = await hasDuplicateRating(walletAddress, productId);
        if (isDuplicate) {
          return withCors(
            req,
            apiError(req, 409, ErrorCode.IDEMPOTENCY_CONFLICT, 'Wallet has already rated this product'),
          );
        }

        const rating = {
          id: `${productId}_${walletAddress}_${Date.now()}`,
          productId,
          walletAddress,
          stars,
          comment: comment || null,
          timestamp: Date.now(),
        };

        const key = `ratings:${productId}`;
        try {
          const existing = await kv.get<any[]>(key);
          const ratings = existing || [];
          ratings.push(rating);
          await kv.set(key, ratings);
          await recordRating(walletAddress, productId);
          recordDependency('vercel-kv', true);
        } catch (kvErr) {
          recordDependency('vercel-kv', false);
          throw kvErr;
        }

        return respond(rating, { status: 201 });
      } catch (error) {
        const validation = handleValidationError(req, error);
        if (validation) return withCors(req, validation);
        console.error('[ratings POST]', error);
        return withCors(req, apiError(req, 500, ErrorCode.INTERNAL_ERROR, 'Failed to submit rating'));
      }
    }),
  );
}

export async function GET(request: NextRequest) {
  const limited = applyRateLimit(request, 'ratings', RATE_LIMIT_PRESETS.default);
  if (limited) return limited;

  return withMetrics('ratings:GET', async () => {
    const respond = (body: unknown, init?: ResponseInit) =>
      withCors(request, withCorrelationId(request, NextResponse.json(body, init)));

    try {
      const { productId } = parseQuery(request, ratingsQuerySchema);

      const key = `ratings:${productId}`;
      let allRatings: any[] = [];
      try {
        allRatings = (await kv.get<any[]>(key)) ?? [];
        recordDependency('vercel-kv', true);
      } catch (kvErr) {
        recordDependency('vercel-kv', false);
        throw kvErr;
      }

      const sortedRatings = [...allRatings].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
      const avgStars =
        allRatings.length > 0
          ? (allRatings.reduce((sum, r) => sum + r.stars, 0) / allRatings.length).toFixed(1)
          : 0;

      return respond({
        productId,
        averageRating: parseFloat(avgStars as string),
        totalRatings: allRatings.length,
        recentRatings: sortedRatings,
      });
    } catch (error) {
      const validation = handleValidationError(request, error);
      if (validation) return withCors(request, validation);
      console.error('[ratings GET]', error);
      return withCors(request, apiError(request, 500, ErrorCode.INTERNAL_ERROR, 'Failed to fetch ratings'));
    }
  });
}
