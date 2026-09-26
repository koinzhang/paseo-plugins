import assert from "node:assert/strict";
import { test } from "node:test";
import { composeResendPrompt, latestUserPrompt } from "./resend.ts";

test("latestUserPrompt selects the highest-sequence non-empty user message", () => {
  assert.equal(
    latestUserPrompt([
      { item: { type: "user_message", text: "first" }, seqStart: 2 },
      { item: { type: "assistant_message", text: "answer" }, seqStart: 3 },
      { item: { type: "user_message", text: "latest\n" }, seqStart: 8 },
      { item: { type: "user_message", text: "older by sequence" }, seqStart: 5 },
    ]),
    "latest\n",
  );
});

test("latestUserPrompt ignores blank prompts and uses list order without sequences", () => {
  assert.equal(
    latestUserPrompt([
      { item: { type: "user_message", text: "first" } },
      { item: { type: "user_message", text: "   " } },
      { item: { type: "user_message", text: "second" } },
    ]),
    "second",
  );
  assert.equal(latestUserPrompt([{ item: { type: "assistant_message", text: "answer" } }]), null);
});

test("composeResendPrompt keeps the prompt and appends arguments after one newline", () => {
  assert.equal(composeResendPrompt("Fix the bug", ""), "Fix the bug");
  assert.equal(composeResendPrompt("Fix the bug", "   "), "Fix the bug");
  assert.equal(
    composeResendPrompt("Fix the bug", " Also add a test\nfor the edge case "),
    "Fix the bug\nAlso add a test\nfor the edge case",
  );
});
