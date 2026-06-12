import { test, expect, Page } from '@playwright/test';

async function loadMockModel(page: Page) {
  await page.locator('input[placeholder*="safetensors"]').fill('temp_model.pt');
  await page.getByRole('button', { name: 'Inspect Model' }).click();
  await expect(page.getByText('Total Parameters')).toBeVisible({ timeout: 10000 });
}

test.describe('Model Hub Functional Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/model');
  });

  test('should allow switching between hub tabs', async ({ page }) => {
    // Start at Inspect
    await expect(page.getByText('Model Filesystem Path')).toBeVisible();

    // Switch to Diagnostic
    await page.getByRole('button', { name: 'Diagnostic' }).click();
    // Since no model is loaded, it should show "No Model Loaded"
    await expect(page.getByText('No Model Loaded')).toBeVisible();

    // Switch to Tuner
    await page.getByRole('button', { name: 'Tuner' }).click();
    await expect(page.getByText('Ready to Tune?')).toBeVisible();
  });

  test('diagnostic path should run successfully with mock model', async ({ page }) => {
    // 1. Load a model first
    await loadMockModel(page);

    // 2. Go to Diagnostic
    await page.getByRole('button', { name: 'Diagnostic' }).click();
    await expect(page.getByText('Path A: Custom Model Diagnostic')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Initiate Scan' })).toBeEnabled();

    // 3. Start Scan
    await page.getByRole('button', { name: 'Initiate Scan' }).click();
    
    // Wait for completion (don't strictly wait for 'Scanning Layers...' as it might be too fast)
    await expect(page.getByText('Scan Results for')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Model contains float32 parameters/i)).toBeVisible();
  });

  test('tuner path should show benchmarking progress', async ({ page }) => {
    // 1. Load model
    await loadMockModel(page);

    // 2. Go to Tuner
    await page.getByRole('button', { name: 'Tuner' }).click();
    await expect(page.getByText('Path B: Runtime Parameter Tuner')).toBeVisible();
    
    // 3. Start Tuning
    await page.getByRole('button', { name: 'Start Tuning' }).click();

    // Wait for completion
    await expect(page.getByText('100% GPU')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Max Context', { exact: true })).toBeVisible();
  });
});
