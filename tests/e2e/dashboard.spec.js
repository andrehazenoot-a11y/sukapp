const { test, expect } = require('@playwright/test');

test.describe('Dashboard', () => {

    test('Dashboard laadt na inloggen', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.app-container, .main-content').first()).toBeVisible({ timeout: 10_000 });
    });

    test('Sidebar is zichtbaar', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        const sidebar = page.locator('nav, .sidebar, [class*="sidebar"]').first();
        await expect(sidebar).toBeVisible({ timeout: 8_000 });
    });

    test('Dashboard toont content (panels of cards)', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        const cards = page.locator('[class*="panel"], [class*="card"], [class*="widget"]');
        expect(await cards.count()).toBeGreaterThan(0);
    });

    test('Navigeer naar Projecten', async ({ page }) => {
        await page.goto('/projecten');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL('/projecten');
    });

    test('Navigeer naar Uren', async ({ page }) => {
        await page.goto('/uren');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL('/uren');
    });

    test('Navigeer naar Werkbonnen', async ({ page }) => {
        await page.goto('/werkbonnen');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL('/werkbonnen');
    });

    test('Navigeer naar Toegang', async ({ page }) => {
        await page.goto('/toegang');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL('/toegang');
    });

    test('API /api/meldingen geeft array terug', async ({ request }) => {
        const res = await request.get('/api/meldingen?alle=1');
        expect(res.ok()).toBeTruthy();
        expect(Array.isArray(await res.json())).toBeTruthy();
    });

    test('Geen JS-errors op dashboard', async ({ page }) => {
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        const kritiek = errors.filter(e => !e.includes('Warning') && !e.includes('hydrat'));
        expect(kritiek).toHaveLength(0);
    });
});
