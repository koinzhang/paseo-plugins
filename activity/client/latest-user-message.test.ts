import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatMessagePreview,
  pickLatestUserMessageText,
} from "./latest-user-message.ts";

describe("pickLatestUserMessageText", () => {
  it("picks the highest-seq non-empty user_message", () => {
    const text = pickLatestUserMessageText([
      { item: { type: "user_message", text: "first" }, seqStart: 1, timestamp: "a" },
      { item: { type: "assistant_message", text: "reply" }, seqStart: 2, timestamp: "b" },
      { item: { type: "user_message", text: "  " }, seqStart: 3, timestamp: "c" },
      { item: { type: "user_message", text: "latest" }, seqStart: 4, timestamp: "d" },
    ]);
    assert.equal(text, "latest");
  });

  it("when seq missing, prefers later list entry", () => {
    const text = pickLatestUserMessageText([
      { item: { type: "user_message", text: "older" } },
      { item: { type: "assistant_message", text: "reply" } },
      { item: { type: "user_message", text: "newer" } },
    ]);
    assert.equal(text, "newer");
  });
});

describe("formatMessagePreview", () => {
  it("collapses whitespace and truncates", () => {
    assert.equal(formatMessagePreview("hello\n  world"), "hello world");
    assert.equal(formatMessagePreview("abcdefghij", 6), "abcde…");
  });
});
