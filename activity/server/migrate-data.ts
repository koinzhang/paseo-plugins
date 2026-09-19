import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { LEGACY_PLUGIN_ID, LOG_PREFIX, PLUGIN_ID } from "../shared/plugin-id.ts";

export type MigratePluginDataResult = {
  dir: string;
  migrated: boolean;
  from: string | null;
};

function pluginDataDir(pluginId: string, homeDir: string): string {
  return join(homeDir, ".paseo", "plugin-data", pluginId);
}

function dirHasEntries(path: string): boolean {
  if (!existsSync(path)) return false;
  try {
    return readdirSync(path).length > 0;
  } catch {
    return false;
  }
}

/**
 * Ensure `~/.paseo/plugin-data/activity` exists.
 * If the legacy `tool-usage` dir has data and the new dir is empty/missing, rename it.
 */
export function resolveActivityDataDir(options: {
  homeDir?: string;
  log?: (message: string) => void;
} = {}): MigratePluginDataResult {
  const homeDir = options.homeDir ?? homedir();
  const log = options.log ?? ((message) => console.log(message));
  const to = pluginDataDir(PLUGIN_ID, homeDir);
  const from = pluginDataDir(LEGACY_PLUGIN_ID, homeDir);

  if (dirHasEntries(to)) {
    return { dir: to, migrated: false, from: null };
  }

  if (dirHasEntries(from)) {
    mkdirSync(dirname(to), { recursive: true });
    if (existsSync(to)) {
      rmSync(to, { recursive: true, force: true });
    }
    renameSync(from, to);
    log(`${LOG_PREFIX} migrated plugin data ${LEGACY_PLUGIN_ID} → ${PLUGIN_ID}`);
    return { dir: to, migrated: true, from };
  }

  mkdirSync(to, { recursive: true });
  return { dir: to, migrated: false, from: null };
}
