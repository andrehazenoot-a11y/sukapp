const { test: setup, expect } = require('@playwright/test');
const path = require('path');

const BEHEERDER_FILE = path.join(__dirname, '.auth', 'beheerder.json');
const MEDEWERKER_FILE = path.join(__dirname, '.auth', 'medewerker.json');

async function doLogin(page, username, password) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input[autocomplete="username"]', { timeout: 15_000 });
    await page.fill('input[autocomplete="username"]', username);
    await page.fill('input[autocomplete="current-password"]', password);
    await page.click('button[type="submit"]');
    // Wacht tot de app volledig geladen is (cookie + localStorage zijn dan gezet)
    await page.waitForSelector('.app-container, .main-content', { timeout: 15_000 });
    await page.waitForLoadState('networkidle');
    // Extra wacht zodat AuthContext de cookie zeker heeft opgeslagen
    await page.waitForTimeout(500);
}

setup('login als beheerder', async ({ page }) => {
    await doLogin(page, 'admin', 'admin123');
    await page.context().storageState({ path: BEHEERDER_FILE });
    console.log('Beheerder sessie opgeslagen:', BEHEERDER_FILE);
});

setup('login als medewerker', async ({ page }) => {
    await doLogin(page, 'schilder', 'verf2025');
    await page.context().storageState({ path: MEDEWERKER_FILE });
    console.log('Medewerker sessie opgeslagen:', MEDEWERKER_FILE);
});
