const fs = require('fs');
fetch('https://www.mangaworld.mx/manga/3894/ichi-the-witch')
    .then(r => r.text())
    .then(html => {
        const start = html.indexOf('"chapters":[');
        const end = html.indexOf('],"singleChapters":');
        let str = html.substring(start + 11, end + 1);
        console.log("String length:", str.length);
        console.log("Last 20 chars:", str.substring(str.length - 20));
        // Try parsing by stripping trailing characters one by one
        while (str.length > 0) {
            try {
                JSON.parse(str);
                console.log("SUCCESS with length", str.length);
                break;
            } catch(e) {
                str = str.substring(0, str.length - 1);
            }
        }
    });
