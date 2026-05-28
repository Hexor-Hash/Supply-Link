import { NextRequest, NextResponse } from 'next/server';
import { Keypair, TransactionBuilder, Networks, BASE_FEE } from '@stellar/stellar-sdk';
import { withCors, handleOptions } from '@/lib/api/cors';
import { apiError, withCorrelationId, ErrorCode } from '@/lib/api/errors';
import { withIdempotency } from '@/lib/api/idempotency';
import { requirePolicy } from '@/lib/api/policy';
import { AuditEmitter } from '@/lib/api/audit';
import { applyRateLimit, RATE_LIMIT_PRESETS } from '@/lib/api/rateLimit';
import { handleValidationError, parseJsonBody } from '@/lib/api/validation';
import { z } from 'zod';

export function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

async function handler(request: NextRequest) {
  const limited = applyRateLimit(request, 'fee-bump', RATE_LIMIT_PRESETS.feeBump);
  if (limited) return limited;

  return withIdempotency(request, async (req, rawBody) => {
    const respond = (body: unknown, init?: ResponseInit) =>
      withCors(req, withCorrelationId(req, NextResponse.json(body, init)));

    let resultBody: any;
    let resultStatus: number = 200;

    try {
      // Validates content-type and JSON syntax, throwing RequestValidationError on failure
      const body = parseJsonBody(req, rawBody, z.object({ innerTx: z.string() }));
      const { innerTx } = body;

      const feeBumpSecret = process.env.STELLAR_FEE_BUMP_SECRET;
      if (!feeBumpSecret) {
        resultStatus = 500;
        resultBody = {
          error: ErrorCode.DEPENDENCY_UNAVAILABLE,
          message: 'Fee-bump account not configured',
        };
        return withCors(req, apiError(req, resultStatus, resultBody.error, resultBody.message));
      }

      const feeBumpKeypair = Keypair.fromSecret(feeBumpSecret);

      let innerTransaction;
      try {
        innerTransaction = TransactionBuilder.fromXDR(innerTx, Networks.TESTNET);
      } catch {
        resultStatus = 400;
        resultBody = { error: ErrorCode.INVALID_PAYLOAD, message: 'Invalid transaction XDR' };
        return withCors(req, apiError(req, resultStatus, resultBody.error, resultBody.message));
      }

      const operationCount = innerTransaction.operations.length;
      const feeBumpFee = (BigInt(BASE_FEE) * BigInt(1 + operationCount)).toString();
      const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
        feeBumpKeypair,
        feeBumpFee,
        innerTransaction,
        Networks.TESTNET,
      );

      feeBumpTx.sign(feeBumpKeypair);

      resultBody = {
        feeBumpTx: feeBumpTx.toXDR(),
        cost: feeBumpFee,
        message: 'Fee-bump transaction created. Ready to submit to Stellar network.',
      };
      resultStatus = 200;
    } catch (error) {
      const validation = handleValidationError(req, error);
      if (validation) return withCors(req, validation);
      console.error('[fee-bump POST]', error);
      resultStatus = 500;
      resultBody = {
        error: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to create fee-bump transaction',
      };
    } finally {
      // Audit log the operation — rawBody may be invalid JSON, so guard the parse
      let parsedBody: unknown;
      try {
        parsedBody = rawBody ? JSON.parse(rawBody) : undefined;
      } catch {
        parsedBody = undefined;
      }
      AuditEmitter.emit(req, 'fee-bump.create', resultStatus, parsedBody, resultBody);
    }

    if (resultStatus === 200) {
      return respond(resultBody);
    } else {
      return withCors(req, apiError(req, resultStatus, resultBody.error, resultBody.message));
    }
  });
}

// Access tier: internal – signs with STELLAR_FEE_BUMP_SECRET; never expose publicly
export const POST = requirePolicy('internal', handler);
