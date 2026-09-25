import { execFile } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { RpcInput, RpcOutput } from "@getpaseo/plugin";
import type { Entry } from "../shared/contracts.ts";
import { cachedScanRpc, openRpc, previewRpc, scanRpc } from "../shared/contracts.ts";
import type { ProviderId } from "../shared/providers.ts";
import { parseJsonc } from "./jsonc.ts";
import { redactServer } from "./mcp.ts";
import { scanClaude } from "./providers/claude.ts";
import { scanCodex } from "./providers/codex.ts";
import { scanCopilot } from "./providers/copilot.ts";
import { scanCursor } from "./providers/cursor.ts";
import { scanOmp } from "./providers/omp.ts";
import { scanOpencode } from "./providers/opencode.ts";
import { scanPi } from "./providers/pi.ts";
import { scanAcp } from "./providers/acp.ts";
import { buildNestedIndex, fileSize, isDir, isFile, isRecord, readText, type NestedIndex, type ScanContext } from "./scan-kit.ts";
import { readSnapshot, writeSnapshot } from "./scan-snapshot.ts";
import { compatibilityFor } from "./compatibility.ts";
import { mergeSkillAliases } from "./skill-aliases.ts";
import { parseToml } from "./toml.ts";
import { parseYaml } from "./yaml-lite.ts";

const execFileAsync = promisify(execFile);

const SCANNERS: Record<ProviderId, (ctx: ScanContext) => Entry[]> = {
  claude: scanClaude,
  codex: scanCodex,
  cursor: scanCursor,
  copilot: scanCopilot,
  opencode: scanOpencode,
  pi: scanPi,
  omp: scanOmp,
  cline: (ctx) => scanAcp("cline", ctx),
  "codebuddy-code": (ctx) => scanAcp("codebuddy-code", ctx),
  gemini: (ctx) => scanAcp("gemini", ctx),
  goose: (ctx) => scanAcp("goose", ctx),
  grok: (ctx) => scanAcp("grok", ctx),
  kilo: (ctx) => scanAcp("kilo", ctx),
  kiro: (ctx) => scanAcp("kiro", ctx),
  kimi: (ctx) => scanAcp("kimi", ctx),
  "qwen-code": (ctx) => scanAcp("qwen-code", ctx),
  traecli: (ctx) => scanAcp("traecli", ctx),
};

export const PREVIEW_MAX_BYTES = 64 * 1024;
export const PREVIEW_MAX_LINES = 400;
const NESTED_TTL_MS = 15_000;

const nestedCache = new Map<string, { at: number; index: NestedIndex }>();
/** Paths returned by scans; preview / open only accept these. */
const allowed = new Set<string>();
const snapshotCandidates = new Map<string, Array<{ provider: ProviderId; projectRoot: string | null }>>();

function nestedIndex(root: string): NestedIndex {
  const cached = nestedCache.get(root);
  if (cached && Date.now() - cached.at < NESTED_TTL_MS) return cached.index;
  const index = buildNestedIndex(root);
  nestedCache.set(root, { at: Date.now(), index });
  return index;
}

export function scanProvider(provider: ProviderId, projectRoot: string | null, env: Pick<ScanContext, "home" | "env" | "platform">): Entry[] {
  const root = projectRoot && isDir(projectRoot) ? path.resolve(projectRoot) : null;
  const ctx: ScanContext = { ...env, projectRoot: root, nested: root ? nestedIndex(root) : null };
  return mergeSkillAliases(provider, SCANNERS[provider](ctx));
}

export async function handleScan(input: RpcInput<typeof scanRpc>): Promise<RpcOutput<typeof scanRpc>> {
  const home = homedir();
  const entries = scanProvider(input.provider, input.projectRoot, { home, env: process.env, platform: process.platform });
  const ctx: ScanContext = { home, env: process.env, platform: process.platform, projectRoot: input.projectRoot, nested: null };
  for (const entry of entries) allowed.add(entry.path);
  const result = {
    provider: input.provider,
    projectRoot: input.projectRoot,
    home,
    entries,
    compatibility: compatibilityFor(input.provider, ctx),
    scannedAt: new Date().toISOString(),
  };
  try {
    writeSnapshot(result);
  } catch (error) {
    console.error("Customize could not persist scan snapshot", error);
  }
  return result;
}

export function handleCachedScan(input: RpcInput<typeof cachedScanRpc>): RpcOutput<typeof cachedScanRpc> {
  const cached = readSnapshot(input.provider, input.projectRoot);
  const currentCompatibility = compatibilityFor(input.provider, {
    home: homedir(), env: process.env, platform: process.platform, projectRoot: input.projectRoot, nested: null,
  });
  if (cached.snapshot) {
    for (const entry of cached.snapshot.entries) {
      const candidates = snapshotCandidates.get(entry.path) ?? [];
      if (!candidates.some((candidate) => candidate.provider === input.provider && candidate.projectRoot === input.projectRoot)) {
        candidates.push({ provider: input.provider, projectRoot: input.projectRoot });
      }
      snapshotCandidates.set(entry.path, candidates);
    }
  }
  return { ...cached, stale: cached.stale || cached.snapshot?.compatibility?.enabled !== currentCompatibility?.enabled };
}

function assertAllowed(p: string) {
  if (allowed.has(p)) return;
  for (const candidate of snapshotCandidates.get(p) ?? []) {
    const entries = scanProvider(candidate.provider, candidate.projectRoot, { home: homedir(), env: process.env, platform: process.platform });
    if (entries.some((entry) => entry.path === p)) {
      for (const entry of entries) allowed.add(entry.path);
      return;
    }
  }
  throw new Error("Path is not part of a Customize scan");
}

/** One MCP server's config, redacted, from a JSON / JSONC / TOML config file. */
export function mcpPreview(file: string, name: string): string | null {
  const text = readText(file);
  if (text == null) return null;
  let data: unknown;
  try {
    data = file.endsWith(".toml") ? parseToml(text) : file.endsWith(".yaml") ? parseYaml(text) : parseJsonc(text);
  } catch {
    return null;
  }
  const candidates: unknown[] = [];
  const pick = (value: unknown, key: string) => (isRecord(value) && isRecord(value[key]) ? value[key] : undefined);
  if (isRecord(data)) {
    for (const key of ["mcpServers", "mcp_servers", "mcp", "servers", "extensions"]) candidates.push(pick(pick(data, key), name));
    if (Array.isArray(data.mcp_servers)) candidates.push(data.mcp_servers.find((entry) => isRecord(entry) && entry.name === name));
    if (isRecord(data.projects)) for (const project of Object.values(data.projects)) candidates.push(pick(pick(project, "mcpServers"), name));
  }
  const config = candidates.find((candidate) => candidate !== undefined);
  if (config === undefined) return null;
  return JSON.stringify({ [name]: redactServer(config) }, null, 2);
}

export async function handlePreview(input: RpcInput<typeof previewRpc>): Promise<RpcOutput<typeof previewRpc>> {
  assertAllowed(input.path);
  const bytes = fileSize(input.path);
  if (input.mcpName) {
    const content = mcpPreview(input.path, input.mcpName);
    return { path: input.path, kind: content == null ? "missing" : "mcp", content: content ?? "", truncated: false, bytes };
  }
  if (isDir(input.path)) return { path: input.path, kind: "directory", content: "", truncated: false, bytes: 0 };
  if (!isFile(input.path)) return { path: input.path, kind: "missing", content: "", truncated: false, bytes: 0 };
  if (input.path.endsWith(path.join("goose", "config.yaml"))) {
    const data = parseYaml(readText(input.path, PREVIEW_MAX_BYTES) ?? "");
    const content = JSON.stringify({
      extensions: isRecord(data.extensions) ? Object.fromEntries(Object.entries(data.extensions).map(([name, config]) => [name, redactServer(config)])) : {},
      slash_commands: Array.isArray(data.slash_commands) ? data.slash_commands : [],
    }, null, 2);
    return { path: input.path, kind: "text", content, truncated: bytes > PREVIEW_MAX_BYTES, bytes };
  }
  const raw = readText(input.path, PREVIEW_MAX_BYTES) ?? "";
  const lines = raw.split("\n");
  const truncated = bytes > PREVIEW_MAX_BYTES || lines.length > PREVIEW_MAX_LINES;
  return { path: input.path, kind: "text", content: lines.slice(0, PREVIEW_MAX_LINES).join("\n"), truncated, bytes };
}

async function which(command: string): Promise<boolean> {
  try {
    await execFileAsync(process.platform === "win32" ? "where" : "which", [command], { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export async function handleOpen(input: RpcInput<typeof openRpc>): Promise<RpcOutput<typeof openRpc>> {
  assertAllowed(input.path);
  const target = input.path;
  if (process.platform === "darwin") {
    await execFileAsync("open", input.reveal ? ["-R", target] : [target], { timeout: 10_000 }).catch(async (error: unknown) => {
      // No app registered for the extension (e.g. `.mdc`, `.rules`): fall back to the default text editor.
      if (input.reveal) throw error;
      await execFileAsync("open", ["-t", target], { timeout: 10_000 });
    });
  } else if (process.platform === "win32") {
    await execFileAsync("explorer.exe", input.reveal ? [`/select,${target}`] : [target], { timeout: 10_000 }).catch(() => {});
  } else {
    const opener = (await which("xdg-open")) ? "xdg-open" : "gio";
    await execFileAsync(opener, opener === "gio" ? ["open", input.reveal ? path.dirname(target) : target] : [input.reveal ? path.dirname(target) : target], {
      timeout: 10_000,
    });
  }
  return { ok: true };
}
