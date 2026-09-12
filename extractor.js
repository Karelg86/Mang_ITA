// MangaWorld IT — modulo manga per Sora/Luna/Shirox
// Funzioni: searchResults, extractDetails, extractChapters, extractText
// Pattern verificati sul sito mangaworld.mx in data 2026-09-12

const _mwPageCache = new Map();

async function _fetchPage(url) {
    if (_mwPageCache.has(url)) return _mwPageCache.get(url);
    const res = await soraFetch(url);
    if (!res) return '';
    const text = await res.text();
    _mwPageCache.set(url, text);
    return text;
}

async function searchResults(keyword) {
    try {
        const response = await soraFetch(
            `https://www.mangaworld.mx/archive?keyword=${encodeURIComponent(keyword)}`
        );
        if (!response) return JSON.stringify([]);
        const html = await response.text();
        const results = [];
        // Pattern verificato: href=URL title="Titolo"><img src=URL
        const regex = /href=(https:\/\/www\.mangaworld\.mx\/manga\/[^ \n>]+) title="([^"]+)"[^>]*><img src=([^\n >]+)/g;
        const seen = new Set();
        let match;
        while ((match = regex.exec(html)) !== null) {
            const href = match[1].trim();
            if (!seen.has(href)) {
                seen.add(href);
                results.push({
                    title: match[2].trim(),
                    href: href,
                    image: match[3].trim()
                });
            }
        }
        return JSON.stringify(results);
    } catch (e) {
        console.log('searchResults error:', e);
        return JSON.stringify([]);
    }
}

async function extractDetails(url) {
    try {
        const html = await _fetchPage(url);
        let description = '';

        // Tenta dal div descrizione specifico di MangaWorld
        const descIdx = html.indexOf('id=noidungm');
        if (descIdx !== -1) {
            const start = html.indexOf('>', descIdx) + 1;
            const end = html.indexOf('</div>', start);
            if (start > 0 && end > start) {
                description = html.slice(start, end)
                    .replace(/<[^>]+>/g, '')
                    .trim();
            }
        }

        // Fallback: meta description
        if (!description) {
            const metaIdx = html.indexOf('<meta name=description');
            if (metaIdx !== -1) {
                const slice = html.slice(metaIdx, metaIdx + 400);
                const m = slice.match(/content="([^"]+)"/);
                if (m) {
                    description = m[1]
                        .replace(/&quot;/g, '"')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .trim();
                }
            }
        }

        // Fallback: div story/trama
        if (!description) {
            const storyIdx = html.indexOf('class=story');
            if (storyIdx !== -1) {
                const start = html.indexOf('Trama: ', storyIdx);
                if (start !== -1) {
                    const end = html.indexOf('</div>', start);
                    description = html.slice(start + 7, end).replace(/<[^>]+>/g, '').trim();
                }
            }
        }

        // Titolo alternativo (originale giapponese o inglese)
        let aliases = '';
        const aliasMatch = html.match(/data-jtitle="([^"]+)"/);
        if (aliasMatch) aliases = aliasMatch[1];

        // Anno di uscita
        let airdate = '';
        const yearMatch = html.match(/Anno:\s*<\/span>\s*([^<]+)/);
        if (yearMatch) airdate = yearMatch[1].trim();

        return JSON.stringify([{ description, aliases, airdate }]);
    } catch (e) {
        console.log('extractDetails error:', e);
        return JSON.stringify([{ description: '', aliases: '', airdate: '' }]);
    }
}

async function extractChapters(url) {
    try {
        const html = await _fetchPage(url);

        // Sezione capitoli da id=chapterList
        const listStart = html.indexOf('id=chapterList');
        const section = listStart !== -1
            ? html.slice(listStart, html.indexOf('<!--M/-->', listStart) || html.length)
            : html;

        // Pattern: class=chap href=URL><span>Titolo</span>
        const regex = /class=chap href=(https:\/\/www\.mangaworld\.mx\/manga\/[^?> "']+)[^>]*><span[^>]*>([^<]+)<\/span>/g;
        const chapters = [];
        const seen = new Set();
        let match;

        while ((match = regex.exec(section)) !== null) {
            const href = match[1].trim();
            if (!seen.has(href)) {
                seen.add(href);
                chapters.push({ href, title: match[2].trim() });
            }
        }

        // Ordine crescente (dal primo all'ultimo)
        chapters.reverse();
        return JSON.stringify(chapters.map((ch, i) => ({ ...ch, number: i + 1 })));
    } catch (e) {
        console.log('extractChapters error:', e);
        return JSON.stringify([]);
    }
}

async function extractText(url) {
    try {
        const response = await soraFetch(url);
        if (!response) return 'Errore: impossibile caricare il capitolo.';
        const html = await response.text();

        // Le pagine sono in un JSON array "pages" con base URL dal CDN
        const imgIdx = html.indexOf('cdn.mangaworld.mx/chapters/');
        if (imgIdx !== -1) {
            // Trova il tag <img con src CDN più vicino
            const imgSlice = html.slice(Math.max(0, html.lastIndexOf('<img', imgIdx)), imgIdx + 300);
            const srcMatch = imgSlice.match(/src=(?:'|")?(\bhttps:\/\/cdn\.mangaworld\.mx\/chapters\/[^"' >]+)/);
            if (srcMatch) {
                const baseUrl = srcMatch[1].slice(0, srcMatch[1].lastIndexOf('/') + 1);
                const pIdx = html.indexOf('"pages":');
                if (pIdx !== -1) {
                    const pSlice = html.slice(pIdx + 8, html.indexOf(']', pIdx) + 1);
                    try {
                        const pages = JSON.parse(pSlice);
                        return pages
                            .map(p => `<img src='${baseUrl}${p}' style='max-width:100%;height:auto;display:block;margin:10px auto;'/>`)
                            .join('');
                    } catch (_) {}
                }
            }
        }

        // Fallback: cerca tutte le img CDN nella pagina
        const imgs = [];
        const imgRegex = /src=['"]?(https:\/\/cdn\.mangaworld\.mx\/chapters\/[^"' >]+)/g;
        let m;
        while ((m = imgRegex.exec(html)) !== null) {
            imgs.push(m[1]);
        }
        if (imgs.length > 0) {
            return imgs
                .map(src => `<img src='${src}' style='max-width:100%;height:auto;display:block;margin:10px auto;'/>`)
                .join('');
        }

        return 'Nessuna pagina trovata per questo capitolo.';
    } catch (e) {
        console.log('extractText error:', e);
        return 'Errore estrazione pagine capitolo.';
    }
}

async function soraFetch(url, options = { headers: {}, method: 'GET', body: null }) {
    try {
        const response = await fetchv2(
            url,
            options.headers ?? {},
            options.method ?? 'GET',
            options.body ?? null
        );
        // fetchv2 risolve sempre (mai reject). Se status è undefined → errore → fallback.
        if (response && response.status !== undefined) {
            return response;
        }
        throw new Error('fetchv2 error response');
    } catch (e) {
        try {
            return await fetch(url, options);
        } catch (err) {
            return null;
        }
    }
}
