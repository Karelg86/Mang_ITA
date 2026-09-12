const _pageCache = new Map();

async function _fetchPage(url) {
    if (_pageCache.has(url)) return _pageCache.get(url);
    const res = await soraFetch(url);
    if (!res) return '';
    const text = await res.text();
    _pageCache.set(url, text);
    return text;
}

async function searchResults(keyword) {
    try {
        const response = await soraFetch(`https://www.mangaworld.mx/archive?keyword=${encodeURIComponent(keyword)}`);
        const html = await response.text();
        const results = [];
        const regex = /href=(https:\/\/www\.mangaworld\.mx\/manga\/[^ \n>]+) title="([^"]+)"[^>]*><img src=([^\n >]+)/g;
        let match;
        const seen = new Set();
        while ((match = regex.exec(html)) !== null) {
            const href = match[1].trim();
            if (!seen.has(href)) {
                seen.add(href);
                results.push({ title: match[2].trim(), href, image: match[3].trim() });
            }
        }
        return JSON.stringify(results);
    } catch (e) {
        return JSON.stringify([]);
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

        return JSON.stringify([{ description, aliases: '', airdate: '' }]);
    } catch (e) {
        return JSON.stringify([{ description: '', aliases: '', airdate: '' }]);
    }
}

async function extractChapters(url) {
    try {
        const html = await _fetchPage(url);

        // I capitoli sono nel JSON inline della pagina.
        // Struttura: {"name":"Capitolo 01","slugFolder":"capitolo-01","manga":"ID","id":"CHAPID","pages":["1.jpg",...]}
        // URL capitolo: https://www.mangaworld.mx/manga/{mangaId}/{mangaSlug}/{slugFolder}

        // Estrai l'ID e slug del manga dall'URL passato: /manga/{id}/{slug}
        const urlParts = url.replace('https://www.mangaworld.mx/manga/', '').split('/');
        const mangaId = urlParts[0];
        const mangaSlug = urlParts[1];

        // Trova il blocco JSON che contiene i capitoli cercando "slugFolder"
        const chapters = [];
        const seen = new Set();

        // Regex per ogni capitolo nel JSON inline
        const chapRegex = /"name":"([^"]+)","volume":\{[^}]+\}[^}]*"slugFolder":"([^"]+)","title":[^,]+,"totViews":\d+[^}]*"id":"([^"]+)"/g;
        let match;

        while ((match = chapRegex.exec(html)) !== null) {
            const name = match[1];
            const slugFolder = match[2];
            const chapId = match[3];
            const href = `https://www.mangaworld.mx/manga/${mangaId}/${mangaSlug}/${slugFolder}`;

            if (!seen.has(href)) {
                seen.add(href);
                // Estrai numero dal nome: "Capitolo 01" → 1
                const numMatch = name.match(/(\d+(?:\.\d+)?)/);
                const number = numMatch ? parseFloat(numMatch[1]) : chapters.length + 1;
                chapters.push({ href, title: name, number });
            }
        }

        // Ordine crescente (dal cap 1 in poi)
        chapters.sort(function(a, b) { return a.number - b.number; });
        return JSON.stringify(chapters);
    } catch (e) {
        return JSON.stringify([]);
    }
}

async function extractText(url) {
    try {
        const response = await soraFetch(url);
        const html = await response.text();

        // Le pagine sono nel JSON inline: "pages":["1.jpg","2.jpg",...]
        // Il base URL CDN è: https://cdn.mangaworld.mx/chapters/{chapterId}/
        // L'ID del capitolo si trova nel JSON inline della pagina del capitolo

        // Cerca il chapterId dalla pagina
        const chapIdMatch = html.match(/"_id":"([a-f0-9]{24})"/);
        const pagesMatch = html.match(/"pages":\["([^"]+)"(?:,"([^"]+)")*\]/);

        if (chapIdMatch && pagesMatch) {
            const chapId = chapIdMatch[1];
            // Estrai tutte le pagine dall'array JSON
            const pagesStr = html.match(/"pages":\[([^\]]+)\]/);
            if (pagesStr) {
                try {
                    const pages = JSON.parse('[' + pagesStr[1] + ']');
                    const base = `https://cdn.mangaworld.mx/chapters/${chapId}/`;
                    return pages.map(function(p) {
                        return "<img src='" + base + p + "' style='max-width:100%;height:auto;display:block;margin:0 auto;'/>";
                    }).join('<br/>');
                } catch (_) {}
            }
        }

        // Fallback: cerca direttamente img dal CDN
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
                        return pages.map(function(p) {
                            return "<img src='" + base + p + "' style='max-width:100%;height:auto;display:block;margin:0 auto;'/>";
                        }).join('<br/>');
                    } catch (_) {}
                }
            }
        }

        return 'Nessun contenuto trovato.';
    } catch (e) {
        return 'Errore estrazione contenuto.';
    }
}

async function soraFetch(url, options = { headers: {}, method: 'GET', body: null }) {
    try {
        return await fetchv2(url, options.headers ?? {}, options.method ?? 'GET', options.body ?? null);
    } catch (e) {
        try {
            return await fetch(url, options);
        } catch (error) {
            return null;
        }
    }
}
