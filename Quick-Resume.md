# 🔄 Quick-Resume: Modulo MangaWorld IT per Sora/Shirox

Manuale di riferimento creato il 2026-09-12.

## 📦 Repository

- **Repository GitHub:** `https://github.com/Karelg86/Mang_ITA`
- **URL modulo per Shirox/Sora:** `https://raw.githubusercontent.com/Karelg86/Mang_ITA/main/main.json`
- **Cartella locale:** `d:\Sora_Sulfur\MangITA_Git\`

## 📄 File nel repository

| File | Descrizione |
|------|-------------|
| `main.json` | Configurazione del modulo (sourceName, baseUrl, searchBaseUrl, scriptUrl) |
| `extractor.js` | Script di estrazione: ricerca, dettagli, capitoli e pagine immagini |
| `Quick-Resume.md` | Questo file |

---

## ⚙️ Architettura tecnica MangaWorld

### Funzioni dell'extractor

1. **`searchResults(keyword)`** — Cerca su `/archive?keyword=...`, regex su `href=URL title="Titolo"><img src=URL`
2. **`extractDetails(url)`** — Descrizione da `id=noidungm`, fallback meta description e div.story
3. **`extractChapters(url)`** — Lista capitoli da `id=chapterList`, pattern `class=chap href=URL`
4. **`extractText(url)`** — Pagine immagini da `cdn.mangaworld.mx/chapters/` + array JSON `"pages":[...]`

### Tipo modulo
- `"novel": true` — il player usa `extractChapters` + `extractText` (NON `extractStreamUrl`)
- `"streamType": "novels"` — visualizzatore immagini/testo

---

## 📝 Procedura di aggiornamento dominio

Quando il dominio di MangaWorld cambia (es. da `.mx` a `.new`):

1. **`main.json`** — aggiornare `baseUrl`, `searchBaseUrl`, `iconUrl`
2. **`extractor.js`** — sostituire tutte le stringhe con il vecchio dominio (es. `mangaworld.mx` → `mangaworld.new`)
3. **Push:**
   ```bash
   cd d:\Sora_Sulfur\MangITA_Git
   git add .
   git commit -m "Aggiornato dominio a NUOVO_DOMINIO"
   git push
   ```
4. Ricaricare il modulo in Shirox/Sora

---

**Dominio corrente configurato nei file:** `www.mangaworld.mx`
*(Mantenere quest'ultima riga aggiornata a ogni sostituzione)*
