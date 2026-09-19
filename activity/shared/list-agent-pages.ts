/**
 * Drain cursor-based agent list pages until hasMore is false.
 * Host default page size is typically ≤200; callers must not assume one page is complete.
 */
export type AgentListPageInfo = {
  hasMore: boolean;
  nextCursor: string | null;
};

export type AgentListPage<T> = {
  entries: ReadonlyArray<T>;
  pageInfo: AgentListPageInfo;
};

export async function listAllAgentPages<T>(
  listPage: (cursor: string | undefined) => Promise<AgentListPage<T>>,
  options: { maxPages?: number } = {},
): Promise<T[]> {
  const maxPages = options.maxPages ?? 100;
  const all: T[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page += 1) {
    const result = await listPage(cursor);
    all.push(...result.entries);
    if (!result.pageInfo.hasMore || !result.pageInfo.nextCursor) {
      return all;
    }
    cursor = result.pageInfo.nextCursor;
  }
  throw new Error(`listAllAgentPages: exceeded maxPages=${maxPages}`);
}
