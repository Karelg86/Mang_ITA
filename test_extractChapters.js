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
        
        const match5 = html.match(/$MC=\(window\.$MC\|\|\[\]\)\.concat\((.*?)\)<\/script>/);
        if (match5) {
            jsonStr = match5[1];
        } else {
            const match4 = html.match(/$_mod\.ready\([^,]+,\s*(\{.*?\})\s*\);?<\/script>/);
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

        // Se non troviamo capitoli con il JSON, fallback sulla vecchia regex robusta
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

        return chapters;
    } catch (e) {
        console.log('[MangaWorldIT] extractChapters error: ' + e.message);
        return {};
    }
}
