const { test, expect } = require('@playwright/test');

test.use({ storageState: 'tests/e2e/.auth/medewerker.json' });

test.describe('Medewerkers-app', () => {

    test('App laadt op /medewerker', async ({ page }) => {
        await page.goto('/medewerker');
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content.includes('Medewerker') || content.includes('medewerker')).toBeTruthy();
    });

    test('Hamburger menu opent navigatie-drawer met Verlof en Uren', async ({ page }) => {
        await page.goto('/medewerker');
        await page.waitForLoadState('networkidle');
        await page.locator('.fa-bars').first().click();
        await page.waitForTimeout(400);
        await expect(page.locator('text=Verlof').first()).toBeVisible({ timeout: 5_000 });
        await expect(page.locator('text=Uren').first()).toBeVisible({ timeout: 5_000 });
    });

    test('Verlof-pagina laadt met kalender', async ({ page }) => {
        await page.goto('/medewerker/verlof');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.fa-chevron-left').first()).toBeVisible({ timeout: 5_000 });
    });

    test('Aanvragen-knop opent verlof-modal', async ({ page }) => {
        await page.goto('/medewerker/verlof');
        await page.waitForLoadState('networkidle');
        await page.locator('button:has-text("Aanvragen")').first().click();
        await page.waitForTimeout(300);
        await expect(page.locator('input[type="date"]').first()).toBeVisible({ timeout: 5_000 });
    });

    test('Verlof-aanvraag invullen en indienen', async ({ page }) => {
        await page.goto('/medewerker/verlof');
        await page.waitForLoadState('networkidle');
        await page.locator('button:has-text("Aanvragen")').first().click();
        await page.waitForTimeout(300);

        // Vul datum in (volgende maand)
        const toekomst = new Date();
        toekomst.setMonth(toekomst.getMonth() + 2);
        const vanDatum = `${toekomst.getFullYear()}-${String(toekomst.getMonth() + 1).padStart(2, '0')}-10`;
        const totDatum = `${toekomst.getFullYear()}-${String(toekomst.getMonth() + 1).padStart(2, '0')}-12`;

        const dateInputs = page.locator('input[type="date"]');
        await dateInputs.nth(0).fill(vanDatum);
        await dateInputs.nth(1).fill(totDatum);

        // Indienen
        await page.locator('button:has-text("Aanvraag indienen"), button:has-text("Indienen")').first().click();
        // Wacht op succes-tekst (modal toont 2s dan sluit zichzelf)
        await page.waitForFunction(
            () => document.body.innerText.includes('ingediend') ||
                  document.body.innerText.includes('opgeslagen') ||
                  document.body.innerText.includes('Lokaal'),
            { timeout: 5000 }
        );
    });

    test('Uren-pagina laadt zonder crashes', async ({ page }) => {
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto('/medewerker/uren');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        const kritiek = errors.filter(e => !e.includes('Warning') && !e.includes('hydrat') && !e.includes('ResizeObserver'));
        expect(kritiek).toHaveLength(0);
    });

    test('Planning-pagina laadt', async ({ page }) => {
        await page.goto('/medewerker/planning');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL('/medewerker/planning');
    });

    test('Werkbon-pagina laadt', async ({ page }) => {
        await page.goto('/medewerker/werkbon');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL('/medewerker/werkbon');
    });

    test('Chat-pagina laadt', async ({ page }) => {
        await page.goto('/medewerker/chat');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL('/medewerker/chat');
    });

    test('Bouwinspectie-pagina laadt', async ({ page }) => {
        await page.goto('/medewerker/bouwinspectie');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL('/medewerker/bouwinspectie');
    });

    test('Toolbox-pagina laadt', async ({ page }) => {
        await page.goto('/medewerker/mijn-suk');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL('/medewerker/mijn-suk');
    });

    test('"Beheer" knop navigeert naar dashboard', async ({ page }) => {
        await page.goto('/medewerker');
        await page.waitForLoadState('networkidle');
        await page.locator('button:has-text("Beheer")').first().click();
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL('/');
    });

    test('Geen JS-errors op medewerker-homepagina', async ({ page }) => {
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto('/medewerker');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        const kritiek = errors.filter(e => !e.includes('Warning') && !e.includes('hydrat') && !e.includes('ResizeObserver'));
        expect(kritiek).toHaveLength(0);
    });

    test('MA-020: Start/stop dienst klokken (niet geimplementeerd)', async () => { test.skip(true, 'niet geimplementeerd'); });
    test('MA-031: Push notificaties (niet geimplementeerd)', async () => { test.skip(true, 'niet geimplementeerd'); });
});
