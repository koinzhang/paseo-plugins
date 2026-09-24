import type { PluginButtonRegistration, PluginClientContext } from "@getpaseo/plugin/client";
import { messagesFor } from "../shared/i18n.ts";
import { isPanelMounted, watchPanelPresence } from "./panel-visibility.ts";
import { currentAppLanguage, watchAppLanguage } from "./use-app-language.ts";

type WorkspacesApi = PluginClientContext["paseo"]["workspaces"];
type ListResult = Awaited<ReturnType<WorkspacesApi["list"]>>;

const BUTTON_ID = "workspace-activity";
const PANEL_ID = "workspace-activity";
const PAGE_LIMIT = 200;

const buttonTitle = () => messagesFor(currentAppLanguage()).commands.workspaceActivity;

/** One header button per workspace, following an entry-owned workspace directory subscription. */
export function contributeHeaderButtons(
  client: PluginClientContext,
  intervalMs = 15_000,
): () => void {
  const workspaces = client.paseo.workspaces;
  const buttons = new Map<string, PluginButtonRegistration>();
  const report = (error: unknown) => console.error("[activity] workspace directory failed", error);
  let disposed = false;
  let connecting = false;
  let generation = 0;
  let release: (() => Promise<void>) | undefined;

  function add(workspaceId: string) {
    if (disposed || buttons.has(workspaceId)) return;
    buttons.set(workspaceId, client.addHeaderButton({
      id: BUTTON_ID,
      workspaceId,
      button: {
        title: buttonTitle(),
        icon: "Activity",
        visible: !isPanelMounted(workspaceId),
        behavior: {
          kind: "action",
          onPress() {
            client.openPanel(PANEL_ID, { workspaceId, location: "explorer" });
          },
        },
      },
    }));
  }

  function remove(workspaceId: string) {
    buttons.get(workspaceId)?.remove();
    buttons.delete(workspaceId);
  }

  async function read(first?: ListResult) {
    const run = ++generation;
    try {
      const ids = new Set<string>();
      let page = first ?? await workspaces.list({ page: { limit: PAGE_LIMIT } });
      for (let pages = 0; ; pages++) {
        if (disposed || run !== generation) return;
        for (const workspace of page.entries) ids.add(workspace.id);
        if (!page.pageInfo.hasMore) break;
        if (!page.pageInfo.nextCursor || pages >= 99) throw new Error("Incomplete workspace pagination");
        page = await workspaces.list({ page: { limit: PAGE_LIMIT, cursor: page.pageInfo.nextCursor } });
      }
      for (const id of [...buttons.keys()]) if (!ids.has(id)) remove(id);
      for (const id of ids) add(id);
    } catch (error) {
      if (!disposed && run === generation) report(error);
    }
  }

  async function connect() {
    if (disposed || connecting || release) return;
    connecting = true;
    try {
      const result = await workspaces.list({ page: { limit: PAGE_LIMIT }, subscribe: {} });
      if (disposed) {
        await result.subscription.release();
        return;
      }
      release = () => result.subscription.release();
      result.subscription.subscribe({
        // Called immediately and again after reconnect.
        snapshot: (page) => { void read(page); },
        update: (message) => {
          if (disposed || message.type !== "workspace_update") return;
          const update = message.payload;
          if (update.kind === "upsert") add(update.workspace.id);
          else remove(update.id);
        },
        error: (error) => {
          if (disposed) return;
          report(error);
          const stop = release;
          release = undefined;
          if (stop) void stop().catch(report);
          void read();
        },
      });
    } catch (error) {
      if (!disposed) {
        report(error);
        await read();
      }
    } finally {
      connecting = false;
    }
  }

  const timer = setInterval(() => {
    if (!release) void connect();
    else void read();
  }, intervalMs);
  void connect();

  const stopLanguage = watchAppLanguage(() => {
    const title = buttonTitle();
    for (const button of buttons.values()) button.update({ title });
  });

  const stopPresence = watchPanelPresence((workspaceId) => {
    buttons.get(workspaceId)?.update({ visible: !isPanelMounted(workspaceId) });
  });

  return () => {
    disposed = true;
    ++generation;
    clearInterval(timer);
    stopLanguage();
    stopPresence();
    const stop = release;
    release = undefined;
    if (stop) void stop().catch(report);
    buttons.forEach((button) => button.remove());
    buttons.clear();
  };
}
