const fs = require('fs');
fetch('https://www.mangaworld.mx/manga/3894/ichi-the-witch')
    .then(r => r.text())
    .then(html => {
        const end = html.indexOf('],"singleChapters":');
        const start = html.lastIndexOf('"chapters":[', end);
        if (start !== -1 && end !== -1) {
            let chaptersArrayStr = html.substring(start + 11, end + 1);
            try {
                const chaptersArray = JSON.parse(chaptersArrayStr);
                console.log("SUCCESS! Found " + chaptersArray.length + " chapters.");
                console.log(chaptersArray[0].name);
                console.log(chaptersArray[chaptersArray.length - 1].name);
            } catch (e) {
                console.error("JSON parse failed!", e.message);
            }
        }
    });
