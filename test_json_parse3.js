const fs = require('fs');
fetch('https://www.mangaworld.mx/manga/3894/ichi-the-witch')
    .then(r => r.text())
    .then(html => {
        const start = html.indexOf('"chapters":[');
        const end = html.indexOf('],"singleChapters":');
        if (start !== -1 && end !== -1) {
            let chaptersArrayStr = html.substring(start + 12, end) + ']';
            console.log(chaptersArrayStr.substring(0, 1000));
        }
    });
