import assert from "node:assert/strict";
import { test } from "node:test";
import { createRpcCache } from "./rpc-cache.ts";

function fixture(options: { ttlMs?: number; maxEntries?: number } = {}) {
  let generation = 0;
  let clock = 0;
  let calls = 0;
  const cache = createRpcCache({
    generation: () => generation,
    now: () => clock,
    ...options,
  });
  const handler = cache.wrap("usage.test", async (input: { n: number }) => {
    calls += 1;
    return input.n * 2;
  });
  return {
    handler,
    cache,
    calls: () => calls,
    bump: () => { generation += 1; },
    advance: (ms: number) => { clock += ms; },
  };
}

test("identical input hits the cache; different input does not", async () => {
  const f = fixture();
  assert.equal(await f.handler({ n: 1 }, undefined), 2);
  assert.equal(await f.handler({ n: 1 }, undefined), 2);
  assert.equal(f.calls(), 1);
  await f.handler({ n: 2 }, undefined);
  assert.equal(f.calls(), 2);
});

test("store writes and TTL expiry invalidate", async () => {
  const f = fixture({ ttlMs: 1_000 });
  await f.handler({ n: 1 }, undefined);
  f.bump();
  await f.handler({ n: 1 }, undefined);
  assert.equal(f.calls(), 2);
  f.advance(999);
  await f.handler({ n: 1 }, undefined);
  assert.equal(f.calls(), 2);
  f.advance(1);
  await f.handler({ n: 1 }, undefined);
  assert.equal(f.calls(), 3);
});

test("evicts least recently used entries beyond the cap", async () => {
  const f = fixture({ maxEntries: 2 });
  await f.handler({ n: 1 }, undefined);
  await f.handler({ n: 2 }, undefined);
  await f.handler({ n: 1 }, undefined);
  await f.handler({ n: 3 }, undefined);
  assert.equal(f.calls(), 3);
  await f.handler({ n: 1 }, undefined);
  assert.equal(f.calls(), 3, "recently used entry survives");
  await f.handler({ n: 2 }, undefined);
  assert.equal(f.calls(), 4, "least recently used entry was evicted");
});

test("rejected results are not cached", async () => {
  let calls = 0;
  const cache = createRpcCache({ generation: () => 0 });
  const handler = cache.wrap("usage.fail", async () => {
    calls += 1;
    if (calls === 1) throw new Error("boom");
    return "ok";
  });
  await assert.rejects(handler({}, undefined), /boom/);
  assert.equal(await handler({}, undefined), "ok");
  assert.equal(calls, 2);
});
