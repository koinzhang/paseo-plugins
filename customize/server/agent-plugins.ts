import path from "node:path";
import { realpathSync } from "node:fs";
import { isFile, isRecord, readJson } from "./scan-kit.ts";

const SCHEMA = /^https:\/\/agent-plugins\.org\/schemas\/((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))\/plugin\.schema\.json$/;
const NAME = /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const METADATA = ["version", "description", "homepage", "repository", "license"] as const;

export interface AgentPluginManifest {
  version: string;
  validation: "valid" | "unsupported";
}

/** Reads the declared version; only locally supported versions are validated. */
export function agentPluginManifest(file: string): AgentPluginManifest | null {
  if (path.basename(file) !== "plugin.json" || !isFile(file)) return null;
  try {
    const root = realpathSync(path.dirname(file));
    const relative = path.relative(root, realpathSync(file));
    if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  } catch {
    return null;
  }
  const manifest = readJson(file);
  if (!isRecord(manifest) || typeof manifest.$schema !== "string") return null;
  const match = SCHEMA.exec(manifest.$schema);
  if (!match) return null;
  const version = match[1]!;
  if (version !== "1.0.0") return { version, validation: "unsupported" };
  if (typeof manifest.name !== "string" || manifest.name.length > 64 || !NAME.test(manifest.name)) return null;
  for (const field of METADATA) {
    if (manifest[field] !== undefined && typeof manifest[field] !== "string") return null;
  }
  if (manifest.author !== undefined) {
    if (!isRecord(manifest.author)) return null;
    if (Object.entries(manifest.author).some(([key, value]) => !["name", "email", "url"].includes(key) || typeof value !== "string")) return null;
  }
  if (manifest.keywords !== undefined && (!Array.isArray(manifest.keywords) || manifest.keywords.some((value) => typeof value !== "string"))) return null;
  // Unknown top-level fields and a non-object extensions value are ignored by §5.2.
  return { version, validation: "valid" };
}
