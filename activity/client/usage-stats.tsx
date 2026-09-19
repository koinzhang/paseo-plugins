import { Text, View } from "react-native";

export function UsageStats({ items, colors, compact }: {
  items: ReadonlyArray<{ label: string; value: string }>;
  colors: { border: string; foreground: string; foregroundMuted: string };
  compact: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingVertical: compact ? 8 : 18, rowGap: 16 }}>
      {items.map((item, index) => (
        <View key={item.label} style={{ flexGrow: 1, flexBasis: compact ? 100 : 120, minWidth: 0, alignItems: "center", paddingHorizontal: 12, paddingVertical: 4, gap: 6, borderLeftWidth: index === 0 || compact ? 0 : 1, borderLeftColor: colors.border }}>
          <Text style={{ color: colors.foreground, fontSize: compact ? 20 : 24, fontWeight: "500", fontVariant: ["tabular-nums"] }}>{item.value}</Text>
          <Text style={{ color: colors.foregroundMuted, fontSize: compact ? 12 : 14 }}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}
