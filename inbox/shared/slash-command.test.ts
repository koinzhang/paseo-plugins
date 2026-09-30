import assert from "node:assert/strict";
import { test } from "node:test";
import { parseInboxCommand } from "./slash-command.ts";

test("no args stars the current agent", () => {
  assert.deepEqual(parseInboxCommand(""), { text: "" });
  assert.deepEqual(parseInboxCommand("   "), { text: "" });
});

test("plain text is scratch", () => {
  assert.deepEqual(parseInboxCommand(" buy milk "), { text: "buy milk" });
});

test("former flags are part of the text", () => {
  assert.deepEqual(parseInboxCommand("-w check the\nlogs"), { text: "-w check the\nlogs" });
  assert.deepEqual(parseInboxCommand("--workspace"), { text: "--workspace" });
  assert.deepEqual(parseInboxCommand("-- literal"), { text: "-- literal" });
});
