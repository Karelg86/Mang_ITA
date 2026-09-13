const fs = require('fs');
fetch('https://www.mangaworld.mx/manga/3894/ichi-the-witch')
    .then(r => r.text())
    .then(html => {
        const start = html.indexOf('"chapters":[');
        const end = html.indexOf('],"singleChapters":');
        if (start !== -1 && end !== -1) {
            let chaptersArrayStr = html.substring(start, end);
            const blocks = chaptersArrayStr.split('{"_id":"');
            const chapters = [];
            for (let i = 1; i < blocks.length; i++) {
                const block = blocks[i];
                const idMatch = block.match(/^([a-f0-9]{24})/);
                const nameMatch = block.match(/"name":"([^"]+)"/);
                if (idMatch && nameMatch) {
                    const name = nameMatch[1];
                    // Skip volumes
                    if (!name.toLowerCase().includes('volume')) {
                        chapters.push({ id: idMatch[1], name: name });
                    }
                }
            }
            console.log("Found chapters: " + chapters.length);
            console.log(chapters[0]);
            console.log(chapters[chapters.length-1]);
        }
    });
