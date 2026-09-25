import { createHash, randomUUID } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { scanRpc, type ScanResult } from "../shared/contracts.ts";
import type { ProviderId } from "../shared/providers.ts";

export const SCAN_REFRESH_MS = 10 * 60_000;
const SNAPSHOT_VERSION = 1;
const MAX_SNAPSHOT_BYTES = 10 * 1024 * 1024;
const SnapshotSchema = z.object({ version: z.literal(SNAPSHOT_VERSION), result: scanRpc.output });

function pluginDataDir(): string {
  const configured = process.env.PASEO_HOME ?? path.join(homedir(), ".paseo");
  const paseoHome = configured === "~" ? homedir() : configured.startsWith(`~${path.sep}`) ? path.join(homedir(), configured.slice(2)) : configured;
  return path.join(path.resolve(paseoHome), "plugin-data", "customize");
}

export function snapshotFile(provider: ProviderId, projectRoot: string | null, directory = pluginDataDir()): string {
  const key = createHash("sha256").update(JSON.stringify([provider, projectRoot])).digest("hex");
  return path.join(directory, `${key}.json`);
}

export function readSnapshot(
  provider: ProviderId,
  projectRoot: string | null,
  options: { directory?: string; now?: number; home?: string } = {},
): { snapshot: ScanResult | null; stale: boolean } {
  const file = snapshotFile(provider, projectRoot, options.directory);
  try {
    if (statSync(file).size > MAX_SNAPSHOT_BYTES) return { snapshot: null, stale: true };
    const parsed = SnapshotSchema.parse(JSON.parse(readFileSync(file, "utf8")));
    const result = parsed.result;
    const home = options.home ?? homedir();
    if (result.provider !== provider || result.projectRoot !== projectRoot || result.home !== home) return { snapshot: null, stale: true };
    const age = (options.now ?? Date.now()) - Date.parse(result.scannedAt);
    if (!Number.isFinite(age)) return { snapshot: null, stale: true };
    return { snapshot: result, stale: age < 0 || age >= SCAN_REFRESH_MS };
  } catch {
    return { snapshot: null, stale: true };
  }
}

export function writeSnapshot(result: ScanResult, directory = pluginDataDir()): void {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const file = snapshotFile(result.provider, result.projectRoot, directory);
  const serialized = JSON.stringify({ version: SNAPSHOT_VERSION, result });
  if (Buffer.byteLength(serialized) > MAX_SNAPSHOT_BYTES) throw new Error("Customize snapshot exceeds size limit");
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, serialized, { encoding: "utf8", flag: "wx", mode: 0o600 });
    renameSync(temporary, file);
  } finally {
    rmSync(temporary, { force: true });
  }
}
