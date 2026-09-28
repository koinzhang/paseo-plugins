import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import type { ProviderVersion } from "../shared/contracts.ts";
import type { ProviderId } from "../shared/providers.ts";

const execFileAsync = promisify(execFile);
type Diagnostic = PluginHandlerContext["paseo"]["providers"]["diagnostic"];
type VersionRunner = (command: string, args: string[], options: { timeout: number; maxBuffer: number }) => Promise<{ stdout: string }>;

/** Local binaries only; package runners could install software while probing. */
const VERSION_BINARIES: Record<ProviderId, string> = {
  claude: "claude", codex: "codex", cursor: "cursor-agent", copilot: "copilot", opencode: "opencode", pi: "pi", omp: "omp",
  cline: "cline", "codebuddy-code": "codebuddy", gemini: "gemini", goose: "goose", grok: "grok", kilo: "kilo",
  kiro: "kiro-cli", kimi: "kimi", "qwen-code": "qwen", traecli: "traecli",
};

/** Accept version output, not arbitrary numbers in diagnostic errors or paths. */
export function parseProviderVersion(provider: ProviderId, output: string): string | null {
  const text = output.trim();
  if (provider === "opencode") {
    return /^(?:opencode\s+)?v?(\d+\.\d+\.\d+(?:-[\da-z.-]+)?(?:\+[\da-z.-]+)?)$/i.exec(text)?.[1] ?? null;
  }
  if (text.length > 200 || /\b(?:error|failed|failure|unknown|unavailable)\b/i.test(text)) return null;
  // Product prefixes, e.g. codex-cli / @tencent/tclaude / omp/, and
  // suffix labels, e.g. 2.1.0 (Claude Code). Date-based Cursor builds also fit.
  return /^(?:[a-z@][a-z\d@._/-]*(?:[ \t]+[a-z][a-z\d._-]*)*[ \t/]+)?v?(\d+\.\d+\.\d+(?:-[\da-z.-]+)?(?:\+[\da-z.-]+)?)(?:[ \t]+\([a-z][a-z \t-]*\))?$/i.exec(text)?.[1] ?? null;
}

export async function detectProviderVersion(
  provider: ProviderId,
  diagnostic?: Diagnostic,
  run: VersionRunner = execFileAsync,
  hostTimeoutMs = 5000,
): Promise<ProviderVersion> {
  if (diagnostic) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const response = await Promise.race([
        diagnostic(provider),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Provider diagnostic timed out")), hostTimeoutMs); }),
      ]);
      const row = /^\s*Version:[ \t]*(.*)$/m.exec(response.diagnostic)?.[1];
      const version = row ? parseProviderVersion(provider, row) : null;
      if (version) return { version, source: "host" };
    } catch {
      // Older hosts and unavailable providers can still have a usable PATH CLI.
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
  try {
    const { stdout } = await run(VERSION_BINARIES[provider], ["--version"], { timeout: 3000, maxBuffer: 32 * 1024 });
    const version = parseProviderVersion(provider, stdout);
    if (version) return { version, source: "cli" };
  } catch {
    // Missing binaries, timeout and failed version commands do not fail a scan.
  }
  return { version: null, source: "unknown" };
}
