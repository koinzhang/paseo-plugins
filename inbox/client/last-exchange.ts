import type { ExchangeCursor, ExchangePage, LastExchange } from "../shared/last-exchange.ts";
import { LAST_EXCHANGE_PAGE_LIMIT, readLastExchange } from "../shared/last-exchange.ts";

type TimelineApi = {
  agents: {
    ref: (agentId: string) => {
      timeline: {
        refetch: (options: {
          projection?: "canonical" | "projected";
          direction?: "tail" | "before";
          cursor?: ExchangeCursor;
          limit?: number;
        }) => Promise<ExchangePage>;
      };
    };
  };
};

async function readProjection(
  paseo: TimelineApi,
  agentId: string,
  projection: "projected" | "canonical",
): Promise<LastExchange> {
  const timeline = paseo.agents.ref(agentId).timeline;
  return readLastExchange(async ({ direction, cursor }) => {
    const page = await timeline.refetch({
      projection,
      direction,
      limit: LAST_EXCHANGE_PAGE_LIMIT,
      ...(cursor !== undefined ? { cursor } : {}),
    });
    if (page.error) throw new Error(page.error);
    return page;
  });
}

/**
 * Latest user prompt and agent reply from the host timeline.
 * Prefer the projected text the app shows, then the canonical timeline.
 */
export async function fetchLastExchange(paseo: TimelineApi, agentId: string): Promise<LastExchange> {
  try {
    const projected = await readProjection(paseo, agentId, "projected");
    if (projected.prompt || projected.agent) return projected;
  } catch (error) {
    console.warn("[inbox] projected timeline exchange failed", agentId, error);
  }
  return readProjection(paseo, agentId, "canonical");
}
