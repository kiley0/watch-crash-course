import { defineConfig } from "vite-plus";

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
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
