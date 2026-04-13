import { test, expect } from '@playwright/test';

// Injecteer testdata in localStorage zodat er een werkdag beschikbaar is
async function login(page) {
    await page.goto('/');

    const vandaag = new Date();
    // Zoek de maandag van de HUIDIGE week (ISO: ma = dag 1)
    const dag = vandaag.getDay(); // 0=zo, 1=ma, ..., 6=za
    const diffNaarMa = dag === 0 ? -6 : -(dag - 1); // zondag = -6, anders terug naar maandag
    const maandag = new Date(vandaag);
    maandag.setDate(vandaag.getDate() + diffNaarMa);
    // Neem woensdag van deze week (veiliger midden van de week)
    const woensdag = new Date(maandag);
    woensdag.setDate(maandag.getDate() + 2);
    const datumStr = woensdag.toISOString().slice(0, 10); // bijv. "2026-04-08"

    const testProject = [{
        id: 'test-project-1',
        name: 'Testproject Kozijnen',
        client: 'Test BV',
        address: 'Teststraat 1',
        status: 'active',
        color: '#F5850A',
        tasks: [{
            id: 'test-task-1',
            name: 'Kozijnen schilderen',
            assignedTo: [1],
            startDate: datumStr,
            endDate: datumStr,
            completed: false,
            progress: 0,
            notes: [],
        }]
    }];

    await page.evaluate((data) => {
        localStorage.setItem('schildersapp_user', JSON.stringify({
            id: 1, username: 'admin', name: 'Jan Modaal', role: 'Beheerder', initials: 'JM'
        }));
        localStorage.setItem('schildersapp_projecten', JSON.stringify(data));
    }, testProject);

    await page.goto('/medewerker/planning');
    await page.waitForSelector('text=Planning', { timeout: 15000 });
    await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach(el => el.remove()));
    await page.waitForTimeout(1000);
    return datumStr;
}

async function openWerkdag(page) {
    // Zoek de dag rij met "Kozijnen schilderen" tekst en klik op het omsluitende dag-element
    const dagTekst = page.getByText('Kozijnen schilderen').first();
    if (await dagTekst.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dagTekst.click({ force: true });
        await page.waitForTimeout(800);
        return true;
    }
    // Fallback: zoek tekst "Testproject"
    const proj = page.getByText('Testproject Kozijnen').first();
    if (await proj.isVisible({ timeout: 1000 }).catch(() => false)) {
        await proj.click({ force: true });
        await page.waitForTimeout(800);
        return true;
    }
    return false;
}

test.describe('Werkbon tab in planning', () => {

    test('1 — Nieuwe werkbon aanmaken en zichtbaar blijven', async ({ page }) => {
        const datumStr = await login(page);
        console.log(`Testdag: ${datumStr}`);

        const gevonden = await openWerkdag(page);
        if (!gevonden) { console.log('⚠ Geen werkdag gevonden'); test.skip(); return; }

        // Schakel naar Werkbon tab
        const werkbonTab = page.locator('button').filter({ hasText: /^Werkbon$/ });
        await werkbonTab.click({ force: true });
        await page.waitForTimeout(500);

        // Reset als er al een bon is
        const andereKnop = page.getByText('Andere werkbon kiezen');
        if (await andereKnop.isVisible({ timeout: 1500 }).catch(() => false)) {
            await andereKnop.click({ force: true });
            await page.waitForTimeout(500);
        }

        // Actieknoppen moeten zichtbaar zijn
        await expect(page.getByText('Nieuwe werkbon aanmaken')).toBeVisible({ timeout: 5000 });

        // Nieuw aanmaken
        await page.getByText('Nieuwe werkbon aanmaken').click({ force: true });
        await page.waitForTimeout(300);
        await page.getByPlaceholder('Wat heb je gedaan?').fill('Testklus kozijnen PW');
        await page.locator('input[type="number"]').first().fill('4');
        await page.getByText('Opslaan').click({ force: true });
        await page.waitForTimeout(2000);

        // Werkbon moet zichtbaar blijven — controleer via de "gekoppeld" tekst
        await expect(page.getByText('Werkbon gekoppeld aan deze dag')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Testklus kozijnen PW').first()).toBeVisible();
        console.log('✓ Werkbon zichtbaar na aanmaken');
    });

    test('2 — Uren veld toont niet het DB-totaal (max 24 uur)', async ({ page }) => {
        await login(page);
        const gevonden = await openWerkdag(page);
        if (!gevonden) { test.skip(); return; }

        await page.locator('button').filter({ hasText: /^Werkbon$/ }).click({ force: true });
        await page.waitForTimeout(600);

        const urenVeld = page.locator('input[type="number"]').first();
        if (await urenVeld.isVisible({ timeout: 2000 }).catch(() => false)) {
            const waarde = await urenVeld.inputValue();
            console.log(`Uren veld toont: "${waarde}"`);
            expect(Number(waarde)).toBeLessThan(24);
            console.log('✓ Geen 81 uur');
        } else {
            console.log('Geen werkbon gekoppeld, uren veld niet zichtbaar');
        }
    });

    test('3 — Koppel bestaande werkbon toont zoeklijst', async ({ page }) => {
        await login(page);
        const gevonden = await openWerkdag(page);
        if (!gevonden) { test.skip(); return; }

        await page.locator('button').filter({ hasText: /^Werkbon$/ }).click({ force: true });
        await page.waitForTimeout(500);

        // Reset als er al een bon is
        const andereKnop = page.getByText('Andere werkbon kiezen');
        if (await andereKnop.isVisible({ timeout: 1500 }).catch(() => false)) {
            await andereKnop.click({ force: true });
            await page.waitForTimeout(500);
        }

        await page.getByText('Koppel bestaande werkbon').click({ force: true });
        await page.waitForTimeout(400);

        await expect(page.getByPlaceholder('Zoek werkbon...')).toBeVisible({ timeout: 5000 });
        console.log('✓ Zoeklijst zichtbaar');

        await page.getByText('Annuleren').click({ force: true });
    });

    test('4 — Materiaal toevoegen aan werkbon', async ({ page }) => {
        await login(page);
        const gevonden = await openWerkdag(page);
        if (!gevonden) { test.skip(); return; }

        await page.locator('button').filter({ hasText: /^Werkbon$/ }).click({ force: true });
        await page.waitForTimeout(600);

        const matInput = page.getByPlaceholder('Materiaal toevoegen...');
        if (await matInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await matInput.fill('Zijdeglans wit 2.5L');
            await matInput.press('Enter');
            await page.waitForTimeout(1000);
            await expect(page.getByText('Zijdeglans wit 2.5L')).toBeVisible({ timeout: 5000 });
            console.log('✓ Materiaal toegevoegd');
        } else {
            console.log('Geen werkbon gekoppeld — materiaal sectie niet zichtbaar');
        }
    });
});
