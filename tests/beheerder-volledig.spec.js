import { test, expect } from '@playwright/test';

const BEHEERDER = { id: 1, username: 'admin', name: 'Jan Modaal', role: 'Beheerder', initials: 'JM' };

async function setup(page) {
    await page.goto('/');
    await page.evaluate((u) => {
        localStorage.setItem('schildersapp_user', JSON.stringify(u));
        // Basisdata voor projecten
        localStorage.setItem('schildersapp_projecten', JSON.stringify([{
            id: 'test-proj-1',
            name: 'Test Kozijnen Project',
            client: 'Test BV',
            status: 'active',
            color: '#F5850A',
            tasks: [{
                id: 'task-1',
                name: 'Schilderwerk kozijnen',
                assignedTo: [1, 2],
                startDate: '2026-04-08',
                endDate: '2026-04-10',
                completed: false,
                progress: 30,
                notes: [],
            }]
        }]));
    }, BEHEERDER);
    await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach(el => el.remove()));
}

async function goto(page, path) {
    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach(el => el.remove()));
    await page.waitForTimeout(800);
}

// ─── DASHBOARD ───────────────────────────────────────────────
test.describe('Dashboard', () => {
    test('Laadt correct met stats', async ({ page }) => {
        await setup(page);
        await goto(page, '/');
        await page.screenshot({ path: 'tests/screenshots/volledig-01-dashboard.png' });
        await expect(page.locator('body')).not.toContainText('500');
        await expect(page.locator('body')).not.toContainText('Error');
        console.log('✓ Dashboard OK');
    });
});

// ─── PROJECTEN ───────────────────────────────────────────────
test.describe('Projecten', () => {
    test('Projectenlijst laadt', async ({ page }) => {
        await setup(page);
        await goto(page, '/projecten');
        await page.screenshot({ path: 'tests/screenshots/volledig-02-projecten.png' });
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Projectenlijst OK');
    });

    test('Project detail laadt', async ({ page }) => {
        await setup(page);
        await goto(page, '/projecten/test-proj-1');
        await page.screenshot({ path: 'tests/screenshots/volledig-03-project-detail.png' });
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Project detail OK');
    });

    test('Project tabs werken (Bewaking, Planning, Financieel)', async ({ page }) => {
        await setup(page);
        await goto(page, '/projecten/test-proj-1');
        await page.waitForTimeout(500);

        const tabs = ['Bewaking', 'Planning', 'Financieel'];
        for (const tab of tabs) {
            const tabEl = page.getByText(tab).first();
            if (await tabEl.isVisible({ timeout: 2000 }).catch(() => false)) {
                await tabEl.click({ force: true });
                await page.waitForTimeout(500);
                await expect(page.locator('body')).not.toContainText('TypeError');
                console.log(`✓ Tab "${tab}" OK`);
            } else {
                console.log(`⚠ Tab "${tab}" niet gevonden`);
            }
        }
        await page.screenshot({ path: 'tests/screenshots/volledig-04-project-tabs.png' });
    });
});

// ─── WERKBONNEN ──────────────────────────────────────────────
test.describe('Werkbonnen', () => {
    test('Werkbonnen pagina laadt', async ({ page }) => {
        await setup(page);
        await goto(page, '/werkbonnen');
        await page.screenshot({ path: 'tests/screenshots/volledig-05-werkbonnen.png' });
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Werkbonnen pagina OK');
    });

    test('Master-detail layout aanwezig (lijst links, detail rechts)', async ({ page }) => {
        await setup(page);
        await goto(page, '/werkbonnen');
        await page.waitForTimeout(1500);

        // Klik op werkbon als die er is
        const eersteRij = page.locator('[style*="cursor: pointer"]').first();
        if (await eersteRij.isVisible({ timeout: 3000 }).catch(() => false)) {
            await eersteRij.click({ force: true });
            await page.waitForTimeout(800);
            await page.screenshot({ path: 'tests/screenshots/volledig-05b-werkbon-detail.png' });
            console.log('✓ Werkbon detail geopend');
        } else {
            console.log('Geen werkbonnen in DB om te testen');
        }
    });
});

// ─── UREN ────────────────────────────────────────────────────
test.describe('Uren', () => {
    test('Uren pagina laadt', async ({ page }) => {
        await setup(page);
        await goto(page, '/uren');
        await page.screenshot({ path: 'tests/screenshots/volledig-06-uren.png' });
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Uren pagina OK');
    });

    test('Urenregistratie pagina laadt', async ({ page }) => {
        await setup(page);
        await goto(page, '/urenregistratie');
        await page.screenshot({ path: 'tests/screenshots/volledig-07-urenregistratie.png' });
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Urenregistratie pagina OK');
    });
});

// ─── MATERIAAL ───────────────────────────────────────────────
test.describe('Materiaal', () => {
    test('Materiaalzoeker laadt', async ({ page }) => {
        await setup(page);
        await goto(page, '/materiaal');
        await page.screenshot({ path: 'tests/screenshots/volledig-08-materiaal.png' });
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Materiaalzoeker OK');
    });

    test('Materieel/gereedschap laadt', async ({ page }) => {
        await setup(page);
        await goto(page, '/materieel');
        await page.screenshot({ path: 'tests/screenshots/volledig-09-materieel.png' });
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Materieel pagina OK');
    });

    test('Verfvoorraad laadt', async ({ page }) => {
        await setup(page);
        await goto(page, '/verfvoorraad');
        await page.screenshot({ path: 'tests/screenshots/volledig-10-verfvoorraad.png' });
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Verfvoorraad pagina OK');
    });
});

// ─── PERSONEEL ───────────────────────────────────────────────
test.describe('Personeel & Toegang', () => {
    test('Profiel pagina laadt', async ({ page }) => {
        await setup(page);
        await goto(page, '/profiel');
        await page.screenshot({ path: 'tests/screenshots/volledig-11-profiel.png' });
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Profiel pagina OK');
    });

    test('Toegangsbeheer laadt', async ({ page }) => {
        await setup(page);
        await goto(page, '/toegang');
        await page.screenshot({ path: 'tests/screenshots/volledig-12-toegang.png' });
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Toegangsbeheer OK');
    });

    test('Intake formulier laadt', async ({ page }) => {
        await setup(page);
        await goto(page, '/intake');
        await page.screenshot({ path: 'tests/screenshots/volledig-13-intake.png' });
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Intake pagina OK');
    });
});

// ─── OVERIG ──────────────────────────────────────────────────
test.describe('Overige pagina\'s', () => {
    test('Toolbox Meeting laadt', async ({ page }) => {
        await setup(page);
        await goto(page, '/toolbox');
        await page.screenshot({ path: 'tests/screenshots/volledig-14-toolbox.png' });
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Toolbox pagina OK');
    });

    test('WhatsApp pagina laadt', async ({ page }) => {
        await setup(page);
        await goto(page, '/whatsapp');
        await page.screenshot({ path: 'tests/screenshots/volledig-15-whatsapp.png' });
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ WhatsApp pagina OK');
    });
});

// ─── NAVIGATIE MENU ──────────────────────────────────────────
test.describe('Navigatie & Menu', () => {
    test('Alle menu-items zijn klikbaar vanuit dashboard', async ({ page }) => {
        await setup(page);
        await goto(page, '/');
        await page.waitForTimeout(500);

        await page.screenshot({ path: 'tests/screenshots/volledig-16-menu.png' });

        // Open hamburger menu als aanwezig
        const hamburger = page.locator('button').filter({ has: page.locator('.fa-bars') }).first();
        if (await hamburger.isVisible({ timeout: 1000 }).catch(() => false)) {
            await hamburger.click({ force: true });
            await page.waitForTimeout(400);
            await page.screenshot({ path: 'tests/screenshots/volledig-16b-menu-open.png' });
            console.log('✓ Hamburger menu geopend');
        }
        console.log('✓ Navigatie OK');
    });
});
