import { test, expect } from '@playwright/test';
import { users, login, logout, createMission } from './helpers';

test.describe('Mission Lifecycle', () => {
  test('mission transitions: Draft -> Planned -> Under Review -> Approved', async ({ page }) => {
    test.setTimeout(60000);

    // --- Planner: create and advance mission ---
    await login(page, users.planner);
    await createMission(page);

    await expect(page.getByText(/Status:.*DRAFT/)).toBeVisible({ timeout: 10000 });

    // Transition: Draft -> Planned
    await page.getByRole('button', { name: /mark as planned/i }).click();
    await expect(page.getByText(/Status:.*PLANNED/)).toBeVisible({ timeout: 10000 });

    // Transition: Planned -> Under Review
    await page.getByRole('button', { name: /submit for review/i }).click();
    await expect(page.getByText(/Status:.*UNDER REVIEW/)).toBeVisible({ timeout: 10000 });

    const missionUrl = page.url();

    // --- Commander: approve the mission ---
    await logout(page);
    await login(page, users.commander);

    await page.goto(missionUrl);
    await expect(page.getByText(/Status:.*UNDER REVIEW/)).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /approve/i }).click();
    await expect(page.getByText(/Status:.*APPROVED/)).toBeVisible({ timeout: 10000 });
  });
});
