import { type Page } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  role: 'planner' | 'pilot' | 'commander';
}

export const users: Record<string, TestUser> = {
  planner: { email: 'planner@mission.mil', password: 'password123', role: 'planner' },
  pilot: { email: 'pilot@mission.mil', password: 'password123', role: 'pilot' },
  commander: { email: 'commander@mission.mil', password: 'password123', role: 'commander' },
};

/**
 * Logs in as the given user via the /login page.
 * Waits until redirected away from /login before returning.
 */
export async function login(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL('**/dashboard**');
}

/**
 * Logs out the current user via the UI.
 * Waits until redirected back to /login.
 */
export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: /sign out|log out/i }).click();
  await page.waitForURL('**/login**');
}

/**
 * Creates a new mission from the dashboard and returns its name.
 * Assumes the user is already logged in and on the dashboard.
 */
export async function createMission(
  page: Page,
  overrides: { name?: string; type?: string } = {},
): Promise<string> {
  const missionName = overrides.name ?? `Test Mission ${Date.now()}`;

  await page.getByRole('button', { name: /new mission/i }).click();

  const dialog = page.getByRole('dialog').or(page.locator('[data-testid="mission-form"]'));
  await dialog.waitFor({ state: 'visible' });

  await dialog.getByLabel(/mission name|name/i).fill(missionName);

  if (overrides.type) {
    await dialog.getByLabel(/type|platform/i).selectOption(overrides.type);
  }

  await dialog.getByRole('button', { name: /create|submit|save/i }).click();

  // Wait for the dialog to close and the mission to appear
  await dialog.waitFor({ state: 'hidden' });

  return missionName;
}

/**
 * Navigates to a specific mission by clicking its card on the dashboard.
 */
export async function navigateToMission(page: Page, missionName: string): Promise<void> {
  await page.getByText(missionName).click();
  await page.waitForURL(/\/mission\//);
}
