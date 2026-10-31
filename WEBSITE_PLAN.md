# Watch Crash Course: implementation plan

Production domain: `watchcrashcourse.com`. Repository and local folder: `watch-crash-course`.

## Goal

Build a quiet, dependable place to work through Crash Course courses in playlist order, resume videos, and see progress. Favor files and browser standards that will remain understandable and inexpensive to host for years.

The pilot is live on Vercel at `watchcrashcourse.com`, with playback, local progress, history, data controls, and completed release checks. The first catalog expansion added World History and Biology. The next expansion added Astronomy, Philosophy, and Computer Science. The current local expansions add Chemistry, Psychology, Economics, U.S. History, Physics, Linguistics, Statistics, Media Literacy, and Ecology using the same static data model; see the post-pilot milestones below.

## Architectural decisions

- Serve ordinary HTML, CSS, JavaScript, and JSON from any static HTTPS host.
- No application server, database service, accounts, authentication, runtime secrets, or paid APIs.
- Write all application logic, Alpine components, tests, and tooling configuration in TypeScript. Use Vite+ to transpile and build the static site; retain ordinary HTML and CSS.
- Use one small, pinned, locally bundled storage library behind a tiny application-owned adapter. Use pinned localForage 1.10.0 bundled into the site, using IndexedDB with a localStorage fallback. Preserve its license and record its version. Reconsider only if its size or maintenance status warrants a simpler alternative before implementation.
- Use the official YouTube IFrame Player API for playback and position tracking. This is the unavoidable external runtime dependency alongside YouTube itself.
- Keep the course catalog in version-controlled JSON files.
- Prefer Alpine.js over htmx for interactions: catalog filtering, expanded episode lists, progress displays, and confirmation dialogs. These are browser-local state changes rather than requests for server-rendered fragments. Do not include both libraries.
- Bundle pinned application dependencies into the built site assets instead of loading them from a public CDN, and include their licenses. YouTube's player remains externally hosted.
- Use a conventional multi-page site with query parameters, not a client-side router or custom URL-rewrite rules.
- Use Vite+ (`vp`) as development tooling for local serving, formatting, and focused checks. It transpiles TypeScript at development/build time and adds no browser runtime dependency. The built output runs on any static HTTPS host.

“Hosted forever” means portable, inspectable files with minimal upkeep; no host or external video provider can guarantee permanent free availability.

## Lightweight development tooling: Vite+

Use a single-project, vanilla HTML/CSS/TypeScript setup with a pinned project-local `vite-plus` development dependency and one committed package-manager lockfile. Document a supported Node version and choose one package manager. A globally installed `vp` can be used when already available; do not require a global installation or changes to a contributor's runtime manager. The local CLI can be invoked through the chosen package manager.

| Command      | Purpose                                                     |
| ------------ | ----------------------------------------------------------- |
| `vp install` | Install the locked project dependencies                     |
| `vp dev`     | Serve the site locally with Vite                            |
| `vp fmt`     | Format supported source files                               |
| `vp lint`    | Run TypeScript lint checks                                  |
| `vp check`   | Run formatting, lint, and configured TypeScript type checks |
| `vp test`    | Run focused logic tests using the included Vitest runner    |
| `vp build`   | Transpile TypeScript and build the static site into `dist/` |
| `vp preview` | Serve the production output locally for verification        |

Use default formatter conventions, minimal lint configuration, and a strict `tsconfig.json` with DOM types and no emitted output from the type checker. Enable Vite+'s documented `lint.options.typeAware` and `typeCheck` options so `vp check` actually checks types. Transpilation alone does not validate types. Type catalog records, stored progress, and the player boundary; still validate imported and fetched data at runtime.

Exclude vendored distributions, lockfiles, and generated output from source formatting/linting as appropriate. Do not introduce framework plugins, workspaces, task caching configuration, Git hooks, or separate formatter/linter/test-runner packages. Keep TypeScript straightforward: functions, interfaces, and small modules, without decorators, code generation, or a type-heavy abstraction layer. Third-party vendored JavaScript remains unchanged.

Production builds are required. Configure every HTML page as a multi-page entry in `vite.config.ts`. Keep fetched catalog JSON and vendored distributions in `public/` so Vite copies them unchanged into `dist/`. Reference source TypeScript through HTML module entry points; load and register Alpine components in a deterministic order before starting Alpine. Keep substantive behavior in TypeScript methods rather than inline HTML expressions. Verify navigation, JSON URLs, and assets in `vp preview` against the actual build output.

Define a package `build` script that runs `vp check`, non-watch tests (`vp test run`), and `vp build` in sequence. Vercel runs that script using the project-local CLI after installing locked dependencies. No global `vp` installation is required on the build machine. The deployed `dist/` contains HTML, CSS, JavaScript, JSON, and static assets; no TypeScript execution or Vite server is needed in production.

References: [Vite+ type checking](https://viteplus.dev/guide/check) and [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build).

Setup details and commands should be verified against the pinned version during implementation. References: [Vite+ getting started](https://viteplus.dev/guide/), [development server](https://viteplus.dev/guide/dev), and [production builds](https://viteplus.dev/guide/build).

## Interaction layer: Alpine.js

Alpine is the preferred lightweight interaction layer. Its HTML directives support local state, event handling, input binding, visibility, and lists without introducing a component build pipeline. See the [official introduction](https://alpinejs.dev/start-here).

- Pin and locally bundle one Alpine distribution with its license. Prefer its [official CSP build](https://alpinejs.dev/advanced/csp) so the site does not need `unsafe-eval`; verify the chosen directive syntax against that build during the pilot.
- Register named components with `Alpine.data()` in external page scripts. Keep HTML expressions short and put calculations, asynchronous loading, and error handling in named methods.
- Keep storage, progress rules, and YouTube integration in ordinary TypeScript modules that can be tested independently of Alpine. Components call those modules and expose their results to the template.
- Treat component state as the current screen's view of persisted data. Do not create a second persistence system with Alpine's Persist plugin or introduce a global state framework.
- Use native `fetch()` for static JSON. No AJAX helper library or Alpine plugins initially.
- Give the player a stable DOM container outside Alpine-managed conditional/list rendering. UI updates must not recreate the iframe and interrupt playback. Clean up player listeners and timers when leaving the page.
- Use text bindings for catalog and imported data; avoid `x-html`. Use `x-cloak` for initially hidden interactive regions, with accessible loading/error states if initialization fails.

Direct DOM code written in TypeScript remains a reasonable fallback if the pilot has too little reactive UI to justify Alpine. Do not evaluate a collection of similar frameworks unless Alpine presents a concrete problem: the priority is one familiar, modest dependency and understandable code.

## Product scope

### Initial release

1. **Course catalog:** browse courses, filter by title or subject, and see episode counts and personal completion.
2. **Course page:** show the official source playlist, editorial episode order, completed/in-progress/unwatched states, and a continue button.
3. **Watch page:** embed one video, show its course context, resume position, offer previous/next episodes, and allow manual completion or reset.
4. **Continue learning:** surface recently active courses and the most recently watched unfinished video.
5. **History:** show each video's most recent viewing time and status, with links back into its course. Avoid an unbounded event log.
6. **Data controls:** export, import, and clear local progress, with a clear explanation that progress lives in this browser.

Start with one complete course as a vertical slice, then expand to a small curated selection before attempting the entire channel catalog. Scope the initial content to the official Crash Course channel; support additional explicitly approved Crash Course channels later through configuration.

### Deferred

Accounts, cloud sync, social features, notifications, subscriptions, recommendations powered by AI, generated answers, arbitrary question answering, transcript scraping, downloaded videos, service workers, offline video, and native apps. An AI tutor would require a separate product and cost decision.

## Visual design and personality

The site should feel at home alongside Crash Course: playful, fun, educational, bright, colorful, rounded, bouncy, and joyful. Make learning feel inviting and progress feel rewarding. A simple technical architecture should still support a lively visual personality.

### Design direction

- **Color:** use a warm, light background with bold, saturated accents. Give course subjects distinct accent colors, repeated consistently on course cards, episode headings, and progress indicators. Balance bright areas with generous quiet space so the catalog remains easy to scan.
- **Shapes:** use generous rounded corners, pill-shaped labels, chunky progress bars, and friendly circular details. Add occasional simple CSS or SVG doodles inspired by learning—stars, atoms, books, speech bubbles, and little celebratory bursts—without crowding the content.
- **Typography:** choose a friendly, rounded system-font stack where available, with bold, expressive headings and highly readable body text. Start without downloaded fonts. If system fonts cannot deliver the intended personality, consider one locally hosted, openly licensed font as a deliberate later addition.
- **Layout:** make course cards inviting and easy to browse, episode lists orderly, and the watch page focused on the video. Use comfortable spacing and clear hierarchy. Carry the same visual language through empty states, errors, and settings.
- **Controls:** use substantial rounded buttons with clear labels and a tactile pressed state. Favor short, encouraging copy, such as “Keep learning,” “Try again,” and “Nice work!” Keep feedback helpful and avoid guilt about unfinished courses.
- **Progress:** make progress visible and satisfying with colorful bars, completion checkmarks, and a small celebratory moment when a course is finished.

### Motion and accessibility

Use small CSS transitions for a gentle button bounce, card lift, progress change, or completion flourish. Keep motion brief and tied to an action; avoid perpetual bouncing, flashing decoration, or animation that distracts from a video. Honor `prefers-reduced-motion`, and make all interactions understandable with animation disabled. No animation library is needed.

Preserve strong text contrast, visible keyboard focus, comfortable touch targets, semantic controls, and readable text sizes. Bright colors are accents, not a reason to sacrifice legibility. Never rely on color alone for subject labels, playback status. Hover effects must have equivalent keyboard and touch behavior.

### Relationship to Crash Course

Before implementation, review the official channel and a representative selection of course artwork to ground the palette and visual rhythm in real references. Build a complementary original interface rather than assuming permission to reuse logos, mascots, illustrations, or other brand assets. Attribute the videos, link to their official sources, and make the site's independent status clear. Use official artwork only where its use is permitted.

Create a small set of CSS custom properties for colors, spacing, corner radii, shadows, and motion so the look stays consistent without a design-system dependency. Validate the direction on a catalog card, course episode list, watch page before expanding it across the site.

## Pages and navigation

| Page                                       | Purpose                                                                           |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| `index.html`                               | Continue learning, course catalog, simple search/filter                           |
| `course.html?id=biology`                   | Course overview and ordered episode list                                          |
| `watch.html?course=biology&video=VIDEO_ID` | Player, progress, next episode                                                    |
| `history.html`                             | Recent viewing and course links                                                   |
| `settings.html`                            | Export/import/reset, storage status, preferences                                  |
| `about.html`                               | Independent-project disclosure, content attribution, privacy and data limitations |

Use real links and browser navigation. Validate query parameters against the catalog; render a useful error for unknown IDs. Use relative asset paths so deployment under a subdirectory works. Give pages useful titles and visible loading/error states. With JavaScript disabled, explain the requirement and provide an ordinary link to the official channel or playlist.

## Content and YouTube integration

### Separate catalog publication from visitor playback

Visitors fetch our static catalog files. They do not enumerate YouTube playlists or search YouTube on every page load. Videos stream directly through the official embedded player; our host never proxies or stores video files.

The initial catalog is manually curated from official playlists, with verified channel and playlist IDs, episode order, titles, and source links. Do not assume every upload or every item in a playlist belongs in a course. Record the source and last-reviewed date. Do not scrape YouTube HTML or rely on undocumented endpoints.

Later, if maintaining many courses becomes tedious, add a small maintainer-run import script using the official YouTube Data API. It can run on a maintainer's computer and produce a reviewable catalog diff. It is not part of the website runtime, and the published files contain no API credentials. Handle pagination, duplicate videos, missing items, and channel allowlisting. Check current API storage/refresh/deletion requirements before adopting API-derived metadata; an indefinitely retained API snapshot must not be assumed compliant. Only introduce scheduled refresh infrastructure if those requirements and catalog scale justify it.

The official playlist-items endpoint is documented here: [YouTube playlistItems.list](https://developers.google.com/youtube/v3/docs/playlistItems/list).

### Player behavior

- Create only one player, on the watch page, after a clear user action; load the player API when needed.
- Preserve standard YouTube controls, attribution, ads, fullscreen, captions, and links.
- Configure the actual site origin and appropriate referrer behavior. Test on HTTPS and localhost; `file://` is not a supported development target.
- Read position and duration through the player API; listen for ready, playing, paused, ended, and error states.
- Sample position approximately every five seconds during playback. Save on pause and episode changes; attempt a final save when the page becomes hidden, without depending on unload to finish an asynchronous write.
- Offer “Resume at …” and “Start over.” Seek only after the player is ready; do not assume autoplay succeeds.
- Show an explicit next-episode action at the end. Avoid surprising automatic playback in the first release.
- For disabled embeds, removed/private videos, network failure, or player blocking, show a useful message and an “Open on YouTube” link. Manual completion remains available.
- Explain that watching directly on YouTube does not update this site's local history.

Player methods, events, and error behavior: [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference).

## Google / YouTube account research

Researched October 30, 2026. Keep the initial site account-free; optional Google authorization is technically possible, but does not solve YouTube progress synchronization.

| Capability                                             | Finding                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign in with Google                                    | Can identify a visitor who consents to share profile information. It does not itself provide YouTube API permissions, cloud storage, or a signed-in player session.                                                                                                                                   |
| Authorize YouTube account access                       | Google OAuth can authorize supported account operations, such as access to ordinary private playlists. There is no separate independent YouTube identity system to integrate.                                                                                                                         |
| Browser-only authorization                             | Google's Identity Services token model documents direct browser API access with short-lived tokens and user-driven renewal. A backend is not inherently required for that model, but Google Cloud/OAuth configuration, scopes, consent, token handling, and potentially verification add maintenance. |
| Use existing YouTube session during playback           | Standard YouTube embeds can recognize an existing YouTube session where browser cookie/privacy rules permit it. This session belongs to YouTube, outside our site's control.                                                                                                                          |
| YouTube Premium                                        | Embedded playback can honor Premium when the viewer is recognized. YouTube explicitly advises allowing YouTube cookies when Premium users see ads in embeds. Do not guarantee this across browsers or privacy configurations.                                                                         |
| Read or synchronize YouTube watch history              | Not available through the official Data API, even with account authorization. Watch Later is also unavailable.                                                                                                                                                                                        |
| Import YouTube resume positions / write watch progress | No documented public player or Data API facility provides account-wide resume-position synchronization. Keep our own local progress authoritative.                                                                                                                                                    |

Sign-in on our site and sign-in inside YouTube's cross-origin player are separate. The documented IFrame API has no OAuth-token/account-selection interface for binding the player to the account a visitor chooses in our app. Do not advertise “Connect YouTube” as a way to force player identity, enable Premium, or synchronize viewing history.

Recommendation: use the official standard embed if compatibility with existing YouTube sessions is the desired priority, retain local course progress, and always offer “Open on YouTube.” Test signed-in/out playback, Premium, blocked cookies, and multiple-account browsers during the pilot. Watching on YouTube itself uses YouTube's own account experience but cannot report completion back to this site. Any recording of embedded views in YouTube history should be treated as YouTube-controlled behavior, not a promised integration.

Privacy-enhanced embeds are a separate product choice: YouTube documents that views through that mode do not personalize the viewer's YouTube browsing experience. Do not assume standard and privacy-enhanced embeds have identical account behavior. Decide the default after testing and clearly explain the choice.

Sources:

- [Sign in with Google overview](https://developers.google.com/identity/gsi/web/guides/overview)
- [Google Identity Services browser token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
- [YouTube playlist API errors: watchHistoryNotAccessible and watchLaterNotAccessible](https://developers.google.com/youtube/data/reference/rest/v3/playlistItems/list#errors)
- [YouTube Premium troubleshooting, including embedded-player cookies](https://support.google.com/youtube/answer/7437519?co=GENIE.Platform%3DDesktop&hl=en)
- [YouTube embedding and privacy-enhanced mode](https://support.google.com/youtube/answer/171780?hl=en)

## Progress rules and local data

Keep the storage adapter small: load, save, export, import, clear, and migrate. UI and player modules must not access storage directly. Use namespaced keys and a schema version. localForage offers a familiar asynchronous key/value API: [official documentation](https://github.com/localForage/localForage/blob/master/docs/api.md).

Suggested records:

- **Video progress, keyed by YouTube video ID:** resume position, observed duration, last watched timestamp, completed flag, and completion source (manual or player ended).
- **Course activity, keyed by course ID:** most recent video and activity timestamp. Derive completion counts from the current course membership and video progress.
- **Preferences:** only options the interface actually needs.
- **Export envelope:** schema version, export timestamp, and the records above.

A video reused in two courses shares viewing progress. Course completion is completed required episodes divided by currently available required episodes. Display unavailable episode counts separately; preserve their historical progress. Catalog changes can change the denominator, so do not store course percentages as authoritative data.

Mark a video complete on the player's ended event or an explicit user action. Playback position alone is not evidence of watching: seeking near the end should not immediately mark completion. Completion is a learning convenience, not proof of attendance. Rewatching does not silently clear completion; provide an explicit reset action.

Clamp invalid positions and handle unknown/zero duration. If a saved position is at the end, offer replay instead of resuming into the ending. Serialize saves within a tab to avoid out-of-order writes. For the initial release, document last-save-wins behavior if the same video is played in multiple tabs; avoid a complicated synchronization layer.

### Reliability and privacy

- Progress belongs to this browser profile and site origin. Clearing site data, private browsing, browser eviction, changing domain, or switching devices can lose or separate it.
- Export/import is the supported backup and device-transfer mechanism. Encourage an export before a domain move.
- Detect storage failures. Keep playback usable with temporary in-memory progress and visibly explain that it cannot be saved.
- Validate imports before writing: supported schema, allowed fields, record counts/file-size limits, finite timestamps/positions, and known value types. Never render imported strings as HTML.
- Start with confirmed replacement imports, preceded by an export opportunity; defer clever merge behavior.
- Version migrations, preserve recoverable data on failure, and never silently reset a store that cannot be read.
- No analytics or tracking SDKs. Explain that loading a YouTube player sends requests to YouTube; local progress storage does not make playback private from YouTube.

## Repository organization

The implemented source layout follows lightweight domain-driven organization. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the authoritative file map and placement rules. Catalog types and validation live in `src/catalog/domain/`, JSON loading in `src/catalog/infrastructure/`, and Alpine page entries in `src/catalog/presentation/`. Shared site styles and about-page behavior live in `src/site/`. Tests are colocated.

Root HTML files remain Vite's explicit multi-page entries, and `public/data/` remains the curated static content source. Alpine is bundled from its pinned package. Learning progress and playback have their own domain folders, rather than growing a collection of unrelated top-level modules. Do not scaffold empty domains or layers.

Use system fonts, semantic HTML, ordinary CSS, and a small consistent set of layout rules. Alpine is the only UI library. Allow a pinned static icon package for a small selected SVG sprite; no icon runtime, CSS framework, font service, dependency container, or additional application state framework. Duplicate modest shared page markup until maintaining it becomes an actual problem; do not create a template system preemptively.

## Implementation sequence and acceptance checks

### 1. Static foundation and pilot catalog

Add the minimal Vite+ development setup and document install, serve, format, lint, and test commands. Create the shared visual style, catalog/course pages, and one verified course fixture. Confirm ordinary links, query parameters, mobile layout, keyboard navigation, loading failures, and deployment under a subdirectory. Verify type checking, build every HTML entry, and confirm that an ordinary static server can serve `dist/` without Vite+.

### 2. Playback and durable progress

Integrate the player and storage adapter. Verify play → pause → reload → resume, next/previous navigation, explicit completion/reset, unavailable embeds, and blocked storage. Confirm that seeking does not itself complete a video and that two courses sharing a video show consistent status.

### 3. Continue learning and history

Derive course progress, recent courses, and viewing history from saved records. Test a new browser profile, fully completed courses, replay, catalog reorder/addition/removal, and missing video IDs. Never require a network catalog refresh to recover local records.

### 4. Data portability and release

Implement validated export/import and confirmed resets. Test export → clear → import round trips, malformed imports, storage failure, schema migration, and progress across a deployment update on the same origin. Check current Safari, Firefox, Chromium, and a mobile browser with actual YouTube playback.

Use Vite+'s included Vitest runner for focused automated tests of progress calculations, import validation, and recovery. Run formatting/lint checks through `vp`; do not add a separate tooling stack. Keep browser verification manual initially; add a browser-testing dependency only if repeated regressions justify it. Development tooling is never a production dependency.

## Hosting and ongoing maintenance

Deploy to Vercel as a static multi-page Vite site using its ordinary Git integration. Set the repository root as the project root, run the package `build` script, and publish `dist/`. Pin compatible Node and package-manager versions and install from the committed lockfile. No Vercel Functions, SSR, database, authentication service, or platform runtime SDK is needed.

Use branch previews to check the built site and the production branch for normal releases. Keep conventional HTML URLs and avoid a blanket SPA rewrite, which would mask missing pages. Add `vercel.json` only for settings we actually need. Vercel handles the build; a separate deployment CI workflow is unnecessary initially. Confirm current plan eligibility, quotas, and terms when deploying rather than promising permanent zero cost.

Keep a stable production origin: each preview hostname has separate browser storage, and preview progress does not transfer automatically to production. Document how to build and host `dist/` elsewhere and how to export progress before changing origins. A custom domain is optional and creates a recurring cost.

The site shell and catalog should continue working if the storage library's upstream disappears because a licensed copy is included. Playback still depends on YouTube, the videos remaining available, embedding permission, network access, and browser support. Catalog updates require editorial work. Review links, video availability, dependency advisories, and YouTube integration requirements periodically; do not assume free hosting means zero maintenance.

## Decisions to revisit after the pilot

- Which courses to include next.
- Whether catalog maintenance warrants an official API importer and its associated refresh obligations.
- Whether localForage earns its dependency cost after testing storage failure and import/export behavior.
- Which stable Vercel production URL or custom domain to use when deployment is requested.

The complete pilot release spans these milestones: one course that can be watched, resumed after closing the browser, and backed up to a file, using only static hosting.

## Post-pilot: catalog expansion

The user confirmed the remaining pilot release checks complete on October 30, 2026. Milestones 1–4 are complete.

### 5. World History and Biology

Add the complete World History series (42 numbered episodes, John Green) and the current Biology series (50 numbered episodes, Dr. Sammy Ramsey). Keep the existing static JSON model and verify episode numbers, IDs, and source URLs against official course pages. Exclude previews and extras. Derive subject filters from the catalog and remove single-course copy from shared pages. Validate every detail file at build time and check filtering, first/last lesson navigation, playback, and independent progress across courses. No API keys, importer service, or runtime dependencies are needed.

### 6. Astronomy, Philosophy, and Computer Science

Add 46 numbered Astronomy episodes, 46 Philosophy episodes, and 40 Computer Science episodes. Preserve the static catalog and derive subject filters from data. Include Computer Science #40 from its verified official YouTube upload because it is absent from the website’s topic listing. Exclude previews, bonus tours, and related demonstration embeds. Validate all course files, verify first/last navigation, and check playback, independent progress, and long course titles at narrow widths. No new dependencies are needed.

### 7. Chemistry, Psychology, and Economics

Add 46 Chemistry lessons, 40 Psychology lessons, and 35 Economics lessons, bringing the catalog to nine courses and 355 numbered episodes. Verify every official lesson embed and playlist, exclude unnumbered introductions, extend the catalog contract checks, and check subject filters, first/last navigation, playback, saved resume, and narrow layouts. Keep the static JSON structure and existing runtime dependencies.

### 8. U.S. History, Physics, and Linguistics

Add 47 numbered U.S. History lessons, 46 Physics lessons, and 16 Linguistics lessons, bringing the catalog to twelve courses and 464 lessons. Verify official lesson embeds and playlists, exclude previews and the unnumbered U.S. History special, and sort episode 25 into its numbered position. Extend existing catalog contract checks and verify search, course boundaries, playback, resume, and narrow layouts. Preserve static JSON and existing dependencies.

### 9. Statistics, Media Literacy, and Ecology

Add 44 Statistics lessons, 12 Media Literacy lessons, and 12 Ecology lessons, bringing the catalog to fifteen courses and 532 lessons. Verify official episode embeds and playlists, exclude unnumbered extras, and sort Statistics lessons by number. Extend catalog contract checks, introduce the data-derived Mathematics subject, and verify filtering, playback, resume, final-lesson navigation, and narrow layouts. Keep static JSON and existing dependencies.
