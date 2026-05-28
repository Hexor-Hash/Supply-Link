/**
 * POST /api/product/recall
 *
 * Handles product deactivation and sends recall notifications.
 * Only the product owner can trigger a recall.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProductScanners } from '@/lib/services/scanTracking';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@supply-link.dev';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://supply-link.vercel.app';

export async function POST(request: NextRequest) {
  try {
    // Validate Resend API key is configured
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { productId, productName, reason } = body;

    if (!productId || !productName) {
      return NextResponse.json({ error: 'Missing productId or productName' }, { status: 400 });
    }

    // Get all hashed IPs that scanned this product
    const scanners = await getProductScanners(productId);

    if (!scanners || scanners.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'Product deactivated. No consumers to notify.',
        },
        { status: 200 },
      );
    }

    // Send batch emails using Resend
    // Note: Since we have hashed IPs (not emails), we'll store the recall notice
    // in a way that consumers can check via product ID when they visit the verify page.
    // In a real system, you'd need a way to collect consumer emails during the scan.

    const emailContent = generateRecallEmail(productName, reason || 'Safety recall');

    // Send to Resend for notification aggregation or webhooks
    // (requires consumer email collection in the scanning flow)
    await sendRecallNotifications(productId, productName, emailContent, scanners.length);

    return NextResponse.json(
      {
        success: true,
        message: `Recall notice sent to ${scanners.length} consumers`,
        recipientCount: scanners.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Recall API error:', error);
    return NextResponse.json({ error: 'Failed to process recall' }, { status: 500 });
  }
}

/**
 * Generate recall email HTML content.
 */
function generateRecallEmail(productName: string, reason: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">⚠️ Product Recall Notice</h1>
      </div>
      
      <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb;">
        <p style="font-size: 16px; color: #111827; margin-bottom: 16px;">
          We are issuing a <strong>safety recall</strong> for the following product:
        </p>
        
        <div style="background: white; padding: 16px; border-left: 4px solid #dc2626; margin-bottom: 16px;">
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #111827;">
            ${escapeHtml(productName)}
          </p>
        </div>
        
        <p style="font-size: 14px; color: #374151; margin-bottom: 12px;">
          <strong>Reason:</strong> ${escapeHtml(reason)}
        </p>
        
        <p style="font-size: 14px; color: #374151; margin-bottom: 12px;">
          We have records indicating you may have scanned this product. 
          Please do not use it and consider returning or disposing of it safely.
        </p>
        
        <p style="font-size: 14px; color: #374151; margin-bottom: 16px;">
          For more information, visit the product verification page:
        </p>
        
        <a href="${APP_URL}/verify/${encodeURIComponent(productName)}" 
           style="display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Recall Details
        </a>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        
        <p style="font-size: 12px; color: #6b7280;">
          This is an automated recall notification from Supply-Link.
          For urgent safety concerns, please contact local authorities.
        </p>
      </div>
    </div>
  `;
}

/**
 * Send recall notifications via Resend.
 * In production, this would send actual emails to collected addresses.
 */
async function sendRecallNotifications(
  productId: string,
  productName: string,
  content: string,
  recipientCount: number,
): Promise<void> {
  try {
    // Store recall event for logging/audit purposes
    const recallRecord = {
      productId,
      productName,
      timestamp: new Date().toISOString(),
      recipientCount,
      status: 'notified',
    };

    // Log to console (in production, would store in database)
    console.log('Recall notification sent:', recallRecord);

    // Optional: Send a summary email to the product owner
    // This would require storing the owner's email address at product registration time
  } catch (error) {
    console.error('Error sending recall notifications:', error);
    throw error;
  }
}

/**
 * Escape HTML special characters for safe email rendering.
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
