import { Icon } from "@getpaseo/plugin/client/react-native";
import { memo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { Category, Entry } from "../shared/contracts.ts";
import type { Messages } from "../shared/i18n.ts";
import { ICON_SIZE, RADIUS, ROW_PADDING, TEXT } from "./design-tokens.ts";
import { StatusBadge, type Colors } from "./ui.tsx";

export const CATEGORY_ICONS: Record<Category, string> = {
  instructions: "FileText",
  rules: "ScrollText",
  skills: "Sparkles",
  mcp: "Plug",
  commands: "Terminal",
  subagents: "Users",
  plugins: "Puzzle",
};

export function entryMeta(entry: Entry, m: Messages, includeFormat = false): string {
  const parts: string[] = [];
  if (entry.mcp) parts.push(entry.mcp.transport);
  else parts.push(entry.dir);
  if (entry.reason) parts.push(m.reason(entry.reason.code, entry.reason.value));
  if (includeFormat && entry.agentPlugin) parts.push(m.agentPluginLabel(entry.agentPlugin.version, entry.agentPlugin.validation));
  for (const tag of entry.tags) parts.push(m.tags[tag]);
  return parts.join(" · ");
}

export const EntryRow = memo(function EntryRow({
  entry,
  selected,
  onSelect,
  colors,
  m,
}: {
  entry: Entry;
  selected: boolean;
  onSelect: (entry: Entry) => void;
  colors: Colors;
  m: Messages;
}): ReactNode {
  const muted = entry.status === "inactive" || entry.status === "disabled";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${entry.name}, ${m.statuses[entry.status]}${entry.agentPlugin ? `, ${m.agentPluginLabel(entry.agentPlugin.version, entry.agentPlugin.validation)}` : ""}`}
      onPress={() => onSelect(entry)}
      style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => ({
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        paddingVertical: ROW_PADDING.dense,
        paddingHorizontal: 8,
        marginHorizontal: -8,
        borderRadius: RADIUS.control,
        backgroundColor: selected ? colors.surface2 : hovered || pressed ? colors.surface1 : "transparent",
      })}
    >
      <View style={{ paddingTop: 1, opacity: muted ? 0.5 : 1 }}>
        <Icon name={CATEGORY_ICONS[entry.category]} size={ICON_SIZE.leading} color={colors.foregroundMuted} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            style={{ ...TEXT.rowTitle, color: muted ? colors.foregroundMuted : colors.foreground, flexShrink: 1 }}
            numberOfLines={1}
          >
            {entry.name}
          </Text>
          <StatusBadge status={entry.status} label={m.statuses[entry.status]} colors={colors} />
          {entry.agentPlugin ? (
            <View style={{ borderRadius: RADIUS.control, borderWidth: 1, borderColor: entry.agentPlugin.validation === "valid" ? colors.accent : colors.statusWarning, paddingHorizontal: 6, paddingVertical: 2, flexShrink: 0 }}>
              <Text style={{ ...TEXT.pillBadge, color: entry.agentPlugin.validation === "valid" ? colors.accent : colors.statusWarning }} numberOfLines={1}>{m.agentPluginLabel(entry.agentPlugin.version, entry.agentPlugin.validation)}</Text>
            </View>
          ) : null}
        </View>
        {entry.description ? (
          <Text style={{ ...TEXT.meta, color: colors.foregroundMuted }} numberOfLines={1}>
            {entry.description}
          </Text>
        ) : null}
        <Text style={{ ...TEXT.meta, color: colors.foregroundMuted }} numberOfLines={1}>
          {entryMeta(entry, m)}
        </Text>
      </View>
    </Pressable>
  );
});
