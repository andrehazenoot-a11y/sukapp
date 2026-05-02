const { test, expect } = require('@playwright/test');
const { maakTestMedewerker, verwijderTestMedewerker, maakTestVerlof, verwijderTestVerlof } = require('./helpers/testdata');

test.describe('Verlof — sync dashboard ↔ medewerker', () => {

    test('Verlofaanvraag aanmaken en terugvinden als beheerder', async ({ request }) => {
        const mw = await maakTestMedewerker(request);
        const verlof = await maakTestVerlof(request, mw.id, mw.name);
        const jaar = new Date().getFullYear();
        const lijst = await (await request.get(`/api/verlof?jaar=${jaar}`)).json();
        const gevonden = lijst.find(v => v.id === verlof.id);
        expect(gevonden).toBeTruthy();
        expect(gevonden.status).toBe('In behandeling');
        await verwijderTestVerlof(request, verlof.id, mw.id);
        await verwijderTestMedewerker(request, mw.id);
    });

    test('Verlof ophalen per medewerker (userId query)', async ({ request }) => {
        const mw = await maakTestMedewerker(request);
        const verlof = await maakTestVerlof(request, mw.id, mw.name);
        const lijst = await (await request.get(`/api/verlof?userId=${mw.id}`)).json();
        expect(lijst.find(v => v.id === verlof.id)).toBeTruthy();
        await verwijderTestVerlof(request, verlof.id, mw.id);
        await verwijderTestMedewerker(request, mw.id);
    });

    test('Beheerder keurt verlof goed → status Goedgekeurd', async ({ request }) => {
        const mw = await maakTestMedewerker(request);
        const verlof = await maakTestVerlof(request, mw.id, mw.name);
        await request.patch('/api/verlof', {
            data: { id: verlof.id, status: 'Goedgekeurd' },
            headers: { 'Content-Type': 'application/json' },
        });
        const lijst = await (await request.get(`/api/verlof?userId=${mw.id}`)).json();
        expect(lijst.find(v => v.id === verlof.id)?.status).toBe('Goedgekeurd');
        await verwijderTestVerlof(request, verlof.id, mw.id);
        await verwijderTestMedewerker(request, mw.id);
    });

    test('Beheerder wijst verlof af → status Afgewezen', async ({ request }) => {
        const mw = await maakTestMedewerker(request);
        const verlof = await maakTestVerlof(request, mw.id, mw.name);
        await request.patch('/api/verlof', {
            data: { id: verlof.id, status: 'Afgewezen' },
            headers: { 'Content-Type': 'application/json' },
        });
        const lijst = await (await request.get(`/api/verlof?userId=${mw.id}`)).json();
        expect(lijst.find(v => v.id === verlof.id)?.status).toBe('Afgewezen');
        await verwijderTestVerlof(request, verlof.id, mw.id);
        await verwijderTestMedewerker(request, mw.id);
    });

    test('Verlof verwijderen via DELETE', async ({ request }) => {
        const mw = await maakTestMedewerker(request);
        const verlof = await maakTestVerlof(request, mw.id, mw.name);
        await verwijderTestVerlof(request, verlof.id, mw.id);
        const lijst = await (await request.get(`/api/verlof?userId=${mw.id}`)).json();
        expect(lijst.find(v => v.id === verlof.id)).toBeUndefined();
        await verwijderTestMedewerker(request, mw.id);
    });

    test('Verlof-statussen zijn hoofdletter-consistent (Goedgekeurd, niet goedgekeurd)', async ({ request }) => {
        const mw = await maakTestMedewerker(request);
        const verlof = await maakTestVerlof(request, mw.id, mw.name);
        await request.patch('/api/verlof', {
            data: { id: verlof.id, status: 'Goedgekeurd' },
            headers: { 'Content-Type': 'application/json' },
        });
        const lijst = await (await request.get(`/api/verlof?userId=${mw.id}`)).json();
        const status = lijst.find(v => v.id === verlof.id)?.status;
        // Exact 'Goedgekeurd' — medewerker app verwacht dit
        expect(status).toBe('Goedgekeurd');
        await verwijderTestVerlof(request, verlof.id, mw.id);
        await verwijderTestMedewerker(request, mw.id);
    });

    test('Uren-pagina laadt zonder crashes', async ({ page }) => {
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto('/uren');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        const kritiek = errors.filter(e => !e.includes('Warning') && !e.includes('hydrat'));
        expect(kritiek).toHaveLength(0);
    });
});
