/**
 * E2E tests: Core user flow
 * paste notice → AI extraction (offline parser) → preview → save → list view → filter → search
 */
import { test, expect } from '@playwright/test';

// Use the server's offline parser (no real Gemini key in CI)
// so tests are deterministic and fast.

test.describe('Core User Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage for isolation
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('loads the app with correct title and landmark regions', async ({ page }) => {
    await expect(page).toHaveTitle(/Campus Pulse/i);
    await expect(page.locator('header[role="banner"]')).toBeVisible();
    await expect(page.locator('main[role="main"]')).toBeVisible();
    await expect(page.locator('footer[role="contentinfo"]')).toBeVisible();
  });

  test('skip link is the first focusable element', async ({ page }) => {
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toHaveClass(/skip-link/);
    await expect(focused).toHaveText(/skip to main content/i);
  });

  test('theme toggle switches between light and dark mode', async ({ page }) => {
    // Default is light
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');

    const themeBtn = page.getByRole('button', { name: /dark mode|toggle theme/i });
    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('paste text → extract event → preview modal appears', async ({ page }) => {
    // Fill in the textarea
    const textarea = page.getByRole('textbox', { name: /paste your notice/i });
    await textarea.fill(
      'Workshop on Machine Learning\nDate: 15th November 2025\nTime: 2:00 PM - 4:00 PM\nVenue: CS Lab, Block A\nAll CSE students are invited.'
    );

    // Click Extract
    const extractBtn = page.getByRole('button', { name: /extract event/i });
    await extractBtn.click();

    // Preview modal should appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Title should be populated
    const titleInput = dialog.getByRole('textbox', { name: /title/i });
    await expect(titleInput).not.toHaveValue('');
  });

  test('saves extracted event and shows it in list', async ({ page }) => {
    const textarea = page.getByRole('textbox', { name: /paste your notice/i });
    await textarea.fill(
      'Annual Sports Day\nDate: 20th December 2025\nTime: 9:00 AM\nVenue: Ground Floor\nAll students welcome.'
    );

    await page.getByRole('button', { name: /extract event/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Save
    await dialog.getByRole('button', { name: /save/i }).click();
    await expect(dialog).not.toBeVisible();

    // Should see the item in the list
    const list = page.locator('[data-testid="items-list"], #items-section');
    await expect(list).toContainText(/Annual Sports Day|Sports/i);
  });

  test('search filters items', async ({ page }) => {
    // First add an item via localStorage directly
    await page.evaluate(() => {
      const items = [
        {
          id: 'test-item-1',
          title: 'Python Workshop',
          date: '2025-12-01',
          time: '10:00',
          venue: 'CS Lab',
          category: 'Academic',
          rawText: 'Python Workshop on 1st Dec',
          source: 'offline' as const,
          status: 'upcoming' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          isDeleted: false,
          version: 1,
        },
        {
          id: 'test-item-2',
          title: 'Football Tryouts',
          date: '2025-12-05',
          time: '15:00',
          venue: 'Ground',
          category: 'Sports',
          rawText: 'Football tryouts on 5th Dec',
          source: 'offline' as const,
          status: 'upcoming' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          isDeleted: false,
          version: 1,
        },
      ];
      localStorage.setItem('campusPulse.v1.items', JSON.stringify(items));
    });
    await page.reload();

    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));
    await searchInput.fill('Python');

    await expect(page.locator('#items-section')).toContainText('Python Workshop');
    await expect(page.locator('#items-section')).not.toContainText('Football Tryouts');
  });

  test('delete item with undo', async ({ page }) => {
    await page.evaluate(() => {
      const items = [
        {
          id: 'test-del-1',
          title: 'Delete Me Event',
          date: '2025-12-10',
          time: '11:00',
          venue: 'Room 101',
          category: 'Academic',
          rawText: 'test',
          source: 'offline' as const,
          status: 'upcoming' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          isDeleted: false,
          version: 1,
        },
      ];
      localStorage.setItem('campusPulse.v1.items', JSON.stringify(items));
    });
    await page.reload();

    await expect(page.locator('#items-section')).toContainText('Delete Me Event');

    const deleteBtn = page.getByRole('button', { name: /delete/i }).first();
    await deleteBtn.click();

    // Undo toast should appear
    const undoBtn = page.getByRole('button', { name: /undo/i });
    await expect(undoBtn).toBeVisible({ timeout: 5_000 });

    // Click undo
    await undoBtn.click();

    // Item should be back
    await expect(page.locator('#items-section')).toContainText('Delete Me Event');
  });
});

