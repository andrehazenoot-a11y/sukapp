export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const product = searchParams.get('product');
    if (!product) return Response.json({ url: null });

    // Productnaam → URL slug
    const slug = product
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    try {
        const res = await fetch(`https://www.sikkens.nl/nl/producten/${slug}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            next: { revalidate: 86400 }, // 24u cache
        });
        if (!res.ok) return Response.json({ url: null });

        const html = await res.text();

        // Zoek JSON-LD met image URL
        const matches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
        for (const match of matches) {
            try {
                const json = JSON.parse(match[1]);
                const image = json.image || json?.mainEntity?.image;
                if (image) {
                    const url = typeof image === 'string' ? image : image[0];
                    if (url && url.includes('akzonobel')) return Response.json({ url });
                }
            } catch { /* volgende proberen */ }
        }

        // Fallback: zoek og:image
        const og = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
        if (og?.[1]?.includes('akzonobel')) return Response.json({ url: og[1] });

        return Response.json({ url: null });
    } catch {
        return Response.json({ url: null });
    }
}
