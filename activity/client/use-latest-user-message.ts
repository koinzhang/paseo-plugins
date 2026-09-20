import { usePaseo } from "@getpaseo/plugin/client";
import { useQuery } from "@tanstack/react-query";
import { fetchLatestUserMessagePreview } from "./latest-user-message.ts";

/** Latest user prompt preview for an agent (host timeline tail; ephemeral). */
export function useLatestUserMessagePreview(agentId: string, enabled = true) {
  const paseo = usePaseo();
  return useQuery({
    queryKey: ["activity", "latest-user-message", agentId],
    queryFn: () => fetchLatestUserMessagePreview(paseo, agentId),
    enabled: enabled && agentId.length > 0,
    staleTime: 30_000,
    retry: false,
  });
}
