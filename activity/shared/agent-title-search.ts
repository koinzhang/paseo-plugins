/** Tokenized title match: every whitespace-separated token must appear in the haystack. */

export function matchesAgentTitleSearch(title: string, query: string): boolean {
  const haystack = title.toLowerCase();
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return true;
  return tokens.every((token) => haystack.includes(token));
}
