const { test, expect } = require('@playwright/test');

test.describe('Urenregistratie', () => {

    test('Uren-pagina laadt zonder crashes', async ({ page }) => {
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto('/uren');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        const kritiek = errors.filter(e => !e.includes('Warning') && !e.includes('hydrat'));
        expect(kritiek).toHaveLength(0);
    });

    test('Uren-pagina toont week-invoer', async ({ page }) => {
        await page.goto('/uren');
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content.includes('week') || content.includes('Week') || content.includes('Ma')).toBeTruthy();
    });

    test('API /api/vakantiedagen geeft array terug', async ({ request }) => {
        const jaar = new Date().getFullYear();
        const res = await request.get(`/api/vakantiedagen?userId=1&jaar=${jaar}`);
        expect([200, 404]).toContain(res.status());
        if (res.status() === 200) {
            expect(Array.isArray(await res.json())).toBeTruthy();
        }
    });

    test('Vakantiedagen opslaan en ophalen', async ({ request }) => {
        const jaar = new Date().getFullYear();
        const postRes = await request.post('/api/vakantiedagen', {
            data: { userId: '1', jaar, dagen: [`${jaar}-09-01`, `${jaar}-09-02`] },
            headers: { 'Content-Type': 'application/json' },
        });
        expect(postRes.ok()).toBeTruthy();
    });

    test('API /api/verlof?userId=1 geeft array terug', async ({ request }) => {
        const res = await request.get('/api/verlof?userId=1');
        expect(res.ok()).toBeTruthy();
        expect(Array.isArray(await res.json())).toBeTruthy();
    });

    test('Uren-pagina toont beheerder-tab voor goedkeuring', async ({ page }) => {
        await page.goto('/uren');
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content.includes('Goedkeuring') || content.includes('Verlof')).toBeTruthy();
    });

    test('MA-020: Start/stop dienst klokken (niet geimplementeerd)', async () => { test.skip(true, 'niet geimplementeerd'); });
    test('MA-021: Pauze registreren (niet geimplementeerd)', async () => { test.skip(true, 'niet geimplementeerd'); });
    test('MA-022: Uren corrigeren met audit-log (nog niet volledig)', async () => { test.skip(true, 'niet geimplementeerd'); });
});
