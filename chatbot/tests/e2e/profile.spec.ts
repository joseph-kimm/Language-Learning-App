/**
 * Profile page tests (authenticated)
 */
import { test, expect } from '@playwright/test'

test.describe('Profile page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')
  })

  test('renders the profile page heading', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Your Profile')
  })

  test('shows About You and Account tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: /about you/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /account/i })).toBeVisible()
  })

  test('About You tab is active by default', async ({ page }) => {
    const aboutTab = page.getByRole('button', { name: /about you/i })
    await expect(aboutTab).toHaveClass(/tabActive/)
  })

  test('clicking Account tab switches to account content', async ({ page }) => {
    await page.getByRole('button', { name: /account/i }).click()

    const accountTab = page.getByRole('button', { name: /account/i })
    await expect(accountTab).toHaveClass(/tabActive/)

    // About You tab should no longer be active
    const aboutTab = page.getByRole('button', { name: /about you/i })
    await expect(aboutTab).not.toHaveClass(/tabActive/)
  })

  test('shows Sign Out button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible()
  })

  test('Sign Out redirects to /login', async ({ page }) => {
    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL('/login', { timeout: 10_000 })
  })

  test('Back to Chat button navigates to /', async ({ page }) => {
    // This button only appears when the user has a profile
    const backBtn = page.getByRole('button', { name: /back to chat/i })
    const isVisible = await backBtn.isVisible()

    if (isVisible) {
      await backBtn.click()
      await expect(page).toHaveURL('/')
    } else {
      // Demo user may not have a profile — skip gracefully
      test.skip()
    }
  })
})
