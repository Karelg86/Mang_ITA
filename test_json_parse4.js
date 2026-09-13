const fs = require('fs');
fetch('https://www.mangaworld.mx/manga/3894/ichi-the-witch')
    .then(r => r.text())
    .then(html => {
        const start = html.indexOf('"chapters":[');
        const end = html.indexOf('],"singleChapters":');
        if (start !== -1 && end !== -1) {
            // Trim the '"chapters":' at start, so it includes the '['!
            let chaptersArrayStr = html.substring(start + 11, end + 1);
            try {
                const chaptersArray = JSON.parse(chaptersArrayStr);
                console.log("Parsed array of length: " + chaptersArray.length);
                console.log(chaptersArray[0].name, chaptersArray[0]._id);
                console.log(chaptersArray[chaptersArray.length - 1].name, chaptersArray[chaptersArray.length - 1]._id);
            } catch (e) {
                console.error("JSON parse failed!", e);
                console.log(chaptersArrayStr.substring(0, 100));
                console.log(chaptersArrayStr.substring(chaptersArrayStr.length - 100));
            }
        }
    });
