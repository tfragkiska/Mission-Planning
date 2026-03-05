import { test, expect } from '@playwright/test';
import { users, login, createMission } from './helpers';

// Map interaction tests require WebGL which isn't available in headless Chromium.
// These tests should be run with --headed flag or in a CI environment with GPU support.
test.describe('Waypoint Planning', () => {
  test.skip(({ browserName }) => browserName === 'chromium', 'Skipped: WebGL not available in headless Chromium');

  test.beforeEach(async ({ page }) => {
    await login(page, users.planner);
    await createMission(page);
  });

  test('clicking the map adds waypoint markers', async ({ page }) => {
    const mapCanvas = page.locator('canvas.maplibregl-canvas');
    const mapBox = await mapCanvas.boundingBox();
    expect(mapBox).not.toBeNull();

    const centerX = mapBox!.x + mapBox!.width / 2;
    const centerY = mapBox!.y + mapBox!.height / 2;

    await page.mouse.click(centerX - 100, centerY - 50);
    await page.waitForTimeout(800);
    await page.mouse.click(centerX, centerY + 50);
    await page.waitForTimeout(800);
    await page.mouse.click(centerX + 100, centerY - 50);

    const markers = page.locator('.waypoint-marker');
    await expect(markers).toHaveCount(3, { timeout: 10000 });
  });

  test('waypoint panel shows added waypoints in sidebar', async ({ page }) => {
    const mapCanvas = page.locator('canvas.maplibregl-canvas');
    const mapBox = await mapCanvas.boundingBox();
    expect(mapBox).not.toBeNull();

    const centerX = mapBox!.x + mapBox!.width / 2;
    const centerY = mapBox!.y + mapBox!.height / 2;

    await page.mouse.click(centerX - 80, centerY);
    await page.waitForTimeout(800);
    await page.mouse.click(centerX + 80, centerY);

    await expect(page.getByText('Waypoints (2)')).toBeVisible({ timeout: 10000 });
  });

  test('deleting a waypoint removes it', async ({ page }) => {
    const mapCanvas = page.locator('canvas.maplibregl-canvas');
    const mapBox = await mapCanvas.boundingBox();
    expect(mapBox).not.toBeNull();

    const centerX = mapBox!.x + mapBox!.width / 2;
    const centerY = mapBox!.y + mapBox!.height / 2;

    await page.mouse.click(centerX - 80, centerY);
    await page.waitForTimeout(800);
    await page.mouse.click(centerX + 80, centerY);

    const markers = page.locator('.waypoint-marker');
    await expect(markers).toHaveCount(2, { timeout: 10000 });

    const deleteButtons = page.locator('button').filter({ hasText: 'x' });
    await deleteButtons.first().click();

    await expect(markers).toHaveCount(1, { timeout: 10000 });
  });
});
