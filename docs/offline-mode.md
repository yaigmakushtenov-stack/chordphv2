# Offline charts and setlists

While connected, sign in and choose **Save offline** in the **⋯ options menu** on a chord chart, a personal setlist, or a band setlist. A setlist download includes its accessible charts in order, with arrangements and selected keys. Save again to refresh a download after editing online. The dashboard quick toolbar contains Songs, Setlists, Events, and Offline; Offline library appears immediately below Track library in the main menu.

Open **Offline library** in the menu to use those downloads. Saved songs and Saved playlists appear in separate sections, and playlists show their track count at the right end of each row. The reader supports transpose, sharps/flats, text size, guitar/piano/ukulele diagrams, auto-scroll, and screen wake lock where supported. It works independently of the normal authenticated app shell. A failed full-page navigation redirects to the reader; use the Offline library link if an ordinary in-app navigation cannot complete.

Choose the **play button beside the title** on a saved setlist to open the same continuous stage reader used online. It includes section navigation, per-song transpose, instrument/vocals views, zoom, light/dark themes, and adjustable auto-scroll. It uses downloaded songs and performs no live band syncing or realtime token requests. Close stage to return to the saved setlist. The offline library includes the shared hamburger menu and desktop sidebar; while disconnected, Songs and Setlists open the corresponding downloads and online-only destinations show Internet required.

Use **⋯ → Edit** in the offline library to rename, reorder, or remove downloads. The editor puts Setlists first and Songs below, with matching controls; dragging and keyboard reordering stay within each category. Open a saved setlist and use **⋯ → Edit** to rename it, drag its saved songs into order, or remove a song. The editor uses the same sliding drawer and row animation as the online setlist editor; keyboard arrow keys also move a focused drag handle. Delete setlist stays at the far left and confirms before removing the local download. Confirm each removal, then Save changes; Cancel discards the draft. These edits stay on this device and never update online originals. Saving the original again online replaces the local copy. The store rejects stale edits after another tab changes downloads or the active account changes.

Downloads belong to this browser on this device. Removal and clearing downloads require confirmation. Logout warns before clearing downloads, and switching accounts clears the previous account's downloads. Online originals are unaffected. Browser cleanup or clearing site data can remove downloads; the library has an optional browser storage protection request.

Access is checked when a setlist is downloaded. Personal downloads require ownership, and band downloads require accepted membership in the assigned group. Tracks must belong to the setlist owner or be approved public tracks. Unavailable tracks remain placeholders without private content. Band downloads exclude private notes. Private downloads can be read on the device while offline until removed or cleared on logout.

This release does not download MP3s, cache login responses, cache authenticated pages, queue Server Actions, or synchronize offline edits. The worker caches only the static offline reader and its Next.js assets. No database schema changes or additional packages are required.

## Verification

Offline caching requires the deployed HTTPS app or a local production preview. Development mode does not register the worker, so it cannot leave stale development scripts in the browser cache.

To build without running the project's Prisma generation prebuild step:

```powershell
node node_modules/next/dist/bin/next build
node scripts/verify-offline.mjs
node scripts/verify-offline-store.mjs
pnpm start
```

The verification script uses production assets and mocked database/network boundaries to check access rules, input validation, private-note filtering, arrangements, selected keys, asset precaching, navigation fallback, and cache exclusions. It does not replace a browser test of IndexedDB, installation, and iPad behavior.

On an iPad, phone, and desktop browser:

1. Sign in online, save one chart and a setlist, and wait for the saved confirmation.
2. Open Offline library and check the song order, arrangement, key, and saved date.
3. Enable airplane mode, refresh the library, close and reopen the tab, and open the original saved chart URL.
4. Open every downloaded song; test transpose, text size, diagrams, and auto-scroll.
   Open Stage view from a saved setlist, jump between sections and songs, adjust each song's transpose, switch instrument/vocals view, zoom, test auto-scroll, refresh the stage URL while offline, and close it to return to the setlist. Confirm that no realtime token request is made. Verify the hamburger menu and desktop sidebar are accessible.
5. Reconnect and edit a chart online. Save again and check that the downloaded copy updates.
6. Use the library and saved-setlist Edit menus. Rename and reorder items, cancel a removal, then confirm one and save. Reload and confirm the local names and order persist, with the online setlist unchanged. Cancel a Remove/Clear confirmation, then confirm one removal. Check that the online original remains.
7. Cancel logout once, then confirm logout. Verify downloads disappear. Sign in as another account and confirm it cannot see the previous account's downloads.
8. Try an unavailable song, an inaccessible setlist, a pending band membership, and exhausted browser storage. The app must show a useful failure or placeholder and never claim an incomplete download succeeded.
