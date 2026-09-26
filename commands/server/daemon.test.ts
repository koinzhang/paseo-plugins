import assert from "node:assert/strict";
import { test } from "node:test";
import { toDaemonTarget } from "./daemon.ts";

test("toDaemonTarget maps every daemon listen form", () => {
  assert.deepEqual(toDaemonTarget("127.0.0.1:6767"), { url: "ws://127.0.0.1:6767/ws" });
  assert.deepEqual(toDaemonTarget("6767"), { url: "ws://127.0.0.1:6767/ws" });
  assert.deepEqual(toDaemonTarget("/tmp/paseo.sock"), {
    url: "ws+unix:///tmp/paseo.sock:/ws",
    socketPath: "/tmp/paseo.sock",
  });
  assert.deepEqual(toDaemonTarget("unix:///tmp/paseo.sock"), {
    url: "ws+unix:///tmp/paseo.sock:/ws",
    socketPath: "/tmp/paseo.sock",
  });
});
