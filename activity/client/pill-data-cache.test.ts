import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import {
  __setPillDataCacheForTests,
  seedPillDataForQuery,
  type UsagePillData,
} from "./pill-data-cache.ts";

const sample: UsagePillData = {
  skills: [{
    skillName: "demo",
    exact: 1,
    inferred: 0,
    low: 0,
    total: 1,
    lastUsedAt: "2026-09-19T12:00:00.000Z",
    skillPath: null,
  }],
  mcpTools: [],
};

const empty: UsagePillData = {
  skills: [],
  mcpTools: [],
};

test("pill query key reuses cached data without a cold loading state", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const key = ["activity", "pill", "agent", "a1"];
  client.setQueryData(key, sample);
  let fetches = 0;
  const observer = new QueryObserver(client, {
    queryKey: key,
    queryFn: async () => {
      fetches += 1;
      return sample;
    },
    staleTime: 0,
    refetchOnMount: "always",
  });
  try {
    const result = observer.getCurrentResult();
    assert.deepEqual(result.data, sample);
    assert.equal(result.isLoading, false);
    assert.equal(fetches, 0);
  } finally {
    observer.destroy();
    client.clear();
  }
});

test("module pill cache seeds non-empty data and skips empty seeds", () => {
  __setPillDataCacheForTests("a1", sample);
  try {
    assert.deepEqual(seedPillDataForQuery("a1"), sample);
  } finally {
    __setPillDataCacheForTests("a1", undefined);
  }
  __setPillDataCacheForTests("a1", empty);
  try {
    assert.equal(seedPillDataForQuery("a1"), undefined);
  } finally {
    __setPillDataCacheForTests("a1", undefined);
  }
});
