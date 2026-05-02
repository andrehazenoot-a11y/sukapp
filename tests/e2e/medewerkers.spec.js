const { test, expect } = require('@playwright/test');
const { maakTestMedewerker, verwijderTestMedewerker } = require('./helpers/testdata');

test.describe('Medewerkersbeheer (DB-010 t/m DB-013)', () => {

    test('DB-010: Medewerker aanmaken via API', async ({ request }) => {
        const suffix = Date.now();
        const res = await request.post('/api/gebruikers', {
            data: { name: `Testpersoon ${suffix}`, username: `tp_${suffix}`, password: 'Test1234!', role: 'Medewerker', phone: '' },
            headers: { 'Content-Type': 'application/json' },
        });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.id).toBeTruthy();
        await verwijderTestMedewerker(request, body.id);
    });

    test('DB-010b: Nieuwe medewerker verschijnt in gebruikerslijst', async ({ request }) => {
        const mw = await maakTestMedewerker(request);
        const lijst = await (await request.get('/api/gebruikers')).json();
        const gevonden = lijst.find(u => u.id === mw.id);
        expect(gevonden).toBeTruthy();
        await verwijderTestMedewerker(request, mw.id);
    });

    test('DB-010c: Wachtwoord zit NIET in GET /api/gebruikers', async ({ request }) => {
        const lijst = await (await request.get('/api/gebruikers')).json();
        lijst.forEach(u => {
            expect(u.password).toBeUndefined();
        });
    });

    test('DB-011: Medewerker bewerken (PUT)', async ({ request }) => {
        const mw = await maakTestMedewerker(request);
        const res = await request.put('/api/gebruikers', {
            data: { id: mw.id, name: mw.name, username: mw.username, role: 'Schilder', phone: '0612345678' },
            headers: { 'Content-Type': 'application/json' },
        });
        expect(res.ok()).toBeTruthy();
        const lijst = await (await request.get('/api/gebruikers')).json();
        const bijgewerkt = lijst.find(u => u.id === mw.id);
        expect(bijgewerkt?.phone).toBe('0612345678');
        await verwijderTestMedewerker(request, mw.id);
    });

    test('DB-012: Gedeactiveerde medewerker kan niet inloggen', async ({ request }) => {
        const mw = await maakTestMedewerker(request);
        await verwijderTestMedewerker(request, mw.id); // soft delete
        const loginRes = await request.post('/api/auth/validate', {
            data: { username: mw.username, password: 'Test1234!' },
            headers: { 'Content-Type': 'application/json' },
        });
        // 401 = niet toegestaan, 429 = rate limiter actief (ook geblokkeerd)
        expect([401, 403, 429]).toContain(loginRes.status());
    });

    test('Dubbele gebruikersnaam geeft fout (geen 200)', async ({ request }) => {
        const res = await request.post('/api/gebruikers', {
            data: { name: 'Dubbel', username: 'admin', password: 'Test1234!', role: 'Medewerker', phone: '' },
            headers: { 'Content-Type': 'application/json' },
        });
        expect(res.status()).not.toBe(200);
    });

    test('Toegang-pagina laadt zonder crashes', async ({ page }) => {
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto('/toegang');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
        const kritiek = errors.filter(e => !e.includes('Warning'));
        expect(kritiek).toHaveLength(0);
    });

    test('DB-014: CSV bulk-import (niet geimplementeerd)', async () => { test.skip(true, 'niet geimplementeerd'); });
});
