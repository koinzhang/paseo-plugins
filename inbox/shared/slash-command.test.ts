import assert from "node:assert/strict";
import { test } from "node:test";
import { parseInboxCommand } from "./slash-command.ts";

test("no args stars into the global Inbox", () => {
  assert.deepEqual(parseInboxCommand(""), { workspace: false, text: "" });
  assert.deepEqual(parseInboxCommand("   "), { workspace: false, text: "" });
});

test("plain text is global scratch", () => {
  assert.deepEqual(parseInboxCommand(" buy milk "), { workspace: false, text: "buy milk" });
});

test("-w / --workspace targets the current workspace", () => {
  assert.deepEqual(parseInboxCommand("-w"), { workspace: true, text: "" });
  assert.deepEqual(parseInboxCommand("--workspace"), { workspace: true, text: "" });
  assert.deepEqual(parseInboxCommand("-w  check the\nlogs"), { workspace: true, text: "check the\nlogs" });
});

test("other dashes stay part of the text", () => {
  assert.deepEqual(parseInboxCommand("-x flag"), { workspace: false, text: "-x flag" });
  assert.deepEqual(parseInboxCommand("-wip notes"), { workspace: false, text: "-wip notes" });
});

test("-- ends options", () => {
  assert.deepEqual(parseInboxCommand("-- -w literal"), { workspace: false, text: "-w literal" });
  assert.deepEqual(parseInboxCommand("-w -- -w literal"), { workspace: true, text: "-w literal" });
  assert.deepEqual(parseInboxCommand("--"), { workspace: false, text: "" });
});
