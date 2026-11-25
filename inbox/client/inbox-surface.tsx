import type { PluginTheme } from "@getpaseo/plugin";
import { type PluginSurfaceProps, useComposers, usePaseo, useRpc } from "@getpaseo/plugin/client";
import { copyText, Icon, Markdown, ScrollView, TextInput, useToast } from "@getpaseo/plugin/client/ui";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ComponentProps,
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Easing, PanResponder, Platform, Pressable, Text, View } from "react-native";
import {
  agentCandidates,
  agentStates,
  deleteItem,
  type Item,
  type ItemKind,
  type ItemSort,
  type AgentLive,
  type AgentState,
  listItems,
  saveNote,
  starAgent,
  tagItem,
  tagOptions,
  unarchiveAgent,
  updateItem,
} from "../shared/contracts.ts";
import { describeAgentStatus } from "../shared/agent-status.ts";
import { excerpt, type LastExchange } from "../shared/last-exchange.ts";
import { fetchLastExchange } from "./last-exchange.ts";
import { AgentIcon, PermissionBadge } from "./agent-status.tsx";
import { inboxListSort, visibleInboxFilters } from "../shared/filter-settings.ts";
import { itemTitle } from "../shared/item-title.ts";
import { formatItemTime, workspaceItemSubtitle } from "./item-subtitle.ts";
import { isEmptyNote, syncNoteText } from "../shared/note.ts";
import { insertNoteIntoComposer } from "./note-actions.ts";
import { KindFilterMenu, KindFilterMenuPanel } from "./kind-filter-menu.tsx";
import { toggleInboxKind, toggleInboxSelection } from "./kind-filter.ts";
import { noteFieldFocusBorder } from "./note-detail-styles.ts";
import { showsNoteRowActions } from "./note-row-actions.ts";
import {
  type DraftTags,
  onItemsChanged,
  onSelectionRequest,
  type SelectionRequest,
  takeSelection,
} from "./selection.ts";
import { useInboxFilters } from "./use-inbox-filters.ts";
import { trackHorizontalDrag } from "./web.ts";
import { shouldSelectFirstItem } from "./default-selection.ts";

/**
 * `id` is the open item; `draft` is non-null for an unsaved note.
 * `session` keys the editor so it survives a draft turning into a saved note.
 */
interface Selection {
  id: string | null;
  draft: DraftTags | null;
  session: number;
  fromDraft?: boolean;
}

let sessionCounter = 0;
const nextSession = () => ++sessionCounter;

function toSelection(request: SelectionRequest | null): Selection | null {
  if (!request) return null;
  if ("itemId" in request) return { id: request.itemId, draft: null, session: nextSession() };
  return { id: null, draft: request.draft, session: nextSession() };
}

/** Project keys and workspace ids no longer active on the host. */
interface Archived {
  projects: ReadonlySet<string>;
  workspaces: ReadonlySet<string>;
}

const LIST_KEY = ["inbox", "items"] as const;
const STATES_KEY = ["inbox", "agent-states"] as const;
const CANDIDATES_KEY = ["inbox", "agent-candidates"] as const;
const TAG_OPTIONS_KEY = ["inbox", "tag-options"] as const;
const SAVE_DELAY_MS = 600;
type NoteComposer = Parameters<typeof insertNoteIntoComposer>[0];

/** Tapping the sort button steps through these in order. */
const SORTS: Array<{ id: ItemSort; label: string; icon: string }> = [
  { id: "updated", label: "Updated", icon: "ClockArrowDown" },
  { id: "starred", label: "Starred", icon: "Star" },
  { id: "created", label: "Created", icon: "CalendarPlus" },
  { id: "name", label: "Name", icon: "ArrowDownAZ" },
];

const LIST_WIDTH = { initial: 360, min: 280, max: 640 };
const SEARCH_ANIM_MS = 220;
const SEARCH_CLOSE_ANIM_MS = 160;
const TOOLBAR_HEIGHT = 24;
const clampListWidth = (width: number) => Math.min(LIST_WIDTH.max, Math.max(LIST_WIDTH.min, width));
/** Keeps the dragged width while the app runs, across surface remounts. */
let rememberedListWidth = LIST_WIDTH.initial;

/** The workspace an Explorer panel is scoped to. */
export interface InboxWorkspace {
  id: string;
  directory: string;
}

type Styles = ReturnType<typeof createStyles>;

const noOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {};
const resizeCursor = Platform.OS === "web" ? ({ cursor: "col-resize" } as object) : {};

/** Swaps the accent focus ring for a muted border on bordered inputs. */
function Field({ styles, style, ...props }: ComponentProps<typeof TextInput> & { styles: Styles }) {
  const [focused, setFocused] = useState(false);
  const borderless = style === styles.noteTitleInput || style === styles.editor;
  return (
    <TextInput
      placeholderTextColor={styles.placeholderColor}
      {...props}
      style={[style, noteFieldFocusBorder({ borderless, focused }) ? styles.inputFocused : null]}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
    />
  );
}

function createStyles(theme: PluginTheme, compact: boolean, workspace: boolean) {
  const c = theme.colors;
  return {
    screen: { flex: 1, backgroundColor: workspace ? "transparent" : c.surface0, flexDirection: "row" as const },
    listPane: { overflow: "hidden" as const },
    listChrome: { position: "relative" as const },
    filterMenuBackdrop: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 30,
    },
    filterMenuPosition: {
      position: "absolute" as const,
      zIndex: 31,
      overflow: "visible" as const,
    },
    divider: {
      width: 9,
      marginHorizontal: -4,
      zIndex: 1,
      alignItems: "center" as const,
      ...resizeCursor,
    },
    dividerLine: { width: 1, flex: 1, backgroundColor: c.border },
    detailPane: { flex: 1, padding: compact ? 16 : 24, gap: 12 },
    toolbar: { padding: compact ? 12 : 16, gap: 10, overflow: "visible" as const },
    row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
    toolbarRow: { flexDirection: "row" as const, alignItems: "center" as const, height: TOOLBAR_HEIGHT },
    toolbarSearchSlot: {
      flex: 1,
      minWidth: 0,
      height: TOOLBAR_HEIGHT,
      flexDirection: "row" as const,
      justifyContent: "flex-end" as const,
      overflow: "hidden" as const,
    },
    toolbarSearchField: {
      height: TOOLBAR_HEIGHT,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: TOOLBAR_HEIGHT / 2,
      backgroundColor: c.surface1,
      overflow: "hidden" as const,
    },
    toolbarSearchInput: {
      flex: 1,
      minWidth: 0,
      height: TOOLBAR_HEIGHT - 2,
      padding: 0,
      margin: 0,
      color: c.foreground,
      fontSize: 12,
      lineHeight: 18,
      ...noOutline,
    },
    toolbarActions: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 2,
      flexShrink: 0,
      marginLeft: 2,
    },
    itemRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, position: "relative" as const },
    itemActions: { flexDirection: "row" as const, alignItems: "center" as const, flexShrink: 0 },
    itemActionsOverlay: { position: "absolute" as const, right: 0, top: 0, bottom: 0 },
    detailMeta: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "flex-end" as const, gap: 8 },
    detailTags: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, flex: 1, minWidth: 0 },
    itemActionDivider: { width: 1, height: 16, marginHorizontal: 3, backgroundColor: c.border },
    wrap: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 6 },
    input: {
      color: c.foreground,
      backgroundColor: c.surface1,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 14,
      ...noOutline,
    },
    inputFocused: { borderColor: c.foregroundMuted },
    placeholderColor: c.foregroundMuted,
    noteEditor: { flex: 1, gap: 10 },
    noteFields: { flex: 1, backgroundColor: "transparent" },
    noteTitleInput: {
      color: c.foreground,
      backgroundColor: "transparent",
      borderWidth: 0,
      paddingHorizontal: 0,
      paddingTop: 8,
      paddingBottom: 12,
      fontSize: 14,
      ...noOutline,
    },
    noteFieldDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
    chip: (active: boolean) => ({
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      minWidth: 0,
      flexShrink: 1,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: active ? c.accent : c.border,
      backgroundColor: active ? c.accent : "transparent",
    }),
    chipText: (active: boolean) => ({
      color: active ? c.accentForeground : c.foregroundMuted,
      fontSize: 12,
      flexShrink: 1,
      minWidth: 0,
    }),
    item: (selected: boolean) => ({
      paddingHorizontal: compact ? 12 : 16,
      paddingVertical: 10,
      gap: 4,
      backgroundColor: selected ? c.surface2 : "transparent",
    }),
    itemDivider: { height: 1, marginHorizontal: compact ? 12 : 16, backgroundColor: c.border },
    itemTitle: { color: c.foreground, fontSize: 14, flex: 1, minWidth: 0 },
    muted: { color: c.foregroundMuted, fontSize: 12 },
    struck: { textDecorationLine: "line-through" as const },
    badge: (tone: "warning" | "danger" | "success") => ({
      color:
        tone === "warning" ? c.statusWarning : tone === "danger" ? c.statusDanger : c.statusSuccess,
      fontSize: 11,
    }),
    heading: { color: c.foreground, fontSize: compact ? 18 : 20, fontWeight: "600" as const },
    body: { color: c.foreground, fontSize: 14 },
    editor: {
      flex: 1,
      minHeight: 200,
      color: c.foreground,
      backgroundColor: "transparent",
      borderWidth: 0,
      paddingHorizontal: 0,
      paddingVertical: 12,
      fontSize: 14,
      textAlignVertical: "top" as const,
      ...noOutline,
    },
    button: (kind: "primary" | "plain" | "danger") => ({
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: kind === "primary" ? 0 : 1,
      borderColor: kind === "danger" ? c.statusDanger : c.border,
      backgroundColor: kind === "primary" ? c.accent : "transparent",
    }),
    iconButton: { paddingHorizontal: 8, paddingVertical: 8 },
    toolbarIconButton: (active: boolean) => ({
      width: TOOLBAR_HEIGHT,
      height: TOOLBAR_HEIGHT,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderRadius: 6,
      backgroundColor: active ? c.surface2 : "transparent",
      flexShrink: 0,
    }),
    rowIconButton: (pressed: boolean) => ({
      width: 28,
      height: 28,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderRadius: 6,
      backgroundColor: pressed ? c.surface2 : "transparent",
      flexShrink: 0,
    }),
    buttonText: (kind: "primary" | "plain" | "danger") => ({
      color:
        kind === "primary" ? c.accentForeground : kind === "danger" ? c.statusDanger : c.foreground,
      fontSize: 13,
    }),
    empty: { padding: 24, alignItems: "center" as const, gap: 8 },
  };
}

function ToolbarIconButton({
  styles,
  theme,
  icon,
  accessibilityLabel,
  onPress,
  active = false,
}: {
  styles: Styles;
  theme: PluginTheme;
  icon?: string;
  accessibilityLabel: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={Platform.OS === "web" ? accessibilityLabel : undefined}
      accessibilityState={{ expanded: active }}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => styles.toolbarIconButton(active || pressed)}
    >
      {icon ? <Icon name={icon} size={16} color={theme.colors.foregroundMuted} /> : null}
    </Pressable>
  );
}

function RowIconButton({
  styles,
  theme,
  icon,
  accessibilityLabel,
  onPress,
  disabled,
  color,
}: {
  styles: Styles;
  theme: PluginTheme;
  icon: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={Platform.OS === "web" ? accessibilityLabel : undefined}
      hitSlop={8}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.rowIconButton(pressed), disabled ? { opacity: 0.45 } : null]}
    >
      <Icon name={icon} size={14} color={color ?? theme.colors.foregroundMuted} />
    </Pressable>
  );
}

function useNoteActions(body: string, composer: NoteComposer | undefined) {
  const toast = useToast();
  const [copying, setCopying] = useState(false);
  const [sending, setSending] = useState(false);
  const copy = async () => {
    setCopying(true);
    try {
      await copyText(body);
      toast.show("Copied", { variant: "success" });
    } catch (error) {
      toast.error(`Could not copy: ${errorText(error)}`);
    } finally {
      setCopying(false);
    }
  };
  const send = async () => {
    if (!composer) return;
    setSending(true);
    try {
      await insertNoteIntoComposer(composer, body);
      toast.show("Inserted into the current agent's composer", { variant: "success" });
    } catch (error) {
      toast.error(`Could not insert note: ${errorText(error)}`);
    } finally {
      setSending(false);
    }
  };
  return {
    copy: () => void copy(),
    send: () => void send(),
    copying,
    sending,
    canSend: Boolean(composer),
  };
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function Button({
  styles,
  theme,
  kind = "plain",
  icon,
  label,
  accessibilityLabel,
  onPress,
  disabled,
}: {
  styles: Styles;
  theme: PluginTheme;
  kind?: "primary" | "plain" | "danger";
  icon?: string;
  label?: string;
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const color =
    kind === "primary"
      ? theme.colors.accentForeground
      : kind === "danger"
        ? theme.colors.statusDanger
        : theme.colors.foreground;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button(kind), label ? null : styles.iconButton, disabled ? { opacity: 0.5 } : null]}
    >
      {icon ? <Icon name={icon} size={14} color={color} /> : null}
      {label ? <Text style={styles.buttonText(kind)}>{label}</Text> : null}
    </Pressable>
  );
}

function DetailActionGroup({
  entries,
  styles,
  theme,
}: {
  entries: Array<{
    key: string;
    icon: string;
    label: string;
    onPress: () => void;
    disabled?: boolean;
    color?: string;
  }>;
  styles: Styles;
  theme: PluginTheme;
}) {
  return (
    <View style={styles.itemActions}>
      {entries.map((entry, index) => (
        <Fragment key={entry.key}>
          {index ? <View style={styles.itemActionDivider} /> : null}
          <RowIconButton
            styles={styles}
            theme={theme}
            icon={entry.icon}
            accessibilityLabel={entry.label}
            disabled={entry.disabled}
            onPress={entry.onPress}
            color={entry.color}
          />
        </Fragment>
      ))}
    </View>
  );
}

const KIND_ICON: Record<ItemKind, string> = { agent: "Bot", note: "FileText" };

function useAgentRestore(item: Item) {
  const unarchive = useRpc(unarchiveAgent);
  const queryClient = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: () => unarchive({ agentId: item.agentId! }),
    onSuccess: ({ restoredWorkspace }) => {
      toast.show(restoredWorkspace ? "Workspace and agent restored" : "Agent unarchived", { variant: "success" });
      void queryClient.invalidateQueries({ queryKey: STATES_KEY });
    },
    onError: (error) => toast.error(errorText(error)),
  });
  return {
    pending: mutation.isPending,
    restore: () => mutation.mutate(),
  };
}

function ItemActions({
  item,
  state,
  composer,
  selected,
  visible,
  navigation,
  styles,
  theme,
  onDeleted,
  onBusyChange,
  containerStyle,
  onWidthChange,
}: {
  item: Item;
  state: AgentState | undefined;
  composer: NoteComposer | undefined;
  selected: boolean;
  visible: boolean;
  navigation: PluginSurfaceProps["navigation"];
  styles: Styles;
  theme: PluginTheme;
  onDeleted: () => void;
  onBusyChange: (busy: boolean) => void;
  containerStyle?: object;
  onWidthChange?: (width: number) => void;
}) {
  const update = useRpc(updateItem);
  const remove = useRpc(deleteItem);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pinning, setPinning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const noteActions = useNoteActions(item.body, composer);
  const restore = useAgentRestore(item);
  const canOpen = item.kind === "agent" && state === "active" && Boolean(navigation && item.agentId);
  const busy = pinning || deleting || restore.pending || noteActions.copying || noteActions.sending;
  useEffect(() => onBusyChange(busy), [busy, onBusyChange]);
  const run = async (kind: "pin" | "delete") => {
    const setBusy = kind === "pin" ? setPinning : setDeleting;
    setBusy(true);
    try {
      if (kind === "pin") await update({ id: item.id, pinned: !item.pinned });
      else await remove({ id: item.id });
      if (kind === "delete" && selected) onDeleted();
      await queryClient.invalidateQueries({ queryKey: ["inbox"] });
    } catch (error) {
      toast.error(errorText(error));
      await queryClient.invalidateQueries({ queryKey: ["inbox"] });
    } finally {
      setBusy(false);
    }
  };
  const actions = item.kind === "agent"
    ? [
        state === "archived" ? {
          key: "unarchive",
          icon: "ArchiveRestore",
          label: restore.pending ? "Unarchiving" : "Unarchive",
          disabled: restore.pending,
          onPress: restore.restore,
        } : {
          key: "open",
          icon: "SquareArrowOutUpRight",
          label: canOpen ? "Open agent" : "Agent unavailable to open",
          disabled: !canOpen,
          onPress: () => {
            if (canOpen) navigation!.openAgent({ agentId: item.agentId! });
          },
        },
        {
          key: "pin",
          icon: item.pinned ? "PinOff" : "Pin",
          label: item.pinned ? "Unpin" : "Pin",
          disabled: pinning,
          onPress: () => void run("pin"),
        },
        {
          key: "delete",
          icon: "StarOff",
          label: "Remove from Inbox",
          disabled: deleting,
          color: theme.colors.statusDanger,
          onPress: () => void run("delete"),
        },
      ]
    : [
        {
          key: "pin",
          icon: item.pinned ? "PinOff" : "Pin",
          label: item.pinned ? "Unpin" : "Pin",
          disabled: pinning,
          onPress: () => void run("pin"),
        },
        {
          key: "copy",
          icon: "Copy",
          label: "Copy note",
          disabled: noteActions.copying,
          onPress: noteActions.copy,
        },
        {
          key: "send",
          icon: "Send",
          label: composer ? "Send note to current agent" : "No current agent available",
          disabled: !composer || noteActions.sending,
          onPress: noteActions.send,
        },
        {
          key: "delete",
          icon: "Trash2",
          label: "Delete",
          disabled: deleting,
          color: theme.colors.statusDanger,
          onPress: () => void run("delete"),
        },
      ];
  return (
    <View
      style={[styles.itemActions, containerStyle, { opacity: visible || busy ? 1 : 0 }]}
      pointerEvents={visible || busy ? "auto" : "none"}
      onLayout={onWidthChange ? (event) => onWidthChange(event.nativeEvent.layout.width) : undefined}
    >
      {actions.map((action, index) => (
        <Fragment key={action.key}>
          {index ? <View style={styles.itemActionDivider} /> : null}
          <RowIconButton
            styles={styles}
            theme={theme}
            icon={action.icon}
            accessibilityLabel={action.label}
            disabled={action.disabled}
            color={"color" in action ? action.color : undefined}
            onPress={action.onPress}
          />
        </Fragment>
      ))}
    </View>
  );
}

/** Project and workspace tags of an item; archived ones are marked. */
function itemTags(item: Item, archived: Archived): Array<{ label: string; archived: boolean }> {
  const tags: Array<{ label: string; archived: boolean }> = [];
  if (item.projectKey) {
    tags.push({ label: item.projectLabel ?? item.projectKey, archived: archived.projects.has(item.projectKey) });
  }
  if (item.workspaceId) {
    tags.push({ label: item.workspaceLabel ?? item.workspaceId, archived: archived.workspaces.has(item.workspaceId) });
  }
  return tags;
}

function ItemRow({
  item,
  selected,
  state,
  live,
  agentUpdatedAt,
  archived,
  hideWorkspaceId,
  composer,
  navigation,
  styles,
  theme,
  onPress,
  onDeleted,
}: {
  item: Item;
  selected: boolean;
  state: AgentState | undefined;
  live: AgentLive | undefined;
  agentUpdatedAt: string | null | undefined;
  archived: Archived;
  /** The panel's own workspace, left out of the subtitle. */
  hideWorkspaceId: string | null;
  composer: NoteComposer | undefined;
  navigation: PluginSurfaceProps["navigation"];
  styles: Styles;
  theme: PluginTheme;
  onPress: () => void;
  onDeleted: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [busy, setBusy] = useState(false);
  const reportBusy = useCallback((pending: boolean) => setBusy(pending), []);
  const [actionsWidth, setActionsWidth] = useState(0);
  const overlayActions = Platform.OS === "web";
  const showActions = showsNoteRowActions({
    web: Platform.OS === "web",
    hovered,
    busy,
  });
  const agentState = state;
  const status = item.kind === "agent" ? describeAgentStatus(agentState, live) : null;
  const tags = itemTags(
    hideWorkspaceId && item.workspaceId === hideWorkspaceId ? { ...item, workspaceId: null } : item,
    archived,
  );
  const subtitle = hideWorkspaceId ? workspaceItemSubtitle(item, agentUpdatedAt) : [
    ...tags,
    ...[item.kind === "agent" ? item.agentSnapshot?.provider : null, formatItemTime(item.updatedAt)]
      .filter((label): label is string => Boolean(label))
      .map((label) => ({ label, archived: false })),
  ];
  return (
    <View
      {...({
        onPointerEnter: () => setHovered(true),
        onPointerLeave: () => setHovered(false),
      } as object)}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={status ? `${itemTitle(item)}, ${status.label}` : itemTitle(item)}
        onPress={onPress}
        style={styles.item(selected)}
      >
        <View style={styles.itemRow}>
          {item.kind === "agent" ? (
            <AgentIcon state={agentState} live={live} size={14} theme={theme} />
          ) : (
            <Icon name={KIND_ICON[item.kind]} size={14} color={theme.colors.foregroundMuted} />
          )}
          <Text
            style={[styles.itemTitle, overlayActions ? { paddingRight: showActions ? actionsWidth + 8 : 0 } : null]}
            numberOfLines={1}
          >
            {itemTitle(item)}
          </Text>
          {item.kind === "agent" ? <PermissionBadge state={agentState} live={live} theme={theme} /> : null}
          <ItemActions
            item={item}
            state={agentState}
            composer={composer}
            selected={selected}
            visible={showActions}
            navigation={navigation}
            styles={styles}
            theme={theme}
            onDeleted={onDeleted}
            onBusyChange={reportBusy}
            containerStyle={overlayActions ? styles.itemActionsOverlay : undefined}
            onWidthChange={overlayActions ? setActionsWidth : undefined}
          />
        </View>
        <Text style={styles.muted} numberOfLines={1}>
          {subtitle.map((part, index) => (
            <Fragment key={index}>
              {index ? " · " : ""}
              <Text style={part.archived ? styles.struck : null}>{part.label}</Text>
            </Fragment>
          ))}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Autosaving editor for notes. A draft (`item` null) is created on the
 * first non-empty save; a note that is empty when the editor closes is deleted.
 */
function NoteEditor({
  item,
  draft,
  title,
  body,
  onTitleChange,
  onBodyChange,
  styles,
  onCreated,
}: {
  item: Item | null;
  draft: DraftTags;
  title: string;
  body: string;
  onTitleChange: (title: string) => void;
  onBodyChange: (body: string) => void;
  styles: Styles;
  onCreated: (id: string) => void;
}) {
  const save = useRpc(saveNote);
  const remove = useRpc(deleteItem);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const idRef = useRef(item?.id ?? null);
  const saved = useRef({ title: item?.title ?? "", body: item?.body ?? "" });
  const latest = useRef({ title, body });
  latest.current = { title, body };
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const onCreatedRef = useRef(onCreated);
  onCreatedRef.current = onCreated;

  useEffect(() => {
    if (!item || item.id !== idRef.current) return;
    const next = syncNoteText(latest.current, saved.current, { title: item.title ?? "", body: item.body });
    if (!next) return;
    saved.current = next;
    latest.current = next;
    onTitleChange(next.title);
    onBodyChange(next.body);
  }, [item?.id, item?.title, item?.body]);

  /** Serialized so a draft is created once even when saves overlap. */
  const persist = (final: boolean) => {
    queue.current = queue.current.then(async () => {
      const { title: t, body: b } = latest.current;
      const empty = isEmptyNote(t, b);
      if (empty) {
        if (!final || !idRef.current) return;
        await remove({ id: idRef.current });
        idRef.current = null;
      } else {
        if (t === saved.current.title && b === saved.current.body && idRef.current) return;
        const { item: next } = await save({
          ...(idRef.current ? { id: idRef.current } : draft),
          title: t.trim() ? t : null,
          body: b,
        });
        saved.current = { title: t, body: b };
        if (!idRef.current) {
          idRef.current = next.id;
          if (!final) onCreatedRef.current(next.id);
        }
      }
      await queryClient.invalidateQueries({ queryKey: LIST_KEY });
    });
    return queue.current;
  };

  useEffect(() => {
    const dirty = title !== saved.current.title || body !== saved.current.body;
    if (!dirty || isEmptyNote(title, body)) return;
    setStatus("saving");
    const timer = setTimeout(() => {
      persist(false)
        .then(() => {
          setError(null);
          setStatus("saved");
        })
        .catch((e: unknown) => setError(errorText(e)));
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [title, body]);

  // Leaving the editor flushes pending text, or drops the note if it ended up empty.
  useEffect(() => () => void persist(true).catch(() => {}), []);

  const empty = isEmptyNote(title, body);
  const statusText = error
    ? error
    : empty
      ? idRef.current
        ? "Empty — this note will be removed when you leave"
        : "Not saved until it has a title or text"
      : status === "saving"
        ? "Saving…"
        : "Saved";

  return (
    <View style={styles.noteEditor}>
      <View style={styles.noteFields}>
        <Field
          styles={styles}
          style={styles.noteTitleInput}
          value={title}
          onChangeText={onTitleChange}
          placeholder="Title (optional)"
          accessibilityLabel="Title"
        />
        <View style={styles.noteFieldDivider} />
        <Field
          styles={styles}
          style={styles.editor}
          value={body}
          onChangeText={onBodyChange}
          placeholder="Write something…"
          accessibilityLabel="Note body"
          multiline
          autoFocus={!item}
        />
      </View>
      <Text style={error ? styles.badge("danger") : styles.muted}>{statusText}</Text>
    </View>
  );
}

const EXCHANGE_KEY = ["inbox", "last-exchange"] as const;

function ExchangeBlock({
  label,
  text,
  styles,
  markdown = false,
}: {
  label: string;
  text: string | null;
  styles: Styles;
  markdown?: boolean;
}) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={styles.muted}>{label}</Text>
      {text && markdown ? (
        <Markdown>{excerpt(text)}</Markdown>
      ) : text ? (
        <Text style={styles.body} selectable>
          {excerpt(text)}
        </Text>
      ) : (
        <Text style={styles.muted}>None yet</Text>
      )}
    </View>
  );
}

/** Latest user prompt and agent reply. Skipped when the agent is gone from the host. */
function AgentExchange({
  agentId,
  enabled,
  styles,
}: {
  agentId: string;
  enabled: boolean;
  styles: Styles;
}) {
  const paseo = usePaseo();
  const query = useQuery({
    queryKey: [...EXCHANGE_KEY, agentId],
    queryFn: () => fetchLastExchange(paseo, agentId),
    enabled,
    refetchInterval: enabled ? 10_000 : false,
    retry: false,
  });
  useEffect(() => {
    if (!query.isError) return;
    console.warn("[inbox] latest exchange failed", agentId, query.error);
  }, [agentId, query.isError, query.error]);

  if (!enabled) return null;
  if (query.isPending) return <Text style={styles.muted}>Loading messages…</Text>;
  if (query.isError) return <Text style={styles.muted}>Couldn't load the latest messages.</Text>;
  const exchange: LastExchange = query.data ?? { prompt: null, agent: null };
  return (
    <View style={{ gap: 12 }}>
      <ExchangeBlock label="Prompt" text={exchange.prompt} styles={styles} />
      <ExchangeBlock label="Agent" text={exchange.agent} styles={styles} markdown />
    </View>
  );
}

/** Open, or Unarchive once archived; sits in the Pin / Remove row. */
function AgentDetailActions({
  item,
  state,
  styles,
  theme,
  navigation,
  onPin,
  onDelete,
}: {
  item: Item;
  state: AgentState | undefined;
  styles: Styles;
  theme: PluginTheme;
  navigation: PluginSurfaceProps["navigation"];
  onPin: () => void;
  onDelete: () => void;
}) {
  const restore = useAgentRestore(item);
  const canOpen = state === "active" && Boolean(navigation && item.agentId);
  const entries = [
    state === "archived" ? {
      key: "unarchive",
      icon: "ArchiveRestore",
      label: restore.pending ? "Unarchiving" : "Unarchive",
      disabled: restore.pending,
      onPress: restore.restore,
    } : {
      key: "open",
      icon: "SquareArrowOutUpRight",
      label: canOpen ? "Open agent" : "Agent unavailable to open",
      disabled: !canOpen,
      onPress: () => {
        if (canOpen) navigation!.openAgent({ agentId: item.agentId! });
      },
    },
    {
      key: "pin",
      icon: item.pinned ? "PinOff" : "Pin",
      label: item.pinned ? "Unpin" : "Pin",
      onPress: onPin,
    },
    {
      key: "delete",
      icon: "StarOff",
      label: "Remove from Inbox",
      color: theme.colors.statusDanger,
      onPress: onDelete,
    },
  ];
  return <DetailActionGroup entries={entries} styles={styles} theme={theme} />;
}

function AgentDetail({
  item,
  state,
  live,
  styles,
}: {
  item: Item;
  state: AgentState | undefined;
  live: AgentLive | undefined;
  styles: Styles;
}) {
  const agentState = state;
  const snapshot = item.agentSnapshot;
  const facts = [
    ["Status", describeAgentStatus(agentState, live)?.label],
    ["Provider", [snapshot?.provider, snapshot?.model].filter(Boolean).join(" / ")],
    ["Directory", snapshot?.cwd],
    ["Starred", new Date(item.createdAt).toLocaleString()],
  ] as const;

  return (
    <View style={{ gap: 12 }}>
      {facts.map(([label, value]) =>
        value ? (
          <View key={label} style={{ gap: 2 }}>
            <Text style={styles.muted}>{label}</Text>
            <Text style={styles.body} selectable>
              {value}
            </Text>
          </View>
        ) : null,
      )}
      {item.agentId ? (
        <AgentExchange agentId={item.agentId} enabled={agentState !== "missing"} styles={styles} />
      ) : null}
      {agentState === "missing" ? (
        <Text style={styles.muted}>
          This agent no longer exists on this host. You can remove it from the Inbox.
        </Text>
      ) : null}
    </View>
  );
}

function TagOption({
  label,
  detail,
  selected,
  disabled,
  styles,
  theme,
  onPress,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  disabled: boolean;
  styles: Styles;
  theme: PluginTheme;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.row, { paddingVertical: 6 }, disabled ? { opacity: 0.4 } : null]}
    >
      <Icon name="Check" size={14} color={selected ? theme.colors.accent : "transparent"} />
      <Text style={styles.itemTitle} numberOfLines={1}>
        {label}
      </Text>
      {detail ? <Text style={styles.muted}>{detail}</Text> : null}
    </Pressable>
  );
}

/**
 * Project and workspace tags. Notes can change them; a workspace
 * must sit in the tagged project, so other projects are off while one is set.
 * A starred agent's tags follow the agent and are read-only.
 */
function TagEditor({
  item,
  archived,
  styles,
  theme,
  actions,
}: {
  item: Item;
  archived: Archived;
  styles: Styles;
  theme: PluginTheme;
  actions: ReactNode;
}) {
  const options = useRpc(tagOptions);
  const tag = useRpc(tagItem);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState<"project" | "workspace" | null>(null);
  const editable = item.kind !== "agent";
  const optionsQuery = useQuery({
    queryKey: TAG_OPTIONS_KEY,
    queryFn: () => options({}),
    enabled: editable,
  });
  const mutation = useMutation({
    mutationFn: (next: { projectKey: string | null; workspaceId: string | null }) =>
      tag({ id: item.id, ...next }),
    onSuccess: () => {
      setOpen(null);
      void queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
    onError: (error) => toast.error(errorText(error)),
  });
  const choose = (next: { projectKey: string | null; workspaceId: string | null }) => {
    if (next.projectKey === item.projectKey && next.workspaceId === item.workspaceId) setOpen(null);
    else mutation.mutate(next);
  };

  const projectArchived = Boolean(item.projectKey && archived.projects.has(item.projectKey));
  const workspaceArchived = Boolean(item.workspaceId && archived.workspaces.has(item.workspaceId));
  const chip = (kind: "project" | "workspace") => {
    const isProject = kind === "project";
    const value = isProject
      ? item.projectKey && (item.projectLabel ?? item.projectKey)
      : item.workspaceId && (item.workspaceLabel ?? item.workspaceId);
    const struck = isProject ? projectArchived : workspaceArchived;
    const active = open === kind;
    const label = value || (isProject ? "No project" : "No workspace");
    const content = (
      <>
        <Icon
          name={isProject ? "Folder" : "PanelsTopLeft"}
          size={12}
          color={active ? theme.colors.accentForeground : theme.colors.foregroundMuted}
        />
        <Text style={[styles.chipText(active), struck ? styles.struck : null]} numberOfLines={1}>
          {label}
          {struck ? " (archived)" : ""}
        </Text>
      </>
    );
    if (!editable) {
      return value ? <View style={styles.chip(false)}>{content}</View> : null;
    }
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${isProject ? "Project" : "Workspace"}: ${label}`}
        onPress={() => setOpen(active ? null : kind)}
        style={styles.chip(active)}
      >
        {content}
      </Pressable>
    );
  };

  const projectChip = chip("project");
  const workspaceChip = chip("workspace");
  if (!projectChip && !workspaceChip) return null;

  const data = optionsQuery.data;
  const projectLabels = new Map(data?.projects.map((project) => [project.key, project.label]));
  const workspaces = data?.workspaces.filter((entry) => !item.projectKey || entry.projectKey === item.projectKey);
  const busy = mutation.isPending;

  return (
    <View style={{ gap: 6 }}>
      <View style={styles.detailMeta}>
        <View style={styles.detailTags}>
          {projectChip}
          {workspaceChip}
        </View>
        {actions}
      </View>
      {open && optionsQuery.isPending ? <Text style={styles.muted}>Loading…</Text> : null}
      {open && optionsQuery.isError ? (
        <Text style={styles.badge("danger")}>{errorText(optionsQuery.error)}</Text>
      ) : null}
      {open === "project" && data ? (
        <View style={{ gap: 2 }}>
          {item.workspaceId ? (
            <Text style={styles.muted}>Clear the workspace tag to pick another project.</Text>
          ) : null}
          <TagOption
            label="No project"
            selected={!item.projectKey}
            disabled={busy || Boolean(item.workspaceId)}
            styles={styles}
            theme={theme}
            onPress={() => choose({ projectKey: null, workspaceId: null })}
          />
          {data.projects.map((project) => (
            <TagOption
              key={project.key}
              label={project.label}
              selected={item.projectKey === project.key}
              disabled={busy || Boolean(item.workspaceId && item.projectKey !== project.key)}
              styles={styles}
              theme={theme}
              onPress={() => choose({ projectKey: project.key, workspaceId: item.workspaceId })}
            />
          ))}
        </View>
      ) : null}
      {open === "workspace" && data && workspaces ? (
        <View style={{ gap: 2 }}>
          <TagOption
            label="No workspace"
            selected={!item.workspaceId}
            disabled={busy}
            styles={styles}
            theme={theme}
            onPress={() => choose({ projectKey: item.projectKey, workspaceId: null })}
          />
          {workspaces.map((entry) => (
            <TagOption
              key={entry.id}
              label={entry.label}
              detail={item.projectKey ? undefined : projectLabels.get(entry.projectKey)}
              selected={item.workspaceId === entry.id}
              disabled={busy}
              styles={styles}
              theme={theme}
              onPress={() => choose({ projectKey: item.projectKey, workspaceId: entry.id })}
            />
          ))}
          {workspaces.length === 0 ? (
            <Text style={styles.muted}>No active workspace in this project.</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Detail({
  item,
  draft,
  archived,
  state,
  live,
  composer,
  styles,
  theme,
  navigation,
  onBack,
  onCreated,
  onDeleted,
}: {
  item: Item | null;
  draft: DraftTags;
  archived: Archived;
  onCreated: (id: string) => void;
  state: AgentState | undefined;
  live: AgentLive | undefined;
  composer: NoteComposer | undefined;
  styles: Styles;
  theme: PluginTheme;
  navigation: PluginSurfaceProps["navigation"];
  onBack: (() => void) | null;
  onDeleted: () => void;
}) {
  const update = useRpc(updateItem);
  const remove = useRpc(deleteItem);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState(item?.title ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const actions = useNoteActions(body, composer);
  const refresh = () => queryClient.invalidateQueries({ queryKey: LIST_KEY });
  const run = (task: () => Promise<unknown>, after?: () => void) =>
    task()
      .then(() => {
        after?.();
        return refresh();
      })
      .catch((error: unknown) => toast.error(errorText(error)));

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, gap: 12 }}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack}>
            <Icon name="ChevronLeft" size={20} color={theme.colors.foreground} />
          </Pressable>
        ) : null}
        {item?.kind === "agent" ? (
          <AgentIcon state={state} live={live} size={18} theme={theme} />
        ) : (
          <Icon name={KIND_ICON[item?.kind ?? "note"]} size={18} color={theme.colors.foregroundMuted} />
        )}
        <Text style={[styles.heading, { flex: 1, minWidth: 0 }]} numberOfLines={1} ellipsizeMode="tail">
          {item ? itemTitle(item) : "New note"}
        </Text>
        {item?.kind === "agent" ? <PermissionBadge state={state} live={live} theme={theme} /> : null}
      </View>
      {item ? <TagEditor item={item} archived={archived} styles={styles} theme={theme} actions={
        <View style={styles.itemActions}>
          {item.kind === "agent" ? (
            <AgentDetailActions
              item={item}
              state={state}
              styles={styles}
              theme={theme}
              navigation={navigation}
              onPin={() => run(() => update({ id: item.id, pinned: !item.pinned }))}
              onDelete={() => run(() => remove({ id: item.id }), onDeleted)}
            />
          ) : (
            <DetailActionGroup
              styles={styles}
              theme={theme}
              entries={[
                {
                  key: "pin",
                  icon: item.pinned ? "PinOff" : "Pin",
                  label: item.pinned ? "Unpin" : "Pin",
                  onPress: () => run(() => update({ id: item.id, pinned: !item.pinned })),
                },
                { key: "copy", icon: "Copy", label: "Copy note", disabled: actions.copying, onPress: actions.copy },
                {
                  key: "send",
                  icon: "Send",
                  label: actions.canSend ? "Send note to current agent" : "No current agent available",
                  disabled: !actions.canSend || actions.sending,
                  onPress: actions.send,
                },
                {
                  key: "delete",
                  icon: "Trash2",
                  label: "Delete",
                  color: theme.colors.statusDanger,
                  onPress: () => run(() => remove({ id: item.id }), onDeleted),
                },
              ]}
            />
          )}
        </View>
      } /> : null}
      {item?.kind === "agent" ? (
        <AgentDetail item={item} state={state} live={live} styles={styles} />
      ) : (
        <NoteEditor
          item={item}
          draft={draft}
          title={title}
          body={body}
          onTitleChange={setTitle}
          onBodyChange={setBody}
          styles={styles}
          onCreated={onCreated}
        />
      )}
    </ScrollView>
  );
}

function AgentPicker({
  workspaceId,
  styles,
  theme,
  onStarred,
}: {
  workspaceId: string;
  styles: Styles;
  theme: PluginTheme;
  onStarred: () => void;
}) {
  const candidates = useRpc(agentCandidates);
  const star = useRpc(starAgent);
  const queryClient = useQueryClient();
  const toast = useToast();
  const query = useQuery({
    queryKey: [...CANDIDATES_KEY, workspaceId],
    queryFn: () => candidates({ workspaceId }),
  });
  const mutation = useMutation({
    mutationFn: (agentId: string) => star({ agentId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LIST_KEY });
      void queryClient.invalidateQueries({ queryKey: CANDIDATES_KEY });
      onStarred();
    },
    onError: (error) => toast.error(errorText(error)),
  });
  const agents = query.data?.agents ?? [];

  if (query.isError) return <Text style={styles.badge("danger")}>{errorText(query.error)}</Text>;
  if (query.isPending) return <Text style={styles.muted}>Loading agents…</Text>;
  if (agents.length === 0) {
    return <Text style={styles.muted}>Every agent in this workspace is already in the Inbox.</Text>;
  }
  return (
    <View style={{ gap: 4 }}>
      {agents.map((agent) => (
        <Pressable
          key={agent.id}
          accessibilityRole="button"
          accessibilityLabel={`Add ${agent.title || "Untitled agent"} to the Inbox`}
          disabled={mutation.isPending}
          onPress={() => mutation.mutate(agent.id)}
          style={[styles.row, { paddingVertical: 6 }]}
        >
          <Icon name="Star" size={14} color={theme.colors.foregroundMuted} />
          <Text style={styles.itemTitle} numberOfLines={1}>
            {agent.title || "Untitled agent"}
          </Text>
          <Text style={styles.muted}>{agent.provider}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * The Inbox list and editor. Without `workspace` it is the global page (every
 * visible item, workspace filter, ⌘K selection requests); with it, the list is
 * scoped to that workspace's Inbox for the Explorer panel.
 */
export function InboxView({
  theme,
  layout,
  navigation,
  workspace,
}: Pick<PluginSurfaceProps, "theme" | "layout" | "navigation"> & { workspace?: InboxWorkspace }) {
  const compact = workspace ? true : layout.compact;
  const styles = useMemo(() => createStyles(theme, compact, Boolean(workspace)), [theme, compact, workspace]);
  const list = useRpc(listItems);
  const states = useRpc(agentStates);
  const queryClient = useQueryClient();
  const [composer] = useComposers({ focused: true });

  const filters = useInboxFilters();
  const updateFilters = useRef(filters.update);
  updateFilters.current = filters.update;
  const shown = filters.values ? visibleInboxFilters(filters.values, { workspaceId: workspace?.id }) : null;
  const kinds = shown?.kinds ?? [];
  const projectKeys = shown?.projectKeys ?? [];
  const scope = shown?.workspaceIds ?? [];
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSlotWidth, setSearchSlotWidth] = useState(0);
  const searchProgress = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<{ focus?: () => void } | null>(null);
  const [picking, setPicking] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterTriggerRef = useRef<View>(null);
  const listChromeRef = useRef<View>(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<{ top: number; right: number } | null>(null);
  const sort = filters.values ? inboxListSort(filters.values, { workspaceId: workspace?.id }) : "updated";
  const [listWidth, setListWidth] = useState(rememberedListWidth);
  const widthAtGrant = useRef(listWidth);
  const listWidthRef = useRef(listWidth);
  listWidthRef.current = listWidth;
  const resizer = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          widthAtGrant.current = listWidthRef.current;
          // The web responder drops the drag once the pointer leaves the thin handle.
          if (Platform.OS === "web") {
            trackHorizontalDrag(event.nativeEvent.pageX, (dx) => {
              rememberedListWidth = clampListWidth(widthAtGrant.current + dx);
              setListWidth(rememberedListWidth);
            });
          }
        },
        onPanResponderMove: (_, gesture) => {
          if (Platform.OS !== "web") setListWidth(clampListWidth(widthAtGrant.current + gesture.dx));
        },
        onPanResponderRelease: () => {
          if (Platform.OS !== "web") rememberedListWidth = listWidthRef.current;
        },
        onPanResponderTerminate: () => {
          if (Platform.OS !== "web") rememberedListWidth = listWidthRef.current;
        },
      }),
    [],
  );
  const [selection, setSelection] = useState<Selection | null>(() =>
    workspace ? null : toSelection(takeSelection()),
  );
  const selectedId = selection?.id ?? null;
  const select = (id: string | null) => setSelection(id ? { id, draft: null, session: nextSession() } : null);

  useEffect(() => {
    searchProgress.stopAnimation();
    searchProgress.setValue(0);
    setSearchOpen(false);
    setQuery("");
  }, [workspace?.id, searchProgress]);

  useEffect(() => {
    if (!searchOpen) return;
    const id = setTimeout(() => searchInputRef.current?.focus?.(), SEARCH_ANIM_MS);
    return () => clearTimeout(id);
  }, [searchOpen]);

  function openSearch() {
    if (searchOpen) return;
    setSearchOpen(true);
    Animated.timing(searchProgress, {
      toValue: 1,
      duration: SEARCH_ANIM_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }

  function closeSearch() {
    if (!searchOpen) return;
    Animated.timing(searchProgress, {
      toValue: 0,
      duration: SEARCH_CLOSE_ANIM_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      setSearchOpen(false);
      setQuery("");
    });
  }

  // A command can request a selection while the surface is already mounted.
  useEffect(() => {
    if (workspace) return;
    return onSelectionRequest(() => {
      const next = toSelection(takeSelection());
      if (!next) return;
      updateFilters.current({ kinds: ["agent", "note"], projectKeys: [], workspaceIds: [] });
      setQuery("");
      setSelection(next);
      void queryClient.invalidateQueries({ queryKey: LIST_KEY });
    });
  }, [queryClient, workspace]);

  useEffect(
    () =>
      onItemsChanged(() => {
        void queryClient.invalidateQueries({ queryKey: ["inbox"] });
      }),
    [queryClient],
  );

  const filter = shown
    ? {
        kinds: shown.kinds,
        projectKeys: shown.projectKeys,
        ...(workspace ? { inboxOf: workspace.id } : { workspaceIds: shown.workspaceIds }),
        ...(query.trim() ? { query: query.trim() } : {}),
        ...(sort === "updated" ? {} : { sort }),
      }
    : null;
  const itemsQuery = useQuery({
    queryKey: [...LIST_KEY, filter],
    queryFn: () => list(filter!),
    enabled: filter !== null,
    // The filter chips render from this result; without the previous data they unmount on every uncached filter.
    placeholderData: keepPreviousData,
  });
  const items = itemsQuery.data?.items ?? [];
  const projects = itemsQuery.data?.projects ?? [];
  const workspaces = itemsQuery.data?.workspaces ?? [];
  useEffect(() => {
    if (shouldSelectFirstItem({
      globalSurface: !workspace,
      selection,
      firstItemId: items[0]?.id,
      isPlaceholderData: itemsQuery.isPlaceholderData,
    })) {
      setSelection({ id: items[0]!.id, draft: null, session: nextSession() });
    }
  }, [items, itemsQuery.isPlaceholderData, selection, workspace]);
  const archivedData = itemsQuery.data?.archived;
  const archived = useMemo<Archived>(
    () => ({ projects: new Set(archivedData?.projects), workspaces: new Set(archivedData?.workspaces) }),
    [archivedData],
  );

  // No item of this kind carries the selected tag: its chip is gone, so clear the saved choice.
  useEffect(() => {
    const current = filters.values;
    if (workspace || !itemsQuery.data || itemsQuery.isPlaceholderData || !current) return;
    const projectKeys = current.projectKeys.filter((key) => itemsQuery.data!.projects.some((entry) => entry.key === key));
    const workspaceIds = current.workspaceIds.filter((id) => itemsQuery.data!.workspaces.some((entry) => entry.id === id));
    if (projectKeys.length !== current.projectKeys.length || workspaceIds.length !== current.workspaceIds.length) {
      updateFilters.current({
        ...(projectKeys.length !== current.projectKeys.length ? { projectKeys } : {}),
        ...(workspaceIds.length !== current.workspaceIds.length ? { workspaceIds } : {}),
      });
    }
  }, [filters.values, itemsQuery.data, itemsQuery.isPlaceholderData, workspace]);

  const agentIds = items.flatMap((item) => (item.agentId ? [item.agentId] : [])).sort();
  const statesQuery = useQuery({
    queryKey: [...STATES_KEY, agentIds],
    queryFn: () => states({ agentIds }),
    enabled: agentIds.length > 0,
    refetchInterval: 10_000,
  });
  const agentState = (item: Item) =>
    item.agentId ? statesQuery.data?.states[item.agentId] : undefined;
  const agentLive = (item: Item) =>
    item.agentId ? statesQuery.data?.live?.[item.agentId] : undefined;
  const agentUpdatedAt = (item: Item) =>
    item.agentId ? statesQuery.data?.lastActivityAt?.[item.agentId] : undefined;

  const selected = items.find((item) => item.id === selectedId) ?? null;
  // A draft, or a note just created from one, stays open while the list catches up.
  const editing = selection && (selected || selection.draft !== null || selection.fromDraft);
  const showList = !compact || !editing;
  const showDetail = !compact || Boolean(editing);

  const createNote = () => {
    filters.update(workspace
      ? { panelKinds: ["agent", "note"] }
      : { kinds: ["agent", "note"], projectKeys: [], workspaceIds: [] });
    setSelection({ id: null, draft: workspace ? { workspaceId: workspace.id } : {}, session: nextSession() });
  };

  const noteButton = (
    <ToolbarIconButton
      styles={styles}
      theme={theme}
      icon="FilePlus2"
      accessibilityLabel="New note"
      onPress={createNote}
    />
  );

  useEffect(() => {
    if (!filterMenuOpen) {
      setFilterMenuAnchor(null);
      return;
    }
    const trigger = filterTriggerRef.current;
    const root = listChromeRef.current;
    if (!trigger || !root) return;
    trigger.measureInWindow((left, top, width, height) => {
      root.measureInWindow((rootLeft, rootTop, rootWidth) => {
        setFilterMenuAnchor({ top: top + height - rootTop + 4, right: rootLeft + rootWidth - (left + width) });
      });
    });
  }, [filterMenuOpen]);

  return (
    <View style={styles.screen}>
      {showList ? (
        <View
          ref={listChromeRef}
          style={[styles.listPane, styles.listChrome, compact ? { flex: 1 } : { width: listWidth }]}
        >
          <View style={styles.toolbar}>
            <View style={styles.toolbarRow}>
              <View
                style={styles.toolbarSearchSlot}
                onLayout={(event) => {
                  const next = event.nativeEvent.layout.width;
                  setSearchSlotWidth((current) => (current === next ? current : next));
                }}
              >
                <Animated.View
                  pointerEvents={searchOpen ? "auto" : "none"}
                  style={[
                    styles.toolbarSearchField,
                    {
                      width: searchProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, Math.max(0, searchSlotWidth - 8)],
                      }),
                      opacity: searchProgress,
                      marginLeft: searchProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 8],
                      }),
                    },
                  ]}
                >
                  <Icon name="Search" size={14} color={theme.colors.foregroundMuted} />
                  <TextInput
                    ref={searchInputRef as never}
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search"
                    placeholderTextColor={theme.colors.foregroundMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                    editable={searchOpen}
                    style={styles.toolbarSearchInput}
                    accessibilityLabel="Search Inbox"
                  />
                </Animated.View>
              </View>
              <View style={styles.toolbarActions}>
                <ToolbarIconButton
                  styles={styles}
                  theme={theme}
                  icon={searchOpen ? "X" : "Search"}
                  accessibilityLabel={searchOpen ? "Close search" : "Search Inbox"}
                  active={searchOpen}
                  onPress={() => {
                    if (searchOpen) closeSearch();
                    else openSearch();
                  }}
                />
                <View ref={filterTriggerRef} collapsable={false}>
                  <KindFilterMenu
                    value={kinds}
                    theme={theme}
                    open={filterMenuOpen}
                    onOpenChange={setFilterMenuOpen}
                  />
                </View>
                {noteButton}
                {workspace ? (
                  <ToolbarIconButton
                    styles={styles}
                    theme={theme}
                    icon={picking ? "X" : "Star"}
                    accessibilityLabel={picking ? "Done" : "Add agent"}
                    active={picking}
                    onPress={() => setPicking((open) => !open)}
                  />
                ) : (
                  <ToolbarIconButton
                    styles={styles}
                    theme={theme}
                    icon={SORTS.find((option) => option.id === sort)!.icon}
                    accessibilityLabel={`Sort: ${SORTS.find((option) => option.id === sort)!.label}`}
                    onPress={() => {
                      const index = SORTS.findIndex((option) => option.id === sort);
                      filters.update({ sort: SORTS[(index + 1) % SORTS.length]!.id });
                    }}
                  />
                )}
              </View>
            </View>
            {workspace && picking ? (
              <AgentPicker
                workspaceId={workspace.id}
                styles={styles}
                theme={theme}
                onStarred={() => {
                  setPicking(false);
                  filters.update({ panelKinds: ["agent", "note"] });
                  setQuery("");
                }}
              />
            ) : null}
          </View>
          <ScrollView style={{ flex: 1 }} scrollEnabled={!filterMenuOpen}>
            {itemsQuery.isError ? (
              <View style={styles.empty}>
                <Text style={styles.badge("danger")}>{errorText(itemsQuery.error)}</Text>
              </View>
            ) : items.length === 0 && !itemsQuery.isPending ? (
              <View style={styles.empty}>
                <Icon name="Inbox" size={28} color={theme.colors.foregroundMuted} />
                <Text style={styles.muted}>
                  {workspace
                    ? "Nothing tagged with this workspace or its project yet. Add a note or star an agent."
                    : "Nothing here yet. Star an agent from ⌘K or type /inbox in a composer."}
                </Text>
              </View>
            ) : (
              items.map((item) => (
                <Fragment key={item.id}>
                  <ItemRow
                    item={item}
                    selected={item.id === selectedId}
                    state={agentState(item)}
                    live={agentLive(item)}
                    agentUpdatedAt={agentUpdatedAt(item)}
                    archived={archived}
                    hideWorkspaceId={workspace?.id ?? null}
                    composer={composer}
                    navigation={navigation}
                    styles={styles}
                    theme={theme}
                    onPress={() => select(item.id)}
                    onDeleted={() => select(null)}
                  />
                  <View style={styles.itemDivider} />
                </Fragment>
              ))
            )}
          </ScrollView>
          {filterMenuOpen ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close filter"
              onPress={() => setFilterMenuOpen(false)}
              style={styles.filterMenuBackdrop}
            />
          ) : null}
          {filterMenuOpen && filterMenuAnchor ? (
            <View style={[styles.filterMenuPosition, filterMenuAnchor]}>
              <KindFilterMenuPanel
                value={kinds}
                projects={workspace ? undefined : projects}
                projectKeys={projectKeys}
                onProjectChange={workspace ? undefined : (key) => filters.update({ projectKeys: toggleInboxSelection(projectKeys, key) })}
                workspaces={workspace ? undefined : workspaces}
                workspaceIds={scope}
                onWorkspaceChange={workspace ? undefined : (id) => filters.update({ workspaceIds: toggleInboxSelection(scope, id) })}
                theme={theme}
                onChange={(next) => {
                  const selected = toggleInboxKind(kinds, next);
                  filters.update(workspace ? { panelKinds: selected } : { kinds: selected, projectKeys: [], workspaceIds: [] });
                }}
              />
            </View>
          ) : null}
        </View>
      ) : null}
      {showList && showDetail ? (
        <View {...resizer.panHandlers} style={styles.divider} accessibilityLabel="Resize list">
          <View style={styles.dividerLine} />
        </View>
      ) : null}
      {showDetail ? (
        <View style={styles.detailPane}>
          {editing ? (
            <Detail
              key={selection.session}
              item={selected}
              draft={selection.draft ?? {}}
              archived={archived}
              state={selected ? agentState(selected) : undefined}
              live={selected ? agentLive(selected) : undefined}
              composer={composer}
              styles={styles}
              theme={theme}
              navigation={navigation}
              onBack={compact ? () => select(null) : null}
              onCreated={(id) =>
                setSelection((current) =>
                  current && current.session === selection.session
                    ? { ...current, id, fromDraft: true }
                    : current,
                )
              }
              onDeleted={() => select(null)}
            />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.muted}>Select an item to view it.</Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

export function InboxSurface({ theme, layout, navigation }: PluginSurfaceProps) {
  return <InboxView theme={theme} layout={layout} navigation={navigation} />;
}
