import { collectionLabel } from "../../catalog/domain/course";
import type { Course, Episode } from "../../catalog/domain/course";
import { pageTitle } from "./page-title";

export const siteOrigin = "https://www.watchcrashcourse.com";
const siteName = "Watch Crash Course";
const image = `${siteOrigin}/social/book-preview.png`;
const imageAlt =
  "An open book: Watch Crash Course. Your next chapter starts here. Explore, watch, and keep your place. An unofficial, fan-made site.";

interface Metadata {
  detail: string;
  description: string;
  path: string;
  index: boolean;
}

const pages: Record<string, Metadata> = {
  "index.html": {
    detail: "Stay curious",
    description:
      "Explore Crash Course and Study Hall videos and track your progress. Free, no account needed. An independent, unofficial fan-made site.",
    path: "/",
    index: true,
  },
  "study-hall.html": {
    detail: "Study Hall",
    description:
      "Explore Study Hall courses, watch lessons, and keep your place. A free, unofficial fan-made guide, unaffiliated with Study Hall, ASU, or Crash Course.",
    path: "/study-hall.html",
    index: true,
  },
  "about.html": {
    detail: "About the project",
    description:
      "About this free, independent fan-made guide to Crash Course and Study Hall: local progress, privacy, video attribution, and how to support the creators.",
    path: "/about.html",
    index: true,
  },
  "course.html": {
    detail: "Course",
    description:
      "Explore courses and track your progress with this free, unofficial fan-made guide.",
    path: "/course.html",
    index: false,
  },
  "watch.html": {
    detail: "Lesson",
    description:
      "Watch lessons at your own pace, with your place saved in this browser. A free, unofficial fan-made guide.",
    path: "/watch.html",
    index: false,
  },
  "history.html": {
    detail: "Your learning history",
    description:
      "Pick up where you left off. Your viewing history and progress stay in your browser on this unofficial, fan-made site.",
    path: "/history.html",
    index: false,
  },
  "settings.html": {
    detail: "Settings",
    description:
      "Manage appearance, playback preferences, and local progress backups for this unofficial, fan-made learning guide.",
    path: "/settings.html",
    index: false,
  },
};

export function metadataFor(
  path: string,
  course?: Course,
  episode?: Episode,
): Metadata | undefined {
  const page = pages[path];
  if (!page) return;
  if (course && path === "course.html") {
    return {
      detail: course.title,
      description: `${course.description} An unofficial ${collectionLabel(course)} course guide.`,
      path: `/course.html?id=${course.id}`,
      index: true,
    };
  }
  if (course && episode && path === "watch.html") {
    return {
      detail: `${episode.title} · ${course.title}`,
      description: `Watch ${episode.title}, lesson ${episode.number} of ${course.episodeCount} in ${collectionLabel(course)} ${course.title}. Track your progress with this free, unofficial fan-made guide.`,
      path: `/watch.html?course=${course.id}&video=${episode.videoId}`,
      index: true,
    };
  }
  return page;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("'", "&#39;");
}

export function renderMetadata(html: string, metadata: Metadata): string {
  // Replace the complete generated block when rendering course/lesson variants.
  const clean = html
    .replace(/<!-- sharing:start -->[\s\S]*?<!-- sharing:end -->/g, "")
    .replace(/<title>[\s\S]*?<\/title>/g, "")
    .replace(/<meta\s+name="description"[\s\S]*?\/>/g, "")
    .replace(/<link\s+rel="canonical"[^>]*>/g, "");
  const title = escapeHtml(`${metadata.detail} · ${siteName}`);
  const tabTitle = escapeHtml(pageTitle(metadata.detail));
  const description = escapeHtml(metadata.description);
  const url = escapeHtml(`${siteOrigin}${metadata.path}`);
  const robots = metadata.index ? "max-image-preview:large" : "noindex, follow";
  const structured =
    metadata.path === "/"
      ? `<script type="application/ld+json">${JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteName,
          url: `${siteOrigin}/`,
          description: metadata.description,
          inLanguage: "en",
        }).replaceAll("<", "\\u003c")}</script>`
      : "";
  return clean.replace(
    "</head>",
    () => `<!-- sharing:start -->
    <title>${tabTitle}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="${robots}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${siteName}" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${imageAlt}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <meta name="twitter:image:alt" content="${imageAlt}" />
    ${structured}
    <!-- sharing:end -->
  </head>`,
  );
}

export function renderSitemap(paths: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((path) => `  <url><loc>${escapeHtml(`${siteOrigin}${path}`)}</loc></url>`).join("\n")}\n</urlset>\n`;
}

export function staticSitemapPaths(): string[] {
  return Object.values(pages)
    .filter((page) => page.index)
    .map((page) => page.path);
}
