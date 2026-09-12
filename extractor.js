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
        return JSON.stringify([{ description: 'Exception: ' + e.message, aliases: '', airdate: '' }]);
    }
}

async function extractChapters(url) {
    try {
        const html = await _fetchPage(url);
        
        // Struttura reale di MangaWorld (JSON inline)
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
            const href = `https://www.mangaworld.mx/manga/${mangaId}/${mangaSlug}/${slugFolder}`;
            
            if (!seen.has(href)) {
                seen.add(href);
                const numMatch = name.match(/(\d+(?:\.\d+)?)/);
                const number = numMatch ? parseFloat(numMatch[1]) : chapters.length + 1;
                chapters.push({ href, title: name, number });
            }
        }

        if (chapters.length === 0) {
            return JSON.stringify([{ href: url, title: "Errore: nessun capitolo trovato nell'HTML.", number: 1 }]);
        }

        chapters.sort(function(a, b) { return a.number - b.number; });
        return JSON.stringify(chapters);
        
    } catch (e) {
        return JSON.stringify([{ href: url, title: "ECCEZIONE JS: " + e.message, number: 1 }]);
    }
}

// TRAPPOLA PER LA CACHE: Se l'app crede di essere un video player, chiamerà extractEpisodes!
async function extractEpisodes(url) {
    return JSON.stringify([{
        id: "error_cache",
        title: "❌ ERRORE: CACHE DELL'APP. Rimuovi modulo e usa il nuovo link mangita.json!",
        number: 1
    }]);
}

async function extractStreamUrl(url) {
    return "error";
}
// FINE TRAPPOLA

async function extractText(url) {
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
                    return pages.map(function(p) { return "<img src='" + base + p + "' style='max-width:100%;height:auto;display:block;margin:0 auto;'/>"; }).join('<br/>');
                } catch (_) {}
            }
        }

        // Fallback
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
                        return pages.map(function(p) { return "<img src='" + base + p + "' style='max-width:100%;height:auto;display:block;margin:0 auto;'/>"; }).join('<br/>');
                    } catch (_) {}
                }
            }
        }
        return 'Errore estrazione contenuto.';
    } catch (e) {
        return 'Errore estrazione contenuto.';
    }
}

async function soraFetch(url, options = { headers: {}, method: 'GET', body: null }) {
    try {
        const response = await fetchv2(url, options.headers ?? {}, options.method ?? 'GET', options.body ?? null);
        if (response && response.status !== undefined) return response;
        throw new Error('fetchv2 returned error format');
    } catch (e) {
        try {
            return await fetch(url, options);
        } catch (error) {
            return null;
        }
    }
}
