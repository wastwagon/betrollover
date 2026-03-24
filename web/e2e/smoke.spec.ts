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

  test('leaderboard redirects to tipsters', async ({ page }) => {
    await page.goto('/leaderboard');
    await expect(page).toHaveURL(/\/tipsters/);
    await expect(page.locator('h1')).toContainText(/Tipsters/i);
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /log in|sign in/i })).toBeVisible();
  });

  test('dashboard redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('subscriptions redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/subscriptions');
    await expect(page).toHaveURL(/\/login/);
  });

  test('VIP subscriptions marketplace loads for guests', async ({ page }) => {
    await page.goto('/subscriptions/marketplace');
    await expect(page).toHaveURL(/\/subscriptions\/marketplace/);
  });

  test('marketplace loads for guests (public list)', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page).toHaveURL(/\/marketplace/);
    await expect(page.locator('h1')).toContainText(/Marketplace|Coupons|Picks/i);
  });

  test('create-pick redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/create-pick');
    await expect(page).toHaveURL(/\/login/);
  });
});
