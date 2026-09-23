import { settingsRpc } from "@getpaseo/plugin";
import type { PluginClientContext } from "@getpaseo/plugin/client";
import {
  providerIdsByTitle,
  setModelHidden,
  type ModelRef,
  type ProviderTitleSource,
} from "../shared/models";
import { MODEL_VISIBILITY_SETTINGS } from "../shared/settings";

type Api = Pick<PluginClientContext, "rpc" | "paseo">;
type Listener = () => void;

const rpc = settingsRpc(MODEL_VISIBILITY_SETTINGS.id);

let api: Api | null = null;
let hidden: readonly ModelRef[] = [];
let revision: string | null = null;
let providerTitles = new Map<string, string>();
let writes: Promise<void> = Promise.resolve();
let pendingWrites = 0;
const listeners = new Set<Listener>();

function publish(): void {
  for (const listener of listeners) listener();
}

function accept(nextRevision: string, values: unknown): void {
  revision = nextRevision;
  // Queued toggles already applied optimistically; keep them until the last write lands.
  if (pendingWrites > 1) return;
  const parsed = MODEL_VISIBILITY_SETTINGS.schema.safeParse(values);
  hidden = parsed.success ? parsed.data.hidden : [];
  publish();
}

async function load(): Promise<void> {
  if (!api) return;
  const result = await api.rpc(rpc.read, {});
  if (result.status === "ready") accept(result.revision, result.values);
  else accept(result.revision, {});
}

async function persist(ref: ModelRef, hide: boolean): Promise<void> {
  for (let attempt = 0; attempt < 2 && api; attempt++) {
    if (revision === null) await load();
    if (revision === null || !api) return;
    const result = await api.rpc(rpc.write, {
      revision,
      values: { hidden: setModelHidden(hidden, ref, hide) },
    });
    if (result.status === "saved") {
      accept(result.revision, result.values);
      return;
    }
    if (result.status !== "conflict") break;
    await load();
  }
  await load();
}

export function installModelVisibility(client: Api): () => void {
  api = client;
  load().catch(() => {});
  refreshProviders();
  return () => {
    api = null;
    hidden = [];
    revision = null;
    providerTitles = new Map();
  };
}

export function getHiddenModels(): readonly ModelRef[] {
  return hidden;
}

export function providerIdForTitle(title: string): string | null {
  return providerTitles.get(title.trim()) ?? null;
}

export function refreshProviders(): void {
  const current = api;
  if (!current) return;
  current.paseo.providers
    .snapshot()
    .then((snapshot) => {
      if (api !== current) return;
      const entries: ProviderTitleSource[] = [
        ...snapshot.entries,
        ...(snapshot.compactSnapshot?.entries ?? []),
      ];
      providerTitles = providerIdsByTitle(entries);
      publish();
    })
    .catch(() => {});
}

export function setModelVisible(ref: ModelRef, visible: boolean): void {
  hidden = setModelHidden(hidden, ref, !visible);
  publish();
  pendingWrites++;
  writes = writes
    .then(() => persist(ref, !visible))
    .catch(() => load().catch(() => {}))
    .finally(() => {
      pendingWrites--;
    });
}

export function subscribeModelVisibility(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
