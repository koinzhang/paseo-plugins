import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  parseJsonc,
  readOpenCodeMcpServerNames,
  resolveMcpServers,
} from "./mcp-servers.ts";

describe("parseJsonc", () => {
  it("strips line and block comments", () => {
    const parsed = parseJsonc(`{
      // user mcp
      "mcp": {
        "mobile-mcp": { "type": "local" /* ok */ }
      },
    }`);
    assert.deepEqual(parsed, {
      mcp: { "mobile-mcp": { type: "local" } },
    });
  });
});

describe("resolveMcpServers", () => {
  it("reads OpenCode mcp keys and always includes paseo when inject on", () => {
    const home = mkdtempSync(join(tmpdir(), "tool-usage-mcp-"));
    mkdirSync(join(home, ".config", "opencode"), { recursive: true });
    mkdirSync(join(home, ".paseo"), { recursive: true });
    writeFileSync(
      join(home, ".paseo", "config.json"),
      JSON.stringify({ daemon: { mcp: { injectIntoAgents: true } } }),
    );
    writeFileSync(
      join(home, ".config", "opencode", "opencode.jsonc"),
      `{
        // comment
        "mcp": {
          "mobile-mcp": { "type": "local", "command": ["npx"] },
        }
      }`,
    );

    const names = resolveMcpServers({ homeDir: home });
    assert.ok(names.includes("paseo"));
    assert.ok(names.includes("mobile-mcp"));
  });

  it("reads project opencode.json mcp keys", () => {
    const home = mkdtempSync(join(tmpdir(), "tool-usage-mcp-"));
    const cwd = mkdtempSync(join(tmpdir(), "tool-usage-cwd-"));
    mkdirSync(join(home, ".paseo"), { recursive: true });
    writeFileSync(
      join(home, ".paseo", "config.json"),
      JSON.stringify({ daemon: { mcp: { injectIntoAgents: false } } }),
    );
    writeFileSync(
      join(cwd, "opencode.json"),
      JSON.stringify({ mcp: { github: { type: "local" } } }),
    );

    const names = readOpenCodeMcpServerNames(home, cwd);
    assert.deepEqual(names, ["github"]);

    const resolved = resolveMcpServers({ homeDir: home, cwd });
    assert.ok(!resolved.includes("paseo"));
    assert.ok(resolved.includes("github"));
  });
});
