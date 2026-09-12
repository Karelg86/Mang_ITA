const _pageCache = new Map();

async function _fetchPage(url) {
    if (_pageCache.has(url)) return _pageCache.get(url);
    const res = await soraFetch(url);
    if (!res) return '';
    const text = await res.text();
    _pageCache.set(url, text);
    return text;
}

// FORMATO MANGA KANZEN
async function searchResults(keyword, page = 0) {
    try {
        const response = await soraFetch(`https://www.mangaworld.mx/archive?keyword=${encodeURIComponent(keyword)}`);
        const html = await response.text();
        const results = [];
        const regex = /href=(https:\/\/www\.mangaworld\.mx\/manga\/[^ \n>]+) title="([^"]+)"[^>]*><img src=([^\n >]+)/g;
        let match;
        const seen = new Set();
        while ((match = regex.exec(html)) !== null) {
            const id = match[1].trim();
            if (!seen.has(id)) {
                seen.add(id);
                // ATTENZIONE: per i manga usa 'id' e 'imageURL' invece di 'href' e 'image'
                results.push({ id: id, title: match[2].trim(), imageURL: match[3].trim() });
            }
        }
        return results; // NON usare JSON.stringify, l'app aspetta un array nativo
    } catch (e) {
        return [];
    }
}

async function extractDetails(url) {
    try {
        const html = await _fetchPage(url);
        let description = '';
        const metaIdx = html.indexOf('<meta name=description');
        if (metaIdx !== -1) {
            const slice = html.slice(metaIdx, metaIdx + 400);
            const m = slice.match(/content="([^"]+)"/);
            if (m) description = m[1].replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
        }
        // Ritorna un oggetto nativo con 'description' e 'tags'
        return { description: description || 'Nessuna trama disponibile', tags: [] };
    } catch (e) {
        return { description: 'Errore estrazione dettagli', tags: [] };
    }
}

async function extractChapters(url) {
    try {
        const html = await _fetchPage(url);
        const urlParts = url.replace('https://www.mangaworld.mx/manga/', '').split('/');
        const mangaId = urlParts[0];
        const mangaSlug = urlParts[1];

        const chapters = [];
        const seen = new Set();
        const chapRegex = /"name":"([^"]+)","volume":\{[^}]+\}[^}]*"slugFolder":"([^"]+)","title":[^,]+,"totViews":\d+[^}]*"id":"([^"]+)"/g;
        let match;

        while ((match = chapRegex.exec(html)) !== null) {
            const name = match[1];
            const slugFolder = match[2];
            const id = `https://www.mangaworld.mx/manga/${mangaId}/${mangaSlug}/${slugFolder}`;
            
            if (!seen.has(id)) {
                seen.add(id);
                const numMatch = name.match(/(\d+(?:\.\d+)?)/);
                const number = numMatch ? parseFloat(numMatch[1]) : chapters.length + 1;
                chapters.push({ id: id, title: name, chapter: number, scanlation_group: "MangaWorld" });
            }
        }
        
        chapters.sort(function(a, b) { return a.chapter - b.chapter; });

        // Il contratto Kanzen aspetta un dizionario di lingue, poi un array di Tuple [numero, [varianti]]
        const results = chapters.map(function(ch) {
            return [
                String(ch.chapter),
                [ch]
            ];
        });

        return { it: results };
    } catch (e) {
        return { it: [] };
    }
}

async function extractImages(url) {
    try {
        const response = await soraFetch(url);
        const html = await response.text();
        
        const chapIdMatch = html.match(/"_id":"([a-f0-9]{24})"/);
        if (chapIdMatch) {
            const chapId = chapIdMatch[1];
            const pagesStr = html.match(/"pages":\[([^\]]+)\]/);
            if (pagesStr) {
                try {
                    const pages = JSON.parse('[' + pagesStr[1] + ']');
                    const base = `https://cdn.mangaworld.mx/chapters/${chapId}/`;
                    // Restituisce un Array di stringhe url dirette
                    return pages.map(function(p) { return base + p; });
                } catch (_) {}
            }
        }
        
        const imgIdx = html.indexOf('cdn.mangaworld.mx/chapters/');
        if (imgIdx !== -1) {
            const imgSlice = html.slice(Math.max(0, html.lastIndexOf('<img', imgIdx)), imgIdx + 300);
            const srcM = imgSlice.match(/src=(?:'|")?(\bhttps:\/\/cdn\.mangaworld\.mx\/chapters\/[^"' >]+)/);
            if (srcM) {
                const base = srcM[1].slice(0, srcM[1].lastIndexOf('/') + 1);
                const pSlice = html.match(/"pages":\[([^\]]+)\]/);
                if (pSlice) {
                    try {
                        const pages = JSON.parse('[' + pSlice[1] + ']');
                        return pages.map(function(p) { return base + p; });
                    } catch (_) {}
                }
            }
        }
        return [];
    } catch (e) {
        return [];
    }
}

async function soraFetch(url, options = { headers: {}, method: 'GET', body: null }) {
    try {
        const response = await fetchv2(url, options.headers ?? {}, options.method ?? 'GET', options.body ?? null);
        if (response && response.status !== undefined) return response;
        throw new Error('fetchv2 returned error format');
    } catch (e) {
        try { return await fetch(url, options); } catch (error) { return null; }
    }
}
