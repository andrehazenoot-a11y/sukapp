const { test, expect } = require('@playwright/test');

// Tests draaien ZONDER gecachte sessie (ze testen de login zelf)
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authenticatie', () => {

    test('DB-001: Login met geldige beheerder-credentials', async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('input[autocomplete="username"]');
        await page.fill('input[autocomplete="username"]', 'admin');
        await page.fill('input[autocomplete="current-password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.app-container, .main-content').first()).toBeVisible({ timeout: 12_000 });
    });

    test('DB-002: Login met ongeldig wachtwoord toont foutmelding', async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('input[autocomplete="username"]');
        await page.fill('input[autocomplete="username"]', 'admin');
        await page.fill('input[autocomplete="current-password"]', 'FOUT_WACHTWOORD');
        await page.click('button[type="submit"]');
        await expect(page.locator('.fa-circle-exclamation').first()).toBeVisible({ timeout: 6_000 });
    });

    test('DB-002b: Login met onbekende gebruikersnaam toont foutmelding', async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('input[autocomplete="username"]');
        await page.fill('input[autocomplete="username"]', 'bestaat_niet');
        await page.fill('input[autocomplete="current-password"]', 'wachtwoord');
        await page.click('button[type="submit"]');
        await expect(page.locator('.fa-circle-exclamation').first()).toBeVisible({ timeout: 6_000 });
    });

    test('AUTH-08: Rate limiting â API geeft 429 na 10+ pogingen', async ({ request }) => {
        const pogingen = Array.from({ length: 12 }, () =>
            request.post('/api/auth/validate', {
                data: { username: 'admin', password: 'fout' },
                headers: { 'Content-Type': 'application/json' },
            })
        );
        const responses = await Promise.all(pogingen);
        const statussen = responses.map(r => r.status());
        expect(statussen).toContain(429);
    });

    test('Uitloggen stuurt terug naar login', async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('input[autocomplete="username"]');
        await page.fill('input[autocomplete="username"]', 'admin');
        await page.fill('input[autocomplete="current-password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('.app-container', { timeout: 12_000 });
        const logoutBtn = page.locator('button:has(.fa-right-from-bracket), button:has-text("Uitloggen")').first();
        await logoutBtn.click();
        await expect(page.locator('input[autocomplete="username"]')).toBeVisible({ timeout: 8_000 });
    });

    test('AUTH-02: /medewerker zonder login toont slot-melding', async ({ page }) => {
        await page.goto('/medewerker');
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content.includes('fa-lock') || content.includes('Login') || content.includes('login')).toBeTruthy();
    });

    test('DB-003: Wachtwoord vergeten flow (via WhatsApp, geen reset-route)', async () => { test.skip(true, 'niet geimplementeerd'); });
    test('DB-004: Sessie timeout na inactiviteit (niet geimplementeerd)', async () => { test.skip(true, 'niet geimplementeerd'); });
    test('AUTH-07: 2FA (niet geimplementeerd)', async () => { test.skip(true, 'niet geimplementeerd'); });
});
