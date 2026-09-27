import assert from "node:assert/strict";
import { test } from "node:test";
import { fileMark, shortenFilePath } from "./file-attachment.ts";

test("file types have distinct marks and a generic fallback", () => {
  assert.equal(fileMark("README.md"), "↓");
  assert.equal(fileMark("index.ts"), "TS");
  assert.equal(fileMark("config.JSON"), "{}");
  assert.equal(fileMark("unknown"), "▤");
});

test("long workspace paths preserve root and file name", () => {
  assert.equal(shortenFilePath("commands/README.md"), "commands/README.md");
  assert.equal(
    shortenFilePath("commands/specs/001-agent-commands/research.md"),
    "commands/…/research.md",
  );
  assert.equal(
    shortenFilePath("commands/specs/001-agent-commands/research-documentation.md"),
    "commands/…/…arch-documentation.md",
  );
});
