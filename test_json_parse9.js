const fs = require('fs');
fetch('https://www.mangaworld.mx/manga/3894/ichi-the-witch')
    .then(r => r.text())
    .then(html => {
        const end = html.indexOf('],"singleChapters":');
        const start = html.lastIndexOf('"chapters":[', end);
        if (start !== -1 && end !== -1) {
            let chaptersArrayStr = html.substring(start + 11, end + 1);
            console.log("Length:", chaptersArrayStr.length);
            console.log("Last 100:", chaptersArrayStr.substring(chaptersArrayStr.length - 100));
            // Let's find out where it parses up to!
            let validLength = 0;
            while (chaptersArrayStr.length > 0) {
                try {
                    JSON.parse(chaptersArrayStr);
                    validLength = chaptersArrayStr.length;
                    break;
                } catch(e) {
                    chaptersArrayStr = chaptersArrayStr.substring(0, chaptersArrayStr.length - 1);
                }
            }
            console.log("Valid length:", validLength);
            console.log("Chars after valid length:", html.substring(start + 11 + validLength, start + 11 + validLength + 50));
        }
    });
