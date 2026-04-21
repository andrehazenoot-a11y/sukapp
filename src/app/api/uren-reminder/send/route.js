import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsappClient';
import { isEmployeeFullyOff } from '@/lib/dutchHolidays';

function huidigeWeek() {
    const nu = new Date();
    const dag = nu.getDay() || 7;
    const ma = new Date(nu);
    ma.setDate(nu.getDate() - dag + 1);
    const jan4 = new Date(ma.getFullYear(), 0, 4);
    const week = Math.ceil(((ma - jan4) / 86400000 + (jan4.getDay() || 7) - 3) / 7) + 1;
    return { week, jaar: ma.getFullYear() };
}

// POST /api/uren-reminder/send
// Body: { users: [{ phone, naam, id }], week, jaar, bericht }
// Slaat automatisch medewerkers over die volledig vrij/ziek zijn
export async function POST(req) {
    try {
        const body = await req.json();
        const { week, jaar } = body.week ? { week: body.week, jaar: body.jaar } : huidigeWeek();
        const bericht = body.bericht || 'Beste {naam}, je hebt je uren voor week {week} nog niet ingediend. Kun je dit zo snel mogelijk doen? 🙏';
        const targets = body.users || [];
        const results = [];

        // Haal uren op voor deze week om vrij/ziek te controleren
        let urenMap = {};
        try {
            const urenRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/uren?week=${week}&jaar=${jaar}`);
            if (urenRes.ok) {
                const rows = await urenRes.json();
                if (Array.isArray(rows)) rows.forEach(r => { urenMap[String(r.medewerker_id)] = r.data || []; });
            }
        } catch { /* ga door zonder uren data */ }

        for (const t of targets) {
            if (!t.phone) { results.push({ naam: t.naam, ok: false, error: 'Geen telefoonnummer', skipped: false }); continue; }

            // Check: volledig vrij of ziek deze week?
            if (t.id) {
                const projects = urenMap[String(t.id)] || [];
                if (isEmployeeFullyOff(projects, week, jaar)) {
                    results.push({ naam: t.naam, ok: false, skipped: true, error: 'Volledig vrij/ziek deze week' });
                    continue;
                }
            }

            const msg = bericht.replace('{naam}', t.naam).replace('{week}', week);
            try {
                await sendWhatsAppMessage(String(t.phone), msg);
                results.push({ naam: t.naam, ok: true, skipped: false });
            } catch (err) {
                results.push({ naam: t.naam, ok: false, skipped: false, error: err.message });
            }
        }

        return NextResponse.json({ results });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
