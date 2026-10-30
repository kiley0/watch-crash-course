# Repository guidance

Read `ARCHITECTURE.md` before adding or relocating application code. Keep this a static HTML/CSS/TypeScript application with Alpine CSP and Vite+.

- Organize code by its owning domain, then by domain rules, infrastructure, and presentation.
- Keep domain code pure and independent of browser globals, data access, and UI libraries.
- Colocate meaningful tests with their source module. Keep public JSON and asset URLs stable.
- Use explicit imports; avoid speculative layers, generic utilities, barrel exports, and new runtime dependencies.
- Preserve the independent fan-made disclosure, third-party attribution, accessibility, and reduced-motion support.
- Run `pnpm fmt` and `pnpm build` for code changes. Verify affected interactions in the browser.
