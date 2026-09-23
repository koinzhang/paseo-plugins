import type { PluginClientContext } from "@getpaseo/plugin/client";
import { installMonoWeb } from "./client/web";
import { MONO_THEMES } from "./shared/palette";

export default function contribute(client: PluginClientContext) {
  const removers = MONO_THEMES.map((theme) => client.addTheme(theme));
  const removeWeb = installMonoWeb();
  return () => {
    removeWeb();
    for (const remove of removers) remove();
  };
}
