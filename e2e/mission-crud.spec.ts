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

    const missionCard = page.getByText(missionName);
    await missionCard.waitFor({ state: 'visible', timeout: 10000 });
    await expect(missionCard).toBeVisible();
  });

  test('mission page loads after creation', async ({ page }) => {
    const missionName = await createMission(page);

    await expect(page).toHaveURL(/\/missions\//);
    // The heading with mission name should be visible (error boundary catches map failures)
    await expect(page.getByRole('heading', { name: missionName })).toBeVisible();
  });

  test('new mission has DRAFT status', async ({ page }) => {
    await createMission(page);

    await expect(page.getByText(/Status:.*DRAFT/)).toBeVisible({ timeout: 10000 });
  });
});
