import { Icon } from "@getpaseo/plugin/client/react-native";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { Mechanism } from "../shared/mechanisms.ts";
import type { AppLanguage, Messages } from "../shared/i18n.ts";
import { CONTROL, FONT_WEIGHT, ICON_SIZE, RADIUS, TEXT } from "./design-tokens.ts";
import type { Colors } from "./ui.tsx";

/** Collapsible “How it loads” note: first fact always visible, locations and the rest on expand. */
export function MechanismCard({
  mechanism,
  language,
  colors,
  m,
}: {
  mechanism: Mechanism;
  language: AppLanguage;
  colors: Colors;
  m: Messages;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const pick = (text: { en: string; zh: string }) => (language === "zh-CN" ? text.zh : text.en);
  const [first, ...rest] = mechanism.notes;
  const expandable = mechanism.locations.length > 0 || rest.length > 0;

  return (
    <View
      style={{
        borderRadius: RADIUS.overlay,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? m.hideDetails : m.showDetails}
        disabled={!expandable}
        hitSlop={CONTROL.hitSlop}
        onPress={() => setOpen((prev) => !prev)}
        style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}
      >
        <View style={{ paddingTop: 1 }}>
          <Icon name={mechanism.supported ? "Info" : "Ban"} size={ICON_SIZE.inline} color={colors.foregroundMuted} />
        </View>
        <Text style={{ ...TEXT.meta, color: colors.foreground, flex: 1 }}>
          <Text style={{ fontWeight: FONT_WEIGHT.semibold }}>{mechanism.supported ? m.howItWorks : m.unsupported}</Text>
          {first ? `  ${pick(first)}` : ""}
        </Text>
        {expandable ? <Icon name={open ? "ChevronUp" : "ChevronDown"} size={ICON_SIZE.inline} color={colors.foregroundMuted} /> : null}
      </Pressable>
      {open ? (
        <View style={{ gap: 6, paddingLeft: 22 }}>
          {mechanism.locations.map((location, index) => (
            <View key={index} style={{ flexDirection: "row", gap: 8 }}>
              <Text style={{ ...TEXT.meta, color: colors.foregroundMuted, minWidth: 56 }}>{m.scopes[location.scope]}</Text>
              <Text style={{ ...TEXT.path, color: colors.foreground, flex: 1 }} selectable>
                {location.path}
              </Text>
            </View>
          ))}
          {rest.map((note, index) => (
            <Text key={index} style={{ ...TEXT.meta, color: colors.foregroundMuted }}>
              • {pick(note)}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
