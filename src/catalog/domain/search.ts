import { isCourseId } from "./course";

export function matchesQuery(query: string, ...values: string[]): boolean {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const haystack = values.join(" ").toLocaleLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export function parseCourseSearch(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("The episode search index couldn’t load.");
  const entries = Object.entries(value);
  if (
    !entries.length ||
    entries.some(([id, text]) => !isCourseId(id) || typeof text !== "string" || !text.trim())
  )
    throw new Error("The episode search index couldn’t load.");
  return Object.fromEntries(entries) as Record<string, string>;
}
