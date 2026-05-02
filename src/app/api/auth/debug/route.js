import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ error: 'Niet beschikbaar' }, { status: 404 });
}
