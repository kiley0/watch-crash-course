# Pilot release

The pilot includes the ten Study Skills episodes, playback and resume, course progress, history, and local backup export/import. It has no account or server.

## Automated checks

Run `pnpm fmt` and `pnpm build`. The build checks formatting, lint, TypeScript, the test suite, and all six HTML entries. Backup validation and recovery tests cover round trips, invalid records, failed writes, interrupted replacement, and rollback failures.

## Browser checks

Use a separate test profile with no valuable progress. Close other site tabs before importing or clearing data. A narrow desktop viewport verifies layout only; it does not replace a real mobile browser.

- [ ] Chromium: load a video, play, pause, reload, and resume at the saved position.
- [ ] Safari: repeat playback and resume; confirm saved progress after closing and reopening the page.
- [ ] Firefox: repeat playback and resume.
- [ ] Real mobile browser: playback, resume, episode navigation, history, and data controls.
- [ ] Export a backup, clear progress, import it, and verify restored history, completion, and resume position after reload.
- [ ] Choose malformed JSON and an invalid backup; confirm existing progress is unchanged.
- [ ] Keyboard navigation: dialogs, cancellation, focus return, and visible focus indicators.

## Deployment checks

- [x] Preview build reaches READY using the pinned package manager and frozen lockfile.
- [ ] All six pages, course JSON, icons, artwork, and license links load on the preview.
- [ ] An unknown page returns HTTP 404 rather than the homepage.
- [ ] Real YouTube playback and saving work over HTTPS on the preview.
- [ ] On a stable hostname, save progress, deploy an update, reload, and confirm history and resume remain available. Keep a backup first. Different preview hostnames have separate storage and cannot verify this.
- [ ] Connect the owned `watchcrashcourse.com` domain, verify DNS and HTTPS, and repeat the main learning flow on the production origin.

## Hosting

Vercel project: `watch-crash-course`, in Kiley Dorton's personal team. Build with `pnpm build` and publish `dist/`; no Functions, authentication, database, analytics, or SPA rewrite is required. The repository configuration is authoritative for build commands. Use Node 22.12 or newer within the Node 22 release line. The cloud install and build commands use the Corepack bundled with Node 22 to select pnpm 12.16.1.

Use the ordinary Vercel Git integration when ready to enable automatic releases from `main`. Until then, source uploads can produce previews without pushing or changing the production branch. Do not treat a preview as the production origin. Export progress before moving between hosts.

For rollback, restore a previously verified deployment through Vercel. Progress stays in browser storage at the same origin; backups provide a separate recovery copy. Keep backup format changes explicit and verify old supported records before any future schema change.

## Verification record — October 30, 2026

Local formatting, lint, type checks, all 50 tests, and the six-page production build passed. Vercel also ran the checks and completed the static build successfully.

Preview: https://watch-crash-course-jkzlam4ah-kiley-dortons-projects.vercel.app/

Deployment: `dpl_HnnNHgEnJbL5Q7TAEqFfDJhd9fF4`, environment `staging` (preview), status READY. This is an upload of the local working tree based on `8c77ac5`, including the release configuration at upload time. Later review tightened the formatting exception to `VERCEL=1` and clarified these notes; those review edits have been checked locally but are not in this preview. It is not a Git-connected production release.

Vercel authentication prevents unauthenticated browser checks. The connector's protected fetch requires a temporary 23-hour share link; automatic approval review rejected creation of that link, and user approval is pending. Safari automation timed out. The unchecked browser, HTTP, update-persistence, and production-domain checks above remain outstanding.

`watchcrashcourse.com` is verified in the same Vercel account, but has not been attached to this project. No domain purchase or DNS changes were made.

Cloud installation uses Corepack to honor the project's pnpm-only developer configuration. Node is constrained to the supported 22 release line. The cloud formatter rejected `vercel.json` even though the uploaded source passed local formatting. The cause was not confirmed. As a narrow workaround, builds with `VERCEL=1` exclude only this file from formatting; local checks still check its source formatting. Vercel parses the configuration as part of deployment.
