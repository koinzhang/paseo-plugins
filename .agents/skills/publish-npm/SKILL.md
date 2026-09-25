---
name: publish-npm
description: >-
  Publish paseo-plugins packages to npm via GitHub Release tags.
  Use when the user asks to release, publish, bump and ship an npm package,
  create an activity-v* tag, or run the Publish workflow.
---

# Publish npm (paseo-plugins)

Canonical human doc: [CONTRIBUTING.md § Publishing to npm](../../../CONTRIBUTING.md#publishing-to-npm).

## Rules

- Activity and Mono publish through a **published GitHub Release**, not by push-to-`main` alone. Customize 0.1.0 follows the user-directed local npm CLI flow below.
- Tag shape: `{plugin-id}-v{semver}` (Activity: `activity-v0.4.0`).
- Tag semver **must** equal that plugin's `package.json` `version`.
- Do not force-republish an existing npm version; bump again if needed.
- Do not create a release unless the user asked to publish/release (version bump on `main` can land without a tag).
- Every release updates `activity/CHANGELOG.md`: rename `[Unreleased]` to `[X.Y.Z] - YYYY-MM-DD` in the release commit. Never publish with an empty Unreleased section left behind.

## Activity checklist

Package: `@koinzhang/paseo-plugin-activity` · directory: `activity/` · workflow: `.github/workflows/publish.yml`

1. Confirm `main` is clean enough to release (or use the commit that already bumped version).
2. In `activity/`, bump version if not already bumped, then rename `[Unreleased]` in `CHANGELOG.md` to `[X.Y.Z] - YYYY-MM-DD` (add link refs at the bottom):

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
- If the job is skipped: tag must start with `activity-v`.
- If the job fails at version check: tag and `activity/package.json` version disagree.

## Customize 0.1.0

Package: `@koinzhang/paseo-plugin-customize` · directory: `customize/` · local npm CLI publication (no GitHub Release trigger).

- The package and lockfile already say `0.1.0`. Follow the release preparation and verification steps in `CONTRIBUTING.md` and use `.github/release-notes/customize-v0.1.0.md` as the notes draft.
- At actual release time, date `customize/CHANGELOG.md`, verify npm authentication and that the version is unused, then publish with `npm publish --access public` from `customize/`.
- Verify the npm package version after publication. Commit or push the release materials through jj only if requested.
