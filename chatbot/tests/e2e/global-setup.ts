/**
 * global-setup.ts
 *
 * Runs once before all tests. Logs in with the demo account and saves the
 * browser's cookies/session to .auth/user.json so every test can start
 * already authenticated — no per-test login needed.
 */
import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const AUTH_FILE = path.join(__dirname, '../../.auth/user.json')

setup('authenticate as demo user', async ({ page }) => {
  // Ensure .auth directory exists
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })

  await page.goto('/login')

  // Fill in demo credentials (set via NEXT_PUBLIC_ env vars in .env)
  await page.fill('#email', process.env.NEXT_PUBLIC_DEMO_USER_EMAIL ?? 'demo@demo.com')
  await page.fill('#password', process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD ?? '12345678')
  await page.click('button[type="submit"]')

  // After successful login, Next-Auth redirects to /
  await page.waitForURL('/', { timeout: 15_000 })
  await expect(page).toHaveURL('/')

  // Save the authenticated session (cookies + localStorage) to disk
  await page.context().storageState({ path: AUTH_FILE })
})