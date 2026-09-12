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
        
        if (!html || html.length < 100) {
            description = "Errore: la pagina non ha restituito contenuto valido. Forse un blocco di rete.";
        } else if (html.includes("Cloudflare") || html.includes("Just a moment")) {
            description = "ERRORE CLOUDFLARE: Il server ha bloccato la richiesta credendo che l'app sia un bot.";
        } else {
            const metaIdx = html.indexOf('<meta name=description');
            if (metaIdx !== -1) {
                const slice = html.slice(metaIdx, metaIdx + 400);
                const m = slice.match(/content="([^"]+)"/);
                if (m) description = m[1].replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
            }
        }

        return JSON.stringify([{ description, aliases: '', airdate: '' }]);
    } catch (e) {
        return JSON.stringify([{ description: 'Exception: ' + e.message, aliases: '', airdate: '' }]);
    }
}

async function extractChapters(url) {
    try {
        const html = await _fetchPage(url);
        
        // Debugging visivo per l'utente
        if (!html || html.length < 100) {
            return JSON.stringify([{ href: url, title: "ERRORE: HTML vuoto (" + (html ? html.length : 0) + " byte)", number: 1 }]);
        }
        if (html.includes("Cloudflare") || html.includes("Just a moment") || html.includes("cf-browser-verification")) {
            return JSON.stringify([{ href: url, title: "ERRORE: Blocco Anti-Bot Cloudflare", number: 1 }]);
        }

        // Il codice corretto per leggere dal JSON inline di MangaWorld (ripristinato)
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
            // Se non trova i capitoli nel JSON, mostra la lunghezza dell'HTML per capire se la pagina è diversa
            return JSON.stringify([{ href: url, title: "DEBUG: Nessun capitolo trovato. HTML length: " + html.length, number: 1 }]);
        }

        chapters.sort(function(a, b) { return a.number - b.number; });
        return JSON.stringify(chapters);
        
    } catch (e) {
        return JSON.stringify([{ href: url, title: "ECCEZIONE JS: " + e.message, number: 1 }]);
    }
}

async function extractText(url) {
    return 'Questo è un capitolo di test. Se vedi questo, il problema è risolto!';
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
