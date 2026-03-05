import { test, expect } from '@playwright/test';
import { users, login, createMission, navigateToMission } from './helpers';

test.describe('Briefing Download', () => {
  test('downloads a briefing PDF for a mission', async ({ page }) => {
    await login(page, users.planner);
    const missionName = await createMission(page);
    await navigateToMission(page, missionName);

    // Wait for mission page to fully load
    await expect(page.getByText(missionName)).toBeVisible();

    // Set up download listener before clicking
    const downloadPromise = page.waitForEvent('download');

    const downloadBtn = page.getByRole('button', { name: /download briefing|briefing|download/i });
    await downloadBtn.waitFor({ state: 'visible' });
    await downloadBtn.click();

    // Verify a download event was triggered
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();

    // Optionally verify the file has a PDF-like name
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.(pdf|PDF)$/);
  });
});
