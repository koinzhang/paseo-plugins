import { Text, View } from "react-native";

export function UsageStats({ items, colors, compact, dense }: {
  items: ReadonlyArray<{ label: string; value: string }>;
  colors: { border: string; foreground: string; foregroundMuted: string };
  compact: boolean;
  /** Smaller numbers / labels / padding (025). */
  dense?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingVertical: dense ? 6 : compact ? 8 : 18, rowGap: dense ? 10 : 16 }}>
      {items.map((item, index) => (
        <View key={item.label} style={{ flexGrow: 1, flexBasis: dense ? 84 : compact ? 100 : 120, minWidth: 0, alignItems: "center", paddingHorizontal: dense ? 8 : 12, paddingVertical: dense ? 2 : 4, gap: dense ? 4 : 6, borderLeftWidth: index === 0 || compact ? 0 : 1, borderLeftColor: colors.border }}>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "500", fontVariant: ["tabular-nums"] }}>{item.value}</Text>
          <Text style={{ color: colors.foregroundMuted, fontSize: 12 }}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}
