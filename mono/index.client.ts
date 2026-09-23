import type { PluginClientContext } from "@getpaseo/plugin/client";
import { MONO_THEMES } from "./shared/palette";

export default function contribute(client: PluginClientContext) {
  const removers = MONO_THEMES.map((theme) => client.addTheme(theme));
  return () => {
    for (const remove of removers) remove();
  };
}
