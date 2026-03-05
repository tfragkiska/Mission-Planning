import { test, expect } from '@playwright/test';
import { users, login, logout, createMission, navigateToMission } from './helpers';

test.describe('Mission Lifecycle', () => {
  test('mission transitions through full lifecycle: Draft -> Planned -> Under Review -> Approved', async ({
    page,
  }) => {
    // --- Planner: create and advance mission ---
    await login(page, users.planner);
    const missionName = await createMission(page);
    await navigateToMission(page, missionName);

    // Verify initial DRAFT status
    await expect(page.getByText(/draft/i).first()).toBeVisible();

    // Add waypoints so the mission has route data
    const map = page.locator('.maplibregl-map, .mapboxgl-map, [data-testid="map"]');
    await map.waitFor({ state: 'visible' });
    const mapBox = await map.boundingBox();
    expect(mapBox).not.toBeNull();

    const centerX = mapBox!.x + mapBox!.width / 2;
    const centerY = mapBox!.y + mapBox!.height / 2;

    await page.mouse.click(centerX - 80, centerY);
    await page.mouse.click(centerX + 80, centerY);

    // Transition: Draft -> Planned
    const markPlannedBtn = page.getByRole('button', { name: /mark as planned|planned/i });
    await markPlannedBtn.waitFor({ state: 'visible' });
    await markPlannedBtn.click();

    const plannedStatus = page.getByText(/planned/i).first();
    await plannedStatus.waitFor({ state: 'visible' });
    await expect(plannedStatus).toBeVisible();

    // Transition: Planned -> Under Review
    const submitReviewBtn = page.getByRole('button', { name: /submit for review|submit/i });
    await submitReviewBtn.waitFor({ state: 'visible' });
    await submitReviewBtn.click();

    const reviewStatus = page.getByText(/under review|review/i).first();
    await reviewStatus.waitFor({ state: 'visible' });
    await expect(reviewStatus).toBeVisible();

    // Store the current mission URL for the commander
    const missionUrl = page.url();

    // --- Commander: approve the mission ---
    await logout(page);
    await login(page, users.commander);

    await page.goto(missionUrl);
    await page.waitForURL(missionUrl);

    // Verify the mission is under review
    await expect(page.getByText(/under review|review/i).first()).toBeVisible();

    // Transition: Under Review -> Approved
    const approveBtn = page.getByRole('button', { name: /approve/i });
    await approveBtn.waitFor({ state: 'visible' });
    await approveBtn.click();

    const approvedStatus = page.getByText(/approved/i).first();
    await approvedStatus.waitFor({ state: 'visible' });
    await expect(approvedStatus).toBeVisible();
  });
});
