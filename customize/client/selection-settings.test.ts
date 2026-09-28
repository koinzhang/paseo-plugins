import assert from "node:assert/strict";
import { test } from "node:test";
import { selectionSettings } from "../shared/selection-settings.ts";

test("board selection defaults only before a project is chosen", () => {
  assert.deepEqual(selectionSettings.schema.parse({}), { provider: "claude", projectRoot: null, layout: "list" });
  assert.deepEqual(selectionSettings.schema.parse({ provider: "codex", projectRoot: "" }), {
    provider: "codex",
    projectRoot: "",
    layout: "list",
  });
  assert.deepEqual(selectionSettings.schema.parse({ provider: "pi", projectRoot: "/project", layout: "card" }), {
    provider: "pi",
    projectRoot: "/project",
    layout: "card",
  });
  assert.equal(selectionSettings.schema.safeParse({ provider: "unknown" }).success, false);
  assert.equal(selectionSettings.schema.safeParse({ layout: "grid" }).success, false);
});
