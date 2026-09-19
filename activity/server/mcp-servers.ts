import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir as osHomedir } from "node:os";
import { join } from "node:path";
import { createKeyedTtlCache } from "./ttl-cache.ts";

/** Paseo-injected agent MCP server name (`runtime-mcp-config.js`). */
export const PASEO_MCP_SERVER_NAME = "paseo";

export type ResolveMcpServersOptions = {
  homeDir?: string;
  cwd?: string | null;
  /** Agent id — used to read persisted `mcpServers` from ~/.paseo/agents. */
  agentId?: string | null;
  /** Extra names (tests / callers). */
  extra?: readonly string[];
};

const mcpServersCache = createKeyedTtlCache<string[]>(60_000);

/**
 * Resolve MCP server names for OpenCode `<server>_<tool>` (and ACP title) matching.
 *
 * Sources (union, longest-prefix wins at classify time):
 * 1. Always `paseo` when daemon injects MCP into agents (default on)
 * 2. OpenCode user/project config `mcp` keys
 * 3. Agent persistence `mcpServers` keys under ~/.paseo/agents
 * 4. Caller `extra`
 */
export function resolveMcpServers(options: ResolveMcpServersOptions = {}): string[] {
  const homeDir = options.homeDir ?? osHomedir();
  const cwd = options.cwd ?? null;
  const agentId = options.agentId ?? null;
  const extraKey = (options.extra ?? []).join("\0");
  const key = `${homeDir}\0${cwd ?? ""}\0${agentId ?? ""}\0${extraKey}`;
  return mcpServersCache.get(key, () => resolveMcpServersUncached(options));
}

function resolveMcpServersUncached(options: ResolveMcpServersOptions): string[] {
  const homeDir = options.homeDir ?? osHomedir();
  const names = new Set<string>();

  if (isPaseoMcpInjectEnabled(homeDir)) {
    names.add(PASEO_MCP_SERVER_NAME);
  }

  for (const name of readOpenCodeMcpServerNames(homeDir, options.cwd ?? null)) {
    names.add(name);
  }

  if (options.agentId) {
    for (const name of readAgentPersistedMcpServerNames(homeDir, options.agentId)) {
      names.add(name);
    }
  }

  for (const name of options.extra ?? []) {
    if (name.trim()) names.add(name.trim());
  }

  return [...names];
}

export function isPaseoMcpInjectEnabled(homeDir: string): boolean {
  const configPath = join(homeDir, ".paseo", "config.json");
  try {
    const raw = readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw) as {
      daemon?: { mcp?: { injectIntoAgents?: boolean } };
    };
    return parsed.daemon?.mcp?.injectIntoAgents !== false;
  } catch {
    // Missing / unreadable config — Paseo default is inject on.
    return true;
  }
}

export function readOpenCodeMcpServerNames(
  homeDir: string,
  cwd: string | null,
): string[] {
  const candidates = [
    join(homeDir, ".config", "opencode", "opencode.jsonc"),
    join(homeDir, ".config", "opencode", "opencode.json"),
  ];
  if (cwd) {
    candidates.push(
      join(cwd, "opencode.jsonc"),
      join(cwd, "opencode.json"),
      join(cwd, ".opencode", "opencode.jsonc"),
      join(cwd, ".opencode", "opencode.json"),
    );
  }

  const names = new Set<string>();
  for (const path of candidates) {
    for (const name of readMcpKeysFromConfigFile(path)) {
      names.add(name);
    }
  }
  return [...names];
}

function readMcpKeysFromConfigFile(path: string): string[] {
  if (!existsSync(path)) return [];
  try {
    const text = readFileSync(path, "utf8");
    const parsed = parseJsonc(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    const mcp = (parsed as { mcp?: unknown; mcpServers?: unknown }).mcp
      ?? (parsed as { mcpServers?: unknown }).mcpServers;
    if (!mcp || typeof mcp !== "object" || Array.isArray(mcp)) return [];
    return Object.keys(mcp as Record<string, unknown>).filter((k) => k.trim().length > 0);
  } catch {
    return [];
  }
}

export function readAgentPersistedMcpServerNames(
  homeDir: string,
  agentId: string,
): string[] {
  const agentsRoot = join(homeDir, ".paseo", "agents");
  const file = findAgentFile(agentsRoot, agentId);
  if (!file) return [];
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as {
      persistence?: { metadata?: { mcpServers?: Record<string, unknown> } };
      config?: { mcpServers?: Record<string, unknown> };
    };
    const fromPersistence = parsed.persistence?.metadata?.mcpServers;
    const fromConfig = parsed.config?.mcpServers;
    const names = new Set<string>();
    if (fromPersistence && typeof fromPersistence === "object") {
      for (const k of Object.keys(fromPersistence)) names.add(k);
    }
    if (fromConfig && typeof fromConfig === "object") {
      for (const k of Object.keys(fromConfig)) names.add(k);
    }
    return [...names];
  } catch {
    return [];
  }
}

function findAgentFile(agentsRoot: string, agentId: string): string | null {
  const direct = join(agentsRoot, `${agentId}.json`);
  if (existsSync(direct)) return direct;
  try {
    for (const entry of readdirSync(agentsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const nested = join(agentsRoot, entry.name, `${agentId}.json`);
      if (existsSync(nested)) return nested;
    }
  } catch {
    /* no agents dir */
  }
  return null;
}

/** Minimal JSONC: strip // and /* *\/ comments, then JSON.parse. */
export function parseJsonc(text: string): unknown {
  let out = "";
  let i = 0;
  let inString = false;
  let quote: '"' | "'" | null = null;
  while (i < text.length) {
    const ch = text[i]!;
    const next = text[i + 1];

    if (inString) {
      out += ch;
      if (ch === "\\" && i + 1 < text.length) {
        out += text[i + 1]!;
        i += 2;
        continue;
      }
      if (ch === quote) {
        inString = false;
        quote = null;
      }
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }

    if (ch === "/" && next === "/") {
      i += 2;
      while (i < text.length && text[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i + 1 < text.length && !(text[i] === "*" && text[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }

    out += ch;
    i += 1;
  }

  // Trailing commas before } or ]
  const cleaned = out.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(cleaned);
}
