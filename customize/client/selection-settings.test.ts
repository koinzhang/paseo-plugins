import assert from "node:assert/strict";
import { test } from "node:test";
import { selectionSettings } from "../shared/selection-settings.ts";

test("board selection defaults only before a project is chosen", () => {
  assert.deepEqual(selectionSettings.schema.parse({}), { provider: "claude", projectRoot: null });
  assert.deepEqual(selectionSettings.schema.parse({ provider: "codex", projectRoot: "" }), {
    provider: "codex",
    projectRoot: "",
  });
  assert.deepEqual(selectionSettings.schema.parse({ provider: "pi", projectRoot: "/project" }), {
    provider: "pi",
    projectRoot: "/project",
  });
  assert.equal(selectionSettings.schema.safeParse({ provider: "unknown" }).success, false);
});
