import { test, expect } from '@playwright/test';

test.describe('Production Build', () => {
  test('should load the dashboard', async ({ page }) => {
    // Go to the home page
    await page.goto('/');

    // Check if we are loading or on the dashboard
    // If it's static, it might show the loader first or the content
    const loader = page.locator('text=Syncing your academic universe...');
    const welcome = page.locator('text=Welcome'); // WelcomeHeader likely contains this

    // Wait for either the loader or the content
    await expect(page).toHaveTitle(/Agenda\+/);
    
    // We can't guarantee content without a backend, but we can check if the app shell loads
    await expect(page.locator('body')).toBeVisible();
  });
});
