import type {
  PluginButton,
  PluginButtonIconProps,
  PluginButtonRegistration,
  PluginClientContext,
} from "@getpaseo/plugin/client";
import { Icon, Modal as HostModal, useToast } from "@getpaseo/plugin/client/react-native";
import type { PluginTheme } from "@getpaseo/plugin";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  View,
  useWindowDimensions,
} from "react-native";
import type { Plan } from "../shared/commands.ts";
import {
  pillRectFromIcon,
  placePopover,
  visibleHeight,
  type Rect,
  type Size,
} from "../shared/popover-geometry.ts";
import type { AgentControl } from "../shared/rpc.ts";
import { MenuList, type PickerLeaf } from "./menu-list.tsx";

type PickerPlan = Extract<Plan, { kind: "picker" }>;
/** Applies a control and resolves to a message to show, if any. */
export type RunControl = (control: AgentControl, note?: string) => Promise<string | null>;

export interface PickerTarget {
  workspaceId: string;
  agentId: string;
}

interface PickerState {
  plan: PickerPlan;
  run: RunControl;
  open: boolean;
  close(): void;
}

/** Paseo's composer pill menu: above the pill, start-aligned, 12px away. */
const POPOVER = { offset: 12, minWidth: 280, maxWidth: 420, maxHeight: 440 } as const;
const ENTER_MS = 150;

const states = new Map<string, PickerState>();
const listeners = new Set<() => void>();

function setState(agentId: string, state: PickerState | null) {
  if (state) states.set(agentId, state);
  else states.delete(agentId);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function usePickerState(agentId: string): PickerState | undefined {
  return useSyncExternalStore(
    subscribe,
    () => states.get(agentId),
    () => states.get(agentId),
  );
}

function isDark(color: string): boolean {
  const hex = /^#([0-9a-f]{6})$/i.exec(color)?.[1];
  if (!hex) return true;
  const [r, g, b] = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0) < 0.5;
}

/** Paseo menu surface: surface1, outlined, 8px radius, the theme's medium shadow. */
function surfaceStyle(theme: PluginTheme) {
  const dark = isDark(theme.colors.surface0);
  return {
    position: "absolute" as const,
    minWidth: POPOVER.minWidth,
    maxWidth: POPOVER.maxWidth,
    backgroundColor: theme.colors.surface1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    overflow: "hidden" as const,
    shadowColor: dark ? "rgba(0, 0, 0, 0.20)" : "rgba(0, 0, 0, 0.04)",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: dark ? 8 : 16,
    elevation: dark ? 8 : 4,
  };
}

/** Selecting closes the picker first and reports the outcome as a toast, like Paseo's menus. */
function useChoose(state: PickerState) {
  const toast = useToast();
  return (entry: PickerLeaf) => {
    if (!entry.control) return;
    const { control, note } = entry;
    state.close();
    state.run(control, note).then(
      (message) => {
        if (message) toast.show(message, { variant: "warning" });
      },
      (error: unknown) => toast.error(error instanceof Error ? error.message : String(error)),
    );
  };
}

function PickerPopover({
  anchor,
  state,
  theme,
}: {
  anchor: RefObject<View | null>;
  state: PickerState;
  theme: PluginTheme;
}) {
  const choose = useChoose(state);
  const viewport = useWindowDimensions();
  const [trigger, setTrigger] = useState<Rect | null>(null);
  const [content, setContent] = useState<Size | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const surface = useMemo(() => surfaceStyle(theme), [theme]);

  useEffect(() => {
    if (!state.open) {
      setTrigger(null);
      return undefined;
    }
    // Android Modal content starts under a translucent status bar; measureInWindow does not.
    const statusBar = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
    let cancelled = false;
    anchor.current?.measureInWindow((x, y, width, height) => {
      if (!cancelled) setTrigger(pillRectFromIcon({ x, y: y + statusBar, width, height }));
    });
    return () => {
      cancelled = true;
    };
  }, [anchor, state.open, viewport.width, viewport.height]);

  const visible = content
    ? { width: content.width, height: visibleHeight(content.height, POPOVER.maxHeight, viewport.height) }
    : null;
  const position =
    trigger && visible
      ? placePopover({ trigger, content: visible, window: viewport, side: "top", offset: POPOVER.offset })
      : null;
  const placed = position !== null;

  useEffect(() => {
    if (!placed) {
      progress.setValue(0);
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: ENTER_MS,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [placed, progress]);

  return (
    <Modal
      transparent
      visible={state.open}
      animationType="none"
      statusBarTranslucent={Platform.OS === "android"}
      onRequestClose={state.close}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close menu"
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        onPress={state.close}
      />
      <Animated.View
        accessibilityRole="menu"
        style={[
          surface,
          {
            left: position?.x ?? -9999,
            top: position?.y ?? -9999,
            opacity: progress,
            transform: [
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
            ],
            transformOrigin: position?.placement === "bottom" ? "left top" : "left bottom",
          },
        ]}
      >
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator
          style={visible ? { height: visible.height } : null}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View
            collapsable={false}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              setContent((current) =>
                current && current.width === width && current.height === height
                  ? current
                  : { width, height },
              );
            }}
          >
            <MenuList
              items={state.plan.items}
              theme={theme}
              compact={false}
              autoFocus={placed}
              onChoose={choose}
              onClose={state.close}
            />
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function PickerSheet({ state, theme }: { state: PickerState; theme: PluginTheme }) {
  const choose = useChoose(state);
  return (
    <HostModal
      title={state.plan.title}
      open={state.open}
      onOpenChange={(open) => {
        if (!open) state.close();
      }}
    >
      <HostModal.Content contentContainerStyle={{ paddingHorizontal: 0, paddingTop: 0, gap: 0 }}>
        <MenuList
          items={state.plan.items}
          theme={theme}
          compact
          autoFocus={false}
          onChoose={choose}
          onClose={state.close}
        />
      </HostModal.Content>
    </HostModal>
  );
}

/**
 * The pill's icon hosts the picker. Slash commands cannot open host UI, but a mounted plugin
 * component can, so the picker opens as soon as the pill mounts: anchored above the pill on wide
 * layouts, as a sheet on compact ones.
 */
function PickerIcon(props: PluginButtonIconProps) {
  const { size, color, theme, layout } = props;
  const state = usePickerState(props.context === "agent" ? props.agentId : "");
  const anchor = useRef<View>(null);
  return (
    <>
      <View ref={anchor} collapsable={false}>
        <Icon name={state?.plan.icon ?? "ListChecks"} size={size} color={color} />
      </View>
      {state && layout.compact ? <PickerSheet state={state} theme={theme} /> : null}
      {state && !layout.compact ? (
        <PickerPopover anchor={anchor} state={state} theme={theme} />
      ) : null}
    </>
  );
}

/**
 * A picker is a temporary composer pill whose icon opens the menu right away. Closing or
 * choosing removes the pill; pressing the pill reopens it; the next picker replaces it.
 */
export function createPickerHost(client: PluginClientContext) {
  const pills = new Map<string, PluginButtonRegistration>();

  function remove(agentId: string) {
    pills.get(agentId)?.remove();
    pills.delete(agentId);
    setState(agentId, null);
  }

  function show(target: PickerTarget, plan: PickerPlan, run: RunControl) {
    const { agentId } = target;
    setState(agentId, { plan, run, open: true, close: () => remove(agentId) });
    const button: PluginButton = {
      title: plan.title,
      icon: PickerIcon,
      label: plan.title,
      behavior: {
        kind: "action",
        onPress() {
          const current = states.get(agentId);
          if (current) setState(agentId, { ...current, open: true });
        },
      },
    };
    const existing = pills.get(agentId);
    if (existing) existing.update(button);
    else pills.set(agentId, client.addComposerPill({ id: "picker", ...target, button }));
  }

  return {
    show,
    dispose() {
      for (const agentId of [...pills.keys()]) remove(agentId);
    },
  };
}

export type PickerHost = ReturnType<typeof createPickerHost>;
