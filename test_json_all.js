const fs = require('fs');
fetch('https://www.mangaworld.mx/manga/3894/ichi-the-witch')
    .then(r => r.text())
    .then(html => {
        const start = html.indexOf('$MC=(window.$MC||[]).concat(');
        if (start !== -1) {
            const jsonStart = start + '$MC=(window.$MC||[]).concat('.length;
            const end = html.lastIndexOf('})</script>');
            if (end !== -1) {
                const jsonStr = html.substring(jsonStart, end + 1);
                try {
                    const data = JSON.parse(jsonStr);
                    console.log("Successfully parsed main JSON block!");
                    
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
                }
            } else {
                console.log("Could not find end");
            }
        } else {
            console.log("Could not find start");
        }
    });
