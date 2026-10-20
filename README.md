# Everyday HQ

An accessible, private-on-device memory and reading app. Open the [HTTPS app](https://p1ckz.github.io/everyday-hq-memory/) in Safari and choose Share → Add to Home Screen. If shown, enable Open as Web App. No account, microphone, notifications, analytics, cloud sync or paid services.

## Everyday use

- **Memory:** one free-form box; automatic or chosen event time; edit, search, date browsing and a daily timeline. Pin important entries and recover deleted entries in Settings.
- **Daily recap:** chronological, verbatim excerpts from that date's saved entries. It never invents missing events. Tap an excerpt to open the reader.
- **Vision:** paste text or use Read on a memory. Set 28–80 px lettering, line spacing, letter spacing and focus on one short part at a time. Reading text has a separate local draft; it is not included in memory backups.
- **Read aloud:** English voices reported as local by the browser only. Remote voices are refused. Pause, resume and stop are available when speaking. If no suitable local voice is exposed, a clear unavailable message appears. Actual iPhone speaker output, voice provisioning and Safari pause/resume still require device verification.
- **Assistant:** pinned memories plus exact entries matching explicit planning keywords. This is a simple local keyword filter, not AI understanding, a verified task list or a scheduler. Negatives, quotes and completed plans can match. No dates or commitments are invented.

## Data and recovery

Production keeps IndexedDB `EverydayHQ_v13`, object store `storage`, state key `state` and backup schema `everydayHQ.v2`. Existing entries and old backups remain supported. Optional pins and reading preferences default safely when absent. Imports merge rather than replace; edited conflicts keep both versions. Matching records can recover pins without duplication. Deleted entries are retained until restored; there is no automatic purge. Revision checks prevent stale tabs overwriting newer saves.

Export backups in Settings and check that the JSON file was saved in Files. Backups are unencrypted. Choosing iCloud Drive for a backup explicitly stores that file in your Apple account; the app itself does not sync. Safari and an installed Home Screen app may not share storage on every iOS version: export and import if transferring, and verify entries in the installed app before relying on it. Clearing browser/app data, removing the app or device failure can lose local data. Five internal transaction snapshots are retained as a developer recovery aid, not a substitute for exports.

Internet is currently required to reopen reliably. There is no offline service worker. Update the existing Home Screen app by reopening/refreshing; no reinstall is needed. Do not clear website data or change the hosting origin/path as an update procedure.

## Maintenance and verification

GitHub Pages serves `main` at the repository root; preserve this configuration. `index.html` is buildless and self-contained. HTML, CSS and JavaScript sections are kept together deliberately so a Pages release is atomic. No runtime dependencies or external content are loaded. The main CSP denies network connections and permits only the exact inline script/style hashes.

After source edits:

```sh
python3 update-csp.py
npm install --ignore-scripts
npm test
```

Dependencies are for local tests only and are pinned in `package.json`. Tests use synthetic text and simulated DOM/IndexedDB/speech. They cover startup, persistence, drafts, corruption handling, concurrent writes, editing, search, dates, delete/restore, backups, pins, recaps, assistant filtering, reader settings and local-only speech controls. They do not prove Safari behaviour, actual audio or layout.

For live browser layout QA, open `layout-check.html`. It frames the app at 320, 390 and 430 CSS pixels with independent test storage, selected only by `?layout-test=1`; live diary storage is never read in this mode. Use synthetic text only. Test Huge interface text plus 80 px reader text and maximum spacing. These frames are not an iPhone/Safari emulator. Check a real iPhone separately, including keyboard, native date picker, larger system text, Home Screen reopening, speech and Files export/import.

Release 1.8 adds Memory/Vision/Assistant while retaining the 1.7 DOM-ready startup repair. Do not move initialization before DOMContentLoaded: `defer` does not delay an inline script. Recompute CSP hashes after every script or style change and verify the Pages workflow succeeds and the live app loads. Never commit diary backups, real entries or private screenshots. PC diagnostics remain out of scope for this iPhone release.
