import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateActivityByDay,
  aggregateAgents,
  aggregateByProvider,
  aggregateMcpByTool,
  aggregateShellTop,
  aggregateSkillsByName,
  formatUsagePillLabel,
  isCodingOp,
  isFileRead,
  isFileWrite,
  isShellCall,
  shellCommandHead,
  shellLooksMutating,
} from "./usage.ts";
import { summarizeRows } from "../server/handlers.ts";
import type { ToolCallRow } from "../server/store.ts";

function row(over: Partial<ToolCallRow> = {}): ToolCallRow {
  return {
    agentId: "a1",
    callId: "c1",
    workspaceId: "w1",
    provider: "claude",
    turnId: null,
    name: "Bash",
    detailType: "shell",
    category: "regular",
    confidence: null,
    skillName: null,
    mcpServer: null,
    mcpTool: null,
    command: "ls",
    filePath: null,
    status: "completed",
    errorMessage: null,
    seq: null,
    ts: null,
    ingestedAt: "2026-09-18T00:00:00.000Z",
    ...over,
  };
}

describe("formatUsagePillLabel", () => {
  it("shows most recently used skill or mcp; +N when more than one entity", () => {
    assert.equal(
      formatUsagePillLabel(
        { shellCalls: 12 },
        [
          { skillName: "paseo", total: 2, lastUsedAt: "2026-09-18T01:00:00.000Z" },
          { skillName: "review", total: 5, lastUsedAt: "2026-09-18T02:00:00.000Z" },
          { skillName: "alpha", total: 5, lastUsedAt: "2026-09-18T04:00:00.000Z" },
        ],
        [
          {
            server: "knot",
            tool: "tapd_search",
            count: 99,
            lastUsedAt: "2026-09-18T03:00:00.000Z",
          },
        ],
      ),
      "Alpha + 3",
    );
  });

  it("shows bare name for a single entity", () => {
    assert.equal(
      formatUsagePillLabel(
        undefined,
        [{ skillName: "zhihu", total: 2, lastUsedAt: "2026-09-18T01:00:00.000Z" }],
        [],
      ),
      "Zhihu",
    );
    assert.equal(
      formatUsagePillLabel(
        undefined,
        [],
        [
          {
            server: "knot",
            tool: "tapd_search",
            count: 3,
            lastUsedAt: "2026-09-18T01:00:00.000Z",
          },
        ],
      ),
      "Knot.Tapd Search",
    );
  });

  it("returns empty when no skills or mcp with counts", () => {
    assert.equal(formatUsagePillLabel({ shellCalls: 3 }), "");
    assert.equal(
      formatUsagePillLabel(undefined, [{ skillName: "low-only", total: 0 }], []),
      "",
    );
  });

  it("prefers skill on equal lastUsedAt; alphabetical within kind", () => {
    assert.equal(
      formatUsagePillLabel(
        undefined,
        [
          { skillName: "zhihu", total: 1, lastUsedAt: "2026-09-18T01:00:00.000Z" },
          { skillName: "tapd", total: 1, lastUsedAt: "2026-09-18T01:00:00.000Z" },
        ],
        [{ server: "knot", tool: "x", count: 1, lastUsedAt: "2026-09-18T01:00:00.000Z" }],
      ),
      "Tapd + 2",
    );
  });

  it("picks latest mcp over older high-count skill", () => {
    assert.equal(
      formatUsagePillLabel(
        undefined,
        [{ skillName: "paseo", total: 50, lastUsedAt: "2026-09-18T01:00:00.000Z" }],
        [
          {
            server: "knot",
            tool: "search",
            count: 1,
            lastUsedAt: "2026-09-18T09:00:00.000Z",
          },
        ],
      ),
      "Knot.Search + 1",
    );
  });
});

describe("aggregateMcpByTool", () => {
  it("tracks lastUsedAt from the newest row", () => {
    const items = aggregateMcpByTool([
      {
        category: "mcp",
        mcpServer: "knot",
        mcpTool: "a",
        status: "completed",
        ts: "2026-09-18T01:00:00.000Z",
        ingestedAt: "2026-09-18T01:00:00.000Z",
      },
      {
        category: "mcp",
        mcpServer: "knot",
        mcpTool: "b",
        status: "completed",
        ts: "2026-09-18T03:00:00.000Z",
        ingestedAt: "2026-09-18T03:00:00.000Z",
      },
      {
        category: "mcp",
        mcpServer: "knot",
        mcpTool: "a",
        status: "failed",
        ts: "2026-09-18T02:00:00.000Z",
        ingestedAt: "2026-09-18T02:00:00.000Z",
      },
    ]);
    assert.equal(items.length, 2);
    const a = items.find((i) => i.tool === "a");
    const b = items.find((i) => i.tool === "b");
    assert.equal(a?.lastUsedAt, "2026-09-18T02:00:00.000Z");
    assert.equal(a?.count, 2);
    assert.equal(a?.failures, 1);
    assert.equal(b?.lastUsedAt, "2026-09-18T03:00:00.000Z");
  });
});

describe("aggregateSkillsByName", () => {
  it("groups by skill; total excludes low", () => {
    const items = aggregateSkillsByName([
      row({
        callId: "1",
        category: "skill",
        confidence: "exact",
        skillName: "paseo",
        command: null,
        detailType: "plain_text",
        ingestedAt: "2026-09-18T01:00:00.000Z",
      }),
      row({
        callId: "2",
        category: "skill",
        confidence: "inferred",
        skillName: "paseo",
        command: null,
        detailType: "read",
        filePath: "/home/u/.claude/skills/paseo/SKILL.md",
        ingestedAt: "2026-09-18T02:00:00.000Z",
      }),
      row({
        callId: "3",
        category: "skill",
        confidence: "low",
        skillName: "review",
        command: null,
        detailType: "shell",
        ingestedAt: "2026-09-18T00:30:00.000Z",
      }),
      row({
        callId: "4",
        category: "skill",
        confidence: "low",
        skillName: "paseo",
        command: null,
        detailType: "shell",
        ingestedAt: "2026-09-18T03:00:00.000Z",
      }),
    ]);
    assert.equal(items.length, 2);
    assert.equal(items[0]?.skillName, "paseo");
    assert.equal(items[0]?.exact, 1);
    assert.equal(items[0]?.inferred, 1);
    assert.equal(items[0]?.low, 1);
    assert.equal(items[0]?.total, 2);
    assert.equal(items[0]?.lastUsedAt, "2026-09-18T03:00:00.000Z");
    assert.equal(items[0]?.skillPath, "/home/u/.claude/skills/paseo/SKILL.md");
    assert.equal(items[1]?.skillName, "review");
    assert.equal(items[1]?.low, 1);
    assert.equal(items[1]?.total, 0);
  });
});

describe("shell / file KPI exclusivity (014)", () => {
  it("predicates: low-skill shell is not a shell call; skill read is not a file read", () => {
    assert.equal(
      isShellCall({ category: "skill", detailType: "shell" }),
      false,
    );
    assert.equal(
      isShellCall({ category: "regular", detailType: "shell" }),
      true,
    );
    assert.equal(
      isFileRead({ category: "skill", detailType: "read" }),
      false,
    );
    assert.equal(
      isFileRead({ category: "regular", detailType: "read" }),
      true,
    );
    assert.equal(
      isFileWrite({ category: "regular", detailType: "edit" }),
      true,
    );
    assert.equal(
      isFileWrite({ category: "regular", detailType: "write" }),
      true,
    );
    assert.equal(
      isFileWrite({ category: "regular", detailType: "delete" }),
      true,
    );
    assert.equal(
      isFileWrite({ category: "regular", detailType: "read" }),
      false,
    );
  });

  it("summarizeRows excludes low-skill shell from shellCalls and skill read from fileReads", () => {
    const summary = summarizeRows([
      row({
        callId: "low",
        category: "skill",
        confidence: "low",
        detailType: "shell",
        skillName: "review",
        command: "cat ~/.codex/skills/review/SKILL.md",
      }),
      row({
        callId: "inferred",
        category: "skill",
        confidence: "inferred",
        detailType: "read",
        skillName: "paseo",
        command: null,
        filePath: "/home/u/.claude/skills/paseo/SKILL.md",
        name: "Read",
      }),
      row({
        callId: "sh",
        category: "regular",
        detailType: "shell",
        command: "ls",
      }),
      row({
        callId: "rd",
        category: "regular",
        detailType: "read",
        command: null,
        filePath: "/tmp/a.ts",
        name: "Read",
      }),
      row({
        callId: "ed",
        category: "regular",
        detailType: "edit",
        command: null,
        filePath: "/tmp/a.ts",
        name: "Edit",
      }),
    ]);
    assert.equal(summary.skillCalls.low, 1);
    assert.equal(summary.skillCalls.inferred, 1);
    assert.equal(summary.shellCalls, 1);
    assert.equal(summary.fileReads, 1);
    assert.equal(summary.fileWrites, 1);
  });

  it("aggregateShellTop skips skill-category shell rows", () => {
    const top = aggregateShellTop([
      {
        category: "skill",
        detailType: "shell",
        command: "cat SKILL.md",
        status: "completed",
      },
      {
        category: "regular",
        detailType: "shell",
        command: "git status",
        status: "completed",
      },
      {
        category: "regular",
        detailType: "shell",
        command: "git diff",
        status: "failed",
      },
    ]);
    assert.deepEqual(top, [{ command: "git", count: 2, failures: 1 }]);
  });

  it("aggregateByProvider file/shell totals follow exclusivity", () => {
    const result = aggregateByProvider([
      row({
        callId: "1",
        provider: "codex",
        category: "skill",
        confidence: "low",
        detailType: "shell",
        skillName: "review",
        command: "cat SKILL.md",
      }),
      row({
        callId: "2",
        provider: "cursor",
        category: "regular",
        detailType: "shell",
        command: "npm test",
      }),
      row({
        callId: "3",
        provider: "claude",
        category: "regular",
        detailType: "read",
        command: null,
        name: "Read",
      }),
      row({
        callId: "4",
        provider: "claude",
        category: "skill",
        confidence: "inferred",
        detailType: "read",
        skillName: "x",
        command: null,
        name: "Read",
      }),
    ]);
    assert.equal(result.totals.shellCalls, 1);
    assert.equal(result.totals.fileReads, 1);
    assert.equal(result.totals.skillCalls.low, 1);
    assert.equal(result.totals.skillCalls.inferred, 1);
    const cursor = result.providers.find((p) => p.provider === "cursor");
    assert.equal(cursor?.shellCalls, 1);
    assert.equal(cursor?.shellTop[0]?.command, "npm");
  });
});

describe("shellLooksMutating / isCodingOp (019)", () => {
  it("flags common mutating heads, git write subs, redirects, and sudo", () => {
    assert.equal(shellLooksMutating("rm -rf dist"), true);
    assert.equal(shellLooksMutating("npm install"), true);
    assert.equal(shellLooksMutating("/usr/local/bin/pnpm add lodash"), true);
    assert.equal(shellLooksMutating("git commit -m 'x'"), true);
    assert.equal(shellLooksMutating("git -C repo commit -m x"), true);
    assert.equal(shellLooksMutating("echo hi > out.txt"), true);
    assert.equal(shellLooksMutating("cat a | tee b"), true);
    assert.equal(shellLooksMutating("sudo rm foo"), true);
  });

  it("does not flag read-only shell", () => {
    assert.equal(shellLooksMutating("ls"), false);
    assert.equal(shellLooksMutating("cat README.md"), false);
    assert.equal(shellLooksMutating("git status"), false);
    assert.equal(shellLooksMutating("git log --oneline"), false);
    assert.equal(shellLooksMutating("python script.py"), false);
    assert.equal(shellLooksMutating(null), false);
  });

  it("isCodingOp accepts file writes and mutating shell only", () => {
    assert.equal(
      isCodingOp({ category: "regular", detailType: "edit", command: null }),
      true,
    );
    assert.equal(
      isCodingOp({ category: "regular", detailType: "read", command: null }),
      false,
    );
    assert.equal(
      isCodingOp({ category: "regular", detailType: "shell", command: "ls" }),
      false,
    );
    assert.equal(
      isCodingOp({ category: "regular", detailType: "shell", command: "mv a b" }),
      true,
    );
  });
});

describe("shellCommandHead", () => {
  it("takes first token basename", () => {
    assert.equal(shellCommandHead("/usr/bin/git status"), "git");
    assert.equal(shellCommandHead("echo hi"), "echo");
  });
});

describe("summarizeRows", () => {
  it("counts categories", () => {
    const summary = summarizeRows([
      row({ callId: "1", detailType: "shell", category: "regular", status: "failed" }),
      row({
        callId: "2",
        name: "Skill",
        detailType: "plain_text",
        category: "skill",
        confidence: "exact",
        skillName: "x",
        command: null,
      }),
      row({
        callId: "3",
        name: "mcp__s__t",
        detailType: "unknown",
        category: "mcp",
        mcpServer: "s",
        mcpTool: "t",
        command: null,
      }),
    ]);
    assert.equal(summary.shellCalls, 1);
    assert.equal(summary.shellFailures, 1);
    assert.equal(summary.skillCalls.exact, 1);
    assert.equal(summary.mcpCalls, 1);
  });
});

describe("aggregateByProvider", () => {
  it("groups claude/opus into claude and lists skills by name", () => {
    const result = aggregateByProvider(
      [
        row({
          callId: "1",
          agentId: "a1",
          provider: "claude/opus",
          detailType: "shell",
          category: "regular",
          status: "failed",
          command: "rm -rf dist",
        }),
        row({
          callId: "2",
          agentId: "a1",
          provider: "claude",
          name: "Skill",
          detailType: "plain_text",
          category: "skill",
          confidence: "exact",
          skillName: "paseo",
          command: null,
        }),
        row({
          callId: "2b",
          agentId: "a1",
          provider: "claude/opus",
          name: "Skill",
          detailType: "plain_text",
          category: "skill",
          confidence: "exact",
          skillName: "paseo",
          command: null,
          ingestedAt: "2026-09-18T01:00:00.000Z",
        }),
        row({
          callId: "3",
          agentId: "a2",
          provider: "opencode",
          name: "mcp__s__t",
          detailType: "unknown",
          category: "mcp",
          mcpServer: "s",
          mcpTool: "t",
          command: null,
          status: "failed",
        }),
        row({
          callId: "4",
          agentId: "a3",
          provider: "codebuddy-code",
          detailType: "shell",
          category: "regular",
          command: "ls",
        }),
      ],
      [
        { agentId: "a1", provider: "claude", workspaceId: "w-shared" },
        { agentId: "a2", provider: "opencode", workspaceId: "w-shared" },
        { agentId: "a3", provider: "codebuddy-code", workspaceId: "w-cb" },
        { agentId: "a4", provider: "claude", workspaceId: "w-claude" }, // created, no tool calls
      ],
    );

    assert.equal(result.totals.shellCalls, 2);
    assert.equal(result.totals.skillCalls.exact, 2);
    assert.equal(result.totals.mcpCalls, 1);
    assert.equal(result.totals.workspaceCount, 3);

    const claude = result.providers.find((p) => p.provider === "claude");
    assert.ok(claude);
    assert.equal(claude.label, "Claude");
    assert.equal(claude.shellCalls, 1);
    assert.equal(claude.shellFailures, 1);
    assert.equal(claude.skillCalls.exact, 2);
    assert.equal(claude.agentCount, 2);
    assert.equal(claude.codingAgentCount, 1); // a1 rm → coding; a4 empty
    assert.equal(claude.chatAgentCount, 0);
    assert.equal(claude.workspaceCount, 2);
    assert.equal(claude.callCount, 3);
    assert.equal(claude.skills.length, 1);
    assert.equal(claude.skills[0]?.skillName, "paseo");
    assert.equal(claude.skills[0]?.total, 2);

    const opencode = result.providers.find((p) => p.provider === "opencode");
    assert.ok(opencode);
    assert.equal(opencode.mcpCalls, 1);
    assert.equal(opencode.mcpFailures, 1);
    assert.equal(opencode.skills.length, 0);
    assert.equal(opencode.mcpTools.length, 1);
    assert.equal(opencode.mcpTools[0]?.server, "s");
    assert.equal(opencode.mcpTools[0]?.tool, "t");
    assert.equal(opencode.mcpTools[0]?.count, 1);
    assert.equal(opencode.workspaceCount, 1);
    assert.equal(opencode.codingAgentCount, 0);
    assert.equal(opencode.chatAgentCount, 1); // MCP-only → chat

    const codebuddy = result.providers.find((p) => p.provider === "codebuddy");
    assert.ok(codebuddy);
    assert.equal(codebuddy.shellCalls, 1);
    assert.equal(codebuddy.label, "CodeBuddy");
    assert.equal(codebuddy.workspaceCount, 1);
    assert.equal(codebuddy.codingAgentCount, 0); // ls → not mutating
    assert.equal(codebuddy.chatAgentCount, 1);

    assert.equal(result.providers[0]?.provider, "claude");
  });

  it("codingAgentCount uses mutating shell / file write only (019)", () => {
    const result = aggregateByProvider(
      [
        row({
          callId: "1",
          agentId: "chat-only",
          provider: "claude",
          category: "skill",
          confidence: "inferred",
          detailType: "read",
          skillName: "x",
          name: "Read",
          command: null,
        }),
        row({
          callId: "2",
          agentId: "chat-low",
          provider: "codex",
          category: "skill",
          confidence: "low",
          detailType: "shell",
          skillName: "review",
          command: "cat SKILL.md",
        }),
        row({
          callId: "3",
          agentId: "reader",
          provider: "cursor",
          category: "regular",
          detailType: "read",
          name: "Read",
          command: null,
        }),
        row({
          callId: "4",
          agentId: "coder-write",
          provider: "claude",
          category: "regular",
          detailType: "edit",
          name: "Edit",
          command: null,
        }),
        row({
          callId: "5",
          agentId: "coder-shell",
          provider: "codex",
          category: "regular",
          detailType: "shell",
          command: "npm install",
        }),
        row({
          callId: "6",
          agentId: "status",
          provider: "cursor",
          category: "regular",
          detailType: "shell",
          command: "git status",
        }),
      ],
      [
        { agentId: "chat-only", provider: "claude" },
        { agentId: "chat-low", provider: "codex" },
        { agentId: "reader", provider: "cursor" },
        { agentId: "coder-write", provider: "claude" },
        { agentId: "coder-shell", provider: "codex" },
        { agentId: "status", provider: "cursor" },
        { agentId: "idle", provider: "claude" },
      ],
    );
    assert.equal(result.providers.find((p) => p.provider === "claude")?.codingAgentCount, 1);
    assert.equal(result.providers.find((p) => p.provider === "claude")?.chatAgentCount, 1); // chat-only; idle empty
    assert.equal(result.providers.find((p) => p.provider === "codex")?.codingAgentCount, 1);
    assert.equal(result.providers.find((p) => p.provider === "codex")?.chatAgentCount, 1); // chat-low
    assert.equal(result.providers.find((p) => p.provider === "cursor")?.codingAgentCount, 0);
    assert.equal(result.providers.find((p) => p.provider === "cursor")?.chatAgentCount, 2); // reader + status
  });

  it("message-only agents count as chat; empty creations are excluded", () => {
    const result = aggregateByProvider(
      [],
      [
        { agentId: "msg", provider: "claude" },
        { agentId: "empty", provider: "claude" },
      ],
      [{ agentId: "msg", provider: "claude", model: "opus" }],
    );
    const claude = result.providers.find((p) => p.provider === "claude");
    assert.equal(claude?.agentCount, 2);
    assert.equal(claude?.codingAgentCount, 0);
    assert.equal(claude?.chatAgentCount, 1);
  });

  it("includes providers that only have agent creations (no tool calls or messages)", () => {
    const result = aggregateByProvider(
      [],
      [{ agentId: "solo", provider: "pi", workspaceId: "w1" }],
      [],
    );
    assert.equal(result.providers.length, 1);
    assert.equal(result.providers[0]?.provider, "pi");
    assert.equal(result.providers[0]?.agentCount, 1);
    assert.equal(result.providers[0]?.codingAgentCount, 0);
    assert.equal(result.providers[0]?.chatAgentCount, 0);
    assert.equal(result.providers[0]?.workspaceCount, 1);
    assert.equal(result.providers[0]?.callCount, 0);
    assert.equal(result.providers[0]?.messageCount, 0);
    assert.equal(result.totals.workspaceCount, 1);
  });

  it("skips null workspace ids and does not double-count shared workspaces in totals", () => {
    const result = aggregateByProvider(
      [],
      [
        { agentId: "a1", provider: "claude", workspaceId: "w1" },
        { agentId: "a2", provider: "codex", workspaceId: "w1" },
        { agentId: "a3", provider: "claude", workspaceId: null },
        { agentId: "a4", provider: "pi", workspaceId: "  " },
      ],
    );
    assert.equal(result.totals.workspaceCount, 1);
    assert.equal(result.providers.find((p) => p.provider === "claude")?.workspaceCount, 1);
    assert.equal(result.providers.find((p) => p.provider === "pi")?.workspaceCount, 0);
  });

  it("ranks models by message stamps and skips blanks", () => {
    const result = aggregateByProvider(
      [],
      [],
      [
        { provider: "codex", model: "gpt-5.4" },
        { provider: "codex", model: "gpt-5.4" },
        { provider: "codex", model: null },
        { provider: "codex", model: "  " },
        { provider: "claude", model: "opus" },
      ],
    );
    const codex = result.providers.find((p) => p.provider === "codex");
    assert.deepEqual(codex?.models, [{ model: "gpt-5.4", count: 2 }]);
    assert.equal(codex?.messageCount, 4);
    const claude = result.providers.find((p) => p.provider === "claude");
    assert.deepEqual(claude?.models, [{ model: "opus", count: 1 }]);
  });
});

describe("aggregateActivityByDay", () => {
  it("buckets skill and mcp by local day and skips low-confidence skills", () => {
    const days = aggregateActivityByDay([
      row({
        callId: "1",
        category: "skill",
        confidence: "exact",
        skillName: "a",
        ingestedAt: "2026-09-18T10:00:00.000Z",
      }),
      row({
        callId: "2",
        category: "skill",
        confidence: "low",
        skillName: "b",
        ingestedAt: "2026-09-18T11:00:00.000Z",
      }),
      row({
        callId: "3",
        category: "mcp",
        mcpServer: "s",
        mcpTool: "t",
        ingestedAt: "2026-09-18T12:00:00.000Z",
      }),
      row({
        callId: "4",
        category: "mcp",
        provider: "codex",
        mcpServer: "s",
        mcpTool: "u",
        ingestedAt: "2026-09-19T08:00:00.000Z",
      }),
    ]);

    assert.equal(days.length, 2);
    assert.equal(days[0]?.skills, 1);
    assert.equal(days[0]?.mcp, 1);
    assert.equal(days[0]?.agents, 0);
    assert.equal(days[0]?.total, 2);
    assert.equal(days[1]?.skills, 0);
    assert.equal(days[1]?.mcp, 1);
    assert.equal(days[1]?.agents, 0);

    const onlyCodex = aggregateActivityByDay(
      [
        row({
          callId: "4",
          category: "mcp",
          provider: "codex",
          mcpServer: "s",
          mcpTool: "u",
          ingestedAt: "2026-09-19T08:00:00.000Z",
        }),
        row({
          callId: "5",
          category: "mcp",
          provider: "claude",
          mcpServer: "s",
          mcpTool: "v",
          ingestedAt: "2026-09-19T09:00:00.000Z",
        }),
      ],
      { provider: "codex" },
    );
    assert.equal(onlyCodex.length, 1);
    assert.equal(onlyCodex[0]?.mcp, 1);
    assert.equal(onlyCodex[0]?.agents, 0);
  });

  it("counts agent creations per day independent of tool calls", () => {
    const days = aggregateActivityByDay(
      [
        row({
          callId: "1",
          agentId: "a1",
          category: "skill",
          confidence: "exact",
          skillName: "x",
          ingestedAt: "2026-09-18T10:00:00.000Z",
        }),
      ],
      {
        agents: [
          { agentId: "a1", provider: "claude", createdAt: "2026-09-18T08:00:00.000Z" },
          { agentId: "a2", provider: "claude", createdAt: "2026-09-18T09:00:00.000Z" },
          { agentId: "a3", provider: "codex", createdAt: "2026-09-19T08:00:00.000Z" },
        ],
      },
    );
    assert.equal(days.length, 2);
    assert.equal(days[0]?.skills, 1);
    assert.equal(days[0]?.agents, 2);
    assert.equal(days[1]?.skills, 0);
    assert.equal(days[1]?.mcp, 0);
    assert.equal(days[1]?.agents, 1);
    assert.equal(days[1]?.total, 1);
  });
});

describe("aggregateAgents (024)", () => {
  it("groups by agent, excludes low from skillCalls, and merges the registry", () => {
    const items = aggregateAgents(
      [
        row({
          callId: "1",
          agentId: "a1",
          provider: "claude/opus",
          name: "Skill",
          detailType: "plain_text",
          category: "skill",
          confidence: "exact",
          skillName: "review",
          command: null,
        }),
        row({
          callId: "2",
          agentId: "a1",
          provider: "claude/opus",
          name: "Skill",
          detailType: "plain_text",
          category: "skill",
          confidence: "low",
          skillName: "review",
          command: null,
          ingestedAt: "2026-09-18T03:00:00.000Z",
        }),
        row({
          callId: "3",
          agentId: "a1",
          provider: "claude/opus",
          name: "mcp__knot__search",
          detailType: "unknown",
          category: "mcp",
          mcpServer: "knot",
          mcpTool: "search",
          command: null,
        }),
        row({
          callId: "4",
          agentId: "a1",
          provider: "claude/opus",
          command: "rm -rf dist",
          ingestedAt: "2026-09-18T04:00:00.000Z",
        }),
        row({ callId: "5", agentId: "a1", provider: "claude/opus", detailType: "read", command: null }),
        row({ callId: "6", agentId: "a1", provider: "claude/opus", detailType: "write", command: null }),
        row({ callId: "7", agentId: "a2", provider: "codex", command: "ls" }),
      ],
      [
        {
          agentId: "a1",
          provider: "claude/opus",
          title: "Review bot",
          createdAt: "2026-09-18T00:00:00.000Z",
        },
        { agentId: "a3", provider: "codex", title: "Idle", createdAt: "2026-09-19T00:00:00.000Z", updatedAt: "2026-09-19T02:00:00.000Z", archivedAt: "2026-09-19T01:00:00.000Z" },
      ],
      [
        { agentId: "a1", provider: "claude/opus", ts: "2026-09-18T05:00:00.000Z" },
        { agentId: "a1", provider: "claude/opus", ts: "2026-09-18T06:00:00.000Z" },
        { agentId: "a2", provider: "codex" },
      ],
    );

    assert.deepEqual(
      items.map((item) => item.agentId),
      ["a1", "a2", "a3"],
    );

    const a1 = items[0]!;
    assert.equal(a1.provider, "claude");
    assert.equal(a1.title, "Review bot");
    assert.equal(a1.callCount, 6);
    assert.equal(a1.skillCalls, 1);
    assert.equal(a1.mcpCalls, 1);
    assert.equal(a1.shellCalls, 1);
    assert.equal(a1.fileReads, 1);
    assert.equal(a1.fileWrites, 1);
    assert.equal(a1.coding, true);
    assert.equal(a1.messageCount, 2);
    assert.equal(a1.archivedAt, null);
    assert.equal(a1.updatedAt, null);
    assert.equal(a1.lastActivityAt, "2026-09-18T06:00:00.000Z");

    const a2 = items[1]!;
    assert.equal(a2.callCount, 1);
    assert.equal(a2.coding, false);
    assert.equal(a2.messageCount, 1);
    assert.equal(a2.lastActivityAt, "2026-09-18T00:00:00.000Z");

    const a3 = items[2]!;
    assert.equal(a3.callCount, 0);
    assert.equal(a3.messageCount, 0);
    assert.equal(a3.title, "Idle");
    assert.equal(a3.createdAt, "2026-09-19T00:00:00.000Z");
    assert.equal(a3.updatedAt, "2026-09-19T02:00:00.000Z");
    assert.equal(a3.archivedAt, "2026-09-19T01:00:00.000Z");
    assert.equal(a3.lastActivityAt, null);
  });
});
