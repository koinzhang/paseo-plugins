import {
  type PluginButtonContentProps,
  useAgent,
} from "@getpaseo/plugin/client";
import { useEffect, useMemo, type ReactNode } from "react";
import { Text, View, type TextStyle, type ViewStyle } from "react-native";
import {
  filterAttentionAgents,
  type AttentionAgentItem,
} from "./attention-agents.ts";
import { openAttentionAgent } from "./open-agent.ts";
import { useLatestUserMessagePreview } from "./use-latest-user-message.ts";
import { useAttentionStatuses } from "./attention-status-store.ts";
import { AgentRow, type AgentRowStyles } from "./workspace/agent-row.tsx";

function AttentionRow({
  item,
  theme,
  styles,
  onOpen,
}: {
  item: AttentionAgentItem;
  theme: PluginButtonContentProps["theme"];
  styles: AgentRowStyles;
  onOpen: () => void;
}): ReactNode {
  const title = useAgent(item.agentId, (agent) => agent.title);
  const preview = useLatestUserMessagePreview(item.agentId);
  useEffect(() => {
    if (preview.isError) {
      console.warn("[activity] latest user message preview failed", item.agentId, preview.error);
    }
  }, [preview.isError, preview.error, item.agentId]);

  const meta =
    preview.data ??
    (preview.isLoading ? "…" : null);

  return (
    <AgentRow
      label={title ?? item.agentId}
      archived={false}
      canOpen
      meta={meta}
      permissionCount={item.permissionCount}
      attentionKind={item.kind}
      running={false}
      busy={false}
      actionDisabled
      theme={theme}
      styles={styles}
      onOpen={onOpen}
    />
  );
}

/** Popover body: other agents in this workspace that need attention. */
export function AttentionPopover(props: PluginButtonContentProps) {
  if (props.context !== "agent") {
    return (
      <Text style={{ color: props.theme.colors.foregroundMuted }}>
        Attention is only available for an agent
      </Text>
    );
  }
  return <AttentionPopoverAgent {...props} context="agent" />;
}

function AttentionPopoverAgent(
  props: PluginButtonContentProps & { context: "agent" },
) {
  const { theme, workspaceId, agentId, close } = props;
  const statuses = useAttentionStatuses(workspaceId);
  const items = useMemo(
    () => filterAttentionAgents(statuses, agentId),
    [statuses, agentId],
  );

  const styles = useMemo(() => {
    const row: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 6,
    };
    const title: TextStyle = {
      color: theme.colors.foreground,
      fontSize: 14,
      fontWeight: "500",
    };
    return {
      agentListRow: row,
      agentIconWrap: {
        width: 18,
        height: 18,
        alignItems: "center",
        justifyContent: "center",
      } satisfies ViewStyle,
      runningBadge: { display: "none" } as ViewStyle,
      subAgentBadge: { display: "none" } as ViewStyle,
      subAgentBadgeText: { display: "none" } as TextStyle,
      listMain: { flex: 1, minWidth: 0, gap: 3 } satisfies ViewStyle,
      listLink: title,
      listTitle: title,
      listMeta: {
        color: theme.colors.foregroundMuted,
        fontSize: 12,
      } satisfies TextStyle,
      titleAction: { width: 0, height: 0 } satisfies ViewStyle,
      permissionBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        height: 18,
        paddingHorizontal: 5,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
        flexShrink: 0,
      } satisfies ViewStyle,
      permissionBadgeText: {
        color: theme.colors.statusWarning,
        fontSize: 11,
        fontWeight: "600",
        fontVariant: ["tabular-nums"],
      } satisfies TextStyle,
    } satisfies AgentRowStyles;
  }, [theme]);

  if (!statuses) {
    return (
      <Text style={{ color: theme.colors.foregroundMuted }}>Loading…</Text>
    );
  }

  if (items.length === 0) {
    return (
      <Text style={{ color: theme.colors.foregroundMuted }}>
        No other agents need attention
      </Text>
    );
  }

  return (
    <View style={{ gap: 2, minWidth: 240 }}>
      {items.map((item) => (
        <AttentionRow
          key={item.agentId}
          item={item}
          theme={theme}
          styles={styles}
          onOpen={() => {
            openAttentionAgent(item.agentId);
            close();
          }}
        />
      ))}
    </View>
  );
}
