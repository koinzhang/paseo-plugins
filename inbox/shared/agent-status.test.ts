import assert from "node:assert/strict";
import { test } from "node:test";
import { agentAttention, describeAgentStatus, isAgentRunning } from "./agent-status.ts";

const live = (status: string, attention: "permission" | "finished" | "error" | null = null) => ({
  status,
  attention,
});

test("archive and missing win over live status", () => {
  assert.equal(describeAgentStatus("archived", live("running"))?.label, "Archived");
  assert.equal(describeAgentStatus("missing", undefined)?.label, "Unavailable");
});

test("unknown until the host answers", () => {
  assert.equal(describeAgentStatus(undefined, undefined), null);
  assert.equal(describeAgentStatus("active", undefined), null);
});

test("icon attention and running spinner", () => {
  assert.equal(agentAttention(undefined), null);
  assert.equal(agentAttention(live("error", "permission")), "error");
  assert.equal(agentAttention(live("running", "permission")), "permission");
  assert.equal(agentAttention(live("idle", "finished")), "finished");
  assert.equal(isAgentRunning(live("initializing")), true);
  assert.equal(isAgentRunning(live("idle")), false);
});

test("error > permission > running > finished > idle", () => {
  assert.equal(describeAgentStatus("active", live("error", "permission"))?.label, "Error");
  assert.equal(describeAgentStatus("active", live("idle", "error"))?.label, "Error");
  assert.equal(describeAgentStatus("active", live("running", "permission"))?.label, "Needs permission");
  assert.equal(describeAgentStatus("active", live("initializing"))?.label, "Running");
  assert.equal(describeAgentStatus("active", live("running", "finished"))?.label, "Running");
  assert.equal(describeAgentStatus("active", live("idle", "finished"))?.label, "Finished");
  assert.equal(describeAgentStatus("active", live("closed"))?.label, "Closed");
  assert.equal(describeAgentStatus("active", live("idle"))?.label, "Idle");
});
