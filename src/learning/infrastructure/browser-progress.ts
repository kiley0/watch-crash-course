import { createBrowserStore } from "../../site/infrastructure/browser-storage";
import { createProgressStore } from "./progress-store";

export const progressStore = createProgressStore(createBrowserStore("video_progress"));
