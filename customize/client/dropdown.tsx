import { Icon } from "@getpaseo/plugin/client/react-native";
import { useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { CONTROL, FONT_WEIGHT, ICON_SIZE, MENU, RADIUS, TEXT } from "./design-tokens.ts";
import type { Colors } from "./ui.tsx";

export interface DropdownOption {
  id: string;
  label: string;
  hint?: string;
  badge?: string;
}

/**
 * `Label: Value ▾` trigger with a floating menu. A transparent backdrop
 * closes it on outside press.
 */
export function Dropdown({
  label,
  options,
  value,
  onChange,
  colors,
  triggerLabel,
  closeLabel,
  emptyLabel,
  menuAlign = "right",
  disabled = false,
}: {
  label: string;
  options: readonly DropdownOption[];
  value: string | null;
  onChange: (id: string) => void;
  colors: Colors;
  triggerLabel: string;
  closeLabel: string;
  emptyLabel?: string;
  menuAlign?: "left" | "right";
  disabled?: boolean;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.id === value);

  return (
    <View style={{ position: "relative", zIndex: open ? 40 : 20, flexShrink: 1, minWidth: 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={triggerLabel}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        hitSlop={CONTROL.hitSlop}
        onPress={() => setOpen((prev) => !prev)}
        style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, minWidth: 0 }}
      >
        <Text style={{ ...TEXT.body, color: colors.foregroundMuted }}>{label}:</Text>
        <Text style={{ ...TEXT.body, fontWeight: FONT_WEIGHT.semibold, color: colors.foreground, flexShrink: 1 }} numberOfLines={1}>
          {current?.label ?? emptyLabel ?? ""}
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
              ...(menuAlign === "left" ? { left: 0 } : { right: 0 }),
              marginTop: 4,
              minWidth: MENU.minWidth,
              maxWidth: MENU.maxWidth,
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
            <ScrollView style={{ maxHeight: MENU.visibleRows * MENU.rowHeight + 8 }} contentContainerStyle={{ paddingVertical: 4 }}>
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
                      minHeight: MENU.rowHeight,
                      gap: 8,
                      marginHorizontal: 4,
                      paddingHorizontal: 8,
                      paddingVertical: option.hint ? 4 : 0,
                      borderRadius: RADIUS.control,
                      backgroundColor: pressed || hovered ? colors.surface2 : "transparent",
                    })}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ ...TEXT.menu, color: colors.foreground }} numberOfLines={1}>
                        {option.label}
                      </Text>
                      {option.hint ? (
                        <Text style={{ ...TEXT.caption, color: colors.foregroundMuted }} numberOfLines={1}>
                          {option.hint}
                        </Text>
                      ) : null}
                    </View>
                    {option.badge ? <Text style={{ ...TEXT.caption, color: colors.foregroundMuted }}>{option.badge}</Text> : null}
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
