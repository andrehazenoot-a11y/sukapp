const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    retries: 1,
    timeout: 30_000,
    reporter: [
        ['html', { open: 'never', outputFolder: 'tests/playwright-report' }],
        ['list'],
    ],
    use: {
        baseURL: 'http://localhost:3000',
        locale: 'nl-NL',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'on-first-retry',
        // Standaard: beheerder-sessie (overschrijfbaar per bestand via test.use())
        storageState: 'tests/e2e/.auth/beheerder.json',
    },
    projects: [
        // Stap 1: login setup
        {
            name: 'setup',
            testMatch: /auth\.setup\.js/,
            use: { storageState: { cookies: [], origins: [] } },
        },
        // Alle andere tests
        {
            name: 'alle-tests',
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
    ],
    webServer: {
        command: 'npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 60_000,
    },
});
