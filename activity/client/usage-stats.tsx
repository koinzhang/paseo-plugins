import { useState } from "react";
import { Text, View, type TextStyle } from "react-native";
import { fitFontSize } from "./fit-text.ts";
import { FONT_SIZE, FONT_WEIGHT, RADIUS } from "./design-tokens.ts";
import type { KpiRow } from "../shared/insights.ts";

/** Hidden measuring box wide enough to never clamp the text (051). */
const MEASURE_WIDTH = 1000;

/**
 * Single-line text that shrinks instead of wrapping (051). KPI tiles are
 * ~130px wide, so 18px values like "Cursor · 61%" used to wrap onto two lines
 * and push the labels out of line. The hidden copy measures the intrinsic width
 * at `base` (an unconstrained box, since a constrained one reports the clamped
 * width), then the visible text is scaled to fit. `numberOfLines={1}` stays as
 * the hard guard: a bad measurement can only ellipsize, never wrap.
 */
function FitText({ text, available, base, min, lineHeight, color, weight, tabular }: {
  text: string;
  available: number;
  base: number;
  min?: number;
  lineHeight: number;
  color: string;
  weight?: typeof FONT_WEIGHT.medium;
  tabular?: boolean;
}) {
  // The hidden copy renders at `fontSize` and reports its width; the fit is
  // derived from that single measurement, so a tile resize re-fits without
  // needing a new measurement.
  const [measured, setMeasured] = useState({ size: base, width: 0 });
  const fontSize = fitFontSize(measured, available, { base, min });
  const style: TextStyle = {
    color,
    fontSize,
    lineHeight,
    fontWeight: weight,
    fontVariant: tabular ? ["tabular-nums"] : undefined,
  };
  return (
    <>
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, overflow: "hidden" }}
      >
        <View style={{ position: "absolute", left: 0, top: 0, width: MEASURE_WIDTH, flexDirection: "row", opacity: 0 }}>
          <Text
            numberOfLines={1}
            onLayout={(event) =>
              setMeasured({ size: fontSize, width: event.nativeEvent.layout.width })
            }
            style={{ ...style, flexShrink: 0 }}
          >
            {text}
          </Text>
        </View>
      </View>
      <Text numberOfLines={1} style={style}>
        {text}
      </Text>
    </>
  );
}

function StatTile({ item, colors, dense, compact, bordered }: {
  item: KpiRow;
  colors: { border: string; foreground: string; foregroundMuted: string; statusSuccess: string; statusDanger: string };
  dense: boolean;
  compact: boolean;
  bordered: boolean;
}) {
  const [width, setWidth] = useState(0);
  const padding = dense ? 8 : 12;
  const available = Math.max(0, width - padding * 2 - (bordered ? 1 : 0));
  const comparisonColor = item.comparison?.direction === "up"
    ? colors.statusSuccess
    : item.comparison?.direction === "down"
      ? colors.statusDanger
      : colors.foregroundMuted;
  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{
        flexGrow: 1,
        flexBasis: dense ? 84 : compact ? 100 : 120,
        minWidth: 0,
        alignItems: "center",
        paddingHorizontal: padding,
        paddingVertical: dense ? 2 : 4,
        gap: dense ? 4 : 6,
        borderLeftWidth: bordered ? 1 : 0,
        borderLeftColor: colors.border,
      }}
    >
      <FitText
        text={item.value}
        available={available}
        base={FONT_SIZE.metric}
        min={FONT_SIZE.caption}
        lineHeight={22}
        color={colors.foreground}
        weight={FONT_WEIGHT.medium}
        tabular
      />
      <FitText
        text={item.label}
        available={available}
        base={FONT_SIZE.label}
        min={10}
        lineHeight={16}
        color={colors.foregroundMuted}
      />
      {item.comparison ? (
        <FitText
          text={item.comparison.text}
          available={available}
          base={FONT_SIZE.label}
          min={10}
          lineHeight={16}
          color={comparisonColor}
          tabular
        />
      ) : null}
    </View>
  );
}

export function UsageStats({ items, colors, compact, dense }: {
  items: ReadonlyArray<KpiRow>;
  colors: { border: string; foreground: string; foregroundMuted: string; statusSuccess: string; statusDanger: string };
  compact: boolean;
  /** Smaller numbers / labels / padding (025). */
  dense?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderColor: colors.border, borderRadius: RADIUS.card, paddingVertical: dense ? 6 : compact ? 8 : 12, rowGap: dense ? 10 : 16 }}>
      {items.map((item, index) => (
        <StatTile
          key={item.label}
          item={item}
          colors={colors}
          dense={dense === true}
          compact={compact}
          bordered={index > 0 && !compact}
        />
      ))}
    </View>
  );
}
