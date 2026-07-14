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

---

## Architecture
- **Single HTML file** — all CSS, JS, and assets inline. No build step, no npm.
- **PWA** — installable on mobile and desktop, works offline
- **Storage:** localStorage for sessions data + Google Drive for sync
- **localStorage keys:**
  - `fsl_v6_data` — sessions JSON array
  - `fsl_v6_tok`  — OAuth token + driveFileId + rootFolderId
  - `fsl_v6_thm`  — theme preference (dark/light)
  - `fsl_v6_root` — cached Drive root folder ID

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
- Photos stored as base64 in JSON + uploaded to Drive in background
- **Voice notes** — record audio via MediaRecorder (🎙 button); stored as base64
  in the entry (offline-safe, like photos, NOT like video) + uploaded to Drive
  `audio/` subfolder in background. Rendered as an "audio chip" (play, duration,
  delete) in pending / edit / log views; listed in HTML/DOCX reports.
  - NOTE: on-device transcription (Whisper via transformers.js) was implemented
    and then **removed** — `whisper-tiny` on mobile gave poor results. Recording
    is kept; transcription is intentionally gone. Don't re-add it without a
    better model/approach.
- Edit entries (description, severity, tag, add/remove/rename attachments)
- Delete entries
- Close session / **Reopen session** (↺ button)
- Delete session with automatic backup (local download + Drive upload)
- Import JSON (↑ Import button in topbar and on empty screen)
- Export: HTML (video playable), PDF (via window.print()), DOCX (via docx lib CDN)
- Reports fully in English, filenames shown under each photo/video
- Dark/light theme toggle (☀/☽)
- Sync indicator (● Drive green / ● Local red)
- Auto-sync every 30s (skipped if user has unsaved input)
- Rename Drive files when attachment name is changed in edit modal

---

## Export / Report details
- **HTML:** videos embedded with `<video controls>`, photo+video filenames shown
- **PDF:** `window.print()` on a new window — videos show thumbnail + filename
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
