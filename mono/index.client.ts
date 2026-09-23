import type { PluginClientContext } from "@getpaseo/plugin/client";
import { installMonoWeb } from "./client/web";
import { MONO_THEMES } from "./shared/palette";
import { HIDE_REASONING_TRANSFORMER_ID, hideReasoning } from "./shared/timeline";

export default function contribute(client: PluginClientContext) {
  const removers = MONO_THEMES.map((theme) => client.addTheme(theme));
  removers.push(
    client.addTimelineTransformer({
      id: HIDE_REASONING_TRANSFORMER_ID,
      query: { itemType: "reasoning" },
      transform: hideReasoning,
    }),
  );
  const removeWeb = installMonoWeb();
  return () => {
    removeWeb();
    for (const remove of removers) remove();
  };
}
