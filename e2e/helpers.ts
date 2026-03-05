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
 */
export async function login(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /authenticate|sign in/i }).click();
  await page.waitForURL('**/dashboard**');
}

/**
 * Logs out the current user via the UI.
 */
export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: /sign out/i }).click();
  await page.waitForURL('**/login**');
}

/**
 * Creates a new mission from the dashboard and returns its name.
 * After creation, the app navigates to the mission detail page.
 * We wait for the mission name to appear on that page.
 */
export async function createMission(
  page: Page,
  overrides: { name?: string; type?: string } = {},
): Promise<string> {
  const missionName = overrides.name ?? `Test Mission ${Date.now()}`;

  // Make sure we're on the dashboard
  if (!page.url().includes('/dashboard')) {
    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard**');
  }

  await page.getByRole('button', { name: /new mission/i }).click();

  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible' });

  await dialog.getByLabel(/mission name/i).fill(missionName);

  if (overrides.type) {
    await dialog.getByLabel(/type/i).selectOption(overrides.type);
  }

  await dialog.getByRole('button', { name: /create/i }).click();

  // After creation, app navigates to /missions/:id
  await page.waitForURL(/\/missions\//, { timeout: 10000 });

  // Wait for the mission page to actually render with the mission name
  await page.getByRole('heading', { name: missionName }).waitFor({ state: 'visible', timeout: 10000 });

  return missionName;
}

/**
 * Navigates to a specific mission by clicking its card on the dashboard.
 */
export async function navigateToMission(page: Page, missionName: string): Promise<void> {
  await page.goto('/dashboard');
  await page.getByText(missionName).click();
  await page.waitForURL(/\/missions\//);
  // Wait for mission page to load
  await page.getByRole('heading', { name: missionName }).waitFor({ state: 'visible', timeout: 10000 });
}

/**
 * Wait for the map to be ready on the mission page.
 */
export async function waitForMap(page: Page): Promise<void> {
  // MapLibre adds the canvas after initialization
  const mapCanvas = page.locator('canvas.maplibregl-canvas');
  await mapCanvas.waitFor({ state: 'visible', timeout: 15000 });
  // Give the map tiles a moment to start loading
  await page.waitForTimeout(1500);
}
