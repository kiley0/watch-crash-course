# Code organization

We use lightweight domain-driven organization: code lives beside the subject it serves, and business rules stay independent of browser libraries and data access. This is one static application, one package, and one build. Folders express responsibilities; they do not require classes, services, dependency injection, or a framework.

## Current map

```text
index.html                              Catalog page markup
course.html                             Course page markup
about.html                              About/privacy markup
watch.html                              Playback, resume, and episode navigation
history.html                            Latest saved video activity and filters
src/
  catalog/                              Courses and their ordered episodes
    domain/
      course.ts                         Types and catalog/episode validation rules
      course.test.ts
      search.ts                         Course and episode query matching
      search.test.ts
    infrastructure/
      static-catalog.ts                 Fetch static JSON, timeouts, parse responses
      static-catalog.test.ts
    presentation/
      catalog-page.ts                   Catalog Alpine state and page entry
      course-page.ts                    Course Alpine state and page entry
      shelf-surprises.ts                Optional search discoveries and community copy
  learning/
    domain/progress.ts                  Pure progress transitions and record validation
    domain/course-summary.ts            Derived completion, continue selection, history order
    infrastructure/progress-store.ts    Serialized persistence and in-memory fallback
    infrastructure/browser-progress.ts  localForage backend and browser instance
    presentation/progress-labels.ts     Time labels
    presentation/history-page.ts        Local history first, optional catalog enrichment
    presentation/history-entries.ts     Rows rebuilt from records and current metadata
    presentation/history.css            History-page visual components
  playback/
    infrastructure/youtube-player.ts    Lazy IFrame API, events, sampling, lifecycle
    presentation/watch-page.ts          Watch-page Alpine state and composition
    presentation/watch-links.ts         Internal watch-page URLs
    presentation/youtube-links.ts       External YouTube URLs
    presentation/watch.css              Watch-page visual components
  site/                                 Shared site identity and informational UI
    styles.css                          Shared design tokens, components, responsive rules
    about-page.ts                       About-page entry and surprise toggle
    reload-on-restore.ts                Refresh stale views restored by browser history
  types/
    alpine.d.ts                         External package type declarations
public/
  data/
    courses.json                        Curated course index
    courses/<course-id>.json            Ordered episode data
  icons.svg                             Selected, licensed icon sprite
  illustration.svg                      Original shared artwork
  favicon.svg
  licenses/                             Published license copies
```

Root HTML files remain explicit Vite build entries. Keeping them at the root preserves simple static URLs and ordinary relative links. Their scripts initialize one page each. We deliberately duplicate the small header/footer rather than adding a template engine.

## Dependency direction

- **Domain** owns course terminology, data contracts, and pure rules. It uses TypeScript and standard JavaScript only. It never imports Alpine, page modules, CSS, `fetch`, or browser globals.
- **Infrastructure** handles loading and external formats. It imports domain types and validators. Static JSON is untrusted at runtime until validated. Browser fetch details and recovery mechanics belong here.
- **Presentation** handles Alpine, DOM-facing state, labels, navigation, and UI-only copy. It may call infrastructure and domain functions. It does not duplicate validation rules or fetch JSON itself.
- **Site** owns shared visual identity and informational interactions. Catalog code can import its stylesheet. Site code does not own course rules.

Use explicit imports from the owning file. Avoid barrel exports, path aliases, catch-all `utils` folders, and a generic `shared` domain. Put a helper beside its first caller; move it only when its responsibility or reuse is clear. A small module can contain closely related types and functions, as `course.ts` does.

There is no application layer yet: loading a catalog and filtering it does not need one. If a future workflow coordinates several domain operations, put that workflow in its domain's `application/` folder at that point. Introduce an interface only when an actual alternate adapter or test boundary needs it.

## Where new work goes

| Change                                                     | Location                                                                           |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Add or correct a course                                    | `public/data/courses.json` and `public/data/courses/<id>.json`                     |
| Change valid course or episode rules                       | `src/catalog/domain/course.ts` and its test                                        |
| Change JSON loading, caching, or timeouts                  | `src/catalog/infrastructure/static-catalog.ts`                                     |
| Change catalog filters, loading UI, or course labels       | Corresponding `src/catalog/presentation/*-page.ts`                                 |
| Change visible page structure or static copy               | Root HTML for that page                                                            |
| Add a search Easter egg                                    | `src/catalog/presentation/shelf-surprises.ts`                                      |
| Change colors, spacing, shared controls, responsive layout | `src/site/styles.css`                                                              |
| Add a distinct page-only visual component                  | A CSS file beside that page's presentation module, imported there                  |
| Add an icon                                                | Selected symbol in `public/icons.svg`; retain its license notice                   |
| Add an interactive page                                    | Root HTML, an owning domain's presentation entry, and `vite.config.ts` build input |

`learning/` owns video progress keyed by YouTube ID. `playback/` owns the official player adapter and watch-page experience. Catalog presentation composes these capabilities to link episodes and show saved status; neither capability imports catalog presentation. Learning stores one progress record per video; course summaries receive the current episode IDs and derive membership-based counts without owning a copy of the catalog. Shared videos retain one record. Quizzes should get their own domain when implemented. Document narrow contracts when domain coordination is necessary and keep dependencies acyclic.

The watch page calls learning's storage adapter and playback's player adapter. The player only reports samples through a typed callback; it never knows how progress is stored. `createProgressStore` accepts a small backend boundary to test failure and ordering; `browser-progress.ts` alone imports localForage and creates the browser instance. Tests remain colocated, including beside the new modules. `progressStore.list()` reads all namespaced records without a catalog dependency. History presentation composes those records with optional catalog metadata; catalog failures cannot hide readable saved records. Catalog and course presentation reuse the pure summary rules, rather than storing percentages or course totals.

## Tests and change checks

Tests are colocated as `*.test.ts` beside the module they protect. Domain tests run without DOM mocks; infrastructure tests may mock browser boundaries. The curated JSON doubles as a real fixture, so content mistakes fail the build. Avoid testing trivial markup or mirroring implementation details.

Run `pnpm fmt` and `pnpm build` after changing module locations, contracts, or entries. The build runs formatting, lint, strict type checks, tests, and all HTML entries. For interactive changes, also verify the affected page in the browser. Do not add a dependency just to enforce these few folder rules.
