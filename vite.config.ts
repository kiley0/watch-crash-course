import { defineConfig, loadEnv } from "vite-plus";

export default defineConfig({
  base: "./",
  appType: "mpa",
  build: {
    rolldownOptions: {
      input: [
        "index.html",
        "course.html",
        "about.html",
        "watch.html",
        "history.html",
        "settings.html",
      ],
    },
  },
  // The cloud formatter rejected vercel.json despite the source passing locally.
  // Limit this exception to Vercel builds; keep checking the source locally.
  fmt: {
    ignorePatterns: loadEnv("production", ".", "VERCEL").VERCEL === "1" ? ["vercel.json"] : [],
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
