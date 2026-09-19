import assert from "node:assert/strict";
import { test } from "node:test";
import { createHiddenPillRecheck } from "./hidden-pill-recheck.ts";
import type { UsagePillData } from "./pill-data-cache.ts";
const empty: UsagePillData = { skills: [], mcpTools: [] };
const populated: UsagePillData = { skills: [], mcpTools: [{ server: "paseo", tool: "read", count: 1, failures: 0, lastUsedAt: null }] };

test("hidden empty pill stays hidden, but delayed ingestion can show it", async () => {
  let data = empty;
  let shows = 0;
  const check = createHiddenPillRecheck(async () => data, () => true, () => { shows++; });
  await check(); await check();
  assert.equal(shows, 0);
  data = populated;
  await check();
  assert.equal(shows, 1);
});

test("hidden rechecks coalesce and cannot show a removed pill", async () => {
  let finish!: (data: UsagePillData) => void;
  let current = true;
  let loads = 0;
  let shows = 0;
  const check = createHiddenPillRecheck(() => { loads++; return new Promise(resolve => { finish = resolve; }); },
    () => current, () => { shows++; });
  const first = check();
  await check();
  assert.equal(loads, 1);
  current = false;
  finish(populated);
  await first;
  assert.equal(shows, 0);
});
