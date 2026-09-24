import { openExternalUrl, useRpc } from "@getpaseo/plugin/client";
import { ScrollView, copyText, useToast } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { openRpc, previewRpc, type Entry } from "../shared/contracts.ts";
import { formatBytes, type Messages } from "../shared/i18n.ts";
import { RADIUS, TEXT } from "./design-tokens.ts";
import { entryMeta } from "./entry-row.tsx";
import { ErrorState, IconButton, LoadingState, StatusBadge, TextButton, type Colors } from "./ui.tsx";

export function PreviewPane({
  entry,
  onClose,
  colors,
  compact,
  m,
}: {
  entry: Entry;
  onClose: () => void;
  colors: Colors;
  compact: boolean;
  m: Messages;
}): ReactNode {
  const preview = useRpc(previewRpc);
  const open = useRpc(openRpc);
  const toast = useToast();
  const isUrl = entry.tags.includes("url");
  const query = useQuery({
    queryKey: ["customize", "preview", entry.path, entry.mcp?.name ?? null],
    queryFn: () => preview({ path: entry.path, ...(entry.mcp ? { mcpName: entry.mcp.name } : {}) }),
    enabled: !isUrl,
    staleTime: 5_000,
  });

  const run = (reveal: boolean) => {
    if (isUrl) {
      void openExternalUrl(entry.path).catch((error: unknown) => toast.error(`${m.preview.openFailed}: ${String(error)}`));
      return;
    }
    open({ path: entry.path, reveal }).catch((error: unknown) =>
      toast.error(`${m.preview.openFailed}: ${error instanceof Error ? error.message : String(error)}`),
    );
  };

  const data = query.data;
  return (
    <View style={{ flex: 1, minHeight: 0, gap: 8, paddingHorizontal: compact ? 16 : 24, paddingTop: 12, paddingBottom: compact ? 12 : 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ ...TEXT.rowTitle, color: colors.foreground, flexShrink: 1 }} numberOfLines={1}>
          {entry.name}
        </Text>
        <StatusBadge status={entry.status} label={m.statuses[entry.status]} colors={colors} />
        <View style={{ flex: 1 }} />
        <TextButton icon="ExternalLink" label={m.preview.open} onPress={() => run(false)} colors={colors} />
        {!compact && !isUrl ? <TextButton icon="FolderOpen" label={m.preview.reveal} onPress={() => run(true)} colors={colors} /> : null}
        <IconButton
          icon="Copy"
          label={m.preview.copyPath}
          color={colors.foregroundMuted}
          onPress={() => {
            copyText(entry.path).then(() => toast.show(m.preview.copied), () => {});
          }}
        />
        <IconButton icon="X" label={m.preview.close} color={colors.foregroundMuted} onPress={onClose} />
      </View>
      <Text style={{ ...TEXT.path, color: colors.foregroundMuted }} numberOfLines={2} selectable>
        {entry.path}
      </Text>
      <Text style={{ ...TEXT.meta, color: colors.foregroundMuted }} numberOfLines={2}>
        {entryMeta(entry, m, true)}
      </Text>
      <ScrollView
        style={{ flex: 1, minHeight: 0, borderRadius: RADIUS.block, backgroundColor: colors.surface1 }}
        contentContainerStyle={{ padding: 12, gap: 8 }}
      >
        {isUrl ? (
          <Text style={{ ...TEXT.small, color: colors.foregroundMuted }}>{m.preview.url}</Text>
        ) : query.isPending ? (
          <LoadingState color={colors.foregroundMuted} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} colors={colors} />
        ) : data?.kind === "missing" ? (
          <Text style={{ ...TEXT.small, color: colors.foregroundMuted }}>{m.preview.missing}</Text>
        ) : data?.kind === "directory" ? (
          <Text style={{ ...TEXT.small, color: colors.foregroundMuted }}>{m.preview.directory}</Text>
        ) : (
          <>
            {data?.kind === "mcp" ? <Text style={{ ...TEXT.caption, color: colors.foregroundMuted }}>{m.preview.redacted}</Text> : null}
            <Text style={{ ...TEXT.code, color: colors.foreground }} selectable>
              {data?.content ?? ""}
            </Text>
            {data?.truncated ? (
              <Text style={{ ...TEXT.caption, color: colors.foregroundMuted }}>{m.preview.truncated(formatBytes(data.bytes))}</Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
