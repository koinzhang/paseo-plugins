import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assistantRunReachesStart,
  excerpt,
  pickLastExchange,
  readLastExchange,
  type ExchangePage,
} from "./last-exchange.ts";

test("picks the newest prompt and joins the newest assistant run", () => {
  const exchange = pickLastExchange([
    { item: { type: "user_message", text: "older ask" }, seqStart: 1 },
    { item: { type: "assistant_message", text: "old " }, seqStart: 2 },
    { item: { type: "assistant_message", text: "reply" }, seqStart: 3 },
    { item: { type: "tool_call" }, seqStart: 4 },
    { item: { type: "user_message", text: "  latest ask\n" }, seqStart: 8 },
    { item: { type: "assistant_message", text: "Part " }, seqStart: 9 },
    { item: { type: "assistant_message", text: "two" }, seqStart: 10 },
    { item: { type: "user_message", text: "   " }, seqStart: 11 },
  ]);
  assert.deepEqual(exchange, { prompt: "latest ask", agent: "Part two" });
});

test("seq wins over list order", () => {
  const exchange = pickLastExchange([
    { item: { type: "user_message", text: "newer" }, seqStart: 5 },
    { item: { type: "user_message", text: "older" }, seqStart: 1 },
    { item: { type: "assistant_message", text: "second" }, seqStart: 4 },
    { item: { type: "assistant_message", text: "first " }, seqStart: 3 },
  ]);
  assert.deepEqual(exchange, { prompt: "newer", agent: "first second" });
});

test("a blank assistant run falls through to the previous reply", () => {
  const exchange = pickLastExchange([
    { item: { type: "assistant_message", text: "kept" }, seqStart: 1 },
    { item: { type: "tool_call" }, seqStart: 2 },
    { item: { type: "assistant_message", text: "  " }, seqStart: 3 },
  ]);
  assert.equal(exchange.agent, "kept");
});

test("an assistant run that fills the window still needs an older page", () => {
  assert.equal(
    assistantRunReachesStart([
      { item: { type: "assistant_message", text: "a" } },
      { item: { type: "assistant_message", text: "b" } },
    ]),
    true,
  );
  assert.equal(
    assistantRunReachesStart([
      { item: { type: "user_message", text: "ask" } },
      { item: { type: "assistant_message", text: "reply" } },
    ]),
    false,
  );
});

test("excerpt keeps line breaks and marks a cut", () => {
  assert.equal(excerpt("hello\nworld", 100), "hello\nworld");
  assert.equal(excerpt("abcdef", 3), "abc…");
});

test("reads an older page when the tail has no prompt", async () => {
  const pages: ExchangePage[] = [
    {
      entries: [{ item: { type: "assistant_message", text: "done" }, seqStart: 4 }],
      hasOlder: true,
      startCursor: { epoch: "1", seq: 4 },
    },
    {
      entries: [
        { item: { type: "user_message", text: "ask" }, seqStart: 1 },
        { item: { type: "tool_call" }, seqStart: 2 },
      ],
      hasOlder: false,
    },
  ];
  const seen: string[] = [];
  const exchange = await readLastExchange(async ({ direction, cursor }) => {
    seen.push(`${direction}:${cursor?.seq ?? ""}`);
    const page = pages.shift();
    if (!page) throw new Error("unexpected page");
    return page;
  });
  assert.deepEqual(exchange, { prompt: "ask", agent: "done" });
  assert.deepEqual(seen, ["tail:", "before:4"]);
});

test("keeps paging while the newest reply is cut off at the start of the window", async () => {
  const exchange = await readLastExchange(async ({ direction }) => {
    if (direction === "tail") {
      return {
        entries: [{ item: { type: "assistant_message", text: "end" }, seqStart: 3 }],
        hasOlder: true,
        startCursor: { epoch: "1", seq: 3 },
      };
    }
    return {
      entries: [
        { item: { type: "user_message", text: "ask" }, seqStart: 1 },
        { item: { type: "assistant_message", text: "start " }, seqStart: 2 },
      ],
      hasOlder: false,
    };
  });
  assert.deepEqual(exchange, { prompt: "ask", agent: "start end" });
});
