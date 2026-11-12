import { describe, expect, it } from "vite-plus/test";
import catalog from "../../../public/data/courses.json";
import astronomyDetail from "../../../public/data/courses/astronomy.json";
import { parseCatalog } from "../../catalog/domain/course";
import { metadataFor, renderMetadata, renderSitemap, siteOrigin } from "./sharing-metadata";

const astronomy = parseCatalog(catalog).find((course) => course.id === "astronomy")!;
const episode = astronomyDetail.episodes[0]!;
const template = `<!doctype html><html><head>
<meta name="description" content="Old description" />
<link rel="canonical" href="https://old.example/" />
<title>Old title</title></head><body><a href="./course.html?id=astronomy">Course</a></body></html>`;

describe("crawler-visible sharing metadata", () => {
  it("replaces generic metadata, keeps the app intact, and does not duplicate tags", () => {
    const generic = renderMetadata(template, metadataFor("watch.html")!);
    const html = renderMetadata(generic, metadataFor("watch.html", astronomy, episode)!);
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).toContain(
      "<title>WatchCrashCourse - Introduction to Astronomy · Astronomy</title>",
    );
    expect(html.match(/name="description"/g)).toHaveLength(1);
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    expect(html.match(/name="robots"/g)).toHaveLength(1);
    expect(html).not.toContain("Old description");
    expect(html).not.toContain("noindex");
    expect(html).toContain("Introduction to Astronomy · Astronomy · Watch Crash Course");
    expect(html).toContain(`${siteOrigin}/watch.html?course=astronomy&amp;video=0rHUDWjR5gg`);
    expect(html).toContain('<a href="./course.html?id=astronomy">Course</a>');
    expect(html).toContain('content="summary_large_image"');
    expect(html).toContain('property="og:image:alt"');
    expect(html).toContain('name="twitter:image:alt"');
    expect(html).toContain('property="og:image:width" content="1200"');
  });

  it("escapes catalog text in HTML attributes and title content", () => {
    const malicious = { ...astronomy, title: '"><script>alert("x")</script> & learning' };
    const html = renderMetadata(template, metadataFor("course.html", malicious)!);
    expect(html).not.toContain('<script>alert("x")');
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; learning");
  });

  it("keeps personal pages and incomplete links out of search results", () => {
    for (const path of ["history.html", "settings.html", "course.html", "watch.html"]) {
      expect(metadataFor(path)?.index).toBe(false);
      expect(renderMetadata(template, metadataFor(path)!)).toContain('content="noindex, follow"');
    }
    expect(metadataFor("watch.html", astronomy)?.index).toBe(false);
    expect(metadataFor("unknown.html")).toBeUndefined();
  });

  it("provides accurate collection attribution for both libraries", () => {
    expect(metadataFor("course.html", astronomy)?.description).toContain("unofficial Crash Course");
    const studyHall = parseCatalog(catalog).find((course) => course.collection === "study-hall")!;
    expect(metadataFor("course.html", studyHall)?.description).toContain("unofficial Study Hall");
    expect(metadataFor("watch.html", astronomy, episode)?.description).toContain("lesson 1 of 46");
  });

  it("provides truthful site-name structured data only on the home page", () => {
    const home = renderMetadata(template, metadataFor("index.html")!);
    const json = home.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1];
    expect(JSON.parse(json!)).toMatchObject({
      "@type": "WebSite",
      name: "Watch Crash Course",
      url: `${siteOrigin}/`,
    });
    expect(renderMetadata(template, metadataFor("about.html")!)).not.toContain(
      "application/ld+json",
    );
  });

  it("uses canonical public URLs with XML-escaped query parameters in the sitemap", () => {
    const path = metadataFor("watch.html", astronomy, episode)!.path;
    const xml = renderSitemap(["/", path]);
    expect(xml).toContain(`${siteOrigin}/watch.html?course=astronomy&amp;video=0rHUDWjR5gg`);
    expect(xml).not.toContain("_watch");
  });
});

it("preserves dollar replacement sequences in catalog text", () => {
  const title = "Prices: $& and $` and $' and $$";
  const html = renderMetadata(template, metadataFor("course.html", { ...astronomy, title })!);
  expect(html).toContain("Prices: $&amp; and $` and $&#39; and $$");
  expect(html.match(/<head>/g)).toHaveLength(1);
  expect(html.match(/<body>/g)).toHaveLength(1);
});
