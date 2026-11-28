import { useEffect, useMemo } from "react";
import { Text } from "react-native";
import {
  useSettings,
  type PluginSurfaceProps,
  type SettingsState,
} from "@getpaseo/plugin/client";
import {
  SettingsAction,
  SettingsCard,
  SettingsSection,
  SettingsSwitch,
} from "@getpaseo/plugin/client/ui";
import { activitySettings, type ActivitySettings } from "../shared/activity-settings.ts";
import { useMessages } from "./use-app-language.ts";
import { setActivitySettings } from "./activity-settings-store.ts";

type ReadySettings = Extract<SettingsState<typeof activitySettings.schema>, { status: "ready" }>;

function PillSettings({ settings }: { settings: ReadySettings }) {
  const messages = useMessages();
  const update = (patch: Partial<ActivitySettings>) => {
    void settings.save({ ...settings.values, ...patch }, settings.revision);
  };

  return (
    <SettingsSection title={messages.settings.composerPills}>
      <SettingsCard>
        <SettingsSwitch
          label={messages.settings.hideUsagePill}
          hint={messages.settings.hideUsagePillHint}
          value={settings.values.hideUsagePill}
          disabled={settings.saving}
          onValueChange={(hideUsagePill) => update({ hideUsagePill })}
        />
        <SettingsSwitch
          label={messages.settings.hideAttentionPill}
          hint={messages.settings.hideAttentionPillHint}
          value={settings.values.hideAttentionPill}
          disabled={settings.saving}
          onValueChange={(hideAttentionPill) => update({ hideAttentionPill })}
          error={settings.saveError}
        />
      </SettingsCard>
    </SettingsSection>
  );
}

export function ActivitySettingsScreen({ theme }: PluginSurfaceProps) {
  const settings = useSettings(activitySettings);
  const messages = useMessages();
  const textStyle = useMemo(() => ({ color: theme.colors.foreground }), [theme]);
  const values = settings.status === "ready" ? settings.values : null;

  useEffect(() => {
    if (values) setActivitySettings(values);
  }, [values]);

  if (settings.status === "loading")
    return <Text style={textStyle}>{messages.common.loading}</Text>;
  if (settings.status !== "ready") {
    return (
      <SettingsSection title={messages.settings.title}>
        <Text style={textStyle}>{settings.error}</Text>
        <SettingsAction
          label={messages.settings.retry}
          actionLabel={messages.common.retry}
          onPress={settings.reload}
        />
        {settings.status === "invalid" ? (
          <SettingsAction
            label={messages.settings.restoreDefaults}
            actionLabel={messages.settings.reset}
            onPress={settings.reset}
          />
        ) : null}
      </SettingsSection>
    );
  }
  return <PillSettings settings={settings} />;
}
