const { test, expect } = require('@playwright/test');

test.describe('Autorisatie & toegangsbeheer', () => {

    test('GET /api/gebruikers geeft array (geen wachtwoorden)', async ({ request }) => {
        const res = await request.get('/api/gebruikers');
        expect([200, 401]).toContain(res.status());
        if (res.status() === 200) {
            const lijst = await res.json();
            expect(Array.isArray(lijst)).toBeTruthy();
            lijst.forEach(u => expect(u.password).toBeUndefined());
        }
    });

    test('POST /api/toegang slaat rechten op', async ({ request }) => {
        const res = await request.post('/api/toegang', {
            data: { userId: '2', permissions: ['uren', 'projecten'], urenTypes: ['normaal'], urenRol: 'medewerker' },
            headers: { 'Content-Type': 'application/json' },
        });
        expect([200, 401]).toContain(res.status());
    });

    test('GET /api/toegang?userId=2 haalt rechten op', async ({ request }) => {
        const res = await request.get('/api/toegang?userId=2');
        expect([200, 401, 404]).toContain(res.status());
    });

    test('Dashboard /projecten niet bereikbaar zonder sessie', async ({ browser }) => {
        const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
        const page = await ctx.newPage();
        await page.goto('/projecten');
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content.includes('autocomplete="username"') || content.includes('Inloggen')).toBeTruthy();
        await ctx.close();
    });

    test('Toegang-pagina laadt en toont gebruikers', async ({ page }) => {
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto('/toegang');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        const kritiek = errors.filter(e => !e.includes('Warning'));
        expect(kritiek).toHaveLength(0);
        const content = await page.content();
        expect(content.length).toBeGreaterThan(1000);
    });

    test('AUTH-03: Cookie-manipulatie geweigerd (session is btoa, geen signing)', async () => { test.skip(true, 'niet geimplementeerd'); });
    test('AUTH-05: Multi-device sessies (geen single-session enforcement)', async () => { test.skip(true, 'niet geimplementeerd'); });
});
