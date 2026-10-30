import { describe, expect, it } from "vite-plus/test";
import fixture from "../../../public/data/quizzes/E7CwqNHn_Ns.json";
import { parseQuiz } from "../domain/quiz";
import { createQuizStore } from "./quiz-store";
const quiz = parseQuiz(fixture, "E7CwqNHn_Ns");
describe("quiz persistence", () => {
  it("serializes rapid answers and retries and restores a new store", async () => {
    const data = new Map<string, unknown>();
    const backend = {
      async getItem(key: string) {
        return data.get(key);
      },
      async setItem(key: string, value: unknown) {
        data.set(key, value);
      },
    };
    const store = createQuizStore(backend);
    await Promise.all([store.answer(quiz, "meaning", "a"), store.answer(quiz, "tools", "b")]);
    const restored = await createQuizStore(backend).load(quiz);
    expect(restored?.answers).toEqual({ meaning: "a", tools: "b" });
    expect(restored?.bestScore).toBe(2);
    await store.retry(quiz);
    expect((await store.load(quiz))?.answers).toEqual({});
    expect(await store.load({ ...quiz, revision: 2 })).toBeNull();
    expect(data.size).toBe(1);
    expect([...data.keys()][0]).toBe(`quiz:${quiz.videoId}:r1`);
  });
  it("preserves unreadable saved data while allowing temporary practice", async () => {
    let writes = 0;
    const store = createQuizStore({
      async getItem() {
        return { version: 99 };
      },
      async setItem() {
        writes++;
      },
    });
    expect(await store.load(quiz)).toBeNull();
    await store.answer(quiz, "meaning", "a");
    expect(writes).toBe(0);
    expect(store.warning).toContain("not be overwritten");
    expect((await store.load(quiz))?.bestScore).toBe(1);
  });
  it("preserves a revision stored under the wrong key", async () => {
    const saved = { version: 1, videoId: quiz.videoId, revision: 2 };
    let writes = 0;
    const store = createQuizStore({
      async getItem() {
        return saved;
      },
      async setItem() {
        writes++;
      },
    });
    expect(await store.load(quiz)).toBeNull();
    await store.answer(quiz, "meaning", "a");
    expect(writes).toBe(0);
    expect(store.warning).toContain("not be overwritten");
  });
  it("keeps answers usable when saving fails", async () => {
    const store = createQuizStore({
      async getItem() {
        return null;
      },
      async setItem() {
        throw new Error("blocked");
      },
    });
    await store.answer(quiz, "meaning", "a");
    expect(store.warning).toContain("temporary");
    expect((await store.load(quiz))?.answers.meaning).toBe("a");
  });
});
