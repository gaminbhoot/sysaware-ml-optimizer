import { test, expect } from '@playwright/test';

test.describe('Routing Refactor Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have a functioning sidebar with active routes', async ({ page }) => {
    // Navigate to a page where sidebar is visible
    await page.goto('/profiler');
    
    // Check for surviving routes
    await expect(page.getByRole('link', { name: 'Profiler' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Model' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Prompts' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Fleet' })).toBeVisible();

    // Check that removed routes are NOT in the sidebar
    await expect(page.getByRole('link', { name: 'Optimizer' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Results' })).not.toBeVisible();
  });

  test('navigating to /model should work', async ({ page }) => {
    await page.goto('/model');
    // Check for some content unique to the Model page
    await expect(page.locator('body')).toContainText(/Model Analysis|Model/i);
  });

  test('navigating to /prompt should work', async ({ page }) => {
    await page.goto('/prompt');
    await expect(page.locator('body')).toContainText(/Prompts|Prompt Engine/i);
  });

  test('navigating to deprecated /optimizer should redirect to /model', async ({ page }) => {
    await page.goto('/optimizer');
    await expect(page).toHaveURL(/\/model/);
    await expect(page.locator('body')).toContainText(/Model Analysis|Model/i);
  });
});
