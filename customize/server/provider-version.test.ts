import assert from "node:assert/strict";
import { test } from "node:test";
import { detectProviderVersion, parseProviderVersion } from "./provider-version.ts";
import { PROVIDER_IDS } from "../shared/providers.ts";

test("OpenCode version parsing accepts CLI formats and rejects diagnostic error numbers", () => {
  for (const [output, expected] of [
    ["1.18.32\n", "1.18.32"], ["v2.0.0", "2.0.0"], ["opencode v2.0.18\n", "2.0.18"],
    ["opencode v2.0.0-beta.1+local", "2.0.0-beta.1+local"],
    ["error: command 2.0.18 failed", null], ["/opt/opencode/2.0.18/bin", null], ["unknown", null], ["2.0", null],
  ] as const) assert.equal(parseProviderVersion("opencode", output), expected);
});

test("provider versions support product labels, wrappers and date-based Cursor builds", () => {
  for (const [provider, output, expected] of [
    ["claude", "2.1.0 (Claude Code)", "2.1.0"], ["claude", "@tencent/tclaude 0.1.8", "0.1.8"],
    ["codex", "codex-cli 0.157.1", "0.157.1"], ["cursor", "2026.09.26-dd393fe", "2026.09.26-dd393fe"],
    ["copilot", "GitHub Copilot CLI 0.0.400", "0.0.400"], ["pi", "0.87.1", "0.87.1"], ["omp", "omp/18.3.5", "18.3.5"],
    ["gemini", "0.52.0", "0.52.0"], ["kimi", "kimi, version 1.0.0", null],
    ["codex", "error: command 0.157.1 failed", null], ["cursor", "/opt/cursor/2026.09.26-dd393fe", null],
    ["omp", "error 18.3.5", null], ["pi", "unknown", null],
  ] as const) assert.equal(parseProviderVersion(provider, output), expected, output);
});

test("host diagnostic wins over a different PATH CLI version", async () => {
  const result = await detectProviderVersion("opencode", async (provider) => {
    assert.equal(provider, "opencode");
    return { provider, diagnostic: "OpenCode\n  Configured command: /custom/opencode\n  Version: opencode v2.0.18\n  Auth: Not checked", requestId: "test" };
  }, async () => { throw new Error("Fallback must not run"); });
  assert.deepEqual(result, { version: "2.0.18", source: "host" });
});

test("missing, failed, unparseable and timed-out host diagnostics use a bounded CLI fallback", async () => {
  const fallback = async (command: string, args: string[], options: { timeout: number; maxBuffer: number }) => {
    assert.equal(command, "opencode");
    assert.deepEqual(args, ["--version"]);
    assert.equal(options.timeout, 3000);
    assert.equal(options.maxBuffer, 32 * 1024);
    return { stdout: "opencode v2.0.18" };
  };
  const missingVersion = async (provider: string) => ({ provider, diagnostic: "Version: error: 2.0.18 failed", requestId: "test" });
  const unavailable = async () => { throw new Error("Host unavailable"); };
  const hanging = () => new Promise<never>(() => {});
  for (const diagnostic of [undefined, missingVersion, unavailable, hanging]) {
    assert.deepEqual(await detectProviderVersion("opencode", diagnostic, fallback, 10), { version: "2.0.18", source: "cli" });
  }
});

test("failed or unparseable CLI versions stay unknown without failing scans", async () => {
  for (const run of [async () => { throw new Error("ENOENT"); }, async () => ({ stdout: "unknown" })]) {
    assert.deepEqual(await detectProviderVersion("opencode", undefined, run), { version: null, source: "unknown" });
  }
});

test("all Customize providers use their own host diagnostic, preserving configured overrides", async () => {
  for (const provider of PROVIDER_IDS) {
    const result = await detectProviderVersion(provider, async (requested) => {
      assert.equal(requested, provider);
      return { provider, diagnostic: "Provider\n  Version: 1.2.3", requestId: "test" };
    }, async () => { throw new Error("Fallback must not run"); });
    assert.deepEqual(result, { version: "1.2.3", source: "host" });
  }
});

test("CLI fallbacks use actual binary names and never install ACP packages", async () => {
  for (const [provider, binary] of [["cursor", "cursor-agent"], ["codebuddy-code", "codebuddy"], ["kiro", "kiro-cli"], ["qwen-code", "qwen"]] as const) {
    const result = await detectProviderVersion(provider, undefined, async (command, args) => {
      assert.equal(command, binary);
      assert.deepEqual(args, ["--version"]);
      return { stdout: "1.2.3" };
    });
    assert.deepEqual(result, { version: "1.2.3", source: "cli" });
  }
});
