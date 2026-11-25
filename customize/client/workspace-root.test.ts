import assert from "node:assert/strict";
import { test } from "node:test";
import type { PluginPaseoApi } from "@getpaseo/plugin/client";
import { loadWorkspaceProjectRoot } from "./workspace-root.ts";

function workspacePaseo(refresh: () => Promise<{ projectRootPath: string } | null>) {
  const ids: string[] = [];
  const paseo = {
    workspaces: {
      ref(workspaceId: string) {
        ids.push(workspaceId);
        return { refresh };
      },
    },
  } as unknown as Pick<PluginPaseoApi, "workspaces">;
  return { paseo, ids };
}

test("workspace project lookup delegates to the SDK handle without plugin-owned pagination", async () => {
  const { paseo, ids } = workspacePaseo(async () => ({ projectRootPath: "/project" }));
  assert.equal(await loadWorkspaceProjectRoot(paseo, "last-workspace"), "/project");
  assert.deepEqual(ids, ["last-workspace"]);
});

test("no remembered workspace leaves the default project fallback without an SDK lookup", async () => {
  const { paseo, ids } = workspacePaseo(async () => assert.fail("No workspace should be refreshed"));
  assert.equal(await loadWorkspaceProjectRoot(paseo, null), null);
  assert.deepEqual(ids, []);
});

test("a missing workspace leaves the existing project fallback", async () => {
  const { paseo, ids } = workspacePaseo(async () => null);
  assert.equal(await loadWorkspaceProjectRoot(paseo, "missing-workspace"), null);
  assert.deepEqual(ids, ["missing-workspace"]);
});

test("workspace refresh failures reach the query's existing error handling", async () => {
  const { paseo } = workspacePaseo(async () => { throw new Error("offline"); });
  await assert.rejects(loadWorkspaceProjectRoot(paseo, "last-workspace"), /offline/);
});
