export async function GET() {
    try {
        const res = await fetch(
            'https://www.sikkens.nl/bin/api/documents?domainCode=enlexp&language=nl&start=0&pageSize=1000',
            { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 3600 } }
        );
        const data = await res.json();
        const docs = (data?.data?.documents ?? [])
            .filter(d => d.productName && d.href && d.type)
            .map(d => ({ productName: d.productName, href: d.href, type: d.type }));
        return Response.json({ docs });
    } catch {
        return Response.json({ error: 'Kon Sikkens-API niet bereiken' }, { status: 500 });
    }
}
