const fs = require('fs');
fetch('https://www.mangaworld.mx/manga/3894/ichi-the-witch')
    .then(r => r.text())
    .then(html => {
        // Regex to match a chapter ID, then pages array, then name
        // (?:(?!"_id").)*? ensures we don't cross into another chapter
        const regex = /"_id":"([a-f0-9]{24})","pages":\[[^\]]*\].*?"name":"(Capitolo [^"]+|[0-9]+(?:\.[0-9]+)?)"/g;
        let match;
        const chapters = [];
        const seen = new Set();
        while ((match = regex.exec(html)) !== null) {
            // We matched a chapter!
            const id = match[1];
            const name = match[2];
            if (!seen.has(id)) {
                seen.add(id);
                chapters.push({ id, name });
            }
        }
        console.log("Found " + chapters.length + " chapters.");
        if (chapters.length > 0) {
            console.log(chapters[0]);
            console.log(chapters[chapters.length - 1]);
        }
    });
