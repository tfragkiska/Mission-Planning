import { test, expect } from '@playwright/test';
import { users, login, createMission, navigateToMission } from './helpers';

test.describe('Mission CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, users.planner);
  });

  test('creates a new mission from the dashboard', async ({ page }) => {
    const missionName = await createMission(page);

    // Verify the mission card appears on the dashboard
    const missionCard = page.getByText(missionName);
    await missionCard.waitFor({ state: 'visible' });
    await expect(missionCard).toBeVisible();
  });

  test('mission page loads with map when clicked', async ({ page }) => {
    const missionName = await createMission(page);
    await navigateToMission(page, missionName);

    // Verify the mission detail page loaded
    await expect(page).toHaveURL(/\/mission\//);
    await expect(page.getByText(missionName)).toBeVisible();

    // Verify map canvas is present
    const mapContainer = page.locator('.maplibregl-map, .mapboxgl-map, [data-testid="map"]');
    await mapContainer.waitFor({ state: 'visible' });
    await expect(mapContainer).toBeVisible();
  });

  test('new mission has DRAFT status', async ({ page }) => {
    const missionName = await createMission(page);
    await navigateToMission(page, missionName);

    const statusBadge = page.getByText(/draft/i).first();
    await statusBadge.waitFor({ state: 'visible' });
    await expect(statusBadge).toBeVisible();
  });
});
