# Contributing

Thanks for taking the time to contribute. This repository is a monorepo for [Paseo](https://github.com/getpaseo) plugins.

## Prerequisites

- Node.js >= 22.6 (CI uses 24; tests run with `--experimental-strip-types`)
- Paseo >= 0.8.0 to install and try plugins locally
- `paseo` CLI available on your `PATH`

## Layout

```
activity/                 # one directory per plugin, id matches paseo-plugin.json
  index.client.tsx        # client entry
  index.server.ts         # server entry
  client/ server/ shared/ # implementation
  specs/                  # numbered spec / plan / tasks / contracts
```

Each plugin is a standalone npm package with its own `package-lock.json`; there is no root workspace.

## Adding a plugin

1. Create `<plugin-id>/` with `paseo-plugin.json`, `package.json`, `tsconfig.json`, and the client / server entry files. Keep the directory name, plugin `id`, and data directory identical.
2. Add a row to the plugin table in both `README.md` and `README.zh-CN.md`.
3. Add the plugin to the `matrix.plugin` list in `.github/workflows/ci.yml`.
4. Add a `specs/` directory with `001-.../spec.md` before writing non-trivial code.

## Spec-driven development

Read [`activity/specs/README.md`](./activity/specs/README.md) first. Each feature lives in a numbered `specs/00N-.../` directory; update the spec / plan before changing code, and check off tasks in `tasks.md` with how they were verified. New features get a new numbered directory instead of extending closed ones.

## Local checks

Run these inside the plugin directory before opening a pull request (CI runs the same):

```bash
cd activity
npm install
npm run typecheck
npm test
```

To try a plugin in a running Paseo:

```bash
cd activity
paseo plugin install .
paseo plugin reload activity
paseo plugin logs activity
```

## Pull requests

- Keep changes scoped to one plugin unless the change is repo-wide.
- Link the spec directory the change implements or updates.
- Make sure CI is green (`typecheck` + tests).
- Describe user-visible behavior changes in the PR description; screenshots help for UI changes.

## Reporting issues and vulnerabilities

Open a regular GitHub issue for bugs and feature requests. Report security issues privately as described in [SECURITY.md](./SECURITY.md).
