const fs = require('fs');
let code = fs.readFileSync('D:/Sora_Sulfur/MangITA_Git/manga_extractor.js', 'utf8');

const mockSoraFetch = 
async function soraFetch(url, options) {
    const res = await fetch(url, options);
    return res;
}
;

code = code.replace(/async function soraFetch[\s\S]*/, mockSoraFetch);
code += 
(async () => {
    try {
        const results = await searchResults('one piece');
        if (results.length === 0) return;
        const chaptersDict = await extractChapters(results[0].id);
        const lang = Object.keys(chaptersDict)[0];
        const chapters = chaptersDict[lang];
        if (!chapters || chapters.length === 0) return;
        const chapId = chapters[chapters.length-1][1][0].id;
        const images = await extractImages(chapId);
        console.log('Images Found:', images.length);
        if (images.length > 0) {
            console.log('First image:', images[0]);
        }
    } catch(e) {
        console.error('FATAL ERROR:', e);
    }
})();
;

fs.writeFileSync('D:/Sora_Sulfur/MangITA_Git/runner_final.js', code);
