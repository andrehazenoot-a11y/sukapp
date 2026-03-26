import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req) {
    const jar = await cookies();
    const token = jar.get('ms_access_token')?.value || null;
    if (!token) return NextResponse.json({ error: 'Geen token — opnieuw inloggen' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');
    if (!teamId) return NextResponse.json({ error: 'teamId parameter ontbreekt' }, { status: 400 });

    // 1. Check token info (wie ben ik)
    const meRes = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${token}` },
    });
    const me = meRes.ok ? await meRes.json() : { error: await meRes.text() };

    // 2. Check of het team bestaat
    const teamRes = await fetch(`https://graph.microsoft.com/v1.0/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const team = teamRes.ok ? await teamRes.json() : { status: teamRes.status, error: await teamRes.text() };

    // 3. Mijn teams ophalen
    const myTeamsRes = await fetch('https://graph.microsoft.com/v1.0/me/joinedTeams', {
        headers: { Authorization: `Bearer ${token}` },
    });
    const myTeams = myTeamsRes.ok ? (await myTeamsRes.json()).value?.map(t => ({ id: t.id, name: t.displayName })) : { error: await myTeamsRes.text() };

    return NextResponse.json({ ikBen: me.displayName || me.userPrincipalName, team, mijnTeams: myTeams });
}
