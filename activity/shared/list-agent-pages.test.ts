import assert from "node:assert/strict";
import { test } from "node:test";
import { listAllAgentPages } from "./list-agent-pages.ts";

test("listAllAgentPages returns a single page when hasMore is false", async () => {
  const pages: string[] = [];
  const entries = await listAllAgentPages<string>(async (cursor) => {
    pages.push(cursor ?? "start");
    return { entries: ["a", "b"], pageInfo: { hasMore: false, nextCursor: null } };
  });
  assert.deepEqual(entries, ["a", "b"]);
  assert.deepEqual(pages, ["start"]);
});

test("listAllAgentPages follows nextCursor until hasMore is false", async () => {
  const pages: Array<string | undefined> = [];
  const entries = await listAllAgentPages<number>(async (cursor) => {
    pages.push(cursor);
    if (cursor == null) {
      return { entries: [1, 2], pageInfo: { hasMore: true, nextCursor: "p2" } };
    }
    if (cursor === "p2") {
      return { entries: [3], pageInfo: { hasMore: true, nextCursor: "p3" } };
    }
    return { entries: [4, 5], pageInfo: { hasMore: false, nextCursor: null } };
  });
  assert.deepEqual(entries, [1, 2, 3, 4, 5]);
  assert.deepEqual(pages, [undefined, "p2", "p3"]);
});

test("listAllAgentPages stops when hasMore without nextCursor", async () => {
  const entries = await listAllAgentPages<string>(async () => ({
    entries: ["only"],
    pageInfo: { hasMore: true, nextCursor: null },
  }));
  assert.deepEqual(entries, ["only"]);
});

test("listAllAgentPages throws when maxPages exceeded", async () => {
  await assert.rejects(
    () =>
      listAllAgentPages(
        async (cursor) => ({
          entries: [cursor ?? "0"],
          pageInfo: { hasMore: true, nextCursor: String(Number(cursor ?? 0) + 1) },
        }),
        { maxPages: 3 },
      ),
    /maxPages=3/,
  );
});
