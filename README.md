# Crash Course University

A bright, independent course guide for curious people. Ordinary HTML and CSS, TypeScript, Alpine's CSP build, and static JSON. Built with Vite+ and ready for static hosting on Vercel.

## Local development

Use Node 22.12+ (Vite+ also supports newer compatible releases) and pnpm 12.16.1, as recorded by the initializer in `package.json`. Run `vp install` if Vite+ is already installed, or `pnpm install --frozen-lockfile`. A global `vp` is optional; use `pnpm exec vp` for the local CLI.

- `pnpm dev` — development server.
- `pnpm fmt` — format source.
- `pnpm check` — formatting, lint, and strict TypeScript checks.
- `pnpm test` — catalog validation and discovery tests.
- `pnpm build` — checks, tests, then the multi-page build into `dist/`.
- `pnpm preview` — serve the production build.

## Code organization

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the domain map, dependency rules, and a “where new work goes” guide. Catalog rules, static JSON loading, and page interactions live together under `src/catalog/`, separated by responsibility. Shared visual identity lives in `src/site/`. Tests sit beside their modules.

## Milestone 1

Catalog search and subject filtering, a complete Study Skills course page with all ten numbered episodes, episode search, official YouTube links, accessible responsive styling, and an about/privacy page. Catalog/network errors and unknown course IDs have useful recovery states. No fabricated course or viewing progress is shown.

Playback currently opens on YouTube. Embedded playback and durable progress are milestone 2; continue/history, quizzes, and backup/import follow later. This release stores no learning history and requires no account or API key.

## Content maintenance

The checked-in files in `public/data/` are manually curated. The course index contains metadata; `courses/study-skills.json` contains the ordered numbered episodes. The optional preview is excluded. Source links point to Crash Course's official episode pages, which supplied the video IDs. Reviewed October 30, 2026 against [the official course](https://thecrashcourse.com/topic/studyskills/). Descriptions and illustrations are original. No scraping or live Data API is used by visitors. Run the tests after editing the catalog: they validate counts, ordering, IDs, and source URLs.

## Hosting

Import the repository into Vercel as a Vite project. Enable Corepack in the Vercel project settings (`ENABLE_EXPERIMENTAL_COREPACK=1`) so the `packageManager` pin is used. Install with `pnpm install --frozen-lockfile`, set build command to `pnpm build`, and output directory to `dist`. Select a Node version satisfying `engines` and supported by the pinned pnpm release. No server functions, environment secrets, SPA fallback rewrite, or custom deployment workflow is required.

All three HTML pages are explicit build entries. `public/` is copied unchanged. The relative base, page links, and JSON URLs support a subdirectory deployment. `dist/` can be served by any static HTTPS host without Node, Vite+, or Vercel. Test with `vp preview` or an ordinary static server rooted at `dist/`. Keep a stable production origin when local progress is introduced; preview URLs have separate browser storage.

## Dependencies and design

Alpine CSP 3.17.5 is pinned, installed from the registry, bundled into the local site assets, and never loaded from a CDN. Vite+ handles transpilation and checks. Lucide provides a small, checked-in SVG sprite of eight selected icons. No icon runtime, CSS framework, font, or animation library is used. The original SVG illustration and CSS artwork complement Crash Course's cream/teal/navy palette without reusing brand artwork. Motion respects reduced-motion preferences.

See `WEBSITE_PLAN.md` for remaining milestones and `THIRD_PARTY_NOTICES.md` for attribution. This is not an official Crash Course service or an accredited university.

## Milestone verification

`pnpm build` passes formatting, lint, strict type checks, the colocated test suite, and the three-page production build. Browser checks covered catalog and episode searches, subject selection, empty-state reset, unknown-course recovery, an unavailable catalog followed by retry, and the about page. Desktop and 390px mobile layouts were inspected; neither mobile page overflowed horizontally. Cross-browser testing on Safari and Firefox remains for release.

An ordinary Python static server returned all three pages, seven referenced assets, and both JSON files successfully from a `/university/` subdirectory. The in-app browser could not reach that second server, so this portability check used HTTP responses rather than a browser-rendered subdirectory session. The main production-preview browser checks passed. No deployment has been created.

## Community voice

Copy includes small references to Nerdfighteria and the Green brothers’ projects: enthusiasm, complex thinking, a Thought Bubble note, and a quiet DFTBA sign-off. Optional search discoveries and an accessible about-page illustration tuck away deeper references. Ordinary navigation and factual course labels remain explicit; these references do not imply affiliation.

Background sources: [the community lexicon](https://nerdfighteria.com/lexicon/), [fan recollections](https://www.reddit.com/r/nerdfighters/comments/1hw176q), [Pumpkins and Penguins](https://podcasts.apple.com/us/podcast/62-pumpkins-and-penguins-and-fiddles/id1002937870?i=1000375226530), and [The Universe Is Weird](https://www.youtube.com/watch?v=zcwkOFSrLFI). The miniature elephant is original SVG artwork. Community discoveries add no dependencies or persistent tracking.

## License

[MIT](./LICENSE) applies to this project's original application code, documentation, descriptions, and artwork. It is a standard permissive open-source software license: people can use, modify, redistribute, and commercially reuse the software while retaining the copyright and license notice. MIT keeps forks easy to maintain and does not require a contributor agreement or a separate license for each original asset.

MIT permits proprietary derivatives and does not require forks to remain free of charge or open-source. “100% free forever” describes our commitment for this website; it is not an additional restriction on the MIT license.

Crash Course videos, third-party source text and quotations, logos, and branding are not relicensed by this repository. Factual video identifiers and source links do not imply ownership of the linked material. Referencing a community phrase does not give us exclusive rights to it. This project's license does not grant permission from Crash Course, Complexly, or YouTube to use their trademarks or imply endorsement.

Dependencies retain their own licenses. See [third-party notices](./THIRD_PARTY_NOTICES.md). The standard license text is kept unchanged in `LICENSE`, identified as `MIT` in `package.json`, and also included in `public/licenses/Crash-Course-University-MIT.txt` for published builds. Keep that published copy in sync if the copyright notice changes.

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
