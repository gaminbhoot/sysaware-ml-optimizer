import { test, expect } from '@playwright/test';

test.describe('Prompt Engine Chat Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prompt');
  });

  test('should allow entering chat mode', async ({ page }) => {
    // Initial state: Restructure mode
    await expect(page.getByText('Semantic Restructuring Interface')).toBeVisible();
    
    // Click Enter Chat Mode
    await page.getByRole('button', { name: /Enter Chat Mode/i }).click();
    
    // Verify Chat mode UI
    await expect(page.getByText('Interactive Hardware-Aware Chat')).toBeVisible();
    await expect(page.getByText('SysAware Assistant')).toBeVisible();
  });

  test('should send a message and receive a streamed response', async ({ page }) => {
    await page.getByRole('button', { name: /Enter Chat Mode/i }).click();
    
    const input = page.getByPlaceholder('Ask anything about your model or hardware...');
    await input.fill('What is my current VRAM bandwidth?');
    await page.getByRole('button', { name: /Send/i }).click(); // Send icon button

    // Check for user message
    await expect(page.getByText('What is my current VRAM bandwidth?')).toBeVisible();

    // Check for streamed assistant response (contains hardware recommendations)
    await expect(page.getByText(/I am currently optimized for your hardware/i)).toBeVisible({ timeout: 10000 });
  });

  test('should toggle the optimizer sidebar in chat mode', async ({ page }) => {
    await page.getByRole('button', { name: /Enter Chat Mode/i }).click();
    
    // Sidebar should be open by default (Desktop)
    await expect(page.getByText('Runtime Stats')).toBeVisible();
    
    // Click toggle button (icon only, we'll use locator by component structure if needed, or by test-id)
    // In our code: <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} ...> <SidebarIcon ... /> </button>
    // Let's try finding by the icon component or class if possible, or just the 2nd button in the header
    const sidebarToggle = page.locator('button').filter({ has: page.locator('svg') }).nth(2); // 1st is Enter Chat, 2nd is Trash, 3rd is Sidebar toggle
    // Wait, the header has: 1. Exit Chat button. 2. Trash icon button. 3. Sidebar icon button.
    
    // Better locator:
    const sidebarBtn = page.getByRole('button').filter({ hasText: '' }).nth(2); // The one with no text but icon
    
    // Let's just click it
    await sidebarBtn.click();
    
    // Verify sidebar is hidden
    await expect(page.getByText('Runtime Stats')).not.toBeVisible();
  });
});
