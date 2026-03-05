import { test, expect } from '@playwright/test';
import { users, login, logout } from './helpers';

test.describe('Authentication', () => {
  test('shows login form on /login', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible();
  });

  test('planner can log in and is redirected to dashboard', async ({ page }) => {
    await login(page, users.planner);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/planner/i)).toBeVisible();
  });

  test('nav displays user name after login', async ({ page }) => {
    await login(page, users.planner);

    const nav = page.getByRole('navigation');
    await expect(nav.getByText(/planner/i)).toBeVisible();
  });

  test('user can sign out and is redirected to login', async ({ page }) => {
    await login(page, users.planner);
    await logout(page);

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('invalid credentials show an error message', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('wrong@mission.mil');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    const errorMessage = page.getByText(/invalid|incorrect|unauthorized|failed/i);
    await errorMessage.waitFor({ state: 'visible' });
    await expect(errorMessage).toBeVisible();
  });
});
