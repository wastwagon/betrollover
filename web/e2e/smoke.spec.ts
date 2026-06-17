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

  test('subscriptions redirects guests to marketplace', async ({ page }) => {
    await page.goto('/subscriptions');
    await expect(page).toHaveURL(/\/subscriptions\/marketplace/);
  });

  test('discover page loads with sport filters', async ({ page }) => {
    await page.goto('/discover');
    await expect(page).toHaveURL(/\/discover/);
    await expect(page.getByRole('button', { name: /football/i }).first()).toBeVisible();
  });

  test('discover sport filter updates URL', async ({ page }) => {
    await page.goto('/discover');
    await page.getByRole('button', { name: /basketball/i }).first().click();
    await expect(page).toHaveURL(/sport=basketball/);
  });

  test('French locale home loads', async ({ page }) => {
    await page.goto('/fr');
    await expect(page).toHaveTitle(/BetRollover/i);
  });

  test('VIP subscriptions marketplace loads for guests', async ({ page }) => {
    await page.goto('/subscriptions/marketplace');
    await expect(page).toHaveURL(/\/subscriptions\/marketplace/);
  });

  test('marketplace loads for guests', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page).toHaveURL(/\/marketplace/);
    await expect(page.locator('h1')).toContainText(/Marketplace/i);
  });

  test('create-pick redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/create-pick');
    await expect(page).toHaveURL(/\/login/);
  });
});
