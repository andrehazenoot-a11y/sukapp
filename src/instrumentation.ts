import { isPublicHoliday, isWorkday, lastWorkdayOnOrBefore, isEmployeeFullyOff } from './lib/dutchHolidays.js';

function getISOWeekAndYear(date: Date): { week: number; jaar: number } {
    const d = new Date(date);
    const dag = d.getDay() || 7;
    d.setDate(d.getDate() - dag + 1); // maandag van deze week
    const jan4 = new Date(d.getFullYear(), 0, 4);
    const week = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + (jan4.getDay() || 7) - 3) / 7) + 1;
    return { week, jaar: d.getFullYear() };
}

export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    const cron = await import('node-cron');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Elke minuut checken
    cron.schedule('* * * * *', async () => {
        try {
            const settRes = await fetch(`${baseUrl}/api/uren-reminder/settings`);
            if (!settRes.ok) return;
            const settings = await settRes.json();
            if (!settings.actief) return;

            const now = new Date();

            // ── Stap 1: bepaal de "effectieve herinneringsdag" ──
            // Als de ingestelde dag een feestdag is, verschuif naar de laatste werkdag daarvoor
            const jaar = now.getFullYear();
            const { week } = getISOWeekAndYear(now);

            // Bereken de ingestelde dag van deze week (dag 1=ma..5=vr)
            const jan4 = new Date(jaar, 0, 4);
            const dow = jan4.getDay() || 7;
            const monday = new Date(jan4);
            monday.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7);
            const ingesteldeDag = new Date(monday);
            ingesteldeDag.setDate(monday.getDate() + (settings.dag - 1)); // dag 1=ma,5=vr

            const effectieveDag = lastWorkdayOnOrBefore(ingesteldeDag);

            // ── Stap 2: is vandaag de effectieve herinneringsdag? ──
            const vandaagYMD = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
            const effectiefYMD = `${effectieveDag.getFullYear()}-${String(effectieveDag.getMonth()+1).padStart(2,'0')}-${String(effectieveDag.getDate()).padStart(2,'0')}`;
            if (vandaagYMD !== effectiefYMD) return;

            // ── Stap 3: is het de ingestelde tijd? ──
            const [uurInst, minInst] = settings.tijd.split(':').map(Number);
            if (now.getHours() !== uurInst || now.getMinutes() !== minInst) return;

            // ── Stap 4: vandaag is een feestdag? Skip alles ──
            if (isPublicHoliday(now)) {
                console.log('[Reminder] Vandaag is een feestdag, geen herinneringen.');
                return;
            }

            console.log(`[Reminder] Versturen voor week ${week}/${jaar}...`);

            // ── Stap 5: haal uren op voor deze week ──
            const urenRes = await fetch(`${baseUrl}/api/uren?week=${week}&jaar=${jaar}`);
            const urenMap: Record<string, { status: string; data: unknown[] }> = {};
            if (urenRes.ok) {
                const rows = await urenRes.json() as { medewerker_id: string; status: string; data: unknown[] }[];
                if (Array.isArray(rows)) rows.forEach(r => { urenMap[String(r.medewerker_id)] = { status: r.status, data: r.data || [] }; });
            }

            // ── Stap 6: haal medewerkers + per-user instellingen op ──
            const usersRes = await fetch(`${baseUrl}/api/toolbox/users`);
            if (!usersRes.ok) return;
            const users = await usersRes.json() as { id: string | number; naam?: string; name?: string; phone?: string }[];

            const userSettRes = await fetch(`${baseUrl}/api/uren-reminder/user-settings`);
            const userSettings: Record<string, boolean> = userSettRes.ok ? await userSettRes.json() : {};

            // ── Stap 7: filter wie een herinnering nodig heeft ──
            const toSend: { phone: string; naam: string }[] = [];
            for (const u of Array.isArray(users) ? users : []) {
                if (!u.phone) continue;
                const uid = String(u.id);
                const urenEntry = urenMap[uid];

                // Melding uitgeschakeld voor deze medewerker → overslaan
                if (userSettings[uid] === false) continue;

                // Al ingediend of goedgekeurd → overslaan
                if (urenEntry?.status === 'ingediend' || urenEntry?.status === 'goedgekeurd') continue;

                // Volledig vrij/ziek/feestdagen deze week → overslaan
                const projects = (urenEntry?.data as unknown[]) || [];
                if (isEmployeeFullyOff(projects as Parameters<typeof isEmployeeFullyOff>[0], week, jaar)) {
                    console.log(`[Reminder] ${u.naam || u.name} is volledig vrij/ziek deze week, overgeslagen.`);
                    continue;
                }

                toSend.push({ phone: u.phone, naam: u.naam || u.name || 'medewerker' });
            }

            if (toSend.length === 0) {
                console.log('[Reminder] Niemand hoeft een herinnering te krijgen.');
                return;
            }

            console.log(`[Reminder] Stuur naar: ${toSend.map(u => u.naam).join(', ')}`);
            await fetch(`${baseUrl}/api/uren-reminder/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ users: toSend, week, bericht: settings.bericht }),
            });

        } catch (err) {
            console.error('[Reminder] Fout in cron job:', err);
        }
    });

    console.log('[Reminder] Cron job gestart — checkt elke minuut');
}
