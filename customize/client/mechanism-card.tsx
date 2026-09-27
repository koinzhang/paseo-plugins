import { Icon } from "@getpaseo/plugin/client/react-native";
import { useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import type { Mechanism } from "../shared/mechanisms.ts";
import type { AppLanguage, Messages } from "../shared/i18n.ts";
import { CONTROL, FONT_WEIGHT, ICON_SIZE, MENU, RADIUS, TEXT } from "./design-tokens.ts";
import type { Colors } from "./ui.tsx";

/** Inline entry with a dropdown for the provider/category loading details. */
export function MechanismCard({
  mechanism,
  language,
  colors,
  m,
  compact,
}: {
  mechanism: Mechanism;
  language: AppLanguage;
  colors: Colors;
  m: Messages;
  compact: boolean;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const pick = (text: { en: string; zh: string }) => (language === "zh-CN" ? text.zh : text.en);
  const title = mechanism.supported ? m.howItWorks : m.unsupported;
  const icon = mechanism.supported ? "Info" : "Ban";
  const [first, ...rest] = mechanism.notes;

  return (
    <View style={{ position: "relative", zIndex: open ? 40 : 1, flexShrink: 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        onPress={() => setOpen((prev) => !prev)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          height: CONTROL.searchHeight,
          paddingHorizontal: 10,
          borderRadius: RADIUS.control,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface1,
        }}
      >
        <Icon name={icon} size={ICON_SIZE.inline} color={colors.foregroundMuted} />
        <Text style={{ ...TEXT.small, fontWeight: FONT_WEIGHT.medium, color: colors.foreground }}>{title}</Text>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={ICON_SIZE.inline} color={colors.foregroundMuted} />
      </Pressable>
      {open ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={m.closeMenu}
            onPress={() => setOpen(false)}
            style={{
              position: (Platform.OS === "web" ? "fixed" : "absolute") as "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <View
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: 4,
              width: compact ? 280 : MENU.maxWidth,
              borderRadius: RADIUS.overlay,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface1,
              shadowColor: "rgba(0, 0, 0, 0.04)",
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: 16,
              elevation: 4,
            }}
          >
            <ScrollView
              style={{ maxHeight: MENU.visibleRows * MENU.rowHeight + 8 }}
              contentContainerStyle={{ padding: 12, gap: 12 }}
            >
              {first ? <Text style={{ ...TEXT.body, color: colors.foreground }}>{pick(first)}</Text> : null}
              {mechanism.locations.map((location, index) => (
                <View key={index} style={{ flexDirection: "row", gap: 8 }}>
                  <Text style={{ ...TEXT.meta, color: colors.foregroundMuted, minWidth: 56 }}>{m.scopes[location.scope]}</Text>
                  <Text style={{ ...TEXT.path, color: colors.foreground, flex: 1 }} selectable>
                    {location.path}
                  </Text>
                </View>
              ))}
              {rest.map((note, index) => (
                <Text key={index} style={{ ...TEXT.meta, color: colors.foreground }}>
                  • {pick(note)}
                </Text>
              ))}
            </ScrollView>
          </View>
        </>
      ) : null}
    </View>
  );
}
