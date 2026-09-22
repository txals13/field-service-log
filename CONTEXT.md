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
- **Text already in the report's language is kept exactly as written.** Google
  answers even when the source IS the target, and it quietly rewrites: a Catalan
  report turned "B migdia 11:15" into "B 23:15" and "Sense data" into "Dades
  sensorials". The reply carries `detectedSourceLanguage`, so when it matches the
  target the answer is thrown away and the original kept — no extra API call. The
  original is what gets cached, so from the second export on nothing is sent at
  all (verified: 0 requests). A different source still translates normally.
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
- **A session's folder is found by the ID it wrote down** (`session.folderId` +
  `folderName`), never by its name alone. The name is built from client +
  machine + technician, so editing any of the three used to make
  `getSessionFolder` (find-or-create **by name**) conjure a NEW, empty folder:
  Desa then filled it with `photos/`, `videos/` and `session.json` while every
  photo already uploaded stayed behind in the old one. `renameSessionFolder`
  was supposed to keep them in step, but it only runs if you happen to be signed
  in at that moment and says nothing when it fails.
  - Renaming the session renames the folder — but only while the folder still
    carries the name this session gave it. Sessions with the same client,
    machine and technician **share** a folder, and one of them must not rename
    it out from under the others.
  - **Saving also puts stray media back.** Every attachment with a `driveId` is
    checked: gone from Drive and we still hold the bytes → re-uploaded; sitting
    in another folder → moved into this session's `photos/`, `videos/` or
    `audio/` (a move, not a re-upload: it's the only way to recover a video,
    whose original file is never kept). **Whatever media is left in the folder
    they came from comes across too** — the loose photos put there by hand are
    session media as much as the attachments, and bringing only the attachments
    is how "4 files here, 5 in Drive" happens. Documents left there are not
    touched: a stray PDF is more likely an old report than session media. The
    summary says how many were moved.
    Costs one metadata request per attachment on each manual save.
  - The old, now-empty folder is left on Drive: emptying it is the technician's
    call, not the app's.

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
- **A problem is closed inside its own entry** (`entry.fix`). A PROBLEMA or an
  AVÍS gets a "✔ Afegeix com ha quedat" button in the edit modal, which opens a
  resolution with its **own severity, its own description and its own media**.
  Nothing is overwritten: the entry keeps the severity and the words the problem
  was first written with, and the pair reads as one story — what happened, and
  how it ended.
  - Shape: `{severity, text, images[], ts, editedAt}`. `ts` is stamped when the
    resolution is first written and kept afterwards.
  - The resolution's attachments are session media like any other: they upload
    to the same Drive folders, ride in the ZIP, and go to the Drive trash when
    the resolution (or the entry) is removed.
  - It shows under its entry in the log, and in every report **inside the same
    row** as the problem, so the table stays one line per entry. HTML and DOCX
    mark it with ✔; the PDF must not — ✔ is outside WinAnsi and would flip the
    line to UTF-16, exactly like the ▶/🎧 emoji.
- **The PDF's entry table is laid out like the HTML report's**: the spare parts
  as a QT./REF./RECANVI table with its own grey header, and the outcome as a
  block with a coloured bar in its severity. autoTable can't nest a table in a
  cell, so both are DRAWN in `didDrawCell` — and the room for them is booked by
  padding the cell's text with blank lines (`LH` = autoTable's own line height,
  font size ÷ scaleFactor × 1.15). That leaves autoTable in charge of row height
  and page breaks instead of fighting it with `minCellHeight`. `rowPageBreak:
  "avoid"` is required: the blocks are painted at absolute positions inside the
  cell, so half a row on the next page would strand them.
  - Photos stay in the appendix at the end, not inline in the table as in HTML —
    inline images would blow the row heights up. Say so if it comes up again.
  - Search and machine translation cover its text too (cached separately in
    `entry.trF[lang]`, same hash rule as `entry.tr`).
  - **An outcome marked INFO is coloured like OK** (`fixTx` / `fixBg`, used by
    the log, the HTML report, the PDF and the Word file). It closes the problem
    just as OK does — `isResolved` counts both — so Info's own pale grey
    (#9ca3af) read as "nothing happened here". Only the label still says INFO.
    An outcome that says AVÍS or PROBLEMA keeps its own colour, which is also
    the one the counter doesn't add up.
  - **Resolved is its own counter**, not a subtraction: a fixed PROBLEMA still
    counts as a problem — it happened — and a "✔ n resolts" figure sits beside
    it, in the status bar and in every report. `isResolved` only counts a
    resolution that ends in OK or Info; one that still says AVÍS or PROBLEMA is
    not a close.
  - Its attachments can be renamed like the entry's own (`rNames(bk)`, one field
    list per bucket) — the name is what you read in the Drive folder later.
  - Attachments can now be composed in three places, so the `isEdit` boolean
    that ran through the media code became a bucket key (`MB.pend` / `MB.edit` /
    `MB.fix`), each with its own array, strip, record button and pending
    counter. A fourth place would cost one more entry in that table.
- **The entry's date and time can be edited** (`datetime-local` field at the top
  of the edit modal, `step=60`), mainly to round hours before the client signs.
  Rounding is **manual only** — the `:05` / `:15` / `:00` buttons round the field
  to the nearest 5 min / quarter / hour when tapped; nothing ever rounds by
  itself. `entry.ts` stays a UTC ISO string, the field speaks local wall-clock
  (`tsToInput` / `inputToTs`). The new time is applied only if the field differs
  from the value loaded, so editing just the text keeps the original timestamp
  to the second; a manual change zeroes the seconds (the field has no seconds)
  and clears `tsFromPhoto`, since the time is no longer the photo's — the 📷
  marker disappears from the log. A hand-set time is flagged `tsManual` and
  **re-sorts the entry** (see below).
- **Entries are kept in time order, oldest first** (`sortEntries`, by `entry.ts`)
  — in the log and in every report, since they all read `session.entries`.
  - **The photo's time rules.** An entry with a photo takes that photo's EXIF
    time, so one shot at 08:03 and written up at 11:00 sits at 08:03. That
    already happened when the entry was created; now it also happens when a
    photo is added to an existing entry, so the entry moves to where the photo
    puts it. Only a hand-set time beats it, and `tsManual` makes that stick —
    without it the photo would take the time back on the next save.
  - Entries with the same time keep the order they were logged in (Array sort is
    stable). One with no usable date sorts last, not to 1970.
  - Sorting happens where entries change (add, edit) and where sessions come in
    (`orderSessions` on boot, on the Drive merge and on import), so sessions
    written before this still read in order.
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
- **Removing an attachment removes it from Drive too** (`queueTrash` /
  `flushTrash`). It used to stay in the session's folder for good, so a photo the
  technician had thrown out came back in the next ZIP. It goes to the **Drive
  trash** (30 days to change your mind, same as deleting a whole session), from
  the edit modal, from deleting an entry, and from the folder screen. The ids
  wait in `session.trashQ` until there is a token, so deleting works offline or
  signed out; the queue is part of the session, so it survives a reload, and it
  drains on boot, on sign-in and on every sync. Only ids this app attached are
  ever touched — never a file put in the folder from Drive.
- **🗂 Carpeta — the session's Drive folder, from inside the app** (`openFolder`).
  Lists everything `isSessionMedia` matches, with what the report shows first and
  the rest under "Sense vincular". Any file can be renamed (the extension is kept
  if you don't type one; renaming an attachment updates the report's copy of the
  name) or sent to the trash.
  - **Tying a loose photo to one in the report renames it after that photo** —
    `IMG_0847.jpg` → `IMG_0847_02.jpg`, `_03`… The Drive folder only shows names,
    so the name IS how you know later which extra belongs to which. The number is
    the first free one, checked against the folder as it stands. The link itself
    lives in `session.driveLinks` = `{<file id>: {to: <attachment's drive id>}}`,
    so the grouping survives further renames — and renaming the parent drags its
    tied files along, or they would be left pointing at a name that is gone.
  - Untying leaves the file name as it is (the button's tooltip says so).
  - **`drive.file` only ever shows the app its own files.** A photo dropped into
    `photos/` from Drive's web interface is INVISIBLE to it: it doesn't come
    back in the folder listing at all, so it can't be shown, renamed, linked or
    packed. This was documented backwards for a while ("photos you drop in from
    Drive travel in the ZIP") — they don't, unless one of these two happens:
    - **＋ Afegeix fotos / vídeos** uploads them from the app straight into
      `photos/`, `videos/` or `audio/`, attached to no entry. The app created
      them, so it can see them from then on. This is the path to prefer.
    - **＋ Agafa'n de Drive** opens the **Google Picker** over the session's
      folder. Picking a file is what hands `drive.file` access to that one file;
      the ids are remembered in `session.extraFiles` and `sessionFolderFiles`
      fetches them one by one, since a picked file may still not come back in a
      plain folder listing. Needs the **Google Picker API** enabled in the Cloud
      project and allowed on `PICKER_KEY` — the key is API-restricted for
      Translation, so it has to be added there too.
  - **Media is what lives in `photos/`, `videos/` or `audio/`** — nothing at the
    folder's root (that's reports and `session.json`) and nothing from any other
    subfolder. That's the rule the ZIP packs by, too.
  - **It lists everything the folder holds**, media or not. It used to drop
    whatever wasn't an image, video or sound at the folder's root — reports,
    `session.json`, a delivery note dropped in by hand — and a screen called
    "the folder's files" that quietly hides some is a screen that makes you
    count twice and doubt the app. What doesn't travel in the media pack is
    shown under "Altres fitxers" and labelled, not hidden.
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
  - **Everything in the folder goes in, not just what the report prints**
    (`isSessionMedia`: the media subfolders, plus an image/video/audio dropped at
    the folder's root — the reports are pdf/docx/xlsx/html/json and never match).
    Photos put there from Drive are there on purpose, to round out what an entry
    says, and they travel with the pack without appearing in the report. What was
    deleted in the app isn't in the folder any more — see below.
- Export: HTML (video playable), PDF (jsPDF + autoTable), DOCX (via docx lib CDN),
  XLSX (spare parts, via SheetJS)
- Reports in Catalan, Spanish or English (see Languages), filenames shown under each photo/video
- Dark/light theme toggle (☀/☽)
- Sync indicator (● Drive green / ● Local red)
- Auto-sync every 30s (skipped if user has unsaved input)
- Rename Drive files when attachment name is changed in edit modal

---

## Report revisions
- A report goes out in **revisions**: Rev. 01, Rev. 02… Each one is a FILE kept
  on Drive, not a snapshot of the data. Editing an entry afterwards does not
  rewrite what was already handed over — what preserves Rev. 01 is the PDF that
  was sent. Snapshotting the content (photos included) at every revision would
  double the storage for little gain.
- `session.revisions=[{n,date,note,issuedAt}]`. `date` is what the report
  prints and the technician can correct; `issuedAt` is when it was actually
  written out, and it is what says whether the session has moved on since
  (`changedSinceRev`). Picking a language or caching a translation deliberately
  leaves `updatedAt` alone, so neither counts as a change — nor should it.
- **The number is decided by the folder** (`nextRevNumber`): the next one is
  after the highest `_revNN_` already in the session's Drive folder. Exporting
  from another device, or deleting a file by hand, would otherwise let the app's
  own count drift from what has actually been handed over. Signed out it falls
  back to the local list and says so in the dialog.
- **When it asks**: only when the session changed since the current revision.
  Rev. 01 is issued silently on the first export ("Primera emissió") — there is
  nothing to compare it with. Otherwise a dialog offers the next number (date,
  defaulting to today, and a note that is required) or a re-issue of the current
  one, which overwrites its own files and keeps the number.
- **The base name is frozen with Rev. 01** (`session.baseName`). Every revision
  of one report has to share a base, or the numbering can't tell that rev01 and
  rev02 are the same document. The date in it is the session's **end** date —
  the last entry's — which keeps moving while the session is open, hence the
  freeze. Sessions exported before this keep their old, unnumbered files; the
  first export after it writes `_rev01_` alongside them.
- Stamped on the PDF, Word, HTML, spare-parts Excel and both ZIPs. The timesheet
  stays out of the numbering (it carries its own date and signatures) but its
  file name uses the same frozen base.
- Printed only in the header: `Posada en marxa · Rev. 02 · 25/09/2026`. The
  history lives in the app, under ↓ Informe → Revisions…, where the current
  revision's date and note can also be corrected after the fact.

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
  - Service Worker explicitly passes unpkg.com and jsdelivr.net through (not cached)
  - **It is built to land on the same layout as the PDF**, because the usual
    route is "export Word → Save as PDF" and the two had drifted apart. Same A4
    geometry (14 mm margins = 794 twips), same measured column widths
    (`entryColWidths` runs against a throwaway jsPDF doc and the millimetres are
    converted to twips, 1 mm = 56.6929), same blocks: the two-column LABEL/value
    meta grid, the counters line, the QT./REF./SPARE PART table, the outcome
    block with its coloured bar, names-only attachments, the 3-across photo
    appendix, side-by-side signature lines and a footer with the id and the page
    number. Rows alternate white / #F9FAFB like the PDF and the HTML — they used
    to be tinted per severity, which was the most visible difference.
  - **What cannot match: where Word breaks pages.** It repaginates with its own
    engine, so a row may land on a different page than in the direct PDF.
  - If jsPDF can't be loaded (offline), the Word report still builds with a
    fallback set of widths.
- **Nothing in the entries table is cut or broken up.** Severity, tag and each
  attachment's file name always read whole on ONE line; the description is the
  only column meant to wrap, and it gets whatever is left.
  - The timestamp column carries the date and the time on separate lines, so it
    only has to be as wide as the longer of the two (it used to be a fixed 26 mm
    for both plus a space). A photo's `[foto]` marker goes on a third line.
  - PDF widths are MEASURED with `doc.getTextWidth`, never guessed: `pdfFitCol`
    gives a column the width its widest line needs, shrinks the text past the cap
    instead of wrapping it, and below 5.8 pt WIDENS the column instead (a font
    floor on its own just brought the wrapping back). Head labels wrap between
    words but head styles beat column styles in autoTable, so a column can never
    be narrower than its longest head WORD.
  - DOCX can't measure, so widths come from character counts (Courier New
    advances 0.6 em → a character is 6 × its half-point size in twips, ~7 for
    bold Arial caps, +6% slack) and the table is `TableLayoutType.FIXED` so Word
    honours them. Tag and attachment font sizes step down together (9/7 pt →
    5/5 pt) until the description gets its 3000 DXA.
  - **No emoji in the PDF**: jsPDF's standard fonts are WinAnsi, and one ▶ or 🎧
    flipped the whole string to UTF-16 — names came out as `%¶\0V\0I\0D…` and
    measured wrong on top of it. The PDF marks a video with `»` and a voice note
    with `•`; DOCX and HTML keep the emoji.
  - **Arabic needs an embedded font** (same WinAnsi wall: a Moroccan address came
    out as `þ•þ®þÐþäþßþ•`). When a report carries Arabic, `pdfArabicFont` fetches
    **Amiri** from jsdelivr and registers it on that document; `pdfFont` then
    picks it per text, so everything else stays helvetica. Amiri on purpose: it
    has Latin as well, so a mixed line ("Rue 12, الدار البيضاء") draws whole —
    Noto Naskh Arabic has no Latin and dropped it silently. jsPDF joins the
    letters into their contextual forms and runs them right-to-left by itself:
    **never call `setR2L()`**, it reverses them again.
    - **Never `{align:"right"}` on Arabic either** — jsPDF anchors the run at the
      wrong end and the address walked off the page. Right-aligning is done by
      measuring (`x + width - getTextWidth(line)`); table cells are left-anchored
      and autoTable is told nothing about alignment.
    - The font has to be set BEFORE `splitTextToSize` or the wrap is measured
      against the wrong glyphs; same for `pdfFitCol`'s column measuring.
    - Only Arabic reports pay for it: ~83 KB instead of ~9 KB, one 430 KB font
      download the first time (nothing is fetched when there's no Arabic). If it
      can't be fetched the report still builds, with a warning that the Arabic
      won't read. Other scripts (Cyrillic, Chinese) are still broken — they'd
      need their own font.
    - Verified by rendering the finished PDF with **pdf.js** and reading it on
      screen; that's the only way to see what a PDF really says.
- **Metadata values wrap** (`pdfMetaBlock`, shared by the report and the
  timesheet). They used to be cut to their first line — `splitTextToSize(...)[0]`
  — which silently dropped the rest of a long one: a full address under UBICACIÓ
  came out halfway. The photo appendix's caption had the same bug and now puts
  the time on one line and the whole file name, shrunk to fit, on the next.

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
