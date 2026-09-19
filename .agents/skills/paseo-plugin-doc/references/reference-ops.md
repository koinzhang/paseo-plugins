# Hosts, plugin sources, CLI, and load failures

> Excerpt from the official Plugin reference. See also sibling `reference-*.md` files and [quickstart.md](quickstart.md).

## Hosts and lifecycle

Plugins are installed per daemon. When the same contribution exists on several connected hosts, Paseo shows one sidebar item and adds a host picker. The selected host supplies the bundle, Paseo API, RPC transport, and query cache. Calls never fall through to another host when the selected host is offline.

Attachment sources remain scoped to each composer's host.

Workspace panels and Command Center items stay scoped to the active host and exact cached context.
Reload replaces their registrations. Disable, removal, host disconnect, and evaluation failure
remove Command Center items and clear the installation's query state. An already-restored panel tab
remains as unavailable until its matching contribution returns or the user closes it. Panel render
failures stay inside the plugin error boundary.

## Plugin sources

Paste one of these source identifiers into **Settings → Plugins**, or pass it to
`paseo plugin install`. `paseo plugin add <source>` and `paseo plugin install <source>` are aliases.
Absolute host paths are recommended because relative paths resolve against the daemon's working
directory. The app does not expand `~`; your shell may expand it before the CLI runs.

| Source                     | Accepted form                                                              | Example                                       |
| -------------------------- | -------------------------------------------------------------------------- | --------------------------------------------- |
| Host directory             | Absolute or relative path on the daemon host                               | `/srv/paseo/plugins/review`                   |
| GitHub repository          | `github:owner/repository` or `owner/repository`                            | `github:acme/paseo-review`                    |
| Git repository             | `git:<URL or SCP source>`; the prefix is optional for URLs and SCP sources | `git:https://git.example.com/acme/review.git` |
| npm package                | `npm:<name>[@<version, tag, or range>]`; `npm:` is optional                | `npm:@acme/paseo-review@^1.2.0`               |
| Plugin below a source root | Append `:relative/plugin/path` to any source                               | `github:acme/monorepo:plugins/review`         |

Git URLs use `https://`, `http://`, `ssh://`, `git://`, or `file://`. SCP sources use
`user@host:path`. `file://` selects Git acquisition, not directory installation.

npm names are lowercase unscoped `name` or scoped `@scope/name`. Each component starts with a
letter or digit and then contains letters, digits, `.`, `_`, or `-`. After the package name, an
optional `@` introduces an exact version, distribution tag, or npm semver range. Omitting it means
`latest`. Quote shell arguments containing spaces or comparison operators. npm aliases, tarball
URLs, and npm's `file:` specifications are not plugin source identifiers; use a directory or Git
source for those locations. Use the `npm:` prefix for an unscoped package with both a selector
and subdirectory (`npm:review@1.2.0:nested`); without it, `user@host:path` is an SCP Git source.
The package registry validates the selected version, tag, or range.

Paseo resolves an identifier in this order:

1. An existing directory matching the complete identifier on the daemon host wins, including a
   literal directory containing `:`.
2. Otherwise, recognize `npm:`, `github:`, or `git:` before interpreting a subdirectory suffix.
   `git://` is a Git URL scheme. An explicit prefix selects acquisition of that kind.
3. Recognize a final `:relative/plugin/path` only when its suffix contains no empty, `.` or `..`
   segments. A lone `.` selects the source root. Both `/` and `\` separate suffix segments; use `/`
   across hosts. URL ports and the separator in an SCP source stay part of the source. A suffix
   that does not satisfy these rules stays part of the identifier.
4. Without an explicit prefix, an existing directory matching the remaining source wins.
5. Resolve Git URLs and SCP sources as Git; expand exact `owner/repository` shorthand to GitHub
   HTTPS. `github:` requires that shorthand; `git:` accepts it as well as URLs and SCP sources.
6. Resolve a remaining npm package name with its optional selector through the host's registry.
   Reject anything else.

Directory lookup happens on the daemon host. The app uses the `paseo-plugin.json` ID; the CLI
accepts `--id <runtime-id>` to override it. An existing installation ID is rejected without changing
its enabled state or files.

```bash
paseo plugin install /srv/paseo/plugins/review
paseo plugin install github:acme/paseo-review
paseo plugin install git:https://git.example.com:8443/acme/monorepo.git:plugins/review --ref main
paseo plugin install git@git.example.com:acme/review.git
paseo plugin install file:///srv/repos/monorepo:plugins/review
paseo plugin install npm:paseo-review@1.2.0
paseo plugin install npm:@acme/paseo-review@next
paseo plugin install 'npm:@acme/paseo-review@>=1.2.0 <2.0.0' --id review-staging
paseo plugin install npm:@acme/plugins@^1.2.0:plugins/review
```

`--ref` applies only to Git and accepts a branch, tag, or commit for this installation. Without it,
Paseo installs the remote's default HEAD. Installation selectors do not constrain later updates. The legacy
`--path relative/plugin/path` option is equivalent to a subdirectory suffix, including for npm.

### npm installation and publishing

Install Node.js with npm on the **daemon host** and make `npm` available on the daemon's `PATH`.
The daemon uses that host's npm user/global configuration and environment for registry selection
and authentication, including scope-specific registries. The client does not download packages or
run npm. Loading, enabling, and reloading an installed plugin do not need npm.

The daemon installs each candidate and its production dependencies in an isolated directory. It
keeps the complete dependency tree and `package-lock.json` when activating it. The installed
package and lockfile provide its current version and artifact integrity. A version, tag, or range
chooses content for this installation only.

For package contents, dependencies, preparation, and private registries, see
[Publish a plugin](publishing.md).

A failed download, dependency installation, manifest check, preparation command, compilation, or
activation discards the candidate. Other installed plugins keep running. Removing an npm plugin
deletes its managed files; removing a directory plugin keeps your source directory.

## CLI reference

```bash
paseo plugin init /absolute/path/to/plugin
paseo plugin install /absolute/path/to/plugin
paseo plugin install /absolute/path/to/plugin --id another-runtime-id
paseo plugin add owner/repository
paseo plugin add https://git.example.com/owner/repository.git --ref main
paseo plugin add owner/monorepo:plugins/review
paseo plugin ls [id]
paseo plugin update <id>
paseo plugin update --all --check
paseo plugin update --all --yes
paseo plugin update my-plugin --version 1.2.0
paseo plugin update my-plugin --ref v2
paseo plugin reload my-plugin
paseo plugin logs my-plugin
paseo plugin disable my-plugin
paseo plugin enable my-plugin
paseo plugin remove my-plugin
```

`ls` and Settings show source identity and the current installed revision without contacting the
remote. Identity includes the selected subdirectory and excludes installation selectors.

`update <id>` checks for an update, shows the current and proposed revision with available review
links, and asks for approval. Declining leaves the installed content unchanged.

- npm checks the package's `latest` version. It offers only a newer version; an installed version
  newer than latest stays installed. Host npm registry/auth configuration governs resolution.
- Git checks the remote's current default HEAD, regardless of the branch, tag, or commit selected
  during installation.
- Directory plugins are skipped; edit the directory and use `reload`.

`--check` only previews, including with an explicit target or `--yes`. `--yes` skips the question.
`--all` checks each configured plugin and reports independent results; one failure does not stop
others. Neither flag permits ordinary npm downgrades.

`--version <version|tag|range>` or `--ref <branch|tag|commit>` selects one matching plugin's update
content and applies it without another question. An explicit npm version can be older. The next
ordinary update checks latest again. Explicit targets cannot be combined with `--all`.
JSON and noninteractive ordinary updates require `--yes`.

Approval acquires exactly the reviewed commit or npm artifact. If it is unavailable or the installed
plugin changed while reviewing, the update fails and asks you to check again. Failed preparation or
activation retains the previous installation. Manual app update review is not available yet.

Put `--host <url>` before a management command when the target is not the CLI's default daemon. `remove`
never deletes a directory source; it deletes managed files for Git and npm sources. The install-time
`--id` is the runtime ID and allows the same directory or repository to be installed more than once.

> **Trust every plugin you add.** `paseo plugin add` and `paseo plugin install` mean “I trust this codebase.” Server code and preparation commands run unsandboxed with the daemon user's access on the daemon host; client contributions run inside Paseo. Dependencies and future updates are part of that decision. With the global `--host` option, commands run on the remote daemon host.

Most plugins should omit `build`. Use it only when the staged checkout must install a dependency
that Paseo does not provide, generate source or assets, or perform another required preparation
step:

```json
{
  "id": "review",
  "requirements": { "paseo": ">=0.8.0" },
  "build": [["npm", "ci", "--omit=dev"]]
}
```

`build` is a list of non-empty argv arrays. Paseo runs each executable directly, without a shell,
from the staged plugin directory after resolving the exact commit and manifest. It never infers a
package manager or commands from lockfiles. Install and update both run `build` before validation,
compilation, activation, or replacement. A failing command reports its output, discards the
candidate, and leaves the installed/running version intact. The daemon log records each command and
output; with the global `--host` option, execution is on that daemon host.

Run `npm run typecheck` before install or reload. Manage plugin source entries with the CLI or
Settings; see [Plugin sources](#plugin-sources) for install syntax.

The daemon-wide **Enable plugins** switch lives under **Settings → Plugins**. A configured plugin remains `disabled` until that switch and the plugin's own enabled state are both on.

The switch is the root `pluginsEnabled` field in `config.json`. After changing it, run `paseo reload --json`. Enabling starts every configured plugin whose own `enabled` value is not `false`; disabling tears down all plugins. No daemon restart is required. Manual edits to plugin source entries are not reloaded; use the plugin lifecycle commands for those.

## Load failures

Use `paseo plugin ls` to read the current status and error.

| Symptom                                                               | Check                                                                                                                                   |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `This plugin was made for an older version of Paseo`                  | The directory has only an `index.ts` entry. Follow the [migration guide](/docs/plugins/migration).                                      |
| `Plugin entry points are missing`                                     | Neither `index.client.tsx` nor `index.server.ts` exists with that exact name.                                                           |
| `server-only module cannot be imported into the plugin client bundle` | Client code imports `server/`. Move the work behind an RPC and import its contract from `shared/`.                                      |
| `client-only module cannot be imported into the plugin server bundle` | Server code imports `client/`. Register that contribution from `index.client.tsx` instead.                                              |
| `Node module cannot be imported into the plugin client bundle`        | Client code imports `node:*`. Move the operation to `server/` and call it through an RPC.                                               |
| Sidebar item is missing                                               | The plugin is `running`, the item references an existing surface, the icon name is valid, and the client is on the installation's host. |
| Client module is unavailable                                          | Import only the host-provided client modules listed above.                                                                              |
| RPC rejects                                                           | Check both Zod schemas and the daemon-side handler error.                                                                               |
| Edited code does not appear                                           | Run `npm run typecheck`, then `paseo plugin reload <id>`.                                                                               |
| Reload fails                                                          | Read `paseo plugin ls` and `paseo plugin logs <id>`, fix the source error, then reload; Paseo does not restore the previous bundle.     |
| Plugin exits unexpectedly                                             | Read `paseo plugin logs <id>` for retained initialization, cleanup, stderr, and final crash output.                                     |
