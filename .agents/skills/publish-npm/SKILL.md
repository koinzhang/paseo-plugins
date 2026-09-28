---
name: publish-npm
description: >-
  Publish paseo-plugins packages to npm via GitHub Release tags.
  Use when the user asks to release, publish, bump and ship an npm package,
  create an activity-v*, mono-v*, customize-v*, or commands-v* tag, or run the Publish workflow.
---

# Publish npm (paseo-plugins)

Canonical human doc: [CONTRIBUTING.md § Publishing to npm](../../../CONTRIBUTING.md#publishing-to-npm).

## Rules

- Every plugin publishes through a **published GitHub Release**, not by push-to-`main` alone. The release tag triggers the matching job in `publish.yml`.
- Tag shape: `{plugin-id}-v{semver}` (Activity: `activity-v0.4.0`, Mono: `mono-v0.2.1`, Customize: `customize-v0.3.0`, Commands: `commands-v0.1.0`).
- Tag semver **must** equal that plugin's `package.json` `version`.
- Do not force-republish an existing npm version; bump again if needed.
- Do not create a release unless the user asked to publish/release (version bump on `main` can land without a tag).
- Every release updates that plugin's `CHANGELOG.md`: rename `[Unreleased]` to `[X.Y.Z] - YYYY-MM-DD` in the release commit. Never publish with an empty Unreleased section left behind.

## Plugins

| Plugin | Package | Directory | Tag | `publish.yml` job |
|---|---|---|---|---|
| Activity | `@koinzhang/paseo-plugin-activity` | `activity/` | `activity-vX.Y.Z` | `publish-activity` |
| Mono | `@koinzhang/paseo-plugin-mono` | `mono/` | `mono-vX.Y.Z` | `publish-mono` |
| Customize | `@koinzhang/paseo-plugin-customize` | `customize/` | `customize-vX.Y.Z` | `publish-customize` |
| Commands | `@koinzhang/paseo-plugin-commands` | `commands/` | `commands-vX.Y.Z` | `publish-commands` |

## Release checklist

Substitute the plugin id, directory, package name, and tag prefix from the table above; the examples use Activity.

1. Confirm `main` is clean enough to release (or use the commit that already bumped version).
2. In the plugin directory, bump version if not already bumped, then rename `[Unreleased]` in `CHANGELOG.md` to `[X.Y.Z] - YYYY-MM-DD` (add link refs at the bottom):

   ```bash
   npm version patch --no-git-tag-version   # or minor / major
   ```

3. Commit and push to `main` (only if the user asked for the commit / release). This repo is jj-colocated — commit with jj; git is only the remote contract:

   ```bash
   jj commit -m "chore(activity): release X.Y.Z"
   jj bookmark set main -r @-
   jj git push
   ```

4. Tag and create the Release, using the changelog section as notes (replace `X.Y.Z`; run from repo root):

   ```bash
   git tag activity-vX.Y.Z
   git push origin activity-vX.Y.Z
   awk '/^## \[X\.Y\.Z\]/{f=1;next} /^## \[|^\[/{f=0} f' activity/CHANGELOG.md \
     | gh release create activity-vX.Y.Z --title "activity X.Y.Z" --notes-file -
   ```

5. Watch the **Publish** Actions run; verify:

   ```bash
   npm view @koinzhang/paseo-plugin-activity version
   ```

## Auth / troubleshooting

- npm auth is **Trusted Publisher** on workflow file `publish.yml` (OIDC). No `NPM_TOKEN` in this repo.
- If publish fails with auth errors: npm package → Trusted Publisher → repo `koinzhang/paseo-plugins`, workflow `publish.yml`, allow `npm publish`.
- If the job is skipped: tag must start with the plugin's prefix (`activity-v`, `mono-v`, `customize-v`, `commands-v`).
- If the job fails at version check: tag and that plugin's `package.json` version disagree.

## Other plugins

- **Mono** (`@koinzhang/paseo-plugin-mono`, tag `mono-vX.Y.Z`, `publish-mono`) and **Customize** (`@koinzhang/paseo-plugin-customize`, tag `customize-vX.Y.Z`, `publish-customize`) publish through GitHub Release like Activity. Customize 0.1.0 predates the workflow job and was published locally — do not republish it.
- **Commands** (`@koinzhang/paseo-plugin-commands`, tag `commands-vX.Y.Z`, `publish-commands`) is wired to the same flow. Commands 0.1.0 was published locally before npm Trusted Publisher existed; the job skips the `commands-v0.1.0` tag — do not republish it.
