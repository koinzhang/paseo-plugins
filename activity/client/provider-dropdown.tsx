import { Icon } from "@getpaseo/plugin/client/react-native";
import { useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { CONTROL, FONT_WEIGHT, ICON_SIZE, RADIUS, TEXT } from "./design-tokens.ts";

const MENU_MIN_WIDTH = 200;
const MENU_ROW_HEIGHT = 28;
/** Rows visible before the menu scrolls. */
const MENU_VISIBLE_ROWS = 10;

type Colors = {
  border: string;
  foreground: string;
  foregroundMuted: string;
  surface1: string;
  surface2: string;
};

/**
 * `Provider: All ▾` filter (069). Lists every option; the menu floats under the
 * trigger and a transparent backdrop closes it on outside press.
 */
export function ProviderDropdown({
  label,
  options,
  value,
  onChange,
  colors,
  triggerLabel,
  closeLabel,
}: {
  label: string;
  options: ReadonlyArray<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
  colors: Colors;
  triggerLabel: string;
  closeLabel: string;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.id === value) ?? options[0];

  return (
    <View style={{ position: "relative", zIndex: 20, alignSelf: "flex-start" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={triggerLabel}
        accessibilityState={{ expanded: open }}
        hitSlop={CONTROL.hitSlop}
        onPress={() => setOpen((prev) => !prev)}
        style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6 }}
      >
        <Text style={{ ...TEXT.body, color: colors.foregroundMuted }}>{label}:</Text>
        <Text style={{ ...TEXT.body, fontWeight: FONT_WEIGHT.semibold, color: colors.foreground }} numberOfLines={1}>
          {current?.label ?? ""}
        </Text>
        <Icon name="ChevronDown" size={ICON_SIZE.inline} color={colors.foregroundMuted} />
      </Pressable>

      {open ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
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
              left: 0,
              marginTop: 4,
              minWidth: MENU_MIN_WIDTH,
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
              style={{ maxHeight: MENU_VISIBLE_ROWS * MENU_ROW_HEIGHT + 8 }}
              contentContainerStyle={{ paddingVertical: 4 }}
            >
              {options.map((option) => {
                const selected = option.id === value;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                    style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      minHeight: MENU_ROW_HEIGHT,
                      gap: 8,
                      marginHorizontal: 4,
                      paddingHorizontal: 8,
                      borderRadius: RADIUS.control,
                      backgroundColor: pressed || hovered ? colors.surface2 : "transparent",
                    })}
                  >
                    <Text style={{ ...TEXT.menu, color: colors.foreground, flex: 1, minWidth: 0 }} numberOfLines={1}>
                      {option.label}
                    </Text>
                    {selected ? <Icon name="Check" size={ICON_SIZE.action} color={colors.foreground} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </>
      ) : null}
    </View>
  );
}
