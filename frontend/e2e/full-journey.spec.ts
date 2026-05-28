import { test, expect } from '@playwright/test';

test.describe('E2E: Full User Journey', () => {
  test('visit landing page → connect wallet → register product → add event → view on tracking page → scan QR → verify on public page', async ({
    page,
  }) => {
    // Step 1: Visit landing page
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Supply Link');
    await expect(page.locator('text=Track your products')).toBeVisible();

    // Step 2: Connect wallet (mock Freighter)
    // Note: This assumes a "Connect Wallet" button is visible
    const connectButton = page.locator('button:has-text("Connect Wallet")');
    await connectButton.click();

    // Wait for wallet modal/prompt
    // In a real scenario with mocked Freighter, this would trigger the connection
    await expect(page.locator('text=Wallet connected')).toBeVisible({ timeout: 5000 });

    // Step 3: Register product
    const registerLink = page.locator('a:has-text("Register Product")');
    await registerLink.click();

    // Fill product registration form
    await page.fill('input[placeholder*="Product name"]', 'Test Product');
    await page.fill('input[placeholder*="SKU"]', 'SKU-123456');
    await page.fill('input[placeholder*="Manufacturer"]', 'Test Manufacturer');

    // Submit registration
    const registerButton = page.locator('button:has-text("Register")');
    await registerButton.click();

    // Wait for success
    await expect(page.locator('text=Product registered successfully')).toBeVisible({ timeout: 10000 });

    // Step 4: Add tracking event
    const addEventButton = page.locator('button:has-text("Add Event")');
    await addEventButton.click();

    // Fill event form
    await page.fill('input[placeholder*="Location"]', 'Warehouse A');
    await page.fill('textarea[placeholder*="Metadata"]', 'Initial shipment departure');

    // Submit event
    const submitButton = page.locator('button:has-text("Submit")');
    await submitButton.click();

    // Wait for success
    await expect(page.locator('text=Event added successfully')).toBeVisible({ timeout: 5000 });

    // Step 5: View tracking page
    const trackingLink = page.locator('a:has-text("View Tracking")');
    await trackingLink.click();

    // Verify product is on tracking page
    await expect(page.locator('text=Test Product')).toBeVisible();
    await expect(page.locator('text=SKU-123456')).toBeVisible();
    await expect(page.locator('text=Warehouse A')).toBeVisible();

    // Step 6: Scan QR code (simulated)
    // In a real scenario, this would test QR code generation and scanning
    const qrButton = page.locator('button:has-text("QR Code")');
    await qrButton.click();
    await expect(page.locator('canvas')).toBeVisible(); // QR code canvas

    // Step 7: Verify on public page
    // Extract product ID from URL or data attribute
    const productElement = page.locator('[data-product-id]').first();
    const productId = await productElement.getAttribute('data-product-id');

    // Navigate to public verification page
    await page.goto(`/verify/${productId}`);

    // Verify public page shows product info
    await expect(page.locator('text=Test Product')).toBeVisible();
    await expect(page.locator('text=SKU-123456')).toBeVisible();
    await expect(page.locator('text=Warehouse A')).toBeVisible();
  });
});
