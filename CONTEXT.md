# Field Service Log — Project Context for Claude Code

## What this is
A single-file PWA (Progressive Web App) for field technicians to log incidents during
technical service visits. Built as a standalone HTML file, deployed via GitHub Pages.

**Live URL:** https://txals13.github.io/field-service-log/
**Repository:** https://github.com/txals13/field-service-log
**Main file:** index.html (single file, everything inline)

---

## Google Cloud credentials (hardcoded in app)
- CLIENT_ID: `514772123815-ncjsebgvc01t8arftqp8bo43jr4fgneb.apps.googleusercontent.com`
- PICKER_KEY: `AIzaSyBQwgZQYFJMwlA3ipZrqYjfZYUI9c813O4`
- PICKER_APP: `514772123815`
- Project ID: `field-service-log-500615`
- OAuth scope: `https://www.googleapis.com/auth/drive.file` (minimum required)
- Auth method: Google Identity Services implicit token flow (no redirect URI needed)
- Status: **Testing mode** — new users must be added manually to Google Cloud Console
  → APIs & Services → OAuth consent screen → Test users
- The same PICKER_KEY also calls **Cloud Translation API v2** (`TR_KEY`) to
  translate reports. For that, in project field-service-log-500615: enable
  "Cloud Translation API", link a billing account (first 500 000 characters a
  month are free), and on the key (APIs & Services → Credentials) add Cloud
  Translation API to its API restrictions. Until then every export shows a
  "couldn't translate" prompt and can still go out with the original texts.

---

## Languages
- **The app is Catalan only.** No UI language switch — every UI string is written
  in Catalan in the code (`<html lang="ca">`, TM/SM labels included).
- **Reports go out in ca / es / en**, chosen in the ↓ Informe menu (top row,
  CA · ES · EN) and remembered per session as `session.reportLang` (default ca).
  Changing it does NOT bump `updatedAt` — it's a preference, and bumping would
  make the delete dialog call the last project ZIP stale.
- Fixed report labels live in `RPT[lang]` (HTML, PDF, DOCX, XLSX, parts table,
  file-name prefixes `informe_/recanvis_`, `informe_/recambios_`,
  `report_/spare_parts_`). File names end in `_<lang>`.
- **The technician's own words are machine-translated**: entry descriptions and
  the session's general notes, via Google Cloud Translation (source auto-detected,
  so text written in Spanish also comes out right). The manual's data — part
  names, references — is never translated; neither are client/machine/location
  names, tags or file names.
- **Anything in double quotes is never translated.** "Insereix un recanvi des
  del dibuix" wraps what it writes in `"…"`, so a name and reference out of the
  manual reach the report exactly as the manual has them ("Separador" must not
  come back as "Separator"); typing quotes by hand protects anything else the
  same way. Mechanics: the text travels to Google as **HTML** with the quoted
  runs in `<span translate="no">` and newlines as `<br>`, and comes back through
  `txFromHtml` (a div's textContent drops the tags and decodes the entities).
  Verified against the live API: protected runs return character for character,
  accents and Ø included, with the surrounding spaces intact.
- What decides whether a text is sent is what is left OUTSIDE the quotes
  (`needsTranslation`), so an entry that is only an inserted part is never sent.
- Only text with at least one real word (3+ letters) is sent to the translator
  (`worthTranslating`). A lone letter or a code gives it no context and it
  guesses: a test entry "M" came back as "METRO" in Spanish. Such texts stay
  as written, and a translation already cached for one is ignored.
- Translations are cached on the session: `entry.tr[lang]` and
  `session.notesTr[lang]` = `{h: hash of the source text, t: translation}`. A
  re-export costs nothing and works offline; editing a text makes its hash stop
  matching, so only that text is sent again. Also written without touching
  `updatedAt`. The ORIGINAL texts are what's shown in the app and what
  session.json (and the project ZIP) carry.
- Every export funnels through `reportSession(s)` → `localizeSession(s, lang)`,
  which returns a translated COPY for the builders; if the API fails the user is
  asked whether to export with the texts as written.
- The timesheet keeps its own language selector (it's frozen with the
  signatures); it only defaults to the session's report language.
- PDF severity column is sized to the longest severity label of the chosen
  language — a fixed 17mm split "PROBLEMA" into "PROBLE"/"MA" (and "WARNING"
  never fitted either). DOCX severity column widened to 1400 DXA for the same
  reason.

---

## Architecture
- **Single HTML file** — all CSS, JS, and assets inline. No build step, no npm.
- **PWA** — installable on mobile and desktop, works offline via `sw.js`
  (network-first with a 3s timeout, cache fallback; Google auth/Drive requests
  are never intercepted). Until 2026-08-19 this line was **false**: the worker
  was registered from a `blob:` URL, which browsers reject outright, and the
  `.catch()` swallowed the error — there was no worker and no offline support.
- **Storage:** IndexedDB for sessions data + Google Drive for sync
  - Sessions (carrying base64 photos + voice notes) live in **IndexedDB**
    (`fsl` db → `kv` store → key `sessions`), whose quota is hundreds of MB–GB
    vs localStorage's ~5 MB, so the store no longer fills up in normal field
    use. The in-memory `sessions` array stays the sync source of truth for
    rendering; only load (startup) and save are async (`loadSessions()` /
    `saveLocal()` are Promise-based; callers fire-and-forget).
  - **Migration:** on first load with the new code, any existing
    `localStorage['fsl_v6_data']` is copied into IndexedDB and then removed,
    freeing the old ~5 MB. One-time and automatic.
  - **Fallback:** if IndexedDB is unavailable (some private modes), it falls
    back to localStorage via `saveLocalLS()`, keeping the Phase-1 quota
    warning bar (`#storeBar`) + **Download backup** button + `STORE_SOFT_LIMIT`
    heads-up. IndexedDB quota exhaustion also triggers the same warning.
- **localStorage keys (small metadata only now):**
  - `fsl_v6_tok`  — OAuth token + driveFileId + rootFolderId
  - `fsl_v6_thm`  — theme preference (dark/light)
  - `fsl_v6_root` — cached Drive root folder ID
  - `fsl_v6_data` — legacy sessions array; migrated to IndexedDB then removed

---

## Google Drive folder structure
```
Field Service Log/
  ├── field_service_log_data.json     ← main sync file
  └── Outputs/
       └── {Client}_{Machine}_{Tech}/
            ├── photos/
            └── videos/
```
- Root folder created automatically on first login
- Session subfolders created automatically on first media upload
- Backup JSON saved here when a session is deleted

---

## Session types
| Type | Abbr | Color |
|------|------|-------|
| Commissioning | COM | Blue |
| Maintenance | MNT | Green |
| Upgrade/Retrofit | RET | Amber |

## Entry severity levels
| Level | Symbol | Color |
|-------|--------|-------|
| Info | ○ | Gray |
| OK | ● | Green |
| Warning | ▲ | Orange |
| Issue | ■ | Red |

---

## Key features implemented
- Log entries with timestamp, severity, tag, description
- **Photo without description** — can add entry with only a photo attached
  (placeholder text "[Photo/video — add description]" used, edit later)
- EXIF timestamp extraction from JPEG photos
- MP4/MOV creation date extraction from video atom headers
- Video thumbnail generation via canvas (frame at ~0.5s)
- **Videos uploaded directly to Drive as Blob** — never loaded as base64
  (prevents "Aw, Snap!" memory crash on mobile)
- Photos: a **downscaled** copy (max 1600px, JPEG 0.85, via `makeLocalImageData`)
  is stored locally as base64 for display/reports/offline; the **full-res
  original** is uploaded to Drive (via the original File in `fileCache`). Big
  mobile memory/storage win. Already-small images keep their original bytes;
  any failure falls back to the full data URL. Note: the base64-recovery path
  in `syncSessionToDrive` can only re-upload the downscaled copy if the
  original upload failed and the original File is no longer in memory.
- **Voice notes** — record audio via MediaRecorder (🎙 button); stored as base64
  in the entry (offline-safe, like photos, NOT like video) + uploaded to Drive
  `audio/` subfolder in background. Rendered as an "audio chip" (play, duration,
  delete) in pending / edit / log views; listed in HTML/DOCX reports.
  - NOTE: on-device transcription (Whisper via transformers.js) was implemented
    and then **removed** — `whisper-tiny` on mobile gave poor results. Recording
    is kept; transcription is intentionally gone. Don't re-add it without a
    better model/approach.
- Edit entries (description, severity, tag, add/remove/rename attachments)
- **The entry's date and time can be edited** (`datetime-local` field at the top
  of the edit modal, `step=60`), mainly to round hours before the client signs.
  Rounding is **manual only** — the `:05` / `:15` / `:00` buttons round the field
  to the nearest 5 min / quarter / hour when tapped; nothing ever rounds by
  itself. `entry.ts` stays a UTC ISO string, the field speaks local wall-clock
  (`tsToInput` / `inputToTs`). The new time is applied only if the field differs
  from the value loaded, so editing just the text keeps the original timestamp
  to the second; a manual change zeroes the seconds (the field has no seconds)
  and clears `tsFromPhoto`, since the time is no longer the photo's — the 📷
  marker disappears from the log. Entries are **not** re-sorted afterwards: they
  keep the order they were logged in.
- Delete entries
- Close session / **Reopen session** (↺ button)
- Delete session: **no backup is written**. It used to drop a JSON in Downloads
  and another at the Drive root every time, and neither carried the photos or
  videos. Instead the dialog checks whether a **Project ZIP** exists **for the session
  as it stands**: exporting one stamps `session.zipAt`, and the dialog compares
  it with `updatedAt`. Up to date → a green note and a plain Delete; otherwise a
  warning, an **Export ZIP first** button (runs the export right there and
  re-checks) and Delete anyway. The
  session's Drive folder is moved to the **Drive trash** (it used to be left
  behind for good), keeping the media recoverable there. Looked up with
  `driveFind`, not `getSessionFolder`, which is find-or-create and would make an
  empty folder just to bin it.
- Import JSON **or a session ZIP** (↑ Import button in topbar and on empty screen).
  A ZIP restores the media too: photos and voice notes ride along inside
  session.json as base64, but a video is only ever a thumbnail + a Drive id, and
  an id from another account is useless — so every file under photos/, videos/
  and audio/ is re-uploaded to this account's Drive (matched to its entry by file
  name) and the entries are re-pointed at the new copies. Signed out, the session
  still imports and the stale ids are cleared, with a message saying the videos
  need a re-import once signed in.
- Spare parts render as **columns, not prose**: quantity first (right-aligned,
  the number you act on), then reference, then name — one CSS grid per entry so
  every row lines up. On screen that's it; reports add a header row (QTY / REF. /
  SPARE PART) since they're read by someone outside the app. The balloon position
  and the conjunt › grup context are deliberately not shown — the position means
  nothing away from its drawing and the context repeats the tag. PDF and DOCX
  can't nest a table inside a cell, so they keep the same column ORDER as lines.
- Picking from a drawing has two purposes, same tap, different result
  (`viewerPickPurpose`): **"Pick from drawing"** attaches a structured spare part
  (quantity panel, lands in `entry.parts[]`), while **"Insert part name from
  drawing"** under Description writes `"<denomination> - <reference>"` straight
  into the text. The edit modal is hidden while the viewer is up, so the caret is
  remembered in `textPickCaret` rather than read live; spacing is added only
  where needed (never before `.,;:`) and the box is re-measured on return.
- **Timesheet (`full d'hores`) for the client to sign** — the hours are NOT
  retyped here: they come from the *other* app, **Calendari laboral**
  (`https://txals13.github.io/Calendari-laboral/`), where every day is already
  clocked. The 🧾 chip in the session header (and `↓ Report ▾ → Timesheet`)
  opens a picker of the days clocked between the first and last log entry;
  tick the ones the client signs for.
  - **How it reads the other app's file:** `drive.file` authorises per
    (user, file, OAuth client), and both apps ship the **same CLIENT_ID**, so
    `driveFind(token,"calendari_laboral_data.json",null,"application/json")`
    finds and reads it with no extra scope. A copy is cached in
    `localStorage['fsl_v6_cal']` for offline, and `↑ Import JSON` takes a file
    exported from that app (⚙️ Exporta còpia) if Drive is unavailable.
  - **Day maths ported verbatim** (`tsLegs`) so the two apps never disagree:
    `vi→i` outbound leg, `i→f` on site less the break `p`, `f→vf` back. A day
    clocked only `vi→vf` is one door-to-door journey — all travel, no work.
    Days marked VAC / LD / DC / POS are skipped: nobody signs for a day nobody
    worked.
  - **The chosen days are frozen into `session.timesheet`** (`rows`, `lang`,
    `remarks`, names, signatures, `from`/`to`). Once the client has signed, the
    sheet must not change under them because a day was later edited in the
    calendar — and it means the PDF rebuilds offline.
  - **Signatures are captured on the device** (pointer events on a canvas,
    technician + client). `pad.data()` crops to the ink bounding box: a
    signature stretched to a fixed box reads as a different hand, and the white
    margin was most of the PNG's weight (274 KB → 114 KB per PDF). The PDF
    places it at its own aspect ratio, sitting on the line; unsigned, the same
    empty line prints for signing on paper.
  - **Three languages**, chosen per session: EN / ES / CA (`TSL`).
  - **The columns are chosen per sheet** — chips over the day table toggle any
    of the eleven (`TSCOLS`); Date is locked, since a signed row has to say
    which day it is. Every toggle writes the set to
    `localStorage['fsl_v6_tscols']`, so it becomes the default for the next
    sheet, and **Reset** brings all eleven back. A sheet that has been saved
    keeps the columns it was signed with in `session.timesheet.cols`, even
    after the default changes. The PDF builds its head, widths and totals row
    from that set: drop Destination and the remaining widths scale up to fill
    the page; drop every figure column and the TOTAL label spans the table
    with the day count. Note **Total h stays the day's total (travel + work)**
    whatever is on screen — a total that silently changed meaning with the
    visible columns is the last thing a signed sheet needs. For a
    presence-only sheet, untick Total h and leave Work h as the figure.
  - **The menu entry opens the composer, it does not export.** Alone among
    the formats this one is composed rather than rendered, so `↓ Report ▾ →
    Timesheet…` opens the modal with everything prefilled and `Save & PDF`
    one tap away. It used to export straight off once a sheet existed,
    which handed over the frozen sheet without showing what was in it and
    left no way to redo one from the menu at all.
  - Exports as `timesheet_<base>.pdf`, uploaded to the session's Drive folder
    under that fixed name like the other reports, and **built into the Drive
    ZIP** alongside them.
  - Note: the signature pads are sized **synchronously** right after the modal
    is shown — reading `getBoundingClientRect()` flushes layout. The reflex
    `requestAnimationFrame` never fires in a backgrounded tab and left the pads
    at the default 300×150 and unusable.
- **Two ZIP packs, two jobs** (`exportSessionZip(s, kind)`):
  - **🗄 Project ZIP (archive)** — `<client>_<machine>_project.zip`. Every report
    (html/pdf/docx/xlsx/timesheet), the media, and **`session.json`**, which is
    what makes it importable again — this is the one you close a job with, and
    the one the delete dialog means by "a complete copy exists". Only this kind
    stamps `session.zipAt`.
  - **📦 DOCX + media ZIP** — `<client>_<machine>_docx_media.zip`. The Word
    report and every photo/video/voice note, nothing else. No `session.json`,
    so importing it is refused with "this ZIP has no session.json" — deliberate,
    so a hand-over pack can never be mistaken for an archive. It leaves `zipAt`
    untouched for the same reason.
  - Both take the media from Drive but **build** the reports fresh, and both skip
    loose files at the root of the Drive folder (old report copies, a stale
    `session.json`).
- Export: HTML (video playable), PDF (jsPDF + autoTable), DOCX (via docx lib CDN),
  XLSX (spare parts, via SheetJS)
- Reports in Catalan, Spanish or English (see Languages), filenames shown under each photo/video
- Dark/light theme toggle (☀/☽)
- Sync indicator (● Drive green / ● Local red)
- Auto-sync every 30s (skipped if user has unsaved input)
- Rename Drive files when attachment name is changed in edit modal

---

## Export / Report details
- **HTML:** videos embedded with `<video controls>`, photo+video filenames shown
- **PDF:** real file via `jspdf@2.5.1` + `jspdf-autotable@3.8.2` (unpkg, fallback
  jsdelivr). Printing was dropped: it can't hand the bytes back to JS, so no PDF
  ever reached Drive (an HTML copy was uploaded instead) and it was awkward on a
  phone. Entries go in an autoTable (spare parts appended inside the description
  cell); photos follow in a 3-up appendix so table rows keep a sane height.
- **One report per format per session on Drive:** report copies are uploaded
  under a fixed name (`report_<base>.pdf|html|docx`, `recanvis_<base>.xlsx`) and
  overwrite the previous one. They used to carry a timestamp, so every export
  added another file — a session had piled up 9 xlsx and 4 html, all of which
  ended up in the Drive ZIP.
- **DOCX:** via `docx@8.5.0` library loaded from unpkg.com (fallback: jsdelivr.net)
  - Images embedded as Uint8Array (not base64 string)
  - Video thumbnails embedded + filename shown in italic monospace
  - Service Worker explicitly passes unpkg.com and jsdelivr.net through (not cached)

---

## Critical technical lessons learned

### Drive API query strings
**ALWAYS use JSON.stringify() for values** — never string concatenation with quotes:
```js
// CORRECT
var q = "name=" + JSON.stringify(name) + " and trashed=false and mimeType=" + JSON.stringify(mime);
if(parentId) q += " and " + JSON.stringify(parentId) + " in parents";

// WRONG — causes "Unexpected identifier 'and'" syntax error
var q = "name='" + name + "' and trashed=false";
```

### autoTable: footStyles beats columnStyles
`columnStyles[i].halign` styles the BODY cells; head and foot rows take
`headStyles` / `footStyles`, which win. `footStyles` has no alignment of its
own, so a totals row falls back to **left** underneath a right-aligned column
of figures — which reads as a broken table, and is what happened to the
timesheet's TOTAL row. Put the alignment on the foot cell itself:
```js
// WRONG — the column's halign never reaches the foot
columnStyles:{7:{halign:"right"}}, footStyles:{fontStyle:"bold"}
// CORRECT — every foot cell carries its own
foot:[[{content:"173.25",styles:{halign:"right"}}]]
```
Verified by reading the placement back out of the PDF: the figure was drawn at
x=392.5 in a cell spanning 387.4–471.5 (left) instead of x=443.7 (right).

### Video memory management
Never load video files as base64 / data URLs — this causes mobile browser crashes.
Pattern used:
1. Generate thumbnail via canvas (small JPEG, ~20-60KB)
2. Upload original file directly to Drive via multipart upload (streaming, no base64)
3. Store only: `{driveId, name, poster (thumbnail), type: "video"}`
4. Play back via Drive streaming URL: `?alt=media&access_token=TOKEN`

### Service Worker CDN whitelist
The SW must NOT intercept requests to external CDNs:
```js
var sw = "self.addEventListener('fetch', function(e){" +
  "if(/googleapis|accounts\\.google\\.com|unpkg\\.com|jsdelivr\\.net|cdnjs/.test(e.request.url)) return;" +
  "e.respondWith(fetch(e.request).catch(function(){return caches.match(e.request)}));" +
"});";
```

### Auth + file:// restriction
Google OAuth does NOT work from `file://` URLs.
App must ALWAYS be opened from `https://txals13.github.io/field-service-log/`

### Auto-sync wipes unsaved input
Background sync calls `renderAll()` which rebuilds the DOM.
Always check for unsaved input before syncing:
```js
function hasUnsaved() {
  var e = document.getElementById("entIn");
  if (e && e.value.trim()) return true;
  if (pImgs.length) return true;      // pending photos
  if (editingId) return true;         // edit modal open
  return false;
}
setInterval(function() {
  if (isLoggedIn && !isDirty && !hasUnsaved()) loadFromDrive().then(renderAll);
}, 30000);
```

### addEntry timeout for EXIF + upload
Photo EXIF reading and video uploads are async. Use a safe timeout:
```js
var waited = 0;
function tryAdd() {
  if (pExif > 0 && waited < 3000) {
    waited += 150; setTimeout(tryAdd, 150); return;
  }
  // proceed with captured values (not live DOM values — DOM may be rebuilt)
  var capturedText = text; // captured BEFORE the wait loop
  // ...
}
```

### Mobile Safari PWA install
Must use Safari (not Chrome) on iOS. Chrome on iOS cannot install PWAs.

---

## Deployment procedure
1. Edit `index.html`
2. In VS Code: Source Control → write commit message → ✓ Commit → **Sync Changes**
3. Wait 1-2 min → GitHub Pages rebuilds
4. Open https://txals13.github.io/field-service-log/ → Ctrl+Shift+R to force reload
5. On mobile PWA: close app completely and reopen (service worker update)

---

## Test data
`fsl_demo_data.json` — 10 sessions, 100 entries, 66 synthetic photos
Sectors: automotive, pharma, steel, food, logistics, wind energy, chemical,
textile, printing, EV batteries
Import via ↑ Import button in the app.

---

## Google Cloud Console access
https://console.cloud.google.com/
Project: field-service-log-500615
To add test users: APIs & Services → OAuth consent screen → Test users → Add users

---

## Things NOT yet implemented (potential future features)
- Sharing sessions between multiple users (each user has their own Drive)
- Publishing the OAuth app (currently in Testing mode, max 100 test users)
- Native iOS/Android app (currently PWA only)
- Session filtering/search in sidebar
- Batch export of multiple sessions
- QR code for quick access URL sharing
