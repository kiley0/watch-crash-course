/// <reference types="node" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite-plus";
import { parseCatalog, parseDetail } from "../domain/course";

// Build a text-only index so searching needs one request, not every episode file.
function searchAssets() {
  const catalog = parseCatalog(
    JSON.parse(readFileSync(resolve("public/data/courses.json"), "utf8")),
  );
  return ["crash-course", "study-hall"].map((collection) => ({
    fileName: `data/course-search/${collection}.json`,
    source: JSON.stringify(
      Object.fromEntries(
        catalog
          .filter((course) => course.collection === collection)
          .map((course) => {
            const detail = parseDetail(
              JSON.parse(readFileSync(resolve(`public/data/courses/${course.id}.json`), "utf8")),
              course,
            );
            return [
              course.id,
              detail.episodes
                .map((episode) => `${episode.title} ${episode.description ?? ""}`)
                .join(" "),
            ];
          }),
      ),
    ),
  }));
}

export function catalogSearchIndex(): Plugin {
  return {
    name: "catalog-search-index",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = new URL(request.url ?? "/", "http://localhost").pathname;
        if (!/^\/data\/course-search\/(crash-course|study-hall)\.json$/.test(path)) return next();
        // Read current JSON for dev requests so catalog edits cannot leave search stale.
        try {
          const asset = searchAssets().find((item) => `/${item.fileName}` === path)!;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.setHeader("Cache-Control", "no-cache");
          response.end(asset.source);
        } catch (error) {
          next(error);
        }
      });
    },
    generateBundle() {
      for (const asset of searchAssets()) this.emitFile({ type: "asset", ...asset });
    },
  };
}
