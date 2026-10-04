# Field Service Log — Project Context for Claude Code

## What this is
A single-file PWA (Progressive Web App) for field technicians to log incidents during
technical service visits. Built as a standalone HTML file, deployed via GitHub Pages.

**Live URL:** https://txals13.github.io/field-service-log/
**Repository:** https://github.com/txals13/field-service-log
**Main file:** index.html (single file, everything inline)

---

## Google Cloud credentials (in the app, except the Gemini one)
- CLIENT_ID: `514772123815-ncjsebgvc01t8arftqp8bo43jr4fgneb.apps.googleusercontent.com`
- PICKER_KEY: in `index.html` — not repeated here. It has to ship in the page,
  but a second copy in the notes is one more thing for a scanner to find and
  one more place to forget when it is rotated.
- PICKER_APP: `514772123815`
- Project ID: `field-service-log-500615`
- OAuth scope: `https://www.googleapis.com/auth/drive.file` (minimum required)
- Auth method: Google Identity Services implicit token flow (no redirect URI needed)
- Status: **Testing mode** — new users must be added manually to Google Cloud Console
  → APIs & Services → OAuth consent screen → Test users
- **Two API credentials, and they are not interchangeable:**
  - `PICKER_KEY` — the classic `AIza…` Cloud key, for the Drive Picker.
  - The Gemini key — an **AI Studio auth key** (`AQ.…`), which does both the
    report translations and the ✓ Corregeix button. The Gemini API stopped
    accepting classic keys in September 2026, and an auth key is scoped to
    Gemini alone, so one key cannot do both jobs. Created at
    aistudio.google.com/apikey against project field-service-log-500615, with
    billing set up there (AI Studio → Projects → Billing Tier) so calls run on
    the **paid tier** — `usageMetadata.serviceTier: "standard"` in a reply
    confirms it.
  - Cloud Translation is no longer used at all.
- **PICKER_KEY is public on purpose, and restricted so that doesn't matter.**
  A browser key ships in the page to every visitor; hiding it from GitHub would
  change nothing. What makes a copy of it worthless is the restrictions, set on
  2026-09-27: **Websites** (`https://txals13.github.io/*` and
  `http://localhost:8420/*`) and **one API**, Google Picker. Cloud Translation
  was removed the same day — it was still allowed months after the app stopped
  using it, and it bills.
  - GitGuardian mails an alert on every push because it cannot see the
    restrictions. The answer is not to rotate: a new key would be in the next
    push's page too. The restrictions are the defence, not the secrecy.
  - **It was being probed.** When the restrictions were saved, the console
    listed detected usage for `geocoding-backend.googleapis.com` — an API this
    app has never called in any commit, ever. Somebody harvested the key off
    GitHub and tried it against a billable API. It was refused, because the key
    was already API-restricted. That is the whole argument for restricting a
    key you cannot hide.
- **The Gemini key is NOT in index.html, and must never be put there.** This
  repo is public. `PICKER_KEY` can live in the source because Cloud Console pins
  a browser key to a domain, so a copy of it is worth nothing anywhere else; an
  AI Studio key cannot be pinned that way, and whoever reads it spends on the
  billing account. It is typed once per browser in 🔑 **Clau de Gemini**
  (sidebar, under Manuals de recanvis) and kept in `localStorage` under
  `fsl_v6_gem` — deliberately outside `LS_DATA`, so it never reaches Drive, a
  ZIP or a backup. `gemKey()` reads it on every call; `gemAsk` throws
  `GEM_NOKEY` before fetching when it's empty, and the two callers turn that
  into the key dialog rather than an error: ✓ Corregeix opens it outright, and
  an export that needs translating asks first, so cancelling still gets you the
  report with the originals. The real fix for distribution is the Worker — see
  "Distribution" — which is where this key belongs once the app is shared.

---

## Languages
- **The app is Catalan only.** No UI language switch — every UI string is written
  in Catalan in the code (`<html lang="ca">`, TM/SM labels included).
- **Reports go out in any of 29 languages** (`LANGS`), chosen in the ↓ Informe
  menu — chips for CA · ES · EN, a dropdown for the other 26 — and remembered
  per session as `session.reportLang` (default ca).
  - **Latin, Greek and Cyrillic only, and that is the PDF's limit, not the
    translator's.** The model would do Arabic or Japanese perfectly well. A
    report in Arabic or Hebrew needs the whole page mirrored — today Arabic
    survives only as a field inside an otherwise left-to-right page — and CJK
    needs a font measured in megabytes and a line-breaker that works without
    spaces. Both are their own job.
  - **The labels of the other 26 are translated once and kept** (`ensureLabels`,
    `labelsFetch`, IndexedDB key `reportLabels`). 80 report labels plus 26
    timesheet ones is not a table to type out, and a language nobody picks
    costs nothing until they do. `ca`/`es`/`en` stay hand-written and are never
    shadowed by a cached table.
    - The reply is checked against `RPT.en`'s **shape** — same keys, same
      nesting, same list lengths, every leaf a non-empty string — and thrown
      away whole if it doesn't match. English labels make a report in the wrong
      language, which you can see; a table with a key missing makes a report
      with holes, which you may not.
    - The file-name fragments (`pre.report`, `pre.parts`, `TSL.file`) are
      rebuilt by `fileSafe` rather than trusted: they land on a disk and in a
      Drive folder.
    - **↓ Informe › Revisa les etiquetes** (`openLabels`) lists all of them with
      the English beside each, editable, plus "torna-les a traduir". A wrong
      sentence is wrong once; a wrong column heading is wrong in every row of
      every page of something a client signs.
  - **The timesheet has a language of its own and gets the same two things**
    (`localizeTimesheet`, and `ensureLabels` in `exportTimesheet` and in the
    ZIP). The report can go to head office in English while the sheet is signed
    on site in Polish, so `T.lang` is picked separately — from the same 29-line
    table, not the three it used to offer — and both the labels and the words
    the technician typed into it are translated at export.
    - **Remarks and the per-day notes go through the translator; the
      destination does not.** A destination is a place name, for the same
      reason the client and the machine aren't translated.
    - Nothing is cached: a sheet is exported once or twice, and the frozen copy
      has to keep the words it was signed with rather than a translation of
      them.
    - The modal's preview is drawn with whatever labels the app already has,
      which for a new language means English, and it says so under the picker.
      Asking Gemini for a table because a dropdown moved would be a charge
      nobody asked for.
  - **The PDF swaps its font when it has to** (`needsUni`, `pdfUniFont`). Noto
    Sans — Latin Extended, Greek and Cyrillic in one 550 KB file — is fetched
    on demand and **registered under the name "helvetica"**, so all 28 existing
    `setFont` calls and every autoTable style block pick it up untouched. That
    reads like a trick and is one; the alternative was threading a font name
    through all of them and getting one wrong, which is a row of mojibake
    nobody notices until a client has it. Arabic still gets Amiri by name.
    Verified by rendering: Łódź, řešení, şanzıman, țeavă, árvíztűrő,
    Αντικατάσταση, Замена — head, body, parts table and captions.
  Changing it does NOT bump `updatedAt` — it's a preference, and bumping would
  make the delete dialog call the last project ZIP stale.
- Fixed report labels live in `RPT[lang]` (HTML, PDF, DOCX, XLSX, parts table,
  file-name prefixes `informe_/recanvis_`, `informe_/recambios_`,
  `report_/spare_parts_`). File names end in `_<lang>`.
- **The technician's own words are machine-translated**: entry descriptions and
  the session's general notes, **by Gemini** (`gTranslate` → `txBatch`), not by
  Cloud Translation. ~20× cheaper per character, and the rules the old path had
  to trick the translator into are one sentence of instructions here. The
  manual's data — part names, references — is never translated; neither are
  client/machine/location names, tags or file names.
  - **The guard is the point.** A model can paraphrase, drop or embellish, and
    this is a document a client signs. So: temperature 0, a JSON array in and
    out, batches of at most 25 texts (a batch that comes back wrong costs every
    text in it), and a check that **as many strings come back as went in**.
    Anything else throws, and `reportSession` falls back to asking whether to
    export with the texts as written. Verified: 3 sent, 2 returned → the report
    went out with the three originals intact.
  - What it cannot catch is a wrong translation of the right shape. That is the
    trade for the price and the instructions.
  - **A report in the language it was written in is never sent anywhere**
    (`writeLang`, the first line of `localizeSession`). It used to go out and
    come back identical — which worked, but paid for the round trip and, once
    the key moved to localStorage, stopped such an export dead on a browser
    with no key. ✓ Corregeix corrects in place without moving the language, so
    a corrected entry is still what the session declares.
    - **Which language that is, the session says**, in ↓ Informe under "Escrit
      en" (`session.writeLang`, default `ca`, set beside the report language and
      like it not bumping `updatedAt`). Nothing can tell a Catalan entry from a
      Spanish one without asking a model, and that call is the whole thing being
      saved. Get it wrong and the text simply goes out as typed.
    - The cache needs no invalidating when it changes: `txBatch` names only the
      TARGET language in the prompt, never the source.
    - **Only the free text is skipped.** Every fixed label — title, metadata,
      severities, column heads, the file-name prefix — comes from `RPT[lang]`
      and is in the report's language either way. Verified: written es, report
      es, 0 Gemini calls, and the HTML still says "Informe de servicio
      técnico", Problemas / Avisos / Resueltos / Fecha y hora / Gravedad /
      Descripción / Adjuntos, with the technician's own sentences untouched.
    - Verified with a key present, all four combinations: ca→ca 0 calls,
      ca→es 1, es→es 0, es→ca 1.
- **✓ Corregeix — spelling and grammar, on demand** (`gemCorrect`, `wireCorrect`).
  Gemini (`gemini-3.5-flash-lite`, temperature 0) on the AI Studio auth key the
  user typed into 🔑 Clau de Gemini — see the credentials section: NOT the
  Picker's key, and not in the source.
  - **Not the translator.** Asked to "translate" Catalan into Catalan, Cloud
    Translation rewrites and invents — that's the bug the report path guards
    against. Correcting needs a model that can be told what to leave alone: the
    quoted runs, the references, the meaning, the register.
  - **Never automatic, never on export.** A button beside each free-text field
    (entry, edit, resolution, general notes, timesheet remarks); one press
    corrects, the next puts the original back, and typing after a correction
    drops the undo. `corrPrev` is declared with the other state on purpose —
    `wireCorrect` is called from markup wiring far above the helper, and a `var`
    initialised beside the function is `undefined` when it runs (it threw, and
    took the whole boot with it).
  - **Not the endpoint the docs show.** Their curl example posts to
    `/v1beta/interactions` with an `x-goog-api-key` header; from a browser that
    dies on "Failed to fetch", because the endpoint doesn't answer the CORS
    preflight those custom headers trigger. `gemAsk` uses the classic
    `models/<model>:generateContent?key=…` with only `Content-Type`, which does.
    `gemText` joins the `parts[].text` of the first candidate (a part can carry
    a `thoughtSignature` and no text) and strips a quote pair the model may have
    wrapped the answer in — which would otherwise mark the whole entry as
    protected-from-translation.
  - **Paid tier on purpose.** Google's terms: on the free tier prompts are used
    to improve their products and a human may read them; on the paid tier they
    are not. Client names and faults don't belong in the free tier.
- **Text already in the report's language is kept exactly as written** — a rule
  in the instructions now, and it holds: a Catalan report of Catalan entries came
  back character for character identical. Under Cloud Translation this needed a
  trick (it answered even when source == target, and rewrote: "B migdia 11:15"
  became "B 23:15", "Sense data" became "Dades sensorials"), which is why the old
  path had to throw those answers away by reading `detectedSourceLanguage`.
- **Anything in double quotes is never translated.** "Insereix un recanvi des
  del dibuix" wraps what it writes in `"…"`, so a name and reference out of the
  manual reach the report exactly as the manual has them ("Separador" must not
  come back as "Separator"); typing quotes by hand protects anything else the
  same way. It is now simply a rule in the instructions, verified against the
  live API in all three languages: an English report kept
  `"Rodamiento de bolas - 3025.1478"` word for word. (Cloud Translation only
  honoured "leave this alone" in HTML mode, so the text used to travel wrapped
  in `<span translate="no">` with newlines as `<br>` — all of that is gone.)
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
- **`manual.html` — the user manual**, in Catalan, opened from the sidebar
  (📖 Manual d'ús, a new tab) and precached by `sw.js` so it reads offline.
  Written 2026-10-04 to cover the app as it stood that day. **When a feature
  changes what the user sees or does, update the manual in the same change**
  — button names in it are quoted exactly as the app shows them.
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

## Machine history
- **📜 N visites — every visit to this machine, from the session header**
  (`machineKey`, `machineSessions`, `openEntries`, `openMachineHistory`). A
  service engineer goes back to the same machines, and what was left open last
  time is the first thing you want on arriving and the hardest thing to find
  once it is buried in a pile of PDFs.
- **A machine is CLIENT + MACHINE**, normalised to **lowercase, no accents,
  letters and digits only** (`keyNorm`) — so `VLP-320-R`, `VLP 320 R` and
  `vlp320r` are one machine, and `AIGÜES` is `AIGUES`. One sentence on purpose:
  an identity rule you cannot predict is worse than a strict one.
  - It deliberately does **not** forgive the legal form. `X, S.L.` and `X, S.A.`
    are different companies, and the list of suffixes to strip differs by
    country and is never finished. Typing the client consistently is the fix,
    and the heading now shows which spelling that is. Verified: those two stay
    apart.
  - `ł ø đ ð ß æ œ þ ı` are folded by hand. They carry their mark inside the
    glyph, so NFD leaves them whole and the letters-and-digits filter would drop
    them outright — a Polish name would lose letters rather than lose accents.
    Verified: `Zakład Łódź` groups with `Zaklad Lodz`.
  - The price: `A-1` and `A1` become one machine, as do `CASA NOVA` and
    `CASANOVA`. Both are remote, and both are undone by naming them apart by
    more than a hyphen.
  - A machine written only in punctuation normalises to nothing, and
    `machineSessions` bails: two such sessions are not the same machine just
    because neither has a usable name.
  - And deliberately **not** the serial number: a serial only exists once a
    manual has been linked, so keying on it would split a machine's own history
    down the middle on the day you link one. The serial is shown, never used to
    decide. Two identical machines at one client therefore share a history until
    they are named apart in the Màquina field — which is also the fix.
  - **The heading takes the newest visit's spelling**, not the open session's.
    They all group to the same machine whatever the capitals and spacing, so
    something has to pick one, and the way you typed it most recently is the one
    you have settled on. Stray spacing is tidied for the heading; capitals are
    left alone, because `CELLER` versus `Celler` is a choice, not a slip. Each
    session's own header still shows its own text — that is its data.
- Three blocks, in the order the question gets asked: **what is still open**
  (from the OTHER visits — this one is already on screen), **the visits**
  (newest first, counters, revision, click to open), and **every part ever
  fitted** with its total quantity and the last date it went in.
- Open means severity issue or warning with no outcome, or one that still says
  issue. `isResolved` only counts ok/info outcomes, so a single test covers both.
- **A problem dragged in from an earlier visit is closed from the NEW entry**
  (`entry.closes = {s,e}`, `closedRefs`, `fillCloses`). The old report has
  already been signed saying it was open, and giving the old entry an outcome
  now would be rewriting a document that was handed over — so the link lives on
  the entry that closes it, and the old one is never touched. Verified: after
  linking, the March entry is still `issue`, has no `fix`, and no `editedAt`.
  - The picker sits in the edit modal beside the outcome, lists every still-open
    entry from the machine's **other** visits, and is **hidden entirely when
    there is nothing to close** — a dead control on every entry would be noise
    on the ninety-nine that close nothing.
  - What the entry already closes stays in its own list even though it no longer
    counts as open, or editing the entry again would silently drop the link.
  - The history then shows it as **✓ Tancats en una visita posterior**, with the
    date it was closed. Seeing the chain is the point; a pending count that
    quietly shrinks would just look like a bug.
  - And it shows **how** it ended, not only that it did: the closing entry's
    outcome ("com ha quedat"), with its severity label in its own colour, since
    that is the actual answer to "and what happened with the valve?". When the
    closing entry has no outcome written, its own description stands in —
    saying nothing there would be the worst of the three.
- The chip carries the pending count, which is the whole point of it being
  visible without opening anything.
- **Nothing in this screen is truncated.** It used to cut the problem at 110
  characters and the outcome at 170, which looked fine until a description ran
  long — and a problem that ends in an ellipsis is one you have to go and look
  up somewhere else, which is the thing this screen exists to save you. The
  modal scrolls; the text doesn't get clipped.
- **Each visit's card lists its problems and warnings** (`mhCardIssues`), in
  time order, each with where it stands: **✓ Resolt** + the outcome when it
  was solved on that visit, **✓ Tancat el dd/mm (project)** + the closing
  entry's outcome when a later visit closed it, **⚠ Pendent** otherwise (with
  the outcome text if one was written that still says it's a problem).
- **🖨 Imprimeix** prints the history, or saves it as a PDF to send, through
  the browser's own print dialog (desktop and Android alike), **in the report
  language of the open session** (`reportLang(cur)`), since it goes to the same
  client. The button says which when it isn't Catalan ("Imprimeix · English").
  - `mhRender(cur, all, L, forPrint)` builds the history from a label table;
    the dialog calls it with `RPT.ca` and the texts as typed, the print with
    `RPT[lang]` and each visit passed through `localizeSession` — the same
    cache as the reports, so a visit already exported in that language costs
    nothing and one written in it is never sent. Tags and spare-part names stay
    as written, as in the reports.
  - The labels are `RPT.<lang>.h` (14 of them), hand-written for ca/es/en and
    translated with the rest of the table for the others (`ensureLabels`).
    Adding them changed `RPT.en`'s shape, so tables cached before were dropped
    and each language is fetched again once.
  - On paper the pending list comes from EVERY visit, this one included (on
    screen it leaves the open one out), and "aquesta" isn't printed.
  - What prints is `#mhPrintBox`, filled just before printing; the dialog's
    own parts are `.no-print`. It sets `body.print-mh`, and an `@media print`
    block hides everything else and forces light colours. The class comes off
    when the dialog CLOSES, not on `afterprint`: on Chrome for Android `print()`
    returns at once and `afterprint` can come before the page is laid out for
    the printer, which would print the app instead. A precaution, not a seen
    bug. The page title, i.e. the PDF's file name, is
    `<translated "machine history">_MACHINE_CLIENT_date`.
  - If translating fails, or there is no Gemini key, it asks whether to print
    with the texts as written — same as the reports.

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
    - **＋ Afegeix fotos / vídeos** (and every other media button) uploads them
      from the app straight into
      `photos/`, `videos/` or `audio/`, attached to no entry. The app created
      them, so it can see them from then on. This is the path to prefer.
    - **＋ Agafa'n de Drive** opens the **Google Picker** over the session's
      folder. Picking a file is what hands `drive.file` access to that one file;
      the ids are remembered in `session.extraFiles` and `sessionFolderFiles`
      fetches them one by one, since a picked file may still not come back in a
      plain folder listing. Needs the **Google Picker API** enabled in the Cloud
      project and allowed on `PICKER_KEY`, which is API-restricted, so the
      Picker API has to be added to its allow-list. Still pending.
  - **Media is what lives in `photos/`, `videos/` or `audio/`** — nothing at the
    folder's root (that's reports and `session.json`) and nothing from any other
    subfolder. That's the rule the ZIP packs by, too.
  - **It lists everything the folder holds**, media or not. It used to drop
    whatever wasn't an image, video or sound at the folder's root — reports,
    `session.json`, a delivery note dropped in by hand — and a screen called
    "the folder's files" that quietly hides some is a screen that makes you
    count twice and doubt the app. What doesn't travel in the media pack is
    shown under "Altres fitxers" and labelled, not hidden.
- **On a phone the buttons open the camera; on a laptop they open a folder**
  (`handheld`, `wireCapture`, `showCaptureButtons`).
  - `<input capture="environment">` is the whole mechanism: a phone opens the
    camera or the camcorder instead of a file list, and a desktop browser
    ignores the attribute — which is why the capture buttons are never *shown*
    on the desktop rather than shown and disabled. What comes back is a `File`
    like any other, so it lands in `handleFiles` and rides the usual path up to
    the session's Drive folder.
  - `handheld()` is **coarse pointer AND real touch points**, not
    `mob()`/width: a laptop dragged to half the screen is still a laptop and
    pointing its webcam at a pump helps nobody, and a touchscreen laptop with a
    mouse is not a phone either.
  - Capture and gallery are **separate buttons**, in the composer (📷 🎥 🖼)
    and in the edit and resolution panels. Losing the gallery to gain the
    camera would be a bad trade: half the photos of a visit were taken before
    the app was open. The old "afegeix una foto" is renamed "De la galeria"
    where the camera has its own button, because that is what it now is.
  - **Voice notes are unchanged**: 🎙 records through `getUserMedia` on every
    device, phone or laptop — the user asked to keep dictating from the laptop.
  - The composer's button column **becomes a row under the description** below
    640 px. It starved the description down to a three-word ribbon even before
    the camera buttons made the stack taller.
- **🗄 Carpeta d'arxiu — the project ZIP is written there, not downloaded**
  (`arxDir`, `saveToArxiu`, IndexedDB key `archiveDir`; picked in the same
  dialog as the project folder). Unlike that one this needs **write**
  permission, which is why it is asked for while the export click is still
  fresh: after a minute of translating and zipping the browser no longer counts
  it as a gesture and refuses the prompt outright. Anything in the way — no
  permission, folder gone, disk full — falls back to the download, so the ZIP
  is never lost on the way out. Only the archive; the Word + media pack is for
  handing over and still downloads.
  - **The same session at the same revision replaces its ZIP** (`saveToArxiu`
    with the session id → `arxSameSession`). The name carries revision and
    language, so a second archive under the same name from the same session is
    a re-issue, and a re-issue replaces its own files — no `_2` beside it.
    Drive for desktop keeps the old one as an earlier version of the file.
    Whether it IS the same session is read from the ZIP's `session.json`: the
    name can't say, since two visits can share client, machine and project.
  - **Any other clash gets a suffix** (`arxFreeName`): `…_rev01_ca.zip`, then
    `…_rev01_ca_2.zip` — a different session that happens to share the name,
    or a ZIP that can't be read (counted as someone else's: the safe way to be
    wrong). The busy line names the file when it isn't the plain one.
    Verified with a stand-in folder and real ZIPs: same session twice → one
    file; another session → `_2`.
- **🗄 Arxiva sessions…** (sidebar, `openBulkArchive` → `archiveSessions`) —
  the other half of "Tria què carregar". A list of every session, newest
  first, with project, dates, revision, open/closed and whether it already has
  a current project ZIP; tick the finished ones, and each is archived as its
  **project ZIP** (the same `exportSessionZip` as the menu, one after another,
  in its report's language) and then **deleted from the app** with its Drive
  folder sent to the Drive trash (`deleteSession`, shared with the delete
  dialog). Untick "Esborra-les…" to only archive.
  - A session is only deleted when THIS export stamped a new `zipAt` and
    `zipIsCurrent()` passes — the same test the delete dialog trusts. One that
    failed stays, and the summary says which.
  - A session changed since its last revision still asks for the revision
    number, one dialog per session: that's a decision, not a formality.
  - Works without the archive folder too (tablet): the ZIPs go to Downloads.
  - **`deleteSession` never trashes a Drive folder another session still
    holds** (`folderId`). Two visits used to share a folder by name; binning it
    for one would have taken the other's photos with it.

- **📁 Carpeta del projecte — the file dialog opens where the photos are**
  (`pickMedia`, `fsaPick`, `startDirFor`; sidebar button `btnOutDir`).
  - Drive for desktop mirrors `Outputs` onto a drive letter, so a session's
    photos are already in its own folder on the machine — but `<input
    type="file">` opens wherever the browser last was and cannot be pointed
    anywhere. `showOpenFilePicker` takes a directory handle as `startIn`, so the
    user picks `Outputs` once and the handle is kept in IndexedDB (`kv` store,
    key `outputsDir`, loaded into `outDir` at boot).
  - **The handle is a starting point, never read.** The files come back through
    the pick itself, which carries its own access, so there is no permission to
    request and none to renew. Stepping into the session's subfolder
    (`sessFolderName`) does need read permission on `Outputs`; when that has
    lapsed, or the folder hasn't synced down, or it was renamed by hand, the
    dialog opens at `Outputs` instead — one click away, and better than a
    permission prompt in the way. Verified for all three cases.
  - `startIn` and `id` are alternatives, never both: with an `id` the browser
    reopens wherever it was last, which is the whole problem. `id: "fslMedia"`
    is only the fallback when no folder has been picked.
  - All four media buttons go through `pickMedia(inputId, handler, audio)`,
    which hands the handler the same `{target:{files,value}}` shape the change
    event had, so `handleFiles` and `folUpload` are untouched. Dismissing the
    dialog does nothing; anything else falls through to `<input>.click()`.
  - **Chromium desktop only.** Firefox, Safari and every phone keep the hidden
    input exactly as before — `fsaOK()` decides, and the dialog says so.
- **The archive ZIP carries every revision's documents**, not only the current
  one. Everything at the Drive folder's root goes in — the reports of Rev. 01,
  Rev. 02… each already carrying its number in its name, plus anything dropped
  in there by hand. `session.json` is skipped (one is written fresh) and so is
  any name the zip already holds, which is the current revision: the copy built
  a moment ago beats the copy Drive has from the last export.
  - This matters because **an old report cannot be rebuilt**. Restore the
    session and export, and you get today's data, not March's. Without this the
    archive was born missing the very documents that had been handed over.
  - Only the archive. The hand-over pack is the report and the media.
- **Import takes several files at once** (`multiple` on `#importFile`), because
  an archive is a folder of twenty ZIPs and feeding them in one at a time is not
  a workflow. Sequential on purpose — each ZIP re-uploads its media to Drive and
  twenty of those at once is a way to get throttled — with **one** save to Drive
  at the end and **one** summary alert instead of one per file. A file that
  won't parse is named in that summary and doesn't stop the rest. Re-importing
  is safe: sessions are skipped by id.
  - **⬇ Tria què carregar…** (`fsaArxLoad` → `openArxPicker`, in the folder
    dialog under the archive folder) lists that folder with a checkbox per file,
    size and date, plus Tots / Cap, and loads only what is ticked. **Nothing is
    ticked to start with**: loading is the kind of thing that should only happen
    on purpose. Shown only when a folder is set and the browser has the API.
  - Listing is free: `getFile()` gives size and date without reading contents,
    so a folder of several gigabytes lists instantly and only what you tick is
    ever read. Verified — nothing read until the load button.
  - Both doors — the file picker and the archive folder — go through the same
    `importFiles`, so there is one loop and one summary to keep correct.
  - Permission is asked **on the click**: reading twenty ZIPs takes a while and
    by the end of it the gesture would be long gone.
  - The folder yields **handles, not bytes**. Each file is read only when its
    turn comes, so a folder of several gigabytes never lands in memory at once.
    Names are sorted, so a project with several goes at it arrives in the order
    it was archived; anything that isn't a `.zip` or `.json` is ignored.
  - Verified against a stand-in folder: a stray `.txt` left off the list, name
    order rather than folder order, one ticked loads one, two load two, Tots
    after that reports 3 skipped, Cap disables the button.
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
- **✍ Signa… — the report is signed on the glass, like the timesheet**
  (`openReportSign`, `revSign`, `setRevSign`; reuses `tsInitPad`, pointer
  events, which is what works on Android). Two pads, two names, drawn into the
  PDF, the DOCX and the HTML; when a revision was never signed, the same blank
  line as always comes out, for signing a printout.
  - **The signature belongs to the REVISION, not the session.** That is the
    whole point of revisions: a reissued report is a different document, and a
    signature carried from Rev. 01 to Rev. 02 would put the client's name under
    text they never read. Issue a new revision and the pads come up blank;
    Rev. 01 keeps its signature and re-exports with it. Verified both ways.
  - Signing goes through `ensureRevision` first, so there is one place that
    decides what revision this is, and a signature always has a document to be
    the signature of.
  - `revSign` resolves out of the session's list **by number**, never off the
    `rev` object the export carries: that object was taken before signing, and
    trusting its `.sign` would lose a signature made between issuing and
    exporting — which is the normal order of events.
  - Writing it does not bump `updatedAt`: signing is part of issuing, not a
    change to the content, so it must not make the revision look stale.
  - It is a signature on glass, not a qualified electronic one — the same
    weight the timesheet has always had, and the same as ink on a printout.
- **The client's contact heads everything and starts both signature pads**
  (`session.contact`, `session.contactRole`, `contactLine`). Entered beside the
  client in the session dialog, shown as `Nom · Càrrec` and used as the
  suggested signer name — suggested, because often the contact signs and
  sometimes whoever is on site that day does.
  - It appears in **six places**, and all six are the point: the session header
    on screen (🤝 chip), the PDF, the DOCX and the HTML report headers, the
    Excel's info sheet, and the **timesheet header** — which meant `TSL.meta`
    growing from six entries to seven, since that list is positional.
  - Not translated, for the same reason the client and the machine aren't: a
    person's name and the title they go by, said the way they wrote it.
  - Adding `contact` to `RPT` made every **cached translated table stale**, so
    `labelsLoad` now checks each one against `RPT.en`/`TSL.en` with `sameShape`
    and drops what no longer fits. The next export retranslates that language —
    one call, once — instead of printing `undefined` in a heading.
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
  rev02 are the same document. Sessions exported before this keep their old,
  unnumbered files; the first export after it writes `_rev01_` alongside them.
- **One name for a project: `projName(s)` = CLIENT_MACHINE_PROJECT** (sanitised,
  empty fields left out, `sessio` if all three are). It is the Drive session
  folder (`sessFolderName`), the report base and the start of both ZIP names
  (`…_projecte_rev01_ca.zip`, `…_docx_multimedia_rev01_ca.zip`). It used to be
  client + machine + technician for the folder and client + end date for the
  reports, so two visits to the same machine shared a folder — mixed photos,
  and one session's revision count started from the other's reports. Reports
  issued before the change keep their frozen old base, so their numbering
  carries on. Two sessions with the same client, machine AND project still
  get the same name; the archive folder adds `_2` to the ZIP.
- **A folder another session owns is never adopted.** `getSessionFolder`
  finds-or-creates by name only when the session has no `folderId` yet, and
  skips any folder whose id another session holds, trying `_2`, `_3`… A
  session that got a suffix keeps it: the rename-on-edit leaves `NAME_2` alone
  while NAME is still its name. Folders already shared before this stay
  shared (the first session to sync renames it; the other keeps using it).
  The local Outputs lookup uses `folderName`, so the suffix is found there too.
- Stamped on the PDF, Word, HTML, spare-parts Excel and both ZIPs. The timesheet
  stays out of the numbering (it carries its own date and signatures) but its
  file name uses the same frozen base.
- Printed only in the header: `Posada en marxa · Rev. 02 · 25/09/2026`. The
  history lives in the app, under ↓ Informe → Revisions…, where the current
  revision's date and note can also be corrected after the fact.

---

## Export / Report details
- **✉ Comparteix — what was just exported goes straight to another app**
  (`offerShare`, `lastDl`, hooked into `dlBlob`, so all eight export paths get
  it for free). Signing the report in front of the client and then leaving the
  app to hunt through Downloads was the whole trip undone at the last step.
  - **It is a bar, not a step inside the export, because of the gesture.**
    `navigator.share` needs a *fresh* user activation, and by the time a PDF
    exists — translated, laid out, rendered — the tap that asked for it is a
    minute old and no longer counts. So the file is kept, a bar appears, and
    the tap on the bar is the gesture. The side effect is the right one: you
    get to look at the report before deciding to send it.
  - Offered where `navigator.canShare({files})` says yes, never by sniffing the
    device: that is the honest question, and a laptop that can do it may.
  - **AbortError is not an error** — it is the share sheet being dismissed, and
    it leaves the bar up to try again without a word. Anything else does say so
    out loud, and says the file is in Downloads anyway.
  - Dismissing the bar drops the reference, so a 200 MB project ZIP isn't held
    in memory for the rest of the session.
  - Verified: with no Web Share API the bar stays hidden after a real export;
    with it, the share receives the actual PDF (right name, `application/pdf`,
    177 KB), the bar closes on success, a cancelled sheet is silent, and a real
    failure alerts.
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
