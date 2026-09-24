import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyToolCall,
  matchSkillFile,
  normalizeProvider,
} from "./classify.ts";

describe("normalizeProvider", () => {
  it("maps provider ids", () => {
    assert.equal(normalizeProvider("claude/opus"), "claude");
    assert.equal(normalizeProvider("opencode"), "opencode");
    assert.equal(normalizeProvider("codex"), "codex");
    assert.equal(normalizeProvider("pi"), "pi");
    assert.equal(normalizeProvider("omp"), "omp");
    assert.equal(normalizeProvider("cursor"), "cursor");
    assert.equal(normalizeProvider("codebuddy-code"), "codebuddy");
  });
});

describe("matchSkillFile", () => {
  it("extracts skill name from common agent config roots", () => {
    assert.equal(
      matchSkillFile("/Users/me/.claude/skills/paseo/SKILL.md", undefined, "/Users/me"),
      "paseo",
    );
    assert.equal(
      matchSkillFile(
        "/Users/me/.cursor/skills/wecomcli-message/SKILL.md",
        undefined,
        "/Users/me",
      ),
      "wecomcli-message",
    );
    assert.equal(
      matchSkillFile("/Users/me/.codebuddy/skills/foo/SKILL.md", undefined, "/Users/me"),
      "foo",
    );
    assert.equal(
      matchSkillFile("/Users/me/.pi/agent/skills/bar/SKILL.md", undefined, "/Users/me"),
      "bar",
    );
    assert.equal(
      matchSkillFile("/proj/.agents/skills/baz/SKILL.md", undefined, "/Users/me"),
      "baz",
    );
  });

  it("returns null outside roots", () => {
    assert.equal(matchSkillFile("/tmp/other/SKILL.md", undefined, "/Users/me"), null);
  });

  it("matches nested category under .agents/skills", () => {
    assert.equal(
      matchSkillFile(
        "/proj/.agents/skills/info/zhihu/SKILL.md",
        undefined,
        "/Users/me",
      ),
      "zhihu",
    );
  });
});

describe("classifyToolCall — skill exact", () => {
  it("Claude Skill tool", () => {
    const r = classifyToolCall(
      {
        name: "Skill",
        detail: { type: "plain_text", label: "paseo-help", icon: "sparkles" },
      },
      { provider: "claude" },
    );
    assert.equal(r.category, "skill");
    assert.equal(r.confidence, "exact");
    assert.equal(r.skillName, "paseo-help");
  });

  it("OpenCode skill tool", () => {
    const r = classifyToolCall(
      {
        name: "skill",
        detail: { type: "plain_text", label: "commit" },
      },
      { provider: "opencode" },
    );
    assert.equal(r.category, "skill");
    assert.equal(r.confidence, "exact");
    assert.equal(r.skillName, "commit");
  });
});

describe("classifyToolCall — skill inferred / low", () => {
  const homeDir = "/home/u";

  it("read SKILL.md → inferred", () => {
    const r = classifyToolCall(
      {
        name: "Read",
        detail: { type: "read", filePath: "/home/u/.codex/skills/review/SKILL.md" },
      },
      { provider: "codex", homeDir },
    );
    assert.equal(r.category, "skill");
    assert.equal(r.confidence, "inferred");
    assert.equal(r.skillName, "review");
  });

  it("Cursor read ~/.cursor/skills → inferred", () => {
    const r = classifyToolCall(
      {
        name: "read",
        detail: {
          type: "read",
          filePath: "/home/u/.cursor/skills/wecomcli-shared/SKILL.md",
        },
      },
      { provider: "cursor", homeDir },
    );
    assert.equal(r.category, "skill");
    assert.equal(r.confidence, "inferred");
    assert.equal(r.skillName, "wecomcli-shared");
  });

  it("shell cat SKILL.md → low", () => {
    const r = classifyToolCall(
      {
        name: "Bash",
        detail: {
          type: "shell",
          command: "cat /home/u/.codex/skills/review/SKILL.md",
        },
      },
      { provider: "codex", homeDir },
    );
    assert.equal(r.category, "skill");
    assert.equal(r.confidence, "low");
    assert.equal(r.skillName, "review");
    assert.equal(r.filePath, "/home/u/.codex/skills/review/SKILL.md");
  });

  it("shell SKILL.md outside roots still low via parent dir", () => {
    const r = classifyToolCall(
      {
        name: "Bash",
        detail: { type: "shell", command: "rg -n foo foo-skill/SKILL.md" },
      },
      { provider: "pi", homeDir },
    );
    assert.equal(r.category, "skill");
    assert.equal(r.confidence, "low");
    assert.equal(r.skillName, "foo-skill");
  });
});

describe("classifyToolCall — MCP", () => {
  it("Claude mcp__server__tool", () => {
    const r = classifyToolCall(
      { name: "mcp__knot__tapd_search", detail: { type: "unknown", input: {}, output: {} } },
      { provider: "claude" },
    );
    assert.equal(r.category, "mcp");
    assert.equal(r.mcpServer, "knot");
    assert.equal(r.mcpTool, "tapd_search");
    assert.equal(r.confidence, "exact");
  });

  it("Codex server.tool with provider path", () => {
    const r = classifyToolCall(
      { name: "paseo.list_agents", detail: { type: "unknown", input: {}, output: {} } },
      { provider: "codex/gpt-5" },
    );
    assert.equal(r.category, "mcp");
    assert.equal(r.mcpServer, "paseo");
    assert.equal(r.mcpTool, "list_agents");
  });

  it("Pi server.tool", () => {
    const r = classifyToolCall(
      { name: "github.create_issue", detail: { type: "unknown", input: {}, output: {} } },
      { provider: "pi" },
    );
    assert.equal(r.category, "mcp");
    assert.equal(r.mcpServer, "github");
    assert.equal(r.mcpTool, "create_issue");
  });

  it("OpenCode configured server prefix", () => {
    const r = classifyToolCall(
      { name: "knot_tapd_search", detail: { type: "unknown", input: {}, output: {} } },
      { provider: "opencode", mcpServers: ["knot"] },
    );
    assert.equal(r.category, "mcp");
    assert.equal(r.mcpServer, "knot");
    assert.equal(r.mcpTool, "tapd_search");
  });

  it("OpenCode hyphenated server name (mobile-mcp)", () => {
    const r = classifyToolCall(
      {
        name: "mobile-mcp_mobile_list_available_devices",
        detail: { type: "unknown", input: {}, output: {} },
      },
      { provider: "opencode", mcpServers: ["mobile-mcp", "paseo"] },
    );
    assert.equal(r.category, "mcp");
    assert.equal(r.mcpServer, "mobile-mcp");
    assert.equal(r.mcpTool, "mobile_list_available_devices");
  });

  it("OpenCode without server list stays regular", () => {
    const r = classifyToolCall(
      { name: "mobile-mcp_mobile_list_available_devices", detail: { type: "unknown", input: {}, output: {} } },
      { provider: "opencode" },
    );
    assert.equal(r.category, "regular");
  });

  it("Codex does not need mcpServers list", () => {
    const r = classifyToolCall(
      { name: "mobile-mcp.list_devices", detail: { type: "unknown", input: {}, output: {} } },
      { provider: "codex" },
    );
    assert.equal(r.category, "mcp");
    assert.equal(r.mcpServer, "mobile-mcp");
    assert.equal(r.mcpTool, "list_devices");
  });

  it("ACP inferred from metadata.title", () => {
    const r = classifyToolCall(
      {
        name: "execute",
        detail: { type: "unknown", input: {}, output: {} },
        metadata: { title: "knot.search" },
      },
      { provider: "cursor" },
    );
    assert.equal(r.category, "mcp");
    assert.equal(r.confidence, "inferred");
    assert.equal(r.mcpServer, "knot");
    assert.equal(r.mcpTool, "search");
  });

  it("ACP other + underscore title matches mcpServers", () => {
    const r = classifyToolCall(
      {
        name: "other",
        detail: { type: "unknown", input: {}, output: {} },
        metadata: { kind: "other", title: "paseo_list_agents" },
      },
      { provider: "cursor", mcpServers: ["paseo"] },
    );
    assert.equal(r.category, "mcp");
    assert.equal(r.mcpServer, "paseo");
    assert.equal(r.mcpTool, "list_agents");
    assert.equal(r.confidence, "inferred");
  });

  it("ACP other with empty title stays regular", () => {
    const r = classifyToolCall(
      {
        name: "other",
        detail: { type: "unknown", input: {}, output: {} },
        metadata: { kind: "other", title: "Other" },
      },
      { provider: "cursor", mcpServers: ["paseo"] },
    );
    assert.equal(r.category, "regular");
  });
});

describe("classifyToolCall — regular shell", () => {
  it("plain shell is regular", () => {
    const r = classifyToolCall(
      { name: "Bash", detail: { type: "shell", command: "ls -la", exitCode: 0 } },
      { provider: "claude" },
    );
    assert.equal(r.category, "regular");
    assert.equal(r.detailType, "shell");
    assert.equal(r.command, "ls -la");
    assert.equal(r.confidence, null);
  });

  it("Cursor ACP shell (normalized detail.type) is regular", () => {
    const r = classifyToolCall(
      { name: "execute", detail: { type: "shell", command: "pwd" }, metadata: { kind: "execute" } },
      { provider: "cursor" },
    );
    assert.equal(r.category, "regular");
    assert.equal(r.detailType, "shell");
  });

  it("regular file read/edit stay regular (not skill)", () => {
    const read = classifyToolCall(
      { name: "Read", detail: { type: "read", filePath: "/tmp/app.ts" } },
      { provider: "claude" },
    );
    assert.equal(read.category, "regular");
    assert.equal(read.detailType, "read");
    const edit = classifyToolCall(
      { name: "edit", detail: { type: "edit", filePath: "/tmp/app.ts" } },
      { provider: "cursor" },
    );
    assert.equal(edit.category, "regular");
    assert.equal(edit.detailType, "edit");
  });
});
