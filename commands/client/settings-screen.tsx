import { useEffect, useMemo } from "react";
import { Text } from "react-native";
import { useSettings, type PluginSurfaceProps, type SettingsState } from "@getpaseo/plugin/client";
import {
  SettingsAction,
  SettingsCard,
  SettingsSection,
  SettingsSwitch,
} from "@getpaseo/plugin/client/ui";
import { COMMANDS_SETTINGS } from "../shared/settings.ts";
import { COMMANDS } from "./commands.ts";
import { setDisabledCommands } from "./settings-store.ts";

type ReadySettings = Extract<SettingsState<typeof COMMANDS_SETTINGS.schema>, { status: "ready" }>;

function CommandSwitches({ settings }: { settings: ReadySettings }) {
  const disabled = settings.values.disabled;
  const toggle = (name: string, enabled: boolean) => {
    const next = enabled ? disabled.filter((entry) => entry !== name) : [...disabled, name];
    void settings.save({ ...settings.values, disabled: next }, settings.revision);
  };
  return (
    <SettingsSection title="Slash commands">
      <SettingsCard>
        {COMMANDS.map((command, index) => (
          <SettingsSwitch
            key={command.name}
            label={`/${command.name}${command.argumentHint ? ` ${command.argumentHint}` : ""}`}
            hint={`${command.description}. ${command.details}`}
            value={!disabled.includes(command.name)}
            disabled={settings.saving}
            onValueChange={(enabled) => toggle(command.name, enabled)}
            error={index === COMMANDS.length - 1 ? settings.saveError : null}
          />
        ))}
      </SettingsCard>
    </SettingsSection>
  );
}

export function CommandsSettingsScreen({ theme }: PluginSurfaceProps) {
  const settings = useSettings(COMMANDS_SETTINGS);
  const textStyle = useMemo(() => ({ color: theme.colors.foreground }), [theme]);
  const values = settings.status === "ready" ? settings.values : null;

  useEffect(() => {
    if (values) setDisabledCommands(values.disabled);
  }, [values]);

  if (settings.status === "loading") return <Text style={textStyle}>Loading settings…</Text>;
  if (settings.status !== "ready") {
    return (
      <SettingsSection title="Slash commands">
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
  return <CommandSwitches settings={settings} />;
}
