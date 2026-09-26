import type { PluginTheme } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useEffect, useMemo, useRef, type ReactElement } from "react";
import { Pressable, Text, View } from "react-native";
import type { PickerEntry } from "../shared/commands.ts";

export type PickerLeaf = Exclude<PickerEntry, { items: PickerEntry[] }>;

/** Paseo menu row heights: a thumb on compact layouts, a pointer on wide ones. */
const ROW_HEIGHT = { compact: 40, wide: 28 } as const;
const LINE_HEIGHT = 18;

interface KeyEvent {
  key?: string;
  nativeEvent?: { key?: string };
  preventDefault?(): void;
  stopPropagation?(): void;
}

type PressState = { pressed: boolean; hovered?: boolean; focused?: boolean };

function createStyles(theme: PluginTheme, compact: boolean) {
  const { colors } = theme;
  return {
    page: { paddingVertical: 4 },
    label: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
    labelText: { fontSize: 12, color: colors.foregroundMuted },
    item: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      minHeight: compact ? ROW_HEIGHT.compact : ROW_HEIGHT.wide,
      gap: 8,
      marginHorizontal: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: "transparent",
      borderRadius: 6,
      outlineWidth: 0,
      outlineColor: "transparent",
    },
    itemFilled: { backgroundColor: colors.surface2 },
    itemDisabled: { opacity: 0.5 },
    content: { flexShrink: 1, minWidth: 0 },
    text: {
      fontSize: 14,
      lineHeight: LINE_HEIGHT,
      color: colors.foreground,
      fontWeight: "400" as const,
    },
    trailing: {
      marginLeft: "auto" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
  };
}

/**
 * One menu page, drawn with Paseo's menu row geometry. Groups render as a muted label above
 * their rows. With `autoFocus` the first enabled row takes focus and arrow keys move it.
 */
export function MenuList({
  items,
  theme,
  compact,
  autoFocus,
  onChoose,
  onClose,
}: {
  items: readonly PickerEntry[];
  theme: PluginTheme;
  compact: boolean;
  autoFocus: boolean;
  onChoose(entry: PickerLeaf): void;
  onClose(): void;
}): ReactElement {
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);
  const rowRefs = useRef(new Map<string, View | null>());
  const focusedKey = useRef<string | null>(null);

  const leaves = useMemo(() => {
    const rows: { key: string; entry: PickerLeaf }[] = [];
    for (const item of items) {
      if (!("items" in item)) rows.push({ key: item.id, entry: item });
      else for (const child of item.items) {
        if (!("items" in child)) rows.push({ key: `${item.id}/${child.id}`, entry: child });
      }
    }
    return rows;
  }, [items]);
  const enabled = useMemo(
    () => leaves.filter(({ entry }) => entry.disabled !== true && entry.control),
    [leaves],
  );

  useEffect(() => {
    if (!autoFocus) return undefined;
    const first = enabled[0];
    if (!first) return undefined;
    const frame = requestAnimationFrame(() => rowRefs.current.get(first.key)?.focus());
    return () => cancelAnimationFrame(frame);
  }, [autoFocus, enabled]);

  function onKeyDown(event: KeyEvent) {
    const key = event.key ?? event.nativeEvent?.key;
    if (key === "Escape") {
      event.preventDefault?.();
      event.stopPropagation?.();
      onClose();
      return;
    }
    if (enabled.length === 0) return;
    const current = enabled.findIndex((row) => row.key === focusedKey.current);
    let next: number | null = null;
    if (key === "ArrowDown") next = current < 0 ? 0 : (current + 1) % enabled.length;
    if (key === "ArrowUp") {
      next = current < 0 ? enabled.length - 1 : (current - 1 + enabled.length) % enabled.length;
    }
    if (key === "Home") next = 0;
    if (key === "End") next = enabled.length - 1;
    if (next !== null) {
      event.preventDefault?.();
      event.stopPropagation?.();
      const row = enabled[next];
      if (row) rowRefs.current.get(row.key)?.focus();
      return;
    }
    if ((key === "Enter" || key === " ") && current >= 0) {
      event.preventDefault?.();
      event.stopPropagation?.();
      const row = enabled[current];
      if (row) onChoose(row.entry);
    }
  }

  function renderRow(key: string, entry: PickerLeaf) {
    const disabled = entry.disabled === true || !entry.control;
    return (
      <Pressable
        key={key}
        ref={(node) => {
          rowRefs.current.set(key, node);
        }}
        accessibilityRole="menuitem"
        accessibilityState={{ disabled, checked: entry.current === true }}
        tabIndex={-1}
        disabled={disabled}
        onFocus={() => {
          focusedKey.current = key;
        }}
        onPress={() => onChoose(entry)}
        style={(state) => {
          const { pressed, hovered = false, focused = false } = state as PressState;
          return [
            styles.item,
            !disabled && (hovered || focused || pressed) ? styles.itemFilled : null,
            disabled ? styles.itemDisabled : null,
          ];
        }}
      >
        <View style={styles.content}>
          <Text numberOfLines={1} style={styles.text}>
            {entry.title}
          </Text>
        </View>
        {entry.current ? (
          <View style={styles.trailing}>
            <Icon name="Check" size={16} color={theme.colors.foregroundMuted} />
          </View>
        ) : null}
      </Pressable>
    );
  }

  return (
    <View style={styles.page} {...{ onKeyDown }}>
      {items.map((item) =>
        "items" in item ? (
          <View key={item.id}>
            <View style={styles.label}>
              <Text style={styles.labelText}>{item.title}</Text>
            </View>
            {item.items.map((child) =>
              "items" in child ? null : renderRow(`${item.id}/${child.id}`, child),
            )}
          </View>
        ) : (
          renderRow(item.id, item)
        ),
      )}
    </View>
  );
}
