const BASE = 'http://localhost:3000';

async function maakTestMedewerker(request, suffix) {
    suffix = suffix || Date.now();
    const res = await request.post(`${BASE}/api/gebruikers`, {
        data: {
            name: `Test Medewerker ${suffix}`,
            username: `test_mw_${suffix}`,
            password: 'Test1234!',
            role: 'Medewerker',
            phone: '',
        },
        headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
}

async function verwijderTestMedewerker(request, id) {
    await request.delete(`${BASE}/api/gebruikers?id=${id}`);
}

async function maakTestVerlof(request, userId, userName, vanDatum, totDatum) {
    vanDatum = vanDatum || '2026-08-01';
    totDatum = totDatum || '2026-08-05';
    const entry = {
        id: Date.now(),
        type: 'Vakantie',
        van: vanDatum,
        tot: totDatum,
        status: 'In behandeling',
        naam: userName,
        opmerking: 'Test verlofaanvraag',
        ingediend: new Date().toISOString(),
    };
    await request.post(`${BASE}/api/verlof`, {
        data: { userId: String(userId), userName, entry },
        headers: { 'Content-Type': 'application/json' },
    });
    return { id: entry.id, userId };
}

async function verwijderTestVerlof(request, id, userId) {
    await request.delete(`${BASE}/api/verlof`, {
        data: { id, userId: String(userId) },
        headers: { 'Content-Type': 'application/json' },
    });
}

module.exports = { maakTestMedewerker, verwijderTestMedewerker, maakTestVerlof, verwijderTestVerlof };
