import type { PluginAgentCommandContext, PluginClientContext } from "@getpaseo/plugin/client";
import {
  planCancel,
  planEffort,
  planFeature,
  planMode,
  planModel,
  planProfile,
  planRename,
  type Plan,
} from "../shared/commands.ts";
import { agentControl } from "../shared/rpc.ts";
import { composeResendPrompt, latestUserPrompt } from "../shared/resend.ts";
import { loadAgentState, loadProfiles } from "./agent-state.ts";
import type { PickerHost, RunControl } from "./picker.tsx";
import { getDisabledCommands, subscribeDisabledCommands } from "./settings-store.ts";

type Context = PluginAgentCommandContext & { args: string };

interface CommandMetadata {
  name: string;
  description: string;
  /** Longer help shown on the settings screen. */
  details: string;
  argumentHint: string;
}

type CommandSpec = CommandMetadata &
  (
    | { plan(context: Context): Promise<Plan>; execute?: never }
    | { execute(context: Context): Promise<void>; plan?: never }
  );

async function resendLastPrompt(ctx: Context): Promise<void> {
  const agent = ctx.paseo.agents.ref(ctx.agent.id);
  let page = await agent.timeline.refetch({
    direction: "tail",
    projection: "projected",
    limit: 100,
  });
  while (true) {
    const prompt = latestUserPrompt(page.entries);
    if (prompt) {
      await agent.send(composeResendPrompt(prompt, ctx.args));
      return;
    }
    if (!page.hasOlder || !page.startCursor) {
      throw new Error("No previous user prompt to resend.");
    }
    page = await agent.timeline.refetch({
      direction: "before",
      cursor: page.startCursor,
      projection: "projected",
      limit: 100,
    });
  }
}

export const COMMANDS: readonly CommandSpec[] = [
  {
    name: "model",
    description: "Show or switch the agent's model",
    details:
      "Pick from the provider's selectable models, or pass a model id or name. Matching is exact or by unique prefix.",
    argumentHint: "[model]",
    plan: async (ctx) =>
      planModel(ctx.args, await loadAgentState(ctx.paseo, ctx.agent.id, { models: true })),
  },
  {
    name: "effort",
    description: "Show or set thinking effort",
    details:
      "Pick a thinking effort level of the current model, or pass one such as high.",
    argumentHint: "[level]",
    plan: async (ctx) =>
      planEffort(ctx.args, await loadAgentState(ctx.paseo, ctx.agent.id, { models: true })),
  },
  {
    name: "profile",
    description: "Apply an agent profile's runtime settings",
    details:
      "Apply the model, mode, thinking and feature values of a saved agent profile. Fields that only apply at launch are skipped.",
    argumentHint: "[profile]",
    plan: async (ctx) => {
      const [state, profiles] = await Promise.all([
        loadAgentState(ctx.paseo, ctx.agent.id, { models: true, modes: true }),
        loadProfiles(ctx.paseo),
      ]);
      return planProfile(ctx.args, state, profiles);
    },
  },
  {
    name: "mode",
    description: "Show or switch the agent's mode",
    details:
      "Pick a mode the agent supports, or pass one such as plan.",
    argumentHint: "[mode]",
    plan: async (ctx) =>
      planMode(ctx.args, await loadAgentState(ctx.paseo, ctx.agent.id, { modes: true })),
  },
  {
    name: "feature",
    description: "Show or set a provider feature",
    details:
      "Browse provider features and their values, or pass a feature and value such as fast_mode on.",
    argumentHint: "[name] [value]",
    plan: async (ctx) => planFeature(ctx.args, await loadAgentState(ctx.paseo, ctx.agent.id)),
  },
  {
    name: "rename",
    description: "Rename the agent",
    details:
      "Set the agent title shown in the sidebar and tabs.",
    argumentHint: "<title>",
    plan: async (ctx) => planRename(ctx.args, ctx.agent.id),
  },
  {
    name: "cancel",
    description: "Cancel the agent's running turn",
    details:
      "Stop the current turn. Does nothing while the agent is idle.",
    argumentHint: "",
    plan: async (ctx) => planCancel(ctx.agent.id, ctx.agent.status),
  },
  {
    name: "resend",
    description: "Resend the last user prompt",
    details:
      "Send the latest non-empty user prompt again. Text after the command is appended on a new line.",
    argumentHint: "[text]",
    execute: resendLastPrompt,
  },
];

function controlRunner(ctx: Context): RunControl {
  return async (control, note) => {
    const { notice } = await ctx.rpc(agentControl, control);
    const warning = notice && notice.type !== "info" ? notice.message : null;
    return [note, warning].filter(Boolean).join("\n") || null;
  };
}

function addCommand(client: PluginClientContext, pickers: PickerHost, command: CommandSpec) {
  return client.addSlashCommand({
    name: command.name,
    description: command.description,
    argumentHint: command.argumentHint,
    context: "agent",
    async onSubmit(ctx) {
      if (command.execute) {
        await command.execute(ctx);
        return;
      }
      const plan = await command.plan(ctx);
      const run = controlRunner(ctx);
      if (plan.kind === "picker") {
        pickers.show({ workspaceId: ctx.agent.workspaceId, agentId: ctx.agent.id }, plan, run);
        return;
      }
      const message = await run(plan.control, plan.note);
      if (message) throw new Error(message);
    },
  });
}

/** Registers the enabled commands and re-registers them in order whenever the settings change. */
export function registerCommands(client: PluginClientContext, pickers: PickerHost) {
  let removers: (() => void)[] = [];
  const clear = () => {
    for (const remove of removers) remove();
    removers = [];
  };
  const sync = (disabled: ReadonlySet<string>) => {
    clear();
    removers = COMMANDS.filter((command) => !disabled.has(command.name)).map((command) =>
      addCommand(client, pickers, command),
    );
  };
  sync(getDisabledCommands());
  const unsubscribe = subscribeDisabledCommands(sync);
  return () => {
    unsubscribe();
    clear();
  };
}
