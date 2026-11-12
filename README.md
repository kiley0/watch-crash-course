# Watch Crash Course

A fan-made home for watching [Crash Course](https://thecrashcourse.com/), one course at a time. Explore [Study Hall](https://gostudyhall.com/) in its own library. Browse subject bookshelves, watch lessons, and pick up where you left off—with progress, history, and backup export/import saved in your browser. No account needed.

**[Watch and learn →](https://watchcrashcourse.com)**

100% free forever. Open-source. Unofficial and unaffiliated with Crash Course, Study Hall, ASU, Complexly, or YouTube.

## Simple by design

A static, multi-page site built with HTML, CSS, TypeScript, Alpine.js (CSP), and localForage. Vite+ handles development, formatting, checks, tests, and production builds; Vercel serves the static output. No application server, database service, authentication, or runtime YouTube Data API.

- `public/data/` — curated course metadata and ordered lessons.
- `src/catalog/` — course rules, loading, search, and shelves.
- `src/playback/` — YouTube’s embedded player and watch pages.
- `src/learning/` and `src/data/` — local progress, history, and backups.
- `src/site/` — shared styles, identity, and browser storage.

Each domain keeps pure rules, infrastructure, and presentation together.

Progress stays in this browser and does not sync between devices. Back it up before clearing site data. Playback depends on YouTube and each video’s availability and embedding permissions.

## Run locally

Use Node.js 22.12+ (22.x) and the pnpm version pinned in `package.json`.

```sh
corepack pnpm install
pnpm dev
```

`pnpm fmt` formats the project. `pnpm build` runs formatting checks, lint, TypeScript, tests, and the production build. `pnpm preview` serves the built site.

## Link sharing and discovery

`src/site/presentation/sharing-metadata.ts` defines Open Graph, large-image social cards, canonical URLs, and descriptions. Its build adapter in `src/site/infrastructure/sharing-build.ts` renders them into the HTML at build time. Course and lesson previews come from the checked-in catalog, so sharing crawlers do not need JavaScript. The homepage also identifies this independent fan site with `WebSite` structured data. History, settings, and incomplete course/lesson links use `noindex`.

The build generates a sitemap and static `_course-*.html` / `_watch-*.html` variants. `vercel.json` rewrites the existing public query URLs to these files; the generic templates are emitted as `_course.html` and `_watch.html` to avoid Vercel filesystem precedence. Keep these rules and the generator aligned. Other static hosts need equivalent query routing. `pnpm preview` mirrors it locally; unknown course/video pairs return 404 on Vercel.

The sharing image is `public/social/book-preview.png` (1200 × 630), with an editable SVG beside it. Update the PNG when editing the SVG, and change the image filename in the generator when replacing an already shared image to avoid stale platform caches. Canonical URLs use `https://www.watchcrashcourse.com`, the production hostname. After deployment, verify raw HTML with a sharing crawler user agent, check the image response, and use platform inspection tools to refresh existing previews. Platform caches may delay changes.

## Help make it better

Found a broken video, incorrect course detail, accessibility problem, or bug? [Open an issue](https://github.com/kiley0/watch-crash-course/issues). Pull requests to fix issues are welcome—keep changes focused, preserve the simple architecture, and run `pnpm fmt` and `pnpm build`. Check affected flows in the browser, including keyboard use and mobile layouts. For playback changes, check play, pause, and resume after reloading. Test backup changes in a disposable browser profile. See [the contributor guide](ARCHITECTURE.md) for code placement and data conventions.

## Keep learning, together

Pick a subject you love, follow a new question, and share what you learn. Explore [Crash Course](https://thecrashcourse.com/) and the other educational shows at [Complexly](https://complexly.org/). Meet the wider community through [vlogbrothers](https://www.youtube.com/@vlogbrothers) and [Nerdfighteria](https://nerdfighteria.com/).

Help keep their work freely available: [support Crash Course on Patreon](https://www.patreon.com/crashcourse) or [support Complexly](https://complexly.org/support/).

DFTBA.

## License

Original code and artwork are [MIT licensed](LICENSE). Third-party material retains its own rights; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
