const fs = require('fs');
fetch('https://www.mangaworld.mx/manga/1716/one-piece')
    .then(r => r.text())
    .then(html => {
        let jsonStr = null;
        
        // Try Marko 5
        const match5 = html.match(/\$MC=\(window\.\$MC\|\|\[\]\)\.concat\((.*?)\)<\/script>/);
        if (match5) {
            jsonStr = match5[1];
        } else {
            // Try Marko 4
            // Be careful because there might be multiple script tags or nested parens
            const match4 = html.match(/\$_mod\.ready\([^,]+,\s*(\{.*?\})\s*\);?<\/script>/);
            if (match4) {
                jsonStr = match4[1];
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
            } catch (e) {
                console.log("Parse failed: " + e.message);
                console.log("Extracted string: " + jsonStr.substring(0, 50) + "..." + jsonStr.substring(jsonStr.length - 50));
            }
        } else {
            console.log("No JSON found!");
        }
    });
