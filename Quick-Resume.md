# 🔄 Quick-Resume: Modulo MangaWorld IT per Shirox

Manuale di riferimento creato il 2026-09-12, aggiornato il 2026-10-13.

## 📦 Repository

- **Repository GitHub:** `https://github.com/Karelg86/Mang_ITA` (branch `master`)
- **URL modulo per Shirox (l'unico corretto):** `https://raw.githubusercontent.com/Karelg86/Mang_ITA/master/mangita_manga.json`
- **Cartella locale:** `C:\Users\kelgazzar\Desktop\Nuova cartella (4)\Mang_ITA\` (clone git)

## 📄 File nel repository

| File | Descrizione |
|------|-------------|
| `mangita_manga.json` | **Manifest in uso** (`type: mangas`, Luna-style) → punta a `manga_extractor.js` |
| `manga_extractor.js` | Script: ricerca, dettagli, capitoli, immagini |
| `main.json`, `mangita.json` | ⚠️ Obsoleti: `type: novels` e `scriptUrl` verso `extractor.js` che non esiste (404). Non usarli |
| `Quick-Resume.md` | Questo file |

---

## ⚙️ Architettura tecnica MangaWorld

### Funzioni dell'extractor (contratto Luna, oggetti JS restituiti direttamente)

1. **`searchResults(keyword)`** → `[{ id, title, imageURL }]`
   - GET `/archive?keyword=...`, regex su `href=URL title=TITOLO><img src=IMG`
   - ⚠️ L'HTML è minificato: i titoli di **una parola sono senza virgolette** (`title=Berserk`), quelli di più parole sono quotati (`title="One Piece"`). La regex accetta entrambi
   - Si analizza solo la parte prima della sidebar (`cate-title`): la sidebar "Ultime aggiunte" ha lo stesso markup
   - Nessun filtro per keyword: si restituisce quello che restituisce il sito (trova anche per titoli alternativi)
2. **`extractDetails(url)`** — descrizione dal `<meta name=description>`
3. **`extractChapters(url)`** — capitoli dal JSON `$MC=(window.$MC||[]).concat(...)` nella pagina manga; id capitolo = JSON `{m, s, c}`. Ritorna `{ "Italiano": [[num, [capitolo]]] }`
4. **`extractImages(chapterId)`** — apre `/manga/{m}/{s}/read/{c}/1`, prende la base URL dalla prima immagine e i nomi file da `"pages":[...]`

### Come Shirox esegue il modulo
- `soraFetch` è definito nel modulo e chiama `fetchv2` di Shirox, che restituisce una risposta con `.text()` (non una stringa)
- Shirox ordina i capitoli in modo crescente da solo

---

## 🔁 Procedura di aggiornamento del modulo

1. Modificare `manga_extractor.js`
2. **Aumentare `"version"` in `mangita_manga.json`** (es. `1.0.1` → `1.0.2`). Senza questo Shirox NON vede l'aggiornamento
3. Commit + push su `master`
4. **Aspettare ~10 minuti** (GitHub raw ha cache `max-age=300`, anche iOS la rispetta)
5. In Shirox: chiudere l'app dal multitasking e riaprirla → aggiornamento automatico all'avvio
6. Se non si aggiorna: ricaricare il modulo a mano (metodo sicuro)

## 📝 Cambio dominio

Quando il dominio di MangaWorld cambia (es. da `.mx` a `.new`):
1. `mangita_manga.json` — `baseURL`, `searchBaseURL`, `iconURL` + **aumentare `version`**
2. `manga_extractor.js` — `BASE_URL` e le stringhe con il vecchio dominio (regex di `extractChapters`, URL in `extractImages`)
3. Seguire la procedura di aggiornamento sopra

---

## 📜 Storico

- **1.0.1 (2026-10-13)** — Fix ricerca: titoli di una parola (Berserk, Naruto, Overgeared) non venivano trovati; rimosso filtro keyword e fallback che mostrava le "Ultime aggiunte"; decodifica entità HTML nei titoli

**Dominio corrente configurato nei file:** `www.mangaworld.mx`
*(Mantenere quest'ultima riga aggiornata a ogni sostituzione)*
