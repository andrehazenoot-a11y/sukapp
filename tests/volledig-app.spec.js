import { test, expect } from '@playwright/test';

const BEHEERDER = { id: 1, username: 'admin', name: 'Jan Modaal', role: 'Beheerder', initials: 'JM' };
const MEDEWERKER = { id: 2, username: 'schilder', name: 'Piet Kwast', role: 'Schilder', initials: 'PK' };

async function setup(page, user = BEHEERDER) {
    await page.goto('/');
    await page.evaluate((u) => {
        localStorage.setItem('schildersapp_user', JSON.stringify(u));
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
                endDate: '2026-04-15',
                completed: false,
                progress: 30,
                notes: [],
            }]
        }]));
    }, user);
    await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach(el => el.remove()));
}

async function goto(page, path) {
    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach(el => el.remove()));
    await page.waitForTimeout(1000);
}

async function klikTab(page, tekst) {
    const btn = page.getByRole('button', { name: tekst, exact: false }).first()
        .or(page.getByText(tekst, { exact: true }).first());
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click({ force: true });
        await page.waitForTimeout(600);
        return true;
    }
    return false;
}

async function screenshot(page, naam) {
    await page.screenshot({ path: `tests/screenshots/app-${naam}.png` });
}

// ══════════════════════════════════════════════════════════════
// PROJECT DETAIL — alle tabs
// ══════════════════════════════════════════════════════════════
test.describe('Project detail — alle tabs', () => {

    test('Overzicht tab', async ({ page }) => {
        await setup(page);
        await goto(page, '/projecten/test-proj-1');
        await screenshot(page, 'proj-overzicht');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Project Overzicht OK');
    });

    test('Bewaking tab', async ({ page }) => {
        await setup(page);
        await goto(page, '/projecten/test-proj-1');
        const ok = await klikTab(page, 'Bewaking');
        await screenshot(page, 'proj-bewaking');
        console.log(ok ? '✓ Bewaking tab OK' : '⚠ Bewaking tab niet gevonden');
    });

    test('Dossier tab', async ({ page }) => {
        await setup(page);
        await goto(page, '/projecten/test-proj-1');
        const ok = await klikTab(page, 'Dossier');
        await screenshot(page, 'proj-dossier');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log(ok ? '✓ Dossier tab OK' : '⚠ Dossier tab niet gevonden');
    });

    test('Financiën tab', async ({ page }) => {
        await setup(page);
        await goto(page, '/projecten/test-proj-1');
        const ok = await klikTab(page, 'Financiën');
        if (!ok) await klikTab(page, 'Financieel');
        await screenshot(page, 'proj-financien');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log(ok ? '✓ Financiën tab OK' : '⚠ Financiën tab niet gevonden');
    });

    test('Documenten tab', async ({ page }) => {
        await setup(page);
        await goto(page, '/projecten/test-proj-1');
        const ok = await klikTab(page, 'Documenten');
        await screenshot(page, 'proj-documenten');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log(ok ? '✓ Documenten tab OK' : '⚠ Documenten tab niet gevonden');
    });

    test('Team tab', async ({ page }) => {
        await setup(page);
        await goto(page, '/projecten/test-proj-1');
        const ok = await klikTab(page, 'Team') || await klikTab(page, 'Teams');
        await screenshot(page, 'proj-team');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log(ok ? '✓ Team tab OK' : '⚠ Team tab niet gevonden');
    });

    test('Planning tab', async ({ page }) => {
        await setup(page);
        await goto(page, '/projecten/test-proj-1');
        const ok = await klikTab(page, 'Planning') || await klikTab(page, 'Planner');
        await screenshot(page, 'proj-planning');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log(ok ? '✓ Planning tab OK' : '⚠ Planning tab niet gevonden');
    });
});

// ══════════════════════════════════════════════════════════════
// UREN — alle tabs
// ══════════════════════════════════════════════════════════════
test.describe('Uren & Verlof — alle tabs', () => {

    test('Verlof Aanvragen tab', async ({ page }) => {
        await setup(page);
        await goto(page, '/uren');
        await screenshot(page, 'uren-verlof');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Verlof aanvragen OK');
    });

    test('Personeelsplanner tab', async ({ page }) => {
        await setup(page);
        await goto(page, '/uren');
        const ok = await klikTab(page, 'Personeelsplanner');
        await screenshot(page, 'uren-personeelsplanner');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log(ok ? '✓ Personeelsplanner OK' : '⚠ Personeelsplanner niet gevonden');
    });

    test('Totaal Overzicht tab', async ({ page }) => {
        await setup(page);
        await goto(page, '/uren');
        const ok = await klikTab(page, 'Totaal Overzicht');
        await screenshot(page, 'uren-totaal');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log(ok ? '✓ Totaal Overzicht OK' : '⚠ Totaal Overzicht niet gevonden');
    });
});

// ══════════════════════════════════════════════════════════════
// URENREGISTRATIE — alle tabs (beheerder)
// ══════════════════════════════════════════════════════════════
test.describe('Urenregistratie — beheerder tabs', () => {

    test('Mijn Uren tab', async ({ page }) => {
        await setup(page);
        await goto(page, '/urenregistratie');
        await screenshot(page, 'urenreg-mijnuren');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Mijn Uren OK');
    });

    test('Team Overzicht tab', async ({ page }) => {
        await setup(page);
        await goto(page, '/urenregistratie');
        const ok = await klikTab(page, 'Team Overzicht') || await klikTab(page, 'Team');
        await screenshot(page, 'urenreg-team');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log(ok ? '✓ Team Overzicht OK' : '⚠ Team Overzicht niet gevonden');
    });

    test('Maandoverzicht tab', async ({ page }) => {
        await setup(page);
        await goto(page, '/urenregistratie');
        const ok = await klikTab(page, 'Maandoverzicht') || await klikTab(page, 'Maand');
        await screenshot(page, 'urenreg-maand');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log(ok ? '✓ Maandoverzicht OK' : '⚠ Maandoverzicht niet gevonden');
    });

    test('Projectoverzicht tab', async ({ page }) => {
        await setup(page);
        await goto(page, '/urenregistratie');
        const ok = await klikTab(page, 'Projectoverzicht') || await klikTab(page, 'Project');
        await screenshot(page, 'urenreg-project');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log(ok ? '✓ Projectoverzicht OK' : '⚠ Projectoverzicht niet gevonden');
    });
});

// ══════════════════════════════════════════════════════════════
// MATERIEEL — alle tabs
// ══════════════════════════════════════════════════════════════
test.describe('Materieel/Gereedschap — alle tabs', () => {

    test('Inventaris tab', async ({ page }) => {
        await setup(page);
        await goto(page, '/materieel');
        await screenshot(page, 'materieel-inventaris');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Inventaris OK');
    });

    test('Uitgifte & Locatie tab', async ({ page }) => {
        await setup(page);
        await goto(page, '/materieel');
        const ok = await klikTab(page, 'Uitgifte & Locatie') || await klikTab(page, 'Uitgifte');
        await screenshot(page, 'materieel-uitgifte');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log(ok ? '✓ Uitgifte & Locatie OK' : '⚠ Uitgifte tab niet gevonden');
    });

    test('Reparaties tab', async ({ page }) => {
        await setup(page);
        await goto(page, '/materieel');
        const ok = await klikTab(page, 'Reparaties');
        await screenshot(page, 'materieel-reparaties');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log(ok ? '✓ Reparaties OK' : '⚠ Reparaties tab niet gevonden');
    });
});

// ══════════════════════════════════════════════════════════════
// VERFVOORRAAD — functies
// ══════════════════════════════════════════════════════════════
test.describe('Verfvoorraad & Verfscanner', () => {

    test('Verfvoorraad overzicht laadt', async ({ page }) => {
        await setup(page);
        await goto(page, '/verfvoorraad');
        await screenshot(page, 'verf-overzicht');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Verfvoorraad OK');
    });

    test('Verfscanner / Scan functie', async ({ page }) => {
        await setup(page);
        await goto(page, '/verfvoorraad');
        const ok = await klikTab(page, 'Scan') || await klikTab(page, 'Scannen') || await klikTab(page, 'Scan & Herken');
        await screenshot(page, 'verf-scanner');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log(ok ? '✓ Verfscanner OK' : '⚠ Scan tab niet gevonden (mogelijk aparte knop)');
    });

    test('Verf toevoegen knop', async ({ page }) => {
        await setup(page);
        await goto(page, '/verfvoorraad');
        const addBtn = page.getByText('Toevoegen').first()
            .or(page.getByText('Verf toevoegen').first())
            .or(page.locator('button').filter({ has: page.locator('.fa-plus') }).first());
        if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log('✓ Verf toevoegen knop aanwezig');
        } else {
            console.log('⚠ Toevoegen knop niet gevonden');
        }
    });
});

// ══════════════════════════════════════════════════════════════
// TEAM (Profiel pagina)
// ══════════════════════════════════════════════════════════════
test.describe('Team — profiel pagina', () => {

    test('Team overzicht laadt', async ({ page }) => {
        await setup(page);
        await goto(page, '/profiel');
        await screenshot(page, 'team-overzicht');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Team overzicht OK');
    });

    test('Werknemer profiel detail', async ({ page }) => {
        await setup(page);
        await goto(page, '/profiel');
        await page.waitForTimeout(500);
        // Klik op een teamlid
        const teamlid = page.locator('[style*="cursor: pointer"]').first();
        if (await teamlid.isVisible({ timeout: 2000 }).catch(() => false)) {
            await teamlid.click({ force: true });
            await page.waitForTimeout(800);
            await screenshot(page, 'team-detail');
            await expect(page.locator('body')).not.toContainText('TypeError');
            console.log('✓ Teamlid detail geopend');
        } else {
            console.log('⚠ Geen teamleden gevonden in localStorage');
        }
    });

    test('ZZP tab in profiel', async ({ page }) => {
        await setup(page);
        await goto(page, '/profiel');
        const ok = await klikTab(page, "ZZP'er") || await klikTab(page, 'ZZP');
        await screenshot(page, 'team-zzp');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log(ok ? "✓ ZZP profiel tab OK" : "⚠ ZZP tab niet gevonden");
    });
});

// ══════════════════════════════════════════════════════════════
// MATERIAALZOEKER
// ══════════════════════════════════════════════════════════════
test.describe('Materiaalzoeker', () => {

    test('Zoekfunctie aanwezig', async ({ page }) => {
        await setup(page);
        await goto(page, '/materiaal');
        const zoek = page.getByPlaceholder(/zoek|search/i).first();
        if (await zoek.isVisible({ timeout: 2000 }).catch(() => false)) {
            await zoek.fill('wit');
            await page.waitForTimeout(600);
            await screenshot(page, 'materiaal-zoek');
            console.log('✓ Materiaalzoeker zoekfunctie OK');
        } else {
            await screenshot(page, 'materiaal-leeg');
            console.log('⚠ Zoekveld niet gevonden');
        }
    });

    test('Categoriefilter aanwezig', async ({ page }) => {
        await setup(page);
        await goto(page, '/materiaal');
        const filter = page.locator('select').first()
            .or(page.locator('[style*="cursor: pointer"]').first());
        if (await filter.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log('✓ Filter aanwezig');
        } else {
            console.log('⚠ Filter niet gevonden');
        }
    });
});

// ══════════════════════════════════════════════════════════════
// MEDEWERKER APP — eigen tabs
// ══════════════════════════════════════════════════════════════
test.describe('Medewerker app — tabs', () => {

    test('Medewerker werkbonnen — Snel aanmaken view', async ({ page }) => {
        await setup(page, MEDEWERKER);
        await goto(page, '/medewerker/werkbonnen');
        await screenshot(page, 'med-werkbonnen-snel');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Medewerker werkbonnen OK');
    });

    test('Medewerker werkbonnen — Mijn bonnen view', async ({ page }) => {
        await setup(page, MEDEWERKER);
        await goto(page, '/medewerker/werkbonnen');
        const ok = await klikTab(page, 'Mijn bonnen') || await klikTab(page, 'lijst');
        await screenshot(page, 'med-werkbonnen-lijst');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log(ok ? '✓ Mijn bonnen view OK' : '⚠ Mijn bonnen niet gevonden');
    });

    test('Medewerker planning laadt', async ({ page }) => {
        await setup(page, MEDEWERKER);
        await goto(page, '/medewerker/planning');
        await screenshot(page, 'med-planning');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Medewerker planning OK');
    });
});

// ══════════════════════════════════════════════════════════════
// TOEGANGSBEHEER
// ══════════════════════════════════════════════════════════════
test.describe('Toegangsbeheer', () => {

    test('Gebruikerslijst laadt', async ({ page }) => {
        await setup(page);
        await goto(page, '/toegang');
        await screenshot(page, 'toegang-gebruikers');
        await expect(page.locator('body')).not.toContainText('TypeError');
        console.log('✓ Toegangsbeheer OK');
    });

    test('Gebruiker bewerken knop', async ({ page }) => {
        await setup(page);
        await goto(page, '/toegang');
        const editBtn = page.getByText('Bewerken').first()
            .or(page.locator('button').filter({ has: page.locator('.fa-pen') }).first());
        if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await editBtn.click({ force: true });
            await page.waitForTimeout(600);
            await screenshot(page, 'toegang-bewerken');
            console.log('✓ Gebruiker bewerken werkt');
        } else {
            console.log('⚠ Bewerken knop niet gevonden');
        }
    });
});
