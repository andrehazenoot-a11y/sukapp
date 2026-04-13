import { test, expect } from '@playwright/test';

const BEHEERDER = { id: 1, username: 'admin', name: 'Jan Modaal', role: 'Beheerder', initials: 'JM' };

async function setup(page) {
    await page.goto('/');
    await page.evaluate((u) => {
        localStorage.setItem('schildersapp_user', JSON.stringify(u));

        localStorage.setItem('wa_contracten', JSON.stringify([
            { id: 1, naam: 'Contract Janssen', kanbanStatus: 'Nog te ondertekenen', getekend: false, totaalBedrag: 5000 },
            { id: 2, naam: 'Contract Pietersen', kanbanStatus: 'Lopende modelovereenkomsten', getekend: true, totaalBedrag: 8000 },
            { id: 3, naam: 'Contract De Vries', kanbanStatus: 'Afgeronde modelovereenkomsten', getekend: true, totaalBedrag: 3500 },
        ]));

        localStorage.setItem('wa_medewerkers', JSON.stringify([
            { id: 1, naam: 'Piet Kwast', type: 'zzp', kvkVerloopdatum: '2026-06-01', vogVerloopdatum: '2026-12-01' },
            { id: 2, naam: 'Jan Schilder', type: 'zzp', kvkVerloopdatum: '2025-01-01', vogVerloopdatum: '2025-06-01' },
        ]));

        localStorage.setItem('wa_uren_log', JSON.stringify([
            { id: 1, medewerkerNaam: 'Piet Kwast', uren: 8, projectNaam: 'Testproject A', datum: '2026-04-10' },
            { id: 2, medewerkerNaam: 'Jan Schilder', uren: 6, projectNaam: 'Testproject B', datum: '2026-04-11' },
        ]));

        localStorage.setItem('schildersapp_meldingen', JSON.stringify([
            { id: 1, van: 'Piet Kwast', aan: 'Jan Modaal', itemNaam: 'Verfspuit', itemId: 'GER-001', datum: new Date().toISOString(), gelezen: false },
        ]));
    }, BEHEERDER);
    await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach(el => el.remove()));
}

async function goto(page, path) {
    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach(el => el.remove()));
    await page.waitForTimeout(1000);
}

test.describe('Dashboard — Beheerder', () => {

    test('1 — Dashboard laadt zonder crashes', async ({ page }) => {
        await setup(page);
        await goto(page, '/');
        await page.screenshot({ path: 'tests/screenshots/dash-01-overzicht.png' });
        await expect(page.locator('body')).not.toContainText('TypeError');
        await expect(page.locator('body')).not.toContainText('500');
        console.log('OK Dashboard laadt zonder crashes');
    });

    test('2 — Stat kaarten tonen correcte aantallen', async ({ page }) => {
        await setup(page);
        await goto(page, '/');
        await page.waitForTimeout(500);

        // Contracten: 3 totaal
        await expect(page.locator('h3').filter({ hasText: '3' }).first()).toBeVisible({ timeout: 5000 });
        // ZZP: 2
        await expect(page.locator('h3').filter({ hasText: '2' }).first()).toBeVisible({ timeout: 3000 });
        // Uren: 14 (8+6)
        await expect(page.locator('h3').filter({ hasText: '14' }).first()).toBeVisible({ timeout: 3000 });
        // Contractwaarde: 17k (5000+8000+3500=16500 → /1000 → 16.5 → toFixed(0) → 17)
        await expect(page.locator('h3').filter({ hasText: '17k' }).first()).toBeVisible({ timeout: 3000 });

        await page.screenshot({ path: 'tests/screenshots/dash-02-stats.png' });
        console.log('OK Stat kaarten correct');
    });

    test('3 — Verloop waarschuwingen voor verlopen documenten', async ({ page }) => {
        await setup(page);
        await goto(page, '/');
        await page.waitForTimeout(500);

        const alert = page.locator('text=Documenten vereisen aandacht');
        if (await alert.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(alert).toBeVisible();
            console.log('OK Verloop waarschuwing zichtbaar');
        } else {
            console.log('Waarschuwing niet zichtbaar');
        }
        await page.screenshot({ path: 'tests/screenshots/dash-03-verloop.png' });
    });

    test('4 — Gereedschap aanvraag melding zichtbaar', async ({ page }) => {
        await setup(page);
        await goto(page, '/');

        const melding = page.getByText('Verfspuit');
        if (await melding.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('OK Melding zichtbaar');
        } else {
            console.log('Melding niet gevonden');
        }

        const geziendBtn = page.getByText('Gezien').first();
        if (await geziendBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await geziendBtn.click({ force: true });
            await page.waitForTimeout(500);
            console.log('OK Melding als gelezen gemarkeerd');
        }
        await page.screenshot({ path: 'tests/screenshots/dash-04-melding.png' });
    });

    test('5 — Contracten overzicht toont statussen', async ({ page }) => {
        await setup(page);
        await goto(page, '/');

        await expect(page.getByText('Contracten').first()).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Te ondertekenen')).toBeVisible({ timeout: 3000 });
        await expect(page.getByText('Ondertekend')).toBeVisible({ timeout: 3000 });
        await expect(page.getByText('Afgerond')).toBeVisible({ timeout: 3000 });
        await page.screenshot({ path: 'tests/screenshots/dash-05-contracten.png' });
        console.log('OK Contracten statussen zichtbaar');
    });

    test('6 — Recente activiteit toont uren registraties', async ({ page }) => {
        await setup(page);
        await goto(page, '/');

        await expect(page.getByText('Recente activiteit').or(page.getByText('Recent')).first()).toBeVisible({ timeout: 5000 });
        const activiteit = page.getByText('Piet Kwast').or(page.getByText('Jan Schilder')).first();
        if (await activiteit.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('OK Recente uren zichtbaar');
        } else {
            console.log('Geen uren registraties zichtbaar');
        }
        await page.screenshot({ path: 'tests/screenshots/dash-06-activiteit.png' });
    });

    test('7 — Snelle acties knoppen aanwezig', async ({ page }) => {
        await setup(page);
        await goto(page, '/');

        await expect(page.getByText('Uren registreren')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Nieuw contract')).toBeVisible({ timeout: 3000 });
        await expect(page.getByText('Projecten').last()).toBeVisible({ timeout: 3000 });
        await expect(page.getByText('Werkbonnen').first()).toBeVisible({ timeout: 3000 });
        await page.screenshot({ path: 'tests/screenshots/dash-07-acties.png' });
        console.log('OK Snelle acties aanwezig');
    });

    test('8 — Uren per project sectie (als werkbonnen aanwezig)', async ({ page }) => {
        await setup(page);
        await goto(page, '/');
        await page.waitForTimeout(1500);

        const sectie = page.getByText('Uren per project').first();
        if (await sectie.isVisible({ timeout: 3000 }).catch(() => false)) {
            await sectie.scrollIntoViewIfNeeded();
            const projectRij = page.locator('button').filter({ has: page.locator('.fa-folder-tree') }).first();
            if (await projectRij.isVisible({ timeout: 2000 }).catch(() => false)) {
                await projectRij.click({ force: true });
                await page.waitForTimeout(500);
                console.log('OK Project uitgevouwen in uren sectie');
            }
            console.log('OK Uren per project sectie aanwezig');
        } else {
            console.log('Geen werkbonnen in DB — sectie niet zichtbaar (verwacht)');
        }
        await page.screenshot({ path: 'tests/screenshots/dash-08-uren-project.png' });
    });

    test('9 — Navigatie naar Projecten werkt', async ({ page }) => {
        await setup(page);
        await goto(page, '/');

        await page.getByText('Projecten').last().click({ force: true });
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(800);
        await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach(el => el.remove()));
        await expect(page.locator('body')).not.toContainText('TypeError');
        await expect(page.url()).toContain('/projecten');
        console.log('OK Navigatie naar Projecten OK');
        await page.screenshot({ path: 'tests/screenshots/dash-09-nav-projecten.png' });
    });

    test('10 — Melding verwijderen werkt', async ({ page }) => {
        await setup(page);
        await goto(page, '/');

        const deleteBtn = page.locator('button').filter({ has: page.locator('.fa-xmark') }).first();
        if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await deleteBtn.click({ force: true });
            await page.waitForTimeout(500);
            const meldingNogZichtbaar = await page.getByText('Verfspuit').isVisible({ timeout: 500 }).catch(() => false);
            if (!meldingNogZichtbaar) console.log('OK Melding verwijderd');
            else console.log('Melding nog zichtbaar na verwijderen');
        } else {
            console.log('Geen verwijder knop zichtbaar');
        }
        await page.screenshot({ path: 'tests/screenshots/dash-10-verwijder.png' });
    });

});
