/**
 * E2E tests: Clash detection
 * Add two overlapping events → verify clash badges appear.
 */
import { test, expect } from '@playwright/test';

test.describe('Clash Detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('shows clash badge when two events overlap', async ({ page }) => {
    await page.evaluate(() => {
      const items = [
        {
          id: 'clash-1',
          title: 'Morning Lecture',
          date: '2025-12-15',
          time: '09:00',
          endTime: '11:00',
          venue: 'LH1',
          category: 'Academic',
          rawText: 'morning lecture',
          source: 'offline' as const,
          status: 'upcoming' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          isDeleted: false,
          version: 1,
        },
        {
          id: 'clash-2',
          title: 'Club Meeting',
          date: '2025-12-15',
          time: '10:00',
          endTime: '12:00',
          venue: 'CR3',
          category: 'Club',
          rawText: 'club meeting',
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

    // Both items should be visible
    await expect(page.locator('#items-section')).toContainText('Morning Lecture');
    await expect(page.locator('#items-section')).toContainText('Club Meeting');

    // At least one clash badge/indicator should appear
    const clashBadge = page.locator('[data-testid="clash-badge"], .clash-badge, .badge--clash').first();
    // If no badge, look for "clash" text in the aria-label
    const clashIndicator = page.locator('[aria-label*="clash" i], [title*="clash" i]').first();
    
    const hasBadge = await clashBadge.isVisible().catch(() => false);
    const hasIndicator = await clashIndicator.isVisible().catch(() => false);
    
    expect(hasBadge || hasIndicator).toBeTruthy();
  });

  test('non-overlapping events show no clash badge', async ({ page }) => {
    await page.evaluate(() => {
      const items = [
        {
          id: 'no-clash-1',
          title: 'Morning Class',
          date: '2025-12-16',
          time: '09:00',
          endTime: '10:00',
          venue: 'LH1',
          category: 'Academic',
          rawText: 'morning class',
          source: 'offline' as const,
          status: 'upcoming' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          isDeleted: false,
          version: 1,
        },
        {
          id: 'no-clash-2',
          title: 'Afternoon Event',
          date: '2025-12-16',
          time: '14:00',
          endTime: '16:00',
          venue: 'CR3',
          category: 'Cultural',
          rawText: 'afternoon event',
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

    const clashBadge = page.locator('[data-testid="clash-badge"], .clash-badge, .badge--clash');
    await expect(clashBadge).toHaveCount(0);
  });
});

