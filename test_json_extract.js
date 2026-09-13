const fs = require('fs');
fetch('https://www.mangaworld.mx/manga/3894/ichi-the-witch')
    .then(r => r.text())
    .then(html => {
        const start = html.indexOf('"chapters":[');
        const end = html.indexOf('],"singleChapters":');
        if (start !== -1 && end !== -1) {
            const chaptersArrayStr = html.substring(start, end);
            const chapterBlocks = chaptersArrayStr.split('{"_id":');
            const chapters = [];
            for (const block of chapterBlocks) {
                if (!block.trim()) continue;
                const idMatch = block.match(/^"([a-f0-9]{24})"/);
                const nameMatch = block.match(/"name":"([^"]+)"/);
                if (idMatch && nameMatch) {
                    chapters.push({ id: idMatch[1], name: nameMatch[1] });
                }
            }
            console.log("Found " + chapters.length + " chapters.");
            console.log(chapters[0]);
            console.log(chapters[chapters.length - 1]);
        } else {
            console.log("Could not find chapters array!");
        }
    });
