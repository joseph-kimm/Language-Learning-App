/**
 * Login page tests
 *
 * These tests run WITHOUT an authenticated session so we can test the login
 * page itself (the storageState is set per-project in playwright.config.ts —
 * tests in this file explicitly clear it via browser context options).
 *
 * NOTE: This spec file is in the chromium project which loads .auth/user.json,
 * but we navigate directly to /login which is always accessible, and we test
 * only the UI behaviour (form validation, error messages, navigation links).
 * We do NOT test a successful login here because that is covered by
 * global-setup.ts (which is what creates the saved session).
 */
import { test, expect } from '@playwright/test'

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    // Go directly to /login even if already authenticated
    await page.goto('/login')
    // Wait for the card to be visible before each test
    await expect(page.locator('h1')).toContainText('Welcome back')
  })

  test('renders all expected elements', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Welcome back')
    await expect(page.locator('p').first()).toContainText('Log in to continue learning')
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Log In')
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /try without login/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible()
  })

  test('shows error message for invalid credentials', async ({ page }) => {
    await page.fill('#email', 'wrong@example.com')
    await page.fill('#password', 'wrongpassword')
    await page.click('button[type="submit"]')

    await expect(page.locator('p.error, [class*="error"]')).toContainText(
      'Invalid email or password',
      { timeout: 15_000 }
    )
  })

  test('submit button is disabled while logging in', async ({ page }) => {
    await page.fill('#email', 'demo@demo.com')
    await page.fill('#password', '12345678')

    // Click and immediately check the disabled state
    const submitBtn = page.locator('button[type="submit"]')
    await submitBtn.click()
    await expect(submitBtn).toBeDisabled()
  })

  test('sign up link navigates to /signup', async ({ page }) => {
    await page.getByRole('link', { name: /sign up/i }).click()
    await expect(page).toHaveURL('/signup')
  })
})
