/**
 * uploadToSynology - universele upload helper
 * Gebruik: const result = await uploadToSynology(file, projectId, category);
 * Geeft terug: { success, url, filename, error }
 */
export async function uploadToSynology(file, projectId = 'algemeen', category = 'uploads') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', String(projectId));
    formData.append('category', category);

    const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
    });

    return await res.json();
}

/**
 * getSynologyFileUrl - geeft de proxy-URL voor een Synology bestand
 */
export function getSynologyFileUrl(path) {
    if (!path) return null;
    if (path.startsWith('/api/file')) return path; // al een proxy-URL
    if (path.startsWith('data:')) return path; // base64 (oud formaat)
    return `/api/file?path=${encodeURIComponent(path)}`;
}

/**
 * isLegacyBase64 - controleert of een opgeslagen waarde oud formaat (base64) is
 */
export function isLegacyBase64(value) {
    return value && (value.startsWith('data:') || value.length > 500);
}
