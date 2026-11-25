import assert from "node:assert/strict";
import { test } from "node:test";
import { insertNoteIntoComposer, type NoteComposer } from "./note-actions.ts";

test("inserts the exact note body, then focuses without replacing or sending the prompt", async () => {
  const calls: string[] = [];
  const composer: NoteComposer = {
    insertText(text) {
      calls.push(`insert:${text}`);
    },
    async focus() {
      calls.push("focus");
    },
  };
  const body = "# Investigation\n\n- keep Markdown\n- keep existing prompt";

  await insertNoteIntoComposer(composer, body);

  assert.deepEqual(calls, [`insert:${body}`, "focus"]);
  assert.equal("setPrompt" in composer, false);
  assert.equal("send" in composer, false);
});

test("waits for focus before reporting completion", async () => {
  let focused = false;
  let resolveFocus!: () => void;
  const composer: NoteComposer = {
    insertText() {},
    focus: () => new Promise<void>((resolve) => {
      resolveFocus = () => {
        focused = true;
        resolve();
      };
    }),
  };

  let completed = false;
  const insertion = insertNoteIntoComposer(composer, "draft").then(() => {
    completed = true;
  });
  await Promise.resolve();
  assert.equal(completed, false);
  resolveFocus();
  await insertion;
  assert.equal(focused, true);
});

test("surfaces insertion and focus failures without a success result", async () => {
  await assert.rejects(
    insertNoteIntoComposer({
      insertText() {
        throw new Error("composer unavailable");
      },
      async focus() {},
    }, "text"),
    /composer unavailable/,
  );

  await assert.rejects(
    insertNoteIntoComposer({
      insertText() {},
      async focus() {
        throw new Error("composer did not come on screen");
      },
    }, "text"),
    /composer did not come on screen/,
  );
});
