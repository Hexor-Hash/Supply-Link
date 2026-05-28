import { test, expect } from '@playwright/test';

test.describe('E2E: Wallet Connection Requirement', () => {
  test('attempt to add event without wallet → see connect prompt', async ({
    page,
  }) => {
    // Step 1: Navigate to the app
    await page.goto('/');

    // Step 2: Try to add event without connecting wallet
    // Look for "Add Event" button or navigate to the add event page
    const addEventButton = page.locator('button:has-text("Add Event")');

    // If button is available, click it
    if (await addEventButton.isVisible().catch(() => false)) {
      await addEventButton.click();
    } else {
      // Navigate directly to add event page
      await page.goto('/events/add');
    }

    // Step 3: Verify connect wallet prompt is shown
    await expect(
      page.locator(
        'text=/Connect your wallet|Please connect|Wallet required/i'
      ).first()
    ).toBeVisible({ timeout: 5000 });

    // Step 4: Verify "Connect Wallet" button or link is visible
    const connectPrompt = page.locator('button:has-text("Connect Wallet")').first();
    await expect(connectPrompt).toBeVisible();

    // Step 5: Verify form is disabled or not submitted
    const submitButton = page.locator('button:has-text("Submit")').first();
    const isDisabled = await submitButton.isDisabled().catch(() => true);
    expect(isDisabled).toBe(true);

    // Step 6: Click connect wallet from prompt
    await connectPrompt.click();

    // Step 7: Verify wallet connection dialog appears
    await expect(
      page.locator('text=/Select a wallet|Freighter|Wallet/i').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('cannot submit product registration without wallet', async ({
    page,
  }) => {
    // Step 1: Navigate to product registration page
    await page.goto('/');

    const registerLink = page.locator('a:has-text("Register Product")');
    if (await registerLink.isVisible().catch(() => false)) {
      await registerLink.click();
    } else {
      await page.goto('/products/register');
    }

    // Step 2: Fill out the form
    await page.fill('input[placeholder*="Product name"]', 'Test Product');
    await page.fill('input[placeholder*="SKU"]', 'SKU-789');

    // Step 3: Try to submit without wallet
    const submitButton = page.locator('button:has-text("Register")').first();

    // Step 4: Verify submit button is disabled or click shows prompt
    if (await submitButton.isDisabled().catch(() => false)) {
      expect(await submitButton.isDisabled()).toBe(true);
    } else {
      // If not disabled, clicking should show wallet prompt
      await submitButton.click();
      await expect(
        page.locator('text=/Connect your wallet|Please connect/i').first()
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
