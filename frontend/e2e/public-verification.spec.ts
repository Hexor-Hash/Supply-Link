import { test, expect } from '@playwright/test';

test.describe('E2E: Public Verification without Wallet', () => {
  test('visit /verify/ directly without wallet → see product journey', async ({
    page,
  }) => {
    // Use a known product ID for testing
    const testProductId = 'CBYQQ3ZYMRV4EWCV235ZIJV5NBHM4QMCVPVTKN4CIMYCTBIHAHPNIXS';

    // Step 1: Visit /verify/ directly without wallet connection
    await page.goto(`/verify/${testProductId}`);

    // Verify we can see the page without wallet connection
    await expect(page.locator('h1')).toContainText('Product Verification');

    // Step 2: Verify product details are displayed
    // Note: The page should load product data from the blockchain
    await expect(page.locator('[data-testid="product-name"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="product-sku"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-manufacturer"]')).toBeVisible();

    // Step 3: Verify tracking events are displayed
    const eventsList = page.locator('[data-testid="events-list"]');
    await expect(eventsList).toBeVisible();

    // Step 4: Verify public page shows event timeline
    const timelineItems = page.locator('[data-testid="timeline-item"]');
    const count = await timelineItems.count();
    expect(count).toBeGreaterThan(0);

    // Step 5: Verify we can scan QR or see verification status
    const verificationStatus = page.locator('[data-testid="verification-status"]');
    await expect(verificationStatus).toBeVisible();

    // Step 6: Verify no "Connect Wallet" prompt is required to view public info
    const walletPrompt = page.locator('text=Connect Wallet to').first();
    const isPromptVisible = await walletPrompt.isVisible().catch(() => false);
    // The prompt might not be visible on the public page
    if (isPromptVisible) {
      expect(isPromptVisible).toBe(false);
    }
  });

  test('visit /verify/ with invalid product ID → see error message', async ({
    page,
  }) => {
    // Step 1: Visit with invalid product ID
    await page.goto('/verify/INVALID_PRODUCT_ID');

    // Step 2: Verify error is displayed
    await expect(
      page.locator('text=Product not found')
    ).toBeVisible({ timeout: 5000 });
  });
});
