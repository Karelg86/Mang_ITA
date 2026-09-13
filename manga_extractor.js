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
        const kw = keyword.toLowerCase().trim();
        while ((match = regex.exec(html)) !== null) {
            const id = match[1].trim();
            const title = match[2].trim();
            if (!seen.has(id)) {
                seen.add(id);
                // Filtra: mostra solo titoli che contengono la keyword
                if (title.toLowerCase().indexOf(kw) !== -1) {
                    results.push({ id: id, title: title, imageURL: match[3].trim() });
                }
            }
        }
        // Se il filtro è troppo stretto e non trova nulla, mostra tutti
        if (results.length === 0) {
            seen.clear();
            regex.lastIndex = 0;
            while ((match = regex.exec(html)) !== null) {
                const id = match[1].trim();
                if (!seen.has(id)) {
                    seen.add(id);
                    results.push({ id: id, title: match[2].trim(), imageURL: match[3].trim() });
                }
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
// 3. CAPITOLI -> { "Italiano": [ [numStr, [{id,title,chapter,scanlation_group}]], ... ] }
//    IMPORTANTE: L'ID del capitolo contiene chapId + pages in JSON,
//    così extractImages non deve fare richieste HTTP aggiuntive.
// ==========================================

async function extractChapters(urlOrId) {
    console.log('[MangaWorldIT][Chapters] ' + urlOrId);
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
        const chapRegex = /"_id":"([a-f0-9]{24})","manga":"[a-f0-9]{24}","name":"([^"]+)","volume":\{[^}]*"slugFolder":"([^"]+)"[^}]*\}[^}]*"pages":\[([^\]]*)\][^}]*"slugFolder":"([^"]+)"/g;
        let match;

        while ((match = chapRegex.exec(html)) !== null) {
            const chapId = match[1];
            const name = match[2];
            if (!seen.has(chapId)) {
                seen.add(chapId);
                const numMatch = name.match(/(\d+(?:\.\d+)?)/);
                const number = numMatch ? parseFloat(numMatch[1]) : chapters.length + 1;

                chapters.push({
                    // ID CORTISSIMO (sotto i 100 char) per evitare il troncamento in SQLite di Shirox
                    id: JSON.stringify({ m: mangaId, s: mangaSlug, c: chapId }),
                    title: name,
                    chapter: number,
                    scanlation_group: "MangaWorld"
                });
            }
        }

        chapters.sort(function(a, b) { return a.chapter - b.chapter; });
        const entries = chapters.map(function(ch) { return [String(ch.chapter), [ch]]; });
        console.log('[MangaWorldIT][Chapters] ' + entries.length + ' capitoli trovati');
        return { "Italiano": entries };
    } catch (e) {
        console.log('[MangaWorldIT][Chapters] ' + e);
        return {};
    }
}
// ==========================================
// 4. IMMAGINI DI UN CAPITOLO -> [ "url", ... ]
//    Le immagini sono già nell'ID del capitolo!
// ==========================================

async function extractImages(chapterId) {
    try {
        const data = JSON.parse(chapterId);
        const readerUrl = "https://www.mangaworld.mx/manga/" + data.m + "/" + data.s + "/read/" + data.c + "/1";
        const res = await soraFetch(readerUrl, { headers: HEADERS });
        if (!res || typeof res.text !== "function") return [];
        const html = await res.text();

        // 1. Trova l'URL della prima immagine direttamente dall'HTML del reader
        const imgMatch = html.match(/id=page[^>]*>[\s\S]*?<img[^>]*src=["']?([^"'\s>]+)/);
        if (!imgMatch) return [];
        const firstUrl = imgMatch[1];
        const base = firstUrl.substring(0, firstUrl.lastIndexOf('/') + 1);

        // 2. Trova l'elenco delle pagine (i nomi dei file) dal JSON della pagina
        const regexStr = '"_id":"' + data.c + '"[^}]+?"pages":\\[([^\\]]*)\\]';
        const chapRegex = new RegExp(regexStr);
        const match = html.match(chapRegex);

        if (match && match[1]) {
            const pages = JSON.parse('[' + match[1] + ']');
            const imageUrls = pages.map(function(p) { return base + p; });
            console.log('[MangaWorldIT][Images] ' + imageUrls.length + ' pagine (Base: ' + base + ')');
            return imageUrls;
        }
        
        return [];
    } catch (e) {
        console.log('[MangaWorldIT][Images] error: ' + e);
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



