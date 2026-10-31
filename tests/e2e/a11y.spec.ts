/**
 * E2E Accessibility tests using @axe-core/playwright.
 * Target: Zero WCAG 2.2 AA violations on all major app states.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'];

test.describe('Accessibility — WCAG 2.2 AA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Wait for app to be fully rendered
    await page.waitForSelector('#items-section', { state: 'visible' });
  });

  test('main page (light mode) has no axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();

    expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
  });

  test('main page (dark mode) has no axe violations', async ({ page }) => {
    // Toggle to dark mode
    const themeBtn = page.getByRole('button', { name: /dark mode|toggle theme/i });
    await themeBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();

    expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
  });

  test('preview/edit modal has no axe violations', async ({ page }) => {
    const textarea = page.getByRole('textbox', { name: /paste your notice/i });
    await textarea.fill(
      'Hackathon 2025\nDate: 25th Nov 2025\nTime: 10 AM\nVenue: Innovation Hub\nOpen to all'
    );
    await page.getByRole('button', { name: /extract event/i }).click();

    // Wait for modal
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();

    expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
  });

  test('page with items loaded has no axe violations', async ({ page }) => {
    await page.evaluate(() => {
      const items = [
        {
          id: 'a11y-item-1',
          title: 'Tech Symposium',
          date: '2025-12-20',
          time: '10:00',
          venue: 'Auditorium',
          category: 'Academic',
          rawText: 'tech symposium text',
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
    await page.waitForSelector('#items-section', { state: 'visible' });

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();

    expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
  });

  test('text size switcher works and page remains accessible', async ({ page }) => {
    // Switch to large text
    const largeBtn = page.getByRole('button', { name: /large text|A\+/i });
    if (await largeBtn.isVisible()) {
      await largeBtn.click();
      await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large');

      const results = await new AxeBuilder({ page })
        .withTags(AXE_TAGS)
        .analyze();

      expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
    } else {
      test.skip();
    }
  });
});

/** Format axe violations for readable test failure messages */
function formatViolations(violations: { id: string; description: string; nodes: unknown[] }[]): string {
  if (violations.length === 0) return 'No violations';
  return violations
    .map((v) => `[${v.id}] ${v.description} (${v.nodes.length} node(s))`)
    .join('\n');
}

