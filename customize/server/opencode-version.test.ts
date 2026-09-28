import assert from "node:assert/strict";
import { test } from "node:test";
import { detectOpencodeVersion, parseOpencodeVersion } from "./opencode-version.ts";

test("OpenCode version parsing accepts CLI formats and rejects diagnostic error numbers", () => {
  for (const [output, expected] of [
    ["1.18.32\n", "1.18.32"], ["v2.0.0", "2.0.0"], ["opencode v2.0.18\n", "2.0.18"],
    ["opencode v2.0.0-beta.1+local", "2.0.0-beta.1+local"],
    ["error: command 2.0.18 failed", null], ["/opt/opencode/2.0.18/bin", null], ["unknown", null], ["2.0", null],
  ] as const) assert.equal(parseOpencodeVersion(output), expected);
});

test("host diagnostic wins over a different PATH CLI version", async () => {
  const result = await detectOpencodeVersion(async (provider) => {
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
    assert.deepEqual(await detectOpencodeVersion(diagnostic, fallback, 10), { version: "2.0.18", source: "cli" });
  }
});

test("failed or unparseable CLI versions stay unknown without failing scans", async () => {
  for (const run of [async () => { throw new Error("ENOENT"); }, async () => ({ stdout: "unknown" })]) {
    assert.deepEqual(await detectOpencodeVersion(undefined, run), { version: null, source: "unknown" });
  }
});
