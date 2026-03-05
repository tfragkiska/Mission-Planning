import { test, expect } from '@playwright/test';
import { users, login, createMission, navigateToMission } from './helpers';

test.describe('Waypoint Planning', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, users.planner);
    const missionName = await createMission(page);
    await navigateToMission(page, missionName);

    // Wait for map to fully load
    const mapContainer = page.locator('.maplibregl-map, .mapboxgl-map, [data-testid="map"]');
    await mapContainer.waitFor({ state: 'visible' });
  });

  test('clicking the map adds waypoint markers', async ({ page }) => {
    const map = page.locator('.maplibregl-map, .mapboxgl-map, [data-testid="map"]');
    const mapBox = await map.boundingBox();
    expect(mapBox).not.toBeNull();

    // Click at three different positions on the map to add waypoints
    const centerX = mapBox!.x + mapBox!.width / 2;
    const centerY = mapBox!.y + mapBox!.height / 2;

    await page.mouse.click(centerX - 100, centerY - 50);
    await page.mouse.click(centerX, centerY + 50);
    await page.mouse.click(centerX + 100, centerY - 50);

    // Verify waypoint markers appeared
    const markers = page.locator('.waypoint-marker');
    await expect(markers).toHaveCount(3, { timeout: 5000 });
  });

  test('waypoint panel shows added waypoints in sidebar', async ({ page }) => {
    const map = page.locator('.maplibregl-map, .mapboxgl-map, [data-testid="map"]');
    const mapBox = await map.boundingBox();
    expect(mapBox).not.toBeNull();

    const centerX = mapBox!.x + mapBox!.width / 2;
    const centerY = mapBox!.y + mapBox!.height / 2;

    // Add two waypoints
    await page.mouse.click(centerX - 80, centerY);
    await page.mouse.click(centerX + 80, centerY);

    // Check the sidebar/panel lists the waypoints
    const waypointPanel = page.locator(
      '[data-testid="waypoint-panel"], [data-testid="waypoint-list"], .waypoint-panel',
    );
    await waypointPanel.waitFor({ state: 'visible' });

    const waypointItems = waypointPanel.locator(
      '[data-testid="waypoint-item"], .waypoint-item, li',
    );
    await expect(waypointItems).toHaveCount(2, { timeout: 5000 });
  });

  test('deleting a waypoint removes it from the map and panel', async ({ page }) => {
    const map = page.locator('.maplibregl-map, .mapboxgl-map, [data-testid="map"]');
    const mapBox = await map.boundingBox();
    expect(mapBox).not.toBeNull();

    const centerX = mapBox!.x + mapBox!.width / 2;
    const centerY = mapBox!.y + mapBox!.height / 2;

    // Add two waypoints
    await page.mouse.click(centerX - 80, centerY);
    await page.mouse.click(centerX + 80, centerY);

    const markers = page.locator('.waypoint-marker');
    await expect(markers).toHaveCount(2, { timeout: 5000 });

    // Delete the first waypoint via its delete button in the panel
    const waypointPanel = page.locator(
      '[data-testid="waypoint-panel"], [data-testid="waypoint-list"], .waypoint-panel',
    );
    await waypointPanel.waitFor({ state: 'visible' });

    const deleteButton = waypointPanel
      .locator('[data-testid="waypoint-item"], .waypoint-item, li')
      .first()
      .getByRole('button', { name: /delete|remove/i });
    await deleteButton.click();

    // Verify one waypoint remains
    await expect(markers).toHaveCount(1, { timeout: 5000 });
  });
});
