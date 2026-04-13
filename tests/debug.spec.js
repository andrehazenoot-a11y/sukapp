import { test } from '@playwright/test';

test('debug — planning met testdata', async ({ page }) => {
    await page.goto('/');

    const vandaag = new Date();
    const dag = vandaag.getDay();
    const diffNaarMa = dag === 0 ? -6 : -(dag - 1);
    const maandag = new Date(vandaag);
    maandag.setDate(vandaag.getDate() + diffNaarMa);
    const woensdag = new Date(maandag);
    woensdag.setDate(maandag.getDate() + 2);
    const datumStr = woensdag.toISOString().slice(0, 10);
    console.log(`Testdatum: ${datumStr}`);

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
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/screenshots/debug-planning.png' });

    // Toon alle teksten
    const divs = page.locator('div');
    const count = await divs.count();
    const teksten = [];
    for (let i = 0; i < Math.min(count, 100); i++) {
        const t = await divs.nth(i).innerText().catch(() => '');
        const trimmed = t.trim();
        if (trimmed.length > 2 && trimmed.length < 40 && !teksten.includes(trimmed)) {
            teksten.push(trimmed);
        }
    }
    console.log('Unieke teksten op pagina:', teksten.slice(0, 40));
});
