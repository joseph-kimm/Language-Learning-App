/**
 * Navigation / sidebar tests (authenticated)
 *
 * Desktop (≥768px): sidebar is always visible, hamburger is hidden.
 * Mobile  (<768px): sidebar is off-screen by default, hamburger toggles it.
 */
import { test, expect } from '@playwright/test'

// ─── Desktop ────────────────────────────────────────────────────────────────

test.describe('Side navigation – desktop', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('hamburger button is not visible on desktop', async ({ page }) => {
    const hamburger = page.locator('[class*="hamburger"]')
    await expect(hamburger).toBeHidden()
  })

  test('sidebar is always visible on desktop', async ({ page }) => {
    const nav = page.locator('nav[aria-label="Chat history"]')
    await expect(nav).toBeVisible()
  })

  test('sidebar shows Chat History heading', async ({ page }) => {
    const nav = page.locator('nav[aria-label="Chat history"]')
    await expect(nav.getByText('Chat History')).toBeVisible()
  })

  test('sidebar shows New Chat button', async ({ page }) => {
    const nav = page.locator('nav[aria-label="Chat history"]')
    await expect(nav.getByRole('button', { name: /new chat/i })).toBeVisible()
  })

  test('clicking New Chat resets to the welcome state', async ({ page }) => {
    // Send a message first so the chat has content
    await page.locator('textarea').fill('Test message')
    await page.getByRole('button', { name: /send/i }).click()
    await expect(page.getByText('Test message')).toBeVisible({ timeout: 15_000 })

    // New Chat button is always accessible on desktop
    const nav = page.locator('nav[aria-label="Chat history"]')
    await nav.getByRole('button', { name: /new chat/i }).click()

    await expect(page.getByText('Welcome to your language learning journey!')).toBeVisible()
  })
})

// ─── Mobile ─────────────────────────────────────────────────────────────────

test.describe('Side navigation – mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('hamburger button is visible on mobile', async ({ page }) => {
    const hamburger = page.locator('[class*="hamburger"]')
    await expect(hamburger).toBeVisible()
  })

  test('sidebar is hidden by default on mobile', async ({ page }) => {
    const nav = page.locator('nav[aria-label="Chat history"]')
    // Nav is in the DOM but translated off-screen; it should not have the open class
    await expect(nav).not.toHaveClass(/open/)
  })

  test('clicking hamburger opens the sidebar', async ({ page }) => {
    await page.locator('[class*="hamburger"]').click()

    const nav = page.locator('nav[aria-label="Chat history"]')
    await expect(nav).toHaveClass(/open/)
  })

  test('open sidebar shows Chat History heading and New Chat button', async ({ page }) => {
    await page.locator('[class*="hamburger"]').click()

    const nav = page.locator('nav[aria-label="Chat history"]')
    await expect(nav.getByText('Chat History')).toBeVisible()
    await expect(nav.getByRole('button', { name: /new chat/i })).toBeVisible()
  })

  test('clicking backdrop closes the sidebar', async ({ page }) => {
    await page.locator('[class*="hamburger"]').click()

    const nav = page.locator('nav[aria-label="Chat history"]')
    await expect(nav).toHaveClass(/open/)

    await page.locator('[class*="backdrop"]').click()
    await expect(nav).not.toHaveClass(/open/)
  })

  test('clicking New Chat resets to the welcome state on mobile', async ({ page }) => {
    // Send a message first
    await page.locator('textarea').fill('Test message')
    await page.getByRole('button', { name: /send/i }).click()
    await expect(page.getByText('Test message')).toBeVisible({ timeout: 15_000 })

    // Open sidebar, then click New Chat
    await page.locator('[class*="hamburger"]').click()
    const nav = page.locator('nav[aria-label="Chat history"]')
    await nav.getByRole('button', { name: /new chat/i }).click()

    await expect(page.getByText('Welcome to your language learning journey!')).toBeVisible()
  })
})
