const fs = require('fs');
fetch('https://www.mangaworld.mx/manga/1716/one-piece')
    .then(r => r.text())
    .then(html => {
        let jsonStr = null;
        const startMod = html.indexOf('$_mod.ready(');
        if (startMod !== -1) {
            const firstComma = html.indexOf(',', startMod);
            const endMod = html.lastIndexOf(');</script>');
            if (firstComma !== -1 && endMod !== -1) {
                jsonStr = html.substring(firstComma + 1, endMod).trim();
                const data = JSON.parse(jsonStr);
                
                // Print keys of main object
                console.log(Object.keys(data));
                
                let volCount = 0;
                let chCount = 0;
                let chArrayCount = 0;
                
                function countStuff(obj) {
                    if (Array.isArray(obj)) {
                        obj.forEach(countStuff);
                    } else if (obj !== null && typeof obj === 'object') {
                        if (obj.chapters && Array.isArray(obj.chapters)) {
                            chArrayCount++;
                            chCount += obj.chapters.length;
                        }
                        if (obj.volumes && Array.isArray(obj.volumes)) {
                            volCount += obj.volumes.length;
                        }
                        Object.values(obj).forEach(countStuff);
                    }
                }
                countStuff(data);
                console.log("Volumes:", volCount, "Chapter arrays:", chArrayCount, "Total chapters in arrays:", chCount);
            }
        }
    });
