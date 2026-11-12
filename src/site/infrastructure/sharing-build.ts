/// <reference types="node" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite-plus";
import { parseCatalog, parseDetail, isCourseId } from "../../catalog/domain/course";
import {
  metadataFor,
  renderMetadata,
  renderSitemap,
  siteOrigin,
  staticSitemapPaths,
} from "../presentation/sharing-metadata";

export function sharingPreviewPath(raw: string): string | undefined {
  const url = new URL(raw, siteOrigin);
  if (url.pathname === "/course.html") {
    const id = url.searchParams.get("id") ?? "";
    return isCourseId(id) ? `/_course-${id}.html` : "/_course.html";
  }
  if (url.pathname === "/watch.html") {
    const course = url.searchParams.get("course") ?? "";
    const video = url.searchParams.get("video") ?? "";
    return isCourseId(course) && /^[A-Za-z0-9_-]{11}$/.test(video)
      ? `/_watch-${course}-${video}.html`
      : "/_watch.html";
  }
}

export function sharingMetadata(): Plugin {
  const catalog = parseCatalog(
    JSON.parse(readFileSync(resolve("public/data/courses.json"), "utf8")),
  );
  const details = new Map(
    catalog.map((course) => [
      course.id,
      parseDetail(
        JSON.parse(readFileSync(resolve(`public/data/courses/${course.id}.json`), "utf8")),
        course,
      ),
    ]),
  );
  function selection(raw: string) {
    const url = new URL(raw, siteOrigin);
    const path = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const course = catalog.find(
      (course) => course.id === url.searchParams.get(path === "course.html" ? "id" : "course"),
    );
    const episode = course
      ? details
          .get(course.id)
          ?.episodes.find((episode) => episode.videoId === url.searchParams.get("video"))
      : undefined;
    return { path, course, episode };
  }
  return {
    name: "static-sharing-metadata",
    enforce: "post",
    transformIndexHtml: {
      order: "post",
      handler(html, context) {
        const { path, course, episode } = selection(context.originalUrl ?? context.path);
        const metadata = metadataFor(path, course, episode);
        return metadata ? renderMetadata(html, metadata) : html;
      },
    },
    configurePreviewServer(server) {
      // Mirror Vercel's static query routing when verifying a production build locally.
      server.middlewares.use((request, _response, next) => {
        const raw = request.url ?? "/";
        const path = sharingPreviewPath(raw);
        if (path) request.url = path + new URL(raw, siteOrigin).search;
        next();
      });
    },
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const paths = staticSitemapPaths();
        for (const path of ["course.html", "watch.html"]) {
          const template = bundle[path];
          if (!template || template.type !== "asset") throw new Error(`Missing ${path} template.`);
          const html = String(template.source);
          // Public query URLs must reach rewrites before Vercel's filesystem lookup.
          delete bundle[path];
          this.emitFile({ type: "asset", fileName: `_${path}`, source: html });
          for (const course of catalog) {
            const episodes = path === "watch.html" ? details.get(course.id)!.episodes : [undefined];
            for (const episode of episodes) {
              const metadata = metadataFor(path, course, episode)!;
              paths.push(metadata.path);
              this.emitFile({
                type: "asset",
                fileName: `_${path === "course.html" ? "course" : "watch"}-${course.id}${episode ? `-${episode.videoId}` : ""}.html`,
                source: renderMetadata(html, metadata),
              });
            }
          }
        }
        this.emitFile({ type: "asset", fileName: "sitemap.xml", source: renderSitemap(paths) });
      },
    },
  };
}
