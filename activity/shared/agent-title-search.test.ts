import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchesAgentTitleSearch } from "./agent-title-search.ts";

describe("matchesAgentTitleSearch", () => {
  it("matches when every token appears (order-independent)", () => {
    assert.equal(matchesAgentTitleSearch("Fix the login bug", "fix bug"), true);
    assert.equal(matchesAgentTitleSearch("Fix the login bug", "bug fix"), true);
  });

  it("is case-insensitive and ignores extra whitespace", () => {
    assert.equal(matchesAgentTitleSearch("Agent Activity", "  agent   act  "), true);
  });

  it("rejects when any token is missing", () => {
    assert.equal(matchesAgentTitleSearch("Fix the login bug", "fix crash"), false);
  });

  it("treats blank query as match-all", () => {
    assert.equal(matchesAgentTitleSearch("Anything", ""), true);
    assert.equal(matchesAgentTitleSearch("Anything", "   "), true);
  });

  it("still supports a single contiguous substring token", () => {
    assert.equal(matchesAgentTitleSearch("workspace-activity", "activity"), true);
    assert.equal(matchesAgentTitleSearch("workspace-activity", "work act"), true);
  });
});
