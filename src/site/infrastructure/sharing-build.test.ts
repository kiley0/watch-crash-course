import { readFileSync } from "node:fs";
import { build } from "vite-plus";
import { describe, expect, it } from "vite-plus/test";
import catalog from "../../../public/data/courses.json";
import astronomyDetail from "../../../public/data/courses/astronomy.json";
import hosting from "../../../vercel.json";
import { parseCatalog } from "../../catalog/domain/course";
import { sharingMetadata, sharingPreviewPath } from "./sharing-build";
const episode = astronomyDetail.episodes[0]!;

describe("static hosting query routing", () => {
  it("routes course and lesson query parameters to the generated HTML filenames", () => {
    const courseRule = hosting.rewrites[0]!;
    const watchRule = hosting.rewrites[1]!;
    expect(courseRule.source).toBe("/course.html");
    expect(watchRule.source).toBe("/watch.html");
    for (const course of parseCatalog(catalog)) {
      expect(new RegExp(`^${courseRule.has![0]!.value}$`).exec(course.id)?.groups?.courseId).toBe(
        course.id,
      );
    }
    expect(new RegExp(`^${watchRule.has![1]!.value}$`).exec(episode.videoId)?.groups?.videoId).toBe(
      episode.videoId,
    );
    expect(courseRule.destination).toBe("/_course-:courseId.html");
    expect(watchRule.destination).toBe("/_watch-:courseId-:videoId.html");
    expect(hosting.rewrites.slice(2)).toEqual([
      { source: "/course.html", destination: "/_course.html" },
      { source: "/watch.html", destination: "/_watch.html" },
    ]);
  });

  it("does not accept slashes or HTML in captured static filenames", () => {
    const pattern = new RegExp(`^${hosting.rewrites[0]!.has![0]!.value}$`);
    expect(pattern.test("../astronomy")).toBe(false);
    expect(pattern.test('astronomy"><script>')).toBe(false);
  });
});

it("matches deployed routing for unknown IDs, malformed links, and unrelated pages", () => {
  expect(sharingPreviewPath("/course.html?id=not-on-the-shelf")).toBe(
    "/_course-not-on-the-shelf.html",
  );
  expect(sharingPreviewPath("/watch.html?course=astronomy&video=abcdefghijk")).toBe(
    "/_watch-astronomy-abcdefghijk.html",
  );
  expect(sharingPreviewPath("/course.html?id=../astronomy")).toBe("/_course.html");
  expect(sharingPreviewPath("/course.html")).toBe("/_course.html");
  expect(sharingPreviewPath("/watch.html?course=astronomy")).toBe("/_watch.html");
  expect(sharingPreviewPath("/watch.html?course=astronomy&video=short")).toBe("/_watch.html");
  expect(sharingPreviewPath("/settings.html")).toBeUndefined();
});

it("emits complete query previews, executable assets, and a public-only sitemap", async () => {
  const result = await build({
    configFile: false,
    base: "./",
    appType: "mpa",
    logLevel: "silent",
    plugins: [sharingMetadata()],
    build: {
      write: false,
      reportCompressedSize: false,
      rolldownOptions: {
        input: [
          "index.html",
          "study-hall.html",
          "course.html",
          "watch.html",
          "about.html",
          "history.html",
          "settings.html",
        ],
      },
    },
  });
  const built = Array.isArray(result) ? result[0]! : result;
  if (!("output" in built)) throw new Error("Expected a completed build, not a watcher.");
  const output = built.output;
  const files = new Map(output.map((file) => [file.fileName, file]));
  function html(name: string): string {
    const file = files.get(name);
    if (!file || file.type !== "asset") throw new Error(`Missing generated ${name}`);
    return String(file.source);
  }
  expect(files.has("course.html")).toBe(false);
  expect(files.has("watch.html")).toBe(false);
  expect(html("_course.html")).toContain('content="noindex, follow"');
  expect(html("_watch.html")).toContain('content="noindex, follow"');
  const sitemap = html("sitemap.xml");
  let count = 3; // Home, Study Hall, and About.
  for (const course of parseCatalog(catalog)) {
    const coursePath = `/course.html?id=${course.id}`;
    const courseHtml = html(sharingPreviewPath(coursePath)!.slice(1));
    expect(courseHtml).not.toContain("noindex");
    expect(courseHtml).toContain(`course.html?id=${course.id}`);
    expect(sitemap).toContain(coursePath);
    count++;
    const detail = JSON.parse(
      readFileSync(
        new URL(`../../../public/data/courses/${course.id}.json`, import.meta.url),
        "utf8",
      ),
    ) as { episodes: { videoId: string }[] };
    for (const episode of detail.episodes) {
      const path = `/watch.html?course=${course.id}&video=${episode.videoId}`;
      const page = html(sharingPreviewPath(path)!.slice(1));
      expect(page).toContain(`watch.html?course=${course.id}&amp;video=${episode.videoId}`);
      expect(page).not.toContain("noindex");
      expect(page.match(/<title>/g)).toHaveLength(1);
      expect(page).toContain("<title>WatchCrashCourse - ");
      const script = page.match(/<script type="module" crossorigin src="\.\/(.*?)"/);
      expect(script).not.toBeNull();
      expect(files.has(script![1]!)).toBe(true);
      expect(sitemap).toContain(path.replace("&", "&amp;"));
      count++;
    }
  }
  expect(sitemap.match(/<loc>/g)).toHaveLength(count);
  expect(sitemap).not.toContain("_watch");
  expect(sitemap).not.toContain("settings.html");
  expect(sitemap).not.toContain("history.html");
}, 15000);

it("ships a real PNG with the dimensions advertised in sharing metadata", () => {
  const bytes = readFileSync(new URL("../../../public/social/book-preview.png", import.meta.url));
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(bytes.readUInt32BE(16)).toBe(1200);
  expect(bytes.readUInt32BE(20)).toBe(630);
});
