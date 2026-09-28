import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import type { ProviderVersion } from "../shared/contracts.ts";

const execFileAsync = promisify(execFile);
type Diagnostic = PluginHandlerContext["paseo"]["providers"]["diagnostic"];
type VersionRunner = (command: string, args: string[], options: { timeout: number; maxBuffer: number }) => Promise<{ stdout: string }>;

/** Accept version output, not arbitrary numbers in diagnostic errors or paths. */
export function parseOpencodeVersion(output: string): string | null {
  return /^(?:opencode\s+)?v?(\d+\.\d+\.\d+(?:-[\da-z.-]+)?(?:\+[\da-z.-]+)?)$/i.exec(output.trim())?.[1] ?? null;
}

export async function detectOpencodeVersion(
  diagnostic?: Diagnostic,
  run: VersionRunner = execFileAsync,
  hostTimeoutMs = 5000,
): Promise<ProviderVersion> {
  if (diagnostic) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const response = await Promise.race([
        diagnostic("opencode"),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Provider diagnostic timed out")), hostTimeoutMs); }),
      ]);
      const row = /^\s*Version:[ \t]*(.*)$/m.exec(response.diagnostic)?.[1];
      const version = row ? parseOpencodeVersion(row) : null;
      if (version) return { version, source: "host" };
    } catch {
      // Older hosts and unavailable providers can still have a usable PATH CLI.
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
  try {
    const { stdout } = await run("opencode", ["--version"], { timeout: 3000, maxBuffer: 32 * 1024 });
    const version = parseOpencodeVersion(stdout);
    if (version) return { version, source: "cli" };
  } catch {
    // Missing binaries, timeout and failed version commands do not fail a scan.
  }
  return { version: null, source: "unknown" };
}
