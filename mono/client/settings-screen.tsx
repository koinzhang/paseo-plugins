import { useCallback, useEffect, useMemo } from "react";
import { Text } from "react-native";
import { useSettings, type PluginSurfaceProps, type SettingsState } from "@getpaseo/plugin/client";
import {
  SettingsAction,
  SettingsCard,
  SettingsSection,
  SettingsSwitch,
} from "@getpaseo/plugin/client/ui";
import { MONO_SETTINGS, type MonoSettings } from "../shared/settings";
import { setMonoSettings } from "./settings-store";

type ReadySettings = Extract<SettingsState<typeof MONO_SETTINGS.schema>, { status: "ready" }>;

function DisplayControls({ settings }: { settings: ReadySettings }) {
  const change = useCallback(
    (key: keyof MonoSettings, value: boolean) => {
      void settings.save({ ...settings.values, [key]: value }, settings.revision);
    },
    [settings],
  );
  const changeCompactSidebarNav = useCallback(
    (value: boolean) => change("compactSidebarNav", value),
    [change],
  );
  const changeHideThinking = useCallback((value: boolean) => change("hideThinking", value), [change]);
  const changeHideDictation = useCallback(
    (value: boolean) => change("hideDictation", value),
    [change],
  );
  const changeHideVoiceMode = useCallback(
    (value: boolean) => change("hideVoiceMode", value),
    [change],
  );
  return (
    <>
      <SettingsSection title="Layout">
        <SettingsCard>
          <SettingsSwitch
            label="Compact sidebar navigation"
            hint="Show New workspace, History, Search, Schedules and plugin items as one icon row. Web and desktop only."
            value={settings.values.compactSidebarNav}
            disabled={settings.saving}
            onValueChange={changeCompactSidebarNav}
          />
          <SettingsSwitch
            label="Hide Thinking in timeline"
            hint="Remove agent reasoning rows from the timeline. All platforms."
            value={settings.values.hideThinking}
            disabled={settings.saving}
            onValueChange={changeHideThinking}
          />
        </SettingsCard>
      </SettingsSection>
      <SettingsSection title="Voice buttons">
        <SettingsCard>
          <SettingsSwitch
            label="Hide dictation button"
            hint="Microphone button in the composer. Web and desktop only."
            value={settings.values.hideDictation}
            disabled={settings.saving}
            onValueChange={changeHideDictation}
          />
          <SettingsSwitch
            label="Hide voice mode button"
            hint="Voice conversation button in the composer. Web and desktop only."
            value={settings.values.hideVoiceMode}
            disabled={settings.saving}
            onValueChange={changeHideVoiceMode}
            error={settings.saveError}
          />
        </SettingsCard>
      </SettingsSection>
    </>
  );
}

export function DisplaySettingsScreen({ theme }: PluginSurfaceProps) {
  const settings = useSettings(MONO_SETTINGS);
  const textStyle = useMemo(() => ({ color: theme.colors.foreground }), [theme]);
  const values = settings.status === "ready" ? settings.values : null;

  useEffect(() => {
    if (values) setMonoSettings(values);
  }, [values]);

  if (settings.status === "loading") return <Text style={textStyle}>Loading settings…</Text>;
  if (settings.status !== "ready") {
    return (
      <SettingsSection title="Settings">
        <Text style={textStyle}>{settings.error}</Text>
        <SettingsAction label="Try again" actionLabel="Reload" onPress={settings.reload} />
        {settings.status === "invalid" ? (
          <SettingsAction
            label="Restore default settings"
            actionLabel="Reset"
            onPress={settings.reset}
          />
        ) : null}
      </SettingsSection>
    );
  }
  return <DisplayControls settings={settings} />;
}
