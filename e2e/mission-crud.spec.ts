import { test, expect } from '@playwright/test';
import { users, login, createMission } from './helpers';

test.describe('Mission CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, users.planner);
  });

  test('creates a new mission from the dashboard', async ({ page }) => {
    const missionName = await createMission(page);

    // After creation we're on the mission page - go back to dashboard
    await page.goto('/dashboard');

    // Use search to find the specific mission
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(missionName);
      // Wait for debounce (300ms) + render
      await page.waitForTimeout(1000);
    }

    // Find the mission card and scroll it into view
    const missionCard = page.getByText(missionName).first();
    await missionCard.scrollIntoViewIfNeeded({ timeout: 10000 });
    await expect(missionCard).toBeVisible({ timeout: 10000 });
  });

  test('mission page loads after creation', async ({ page }) => {
    const missionName = await createMission(page);

    await expect(page).toHaveURL(/\/missions\//);
    await expect(page.getByRole('heading', { name: missionName })).toBeVisible();
  });

  test('new mission has DRAFT status', async ({ page }) => {
    await createMission(page);

    await expect(page.getByText('DRAFT').first()).toBeVisible({ timeout: 10000 });
  });
});
