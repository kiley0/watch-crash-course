export function matchesQuery(query: string, ...values: string[]): boolean {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const haystack = values.join(" ").toLocaleLowerCase();
  return terms.every((term) => haystack.includes(term));
}
