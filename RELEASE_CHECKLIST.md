# Release checks

Run `pnpm fmt` and `pnpm build` before submitting changes. Check affected flows in the browser.

## Browser verification

- Browse and filter courses; open lessons and check first/last episode navigation.
- Play, pause, reload, and confirm the saved position resumes correctly.
- Mark an episode complete and reset it; confirm course progress and history agree.
- Export and import a backup in a disposable test profile. Invalid imports must leave existing data intact. Close other site tabs before replacement or clearing data.
- Check keyboard navigation, visible focus, confirmations, and narrow layouts. Test real mobile playback for player changes.
- Check error recovery when catalog loading, storage, or embedded playback fails.

## Deployment

`vercel.json` defines the build; the output is `dist/`. The site needs static HTTPS hosting, without application services or SPA rewrites. Use the Node and package-manager versions specified in `package.json`.

After deployment, verify page and asset links, playback, and saved progress on the production origin. Unknown pages should return 404. Preview hostnames have separate browser storage.

Keep storage keys and supported backup formats stable. Before a storage change, export a backup and verify existing records survive an update. Roll back to a known-good deployment if needed.

- Study Hall: all 15 courses appear separately from Crash Course; check search, subject/progress filters, course return links, saved progress, and a backup containing videos from both libraries.
