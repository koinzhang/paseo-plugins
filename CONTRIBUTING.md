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

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <description>
```

- **type** (required): `feat` · `fix` · `docs` · `style` · `refactor` · `perf` · `test` · `build` · `ci` · `chore` · `revert`
- **scope** (preferred): plugin id (`activity`) or repo area (`ci`, `docs`, `repo`)
- **description**: imperative, lowercase start, no trailing period; focus on why / user impact

Examples:

```text
feat(activity): limit provider filter to top 5
fix(activity): correct heatmap empty-state layout
docs(repo): document npm publish via GitHub Release
ci(repo): add publish workflow for activity
chore(activity): release 0.4.0
```

Breaking changes: add `!` after type/scope (`feat(activity)!: ...`) and/or a `BREAKING CHANGE:` footer.

Do not rewrite old history to match this style; apply from new commits onward.

## Changelog

Each plugin keeps its own `CHANGELOG.md` next to its `package.json` (for example [`activity/CHANGELOG.md`](./activity/CHANGELOG.md)). Every plugin is an independent npm package with its own version and release tag, so there is no root changelog; repo-wide changes belong in the commit history and PR description.

- Follow [Keep a Changelog](https://keepachangelog.com/): newest release first, `## [Unreleased]` on top.
- Add entries under `Unreleased` in the same PR as the change, grouped as `Added` / `Changed` / `Fixed` / `Removed`. Document user-visible behavior, not `docs` / `ci` / `chore` commits.
- At release time, rename `Unreleased` to the new version with the release date; do not write the whole changelog at release time.
- The file ships in the npm tarball (listed in `package.json` `files`) and is the source for the GitHub Release notes.

## Publishing to npm

npm packages are published by **GitHub Release**, not by pushing `main` alone.

Workflow: [`.github/workflows/publish.yml`](./.github/workflows/publish.yml). Auth: npm **Trusted Publisher** for that workflow (no `NPM_TOKEN`). Tag must be `{plugin-id}-v{semver}` and match that plugin's `package.json` `version`.

### Activity (`@koinzhang/paseo-plugin-activity`)

1. Bump version and land it on `main`, including the changelog:

   ```bash
   cd activity
   npm version patch --no-git-tag-version   # or minor / major
   # edit CHANGELOG.md: rename [Unreleased] to [X.Y.Z] - YYYY-MM-DD
   git add package.json package-lock.json CHANGELOG.md
   git commit -m "chore(activity): release X.Y.Z"
   git push origin main
   ```

2. Create a tag and publish a GitHub Release (tag form: `activity-vX.Y.Z`), using that changelog section as the release notes:

   ```bash
   git tag activity-vX.Y.Z
   git push origin activity-vX.Y.Z
   awk '/^## \[X\.Y\.Z\]/{f=1;next} /^## \[|^\[/{f=0} f' activity/CHANGELOG.md \
     | gh release create activity-vX.Y.Z --title "activity X.Y.Z" --notes-file -
   ```

   (Run from the repo root, or drop the `activity/` prefix if you are still in `activity/`.)

3. Confirm the **Publish** workflow succeeded and the version appears on npm:

   ```bash
   npm view @koinzhang/paseo-plugin-activity version
   ```

Do not republish an existing version; bump again if the publish failed after the version was taken.

For additional plugins later: add a job (or matrix entry) in `publish.yml`, use tag `{id}-v*`, and register the same workflow as a Trusted Publisher on that npm package.

## Reporting issues and vulnerabilities

Open a regular GitHub issue for bugs and feature requests. Report security issues privately as described in [SECURITY.md](./SECURITY.md).
