import { settingsRpc } from "@getpaseo/plugin";
import type { PluginClientContext } from "@getpaseo/plugin/client";
import { installModelVisibility } from "./client/model-visibility-store";
import { installModelVisibilityWeb } from "./client/model-visibility-web";
import { DisplaySettingsScreen } from "./client/settings-screen";
import { getMonoSettings, setMonoSettings, subscribeMonoSettings } from "./client/settings-store";
import { installMonoWeb } from "./client/web";
import { MONO_THEMES } from "./shared/palette";
import { MONO_SETTINGS } from "./shared/settings";
import { HIDE_REASONING_TRANSFORMER_ID, hideReasoning } from "./shared/timeline";

export default function contribute(client: PluginClientContext) {
  const removers = MONO_THEMES.map((theme) => client.addTheme(theme));
  removers.push(
    client.addSettingsScreen({
      id: "display",
      title: "Settings",
      icon: "Settings",
      Component: DisplaySettingsScreen,
    }),
  );

  let removeHideThinking: (() => void) | null = null;
  function syncHideThinking(enabled: boolean): void {
    if (enabled && !removeHideThinking) {
      removeHideThinking = client.addTimelineTransformer({
        id: HIDE_REASONING_TRANSFORMER_ID,
        query: { itemType: "reasoning" },
        transform: hideReasoning,
      });
    } else if (!enabled && removeHideThinking) {
      removeHideThinking();
      removeHideThinking = null;
    }
  }
  syncHideThinking(getMonoSettings().hideThinking);
  const unsubscribe = subscribeMonoSettings((settings) => syncHideThinking(settings.hideThinking));

  const removeWeb = installMonoWeb();
  const removeModelVisibility = installModelVisibility(client);
  const removeModelVisibilityWeb = installModelVisibilityWeb();

  let disposed = false;
  client
    .rpc(settingsRpc(MONO_SETTINGS.id).read, {})
    .then((result) => {
      if (disposed || result.status !== "ready") return;
      const parsed = MONO_SETTINGS.schema.safeParse(result.values);
      if (parsed.success) setMonoSettings(parsed.data);
    })
    .catch(() => {});

  return () => {
    disposed = true;
    unsubscribe();
    syncHideThinking(false);
    removeWeb();
    removeModelVisibilityWeb();
    removeModelVisibility();
    for (const remove of removers) remove();
  };
}
