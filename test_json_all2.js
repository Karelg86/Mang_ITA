const fs = require('fs');
fetch('https://www.mangaworld.mx/manga/1716/one-piece')
    .then(r => r.text())
    .then(html => {
        let jsonStr = null;
        
        // Try Marko 5 format ($MC)
        const startMC = html.indexOf('$MC=(window.$MC||[]).concat(');
        if (startMC !== -1) {
            const endMC = html.lastIndexOf('})</script>');
            if (endMC !== -1) {
                jsonStr = html.substring(startMC + '$MC=(window.$MC||[]).concat('.length, endMC + 1);
            }
        }
        
        // Try Marko 4 format ($_mod)
        if (!jsonStr) {
            const startMod = html.indexOf('$_mod.ready(');
            if (startMod !== -1) {
                const prefix = '$_mod.ready("';
                // We need to find where the JSON actually starts.
                // It looks like: $_mod.ready("someId", {"chapters":...});
                const firstComma = html.indexOf(',', startMod);
                const endMod = html.lastIndexOf(');</script>');
                if (firstComma !== -1 && endMod !== -1) {
                    jsonStr = html.substring(firstComma + 1, endMod).trim();
                }
            }
        }

        if (jsonStr) {
            try {
                const data = JSON.parse(jsonStr);
                
                const chapters = [];
                const seen = new Set();
                function findChapters(obj) {
                    if (Array.isArray(obj)) {
                        obj.forEach(findChapters);
                    } else if (obj !== null && typeof obj === 'object') {
                        if (obj._id && obj.name && Array.isArray(obj.pages)) {
                            if (!seen.has(obj._id)) {
                                seen.add(obj._id);
                                if (!obj.name.toLowerCase().includes('volume')) {
                                    chapters.push({ id: obj._id, name: obj.name });
                                }
                            }
                        }
                        Object.values(obj).forEach(findChapters);
                    }
                }
                findChapters(data);
                console.log("Found " + chapters.length + " chapters.");
                if (chapters.length > 0) {
                    console.log(chapters[0]);
                    console.log(chapters[chapters.length - 1]);
                }
            } catch (e) {
                console.log("JSON parse failed: ", e.message);
                console.log(jsonStr.substring(jsonStr.length - 100));
            }
        } else {
            console.log("Could not find any JSON blob.");
        }
    });
