import { NextResponse } from 'next/server';

const TENANT = 'cd3d3914-6711-4801-9d09-f83f5a0645d3';
const CLIENT_ID = process.env.OUTLOOK_CLIENT_ID;
const CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET;

// Fallback als geen sjabloon meegestuurd wordt
const STANDAARD_BUCKETS = [
    { naam: 'Nieuwe taak',     taken: ['Voorbereiding & schuren', 'Grondverf aanbrengen', 'Schilderwerk uitvoeren', 'Oplevering & controle', 'Facturatie'] },
    { naam: 'To-do',           taken: [] },
    { naam: 'Planning taken',  taken: [] },
    { naam: 'Taken uit email', taken: [] },
];

async function getAppToken() {
    const res = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            scope: 'https://graph.microsoft.com/.default',
            grant_type: 'client_credentials',
        }),
    });
    const data = await res.json();
    if (!data.access_token) throw new Error('App token ophalen mislukt: ' + JSON.stringify(data));
    return data.access_token;
}

export async function POST(req) {
    const { teamId, projectNaam, buckets } = await req.json();
    if (!teamId || !projectNaam) return NextResponse.json({ error: 'teamId en projectNaam zijn vereist' }, { status: 400 });

    try {
        const token = await getAppToken();

        // 1. Maak Teams kanaal aan (of gebruik bestaand kanaal met dezelfde naam)
        let kanaalId, kanaalUrl;
        const kanaalRes = await fetch(`https://graph.microsoft.com/v1.0/teams/${teamId}/channels`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept-Language': 'en-US' },
            body: JSON.stringify({
                displayName: projectNaam,
                description: `Project kanaal voor ${projectNaam}`,
                membershipType: 'standard',
            }),
        });
        if (!kanaalRes.ok) {
            const errData = await kanaalRes.json().catch(() => null);
            const innerCode = errData?.error?.innerError?.code;
            if (innerCode !== 'NameAlreadyExists') {
                return NextResponse.json({ error: `Kanaal aanmaken mislukt: ${JSON.stringify(errData)}` }, { status: kanaalRes.status });
            }
            // Kanaal bestaat al — verdergaan zonder kanaalId (wordt al bewaard in het project)
        } else {
            const kanaal = await kanaalRes.json();
            kanaalId = kanaal.id;
            kanaalUrl = kanaal.webUrl;
        }

        // 2. Maak Planner plan aan
        let plannerPlanId = null;
        const planRes = await fetch('https://graph.microsoft.com/v1.0/planner/plans', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept-Language': 'en-US' },
            body: JSON.stringify({ owner: teamId, title: projectNaam }),
        });

        if (planRes.ok) {
            const plan = await planRes.json();
            plannerPlanId = plan.id;

            // 3. Maak buckets aan (uit sjabloon of standaard)
            const teGebruikenBuckets = (buckets && buckets.length > 0) ? buckets : STANDAARD_BUCKETS;
            let orderHint = ' !';
            for (const bucket of teGebruikenBuckets) {
                const bucketRes = await fetch('https://graph.microsoft.com/v1.0/planner/buckets', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept-Language': 'en-US' },
                    body: JSON.stringify({ name: bucket.naam, planId: plannerPlanId, orderHint }),
                });
                if (bucketRes.ok) {
                    const bucketData = await bucketRes.json();
                    orderHint = bucketData.orderHint + ' !';
                    for (const taakNaam of bucket.taken) {
                        await fetch('https://graph.microsoft.com/v1.0/planner/tasks', {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept-Language': 'en-US' },
                            body: JSON.stringify({ planId: plannerPlanId, title: taakNaam, bucketId: bucketData.id }),
                        }).catch(() => {});
                    }
                }
            }
            // 4. Bouw direct het tabblad in het Teams kanaal op, zodat je in MS Teams geen foutmeldingen krijgt
            if (kanaalId) {
                try {
                    await fetch(`https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${kanaalId}/tabs`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            displayName: "Planner",
                            "teamsApp@odata.bind": "https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/com.microsoft.teamspace.tab.planner",
                            configuration: {
                                entityId: plannerPlanId,
                                contentUrl: `https://tasks.teams.microsoft.com/teamsui/{tid}/Home/PlannerFrame?page=7&planId=${plannerPlanId}&auth_pvr=OrgId&auth_upn={userPrincipalName}&mkt={locale}`,
                                removeUrl: `https://tasks.teams.microsoft.com/teamsui/{tid}/Home/PlannerFrame?page=13&planId=${plannerPlanId}&auth_pvr=OrgId&auth_upn={userPrincipalName}&mkt={locale}`,
                                websiteUrl: `https://tasks.office.com/{tid}/nl-NL/Home/Planner/#/plantaskboard?planId=${plannerPlanId}`
                            }
                        })
                    });
                } catch (e) {
                    console.error("Kon tabblad in kanaal niet maken:", e);
                }
            }
        }

        return NextResponse.json({ kanaalId, kanaalUrl, plannerPlanId });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
