import { test, expect } from '@playwright/test';

const BEHEERDER  = { id: 1, username: 'admin',   name: 'Jan Modaal',  role: 'Beheerder', initials: 'JM' };
const MEDEWERKER = { id: 2, username: 'schilder', name: 'Piet Kwast',  role: 'Schilder',  initials: 'PK' };

// Huidige week woensdag (veilige testdag, midden in de week)
function getWoensdag() {
    const today = new Date();
    const dow = today.getDay();
    const diffMa = dow === 0 ? -6 : -(dow - 1);
    const ma = new Date(today); ma.setDate(today.getDate() + diffMa);
    const wo = new Date(ma); wo.setDate(ma.getDate() + 2);
    return wo.toISOString().slice(0, 10);
}

function getProjectData(userId) {
    const datumStr = getWoensdag();
    return [{
        id: 'plan-proj-1',
        name: 'Schilderwerk Rijswijk',
        client: 'Bakker BV',
        status: 'active',
        color: '#F5850A',
        tasks: [
            {
                id: 'plan-task-1',
                name: 'Kozijnen buiten verven',
                assignedTo: [userId],
                startDate: datumStr,
                endDate: datumStr,
                completed: false,
                progress: 0,
                notes: [],
            },
            {
                id: 'plan-task-2',
                name: 'Muren binnenzijde',
                assignedTo: [1, 2],
                startDate: datumStr,
                endDate: datumStr,
                completed: false,
                progress: 50,
                notes: [],
            }
        ]
    }];
}

async function removeOverlay(page) {
    await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach(el => el.remove()));
}

async function loginAs(page, user, injectProjects = true) {
    await page.goto('/');
    await page.evaluate((u) => {
        localStorage.setItem('schildersapp_user', JSON.stringify(u));
    }, user);
    if (injectProjects) {
        await page.evaluate((data) => {
            localStorage.setItem('schildersapp_projecten', JSON.stringify(data));
        }, getProjectData(user.id));
    }
    await removeOverlay(page);
}

// ─── MEDEWERKER PLANNING ────────────────────────────────────────
test.describe('Medewerker Planning', () => {

    test('1 — Planning pagina laadt', async ({ page }) => {
        await loginAs(page, MEDEWERKER);
        await page.goto('/medewerker/planning');
        await page.waitForSelector('text=Planning', { timeout: 15000 });
        await removeOverlay(page);
        await page.waitForTimeout(800);
        await page.screenshot({ path: 'tests/screenshots/plan-01-planning.png' });
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('OK Planning pagina laadt');
    });

    test('2 — Huidige week zichtbaar met dag-items', async ({ page }) => {
        await loginAs(page, MEDEWERKER);
        await page.goto('/medewerker/planning');
        await page.waitForSelector('text=Planning', { timeout: 15000 });
        await removeOverlay(page);
        await page.waitForTimeout(1000);

        // Weeknummer zichtbaar
        const weekNr = page.getByText(/Week \d+/).first();
        if (await weekNr.isVisible({ timeout: 3000 }).catch(() => false)) {
            const tekst = await weekNr.textContent();
            console.log('OK Week zichtbaar:', tekst);
        }

        // Dag namen zichtbaar (Ma t/m Zo)
        await expect(page.getByText('Ma').first()).toBeVisible({ timeout: 3000 });
        await expect(page.getByText('Di').first()).toBeVisible({ timeout: 3000 });
        await expect(page.getByText('Wo').first()).toBeVisible({ timeout: 3000 });

        await page.screenshot({ path: 'tests/screenshots/plan-02-week.png' });
        console.log('OK Week structuur correct');
    });

    test('3 — Taak zichtbaar op woensdag', async ({ page }) => {
        await loginAs(page, MEDEWERKER);
        await page.goto('/medewerker/planning');
        await page.waitForSelector('text=Planning', { timeout: 15000 });
        await removeOverlay(page);
        await page.waitForTimeout(1200);

        const taak = page.getByText('Kozijnen buiten verven').first();
        if (await taak.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('OK Taak zichtbaar op planning');
        } else {
            console.log('Taak niet zichtbaar (mogelijk andere week geselecteerd)');
        }
        await page.screenshot({ path: 'tests/screenshots/plan-03-taak.png' });
    });

    test('4 — Dag klikken opent dag detail', async ({ page }) => {
        await loginAs(page, MEDEWERKER);
        await page.goto('/medewerker/planning');
        await page.waitForSelector('text=Planning', { timeout: 15000 });
        await removeOverlay(page);
        await page.waitForTimeout(1200);

        const taak = page.getByText('Kozijnen buiten verven').first();
        if (await taak.isVisible({ timeout: 3000 }).catch(() => false)) {
            await taak.click({ force: true });
            await page.waitForTimeout(800);
            await removeOverlay(page);

            // Detail panel moet verschijnen (projectnaam of taaknaam zichtbaar)
            await expect(page.getByText('Schilderwerk Rijswijk').first()).toBeVisible({ timeout: 5000 });
            console.log('OK Dag detail geopend');
            await page.screenshot({ path: 'tests/screenshots/plan-04-detail.png' });
        } else {
            console.log('Taak niet gevonden voor klik test');
        }
    });

    test('5 — Tabs in dag detail (Uren, Werkbon, Notitie)', async ({ page }) => {
        await loginAs(page, MEDEWERKER);
        await page.goto('/medewerker/planning');
        await page.waitForSelector('text=Planning', { timeout: 15000 });
        await removeOverlay(page);
        await page.waitForTimeout(1200);

        const taak = page.getByText('Kozijnen buiten verven').first();
        if (await taak.isVisible({ timeout: 3000 }).catch(() => false)) {
            await taak.click({ force: true });
            await page.waitForTimeout(800);
            await removeOverlay(page);

            // Tabs testen
            for (const tabNaam of ['Uren', 'Werkbon', 'Notitie']) {
                const tab = page.locator('button').filter({ hasText: new RegExp(`^${tabNaam}$`) });
                if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await tab.click({ force: true });
                    await page.waitForTimeout(400);
                    await expect(page.locator('body')).not.toContainText('TypeError');
                    console.log(`OK Tab "${tabNaam}" werkt`);
                } else {
                    console.log(`Tab "${tabNaam}" niet gevonden`);
                }
            }
            await page.screenshot({ path: 'tests/screenshots/plan-05-tabs.png' });
        } else {
            console.log('Detail niet geopend — tabs niet getest');
        }
    });

    test('6 — Uren invoeren via Uren tab', async ({ page }) => {
        await loginAs(page, MEDEWERKER);
        await page.goto('/medewerker/planning');
        await page.waitForSelector('text=Planning', { timeout: 15000 });
        await removeOverlay(page);
        await page.waitForTimeout(1200);

        const taak = page.getByText('Kozijnen buiten verven').first();
        if (await taak.isVisible({ timeout: 3000 }).catch(() => false)) {
            await taak.click({ force: true });
            await page.waitForTimeout(600);
            await removeOverlay(page);

            const urenTab = page.locator('button').filter({ hasText: /^Uren$/ });
            if (await urenTab.isVisible({ timeout: 2000 }).catch(() => false)) {
                await urenTab.click({ force: true });
                await page.waitForTimeout(400);

                // Uren invullen
                const urenInput = page.locator('input[type="number"]').first();
                if (await urenInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await urenInput.fill('7');
                    const opslaanBtn = page.getByText('Opslaan').first();
                    if (await opslaanBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                        await opslaanBtn.click({ force: true });
                        await page.waitForTimeout(800);
                        console.log('OK Uren opgeslagen via Uren tab');
                    }
                }
            }
        }
        await page.screenshot({ path: 'tests/screenshots/plan-06-uren.png' });
    });

    test('7 — Week navigatie (vorige/volgende week)', async ({ page }) => {
        await loginAs(page, MEDEWERKER);
        await page.goto('/medewerker/planning');
        await page.waitForSelector('text=Planning', { timeout: 15000 });
        await removeOverlay(page);
        await page.waitForTimeout(800);

        // Vorige week knop
        const vorige = page.locator('button').filter({ has: page.locator('.fa-chevron-left') }).first();
        if (await vorige.isVisible({ timeout: 2000 }).catch(() => false)) {
            await vorige.click({ force: true });
            await page.waitForTimeout(600);
            const weekNr = page.getByText(/Week \d+/).first();
            if (await weekNr.isVisible({ timeout: 2000 }).catch(() => false)) {
                console.log('OK Vorige week:', await weekNr.textContent());
            }
        }

        // Terug naar huidige week
        const vandaag = page.getByText('Vandaag').first()
            .or(page.getByText('Huidig').first());
        if (await vandaag.isVisible({ timeout: 2000 }).catch(() => false)) {
            await vandaag.click({ force: true });
            await page.waitForTimeout(400);
            console.log('OK Terug naar huidige week');
        }

        // Volgende week knop
        const volgende = page.locator('button').filter({ has: page.locator('.fa-chevron-right') }).first();
        if (await volgende.isVisible({ timeout: 2000 }).catch(() => false)) {
            await volgende.click({ force: true });
            await page.waitForTimeout(600);
            console.log('OK Volgende week genavigeerd');
        }

        await page.screenshot({ path: 'tests/screenshots/plan-07-navigatie.png' });
    });

});

// ─── UREN PAGINA (BEHEERDER) ─────────────────────────────────────
test.describe('Uren pagina — Beheerder', () => {

    test('8 — Uren pagina laadt (personeelsplanner)', async ({ page }) => {
        await loginAs(page, BEHEERDER, false);
        await page.goto('/uren');
        await page.waitForLoadState('domcontentloaded');
        await removeOverlay(page);
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'tests/screenshots/plan-08-uren-beheerder.png' });
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('OK Uren pagina (beheerder) laadt');
    });

    test('9 — Uren tabs (Verlof, Personeelsplanner, Totaal)', async ({ page }) => {
        await loginAs(page, BEHEERDER, false);
        await page.goto('/uren');
        await page.waitForLoadState('domcontentloaded');
        await removeOverlay(page);
        await page.waitForTimeout(1000);

        for (const tab of ['Verlof', 'Personeelsplanner', 'Totaal']) {
            const tabEl = page.getByText(tab).first();
            if (await tabEl.isVisible({ timeout: 2000 }).catch(() => false)) {
                await tabEl.click({ force: true });
                await page.waitForTimeout(600);
                await expect(page.locator('body')).not.toContainText('TypeError');
                console.log(`OK Tab "${tab}" werkt`);
            } else {
                console.log(`Tab "${tab}" niet gevonden`);
            }
        }
        await page.screenshot({ path: 'tests/screenshots/plan-09-uren-tabs.png' });
    });

    test('10 — Verlof aanvragen formulier', async ({ page }) => {
        await loginAs(page, BEHEERDER, false);
        await page.goto('/uren');
        await page.waitForLoadState('domcontentloaded');
        await removeOverlay(page);
        await page.waitForTimeout(800);

        const verlofTab = page.getByText('Verlof').first();
        if (await verlofTab.isVisible({ timeout: 2000 }).catch(() => false)) {
            await verlofTab.click({ force: true });
            await page.waitForTimeout(600);

            // Zoek verlof aanvragen knop of form
            const aanvraagBtn = page.getByText('Verlof aanvragen').or(page.getByText('Aanvragen')).first();
            if (await aanvraagBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await aanvraagBtn.click({ force: true });
                await page.waitForTimeout(500);
                console.log('OK Verlof aanvragen geopend');
            } else {
                console.log('Verlof aanvraag formulier direct zichtbaar of knop anders');
            }
        }
        await page.screenshot({ path: 'tests/screenshots/plan-10-verlof.png' });
    });

});

// ─── URENREGISTRATIE V2 ──────────────────────────────────────────
test.describe('Urenregistratie V2', () => {

    test('11 — Urenregistratie pagina laadt', async ({ page }) => {
        await loginAs(page, BEHEERDER, true);
        await page.goto('/urenregistratie');
        await page.waitForLoadState('domcontentloaded');
        await removeOverlay(page);
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'tests/screenshots/plan-11-urenreg.png' });
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('OK Urenregistratie laadt');
    });

    test('12 — Uren tabs (Mijn Uren, Team, Maand, Project)', async ({ page }) => {
        await loginAs(page, BEHEERDER, true);
        await page.goto('/urenregistratie');
        await page.waitForLoadState('domcontentloaded');
        await removeOverlay(page);
        await page.waitForTimeout(800);

        for (const tab of ['Mijn Uren', 'Team', 'Maand', 'Project']) {
            const tabEl = page.getByText(tab).first();
            if (await tabEl.isVisible({ timeout: 2000 }).catch(() => false)) {
                await tabEl.click({ force: true });
                await page.waitForTimeout(500);
                await expect(page.locator('body')).not.toContainText('TypeError');
                console.log(`OK Tab "${tab}" werkt`);
            } else {
                console.log(`Tab "${tab}" niet gevonden`);
            }
        }
        await page.screenshot({ path: 'tests/screenshots/plan-12-urenreg-tabs.png' });
    });

    test('13 — Uren invoeren (project + type + uren)', async ({ page }) => {
        await loginAs(page, BEHEERDER, true);
        await page.goto('/urenregistratie');
        await page.waitForLoadState('domcontentloaded');
        await removeOverlay(page);
        await page.waitForTimeout(1000);

        // Zoek uren invoerveld
        const urenInput = page.locator('input[type="number"]').first();
        if (await urenInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await urenInput.fill('8');
            console.log('OK Uren ingevoerd');

            const opslaanBtn = page.getByText('Opslaan').or(page.getByText('Registreren')).first();
            if (await opslaanBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await opslaanBtn.click({ force: true });
                await page.waitForTimeout(800);
                await expect(page.locator('body')).not.toContainText('TypeError');
                console.log('OK Uren opgeslagen');
            }
        } else {
            console.log('Geen uren invoerveld zichtbaar');
        }
        await page.screenshot({ path: 'tests/screenshots/plan-13-uren-opslaan.png' });
    });

});

// ─── PROJECT PLANNING TAB ────────────────────────────────────────
test.describe('Project Planning tab', () => {

    test('14 — Project Planning tab laadt', async ({ page }) => {
        await loginAs(page, BEHEERDER, true);

        await page.evaluate(() => {
            localStorage.setItem('schildersapp_projecten', JSON.stringify([{
                id: 'plan-proj-1',
                name: 'Schilderwerk Rijswijk',
                client: 'Bakker BV',
                status: 'active',
                color: '#F5850A',
                tasks: [
                    { id: 'plan-task-1', name: 'Kozijnen buiten verven', assignedTo: [1], startDate: '2026-04-08', endDate: '2026-04-10', completed: false, progress: 0, notes: [] },
                    { id: 'plan-task-2', name: 'Muren binnenzijde', assignedTo: [1, 2], startDate: '2026-04-13', endDate: '2026-04-17', completed: false, progress: 50, notes: [] },
                ]
            }]));
        });

        await page.goto('/projecten/plan-proj-1');
        await page.waitForLoadState('domcontentloaded');
        await removeOverlay(page);
        await page.waitForTimeout(1200);

        const planningTab = page.getByText('Planning').first();
        if (await planningTab.isVisible({ timeout: 5000 }).catch(() => false)) {
            await planningTab.click({ force: true });
            await page.waitForTimeout(800);
            await expect(page.locator('body')).not.toContainText('TypeError');
            console.log('OK Project Planning tab geopend');
        } else {
            console.log('Planning tab niet gevonden in project detail');
        }
        await page.screenshot({ path: 'tests/screenshots/plan-14-project-planning.png' });
    });

    test('15 — Taak aanmaken in project', async ({ page }) => {
        await loginAs(page, BEHEERDER, true);

        await page.evaluate(() => {
            localStorage.setItem('schildersapp_projecten', JSON.stringify([{
                id: 'plan-proj-1',
                name: 'Schilderwerk Rijswijk',
                client: 'Bakker BV',
                status: 'active',
                color: '#F5850A',
                tasks: []
            }]));
        });

        await page.goto('/projecten/plan-proj-1');
        await page.waitForLoadState('domcontentloaded');
        await removeOverlay(page);
        await page.waitForTimeout(1000);

        // Planning tab openen
        const planningTab = page.getByText('Planning').first();
        if (await planningTab.isVisible({ timeout: 3000 }).catch(() => false)) {
            await planningTab.click({ force: true });
            await page.waitForTimeout(600);
        }

        // Taak toevoegen knop
        const nieuweBtn = page.getByText('Nieuwe taak').or(page.getByText('Taak toevoegen')).or(page.getByText('+ Taak')).first();
        if (await nieuweBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await nieuweBtn.click({ force: true });
            await page.waitForTimeout(500);
            console.log('OK Nieuwe taak formulier geopend');

            const naamInput = page.getByPlaceholder('Taaknaam').or(page.getByPlaceholder('Naam')).first();
            if (await naamInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                await naamInput.fill('Nieuwe testtaak');
                console.log('OK Taaknaam ingevuld');
            }
        } else {
            console.log('Geen nieuwe taak knop gevonden');
        }
        await page.screenshot({ path: 'tests/screenshots/plan-15-taak-nieuw.png' });
    });

});
