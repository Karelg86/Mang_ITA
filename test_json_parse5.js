const fs = require('fs');
fetch('https://www.mangaworld.mx/manga/3894/ichi-the-witch')
    .then(r => r.text())
    .then(html => {
        const start = html.indexOf('"chapters":[');
        const end = html.indexOf('],"singleChapters":');
        if (start !== -1 && end !== -1) {
            let chaptersArrayStr = html.substring(start + 11, end + 1);
            console.log("Last 50 chars:", chaptersArrayStr.substring(chaptersArrayStr.length - 50));
        }
    });
