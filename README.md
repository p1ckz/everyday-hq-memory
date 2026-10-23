# Everyday HQ

An accessible, private-on-device memory and reading app. Open the [HTTPS app](https://p1ckz.github.io/everyday-hq-memory/) in Safari and choose Share → Add to Home Screen. If shown, enable Open as Web App. No account, microphone, notifications, analytics, cloud sync or paid services.

## Everyday use

- **Memory:** one free-form box; automatic or chosen event time; edit, highlighted multiword/quoted-phrase search with inclusive date ranges, date browsing, a daily timeline and a seven-calendar-day review. Pin important entries, flag simple follow-ups, and recover deleted entries or unfinished edits in Settings.
- **Daily recap:** chronological, verbatim excerpts from that date's saved entries. It never invents missing events. Tap an excerpt to open the reader.
- **Vision:** paste text or use Read on a memory. Set 28–80 px lettering, line spacing, letter spacing and focus on one short part at a time. Reading text has a separate local draft; it is not included in memory backups.
- **Read aloud:** English voices reported as local by the browser only. Remote voices are refused. Pause, resume and stop are available when speaking. If no suitable local voice is exposed, a clear unavailable message appears. Actual iPhone speaker output, voice provisioning and Safari pause/resume still require device verification.
- **Assistant:** pinned memories plus exact entries matching explicit planning keywords. This is a simple local keyword filter, not AI understanding, a verified task list or a scheduler. Negatives, quotes and completed plans can match. No dates or commitments are invented.

## Data and recovery

Production keeps IndexedDB `EverydayHQ_v13`, object store `storage`, state key `state` and backup schema `everydayHQ.v2`. Existing entries and old backups remain supported. Optional pins and reading preferences default safely when absent. Imports merge rather than replace; edited conflicts keep both versions. Matching records can recover pins without duplication. Deleted entries are retained until restored; there is no automatic purge. Revision checks prevent stale tabs overwriting newer saves.

Use the one-tap backup button under the memory box or in Settings and check that the JSON file was saved in Files. The displayed last-export date records the download request only: the app cannot verify external file saving. Exports read the latest committed database state, including saves made in another window. Unsaved main, edit and reading drafts are separate local data and are not included in these memory exports. Backups are unencrypted. Choosing iCloud Drive for a backup explicitly stores that file in your Apple account; the app itself does not sync. Safari and an installed Home Screen app may not share storage on every iOS version: export and import if transferring, and verify entries in the installed app before relying on it. Clearing browser/app data, removing the app or device failure can lose local data. Five internal transaction snapshots are retained as a developer recovery aid, not a substitute for exports.

Open online once after this release, then check Settings → Offline & updates for “Offline copy ready”. The service worker caches only the self-contained public app HTML; memory recording and reading remain local in IndexedDB. Cached navigations to this existing root or index.html can reopen without network access. Browser storage eviction or clearing can still remove the cache and local data. A first visit needs a connection. No reinstall is needed: keep the current Home Screen icon and origin/path.

Updates install in the background but wait while an app is open. Settings offers an explicit Install update & reopen button. It refuses to reload during a save or if preserving an unsaved draft fails, and checks drafts again when the worker takes control. Closing all tabs also permits normal browser worker activation. The worker never deletes or resets IndexedDB/localStorage and cleans only app-shell caches for this exact path. Unfinished edits can be recovered through Settings; if their original changed or was deleted, recovery creates a new unsaved memory instead of overwriting it.

## Maintenance and verification

GitHub Pages serves `main` at the repository root; preserve this configuration. `index.html` is buildless and self-contained. HTML, CSS and JavaScript sections are kept together deliberately so a Pages release is atomic. No runtime dependencies or external content are loaded. The main CSP permits only same-origin connections and a same-origin service worker, plus the exact inline script/style hashes. The worker fetches only the public app shell; it never reads or transmits entries or drafts.

For a new offline release, bump the displayed app version in `index.html` and `VERSION` in `sw.js` together. Keep the path unchanged and publish both files in the same commit. Worker installation rejects incomplete or mismatched HTML releases, preserving the previous active version. After source edits:

```sh
python3 update-csp.py
npm install --ignore-scripts
npm test
```

Dependencies are for local tests only and are pinned in `package.json`. Tests use synthetic text and simulated DOM/IndexedDB/speech. They cover startup, persistence, drafts, corruption handling, concurrent writes, editing, search, dates, delete/restore, backups, pins, recaps, assistant filtering, reader settings, local-only speech controls, edit-draft recovery, backup metadata, phrase/date search, follow-up flags, week boundaries and draft-safe update activation. `test-next.cjs` also executes the actual service-worker source with a cache and simulated failed network: cached navigation, install validation, update waiting, cache scoping and rejection of external/private fetch interception are checked. They do not prove Safari behaviour, actual audio or layout.

For live browser layout QA, open `layout-check.html`. It frames the app at 320, 390 and 430 CSS pixels with independent test storage, selected only by `?layout-test=1`; live diary storage is never read in this mode. Use synthetic text only. Test Huge interface text plus 80 px reader text and maximum spacing. These frames are not an iPhone/Safari emulator. Check a real iPhone separately, including keyboard, native date picker, larger system text, Home Screen reopening, speech and Files export/import.

Release 1.9.0 adds offline reopening, safe updates, stronger draft/backup handling, search improvements, seven-day review and follow-up flags while retaining the 1.7 DOM-ready startup repair. Do not move initialization before DOMContentLoaded: `defer` does not delay an inline script. Recompute CSP hashes after every script or style change and verify the Pages workflow succeeds and the live app loads. Never commit diary backups, real entries or private screenshots. PC diagnostics remain out of scope for this iPhone release.
