const fs = require('fs');
fetch('https://www.mangaworld.mx/manga/3894/ichi-the-witch')
    .then(r => r.text())
    .then(html => {
        const start = html.indexOf('"chapters":[');
        const end = html.indexOf('],"singleChapters":');
        if (start !== -1 && end !== -1) {
            // Trim the '"chapters":[' at start
            let chaptersArrayStr = html.substring(start + 12, end);
            
            // The string is now something like: {"_id":"..."},{"_id":"..."}
            // We can actually just JSON parse it!
            chaptersArrayStr = chaptersArrayStr + ']';
            try {
                const chaptersArray = JSON.parse(chaptersArrayStr);
                console.log("Parsed array of length: " + chaptersArray.length);
                console.log(chaptersArray[0].name, chaptersArray[0]._id);
                console.log(chaptersArray[chaptersArray.length - 1].name, chaptersArray[chaptersArray.length - 1]._id);
            } catch (e) {
                console.error("JSON parse failed!", e);
            }
        }
    });
