# Watch Crash Course

A bright, independent course guide for curious people. Ordinary HTML and CSS, TypeScript, Alpine's CSP build, and static JSON. Built with Vite+ and ready for static hosting on Vercel.

## Local development

Use Node 22.12+ within the Node 22 release line and pnpm 12.16.1, as recorded by the initializer in `package.json`. Run `vp install` if Vite+ is already installed, or `pnpm install --frozen-lockfile`. A global `vp` is optional; use `pnpm exec vp` for the local CLI.

- `pnpm dev` — development server.
- `pnpm fmt` — format source.
- `pnpm check` — formatting, lint, and strict TypeScript checks.
- `pnpm test` — focused domain, data, persistence, and player tests.
- `pnpm build` — checks, tests, then the multi-page build into `dist/`.
- `pnpm preview` — serve the production build.

## Code organization

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the domain map, dependency rules, and a “where new work goes” guide. Catalog rules, static JSON loading, and page interactions live together under `src/catalog/`, separated by responsibility. Shared visual identity lives in `src/site/`. Tests sit beside their modules.

## Implemented features

Catalog search and subject filtering, twenty-four complete course pages with 727 numbered episodes, episode search, official YouTube links, accessible responsive styling, and an about/privacy page. Catalog/network errors and unknown course IDs have useful recovery states. No fabricated course or viewing progress is shown.

The watch page now loads YouTube’s official player when a lesson opens, waits for the user to press play, offers resume or replay, saves playback position, supports manual completion and confirmed episode reset, and links to previous/next lessons. Course episodes show saved status. Course completion summaries, a recent-course continue panel, and searchable learning history are also available. The data settings page supports backup download, validated replacement import, and confirmed clearing. No account or API key is required.

## Content maintenance

The checked-in files in `public/data/` are manually curated. The course index contains metadata; `courses/<id>.json` contains each course’s ordered numbered episodes. Previews and extras are excluded. Episode sources normally point to Crash Course’s official episode pages, whose main embedded videos supplied the IDs. Where an episode page is absent, a canonical link to the matching upload on the official CrashCourse YouTube channel is allowed after verification. Reviewed October 30, 2026 against [Study Skills](https://thecrashcourse.com/topic/studyskills/) (10 episodes), [World History](https://thecrashcourse.com/topic/worldhistory1/) (42 episodes), [Biology](https://thecrashcourse.com/topic/biology/) (50 episodes), [Astronomy](https://thecrashcourse.com/topic/astronomy/) (46 episodes), [Philosophy](https://thecrashcourse.com/topic/philosophy/) (46 episodes), [Computer Science](https://thecrashcourse.com/topic/computerscience/) (40 episodes), [Chemistry](https://thecrashcourse.com/topic/chemistry/) (46 episodes), [Psychology](https://thecrashcourse.com/topic/psychology/) (40 episodes), [Economics](https://thecrashcourse.com/topic/economics/) (35 episodes), [U.S. History](https://thecrashcourse.com/topic/ushistory/) (47 episodes), [Physics](https://thecrashcourse.com/topic/physics/) (46 episodes), [Linguistics](https://thecrashcourse.com/topic/linguistics/) (16 episodes), [Statistics](https://thecrashcourse.com/topic/statistics/) (44 episodes), [Media Literacy](https://thecrashcourse.com/topic/medialiteracy/) (12 episodes), [Ecology](https://thecrashcourse.com/topic/ecology/) (12 episodes), [Art History](https://thecrashcourse.com/topic/arthistory/) (22 episodes), [Anatomy & Physiology](https://thecrashcourse.com/topic/anatomy/) (47 episodes), [Engineering](https://thecrashcourse.com/topic/engineering/) (46 episodes), [Artificial Intelligence](https://thecrashcourse.com/topic/ai/) (20 episodes), [Navigating Digital Information](https://thecrashcourse.com/topic/navigatingdigitalinfo/) (10 episodes), [Intellectual Property](https://thecrashcourse.com/topic/intellectualproperty/) (7 episodes), [Public Health](https://thecrashcourse.com/topic/publichealth/) (10 episodes), [Film History](https://thecrashcourse.com/topic/filmhistory/) (16 episodes), and [Business: Entrepreneurship](https://thecrashcourse.com/topic/businessentrepreneurship/) (17 episodes). Biology is the current Dr. Sammy Ramsey series, distinct from Biology (2012); World History is the original numbered 1–42 series, distinct from World History II. Descriptions and illustrations are original. No scraping or live Data API is used by visitors. Run the tests after editing the catalog: they validate counts, ordering, IDs, and source URLs.

## Hosting

The public name is **Watch Crash Course**. The repository and local folder use `watch-crash-course`. The intended production origin is `https://watchcrashcourse.com`; domain registration, DNS, and deployment are separate setup steps.

Import the repository into Vercel as a Vite project. Enable Corepack in the Vercel project settings (`ENABLE_EXPERIMENTAL_COREPACK=1`) so the `packageManager` pin is used. Install with `pnpm install --frozen-lockfile`, set build command to `pnpm build`, and output directory to `dist`. Select a Node version satisfying `engines` and supported by the pinned pnpm release. No server functions, environment secrets, SPA fallback rewrite, or custom deployment workflow is required.

All six HTML pages are explicit build entries. Vite uses multi-page mode so missing JSON files return a real 404 instead of the homepage. `public/` is copied unchanged. The relative base, page links, and JSON URLs support a subdirectory deployment. `dist/` can be served by any static HTTPS host without Node, Vite+, or Vercel. Test with `vp preview` or an ordinary static server rooted at `dist/`. Keep a stable production origin for local progress; preview URLs have separate browser storage.

## Dependencies and design

localForage 1.10.0 provides the storage adapter (IndexedDB with localStorage fallback), with full published licenses for it and its bundled dependencies. Alpine CSP 3.17.5 is pinned, installed from the registry, bundled into the local site assets, and never loaded from a CDN. Vite+ handles transpilation and checks. Lucide provides a small, checked-in SVG sprite of eight selected icons. No icon runtime, CSS framework, font, or animation library is used. The original SVG illustration and CSS artwork complement Crash Course's cream/teal/navy palette without reusing brand artwork. Motion respects reduced-motion preferences.

See `WEBSITE_PLAN.md` for remaining milestones and `THIRD_PARTY_NOTICES.md` for attribution. This is an unofficial, unaffiliated fan-made project.

## Progress storage and playback

`src/learning/domain/progress.ts` owns completion, clamping, resume, and record validation. `src/learning/infrastructure/progress-store.ts` serializes updates within a tab; `browser-progress.ts` wires the localForage backend. Records are keyed by video ID, never course ID, in database `watch-crash-course`, store `video_progress`, keys `video:<id>`. Each record has `schemaVersion: 1`, position/duration in seconds, a millisecond timestamp, and completion/source. Unsupported schemas or malformed records disable writes for that page session and leave stored data untouched. Write failures retain temporary in-memory progress with a visible warning. No other module accesses browser storage directly.

Playback samples every five seconds while playing, saves on pause/ended, and attempts a save on navigation and page hiding. Only an ended event or manual action marks completion; seeking alone does not. Rewatching preserves completion until an explicit reset. Completed videos and positions within five seconds of the end offer replay. Player listeners/timers are cleaned up on departure; a browser back/forward cache restore reloads the watch or course page to recover a fresh session and current episode statuses. Periodic saves are the durable baseline; a browser closing abruptly may lose the last few seconds.

Progress belongs to this browser profile and origin. Multiple tabs use last-save-wins; there is no cloud synchronization. Clearing site data, private browsing, browser eviction, and changing origins/devices may lose or separate progress. Use the data settings page to export or import a backup. Opening a watch page loads YouTube’s script, player, and thumbnail automatically; playback waits for the viewer to press play. The adapter also checks the player’s current video URL before saving, so selecting a different video inside YouTube cannot overwrite this lesson’s progress. The watch page sets an origin-preserving referrer policy and actual origin for the official IFrame API. Its privacy-enhanced embed retains standard YouTube controls; no video or ad is proxied or hidden.

## Course summaries and history

`src/learning/domain/course-summary.ts` derives completion using current course membership; percentages are never stored. Resume chooses the most recently active unfinished video still in a course, then its first unfinished episode, or replay from the start if complete. The homepage features the most recently active unfinished video across available courses, with recently active course links. New profiles see zero completion without an invented continue card. Reordering, adding, or removing catalog episodes changes the derived summary without deleting historical records.

The adapter serializes reads as well as writes, so a delayed history read cannot replace newer in-memory progress. `progressStore.list()` enumerates namespaced video keys independently of the catalog, validates each record, and includes any in-memory fallback progress. History shows one latest record per video, sorted by last activity, and excludes reset records (zero position and no completion). Activity includes manual completion; it is not proof of viewing. The history page renders local records first, then adds current course/episode names. Each metadata retry rebuilds rows from the original saved records, so removed or unavailable metadata cannot leave stale internal lesson links. If catalog metadata cannot load or a video no longer belongs to a course, the saved ID, position, status, timestamp, and original YouTube link remain accessible. There is no cached remote metadata, event log, or new storage schema.

History search matches episode/course text and video IDs; status filters distinguish unfinished and completed episodes. Navigation back/forward refreshes catalog, course, watch, and history pages to read current records. Backups can be exported and restored from the data settings page.

## Milestone verification

`pnpm build` runs formatting, lint, strict type checks, colocated tests, and all six HTML build entries. Automated checks cover catalog contracts, query matching, course detail loading, progress transitions and persistence, blocked storage, preserving future-schema records, and player lifecycle/error behavior. Player tests use a boundary fake; they do not replace real browser playback verification. Local browser checks confirmed no YouTube frames/scripts before the load action, real playback with pause saving, a saved resume choice after reload, manual completion surviving reload and appearing on the course page, confirmed reset, next-episode navigation, and the watch layout at 390px without horizontal overflow. The built watch page also loaded correctly in the production preview. Milestone 3 browser checks also covered empty history, persisted history and resume links, status filters and reset, a 1-of-10 completion count, most-recent-first ordering, 390px mobile layout, tablet navigation bounds, and recovery while the catalog file was temporarily unavailable. The user subsequently confirmed Safari, Firefox, and real mobile playback checks complete; see the release checklist.

Milestone 1 also passed an HTTP portability check with all pages/data/assets served under a nested subdirectory. There is no SPA rewrite. A protected Vercel preview is available; see [release checks](./RELEASE_CHECKLIST.md) for its status.

## Experience checks

A full browser walkthrough covered the homepage, search/no-results, course overview, real playback and pause/reload/resume, manual completion and next-lesson navigation, the last episode, history, About/privacy, license access, broken lesson links, and mobile layouts. Product copy avoids development milestone terminology. Empty history hides unused filters; zero-progress bars have an explicit `value="0"` so they never animate as indeterminate loaders. Continue cards show the exact lesson and saved time; completion offers the next lesson by name or a return to course progress. Reset confirmation supports keyboard focus and Escape cancellation. The homepage and About page link to the public source repository and published MIT license.

## Community voice

Copy includes small references to Nerdfighteria and the Green brothers’ projects: enthusiasm, complex thinking, a Thought Bubble note, and a quiet DFTBA sign-off. Optional search discoveries and an accessible about-page illustration tuck away deeper references. Ordinary navigation and factual course labels remain explicit; these references do not imply affiliation.

Background sources: [the community lexicon](https://nerdfighteria.com/lexicon/), [fan recollections](https://www.reddit.com/r/nerdfighters/comments/1hw176q), [Pumpkins and Penguins](https://podcasts.apple.com/us/podcast/62-pumpkins-and-penguins-and-fiddles/id1002937870?i=1000375226530), and [The Universe Is Weird](https://www.youtube.com/watch?v=zcwkOFSrLFI). The miniature elephant is original SVG artwork. Community discoveries add no dependencies or persistent tracking.

## License

[MIT](./LICENSE) applies to this project's original application code, documentation, descriptions, and artwork. It is a standard permissive open-source software license: people can use, modify, redistribute, and commercially reuse the software while retaining the copyright and license notice. MIT keeps forks easy to maintain and does not require a contributor agreement or a separate license for each original asset.

MIT permits proprietary derivatives and does not require forks to remain free of charge or open-source. “100% free forever” describes our commitment for this website; it is not an additional restriction on the MIT license.

Crash Course videos, third-party source text and quotations, logos, and branding are not relicensed by this repository. Factual video identifiers and source links do not imply ownership of the linked material. Referencing a community phrase does not give us exclusive rights to it. This project's license does not grant permission from Crash Course, Complexly, or YouTube to use their trademarks or imply endorsement.

Dependencies retain their own licenses. See [third-party notices](./THIRD_PARTY_NOTICES.md). The standard license text is kept unchanged in `LICENSE`, identified as `MIT` in `package.json`, and also included in `public/licenses/Watch-Crash-Course-MIT.txt` for published builds. Keep that published copy in sync if the copyright notice changes.

License reference: [Open Source Initiative: MIT](https://opensource.org/license/mit).

### Icons

`public/icons.svg` contains eight symbols selected from the pinned `lucide-static` development package. Use `<svg class="icon" aria-hidden="true" focusable="false"><use href="./icons.svg#arrow-right"></use></svg>` alongside a text label. Use `external-link` for off-site links, directional arrows for navigation/actions, and explicit accessible names for icon-only controls. Keep the small sprite and full upstream notice in `public/licenses/Lucide-LICENSE.txt` together when adding or updating icons; do not ship the package’s full sprite or icon font. Decorative stars and the original artwork remain part of the site’s visual identity.

### John Green quotations

The homepage’s three learning principles pair short attributed excerpts with original explanatory copy. Sources checked October 30, 2026:

- Enthusiasm: [Harry Potter Nerds Win at Life](https://www.youtube.com/watch?v=rMweXVWB918), checked against [the transcript](https://nerdfighteria.info/v/rMweXVWB918/).
- Complexity: [Iran’s Revolutions, Crash Course World History 226](https://www.youtube.com/watch?v=8w4Ku6l7OEI), checked against [the transcript](https://nerdfighteria.info/v/8w4Ku6l7OEI/).
- Lifelong learning: [The Agricultural Revolution, Crash Course World History 1 transcript](https://www.oerproject.com/-/media/WHP/PDF/Transcripts/CC_The_Agricultural_Revolution_CCWH_1.ashx), the introductory passage about the test of being an informed, engaged citizen.

The descriptions under the quotations are our interpretations, not additional John Green quotations. The attributions are references, not endorsements; third-party excerpts remain outside our MIT license.

The closing banner quotes Hank Green’s [MIT interview on science, communication, and curiosity](https://oge.mit.edu/oge_news/3-questions-hank-green-on-science-communication-and-curiosity/), published May 29, 2025. Its short quotation is reproduced as published in the interview’s introductory quotation, with visible attribution and a source link. Checked October 30, 2026.

## Data backups

`settings.html` manages version-1 JSON backups containing watch progress records, independent of catalog availability. Files are limited to 5 MiB and 10,000 total records. Unknown fields, unsupported versions, duplicates, invalid IDs, and non-finite/out-of-range values are rejected before any write. Imports replace rather than merge. No file is uploaded. Unknown or unreadable saved records block export instead of being silently omitted.

Before import or clearing, close other site tabs. An open player can otherwise save stale progress; multi-tab coordination is intentionally not promised. Download a current backup before replacing data. A backup can be empty; restoring it clears current records.

`data/` owns the backup contract and repository; `site/infrastructure/storage-coordinator.ts` owns serialized raw storage operations. It persists a recovery snapshot in `data_settings` before replacing the watch progress store. Removing the recovery entry commits the change. Failures attempt rollback; an interrupted operation rolls back before any page reads or writes after reload. Unknown recovery formats are preserved and block writes. If storage is unavailable, the usual temporary-progress warnings remain in place. No schema migrations are needed for this initial version; future versions must be explicitly supported.

Milestone 4 release validation is complete; the user confirmed the remaining browser and deployment-update checks.

Manual data-page verification confirmed a real JSON download, invalid-file rejection without changing record counts, explicit clear confirmation, and restoring the downloaded backup after clearing. The counts and saved watch progress returned after restoration.

The data page also passed a 390px layout check without horizontal overflow. The user confirmed the remaining release checks complete on October 30, 2026.

## Release checks

See [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) for the remaining browser and deployment checks. `vercel.json` builds this as a static multi-page site, installs the pinned pnpm version with a frozen lockfile, and publishes `dist/`. Keep HTML extensions and ordinary 404 responses; do not add a catch-all rewrite.

To host elsewhere, run `pnpm install --frozen-lockfile` and `pnpm build`, then serve the contents of `dist/` with any static host. No Node process is needed after the build. Keep the production origin stable so existing browser progress remains available.

## Catalog expansion verification

All 92 added episode IDs were checked against embedded videos on the official World History and Biology episode pages. The build validates a matching detail file for every catalog entry, contiguous episode numbering, counts, unique video IDs within each course, and known series endpoints. All 52 tests and build checks pass.

The local production preview passed History and Science filtering, episode search, first/last lesson boundaries, last-episode completion, actual playback in both new courses, saved Biology resume after reload, and independent progress for all three courses. The catalog and 50-episode Biology page fit a 390px viewport without horizontal overflow. These checks used the local production preview; that first expansion was subsequently committed and pushed as `0e9b558`.

### Second catalog batch

Astronomy, Philosophy, and Computer Science add 132 lessons, excluding previews and the Astronomy 360-degree bonus tour. Main lesson embeds were distinguished from related demonstrations on Astronomy #5 and #6 and Computer Science #17. The official Computer Science topic page lists only #1–39; #40 is verified against [CrashCourse’s official finale upload](https://www.youtube.com/watch?v=5TNAz1HYg18). Its canonical YouTube source is checked against the episode video ID; course-level sources still require the official website. No YouTube HTML importer, runtime API, or additional dependency was added.

Second-batch verification: all 53 tests, formatting, lint, type checks, and the six-page production build pass. The local production preview passed Humanities/Technology filtering, actual playback and saved resume after reload for all three new courses, and correct final-episode boundaries. Computer Science #40 was played directly. The Computer Science card fits a 390px viewport without horizontal overflow or title/sticker overlap. These checks used the local production preview.

### Third catalog batch

Added [Chemistry](https://thecrashcourse.com/topic/chemistry/) (46 lessons, Hank Green), [Psychology](https://thecrashcourse.com/topic/psychology/) (40 lessons, Hank Green), and [Economics](https://thecrashcourse.com/topic/economics/) (35 lessons, Adriene Hill and Jacob Clifford). All 121 numbered lesson pages and their embedded video IDs were checked on October 30, 2026. The official CrashCourse playlists confirm the series counts and hosts; each playlist also contains an unnumbered introduction, which is excluded. Psychology is the original Hank Green series. Social sciences is derived from catalog data like the existing subject filters. No runtime dependencies or data-schema changes were needed.

Third-batch verification: formatting, lint, strict types, all 53 tests, and the production build pass. Local production-preview checks covered the Social sciences filter, real playback and saved resume after reload for all three courses, and final-episode navigation with no next link. The filtered catalog and Economics page, including its two-host attribution, fit a 390px viewport without horizontal overflow.

### Fourth catalog batch

Added U.S. History (47 numbered lessons, John Green), Physics (46, Dr. Shini Somara), and Linguistics (16, Taylor Behnke). All 109 official episode pages and embedded video IDs were checked on October 30, 2026, including agreement between lesson and embed numbering. Official CrashCourse playlists confirm hosts and series identity. U.S. History’s playlist description counts 48 episodes including its unnumbered July 4 special; the catalog includes only numbered lessons 1–47. Episode 25 appears last on the official topic page and is restored to numerical order here. Previews and the special are excluded. No schema changes or dependencies were needed.

Fourth-batch verification: formatting, lint, strict types, all 53 tests, and the production build pass. Local production-preview checks confirmed host search, actual playback and saved resume after reload in all three additions, correct final-lesson boundaries, and a 390px Linguistics card/course layout without horizontal overflow.

### Fifth catalog batch

Added Statistics (44 numbered lessons, Adriene Hill), Media Literacy (12, Jay Smooth), and Ecology (12, Hank Green). All 68 official episode pages and their video embeds were checked on October 30, 2026, including matching embed numbering. Official CrashCourse playlists confirm the hosts and course counts. Previews and other unnumbered extras are excluded. Statistics lessons are sorted numerically rather than following the topic page’s publication order. Mathematics is a new subject derived from catalog data, with shared card styling. No schema changes or dependencies were needed.

Fifth-batch verification: formatting, lint, strict types, all 53 tests, and the production build pass. Local production-preview checks confirmed Mathematics filtering, real playback and saved resume after reload for all three courses, and final-lesson navigation without a next link. Media Literacy fits a 390px course-page viewport without horizontal overflow.

### Sixth catalog batch

Added Art History (22 numbered lessons, Sarah Urist Green), Anatomy & Physiology (47, Hank Green), and Engineering (46, Dr. Shini Somara). Checked 114 official episode pages on October 30, 2026. Anatomy #29 and #31 have no website embeds; their IDs were verified in the official CrashCourse playlist. Anatomy #44 is absent from the topic listing and uses its verified official upload as the source. Engineering #25’s related article embed is excluded. Art History #13’s malformed website punctuation is corrected using the video title; later Art History uploads have shortened titles, so lesson numbering follows the official course pages. Previews and extras are excluded, and lessons are sorted numerically. No dependencies or schema changes were needed.

Sixth-batch verification: formatting, lint, strict types, all 53 tests, and the production build pass. Local production-preview checks confirmed host search, real playback and saved resume after reload for all three additions (including Anatomy #44), and correct final-lesson navigation. The Anatomy & Physiology card and course title fit at 390px without horizontal overflow or artwork/sticker overlap.

### Seventh catalog batch

Added Artificial Intelligence (20 numbered lessons, Jabril), Navigating Digital Information (10, John Green), and Intellectual Property (7, Stan Muller). Checked all 37 official lesson pages and the official CrashCourse playlists on October 30, 2026. AI #11 has no website embed; its video ID is verified through the official playlist. Numbered AI labs are retained as lessons. The related article embed on Intellectual Property #3 and all unnumbered extras are excluded. The AI course is the original 2019 series, distinct from Futures of AI; the data keeps its source course title. No dependencies or schema changes were needed.

Seventh-batch verification: formatting, lint, strict types, all 53 tests, and the production build pass. Local production-preview checks confirmed actual playback and saved resume after reload for all three additions and correct final-lesson boundaries. The Navigating Digital Information card and course page fit at 320px without horizontal overflow. A small-screen artwork scale adjustment prevents the decoration from overlapping three-line course titles.

### Eighth catalog batch

Added Public Health (10 numbered lessons, Vanessa Hill), Film History (16, Craig Benzine), and Business: Entrepreneurship (17, Anna Akana). All 43 official episode pages and lesson video IDs were checked on October 30, 2026; official CrashCourse playlists confirm the hosts and course counts. Entrepreneurship #2’s related demonstration and Complexly embed, and #3’s related article and Vimeo embeds, are excluded. Previews are excluded and lesson numbering remains contiguous. No dependencies or schema changes were needed.

Eighth-batch verification: formatting, lint, strict types, all 53 tests, and the production build pass. Local production-preview checks confirmed host search, real playback and saved resume after reload for all three additions, and correct final-lesson boundaries. Business: Entrepreneurship fits on its card and course page at 320px without horizontal overflow. Mobile card names now use the full width with the decorative sticker hidden, and page titles scale down slightly below 381px to avoid awkward long-word breaks.
