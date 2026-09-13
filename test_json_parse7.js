const fs = require('fs');
fetch('https://www.mangaworld.mx/manga/3894/ichi-the-witch')
    .then(r => r.text())
    .then(html => {
        const start = html.indexOf('"chapters":[');
        const end = html.indexOf('],"singleChapters":');
        let str = html.substring(start + 11, end + 1);
        console.log("Chars at 4430-4460:");
        console.log(str.substring(4430, 4460));
    });
