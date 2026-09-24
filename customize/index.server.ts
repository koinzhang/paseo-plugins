import type { PluginServerContext } from "@getpaseo/plugin/server";
import { handleOpen, handlePreview, handleScan } from "./server/handlers.ts";
import { openRpc, previewRpc, scanRpc } from "./shared/contracts.ts";
import { selectionSettings } from "./shared/selection-settings.ts";

export default function contribute(server: PluginServerContext) {
  server.registerSettings(selectionSettings);
  server.handle(scanRpc, handleScan);
  server.handle(previewRpc, handlePreview);
  server.handle(openRpc, handleOpen);
  return () => {};
}
