# Plugin reference

Start with the [plugin quickstart](quickstart.md) to create your first plugin.

Migrating an existing plugin? Follow the standalone [runtime-entry migration guide](/docs/plugins/migration).

Local plugins are directory sources installed into one Paseo daemon. A plugin can contribute:

- React Native surfaces and sidebar items to Paseo clients;
- workspace and agent panels opened as workspace tabs;
- global, workspace, and agent actions in the Command Center;
- slash commands in the message composer;
- transformed and daemon-pushed agent timeline rows;
- light and dark themes in Settings → Appearance;
- schema-validated RPC handlers running beside the daemon;
- normal Paseo operations through the TypeScript SDK;
- searchable external resources in the message composer.

Plugin code is trusted and unsandboxed. Client surfaces run in the Paseo app. Backend contributions run in a subprocess with access to the daemon machine, including its files, processes, credentials, and network.

## Contents

### [Project files, runtime modules, and entry points](reference-project.md)

- **Project files**
  - Requirements
  - Runtime entries
- **Runtime modules**
  - Client runtime
  - Cross-platform rules
  - External links and workspace browsers
  - Server runtime
  - Providers
- **Entry point and cleanup**

### [Lifecycle hooks](reference-lifecycle.md)

- **Lifecycle hooks**
  - Change configuration and inject an MCP server
  - Inject environment variables on every session opening
  - Choose workspace isolation
  - Send a follow-up when a turn ends
  - Answer a permission request
  - Events
  - Before hooks
  - Ordering and returned values
  - Context and cleanup
  - Complete examples

### [Surfaces, sidebar items, and Host UI](reference-ui.md)

- **Surfaces and sidebar items**
- **Host UI**
  - Modal
  - Scrolling
  - Copy and paste
  - Toasts
  - Icons

### [Timeline items](reference-timeline.md)

- **Timeline items**
  - Append a timeline row from the daemon

### [Theme, layout, themes, and settings screens](reference-theme.md)

- **Theme and layout**
- **Contribute a theme**
- **Settings screens**
  - Named UI components
  - Persisted values

### [Workspace panels](reference-panels.md)

- **Workspace panels**

### [Command Center, slash commands, header buttons, composer pills](reference-commands.md)

- **Command Center items**
- **Slash commands**
- **Header buttons**
- **Composer pills**
- **Button descriptor**
  - Menu entries
  - Custom icons and popover content
  - Updates and lifecycle

### [Paseo SDK, plugin RPCs, logging, attachment sources](reference-sdk-rpc.md)

- **Use the Paseo SDK**
  - Discover hosts and target another host
- **Add plugin-specific backend behavior**
- **Debug backend output**
- **Add a composer attachment source**

### [Hosts, plugin sources, CLI, and load failures](reference-ops.md)

- **Hosts and lifecycle**
- **Plugin sources**
  - npm installation and publishing
- **CLI reference**
- **Load failures**


Also see:

- [Plugin quickstart](quickstart.md)
- [Publish a plugin](publishing.md)
- [Build a provider plugin](providers.md)
