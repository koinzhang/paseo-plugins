# Lifecycle hooks

> Excerpt from the official Plugin reference. See also sibling `reference-*.md` files and [quickstart.md](quickstart.md).

## Lifecycle hooks

In `index.server.ts`:

```ts
import type { PluginServerContext } from "@getpaseo/plugin/server";

export default function contribute(server: PluginServerContext) {
  server.on("agent.turn_ended", (event) => {
    console.log(event.agent.id, event.outcome);
  });

  return () => {};
}
```

| Register                        | Callback receives                  | Return                                                       |
| ------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| `server.on(name, callback)`     | `(event, { paseo, signal })`       | `void` or `Promise<void>`                                    |
| `server.before(name, callback)` | `({ request }, { paseo, signal })` | Modified request, or `undefined` to keep it; async supported |

Hooks run on the daemon while the plugin is enabled, even with no app connected.

### Change configuration and inject an MCP server

Add this callback inside `contribute(server)`. Replace the placeholder URL with your MCP endpoint.

```ts
server.before("agent.create", ({ request }) => {
  if (request.config.provider !== "codex") {
    return request;
  }

  return {
    ...request,
    config: {
      ...request.config,
      providerOptions: {
        ...request.config.providerOptions,
        sandbox_mode: "workspace-write",
        approval_policy: "on-request",
      },
      mcpServers: {
        ...request.config.mcpServers,
        company: {
          type: "http",
          url: "https://tools.example.com/mcp",
        },
      },
    },
  };
});
```

| Input                                       | Result                        |
| ------------------------------------------- | ----------------------------- |
| `providerOptions.sandbox_mode: "read-only"` | `"workspace-write"`           |
| `providerOptions.web_search: "disabled"`    | Preserved by the spread       |
| Existing `mcpServers.search`                | Preserved by the spread       |
| Existing `mcpServers.company`               | Replaced with the entry above |

The selected provider validates `providerOptions` and must support the configured MCP servers.
Explicit Codex sandbox and approval options override its mode presets.

### Inject environment variables on every session opening

```ts
server.before("agent.session_open", ({ request }) => {
  return {
    ...request,
    env: {
      ...request.env,
      COMPANY_ENV: "development",
    },
  };
});
```

This runs on create, resume, refresh, and import. To inject only on creation, set `env` in an
`agent.create` callback instead.

### Choose workspace isolation

```ts
server.before("workspace.create", ({ request }) => {
  if (request.source.kind !== "directory") {
    return request;
  }

  return {
    ...request,
    source: {
      kind: "worktree",
      cwd: request.source.path,
      action: "branch-off",
    },
  };
});
```

**Result:** an explicit directory creation request becomes a worktree request. Existing workspaces
and directory lookup/import operations are unaffected.

### Send a follow-up when a turn ends

Copy [server/inspect.ts](https://github.com/getpaseo/paseo/blob/main/plugin-examples/lifecycle-actions/server/inspect.ts)
into your plugin. The helper imports types from `@getpaseo/protocol/agent-types`; add
`@getpaseo/protocol` at the same version as your plugin SDK to your development dependencies
and install them before loading the plugin. `latestOutputText` joins text chunks after the latest user message.

```ts
import type { PluginServerContext } from "@getpaseo/plugin/server";
import { latestOutputText } from "./server/inspect";

export default function contribute(server: PluginServerContext) {
  server.on("agent.turn_ended", async (event, context) => {
    if (event.outcome.kind === "canceled") {
      return;
    }

    const text = latestOutputText(event.timeline);
    if (/out of credits/i.test(text)) {
      await context.paseo.agents.ref(event.agent.id).send("Try again.");
    }
  });

  return () => {};
}
```

```text
Turn ends: "out of credits"
  → plugin sends "Try again."
  → a new turn starts
```

This sends a new message with the existing SDK. Persistent matches keep sending follow-ups;
add limits or delays in your plugin when needed. Attachments and tool effects are not replayed.

### Answer a permission request

Using `shellCommand` from the same [helper file](https://github.com/getpaseo/paseo/blob/main/plugin-examples/lifecycle-actions/server/inspect.ts):

```ts
import type { PluginServerContext } from "@getpaseo/plugin/server";
import { shellCommand } from "./server/inspect";

export default function contribute(server: PluginServerContext) {
  server.on("agent.permission_requested", async (event, context) => {
    const command = shellCommand(event.request);
    if (command === null) {
      return;
    }

    const agent = context.paseo.agents.ref(event.agent.id);
    if (/\brm\s+-rf\b/.test(command)) {
      await agent.respondToPermission({
        requestId: event.request.id,
        response: { behavior: "deny", message: "Recursive deletion is blocked." },
      });
      return;
    }

    if (command.trim() === "git status") {
      await agent.respondToPermission({
        requestId: event.request.id,
        response: { behavior: "allow" },
      });
    }
  });

  return () => {};
}
```

| Request                  | Result                    |
| ------------------------ | ------------------------- |
| `rm -rf build`           | Declined                  |
| `git status`             | Approved                  |
| Other command or request | Left pending for the user |
| Already-resolved request | SDK response fails        |

The regex is an example policy, not a shell parser. Permission requests can also be questions,
plans, and mode changes; requesting permission does not end the turn.

### Events

| Name                         | Event fields                             | Trigger                                            |
| ---------------------------- | ---------------------------------------- | -------------------------------------------------- |
| `agent.created`              | `agent`                                  | Ordinary creation finishes; excludes import/resume |
| `agent.turn_started`         | `agent`, `turnId`                        | Live turn starts                                   |
| `agent.turn_ended`           | `agent`, `turnId`, `outcome`, `timeline` | Live turn completes, fails, or is canceled         |
| `agent.permission_requested` | `agent`, `request`                       | Permission or question becomes pending             |
| `agent.permission_resolved`  | `agent`, `requestId`, `resolution`       | Pending request is answered or cleared             |
| `agent.archived`             | `agent`, `archivedAt`                    | Archive state is saved                             |
| `workspace.created`          | `workspace`                              | Record created; directory available                |
| `workspace.archived`         | `workspace`                              | Archive state is saved                             |

Agent events exclude internal utility agents. Archive events can precede runtime/worktree cleanup;
`workspace.created` is not a setup barrier before agent startup.

**Shared payload shapes** (`@getpaseo/plugin/server`):

```ts
interface PluginHookAgent {
  id: string;
  workspaceId: string | null;
  parentAgentId: string | null;
  provider: string;
  cwd: string;
  title: string | null;
}

interface PluginHookWorkspace {
  id: string;
  projectId: string;
  cwd: string;
  name: string | null;
  archivedAt: string | null;
}

type PluginTurnOutcome =
  | { kind: "completed" }
  | { kind: "failed"; error: { message: string; code?: string } }
  | { kind: "canceled"; reason: string };
```

| Field        | Shape / meaning                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `turnId`     | Provider-reported `string` or `null`; can repeat after a session reopens                              |
| `timeline`   | `readonly AgentTimelineItem[]`; complete snapshot including earlier conversation; text may span items |
| `request`    | SDK `AgentPermissionRequest`; `kind` is `tool`, `plan`, `question`, `mode`, or `other`                |
| `resolution` | SDK `AgentPermissionResponse`                                                                         |
| `archivedAt` | Timestamp string                                                                                      |

### Before hooks

| Name                 | Request fields                                                          | Editable                                |
| -------------------- | ----------------------------------------------------------------------- | --------------------------------------- |
| `agent.create`       | `config`, optional `env`                                                | Public agent config except `cwd`; `env` |
| `agent.session_open` | `agentId`, `workspaceId`, `provider`, `cwd`, `reason`, `purpose`, `env` | Only `env`                              |
| `workspace.create`   | `source`, optional `title`, `firstAgentContext`                         | Entire explicit creation request        |

**`agent.create.config`** uses `AgentSessionConfig`:

| Fields                                        | Constraint                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| `provider`, `model`                           | Separate fields; changing provider may require changing model/mode/options |
| `modeId`, `thinkingOptionId`, `featureValues` | Provider-specific selections                                               |
| `title`, `systemPrompt`                       | Agent configuration                                                        |
| `providerOptions`                             | Provider-specific validated options                                        |
| `mcpServers`, `toolPolicy`                    | MCP configuration and exact-tool preapprovals                              |
| `cwd`                                         | Cannot change                                                              |
| `internal`                                    | Daemon-owned; cannot change through this hook                              |

**`agent.session_open` request example:**

```json
{
  "agentId": "agent-123",
  "workspaceId": "workspace-456",
  "provider": "codex",
  "cwd": "/projects/shop",
  "reason": "resume",
  "purpose": "interactive",
  "env": { "COMPANY_ENV": "development" }
}
```

| Field         | Values                                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `workspaceId` | String or `null`                                                                                                        |
| `reason`      | `create`, `resume`, `refresh`, `import`                                                                                 |
| `purpose`     | `interactive`, `history`                                                                                                |
| `env`         | Launch override map; excludes the daemon's inherited environment. Replace the map to add, replace, or remove overrides. |

### Ordering and returned values

```text
Creation request
  → agent.create hooks (plugin-ID order; registration order within each plugin)
  → resolve defaults and validate provider configuration
  → derive launch configuration with Paseo runtime tools and daemon prompt
  → agent.session_open hooks (same ordering; env only)
  → set PASEO_AGENT_ID and PASEO_AGENT_CWD
  → open provider session and save agent configuration
```

| Callback returns                                        | Next callback receives                              |
| ------------------------------------------------------- | --------------------------------------------------- |
| `{ ...request, env: { ...request.env, REGION: "eu" } }` | Prior request with `REGION` added/replaced          |
| `{ ...request, env: { REGION: "eu" } }`                 | Prior request with the entire override map replaced |
| `undefined`                                             | Unchanged request                                   |
| Throws or returns invalid data                          | Operation fails; later callbacks do not run         |

No automatic deep merge. Later callbacks can overwrite earlier values. Agent configuration is
saved; environment overrides are not persisted with it.

### Context and cleanup

| Contract                           | Behavior                                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `context.paseo`                    | Existing SDK connected to this daemon                                                                     |
| `context.signal`                   | Aborted on invocation timeout or plugin stop; pass to external requests                                   |
| Input data                         | Detached snapshot; change state through returned requests or SDK commands                                 |
| Registration result                | Idempotent remover, e.g. `const remove = server.on(...); remove();`                                       |
| Reload, disable, removal, shutdown | Remaining registrations removed                                                                           |
| Unknown hook name                  | Registration fails                                                                                        |
| Hook timeout                       | 30 seconds; aborts the signal. A before hook fails the pending operation; an event handler logs an error. |
| Event-handler error                | Logged against plugin; original operation continues                                                       |
| Event delivery                     | Live, best effort; no replay, persistence, or automatic retry                                             |
| Event concurrency                  | Different events may overlap; callback completion order is not guaranteed                                 |

### Complete examples

| Plugin                                                                                                 | Includes                                                                     |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| [lifecycle-logger](https://github.com/getpaseo/paseo/tree/main/plugin-examples/lifecycle-logger)       | All eleven hooks; JSON logs with environment values redacted                 |
| [lifecycle-actions](https://github.com/getpaseo/paseo/tree/main/plugin-examples/lifecycle-actions)     | Follow-ups, permissions, environment, provider switching, worktree selection |
| [agent-configuration](https://github.com/getpaseo/paseo/tree/main/plugin-examples/agent-configuration) | MCP injection and Codex sandbox/approval options                             |

Read logger output with `paseo plugin logs lifecycle-logger` or the host's `daemon.log`.
