/**
 * Chat page tests (authenticated)
 *
 * The browser starts with the demo user's saved session loaded from
 * .auth/user.json so every test here begins already logged in.
 *
 * We test the chat UI and interaction — we do NOT wait for the LLM to
 * respond because that can take 30+ seconds on a cold start. Instead we
 * verify that the message was sent (appears in the UI) and that the
 * loading/typing state is triggered correctly.
 */
import { test, expect } from '@playwright/test'

test.describe('Chat page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for the chat interface to fully hydrate
    await page.waitForLoadState('domcontentloaded')
  })

  test('renders the chat interface', async ({ page }) => {
    await expect(page.locator('textarea')).toBeVisible()
    await expect(page.getByRole('button', { name: /send/i })).toBeVisible()
  })

  test('shows welcome message on a fresh chat', async ({ page }) => {
    await expect(page.getByText('Welcome to your language learning journey!')).toBeVisible()
    await expect(page.getByText('Start a conversation to practice.')).toBeVisible()
  })

  test('shows personality picker before any messages are sent', async ({ page }) => {
    await expect(page.getByText('Choose a personality')).toBeVisible()
  })

  test('send button is disabled when textarea is empty', async ({ page }) => {
    const sendBtn = page.getByRole('button', { name: /send/i })
    await expect(sendBtn).toBeDisabled()
  })

  test('send button enables when text is typed', async ({ page }) => {
    const sendBtn = page.getByRole('button', { name: /send/i })
    await page.locator('textarea').fill('Hola')
    await expect(sendBtn).toBeEnabled()
  })

  test('clears textarea on send and shows user message', async ({ page }) => {
    const textarea = page.locator('textarea')
    const sendBtn = page.getByRole('button', { name: /send/i })

    await textarea.fill('Hola, ¿cómo estás?')
    await sendBtn.click()

    // Textarea should be cleared immediately after sending
    await expect(textarea).toHaveValue('')

    // The user's message should appear in the chat
    await expect(page.getByText('Hola, ¿cómo estás?')).toBeVisible({ timeout: 15_000 })
  })

  test('Enter key submits the message', async ({ page }) => {
    const textarea = page.locator('textarea')

    await textarea.fill('Buenos días')
    await textarea.press('Enter')

    await expect(textarea).toHaveValue('')
    await expect(page.getByText('Buenos días')).toBeVisible({ timeout: 15_000 })
  })

  test('Shift+Enter inserts a newline instead of submitting', async ({ page }) => {
    const textarea = page.locator('textarea')

    await textarea.fill('line one')
    await textarea.press('Shift+Enter')
    // Should still have content (not submitted)
    const value = await textarea.inputValue()
    expect(value).toContain('line one')
  })

  test('textarea is disabled while waiting for bot response', async ({ page }) => {
    const textarea = page.locator('textarea')

    await textarea.fill('¿Qué hora es?')
    await page.getByRole('button', { name: /send/i }).click()

    // After send, textarea should become disabled until the bot responds
    await expect(textarea).toBeDisabled({ timeout: 5_000 })
  })

  test('settings button navigates to /profile', async ({ page }) => {
    await page.getByRole('button', { name: /settings/i }).click()
    await expect(page).toHaveURL('/profile')
  })

  test('language dropdown is visible', async ({ page }) => {
    // LanguageDropdown is always rendered in the page header
    const dropdown = page.locator('[class*="languageDropdown"], [class*="dropdown"]')
    await expect(dropdown.first()).toBeVisible()
  })
})
