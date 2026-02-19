import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BetRollover/i);
  });

  test('tipsters page loads', async ({ page }) => {
    await page.goto('/tipsters');
    await expect(page.locator('h1')).toContainText(/Tipsters/i);
  });

  test('leaderboard page loads', async ({ page }) => {
    await page.goto('/leaderboard');
    await expect(page.locator('h1')).toContainText(/Leaderboard/i);
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /log in|sign in/i })).toBeVisible();
  });

  test('dashboard redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('marketplace redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page).toHaveURL(/\/login/);
  });
});
