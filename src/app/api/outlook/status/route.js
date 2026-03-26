import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
    const jar = await cookies();
    const token = jar.get('ms_access_token')?.value || null;
    if (!token) return NextResponse.json({ connected: false });

    // Controleer of token nog geldig is
    try {
        const r = await fetch('https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName', {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return NextResponse.json({ connected: false });
        const data = await r.json();
        const email = (data.mail || data.userPrincipalName || '').toLowerCase();
        return NextResponse.json({ connected: true, naam: data.displayName, email });
    } catch {
        return NextResponse.json({ connected: false });
    }
}
