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
- Status: **In production** since 2026-10-10 (Google Auth Platform → Audience).
  Branding carries the home page, `privacy.html`, `terms.html` and the
  authorised domain `txals13.github.io`. No verification needed: no logo, one
  domain, and `drive.file` is a non-sensitive scope — adding a logo or a
  sensitive scope would trigger it. Out of Testing, sign-ins no longer expire
  after 7 days, and any Google account can sign in (each one only ever sees
  its own Drive). Unverified apps keep a 100-user lifetime cap. No cost.
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
- **✨ Resum per dies — the general notes as a diary, on demand** (2026-10-16;
  `wireDaySummary`, `gemDaySummary`, `daySummaryInput`, `mergeDayLines`).
  A button beside the notes' ✓ Corregeix. The same Gemini key and `gemAsk`,
  asked for JSON (`{"days":[{date,line}]}`): one short sentence per day, built
  from that day's entries (time, severity, tag, text, resolution) plus the
  production tests started that day, in the entries' own language, nothing
  invented. Each line goes into the notes as `dd/mm/yyyy: …`, on top.
  - **Running it again later re-does those days only.** A notes line starting with
    one of the summarised dates is dropped before the new lines go in; any
    other text the technician wrote stays, below, in its order.
  - **A suggestion, not an automatic field.** The text lands in the textarea,
    editable; the next press undoes it (back to the notes as they were), and
    typing after it drops the undo — the same contract as ✓ Corregeix. No key
    → the key dialog. The notes then travel like any notes (translated with
    the report, printed under "Notes generals").
  - Phone (m2): the two buttons sit in `#notesBtns`, hidden in the composer
    sheet with the notes field, shown in the Notes generals sheet.
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
- **Reports never go to Downloads** (2026-10-17, the user's rule: "everything
  goes to the project folder"). Every report export — PDF, Word, HTML, Excel,
  timesheet, validation PDF, Word+media ZIP — goes through `saveReport`: a
  resumable, size-checked upload (`reportToDrive` → `driveUploadZip`, which
  now takes a mime) over the same-name file in the visit's Outputs folder,
  then a note at the foot of the screen (`repNote`) with "Obre a Drive".
  Without Drive (offline, not signed in, upload failed) the blob waits in
  IndexedDB (`pendingReports`, one per visit+file name, newest wins) and
  `flushPendingReports` sends it from `syncTick` and on the `online` event;
  the sidebar line counts what is waiting. `uploadReportCopy` (download +
  background copy) is gone. Still downloaded on purpose: the JSON backup, the
  camera copy to the phone, and the archive ZIP when its archive folder fails.
- **Two Claude Docs kept current with the app** (created 2026-10-17, private to
  the user, pinned in their claude.ai sidebar):
  [Presentació del projecte](https://claude.ai/code/artifact/356924d4-6ca4-4b48-88cf-e982777f4a5a)
  — for the user's superiors — and
  [Llista de proves abans del viatge](https://claude.ai/code/artifact/cd8aa1d9-02f2-4ea2-8b95-007dbb151711).
  **The user wants both always up to date:** a change that alters a feature,
  the version, a button's place or name, the costs, or what is still untested
  goes into them in the same piece of work, through the Claude Docs connector
  (read first — the user ticks and edits them by hand). Keep what they wrote.
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
- **There is one data file, and a second is never made blind** (2026-10-12;
  `listDataFiles`, `dataFileChecked`, `mergeSessionLists`). A second
  `field_service_log_data.json` holding `[]` appeared beside the real one and
  the phone showed nothing: sign-in loaded, then ALWAYS saved, and a load that
  had failed to find the file (an error looked like "none") let the save
  create a new one from a phone that held nothing; after that each device
  read whichever Drive listed first.
  - Every load lists ALL the data files. More than one → they are merged
    (newest `updatedAt` per visit), the merge is written into the BIGGEST
    (the one with the work and its version history, never the empty
    newcomer) and the others go to the Drive trash. A duplicate heals on the
    next load anywhere.
  - A listing that fails throws; it is never read as "there is none".
    `dataFileChecked` is set only by a listing that worked, and only then may
    `saveToDrive` create a file. A save before any successful load reads
    first; a 404 on PATCH clears the flag instead of recreating the file.
  - Sign-in saves only if the load worked (`if(await loadFromDrive())…`).
  - **Saves are read-modify-write.** The same day the phone, having read the
    file while it was empty, saved "[]" fifteen seconds after the computer had
    saved an imported visit — and the computer, with nothing changed on its
    side, never wrote it back. Now `saveToDrive` re-reads the file and merges
    (`mergeSessionLists`, newest `updatedAt` per visit) before writing, minus
    the visits this device deleted (`LS_GONE`), so it adds to what is there
    instead of replacing it. And `loadFromDrive` pushes back what only this
    device holds (or holds newer) once the reconcile has had its say, so
    anything deleted elsewhere is not resurrected. Still not a lock: two
    writes in the same second can race, but neither can blank the other.
  - A folder in Outputs with no session.json yet is looked at again after
    two minutes (`outputsProbed` keeps a time until one is found).
  - **Merges compare `modAt`, not just `updatedAt`** (2026-10-13; `seenObj`,
    `markSeen`, `stampChanged`, `sStamp`). `updatedAt` means "the content
    changed" — it drives `changedSinceRev` — so the language pickers,
    signatures, revisions, cached translations, the folder a visit is filed
    under and more deliberately leave it alone. Merging on it alone kept
    Drive's copy on a tie, and a report language picked here flipped back to
    English at the next sync. `modAt` is stamped on ANY change: visits are
    replaced, never edited in place, so `saveLocal` stamps every visit that
    is not the object last seen. What comes in from Drive (load, the save's
    re-read, the reconcile) and the boot load are marked seen, so a sync is
    not mistaken for a change of ours; pending local changes are stamped
    before each merge. The merges take the later of the two stamps; on a tie
    the save keeps this device's copy.
  - **A deleted-visit note gives way to the same visit with a NEW folder.**
    Notes now keep which folder was deleted (`{f, done}`; old plain strings
    are read as `{f: s, done: s===""}`). A copy with no folder or with that
    very folder is held back (`goneBlocks`, used by the save's merge); a copy
    whose folder is a different one, live in Outputs, is the visit brought
    back on purpose — re-imported on another device — and the note is
    dropped. Before, the note was forever: a visit deleted on the phone and
    imported again on the computer never showed on the phone.
  - **An imported visit forgets the folder it names** (`mergeImportedSessions`
    clears `folderId`/`folderName`). That folder is where it came from —
    another account, or the folder deleted here before re-importing, now in
    the trash. Kept, the reconcile dropped the visit a few seconds after the
    import while its 44 MB video was still uploading (2026-10-12: "it loads
    and then the whole session disappears"). The media restore then finds the
    folder by name in Outputs (`getSessionFolder`), and a visit with no folder
    is never touched by the reconcile. The restore also covers the outcome's
    attachments (`en.fix.images`), which it used to skip.
- **The sidebar says which Google account and what Drive holds**
  (`refreshDriveInfo`, `#driveInfo`): "Compte: x@… · A Drive: N visites · M
  carpetes a Outputs · hh:mm", from Drive's `about` and the last load. Right
  version + nothing on screen has two causes — another account, or the app
  hiding what it found — and this line tells them apart.
- **`APP_VERSION`, shown in the sidebar** ("Versió …"), so a phone running an
  old copy out of its cache can be told from one with the fix. **Bump it with
  every change that goes out.**
  - Verified against a stand-in Drive: the real file + an empty duplicate +
    a phone holding one visit → all five visits, written into the big file,
    the empty one binned; Drive not answering → nothing created; an empty
    Drive → the first file is created.
- **The session folders in Outputs decide which visits exist**
  (`reconcileOutputs`, run by every `loadFromDrive`, so on opening and every
  30 s). The data-file merge keeps both sides' sessions, which suits edits but
  brought deleted visits back: the computer still had one deleted on the
  phone, saved it up again, and it reappeared everywhere. Now:
  - folder in the Drive trash → the visit is dropped on this device too;
  - folder unreachable (`driveFileInfo` null: another account's folder after
    an import, or a trash already emptied) → the visit stays, its `folderId`
    is forgotten and the next save finds or makes this account's folder;
  - reachable but moved out of Outputs by hand → left alone;
  - a folder in Outputs no visit points to → its `session.json` is read
    (once per page load, `outputsProbed`) and the visit comes back — that is
    how a folder restored from the trash returns. session.json is only as
    fresh as the last ☁ Desa of that visit.
  - visits with no `folderId` are not touched.
  - **A listing that fails or is cut short decides nothing.**
  - `deleteSession` leaves a note (`localStorage['fsl_v6_gone']`, id →
    folder id) so a visit deleted offline can't come back from the data file;
    the next pass bins its folder and the note keeps only the id. Importing a
    visit on purpose clears its note (`mergeImportedSessions`).
  - Verified against a stand-in Drive: trashed → gone (and the open visit
    closed), unreachable → kept with the id forgotten, no-folder → kept,
    deleted-offline → folder binned and gone, unknown folder → visit read
    from its session.json, second pass → no requests repeated, failed listing
    → nothing changed.
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

## New layout (test, 2026-10-11) — phone, and since then the desktop too
- **Behind a switch**: sidebar › 🧪 Disseny nou (or `?m2=1` / `?m2=0`),
  kept per device in `localStorage['fsl_v6_m2']`; `body.m2` when on. All of
  it lives under `@media(max-width:700px)`, so the desktop — and a phone with
  the switch off — is exactly what it was. Tablet in portrait gets it, in
  landscape doesn't.
- **Nothing new is wired to the app's logic.** Every phone control either IS
  an existing one laid out differently (the composer is `.input-bar` made a
  full-screen sheet; the report menu is `#expMenu` made full screen) or clicks
  one (`m2Side` proxies the top-bar buttons; "Més" clicks the hidden chips,
  `btnClose`, `btnSync`…). The session header is still rendered, only hidden,
  so those buttons exist to be clicked.
- Pieces: `#m2Title` (client, project · machine) with 🔍 and ⋮ in the top bar;
  counters on top (`.stat-bar` reordered) plus a line for earlier visits'
  pending items (`m2Pending`); the log full height, tap an entry to edit it
  (delete moved into the edit dialog, `#eDelete`, and session delete into
  Més); three buttons at the bottom (`.m2-quick`): **Foto** opens the camera
  and, if the composer is empty, adds the entry by itself through `addEntry`
  (which already waits for EXIF); **Entrada** opens the composer, severity as
  four buttons kept in step with `#sevSel`; **Veu** opens it and starts
  recording. Notes generals are a sheet of their own, from Més.
- **Back button**: each sheet (`m2Show`/`m2Hide`) pushes a history entry, so
  Android's back closes the sheet rather than leaving the app; going from
  Més to the report menu reuses the entry (`replaceState`). Dialogs opened
  from Més give the entry back. Ordinary dialogs don't take part yet.
- Every `.modal` is full screen with its `.modal-actions` stuck to the bottom;
  the lists that scrolled inside dialogs (`#mhBody`, `#folList`…) let the
  dialog scroll instead.
- Sidebar on the phone: + Nova visita on top, then the visits, the tools at
  the end in one scroll.
- **The ✕ that deletes a visit from the list** is a 40 px button in its own
  lane at the right of the row on any screen up to 700 px, switch on or off
  (`.sitem{padding-right:50px}`). It was an 11 px glyph on top of the red
  problem count, which on Android could be neither seen nor hit; the first
  version of the new layout had hidden it outright in favour of Més.
- **On a wide screen (>700 px) the same switch** brings the order across but
  folds nothing away — there is room: the sidebar, the filter and the composer
  stay. Counters move under the header (`.s-hdr` order -2, `.stat-bar` -1)
  with the earlier-visits line; a click on an entry opens it (delete in the
  edit dialog); severity is a 2×2 of buttons; the header's ✎, Tanca, ⟳,
  ☁ Desa and the five chips go into **⋮ Més** (`#btnM2More2`, same
  `openM2More` list as the phone, shown as an ordinary dialog). ↓ Informe
  went into Més too (2026-10-13), as on the phone: Més › "Informe i
  exportació" opens the same `#expMenu` dropdown, anchored under the Més
  button. General notes stay in the composer, so "Notes generals" is
  only in the phone's Més.
- The phone version was tried on the user's phone on 2026-10-11 and they
  prefer it. When it becomes the default, flip the switch's default and add
  it to the manual.

## Chrome's password manager and the Tag box
- **The Gemini key field lives in its own `<form id="gemForm">`.** Inputs that
  sit in no form are all one "form" to Chrome, so the key's password field
  made the Tag box above it in the page look like a username: on Android the
  password manager popped up there and covered the tag list. Isolated, there
  is no username to guess. `autocomplete="off"` on the tag inputs keeps the
  browser's own typing history from competing with the list as well.
- **The composer has a real select of the manual's conjunts** (`#tagSel`,
  beside the datalist), like the edit dialog's `#eTagSel`: a datalist barely
  shows on a phone and filters itself empty once anything is typed. It is
  rebuilt with the composer, so `renderContent` refills it every time
  (`fillTagTargets`) — `populateTagOptions` returns early when the manual
  hasn't changed. Only shown when the visit has a linked manual.

## Production tests (2026-10-12)
- **`session.prodTests[]`** — a run of the line over a period, recorded to
  validate it. A test on its own is a session of type **`production`** (TM
  "PRD", purple; RPT.types.production in ca/es/en), which opens straight onto
  its first test. Each test: `{id, name, product, nominal (u/h), start, end,
  running, counterStart, counterEnd, total, rejects, stops:[{id, start, end,
  kind: machine|external|planned, cause}], crit:{oee, avail, perf, rej} (%,
  blank = not checked), notes}`. Numbers are kept as typed strings; `ptNum`
  reads them (comma or dot).
- **`ptCalc`** (the only place the maths lives): planned time = end − start −
  planned stops; run = planned − machine/external stops; A = run/planned;
  P = units/(run h × nominal); Q = good/units; OEE = A×P×Q; reject = rej/units;
  average and running speed. Stops are clipped to the test's period. Units come
  from the counters when both are set. The verdict needs the test finished
  (start, end, units) and every criterion that was set met. A running test
  computes against "now". Verified against hand-worked numbers (A 90.5 %,
  P 96.5 %, Q 99.2 %, OEE 86.6 %).
- **Live**: ▶ Inicia (start = now, running), ⏸ Aturada (an open stop),
  ▶ Represa (closes it, focus on its cause), ■ Finalitza (closes any open
  stop, end = now, focus on the units). The clocks tick in place every second
  (`ptTick`) — the buttons are not re-rendered under the finger. Everything is
  also editable by hand; a time field only rewrites the stored time when it
  was CHANGED (the field has minutes, the clock wrote seconds).
- UI: `#pdBack` (the list: OEE/A/R/Q per test and a verdict badge) and
  `#ptBack` (the editor; full screen on the phone). Header chip `#pdChip`
  (hidden on the new layout, where it is in Més). Remembered criteria:
  `localStorage['fsl_v6_ptcrit']`. A performance over 105 % shows a warning —
  usually a wrong nominal speed.
- **The service report carries a compact SUMMARY, the validation report the
  full sheets** (2026-10-13; `ptSummaryRows`, `ptSummaryHead`, `ptPeriod`):
  one row per test — test, product, period, units, reject, A, P, Q, OEE,
  result — with a note pointing to the validation report. A visit can carry
  many tests, and a full sheet each swamped the service report. PDF
  (`pdfProdSection(…, full)`), Word and HTML (`ptReportHTML(…, full)`); the
  validation PDF passes `full`. New short labels in `RPT.pt` (period, units,
  availS/perfS/qualS/rejS, resultS, summaryNote), so translated tables are
  fetched again once.
- **Reports** share `ptReportData(t,R,lang,pdf)`: an HTML section
  (`ptReportHTML`), a PDF section (`pdfProdSection`, autoTable; ">= / <="
  because ≥ ≤ are not in the PDF font), a Word section and two Excel sheets
  (tests, stops; numbers as numbers, percentages as fractions) — the Excel now
  builds for a session with tests but no spare parts. The **validation
  report** is `buildPdfBlob(…,{validation:true})`: same header, meta and
  signatures, the tests instead of counters/log/photos; "📈 Informe de
  validació" in the export menu and the list, `RPT.pt.file` prefix
  (validacio_/validacion_/validation_, rebuilt by `fileSafe` for translated
  tables), and packed into the project ZIP.
- Labels: `RPT.<lang>.pt` (hand-written ca/es/en). Adding them changed the
  table's shape, so translated tables for other languages are fetched again
  once. Test names, causes and notes are not translated.

## Expenses (2026-10-19) — phase 1 of the expenses module
- **What it is for.** The user reports every expense of a trip on a company
  .xlsx (template not in hand yet). Phase 1 (this): capture the tickets and
  type their data. Phase 2: Gemini reads the ticket. Phase 3: review warnings
  (duplicates, dates outside the trip, a card that is not the company's).
  Phase 5: fill the company template (ExcelJS, which keeps the styles —
  SheetJS 0.18 drops them) plus a numbered PDF of the tickets, and a
  "Despeses" item in the ZIP pick list.
- **The user's rules.** Mostly the company card, some on the personal card
  (refunded, so totalled apart). Real expenses only: no per diems, no
  mileage. The ticket's own date is the expense's date; a trip runs from the
  first clock-in to the last clock-out, travel included. Currencies are kept
  as printed — no conversion for now. Only the user for now.
- **Behind a switch**: sidebar › 💶 Despeses (`#btnExOn`,
  `localStorage['fsl_v6_exon']`), per device, off by default, so the
  technicians the app is going out to don't see it. Off hides the chip and
  the Més item; the data stays.
- **`session.expenses[]`**: `{id, addedAt, date (YYYY-MM-DD), merchant, taxId,
  category (EX_CATS key), base, vatRate, vat, total, currency, pay
  (company|personal|cash|""), payAuto, last4, notes, checked, img:{type
  image|pdf, data (JPEG data URL), name, uploadStatus, qid, driveId}}`.
  Amounts kept as typed; `exNum` reads "12,50", "1.234,56" and "1,234.56".
- **Saved without touching `updatedAt`** (`exSet`: saveLocal + isDirty + the
  2 s Drive save, like the report language): the service report carries no
  expenses, and a new ticket must not make a signed report look changed.
  `modAt` is still stamped (new session object), so merges keep it.
- **The picture**: a photo is redrawn as a JPEG of at most 2000 px
  (`EX_MAXDIM`, quality 0.85); a PDF's first page is drawn with pdf.js
  (`exPdfPage`). Turning and cropping (`exTransform`, a box with four
  draggable corners, `#xeCrop`) work on that JPEG. The same JPEG — not the
  camera original — is what goes to Drive; a PDF goes up as it is.
- **Upload through the video queue**, kind `"tiquets"` → the visit's
  `tiquets/` folder: `mqAdd(sessId,img,blob,kind)`, `mqUpload(…,kind)`,
  `mqFind` also looks in `expenses[].img`. A turned/cropped ticket gets a new
  queue item; the old one is dropped, or sent to the Drive trash if it was
  already up (`exNewImg`). The sidebar counts videos and tickets apart
  (`mqNT`); `mqHere` tells a ticket waiting on this device from one waiting
  on another. Uploads start when the dialogs close and at every sync.
- **The company card's last four digits** (`fsl_v6_exlast4`) are kept in
  this browser only. In the editor, typing the ticket's digits sets "Pagat
  amb" (company if they match, personal if not) unless it was picked by hand
  (`payAuto`).
- UI: chip `#exChip` (hidden on the wide new layout, in Més there), list
  `#exBack` (totals by way of paying × currency, cards sorted by date, "PER
  REVISAR" until saved once), editor `#xeBack`. On the phone the dialog is a
  flex column, so the picture box needs `flex:none` or it collapses to 0 px.
- **Tested in the preview** (2026-10-19): photo → editor with the EXIF date,
  crop and turn (one queue item left, the cropped one), card digits →
  company / personal, PDF first page drawn, totals apart, reload keeps
  everything, delete drops the queue item, switch off hides it, phone layout.
  **Not tested**: the real upload to Drive (needs a sign-in) and a phone camera.

## Expenses — phase 2: Gemini reads the tickets (2026-10-19)
- **Several pictures per expense**: `expense.imgs[]` (phase 1's single `img`
  is read through `exImgs`, which also gives every picture an `id`; any write
  replaces it with `imgs`). Each picture may carry `doc`: bill | voucher |
  invoice | other | same. `mqFind` looks through `exImgs`.
- **The reading** (`exRead` → `exGemRead` → `exNormRead` → `exApplyRead`): all
  of an expense's pictures in ONE call (`gemAsk` now takes parts and a model),
  JSON out, every field checked (malformed → empty). Model `EX_GEM_MODEL`
  ("gemini-3.5-flash"); if the key does not have it (not found / 404) it
  falls back to `GEM_MODEL` for the rest of the page. **Untested against the
  real API** — the user's key is only in their browser; the pipeline was
  tested with a stubbed fetch fed the values read by hand from the user's 11
  Mexican tickets.
- **The user's rules in the prompt** (`EX_GEM_SYS`): the total is what was paid
  INCLUDING the tip (it goes on the sheet with it); "$" is not USD — the
  country decides (their tickets: pesos); dates day-first outside the USA,
  Spanish month abbreviations; the printed date beats the photo's EXIF date.
- `rd`: "" (never read) | "pending" (waits for key + connection) | "done" |
  "err" (+ `rdErr`); in flight = `exReading[id]`, never stored.
  `exReadPending` reads them one at a time — after a capture, at every
  `syncTick`, on `online`, when the list opens.
- **Hand edits survive a re-read**: on ✓ Desa, a field touched in the editor
  and different from `readVals` goes into `hand[]`; a reading fills the
  others. "✨ Torna a llegir" asks whether to read the hand ones too. A reading
  that lands with the editor open fills only the untouched inputs. Fields
  the model doubts (`read.doubt`) are orange until touched.
- **Joining** (`exSuggest`, shown on top of the list): "the same paper twice"
  = same date and total, ±2 min, same kind → "Treu la repetida" (drops the
  later one, its pictures leave the queue / go to the Drive trash); a bill
  and a card voucher of the same date, ±20 min, voucher between the bill and
  bill × 1.35 → "Uneix-los" (`exMerge`: name, legal name, tax id, tax and
  invoice from the bill; total, tip, card and pay from the voucher; tip =
  voucher − bill if not printed; both pictures). "No ho són" stores `noPair`.
  On the user's samples: 11 photos → 5 repeats dropped → 3 pairs joined → 3
  expenses (163,90 / 320,00 / 178,20 MXN), all on the company card.
- **Invoice to ask for**: `invoice:{needed, how, deadline, done}` when the
  paper says it is not a tax invoice; "CAL FACTURA" in the list until "Ja l'he
  demanada" is ticked in the editor.
- New editor fields: Hora, Raó social, Propina; "NIF / VAT / RFC".
- **Documentation photos** (2026-10-19, version · 3: "after Gemini has read
  the ticket, add other photos to document it all"): a picture with
  `extra:true` — "📎 Fotos de documentació" in the editor (`#xeAddDocIn`,
  images only, several at once, no `capture` so the phone offers camera or
  gallery). Named "Documentació …", queued to tiquets/ like the rest, never
  sent to Gemini (`exRead` filters them out, `exApplyRead` gives `doc` only
  to the read ones) and adding one does not set `rd` to pending. 📎 on the
  thumbnail; `#xeImgKind` moves a picture between ticket and documentation
  (to ticket → read again).
- **Two papers per expense, amounts from the card slip, no tip** (2026-10-19,
  version · 4, the user: "take the tip detail out; always at least 2
  documents per expense, the card slip and the receipt; the amounts from the
  card slip, and any new data on the receipt captured too, at least until I
  know the final format"). The tip field and every tip calculation are gone
  (old `tip` values stay in the data, unused). The prompt says the amounts
  come from the card slip, exactly as charged, never split. New fields read
  from the receipt: `address`, `ticketNo`, `concept` (what was bought),
  `other` (guests, nights, plate, flight… whatever has no field); `exMerge`
  takes them from the bill. `exMissing(x)`: "rebut" (no bill/invoice),
  "comprovant" (no voucher, unless pay is cash), or "doc" before reading
  while fewer than two non-documentation pictures → red badges in the list,
  a red box with the add buttons in the editor (`#xeNeed`), and a confirm on
  ✓ Desa.
- **No invoice flag** (2026-10-19, version · 5, the user: "I won't need
  invoices, in principle only the receipts and the card slips"): the
  "CAL FACTURA" badge, the editor's box, "Ja l'he demanada" and the prompt's
  `invoice` key are gone; an `invoice` already stored is ignored. The `docs`
  type "invoice" stays: an invoice received (a hotel's PDF) counts as the
  receipt.
- **File names and the counter** (version · 8, the user: "the tickets saved
  with the project number, the category and the first one with (1), a
  counter every time we save"; asked: one counter per visit, all of an
  expense's files share its number and end with what they are). On the first
  ✓ Desa an expense takes `no` = `exNextNo` (max of `session.exSeq` and every
  `no`, + 1) and `exSeq` is raised: never reused. `exNameImgs` names every
  picture "<project or client> <category> (<no>) comprovant|rebut|factura|
  document|documentació N.jpg|.pdf", in place and `autoName`, at every save.
  A queued file goes up with it; an uploaded one is renamed by
  `exRenamePass` (after the save and at every `syncTick`; `driveName`
  remembers what Drive has, so a rename offline is retried). Joining keeps
  the lower number. "/" in a category becomes "-" ("Taxi - VTC").
- **The tickets in the project ZIP, and renames that cannot happen**
  (version · 9, from the weak-points review). The ZIP left tiquets/ out:
  archive + delete, and after the trash's 30 days only session.json's
  reduced copies (a PDF: page 1 as a picture) were left. Now "💶 Tiquets de
  les despeses" in the ZIP pick list (`exp`, greyed without expenses): the
  folder's tiquets/ files, then every expense picture not yet in (Drive by
  id unless `driveGone`, this device's queue, the visit's data URL), missing
  ones in the lost-files warning. Without it, a visit with expenses is not a
  complete copy (`zipAt`). Renames: `exDriveRename` → "ok" | "gone" (404) |
  "later"; a gone file gets `driveGone` and is skipped (it used to stop every
  rename behind it at every sync), "later" stops the pass but keeps what was
  done. Neither path could be run in the preview (both need Google).
- **Pictures out of the synced data, expenses merged one by one** (version
  2026-10-20 · 1; weak points 2 and 5 of the review).
  - Each picture keeps only `im.th` (a 320 px JPEG thumbnail, ~15–19 KB) in
    the visit. The whole JPEG is in IndexedDB "exi:<id>" (`exStore`) and on
    Drive. `exFull(im,dl)` looks in this page's memory (10 kept), then
    IndexedDB, the upload queue, and Drive by `driveId` (cached after; a
    PDF's page 1 is drawn again).
  - `im.data` remains only when IndexedDB could not be written.
  - `exMigrate` (start-up and after every load) moves old data URLs out.
  - Measured: a test visit with 5 tickets went from 2,511,050 to 86,712 bytes.
  - Reading sends the whole pictures (`exGemRead(datas)`, docs matched by id).
    With none available yet, the expense waits 2 min (`exReadLater`).
  - The editor shows the thumbnail, then the whole picture.
  - Crop and rotate fetch the whole picture, and `exNewImg` gives the result
    a NEW id (the old IndexedDB copy is deleted as the new one is written).
  - The ZIP's fallback uses `exFull(im,false)`.
  - `exSet` stamps `xAt` on every changed expense and writes tombstones
    `session.exGone` ({id, at}, the last 500) for removed ones.
  - `exMergeVisit(winner, other)`, called from `mergeSessionLists` and from
    `loadFromDrive`'s merge (which marks the visit "ahead" when the result
    differs from Drive's copy): per expense the later `xAt` wins (ties: the
    winning visit), a tombstone always wins, `exSeq` takes the max.
  - `exDedupNos`: a number given twice goes, for the one given later
    (`noAt`, then id, so every device decides the same), to the next free
    number, and its files are renamed.
  - Tested by running the real functions, extracted from index.html, on two
    copies of one visit:
    - the phone's new expense was kept and so was its edit;
    - the PC's deletion stayed;
    - a duplicate (3) became (4) and was renamed;
    - the result was the same both ways;
    - identical copies came back unchanged.
  - A device still on version · 9 neither stamps nor writes tombstones, so
    during the changeover an expense it deletes can come back from another
    copy.
- **Half-made expenses and the provisional Excel** (version 2026-10-22 · 2).
  - `exAddFiles` lists each expense it starts in localStorage
    `fsl_v6_exwip` (`exWipAdd`) and takes it off once its picture is in
    (`exWipDone`). `exWipClean` (at start-up, before `exMigrate`) strips those
    still listed of their bare "loading" pictures (`exBare`: no th, data,
    qid or driveId), and removes, with a tombstone, the ones left with
    nothing typed. It only acts on this device's list: another device's
    placeholder, mid-capture, is synced too and must not be touched. Tested:
    this device's half-made one went, the "other device's" stayed.
  - `exSummary(l)` is shared by the list's table and the Excel.
  - `exBuildXlsx(s)` (SheetJS through `loadXlsxLib`) has two sheets:
    - "Despeses": one row per expense, every field; base, VAT and total as
      numbers; the documents' names; revisat. Dates are Excel day numbers
      with a dd/mm/yyyy format, counted in UTC so no time zone moves the
      day (version · 3). Version · 2 wrote them as date cells (t="d", ISO
      text): SheetJS read them back fine, but in the user's viewer the
      "Data" column was EMPTY. Keep the day number;
    - "Resum": the visit's header, then by category, the total and by way of
      paying, one column per currency.
  - The file name is `exXlsxName` = "<project> despeses.xlsx".
  - "📊 Excel" in the list (`#exXlsx`, only with expenses) saves it with
    `saveReport` (the visit's folder, or waiting on the device).
  - The project ZIP adds it (with "exp"), at the root.
  - Tested: the file read back with SheetJS (headers, a date cell of type d,
    a numeric total, the summary matching the screen). The ZIP part needs
    Google and was not run.
- **The summary in the list** (version 2026-10-22 · 1, the user: "the
  summary by category too, then the total; with different currencies and no
  conversion, different sums"). `#exSum` is one `.ex-tab` table with one
  column per currency (sorted), nothing converted. Rows: by category, in
  EX_CATS order, with "Sense categoria" last and the count in brackets; the
  Total; then a "Per forma de pagament" section (company / personal / cash /
  unknown; personal and cash marked "a retornar"). Expenses without a parsed
  total are left out and counted below the table. Checked in the preview at
  desktop and phone width with EUR + MXN.
- **Card warning; whole PDFs to Gemini** (version 2026-10-20 · 2).
  - **No trip check.** A check of the ticket's date against the trip (the
    visit's timesheet, else the calendar's EST/NAC days) was built and
    dropped the same day. The user: "simpler — I put the expenses on each
    project and that's it; no calendar, no clock-ins, no warning for an
    expense outside the trip". An expense belongs to the visit it is added
    to. Do not bring the calendar back into the expenses.
  - `exWarns(x)` → only "TARGETA DIFERENT" (pay = company but `last4` is not
    the company's). It is an orange badge in the list and `#xeWarn` in the
    editor, judged on the form's current pay/last4 and refreshed as they are
    edited. It never blocks ✓ Desa.
  - Whole PDFs: `exFileImg` keeps the original in IndexedDB "exp:<id>".
    `exPdfOrig` (IndexedDB, then the queue, then Drive) and `exPdfData`
    (≤ 15 MB) send it to Gemini as application/pdf; otherwise page 1 as
    before. The prompt adds "a PDF is ONE paper; read all its pages". The
    ZIP's fallback prefers the original PDF.
  - Found while testing: pdf.js rendering with the default intent waits for
    animation frames, so in a hidden page (the phone switched to another
    app) a PDF stayed "loading" for ever. `exPdfPage` now renders with
    intent "print".
  - Tested in the preview: the card warning (1111 with company), and a
    2-page PDF sent as application/pdf with its original kept, counting as
    the receipt.
- **The order the papers are shown in** (version · 7, the user: "the card
  slip always on the left and in the thumbnail, the receipt after it, the
  rest after the receipt"): `exShown(x)` sorts voucher → bill/invoice →
  other → documentation, stable, for the editor's strip, the picture opened
  first and the list's thumbnail. The STORED order is untouched: the
  reading's `docs` are matched to it. In the strip a bill is called "rebut".

## Session types
| Type | Abbr | Color |
|------|------|-------|
| Commissioning | COM | Blue |
| Maintenance | MNT | Green |
| Upgrade/Retrofit | RET | Amber |
| Production test | PRD | Purple |

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
- **One table header, day bars, thumbnails in Adjunts** (2026-10-17, after a
  mock-up the user picked). The per-day headings with a table each became ONE
  header (PDF: `drawHead`, drawn by hand, redrawn in `didDrawPage` on each
  continuation page, `showHead:"never"` on the per-day autoTables; Word: one
  table, `tableHeader` row; HTML: one `<table>`) and a slim grey day bar with a
  gold rule inside it (`drawDay` / a `columnSpan` row with `keepNext` / a
  `colspan` row). The PDF keeps a bar with its first entry (`estRowH`).
  Pictures (`attItems`: entry then outcome files; video = poster + play mark)
  go INTO the Adjunts column, two across (`ATT_TW`, column = two thumbnails),
  fitted whole on grey (`pdfThumb`), the file name wrapped under each, never
  cut — the user called the names important. Over `ATT_MAX` (12) or with no
  picture (voice notes) → a name line. The PDF books the room with blank lines
  in the cell, like the parts/outcome blocks; Word reads each picture's size
  first (`imgSize`) since ImageRun needs it. The PDF photo appendix stays ("for
  now") and reuses the same embedded image (`alias`), and no longer stretches
  photos out of shape.
  - **The HTML report has the appendix too** (2026-10-17: "the large photos
    don't show in the HTML"). `buildReportHTML` numbers each picture as it
    builds the rows (`shotLink` → `shots[]`), each thumbnail links to
    `#fsl-ph-N`, and a "Fotos" section after the parts lists shows them three
    across, 4:3, `object-fit:contain`, with time, file name and, for a video,
    its Drive link. Word has no appendix change (its own was already there).
- **Rates in u/h or u/min** (2026-10-18): each production test has
  `rateUnit` ("h" | "min", selector `#ptUnit` beside the nominal), and the
  nominal is TYPED in it; `ptCalc` turns it into per-hour, so every
  calculation stays per hour and only the display divides (`rateShow`; labels
  `pt.upm`). Switching the unit converts the nominal already typed. The Excel
  sheet uses u/min only if every test of the visit does. The machine counters
  have `counters.unit` (`#ctrUnit`, "Ritme de producció en"), used by
  `ctrDeltaText` for the units-per-machine-hour figure (`ctr.perMin`). New
  tests and readings start in the last unit used (`fsl_v6_rateunit`).
- **Voice notes in .m4a** (2026-10-17): `pickAudioMime` now tries
  `audio/mp4;codecs=mp4a.40.2` (AAC — opens with a double click anywhere, which
  matters once a note reaches a client in the Word+media ZIP), then
  `audio/mp4`, and WebM/Ogg only where MP4 cannot be recorded. The rest was
  already in place: `buildAudioAttachment` names an MP4 blob `.m4a`. Checked in
  Chrome 152: AAC in an `isom` MP4, plays back. Notes recorded before stay
  `.webm`.
- **…and the ones that slipped through** (2026-10-18: "the names don't follow
  the description"): Android's photo picker names files by number
  (1792319410611143361690826977666.jpg), which `camName` did not take for a
  camera name — it now also takes ten or more bare digits (not a part number
  like 3025.1478 or 6208-2RS, typed by hand). And names were only given on
  add/edit on the device where it happened, so files added before, or from a
  device still on an older version, kept the camera's: `renamePass` runs once
  per page after the first Drive load and renames, in OPEN visits only (closed
  ones' reports are out with those names), every file not `userNamed`/
  `autoName` that still has a camera name; the session object is replaced so
  the change is stamped and synced.
- **Media named after the entry** (2026-10-17): a file still carrying a camera
  name (`camName`: IMG_, VID_, PXL_, DSC…, a bare date, voice_/nota_veu…) is
  renamed `shortDesc(text,tag)` — the first phrase, its first four words minus
  articles/prepositions (`NAME_STOP`, ca/es/en), never ending on a number cut
  from its unit — numbered when there are several, extension kept
  (`mediaExt`; NOT `extOf`, which already exists for a different job further
  down and, being declared later, silently won). On add (`addEntry`) and on
  every edit save (the outcome's files from the outcome text, else
  "<entry> - resolt"); `autoName` marks ours so they follow later edits,
  `userNamed` (set in `rNames`) protects a typed name for good. Drive gets the
  name at once (`driveRename`) or when the upload finishes:
  `mediaUploaded` replaced the five `img.name=r.name` that wrote the camera
  name back — which also lost a hand rename made during the upload.
- **One order for the three report formats** (2026-10-17): header and visit
  data (+ entry counters), machine counters, GENERAL NOTES (moved up from the
  end: with ✨ Resum per dies they are the visit's summary), incidents summary,
  the log by day, parts replaced / recommended, production tests, signatures,
  and the photo appendix LAST, on a page of its own (PDF `addPage`, Word
  `pageBreakBefore`, HTML `break-before:page`). The notes keep their line
  breaks everywhere now — HTML `white-space:pre-line`, Word one paragraph per
  line; both used to run the day lines together. In the PDF the appendix
  moved out of the `if(!V)` block where `alias` was a block-scoped function
  declaration; it is a `var` now so the appendix still finds it.
- **Incidents in the report, and a new machine history** (2026-10-17, the
  user picked my recommendation from mock-ups: report A + C, history 1 + 2).
  - **Report — incidents summary** under the counters (`incidentRows` →
    `incCells`, drawn by `incidentsHTML` / `pdfIncSection` / the Word `incCh`
    table): this visit's problems and warnings in time order with their state
    ("Resolved dd/mm hh:mm", "Open", "Open · spare part recommended"), then the
    earlier visits' problems this one closed ("Closed dd/mm hh:mm", with
    "earlier visit · project"). Left out when there is nothing to list.
  - **Report — "closes an issue from the visit of…"**: `closesInfo(s,lang)`
    finds what each `entry.closes` points at in the other visits and prints it
    as a grey block in the closing entry's row, ABOVE its parts and outcome
    (PDF `X.refH` booked like the other blocks). That earlier text is
    translated with the report: `localizeSession` now also queues those texts
    and caches the translation on the OTHER visit's entry (`tr[lang]`), even
    when this visit is already in the report's language.
  - **Report — "resolved in 2 h 28 min"** (`resolvedIn`) appended to the
    outcome label in the three formats, only for an outcome that resolves.
  - **History — summary on top**: visits / open / resolved / open urgent
    recommended parts, then "Still open": every open problem or warning of
    every visit (this one included), oldest first, with project and age
    (`mhAgo`, red past 90 days).
  - **History — one timeline** of the visit cards (dot: gold = this visit,
    orange = something still open, grey = clear), replacing the separate
    "open on other visits" and "closed on a later visit" lists; each card
    keeps `mhCardIssues` and adds `mhClosedHere` (earlier problems closed on
    that visit), or "✓ all OK".
  - New labels in RPT ca/es/en (`incTitle`…`resIn`, `h.kOpen`…`h.ago`); the
    tables cached for the other languages are re-translated once.
- **Machine counters** (2026-10-17): `session.counters = {arr:{h,u,at},
  dep:{h,u,at}}` — hour meter and total-output counter on arrival and on
  leaving, numbers as typed (`ptNum` reads them). Edited in `#ctrBack`
  (`openCounters`, live sums in `ctrSum`; a number typed with no time takes
  now). `ctrPrev` finds the newest earlier visit of the machine with a reading
  (archived ones too: history records carry `counters`), `ctrDelta` gives
  hours/units/days, h/day and units per machine hour, and flags a counter that
  went down (replaced or reset). Shown in the header chip, the history cards
  (`mhCtrLine`: the reading and "↑ since the previous visit"), the reports
  (`ctrReport` → `ctrHTML` / `pdfCtrSection` / Word `ctrCh`, above the
  incidents summary) and the Excel session sheet. Labels `RPT.*.ctr`.
- **The machine-history file keeps archived visits** (2026-10-17: "I don't want
  to load every report again"). `field_service_log_history.json` (Drive root,
  next to the data file) + IndexedDB `history`: `{visits:{id:record},seen}`.
  A record (`histRecord`) is a visit's header, its counts and entry total, and
  only the entries that matter to the history — problems, warnings, entries
  with parts or `closes` — with their outcome, parts and cached translations;
  no media. `histSession` dresses a record as a visit (`_hist`, `_counts`,
  `_n`, `_range`, `_arch`); `machineSessions` returns the live visits plus
  the records not live, so the history, "still open", the entry's "closes an
  earlier problem" list and the reports' `closesInfo` (via `findAnySession`)
  all see archived visits. Touching an archived card opens its ZIP on Drive
  (`histOpenArchive`: `arch.id`, else the archive folder by
  `appProperties.fslSession`).
  - **Sync** (`histSync`, debounced by `histSchedule` from scheduleSave and
    after every Drive load/save): live visits write their records
    (`histUpsertLive`), the Drive file(s) are read and merged by `at` (the
    visit's `sStamp`), written back only when the signature changed;
    duplicates are folded into one. Offline it only updates IndexedDB.
  - **Delete**: `deleteSession` → `histForget`: a visit with `zipAt` keeps its
    record (marked archived; the archive now stamps `zipName`/`zipTo`), one
    never archived gets a tombstone `{del:true,at}` that wins over older copies
    and stops `histUpsertLive` resurrecting it.
  - **Backfill** (`histBackfill`): once per device after the first sync with an
    archive folder in reach (`fsl_v6_histfill`), and from 📁 Carpetes ›
    ↻ Reconstrueix. Reads the archive folder on Drive and, on the desktop, the
    local one; `zipMember` takes `session.json` out of each ZIP with three
    ranged reads (the end-of-directory tail, the local header, the member;
    stored or deflate-raw) — a 31 MB ZIP with a video costs ~70 kB. ZIPs
    already read are remembered in `hist.seen`. A visit live in the app is never
    replaced by its archived copy.
  - Tested in the preview: archive-and-delete keeps the visit in the history,
    report and closable list; delete-without-archive drops it; `zipMember` on
    STORE and DEFLATE ZIPs. Not yet tested against real Drive (ranged reads,
    the history file round trip, opening an archived ZIP).
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
  - **"📷 Còpia de les fotos al telèfon"** (sidebar, handheld only,
    `localStorage['fsl_v6_camcopy']`, off by default; `camCopy` in
    `wireCapture`): each photo taken through a capture input is also
    downloaded via `dlBlob`. A web page cannot make folders in Downloads nor
    write to DCIM/Camera, so the grouping the user asked for (a folder per
    client and project) is in the NAME: `<client>_<project or
    machine>_<yyyymmdd_hhmmss>[_n].<ext>`. Photos only — a video copy would
    double the phone's storage for something already on Drive.
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
  - Works without the archive folder too (tablet): the ZIPs go to Downloads —
    **but then nothing is deleted.** `exportSessionZip` sets `lastZipTo`
    ("arxiu" when the archive folder took the write, "download" otherwise),
    and only "arxiu" lets `archiveSessions` delete. A download is handed to the
    browser and the app never sees whether it arrived whole: on 2026-10-11 a
    project ZIP made on the phone reached Drive with 0 bytes (see `dlBlob`).
    The summary lists those as "Descarregades, però NO esborrades".
- **`dlBlob` revokes its object URL after 60 s, not straight after the
  click.** Desktop Chrome copies the blob on click; Android's download manager
  fetches it later, and a URL already revoked gave a file with the right name
  and zero bytes — every download on the phone, reports included.
  - **`deleteSession` never trashes a Drive folder another session still
    holds** (`folderId`). Two visits used to share a folder by name; binning it
    for one would have taken the other's photos with it.

- **The project ZIP goes to Google Drive by default** (2026-10-12;
  `arxMode`, `driveArxFolder`, `saveToDriveArxiu`, `driveUploadZip`,
  `listDriveArxiu`). Through the API, into the Drive of the signed-in
  account — so it follows the account, works on the phone and tablet, and is
  a write the app can verify: the upload reply's `size` must equal the blob's
  or it counts as not arrived (a short new file is binned) and the ZIP is
  downloaded instead. `lastZipTo` is "arxiu" for it, so bulk archive may delete.
  - Resumable, in 8 MB pieces, with "Pujant a Drive N %" on the export
    button; 308 + `Range` moves the offset on.
  - Same session + same name → the file is REPLACED (resumable PATCH);
    another session's file of that name → `_2`, `_3`… The owner is the
    `appProperties.fslSession` the app writes on upload, so nothing is
    downloaded to find out.
  - **drive.file**: the hand-made `Arxiu` folder is invisible, so it is
    pointed at once with the Picker (`pickDriveArxFolder`, FOLDERS view,
    `setSelectFolderEnabled`), which hands the app that folder; or one is
    made (`makeDriveArxFolder`). Stored in `localStorage['fsl_v6_arxdrive']`
    ({id,name}); unreachable (other account) → forgotten and asked again on
    the next export — asked while the export's click is fresh.
  - The listing for "Tria què carregar" only shows ZIPs the app wrote (or was
    handed); "＋ Altres ZIP de Drive…" opens the Picker for older ones. Listed
    files are stand-ins (`_drive` id) that `importFiles` downloads only when
    their turn comes (`driveStandInToFile`).
  - **The computer's folder stays as a choice** (`localStorage
    ['fsl_v6_arxmode']` = "local"), used only when chosen AND `fsaOK()` AND
    `arxDir`; otherwise Drive. The dialog is now "📁 Carpetes", archive
    choice first, the photo-dialog folder second.
  - Verified against a stand-in Drive: 20 MB in three pieces with progress,
    same session replaced, other session `_2`, a short upload refused, the
    listing and a stand-in turned back into a File. The Picker itself needs a
    real sign-in and was not exercised here.
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
- **Replaced or recommended** (2026-10-17): every part carries `st` —
  `"fit"` replaced on this visit, `"urg"` recommended soon, `"prev"`
  recommended as preventive. A part with no `st` (everything saved before) is
  `"fit"`: the machine history already called them all "fitted". `partSt(p)`
  is the only reader.
  - **Set where the part is added.** The drawing's quantity panel has three
    buttons instead of "✓ Afegeix" (one tap adds AND says what it is); the
    last one used is highlighted and Enter repeats it (`lastPartSt`, session
    memory only). The typed-in form has a selector, and the edit modal a
    selector per row.
  - **Reports**: each entry's parts table gets a STATUS column (long label,
    `R.pstL`; the PDF measures it per entry, so an all-replaced list gets a
    narrow one). After the entries, `partsSummary(s)` feeds two lists summed
    by reference — replaced, and recommended summed by reference AND priority,
    urgent first, with `R.recNote` explaining the two (`partsSummaryHTML`,
    `pdfPartsSection`, the Word block after the day tables). The client's
    report is the client's copy of the recommendations.
  - **Excel**: sheets Session, Recommended (priority, qty, ref, designation —
    what goes to the company to quote), Replaced, Detail (+ Status column).
  - **Machine history**: "fitted" lists only `fit`; a new list shows each
    recommended part (latest recommendation per ref), done (✓ "replaced on")
    once the same ref is fitted on a LATER entry; open urgent first.
  - Labels added to RPT ca/es/en (`st`, `prio`, `pst`, `pstL`, `partsFit`,
    `partsRec`, `recNote`, `x.sFit/sRec/st/prio`, `h.rec/recOn/fitOn`). Label
    tables cached for the other 26 languages no longer match `sameShape` and
    are re-translated once, at their next export.
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

## The log, grouped by day (2026-10-13 — the app, then the reports)
The same information as before, laid out as a work diary (option C of three
the user was shown): `renderLogArea` puts a `.log-day` heading before each
day's entries — weekday and date, the number of entries and that day's own
counters (■ ▲ ✔ ●, only those not zero) — and each entry shows only its time.
The heading is `position:sticky`, so the day stays in view while its entries
scroll past. An outcome's time drops the date when it is the same day as its
entry.

The reports followed the same day (PDF, Word, HTML): a heading per day —
weekday in the report's language (`reportDayTitle`, `toLocaleDateString`),
then "N entries · Problems n · Warnings n · Resolved n · OK n" in words, not
symbols (`reportDaySummary`; ■ ▲ are not in the PDF font) — and one table per
day with an "Hora / Time" column (`R.time`) holding only the time
(`timeOf`) and the photo tag. `dayGroups(entries)` gives each day's run of
indices: the PDF draws one autoTable per day through `drawEntries(G)`, whose
callbacks map the row back with `G[d.row.index]` so the parts table and the
outcome block still land in the right cell; Word builds one table per day
under a `keepNext` heading. An outcome's time drops the date on the same day
(`fixWhen`). The time column is measured on "00:00:00", so the description
gets a little more room. New labels `time`, `entry1`, `entryN`, `noDate` in
RPT (translated tables re-fetched once). The PDF's "Fotos" heading now only
goes where its first row of photos fits — it used to sit alone at a page foot.

## Signature size (2026-10-13)
Signatures were taking up too much of the page. Now, everywhere they are
drawn: report and validation PDF — box 14 mm high, image at most 45 mm wide
(`sigH`, `SIGW`); timesheet PDF — box 16 mm (`boxH`), image at most 45 mm;
Word — row 14 mm (`SIG_MM`), image at most 42 mm; HTML — at most 170 × 44 px.
Always at the signature's own proportions. The Word image had also been sized
in points where docx wants 96-dpi pixels, which made it a quarter smaller
than asked; fixed.

**Same layout everywhere (2026-10-17).** The ink sits just ABOVE the rule,
never on it — the HTML pulled it 2 px over the line and hid it, and the
timesheet PDF put it right on the line; now the PDFs keep 1 mm clear, Word has
57 twips after the image, and the HTML holds it in a 48 px box with 3 px
padding. Under the rule, in the PDF, the timesheet, Word and HTML alike: the
label in grey, then the name in bold on its own line (the PDFs and Word used
to print "Label — Name" on one line). The timesheet's date moved one line down.

**The timesheet's date is the day it was SIGNED** (2026-10-17). It used to be
`generatedAt`, the moment the sheet was saved, so saving or re-exporting it a
week later re-dated the client's signature. Now `timesheet.signDate`: a date
field (`#tsSigDate`) beside the pads that the first stroke on either pad sets
to today (`pad.onInk`), unless it was typed by hand (`tsDateHand`). It prints
under a signature made on the glass, or under both lines when there is no
on-glass signature but a date was typed (signed on paper). Sheets saved before
it fall back to `generatedAt`'s day if they were signed (`tsSignDate`).

**A month on one page** (2026-10-17). `buildTimesheetBlob` shares the room
between the visit data and the signature block (`sigRest`, minus the remarks
and the gaps) among the rows + totals row: the vertical padding shrinks from
1.8 mm to as little as 0.5 mm, then the type from 7.5pt to no less than 6pt.
A short sheet keeps the old spacing. 31 days with all columns, four wrapped
destinations, three lines of remarks and both signatures fit on one A4.

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
- **One name for a project: `projName(s)` = CLIENT_PROJECT_MACHINE** (sanitised,
  empty fields left out, `sessio` if all three are). Project before machine
  since 2026-10-12 — it was client_machine_project: folders on Drive are
  renamed to the new order on their next save; report bases frozen at Rev. 01
  keep the old one; old ZIPs keep their names, so a re-archive under the new
  name sits beside them instead of replacing them. It is the Drive session
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
- **No share button.** A "✉ Comparteix" bar (Web Share API, offered after
  every download) was built and then removed on 2026-10-10 at the user's
  request: they download the PDF and send it themselves. Don't bring it back
  unasked.
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
  - Cached by the service worker for offline export — see "Service Worker CDN whitelist"
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

### Service Worker: CDN libraries are cached for offline export (2026-10-17)
Until 2026-10-17 `sw.js` returned early for every cross-origin request, so
jsPDF, autoTable, docx, xlsx, jszip, pdf.js and the PDF fonts lived only in the
browser's HTTP cache: at a plant with no signal a report could fail to export
("No s'ha pogut carregar la llibreria PDF"). Now:
- **Own cache, `fsl-libs-1`**, separate from the shell's `fsl-vN` and kept by
  `activate`, so publishing the app doesn't re-download megabytes. URLs pin
  their version; a version change is a new URL. Bump `LIBS_CACHE` only to purge.
- **Cache-first for unpkg.com, cdn.jsdelivr.net and cdnjs.cloudflare.com**
  (`responLib`); a miss is fetched by the worker in **CORS mode** (`baixaLib`)
  so its status is readable and an error is never stored — a `<script>` asks
  no-cors, whose opaque reply could be a 404 kept forever. All three CDNs send
  CORS headers, and a script runs from that reply all the same. A failed fetch
  falls back to the original request, so the loaders' URL fallbacks still work.
- **Precached on request from the page** (`postMessage("libs")` after
  `serviceWorker.ready`; `precarregaLibs` fetches only what is missing). Not at
  install/activate: while those run the worker doesn't serve the page, and a few
  MB on poor coverage would hold it up. `LIBS` lists each loader's FIRST URL —
  keep it in step when a library or font URL changes in `index.html`.
- Google (auth, Drive, Gemini) is still never intercepted.
- Verified with Playwright and a stand-in CDN: online open → jsPDF, autoTable,
  docx cached; offline reload → all three served from the cache, a PDF with an
  autoTable built and docx loaded; URLs the stand-in answered 404 were not
  stored and were asked again on the next open.

### Auth + file:// restriction
Google OAuth does NOT work from `file://` URLs.
App must ALWAYS be opened from `https://txals13.github.io/field-service-log/`

### Auto-sync wipes unsaved input — so hold the REDRAW, not the sync
Background sync calls `renderAll()`, which rebuilds the visit's DOM and would
throw away whatever is being typed. The first answer was to skip the whole
sync while `hasUnsaved()` (focus in an INPUT/TEXTAREA/SELECT, text in the
composer, pending photos, the edit dialog open, a recording) — and on the
computer the cursor nearly always sits in the description box, so the sync
never ran at all: a visit imported on the phone never reached the computer's
screen (2026-10-12). It also skipped while `isDirty`, so one failed save
stopped syncing for good.

Now (`syncTick`, `scheduleSync`):
- every 30 s it ALWAYS syncs: `saveToDrive()` if there is something to save
  (it reads and merges first, so it syncs too), `loadFromDrive()` otherwise;
- while something is being typed it redraws only the sidebar and sets
  `redrawPending`; the first `focusout` that leaves nothing unsaved redraws
  the rest;
- it also runs on `visibilitychange` → visible and on window `focus`
  (throttled to one every 5 s): a phone app's interval does not run while it
  sleeps, so coming back to it waited up to half a minute.
- **Staying connected to Google** (2026-10-18: "don't disconnect while I have
  a visit open"): the hour-long token used to sign the app out on expiry
  (`getToken` cleared it, `isLoggedIn=false`, red bar). Now expiry only sets
  `needRenew` (orange ● Drive, `refreshSyncDot`); `isLoggedIn`, the data-file
  and root ids stay. A capture-phase `click` listener renews with one shared
  token client (`tokClientGet`, `renewToken`: prompt "", `login_hint` = the
  account, now remembered in the stored token as `email`) when the token is
  out of date or in its last 5 minutes — Google only opens that window from a
  tap. `ensureToken` waits for a renewal in progress, returns null (no popup
  out of the blue) when connected but stale, and only opens the full sign-in
  when not connected at all; `syncTick` skips while stale. Boot with a stored
  but expired token = connected + `needRenew`. A failed renewal shows the
  Reconnecta bar; only "Tanca la sessió" signs out. Tested against a fake
  GIS: renewal on tap, near-expiry renewal, failure → bar, boot state.
- **Playing a video from Drive** (2026-10-18: "a window opens and nothing
  loads"): the player's `src` was Drive with the token in the URL
  (`driveStreamUrl`, `?access_token=`); a refusal or an undecodable file (HEVC,
  common in slow motion) left it black and silent. `openDriveVideo(id,name)`
  fetches `alt=media` with the Authorization header, shows the progress in
  `#mediaVidSt`, plays an object URL (cached in `vidCache` for the page's
  life; aborted if the viewer is closed), and always shows `#mediaDrive`
  ("Obre'l a Drive" — Drive's player transcodes any format). A `<video>` error
  replaces the black box with that advice. A video still in `fileCache` (just
  added here) plays straight from memory. `.media-modal` is a column now so
  the message and the button sit under the video. `driveStreamUrl` remains
  only for voice notes with no local copy.
- **Videos come from the gallery, and big files go up in pieces**
  (2026-10-18): the 🎥 buttons (composer, edit, outcome) lost `capture` and
  gained `multiple` — the browser's recorder has no slow motion and leaves no
  copy on the phone, so a video whose upload failed was gone; now the phone's
  camera app records it into the gallery and 🎥 picks it. `driveUploadBlob`
  (all media) sends anything over 8 MB in resumable 8 MB pieces; a failed
  piece asks Drive how far it got (`Content-Range: bytes */N`) and goes on
  from there, up to four failures in a row with a growing pause — the single
  PUT never got a long video through a phone connection. Tested against a
  fake Drive dropping one piece of a 20 MB file.
- **.html from Drive opens as a page** (2026-10-18): the folder dialog's ↗ and
  the "saved" note used Drive's viewer, which shows an .html as source and
  offers "Open with Google Docs" — the route by which the .gdoc above got into
  the folder. `openDriveFile(id,name)`: an .html is fetched (`alt=media`) and
  written into a tab opened synchronously on the tap (so no popup block;
  `document.write` rather than a blob URL, which also works in the installed
  app on Android); anything else still goes to the viewer.
- **The data file is looked for in two places only** (2026-10-18: "the data
  file shows up as (1)"): the "(1)" in G: was Drive for desktop's local name
  (the previous file, being binned, still held the name when the new one was
  made); on Drive there was one live file with the right name. But
  `listDataFiles` fell back to searching ALL of Drive when the app's folder
  had none, and an old June sample file (10 visits) sat in
  `Field Service Log/data/` — one empty listing and it would have been merged
  back in. The fallback now looks only at the top of My Drive
  (`'root' in parents`), where the first versions kept it. The `data/`
  folder was sent to the Drive trash with the user's OK. Seven earlier data
  files are in the trash, three of them "[]" (10-11, 10-12, 10-18 20:22):
  the duplicate merge worked each time; what made a second file is not known.
- **No manual in the validation report** (2026-10-18): the PDF header's
  "Manual" row is added only when not `V` (validation) — the spare-parts
  manual has nothing to do with a production test. Checked with the real
  P-2026-171: the validation PDF has no manual row, the report keeps it.
- **Drive links from the app, local links in the ZIP** (2026-10-18: "only when
  the ZIP is archived do the links look locally; working in the app, the
  exports link to Drive — both with the folder layout already set"): the
  builders take `opts.local` (`buildReportHTML(..,opts)`, `buildPdfBlob`,
  `buildDocxBlob`/`buildDocxDocument`); `mediaHref(im,local)` = `mediaRel`
  (photos|videos|audio/<name>) or `driveView(driveId)`. Only
  `exportSessionZip` passes `{local:true}` (the ZIP's PDF, HTML and Word,
  both packs); the PDF's Launch rewrite (`pdfBlobLocal`) runs for that copy
  only. The layout is the same in both: a photo's name → its appendix copy,
  the appendix photo and video/voice names → the file. Tested both: the
  app's exports (Drive URIs in HTML/PDF/Word, GoTo to the appendix) and a
  temporary copy forced to local (relative links, 3 Launch actions, Word
  relative targets).
- **Videos wait in a queue** (2026-10-18: "offline videos don't go up — fine,
  but I want to pick the video and have it wait in a queue"): a picked video
  used to be held only in memory (`fileCache`) and, not signed in, refused.
  Now `handleFiles` keeps it in IndexedDB first (`mqAdd`: blob at
  "mq:<qid>", the list under `mediaQueue`; `navigator.storage.persist()`
  asked), the attachment carries `qid` and uploadStatus "queued" (⏳, orange
  `.thumb-up.queued`); the entry can be saved as soon as it is kept, and the
  upload is tried straight away if there is a connection. `mqFlush` (each
  `syncTick`, the `online` event; the count is read at start-up) uploads
  each queued one (`mqUpload`, never twice at once — `mqActive`); success →
  `mediaUploaded`, the qid goes, the blob is deleted and the list keeps
  `{done:{driveId,name}}` until no visit carries the qid — so a stale copy
  of the visit swapped in by a sync still gets the id, without a second
  upload. Not found for a day (entry never saved, video taken out) →
  dropped; taken out of the composer → dropped at once. A queued video plays
  from the queue (`mqBlob`); on another device its ⏳ says it is waiting on
  the device that added it. The sidebar shows "⏳ N vídeos a la cua". The
  manual Drive sync no longer counts a queued video as lost. Tested in the
  preview (offline pick → ⏳, kept across a reload, played from IndexedDB)
  and in a sandbox (failed upload stays queued; upload once, blob gone, list
  cleared; the stale-copy race; the one-day clean-up).
- **No ZIP inside the archive ZIP** (version 2026-10-23 · 4): the earlier
  revisions step copied every file at the folder's root, and the "Word +
  multimèdia" pack saved there (31 MB) rode along in A.V_12345_1111's
  archive (73 MB, photos and videos twice). Root files ending in .zip are
  skipped now.
- **…one document at a time, chosen first; first in the list** (version
  2026-10-23 · 3, the user: "on Revisa i signa I want to choose report or
  timesheet, each on its own; Revisa i signa first in the list").
  - `openReviewSign`: a visit with a timesheet gets `#pvPickBack` (📄 Informe
    / 🕒 Full d'hores, each with "signat" / "sense signar"); without one, the
    report opens straight away. `openReview(kind)` builds that one document
    with its pads (`pvShow`); "Desa i genera el PDF" makes that document's PDF.
    `pvPartTitle` is gone.
  - The entry is "Revisa i signa" and comes first: the top row of the
    ↓ Informe menu (above Revisions…), and the first item of the new
    layout's list, noting "informe signat · full signat" (`tsSigned`).
  - Tested in the preview with P-2026-140: the chooser from both menus,
    each document alone with its own pads.
- **…the same entry for the hours; the timesheet form as it was** (version
  2026-10-23 · 2, the user: "Revisa i signa l'informe should also review and
  sign the hours; the timesheet must stay as before").
  - The timesheet form, its code (`openTimesheet` … `tsCommit`), `tsPads` and
    the #tsSigGrid CSS were restored verbatim from 1a15a10: pads, names and
    sign date are back in the form, and `openTsSign` and the form's button
    are gone. `tsInitPad`'s proportions fix stays.
  - The review screen is built per document now: `openReportSign` shows the
    report with its pads, then, if the visit has a timesheet, the sheet's
    PDF pages (`pvRenderPdf`) with its pads and sign date
    (`pvPadsEl(kind,…)`: ids `pvSig_<tech|cli>_<rep|ts>`, `pvName_…`,
    `pvDate_ts`; `pvInitPads` after layout). `pvCommit` saves each part;
    "Desa i genera els PDF" makes the timesheet first, awaited, then the
    report — two reports saved at once could race on the offline queue.
  - Tested with P-2026-140: both parts shown, all four pads signed, both
    PDFs with the new signatures and the sheet dated 23/10/26; the
    timesheet form has its pads and no review button.
- **Review and sign** (version 2026-10-23 · 1, the user: "first I want to see
  the report, to show it and explain it a little, and if they agree, sign it
  in that same view; then generate it with the signatures. The hours the
  same. Unsigned, I still want to generate them").
  - One screen, `#pvBack` (replaces the report's old `#rsBack` box and the
    timesheet form's own pads): the document in a scrolling view, then the
    two pads, "Desa la signatura" and "Desa i genera el PDF".
  - Report (`openReportSign`, from ↓ Informe › Revisa i signa… and the new
    layout's menu): same gates as an export (`ensureLabels`,
    `ensureRevision` — the signature belongs to the revision), then
    `reportSession` and `buildReportHTML` into a srcdoc iframe; its own
    `.sig` block hidden; the iframe grows to the report's height so one
    scroll runs to the pads; a click on an in-report anchor (photo name →
    appendix) scrolls the outer view. Saved with `setRevSign`.
  - Timesheet (`openTsSign`, from the form's "👁 Revisa i signa", which
    commits first): its PDF (`localizeTimesheet` + `buildTimesheetBlob`)
    drawn page by page with pdf.js; the sign date row is shown, filled with
    today on the first ink unless typed. Saved onto `s.timesheet` with
    saveLocal (not scheduleSave: signing does not mark the visit edited).
    With the calendar not loaded, a sheet already saved is opened as is.
  - `tsCommit` no longer reads pads: the signatures stay with the sheet
    unless rows, remarks, columns or language changed — then a confirm, and
    they are cleared.
  - `tsInitPad` draws a stored signature at its own proportions, centred
    (it was stretched to the pad, and re-saved distorted).
  - Exports never needed a signature and still don't.
  - Tested in the preview with the real P-2026-140: the report shown and
    scrolled to the pads, signed, PDF with both new signatures; the sheet
    shown as its PDF, signed by the client only, PDF with that signature and
    "Data: 23/10/26" under it.
- **session.json is a choice too** (version 2026-10-22 · 4, the user: "I want
  to choose whether session.json goes into the zip; the company I send it to
  doesn't need it").
  - `ZP_ITEMS` gets `json` first, ticked by default (a key missing from the
    stored choice reads as true); the fixed "always" row is gone.
  - `exportSessionZip` writes session.json only when `want("json")`, and
    zipAt needs it as well as the media, the receipts and the revisions —
    without it the ZIP cannot be imported, so it is no copy to delete by.
  - The picker's note says so when it is unticked. Archiving and the delete
    dialog still make the whole ZIP (no pick).
  - Tested in the preview: the row, the two notes, the choice remembered.
- **Choosing what goes into the project ZIP** (2026-10-18: "choose which files
  to export to the .zip, I don't always need the .docx or the .xlsx"): the
  menu's ZIP opens `#zipPickBack` (`openZipPick`) — PDF, Word, HTML, Excel,
  validation PDF, timesheet, media, earlier revisions, manual; session.json
  always, shown ticked and disabled; items the visit lacks are greyed; the
  choice is kept in `fsl_v6_zippick`. OK → `exportSessionZip(s,"project",
  pick)` from that tap (the permission prompts need a gesture). `want(k)` is
  true for everything when no pick is passed — archiving and the delete
  dialog's "export now" still make the whole ZIP. zipAt (the delete dialog's
  "complete copy") is stamped only when the media AND the earlier revisions
  went in: those cannot be rebuilt from session.json. Tested the dialog in
  the preview (greyed items, note, remembered choice, hand-off to export).
- **The PDF's entry table fitted again** (2026-10-18, the P-2026-171 Rev. 05
  PDF: "the format is wrong"): with the thumbnails gone, the Adjunts column
  was still sized as text that never wraps (up to 50mm, shrunk), and the
  per-entry parts table used the long status labels ("Petició de
  cotització", "Recomanat · preventiu") — the name column was left ~2mm wide,
  names broken letter by letter and "RECANVI" over "ESTAT"; the outcome's
  heading ran out of its box. Now: `entryColWidths` gives the attachments
  7.5pt, as wide as the longest name up to 36mm, and longer names wrap (the
  link rectangles follow the same wrap); the entry's parts table (PDF and
  Word) uses the short `R.pst` labels and a reference column as wide as its
  references (≤30%); the PDF wraps the outcome heading (`X.fixHead`). The
  summaries at the end keep the full wording. Re-checked with the real
  P-2026-171 data.
- **Names only; a photo's name goes to the appendix, the appendix photo to
  the file** (2026-10-18: "no thumbnails of photos or videos, only the names;
  the names take you to the photo at the end, and clicking that photo opens
  the file in its folder"): the Adjunts column is text in all three formats —
  `attHasPics`, `imgSize`, the ATT_* sizes, the PDF's `attL` thumbnail
  drawing and Word's thumbnail table are gone; the column is sized by its
  names. The appendix photos are gathered before the table (`shots`,
  `shotOf` img → index). HTML: a photo's name links `#fsl-ph-N`; the
  appendix photo and its caption name link the file (`mediaA`). PDF: column 4
  text is blue; in `didDrawCell` a video's or voice note's line gets its
  relative link (→ Launch), a photo's line is queued in `toShot` with its
  page and rect, and once the appendix has drawn (each shot records `page`
  and `top`) those become GoTo links (`{pageNumber, top}`) — added with
  `doc.setPage`, then back to the last page. Word: photo names are
  `InternalHyperlink`s to a `Bookmark` "fslphN" on the appendix photo's time
  line; the appendix image sits in an `ExternalHyperlink` to the file, as
  does its name (`attRun(a,size,toFile)`). Checked: HTML anchors and ids
  match; PDF 2 GoTo + 3 file links on page 1, 2 file links on the appendix,
  xref exact, no thumbnails; Word anchors = bookmarks, 2 hyperlinked
  drawings.
- **…and they open from their own folder, never from Drive** (2026-10-18:
  "I don't want them opened from Drive; from their own folder, the paths are
  the same, so they can be checked offline"): every link is `mediaRel` now —
  `driveView`, `data-drive`, the HTML script, "↗ Obre a Drive" and Word's
  `{local}` option are gone. HTML and Word link the relative path. The PDF:
  jsPDF only writes URI actions, and Chrome/Edge's viewer prefixes a
  scheme-less URI with https://, so `pdfBlobLocal` rewrites the finished file:
  `pdfLaunchLinks` turns each `/S /URI /URI (photos|videos|audio/…)` into
  `/S /Launch /F <</Type /Filespec /F (latin-1 name) /UF <UTF-16BE>>>
  /NewWindow true` and shifts every xref offset after it by the bytes added
  (and startxref), checking the table's shape first; anything unexpected →
  the jsPDF original. Acrobat Reader and most desktop viewers follow a Launch
  (after asking); Edge/Chrome follow nothing. `mediaRel` also encodes
  ( ) ' ! * so a name like "foto (1).jpg" cannot end the PDF string. Checked
  with PyMuPDF: not repaired, all 23 xref offsets land on their "N 0 obj",
  five Launch links with the right names (accents, parentheses).
- **Videos by name, and files that open from the report** (2026-10-18: "no
  video thumbnails, only the names of the video files in the folder, and open
  in Drive; reading a report from the ZIP, open the videos and photos if
  possible"): `attItems` gives a video no picture (`src` null) and drops a
  video with no driveId (not in the folder, not in the ZIP); every format
  lists videos by name only, and the photo appendices take photos only.
  `attLine` is the one "» name / • name" text. Links: `driveView(id)` and
  `mediaRel(im)` = `photos|videos|audio/<encoded name>`, as laid out in the
  folder and the ZIP. HTML: `mediaA` makes each name (and each appendix
  photo) a relative link with `data-drive`; a small script at the end sends
  the click to Drive unless `location.protocol` is `file:` — so from the
  unzipped archive or the Drive-for-desktop folder the file beside the report
  opens, from Drive or the in-app viewer (about:blank) the Drive copy does;
  videos also get "↗ Obre a Drive". PDF: Drive links (`doc.link`) on the
  thumbnails, the names (blue) and the appendix — not relative ones: Chrome's
  and Edge's PDF viewers turn a scheme-less URI into https://…. Word:
  `ExternalHyperlink` per name (`attRun`); `buildDocxBlob(..,{local:true})`
  for the copy inside the project ZIP links to the relative path, other
  copies to Drive. Tested with the real builders in the preview (links in all
  three, no video pictures, the un-uploaded video left out, PDF rendered).
- **A fourth part status: the client's quotation request** (2026-10-18:
  "another category for spare parts: the client asks for a quotation"):
  `st:"quo"` (💬 Cotització, blue). Not replaced and not our recommendation,
  so `partIsRec` (urg/prev) replaces `!=="fit"` where "recommended" is meant:
  `partsSummary` returns `{fit, rec, quo}`; the HTML, PDF and Word reports get
  a third block (`partsQuo` + `quoNote`), the Excel a "Cotització" sheet
  (`x.sQuo`) after Recomanats; the incidents' "spare part recommended" flag
  and the machine history's recommended list leave quotes out. New labels in
  ca/es/en; other languages' cached tables no longer match RPT.en's shape and
  are translated again on the next export (`sameShape`). The pick panel puts
  the 💬 button next to 🔧 Canviat, before "Recomanat:". Tested the summary,
  the HTML block and the PDF section with real jsPDF.
- **A whole assembly as one part** (2026-10-18: "spare parts: whole
  assemblies, showing only the name and reference, not the list of
  pieces"): each subgrup of the catalog is one drawing = one assembly with its
  own reference (`sg.num`), and its conjunt has one too (`c.num`). In pick
  mode the drawing viewer shows a `#drawSets` bar (`renderDrawSets`, on every
  page render) with "📦 Conjunt sencer" for the drawing(s) owning the page
  (`viewerOwning`, factored out of `resolvePartByPos`) and for their conjunt
  when its reference differs. A tap goes through `confirmAndAdd` like a Pos:
  `setRowOf` builds `{pos:"", ref, cant:"1", denominacio, conjunt, grup,
  page, set:true}`; in text mode it writes "name - ref". `set` is kept on the
  part and in the history record; the app shows 📦 before the name; the
  reports, Excel and summaries need nothing else (name + ref, no Pos).
  Tested with the real 180 catalog (pages 3, 13, 15).
- **An archive that carries its media, and an import that finds it**
  (2026-10-18: "after importing a .zip I can't play the videos — it says I
  have no Drive access"): P-2026-171's archive ZIP was made while its folder's
  contents sat in the trash (the trash fallback since fixed), so the folder
  listing was empty and the ZIP went out with no photo, video or voice note —
  silently, and stamped zipAt. Imported, its videos were set to driveId null
  ("no file to restore"), and the thumbnail said "sign in to play it".
  · Export: after the folder's media, every attachment of the visit not yet in
    the ZIP is fetched by its own id (`driveBlobById`: the trash included); a
    photo or voice note not on Drive comes from its stored data URL; a video
    still missing is named in an alert after the ZIP is saved.
  · Import: a video the ZIP lacks but whose session.json carries a driveId is
    fetched by that id and uploaded to the new folder. Importing a ZIP over a
    visit already here now also repairs it: its videos with no driveId (not
    `err`) are looked for in the ZIP and by the ZIP's id, and the session is
    replaced so the change is stamped; `importFiles` saves when anything was
    restored, not only added.
  · The thumbnail tells "not on Drive — import the ZIP again" from "sign in".
  Tested in the preview with a real JSZip and a faked Drive (trashed, purged,
  in-ZIP and outcome videos; the repair path; the export's fallback). The
  three 171 videos still in the Drive trash are what this recovers.
- **A deletion reaches every device** (2026-10-18: "P-2026-165 and 140,
  deleted on the computer, are still on the phone but not on the tablet"):
  a deletion travelled only by its Outputs folder (binned → other devices
  drop the visit) or by the data file (only reaches a device without the
  visit). These were imported test visits with no folder: the phone, which
  still had them, saw them missing from the file, kept them as `onlyHere` and
  pushed them back; the computer's gone notes took them out again, forever.
  Now the history file carries deletions: `histForget` keeps an archived
  visit's record but adds `gone` = deletion time (never-archived: the `del`
  tombstone, as before); `histMerge` keeps the newest `gone` unless the
  winning record is newer; `histGoneNotes` puts this device's existing gone
  notes into the file (so 165/140, deleted before this, travel too);
  `histApplyGone` (each `histSync` after the merge, and in `loadFromDrive`
  before the reconcile) drops every visit a deletion stamp is not older than,
  writes a gone note `{f:folderId, done:true, at:stamp}` so `goneBlocks` keeps
  data-file copies out, and re-saves. A copy changed after the deletion still
  wins (its record is newer). `histUpsertLive` skips a visit `gone` is newer
  than. Tested with three simulated devices (13 checks).
- **A folder binned in Drive deletes its visit for good** (2026-10-18: "a
  Celler de l'Albera folder I can't get rid of"): reconcile step 1 dropped a
  visit whose folder was in the trash but left no gone note, so the data file,
  which still had it, put it back at the next sync — P-2026-171 kept coming
  back after its folder was deleted by hand. Now that drop also writes the
  note (`{f, done:true, at:now}`), so `goneBlocks` keeps the file's copy out of
  every save; a copy changed after it still wins (`newerThanGone`).
- **A later edit beats a deletion** (2026-10-18, same incident, the real
  cause): P-2026-171 had been archived and deleted on the computer while the
  user kept working on it on the TABLET. The gone note hid every later copy
  for good (same folder), and the leftover fallback above then binned the
  folder's contents under a live visit. Now gone notes carry `at` (the
  deletion's moment; older notes fall back to the visit's history record
  `arch.at`), and `newerThanGone` — a copy whose `sStamp` is later — wins in
  `goneBlocks` (save merge), in reconcile steps 1 and 2, and keeps step 0 from
  binning that visit's folder. Step 3 of the reconcile then untrashes what the
  fallback had binned (`restoreFolderContents`: the folder's trashed children
  this app can see) for any live visit whose folder is in `fsl_v6_leftover`,
  and clears the note. A copy untouched since before the deletion stays gone.
  Tested in a sandbox of `reconcileOutputs` with the incident's exact state.
- **A visit's folder Drive won't let us bin** (2026-10-18: "the computer isn't
  refreshing the folders in Outputs"). Seen on the user's data: P-2026-171 was
  archived and deleted at 12:39; its Outputs folder stayed, and the gone note
  kept `done:false` through every sync, because the trash PATCH failed. The one
  thing that folder had and the binned ones did not: an
  `informe_…_rev01_ca.gdoc`, the copy Google Docs makes when the Word report
  is opened with Docs — a file this app (scope `drive.file`) may not touch, so
  it may not trash the folder holding it (not confirmed against the API: the
  page's token was not to be pulled out to ask). `trashFolderOrContents`, used
  by `deleteSession` and by step 0 of `reconcileOutputs`: on a 403 it bins
  every child the app can see (session.json first, so the visit cannot come
  back), records the folder in `fsl_v6_leftover` with Drive's message, and
  counts as done; the sidebar line asks for it to be deleted by hand, and the
  note clears itself once the folder is no longer listed. Any other failure
  (offline, 5xx) still retries.
- **…without moving the screen** (2026-10-17: "it moves, I tap the wrong
  thing"). Three causes, three fixes: the "Sincronitzant…" bar sat in the
  flow above everything and pushed the screen down and back up — it is now a
  fixed, click-through pill, and the background tick shows nothing at all
  (`syncQuiet` makes `setSyncSt("loading")` a no-op); every tick redrew the
  whole screen even with nothing new — it now redraws only when `sessSig()`
  (aid + each visit's id/stamp/status) changed; and every redraw jumped the
  log to its end — `logCapture`/`logPos` keep the scroll position across a
  redraw (it stays at the end only if it was there, the visit changed, or an
  entry was just added: `logToBottom`). The position is restored at once and
  again in rAF: saving an edit redraws twice in a row, and rAF alone left the
  second redraw reading a fresh 0 (and never runs in a background tab).

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
