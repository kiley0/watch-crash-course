import { describe, expect, it } from "vite-plus/test";
import catalog from "../../../public/data/courses.json";
import { videoUrl } from "./youtube-links";

describe("YouTube navigation", () => {
  it("constructs original YouTube links with course context", () => {
    const url = new URL(videoUrl("E7CwqNHn_Ns", catalog[0]!.playlistId));
    expect(url.origin).toBe("https://www.youtube.com");
    expect(url.searchParams.get("v")).toBe("E7CwqNHn_Ns");
    expect(url.searchParams.get("list")).toBe(catalog[0]!.playlistId);
  });
});
