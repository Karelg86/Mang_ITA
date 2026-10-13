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

        // Solo la colonna dei risultati: la sidebar ("Ultime aggiunte") ha card
        // con lo stesso markup e finirebbe tra i risultati.
        const sidebarIdx = html.indexOf('cate-title');
        const body = sidebarIdx !== -1 ? html.slice(0, sidebarIdx) : html;

        const results = [];
        // L'HTML è minificato: i titoli di una parola sono senza virgolette
        // (title=Berserk), quelli di più parole sono quotati (title="One Piece").
        const regex = /href=["']?(https?:\/\/[^"' >]+\/manga\/[^"' >]+)["']?\s+title=(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>\s*<img[^>]*?\ssrc=["']?([^"' >]+)/g;
        let match;
        const seen = new Set();
        while ((match = regex.exec(body)) !== null) {
            const id = match[1].trim();
            const title = decodeEntities((match[2] || match[3] || match[4]).trim());
            if (!seen.has(id)) {
                seen.add(id);
                results.push({ id: id, title: title, imageURL: match[5].trim() });
            }
        }
        console.log(`[MangaWorldIT][Search] ${results.length} risultati`);
        return results;
    } catch (e) {
        console.log(`[MangaWorldIT][Search] ${e}`);
        return [];
    }
}

function decodeEntities(str) {
    return str
        .replace(/&#(\d+);/g, function(_, n) { return String.fromCharCode(parseInt(n, 10)); })
        .replace(/&#x([0-9a-f]+);/gi, function(_, n) { return String.fromCharCode(parseInt(n, 16)); })
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
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
        let jsonStr = null;
        
        const match5 = html.match(/\$MC=\(window\.\$MC\|\|\[\]\)\.concat\((.*?)\)<\/script>/);
        if (match5) {
            jsonStr = match5[1];
        } else {
            const match4 = html.match(/\$_mod\.ready\([^,]+,\s*(\{.*?\})\s*\);?<\/script>/);
            if (match4) {
                jsonStr = match4[1];
            }
        }

        if (jsonStr) {
            try {
                const data = JSON.parse(jsonStr);
                
                function findChapters(obj) {
                    if (Array.isArray(obj)) {
                        obj.forEach(findChapters);
                    } else if (obj !== null && typeof obj === 'object') {
                        if (obj._id && obj.name && Array.isArray(obj.pages)) {
                            if (!seen.has(obj._id) && !obj.name.toLowerCase().includes('volume')) {
                                seen.add(obj._id);
                                const numMatch = obj.name.match(/(\d+(?:\.\d+)?)/);
                                const number = numMatch ? parseFloat(numMatch[1]) : chapters.length + 1;
                                chapters.push({
                                    id: JSON.stringify({ m: mangaId, s: mangaSlug, c: obj._id }),
                                    title: obj.name,
                                    chapter: number,
                                    scanlation_group: "MangaWorld"
                                });
                            }
                        }
                        Object.values(obj).forEach(findChapters);
                    }
                }
                
                findChapters(data);
                
            } catch (e) {
                console.log('[MangaWorldIT] JSON parse failed: ' + e.message);
            }
        }

        // Se non troviamo capitoli con il JSON, fallback sulla vecchia regex robusta che non dipende dall'ordine
        if (chapters.length === 0) {
            const chapRegex = /"_id":"([a-f0-9]{24})","pages":\[[^\]]*\].*?"name":"(Capitolo [^"]+|[0-9]+(?:\.[0-9]+)?)"/g;
            let match;
            while ((match = chapRegex.exec(html)) !== null) {
                const chapId = match[1];
                const name = match[2];
                if (!seen.has(chapId)) {
                    seen.add(chapId);
                    const numMatch = name.match(/(\d+(?:\.\d+)?)/);
                    const number = numMatch ? parseFloat(numMatch[1]) : chapters.length + 1;
                    chapters.push({
                        id: JSON.stringify({ m: mangaId, s: mangaSlug, c: chapId }),
                        title: name,
                        chapter: number,
                        scanlation_group: "MangaWorld"
                    });
                }
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



