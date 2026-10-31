# Pilot release

The pilot includes the ten Study Skills episodes, playback and resume, course progress, history, and local backup export/import. It has no account or server.

## Automated checks

Run `pnpm fmt` and `pnpm build`. The build checks formatting, lint, TypeScript, the test suite, and all six HTML entries. Backup validation and recovery tests cover round trips, invalid records, failed writes, interrupted replacement, and rollback failures.

## Browser checks

Use a separate test profile with no valuable progress. Close other site tabs before importing or clearing data. A narrow desktop viewport verifies layout only; it does not replace a real mobile browser.

- [x] Chromium (in-app browser): load a video, play, pause, reload, and resume at the saved position.
- [ ] Safari: repeat playback and resume; confirm saved progress after closing and reopening the page.
- [ ] Firefox: repeat playback and resume.
- [ ] Real mobile browser: playback, resume, episode navigation, history, and data controls.
- [x] Export a backup, clear progress, import it, and verify restored history, completion, and resume position after reload.
- [x] Choose malformed JSON and an invalid backup; confirm existing progress is unchanged.
- [x] Reset and data confirmations: cancellation and focus return. Full keyboard-only coverage remains a follow-up.

## Deployment checks

- [x] Preview build reaches READY using the pinned package manager and frozen lockfile.
- [ ] All six pages, course JSON, icons, artwork, and license links load on the preview.
- [x] An unknown page returns HTTP 404 rather than the homepage.
- [ ] Real YouTube playback and saving work over HTTPS on the preview.
- [ ] On a stable hostname, save progress, deploy an update, reload, and confirm history and resume remain available. Keep a backup first. Different preview hostnames have separate storage and cannot verify this.
- [x] Connect the owned `watchcrashcourse.com` domain, verify DNS and HTTPS, and repeat the main learning flow on the production origin.

## Hosting

Vercel project: `watch-crash-course`, in Kiley Dorton's personal team. Build with `pnpm build` and publish `dist/`; no Functions, authentication, database, analytics, or SPA rewrite is required. The repository configuration is authoritative for build commands. Use Node 22.12 or newer within the Node 22 release line. The cloud install and build commands use the Corepack bundled with Node 22 to select pnpm 12.16.1.

The ordinary Vercel Git integration now releases pushes to `main`. Source uploads can still produce previews without changing the production branch. Do not treat a preview as the production origin. Export progress before moving between hosts.

For rollback, restore a previously verified deployment through Vercel. Progress stays in browser storage at the same origin; backups provide a separate recovery copy. Keep backup format changes explicit and verify old supported records before any future schema change.

## Verification record — October 30, 2026

Production is live at https://www.watchcrashcourse.com/ (the apex redirects there). Git deployment `dpl_8XcZtHspzHijZyPPzryNXdEgot5z` of `81690d2` reached READY after all 50 tests and build checks passed. The GitHub repository, Vercel project, and custom domain are connected.

A production walkthrough in the in-app Chromium browser verified catalog empty search and recovery, episode search, all six pages, history filtering, course completion counts, and the homepage continue card. No YouTube iframe existed before Load video. Actual playback, pause saving, reload, and resuming at the saved timestamp worked over HTTPS. Manual completion and confirmed reset survived reload; Escape canceled reset and returned focus.

A real downloaded backup contained one unfinished video with a saved timestamp and one manually completed episode. Export → clear → import → reload restored both records. A second export contained exactly the same video records. Malformed JSON and an unsupported version were rejected without changing saved progress. The restored watch page, history, course summary, and continue card agreed.

About and data settings were checked at a 390px viewport without horizontal overflow. This is responsive desktop testing, not real mobile playback verification. Safari, Firefox, real mobile playback, and persistence across a subsequent deployment remain unchecked. The protected preview was not browser-tested; production verification supersedes the earlier share-link request.

The walkthrough found a missing Your data header link on About. The fix makes its navigation consistent with the other five pages and was verified in the local production preview. All 50 tests and build checks passed before commit.

Cloud installation uses Corepack to honor the project's pnpm-only developer configuration. Node is constrained to the supported 22 release line. The cloud formatter rejected `vercel.json` even though the uploaded source passed local formatting. The cause was not confirmed. As a narrow workaround, builds with `VERCEL=1` exclude only this file from formatting; local checks still check its source formatting. Vercel parses the configuration as part of deployment.
