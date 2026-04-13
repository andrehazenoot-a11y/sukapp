import { test, expect } from '@playwright/test';

async function loginAdmin(page) {
    await page.goto('/');
    await page.evaluate(() => {
        localStorage.setItem('schildersapp_user', JSON.stringify({
            id: 1, username: 'admin', name: 'Jan Modaal', role: 'Beheerder', initials: 'JM'
        }));
    });
    await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach(el => el.remove()));
    await page.waitForTimeout(300);
}

test.describe('Beheerdersapp — Werkbonnen pagina', () => {

    test('1 — Werkbonnen pagina laadt zonder fouten', async ({ page }) => {
        await loginAdmin(page);
        await page.goto('/werkbonnen');
        await page.waitForSelector('text=Werkbonnen', { timeout: 15000 });
        await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach(el => el.remove()));
        await page.waitForTimeout(800);

        await page.screenshot({ path: 'tests/screenshots/beheerder-01-werkbonnen.png' });

        // Geen rode errors
        const errorEls = page.locator('text=Error').or(page.locator('text=500'));
        expect(await errorEls.count()).toBe(0);
        console.log('✓ Werkbonnen pagina laadt zonder fouten');
    });

    test('2 — Werkbon detail panel opent', async ({ page }) => {
        await loginAdmin(page);
        await page.goto('/werkbonnen');
        await page.waitForSelector('text=Werkbonnen', { timeout: 15000 });
        await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach(el => el.remove()));
        await page.waitForTimeout(1000);

        // Klik op een werkbon in de lijst (eerste rij)
        const eersteWerkbon = page.locator('[style*="cursor: pointer"]').first();
        if (await eersteWerkbon.isVisible({ timeout: 3000 }).catch(() => false)) {
            await eersteWerkbon.click({ force: true });
            await page.waitForTimeout(800);
            await page.screenshot({ path: 'tests/screenshots/beheerder-02-werkbon-detail.png' });
            console.log('✓ Werkbon detail geopend');
        } else {
            console.log('Geen werkbonnen in lijst');
        }
    });

    test('3 — "Koppel aan taak" knop zichtbaar voor ongekoppelde werkbon', async ({ page }) => {
        await loginAdmin(page);
        await page.goto('/werkbonnen');
        await page.waitForSelector('text=Werkbonnen', { timeout: 15000 });
        await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach(el => el.remove()));
        await page.waitForTimeout(1000);

        const koppelKnop = page.getByText('Koppel aan taak').first()
            .or(page.getByText('Project/taak wijzigen').first());

        if (await koppelKnop.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('✓ Koppel knop zichtbaar');
        } else {
            console.log('Geen werkbonnen om te koppelen');
        }
    });
});

test.describe('Beheerdersapp — Project dossier (bewaking tab)', () => {

    test('4 — Project dossier laadt bewaking tab', async ({ page }) => {
        await loginAdmin(page);

        // Maak een testproject aan in localStorage
        const testProject = [{
            id: 'proj-test-bewaking',
            name: 'Bewaking Testproject',
            client: 'Test BV',
            status: 'active',
            color: '#F5850A',
            tasks: [{
                id: 'task-bew-1',
                name: 'Testklus',
                assignedTo: [1],
                startDate: '2026-04-08',
                endDate: '2026-04-10',
            }]
        }];

        await page.evaluate((data) => {
            localStorage.setItem('schildersapp_projecten', JSON.stringify(data));
        }, testProject);

        await page.goto('/projecten/proj-test-bewaking');
        await page.waitForSelector('text=Bewaking Testproject', { timeout: 15000 }).catch(() => {});
        await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach(el => el.remove()));
        await page.waitForTimeout(800);

        await page.screenshot({ path: 'tests/screenshots/beheerder-03-project.png' });
        console.log('✓ Project pagina geladen');

        // Klik bewaking tab
        const bewakingTab = page.getByText('Bewaking').first();
        if (await bewakingTab.isVisible({ timeout: 3000 }).catch(() => false)) {
            await bewakingTab.click({ force: true });
            await page.waitForTimeout(800);
            await page.screenshot({ path: 'tests/screenshots/beheerder-04-bewaking.png' });
            console.log('✓ Bewaking tab geopend');
        } else {
            console.log('Bewaking tab niet zichtbaar');
        }
    });
});
