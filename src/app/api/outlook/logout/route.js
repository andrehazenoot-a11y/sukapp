import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    const jar = await cookies();
    const res = NextResponse.json({ ok: true });
    res.cookies.delete('ms_access_token');
    res.cookies.delete('ms_refresh_token');
    return res;
}
