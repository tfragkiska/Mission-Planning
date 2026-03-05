import { test, expect } from '@playwright/test';
import { users, login, createMission } from './helpers';

test.describe('Briefing Download', () => {
  test('downloads a briefing PDF for a mission', async ({ page }) => {
    await login(page, users.planner);
    await createMission(page);

    // Wait for the Download Briefing button to appear
    const downloadBtn = page.getByRole('button', { name: /download briefing/i });
    await downloadBtn.waitFor({ state: 'visible', timeout: 10000 });

    // Set up download listener before clicking
    const downloadPromise = page.waitForEvent('download');
    await downloadBtn.click();

    // Verify a download event was triggered
    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    expect(filename).toBeTruthy();
    expect(filename).toMatch(/\.pdf$/i);
  });
});
