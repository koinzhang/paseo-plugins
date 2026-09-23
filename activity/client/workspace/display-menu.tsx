import { Icon } from "@getpaseo/plugin/client/react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View, type TextStyle, type ViewStyle } from "react-native";
import { type MenuOption } from "./constants.ts";
import { ICON_SIZE } from "../design-tokens.ts";

export type MenuStyles = {
  menuPage: ViewStyle;
  menuRow: ViewStyle;
  menuRowHighlighted: ViewStyle;
  menuLabel: TextStyle;
  menuValue: TextStyle;
  menuTrailing: ViewStyle;
  menuOption: ViewStyle;
  menuOptionLabel: TextStyle;
  menuLeadingSlot: ViewStyle;
  menuSurface: ViewStyle;
  menuRootWrap: ViewStyle;
  menuFlyout: ViewStyle;
  menuSeparator: ViewStyle;
};

export function MenuSubTrigger({
  label,
  value,
  active,
  onOpen,
  styles,
  chevronColor,
}: {
  label: string;
  value?: string;
  active: boolean;
  onOpen: () => void;
  styles: MenuStyles;
  chevronColor: string;
}): ReactNode {
  return (
    <View
      // Web: open flyout on hover like host MenuSubTrigger.
      {...({ onPointerEnter: onOpen } as object)}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: active }}
        onPress={onOpen}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.menuRow,
          active || pressed || hovered ? styles.menuRowHighlighted : null,
        ]}
      >
        <Text style={styles.menuLabel} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.menuTrailing}>
          {value ? (
            <Text style={styles.menuValue} numberOfLines={1}>
              {value}
            </Text>
          ) : null}
          <Icon name="ChevronRight" size={ICON_SIZE.inline} color={chevronColor} />
        </View>
      </Pressable>
    </View>
  );
}

export function MenuOptionList({
  options,
  selectedId,
  selectedIds,
  onSelect,
  styles,
  checkColor,
  iconColor,
}: {
  options: ReadonlyArray<MenuOption>;
  selectedId?: string;
  selectedIds?: ReadonlySet<string>;
  onSelect: (id: string) => void;
  styles: MenuStyles;
  checkColor: string;
  iconColor: string;
}): ReactNode {
  return (
    <View style={styles.menuPage}>
      {options.map((option) => {
        const selected =
          selectedIds != null ? selectedIds.has(option.id) : selectedId === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelect(option.id)}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.menuOption,
              pressed || hovered ? styles.menuRowHighlighted : null,
            ]}
          >
            <View style={styles.menuLeadingSlot}>
              <Icon name={option.icon} size={ICON_SIZE.inline} color={iconColor} />
            </View>
            <Text style={styles.menuOptionLabel} numberOfLines={1}>
              {option.label}
            </Text>
            {selected ? (
              <View style={styles.menuTrailing}>
                <Icon name="Check" size={ICON_SIZE.action} color={checkColor} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
