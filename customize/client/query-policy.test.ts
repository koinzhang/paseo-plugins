import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { SCAN_QUERY_POLICY } from "./query-policy.ts";

test("a revisited scan paints cached entries while refreshing and retains them after a refresh error", async () => {
  const client = new QueryClient();
  const key = ["customize", "scan", "codex", "/project"];
  const cached = { entries: ["old"] };
  client.setQueryData(key, cached);

  let rejectRefresh: (error: Error) => void = () => {};
  const observer = new QueryObserver(client, {
    queryKey: key,
    queryFn: () => new Promise<{ entries: string[] }>((_resolve, reject) => { rejectRefresh = reject; }),
    retry: false,
    ...SCAN_QUERY_POLICY,
  });
  const unsubscribe = observer.subscribe(() => {});
  assert.deepEqual(observer.getCurrentResult().data, cached);
  assert.equal(observer.getCurrentResult().fetchStatus, "fetching");

  const settled = new Promise<void>((resolve) => {
    const stop = observer.subscribe((result) => {
      if (result.fetchStatus === "idle" && result.isError) {
        stop();
        resolve();
      }
    });
  });
  rejectRefresh(new Error("offline"));
  await settled;
  assert.deepEqual(observer.getCurrentResult().data, cached);
  unsubscribe();
  assert.deepEqual(client.getQueryData(key), cached);

  const firstVisit = new QueryObserver(client, {
    queryKey: ["customize", "scan", "cursor", "/project"],
    queryFn: async () => ({ entries: ["new"] }),
    ...SCAN_QUERY_POLICY,
  });
  const stopFirstVisit = firstVisit.subscribe(() => {});
  assert.equal(firstVisit.getCurrentResult().isPending, true);
  stopFirstVisit();
  client.clear();
});
