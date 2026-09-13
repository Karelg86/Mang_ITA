// ==========================================
// 📖 MODULE SORA — MANGAWORLD IT (mangaworld.mx)
// Type: mangas. Conforme spec Sora/Luna/Shirox.
// ==========================================

const BASE_URL = "https://www.mangaworld.mx";

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": `${BASE_URL}/`
};

// ==========================================
// 1. RICERCA -> [{ id, title, imageURL }]
// ==========================================

async function searchResults(keyword, page) {
    console.log(`[MangaWorldIT][Search] "${keyword}"`);
    try {
        const res = await soraFetch(`${BASE_URL}/archive?keyword=${encodeURIComponent(keyword)}`, { headers: HEADERS });
        if (!res || typeof res.text !== "function") return [];
        const html = await res.text();
        if (!html) return [];

        const results = [];
        const regex = /href=(https:\/\/www\.mangaworld\.mx\/manga\/[^ \n>]+) title="([^"]+)"[^>]*><img src=([^\n >]+)/g;
        let match;
        const seen = new Set();
        while ((match = regex.exec(html)) !== null) {
            const id = match[1].trim();
            if (!seen.has(id)) {
                seen.add(id);
                results.push({ id: id, title: match[2].trim(), imageURL: match[3].trim() });
            }
        }
        console.log(`[MangaWorldIT][Search] ${results.length} risultati`);
        return results;
    } catch (e) {
        console.log(`[MangaWorldIT][Search] ${e}`);
        return [];
    }
}

// ==========================================
// 2. DETTAGLI -> { description, tags }
// ==========================================

async function extractDetails(id) {
    console.log(`[MangaWorldIT][Details] ${id}`);
    try {
        const res = await soraFetch(id, { headers: HEADERS });
        if (!res || typeof res.text !== "function") return { description: "Non disponibile", tags: [] };
        const html = await res.text();
        if (!html) return { description: "Non disponibile", tags: [] };

        let description = "Nessuna trama disponibile.";
        const metaIdx = html.indexOf('<meta name=description');
        if (metaIdx !== -1) {
            const slice = html.slice(metaIdx, metaIdx + 400);
            const m = slice.match(/content="([^"]+)"/);
            if (m) description = m[1].replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
        }
        return { description, tags: [] };
    } catch (e) {
        console.log(`[MangaWorldIT][Details] ${e}`);
        return { description: "Errore caricamento", tags: [] };
    }
}

// ==========================================
// 3. CAPITOLI -> { "label": [ [numStr, [{id,title,chapter,scanlation_group}]], ... ] }
// ==========================================

async function extractChapters(urlOrId) {
    console.log(`[MangaWorldIT][Chapters] ${urlOrId}`);
    try {
        const res = await soraFetch(urlOrId, { headers: HEADERS });
        if (!res || typeof res.text !== "function") return {};
        const html = await res.text();
        if (!html) return {};

        const urlParts = urlOrId.replace('https://www.mangaworld.mx/manga/', '').split('/');
        const mangaId = urlParts[0];
        const mangaSlug = urlParts[1];

        const chapters = [];
        const seen = new Set();
        const chapRegex = /"name":"([^"]+)","volume":\{[^}]+\}[^}]*"slugFolder":"([^"]+)","title":[^,]+,"totViews":\d+[^}]*"id":"([^"]+)"/g;
        let match;

        while ((match = chapRegex.exec(html)) !== null) {
            const name = match[1];
            const slugFolder = match[2];
            const chapId = match[3];
            const chapterUrl = `${BASE_URL}/manga/${mangaId}/${mangaSlug}/${slugFolder}`;

            if (!seen.has(chapterUrl)) {
                seen.add(chapterUrl);
                const numMatch = name.match(/(\d+(?:\.\d+)?)/);
                const number = numMatch ? parseFloat(numMatch[1]) : chapters.length + 1;
                chapters.push({
                    id: JSON.stringify({ url: chapterUrl, chapId: chapId }),
                    title: name,
                    chapter: number,
                    scanlation_group: "MangaWorld"
                });
            }
        }

        chapters.sort(function(a, b) { return a.chapter - b.chapter; });

        const entries = chapters.map(function(ch) {
            return [String(ch.chapter), [ch]];
        });

        console.log(`[MangaWorldIT][Chapters] ${entries.length} capitoli trovati`);
        return { "Italiano": entries };
    } catch (e) {
        console.log(`[MangaWorldIT][Chapters] ${e}`);
        return {};
    }
}

// ==========================================
// 4. IMMAGINI DI UN CAPITOLO -> [ "url", ... ]
// ==========================================

async function extractImages(chapterId) {
    try {
        const { url, chapId } = JSON.parse(chapterId);
        console.log(`[MangaWorldIT][Images] ${url}`);

        const res = await soraFetch(url, { headers: HEADERS });
        if (!res || typeof res.text !== "function") return [];
        const html = await res.text();
        if (!html) return [];

        // Cerca le pagine nel JSON inline
        const pagesStr = html.match(/"pages":\[([^\]]+)\]/);
        if (pagesStr) {
            try {
                const pages = JSON.parse('[' + pagesStr[1] + ']');
                const base = `https://cdn.mangaworld.mx/chapters/${chapId}/`;
                const images = pages.map(function(p) { return base + p; });
                console.log(`[MangaWorldIT][Images] ${images.length} pagine`);
                return images;
            } catch (_) {}
        }

        return [];
    } catch (e) {
        console.log(`[MangaWorldIT][Images] ${e}`);
        return [];
    }
}

// ==========================================
// SORA FETCH
// ==========================================

async function soraFetch(url, options = { headers: {}, method: 'GET', body: null }) {
    const headers = options.headers || {};
    if (!headers["User-Agent"]) {
        headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    }
    try {
        if (typeof fetchv2 !== 'undefined') {
            return await fetchv2(url, headers, options.method ?? 'GET', options.body ?? null, true, 'utf-8');
        }
        return await fetch(url, options);
    } catch (e) {
        try { return await fetch(url, options); } catch (error) { return null; }
    }
}
