import assert from "node:assert/strict";
import { test } from "node:test";
import { AGENT_PAGE_SIZE } from "../client/workspace/constants.ts";

test("AGENT_PAGE_SIZE yields single page for ≤ page size", () => {
  assert.ok(AGENT_PAGE_SIZE > 0);
  const pageCount = (n: number) => Math.max(1, Math.ceil(n / AGENT_PAGE_SIZE));
  assert.equal(pageCount(0), 1);
  assert.equal(pageCount(AGENT_PAGE_SIZE), 1);
  assert.equal(pageCount(AGENT_PAGE_SIZE + 1), 2);
});
