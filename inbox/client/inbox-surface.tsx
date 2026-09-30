import type { PluginTheme } from "@getpaseo/plugin";
import { type PluginSurfaceProps, usePaseo, useRpc } from "@getpaseo/plugin/client";
import { Icon, ScrollView, TextInput, useToast } from "@getpaseo/plugin/client/react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Platform, Pressable, Text, View } from "react-native";
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
  unarchiveAgent,
  updateItem,
} from "../shared/contracts.ts";
import { describeAgentStatus } from "../shared/agent-status.ts";
import { excerpt, type LastExchange } from "../shared/last-exchange.ts";
import { fetchLastExchange } from "./last-exchange.ts";
import { AgentIcon, PermissionBadge } from "./agent-status.tsx";
import { inboxListSort, visibleInboxFilters } from "../shared/filter-settings.ts";
import { itemTitle } from "../shared/item-title.ts";
import { isEmptyNote } from "../shared/note.ts";
import { onItemsChanged, onSelectionRequest, type SelectionRequest, takeSelection } from "./selection.ts";
import { useInboxFilters } from "./use-inbox-filters.ts";
import { trackHorizontalDrag } from "./web.ts";

/**
 * `id` is the open item; `draftCwd` is non-null for an unsaved note ("" = no project).
 * `session` keys the editor so it survives a draft turning into a saved note.
 */
interface Selection {
  id: string | null;
  draftCwd: string | null;
  session: number;
  fromDraft?: boolean;
}

let sessionCounter = 0;
const nextSession = () => ++sessionCounter;

function toSelection(request: SelectionRequest | null): Selection | null {
  if (!request) return null;
  if ("itemId" in request) return { id: request.itemId, draftCwd: null, session: nextSession() };
  return { id: null, draftCwd: request.draftCwd ?? "", session: nextSession() };
}

const LIST_KEY = ["inbox", "items"] as const;
const STATES_KEY = ["inbox", "agent-states"] as const;
const CANDIDATES_KEY = ["inbox", "agent-candidates"] as const;
const SAVE_DELAY_MS = 600;

const FILTERS: Array<{ id: ItemKind | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "agent", label: "Agents" },
  { id: "note", label: "Notes" },
  { id: "scratch", label: "Scratch" },
];

/** Tapping the sort button steps through these in order. */
const SORTS: Array<{ id: ItemSort; label: string; icon: string }> = [
  { id: "updated", label: "Updated", icon: "ClockArrowDown" },
  { id: "starred", label: "Starred", icon: "Star" },
  { id: "created", label: "Created", icon: "CalendarPlus" },
  { id: "name", label: "Name", icon: "ArrowDownAZ" },
];

const LIST_WIDTH = { initial: 360, min: 280, max: 640 };
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

/** Swaps the accent focus ring for a muted border, like Customize's search box. */
function Field({ styles, style, ...props }: ComponentProps<typeof TextInput> & { styles: Styles }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={styles.placeholderColor}
      {...props}
      style={[style, focused ? styles.inputFocused : null]}
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

function createStyles(theme: PluginTheme, compact: boolean) {
  const c = theme.colors;
  return {
    screen: { flex: 1, backgroundColor: c.surface0, flexDirection: "row" as const },
    listPane: { overflow: "hidden" as const },
    divider: {
      width: 9,
      marginHorizontal: -4,
      zIndex: 1,
      alignItems: "center" as const,
      ...resizeCursor,
    },
    dividerLine: { width: 1, flex: 1, backgroundColor: c.border },
    detailPane: { flex: 1, padding: compact ? 16 : 24, gap: 12 },
    toolbar: { padding: compact ? 12 : 16, gap: 10, borderBottomWidth: 1, borderColor: c.border },
    row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
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
    chip: (active: boolean) => ({
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
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
    }),
    item: (selected: boolean) => ({
      paddingHorizontal: compact ? 12 : 16,
      paddingVertical: 10,
      gap: 4,
      borderBottomWidth: 1,
      borderColor: c.border,
      backgroundColor: selected ? c.surface2 : "transparent",
    }),
    itemTitle: { color: c.foreground, fontSize: 14, flex: 1 },
    muted: { color: c.foregroundMuted, fontSize: 12 },
    badge: (tone: "warning" | "danger" | "success") => ({
      color:
        tone === "warning" ? c.statusWarning : tone === "danger" ? c.statusDanger : c.statusSuccess,
      fontSize: 11,
    }),
    heading: { color: c.foreground, fontSize: compact ? 18 : 20, fontWeight: "600" as const },
    body: { color: c.foreground, fontSize: 14 },
    message: {
      color: c.foreground,
      fontSize: 13,
      lineHeight: 18,
      backgroundColor: c.surface1,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
    },
    editor: {
      flex: 1,
      minHeight: 200,
      color: c.foreground,
      backgroundColor: c.surface1,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
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
    buttonText: (kind: "primary" | "plain" | "danger") => ({
      color:
        kind === "primary" ? c.accentForeground : kind === "danger" ? c.statusDanger : c.foreground,
      fontSize: 13,
    }),
    empty: { padding: 24, alignItems: "center" as const, gap: 8 },
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

const KIND_ICON: Record<ItemKind, string> = { agent: "Bot", note: "NotebookText", scratch: "StickyNote" };

function ItemRow({
  item,
  selected,
  state,
  live,
  workspaceLabel,
  styles,
  theme,
  onPress,
}: {
  item: Item;
  selected: boolean;
  state: AgentState | undefined;
  live: AgentLive | undefined;
  workspaceLabel: string | null;
  styles: Styles;
  theme: PluginTheme;
  onPress: () => void;
}) {
  const agentState = state;
  const status = item.kind === "agent" ? describeAgentStatus(agentState, live) : null;
  const subtitle = [
    item.projectLabel,
    workspaceLabel,
    item.kind === "agent" ? item.agentSnapshot?.provider : null,
    new Date(item.updatedAt).toLocaleDateString(),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={status ? `${itemTitle(item)}, ${status.label}` : itemTitle(item)}
      onPress={onPress}
      style={styles.item(selected)}
    >
      <View style={styles.row}>
        {item.kind === "agent" ? (
          <AgentIcon state={agentState} live={live} size={14} theme={theme} />
        ) : (
          <Icon name={KIND_ICON[item.kind]} size={14} color={theme.colors.foregroundMuted} />
        )}
        <Text style={styles.itemTitle} numberOfLines={1}>
          {itemTitle(item)}
        </Text>
        {item.pinned ? <Icon name="Pin" size={12} color={theme.colors.accent} /> : null}
        {item.kind === "agent" ? <PermissionBadge state={agentState} live={live} theme={theme} /> : null}
      </View>
      <Text style={styles.muted} numberOfLines={1}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

/**
 * Autosaving editor for notes and scratch. A draft (`item` null) is created on the
 * first non-empty save; a note that is empty when the editor closes is deleted.
 */
function NoteEditor({
  item,
  draftCwd,
  workspaceId,
  styles,
  onCreated,
}: {
  item: Item | null;
  draftCwd: string | null;
  workspaceId: string | null;
  styles: Styles;
  onCreated: (id: string) => void;
}) {
  const save = useRpc(saveNote);
  const remove = useRpc(deleteItem);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(item?.title ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const kind = item?.kind === "scratch" ? "scratch" : "note";
  const idRef = useRef(item?.id ?? null);
  const saved = useRef({ title: item?.title ?? "", body: item?.body ?? "" });
  const latest = useRef({ title, body });
  latest.current = { title, body };
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const onCreatedRef = useRef(onCreated);
  onCreatedRef.current = onCreated;

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
          ...(idRef.current
            ? { id: idRef.current }
            : {
                ...(draftCwd ? { cwd: draftCwd } : {}),
                ...(workspaceId ? { workspaceId } : {}),
              }),
          kind,
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
    <View style={{ flex: 1, gap: 10 }}>
      <Field
        styles={styles}
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Title (optional)"
        accessibilityLabel="Title"
      />
      <Field
        styles={styles}
        style={styles.editor}
        value={body}
        onChangeText={setBody}
        placeholder="Write something…"
        accessibilityLabel="Note body"
        multiline
        autoFocus={!item}
      />
      <Text style={error ? styles.badge("danger") : styles.muted}>{statusText}</Text>
    </View>
  );
}

const EXCHANGE_KEY = ["inbox", "last-exchange"] as const;

function ExchangeBlock({
  label,
  text,
  styles,
}: {
  label: string;
  text: string | null;
  styles: Styles;
}) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={styles.muted}>{label}</Text>
      {text ? (
        <Text style={styles.message} selectable>
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
      <ExchangeBlock label="Agent" text={exchange.agent} styles={styles} />
    </View>
  );
}

/** Open, or Unarchive once archived; sits in the Pin / Remove row. */
function AgentActions({
  item,
  state,
  styles,
  theme,
  navigation,
}: {
  item: Item;
  state: AgentState | undefined;
  styles: Styles;
  theme: PluginTheme;
  navigation: PluginSurfaceProps["navigation"];
}) {
  const unarchive = useRpc(unarchiveAgent);
  const queryClient = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: () => unarchive({ agentId: item.agentId! }),
    onSuccess: ({ restoredWorkspace }) => {
      toast.show(restoredWorkspace ? "Workspace and agent restored" : "Agent unarchived", {
        variant: "success",
      });
      void queryClient.invalidateQueries({ queryKey: STATES_KEY });
    },
    onError: (error) => toast.error(errorText(error)),
  });
  if (state === "archived") {
    return (
      <Button
        styles={styles}
        theme={theme}
        kind="primary"
        icon="ArchiveRestore"
        accessibilityLabel={mutation.isPending ? "Unarchiving" : "Unarchive"}
        disabled={mutation.isPending}
        onPress={() => mutation.mutate()}
      />
    );
  }
  if (!navigation || state === "missing" || !item.agentId) return null;
  return (
    <Button
      styles={styles}
      theme={theme}
      kind="primary"
      icon="SquareArrowOutUpRight"
      accessibilityLabel="Open"
      onPress={() => navigation.openAgent({ agentId: item.agentId! })}
    />
  );
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
    ["Project", item.projectLabel],
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

function Detail({
  item,
  draftCwd,
  workspaceId,
  state,
  live,
  styles,
  theme,
  navigation,
  onBack,
  onCreated,
  onDeleted,
}: {
  item: Item | null;
  draftCwd: string | null;
  workspaceId: string | null;
  onCreated: (id: string) => void;
  state: AgentState | undefined;
  live: AgentLive | undefined;
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
        <Text style={[styles.heading, { flex: 1 }]} numberOfLines={2}>
          {item ? itemTitle(item) : "New note"}
        </Text>
        {item?.kind === "agent" ? <PermissionBadge state={state} live={live} theme={theme} /> : null}
      </View>
      {item ? (
        <View style={styles.wrap}>
          {item.kind === "agent" ? (
            <AgentActions item={item} state={state} styles={styles} theme={theme} navigation={navigation} />
          ) : null}
          <Button
            styles={styles}
            theme={theme}
            icon={item.pinned ? "PinOff" : "Pin"}
            accessibilityLabel={item.pinned ? "Unpin" : "Pin"}
            onPress={() => run(() => update({ id: item.id, pinned: !item.pinned }))}
          />
          {item.kind === "scratch" ? (
            <Button
              styles={styles}
              theme={theme}
              icon="NotebookText"
              label="Convert to note"
              onPress={() => run(() => update({ id: item.id, kind: "note" }))}
            />
          ) : null}
          <Button
            styles={styles}
            theme={theme}
            kind="danger"
            icon={item.kind === "agent" ? "StarOff" : "Trash2"}
            accessibilityLabel={item.kind === "agent" ? "Remove from Inbox" : "Delete"}
            onPress={() => run(() => remove({ id: item.id }), onDeleted)}
          />
        </View>
      ) : null}
      {item?.kind === "agent" ? (
        <AgentDetail item={item} state={state} live={live} styles={styles} />
      ) : (
        <NoteEditor
          item={item}
          draftCwd={draftCwd}
          workspaceId={workspaceId}
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
    mutationFn: (agentId: string) => star({ agentId, workspaceId }),
    onSuccess: ({ item }) => {
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
    return <Text style={styles.muted}>Every agent in this workspace is already in its Inbox.</Text>;
  }
  return (
    <View style={{ gap: 4 }}>
      {agents.map((agent) => (
        <Pressable
          key={agent.id}
          accessibilityRole="button"
          accessibilityLabel={`Add ${agent.title || "Untitled agent"} to this workspace's Inbox`}
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

function Chip({
  label,
  icon,
  accessibilityLabel,
  active,
  styles,
  theme,
  onPress,
}: {
  label: string;
  icon?: string;
  accessibilityLabel: string;
  active: boolean;
  styles: Styles;
  theme: PluginTheme;
  onPress: () => void;
}) {
  const color = active ? theme.colors.accentForeground : theme.colors.foregroundMuted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.chip(active)}
    >
      {icon ? <Icon name={icon} size={12} color={color} /> : null}
      <Text style={styles.chipText(active)}>{label}</Text>
    </Pressable>
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
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);
  const list = useRpc(listItems);
  const states = useRpc(agentStates);
  const queryClient = useQueryClient();

  const filters = useInboxFilters();
  const updateFilters = useRef(filters.update);
  updateFilters.current = filters.update;
  const shown = filters.values ? visibleInboxFilters(filters.values, { workspaceId: workspace?.id }) : null;
  const kind = shown?.kind ?? null;
  const projectKey = shown?.projectKey ?? null;
  const scope = shown?.workspaceId ?? null;
  const [query, setQuery] = useState("");
  const [picking, setPicking] = useState(false);
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
  const select = (id: string | null) => setSelection(id ? { id, draftCwd: null, session: nextSession() } : null);

  // A command can request a selection while the surface is already mounted.
  useEffect(() => {
    if (workspace) return;
    return onSelectionRequest(() => {
      const next = toSelection(takeSelection());
      if (!next) return;
      updateFilters.current({ kind: "all", projectKey: null, workspaceId: null });
      setQuery("");
      setSelection(next);
      void queryClient.invalidateQueries({ queryKey: LIST_KEY });
    });
  }, [queryClient, workspace]);

  useEffect(
    () =>
      onItemsChanged(() => {
        void queryClient.invalidateQueries({ queryKey: LIST_KEY });
        void queryClient.invalidateQueries({ queryKey: CANDIDATES_KEY });
      }),
    [queryClient],
  );

  const filter = shown
    ? {
        ...(shown.kind === "all" ? {} : { kind: shown.kind }),
        ...(shown.projectKey ? { projectKey: shown.projectKey } : {}),
        ...(shown.workspaceId ? { workspaceId: shown.workspaceId } : {}),
        ...(query.trim() ? { query: query.trim() } : {}),
        ...(sort === "updated" ? {} : { sort }),
      }
    : null;
  const itemsQuery = useQuery({
    queryKey: [...LIST_KEY, filter],
    queryFn: () => list(filter!),
    enabled: filter !== null,
  });
  const items = itemsQuery.data?.items ?? [];
  const projects = itemsQuery.data?.projects ?? [];
  const workspaces = itemsQuery.data?.workspaces ?? [];
  const workspaceLabels = new Map(workspaces.map((entry) => [entry.id, entry.label]));

  // The selected workspace was archived: its chip is gone, so clear the saved choice.
  useEffect(() => {
    const current = filters.values;
    if (workspace || !itemsQuery.data || !current || current.kind !== "agent" || !current.workspaceId) return;
    if (!itemsQuery.data.workspaces.some((entry) => entry.id === current.workspaceId)) {
      updateFilters.current({ workspaceId: null });
    }
  }, [filters.values, itemsQuery.data, workspace]);

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

  const selected = items.find((item) => item.id === selectedId) ?? null;
  // A draft, or a note just created from one, stays open while the list catches up.
  const editing = selection && (selected || selection.draftCwd !== null || selection.fromDraft);
  const showList = !compact || !editing;
  const showDetail = !compact || Boolean(editing);

  const createNote = () => {
    filters.update(workspace ? { panelKind: "all" } : { kind: "all" });
    setSelection({ id: null, draftCwd: workspace?.directory ?? "", session: nextSession() });
  };

  const noteButton = (
    <Button
      styles={styles}
      theme={theme}
      kind="primary"
      icon="NotebookPen"
      accessibilityLabel="New note"
      onPress={createNote}
    />
  );

  return (
    <View style={styles.screen}>
      {showList ? (
        <View style={[styles.listPane, compact ? { flex: 1 } : { width: listWidth }]}>
          <View style={styles.toolbar}>
            <View style={styles.row}>
              <Field
                styles={styles}
                style={[styles.input, { flex: 1, minWidth: 0 }]}
                value={query}
                onChangeText={setQuery}
                placeholder="Search"
                accessibilityLabel="Search Inbox"
              />
              {noteButton}
              {workspace ? (
                <Button
                  styles={styles}
                  theme={theme}
                  icon={picking ? "X" : "Star"}
                  accessibilityLabel={picking ? "Done" : "Add agent"}
                  onPress={() => setPicking((open) => !open)}
                />
              ) : (
                <Button
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
            {workspace && picking ? (
              <AgentPicker
                workspaceId={workspace.id}
                styles={styles}
                theme={theme}
                onStarred={() => {
                  setPicking(false);
                  filters.update({ panelKind: "all" });
                  setQuery("");
                }}
              />
            ) : null}
            <View style={styles.wrap}>
              {FILTERS.map((option) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  accessibilityLabel={`Show ${option.label}`}
                  active={kind === option.id}
                  styles={styles}
                  theme={theme}
                  onPress={() => filters.update(workspace ? { panelKind: option.id } : { kind: option.id })}
                />
              ))}
            </View>
            {!workspace && kind === "agent" && workspaces.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.row}>
                  {workspaces.map((entry) => (
                    <Chip
                      key={entry.id}
                      icon="Folder"
                      label={`${entry.label} · ${entry.count}`}
                      accessibilityLabel={`Filter by workspace ${entry.label}`}
                      active={scope === entry.id}
                      styles={styles}
                      theme={theme}
                      onPress={() =>
                        filters.update({
                          workspaceId: filters.values?.workspaceId === entry.id ? null : entry.id,
                        })
                      }
                    />
                  ))}
                </View>
              </ScrollView>
            ) : null}
            {!workspace && kind === "agent" && projects.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.row}>
                  {projects.map((project) => {
                    const active = projectKey === project.key;
                    return (
                      <Chip
                        key={project.key}
                        icon="FolderGit2"
                        label={`${project.label} · ${project.count}`}
                        accessibilityLabel={`Filter by project ${project.label}`}
                        active={active}
                        styles={styles}
                        theme={theme}
                        onPress={() => filters.update({ projectKey: active ? null : project.key })}
                      />
                    );
                  })}
                </View>
              </ScrollView>
            ) : null}
          </View>
          <ScrollView style={{ flex: 1 }}>
            {itemsQuery.isError ? (
              <View style={styles.empty}>
                <Text style={styles.badge("danger")}>{errorText(itemsQuery.error)}</Text>
              </View>
            ) : items.length === 0 && !itemsQuery.isPending ? (
              <View style={styles.empty}>
                <Icon name="Inbox" size={28} color={theme.colors.foregroundMuted} />
                <Text style={styles.muted}>
                  {workspace
                    ? "Nothing in this workspace's Inbox yet. Add a note or star an agent."
                    : "Nothing here yet. Star an agent from ⌘K or type /inbox in a composer."}
                </Text>
              </View>
            ) : (
              items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  selected={item.id === selectedId}
                  state={agentState(item)}
                  live={agentLive(item)}
                  workspaceLabel={
                    !workspace && item.workspaceId ? (workspaceLabels.get(item.workspaceId) ?? null) : null
                  }
                  styles={styles}
                  theme={theme}
                  onPress={() => select(item.id)}
                />
              ))
            )}
          </ScrollView>
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
              draftCwd={selection.draftCwd || null}
              workspaceId={workspace?.id ?? null}
              state={selected ? agentState(selected) : undefined}
              live={selected ? agentLive(selected) : undefined}
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
