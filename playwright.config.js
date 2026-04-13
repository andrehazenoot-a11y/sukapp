import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    timeout: 30000,
    use: {
        baseURL: 'http://localhost:3001',
        headless: false,        // zichtbaar in browser
        slowMo: 500,            // traag zodat je kan meekijken
        viewport: { width: 390, height: 844 }, // mobiel formaat
        locale: 'nl-NL',
    },
    reporter: 'list',
});
