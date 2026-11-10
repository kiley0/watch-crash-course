# Contributor guide

This is a static, multi-page HTML/CSS/TypeScript site using Alpine CSP and localForage. Keep dependencies and abstractions small. Root HTML files are explicit entries in `vite.config.ts`; navigation uses ordinary links. Shared headers and footers are deliberately repeated in each HTML entry.

## Where code goes

| Area               | Owns                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `src/catalog/`     | Course and episode validation, static JSON loading, search, bookshelves, and course pages |
| `src/learning/`    | Video progress, course summaries, history, and whole-course completion                    |
| `src/playback/`    | YouTube player, player preference, watch-page controls, and watching mode                 |
| `src/data/`        | Backup validation, export/import, clear-data workflow, and Settings                       |
| `src/site/`        | Shared styles, theme, storage setup, analytics, and decorative interactions               |
| `public/data/`     | Checked-in course index and episode lists                                                 |
| `public/licenses/` | License texts published with the site                                                     |

Within each area:

- `domain/` contains pure types, validation, and rules, without browser or UI dependencies.
- `infrastructure/` handles persistence, JSON loading, and external APIs.
- `presentation/` contains Alpine state, DOM behavior, labels, and page-specific CSS. It calls domain rules and adapters rather than duplicating them.
- `application/` is used for workflows coordinating domain operations, such as completing a whole course.

Use explicit imports and colocate meaningful `*.test.ts` files with their modules. Avoid barrel exports, catch-all utility folders, and speculative interfaces. Shared CSS lives in `src/site/styles.css`; dark colors live in `src/site/theme.css`. Add page-specific styles beside their presentation entry.

## Updating the catalog

Edit `public/data/courses.json` and `public/data/courses/<id>.json`. These files are the course inventory and test fixtures; do not maintain a separate list. Keep existing course IDs, video IDs, and public URLs stable.

- Verify titles, hosts, playlist membership, and lesson order against official sources. Exclude previews and extras; retain numbered introductions. Set `reviewedAt` when checking a course.
- Crash Course metadata links to official course pages; lesson sources use official episode pages, or an exact canonical YouTube watch URL when the website omits a lesson. Study Hall course sources use their exact official playlist URL; episode sources use their exact YouTube watch URL.
- Set `collection` to `crash-course` or `study-hall`; Study Hall also declares its series. Both libraries share the same course/watch pages and progress store.
- Within each subject, place broad introductions first, related courses together, and sequels after originals. Catalog order controls shelf order; subjects are alphabetical and recent courses follow activity.
- Keep local episode numbers consecutive. Multi-season courses use `playlistParts`, starting at episode 1 with increasing boundaries, while titles retain original season labels.

## Progress, preferences, and privacy

Progress is keyed by YouTube video ID, not course ID. Course totals are derived from episode membership; shared videos have one progress record. Use the progress store and data repository, not direct localForage access. The site storage coordinator serializes operations and journals backup replacement for recovery. Preserve storage keys and supported backup formats; test storage changes against existing records and backups. Verify that valid imports restore progress and invalid imports leave existing data intact. Close other site tabs before importing or clearing data.

Theme, analytics, and player preferences use separate localStorage keys and are not part of progress backups. Keep the inline theme bootstrap in every HTML page aligned with `src/site/theme.ts`. Watch pages snapshot the player preference once per visit; changes in another tab must not interrupt playback. Privacy-enhanced YouTube is the default; Standard YouTube does not guarantee account-history updates.

GoatCounter is optional and production-only. `src/site/analytics.ts` starts the infrastructure adapter; importing the adapter must not collect data. Send normalized public page/course/video identifiers only, never progress records or search text. Preserve the filter that strips the vendor client’s raw query and screen-size fields. Count actual video starts once per page visit. Keep individual pageview storage disabled in the hosted dashboard. Analytics failures must not affect playback or saved progress.

Decorative animations and watching mode must respect reduced motion. Keep controls keyboard-accessible, preserve focus after confirmations, and retain the independent fan-project attribution.

## Validation and hosting

Run `pnpm fmt` and `pnpm build`; the build checks formatting, lint, types, tests, catalog fixtures, and all HTML entries. Verify affected browser flows as described in the [README](README.md#help-make-it-better).

The build output is `dist/`. `vercel.json` configures static HTTPS hosting without SPA rewrites or application services. After deployment, check page/asset links, playback, and saved progress on the production origin. Unknown pages should return 404; preview origins have separate browser storage. When adding a page, register its Vite entry and retain the shared startup scripts, theme bootstrap, and navigation.
