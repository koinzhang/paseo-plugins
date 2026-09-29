import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type { PluginServerContext } from "@getpaseo/plugin/server";
import { modelVisibilityHostRpc } from "./shared/model-host";
import { MODEL_VISIBILITY_SETTINGS, MONO_SETTINGS } from "./shared/settings";

export default function contribute(server: PluginServerContext) {
  server.registerSettings(MONO_SETTINGS);
  server.registerSettings(MODEL_VISIBILITY_SETTINGS);
  server.handle(modelVisibilityHostRpc, async () => {
    const raw = process.env.PASEO_HOME ?? "~/.paseo";
    const home = path.resolve(raw.startsWith("~") ? path.join(homedir(), raw.slice(1)) : raw);
    const serverId =
      process.env.PASEO_SERVER_ID?.trim() ||
      (await readFile(path.join(home, "server-id"), "utf8")).trim();
    return { serverId };
  });
  return () => {};
}
