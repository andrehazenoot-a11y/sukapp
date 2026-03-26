import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const PRESET_KLEUREN = {
    preset0:  '#e74856', // Rood
    preset1:  '#ff8c00', // Oranje
    preset2:  '#f4a460', // Bruin
    preset3:  '#fce100', // Geel
    preset4:  '#00b294', // Groen
    preset5:  '#038387', // Teal
    preset6:  '#bad80a', // Olijf
    preset7:  '#0078d4', // Blauw
    preset8:  '#8764b8', // Paars
    preset9:  '#a4262c', // Donkerrood
    preset10: '#69797e', // Grijs
    preset11: '#4a5459', // Donkergrijs
    preset12: '#767676', // Middengrijs
    preset13: '#393939', // Bijna zwart
    preset14: '#1f1f1f', // Zwart
    preset15: '#750b1c', // Bordeaux
    preset16: '#da3b01', // Donkeroranje
    preset17: '#8e562e', // Donkerbruin
    preset18: '#b7a900', // Donkergeel
    preset19: '#407505', // Donkergroen
    preset20: '#00526e', // Donkerteal
    preset21: '#003966', // Marineblauw
    preset22: '#00188f', // Donkerblauw
    preset23: '#32145a', // Donkerpaars
    preset24: '#6e0811', // Donkerkranberry
};

export async function GET() {
    const jar = await cookies();
    const token = jar.get('ms_access_token')?.value;
    if (!token) return NextResponse.json({ error: 'Niet verbonden' }, { status: 401 });

    try {
        const r = await fetch('https://graph.microsoft.com/v1.0/me/outlook/masterCategories', {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: r.status });

        const data = await r.json();
        const kleuren = {};
        for (const cat of data.value || []) {
            kleuren[cat.displayName] = PRESET_KLEUREN[cat.color] || '#94a3b8';
        }
        return NextResponse.json(kleuren);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
