import { Icon } from "@getpaseo/plugin/client/react-native";
import { memo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { Entry } from "../shared/contracts.ts";
import { formatTokenCount, type Messages } from "../shared/i18n.ts";
import { CARD, ICON_SIZE, RADIUS, TEXT } from "./design-tokens.ts";
import { CATEGORY_ICONS, entryLabel, entryMeta } from "./entry-row.tsx";
import { StatusBadge, TokenBadge, type Colors } from "./ui.tsx";

/** Card-view twin of `EntryRow`: same facts, wrapped for a responsive grid. */
export const EntryCard = memo(function EntryCard({
  entry,
  selected,
  onSelect,
  colors,
  m,
  width,
}: {
  entry: Entry;
  selected: boolean;
  onSelect: (entry: Entry) => void;
  colors: Colors;
  m: Messages;
  width?: number;
}): ReactNode {
  const muted = entry.status === "inactive" || entry.status === "disabled";
  const atRest = entry.tokens?.atRest ? formatTokenCount(entry.tokens.atRest) : null;
  const onInvoke = entry.tokens?.onInvoke ? formatTokenCount(entry.tokens.onInvoke) : null;
  const plugin = entry.agentPlugin;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={entryLabel(entry, m)}
      onPress={() => onSelect(entry)}
      style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => ({
        width,
        flexGrow: width == null ? 1 : 0,
        flexBasis: width == null ? "100%" : undefined,
        padding: CARD.padding,
        borderRadius: RADIUS.block,
        borderWidth: 1,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected || hovered || pressed ? colors.surface2 : colors.surface1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View style={{ paddingTop: 2, opacity: muted ? 0.5 : 1 }}>
          <Icon name={CATEGORY_ICONS[entry.category]} size={ICON_SIZE.inline} color={colors.foregroundMuted} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <Text
              style={{ ...TEXT.rowTitle, color: muted ? colors.foregroundMuted : colors.foreground, flexShrink: 1 }}
              numberOfLines={1}
            >
              {entry.name}
            </Text>
            <StatusBadge status={entry.status} label={m.statuses[entry.status]} colors={colors} />
          </View>
          {entry.description ? (
            <Text style={{ ...TEXT.meta, color: colors.foregroundMuted }} numberOfLines={2}>
              {entry.description}
            </Text>
          ) : null}
          <Text style={{ ...TEXT.meta, color: colors.foregroundMuted }} numberOfLines={2}>
            {entryMeta(entry, m)}
          </Text>
          {atRest || onInvoke || plugin ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, paddingTop: 2 }}>
              {atRest ? <TokenBadge label={m.tokens(atRest)} hint={m.tokensHint(atRest)} colors={colors} /> : null}
              {onInvoke ? <TokenBadge label={m.tokensOnInvoke(onInvoke)} hint={m.tokensOnInvokeHint(onInvoke)} colors={colors} /> : null}
              {plugin ? (
                <View style={{ borderRadius: RADIUS.control, borderWidth: 1, borderColor: plugin.validation === "valid" ? colors.accent : colors.statusWarning, paddingHorizontal: 6, paddingVertical: 2, flexShrink: 0 }}>
                  <Text style={{ ...TEXT.pillBadge, color: plugin.validation === "valid" ? colors.accent : colors.statusWarning }} numberOfLines={1}>
                    {m.agentPluginLabel(plugin.version, plugin.validation)}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});
