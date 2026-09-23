import type { PluginServerContext } from "@getpaseo/plugin/server";
import { MODEL_VISIBILITY_SETTINGS, MONO_SETTINGS } from "./shared/settings";

export default function contribute(server: PluginServerContext) {
  server.registerSettings(MONO_SETTINGS);
  server.registerSettings(MODEL_VISIBILITY_SETTINGS);
  return () => {};
}
