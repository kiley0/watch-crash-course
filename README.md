# Watch Crash Course

A fan-made home for watching [Crash Course](https://thecrashcourse.com/), one course at a time. Explore [Study Hall](https://gostudyhall.com/) in its own library. Browse subject bookshelves, watch lessons, and pick up where you left off—with progress, history, and backup export/import saved in your browser. No account needed.

**[Watch and learn →](https://watchcrashcourse.com)**

100% free forever. Open-source. Unofficial and unaffiliated with Crash Course, Study Hall, ASU, Complexly, or YouTube.

## Simple by design

A static, multi-page site built with HTML, CSS, TypeScript, Alpine.js (CSP), and localForage. Vite+ handles development, formatting, checks, tests, and production builds; Vercel serves the static output. No application server, database service, authentication, or runtime YouTube Data API.

- `public/data/` — curated course metadata and ordered lessons. See [the course inventory](COURSES.md).
- `src/catalog/` — course rules, loading, search, and shelves.
- `src/playback/` — YouTube’s embedded player and watch pages.
- `src/learning/` and `src/data/` — local progress, history, and backups.
- `src/site/` — shared styles, identity, and browser storage.

Each domain keeps pure rules, infrastructure, and presentation together. See [ARCHITECTURE.md](ARCHITECTURE.md) for the placement guide.

Progress stays in this browser and does not sync between devices. Back it up before clearing site data. Playback depends on YouTube and each video’s availability and embedding permissions.

## Run locally

Use Node.js 22.12+ (22.x) and the pnpm version pinned in `package.json`.

```sh
corepack pnpm install
pnpm dev
```

`pnpm fmt` formats the project. `pnpm build` runs formatting checks, lint, TypeScript, tests, and the production build. `pnpm preview` serves the built site.

## Help make it better

Found a broken video, incorrect course detail, accessibility problem, or bug? [Open an issue](https://github.com/kiley0/watch-crash-course/issues). Pull requests to fix issues are welcome—keep changes focused, preserve the simple architecture, and run `pnpm fmt` and `pnpm build`. Check affected pages in the browser; [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) covers the main flows.

## Keep learning, together

Pick a subject you love, follow a new question, and share what you learn. Explore [Crash Course](https://thecrashcourse.com/) and the other educational shows at [Complexly](https://complexly.org/). Meet the wider community through [vlogbrothers](https://www.youtube.com/@vlogbrothers) and [Nerdfighteria](https://nerdfighteria.com/).

Help keep their work freely available: [support Crash Course on Patreon](https://www.patreon.com/crashcourse) or [support Complexly](https://complexly.org/support/).

DFTBA.

## License

Original code and artwork are [MIT licensed](LICENSE). Crash Course videos, names, and other third-party materials belong to their respective owners and are not covered by this license.
