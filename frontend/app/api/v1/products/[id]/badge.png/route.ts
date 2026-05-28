import { NextRequest, NextResponse } from 'next/server';
import { withCors, handleOptions } from '@/lib/api/cors';
import { apiError, ErrorCode } from '@/lib/api/errors';
import { productBadgeParamsSchema } from '@/lib/api/schemas';
import { handleValidationError, parsePathParams } from '@/lib/api/validation';
import { getProduct } from '@/lib/services/productReadModel';

export function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: productId } = await parsePathParams(params, productBadgeParamsSchema);
    const product = await getProduct(productId);

    if (!product) {
      return withCors(request, apiError(request, 404, ErrorCode.INVALID_PAYLOAD, 'Product not found'));
    }

    const verifiedDate = new Date(product.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const svg = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#7B2FBE;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#5A1E8C;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#grad)"/>
        <rect width="400" height="300" fill="none" stroke="white" stroke-width="3"/>
        <text x="20" y="35" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white">
          &#10003; Supply-Link
        </text>
        <text x="20" y="80" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white">
          ${escapeXml(product.name)}
        </text>
        <text x="20" y="110" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.9)">
          Origin: ${escapeXml(product.origin)}
        </text>
        <text x="20" y="140" font-family="Arial, sans-serif" font-size="12" fill="rgba(255,255,255,0.8)">
          Verified: ${verifiedDate}
        </text>
        <rect x="280" y="20" width="100" height="100" fill="white" stroke="white" stroke-width="2"/>
        <text x="330" y="75" font-family="Arial, sans-serif" font-size="10" fill="#7B2FBE" text-anchor="middle">
          [QR Code]
        </text>
        <text x="20" y="200" font-family="Arial, sans-serif" font-size="12" fill="rgba(255,255,255,0.9)">
          Tracked on Stellar Blockchain
        </text>
        <text x="20" y="225" font-family="monospace" font-size="10" fill="rgba(255,255,255,0.7)">
          ID: ${escapeXml(productId)}
        </text>
        <text x="20" y="250" font-family="Arial, sans-serif" font-size="11" fill="rgba(255,255,255,0.8)">
          Scan QR to verify full journey
        </text>
        <circle cx="350" cy="260" r="25" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="1"/>
        <text x="350" y="265" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="white" text-anchor="middle">
          &#9733;
        </text>
      </svg>
    `;

    return withCors(
      request,
      new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400',
          'Content-Disposition': `inline; filename="supply-link-badge-${productId}.svg"`,
        },
      }) as NextResponse,
    );
  } catch (error) {
    const validation = handleValidationError(request, error);
    if (validation) return withCors(request, validation);
    console.error('Badge generation error:', error);
    return withCors(
      request,
      apiError(request, 500, ErrorCode.INTERNAL_ERROR, 'Failed to generate badge'),
    );
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
